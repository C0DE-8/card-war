import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  BookOpen,
  Crown,
  Swords,
  Trophy,
  Users,
  WalletCards
} from "lucide-react";
import api from "../../api/axios";
import { getPlayerCards } from "../../api/playerCards";
import ProfileBanner from "../../components/dashboard/ProfileBanner";
import ProfileModal from "../../components/dashboard/ProfileModal";
import Nav from "../../components/nav/Nav";
import TopBar from "../../components/topbar/TopBar";
import styles from "./Dashboard.module.css";
import VisualStage from "./VisualStage";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [player, setPlayer] = useState(null);
  const [cards, setCards] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [battleLoading, setBattleLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [profileResult, cardsResult, deckResult] = await Promise.allSettled([
          api.get("/players/profile"),
          getPlayerCards(),
          api.get("/players/deck/active")
        ]);

        if (cancelled) {
          return;
        }

        if (profileResult.status === "fulfilled") {
          setPlayer(profileResult.value.data?.player || null);
          setProfileError("");
        } else {
          const e = profileResult.reason;
          const message =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            "Could not load your profile data.";
          setProfileError(message);
          setPlayer(null);
        }

        if (cardsResult.status === "fulfilled") {
          setCards(cardsResult.value?.cards || []);
        } else {
          setCards([]);
        }

        if (deckResult.status === "fulfilled") {
          setActiveDeck(deckResult.value.data?.deck || null);
        } else {
          setActiveDeck(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const bottomNav = useMemo(
    () => [
      { id: "cards", label: "Cards", icon: WalletCards, count: cards.length },
      { id: "deck", label: "Deck", icon: BookOpen, count: activeDeck?.cards?.length ?? 0 },
      { id: "battle", label: "Battle", icon: Swords, active: true },
      { id: "profile", label: "Profile", icon: Users },
      { id: "rank", label: "RP", icon: Crown, count: player?.rp ?? 0 }
    ],
    [activeDeck, cards.length, player]
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleBattle = async () => {
    try {
      setBattleLoading(true);
      const response = await api.post("/play/match/create");
      const message = response.data?.message || "Match created.";
      const matchId = response.data?.match?.id || response.data?.match_id;
      toast.success(matchId ? `${message} Match #${matchId}` : message);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not create match.");
    } finally {
      setBattleLoading(false);
    }
  };

  const handleNav = (id) => {
    if (id === "cards" || id === "deck") {
      navigate("/my-cards");
      return;
    }

    if (id === "battle") {
      handleBattle();
      return;
    }

    if (id === "profile" || id === "rank") {
      setProfileOpen(true);
      return;
    }

    return;
  };

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.stateCard}>
          <p className={styles.stateTitle}>Loading dashboard...</p>
          <p className={styles.stateText}>Syncing your player profile and battle hub.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.dashboard}>
        <div className={styles.topSlot}>
          <TopBar player={player} onLogout={handleLogout} />
        </div>

        <div className={styles.noticeSlot}>
          {profileError && <div className={styles.noticeError}>{profileError}</div>}
        </div>

        <main className={styles.lobby}>
          <ProfileBanner player={player} onOpen={() => setProfileOpen(true)} />

          <VisualStage />

          <section className={styles.battleDock} aria-label="Battle controls">
            <button type="button" className={styles.deckButton} onClick={() => navigate("/my-cards")}>
              <WalletCards size={48} />
              <span>{cards.length}</span>
            </button>
            <button
              type="button"
              className={styles.battleButton}
              onClick={handleBattle}
              disabled={battleLoading}
            >
              {battleLoading ? "Matching" : "Battle"}
              <span>{activeDeck?.name || "No active deck"}</span>
            </button>
            <button type="button" className={styles.trophyButton}>
              <Trophy size={54} />
              <span>{player?.rp ?? 0}</span>
            </button>
          </section>
        </main>

        <div className={styles.navSlot}>
          <Nav items={bottomNav} onNavigate={handleNav} />
        </div>
      </div>

      {profileOpen && (
        <ProfileModal
          player={player}
          cards={cards}
          activeDeck={activeDeck}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
