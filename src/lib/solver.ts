import type { Grid, Difficulty } from './sudoku';

export interface HintMove {
  row: number;
  col: number;
  value: number;
  technique: string;
  kind: 'move' | 'note-error';
}

type CandGrid = Set<number>[][];
type Level = 'basic' | 'intermediate' | 'advanced';

function buildState(puzzle: Grid): { values: Grid; cands: CandGrid } {
  const values: Grid = puzzle.map(row => [...row]);
  const cands: CandGrid = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (values[r][c] === null)
        for (let n = 1; n <= 9; n++) cands[r][c].add(n);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (values[r][c] !== null)
        eliminate(cands, r, c, values[r][c] as number);
  return { values, cands };
}

function eliminate(cands: CandGrid, r: number, c: number, num: number): void {
  for (let cc = 0; cc < 9; cc++) cands[r][cc].delete(num);
  for (let rr = 0; rr < 9; rr++) cands[rr][c].delete(num);
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++)
    for (let cc = bc; cc < bc + 3; cc++)
      cands[rr][cc].delete(num);
}

function place(values: Grid, cands: CandGrid, r: number, c: number, num: number): void {
  values[r][c] = num;
  cands[r][c].clear();
  eliminate(cands, r, c, num);
}

function isSolved(values: Grid): boolean {
  return values.every(row => row.every(v => v !== null));
}

function sees(r1: number, c1: number, r2: number, c2: number): boolean {
  return r1 === r2 || c1 === c2 ||
    (Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3));
}

const UNITS: [number, number][][] = [
  ...Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => [r, c] as [number, number])
  ),
  ...Array.from({ length: 9 }, (_, c) =>
    Array.from({ length: 9 }, (_, r) => [r, c] as [number, number])
  ),
  ...Array.from({ length: 9 }, (_, i) => {
    const br = Math.floor(i / 3) * 3;
    const bc = (i % 3) * 3;
    return Array.from({ length: 9 }, (_, j) =>
      [br + Math.floor(j / 3), bc + (j % 3)] as [number, number]
    );
  }),
];

// --- 基本技法 ---

function applyNakedSingle(values: Grid, cands: CandGrid): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (values[r][c] === null && cands[r][c].size === 1) {
        const [num] = cands[r][c];
        place(values, cands, r, c, num);
        return true;
      }
  return false;
}

function applyHiddenSingle(values: Grid, cands: CandGrid): boolean {
  for (const unit of UNITS)
    for (let n = 1; n <= 9; n++) {
      const hits = unit.filter(([r, c]) => values[r][c] === null && cands[r][c].has(n));
      if (hits.length === 1) {
        const [r, c] = hits[0];
        place(values, cands, r, c, n);
        return true;
      }
    }
  return false;
}

// --- 中級技法 ---

