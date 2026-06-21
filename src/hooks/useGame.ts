import { useReducer, useCallback, useEffect, useRef } from 'react';
import { generatePuzzle, type Difficulty, type Grid } from '../lib/sudoku';
import { findNextHint, type HintMove } from '../lib/solver';

export type { Difficulty, HintMove };

interface Snapshot {
  board: Grid;
  notes: Set<number>[][];
  selected: [number, number] | null;
}

interface State {
  puzzle: Grid;
  solution: number[][];
  board: Grid;
  notes: Set<number>[][];
  selected: [number, number] | null;
  difficulty: Difficulty;
  completed: boolean;
  seconds: number;
  notesMode: boolean;
  loading: boolean;
  hintMove: HintMove | null;
  prev: Snapshot | null;
}

type Action =
  | { type: 'NEW_GAME'; difficulty: Difficulty; puzzle: Grid; solution: number[][] }
  | { type: 'SET_LOADING' }
  | { type: 'SELECT'; row: number; col: number }
  | { type: 'INPUT'; num: number | null }
  | { type: 'TOGGLE_NOTES' }
  | { type: 'TICK' }
  | { type: 'HINT_A' }
  | { type: 'HINT_B'; result: HintMove | null }
  | { type: 'UNDO' };

function emptyNotes(): Set<number>[][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );
}

function cloneNotes(notes: Set<number>[][]): Set<number>[][] {
  return notes.map(row => row.map(s => new Set(s)));
}

function isComplete(board: Grid, solution: number[][]): boolean {
  return board.every((row, r) => row.every((cell, c) => cell === solution[r][c]));
}

const initialState: State = {
  puzzle: [],
  solution: [],
  board: [],
  notes: emptyNotes(),
  selected: null,
  difficulty: 'easy',
  completed: false,
  seconds: 0,
  notesMode: false,
  loading: true,
  hintMove: null,
  prev: null,
};

function fillCellWithSolution(state: State, row: number, col: number): State {
  const prev: Snapshot = {
    board: state.board.map(r => [...r]),
    notes: cloneNotes(state.notes),
    selected: state.selected,
  };
  const num = state.solution[row][col];
  const newBoard = state.board.map(r => [...r]);
  newBoard[row][col] = num;
  const newNotes = cloneNotes(state.notes);
  newNotes[row][col] = new Set();
  for (let c = 0; c < 9; c++) newNotes[row][c].delete(num);
  for (let r = 0; r < 9; r++) newNotes[r][col].delete(num);
  const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++) newNotes[r][c].delete(num);
  return {
    ...state,
    board: newBoard,
    notes: newNotes,
    completed: isComplete(newBoard, state.solution),
    hintMove: null,
    selected: [row, col],
    prev,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true };

    case 'NEW_GAME':
      return {
        ...state,
        puzzle: action.puzzle,
        solution: action.solution,
        board: action.puzzle.map(row => [...row]),
        notes: emptyNotes(),
        selected: null,
        difficulty: action.difficulty,
        completed: false,
        seconds: 0,
        notesMode: false,
        loading: false,
        hintMove: null,
        prev: null,
      };

    case 'SELECT':
      return { ...state, selected: [action.row, action.col], hintMove: null };

    case 'TOGGLE_NOTES':
      return { ...state, notesMode: !state.notesMode };

    case 'TICK':
      return state.completed ? state : { ...state, seconds: state.seconds + 1 };

    case 'INPUT': {
      if (!state.selected || state.completed) return state;
      const [row, col] = state.selected;
      if (state.puzzle[row][col] !== null) return state;

      const snapshot: Snapshot = {
        board: state.board.map(r => [...r]),
        notes: cloneNotes(state.notes),
        selected: state.selected,
      };

      if (action.num === null) {
        const newBoard = state.board.map(r => [...r]);
        newBoard[row][col] = null;
        const newNotes = cloneNotes(state.notes);
        newNotes[row][col] = new Set();
        return { ...state, board: newBoard, notes: newNotes, hintMove: null, prev: snapshot };
      }

      if (state.notesMode) {
        const newNotes = cloneNotes(state.notes);
        const s = newNotes[row][col];
        if (s.has(action.num)) s.delete(action.num);
        else s.add(action.num);
        return { ...state, notes: newNotes, hintMove: null, prev: snapshot };
      }

      const newBoard = state.board.map(r => [...r]);
      newBoard[row][col] = action.num;
      const newNotes = cloneNotes(state.notes);
      newNotes[row][col] = new Set();
      const num = action.num;
      for (let c = 0; c < 9; c++) newNotes[row][c].delete(num);
      for (let r = 0; r < 9; r++) newNotes[r][col].delete(num);
      const br = Math.floor(row / 3) * 3;
      const bc = Math.floor(col / 3) * 3;
      for (let r = br; r < br + 3; r++)
        for (let c = bc; c < bc + 3; c++) newNotes[r][c].delete(num);
      return {
        ...state,
        board: newBoard,
        notes: newNotes,
        completed: isComplete(newBoard, state.solution),
        hintMove: null,
        prev: snapshot,
      };
    }

    case 'HINT_A': {
      if (state.completed) return state;
      if (state.selected) {
        const [r, c] = state.selected;
        if (state.puzzle[r][c] === null && state.board[r][c] !== state.solution[r][c])
          return fillCellWithSolution(state, r, c);
      }
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (state.puzzle[r][c] === null && state.board[r][c] !== state.solution[r][c])
            return fillCellWithSolution(state, r, c);
      return state;
    }

    case 'HINT_B':
      if (!action.result) return { ...state, hintMove: null };
      return {
        ...state,
        hintMove: action.result,
        selected: [action.result.row, action.result.col],
      };

    case 'UNDO': {
      if (!state.prev) return state;
      const { board, notes, selected } = state.prev;
      return { ...state, board, notes, selected, completed: false, hintMove: null, prev: null };
    }

    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback((difficulty: Difficulty) => {
    dispatch({ type: 'SET_LOADING' });
    setTimeout(() => {
      const { puzzle, solution } = generatePuzzle(difficulty);
      dispatch({ type: 'NEW_GAME', difficulty, puzzle, solution });
    }, 30);
  }, []);

  useEffect(() => {
    startGame('easy');
  }, [startGame]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!state.completed && !state.loading && state.puzzle.length > 0) {
      timerRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.completed, state.loading, state.puzzle]);

  const selectCell = useCallback((row: number, col: number) => {
    dispatch({ type: 'SELECT', row, col });
  }, []);

  const inputNumber = useCallback((num: number | null) => {
    dispatch({ type: 'INPUT', num });
  }, []);

  const toggleNotes = useCallback(() => {
    dispatch({ type: 'TOGGLE_NOTES' });
  }, []);

  const hintA = useCallback(() => {
    dispatch({ type: 'HINT_A' });
  }, []);

  const hintB = useCallback((board: Grid, notes: Set<number>[][]) => {
    const result = findNextHint(board, notes);
    dispatch({ type: 'HINT_B', result });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  return { ...state, selectCell, inputNumber, toggleNotes, startGame, hintA, hintB, undo };
}
