import { ActivationTrigger } from "./Tile.js";

export default class ResolutionEngine {
    constructor({ board, matchAnalyzer, specialTileRegistry, maxCascades = 100 }) {
        this.board = board;
        this.matchAnalyzer = matchAnalyzer;
        this.specialTileRegistry = specialTileRegistry;
        this.maxCascades = maxCascades;
    }

    dispatchSwap(positionA, positionB, context = {}) {
        const fromA = { ...positionA };
        const fromB = { ...positionB };
        const tileA = this.board.get(fromA);
        const tileB = this.board.get(fromB);
        const blockedColumns = context.blockedColumns ?? new Set();

        if (
            !tileA ||
            !tileB ||
            blockedColumns.has(fromA.x) ||
            blockedColumns.has(fromB.x) ||
            !this.board.areAdjacent(fromA, fromB)
        ) {
            return { accepted: false, events: [] };
        }

        this.board.swap(fromA, fromB);
        const events = [{
            type: "swap",
            moves: [
                { tileId: tileA.id, from: fromA, to: { ...tileA.position } },
                { tileId: tileB.id, from: fromB, to: { ...tileB.position } }
            ]
        }];
        const actionContext = {
            ...context,
            trigger: ActivationTrigger.SWAP,
            blockedColumns,
            swap: {
                tileAId: tileA.id,
                tileBId: tileB.id,
                fromA,
                fromB,
                toA: { ...tileA.position },
                toB: { ...tileB.position }
            },
            cascadeDepth: 0
        };

        const comboPlan = this.specialTileRegistry.evaluateCombo(
            tileA,
            tileB,
            { ...actionContext, trigger: ActivationTrigger.COMBO }
        );
        const directActivations = comboPlan
            ? [{ tile: null, plan: comboPlan, trigger: ActivationTrigger.COMBO }]
            : this.getDirectSwapActivations(tileA, tileB, actionContext);

        if (directActivations.length > 0) {
            events.push(...this.resolveActivationPlans(directActivations, actionContext));
            return { accepted: true, events };
        }

        const analysis = this.matchAnalyzer.analyze(this.board, {
            blockedColumns
        });
        if (analysis.clusters.length > 0) {
            events.push(...this.resolveMatchCascades(analysis, actionContext));
            return { accepted: true, events };
        }

        const revertFromA = { ...tileA.position };
        const revertFromB = { ...tileB.position };
        this.board.swap(revertFromA, revertFromB);
        events.push({
            type: "revert",
            moves: [
                { tileId: tileA.id, from: revertFromA, to: { ...tileA.position } },
                { tileId: tileB.id, from: revertFromB, to: { ...tileB.position } }
            ]
        });
        return { accepted: false, events };
    }

    dispatchTap(position, actionContext = {}) {
        const tile = this.board.get(position);
        const blockedColumns = actionContext.blockedColumns ?? new Set();
        if (!tile || blockedColumns.has(position.x)) {
            return { accepted: false, events: [] };
        }

        const context = {
            ...actionContext,
            trigger: ActivationTrigger.TAP,
            blockedColumns,
            position: { ...position },
            cascadeDepth: 0
        };
        const plan = tile.getActivationPlan(context, this.board);
        if (!plan) return { accepted: false, events: [] };

        return {
            accepted: true,
            events: this.resolveActivationPlans([
                { tile, plan, trigger: ActivationTrigger.TAP }
            ], context)
        };
    }

    dispatchGeneric(plans, context = {}) {
        const actionContext = {
            ...context,
            trigger: context.trigger ?? ActivationTrigger.GENERIC,
            cascadeDepth: context.cascadeDepth ?? 0
        };
        return {
            accepted: plans.length > 0,
            events: this.resolveActivationPlans(
                plans.map(plan => ({
                    tile: null,
                    plan,
                    trigger: actionContext.trigger
                })),
                actionContext
            )
        };
    }

    resolveCurrentMatches(context = {}) {
        const actionContext = {
            ...context,
            trigger: context.trigger ?? "board-check",
            cascadeDepth: context.cascadeDepth ?? 0
        };
        return this.resolveMatchCascades(
            this.matchAnalyzer.analyze(this.board, {
                blockedColumns: actionContext.blockedColumns
            }),
            actionContext
        );
    }

    resolveActivationPlans(activations, context) {
        const events = this.executeWave({
            initialTiles: [],
            seedActivations: activations,
            spawnCandidates: [],
            context
        });
        const nextAnalysis = this.matchAnalyzer.analyze(this.board, {
            blockedColumns: context.blockedColumns
        });
        if (nextAnalysis.clusters.length > 0) {
            events.push(...this.resolveMatchCascades(nextAnalysis, {
                ...context,
                trigger: "cascade",
                cascadeDepth: (context.cascadeDepth ?? 0) + 1
            }));
        }
        return events;
    }

