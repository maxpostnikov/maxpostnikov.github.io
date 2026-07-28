import assert from "node:assert/strict";
import test from "node:test";
import MatchAnalyzer from "../docs/assets/js/model/MatchAnalyzer.js";
import { createBoardFromRows } from "./helpers.js";

test("returns oriented runs and combines intersections into one cluster", () => {
    const board = createBoardFromRows([
        [0, 1, 2, 3, 4],
        [1, 2, 0, 4, 5],
        [2, 0, 0, 0, 1],
        [3, 4, 0, 1, 2],
        [4, 5, 1, 2, 3]
    ]);

    const analysis = new MatchAnalyzer().analyze(board);

    assert.equal(analysis.runs.length, 2);
    assert.deepEqual(
        analysis.runs.map(run => run.orientation),
        ["horizontal", "vertical"]
    );
    assert.equal(analysis.clusters.length, 1);
    assert.equal(analysis.clusters[0].tiles.length, 5);
});

test("preserves bomb wildcard matching", () => {
    const board = createBoardFromRows([[2, 2, "B"]]);
    const analysis = new MatchAnalyzer().analyze(board);

    assert.equal(analysis.runs.length, 1);
    assert.equal(analysis.runs[0].matchKey, 2);
    assert.equal(analysis.runs[0].length, 3);
});

test("empty cells break a possible run", () => {
    const board = createBoardFromRows([[2, null, 2, 2]]);
    const analysis = new MatchAnalyzer().analyze(board);

    assert.equal(analysis.runs.length, 0);
    assert.equal(analysis.clusters.length, 0);
});
