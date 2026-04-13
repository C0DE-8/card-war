function isNonNegativeNumber(value) {
  return typeof value === "number" && value >= 0;
}

function normalizeCardRow(req, card) {
  return {
    id: card.id,
    name: card.name,
    type: card.type,
    power: card.power,
    magic: card.magic,
    skill: card.skill,
    effect: card.effect,
    value: card.value,
    description: card.description,
    is_active: !!card.is_active,
    created_at: card.created_at,
    updated_at: card.updated_at,
    rarity_id: card.rarity_id,
    rarity_name: card.rarity_name,
    rarity_color: card.rarity_color,
    image_path: card.image_path || null,
    image_filename: card.image_filename || null,
    image_mime_type: card.image_mime_type || null,
    image_url: req.buildFileUrl(card.image_path)
  };
}

function getCardByIdQuery() {
  return `
    SELECT
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
    WHERE c.id = ?
    LIMIT 1
  `;
}

module.exports = {
  isNonNegativeNumber,
  normalizeCardRow,
  getCardByIdQuery
};
