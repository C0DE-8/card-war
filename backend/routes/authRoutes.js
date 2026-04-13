const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

function buildPlayerPayload(player) {
  return {
    id: player.id,
    username: player.username,
    email: player.email,
    level: player.level,
    exp: player.exp,
    rp: player.rp,
    coins: player.coins,
    gems: player.gems,
    wins: player.wins,
    losses: player.losses,
    is_admin: !!player.is_admin
  };
}

async function assignStarterDeckOnRegister(connection, playerId) {
  const [existingDeckRows] = await connection.execute(
    `SELECT id
     FROM player_decks
     WHERE player_id = ?
     LIMIT 1`,
    [playerId]
  );

  if (existingDeckRows.length > 0) {
    throw new Error("STARTER_DECK_ALREADY_EXISTS");
  }

  const [starterCards] = await connection.execute(
    `SELECT id, name, type, element_type, power, magic, skill, cost
     FROM cards
     WHERE is_active = 1
       AND is_starter_card = 1
       AND type = 'character'
     ORDER BY RAND()
     LIMIT 10`
  );

  if (starterCards.length < 10) {
    throw new Error("INSUFFICIENT_STARTER_CARDS");
  }

  const [deckResult] = await connection.execute(
    `INSERT INTO player_decks (player_id, name, is_active)
     VALUES (?, 'Starter Deck', 1)`,
    [playerId]
  );
  const deckId = deckResult.insertId;

  for (let index = 0; index < starterCards.length; index += 1) {
    const card = starterCards[index];
    const slotNumber = index + 1;

    await connection.execute(
      `INSERT INTO player_cards (player_id, card_id, quantity)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
      [playerId, card.id]
    );

    await connection.execute(
      `INSERT INTO player_deck_cards (deck_id, card_id, slot_number)
       VALUES (?, ?, ?)`,
      [deckId, card.id, slotNumber]
    );
  }

  return {
    deck_id: deckId,
    deck_name: "Starter Deck",
    deck_card_count: starterCards.length,
    starter_cards: starterCards
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  let connection;

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const [existingPlayers] = await db.execute(
      "SELECT id FROM players WHERE email = ? OR username = ? LIMIT 1",
      [email, username]
    );

    if (existingPlayers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username or email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const defaults = {
      level: 1,
      exp: 0,
      rp: 50,
      coins: 1000,
      gems: 20,
      wins: 0,
      losses: 0
    };

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO players 
      (username, email, password, level, exp, rp, coins, gems, wins, losses)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        email,
        hashedPassword,
        defaults.level,
        defaults.exp,
        defaults.rp,
        defaults.coins,
        defaults.gems,
        defaults.wins,
        defaults.losses
      ]
    );

    const playerId = result.insertId;
    const starterDeck = await assignStarterDeckOnRegister(connection, playerId);

    const [createdRows] = await connection.execute(
      `SELECT id, username, email, level, exp, rp, coins, gems, wins, losses, is_admin
       FROM players
       WHERE id = ?
       LIMIT 1`,
      [playerId]
    );
    const createdPlayer = createdRows[0];

    await connection.commit();

    const token = jwt.sign(
      {
        id: playerId,
        email,
        username,
        is_admin: false
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Player registered successfully.",
      token,
      player: buildPlayerPayload(createdPlayer),
      starter_deck: starterDeck
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (error.message === "INSUFFICIENT_STARTER_CARDS") {
      return res.status(500).json({
        success: false,
        message: "Registration failed: not enough active starter character cards."
      });
    }

    if (error.message === "STARTER_DECK_ALREADY_EXISTS") {
      return res.status(500).json({
        success: false,
        message: "Registration failed: starter deck already exists for this player."
      });
    }

    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;
  
      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          message: "Identifier (email or username) and password are required."
        });
      }
  
      // Find by email OR username
      const [players] = await db.execute(
        `SELECT id, username, email, password, level, exp, rp, coins, gems, wins, losses, is_admin
         FROM players
         WHERE email = ? OR username = ?
         LIMIT 1`,
        [identifier, identifier]
      );
  
      if (players.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials."
        });
      }
  
      const player = players[0];
  
      const isPasswordValid = await bcrypt.compare(password, player.password);
  
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials."
        });
      }
  
      const token = jwt.sign(
        {
          id: player.id,
          email: player.email,
          username: player.username,
          is_admin: !!player.is_admin
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );
  
      return res.status(200).json({
        success: true,
        message: "Login successful.",
        token,
        player: buildPlayerPayload(player)
      });
  
    } catch (error) {
      console.error("Login error:", error);
  
      return res.status(500).json({
        success: false,
        message: "Server error during login."
      });
    }
  });

module.exports = router;