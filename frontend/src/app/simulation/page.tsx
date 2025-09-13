"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import GoBoard from "@/components/GoBoard";
import Toast from "@/components/Toast";

interface Stone {
  x: number;
  y: number;
  color: "black" | "white";
}

interface GameState {
  board: string;
  size: number;
  moves: Stone[];
  capturedStones: Stone[];
  koPosition: { x: number; y: number } | null;
  currentPlayer: "black" | "white";
  passCount: number;
  gameEnded: boolean;
  winner: "black" | "white" | "draw" | null;
  blackScore: number;
  whiteScore: number;
}

export default function SimulationPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [boardSize, setBoardSize] = useState<number>(19);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const loadSimulationState = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/simulation/state?boardSize=${boardSize}`
      );
      const data = await response.json();

      if (data.success) {
        setGameState(data.gameState);
        setError(null);
      } else {
        setError(data.error || "Failed to load simulation state");
      }
    } catch (err) {
      console.error("Failed to load simulation state:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [boardSize]);

  // Load initial simulation state
  useEffect(() => {
    loadSimulationState();
  }, [loadSimulationState]);

  const handleMove = async (x: number, y: number) => {
    if (!gameState || gameState.gameEnded) return;

    try {
      const response = await fetch(
        "http://localhost:5000/api/simulation/move",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            x,
            y,
            color: gameState.currentPlayer,
            boardState: gameState.board,
            moves: gameState.moves,
            capturedStones: gameState.capturedStones,
            currentPlayer: gameState.currentPlayer,
            passCount: gameState.passCount,
            koPosition: gameState.koPosition,
            boardSize: boardSize,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setGameState(data.gameState);
      } else {
        setToast({ message: data.error || "Invalid move", type: "error" });
      }
    } catch (err) {
      console.error("Failed to make move:", err);
      setToast({ message: "Failed to make move", type: "error" });
    }
  };

  const handleUndo = async () => {
    if (!gameState || gameState.moves.length === 0) return;

    try {
      const response = await fetch(
        "http://localhost:5000/api/simulation/undo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            boardState: gameState.board,
            moves: gameState.moves,
            capturedStones: gameState.capturedStones,
            currentPlayer: gameState.currentPlayer,
            passCount: gameState.passCount,
            koPosition: gameState.koPosition,
            boardSize: boardSize,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setGameState(data.gameState);
      } else {
        setToast({
          message: data.error || "Failed to undo move",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to undo move:", err);
      setToast({ message: "Failed to undo move", type: "error" });
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/simulation/reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            boardSize: boardSize,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setGameState(data.gameState);
        setError(null);
        setToast({ message: "Board reset", type: "info" });
      } else {
        setToast({
          message: data.error || "Failed to reset simulation",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to reset simulation:", err);
      setToast({ message: "Failed to reset simulation", type: "error" });
    }
  };

  const handleExport = async () => {
    if (!gameState) return;

    try {
      const response = await fetch(
        "http://localhost:5000/api/simulation/export",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gameState,
            boardSize,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data.exportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `go-simulation-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast({
          message: "Game state exported successfully",
          type: "success",
        });
      } else {
        setToast({
          message: data.error || "Failed to export game state",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to export game state:", err);
      setToast({ message: "Failed to export game state", type: "error" });
    }
  };

  const handleBoardSizeChange = (newSize: number) => {
    setBoardSize(newSize);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-black">Loading simulation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">
            Simulation Error
          </h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => loadSimulationState()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">
            No Simulation State
          </h1>
          <button
            onClick={() => loadSimulationState()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start Simulation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Go Simulation</h1>
            <p className="text-gray-600">
              Practice and experiment with Go moves. Control both black and
              white stones.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/game")}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back to Menu
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <div className="bg-gray-100 p-4 rounded-lg">
              <GoBoard
                size={gameState.size}
                moves={gameState.board
                  .split("")
                  .map((char, index) => ({
                    x: index % gameState.size,
                    y: Math.floor(index / gameState.size),
                    color:
                      char === "1" ? "black" : char === "2" ? "white" : null,
                  }))
                  .filter((stone) => stone.color !== null)
                  .map((stone) => ({
                    ...stone,
                    color: stone.color as "black" | "white",
                  }))}
                onMove={handleMove}
              />
            </div>
          </div>

          {/* Move History */}
          <div className="lg:col-span-1">
            <div className="bg-gray-100 p-4 rounded-lg h-full">
              <h3 className="text-lg font-semibold text-black mb-3">
                Move History
              </h3>
              <div className="max-h-96 overflow-y-auto">
                {gameState.moves.length === 0 ? (
                  <p className="text-gray-500 text-sm">No moves made yet</p>
                ) : (
                  <div className="space-y-1">
                    {gameState.moves.map((move, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">Move {index + 1}:</span>
                        <span
                          className={`font-semibold ${
                            move.color === "black"
                              ? "text-black"
                              : "text-gray-600"
                          }`}
                        >
                          {move.color === "black" ? "Black" : "White"} at (
                          {move.x}, {move.y})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls and Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Board Size Selection */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-black mb-3">
                Board Size
              </h3>
              <div className="flex space-x-2">
                {[9, 13, 19].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleBoardSizeChange(size)}
                    className={`px-3 py-1 rounded ${
                      boardSize === size
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-black hover:bg-gray-300"
                    }`}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-black mb-3">
                Controls
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleUndo}
                  disabled={gameState.moves.length === 0}
                  className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Undo Last Move
                </button>
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Reset Board
                </button>
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Export Game State
                </button>
              </div>
            </div>

            {/* Game State Info */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-black mb-3">
                Game State
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Player:</span>
                  <span
                    className={`font-semibold ${
                      gameState.currentPlayer === "black"
                        ? "text-black"
                        : "text-gray-600"
                    }`}
                  >
                    {gameState.currentPlayer === "black" ? "Black" : "White"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Moves Made:</span>
                  <span className="font-semibold text-black">
                    {gameState.moves.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Captured Stones:</span>
                  <span className="font-semibold text-black">
                    {gameState.capturedStones.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pass Count:</span>
                  <span className="font-semibold text-black">
                    {gameState.passCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}
