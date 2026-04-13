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

export const createAdminCard = async (payload) => {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("type", payload.type);
  formData.append("rarity_id", String(payload.rarity_id));
  formData.append("description", payload.description);

  if (payload.type === "character") {
    formData.append("power", String(payload.power ?? 0));
    formData.append("magic", String(payload.magic ?? 0));
    formData.append("skill", String(payload.skill ?? 0));
  } else {
    formData.append("effect", payload.effect);
    formData.append("value", String(payload.value ?? 0));
  }

  if (payload.image) {
    formData.append("image", payload.image);
  }

  const response = await api.post("/admin/cards/create", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

export const updateAdminCard = async (cardId, cardType, payload) => {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("description", payload.description);
  formData.append("rarity_id", String(payload.rarity_id));
  formData.append("is_active", payload.is_active ? "true" : "false");

  if (cardType === "character") {
    formData.append("power", String(payload.power ?? 0));
    formData.append("magic", String(payload.magic ?? 0));
    formData.append("skill", String(payload.skill ?? 0));
  } else {
    formData.append("effect", payload.effect);
    formData.append("value", String(payload.value ?? 0));
  }

  if (payload.image) {
    formData.append("image", payload.image);
  }

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
