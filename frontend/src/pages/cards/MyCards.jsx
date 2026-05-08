import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  BookOpen,
  Crown,
  Filter,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Users,
  WalletCards
} from "lucide-react";
import api from "../../api/axios";
import { getPlayerCardById, getPlayerCards } from "../../api/playerCards";
import Nav from "../../components/nav/Nav";
import TopBar from "../../components/topbar/TopBar";
import styles from "./MyCards.module.css";

const formatRange = (min, max) => `${min ?? 0}-${max ?? 0}`;

const getCardStatLine = (card) => {
  if (!card) return "";
  if (card.type === "character") {
    return `P ${formatRange(card.effective_power_min, card.effective_power_max)} / M ${formatRange(
      card.effective_magic_min,
      card.effective_magic_max
    )} / S ${formatRange(card.effective_skill_min, card.effective_skill_max)}`;
  }
  return `${card.effect || "Ability"} / ${card.value ?? 0}`;
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

const CardTile = ({ card, deckSlot, selected, onSelect }) => (
  <button
    type="button"
    className={`${styles.cardTile} ${getRarityClass(card.rarity_name)} ${
      selected ? styles.cardTileSelected : ""
    }`}
    onClick={onSelect}
  >
    <span className={styles.costGem}>{card.cost ?? 1}</span>
    {deckSlot ? <span className={styles.deckSlot}>#{deckSlot}</span> : null}
    <div className={styles.cardArt}>
      {card.image_url ? (
        <img src={card.image_url} alt="" />
      ) : (
        <div className={styles.artPlaceholder}>
          <ImageIcon size={32} />
        </div>
      )}
    </div>
    <div className={styles.cardFooter}>
      <strong>{card.name}</strong>
      <span>Level {card.current_level ?? 1}</span>
    </div>
    <div className={styles.progressRail}>
      <span style={{ width: `${Math.min(100, Math.max(8, Number(card.quantity ?? 0)))}%` }} />
      <small>x{card.quantity ?? 0}</small>
    </div>
  </button>
);

const MyCards = () => {
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [cards, setCards] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pick");

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const [profileResult, cardsResult, deckResult] = await Promise.allSettled([
        api.get("/players/profile"),
        getPlayerCards(),
        api.get("/players/deck/active")
      ]);

      if (profileResult.status === "fulfilled") {
        setPlayer(profileResult.value.data?.player || null);
      } else {
        setPlayer(null);
      }

      const nextDeck =
        deckResult.status === "fulfilled" ? deckResult.value.data?.deck || null : null;

      if (deckResult.status === "fulfilled") {
        setActiveDeck(nextDeck);
      } else {
        setActiveDeck(null);
      }

      if (cardsResult.status !== "fulfilled") {
        throw cardsResult.reason;
      }

      const nextCards = cardsResult.value?.cards || [];
      setCards(nextCards);
      setError("");

      if (nextCards.length > 0) {
        const deckCardIds = new Set(
          (nextDeck?.cards || []).map((entry) => String(entry?.card?.id))
        );
        const firstDeckCard =
          nextCards.find((card) => deckCardIds.has(String(card.card_id))) || nextCards[0];

        setSelectedId((currentId) => {
          const stillSelected = nextCards.some(
            (card) => String(card.player_card_id) === String(currentId)
          );
          return stillSelected ? currentId : firstDeckCard.player_card_id;
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

  const deckSlotByCardId = useMemo(() => {
    const slotMap = new Map();
    (activeDeck?.cards || []).forEach((entry) => {
      if (entry?.card?.id) {
        slotMap.set(String(entry.card.id), entry.slot_number);
      }
    });
    return slotMap;
  }, [activeDeck]);

  const cardPickCards = useMemo(() => {
    return cards
      .filter((card) => deckSlotByCardId.has(String(card.card_id)))
      .sort(
        (a, b) =>
          (deckSlotByCardId.get(String(a.card_id)) || 99) -
          (deckSlotByCardId.get(String(b.card_id)) || 99)
      );
  }, [cards, deckSlotByCardId]);

  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = activeTab === "pick" ? cardPickCards : cards;

    return source.filter((card) => {
      const matchesType = typeFilter === "all" || card.type === typeFilter;
      const matchesSearch =
        !q ||
        String(card.name || "").toLowerCase().includes(q) ||
        String(card.element_type || "").toLowerCase().includes(q) ||
        String(card.rarity_name || "").toLowerCase().includes(q) ||
        String(card.effect || "").toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [activeTab, cardPickCards, cards, search, typeFilter]);

  const activeDeckAverageCost = useMemo(() => {
    if (cardPickCards.length === 0) return "0.0";
    const total = cardPickCards.reduce((sum, card) => sum + Number(card.cost ?? 0), 0);
    return (total / cardPickCards.length).toFixed(1);
  }, [cardPickCards]);

  const bottomNav = useMemo(
    () => [
      { id: "cards", label: "Cards", icon: WalletCards, count: cards.length, active: true },
      { id: "deck", label: "Deck", icon: BookOpen, count: cardPickCards.length },
      { id: "battle", label: "Battle", icon: Swords },
      { id: "profile", label: "Profile", icon: Users },
      { id: "rank", label: "RP", icon: Crown, count: player?.rp ?? 0 }
    ],
    [cardPickCards.length, cards.length, player]
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleNav = (id) => {
    if (id === "cards") {
      setActiveTab("all");
      return;
    }

    if (id === "deck") {
      setActiveTab("pick");
      return;
    }

    if (id === "battle") {
      navigate("/dashboard");
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className={styles.shell}>
      <div className={styles.page}>
        <TopBar player={player} onLogout={handleLogout} />

        <header className={styles.header}>
          <div>
            <Link to="/dashboard" className={styles.backLink}>
              <ArrowLeft size={18} />
              Dashboard
            </Link>
            <h1 className={styles.title}>My Cards</h1>
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

        <section className={styles.collectionPanel}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "pick" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("pick")}
            >
              <Shield size={18} />
              Card Pick
              <span>{cardPickCards.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${activeTab === "all" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <Sparkles size={18} />
              All Cards
              <span>{cards.length}</span>
            </button>
          </div>

          <div className={styles.deckSummary}>
            <strong>{activeDeck?.name || "Active Deck"}</strong>
            <span>{cardPickCards.length} selected</span>
            <span>Average cost {activeDeckAverageCost}</span>
          </div>

          <div className={styles.toolbar}>
            <label className={styles.searchBox}>
              <Search size={18} />
              <input
                placeholder="Search name, element, rarity, effect"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className={styles.typeBox}>
              <Filter size={18} />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                <option value="character">Characters</option>
                <option value="ability">Abilities</option>
              </select>
            </label>
            <p className={styles.countText}>
              {visibleCards.length} of {activeTab === "pick" ? cardPickCards.length : cards.length}
            </p>
          </div>

          <main className={styles.cardGridWrap}>
            {loading ? (
              <div className={styles.emptyState}>Loading cards from the player API.</div>
            ) : visibleCards.length === 0 ? (
              <div className={styles.emptyState}>
                {activeTab === "pick"
                  ? "No active deck cards match this view."
                  : "No cards match this view."}
              </div>
            ) : (
              <div className={styles.cardGrid}>
                {visibleCards.map((card) => (
                  <CardTile
                    key={card.player_card_id}
                    card={card}
                    deckSlot={deckSlotByCardId.get(String(card.card_id))}
                    selected={String(selectedId) === String(card.player_card_id)}
                    onSelect={() => setSelectedId(card.player_card_id)}
                  />
                ))}
              </div>
            )}
          </main>
        </section>

        <section className={styles.detailPanel}>
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
                <div className={styles.detailCopy}>
                  <h2>{selectedCard.name}</h2>
                  <p>
                    {selectedCard.rarity_name || "Unknown"} / {selectedCard.type}
                    {selectedCard.element_type ? ` / ${selectedCard.element_type}` : ""}
                  </p>
                  <strong>{getCardStatLine(selectedCard)}</strong>
                </div>
              </div>

              <p className={styles.detailText}>{selectedCard.description || "No description."}</p>

              <div className={styles.statGrid}>
                {getStatBoxes(selectedCard).map((stat) => (
                  <article key={stat.label} className={styles.statBox}>
                    <p>{stat.label}</p>
                    <strong>{stat.value}</strong>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className={styles.navSlot}>
          <Nav items={bottomNav} onNavigate={handleNav} />
        </div>
      </div>
    </div>
  );
};

export default MyCards;
