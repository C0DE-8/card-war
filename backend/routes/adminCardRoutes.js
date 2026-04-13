const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");
const uploadCardImage = require("../middleware/uploadCardImage");
const { ALLOWED_TYPES, ALLOWED_EFFECTS } = require("../constants/adminConstants");
const {
  isNonNegativeNumber,
  normalizeCardRow,
  getCardByIdQuery
} = require("../utils/cardUtils");

const router = express.Router();

// POST /api/admin/cards/create
router.post(
  "/cards/create",
  authenticateToken,
  requireAdmin,
  uploadCardImage.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        type,
        power,
        magic,
        skill,
        effect,
        value,
        rarity_id,
        description
      } = req.body;

      if (!name || !type || !rarity_id || !description) {
        return res.status(400).json({
          success: false,
          message: "Name, type, rarity_id, and description are required."
        });
      }

      if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid card type. Allowed: character, ability."
        });
      }

      const numericRarityId = Number(rarity_id);

      if (!numericRarityId || Number.isNaN(numericRarityId)) {
        return res.status(400).json({
          success: false,
          message: "Valid rarity_id is required."
        });
      }

      const [rarityRows] = await db.execute(
        `SELECT id, name FROM rarities WHERE id = ? LIMIT 1`,
        [numericRarityId]
      );

      if (rarityRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid rarity_id."
        });
      }

      const imagePath = req.file ? `/uploads/cards/${req.file.filename}` : null;
      const imageFilename = req.file ? req.file.filename : null;
      const imageMimeType = req.file ? req.file.mimetype : null;

      if (type === "character") {
        const numericPower = Number(power);
        const numericMagic = Number(magic);
        const numericSkill = Number(skill);

        if (
          !isNonNegativeNumber(numericPower) ||
          !isNonNegativeNumber(numericMagic) ||
          !isNonNegativeNumber(numericSkill)
        ) {
          return res.status(400).json({
            success: false,
            message: "Character cards require non-negative power, magic, and skill values."
          });
        }

        const [result] = await db.execute(
          `INSERT INTO cards
          (
            name,
            type,
            power,
            magic,
            skill,
            rarity_id,
            description,
            image_path,
            image_filename,
            image_mime_type,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            name,
            type,
            numericPower,
            numericMagic,
            numericSkill,
            numericRarityId,
            description,
            imagePath,
            imageFilename,
            imageMimeType
          ]
        );

        const [createdRows] = await db.execute(getCardByIdQuery(), [result.insertId]);

        return res.status(201).json({
          success: true,
          message: "Character card created successfully.",
          card: normalizeCardRow(req, createdRows[0])
        });
      }

      if (type === "ability") {
        const numericValue = Number(value);

        if (!effect || !ALLOWED_EFFECTS.includes(effect)) {
          return res.status(400).json({
            success: false,
            message: `Invalid effect. Allowed: ${ALLOWED_EFFECTS.join(", ")}`
          });
        }

        if (!isNonNegativeNumber(numericValue)) {
          return res.status(400).json({
            success: false,
            message: "Ability cards require a non-negative value."
          });
        }

        const [result] = await db.execute(
          `INSERT INTO cards
          (
            name,
            type,
            effect,
            value,
            rarity_id,
            description,
            image_path,
            image_filename,
            image_mime_type,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            name,
            type,
            effect,
            numericValue,
            numericRarityId,
            description,
            imagePath,
            imageFilename,
            imageMimeType
          ]
        );

        const [createdRows] = await db.execute(getCardByIdQuery(), [result.insertId]);

        return res.status(201).json({
          success: true,
          message: "Ability card created successfully.",
          card: normalizeCardRow(req, createdRows[0])
        });
      }

      return res.status(400).json({
        success: false,
        message: "Unsupported card type."
      });
    } catch (error) {
      console.error("Create card error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while creating card."
      });
    }
  }
);

