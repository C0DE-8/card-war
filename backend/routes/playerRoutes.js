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
        max_hp,
        current_hp,
        rp,
        coins,
        gems,
        wins,
        losses,
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

module.exports = router;