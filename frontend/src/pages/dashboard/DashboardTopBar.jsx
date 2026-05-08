import { BadgePlus, Gem, LogOut, Shield, Trophy } from "lucide-react";
import styles from "./Dashboard.module.css";

export default function DashboardTopBar({ player, onLogout }) {
  const resources = [
    { label: "Level", value: player?.level ?? 1, icon: Shield, variant: "level" },
    { label: "EXP", value: player?.exp ?? 0, icon: BadgePlus, variant: "exp" },
    { label: "RP", value: player?.rp ?? 0, icon: Trophy, variant: "rp" },
    { label: "Coins", value: player?.coins ?? 0, icon: Trophy, variant: "coins" },
    { label: "Gems", value: player?.gems ?? 0, icon: Gem, variant: "gems" }
  ];

  return (
    <header className={styles.topBar}>
      <div className={styles.resourceStrip}>
        {resources.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className={`${styles.resourcePill} ${styles[item.variant]}`}
              aria-label={item.label}
            >
              <span className={styles.resourceIcon}>
                <Icon size={22} />
              </span>
              <strong>{item.value}</strong>
            </article>
          );
        })}
      </div>

      <button className={styles.logout} type="button" onClick={onLogout}>
        <LogOut size={18} />
        Logout
      </button>
    </header>
  );
}
