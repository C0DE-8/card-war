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
        element_type,
        power,
        magic,
        skill,
        base_card_level,
        card_level_cap,
        power_min,
        power_max,
        magic_min,
        magic_max,
        skill_min,
        skill_max,
        cost,
        effect,
        value,
        rarity_id,
        description,
        is_starter_card,
        starter_weight
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
        const numericBaseCardLevel =
          base_card_level !== undefined ? Number(base_card_level) : 1;
        const numericCardLevelCap =
          card_level_cap !== undefined ? Number(card_level_cap) : 11;

        const numericPower = power !== undefined ? Number(power) : Number(power_max ?? power_min);
        const numericMagic = magic !== undefined ? Number(magic) : Number(magic_max ?? magic_min);
        const numericSkill = skill !== undefined ? Number(skill) : Number(skill_max ?? skill_min);

        const resolvedPowerMin =
          power_min !== undefined ? Number(power_min) : numericPower;
        const resolvedPowerMax =
          power_max !== undefined ? Number(power_max) : numericPower;
        const resolvedMagicMin =
          magic_min !== undefined ? Number(magic_min) : numericMagic;
        const resolvedMagicMax =
          magic_max !== undefined ? Number(magic_max) : numericMagic;
        const resolvedSkillMin =
          skill_min !== undefined ? Number(skill_min) : numericSkill;
        const resolvedSkillMax =
          skill_max !== undefined ? Number(skill_max) : numericSkill;

        const numericCost = Number(cost);
        const normalizedElementType = typeof element_type === "string" ? element_type.trim().toLowerCase() : "";
        const numericStarterWeight =
          starter_weight !== undefined ? Number(starter_weight) : 1;
        const starterCardFlag =
          typeof is_starter_card === "string"
            ? is_starter_card === "true"
            : !!is_starter_card;

        if (
          !normalizedElementType ||
          !Number.isInteger(numericBaseCardLevel) ||
          numericBaseCardLevel < 1 ||
          !Number.isInteger(numericCardLevelCap) ||
          numericCardLevelCap < numericBaseCardLevel ||
          !isNonNegativeNumber(numericPower) ||
          !isNonNegativeNumber(numericMagic) ||
          !isNonNegativeNumber(numericSkill) ||
          !isNonNegativeNumber(resolvedPowerMin) ||
          !isNonNegativeNumber(resolvedPowerMax) ||
          resolvedPowerMax < resolvedPowerMin ||
          !isNonNegativeNumber(resolvedMagicMin) ||
          !isNonNegativeNumber(resolvedMagicMax) ||
          resolvedMagicMax < resolvedMagicMin ||
          !isNonNegativeNumber(resolvedSkillMin) ||
          !isNonNegativeNumber(resolvedSkillMax) ||
          resolvedSkillMax < resolvedSkillMin ||
          !Number.isInteger(numericCost) ||
          numericCost < 1 ||
          !Number.isInteger(numericStarterWeight) ||
          numericStarterWeight < 1
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Character cards require element_type, valid base_card_level/card_level_cap, non-negative stats, valid min/max ranges, cost >= 1, and starter_weight >= 1."
          });
        }

        const [result] = await db.execute(
          `INSERT INTO cards
          (
            name,
            type,
            element_type,
            power,
            magic,
            skill,
            base_card_level,
            card_level_cap,
            power_min,
            power_max,
            magic_min,
            magic_max,
            skill_min,
            skill_max,
            cost,
            rarity_id,
            description,
            is_starter_card,
            starter_weight,
            image_path,
            image_filename,
            image_mime_type,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            name,
            type,
            normalizedElementType,
            numericPower,
            numericMagic,
            numericSkill,
            numericBaseCardLevel,
            numericCardLevelCap,
            resolvedPowerMin,
            resolvedPowerMax,
            resolvedMagicMin,
            resolvedMagicMax,
            resolvedSkillMin,
            resolvedSkillMax,
            numericCost,
            numericRarityId,
            description,
            starterCardFlag,
            numericStarterWeight,
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
        const numericCost = cost !== undefined ? Number(cost) : 1;
        const numericStarterWeight =
          starter_weight !== undefined ? Number(starter_weight) : 1;
        const starterCardFlag =
          typeof is_starter_card === "string"
            ? is_starter_card === "true"
            : !!is_starter_card;

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
        if (!Number.isInteger(numericCost) || numericCost < 1) {
          return res.status(400).json({
            success: false,
            message: "Ability cards require cost >= 1."
          });
        }
        if (!Number.isInteger(numericStarterWeight) || numericStarterWeight < 1) {
          return res.status(400).json({
            success: false,
            message: "starter_weight must be an integer >= 1."
          });
        }

        const [result] = await db.execute(
          `INSERT INTO cards
          (
            name,
            type,
            element_type,
            cost,
            effect,
            value,
            rarity_id,
            description,
            is_starter_card,
            starter_weight,
            image_path,
            image_filename,
            image_mime_type,
            is_active
          )
          VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            name,
            type,
            numericCost,
            effect,
            numericValue,
            numericRarityId,
            description,
            starterCardFlag,
            numericStarterWeight,
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
        element_type,
        power,
        magic,
        skill,
        base_card_level,
        card_level_cap,
        power_min,
        power_max,
        magic_min,
        magic_max,
        skill_min,
        skill_max,
        cost,
        effect,
        value,
        rarity_id,
        description,
        is_active,
        is_starter_card,
        starter_weight
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
      const updatedElementType =
        existingCard.type === "character"
          ? (element_type ?? existingCard.element_type ?? "").toString().trim().toLowerCase()
          : null;
      const updatedIsActive =
        typeof is_active === "string"
          ? is_active === "true"
          : typeof is_active === "boolean"
            ? is_active
            : !!existingCard.is_active;
      const updatedStarterCard =
        typeof is_starter_card === "string"
          ? is_starter_card === "true"
          : typeof is_starter_card === "boolean"
            ? is_starter_card
            : !!existingCard.is_starter_card;
      const updatedStarterWeight =
        starter_weight !== undefined ? Number(starter_weight) : Number(existingCard.starter_weight || 1);

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
        const updatedBaseCardLevel =
          base_card_level !== undefined
            ? Number(base_card_level)
            : Number(existingCard.base_card_level ?? 1);
        const updatedCardLevelCap =
          card_level_cap !== undefined
            ? Number(card_level_cap)
            : Number(existingCard.card_level_cap ?? 11);

        const updatedPower =
          power !== undefined
            ? Number(power)
            : Number(existingCard.power ?? existingCard.power_max ?? existingCard.power_min ?? 0);
        const updatedMagic =
          magic !== undefined
            ? Number(magic)
            : Number(existingCard.magic ?? existingCard.magic_max ?? existingCard.magic_min ?? 0);
        const updatedSkill =
          skill !== undefined
            ? Number(skill)
            : Number(existingCard.skill ?? existingCard.skill_max ?? existingCard.skill_min ?? 0);

        const updatedPowerMin =
          power_min !== undefined
            ? Number(power_min)
            : Number(existingCard.power_min ?? updatedPower);
        const updatedPowerMax =
          power_max !== undefined
            ? Number(power_max)
            : Number(existingCard.power_max ?? updatedPower);
        const updatedMagicMin =
          magic_min !== undefined
            ? Number(magic_min)
            : Number(existingCard.magic_min ?? updatedMagic);
        const updatedMagicMax =
          magic_max !== undefined
            ? Number(magic_max)
            : Number(existingCard.magic_max ?? updatedMagic);
        const updatedSkillMin =
          skill_min !== undefined
            ? Number(skill_min)
            : Number(existingCard.skill_min ?? updatedSkill);
        const updatedSkillMax =
          skill_max !== undefined
            ? Number(skill_max)
            : Number(existingCard.skill_max ?? updatedSkill);

        const updatedCost =
          cost !== undefined ? Number(cost) : Number(existingCard.cost);

        if (
          !updatedElementType ||
          !Number.isInteger(updatedBaseCardLevel) ||
          updatedBaseCardLevel < 1 ||
          !Number.isInteger(updatedCardLevelCap) ||
          updatedCardLevelCap < updatedBaseCardLevel ||
          !isNonNegativeNumber(updatedPower) ||
          !isNonNegativeNumber(updatedMagic) ||
          !isNonNegativeNumber(updatedSkill) ||
          !isNonNegativeNumber(updatedPowerMin) ||
          !isNonNegativeNumber(updatedPowerMax) ||
          updatedPowerMax < updatedPowerMin ||
          !isNonNegativeNumber(updatedMagicMin) ||
          !isNonNegativeNumber(updatedMagicMax) ||
          updatedMagicMax < updatedMagicMin ||
          !isNonNegativeNumber(updatedSkillMin) ||
          !isNonNegativeNumber(updatedSkillMax) ||
          updatedSkillMax < updatedSkillMin ||
          !Number.isInteger(updatedCost) ||
          updatedCost < 1 ||
          !Number.isInteger(updatedStarterWeight) ||
          updatedStarterWeight < 1
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Character cards require element_type, valid base_card_level/card_level_cap, non-negative stats, valid min/max ranges, cost >= 1, and starter_weight >= 1."
          });
        }

        await db.execute(
          `UPDATE cards
           SET
             name = ?,
             element_type = ?,
             power = ?,
             magic = ?,
             skill = ?,
             base_card_level = ?,
             card_level_cap = ?,
             power_min = ?,
             power_max = ?,
             magic_min = ?,
             magic_max = ?,
             skill_min = ?,
             skill_max = ?,
             cost = ?,
             rarity_id = ?,
             description = ?,
             is_starter_card = ?,
             starter_weight = ?,
             image_path = ?,
             image_filename = ?,
             image_mime_type = ?,
             is_active = ?
           WHERE id = ?`,
          [
            updatedName,
            updatedElementType,
            updatedPower,
            updatedMagic,
            updatedSkill,
            updatedBaseCardLevel,
            updatedCardLevelCap,
            updatedPowerMin,
            updatedPowerMax,
            updatedMagicMin,
            updatedMagicMax,
            updatedSkillMin,
            updatedSkillMax,
            updatedCost,
            updatedRarityId,
            updatedDescription,
            updatedStarterCard,
            updatedStarterWeight,
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
        const updatedCost =
          cost !== undefined ? Number(cost) : Number(existingCard.cost);

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
        if (!Number.isInteger(updatedCost) || updatedCost < 1) {
          return res.status(400).json({
            success: false,
            message: "Ability cards require cost >= 1."
          });
        }

        await db.execute(
          `UPDATE cards
           SET
             name = ?,
             cost = ?,
             effect = ?,
             value = ?,
             rarity_id = ?,
             description = ?,
             is_starter_card = ?,
             starter_weight = ?,
             image_path = ?,
             image_filename = ?,
             image_mime_type = ?,
             is_active = ?
           WHERE id = ?`,
          [
            updatedName,
            updatedCost,
            updatedEffect,
            updatedValue,
            updatedRarityId,
            updatedDescription,
            updatedStarterCard,
            updatedStarterWeight,
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
        c.effect,
        c.value,
        c.description,
        c.is_active,
        c.is_starter_card,
        c.starter_weight,
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
