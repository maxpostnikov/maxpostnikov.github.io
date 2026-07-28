import BombCreationRule from "./BombCreationRule.js";
import BombExplosionEffect from "./BombExplosionEffect.js";
import BombTile from "./BombTile.js";

export default function registerBombPlugin(specialTileRegistry, effectRegistry) {
    specialTileRegistry.register({
        type: "bomb",
        TileClass: BombTile,
        creationRules: [new BombCreationRule()]
    });
    effectRegistry.register("bomb-explosion", new BombExplosionEffect());
}
