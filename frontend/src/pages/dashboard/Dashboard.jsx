import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import styles from "./Dashboard.module.css";
import VisualStage from "./VisualStage";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await api.get("/players/profile");
        if (!cancelled) {
          setPlayer(response.data?.player || null);
          setProfileError("");
        }
      } catch (e) {
        if (!cancelled) {
          const message =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            "Could not load your profile data.";
          setProfileError(message);
          setPlayer(null);
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const quickActions = useMemo(
    () => [
      { id: "start-battle", label: "Start Battle" },
      { id: "my-cards", label: "My Cards" },
      { id: "deck-builder", label: "Deck Builder" },
      { id: "rewards", label: "Rewards" },
      { id: "profile", label: "Profile" }
    ],
    []
  );

  const recentActivity = useMemo(
    () => [
      { id: "a1", text: "Logged in and synced your latest profile data." },
      { id: "a2", text: "Starter deck remains active and battle-ready." },
      { id: "a3", text: "Season queue is open for ranked battle." }
    ],
    []
  );

  const leaderboard = useMemo(
    () => [
      { id: 1, username: "light", level: 24, rp: 487 },
      { id: 2, username: "flame", level: 22, rp: 462 },
      { id: 3, username: "storm", level: 20, rp: 439 }
    ],
    []
  );

  const gameTips = useMemo(
    () => [
      "Balance your deck costs so you can answer both aggressive and control lines.",
      "Use element counters for an edge, but remember advantage never guarantees a win.",
      "Avoid overusing one card in the same match to reduce decay pressure."
    ],
    []
  );

  const playerStats = useMemo(
    () => [
      { label: "Username", value: player?.username || "-" },
      { label: "Level", value: player?.level ?? "-" },
      { label: "EXP", value: player?.exp ?? "-" },
      { label: "RP", value: player?.rp ?? "-" },
      { label: "Coins", value: player?.coins ?? "-" },
      { label: "Gems", value: player?.gems ?? "-" },
      { label: "Wins", value: player?.wins ?? "-" },
      { label: "Losses", value: player?.losses ?? "-" }
    ],
    [player]
  );

  const handleAction = (actionId) => {
    if (actionId === "start-battle") {
      toast.success("Battle queue screen is next. Hooking up soon.");
      return;
    }
    toast("This module is ready for API integration.");
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
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>Card War Command</p>
          <h1 className={styles.title}>Welcome back, {player?.username || "Player"}</h1>
          <p className={styles.subtitle}>Your hub for battles, cards, rewards, and progression.</p>
        </div>
        <button className={styles.logout} type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {profileError && (
        <div className={styles.noticeError}>
          {profileError}
        </div>
      )}

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.sectionLabel}>Main Hub</p>
              <h2 className={styles.heroTitle}>Battle Ready</h2>
              <p className={styles.heroText}>
                Build your deck, queue your next match, and climb the Card War leaderboard.
              </p>
            </div>
            <VisualStage />
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Player Summary</h3>
            </div>
            {player ? (
              <div className={styles.statGrid}>
                {playerStats.map((stat) => (
                  <article key={stat.label} className={styles.statCard}>
                    <p className={styles.statLabel}>{stat.label}</p>
                    <p className={styles.statValue}>{stat.value}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>No player profile found for this account.</div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Quick Actions</h3>
            </div>
            <div className={styles.actionGrid}>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => handleAction(action.id)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Recent Activity</h3>
            </div>
            {recentActivity.length > 0 ? (
              <ul className={styles.activityList}>
                {recentActivity.map((item) => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>No activity yet. Start your first battle!</div>
            )}
          </section>
        </main>

        <aside className={styles.side}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Daily Loot</h3>
            </div>
            <div className={styles.lootCard}>
              <p className={styles.lootTitle}>Day 3 Reward Chest</p>
              <p className={styles.lootText}>Claim window opens in 04:12:09.</p>
              <button type="button" className={styles.claimBtn}>
                Claim Soon
              </button>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Top Players</h3>
            </div>
            <div className={styles.leaderboard}>
              {leaderboard.map((entry) => (
                <article key={entry.id} className={styles.leaderCard}>
                  <p className={styles.leaderRank}>#{entry.id}</p>
                  <div>
                    <p className={styles.leaderName}>{entry.username}</p>
                    <p className={styles.leaderMeta}>Lv.{entry.level} · {entry.rp} RP</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Game Tips</h3>
            </div>
            <ul className={styles.tipList}>
              {gameTips.map((tip) => (
                <li key={tip}>
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>System</h3>
            </div>
            <div className={styles.systemCard}>
              <p>Dashboard is now ready for live battle, deck, and rewards APIs.</p>
              <button type="button" className={styles.profileBtn} onClick={() => navigate("/dashboard")}>
                Refresh Hub
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
