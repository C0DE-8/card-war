const express = require("express");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

const STAT_SEQUENCE = ["power", "magic", "skill"];
const ROUND_TARGET = 2;

async function getActiveDeckByPlayerId(playerId) {
  const [rows] = await db.execute(
    `SELECT id, player_id, name, is_active
     FROM player_decks
     WHERE player_id = ? AND is_active = 1
     ORDER BY id DESC
     LIMIT 1`,
    [playerId]
  );
  return rows[0] || null;
}

async function getRoundMoves(roundId) {
  const [moves] = await db.execute(
    `SELECT
      m.id,
      m.round_id,
      m.player_id,
      m.stat_type,
      m.card_id,
      m.base_value,
      m.cost_value,
      m.advantage_boost,
      m.final_value,
      m.is_winner,
      m.did_decay_apply,
      m.submission_order,
      c.name AS card_name,
      c.element_type
     FROM battle_round_moves m
     JOIN cards c ON c.id = m.card_id
     WHERE m.round_id = ?
     ORDER BY m.submission_order ASC`,
    [roundId]
  );
  return moves;
}

async function getMatchSummary(matchId) {
  const [matchRows] = await db.execute(
    `SELECT
      bm.id,
      bm.player_one_id,
      bm.player_two_id,
      bm.player_one_deck_id,
      bm.player_two_deck_id,
      bm.status,
      bm.winner_player_id,
      bm.player_one_round_wins,
      bm.player_two_round_wins,
      bm.current_round_number,
      bm.created_at,
      bm.updated_at
     FROM battle_matches bm
     WHERE bm.id = ?
     LIMIT 1`,
    [matchId]
  );

  if (matchRows.length === 0) {
    return null;
  }

  const match = matchRows[0];
  const [roundRows] = await db.execute(
    `SELECT
      id,
      match_id,
      round_number,
      status,
      power_winner_player_id,
      magic_winner_player_id,
      skill_winner_player_id,
      round_winner_player_id,
      finished_at,
      created_at
     FROM battle_rounds
     WHERE match_id = ? AND round_number = ?
     LIMIT 1`,
    [matchId, match.current_round_number]
  );

  const currentRound = roundRows[0] || null;
  const submittedMoves = currentRound ? await getRoundMoves(currentRound.id) : [];

  return {
    match,
    current_round: currentRound,
    submitted_moves: submittedMoves
  };
}

function getNextStat(statType) {
  const idx = STAT_SEQUENCE.indexOf(statType);
  if (idx === -1 || idx === STAT_SEQUENCE.length - 1) {
    return null;
  }
  return STAT_SEQUENCE[idx + 1];
}

function compareTieBreaker(a, b) {
  if (a.costValue !== b.costValue) {
    return a.costValue < b.costValue ? -1 : 1;
  }
  if (a.hasAdvantage !== b.hasAdvantage) {
    return a.hasAdvantage ? -1 : 1;
  }
  if (a.totalDecayForCard !== b.totalDecayForCard) {
    return a.totalDecayForCard < b.totalDecayForCard ? -1 : 1;
  }
  if (a.submissionOrder !== b.submissionOrder) {
    return a.submissionOrder < b.submissionOrder ? -1 : 1;
  }
  return a.playerId < b.playerId ? -1 : 1;
}

async function finalizeMatchIfNeeded(connection, matchId) {
  const [matchRows] = await connection.execute(
    `SELECT *
     FROM battle_matches
     WHERE id = ?
     LIMIT 1`,
    [matchId]
  );
  const match = matchRows[0];

  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (
    match.player_one_round_wins < ROUND_TARGET &&
    match.player_two_round_wins < ROUND_TARGET
  ) {
    const nextRoundNumber = match.current_round_number + 1;

    await connection.execute(
      `UPDATE battle_matches
       SET current_round_number = ?, updated_at = NOW()
       WHERE id = ?`,
      [nextRoundNumber, matchId]
    );

    await connection.execute(
      `INSERT INTO battle_rounds (match_id, round_number, status)
       VALUES (?, ?, 'power')`,
      [matchId, nextRoundNumber]
    );

    return { finished: false };
  }

  const winnerPlayerId =
    match.player_one_round_wins >= ROUND_TARGET
      ? match.player_one_id
      : match.player_two_id;
  const loserPlayerId =
    winnerPlayerId === match.player_one_id ? match.player_two_id : match.player_one_id;

  await connection.execute(
    `UPDATE battle_matches
     SET status = 'finished', winner_player_id = ?, updated_at = NOW()
     WHERE id = ?`,
    [winnerPlayerId, matchId]
  );

  await connection.execute(
    `UPDATE players
     SET wins = wins + 1,
         rp = rp + 5
     WHERE id = ?`,
    [winnerPlayerId]
  );

  await connection.execute(
    `UPDATE players
     SET losses = losses + 1,
         rp = GREATEST(rp - 3, 0)
     WHERE id = ?`,
    [loserPlayerId]
  );

  return {
    finished: true,
    winner_player_id: winnerPlayerId,
    loser_player_id: loserPlayerId
  };
}

