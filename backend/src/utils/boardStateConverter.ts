import { Stone } from "../services/goRules";

export class BoardStateConverter {
  // Convert 2D board array to string representation
  // "0" = empty, "1" = black, "2" = white
  static boardToString(board: (Stone | null)[][]): string {
    let result = "";
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const stone = board[y][x];
        if (!stone) {
          result += "0";
        } else if (stone.color === "black") {
          result += "1";
        } else if (stone.color === "white") {
          result += "2";
        } else {
          result += "0"; // fallback
        }
      }
    }
    return result;
  }

  // Convert string representation back to 2D board array
  static stringToBoard(boardString: string, size: number): (Stone | null)[][] {
    const board: (Stone | null)[][] = Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));

    for (let i = 0; i < boardString.length && i < size * size; i++) {
      const y = Math.floor(i / size);
      const x = i % size;
      const char = boardString[i];

      if (char === "1") {
        board[y][x] = { x, y, color: "black" };
      } else if (char === "2") {
        board[y][x] = { x, y, color: "white" };
      }
      // char === "0" means empty, so board[y][x] remains null
    }

    return board;
  }

  // Create empty board string for new games
  static createEmptyBoard(size: number): string {
    return "0".repeat(size * size);
  }

  // Validate board string format
  static isValidBoardString(boardString: string, size: number): boolean {
    if (boardString.length !== size * size) {
      return false;
    }

    // Check that all characters are valid (0, 1, or 2)
    return /^[012]+$/.test(boardString);
  }

  // Get board string length for a given size
  static getExpectedLength(size: number): number {
    return size * size;
  }
}
