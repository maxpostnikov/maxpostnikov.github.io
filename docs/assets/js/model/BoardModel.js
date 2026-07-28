import NormalTile from "./NormalTile.js";

export default class BoardModel {
    constructor({
        rows,
        cols,
        specialTileRegistry,
        random = Math.random,
        normalMatchKeyCount = 6
    }) {
        this.rows = rows;
        this.cols = cols;
        this.specialTileRegistry = specialTileRegistry;
        this.random = random;
        this.normalMatchKeyCount = normalMatchKeyCount;
        this.nextId = 1;
        this.tilesById = new Map();
        this.grid = Array.from({ length: rows }, () => Array(cols).fill(null));

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                this.createNormalTile({ x, y });
            }
        }
    }

    isValid({ x, y }) {
        return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
    }

    get({ x, y }) {
        if (!this.isValid({ x, y })) return null;
        return this.grid[y][x];
    }

    getById(id) {
        return this.tilesById.get(id) ?? null;
    }

    getAllTiles() {
        return Array.from(this.tilesById.values());
    }

    positions() {
        const result = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                result.push({ x, y });
            }
        }
        return result;
    }

    createNormalTile(position, matchKey = this.randomMatchKey()) {
        const tile = new NormalTile({
            id: this.createId(),
            position,
            matchKey
        });
        this.place(tile, position);
        return tile;
    }

    createSpecialTile(type, position, options = {}) {
        const tile = this.specialTileRegistry.create(type, {
            ...options,
            id: this.createId(),
            position
        });
        this.place(tile, position);
        return tile;
    }

    place(tile, position) {
        if (!this.isValid(position)) {
            throw new Error(`Cannot place tile outside the board at ${position.x},${position.y}.`);
        }

        const existing = this.get(position);
        if (existing && existing.id !== tile.id) {
            throw new Error(`Board position ${position.x},${position.y} is already occupied.`);
        }

        tile.position = { ...position };
        this.grid[position.y][position.x] = tile;
        this.tilesById.set(tile.id, tile);
    }

    replaceWithSpecial(type, position, options = {}) {
        this.removeAt(position);
        return this.createSpecialTile(type, position, options);
    }

    removeAt(position) {
        const tile = this.get(position);
        if (!tile) return null;
        this.grid[position.y][position.x] = null;
        this.tilesById.delete(tile.id);
        return tile;
    }

    removeTiles(tiles) {
        const removed = [];
        tiles.forEach(tile => {
            const current = this.get(tile.position);
            if (current?.id === tile.id) {
                this.removeAt(tile.position);
                removed.push(tile);
            }
        });
        return removed;
    }

    swap(positionA, positionB) {
        const tileA = this.get(positionA);
        const tileB = this.get(positionB);
        if (!tileA || !tileB) return false;

        this.grid[positionA.y][positionA.x] = tileB;
        this.grid[positionB.y][positionB.x] = tileA;
        tileA.position = { ...positionB };
        tileB.position = { ...positionA };
        return true;
    }

    areAdjacent(positionA, positionB) {
        const dx = Math.abs(positionA.x - positionB.x);
        const dy = Math.abs(positionA.y - positionB.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    collapseColumns(columns) {
        const moves = [];

        Array.from(columns).sort((a, b) => a - b).forEach(x => {
            const tiles = [];
            for (let y = this.rows - 1; y >= 0; y--) {
                const tile = this.grid[y][x];
                if (tile) tiles.push(tile);
                this.grid[y][x] = null;
            }

            let targetY = this.rows - 1;
            tiles.forEach(tile => {
                const from = { ...tile.position };
                const to = { x, y: targetY-- };
                this.grid[to.y][to.x] = tile;
                tile.position = to;
                if (from.x !== to.x || from.y !== to.y) {
                    moves.push({ tileId: tile.id, from, to: { ...to } });
                }
            });
        });

        return moves;
    }

    refillColumns(columns) {
        const added = [];

        Array.from(columns).sort((a, b) => a - b).forEach(x => {
            let entryIndex = 0;
            for (let y = 0; y < this.rows; y++) {
                if (!this.grid[y][x]) {
                    const tile = this.createNormalTile({ x, y });
                    added.push({
                        tile: tile.snapshot(),
                        entryIndex: entryIndex++
                    });
                }
            }
        });

        return added;
    }

    resize(rows, cols) {
        if (rows === this.rows && cols === this.cols) {
            return { removed: [], moves: [], added: [] };
        }

        const oldGrid = this.grid;
        const oldRows = this.rows;
        const oldCols = this.cols;
        const removed = [];

        this.rows = rows;
        this.cols = cols;
        this.grid = Array.from({ length: rows }, () => Array(cols).fill(null));

        for (let y = 0; y < oldRows; y++) {
            for (let x = 0; x < oldCols; x++) {
                const tile = oldGrid[y][x];
                if (!tile) continue;
                if (x < cols && y < rows) {
                    this.grid[y][x] = tile;
                } else {
                    this.tilesById.delete(tile.id);
                    removed.push(tile.snapshot());
                }
            }
        }

        const columns = new Set(Array.from({ length: cols }, (_, index) => index));
        const moves = this.collapseColumns(columns);
        const added = this.refillColumns(columns);
        return { removed, moves, added };
    }

    randomMatchKey() {
        return Math.floor(this.random() * this.normalMatchKeyCount);
    }

    createId() {
        return `tile-${this.nextId++}`;
    }
}