    resolveMatchCascades(initialAnalysis, context) {
        const events = [];
        let analysis = initialAnalysis;
        let cascadeDepth = context.cascadeDepth ?? 0;
        let cascadeCount = 0;

        while (analysis.clusters.length > 0) {
            if (cascadeCount++ >= this.maxCascades) {
                throw new Error("Match resolution exceeded the cascade safety limit.");
            }

            const matchContext = {
                ...context,
                trigger: cascadeDepth === 0 ? context.trigger : "cascade",
                cascadeDepth,
                analysis
            };
            const initialTiles = new Map();
            const spawnCandidates = [];

            analysis.clusters.forEach(cluster => {
                cluster.tiles.forEach(tile => initialTiles.set(tile.id, tile));
                const candidate = this.specialTileRegistry.evaluateCreation(
                    cluster,
                    matchContext
                );
                if (candidate) spawnCandidates.push(candidate);
            });

            events.push(...this.executeWave({
                initialTiles: Array.from(initialTiles.values()),
                seedActivations: [],
                spawnCandidates,
                context: matchContext
            }));

            cascadeDepth++;
            analysis = this.matchAnalyzer.analyze(this.board, {
                blockedColumns: context.blockedColumns
            });
        }

        return events;
    }

    executeWave({
        initialTiles,
        seedActivations,
        spawnCandidates,
        context
    }) {
        const clearTiles = new Map();
        const activationQueue = [];
        const queuedIds = new Set();
        const activatedIds = new Set();
        const activationEvents = [];
        const effects = [];

        const addClearTile = (tile, trigger) => {
            if (!tile) return;
            clearTiles.set(tile.id, tile);
            if (
                tile.isSpecial &&
                !queuedIds.has(tile.id) &&
                !activatedIds.has(tile.id)
            ) {
                activationQueue.push({ tile, trigger });
                queuedIds.add(tile.id);
            }
        };

        const addPlan = (tile, plan, trigger) => {
            if (!plan) return;
            if (plan.sourceTileId) activatedIds.add(plan.sourceTileId);
            activationEvents.push({
                tileId: plan.sourceTileId ?? tile?.id ?? null,
                trigger
            });
            effects.push(...(plan.effects ?? []));
            (plan.targets ?? []).forEach(position => {
                addClearTile(this.board.get(position), ActivationTrigger.SPECIAL_CLEAR);
            });
        };

        initialTiles.forEach(tile => {
            addClearTile(tile, ActivationTrigger.MATCH_CLEAR);
        });
        seedActivations.forEach(({ tile, plan, trigger }) => {
            addPlan(tile, plan, trigger);
        });

        while (activationQueue.length > 0) {
            const { tile, trigger } = activationQueue.shift();
            queuedIds.delete(tile.id);
            if (activatedIds.has(tile.id)) continue;

            activatedIds.add(tile.id);
            const plan = tile.getActivationPlan({
                ...context,
                trigger
            }, this.board);
            addPlan(tile, plan, trigger);
        }

        const events = [];
        if (activationEvents.length > 0) {
            events.push({ type: "activate", activations: activationEvents });
        }
        if (effects.length > 0) {
            events.push({ type: "effects", effects });
        }

        const removedTiles = Array.from(clearTiles.values());
        if (removedTiles.length === 0) return events;

        const affectedColumns = new Set(
            removedTiles.map(tile => tile.position.x)
        );
        events.push({
            type: "clear",
            tiles: removedTiles.map(tile => tile.snapshot())
        });
        this.board.removeTiles(removedTiles);

        const spawned = [];
        spawnCandidates.forEach(candidate => {
            if (!this.board.get(candidate.position)) {
                const tile = this.board.createSpecialTile(
                    candidate.type,
                    candidate.position,
                    candidate.options
                );
                spawned.push(tile.snapshot());
            }
        });
        if (spawned.length > 0) {
            events.push({ type: "spawn-special", tiles: spawned });
        }

        const moves = this.board.collapseColumns(affectedColumns);
        if (moves.length > 0) {
            events.push({ type: "drop", moves });
        }

        const added = this.board.refillColumns(affectedColumns);
        if (added.length > 0) {
            events.push({ type: "refill", tiles: added });
        }
        return events;
    }

    getDirectSwapActivations(tileA, tileB, context) {
        const activations = [];
        const planA = tileA.getActivationPlan({
            ...context,
            otherTile: tileB
        }, this.board);
        const planB = tileB.getActivationPlan({
            ...context,
            otherTile: tileA
        }, this.board);

        if (planA) {
            activations.push({
                tile: tileA,
                plan: planA,
                trigger: ActivationTrigger.SWAP
            });
        }
        if (planB) {
            activations.push({
                tile: tileB,
                plan: planB,
                trigger: ActivationTrigger.SWAP
            });
        }
        return activations;
    }
}
