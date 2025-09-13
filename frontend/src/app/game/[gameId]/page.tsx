"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import GoBoard from "@/components/GoBoard";
import io, { Socket } from "socket.io-client";

interface User {
  id: number;
  username: string;
  email: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
}

interface Stone {
  x: number;
  y: number;
  color: "black" | "white";
}

interface Move {
  id: number;
  xCoordinate: number | null;
  yCoordinate: number | null;
  isPass: boolean;
  isResign: boolean;
  moveNumber: number;
  playerId: number;
}

interface GameState {
  id: number | null;
  blackPlayerId: number | null;
  whitePlayerId: number | null;
  boardSize: number;
  currentPlayer: "black" | "white";
  moves: Move[];
  status: string;
  winnerId: number | null;
  result: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface GameDetails {
  id: number;
  blackPlayer: User;
  whitePlayer: User;
  boardSize: number;
  status: string;
  winnerId: number | null;
  result: string | null;
  startedAt: string;
  finishedAt: string | null;
  moves: Move[];
  boardState?: string; // String representation: "0" = empty, "1" = black, "2" = white
}

export default function GameViewPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");

    if (!token || !userData) {
      setError("Please log in to view games");
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (err) {
      setError("Invalid user data");
      setLoading(false);
      return;
    }

    // Fetch game details
    fetchGameDetails();

    // Set up socket connection
    const newSocket = io("http://localhost:5000", {
      auth: {
        token: token,
      },
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      // Join the game room when connected
      newSocket.emit("join-game", parseInt(gameId));
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("joined-game", (data: any) => {
      console.log("Joined game room:", data);
    });

    newSocket.on("game-updated", (data: any) => {
      if (data.gameId === parseInt(gameId)) {
        // Update game state when moves are made
        fetchGameDetails();
      }
    });

    newSocket.on("move-made", (data: any) => {
      console.log("Move-made event received:", data);
      if (data.gameId === parseInt(gameId)) {
        console.log("Move is for current game, updating UI");
        console.log("Captured stones in data:", data.capturedStones);
        console.log("Board state in data:", data.boardState);

        // Update game state immediately for better UX
        setGameDetails((prev) => {
          if (!prev) return prev;

          const newMove = {
            id: Date.now(), // Temporary ID
            gameId: prev.id,
            playerId: data.playerId,
            moveNumber: data.moveNumber,
            xCoordinate: data.x,
            yCoordinate: data.y,
            isPass: data.isPass || false,
            isResign: data.isResign || false,
            capturedStones: data.capturedStones || null,
            moveTime: new Date().toISOString(),
          };

          console.log("Adding new move to state:", newMove);
          console.log("Captured stones in new move:", newMove.capturedStones);

          // Check if game ended
          if (data.gameEnded) {
            return {
              ...prev,
              moves: [...prev.moves, newMove],
              status: "finished",
              winner: data.winner,
              blackScore: data.blackScore || 0,
              whiteScore: data.whiteScore || 0,
              boardState: data.boardState, // Add board state
            };
          }

          return {
            ...prev,
            moves: [...prev.moves, newMove],
            boardState: data.boardState, // Add board state
          };
        });

        // Also fetch fresh data to ensure consistency
        setTimeout(() => fetchGameDetails(), 100);
      } else {
        console.log("Move is for different game, ignoring");
      }
    });

    newSocket.on("invalid-move", (data: any) => {
      setError(data.message || "Invalid move");
    });

    newSocket.on("game-finished", (data: any) => {
      if (data.gameId === parseInt(gameId)) {
        setError(`Game finished: ${data.result}`);
        fetchGameDetails();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/game/${gameId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError("Game not found");
        } else if (response.status === 401) {
          setError("Unauthorized to view this game");
        } else {
          setError("Failed to load game");
        }
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Parse captured stones from database
      if (data.moves) {
        data.moves = data.moves.map((move: any) => ({
          ...move,
          capturedStones: move.capturedStones
            ? JSON.parse(move.capturedStones)
            : null,
        }));
      }

      setGameDetails(data);
      setError(null);
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleMove = (x: number, y: number) => {
    console.log("handleMove called with:", {
      x,
      y,
      socket: !!socket,
      isPlayer,
      gameStatus: gameDetails?.status,
    });

    if (!socket || !isPlayer || gameDetails?.status !== "active") {
      console.log("Move rejected: socket, player, or status check failed");
      return;
    }

    // Check if it's the user's turn
    const lastMove = gameDetails?.moves[gameDetails.moves.length - 1];
    const currentPlayer = lastMove
      ? lastMove.playerId === gameDetails.blackPlayerId
        ? "white"
        : "black"
      : "black";

    const userColor =
      user && user.id === gameDetails.blackPlayerId ? "black" : "white";

    console.log("Turn check:", { currentPlayer, userColor, lastMove });

    if (currentPlayer !== userColor) {
      console.log("Move rejected: not user's turn");
      // Silently ignore - don't show error
      return;
    }

    console.log("Sending move to server:", { gameId: gameDetails.id, x, y });
    // Emit move to server
    socket.emit("make-move", {
      gameId: gameDetails.id,
      x,
      y,
    });
  };

  const handlePass = () => {
    if (!socket || !isPlayer || gameDetails?.status !== "active") {
      return;
    }

    // Check if it's the user's turn
    const lastMove = gameDetails?.moves[gameDetails.moves.length - 1];
    const currentPlayer = lastMove
      ? lastMove.playerId === gameDetails.blackPlayerId
        ? "white"
        : "black"
      : "black";

    const userColor =
      user && user.id === gameDetails.blackPlayerId ? "black" : "white";

    if (currentPlayer !== userColor) {
      // Silently ignore - don't show error
      return;
    }

    // Emit pass to server
    socket.emit("make-move", {
      gameId: gameDetails.id,
      isPass: true,
    });
  };

  const handleResign = () => {
    if (!socket || !isPlayer || gameDetails?.status !== "active") {
      return;
    }

    // Check if it's the user's turn
    const lastMove = gameDetails?.moves[gameDetails.moves.length - 1];
    const currentPlayer = lastMove
      ? lastMove.playerId === gameDetails.blackPlayerId
        ? "white"
        : "black"
      : "black";

    const userColor =
      user && user.id === gameDetails.blackPlayerId ? "black" : "white";

    if (currentPlayer !== userColor) {
      // Silently ignore - don't show error
      return;
    }

    // Emit resign to server
    socket.emit("make-move", {
      gameId: gameDetails.id,
      isResign: true,
    });
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-black">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
            {error}
          </div>
          <button
            onClick={() => router.push("/game")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (!gameDetails) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-black">Game not found</p>
          <button
            onClick={() => router.push("/game")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-4"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Determine current player based on last move
  const lastMove = gameDetails.moves[gameDetails.moves.length - 1];
  const currentPlayer = lastMove
    ? lastMove.playerId === gameDetails.blackPlayerId
      ? "white"
      : "black"
    : "black";

  // Check if current user is a player in this game
  const isPlayer =
    user &&
    (user.id === gameDetails.blackPlayerId ||
      user.id === gameDetails.whitePlayerId);
  const userColor =
    user && user.id === gameDetails.blackPlayerId ? "black" : "white";

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Game #{gameId}</h1>
            <p className="text-gray-600">
              {gameDetails.blackPlayer.username} (Black) vs{" "}
              {gameDetails.whitePlayer.username} (White)
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/game")}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Menu
            </button>
            {user && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-800">
                    Logged in as:{" "}
                    <span className="font-bold">{user.username}</span>
                  </span>
                  <button
                    onClick={logout}
                    className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm text-black">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Game Board</h2>
                <div className="text-sm text-black">
                  Current Player:{" "}
                  <span
                    className={`font-bold ${
                      currentPlayer === "black" ? "text-black" : "text-gray-600"
                    }`}
                  >
                    {currentPlayer === "black" ? "Black" : "White"}
                  </span>
                  {isPlayer && (
                    <span className="ml-2 text-xs text-gray-600">
                      (You are {userColor})
                    </span>
                  )}
                  {isPlayer &&
                    gameDetails.status === "active" &&
                    currentPlayer === userColor && (
                      <span className="ml-2 text-xs text-green-600 font-bold">
                        ← Your turn!
                      </span>
                    )}
                </div>
              </div>

              <GoBoard
                size={gameDetails.boardSize}
                moves={
                  gameDetails.boardState
                    ? // Use board state if available (from real-time updates)
                      gameDetails.boardState
                        .split("")
                        .map((char, index) => ({
                          x: index % gameDetails.boardSize,
                          y: Math.floor(index / gameDetails.boardSize),
                          color: (char === "1"
                            ? "black"
                            : char === "2"
                            ? "white"
                            : "empty") as "black" | "white",
                        }))
                        .filter((stone) => stone.color !== "empty")
                    : // Fall back to moves array (for initial load)
                      gameDetails.moves.map((move) => ({
                        x: move.xCoordinate || 0,
                        y: move.yCoordinate || 0,
                        color:
                          move.playerId === gameDetails.blackPlayer?.id
                            ? "black"
                            : "white",
                      }))
                }
                onMove={
                  isPlayer && gameDetails.status === "active"
                    ? handleMove
                    : () => {}
                } // Allow moves if player and game is active
                disabled={!isPlayer || gameDetails.status !== "active"} // Enable moves only for players in active games
              />

              {/* Game Actions */}
              {isPlayer &&
                gameDetails.status === "active" &&
                currentPlayer === userColor && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-sm font-medium text-black mb-2">
                      Your Turn - Choose an Action:
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePass()}
                        className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                      >
                        Pass
                      </button>
                      <button
                        onClick={() => handleResign()}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Resign
                      </button>
                    </div>
                  </div>
                )}

              {/* Game Status */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-black">Status:</span>{" "}
                    <span className="text-black capitalize">
                      {gameDetails.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-black">Moves:</span>{" "}
                    <span className="text-black">
                      {gameDetails.moves.length}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-black">Started:</span>{" "}
                    <span className="text-black">
                      {new Date(gameDetails.startedAt).toLocaleString()}
                    </span>
                  </div>
                  {gameDetails.finishedAt && (
                    <div>
                      <span className="font-medium text-black">Finished:</span>{" "}
                      <span className="text-black">
                        {new Date(gameDetails.finishedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                {gameDetails.result && (
                  <div className="mt-2">
                    <span className="font-medium text-black">Result:</span>{" "}
                    <span className="text-black">{gameDetails.result}</span>
                  </div>
                )}
                {gameDetails.status === "finished" && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-bold mb-2 text-blue-800">
                      Game Finished!
                    </h3>
                    <div className="space-y-2">
                      <p className="text-blue-700">
                        <span className="font-medium">Winner:</span>{" "}
                        {gameDetails.winner === "black" ? "Black" : "White"}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">
                          Black: {gameDetails.blackScore || 0} points
                        </span>
                        <span className="text-blue-600">
                          White: {gameDetails.whiteScore || 0} points
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Captured Stones */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-black mb-3">
                  Captured Stones
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="w-4 h-4 bg-black rounded-full"></div>
                      <span className="font-medium text-black">Black</span>
                    </div>
                    <div className="text-2xl font-bold text-black">
                      {(() => {
                        const blackCaptures = gameDetails.moves
                          .filter(
                            (move) =>
                              move.capturedStones &&
                              move.capturedStones.some(
                                (stone: any) => stone.color === "white"
                              )
                          )
                          .reduce(
                            (total, move) =>
                              total +
                              (move.capturedStones?.filter(
                                (stone: any) => stone.color === "white"
                              ).length || 0),
                            0
                          );
                        console.log(
                          "Black captures calculated:",
                          blackCaptures
                        );
                        console.log(
                          "Moves with captured stones:",
                          gameDetails.moves.filter(
                            (move) => move.capturedStones
                          )
                        );
                        return blackCaptures;
                      })()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-full"></div>
                      <span className="font-medium text-black">White</span>
                    </div>
                    <div className="text-2xl font-bold text-black">
                      {(() => {
                        const whiteCaptures = gameDetails.moves
                          .filter(
                            (move) =>
                              move.capturedStones &&
                              move.capturedStones.some(
                                (stone: any) => stone.color === "black"
                              )
                          )
                          .reduce(
                            (total, move) =>
                              total +
                              (move.capturedStones?.filter(
                                (stone: any) => stone.color === "black"
                              ).length || 0),
                            0
                          );
                        console.log(
                          "White captures calculated:",
                          whiteCaptures
                        );
                        return whiteCaptures;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Game Info Sidebar */}
          <div className="space-y-6">
            {/* Players Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">Players</h3>

              {/* Black Player */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-black rounded-full"></div>
                  <span className="font-medium text-black">Black</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="text-black">
                    <span className="font-medium">Player:</span>{" "}
                    {gameDetails.blackPlayer.username}
                  </div>
                  <div className="text-black">
                    <span className="font-medium">Rating:</span>{" "}
                    {gameDetails.blackPlayer.rating}
                  </div>
                  <div className="text-black">
                    <span className="font-medium">Games:</span>{" "}
                    {gameDetails.blackPlayer.gamesPlayed}
                  </div>
                </div>
              </div>

              {/* White Player */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-full"></div>
                  <span className="font-medium text-black">White</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="text-black">
                    <span className="font-medium">Player:</span>{" "}
                    {gameDetails.whitePlayer.username}
                  </div>
                  <div className="text-black">
                    <span className="font-medium">Rating:</span>{" "}
                    {gameDetails.whitePlayer.rating}
                  </div>
                  <div className="text-black">
                    <span className="font-medium">Games:</span>{" "}
                    {gameDetails.whitePlayer.gamesPlayed}
                  </div>
                </div>
              </div>
            </div>

            {/* Move History */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">
                Move History
              </h3>
              <div className="max-h-64 overflow-y-auto">
                {gameDetails.moves.length === 0 ? (
                  <p className="text-gray-600 text-sm">No moves yet</p>
                ) : (
                  <div className="space-y-1">
                    {gameDetails.moves.map((move, index) => (
                      <div
                        key={move.id}
                        className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded"
                      >
                        <span className="text-black">
                          {move.moveNumber}.{" "}
                          {move.isPass
                            ? "Pass"
                            : move.isResign
                            ? "Resign"
                            : `(${move.xCoordinate}, ${move.yCoordinate})`}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            move.playerId === gameDetails.blackPlayerId
                              ? "bg-black text-white"
                              : "bg-gray-200 text-black"
                          }`}
                        >
                          {move.playerId === gameDetails.blackPlayerId
                            ? "B"
                            : "W"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">Actions</h3>
              <div className="space-y-2">
                {isPlayer && gameDetails.status === "active" && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 mb-2">
                      You can play this game! Click on the board to make moves.
                    </p>
                    <button
                      onClick={() => router.push(`/game`)}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Switch to Main Game View
                    </button>
                  </div>
                )}
                {!isPlayer && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      You are viewing this game as a spectator.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
