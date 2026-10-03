import assert from "node:assert/strict";
import test from "node:test";
import { configureCamera, getDisplayMetrics } from "../docs/assets/js/view/DisplayMetrics.js";

test("phone density increases render detail while retaining the logical board size", () => {
    const desktop = getDisplayMetrics(412, 915, 1);
    const phone = getDisplayMetrics(412, 915, 3);
    assert.deepEqual(phone, {
        width: 412, height: 915, renderWidth: 1236, renderHeight: 2745
    });
    assert.equal(Math.floor(phone.width / 80), Math.floor(desktop.width / 80));
    assert.equal(Math.floor(phone.height / 80), Math.floor(desktop.height / 80));
});

test("render buffers are integral and capped at the sprite's useful density", () => {
    assert.deepEqual(getDisplayMetrics(413, 917, 1.25), {
        width: 413, height: 917, renderWidth: 516, renderHeight: 1146
    });
    assert.deepEqual(getDisplayMetrics(915, 412, 4), getDisplayMetrics(915, 412, 3));
    assert.deepEqual(getDisplayMetrics(412, 915, 0.8), getDisplayMetrics(412, 915, 1));
});

test("camera maps every 80px cell and touch position identically at each density", () => {
    for (const density of [1, 1.25, 2, 3, 3.5]) {
        for (const [width, height] of [[412, 915], [915, 412]]) {
            const metrics = getDisplayMetrics(width, height, density);
            const camera = {
                setOrigin(x, y) { this.originX = x; this.originY = y; },
                setViewport(x, y, w, h) { this.width = w; this.height = h; },
                setZoom(x, y) { this.zoomX = x; this.zoomY = y; },
                setScroll(x, y) { this.scrollX = x; this.scrollY = y; }
            };
            configureCamera(camera, metrics);
            // Phaser zooms around the camera origin; CSS downsizes the buffer.
            const toScreen = (world, extent, origin, scroll, zoom, logicalExtent) => (
                extent * origin + (world - scroll - extent * origin) * zoom
            ) * logicalExtent / extent;
            for (const world of [0, 40, 80, 240]) {
                assert.ok(Math.abs(toScreen(world, camera.width, camera.originX,
                    camera.scrollX, camera.zoomX, width) - world) < 1e-9);
                assert.ok(Math.abs(toScreen(world, camera.height, camera.originY,
                    camera.scrollY, camera.zoomY, height) - world) < 1e-9);
            }
        }
    }
});
