import { classifyDifficulty } from './solver';

export type Grid = (number | null)[][];
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if ((r !== row || c !== col) && grid[r][c] === num) return false;
    }
  }
  return true;
}

function fillGrid(grid: Grid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === null) {
        for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(grid: Grid, limit = 2): number {
  let count = 0;
  const g = grid.map(row => [...row]);

  function solve(): void {
    if (count >= limit) return;
    let emptyRow = -1;
    let emptyCol = -1;
    outer: for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (g[r][c] === null) {
          emptyRow = r;
          emptyCol = c;
          break outer;
        }
      }
    }
    if (emptyRow === -1) {
      count++;
      return;
    }
    for (let num = 1; num <= 9; num++) {
      if (count >= limit) return;
      if (isValid(g, emptyRow, emptyCol, num)) {
        g[emptyRow][emptyCol] = num;
        solve();
        g[emptyRow][emptyCol] = null;
      }
    }
  }

  solve();
  return count;
}

// easy=36(45givens): ほぼ100%がbasicのみで解ける
// medium=54(27givens): ~20%がintermediate必要
// hard=56(25givens): X-Wing等の上級技法が必要
// expert=56(25givens): 上級技法でも解けない
const REMOVE_COUNTS: Record<Difficulty, number> = {
  easy: 36,
  medium: 54,
  hard: 56,
  expert: 56,
};

const MAX_RETRIES: Record<Difficulty, number> = {
  easy: 1,
  medium: 20,
  hard: 20,
  expert: 20,
};

function tryGenerate(difficulty: Difficulty): { puzzle: Grid; solution: number[][] } {
  const grid: Grid = Array.from({ length: 9 }, () => Array(9).fill(null));
  fillGrid(grid);

  const solution = (grid as number[][]).map(row => [...row]);
  const puzzle: Grid = solution.map(row => [...row] as (number | null)[]);

  const cells = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  let removed = 0;
  const target = REMOVE_COUNTS[difficulty];

  for (const [row, col] of cells) {
    if (removed >= target) break;
    const backup = puzzle[row][col];
    puzzle[row][col] = null;
    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[row][col] = backup;
    }
  }

  return { puzzle, solution };
}

export function generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: number[][] } {
  let best: { puzzle: Grid; solution: number[][] } | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES[difficulty]; attempt++) {
    const result = tryGenerate(difficulty);
    const actual = classifyDifficulty(result.puzzle);
    if (actual === difficulty) return result;
    // ターゲット難易度より一段階低いものをフォールバック候補として保存
    const fallback: Record<Difficulty, Difficulty | null> = {
      easy: null, medium: 'easy', hard: 'medium', expert: 'hard',
    };
    if (!best || actual === fallback[difficulty]) best = result;
  }

  return best ?? tryGenerate(difficulty);
}
