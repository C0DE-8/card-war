import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  fetchActionSuggestions,
  fetchGameContext,
  fetchGameStatus,
  postGameAction,
} from "../../api/gameApi";
import styles from "./Dashboard.module.css";
import VisualStage from "./VisualStage";

function stableHash(input) {
  const str = String(input ?? "");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function makeHistoryId(userAction, systemResponse) {
  return `${stableHash(userAction)}-${stableHash(systemResponse)}`;
}

function normalizeChoices(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(String).filter(Boolean) : [];
    } catch {
      return [raw];
    }
  }
  return [];
}

function titleFromSlug(value) {
  if (!value) return "Unknown Zone";
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const userAction = String(item?.user_action || "").trim();
      const systemResponse = String(item?.system_response || "").trim();
      return {
        id: makeHistoryId(userAction, systemResponse),
        user_action: userAction,
        system_response: systemResponse,
      };
    })
    .filter((item) => item.user_action || item.system_response);
}

function playerToHud(player, fallbackHistoryCount = 0) {
  if (!player) return null;
  const year = Number(player.world_year || player.year || 1) || 1;
  const day = Number(player.world_day || player.day || fallbackHistoryCount || 1) || 1;
  const timeLabel = player.time_of_day || player.period || "Dusk";

  return {
    lifeId: player.life_id ?? player.lifeId ?? null,
    hp: Number(player.hp) || 0,
    max_hp: Number(player.max_hp) || 1,
    mp: Number(player.mp) || 0,
    max_mp: Number(player.max_mp) || 1,
    sp: Number(player.sp) || 0,
    max_sp: Number(player.max_sp) || 1,
    hunger: Number(player.hunger) || 0,
    level: Number(player.current_level) || 1,
    species: player.species || "Unknown",
    locationLabel: titleFromSlug(player.current_location || player.location_name),
    year,
    day,
    timeLabel,
    offense: Number(player.offense) || 0,
    defense: Number(player.defense) || 0,
    speed: Number(player.speed) || 0,
    vesselType: player.vessel_type || "Vessel",
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hud, setHud] = useState(null);
  const [visuals, setVisuals] = useState({
    background: null,
    user_vessel: null,
    entity: null,
  });
  const [enemyStats, setEnemyStats] = useState(null);
  const [narrative, setNarrative] = useState("");
  const [choices, setChoices] = useState([]);
  const [history, setHistory] = useState([]);
  const [pending, setPending] = useState(false);
  const [milestoneNote, setMilestoneNote] = useState(null);
  const [skills, setSkills] = useState([]);
  const [traits, setTraits] = useState([]);
  const [manualAction, setManualAction] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [consoleNotice, setConsoleNotice] = useState(null);
  const storyScrollRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const typingTimerRef = useRef(null);
  const lastAnimatedIdRef = useRef(null);
  const typedDoneRef = useRef(new Set());
  const [typing, setTyping] = useState({ id: null, text: "", done: true });

  const typedStoreKey = useMemo(
    () => `soulloop:typed_done:${hud?.lifeId ?? "global"}`,
    [hud?.lifeId]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(typedStoreKey);
      const parsed = raw ? JSON.parse(raw) : [];
      typedDoneRef.current = new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      typedDoneRef.current = new Set();
    }
  }, [typedStoreKey]);

  const applyPayload = useCallback((data, source = "status") => {
    let nextHistory = [];
    if (source === "status") {
      nextHistory = normalizeHistory(data.recent_history);
      setHistory(nextHistory);
    }

    if (data.player_state) {
      setHud(playerToHud(data.player_state, nextHistory.length));
      const playerSkills = Array.isArray(data.player_state.all_soul_skills)
        ? data.player_state.all_soul_skills.map(String)
        : [];
      const activeSkills = Array.isArray(data.player_state.active_skills)
        ? data.player_state.active_skills.map((s) => String(s.name || "")).filter(Boolean)
        : [];
      const passiveSkills = Array.isArray(data.player_state.passive_skills)
        ? data.player_state.passive_skills.map((s) => String(s.name || "")).filter(Boolean)
        : [];
      setSkills(Array.from(new Set([...playerSkills, ...activeSkills, ...passiveSkills])));
      setTraits(
        [data.player_state.vessel_type, data.player_state.species, "Keen Instincts"]
          .filter(Boolean)
          .map(String)
      );
    } else if (data.stats) {
      setHud((prev) => ({ ...(prev || {}), ...data.stats }));
    }
    if (data.visuals) {
      setVisuals({
        background: data.visuals.background ?? null,
        user_vessel: data.visuals.user_vessel ?? null,
        entity: data.visuals.entity ?? null,
      });
    }
    if (data.enemy_stats !== undefined) {
      setEnemyStats(data.enemy_stats);
    }
    if (data.system_output != null && source !== "status") {
      setNarrative(String(data.system_output));
    } else if (source === "status") {
      const latestSystemResponse = nextHistory[nextHistory.length - 1]?.system_response || "";
      setNarrative(latestSystemResponse);
    }
    if (data.choices != null) {
      setChoices(normalizeChoices(data.choices));
    }
    if (Array.isArray(data.milestones_fired) && data.milestones_fired.length) {
      setMilestoneNote(
        data.milestones_fired.map((m) => m.code || m.content).filter(Boolean).join(" · ")
      );
      setTimeout(() => setMilestoneNote(null), 8000);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchGameStatus();
        if (cancelled) return;
        applyPayload(data, "status");
        try {
          const ctx = await fetchGameContext();
          if (!cancelled && Array.isArray(ctx?.milestones_fired) && ctx.milestones_fired.length) {
            setMilestoneNote(
              ctx.milestones_fired.map((m) => m.code || m.content).filter(Boolean).join(" · ")
            );
            setTimeout(() => setMilestoneNote(null), 8000);
          }
        } catch {
          // Optional: context is non-blocking for the dashboard.
        }
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.error || e.message || "Failed to load game.");
          toast.error("Could not sync with the Soul Loop.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyPayload]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const sendAction = async (action) => {
    try {
      setPending(true);
      setConsoleNotice(null);
      const data = await postGameAction(action);
      const systemOutput = String(data?.system_output || "");
      const nextId = makeHistoryId(action, systemOutput);
      setHistory((prev) => {
        const next = [
          ...prev,
          {
            id: nextId,
            user_action: action,
            system_response: systemOutput,
          },
        ];
        return next.slice(-8);
      });
      applyPayload(data, "action");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Action failed.");
      setConsoleNotice(e.response?.data?.error || e.message || "Action failed.");
      return false;
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    const value = manualAction.trim();
    if (pending || value.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const data = await fetchActionSuggestions(value);
        const next = Array.isArray(data?.suggestions) ? data.suggestions.map(String).filter(Boolean) : [];
        setSuggestions(next.slice(0, 6));
        setSuggestOpen(next.length > 0);
      } catch {
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [manualAction, pending]);

  const scrollToBottom = useCallback((behavior = "auto") => {
    const el = storyScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const el = storyScrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const thresholdPx = 80;
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      isAtBottomRef.current = distanceFromBottom <= thresholdPx;
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Initial load: land at the bottom like a chat.
    scrollToBottom("auto");
  }, [scrollToBottom, loading, error]);

  useEffect(() => {
    // New content: keep the view pinned to the bottom *if* the user was already there.
    if (!isAtBottomRef.current) return;
    scrollToBottom("smooth");
  }, [history.length, typing.text, scrollToBottom]);

  useEffect(() => {
    const last = history[history.length - 1];
    if (!last?.system_response || !last?.id) return;

    if (lastAnimatedIdRef.current === last.id) return;
    lastAnimatedIdRef.current = last.id;

    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)")?.matches;

    const markTypedDone = () => {
      typedDoneRef.current.add(last.id);
      try {
        const ids = Array.from(typedDoneRef.current);
        const bounded = ids.slice(Math.max(0, ids.length - 200));
        localStorage.setItem(typedStoreKey, JSON.stringify(bounded));
      } catch {
        // ignore
      }
    };

    if (typedDoneRef.current.has(last.id)) {
      setTyping({ id: last.id, text: last.system_response, done: true });
      return;
    }

    if (prefersReduced) {
      setTyping({ id: last.id, text: last.system_response, done: true });
      markTypedDone();
      return;
    }

    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);

    setTyping({ id: last.id, text: "", done: false });
    let i = 0;
    const full = String(last.system_response);

    const tick = () => {
      i += 1;
      const nextText = full.slice(0, i);
      setTyping({ id: last.id, text: nextText, done: i >= full.length });
      if (i >= full.length) {
        markTypedDone();
        return;
      }

      const ch = full.charAt(i - 1);
      const delay =
        ch === "." || ch === "!" || ch === "?" ? 160 : ch === "," || ch === ";" ? 90 : 22;
      typingTimerRef.current = window.setTimeout(tick, delay);
    };

    typingTimerRef.current = window.setTimeout(tick, 80);

    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [history, typedStoreKey]);

  const submitManualAction = async () => {
    const value = manualAction.trim();
    if (!value || pending) return;
    const ok = await sendAction(value);
    if (ok) {
      setManualAction("");
      setSuggestions([]);
      setSuggestOpen(false);
    }
  };

  const handleManualKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitManualAction();
    }
  };

  const hpPct = hud
    ? Math.min(100, Math.round((hud.hp / Math.max(1, hud.max_hp)) * 100))
    : 0;
  const spPct = hud
    ? Math.min(100, Math.round((hud.sp / Math.max(1, hud.max_sp)) * 100))
    : 0;
  const mpPct = hud
    ? Math.min(100, Math.round((hud.mp / Math.max(1, hud.max_mp)) * 100))
    : 0;
  const hungerPct = hud ? Math.min(100, Math.round(Number(hud.hunger) || 0)) : 0;

  const showEntity = Boolean(visuals.entity);
  const timeline = useMemo(() => history.slice(-3).reverse(), [history]);

  const choiceClassByIndex = (index) => {
    if (index % 3 === 0) return styles.actionRed;
    if (index % 3 === 1) return styles.actionBlue;
    return styles.actionGold;
  };

  if (loading) {
    return (
      <div className={styles.shell}>
        <p className={styles.loading}>Syncing with the labyrinth…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.shell}>
        <p className={styles.error}>{error}</p>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.metaLeft}>
          <div className={styles.timeLine}>
            {hud ? `Year ${hud.year} · Day ${hud.day} · ${hud.timeLabel}` : "Soul Loop"}
          </div>
          <div className={styles.locationLine}>{hud?.locationLabel || "Unknown Zone"}</div>
        </div>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className={styles.mainLayout}>
        <div className={styles.primaryColumn}>
          {hud && (
            <div className={styles.statRow}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>
                  HP {hud.hp}/{hud.max_hp}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${styles.hp}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>
                  Energy {hud.sp}/{hud.max_sp}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${styles.sp}`}
                    style={{ width: `${spPct}%` }}
                  />
                </div>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>
                  Mana {hud.mp}/{hud.max_mp}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${styles.mp}`}
                    style={{ width: `${mpPct}%` }}
                  />
                </div>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Hunger {hungerPct}%</span>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${styles.hunger}`}
                    style={{ width: `${hungerPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <VisualStage
            visuals={visuals}
            showEntity={showEntity}
            entityName={enemyStats?.name}
          />

          <div className={styles.bottomPanel}>
            <div className={styles.bottomPanelInner}>
              <div className={styles.consoleTop}>
                {enemyStats && (
                  <div className={styles.enemyTag}>
                    {enemyStats.name} · Lv.{enemyStats.level} · Rank {enemyStats.rank} · HP{" "}
                    {enemyStats.hp}/{enemyStats.max_hp}
                  </div>
                )}
                {milestoneNote && (
                  <div className={styles.milestoneBanner}>Story: {milestoneNote}</div>
                )}
                {consoleNotice && <div className={styles.statusNotice}>{consoleNotice}</div>}
                {pending && <div className={styles.statusNotice}>The system is processing your action…</div>}
              </div>

              <div className={styles.storyScroller} ref={storyScrollRef}>
                {history.length > 0 ? (
                  <div className={styles.consoleLog} key={narrative.slice(0, 40)}>
                    {history.map((entry, idx) => (
                      <div className={styles.logEntry} key={entry.id || `${idx}-${entry.user_action.slice(0, 20)}`}>
                        <div className={styles.logLine}>
                          <span className={styles.logBadgeYou}>You</span>
                          <span className={styles.logActionText}>{entry.user_action}</span>
                        </div>
                        <div className={styles.logLine}>
                          <span className={styles.logBadgeWorld}>World</span>
                        </div>
                        <div className={styles.logResponse}>
                          {typing.id === entry.id ? typing.text : entry.system_response}
                          {typing.id === entry.id && !typing.done && (
                            <span className={styles.typingCaret} aria-hidden="true">
                              ▍
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${styles.narrative} ${styles.storyFlash}`}>
                    {narrative || "A strange silence surrounds you..."}
                  </div>
                )}
              </div>

              <div className={styles.consoleBottom}>
                <div className={styles.actions}>
                  {choices.length === 0 && (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionGold}`}
                      disabled={pending}
                      onClick={() => sendAction("Search")}
                    >
                      Search the area
                    </button>
                  )}
                  {choices.map((c, i) => (
                    <button
                      type="button"
                      key={`${i}-${c.slice(0, 24)}`}
                      className={`${styles.actionBtn} ${choiceClassByIndex(i)}`}
                      disabled={pending}
                      onClick={() => sendAction(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className={styles.inputPanel}>
                  <div className={styles.inputRow}>
                    <div className={styles.inputWrap}>
                      <div className={styles.inputLabel}>Manual action</div>
                      <input
                        className={styles.actionInput}
                        value={manualAction}
                        onChange={(e) => setManualAction(e.target.value)}
                        onKeyDown={handleManualKeyDown}
                        onFocus={() => setSuggestOpen(suggestions.length > 0)}
                        onBlur={() => setTimeout(() => setSuggestOpen(false), 120)}
                        placeholder="Type an action…"
                        disabled={pending}
                        aria-label="Manual action input"
                        autoComplete="off"
                      />
                      {suggestOpen && suggestions.length > 0 && (
                        <div
                          className={styles.suggestBox}
                          role="listbox"
                          aria-label="Action suggestions"
                        >
                          {suggestions.map((s) => (
                            <button
                              type="button"
                              key={s}
                              className={styles.suggestItem}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setManualAction(s);
                                setSuggestOpen(false);
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.sendBtn}
                      onClick={submitManualAction}
                      disabled={pending || !manualAction.trim()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.timelinePanel}>
            <div className={styles.timelineTitle}>Timeline</div>
            {timeline.map((entry, idx) => (
              <div className={styles.timelineItem} key={`${idx}-${entry.user_action}`}>
                Day {Math.max(1, history.length - idx)}: {entry.user_action || "Unknown action"}
              </div>
            ))}
            {timeline.length === 0 && <div className={styles.timelineItem}>No recorded moments yet.</div>}
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <div className={styles.sideSection}>
            <div className={styles.sideHeading}>Skills</div>
            {skills.slice(0, 6).map((skill) => (
              <div key={skill} className={styles.sideItem}>
                {skill}
              </div>
            ))}
            {skills.length === 0 && <div className={styles.sideItem}>No awakened skills</div>}
          </div>
          <div className={styles.sideSection}>
            <div className={styles.sideHeading}>Traits</div>
            {traits.slice(0, 6).map((trait) => (
              <div key={trait} className={styles.sideItem}>
                {trait}
              </div>
            ))}
            {traits.length === 0 && <div className={styles.sideItem}>No identified traits</div>}
          </div>
          {hud && (
            <div className={styles.sideSection}>
              <div className={styles.sideHeading}>Core</div>
              <div className={styles.sideItem}>Attack: {hud.offense}</div>
              <div className={styles.sideItem}>Defense: {hud.defense}</div>
              <div className={styles.sideItem}>Speed: {hud.speed}</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
