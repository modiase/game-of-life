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
    :host {
      background-color: #000000;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      min-height: 100vh;
      display: block;
    }
    .board-base {
      border: 2px solid #00ff00;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #111111;
    }
    .board-container-base {
      padding: 1.5rem;
      width: ${BoardElement.BOARD_WIDTH_PIXELS}px;
      height: ${BoardElement.BOARD_HEIGHT_PIXELS}px;
      margin: 0 auto;
      background-color: #000000;
    }
    .board-message {
      text-align: center;
      padding: 0.5rem;
      color: #00ff00;
    }
    .board-controller {
      width: 100%;
      padding: 0;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #00ff00;
      background-color: #111111;
    }
    .board-controller__is-running {
      border: 2px solid #00ff00;
      box-shadow: 0 0 10px #00ff00;
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
      border: 1px solid #003300;
      background-color: #000000;
    }
    .board-cell-alive {
      background-color: #00ff00;
      box-shadow: 0 0 2px #00ff00;
    }

    .header-base {
      text-align: center;
      color: #00ff00;
      text-shadow: 0 0 10px #00ff00;
      font-weight: bold;
    }
    .toggle-running-btn-base {
      padding: 0.5rem;
      border-radius: 10px;
      background-color: #000000;
      color: #00ff00;
      border: 2px solid #00ff00;
      font-family: 'Courier New', monospace;
      cursor: pointer;
    }
    .toggle-running-btn-base:hover {
      background-color: #003300;
      box-shadow: 0 0 5px #00ff00;
    }
    .randomize-btn-base {
      padding: 0.5rem;
      border-radius: 10px;
      margin-left: 0.5rem;
      background-color: #000000;
      color: #00ff00;
      border: 2px solid #00ff00;
      font-family: 'Courier New', monospace;
      cursor: pointer;
    }
    .randomize-btn-base:hover {
      background-color: #003300;
      box-shadow: 0 0 5px #00ff00;
    }
    p {
      color: #00ff00;
      font-family: 'Courier New', monospace;
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
  handleRandomizeClicked() {
    this.board.randomize();
    this.cells = this.board.getCells();
  }

  render() {
    return html`<div class=${classMap({ "board-container-base": true })}>
    <h1 class=${classMap({ "header-base": true })}>Conway's Game of Life</h1>
        <div class=${classMap({ "board-base": true })}">
        ${renderCells(this.cells, this.handleCellClicked.bind(this))}
      </div>
      <div class=${classMap({
        "board-controller": true,
        "board-controller__is-running": this.running,
      })}>
          <p style="padding: 0.5rem">Epoch: ${this.epoch}</p>
            <button
              @click="${this.handleStartStopClicked}"
              class=${classMap({
                "toggle-running-btn-base": true,
              })}
            >
              ${this.board.controller.stopped ? "Start" : "Stop"}
            </button>
            <button
              @click="${this.handleRandomizeClicked}"
              class=${classMap({
                "randomize-btn-base": true,
              })}
            >
              Randomize
            </button>
          </div>
        </div>
      </div> `;
  }
}
