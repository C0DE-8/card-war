import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  BookOpen,
  CalendarClock,
  Crown,
  Mail,
  Shield,
  Swords,
  Trophy,
  UserCheck,
  Users,
  WalletCards
} from "lucide-react";
import api from "../../api/axios";
import { getPlayerCards } from "../../api/playerCards";
import styles from "./Dashboard.module.css";
import DashboardTopBar from "./DashboardTopBar";
import VisualStage from "./VisualStage";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [player, setPlayer] = useState(null);
  const [cards, setCards] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [battleLoading, setBattleLoading] = useState(false);

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

  const profileStats = useMemo(
    () => [
      { label: "Wins", value: player?.wins ?? 0, icon: Trophy },
      { label: "Losses", value: player?.losses ?? 0, icon: Shield },
      { label: "Owned Cards", value: cards.length, icon: WalletCards },
      { label: "Deck Cards", value: activeDeck?.cards?.length ?? 0, icon: BookOpen }
    ],
    [activeDeck, cards.length, player]
  );

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
        <DashboardTopBar player={player} onLogout={handleLogout} />

        {profileError && <div className={styles.noticeError}>{profileError}</div>}

        <main className={styles.lobby}>
          <section className={styles.profileBanner} aria-label="Player profile">
            <div className={styles.bannerArt}>
              <div className={styles.kingHead}>
                <span />
              </div>
              <div className={styles.bannerBlocks}>
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className={styles.playerPlate}>
              <div>
                <h1>{player?.username || "-"}</h1>
                <p>{player?.email || "-"}</p>
              </div>
              <div className={styles.trophyPlate}>
                <Trophy size={34} />
                <strong>{player?.rp ?? 0}</strong>
              </div>
            </div>
          </section>

          <section className={styles.rightRail} aria-label="Profile stats">
            <div className={styles.statStack}>
              {profileStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <article key={stat.label} className={styles.statTile}>
                    <Icon size={26} />
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </article>
                );
              })}
            </div>
          </section>

          <VisualStage />

          <section className={styles.eventPanel} aria-label="Backend profile details">
            <div className={styles.eventTitle}>
              <UserCheck size={22} />
              <strong>Profile</strong>
            </div>
            <div className={styles.profileDetailGrid}>
              <span>
                <UserCheck size={18} />
                ID {player?.id ?? "-"}
              </span>
              <span>
                <Mail size={18} />
                {player?.email || "-"}
              </span>
              <span>
                <CalendarClock size={18} />
                Created {player?.created_at || "-"}
              </span>
              <span>
                <CalendarClock size={18} />
                Updated {player?.updated_at || "-"}
              </span>
              <span>
                <Shield size={18} />
                {player?.is_admin ? "Admin" : "Player"}
              </span>
            </div>
          </section>

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

        <nav className={styles.bottomNav} aria-label="Main navigation">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
                onClick={() => handleNav(item.id)}
              >
                {item.count ? <span className={styles.navBadge}>{item.count}</span> : null}
                <Icon size={34} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Dashboard;
