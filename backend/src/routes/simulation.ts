import express from "express";
import { GoRules } from "../services/goRules";

const router = express.Router();

// Get simulation state
router.get("/state", (req, res) => {
  try {
    const { boardSize = "19" } = req.query;
    const size = parseInt(boardSize as string);

    if (size !== 9 && size !== 13 && size !== 19) {
      return res.status(400).json({ error: "Invalid board size" });
    }

    const goRules = new GoRules(size);
    const gameState = goRules.getGameState();

    res.json({
      success: true,
      gameState,
      boardSize: size,
    });
  } catch (error) {
    console.error("Simulation state error:", error);
    res.status(500).json({ error: "Failed to get simulation state" });
  }
});

// Make a move in simulation
router.post("/move", (req, res) => {
  try {
    const {
      x,
      y,
      color,
      boardState,
      moves,
      capturedStones,
      currentPlayer,
      passCount,
      koPosition,
      boardSize = 19,
    } = req.body;

    if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Create GoRules instance from current state
    const goRules = new GoRules(boardSize);
    goRules.setBoardState(boardState);
    goRules.setCurrentPlayer(currentPlayer);
    goRules.setPassCount(passCount);
    goRules.setKoPosition(koPosition);

    // Set moves and captured stones
    const movesArray = moves || [];
    const capturedStonesArray = capturedStones || [];
    goRules.setMoves(movesArray);
    goRules.setCapturedStones(capturedStonesArray);

    // Check if move is legal
    if (!goRules.isLegalMove(x, y, 0)) {
      return res.status(400).json({
        success: false,
        error: "Illegal move",
      });
    }

    // Make the move
    const moveResult = goRules.makeMove(x, y, 0);
    const newGameState = goRules.getGameState();

    res.json({
      success: true,
      gameState: newGameState,
      moveResult,
    });
  } catch (error) {
    console.error("Simulation move error:", error);
    res.status(500).json({ error: "Failed to make move" });
  }
});

// Undo last move
router.post("/undo", (req, res) => {
  try {
    const {
      boardState,
      moves,
      capturedStones,
      currentPlayer,
      passCount,
      koPosition,
      boardSize = 19,
    } = req.body;

    // Create GoRules instance from current state
    const goRules = new GoRules(boardSize);
    goRules.setBoardState(boardState);
    goRules.setCurrentPlayer(currentPlayer);
    goRules.setPassCount(passCount);
    goRules.setKoPosition(koPosition);

    // Set moves and captured stones
    const movesArray = moves || [];
    const capturedStonesArray = capturedStones || [];
    goRules.setMoves(movesArray);
    goRules.setCapturedStones(capturedStonesArray);

    // Undo last move
    const undoResult = goRules.undoLastMove();

    if (!undoResult.success) {
      return res.status(400).json({
        success: false,
        error: undoResult.error,
      });
    }

    const newGameState = goRules.getGameState();

    res.json({
      success: true,
      gameState: newGameState,
      undoResult,
    });
  } catch (error) {
    console.error("Simulation undo error:", error);
    res.status(500).json({ error: "Failed to undo move" });
  }
});

// Reset simulation
router.post("/reset", (req, res) => {
  try {
    const { boardSize = "19" } = req.body;
    const size = parseInt(boardSize as string);

    if (size !== 9 && size !== 13 && size !== 19) {
      return res.status(400).json({ error: "Invalid board size" });
    }

    const goRules = new GoRules(size);
    const gameState = goRules.getGameState();

    res.json({
      success: true,
      gameState,
      boardSize: size,
    });
  } catch (error) {
    console.error("Simulation reset error:", error);
    res.status(500).json({ error: "Failed to reset simulation" });
  }
});

// Export game state
router.post("/export", (req, res) => {
  try {
    const { gameState, boardSize } = req.body;

    const exportData = {
      boardSize,
      boardState: gameState.board,
      moves: gameState.moves,
      capturedStones: gameState.capturedStones,
      currentPlayer: gameState.currentPlayer,
      passCount: gameState.passCount,
      koPosition: gameState.koPosition,
      gameEnded: gameState.gameEnded,
      winner: gameState.winner,
      blackScore: gameState.blackScore,
      whiteScore: gameState.whiteScore,
      exportedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      exportData,
    });
  } catch (error) {
    console.error("Simulation export error:", error);
    res.status(500).json({ error: "Failed to export game state" });
  }
});

export default router;
