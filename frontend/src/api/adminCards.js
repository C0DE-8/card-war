import api from "./axios";

export const getAdminRarities = async () => {
  const response = await api.get("/admin/rarities");
  return response.data;
};

export const getAdminCards = async () => {
  const response = await api.get("/admin/cards");
  return response.data;
};

export const getAdminCardById = async (cardId) => {
  const response = await api.get(`/admin/cards/${cardId}`);
  return response.data;
};

const appendCardFields = (formData, payload, cardType, includeType = false) => {
  if (includeType) {
    formData.append("type", payload.type);
  }

  formData.append("name", payload.name);
  formData.append("rarity_id", String(payload.rarity_id));
  formData.append("description", payload.description);
  formData.append("cost", String(payload.cost ?? 1));
  formData.append("is_starter_card", payload.is_starter_card ? "true" : "false");
  formData.append("starter_weight", String(payload.starter_weight ?? 1));

  if (cardType === "character") {
    formData.append("element_type", payload.element_type);
    formData.append("power", String(payload.power ?? 0));
    formData.append("magic", String(payload.magic ?? 0));
    formData.append("skill", String(payload.skill ?? 0));
    formData.append("base_card_level", String(payload.base_card_level ?? 1));
    formData.append("card_level_cap", String(payload.card_level_cap ?? 11));
    formData.append("power_min", String(payload.power_min ?? payload.power ?? 0));
    formData.append("power_max", String(payload.power_max ?? payload.power ?? 0));
    formData.append("magic_min", String(payload.magic_min ?? payload.magic ?? 0));
    formData.append("magic_max", String(payload.magic_max ?? payload.magic ?? 0));
    formData.append("skill_min", String(payload.skill_min ?? payload.skill ?? 0));
    formData.append("skill_max", String(payload.skill_max ?? payload.skill ?? 0));
  } else {
    formData.append("effect", payload.effect);
    formData.append("value", String(payload.value ?? 0));
  }

  if (payload.image) {
    formData.append("image", payload.image);
  }
};

export const createAdminCard = async (payload) => {
  const formData = new FormData();
  appendCardFields(formData, payload, payload.type, true);

  const response = await api.post("/admin/cards/create", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

export const updateAdminCard = async (cardId, cardType, payload) => {
  const formData = new FormData();

  appendCardFields(formData, payload, cardType);
  formData.append("is_active", payload.is_active ? "true" : "false");

  const response = await api.put(`/admin/cards/${cardId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

export const deleteAdminCard = async (cardId) => {
  const response = await api.delete(`/admin/cards/${cardId}`);
  return response.data;
};
