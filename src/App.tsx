import { useEffect, useCallback } from 'react';
import { useGame, type Difficulty } from './hooks/useGame';
import { Board } from './components/Board';
import { NumberPad } from './components/NumberPad';
import './App.css';

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy',   label: '初級' },
  { value: 'medium', label: '中級' },
  { value: 'hard',   label: '上級' },
  { value: 'expert', label: 'エキスパート' },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function App() {
  const {
    puzzle, board, solution, notes,
    selected, difficulty, completed, seconds, notesMode, loading, hintMove, prev,
    selectCell, inputNumber, toggleNotes, startGame, hintA, hintB, undo,
  } = useGame();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      inputNumber(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      inputNumber(null);
    } else if (e.key === 'n' || e.key === 'N' || e.key === ' ') {
      e.preventDefault();
      toggleNotes();
    }
    if (!selected) return;
    const [row, col] = selected;
    if (e.key === 'ArrowUp' && row > 0) { e.preventDefault(); selectCell(row - 1, col); }
    else if (e.key === 'ArrowDown' && row < 8) { e.preventDefault(); selectCell(row + 1, col); }
    else if (e.key === 'ArrowLeft' && col > 0) { e.preventDefault(); selectCell(row, col - 1); }
    else if (e.key === 'ArrowRight' && col < 8) { e.preventDefault(); selectCell(row, col + 1); }
  }, [inputNumber, toggleNotes, selected, selectCell, undo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">数独</h1>
        <div className="timer">{formatTime(seconds)}</div>
      </header>

      <div className="difficulty-selector">
        {DIFFICULTIES.map(({ value, label }) => (
          <button
            key={value}
            className={`btn btn--difficulty ${difficulty === value ? 'btn--active' : ''}`}
            onClick={() => startGame(value)}
            disabled={loading}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="board-container">
        {loading ? (
          <div className="loading-box">生成中...</div>
        ) : (
          puzzle.length > 0 && (
            <Board
              puzzle={puzzle}
              board={board}
              solution={solution}
              notes={notes}
              selected={selected}
              hintMove={hintMove}
              onSelect={selectCell}
            />
          )
        )}
      </div>

      {hintMove && (
        <div className="hint-message">
          ヒント: {hintMove.technique} を使って ({hintMove.row + 1}行{hintMove.col + 1}列) に {hintMove.value} を確定できます
        </div>
      )}

      <div className="hint-bar">
        <button
          className="btn btn--undo"
          onClick={undo}
          disabled={loading || !prev}
          title="1手戻す (Ctrl+Z)"
        >
          戻す
        </button>
        <button
          className="btn btn--hint"
          onClick={hintA}
          disabled={loading || completed}
          title="選択中（または最初の）マスに正解を表示"
        >
          ヒントA
        </button>
        <button
          className="btn btn--hint"
          onClick={() => hintB(board)}
          disabled={loading || completed}
          title="ソルバーが次の手を提示"
        >
          ヒントB
        </button>
      </div>

      <NumberPad
        onInput={inputNumber}
        notesMode={notesMode}
        onToggleNotes={toggleNotes}
      />

      <button
        className="btn btn--new-game"
        onClick={() => startGame(difficulty)}
        disabled={loading}
      >
        新しいゲーム
      </button>

      {import.meta.env.DEV && (
        <button
          className="btn btn--quit"
          onClick={() => fetch('/__shutdown').then(() => window.close())}
        >
          終了
        </button>
      )}

      {completed && (
        <div className="completion-overlay" onClick={() => startGame(difficulty)}>
          <div className="completion-card">
            <div className="completion-title">クリア</div>
            <div className="completion-time">{formatTime(seconds)}</div>
            <div className="completion-hint">タップして次のゲームへ</div>
          </div>
        </div>
      )}
    </div>
  );
}
