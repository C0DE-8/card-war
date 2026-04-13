const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// Helper function for HP based on level
function calculateMaxHp(level) {
  return 100 + (level - 1) * 20;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
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

    const defaultLevel = 1;
    const defaultExp = 0;
    const defaultMaxHp = calculateMaxHp(defaultLevel);
    const defaultCurrentHp = defaultMaxHp;
    const defaultRp = 50;
    const defaultCoins = 1000;
    const defaultGems = 20;
    const defaultWins = 0;
    const defaultLosses = 0;

    const [result] = await db.execute(
      `INSERT INTO players 
      (username, email, password, level, exp, max_hp, current_hp, rp, coins, gems, wins, losses)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        email,
        hashedPassword,
        defaultLevel,
        defaultExp,
        defaultMaxHp,
        defaultCurrentHp,
        defaultRp,
        defaultCoins,
        defaultGems,
        defaultWins,
        defaultLosses
      ]
    );

    const playerId = result.insertId;

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
      player: {
        id: playerId,
        username,
        email,
        level: defaultLevel,
        exp: defaultExp,
        max_hp: defaultMaxHp,
        current_hp: defaultCurrentHp,
        rp: defaultRp,
        coins: defaultCoins,
        gems: defaultGems,
        wins: defaultWins,
        losses: defaultLosses,
        is_admin: false
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration."
    });
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
        `SELECT * FROM players 
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
        player: {
          id: player.id,
          username: player.username,
          email: player.email,
          level: player.level,
          exp: player.exp,
          max_hp: player.max_hp,
          current_hp: player.current_hp,
          rp: player.rp,
          coins: player.coins,
          gems: player.gems,
          wins: player.wins,
          losses: player.losses,
          is_admin: !!player.is_admin
        }
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