router.post("/match/create", authenticateToken, async (req, res) => {
  let connection;

  try {
    const playerOneId = req.user.id;
    const opponentId = Number(req.body.opponent_id);

    if (!opponentId || Number.isNaN(opponentId)) {
      return res.status(400).json({
        success: false,
        message: "Valid opponent_id is required."
      });
    }

    if (opponentId === playerOneId) {
      return res.status(400).json({
        success: false,
        message: "You cannot create a match against yourself."
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [opponentRows] = await connection.execute(
      `SELECT id FROM players WHERE id = ? LIMIT 1`,
      [opponentId]
    );
    if (opponentRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Opponent player not found."
      });
    }

    const playerOneDeck = await getActiveDeckByPlayerId(playerOneId);
    const playerTwoDeck = await getActiveDeckByPlayerId(opponentId);

    if (!playerOneDeck || !playerTwoDeck) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Both players must have an active deck before creating a match."
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO battle_matches
       (
         player_one_id,
         player_two_id,
         player_one_deck_id,
         player_two_deck_id,
         status,
         current_round_number
       )
       VALUES (?, ?, ?, ?, 'in_progress', 1)`,
      [playerOneId, opponentId, playerOneDeck.id, playerTwoDeck.id]
    );
    const matchId = result.insertId;

    await connection.execute(
      `INSERT INTO battle_rounds (match_id, round_number, status)
       VALUES (?, 1, 'power')`,
      [matchId]
    );

    await connection.commit();

    const matchSummary = await getMatchSummary(matchId);
    return res.status(201).json({
      success: true,
      message: "Match created successfully.",
      ...matchSummary
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Create match error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating match."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get("/match/:id", authenticateToken, async (req, res) => {
  try {
    const matchId = Number(req.params.id);
    const playerId = req.user.id;

    if (!matchId || Number.isNaN(matchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid match id is required."
      });
    }

    const matchSummary = await getMatchSummary(matchId);
    if (!matchSummary) {
      return res.status(404).json({
        success: false,
        message: "Match not found."
      });
    }

    const { match, current_round: currentRound } = matchSummary;
    if (match.player_one_id !== playerId && match.player_two_id !== playerId) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this match."
      });
    }

    return res.status(200).json({
      success: true,
      match: {
        id: match.id,
        status: match.status,
        player_one_id: match.player_one_id,
        player_two_id: match.player_two_id,
        player_one_deck_id: match.player_one_deck_id,
        player_two_deck_id: match.player_two_deck_id,
        current_round_number: match.current_round_number,
        player_one_round_wins: match.player_one_round_wins,
        player_two_round_wins: match.player_two_round_wins,
        winner_player_id: match.winner_player_id
      },
      current_round: currentRound,
      submitted_moves: matchSummary.submitted_moves
    });
  } catch (error) {
    console.error("Get match state error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching match state."
    });
  }
});

router.post("/match/:id/play", authenticateToken, async (req, res) => {
  let connection;

  try {
    const matchId = Number(req.params.id);
    const playerId = req.user.id;
    const cardId = Number(req.body.card_id);

    if (!matchId || Number.isNaN(matchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid match id is required."
      });
    }
    if (!cardId || Number.isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        message: "Valid card_id is required."
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [matchRows] = await connection.execute(
      `SELECT *
       FROM battle_matches
       WHERE id = ?
       LIMIT 1 FOR UPDATE`,
      [matchId]
    );

    if (matchRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Match not found."
      });
    }

    const match = matchRows[0];
    if (match.player_one_id !== playerId && match.player_two_id !== playerId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this match."
      });
    }
    if (match.status !== "in_progress") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Match is not in progress."
      });
    }

    const [roundRows] = await connection.execute(
      `SELECT *
       FROM battle_rounds
       WHERE match_id = ? AND round_number = ?
       LIMIT 1 FOR UPDATE`,
      [matchId, match.current_round_number]
    );
    if (roundRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Current round not found."
      });
    }

    const round = roundRows[0];
    if (round.status === "finished") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Current round is already finished."
      });
    }
    const currentStat = round.status;

    const playerDeckId =
      playerId === match.player_one_id ? match.player_one_deck_id : match.player_two_deck_id;
    const [deckCardRows] = await connection.execute(
      `SELECT c.*
       FROM player_deck_cards pdc
       JOIN cards c ON c.id = pdc.card_id
       WHERE pdc.deck_id = ?
         AND c.id = ?
         AND c.type = 'character'
       LIMIT 1`,
      [playerDeckId, cardId]
    );
    if (deckCardRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Selected card is not a character card in your active deck."
      });
    }
    const selectedCard = deckCardRows[0];

    const [existingMoveRows] = await connection.execute(
      `SELECT id
       FROM battle_round_moves
       WHERE round_id = ? AND player_id = ? AND stat_type = ?
       LIMIT 1`,
      [round.id, playerId, currentStat]
    );
    if (existingMoveRows.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "You already submitted for this stat clash."
      });
    }

    const [alreadySubmittedRows] = await connection.execute(
      `SELECT COUNT(*) AS count_rows
       FROM battle_round_moves
       WHERE round_id = ? AND stat_type = ?`,
      [round.id, currentStat]
    );
    const submissionOrder = Number(alreadySubmittedRows[0].count_rows) + 1;

    const [decayRows] = await connection.execute(
      `SELECT total_decay
       FROM battle_match_card_decay
       WHERE match_id = ? AND player_id = ? AND card_id = ? AND stat_type = ?
       LIMIT 1`,
      [matchId, playerId, cardId, currentStat]
    );
    const existingDecay = decayRows.length > 0 ? Number(decayRows[0].total_decay) : 0;

    const baseValue = Number(selectedCard[currentStat] || 0);

    await connection.execute(
      `INSERT INTO battle_round_moves
       (
         round_id,
         player_id,
         stat_type,
         card_id,
         base_value,
         cost_value,
         advantage_boost,
         final_value,
         is_winner,
         did_decay_apply,
         submission_order
       )
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?)`,
      [
        round.id,
        playerId,
        currentStat,
        cardId,
        baseValue,
        Number(selectedCard.cost || 1),
        baseValue - existingDecay,
        submissionOrder
      ]
    );

    const [movesRows] = await connection.execute(
      `SELECT
        m.id,
        m.player_id,
        m.card_id,
        m.base_value,
        m.cost_value,
        m.submission_order,
        c.name AS card_name,
        c.element_type
       FROM battle_round_moves m
       JOIN cards c ON c.id = m.card_id
       WHERE m.round_id = ? AND m.stat_type = ?
       ORDER BY m.submission_order ASC`,
      [round.id, currentStat]
    );

    if (movesRows.length < 2) {
      await connection.commit();
      return res.status(200).json({
        success: true,
        message: "Move submitted. Waiting for opponent action.",
        current_stat: currentStat,
        next_required_action: "wait_for_opponent_submission"
      });
    }

    const firstMove = movesRows[0];
    const secondMove = movesRows[1];

    const [firstDecayRows] = await connection.execute(
      `SELECT IFNULL(SUM(total_decay), 0) AS total_decay
       FROM battle_match_card_decay
       WHERE match_id = ? AND player_id = ? AND card_id = ?`,
      [matchId, firstMove.player_id, firstMove.card_id]
    );
    const [secondDecayRows] = await connection.execute(
      `SELECT IFNULL(SUM(total_decay), 0) AS total_decay
       FROM battle_match_card_decay
       WHERE match_id = ? AND player_id = ? AND card_id = ?`,
      [matchId, secondMove.player_id, secondMove.card_id]
    );

    const [firstStatDecayRows] = await connection.execute(
      `SELECT total_decay
       FROM battle_match_card_decay
       WHERE match_id = ? AND player_id = ? AND card_id = ? AND stat_type = ?
       LIMIT 1`,
      [matchId, firstMove.player_id, firstMove.card_id, currentStat]
    );
    const [secondStatDecayRows] = await connection.execute(
      `SELECT total_decay
       FROM battle_match_card_decay
       WHERE match_id = ? AND player_id = ? AND card_id = ? AND stat_type = ?
       LIMIT 1`,
      [matchId, secondMove.player_id, secondMove.card_id, currentStat]
    );

    const firstDecay = firstStatDecayRows.length ? Number(firstStatDecayRows[0].total_decay) : 0;
    const secondDecay = secondStatDecayRows.length ? Number(secondStatDecayRows[0].total_decay) : 0;

    const [advantageRows] = await connection.execute(
      `SELECT attacker_element, defender_element, boost_value
       FROM card_element_advantages
       WHERE (attacker_element = ? AND defender_element = ?)
          OR (attacker_element = ? AND defender_element = ?)`,
      [
        firstMove.element_type,
        secondMove.element_type,
        secondMove.element_type,
        firstMove.element_type
      ]
    );

    let firstAdvantageBoost = 0;
    let secondAdvantageBoost = 0;
    for (const advantageRow of advantageRows) {
      if (
        advantageRow.attacker_element === firstMove.element_type &&
        advantageRow.defender_element === secondMove.element_type
      ) {
        firstAdvantageBoost = Number(advantageRow.boost_value || 0);
      }
      if (
        advantageRow.attacker_element === secondMove.element_type &&
        advantageRow.defender_element === firstMove.element_type
      ) {
        secondAdvantageBoost = Number(advantageRow.boost_value || 0);
      }
    }

    const firstFinalValue = Number(firstMove.base_value) - firstDecay + firstAdvantageBoost;
    const secondFinalValue = Number(secondMove.base_value) - secondDecay + secondAdvantageBoost;

    let winningMove = firstMove;
    let losingMove = secondMove;
    if (secondFinalValue > firstFinalValue) {
      winningMove = secondMove;
      losingMove = firstMove;
    } else if (secondFinalValue === firstFinalValue) {
      const compared = compareTieBreaker(
        {
          playerId: firstMove.player_id,
          costValue: Number(firstMove.cost_value),
          hasAdvantage: firstAdvantageBoost > 0,
          totalDecayForCard: Number(firstDecayRows[0].total_decay),
          submissionOrder: Number(firstMove.submission_order)
        },
        {
          playerId: secondMove.player_id,
          costValue: Number(secondMove.cost_value),
          hasAdvantage: secondAdvantageBoost > 0,
          totalDecayForCard: Number(secondDecayRows[0].total_decay),
          submissionOrder: Number(secondMove.submission_order)
        }
      );
      if (compared > 0) {
        winningMove = secondMove;
        losingMove = firstMove;
      }
    }

    await connection.execute(
      `UPDATE battle_round_moves
       SET
         advantage_boost = ?,
         final_value = ?,
         is_winner = ?,
         did_decay_apply = ?
       WHERE id = ?`,
      [
        firstAdvantageBoost,
        firstFinalValue,
        winningMove.id === firstMove.id ? 1 : 0,
        winningMove.id === firstMove.id ? 1 : 0,
        firstMove.id
      ]
    );
    await connection.execute(
      `UPDATE battle_round_moves
       SET
         advantage_boost = ?,
         final_value = ?,
         is_winner = ?,
         did_decay_apply = ?
       WHERE id = ?`,
      [
        secondAdvantageBoost,
        secondFinalValue,
        winningMove.id === secondMove.id ? 1 : 0,
        winningMove.id === secondMove.id ? 1 : 0,
        secondMove.id
      ]
    );

    const winnerColumn = `${currentStat}_winner_player_id`;
    await connection.execute(
      `UPDATE battle_rounds
       SET ${winnerColumn} = ?
       WHERE id = ?`,
      [winningMove.player_id, round.id]
    );

    await connection.execute(
      `INSERT INTO battle_match_card_decay
       (match_id, player_id, card_id, stat_type, win_count, total_decay)
       VALUES (?, ?, ?, ?, 1, 10)
       ON DUPLICATE KEY UPDATE
         win_count = win_count + 1,
         total_decay = total_decay + 10`,
      [matchId, winningMove.player_id, winningMove.card_id, currentStat]
    );

    let nextRequiredAction = "continue_round";
    let updatedRoundStatus = round.status;
    let matchUpdate = {
      player_one_round_wins: match.player_one_round_wins,
      player_two_round_wins: match.player_two_round_wins
    };

    const nextStat = getNextStat(currentStat);
    if (nextStat) {
      updatedRoundStatus = nextStat;
      await connection.execute(
        `UPDATE battle_rounds
         SET status = ?
         WHERE id = ?`,
        [nextStat, round.id]
      );
      nextRequiredAction = `submit_${nextStat}`;
    } else {
      const statWinners = [round.power_winner_player_id, round.magic_winner_player_id, winningMove.player_id];
      const p1WinsInRound = statWinners.filter((winnerId) => winnerId === match.player_one_id).length;
      const p2WinsInRound = statWinners.filter((winnerId) => winnerId === match.player_two_id).length;
      const roundWinnerPlayerId =
        p1WinsInRound >= 2 ? match.player_one_id : match.player_two_id;

      await connection.execute(
        `UPDATE battle_rounds
         SET status = 'finished', round_winner_player_id = ?, finished_at = NOW()
         WHERE id = ?`,
        [roundWinnerPlayerId, round.id]
      );

      if (roundWinnerPlayerId === match.player_one_id) {
        matchUpdate.player_one_round_wins += 1;
      } else {
        matchUpdate.player_two_round_wins += 1;
      }

      await connection.execute(
        `UPDATE battle_matches
         SET player_one_round_wins = ?, player_two_round_wins = ?, updated_at = NOW()
         WHERE id = ?`,
        [matchUpdate.player_one_round_wins, matchUpdate.player_two_round_wins, matchId]
      );

      const finalized = await finalizeMatchIfNeeded(connection, matchId);
      if (finalized.finished) {
        nextRequiredAction = "match_finished";
        updatedRoundStatus = "finished";
      } else {
        nextRequiredAction = "new_round_power";
        updatedRoundStatus = "finished";
      }
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      current_stat: currentStat,
      played_cards: [
        {
          player_id: firstMove.player_id,
          card_id: firstMove.card_id,
          card_name: firstMove.card_name,
          base_value: Number(firstMove.base_value),
          decay_value: firstDecay,
          boost_value: firstAdvantageBoost,
          final_value: firstFinalValue
        },
        {
          player_id: secondMove.player_id,
          card_id: secondMove.card_id,
          card_name: secondMove.card_name,
          base_value: Number(secondMove.base_value),
          decay_value: secondDecay,
          boost_value: secondAdvantageBoost,
          final_value: secondFinalValue
        }
      ],
      stat_winner_player_id: winningMove.player_id,
      updated_round_state: {
        round_number: match.current_round_number,
        status: updatedRoundStatus
      },
      updated_match_score: matchUpdate,
      next_required_action: nextRequiredAction
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Play move error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while submitting move."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get("/match/:id/result", authenticateToken, async (req, res) => {
  try {
    const matchId = Number(req.params.id);
    const playerId = req.user.id;

    if (!matchId || Number.isNaN(matchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid match id is required."
      });
    }

    const [matchRows] = await db.execute(
      `SELECT *
       FROM battle_matches
       WHERE id = ?
       LIMIT 1`,
      [matchId]
    );
    if (matchRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Match not found."
      });
    }

    const match = matchRows[0];
    if (match.player_one_id !== playerId && match.player_two_id !== playerId) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this match."
      });
    }
    if (match.status !== "finished") {
      return res.status(400).json({
        success: false,
        message: "Match is not finished yet."
      });
    }

    const [roundRows] = await db.execute(
      `SELECT
        id,
        round_number,
        status,
        power_winner_player_id,
        magic_winner_player_id,
        skill_winner_player_id,
        round_winner_player_id,
        finished_at
       FROM battle_rounds
       WHERE match_id = ?
       ORDER BY round_number ASC`,
      [matchId]
    );

    const [players] = await db.execute(
      `SELECT id, username, level, exp, rp, coins, gems, wins, losses, is_admin
       FROM players
       WHERE id IN (?, ?)`,
      [match.player_one_id, match.player_two_id]
    );

    return res.status(200).json({
      success: true,
      match_id: match.id,
      winner_player_id: match.winner_player_id,
      final_round_score: {
        player_one_id: match.player_one_id,
        player_two_id: match.player_two_id,
        player_one_round_wins: match.player_one_round_wins,
        player_two_round_wins: match.player_two_round_wins
      },
      round_winners: roundRows.map((round) => ({
        round_number: round.round_number,
        power_winner_player_id: round.power_winner_player_id,
        magic_winner_player_id: round.magic_winner_player_id,
        skill_winner_player_id: round.skill_winner_player_id,
        round_winner_player_id: round.round_winner_player_id,
        status: round.status,
        finished_at: round.finished_at
      })),
      updated_player_stats: players,
      full_match_summary: {
        status: match.status,
        created_at: match.created_at,
        updated_at: match.updated_at
      }
    });
  } catch (error) {
    console.error("Get match result error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching match result."
    });
  }
});

module.exports = router;
