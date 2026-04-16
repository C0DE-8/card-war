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

const ELEMENT_TYPES = [
  "water",
  "fire",
  "rock",
  "wind",
  "shadow",
  "light",
  "lightning",
  "nature",
  "ice",
  "metal"
];

const NUMBER_FIELDS = [
  "power",
  "magic",
  "skill",
  "power_min",
  "power_max",
  "magic_min",
  "magic_max",
  "skill_min",
  "skill_max",
  "base_card_level",
  "card_level_cap",
  "cost",
  "value",
  "starter_weight"
];

const emptyCreate = () => ({
  type: "character",
  name: "",
  element_type: "water",
  power: 0,
  magic: 0,
  skill: 0,
  power_min: 0,
  power_max: 0,
  magic_min: 0,
  magic_max: 0,
  skill_min: 0,
  skill_max: 0,
  base_card_level: 1,
  card_level_cap: 11,
  cost: 1,
  effect: "damage",
  value: 0,
  rarity_id: "",
  description: "",
  is_starter_card: false,
  starter_weight: 1,
  image: null
});

const emptyEdit = () => ({
  name: "",
  element_type: "water",
  power: 0,
  magic: 0,
  skill: 0,
  power_min: 0,
  power_max: 0,
  magic_min: 0,
  magic_max: 0,
  skill_min: 0,
  skill_max: 0,
  base_card_level: 1,
  card_level_cap: 11,
  cost: 1,
  effect: "damage",
  value: 0,
  rarity_id: "",
  description: "",
  is_active: true,
  is_starter_card: false,
  starter_weight: 1,
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
      element_type: selectedCard.element_type || "water",
      power: selectedCard.power ?? 0,
      magic: selectedCard.magic ?? 0,
      skill: selectedCard.skill ?? 0,
      power_min: selectedCard.power_min ?? selectedCard.power ?? 0,
      power_max: selectedCard.power_max ?? selectedCard.power ?? 0,
      magic_min: selectedCard.magic_min ?? selectedCard.magic ?? 0,
      magic_max: selectedCard.magic_max ?? selectedCard.magic ?? 0,
      skill_min: selectedCard.skill_min ?? selectedCard.skill ?? 0,
      skill_max: selectedCard.skill_max ?? selectedCard.skill ?? 0,
      base_card_level: selectedCard.base_card_level ?? 1,
      card_level_cap: selectedCard.card_level_cap ?? 11,
      cost: selectedCard.cost ?? 1,
      effect: selectedCard.effect || "damage",
      value: selectedCard.value ?? 0,
      rarity_id: String(selectedCard.rarity_id ?? ""),
      description: selectedCard.description || "",
      is_active: !!selectedCard.is_active,
      is_starter_card: !!selectedCard.is_starter_card,
      starter_weight: selectedCard.starter_weight ?? 1,
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

  const validateCardForm = (form, cardType) => {
    if (!form.name.trim() || !form.rarity_id || !form.description.trim()) {
      return "Name, rarity, and description are required.";
    }
    if (!Number.isInteger(Number(form.cost)) || Number(form.cost) < 1) {
      return "Cost must be an integer of at least 1.";
    }
    if (!Number.isInteger(Number(form.starter_weight)) || Number(form.starter_weight) < 1) {
      return "Starter weight must be an integer of at least 1.";
    }
    if (cardType === "character") {
      if (!String(form.element_type || "").trim()) {
        return "Character cards require an element type.";
      }
      if (
        !Number.isInteger(Number(form.base_card_level)) ||
        !Number.isInteger(Number(form.card_level_cap)) ||
        Number(form.base_card_level) < 1 ||
        Number(form.card_level_cap) < Number(form.base_card_level)
      ) {
        return "Level cap must be greater than or equal to base level.";
      }
      const statRanges = [
        ["Power", form.power, form.power_min, form.power_max],
        ["Magic", form.magic, form.magic_min, form.magic_max],
        ["Skill", form.skill, form.skill_min, form.skill_max]
      ];
      for (const [label, value, min, max] of statRanges) {
        if (Number(value) < 0 || Number(min) < 0 || Number(max) < 0) {
          return `${label} values cannot be negative.`;
        }
        if (Number(max) < Number(min)) {
          return `${label} max must be greater than or equal to min.`;
        }
      }
    }
    return null;
  };

  const handleCreateChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === "image") {
      setCreateForm((prev) => ({ ...prev, image: files?.[0] || null }));
      return;
    }
    if (type === "checkbox") {
      setCreateForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === "type") {
      setCreateForm((prev) => ({ ...emptyCreate(), ...prev, type: value }));
      return;
    }
    if (NUMBER_FIELDS.includes(name)) {
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
    if (type === "checkbox") {
      setEditForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (NUMBER_FIELDS.includes(name)) {
      setEditForm((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
      return;
    }
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const validationMessage = validateCardForm(createForm, createForm.type);
    if (validationMessage) {
      toast.error(validationMessage);
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
    const validationMessage = validateCardForm(editForm, selectedCard.type);
    if (validationMessage) {
      toast.error(validationMessage);
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
          P {card.power_min ?? card.power ?? 0}-{card.power_max ?? card.power ?? 0} · M{" "}
          {card.magic_min ?? card.magic ?? 0}-{card.magic_max ?? card.magic ?? 0} · S{" "}
          {card.skill_min ?? card.skill ?? 0}-{card.skill_max ?? card.skill ?? 0}
        </span>
      );
    }
    return (
      <span className={styles.statsLine}>
        {card.effect} · {card.value ?? 0}
      </span>
    );
  };

  const renderNumberInput = (form, changeHandler, name, label, min = 0) => (
    <div className={locStyles.fieldGroup}>
      <label>{label}</label>
      <input
        type="number"
        min={min}
        name={name}
        value={form[name]}
        onChange={changeHandler}
        className={locStyles.customSelect}
      />
    </div>
  );

  const renderCharacterFields = (form, changeHandler) => (
    <>
      <div className={locStyles.fieldGroup}>
        <label>Element</label>
        <div className={locStyles.selectWrap}>
          <select
            name="element_type"
            value={form.element_type}
            onChange={changeHandler}
            className={locStyles.customSelect}
          >
            {ELEMENT_TYPES.map((element) => (
              <option key={element} value={element}>
                {element}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.fieldGrid}>
        {renderNumberInput(form, changeHandler, "cost", "Cost", 1)}
        {renderNumberInput(form, changeHandler, "base_card_level", "Base level", 1)}
        {renderNumberInput(form, changeHandler, "card_level_cap", "Level cap", 1)}
      </div>
      <div className={styles.fieldGrid}>
        {renderNumberInput(form, changeHandler, "power", "Power", 0)}
        {renderNumberInput(form, changeHandler, "power_min", "Power min", 0)}
        {renderNumberInput(form, changeHandler, "power_max", "Power max", 0)}
      </div>
      <div className={styles.fieldGrid}>
        {renderNumberInput(form, changeHandler, "magic", "Magic", 0)}
        {renderNumberInput(form, changeHandler, "magic_min", "Magic min", 0)}
        {renderNumberInput(form, changeHandler, "magic_max", "Magic max", 0)}
      </div>
      <div className={styles.fieldGrid}>
        {renderNumberInput(form, changeHandler, "skill", "Skill", 0)}
        {renderNumberInput(form, changeHandler, "skill_min", "Skill min", 0)}
        {renderNumberInput(form, changeHandler, "skill_max", "Skill max", 0)}
      </div>
    </>
  );

  const renderAbilityFields = (form, changeHandler) => (
    <>
      <div className={styles.fieldGrid}>
        {renderNumberInput(form, changeHandler, "cost", "Cost", 1)}
        {renderNumberInput(form, changeHandler, "value", "Value", 0)}
      </div>
      <div className={locStyles.fieldGroup}>
        <label>Effect</label>
        <div className={locStyles.selectWrap}>
          <select
            name="effect"
            value={form.effect}
            onChange={changeHandler}
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
    </>
  );

  const renderStarterFields = (form, changeHandler) => (
    <>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          name="is_starter_card"
          checked={form.is_starter_card}
          onChange={changeHandler}
        />
        Starter card
      </label>
      {renderNumberInput(form, changeHandler, "starter_weight", "Starter weight", 1)}
    </>
  );

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
                        <th>Cost</th>
                        <th>Rarity</th>
                        <th>Starter</th>
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
                            {card.element_type ? (
                              <span className={styles.elementPill}>{card.element_type}</span>
                            ) : null}
                          </td>
                          <td>{statCell(card)}</td>
                          <td>{card.cost ?? 1}</td>
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
                            {card.is_starter_card ? (
                              <span className={`${styles.badge} ${styles.badgeStarter}`}>
                                {card.starter_weight ?? 1}
                              </span>
                            ) : (
                              <span className={styles.mutedInline}>No</span>
                            )}
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
                  {createForm.type === "character"
                    ? renderCharacterFields(createForm, handleCreateChange)
                    : renderAbilityFields(createForm, handleCreateChange)}
                  {renderStarterFields(createForm, handleCreateChange)}
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
                    {selectedCard.type === "character"
                      ? renderCharacterFields(editForm, handleEditChange)
                      : renderAbilityFields(editForm, handleEditChange)}
                    {renderStarterFields(editForm, handleEditChange)}
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
