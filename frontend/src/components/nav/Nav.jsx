import styles from "./Nav.module.css";

export default function Nav({ items, onNavigate }) {
  return (
    <nav className={styles.bottomNav} aria-label="Main navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.count ? <span className={styles.navBadge}>{item.count}</span> : null}
            <Icon size={34} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
