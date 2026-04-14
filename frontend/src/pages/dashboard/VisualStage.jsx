import styles from "./Dashboard.module.css";

export default function VisualStage() {
  return (
    <section className={styles.visualStage} aria-label="Card War arena preview">
      <div className={styles.stageGlow} />
      <div className={styles.stageGrid} />
      <div className={styles.stageBadge}>
        <p className={styles.stageBadgeTitle}>Arena Status</p>
        <p className={styles.stageBadgeText}>Live season queue open</p>
      </div>
    </section>
  );
}
