import * as AP from "fp-ts/Apply";
import * as Eq from "fp-ts/Eq";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/Set";
import * as f from "fp-ts/function";
import * as RX from "rxjs";

export interface Cell {
  readonly alive: boolean;
  readonly row: number;
  readonly column: number;
}
export type Cells = ReadonlyArray<ReadonlyArray<Cell>>;

export interface BoardConfig {
  // Determines whether cells at the edges of the board wrap round
  wrapEdges: boolean;
  // The number of neighbours at or above which a cell will die of overcrowding
  overcrowdingNumber: number;
  // The number of neighbours required for a not-alive cell to come alive
  reproductionNumber: number;
  // The number of neighbours at and below which a cell will die of loneliness
  lonelinessNumber: number;
}

export interface BoardEvolution {
  readonly epoch: number;
  readonly cells: Cells;
  readonly births: ReadonlyArray<[number, number]>;
  readonly deaths: ReadonlyArray<[number, number]>;
}
export interface Board {
  readonly epoch: number;
  readonly rows: number;
  readonly columns: number;
  readonly config: BoardConfig;
  readonly startCells: ReadonlyArray<[number, number]>;
  readonly toggleCell: (row: number, column: number) => boolean;
  readonly getCells: () => Cells;
  readonly evolve: () => BoardEvolution;
  readonly randomize: () => void;
}
export const createBoard = (
  startCells: ReadonlyArray<[number, number]>,
  rows: number,
  columns: number,
  config: BoardConfig
): Board => {
  const CellCoordEq = Eq.fromEquals<[number, number]>(
    ([ar, ac], [br, bc]) => ar === br && ac === bc
  );
  const startCellsSet = S.fromArray(CellCoordEq)([...startCells]);
  const startCellsHas = (coords: [number, number]) =>
    S.elem(CellCoordEq)(coords)(startCellsSet);
  let _epoch = 0;
  let _cells: Cells = RA.makeBy(rows, (row) =>
    RA.makeBy(columns, (column) => ({
      row: row,
      column: column,
      alive: startCellsHas([row, column]),
    }))
  );

  const getNeighbourCoordinates = (
    row: number,
    column: number
  ): O.Option<ReadonlyArray<[number, number]>> =>
    row < rows && row >= 0 && column < columns && column >= 0
      ? O.some(
          f.pipe(
            RA.makeBy(3, (i) => RA.makeBy(3, (j) => [i - 1, j - 1] as const)),
            RA.map(RA.filter(([r, c]) => r !== 0 || c !== 0)),
            RA.map((r) =>
              f.pipe(
                r,
                RA.map(
                  ([rowOffset, columnOffset]) =>
                    [
                      rowOffset + row >= 0 && rowOffset + row < rows
                        ? O.some(rowOffset + row)
                        : config.wrapEdges
                        ? rowOffset + row < 0
                          ? O.some(rowOffset + row + rows)
                          : O.some(rowOffset + row - rows)
                        : O.none,
                      columnOffset + column >= 0 &&
                      columnOffset + column < columns
                        ? O.some(columnOffset + column)
                        : config.wrapEdges
                        ? columnOffset + column < 0
                          ? O.some(columnOffset + column + columns)
                          : O.some(columnOffset + column - columns)
                        : O.none,
                    ] as const
                ),
                RA.map(([r, c]) => AP.sequenceT(O.Apply)(r, c)),
                RA.chain(
                  O.fold(
                    () => RA.empty,
                    (coordinates) => RA.of(coordinates)
                  )
                )
              )
            ),
            RA.flatten
          )
        )
      : O.none;
  const computeNeighbours = (row: number, column: number) =>
    f.pipe(
      getNeighbourCoordinates(row, column), //
      O.map(
        f.flow(
          RA.reduce(0, (acc, [neighbourRow, neighbourColumn]) =>
            _cells[neighbourRow][neighbourColumn].alive ? acc + 1 : acc
          )
        )
      )
    );

  const evolve = (): BoardEvolution => {
    _epoch++;
    const _births: Array<[number, number]> = [];
    const _deaths: Array<[number, number]> = [];

    _cells = f.pipe(
      _cells,
      RA.map((row) =>
        f.pipe(
          row,
          RA.map((cell) =>
            f.pipe(
              computeNeighbours(cell.row, cell.column),
              O.getOrElse(() => 0),
              (neighbours) =>
                cell.alive
                  ? (_deaths.push([cell.row, cell.column]),
                    {
                      ...cell,
                      alive: !(
                        neighbours >= config.overcrowdingNumber ||
                        neighbours <= config.lonelinessNumber
                      ),
                    })
                  : (_births.push([cell.row, cell.column]),
                    {
                      ...cell,
                      alive: neighbours == config.reproductionNumber,
                    })
            )
          )
        )
      )
    );

    return { births: _births, deaths: _deaths, epoch: _epoch, cells: _cells };
  };

  const toggleCell = (row: number, column: number): boolean => {
    _cells = f.pipe(
      _cells,
      RA.mapWithIndex((rowIndex, _row) =>
        f.pipe(
          _row,
          RA.mapWithIndex((columnIndex, cell) => ({
            ...cell,
            alive:
              rowIndex === row && columnIndex === column
                ? !cell.alive
                : cell.alive,
          }))
        )
      )
    );
    return _cells[row][column].alive;
  };

  const randomize = (): void => {
    _cells = f.pipe(
      _cells,
      RA.map((row) =>
        f.pipe(
          row,
          RA.map((cell) => ({
            ...cell,
            alive: Math.random() < 0.3, // 30% chance of being alive
          }))
        )
      )
    );
  };

  return {
    getCells() {
      return _cells;
    },
    epoch: _epoch,
    rows: rows,
    columns: columns,
    config: config,
    startCells,
    toggleCell,
    evolve,
    randomize,
  };
};

export interface BoardController {
  readonly stopped: boolean;
  readonly toggleStopped: () => boolean;
}
export interface BoardHandle {
  readonly evolution$: RX.Observable<BoardEvolution>;
  readonly controller: BoardController;
  readonly toggleCell: (row: number, column: number) => boolean;
  readonly getCells: () => Cells;
  readonly randomize: () => void;
}
export interface CreateBoardHandleOptions {
  readonly rows: number;
  readonly columns: number;
  readonly initialBoard: ReadonlyArray<[number, number]>;
}

export const createBoardHandle = ({
  rows,
  columns,
  initialBoard,
}: CreateBoardHandleOptions): BoardHandle => {
  const _board = createBoard(initialBoard, rows, columns, {
    wrapEdges: true,
    overcrowdingNumber: 4,
    reproductionNumber: 3,
    lonelinessNumber: 1,
  });

  const controller: BoardController = (() => {
    let _stopped = true;
    return {
      get stopped() {
        return _stopped;
      },
      toggleStopped: () => {
        _stopped = !_stopped;
        return _stopped;
      },
    };
  })();
  const evolution$: RX.Observable<BoardEvolution> = new RX.Observable(
    (subscriber) => {
      const _source = RX.interval(50)
        .pipe(RX.filter(() => !controller.stopped))
        .subscribe(() => {
          subscriber.next(_board.evolve());
        });
      return () => _source.unsubscribe();
    }
  );
  return {
    getCells() {
      return _board.getCells();
    },
    toggleCell: _board.toggleCell,
    controller,
    evolution$,
    randomize: _board.randomize,
  };
};
