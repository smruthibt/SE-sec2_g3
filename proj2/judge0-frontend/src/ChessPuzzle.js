import React, { useState, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function ChessPuzzle({ puzzle, onSolved }) {
  const [game] = useState(() => new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState("playing");
  const [msg, setMsg] = useState(
    `${puzzle.orientation === "white" ? "White" : "Black"} to move`
  );

  const expectedSan = puzzle.solutionSan;

  const targetMove = useMemo(
    () => expectedSan[moveIndex],
    [expectedSan, moveIndex]
  );

  const reset = () => {
    const fresh = new Chess(puzzle.fen);
    game.load(fresh.fen());
    setFen(puzzle.fen);
    setMoveIndex(0);
    setStatus("playing");
    setMsg(`${puzzle.orientation === "white" ? "White" : "Black"} to move`);
  };

  const onDrop = (from, to) => {
    if (status !== "playing") return false;

    const move = game.move({ from, to, promotion: "q" });
    if (!move) {
      setMsg("Illegal move.");
      return false;
    }

    setFen(game.fen());

    const sanPlayed = move.san;
    if (sanPlayed !== targetMove) {
      setStatus("fail");
      setMsg(`❌ Wrong move. Expected: ${targetMove}`);
      return true;
    }

    const nextIndex = moveIndex + 1;

    if (nextIndex >= expectedSan.length) {
      setStatus("success");
      setMsg("✅ Puzzle solved!");
      onSolved && onSolved(puzzle);
    } else {
      setMoveIndex(nextIndex);
      setMsg("Good! Continue.");
    }

    return true;
  };

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

        <Chessboard
        position={fen}
        onPieceDrop={onDrop}
        boardOrientation={puzzle.orientation}
        arePiecesDraggable={true}      // ⬅️ THIS ENABLES MOVING
        animationDuration={150}        // optional: smooth movement
        customBoardStyle={{
            borderRadius: "12px",
            boxShadow: "0 0 20px rgba(0,0,0,0.4)",
        }}
        />


      <div style={{ maxWidth: 280 }}>
        <h2>{puzzle.title}</h2>
        <p>{puzzle.description}</p>
        <p style={{ color: status === "success" ? "lightgreen" : "white" }}>
          {msg}
        </p>

        {status === "fail" && (
          <button
            onClick={reset}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              marginTop: 8,
              cursor: "pointer",
            }}
          >
            Retry Puzzle
          </button>
        )}

        <details style={{ marginTop: 12 }}>
          <summary>Hint</summary>
          <p>{puzzle.hint}</p>
        </details>
      </div>
    </div>
  );
}
