import { ActivationTrigger, SpecialTile } from "../../model/Tile.js";

export default class BombTile extends SpecialTile {
    constructor({ id, position }) {
        super({
            id,
            position,
            type: "bomb",
            wildcard: true,
            frame: 6
        });
    }

    getActivationPlan(context, board) {
        if (
            context.trigger !== ActivationTrigger.MATCH_CLEAR &&
            context.trigger !== ActivationTrigger.SPECIAL_CLEAR
        ) {
            return null;
        }

        const targets = [];
        const affectedTiles = [];
        const origin = { ...this.position };

        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                if (dx === 0 && dy === 0) continue;

                const position = {
                    x: origin.x + dx,
                    y: origin.y + dy
                };
                const tile = board.get(position);
                if (!tile) continue;

                const distance = Math.max(Math.abs(dx), Math.abs(dy));
                if (distance <= 4) {
                    affectedTiles.push({
                        tileId: tile.id,
                        position: { ...tile.position }
                    });
                }
                if (distance <= 1) {
                    targets.push(position);
                }
            }
        }

        return {
            sourceTileId: this.id,
            targets,
            effects: [{
                type: "bomb-explosion",
                sourceTileId: this.id,
                origin,
                affectedTiles
            }]
        };
    }
}
