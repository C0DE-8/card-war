import {
  BookOpen,
  CalendarClock,
  Mail,
  Shield,
  Trophy,
  UserCheck,
  WalletCards,
  X
} from "lucide-react";
import styles from "./ProfileBanner.module.css";

export default function ProfileModal({ player, cards, activeDeck, onClose }) {
  const deckCards = activeDeck?.cards || [];
  const detailItems = [
    { label: "Player ID", value: player?.id ?? "-", icon: UserCheck },
    { label: "Email", value: player?.email || "-", icon: Mail },
    { label: "Created", value: player?.created_at || "-", icon: CalendarClock },
    { label: "Updated", value: player?.updated_at || "-", icon: CalendarClock },
    { label: "Role", value: player?.is_admin ? "Admin" : "Player", icon: Shield }
  ];
  const statItems = [
    { label: "Level", value: player?.level ?? 1, icon: Shield },
    { label: "EXP", value: player?.exp ?? 0, icon: BookOpen },
    { label: "RP", value: player?.rp ?? 0, icon: Trophy },
    { label: "Coins", value: player?.coins ?? 0, icon: Trophy },
    { label: "Gems", value: player?.gems ?? 0, icon: Shield },
    { label: "Wins", value: player?.wins ?? 0, icon: Trophy },
    { label: "Losses", value: player?.losses ?? 0, icon: Shield },
    { label: "Owned Cards", value: cards.length, icon: WalletCards },
    { label: "Deck Cards", value: deckCards.length, icon: BookOpen }
  ];

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.profileModal}
        role="dialog"
        aria-modal="true"
        aria-label="Player profile"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <p>Profile</p>
            <h2>{player?.username || "-"}</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close profile">
            <X size={24} />
          </button>
        </header>

        <div className={styles.modalContent}>
          <section className={styles.detailPanel} aria-label="Account details">
            {detailItems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className={styles.detailItem}>
                  <Icon size={20} />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              );
            })}
          </section>

          <section className={styles.statPanel} aria-label="Player stats">
            {statItems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className={styles.statItem}>
                  <Icon size={22} />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              );
            })}
          </section>
        </div>
      </section>
    </div>
  );
}
