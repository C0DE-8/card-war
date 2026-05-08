import { Trophy } from "lucide-react";
import styles from "./ProfileBanner.module.css";

export default function ProfileBanner({ player, onOpen }) {
  return (
    <button type="button" className={styles.profileBanner} onClick={onOpen}>
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
    </button>
  );
}
