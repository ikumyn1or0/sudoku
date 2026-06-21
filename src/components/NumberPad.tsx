import type { FC } from 'react';

interface Props {
  onInput: (num: number | null) => void;
  notesMode: boolean;
  onToggleNotes: () => void;
}

export const NumberPad: FC<Props> = ({ onInput, notesMode, onToggleNotes }) => {
  return (
    <div className="number-pad">
      <div className="number-pad__actions">
        <button
          className={`btn btn--action ${notesMode ? 'btn--active' : ''}`}
          onClick={onToggleNotes}
        >
          メモ{notesMode ? ' ON' : ''}<span className="btn__shortcut">N</span>
        </button>
        <button
          className="btn btn--action"
          onClick={() => onInput(null)}
        >
          消去<span className="btn__shortcut">Del</span>
        </button>
      </div>
      <div className="number-pad__numbers">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            className="btn btn--number"
            onClick={() => onInput(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};
