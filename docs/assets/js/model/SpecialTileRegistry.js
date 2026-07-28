export default class SpecialTileRegistry {
    constructor() {
        this.tileTypes = new Map();
        this.creationRules = [];
        this.comboRules = [];
        this.registrationOrder = 0;
    }

    register({ type, TileClass, creationRules = [], comboRules = [] }) {
        if (this.tileTypes.has(type)) {
            throw new Error(`Special tile type "${type}" is already registered.`);
        }

        this.tileTypes.set(type, TileClass);

        creationRules.forEach(rule => {
            this.creationRules.push({
                type,
                rule,
                priority: rule.priority ?? 0,
                order: this.registrationOrder++
            });
        });

        comboRules.forEach(rule => {
            this.comboRules.push({
                rule,
                priority: rule.priority ?? 0,
                order: this.registrationOrder++
            });
        });

        this.creationRules.sort(SpecialTileRegistry.compareEntries);
        this.comboRules.sort(SpecialTileRegistry.compareEntries);
    }

    create(type, options) {
        const TileClass = this.tileTypes.get(type);
        if (!TileClass) {
            throw new Error(`Unknown special tile type "${type}".`);
        }
        return new TileClass(options);
    }

    evaluateCreation(matchCluster, context) {
        for (const entry of this.creationRules) {
            const candidate = entry.rule.evaluate(matchCluster, context);
            if (candidate) {
                return {
                    ...candidate,
                    type: candidate.type ?? entry.type
                };
            }
        }
        return null;
    }

    evaluateCombo(tileA, tileB, context) {
        for (const entry of this.comboRules) {
            const plan = entry.rule.evaluate(tileA, tileB, context);
            if (plan) return plan;
        }
        return null;
    }

    static compareEntries(left, right) {
        if (left.priority !== right.priority) {
            return right.priority - left.priority;
        }
        return left.order - right.order;
    }
}
