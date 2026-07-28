export default class EffectRegistry {
    constructor() {
        this.players = new Map();
    }

    register(type, player) {
        if (this.players.has(type)) {
            throw new Error(`Effect type "${type}" is already registered.`);
        }
        this.players.set(type, player);
    }

    async play(effectEvents, boardView, scene) {
        const eventsByType = new Map();

        effectEvents.forEach(event => {
            if (!eventsByType.has(event.type)) eventsByType.set(event.type, []);
            eventsByType.get(event.type).push(event);
        });

        await Promise.all(Array.from(eventsByType, async ([type, events]) => {
            const player = this.players.get(type);
            if (!player) {
                throw new Error(`No effect player is registered for "${type}".`);
            }
            await player.play(events, boardView, scene);
        }));
    }
}
