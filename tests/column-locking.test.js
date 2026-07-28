import assert from "node:assert/strict";
import test from "node:test";
import { collectEventColumns } from "../docs/assets/js/model/BoardEventColumns.js";
import ColumnLockManager from "../docs/assets/js/model/ColumnLockManager.js";
import MatchAnalyzer from "../docs/assets/js/model/MatchAnalyzer.js";
import ResolutionEngine from "../docs/assets/js/model/ResolutionEngine.js";
import { createBoardFromRows, createRegistry } from "./helpers.js";

test("column locks are reference counted", () => {
    const locks = new ColumnLockManager();
    locks.lock(new Set([1, 2]));
    locks.lock(new Set([2, 3]));

    locks.unlock(new Set([1, 2]));

    assert.equal(locks.isLocked(1), false);
    assert.equal(locks.isLocked(2), true);
    assert.equal(locks.isLocked(3), true);
    assert.deepEqual(Array.from(locks.snapshot()).sort(), [2, 3]);
});

test("event columns include movement, removal, refill, and effect reach", () => {
    const columns = collectEventColumns([
        {
            type: "swap",
            moves: [{
                tileId: "a",
                from: { x: 0, y: 0 },
                to: { x: 1, y: 0 }
            }]
        },
        {
            type: "clear",
            tiles: [{ id: "b", position: { x: 3, y: 2 } }]
        },
        {
            type: "refill",
            tiles: [{
                tile: { id: "c", position: { x: 4, y: 0 } },
                entryIndex: 0
            }]
        },
        {
            type: "effects",
            effects: [{
                type: "test",
                origin: { x: 5, y: 1 },
                affectedTiles: [{
                    tileId: "d",
                    position: { x: 6, y: 1 }
                }]
            }]
        }
    ]);

    assert.deepEqual(Array.from(columns).sort((a, b) => a - b), [
        0, 1, 3, 4, 5, 6
    ]);
});

test("match analysis treats locked columns as hard boundaries", () => {
    const board = createBoardFromRows([[2, 2, 2, 2]]);
    const analysis = new MatchAnalyzer().analyze(board, {
        blockedColumns: new Set([1])
    });

    assert.equal(analysis.clusters.length, 0);
});

test("resolution ignores matches in locked columns but resolves free columns", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [0, 1, 2],
        [0, 3, 2],
        [0, 4, 2]
    ], registry);
    const lockedIds = [0, 1, 2].map(y => board.get({ x: 0, y }).id);
    const engine = new ResolutionEngine({
        board,
        matchAnalyzer: new MatchAnalyzer(),
        specialTileRegistry: registry
    });

    const events = engine.resolveCurrentMatches({
        trigger: "test",
        blockedColumns: new Set([0])
    });
    const clearedColumns = new Set(
        events
            .filter(event => event.type === "clear")
            .flatMap(event => event.tiles.map(tile => tile.position.x))
    );

    assert.deepEqual(Array.from(clearedColumns), [2]);
    assert.deepEqual(
        [0, 1, 2].map(y => board.get({ x: 0, y }).id),
        lockedIds
    );
});

test("swaps cannot enter a locked column", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [0, 1, 2],
        [2, 0, 1],
        [1, 2, 0]
    ], registry);
    const engine = new ResolutionEngine({
        board,
        matchAnalyzer: new MatchAnalyzer(),
        specialTileRegistry: registry
    });

    const result = engine.dispatchSwap(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { blockedColumns: new Set([1]) }
    );

    assert.equal(result.accepted, false);
    assert.deepEqual(result.events, []);
});
