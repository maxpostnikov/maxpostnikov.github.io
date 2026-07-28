import assert from "node:assert/strict";
import test from "node:test";
import EffectRegistry from "../docs/assets/js/effects/EffectRegistry.js";

test("groups generic effect events by type and awaits each player", async () => {
    const calls = [];
    const registry = new EffectRegistry();
    registry.register("spark", {
        play: async (events, boardView, scene) => {
            calls.push({ events, boardView, scene });
        }
    });
    const boardView = { name: "view" };
    const scene = { name: "scene" };

    await registry.play([
        { type: "spark", source: "tile" },
        { type: "spark", source: "inventory-booster" }
    ], boardView, scene);

    assert.equal(calls.length, 1);
    assert.deepEqual(
        calls[0].events.map(event => event.source),
        ["tile", "inventory-booster"]
    );
    assert.equal(calls[0].boardView, boardView);
    assert.equal(calls[0].scene, scene);
});
