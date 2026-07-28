import assert from "node:assert/strict";
import test from "node:test";
import MatchAnalyzer from "../docs/assets/js/model/MatchAnalyzer.js";
import { SpecialTile } from "../docs/assets/js/model/Tile.js";
import SpecialTileRegistry from "../docs/assets/js/model/SpecialTileRegistry.js";
import { createBoardFromRows, createRegistry } from "./helpers.js";

class TestSpecialTile extends SpecialTile {
    constructor({ id, position, type = "test" }) {
        super({ id, position, type, frame: 0 });
    }
}

test("bomb creation requires four tiles and uses the first qualifying run", () => {
    const registry = createRegistry();
    const analyzer = new MatchAnalyzer();
    const three = analyzer.analyze(createBoardFromRows([[1, 1, 1]], registry));
    const four = analyzer.analyze(createBoardFromRows([[1, 1, 1, 1]], registry));

    assert.equal(registry.evaluateCreation(three.clusters[0], {}), null);
    assert.deepEqual(
        registry.evaluateCreation(four.clusters[0], {}),
        { type: "bomb", position: { x: 0, y: 0 } }
    );
});

test("a crossing shape produces one deterministic creation candidate", () => {
    const registry = createRegistry();
    const board = createBoardFromRows([
        [1, 2, 0, 3, 4],
        [2, 3, 0, 4, 5],
        [0, 0, 0, 0, 1],
        [3, 4, 0, 5, 2],
        [4, 5, 1, 2, 3]
    ], registry);
    const analysis = new MatchAnalyzer().analyze(board);

    assert.equal(analysis.clusters.length, 1);
    assert.deepEqual(
        registry.evaluateCreation(analysis.clusters[0], {}),
        { type: "bomb", position: { x: 0, y: 2 } }
    );
});

test("creation rule priority wins with registration order as the tie-breaker", () => {
    const registry = new SpecialTileRegistry();
    const cluster = { id: "cluster" };
    const makeRule = (priority, marker) => ({
        priority,
        evaluate: () => ({ position: { x: marker, y: 0 } })
    });

    registry.register({
        type: "low",
        TileClass: TestSpecialTile,
        creationRules: [makeRule(10, 1)]
    });
    registry.register({
        type: "high-first",
        TileClass: TestSpecialTile,
        creationRules: [makeRule(20, 2)]
    });
    registry.register({
        type: "high-second",
        TileClass: TestSpecialTile,
        creationRules: [makeRule(20, 3)]
    });

    assert.deepEqual(registry.evaluateCreation(cluster, {}), {
        type: "high-first",
        position: { x: 2, y: 0 }
    });
});