function applyLockedCandidates(values: Grid, cands: CandGrid): boolean {
  for (let br = 0; br < 3; br++)
    for (let bc = 0; bc < 3; bc++)
      for (let n = 1; n <= 9; n++) {
        const cells: [number, number][] = [];
        for (let r = br * 3; r < br * 3 + 3; r++)
          for (let c = bc * 3; c < bc * 3 + 3; c++)
            if (values[r][c] === null && cands[r][c].has(n)) cells.push([r, c]);
        if (cells.length <= 1) continue;

        const rows = new Set(cells.map(([r]) => r));
        if (rows.size === 1) {
          const row = [...rows][0];
          let changed = false;
          for (let c = 0; c < 9; c++)
            if (Math.floor(c / 3) !== bc && values[row][c] === null && cands[row][c].has(n))
              { cands[row][c].delete(n); changed = true; }
          if (changed) return true;
        }
        const cols = new Set(cells.map(([, c]) => c));
        if (cols.size === 1) {
          const col = [...cols][0];
          let changed = false;
          for (let r = 0; r < 9; r++)
            if (Math.floor(r / 3) !== br && values[r][col] === null && cands[r][col].has(n))
              { cands[r][col].delete(n); changed = true; }
          if (changed) return true;
        }
      }

  for (let r = 0; r < 9; r++)
    for (let n = 1; n <= 9; n++) {
      const cols: number[] = [];
      for (let c = 0; c < 9; c++)
        if (values[r][c] === null && cands[r][c].has(n)) cols.push(c);
      if (cols.length <= 1) continue;
      const bcs = new Set(cols.map(c => Math.floor(c / 3)));
      if (bcs.size !== 1) continue;
      const bc = [...bcs][0], br = Math.floor(r / 3);
      let changed = false;
      for (let rr = br * 3; rr < br * 3 + 3; rr++)
        if (rr !== r)
          for (let c = bc * 3; c < bc * 3 + 3; c++)
            if (values[rr][c] === null && cands[rr][c].has(n))
              { cands[rr][c].delete(n); changed = true; }
      if (changed) return true;
    }

  for (let c = 0; c < 9; c++)
    for (let n = 1; n <= 9; n++) {
      const rows: number[] = [];
      for (let r = 0; r < 9; r++)
        if (values[r][c] === null && cands[r][c].has(n)) rows.push(r);
      if (rows.length <= 1) continue;
      const brs = new Set(rows.map(r => Math.floor(r / 3)));
      if (brs.size !== 1) continue;
      const br = [...brs][0], bc = Math.floor(c / 3);
      let changed = false;
      for (let r = br * 3; r < br * 3 + 3; r++)
        for (let cc = bc * 3; cc < bc * 3 + 3; cc++)
          if (cc !== c && values[r][cc] === null && cands[r][cc].has(n))
            { cands[r][cc].delete(n); changed = true; }
      if (changed) return true;
    }

  return false;
}

function applyNakedSubset(values: Grid, cands: CandGrid, size: number): boolean {
  for (const unit of UNITS) {
    const empty = unit.filter(([r, c]) => values[r][c] === null);
    for (const combo of combinations(empty, size)) {
      const union = new Set<number>();
      for (const [r, c] of combo) for (const n of cands[r][c]) union.add(n);
      if (union.size !== size) continue;
      let changed = false;
      for (const [r, c] of empty) {
        if (combo.some(([cr, cc]) => cr === r && cc === c)) continue;
        for (const n of union)
          if (cands[r][c].has(n)) { cands[r][c].delete(n); changed = true; }
      }
      if (changed) return true;
    }
  }
  return false;
}

function applyHiddenSubset(values: Grid, cands: CandGrid, size: number): boolean {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const unit of UNITS) {
    const empty = unit.filter(([r, c]) => values[r][c] === null);
    for (const numCombo of combinations(nums, size)) {
      const cells = empty.filter(([r, c]) => numCombo.some(n => cands[r][c].has(n)));
      if (cells.length !== size) continue;
      const numSet = new Set(numCombo);
      let changed = false;
      for (const [r, c] of cells)
        for (const n of [...cands[r][c]])
          if (!numSet.has(n)) { cands[r][c].delete(n); changed = true; }
      if (changed) return true;
    }
  }
  return false;
}

// --- 上級技法 ---

// X-Wing (size=2) / Swordfish (size=3): N行のある数字の候補列の和集合がN列なら他行から除去（列方向も同様）
function applyBasicFish(values: Grid, cands: CandGrid, size: number): boolean {
  const indices = Array.from({ length: 9 }, (_, i) => i);
  for (let n = 1; n <= 9; n++) {
    // 行ベース
    for (const rowCombo of combinations(indices, size)) {
      const colSet = new Set<number>();
      let valid = true;
      for (const r of rowCombo) {
        for (let c = 0; c < 9; c++)
          if (values[r][c] === null && cands[r][c].has(n)) colSet.add(c);
        if (colSet.size > size) { valid = false; break; }
      }
      if (!valid || colSet.size !== size) continue;
      let changed = false;
      for (let r = 0; r < 9; r++) {
        if (rowCombo.includes(r)) continue;
        for (const c of colSet)
          if (values[r][c] === null && cands[r][c].has(n))
            { cands[r][c].delete(n); changed = true; }
      }
      if (changed) return true;
    }
    // 列ベース
    for (const colCombo of combinations(indices, size)) {
      const rowSet = new Set<number>();
      let valid = true;
      for (const c of colCombo) {
        for (let r = 0; r < 9; r++)
          if (values[r][c] === null && cands[r][c].has(n)) rowSet.add(r);
        if (rowSet.size > size) { valid = false; break; }
      }
      if (!valid || rowSet.size !== size) continue;
      let changed = false;
      for (let c = 0; c < 9; c++) {
        if (colCombo.includes(c)) continue;
        for (const r of rowSet)
          if (values[r][c] === null && cands[r][c].has(n))
            { cands[r][c].delete(n); changed = true; }
      }
      if (changed) return true;
    }
  }
  return false;
}

