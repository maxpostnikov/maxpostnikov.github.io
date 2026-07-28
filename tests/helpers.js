import BoardModel from "../docs/assets/js/model/BoardModel.js";
import SpecialTileRegistry from "../docs/assets/js/model/SpecialTileRegistry.js";
import BombCreationRule from "../docs/assets/js/specials/bomb/BombCreationRule.js";
import BombTile from "../docs/assets/js/specials/bomb/BombTile.js";

export function createRegistry() {
    const registry = new SpecialTileRegistry();
    registry.register({
        type: "bomb",
        TileClass: BombTile,
        creationRules: [new BombCreationRule()]
    });
    return registry;
}

export function createEmptyBoard(rows, cols, registry = createRegistry()) {
    let randomIndex = 0;
    const board = new BoardModel({
        rows,
        cols,
        specialTileRegistry: registry,
        random: () => (randomIndex++ % 6) / 6
    });
    board.removeTiles(board.getAllTiles());
    return board;
}

export function createBoardFromRows(rows, registry = createRegistry()) {
    const board = createEmptyBoard(rows.length, rows[0].length, registry);

    rows.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value === null) return;
            if (value === "B") {
                board.createSpecialTile("bomb", { x, y });
            } else {
                board.createNormalTile({ x, y }, value);
            }
        });
    });
    return board;
}

export function tilePositions(event) {
    return event.tiles
        .map(tile => `${tile.position.x},${tile.position.y}`)
        .sort();
}
