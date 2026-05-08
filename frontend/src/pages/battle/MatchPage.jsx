import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getMatch } from "../../api/playApi";
import styles from "./Battle.module.css";

export default function MatchPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [matchState, setMatchState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadMatch = async () => {
      try {
        const data = await getMatch(id);
        if (!cancelled) {
          setMatchState(data);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Could not load match.");
        navigate("/dashboard", { replace: true });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMatch();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const match = matchState?.match;
  const round = matchState?.current_round;

  return (
    <div className={styles.shell}>
      <section className={styles.panel}>
        <h1 className={styles.title}>Match #{id}</h1>
        <p className={styles.text}>
          {loading
            ? "Loading match..."
            : "Opponent found. This is the match room for the battle flow."}
        </p>

        {match && (
          <div className={styles.meta}>
            <article>
              <p>Status</p>
              <strong>{match.status}</strong>
            </article>
            <article>
              <p>Round</p>
              <strong>{match.current_round_number}</strong>
            </article>
            <article>
              <p>Score</p>
              <strong>
                {match.player_one_round_wins} - {match.player_two_round_wins}
              </strong>
            </article>
            <article>
              <p>Current Stat</p>
              <strong>{round?.status || "power"}</strong>
            </article>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => getMatch(id).then(setMatchState)}
          >
            Refresh
          </button>
        </div>
      </section>
    </div>
  );
}
