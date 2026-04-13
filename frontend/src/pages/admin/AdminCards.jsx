import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  CreditCard,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Save,
  Trash2
} from "lucide-react";
import PortalLines from "../../components/auth/PortalLines";
import locStyles from "./AdminLocations.module.css";
import styles from "./AdminCards.module.css";
import {
  getAdminCards,
  getAdminRarities,
  createAdminCard,
  updateAdminCard,
  deleteAdminCard
} from "../../api/adminCards";

const ALLOWED_EFFECTS = [
  "damage",
  "heal",
  "shield",
  "boost_power",
  "boost_magic",
  "boost_skill",
  "draw",
  "stun",
  "burn",
  "freeze"
];

const emptyCreate = () => ({
  type: "character",
  name: "",
  power: 0,
  magic: 0,
  skill: 0,
  effect: "damage",
  value: 0,
  rarity_id: "",
  description: "",
  image: null
});

const emptyEdit = () => ({
  name: "",
  power: 0,
  magic: 0,
  skill: 0,
  effect: "damage",
  value: 0,
  rarity_id: "",
  description: "",
  is_active: true,
  image: null
});

const AdminCards = () => {
  const [cards, setCards] = useState([]);
  const [rarities, setRarities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const selectedCard = useMemo(
    () => cards.find((c) => String(c.id) === String(selectedId)) || null,
    [cards, selectedId]
  );

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [cardsRes, raritiesRes] = await Promise.all([
        getAdminCards(),
        getAdminRarities()
      ]);
      setCards(cardsRes?.cards || []);
      setRarities(raritiesRes?.rarities || []);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load cards or rarities"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedCard) {
      setEditForm(emptyEdit());
      return;
    }
    setEditForm({
      name: selectedCard.name || "",
      power: selectedCard.power ?? 0,
      magic: selectedCard.magic ?? 0,
      skill: selectedCard.skill ?? 0,
      effect: selectedCard.effect || "damage",
      value: selectedCard.value ?? 0,
      rarity_id: String(selectedCard.rarity_id ?? ""),
      description: selectedCard.description || "",
      is_active: !!selectedCard.is_active,
      image: null
    });
  }, [selectedCard]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        String(c.name || "")
          .toLowerCase()
          .includes(q) ||
        String(c.type || "")
          .toLowerCase()
          .includes(q) ||
        String(c.description || "")
          .toLowerCase()
          .includes(q)
    );
  }, [cards, search]);

  const handleCreateChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setCreateForm((prev) => ({ ...prev, image: files?.[0] || null }));
      return;
    }
    if (name === "type") {
      setCreateForm((prev) => ({ ...prev, type: value }));
      return;
    }
    if (["power", "magic", "skill", "value"].includes(name)) {
      setCreateForm((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
      return;
    }
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === "image") {
      setEditForm((prev) => ({ ...prev, image: files?.[0] || null }));
      return;
    }
    if (name === "is_active") {
      setEditForm((prev) => ({ ...prev, is_active: checked }));
      return;
    }
    if (["power", "magic", "skill", "value"].includes(name)) {
      setEditForm((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
      return;
    }
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.rarity_id || !createForm.description.trim()) {
      toast.error("Name, rarity, and description are required.");
      return;
    }
    try {
      setCreating(true);
      await createAdminCard({
        ...createForm,
        rarity_id: Number(createForm.rarity_id)
      });
      toast.success("Card created");
      setCreateForm(emptyCreate());
      await loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCard) return;
    if (!editForm.name.trim() || !editForm.rarity_id || !editForm.description.trim()) {
      toast.error("Name, rarity, and description are required.");
      return;
    }
    try {
      setSavingEdit(true);
      await updateAdminCard(selectedCard.id, selectedCard.type, {
        ...editForm,
        rarity_id: Number(editForm.rarity_id)
      });
      toast.success("Card updated");
      await loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm(`Deactivate card "${card.name}"?`)) return;
    try {
      setDeletingId(card.id);
      await deleteAdminCard(card.id);
      toast.success("Card deactivated");
      if (String(selectedId) === String(card.id)) setSelectedId(null);
      await loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Deactivate failed");
    } finally {
      setDeletingId(null);
    }
  };

  const statCell = (card) => {
    if (card.type === "character") {
      return (
        <span className={styles.statsLine}>
          P {card.power ?? 0} · M {card.magic ?? 0} · S {card.skill ?? 0}
        </span>
      );
    }
    return (
      <span className={styles.statsLine}>
        {card.effect} · {card.value ?? 0}
      </span>
    );
  };

  return (
    <div className={locStyles.adminPage}>
      <PortalLines />
      <div className={locStyles.adminSmoke} />

      <div className={locStyles.adminShell}>
        <div className={locStyles.glassPanel}>
          <Link to="/admin" className={styles.backLink}>
            <ArrowLeft size={18} />
            Back to command
          </Link>

          <header className={locStyles.header}>
            <div className={locStyles.headerTop}>
              <div>
                <p className={locStyles.accessLabel}>ADMIN · CARDS</p>
                <h1 className={locStyles.rootTitle}>
                  <CreditCard
                    size={28}
                    style={{ verticalAlign: "middle", marginRight: 10 }}
                  />
                  Card library
                </h1>
              </div>
              <button
                type="button"
                className={locStyles.refreshBtn}
                onClick={() => loadAll().then(() => toast.success("Cards refreshed"))}
                disabled={loading}
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>
          </header>

          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <input
                className={styles.searchInput}
                placeholder="Search name, type, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.layout}>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>All cards</h2>
              {loading ? (
                <p className={styles.emptyState}>Loading…</p>
              ) : filteredCards.length === 0 ? (
                <p className={styles.emptyState}>No cards match.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Art</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Stats</th>
                        <th>Rarity</th>
                        <th>State</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCards.map((card) => (
                        <tr
                          key={card.id}
                          className={
                            String(selectedId) === String(card.id)
                              ? styles.rowSelected
                              : ""
                          }
                          onClick={() => setSelectedId(card.id)}
                        >
                          <td>
                            {card.image_url ? (
                              <img
                                className={styles.thumb}
                                src={card.image_url}
                                alt=""
                              />
                            ) : (
                              <div className={styles.thumbPlaceholder}>
                                <ImageIcon size={18} />
                              </div>
                            )}
                          </td>
                          <td>{card.name}</td>
                          <td>
                            <span className={styles.typePill}>{card.type}</span>
                          </td>
                          <td>{statCell(card)}</td>
                          <td>
                            <span
                              style={{
                                color: card.rarity_color || "#cbd5e1"
                              }}
                            >
                              {card.rarity_name}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                card.is_active
                                  ? styles.badgeActive
                                  : styles.badgeInactive
                              }`}
                            >
                              {card.is_active ? "active" : "off"}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                disabled={deletingId === card.id}
                                onClick={() => handleDelete(card)}
                              >
                                <Trash2 size={14} />
                                {deletingId === card.id ? "…" : "Off"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className={styles.panel} style={{ marginBottom: 18 }}>
                <h2 className={styles.panelTitle}>Create card</h2>
                <form onSubmit={handleCreateSubmit}>
                  <div className={locStyles.fieldGroup}>
                    <label>Type</label>
                    <div className={locStyles.selectWrap}>
                      <select
                        name="type"
                        value={createForm.type}
                        onChange={handleCreateChange}
                        className={locStyles.customSelect}
                      >
                        <option value="character">Character</option>
                        <option value="ability">Ability</option>
                      </select>
                    </div>
                  </div>
                  <div className={locStyles.fieldGroup}>
                    <label>Name</label>
                    <input
                      name="name"
                      value={createForm.name}
                      onChange={handleCreateChange}
                      className={locStyles.customSelect}
                    />
                  </div>
                  <div className={locStyles.fieldGroup}>
                    <label>Rarity</label>
                    <div className={locStyles.selectWrap}>
                      <select
                        name="rarity_id"
                        value={createForm.rarity_id}
                        onChange={handleCreateChange}
                        className={locStyles.customSelect}
                      >
                        <option value="">Select rarity</option>
                        {rarities.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {createForm.type === "character" ? (
                    <>
                      <div className={locStyles.fieldGroup}>
                        <label>Power</label>
                        <input
                          type="number"
                          min={0}
                          name="power"
                          value={createForm.power}
                          onChange={handleCreateChange}
                          className={locStyles.customSelect}
                        />
                      </div>
                      <div className={locStyles.fieldGroup}>
                        <label>Magic</label>
                        <input
                          type="number"
                          min={0}
                          name="magic"
                          value={createForm.magic}
                          onChange={handleCreateChange}
                          className={locStyles.customSelect}
                        />
                      </div>
                      <div className={locStyles.fieldGroup}>
                        <label>Skill</label>
                        <input
                          type="number"
                          min={0}
                          name="skill"
                          value={createForm.skill}
                          onChange={handleCreateChange}
                          className={locStyles.customSelect}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={locStyles.fieldGroup}>
                        <label>Effect</label>
                        <div className={locStyles.selectWrap}>
                          <select
                            name="effect"
                            value={createForm.effect}
                            onChange={handleCreateChange}
                            className={locStyles.customSelect}
                          >
                            {ALLOWED_EFFECTS.map((ef) => (
                              <option key={ef} value={ef}>
                                {ef}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className={locStyles.fieldGroup}>
                        <label>Value</label>
                        <input
                          type="number"
                          min={0}
                          name="value"
                          value={createForm.value}
                          onChange={handleCreateChange}
                          className={locStyles.customSelect}
                        />
                      </div>
                    </>
                  )}
                  <div className={locStyles.fieldGroup}>
                    <label>Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      value={createForm.description}
                      onChange={handleCreateChange}
                      className={locStyles.customSelect}
                    />
                  </div>
                  <div className={locStyles.fieldGroup}>
                    <label>Image (optional)</label>
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handleCreateChange}
                    />
                  </div>
                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className={styles.primaryBtn}
                      disabled={creating}
                    >
                      <Plus size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
                      {creating ? "Creating…" : "Create card"}
                    </button>
                  </div>
                </form>
              </div>

              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Edit selected</h2>
                {!selectedCard ? (
                  <p className={styles.muted}>Select a row in the table to edit.</p>
                ) : (
                  <form onSubmit={handleEditSubmit}>
                    <p className={styles.muted}>
                      Type: <strong>{selectedCard.type}</strong> · ID {selectedCard.id}
                    </p>
                    <div className={locStyles.fieldGroup}>
                      <label>Name</label>
                      <input
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className={locStyles.customSelect}
                      />
                    </div>
                    <div className={locStyles.fieldGroup}>
                      <label>Rarity</label>
                      <div className={locStyles.selectWrap}>
                        <select
                          name="rarity_id"
                          value={editForm.rarity_id}
                          onChange={handleEditChange}
                          className={locStyles.customSelect}
                        >
                          {rarities.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {selectedCard.type === "character" ? (
                      <>
                        <div className={locStyles.fieldGroup}>
                          <label>Power</label>
                          <input
                            type="number"
                            min={0}
                            name="power"
                            value={editForm.power}
                            onChange={handleEditChange}
                            className={locStyles.customSelect}
                          />
                        </div>
                        <div className={locStyles.fieldGroup}>
                          <label>Magic</label>
                          <input
                            type="number"
                            min={0}
                            name="magic"
                            value={editForm.magic}
                            onChange={handleEditChange}
                            className={locStyles.customSelect}
                          />
                        </div>
                        <div className={locStyles.fieldGroup}>
                          <label>Skill</label>
                          <input
                            type="number"
                            min={0}
                            name="skill"
                            value={editForm.skill}
                            onChange={handleEditChange}
                            className={locStyles.customSelect}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={locStyles.fieldGroup}>
                          <label>Effect</label>
                          <div className={locStyles.selectWrap}>
                            <select
                              name="effect"
                              value={editForm.effect}
                              onChange={handleEditChange}
                              className={locStyles.customSelect}
                            >
                              {ALLOWED_EFFECTS.map((ef) => (
                                <option key={ef} value={ef}>
                                  {ef}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className={locStyles.fieldGroup}>
                          <label>Value</label>
                          <input
                            type="number"
                            min={0}
                            name="value"
                            value={editForm.value}
                            onChange={handleEditChange}
                            className={locStyles.customSelect}
                          />
                        </div>
                      </>
                    )}
                    <div className={locStyles.fieldGroup}>
                      <label>Description</label>
                      <textarea
                        name="description"
                        rows={3}
                        value={editForm.description}
                        onChange={handleEditChange}
                        className={locStyles.customSelect}
                      />
                    </div>
                    <div className={locStyles.fieldGroup}>
                      <label>
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={editForm.is_active}
                          onChange={handleEditChange}
                        />{" "}
                        Active
                      </label>
                    </div>
                    <div className={locStyles.fieldGroup}>
                      <label>New image (optional)</label>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className={styles.formActions}>
                      <button
                        type="submit"
                        className={styles.primaryBtn}
                        disabled={savingEdit}
                      >
                        <Save size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
                        {savingEdit ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCards;
