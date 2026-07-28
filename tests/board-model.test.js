import assert from "node:assert/strict";
import test from "node:test";
import { createBoardFromRows, createRegistry } from "./helpers.js";

test("resize keeps logical tiles, applies gravity, and fills new cells", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [0, 1],
        [2, 3]
    ], registry);
    const originalIds = new Set(board.getAllTiles().map(tile => tile.id));

    const changes = board.resize(3, 3);

    assert.equal(changes.removed.length, 0);
    assert.equal(changes.moves.length, 4);
    assert.equal(changes.added.length, 5);
    assert.equal(board.getAllTiles().length, 9);
    originalIds.forEach(id => {
        assert.ok(board.getById(id));
        assert.ok(board.getById(id).position.y >= 1);
    });
});

test("shrinking a board removes out-of-bounds logical tiles", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [0, 1, 2],
        [2, 3, 4],
        [4, 5, 0]
    ], registry);

    const changes = board.resize(2, 2);

    assert.equal(changes.removed.length, 5);
    assert.equal(board.getAllTiles().length, 4);
    assert.equal(board.rows, 2);
    assert.equal(board.cols, 2);
});