// XY-Wing: ピボットA={x,y}、ピンサーB={x,z}・C={y,z} → BとC両方から見えるマスのzを除去
function applyXYWing(values: Grid, cands: CandGrid): boolean {
  for (let ra = 0; ra < 9; ra++)
    for (let ca = 0; ca < 9; ca++) {
      if (values[ra][ca] !== null || cands[ra][ca].size !== 2) continue;
      const [x, y] = [...cands[ra][ca]];

      for (let rb = 0; rb < 9; rb++)
        for (let cb = 0; cb < 9; cb++) {
          if ((rb === ra && cb === ca) || !sees(ra, ca, rb, cb)) continue;
          if (values[rb][cb] !== null || cands[rb][cb].size !== 2) continue;
          const bArr = [...cands[rb][cb]];
          const sharedAB = bArr.filter(n => n === x || n === y);
          if (sharedAB.length !== 1) continue;
          const a = sharedAB[0];
          const b = a === x ? y : x;
          const z = bArr.find(n => n !== a)!;

          for (let rc = 0; rc < 9; rc++)
            for (let cc = 0; cc < 9; cc++) {
              if ((rc === ra && cc === ca) || (rc === rb && cc === cb)) continue;
              if (!sees(ra, ca, rc, cc)) continue;
              if (values[rc][cc] !== null || cands[rc][cc].size !== 2) continue;
              const cArr = [...cands[rc][cc]];
              if (!cArr.includes(b) || !cArr.includes(z)) continue;

              let changed = false;
              for (let r = 0; r < 9; r++)
                for (let c = 0; c < 9; c++) {
                  if (values[r][c] !== null) continue;
                  if ((r === rb && c === cb) || (r === rc && c === cc)) continue;
                  if (sees(rb, cb, r, c) && sees(rc, cc, r, c) && cands[r][c].has(z))
                    { cands[r][c].delete(z); changed = true; }
                }
              if (changed) return true;
            }
        }
    }
  return false;
}

// XYZ-Wing: ピボットA={x,y,z}、ピンサーB・Cともにzを含みA候補の部分集合、B∪C=A → A・B・C全てから見えるマスのzを除去
function applyXYZWing(values: Grid, cands: CandGrid): boolean {
  for (let ra = 0; ra < 9; ra++)
    for (let ca = 0; ca < 9; ca++) {
      if (values[ra][ca] !== null || cands[ra][ca].size !== 3) continue;
      const aArr = [...cands[ra][ca]];

      for (const z of aArr) {
        const pincers: [number, number][] = [];
        for (let r = 0; r < 9; r++)
          for (let c = 0; c < 9; c++) {
            if ((r === ra && c === ca) || !sees(ra, ca, r, c)) continue;
            if (values[r][c] !== null || cands[r][c].size !== 2) continue;
            const arr = [...cands[r][c]];
            if (arr.includes(z) && arr.every(n => aArr.includes(n))) pincers.push([r, c]);
          }

        for (let i = 0; i < pincers.length; i++)
          for (let j = i + 1; j < pincers.length; j++) {
            const [rb, cb] = pincers[i], [rc, cc] = pincers[j];
            const combined = new Set([...cands[rb][cb], ...cands[rc][cc]]);
            if (combined.size !== 3 || !aArr.every(n => combined.has(n))) continue;

            let changed = false;
            for (let r = 0; r < 9; r++)
              for (let c = 0; c < 9; c++) {
                if (values[r][c] !== null) continue;
                if ((r===ra&&c===ca)||(r===rb&&c===cb)||(r===rc&&c===cc)) continue;
                if (cands[r][c].has(z) && sees(ra,ca,r,c) && sees(rb,cb,r,c) && sees(rc,cc,r,c))
                  { cands[r][c].delete(z); changed = true; }
              }
            if (changed) return true;
          }
      }
    }
  return false;
}

function combinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (arr.length < size) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, size - 1).map(c => [first, ...c]),
    ...combinations(rest, size),
  ];
}

// --- ソルバー本体 ---

function applyEliminations(values: Grid, cands: CandGrid, level: Level): boolean {
  if (level === 'basic') return false;
  if (applyLockedCandidates(values, cands)) return true;
  if (applyNakedSubset(values, cands, 2)) return true;
  if (applyHiddenSubset(values, cands, 2)) return true;
  if (applyNakedSubset(values, cands, 3)) return true;
  if (applyHiddenSubset(values, cands, 3)) return true;
  if (level === 'intermediate') return false;
  if (applyBasicFish(values, cands, 2)) return true;
  if (applyBasicFish(values, cands, 3)) return true;
  if (applyXYWing(values, cands)) return true;
  if (applyXYZWing(values, cands)) return true;
  return false;
}

function solveWithLevel(puzzle: Grid, level: Level): boolean {
  const { values, cands } = buildState(puzzle);
  while (!isSolved(values)) {
    if (applyNakedSingle(values, cands)) continue;
    if (applyHiddenSingle(values, cands)) continue;
    if (!applyEliminations(values, cands, level)) break;
  }
  return isSolved(values);
}

export function classifyDifficulty(puzzle: Grid): Difficulty {
  if (solveWithLevel(puzzle, 'basic')) return 'easy';
  if (solveWithLevel(puzzle, 'intermediate')) return 'medium';
  if (solveWithLevel(puzzle, 'advanced')) return 'hard';
  return 'expert';
}

// --- ヒントB: 次に置けるマスを技法付きで返す ---

function findSingle(values: Grid, cands: CandGrid): { row: number; col: number; value: number } | null {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (values[r][c] === null && cands[r][c].size === 1) {
        const [value] = cands[r][c];
        return { row: r, col: c, value };
      }
  for (const unit of UNITS)
    for (let n = 1; n <= 9; n++) {
      const hits = unit.filter(([r, c]) => values[r][c] === null && cands[r][c].has(n));
      if (hits.length === 1) return { row: hits[0][0], col: hits[0][1], value: n };
    }
  return null;
}

const HINT_LEVELS: { level: Level; technique: string }[] = [
  { level: 'basic',        technique: 'Naked / Hidden Single' },
  { level: 'intermediate', technique: 'Locked Candidates / Pair・Triple' },
  { level: 'advanced',     technique: 'X-Wing / Swordfish / XY-Wing' },
];

function checkNoteMistakes(board: Grid, notes: Set<number>[][]): { row: number; col: number; value: number } | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const num = board[r][c];
      if (num === null) continue;
      for (let cc = 0; cc < 9; cc++)
        if (cc !== c && board[r][cc] === null && notes[r][cc].has(num))
          return { row: r, col: cc, value: num };
      for (let rr = 0; rr < 9; rr++)
        if (rr !== r && board[rr][c] === null && notes[rr][c].has(num))
          return { row: rr, col: c, value: num };
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++)
        for (let cc = bc; cc < bc + 3; cc++)
          if ((rr !== r || cc !== c) && board[rr][cc] === null && notes[rr][cc].has(num))
            return { row: rr, col: cc, value: num };
    }
  }
  return null;
}

export function findNextHint(board: Grid, notes: Set<number>[][]): HintMove | null {
  const noteError = checkNoteMistakes(board, notes);
  if (noteError) return { ...noteError, technique: '', kind: 'note-error' };

  for (const { level, technique } of HINT_LEVELS) {
    const { values, cands } = buildState(board);
    let changed = true;
    while (changed) changed = applyEliminations(values, cands, level);
    const hit = findSingle(values, cands);
    if (hit) return { ...hit, technique, kind: 'move' };
  }
  return null;
}
