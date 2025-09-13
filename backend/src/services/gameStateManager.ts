import { prisma } from "../lib/prisma";
import { GoRules, Stone } from "./goRules";
import { BoardStateConverter } from "../utils/boardStateConverter";

// No longer needed - we only store board state as string

export class GameStateManager {
  private static instance: GameStateManager;
  private gameStates: Map<number, GoRules> = new Map();

  private constructor() {}

  static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  // Get or create game state for a game
  async getGameState(gameId: number): Promise<GoRules> {
    if (this.gameStates.has(gameId)) {
      return this.gameStates.get(gameId)!;
    }

    // Load game from database
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        boardSize: true,
        boardState: true,
        status: true,
        winnerId: true,
        blackPlayerId: true,
        whitePlayerId: true,
      },
    });

    if (!game) {
      throw new Error("Game not found");
    }

    // Create GoRules instance
    const goRules = new GoRules(game.boardSize);

    // Initialize from stored board state if available
    if (
      game.boardState &&
      BoardStateConverter.isValidBoardString(game.boardState, game.boardSize)
    ) {
      goRules.setBoardState(game.boardState);

      // Set game status
      if (game.status === "finished") {
        goRules.setGameEnded(true);
        // Determine winner based on winnerId
        if (game.winnerId === game.blackPlayerId) {
          goRules.setWinner("black");
        } else if (game.winnerId === game.whitePlayerId) {
          goRules.setWinner("white");
        } else {
          goRules.setWinner("draw");
        }
      }

      // If board is empty (all zeros), we need to reconstruct from moves
      const hasStones =
        game.boardState.includes("1") || game.boardState.includes("2");
      if (!hasStones) {
        console.log(
          `Game ${gameId} has empty board state, reconstructing from moves`
        );
        const moves = await prisma.move.findMany({
          where: { gameId },
          orderBy: { moveNumber: "asc" },
        });
        goRules.initializeFromMoves(moves, game.boardSize);
      }
    } else {
      // Fallback to reconstructing from moves (for existing games)
      const moves = await prisma.move.findMany({
        where: { gameId },
        orderBy: { moveNumber: "asc" },
      });
      goRules.initializeFromMoves(moves, game.boardSize);
    }

    // Cache the game state
    this.gameStates.set(gameId, goRules);
    return goRules;
  }

  // Save game state to database
  async saveGameState(gameId: number, goRules: GoRules): Promise<void> {
    const gameState = goRules.getGameState();

    console.log(`Saving game state for game ${gameId}:`);
    console.log(`Board size: ${gameState.size}x${gameState.size}`);
    console.log(`Board state: ${gameState.board}`);

    // Board is already a string representation
    const boardString = gameState.board;

    // Get player IDs for winner determination
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { blackPlayerId: true, whitePlayerId: true },
    });

    const updateResult = await prisma.game.update({
      where: { id: gameId },
      data: {
        boardState: boardString,
        blackScore: gameState.blackScore,
        whiteScore: gameState.whiteScore,
        status: gameState.gameEnded ? "finished" : "active",
        winnerId:
          gameState.winner === "black"
            ? game?.blackPlayerId
            : gameState.winner === "white"
            ? game?.whitePlayerId
            : null,
      },
    });

    console.log(
      `Database update result for game ${gameId}:`,
      updateResult.boardState
    );
  }

  // Clear game state from memory (when game ends)
  clearGameState(gameId: number): void {
    this.gameStates.delete(gameId);
  }

  // Get all active game IDs
  getActiveGameIds(): number[] {
    return Array.from(this.gameStates.keys());
  }
}
