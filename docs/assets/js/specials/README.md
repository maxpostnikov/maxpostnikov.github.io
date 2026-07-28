# Adding a Special Tile

A special-tile plugin connects pure gameplay logic to optional Phaser effects. It
must not add type-specific branches to `BoardModel`, `ResolutionEngine`, or
`Scene1`.

1. Create a logical tile class extending `SpecialTile`.
   `getActivationPlan(context, board)` may react to `ActivationTrigger` values
   and returns `{ sourceTileId, targets, effects }` or `null`. Keep this class
   independent of Phaser.
2. Create one or more creation-rule classes. A rule exposes a numeric `priority`
   and `evaluate(matchCluster, context)`, returning `{ position, options? }` or
   `null`. The highest-priority matching rule wins for each connected cluster.
3. For pair-specific behavior, add combo rules with
   `evaluate(tileA, tileB, context)`.
4. If the activation emits visual effects, create an effect player implementing
   `async play(events, boardView, scene)`. Players receive same-type events as a
   batch so chained effects can be combined.
5. Export one registration function that registers the tile class and its rules
   with `SpecialTileRegistry`, then registers effect players with
   `EffectRegistry`. Call that function once from `Scene1.create()`.
6. Add all new runtime modules to `docs/sw.js` and increment its cache version.

`BombTile`, `BombCreationRule`, `BombExplosionEffect`, and
`registerBombPlugin` are the reference implementation.
