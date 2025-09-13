"use client";

import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  email: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
}

const GamePage: React.FC = () => {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>("");
  const [boardSize, setBoardSize] = useState<number>(19);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [loadingActiveGames, setLoadingActiveGames] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");

    if (!token || !userData) {
      setError("Please log in to play");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (err) {
      setError("Invalid user data");
      return;
    }

    // Initialize socket connection
    const newSocket = io("http://localhost:5000", {
      auth: {
        token: token,
      },
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("match-found", (data) => {
      console.log("Match found:", data);
      console.log("Current user ID:", user?.id);
      console.log("Match data:", JSON.stringify(data, null, 2));
      setIsInQueue(false);
      // Redirect to the specific game page
      router.push(`/game/${data.gameId}`);
    });

    newSocket.on("queued", (data) => {
      console.log("Queued:", data);
      setIsInQueue(true);
    });

    newSocket.on("left-queue", (data) => {
      console.log("Left queue:", data);
      setIsInQueue(false);
    });

    newSocket.on("error", (data) => {
      console.error("Socket error:", data);
      setError(data.message || "Connection error");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [router]);

  // Fetch games when user is available
  useEffect(() => {
    if (user) {
      fetchRecentGames();
      fetchActiveGames();
    }
  }, [user]);

  const fetchRecentGames = async () => {
    if (!user) return;

    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/game/history?userId=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const games = await response.json();

        // Parse captured stones from database
        const gamesWithParsedMoves = games.map((game: any) => ({
          ...game,
          moves: game.moves
            ? game.moves.map((move: any) => ({
                ...move,
                capturedStones: move.capturedStones
                  ? JSON.parse(move.capturedStones)
                  : null,
              }))
            : [],
        }));

        setRecentGames(gamesWithParsedMoves.slice(0, 5)); // Show last 5 games
      }
    } catch (err) {
      console.error("Failed to fetch recent games:", err);
    }
  };

  const fetchActiveGames = async () => {
    if (!user) return;

    setLoadingActiveGames(true);
    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/game/history?userId=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const games = await response.json();
        console.log("All games from API:", games);

        // Parse captured stones from database
        const gamesWithParsedMoves = games.map((game: any) => ({
          ...game,
          moves: game.moves
            ? game.moves.map((move: any) => ({
                ...move,
                capturedStones: move.capturedStones
                  ? JSON.parse(move.capturedStones)
                  : null,
              }))
            : [],
        }));

        // Filter for active games only
        const active = gamesWithParsedMoves.filter(
          (game: any) => game.status === "active"
        );
        console.log("Active games after filtering:", active);

        setActiveGames(active);
      } else {
        console.error(
          "Failed to fetch games:",
          response.status,
          response.statusText
        );
        const errorData = await response.text();
        console.error("Error response:", errorData);
      }
    } catch (err) {
      console.error("Failed to fetch active games:", err);
    } finally {
      setLoadingActiveGames(false);
    }
  };

  const joinMatchmaking = () => {
    if (socket && isConnected) {
      console.log(
        `Joining matchmaking for user ${user?.id} with board size ${boardSize}`
      );
      setError("");
      socket.emit("join-matchmaking", {
        boardSize: boardSize,
        ratingRange: 200,
      });
    } else {
      console.log(
        "Cannot join matchmaking - socket or connection not available",
        { socket: !!socket, isConnected }
      );
      setError("Not connected to server");
    }
  };

  const leaveMatchmaking = () => {
    if (socket) {
      socket.emit("leave-matchmaking");
    }
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
            {error}
          </div>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-black">Go Game Lobby</h1>
            {activeGames.length > 0 && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {activeGames.length} Active Game
                {activeGames.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
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

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matchmaking Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Matchmaking */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">
                Find a Game
              </h3>
              {!isInQueue ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Board Size
                    </label>
                    <select
                      value={boardSize}
                      onChange={(e) => setBoardSize(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={9}>9×9</option>
                      <option value={13}>13×13</option>
                      <option value={19}>19×19</option>
                    </select>
                  </div>
                  <button
                    onClick={joinMatchmaking}
                    disabled={!isConnected}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    Find Match
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-sm text-black mb-2">
                    Searching for opponent...
                  </div>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <button
                    onClick={leaveMatchmaking}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Cancel Search
                  </button>
                </div>
              )}
            </div>

            {/* Simulation Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">
                Practice & Simulation
              </h3>
              <p className="text-gray-600 mb-4">
                Practice Go moves, experiment with strategies, and analyze
                positions. Control both black and white stones in a
                non-persistent simulation.
              </p>
              <button
                onClick={() => router.push("/simulation")}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                Open Go Simulation
              </button>
            </div>

            {/* User Stats */}
            {user && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-black">
                  Your Stats
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-black">Rating:</span>{" "}
                    <span className="text-black">{user.rating}</span>
                  </div>
                  <div>
                    <span className="font-medium text-black">
                      Games Played:
                    </span>{" "}
                    <span className="text-black">{user.gamesPlayed || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-black">Games Won:</span>{" "}
                    <span className="text-black">{user.gamesWon || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-black">Win Rate:</span>{" "}
                    <span className="text-black">
                      {user.gamesPlayed > 0
                        ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Games */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">
                Active Games
              </h3>
              <div className="space-y-2 text-sm">
                {loadingActiveGames ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                    <p className="text-gray-600">Loading active games...</p>
                  </div>
                ) : activeGames.length === 0 ? (
                  <p className="text-gray-600">No active games</p>
                ) : (
                  activeGames.map((game) => (
                    <div
                      key={game.id}
                      className="p-2 bg-green-50 rounded-lg border border-green-200"
                    >
                      <a
                        href={`/game/${game.id}`}
                        className="text-green-700 hover:text-green-900 font-medium"
                      >
                        Game #{game.id} - {game.board_size}×{game.board_size}
                      </a>
                      <div className="text-xs text-green-600 mt-1">
                        vs{" "}
                        {game.black_player === user?.username
                          ? game.white_player
                          : game.black_player}
                      </div>
                      <div className="text-xs text-gray-500">
                        {game.moves ? `${game.moves.length} moves` : "0 moves"}{" "}
                        -{new Date(game.started_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 space-y-2">
                <button
                  onClick={fetchActiveGames}
                  className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Refresh
                </button>
                {/* Debug info - remove in production */}
                <div className="text-xs text-gray-500">
                  Debug: User ID: {user?.id}, Active games: {activeGames.length}
                </div>
              </div>
            </div>

            {/* Recent Games */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">
                Recent Games
              </h3>
              <div className="space-y-2 text-sm">
                {recentGames.length === 0 ? (
                  <p className="text-gray-600">No games yet</p>
                ) : (
                  recentGames.map((game) => (
                    <div key={game.id} className="text-gray-600">
                      <a
                        href={`/game/${game.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Game #{game.id} - {game.board_size}×{game.board_size}
                      </a>
                      <div className="text-xs text-gray-500">
                        {game.status} -{" "}
                        {new Date(game.started_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    fetchRecentGames();
                    fetchActiveGames();
                  }}
                  className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  Refresh All
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/game/1")}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  View Sample Game
                </button>
                <button
                  onClick={() => router.push("/profile")}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
