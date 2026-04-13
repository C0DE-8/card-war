// src/api/gameApi.js
import api from "./axios";

export async function fetchGameStatus() {
  const { data } = await api.get("/game/status");
  return data;
}

export async function postGameAction(action) {
  const { data } = await api.post("/game/action", { action });
  return data;
}

export async function fetchGameContext() {
  const { data } = await api.get("/game/context");
  return data;
}

export async function fetchActionSuggestions(partial) {
  const { data } = await api.post("/game/suggest", { partial });
  return data;
}
