/** Plays batched bomb displacement and camera-shader effects. */
export default class BombExplosionEffect {
    async play(events, boardView, scene) {
        const origins = events.map(event => ({ ...event.origin }));
        const affectedTiles = new Map();

        events.forEach(event => {
            event.affectedTiles.forEach(tile => {
                affectedTiles.set(tile.tileId, tile);
            });
        });

        this.startShader(origins[0], boardView, scene);

        const tweens = [];
        affectedTiles.forEach(tile => {
            const sprite = boardView.getSprite(tile.tileId);
            if (!sprite) return;

            const offset = this.calculateOffset(tile.position, origins);
            if (Math.abs(offset.x) <= 0.1 && Math.abs(offset.y) <= 0.1) return;

            tweens.push(boardView.tween({
                targets: sprite,
                x: sprite.x + offset.x,
                y: sprite.y + offset.y,
                duration: 100,
                yoyo: true,
                ease: "Cubic.easeOut"
            }));
        });

        await Promise.all(tweens);
    }

    calculateOffset(position, origins) {
        let totalX = 0;
        let totalY = 0;

        origins.forEach(origin => {
            const dx = position.x - origin.x;
            const dy = position.y - origin.y;
            const distance = Math.max(Math.abs(dx), Math.abs(dy));
            if (distance > 4 || distance === 0) return;

            const length = Math.sqrt(dx * dx + dy * dy);
            const force = Math.pow(2.5, 5 - distance) * 2;
            totalX += (dx / length) * force;
            totalY += (dy / length) * force;
        });

        return { x: totalX, y: totalY };
    }

    startShader(origin, boardView, scene) {
        if (!origin) return;
        const pipeline = scene.cameras.main.getPostPipeline("ExplosionPipeline");
        if (!pipeline) return;

        const center = boardView.positionToPixel(origin);
        pipeline.set2f("uCenter", center.x, center.y);
        pipeline.set1f("uActive", 1.0);

        if (scene.explosionShaderTween) {
            scene.explosionShaderTween.stop();
        }

        const shaderData = { time: 0.0 };
        scene.explosionShaderTween = scene.tweens.add({
            targets: shaderData,
            time: 1.0,
            duration: 600,
            onUpdate: () => {
                pipeline.set1f("uTime", shaderData.time);
            },
            onComplete: () => {
                pipeline.set1f("uActive", 0.0);
                scene.explosionShaderTween = null;
            }
        });
    }
}
