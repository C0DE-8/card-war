import { useEffect, useRef, useState } from "react";
import styles from "./Dashboard.module.css";

function LayerImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  const visible = Boolean(src) && !failed;

  if (!visible) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

export default function VisualStage({ visuals, showEntity, entityName }) {
  const [bgUrl, setBgUrl] = useState(visuals?.background || null);
  const [bgVisible, setBgVisible] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setBgUrl(visuals?.background || null);
      return;
    }
    setBgVisible(false);
    const timer = setTimeout(() => {
      setBgUrl(visuals?.background || null);
      setBgVisible(true);
    }, 220);
    return () => clearTimeout(timer);
  }, [visuals?.background]);

  return (
    <section className={styles.stageArea} aria-label="Encounter stage">
      <div
        className={`${styles.bgLayer} ${!bgUrl ? styles.darkMistBg : ""}`}
        style={{
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
          opacity: bgVisible ? 1 : 0,
        }}
      />

      <div className={styles.layerContainer}>
        <div className={styles.userSlot}>
          <LayerImage
            src={visuals?.user_vessel}
            alt="Player vessel"
            className={`${styles.spriteImg} ${styles.userSprite}`}
          />
        </div>

        {showEntity && (
          <div className={styles.entitySlot}>
            <LayerImage
              src={visuals?.entity}
              alt={entityName || "Entity"}
              className={`${styles.spriteImg} ${styles.entitySprite}`}
            />
          </div>
        )}
      </div>
    </section>
  );
}
