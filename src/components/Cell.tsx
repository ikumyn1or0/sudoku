import type { FC } from 'react';

interface Props {
  value: number | null;
  notes: Set<number>;
  isGiven: boolean;
  isSelected: boolean;
  isRelated: boolean;
  isSameNumber: boolean;
  isError: boolean;
  isHint: boolean;
  highlightNote: number | null;
  onClick: () => void;
}

export const Cell: FC<Props> = ({
  value, notes, isGiven, isSelected, isRelated, isSameNumber, isError, isHint, highlightNote, onClick,
}) => {
  const classes = [
    'cell',
    isSelected ? 'cell--selected' : '',
    isHint && !isSelected ? 'cell--hint' : '',
    isRelated && !isSelected && !isHint ? 'cell--related' : '',
    isSameNumber && !isSelected && !isHint ? 'cell--same-number' : '',
    isGiven ? 'cell--given' : '',
    isError ? 'cell--error' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {value !== null ? (
        <span className="cell__value">{value}</span>
      ) : notes.size > 0 ? (
        <div className="cell__notes">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <span key={n} className={`cell__note${notes.has(n) && n === highlightNote ? ' cell__note--highlight' : ''}`}>
              {notes.has(n) ? n : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};
