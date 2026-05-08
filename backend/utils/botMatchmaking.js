const db = require("../config/db");

const BOT_WAIT_MS = 10000;
const BOT_EMAIL_DOMAIN = "bot.card-war.local";
const BOT_DECK_SIZE = 10;
const botFallbackTimers = new Map();

// Clears a scheduled bot fallback when a match starts or is cancelled.
function clearBotFallback(matchId) {
  const key = Number(matchId);
  const timer = botFallbackTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    botFallbackTimers.delete(key);
  }
}

// Ensures a bot-backed battle match has its first round row.
async function ensureRoundOneExistsTx(connection, matchId) {
  await connection.execute(
    `INSERT INTO battle_rounds (match_id, round_number, status)
     VALUES (?, 1, 'power')
     ON DUPLICATE KEY UPDATE status = status`,
    [matchId]
  );
}

// Checks whether a player row is a generated bot account.
async function isGeneratedBotPlayerTx(connection, playerId) {
  const [rows] = await connection.execute(
    `SELECT id
     FROM players
     WHERE id = ? AND email LIKE ?
     LIMIT 1`,
    [playerId, `%@${BOT_EMAIL_DOMAIN}`]
  );
  return rows.length > 0;
}

// Picks a random character card from a generated bot deck.
async function getRandomBotDeckCardIdTx(connection, deckId) {
  const [rows] = await connection.execute(
    `SELECT c.id
     FROM player_deck_cards pdc
     JOIN cards c ON c.id = pdc.card_id
     WHERE pdc.deck_id = ? AND c.type = 'character'
     ORDER BY RAND()
     LIMIT 1`,
    [deckId]
  );
  return rows[0]?.id || null;
}

// Creates a generated bot player with a same-level random deck.
async function createGeneratedBotTx(connection, playerLevel) {
  const level = Math.max(1, Number(playerLevel) || 1);
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const username = `Bot-${level}-${suffix}`;
  const email = `bot+${suffix}@${BOT_EMAIL_DOMAIN}`;

  const [playerResult] = await connection.execute(
    `INSERT INTO players
     (username, email, password, level, exp, rp, coins, gems, wins, losses, is_admin)
     VALUES (?, ?, ?, ?, 0, 50, 0, 0, 0, 0, 0)`,
    [username, email, "generated-bot-account", level]
  );
  const botPlayerId = playerResult.insertId;

  const [cardRows] = await connection.execute(
    `SELECT id, card_level_cap
     FROM cards
     WHERE is_active = 1 AND type = 'character'
     ORDER BY RAND()
     LIMIT ${BOT_DECK_SIZE}`
  );

  if (cardRows.length === 0) {
    throw new Error("NO_BOT_CARDS_AVAILABLE");
  }

  const [deckResult] = await connection.execute(
    `INSERT INTO player_decks (player_id, name, is_active)
     VALUES (?, 'Bot Deck', 1)`,
    [botPlayerId]
  );
  const botDeckId = deckResult.insertId;

  for (let index = 0; index < cardRows.length; index += 1) {
    const card = cardRows[index];
    const currentLevel = Math.min(level, Number(card.card_level_cap || level));
    const statBonus = Math.max(0, currentLevel - 1);

    const [playerCardResult] = await connection.execute(
      `INSERT INTO player_cards (player_id, card_id, quantity)
       VALUES (?, ?, 1)`,
      [botPlayerId, card.id]
    );

    await connection.execute(
      `INSERT INTO player_card_progress
       (
         player_card_id,
         player_id,
         card_id,
         current_level,
         power_min_bonus,
         power_max_bonus,
         magic_min_bonus,
         magic_max_bonus,
         skill_min_bonus,
         skill_max_bonus
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        playerCardResult.insertId,
        botPlayerId,
        card.id,
        currentLevel,
        statBonus,
        statBonus,
        statBonus,
        statBonus,
        statBonus,
        statBonus
      ]
    );

    await connection.execute(
      `INSERT INTO player_deck_cards (deck_id, card_id, slot_number)
       VALUES (?, ?, ?)`,
      [botDeckId, card.id, index + 1]
    );
  }

  return {
    player_id: botPlayerId,
    deck_id: botDeckId,
    username,
    level
  };
}

// Adds a generated bot if the match is still open.
async function attachBotIfMatchStillWaiting(matchId, playerId) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [matchRows] = await connection.execute(
      `SELECT bm.*, p.level AS player_one_level
       FROM battle_matches bm
       JOIN players p ON p.id = bm.player_one_id
       WHERE bm.id = ?
       LIMIT 1 FOR UPDATE`,
      [matchId]
    );

    const match = matchRows[0];
    if (!match) {
      throw new Error("MATCH_NOT_FOUND");
    }

    if (match.player_one_id !== playerId) {
      await connection.commit();
      return { matched_with_bot: false };
    }

    if (match.status !== "waiting" || match.player_two_id) {
      await connection.commit();
      return { matched_with_bot: false };
    }

    const bot = await createGeneratedBotTx(connection, match.player_one_level);
    await connection.execute(
      `UPDATE battle_matches
       SET
         player_two_id = ?,
         player_two_deck_id = ?,
         status = 'in_progress',
         current_round_number = 1,
         updated_at = NOW()
       WHERE id = ? AND status = 'waiting'`,
      [bot.player_id, bot.deck_id, matchId]
    );
    await ensureRoundOneExistsTx(connection, matchId);

    await connection.commit();
    clearBotFallback(matchId);
    return {
      matched_with_bot: true,
      bot
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Schedules the generated bot fallback for a waiting match.
function scheduleBotFallback(matchId, playerId) {
  const key = Number(matchId);
  if (botFallbackTimers.has(key)) {
    return;
  }

  const timer = setTimeout(async () => {
    botFallbackTimers.delete(key);
    try {
      await attachBotIfMatchStillWaiting(key, playerId);
    } catch (error) {
      console.error("Bot fallback error:", error);
    }
  }, BOT_WAIT_MS);

  botFallbackTimers.set(key, timer);
}

module.exports = {
  BOT_WAIT_MS,
  attachBotIfMatchStillWaiting,
  clearBotFallback,
  getRandomBotDeckCardIdTx,
  isGeneratedBotPlayerTx,
  scheduleBotFallback
};
