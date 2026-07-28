import assert from "node:assert/strict";
import test from "node:test";
import MatchAnalyzer from "../docs/assets/js/model/MatchAnalyzer.js";
import ResolutionEngine from "../docs/assets/js/model/ResolutionEngine.js";
import { ActivationTrigger, SpecialTile } from "../docs/assets/js/model/Tile.js";
import SpecialTileRegistry from "../docs/assets/js/model/SpecialTileRegistry.js";
import BombTile from "../docs/assets/js/specials/bomb/BombTile.js";
import {
    createBoardFromRows,
    createEmptyBoard,
    createRegistry,
    tilePositions
} from "./helpers.js";

function createEngine(board, registry, options = {}) {
    return new ResolutionEngine({
        board,
        matchAnalyzer: new MatchAnalyzer(),
        specialTileRegistry: registry,
        ...options
    });
}

test("bomb targets its 3x3 neighborhood and rejects direct triggers", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [0, 1, 2, 3, 4],
        [1, 2, 3, 4, 5],
        [2, 3, "B", 5, 0],
        [3, 4, 5, 0, 1],
        [4, 5, 0, 1, 2]
    ], registry);
    const bomb = board.get({ x: 2, y: 2 });
    const plan = bomb.getActivationPlan({
        trigger: ActivationTrigger.MATCH_CLEAR
    }, board);

    assert.equal(plan.targets.length, 8);
    assert.equal(plan.effects[0].affectedTiles.length, 24);
    assert.equal(bomb.getActivationPlan({
        trigger: ActivationTrigger.TAP
    }, board), null);
    assert.equal(bomb.getActivationPlan({
        trigger: ActivationTrigger.SWAP
    }, board), null);
});

test("corner bomb clips activation targets to the board", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        ["B", 1],
        [2, 3]
    ], registry);
    const bomb = board.get({ x: 0, y: 0 });
    const plan = bomb.getActivationPlan({
        trigger: ActivationTrigger.SPECIAL_CLEAR
    }, board);

    assert.deepEqual(plan.targets, [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
    ]);
});

test("chain reactions activate each bomb once and batch their effects", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [0, 1, 2, 3, 4],
        [1, 2, 3, 4, 5],
        [0, 0, "B", "B", 1],
        [3, 4, 5, 0, 1],
        [4, 5, 0, 1, 2]
    ], registry);
    const events = createEngine(board, registry).resolveCurrentMatches({
        trigger: "test"
    });
    const activate = events.find(event => event.type === "activate");
    const effects = events.find(event => event.type === "effects");
    const spawned = events.find(event => event.type === "spawn-special");

    assert.equal(new Set(
        activate.activations.map(activation => activation.tileId)
    ).size, 2);
    assert.equal(activate.activations.length, 2);
    assert.equal(effects.effects.length, 2);
    assert.equal(spawned.tiles.length, 1);
});

test("invalid swaps revert both model and presentation events", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [0, 1, 2],
        [2, 0, 1],
        [1, 2, 0]
    ], registry);
    const engine = createEngine(board, registry);
    const tileA = board.get({ x: 0, y: 0 });
    const tileB = board.get({ x: 1, y: 0 });

    const result = engine.dispatchSwap({ x: 0, y: 0 }, { x: 1, y: 0 });

    assert.equal(result.accepted, false);
    assert.deepEqual(result.events.map(event => event.type), ["swap", "revert"]);
    assert.equal(board.get({ x: 0, y: 0 }).id, tileA.id);
    assert.equal(board.get({ x: 1, y: 0 }).id, tileB.id);
});

test("resolution spawns a special before gravity and refill", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [1, 2, 3, 4],
        [0, 0, 0, 0],
        [2, 3, 4, 5],
        [3, 4, 5, 1]
    ], registry);
    const events = createEngine(board, registry).resolveCurrentMatches({
        trigger: "test"
    });
    const types = events.map(event => event.type);

    assert.ok(types.indexOf("clear") < types.indexOf("spawn-special"));
    assert.ok(types.indexOf("spawn-special") < types.indexOf("drop"));
    assert.ok(types.indexOf("drop") < types.indexOf("refill"));
});

