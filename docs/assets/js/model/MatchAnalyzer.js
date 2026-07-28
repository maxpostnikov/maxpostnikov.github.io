function positionKey({ x, y }) {
    return `${x},${y}`;
}

export default class MatchAnalyzer {
    analyze(board, { blockedColumns = new Set() } = {}) {
        const runs = [];
        let order = 0;

        for (let y = 0; y < board.rows; y++) {
            const line = [];
            for (let x = 0; x < board.cols; x++) {
                line.push(
                    blockedColumns.has(x) ? null : board.get({ x, y })
                );
            }
            this.findRunsInLine(line, "horizontal", runs, () => order++);
        }

        for (let x = 0; x < board.cols; x++) {
            if (blockedColumns.has(x)) continue;
            const line = [];
            for (let y = 0; y < board.rows; y++) {
                line.push(board.get({ x, y }));
            }
            this.findRunsInLine(line, "vertical", runs, () => order++);
        }

        return {
            runs,
            clusters: this.createClusters(runs)
        };
    }

    findRunsInLine(line, orientation, runs, nextOrder) {
        let index = 0;

        while (index < line.length) {
            const tiles = [];
            let matchKey = null;

            for (let cursor = index; cursor < line.length; cursor++) {
                const tile = line[cursor];
                if (!tile) break;

                if (tile.wildcard) {
                    tiles.push(tile);
                } else if (matchKey === null) {
                    matchKey = tile.matchKey;
                    tiles.push(tile);
                } else if (tile.matchKey === matchKey) {
                    tiles.push(tile);
                } else {
                    break;
                }
            }

            if (tiles.length >= 3) {
                runs.push({
                    orientation,
                    matchKey,
                    tiles,
                    positions: tiles.map(tile => ({ ...tile.position })),
                    length: tiles.length,
                    order: nextOrder()
                });
                index += tiles.length;
            } else {
                index++;
            }
        }
    }

    createClusters(runs) {
        const clusters = [];

        runs.forEach(run => {
            const runKeys = new Set(run.positions.map(positionKey));
            const connected = clusters.filter(cluster =>
                cluster.positionKeys.some(key => runKeys.has(key))
            );

            if (connected.length === 0) {
                clusters.push({
                    runs: [run],
                    positionKeys: Array.from(runKeys)
                });
                return;
            }

            const target = connected[0];
            target.runs.push(run);
            runKeys.forEach(key => {
                if (!target.positionKeys.includes(key)) target.positionKeys.push(key);
            });

            connected.slice(1).forEach(cluster => {
                target.runs.push(...cluster.runs);
                cluster.positionKeys.forEach(key => {
                    if (!target.positionKeys.includes(key)) target.positionKeys.push(key);
                });
                clusters.splice(clusters.indexOf(cluster), 1);
            });
        });

        return clusters.map((cluster, index) => {
            const tilesById = new Map();
            cluster.runs.forEach(run => {
                run.tiles.forEach(tile => tilesById.set(tile.id, tile));
            });
            const sortedRuns = [...cluster.runs].sort((a, b) => a.order - b.order);
            return {
                id: `match-${index}`,
                runs: sortedRuns,
                tiles: Array.from(tilesById.values()),
                positions: Array.from(tilesById.values(), tile => ({ ...tile.position }))
            };
        });
    }
}
