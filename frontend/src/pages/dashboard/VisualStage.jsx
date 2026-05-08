import styles from "./Dashboard.module.css";

export default function VisualStage() {
  return (
    <section className={styles.visualStage} aria-label="Battle arena">
      <div className={styles.arenaHalo} />
      <div className={styles.arenaPlatform}>
        <div className={styles.keep}>
          <div className={styles.leftTower}>
            <span />
          </div>
          <div className={styles.centerTower}>
            <div className={styles.windowGrid}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.fireGate} />
          </div>
          <div className={styles.rightTower}>
            <span />
          </div>
        </div>
        <div className={styles.lavaLine} />
      </div>
    </section>
  );
}
