/** Renders logical board events with Phaser sprites and tweens. */
export default class PhaserBoardView {
    constructor({
        scene,
        board,
        effectRegistry,
        tileWidth,
        tileHeight,
        tileScale
    }) {
        this.scene = scene;
        this.board = board;
        this.effectRegistry = effectRegistry;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.tileScale = tileScale;
        this.group = scene.add.group();
        this.sprites = new Map();
        this.selectedTileId = null;
        this.wiggleTween = null;
    }

    createInitialTiles() {
        this.board.getAllTiles().forEach(tile => {
            this.createSprite(tile.snapshot());
        });
    }

    createSprite(tile, { scale = this.tileScale } = {}) {
        const pixel = this.positionToPixel(tile.position);
        const sprite = this.scene.add.sprite(
            pixel.x,
            pixel.y,
            tile.appearance.texture,
            tile.appearance.frame
        );
        sprite.setScale(scale);
        sprite.setInteractive();
        sprite.tileId = tile.id;
        this.group.add(sprite);
        this.sprites.set(tile.id, sprite);
        return sprite;
    }

    getSprite(tileId) {
        return this.sprites.get(tileId) ?? null;
    }

    getTileId(sprite) {
        return this.group.contains(sprite) ? sprite.tileId : null;
    }

    positionToPixel({ x, y }) {
        return {
            x: x * this.tileWidth + this.tileWidth / 2,
            y: y * this.tileHeight + this.tileHeight / 2
        };
    }

    async playEvents(events) {
        for (const event of events) {
            await this.playEvent(event);
        }
    }

    async playEvent(event) {
        switch (event.type) {
        case "swap":
        case "drop":
            await this.moveSprites(event.moves, event.type === "swap" ? 200 : 400);
            break;
        case "revert":
            await this.playRevert(event.moves);
            break;
        case "activate":
            break;
        case "effects":
            await this.effectRegistry.play(event.effects, this, this.scene);
            break;
        case "clear":
            await this.clearTiles(event.tiles);
            break;
        case "spawn-special":
            await this.spawnSpecialTiles(event.tiles);
            break;
        case "refill":
            await this.refillTiles(event.tiles);
            break;
        default:
            throw new Error(`Unknown board event "${event.type}".`);
        }
    }

    async moveSprites(moves, duration) {
        await Promise.all(moves.map(move => {
            const sprite = this.getSprite(move.tileId);
            if (!sprite) return Promise.resolve();
            const pixel = this.positionToPixel(move.to);
            return this.tween({
                targets: sprite,
                x: pixel.x,
                y: pixel.y,
                duration,
                ease: duration === 400 ? "Bounce.easeOut" : "Linear"
            });
        }));
    }

    async playRevert(moves) {
        const sprites = moves
            .map(move => this.getSprite(move.tileId))
            .filter(Boolean);

        if (sprites.length > 0) {
            await this.tween({
                targets: sprites,
                x: "+=4",
                yoyo: true,
                repeat: 2,
                duration: 50
            });
        }
        await this.moveSprites(moves, 200);
    }

    async clearTiles(tiles) {
        if (tiles.some(tile => tile.id === this.selectedTileId)) {
            this.clearSelection();
        }
        await Promise.all(tiles.map(tile => {
            const sprite = this.getSprite(tile.id);
            if (!sprite) return Promise.resolve();
            return this.tween({
                targets: sprite,
                scale: 0,
                duration: 200
            });
        }));

        tiles.forEach(tile => this.destroySprite(tile.id));
    }

    async spawnSpecialTiles(tiles) {
        await Promise.all(tiles.map(tile => {
            const sprite = this.createSprite(tile, { scale: 0 });
            return this.tween({
                targets: sprite,
                scale: this.tileScale,
                duration: 400,
                ease: "Back.out"
            });
        }));
    }

    async refillTiles(entries) {
        await Promise.all(entries.map(entry => {
            const sprite = this.createSprite(entry.tile);
            const target = this.positionToPixel(entry.tile.position);
            sprite.y = -this.tileHeight * (entry.entryIndex + 1);
            return this.tween({
                targets: sprite,
                y: target.y,
                duration: 400,
                ease: "Bounce.easeOut"
            });
        }));
    }

    async playResize({ removed, moves, added }) {
        this.clearSelection();
        removed.forEach(tile => this.destroySprite(tile.id));
        await this.moveSprites(moves, 400);
        await this.refillTiles(added);
    }

    select(tileId) {
        this.clearSelection();
        const sprite = this.getSprite(tileId);
        if (!sprite) return;

        this.selectedTileId = tileId;
        sprite.setScale(this.tileScale * 1.1);
        this.wiggleTween = this.scene.tweens.add({
            targets: sprite,
            angle: { from: -5, to: 5 },
            duration: 200,
            yoyo: true,
            repeat: -1
        });
    }

    clearSelection() {
        if (this.wiggleTween) {
            this.wiggleTween.stop();
            this.wiggleTween = null;
        }
        if (this.selectedTileId) {
            const sprite = this.getSprite(this.selectedTileId);
            if (sprite) {
                sprite.angle = 0;
                sprite.setScale(this.tileScale);
            }
        }
        this.selectedTileId = null;
    }

    destroySprite(tileId) {
        const sprite = this.getSprite(tileId);
        if (!sprite) return;
        sprite.destroy();
        this.sprites.delete(tileId);
    }

    tween(config) {
        return new Promise(resolve => {
            this.scene.tweens.add({
                ...config,
                onComplete: resolve
            });
        });
    }
}