// PUT /api/admin/cards/:id
router.put(
  "/cards/:id",
  authenticateToken,
  requireAdmin,
  uploadCardImage.single("image"),
  async (req, res) => {
    try {
      const cardId = Number(req.params.id);

      if (!cardId || Number.isNaN(cardId)) {
        return res.status(400).json({
          success: false,
          message: "Valid card ID is required."
        });
      }

      const {
        name,
        power,
        magic,
        skill,
        effect,
        value,
        rarity_id,
        description,
        is_active
      } = req.body;

      const [existingCards] = await db.execute(
        `SELECT * FROM cards WHERE id = ? LIMIT 1`,
        [cardId]
      );

      if (existingCards.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Card not found."
        });
      }

      const existingCard = existingCards[0];

      const updatedName = name ?? existingCard.name;
      const updatedDescription = description ?? existingCard.description;
      const updatedIsActive =
        typeof is_active === "string"
          ? is_active === "true"
          : typeof is_active === "boolean"
            ? is_active
            : !!existingCard.is_active;

      const updatedRarityId =
        rarity_id !== undefined ? Number(rarity_id) : existingCard.rarity_id;

      const [rarityRows] = await db.execute(
        `SELECT id FROM rarities WHERE id = ? LIMIT 1`,
        [updatedRarityId]
      );

      if (rarityRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid rarity_id."
        });
      }

      let imagePath = existingCard.image_path;
      let imageFilename = existingCard.image_filename;
      let imageMimeType = existingCard.image_mime_type;

      if (req.file) {
        imagePath = `/uploads/cards/${req.file.filename}`;
        imageFilename = req.file.filename;
        imageMimeType = req.file.mimetype;
      } else if (
        updatedName &&
        updatedName !== existingCard.name &&
        existingCard.image_filename &&
        existingCard.image_path
      ) {
        const oldAbsolutePath = path.join(process.cwd(), existingCard.image_path.replace(/^\/+/, ""));
        const extension = path.extname(existingCard.image_filename);
        const safeName = String(updatedName)
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "");
        const renamedFile = `${safeName}${extension}`;
        const newRelativePath = `/uploads/cards/${renamedFile}`;
        const newAbsolutePath = path.join(process.cwd(), newRelativePath.replace(/^\/+/, ""));

        if (fs.existsSync(oldAbsolutePath)) {
          fs.renameSync(oldAbsolutePath, newAbsolutePath);
          imagePath = newRelativePath;
          imageFilename = renamedFile;
        }
      }

      if (existingCard.type === "character") {
        const updatedPower =
          power !== undefined ? Number(power) : Number(existingCard.power);
        const updatedMagic =
          magic !== undefined ? Number(magic) : Number(existingCard.magic);
        const updatedSkill =
          skill !== undefined ? Number(skill) : Number(existingCard.skill);

        if (
          !isNonNegativeNumber(updatedPower) ||
          !isNonNegativeNumber(updatedMagic) ||
          !isNonNegativeNumber(updatedSkill)
        ) {
          return res.status(400).json({
            success: false,
            message: "Character stats cannot be negative."
          });
        }

        await db.execute(
          `UPDATE cards
           SET
             name = ?,
             power = ?,
             magic = ?,
             skill = ?,
             rarity_id = ?,
             description = ?,
             image_path = ?,
             image_filename = ?,
             image_mime_type = ?,
             is_active = ?
           WHERE id = ?`,
          [
            updatedName,
            updatedPower,
            updatedMagic,
            updatedSkill,
            updatedRarityId,
            updatedDescription,
            imagePath,
            imageFilename,
            imageMimeType,
            updatedIsActive,
            cardId
          ]
        );
      } else if (existingCard.type === "ability") {
        const updatedEffect = effect ?? existingCard.effect;
        const updatedValue =
          value !== undefined ? Number(value) : Number(existingCard.value);

        if (!updatedEffect || !ALLOWED_EFFECTS.includes(updatedEffect)) {
          return res.status(400).json({
            success: false,
            message: `Invalid effect. Allowed: ${ALLOWED_EFFECTS.join(", ")}`
          });
        }

        if (!isNonNegativeNumber(updatedValue)) {
          return res.status(400).json({
            success: false,
            message: "Ability value cannot be negative."
          });
        }

        await db.execute(
          `UPDATE cards
           SET
             name = ?,
             effect = ?,
             value = ?,
             rarity_id = ?,
             description = ?,
             image_path = ?,
             image_filename = ?,
             image_mime_type = ?,
             is_active = ?
           WHERE id = ?`,
          [
            updatedName,
            updatedEffect,
            updatedValue,
            updatedRarityId,
            updatedDescription,
            imagePath,
            imageFilename,
            imageMimeType,
            updatedIsActive,
            cardId
          ]
        );
      } else {
        return res.status(400).json({
          success: false,
          message: "Unsupported card type."
        });
      }

      const [updatedRows] = await db.execute(getCardByIdQuery(), [cardId]);

      return res.status(200).json({
        success: true,
        message: "Card updated successfully.",
        card: normalizeCardRow(req, updatedRows[0])
      });
    } catch (error) {
      console.error("Update card error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while updating card."
      });
    }
  }
);

// DELETE /api/admin/cards/:id
router.delete("/cards/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cardId = Number(req.params.id);

    if (!cardId || Number.isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        message: "Valid card ID is required."
      });
    }

    const [existingCards] = await db.execute(
      `SELECT id FROM cards WHERE id = ? LIMIT 1`,
      [cardId]
    );

    if (existingCards.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Card not found."
      });
    }

    await db.execute(
      `UPDATE cards
       SET is_active = FALSE
       WHERE id = ?`,
      [cardId]
    );

    return res.status(200).json({
      success: true,
      message: "Card deactivated successfully."
    });
  } catch (error) {
    console.error("Delete card error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deactivating card."
    });
  }
});

// GET /api/admin/rarities
router.get("/rarities", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, color, drop_rate FROM rarities ORDER BY id ASC`
    );

    return res.status(200).json({
      success: true,
      rarities: rows
    });
  } catch (error) {
    console.error("List rarities error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching rarities."
    });
  }
});

// GET /api/admin/cards
router.get("/cards", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [cards] = await db.execute(
      `SELECT
        c.id,
        c.name,
        c.type,
        c.power,
        c.magic,
        c.skill,
        c.effect,
        c.value,
        c.description,
        c.is_active,
        c.created_at,
        c.updated_at,
        c.image_path,
        c.image_filename,
        c.image_mime_type,
        r.id AS rarity_id,
        r.name AS rarity_name,
        r.color AS rarity_color
       FROM cards c
       JOIN rarities r ON c.rarity_id = r.id
       ORDER BY c.id DESC`
    );

    return res.status(200).json({
      success: true,
      count: cards.length,
      cards: cards.map((card) => normalizeCardRow(req, card))
    });
  } catch (error) {
    console.error("List cards error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching cards."
    });
  }
});

// GET /api/admin/cards/:id
router.get("/cards/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cardId = Number(req.params.id);

    if (!cardId || Number.isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        message: "Valid card ID is required."
      });
    }

    const [rows] = await db.execute(getCardByIdQuery(), [cardId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Card not found."
      });
    }

    return res.status(200).json({
      success: true,
      card: normalizeCardRow(req, rows[0])
    });
  } catch (error) {
    console.error("Get card error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching card."
    });
  }
});

module.exports = router;