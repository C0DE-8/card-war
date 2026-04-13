import api from "./axios";

// GET all locations
export const getAdminLocations = async () => {
  const response = await api.get("/admin/locations");
  return response.data;
};

// ADD new location
export const createAdminLocation = async (payload) => {
  const formData = new FormData();

  formData.append("location_id", payload.location_id);
  formData.append("description_seed", payload.description_seed);
  formData.append("danger_level", payload.danger_level);
  formData.append("region_name", payload.region_name || "");
  formData.append("level_depth", payload.level_depth || 0);

  if (payload.image) {
    formData.append("image", payload.image);
  }

  const response = await api.post("/admin/locations/add", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

// UPDATE location
export const updateAdminLocation = async (locationId, payload) => {
  const formData = new FormData();

  formData.append("description_seed", payload.description_seed);
  formData.append("danger_level", payload.danger_level);
  formData.append("region_name", payload.region_name || "");
  formData.append("level_depth", payload.level_depth || 0);

  if (payload.image) {
    formData.append("image", payload.image);
  }

  const response = await api.post(`/admin/locations/update/${locationId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

// GET all connectors
export const getLocationConnectors = async () => {
  const response = await api.get("/admin/connectors");
  return response.data;
};

// ADD connector
export const createLocationConnector = async (payload) => {
  const response = await api.post("/admin/connectors/add", payload);
  return response.data;
};

// DELETE connector
export const deleteLocationConnector = async (connectorId) => {
  const response = await api.delete(`/admin/connectors/delete/${connectorId}`);
  return response.data;
};

// GET world map structure
export const getWorldMapStructure = async () => {
  const response = await api.get("/admin/world-map/structure");
  return response.data;
};

// CREATE shortcut connector
export const createShortcutConnector = async (payload) => {
  const response = await api.post("/admin/connectors/shortcut", payload);
  return response.data;
};