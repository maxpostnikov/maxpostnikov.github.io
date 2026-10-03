import Scene1 from "./Scene1.js";
import ExplosionPipeline from "./pipelines/ExplosionPipeline.js";
import WavePipeline from "./pipelines/WavePipeline.js";
import { getDisplayMetrics } from "./view/DisplayMetrics.js";

const readDisplayMetrics = () => getDisplayMetrics(
    window.innerWidth,
    window.innerHeight,
    window.devicePixelRatio
);
const displayMetrics = readDisplayMetrics();

const config = {
    type: Phaser.AUTO,
    width: displayMetrics.renderWidth,
    height: displayMetrics.renderHeight,
    pixelArt: false,
    antialias: true,
    scale: {
        // CSS controls the displayed size; Phaser owns the dense render buffer.
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.NO_CENTER
    },
    callbacks: {
        preBoot: game => {
            game.displayMetrics = displayMetrics;
        }
    },
    pipeline: { 
        "WavePipeline": WavePipeline,
        "ExplosionPipeline": ExplosionPipeline
    },
    scene: [Scene1]
};

const game = new Phaser.Game(config);

function resizeDisplay() {
    const metrics = readDisplayMetrics();
    game.displayMetrics = metrics;
    game.scale.resize(metrics.renderWidth, metrics.renderHeight);
}

window.addEventListener("resize", resizeDisplay);

// Moving between monitors or changing browser zoom can change density alone.
function watchPixelRatio() {
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener("change", () => {
        resizeDisplay();
        watchPixelRatio();
    }, { once: true });
}
watchPixelRatio();
