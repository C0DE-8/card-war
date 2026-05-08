import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Image as ImageIcon, RefreshCw } from "lucide-react";
import { getPlayerCardById, getPlayerCards } from "../../api/playerCards";
import styles from "./MyCards.module.css";

const formatRange = (min, max) => `${min ?? 0}-${max ?? 0}`;

const getCardStatLine = (card) => {
  if (!card) return "";
  if (card.type === "character") {
    return `P ${formatRange(card.effective_power_min, card.effective_power_max)} · M ${formatRange(
      card.effective_magic_min,
      card.effective_magic_max
    )} · S ${formatRange(card.effective_skill_min, card.effective_skill_max)}`;
  }
  return `${card.effect || "ability"} · ${card.value ?? 0}`;
};

const getStatBoxes = (card) => {
  if (!card) return [];
  if (card.type === "character") {
    return [
      { label: "Level", value: `${card.current_level ?? 1}/${card.card_level_cap ?? 11}` },
      { label: "Cost", value: card.cost ?? 1 },
      { label: "Power", value: formatRange(card.effective_power_min, card.effective_power_max) },
      { label: "Magic", value: formatRange(card.effective_magic_min, card.effective_magic_max) },
      { label: "Skill", value: formatRange(card.effective_skill_min, card.effective_skill_max) },
      { label: "Owned", value: card.quantity ?? 0 }
    ];
  }
  return [
    { label: "Effect", value: card.effect || "-" },
    { label: "Value", value: card.value ?? 0 },
    { label: "Cost", value: card.cost ?? 1 },
    { label: "Owned", value: card.quantity ?? 0 }
  ];
};

const getRarityClass = (rarityName) => {
  const normalized = String(rarityName || "").trim().toLowerCase();
  if (normalized.includes("mythic")) return styles.rarityMythic;
  if (normalized.includes("legend")) return styles.rarityLegendary;
  if (normalized.includes("epic")) return styles.rarityEpic;
  if (normalized.includes("rare")) return styles.rarityRare;
  return styles.rarityCommon;
};

const CollectionCard = ({ card, selected, onSelect }) => {
  return (
    <button
      type="button"
      className={`${styles.cardButton} ${getRarityClass(card.rarity_name)} ${
        selected ? styles.cardButtonSelected : ""
      }`}
      onClick={onSelect}
    >
      <div className={styles.cardAccent} />
      <div className={styles.art}>
        {card.image_url ? (
          <img src={card.image_url} alt="" />
        ) : (
          <div className={styles.artPlaceholder}>
            <ImageIcon size={34} />
          </div>
        )}
        <div className={styles.artOverlay} />
        <span className={styles.quantity}>x{card.quantity ?? 0}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <p className={styles.cardName}>{card.name}</p>
        </div>
        <p className={styles.metaLine}>
          {card.rarity_name || "Unknown"} · {card.type}
          {card.element_type ? ` · ${card.element_type}` : ""}
        </p>
        <p className={styles.statLine}>{getCardStatLine(card)}</p>
        <div className={styles.badgeRow}>
          {card.element_type && <span className={styles.badge}>{card.element_type}</span>}
          <span className={styles.badge}>Cost {card.cost ?? 1}</span>
          <span className={styles.badge}>Owned x{card.quantity ?? 0}</span>
          {card.can_upgrade ? <span className={styles.badge}>Upgradeable</span> : null}
        </div>
      </div>
    </button>
  );
};

const MyCards = () => {
  const [cards, setCards] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPlayerCards();
      const nextCards = data?.cards || [];
      setCards(nextCards);
      setError("");

      if (nextCards.length > 0) {
        setSelectedId((currentId) => {
          const stillSelected = nextCards.some(
            (card) => String(card.player_card_id) === String(currentId)
          );
          return stillSelected ? currentId : nextCards[0].player_card_id;
        });
      } else {
        setSelectedId(null);
        setSelectedCard(null);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Could not load your card collection.";
      setError(message);
      setCards([]);
      setSelectedId(null);
      setSelectedCard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedId) {
      setSelectedCard(null);
      return undefined;
    }

    (async () => {
      try {
        setLoadingDetail(true);
        const data = await getPlayerCardById(selectedId);
        if (!cancelled) {
          setSelectedCard(data?.card || null);
        }
      } catch (err) {
        if (!cancelled) {
          setSelectedCard(null);
          toast.error(err?.response?.data?.message || "Could not load card details.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesType = typeFilter === "all" || card.type === typeFilter;
      const matchesSearch =
        !q ||
        String(card.name || "").toLowerCase().includes(q) ||
        String(card.element_type || "").toLowerCase().includes(q) ||
        String(card.rarity_name || "").toLowerCase().includes(q) ||
        String(card.effect || "").toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [cards, search, typeFilter]);

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.stateCard}>
          <p className={styles.stateTitle}>Loading cards...</p>
          <p className={styles.stateText}>Reading your collection from the player API.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <Link to="/dashboard" className={styles.backLink}>
            <ArrowLeft size={18} />
            Dashboard
          </Link>
          <p className={styles.eyebrow}>Collection</p>
          <h1 className={styles.title}>My Cards</h1>
          <p className={styles.subtitle}>
            Browse owned cards, inspect effective stats, and check rarity, element, cost, and upgrade progress.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => loadCards().then(() => toast.success("Cards refreshed"))}
          disabled={loading}
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </header>

      {error && <div className={styles.noticeError}>{error}</div>}

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search name, element, rarity, effect"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.typeSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="character">Characters</option>
          <option value="ability">Abilities</option>
        </select>
        <p className={styles.countText}>
          {filteredCards.length} of {cards.length} cards
        </p>
      </div>

      <div className={styles.layout}>
        <main className={styles.panel}>
          {filteredCards.length === 0 ? (
            <div className={styles.emptyState}>No cards match this view.</div>
          ) : (
            <div className={styles.grid}>
              {filteredCards.map((card) => (
                <CollectionCard
                  key={card.player_card_id}
                  card={card}
                  selected={String(selectedId) === String(card.player_card_id)}
                  onSelect={() => setSelectedId(card.player_card_id)}
                />
              ))}
            </div>
          )}
        </main>

        <aside className={styles.detailPanel}>
          {!selectedCard ? (
            <div className={styles.emptyState}>
              {loadingDetail ? "Loading card details..." : "Select a card to inspect it."}
            </div>
          ) : (
            <div className={`${styles.detailInner} ${getRarityClass(selectedCard.rarity_name)}`}>
              <div className={styles.detailHeader}>
                {selectedCard.image_url ? (
                  <img className={styles.detailThumb} src={selectedCard.image_url} alt="" />
                ) : (
                  <div className={styles.detailPlaceholder}>
                    <ImageIcon size={24} />
                  </div>
                )}
                <div>
                  <h2 className={styles.detailTitle}>{selectedCard.name}</h2>
                  <p className={styles.detailMeta}>
                    {selectedCard.rarity_name} · {selectedCard.type}
                    {selectedCard.element_type ? ` · ${selectedCard.element_type}` : ""}
                  </p>
                </div>
              </div>

              <p className={styles.detailText}>{selectedCard.description || "No description."}</p>

              <div className={styles.statGrid}>
                {getStatBoxes(selectedCard).map((stat) => (
                  <article key={stat.label} className={styles.statBox}>
                    <p className={styles.statLabel}>{stat.label}</p>
                    <p className={styles.statValue}>{stat.value}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default MyCards;