test("generic tap and effect contracts work without Phaser", () => {
    class TapTile extends SpecialTile {
        constructor({ id, position }) {
            super({ id, position, type: "tap", frame: 0 });
        }

        getActivationPlan(context) {
            if (context.trigger !== ActivationTrigger.TAP) return null;
            return {
                sourceTileId: this.id,
                targets: [{ ...this.position }],
                effects: [{ type: "test-effect", marker: this.id }]
            };
        }
    }

    const registry = new SpecialTileRegistry();
    registry.register({ type: "tap", TileClass: TapTile });
    const board = createEmptyBoard(1, 1, registry);
    board.createSpecialTile("tap", { x: 0, y: 0 });
    const result = createEngine(board, registry).dispatchTap({ x: 0, y: 0 });

    assert.equal(result.accepted, true);
    assert.deepEqual(
        result.events.map(event => event.type).slice(0, 3),
        ["activate", "effects", "clear"]
    );
    assert.deepEqual(
        tilePositions(result.events.find(event => event.type === "clear")),
        ["0,0"]
    );
});

test("a special can opt into direct swap activation", () => {
    class SwapTile extends SpecialTile {
        constructor({ id, position }) {
            super({ id, position, type: "swap", frame: 0 });
        }

        getActivationPlan(context) {
            if (context.trigger !== ActivationTrigger.SWAP) return null;
            return {
                sourceTileId: this.id,
                targets: [{ ...this.position }],
                effects: []
            };
        }
    }

    const registry = new SpecialTileRegistry();
    registry.register({ type: "swap", TileClass: SwapTile });
    const board = createEmptyBoard(1, 2, registry);
    board.createSpecialTile("swap", { x: 0, y: 0 });
    board.createNormalTile({ x: 1, y: 0 }, 2);
    const result = createEngine(board, registry).dispatchSwap(
        { x: 0, y: 0 },
        { x: 1, y: 0 }
    );

    assert.equal(result.accepted, true);
    assert.deepEqual(
        result.events.map(event => event.type).slice(0, 3),
        ["swap", "activate", "clear"]
    );
});

test("registered special-special combinations take priority over swap hooks", () => {
    class ComboTile extends SpecialTile {
        constructor({ id, position }) {
            super({ id, position, type: "combo", frame: 0 });
        }
    }

    const comboRule = {
        priority: 50,
        evaluate: (tileA, tileB) => ({
            sourceTileId: `${tileA.id}+${tileB.id}`,
            targets: [{ ...tileA.position }, { ...tileB.position }],
            effects: [{ type: "combo-test" }]
        })
    };
    const registry = new SpecialTileRegistry();
    registry.register({
        type: "combo",
        TileClass: ComboTile,
        comboRules: [comboRule]
    });
    const board = createEmptyBoard(1, 2, registry);
    board.createSpecialTile("combo", { x: 0, y: 0 });
    board.createSpecialTile("combo", { x: 1, y: 0 });
    const result = createEngine(board, registry).dispatchSwap(
        { x: 0, y: 0 },
        { x: 1, y: 0 }
    );

    assert.equal(result.accepted, true);
    assert.ok(result.events.some(event =>
        event.type === "effects" && event.effects[0].type === "combo-test"
    ));
    assert.equal(
        result.events.find(event => event.type === "clear").tiles.length,
        2
    );
});

test("generic actions reuse activation and effect event contracts", () => {
    const registry = new SpecialTileRegistry();
    const board = createEmptyBoard(1, 1, registry);
    board.createNormalTile({ x: 0, y: 0 }, 3);
    const result = createEngine(board, registry).dispatchGeneric([{
        targets: [{ x: 0, y: 0 }],
        effects: [{ type: "booster-effect", source: "inventory" }]
    }]);

    assert.equal(result.accepted, true);
    assert.ok(result.events.some(event =>
        event.type === "effects" &&
        event.effects[0].source === "inventory"
    ));
    assert.equal(
        result.events.find(event => event.type === "clear").tiles.length,
        1
    );
});

test("bomb tile remains a SpecialTile implementation", () => {
    const bomb = new BombTile({ id: "bomb", position: { x: 0, y: 0 } });
    assert.equal(bomb.isSpecial, true);
    assert.equal(bomb.wildcard, true);
});
