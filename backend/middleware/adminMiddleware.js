const db = require("../config/db");

const requireAdmin = async (req, res, next) => {
  try {
    const playerId = req.user.id;

    const [rows] = await db.execute(
      `SELECT id, is_admin
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

    if (!player.is_admin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only."
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while checking admin access."
    });
  }
};

module.exports = {
  requireAdmin
};