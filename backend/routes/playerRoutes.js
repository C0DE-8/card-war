const express = require("express");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware");
const moment = require("moment");

const router = express.Router();

function rollupBaseStat(cardRow, statType) {
  const fixedStat = Number(cardRow?.[statType] ?? 0);
  const baseMinRaw = cardRow?.[`${statType}_min`];
  const baseMaxRaw = cardRow?.[`${statType}_max`];

  const baseMin = Number.isFinite(Number(baseMinRaw)) ? Number(baseMinRaw) : fixedStat;
  const baseMax = Number.isFinite(Number(baseMaxRaw)) ? Number(baseMaxRaw) : fixedStat;

  return { baseMin, baseMax, fixedStat };
}

function computeEffectiveRange(cardRow, progressRow, statType) {
  const { baseMin, baseMax, fixedStat } = rollupBaseStat(cardRow, statType);

  const minBonus = progressRow ? Number(progressRow[`${statType}_min_bonus`] ?? 0) : 0;
  const maxBonus = progressRow ? Number(progressRow[`${statType}_max_bonus`] ?? 0) : 0;

  let effectiveMin = baseMin + (Number.isFinite(minBonus) ? minBonus : 0);
  let effectiveMax = baseMax + (Number.isFinite(maxBonus) ? maxBonus : 0);

  if (!Number.isFinite(effectiveMin) || !Number.isFinite(effectiveMax)) {
    effectiveMin = fixedStat;
    effectiveMax = fixedStat;
  }

  if (effectiveMax < effectiveMin) {
    effectiveMin = fixedStat;
    effectiveMax = fixedStat;
  }

  return { effectiveMin, effectiveMax };
}

function getCardLevelDefaults(cardRow) {
  const baseLevel = Number(cardRow?.base_card_level);
  const capLevel = Number(cardRow?.card_level_cap);

  return {
    base_card_level: Number.isInteger(baseLevel) && baseLevel > 0 ? baseLevel : 1,
    card_level_cap: Number.isInteger(capLevel) && capLevel > 0 ? capLevel : 11
  };
}

/**
 * GET /api/players/profile
 * Get logged-in player profile
 */
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const playerId = req.user.id;

    const [rows] = await db.execute(
      `SELECT 
        id,
        username,
        email,
        level,
        exp,
        rp,
        coins,
        gems,
        wins,
        losses,
        is_admin,
        created_at,
        updated_at
      FROM players
      WHERE id = ?
      LIMIT 1`,
      [playerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Player not found."
      });
    }

    const player = rows[0];

    // 🔥 Convert to relative time
    player.created_at = moment(player.created_at).fromNow();
    player.updated_at = moment(player.updated_at).fromNow();

    return res.status(200).json({
      success: true,
      player
    });

  } catch (error) {
    console.error("Profile route error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching player profile."
    });
  }
});

