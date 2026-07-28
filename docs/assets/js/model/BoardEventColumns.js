function addPosition(columns, position) {
    if (position && Number.isInteger(position.x)) {
        columns.add(position.x);
    }
}

export function collectEventColumns(events) {
    const columns = new Set();

    events.forEach(event => {
        (event.moves ?? []).forEach(move => {
            addPosition(columns, move.from);
            addPosition(columns, move.to);
        });

        (event.tiles ?? []).forEach(entry => {
            addPosition(columns, entry.position ?? entry.tile?.position);
        });

        (event.effects ?? []).forEach(effect => {
            addPosition(columns, effect.origin);
            (effect.affectedTiles ?? []).forEach(tile => {
                addPosition(columns, tile.position);
            });
        });
    });

    return columns;
}
