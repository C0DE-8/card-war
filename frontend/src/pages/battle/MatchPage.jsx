import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, Image as ImageIcon, RefreshCw } from "lucide-react";
import api from "../../api/axios";
import { getMatch, getMatchResult, playMatchCard } from "../../api/playApi";
import styles from "./Battle.module.css";

const statLabels = {
  power: "Power",
  magic: "Magic",
  skill: "Skill",
  finished: "Finished"
};

const statField = {
  power: ["effective_power_min", "effective_power_max"],
  magic: ["effective_magic_min", "effective_magic_max"],
  skill: ["effective_skill_min", "effective_skill_max"]
};

const getStatRange = (card, stat) => {
  const [minKey, maxKey] = statField[stat] || [];
  if (!minKey || !maxKey) return "-";
  return `${card?.[minKey] ?? card?.[stat] ?? 0}-${card?.[maxKey] ?? card?.[stat] ?? 0}`;
};

const getMoveValue = (move) => move?.final_value ?? move?.rolled_value ?? 0;

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const TableCard = ({ card, move, hidden, label }) => (
  <article className={`${styles.tableCard} ${hidden ? styles.cardBack : ""}`}>
    {hidden ? (
      <div className={styles.cardSigil} />
    ) : (
      <>
        <div className={styles.tableCardTitle}>
          <span>{label}</span>
          <strong>{card?.name || move?.card_name || "Played Card"}</strong>
        </div>
        <div className={styles.tableCardArt}>
          {card?.image_url || move?.image_url ? (
            <img src={card?.image_url || move?.image_url} alt="" />
          ) : (
            <ImageIcon size={34} />
          )}
        </div>
        <div className={styles.tableStats}>
          <span>P: {card?.effective_power_max ?? card?.power ?? "-"}</span>
          <span>M: {card?.effective_magic_max ?? card?.magic ?? "-"}</span>
          <span>S: {card?.effective_skill_max ?? card?.skill ?? "-"}</span>
        </div>
      </>
    )}
  </article>
);

const HandCard = ({ card, currentStat, disabled, selected, index, onPlay }) => (
  <button
    type="button"
    className={`${styles.fanCard} ${selected ? styles.fanCardSelected : ""}`}
    style={{ "--fan-index": index }}
    onClick={onPlay}
    disabled={disabled}
  >
    <span className={styles.fanCost}>{card.cost ?? 1}</span>
    <div className={styles.fanArt}>
      {card.image_url ? <img src={card.image_url} alt="" /> : <ImageIcon size={30} />}
    </div>
    <strong>{card.name}</strong>
    <span>Lv {card.current_level ?? 1}</span>
    <small>{getStatRange(card, currentStat)}</small>
  </button>
);