async function assignStarterDeck(connection, playerId) {
  const [existingDecks] = await connection.execute(
    `SELECT id, name, is_active
     FROM player_decks
     WHERE player_id = ?
     ORDER BY id ASC
     LIMIT 1`,
    [playerId]
  );

  if (existingDecks.length > 0) {
    return { alreadyExists: true, deckId: existingDecks[0].id };
  }

  const [starterCards] = await connection.execute(
    `SELECT id
     FROM cards
     WHERE is_active = 1
       AND is_starter_card = 1
       AND type = 'character'
     ORDER BY starter_weight DESC, id ASC
     LIMIT 10`
  );

  if (starterCards.length < 10) {
    throw new Error("NOT_ENOUGH_STARTER_CARDS");
  }

  const [deckResult] = await connection.execute(
    `INSERT INTO player_decks (player_id, name, is_active)
     VALUES (?, 'Starter Deck', 1)`,
    [playerId]
  );
  const deckId = deckResult.insertId;

  for (let index = 0; index < starterCards.length; index += 1) {
    const card = starterCards[index];

    await connection.execute(
      `INSERT INTO player_cards (player_id, card_id, quantity)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
      [playerId, card.id]
    );

    await connection.execute(
      `INSERT INTO player_deck_cards (deck_id, card_id, slot_number)
       VALUES (?, ?, ?)`,
      [deckId, card.id, index + 1]
    );
  }

  return { alreadyExists: false, deckId };
}

async function fetchActiveDeck(playerId) {
  const [deckRows] = await db.execute(
    `SELECT id, name, is_active
     FROM player_decks
     WHERE player_id = ? AND is_active = 1
     ORDER BY id DESC
     LIMIT 1`,
    [playerId]
  );

  if (deckRows.length === 0) {
    return null;
  }

  const deck = deckRows[0];
  const [cards] = await db.execute(
    `SELECT
      pdc.slot_number,
      pc.id AS player_card_id,
      c.id,
      c.name,
      c.type,
      c.element_type,
      c.power,
      c.magic,
      c.skill,
      c.base_card_level,
      c.card_level_cap,
      c.power_min,
      c.power_max,
      c.magic_min,
      c.magic_max,
      c.skill_min,
      c.skill_max,
      c.cost,
      c.description,
      c.image_path,
      c.image_filename,
      c.image_mime_type,
      pcp.id AS player_card_progress_id,
      pcp.current_level,
      pcp.upgrade_count,
      pcp.power_min_bonus,
      pcp.power_max_bonus,
      pcp.magic_min_bonus,
      pcp.magic_max_bonus,
      pcp.skill_min_bonus,
      pcp.skill_max_bonus,
      r.id AS rarity_id,
      r.name AS rarity_name,
      r.color AS rarity_color
     FROM player_deck_cards pdc
     JOIN cards c ON pdc.card_id = c.id
     JOIN rarities r ON c.rarity_id = r.id
     LEFT JOIN player_cards pc ON pc.player_id = ? AND pc.card_id = c.id
     LEFT JOIN player_card_progress pcp
       ON pcp.player_card_id = pc.id
      AND pcp.player_id = pc.player_id
      AND pcp.card_id = pc.card_id
     WHERE pdc.deck_id = ?
     ORDER BY pdc.slot_number ASC`,
    [playerId, deck.id]
  );

  return {
    id: deck.id,
    name: deck.name,
    is_active: !!deck.is_active,
    cards: cards.map((card) => ({
      slot_number: card.slot_number,
      card: {
        ...(card.player_card_id ? { player_card_id: card.player_card_id } : {}),
        id: card.id,
        name: card.name,
        type: card.type,
        element_type: card.element_type,
        ...(card.type === "character"
          ? (() => {
            const defaults = getCardLevelDefaults(card);
            const currentLevel = Number(card.current_level);
            const resolvedLevel =
              Number.isInteger(currentLevel) && currentLevel > 0
                ? currentLevel
                : defaults.base_card_level;

            const powerRange = computeEffectiveRange(card, card, "power");
            const magicRange = computeEffectiveRange(card, card, "magic");
            const skillRange = computeEffectiveRange(card, card, "skill");

            return {
              current_level: resolvedLevel,
              base_card_level: defaults.base_card_level,
              card_level_cap: defaults.card_level_cap,
              power_min: powerRange.effectiveMin,
              power_max: powerRange.effectiveMax,
              magic_min: magicRange.effectiveMin,
              magic_max: magicRange.effectiveMax,
              skill_min: skillRange.effectiveMin,
              skill_max: skillRange.effectiveMax,
              power: powerRange.effectiveMax,
              magic: magicRange.effectiveMax,
              skill: skillRange.effectiveMax
            };
          })()
          : {
            power: card.power,
            magic: card.magic,
            skill: card.skill
          }),
        cost: card.cost,
        description: card.description,
        rarity_id: card.rarity_id,
        rarity_name: card.rarity_name,
        rarity_color: card.rarity_color,
        image_path: card.image_path,
        image_filename: card.image_filename,
        image_mime_type: card.image_mime_type,
        image_url: card.image_path ? `${card.image_path}` : null
      }
    }))
  };
}

router.post("/cards/:id/upgrade", authenticateToken, async (req, res) => {
  let connection;

  try {
    const playerId = req.user.id;
    const cardId = Number(req.params.id);

    if (!cardId || Number.isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        message: "Valid card ID is required."
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [playerRows] = await connection.execute(
      `SELECT id, coins, gems
       FROM players
       WHERE id = ?
       LIMIT 1 FOR UPDATE`,
      [playerId]
    );

    if (playerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Player not found."
      });
    }

    const player = playerRows[0];

    const [cardRows] = await connection.execute(
      `SELECT
        id,
        type,
        base_card_level,
        card_level_cap,
        power,
        magic,
        skill,
        power_min,
        power_max,
        magic_min,
        magic_max,
        skill_min,
        skill_max
       FROM cards
       WHERE id = ?
       LIMIT 1`,
      [cardId]
    );

    if (cardRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Card not found."
      });
    }

    const card = cardRows[0];

    if (card.type !== "character") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Only character cards can be upgraded."
      });
    }

    const [playerCardRows] = await connection.execute(
      `SELECT id, quantity
       FROM player_cards
       WHERE player_id = ? AND card_id = ?
       LIMIT 1 FOR UPDATE`,
      [playerId, cardId]
    );

    if (playerCardRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "You do not own this card."
      });
    }

    const playerCard = playerCardRows[0];
    const defaults = getCardLevelDefaults(card);

    const [progressRows] = await connection.execute(
      `SELECT *
       FROM player_card_progress
       WHERE player_id = ? AND card_id = ? AND player_card_id = ?
       LIMIT 1 FOR UPDATE`,
      [playerId, cardId, playerCard.id]
    );

    const progress = progressRows.length > 0 ? progressRows[0] : null;

    const oldLevel = progress?.current_level
      ? Number(progress.current_level)
      : defaults.base_card_level;

    if (oldLevel >= defaults.card_level_cap) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Card is already at max level.",
        current_level: oldLevel,
        card_level_cap: defaults.card_level_cap
      });
    }

    const newLevel = oldLevel + 1;
    const coinsCost = 100 * newLevel;
    const gemsCost = newLevel >= Math.max(defaults.card_level_cap - 1, 10) ? 1 : 0;

    if (Number(player.coins) < coinsCost || Number(player.gems) < gemsCost) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Not enough resources to upgrade this card.",
        required: { coins: coinsCost, gems: gemsCost },
        available: { coins: Number(player.coins), gems: Number(player.gems) }
      });
    }

    const beforePower = computeEffectiveRange(card, progress ?? {}, "power");
    const beforeMagic = computeEffectiveRange(card, progress ?? {}, "magic");
    const beforeSkill = computeEffectiveRange(card, progress ?? {}, "skill");

    const minIncrease = 1;
    const maxIncrease = 2;

    const nextBonuses = {
      power_min_bonus: Number(progress?.power_min_bonus ?? 0) + minIncrease,
      power_max_bonus: Number(progress?.power_max_bonus ?? 0) + maxIncrease,
      magic_min_bonus: Number(progress?.magic_min_bonus ?? 0) + minIncrease,
      magic_max_bonus: Number(progress?.magic_max_bonus ?? 0) + maxIncrease,
      skill_min_bonus: Number(progress?.skill_min_bonus ?? 0) + minIncrease,
      skill_max_bonus: Number(progress?.skill_max_bonus ?? 0) + maxIncrease
    };

    const afterPower = computeEffectiveRange(card, nextBonuses, "power");
    const afterMagic = computeEffectiveRange(card, nextBonuses, "magic");
    const afterSkill = computeEffectiveRange(card, nextBonuses, "skill");

    if (
      afterPower.effectiveMax < afterPower.effectiveMin ||
      afterMagic.effectiveMax < afterMagic.effectiveMin ||
      afterSkill.effectiveMax < afterSkill.effectiveMin
    ) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid stat ranges after upgrade."
      });
    }

    await connection.execute(
      `UPDATE players
       SET coins = coins - ?, gems = gems - ?, updated_at = NOW()
       WHERE id = ?`,
      [coinsCost, gemsCost, playerId]
    );

    let progressId = progress?.id ?? null;
    const upgradeCount = Number(progress?.upgrade_count ?? 0) + 1;
    const totalCoins = Number(progress?.total_upgrade_spent_coins ?? 0) + coinsCost;
    const totalGems = Number(progress?.total_upgrade_spent_gems ?? 0) + gemsCost;

    if (!progress) {
      const [insertResult] = await connection.execute(
        `INSERT INTO player_card_progress
         (
           player_card_id,
           player_id,
           card_id,
           current_level,
           upgrade_count,
           power_min_bonus,
           power_max_bonus,
           magic_min_bonus,
           magic_max_bonus,
           skill_min_bonus,
           skill_max_bonus,
           total_upgrade_spent_coins,
           total_upgrade_spent_gems,
           last_upgraded_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          playerCard.id,
          playerId,
          cardId,
          newLevel,
          upgradeCount,
          nextBonuses.power_min_bonus,
          nextBonuses.power_max_bonus,
          nextBonuses.magic_min_bonus,
          nextBonuses.magic_max_bonus,
          nextBonuses.skill_min_bonus,
          nextBonuses.skill_max_bonus,
          totalCoins,
          totalGems
        ]
      );
      progressId = insertResult.insertId;
    } else {
      await connection.execute(
        `UPDATE player_card_progress
         SET
           current_level = ?,
           upgrade_count = ?,
           power_min_bonus = ?,
           power_max_bonus = ?,
           magic_min_bonus = ?,
           magic_max_bonus = ?,
           skill_min_bonus = ?,
           skill_max_bonus = ?,
           total_upgrade_spent_coins = ?,
           total_upgrade_spent_gems = ?,
           last_upgraded_at = NOW(),
           updated_at = NOW()
         WHERE id = ?`,
        [
          newLevel,
          upgradeCount,
          nextBonuses.power_min_bonus,
          nextBonuses.power_max_bonus,
          nextBonuses.magic_min_bonus,
          nextBonuses.magic_max_bonus,
          nextBonuses.skill_min_bonus,
          nextBonuses.skill_max_bonus,
          totalCoins,
          totalGems,
          progress.id
        ]
      );
    }

    await connection.execute(
      `INSERT INTO player_card_upgrade_history
       (
         player_card_progress_id,
         player_card_id,
         player_id,
         card_id,
         old_level,
         new_level,
         power_min_before,
         power_min_after,
         power_max_before,
         power_max_after,
         magic_min_before,
         magic_min_after,
         magic_max_before,
         magic_max_after,
         skill_min_before,
         skill_min_after,
         skill_max_before,
         skill_max_after,
         coins_spent,
         gems_spent,
         upgrade_status,
         upgrade_note
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success', NULL)`,
      [
        progressId,
        playerCard.id,
        playerId,
        cardId,
        oldLevel,
        newLevel,
        beforePower.effectiveMin,
        afterPower.effectiveMin,
        beforePower.effectiveMax,
        afterPower.effectiveMax,
        beforeMagic.effectiveMin,
        afterMagic.effectiveMin,
        beforeMagic.effectiveMax,
        afterMagic.effectiveMax,
        beforeSkill.effectiveMin,
        afterSkill.effectiveMin,
        beforeSkill.effectiveMax,
        afterSkill.effectiveMax,
        coinsCost,
        gemsCost
      ]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Card upgraded successfully.",
      upgrade_cost: { coins: coinsCost, gems: gemsCost },
      upgraded_card: {
        player_card_id: playerCard.id,
        player_card_progress_id: progressId,
        card_id: cardId,
        current_level: newLevel,
        card_level_cap: defaults.card_level_cap,
        power_min: afterPower.effectiveMin,
        power_max: afterPower.effectiveMax,
        magic_min: afterMagic.effectiveMin,
        magic_max: afterMagic.effectiveMax,
        skill_min: afterSkill.effectiveMin,
        skill_max: afterSkill.effectiveMax,
        power: afterPower.effectiveMax,
        magic: afterMagic.effectiveMax,
        skill: afterSkill.effectiveMax
      },
      updated_player_resources: {
        coins: Number(player.coins) - coinsCost,
        gems: Number(player.gems) - gemsCost
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Upgrade card error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while upgrading card."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post("/deck/assign-starter", authenticateToken, async (req, res) => {
  const playerId = req.user.id;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const assignResult = await assignStarterDeck(connection, playerId);

    await connection.commit();

    if (assignResult.alreadyExists) {
      const activeDeck = await fetchActiveDeck(playerId);
      return res.status(200).json({
        success: true,
        message: "Starter deck already assigned.",
        deck: activeDeck
      });
    }

    const activeDeck = await fetchActiveDeck(playerId);
    return res.status(201).json({
      success: true,
      message: "Starter deck assigned successfully.",
      deck: activeDeck
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (error.message === "NOT_ENOUGH_STARTER_CARDS") {
      return res.status(400).json({
        success: false,
        message: "Not enough starter character cards configured to build a deck."
      });
    }

    console.error("Assign starter deck error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while assigning starter deck."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get("/deck/active", authenticateToken, async (req, res) => {
  try {
    const playerId = req.user.id;
    const activeDeck = await fetchActiveDeck(playerId);

    if (!activeDeck) {
      return res.status(404).json({
        success: false,
        message: "Active deck not found for this player."
      });
    }

    return res.status(200).json({
      success: true,
      deck: activeDeck
    });
  } catch (error) {
    console.error("Fetch active deck error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching active deck."
    });
  }
});

module.exports = router;
