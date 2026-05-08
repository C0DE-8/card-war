import api from "./axios";

export const createMatch = async () => {
  const response = await api.post("/play/match/create");
  return response.data;
};

export const cancelMatch = async (matchId) => {
  const response = await api.post(`/play/match/${matchId}/cancel`);
  return response.data;
};

export const getMatch = async (matchId) => {
  const response = await api.get(`/play/match/${matchId}`);
  return response.data;
};