export default function MatchPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [matchState, setMatchState] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeDeck, setActiveDeck] = useState(null);
  const [result, setResult] = useState(null);
  const [lastPlay, setLastPlay] = useState(null);
  const [revealPlay, setRevealPlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingCardId, setPlayingCardId] = useState(null);

  const loadBattle = useCallback(async () => {
    try {
      const [matchData, profileData, deckData] = await Promise.all([
        getMatch(id),
        api.get("/players/profile"),
        api.get("/players/deck/active")
      ]);

      setMatchState(matchData);
      setProfile(profileData.data?.player || null);
      setActiveDeck(deckData.data?.deck || null);

      if (matchData?.match?.status === "finished") {
        const resultData = await getMatchResult(id);
        setResult(resultData);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load match.");
      navigate("/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadBattle();
  }, [loadBattle]);

  const match = matchState?.match;
  const round = matchState?.current_round;
  const moves = useMemo(() => matchState?.submitted_moves || [], [matchState]);
  const currentStat = round?.status || "power";
  const playerId = profile?.id;
  const opponentId = match
    ? playerId === match.player_one_id
      ? match.player_two_id
      : match.player_one_id
    : null;

  const playerRoundWins =
    playerId === match?.player_one_id
      ? match?.player_one_round_wins ?? 0
      : match?.player_two_round_wins ?? 0;
  const opponentRoundWins =
    playerId === match?.player_one_id
      ? match?.player_two_round_wins ?? 0
      : match?.player_one_round_wins ?? 0;

  const characterCards = useMemo(() => {
    return (activeDeck?.cards || [])
      .map((entry) => ({ ...entry.card, slot_number: entry.slot_number }))
      .filter((card) => card.type === "character");
  }, [activeDeck]);

  const cardById = useMemo(() => {
    return new Map(characterCards.map((card) => [Number(card.id), card]));
  }, [characterCards]);

  const revealMoves = revealPlay?.played_cards || null;
  const revealStat = revealPlay?.current_stat || currentStat;
  const currentStatMoves = moves.filter((move) => move.stat_type === currentStat);
  const playerMove = revealMoves
    ? revealMoves.find((move) => move.player_id === playerId)
    : currentStatMoves.find((move) => move.player_id === playerId);
  const opponentMove = revealMoves
    ? revealMoves.find((move) => move.player_id === opponentId)
    : currentStatMoves.find((move) => move.player_id === opponentId);
  const hasSubmittedCurrentStat = Boolean(playerMove);
  const bothRevealed = Boolean(playerMove && opponentMove);
  const matchFinished = match?.status === "finished";
  const wonMatch = result?.winner_player_id === playerId;
  const isRevealPause = Boolean(revealPlay);

  const logItems = useMemo(() => {
    if (moves.length === 0) {
      return ["System: Match started. Draw your opening card."];
    }
    return moves.slice(-6).map((move) => {
      const actor = move.player_id === playerId ? "Player" : "Opponent";
      const won = move.is_winner ? "wins" : "plays";
      return `${actor}: ${won} ${move.stat_type} with ${move.card_name} (${getMoveValue(move)}).`;
    });
  }, [moves, playerId]);

  const handlePlay = async (cardId) => {
    try {
      setPlayingCardId(cardId);
      const playResult = await playMatchCard(id, cardId);
      setLastPlay(playResult);
      if (playResult?.played_cards?.length >= 2) {
        setRevealPlay(playResult);
        await wait(2200);
        setRevealPlay(null);
      }
      await loadBattle();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not play that card.");
    } finally {
      setPlayingCardId(null);
    }
  };

  return (
    <div className={styles.playShell}>
      <div className={styles.playTable}>
        <header className={styles.playHeader}>
          <button type="button" className={styles.tableIconButton} onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={20} />
          </button>

          <section className={styles.opponentCard}>
            <div className={styles.avatarSilhouette} />
            <div className={styles.opponentInfo}>
              <span>Opponent</span>
              <strong>{opponentId ? `Player ${opponentId}` : "Waiting"}</strong>
              <div className={styles.roundTrack}>
                <i className={opponentRoundWins > 0 ? styles.trackWon : ""} />
                <i className={opponentRoundWins > 1 ? styles.trackWon : ""} />
                <i />
              </div>
            </div>
            <div className={styles.roundsWon}>
              <span>Rounds Won</span>
              <strong>{opponentRoundWins}/3</strong>
            </div>
          </section>

          <div className={styles.deckSpread} aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => (
              <i key={index} style={{ "--deck-offset": index }} />
            ))}
          </div>

          <button type="button" className={styles.tableIconButton} onClick={loadBattle}>
            <RefreshCw size={20} />
          </button>
        </header>

        <main className={styles.playGrid}>
          <aside className={styles.battleLogPanel}>
            <h2>Battle Log</h2>
            <div>
              {logItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </aside>

          <section className={styles.revealBoard}>
            <TableCard hidden={!opponentMove} move={opponentMove} label="Opponent" />

            <div className={styles.revealStrip}>
              <span />
              <div className={styles.revealText}>
                <small>
                  Current Round {match?.current_round_number ?? 1} / {statLabels[revealStat] || revealStat}
                </small>
                <strong>
                  {matchFinished
                    ? wonMatch
                      ? "Victory"
                      : "Defeat"
                    : bothRevealed
                      ? "Cards Revealed"
                      : "Choose A Card"}
                </strong>
              </div>
              <span />
            </div>

            <TableCard
              card={playerMove ? cardById.get(Number(playerMove.card_id)) : null}
              hidden={!playerMove}
              move={playerMove}
              label="Player"
            />
          </section>

          <aside className={styles.sessionPanel}>
            <h2>Game Session Win Log</h2>
            <p>Match #{id}: {match?.status || "loading"}</p>
            <p>Round: {match?.current_round_number ?? 1}</p>
            <p>Current: {statLabels[currentStat] || currentStat}</p>
            <h3>Session Summary</h3>
            <dl>
              <div>
                <dt>Rounds Won</dt>
                <dd>{playerRoundWins}</dd>
              </div>
              <div>
                <dt>Rounds Lost</dt>
                <dd>{opponentRoundWins}</dd>
              </div>
              <div>
                <dt>Cards Played</dt>
                <dd>{moves.length}</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>{matchFinished ? (wonMatch ? "Win" : "Loss") : "Active"}</dd>
              </div>
            </dl>
          </aside>
        </main>

        <footer className={styles.playFooter}>
          <div className={styles.tablePile}>Discard<br />Pile</div>

          <section className={styles.playerHand}>
            {loading ? (
              <p className={styles.handEmpty}>Loading hand...</p>
            ) : (
              characterCards.slice(0, 6).map((card, index) => (
                <HandCard
                  key={card.id}
                  card={card}
                  index={index}
                  currentStat={currentStat}
                  selected={lastPlay?.played_cards?.some((played) => played.card_id === card.id)}
                  disabled={
                    playingCardId != null ||
                    isRevealPause ||
                    hasSubmittedCurrentStat ||
                    currentStat === "finished" ||
                    matchFinished
                  }
                  onPlay={() => handlePlay(card.id)}
                />
              ))
            )}
          </section>

          <div className={styles.tablePile}>Draw<br />Pile</div>
        </footer>
      </div>
    </div>
  );
}
