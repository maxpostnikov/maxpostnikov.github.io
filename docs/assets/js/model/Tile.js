export const ActivationTrigger = Object.freeze({
    MATCH_CLEAR: "match-clear",
    SPECIAL_CLEAR: "special-clear",
    SWAP: "swap",
    TAP: "tap",
    COMBO: "combo",
    GENERIC: "generic"
});

export default class Tile {
    constructor({
        id,
        position,
        type = "normal",
        matchKey = null,
        wildcard = false,
        texture = "gems",
        frame = matchKey
    }) {
        this.id = id;
        this.position = { ...position };
        this.type = type;
        this.matchKey = matchKey;
        this.wildcard = wildcard;
        this.texture = texture;
        this.frame = frame;
    }

    get isSpecial() {
        return false;
    }

    getActivationPlan() {
        return null;
    }

    snapshot() {
        return {
            id: this.id,
            type: this.type,
            matchKey: this.matchKey,
            wildcard: this.wildcard,
            position: { ...this.position },
            appearance: {
                texture: this.texture,
                frame: this.frame
            }
        };
    }
}

export class SpecialTile extends Tile {
    get isSpecial() {
        return true;
    }
}
