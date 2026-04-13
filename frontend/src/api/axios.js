// src/api/axios.js
import axios from "axios";

function resolveApiBase() {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return "http://localhost:7000/api";
  const base = raw.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

const baseURL = resolveApiBase();

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;