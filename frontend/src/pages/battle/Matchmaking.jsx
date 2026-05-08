import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { cancelMatch, createMatch, getMatch } from "../../api/playApi";
import styles from "./Battle.module.css";

export default function Matchmaking() {
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const pollRef = useRef(null);
  const [matchId, setMatchId] = useState(null);
  const [statusText, setStatusText] = useState("Starting matchmaking...");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        const data = await createMatch();
        if (cancelled) return;

        const nextMatchId = data?.match?.id || data?.match_id;
        if (!nextMatchId) {
          throw new Error("MATCH_ID_MISSING");
        }

        if (data?.match?.status === "in_progress") {
          navigate(`/match/${nextMatchId}`, { replace: true });
          return;
        }

        setMatchId(nextMatchId);
        setStatusText("Looking for a player...");

        pollRef.current = setInterval(async () => {
          try {
            const matchData = await getMatch(nextMatchId);
            const match = matchData?.match;
            if (match?.status === "in_progress") {
              clearInterval(pollRef.current);
              navigate(`/match/${nextMatchId}`, { replace: true });
            }
            if (match?.status === "cancelled") {
              clearInterval(pollRef.current);
              navigate("/dashboard", { replace: true });
            }
          } catch (error) {
            toast.error(error?.response?.data?.message || "Could not check match status.");
          }
        }, 1200);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Could not start matchmaking.");
        navigate("/dashboard", { replace: true });
      }
    };

    start();

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [navigate]);

  const handleCancel = async () => {
    if (!matchId) {
      navigate("/dashboard", { replace: true });
      return;
    }

    try {
      setCancelling(true);
      await cancelMatch(matchId);
      toast.success("Matchmaking cancelled.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not cancel matchmaking.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.panel}>
        <h1 className={styles.title}>Looking For Player</h1>
        <p className={styles.text}>
          {statusText} If no real player joins shortly, a same-level bot will enter the match.
        </p>
        <div className={styles.spinner} aria-hidden="true" />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling" : "Cancel"}
          </button>
        </div>
      </section>
    </div>
  );
}
