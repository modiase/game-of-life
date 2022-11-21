import { LitElement, html, css } from "lit";
import { BoardHandle, createBoardHandle, type Cells } from "./board";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import "./style.scss";

const renderCells = (
  cells: Cells,
  handleCellClicked: (row: number, column: number) => void
) => {
  const boardRowClasses = classMap({ "board-row": true });
  const boardCellClasses = (isAlive: boolean) =>
    classMap({ "board-cell-base": true, "board-cell-alive": isAlive });

  return cells.map(
    (row, rowIndex) =>
      html`<div class=${boardRowClasses}>
        ${row.map(
          (cell, columnIndex) =>
            html`<div
              @click=${() => handleCellClicked(rowIndex, columnIndex)}
              class=${boardCellClasses(cell.alive)}
            ></div>`
        )}
      </div>`
  );
};

@customElement("app-board")
export class BoardElement extends LitElement {
  static readonly BOARD_HEIGHT_PIXELS: number = 600;
  static readonly BOARD_WIDTH_PIXELS: number = 600;
  static readonly BOARD_ROWS: number = 120;
  static readonly BOARD_COLUMNS: number = 120;
  static styles = css`
    .board-base {
      border: 2px solid black;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .board-container-base {
      padding: 1.5rem;
      width: ${BoardElement.BOARD_WIDTH_PIXELS}px;
      height: ${BoardElement.BOARD_HEIGHT_PIXELS}px;
      margin: 0 auto;
    }
    .board-message {
      text-align: center;
      padding: 0.5rem;
    }
    .board-controller {
      width: 100%;
      padding: 0;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid black;
    }
    .board-controller__is-running {
      border: 2px solid green;
    }
    .board-row {
      width: 100%;
      flex-grow: 1;
      padding: 0;
      margin: 0;
      display: flex;
    }

    .board-cell-base {
      display: block;
      flex-grow: 1;
      margin: 0;
      border: 1px solid black;
    }
    .board-cell-alive {
      background-color: black;
    }

    .header-base {
      text-align: center;
    }
    .toggle-running-btn-base {
      padding: 0.5rem;
      border-radius: 10px;
    }
  `;

  board: BoardHandle;

  constructor() {
    super();
    this.board = createBoardHandle({
      rows: BoardElement.BOARD_ROWS,
      columns: BoardElement.BOARD_COLUMNS,
      initialBoard: [],
    });
    this.running = !this.board.controller.stopped;
    this.cells = this.board.getCells();
    this.board.evolution$.subscribe((evolution) => {
      this.cells = evolution.cells;
      this.epoch = evolution.epoch;
    });
  }

  @property()
  running = false;

  @property()
  epoch = 0;

  @property()
  cells: Cells = [];

  handleStartStopClicked() {
    this.running = !this.board.controller.toggleStopped();
  }
  handleCellClicked(row: number, column: number) {
    this.board.toggleCell(row, column);
    this.cells = this.board.getCells();
  }

  render() {
    const boardContainerClasses = classMap({ "board-container-base": true });
    const boardClasses = classMap({ "board-base": true });
    const controllerClasses = classMap({
      "board-controller": true,
      "board-controller__is-running": this.running,
    });
    const toggleRunningBtnClasses = classMap({
      "toggle-running-btn-base": true,
    });
    const headerClasses = classMap({ "header-base": true });
    return html`<div class=${boardContainerClasses}>
    <h1 class=${headerClasses}>Conway's Game of Life</h1>
        <div class=${boardClasses}">
        ${renderCells(this.cells, this.handleCellClicked.bind(this))}
      </div>
      <div class=${controllerClasses}>
          <p style="padding: 0.5rem">Epoch: ${this.epoch}</p>
            <button
              @click="${this.handleStartStopClicked}"
              class=${toggleRunningBtnClasses}
            >
              ${this.board.controller.stopped ? "Start" : "Stop"}
            </button>
          </div>
        </div>
      </div> `;
  }
}
