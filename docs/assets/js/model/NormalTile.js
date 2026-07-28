import Tile from "./Tile.js";

export default class NormalTile extends Tile {
    constructor({ id, position, matchKey }) {
        super({
            id,
            position,
            type: "normal",
            matchKey,
            frame: matchKey
        });
    }
}
