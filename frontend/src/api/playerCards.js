import api from "./axios";

export const getPlayerCards = async () => {
  const response = await api.get("/players/cards");
  return response.data;
};

export const getPlayerCardById = async (playerCardId) => {
  const response = await api.get(`/players/cards/${playerCardId}`);
  return response.data;
};
