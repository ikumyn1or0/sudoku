import type { FC } from 'react';
import { Cell } from './Cell';
import type { Grid } from '../lib/sudoku';
import type { HintMove } from '../hooks/useGame';

interface Props {
  puzzle: Grid;
  board: Grid;
  solution: number[][];
  notes: Set<number>[][];
  selected: [number, number] | null;
  hintMove: HintMove | null;
  onSelect: (row: number, col: number) => void;
}

export const Board: FC<Props> = ({ puzzle, board, solution, notes, selected, hintMove, onSelect }) => {
  const selectedNum = selected ? board[selected[0]][selected[1]] : null;

  return (
    <div className="board">
      {board.map((row, r) =>
        row.map((cell, c) => {
          const isSelected = !!selected && selected[0] === r && selected[1] === c;
          const isHint = !!hintMove && hintMove.row === r && hintMove.col === c;
          const isRelated = !!selected && (
            selected[0] === r ||
            selected[1] === c ||
            (Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
             Math.floor(selected[1] / 3) === Math.floor(c / 3))
          );
          const isSameNumber = selectedNum !== null && cell === selectedNum;
          const isError = cell !== null && puzzle[r][c] === null && cell !== solution[r][c];

          return (
            <Cell
              key={`${r}-${c}`}
              value={cell}
              notes={notes[r]?.[c] ?? new Set()}
              isGiven={puzzle[r][c] !== null}
              isSelected={isSelected}
              isRelated={isRelated}
              isSameNumber={isSameNumber}
              isError={isError}
              isHint={isHint}
              highlightNote={selectedNum}
              onClick={() => onSelect(r, c)}
            />
          );
        })
      )}
    </div>
  );
};
