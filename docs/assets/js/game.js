import Scene1 from "./Scene1.js";
import ExplosionPipeline from "./pipelines/ExplosionPipeline.js";
import WavePipeline from "./pipelines/WavePipeline.js";

const config = {
    type: Phaser.AUTO,
    width: "100%",
    height: "100%",
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER
    },
    pipeline: { 
        "WavePipeline": WavePipeline,
        "ExplosionPipeline": ExplosionPipeline
    },
    scene: [Scene1]
};

const game = new Phaser.Game(config);

// Android Chrome specific fix for orientation/resize issues
// This avoids regressions on iOS (iPad) which handles resizing natively
if (game.device.os.android) {
    window.addEventListener("resize", () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
    });
}
