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

const TECHNIQUE_LABELS: Record<string, string> = {
  'Naked / Hidden Single':           '一択確定（Naked/Hidden Single）',
  'Locked Candidates / Pair・Triple': 'ペア・三つ組消去（Locked Candidates/Pair/Triple）',
  'X-Wing / Swordfish / XY-Wing':    'X-Wing・XY-Wing・Swordfish消去',
};

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
          {hintMove.kind === 'note-error'
            ? <>({hintMove.row + 1}行{hintMove.col + 1}列) のメモ <strong>{hintMove.value}</strong> は矛盾しています</>
            : <>
                ({hintMove.row + 1}行{hintMove.col + 1}列) に <strong>{hintMove.value}</strong> が確定できます
                <div className="hint-technique">{TECHNIQUE_LABELS[hintMove.technique] ?? hintMove.technique}</div>
              </>
          }
        </div>
      )}

      <div className="hint-bar">
        <button
          className="btn btn--undo"
          onClick={undo}
          disabled={loading || !prev}
        >
          戻す<span className="btn__shortcut">Ctrl+Z</span>
        </button>
        <button
          className="btn btn--hint"
          onClick={hintA}
          disabled={loading || completed}
        >
          答えを見る
        </button>
        <button
          className="btn btn--hint"
          onClick={() => hintB(board, notes)}
          disabled={loading || completed}
        >
          次の手を教える
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
