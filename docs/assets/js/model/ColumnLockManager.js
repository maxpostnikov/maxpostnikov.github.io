export default class ColumnLockManager {
    constructor() {
        this.counts = new Map();
    }

    lock(columns) {
        columns.forEach(column => {
            this.counts.set(column, (this.counts.get(column) ?? 0) + 1);
        });
    }

    unlock(columns) {
        columns.forEach(column => {
            const nextCount = (this.counts.get(column) ?? 0) - 1;
            if (nextCount > 0) {
                this.counts.set(column, nextCount);
            } else {
                this.counts.delete(column);
            }
        });
    }

    isLocked(column) {
        return this.counts.has(column);
    }

    hasAny() {
        return this.counts.size > 0;
    }

    snapshot() {
        return new Set(this.counts.keys());
    }
}
