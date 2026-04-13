const express = require("express");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware");
const moment = require("moment");

const router = express.Router();

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
      c.id,
      c.name,
      c.type,
      c.element_type,
      c.power,
      c.magic,
      c.skill,
      c.cost,
      c.description,
      c.image_path,
      c.image_filename,
      c.image_mime_type,
      r.id AS rarity_id,
      r.name AS rarity_name,
      r.color AS rarity_color
     FROM player_deck_cards pdc
     JOIN cards c ON pdc.card_id = c.id
     JOIN rarities r ON c.rarity_id = r.id
     WHERE pdc.deck_id = ?
     ORDER BY pdc.slot_number ASC`,
    [deck.id]
  );

  return {
    id: deck.id,
    name: deck.name,
    is_active: !!deck.is_active,
    cards: cards.map((card) => ({
      slot_number: card.slot_number,
      card: {
        id: card.id,
        name: card.name,
        type: card.type,
        element_type: card.element_type,
        power: card.power,
        magic: card.magic,
        skill: card.skill,
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