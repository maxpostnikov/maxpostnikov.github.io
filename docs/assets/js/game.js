import Scene1 from "./Scene1.js";
import WavePipeline from "./WavePipeline.js";
import ExplosionPipeline from "./ExplosionPipeline.js";

const config = {
    type: Phaser.AUTO,
    width: '100%',
    height: '100%',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER
    },
    pipeline: { 
        'WavePipeline': WavePipeline,
        'ExplosionPipeline': ExplosionPipeline
    },
    scene: [Scene1]
};

const game = new Phaser.Game(config);
