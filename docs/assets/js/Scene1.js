import EffectRegistry from "./effects/EffectRegistry.js";
import BoardModel from "./model/BoardModel.js";
import { collectEventColumns } from "./model/BoardEventColumns.js";
import ColumnLockManager from "./model/ColumnLockManager.js";
import MatchAnalyzer from "./model/MatchAnalyzer.js";
import ResolutionEngine from "./model/ResolutionEngine.js";
import SpecialTileRegistry from "./model/SpecialTileRegistry.js";
import registerBombPlugin from "./specials/bomb/registerBombPlugin.js";
import PhaserBoardView from "./view/PhaserBoardView.js";
import { configureCamera } from "./view/DisplayMetrics.js";

class Scene1 extends Phaser.Scene {
    constructor() {
        super("bootGame");
    }

    preload() {
        this.load.image("background", "assets/images/background.png");
        this.load.spritesheet("gems", "assets/images/gems.png", {
            frameWidth: 256,
            frameHeight: 256
        });
    }

    create() {
        const displayMetrics = this.game.displayMetrics;
        configureCamera(this.cameras.main, displayMetrics);
        this.tileWidth = 80;
        this.tileHeight = 80;
        this.tileScale = this.tileWidth / 256;
        this.tileVisibilityThreshold = 1 / 3;
        this.columnLocks = new ColumnLockManager();
        this.activeResolutions = 0;
        this.resizeInProgress = false;
        this.pendingGameSize = null;
        this.pendingBoardCheck = false;
        this.pendingBoardCheckTrigger = "initial";
        this.flushingPendingWork = false;

        this.background = this.add.tileSprite(
            0,
            0,
            displayMetrics.width,
            displayMetrics.height,
            "background"
        ).setOrigin(0, 0);

        this.specialTileRegistry = new SpecialTileRegistry();
        this.effectRegistry = new EffectRegistry();
        registerBombPlugin(this.specialTileRegistry, this.effectRegistry);

        const boardSize = this.getBoardSize(displayMetrics);
        this.board = new BoardModel({
            ...boardSize,
            specialTileRegistry: this.specialTileRegistry,
            random: () => Phaser.Math.RND.frac()
        });
        this.matchAnalyzer = new MatchAnalyzer();
        this.resolutionEngine = new ResolutionEngine({
            board: this.board,
            matchAnalyzer: this.matchAnalyzer,
            specialTileRegistry: this.specialTileRegistry
        });
        this.boardView = new PhaserBoardView({
            scene: this,
            board: this.board,
            effectRegistry: this.effectRegistry,
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            tileScale: this.tileScale
        });
        this.boardView.createInitialTiles();

        this.swipeMinDistance = 20;
        this.swipeMinTime = 100;
        this.swipeMaxTime = 1000;
        this.swipeStartTime = 0;
        this.swipeStartX = 0;
        this.swipeStartY = 0;

        this.input.on("gameobjectdown", this.handleTileClick, this);
        this.input.on("pointerdown", this.handlePointerDown, this);
        this.input.on("pointerup", this.handlePointerUp, this);
        this.scale.on("resize", this.onResize, this);

        this.cameras.main.setPostPipeline("WavePipeline");
        this.cameras.main.setPostPipeline("ExplosionPipeline");

        this.time.delayedCall(500, () => {
            this.requestBoardCheck("initial");
        });
    }

    handleTileClick(_, sprite) {
        if (this.resizeInProgress) return;
        const tileId = this.boardView.getTileId(sprite);
        const tile = this.board.getById(tileId);
        if (!tile || this.columnLocks.isLocked(tile.position.x)) return;

        const selectedTileId = this.boardView.selectedTileId;
        if (!selectedTileId) {
            this.boardView.select(tile.id);
            return;
        }

        if (selectedTileId === tile.id) {
            void this.runTap(tile.position);
            return;
        }

        const selectedTile = this.board.getById(selectedTileId);
        if (
            !selectedTile ||
            this.columnLocks.isLocked(selectedTile.position.x)
        ) {
            this.boardView.select(tile.id);
            return;
        }

        if (selectedTile && this.board.areAdjacent(selectedTile.position, tile.position)) {
            void this.runSwap(selectedTile.position, tile.position);
        } else {
            this.boardView.clearSelection();
        }
    }

    async runSwap(positionA, positionB) {
        if (
            this.resizeInProgress ||
            this.columnLocks.isLocked(positionA.x) ||
            this.columnLocks.isLocked(positionB.x)
        ) {
            return;
        }

        const blockedColumns = this.columnLocks.snapshot();
        this.boardView.clearSelection();
        const result = this.resolutionEngine.dispatchSwap(
            positionA,
            positionB,
            { blockedColumns }
        );
        await this.playResolutionEvents(result.events);
    }

    async runTap(position) {
        if (
            this.resizeInProgress ||
            this.columnLocks.isLocked(position.x)
        ) {
            return;
        }

        const result = this.resolutionEngine.dispatchTap(position, {
            blockedColumns: this.columnLocks.snapshot()
        });
        this.boardView.clearSelection();
        if (result.accepted) {
            await this.playResolutionEvents(result.events);
        }
    }

    requestBoardCheck(trigger) {
        this.pendingBoardCheck = true;
        this.pendingBoardCheckTrigger = trigger;
        void this.flushPendingWork();
    }

    handlePointerDown(pointer) {
        const position = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.swipeStartX = position.x;
        this.swipeStartY = position.y;
        this.swipeStartTime = pointer.time;
    }

    handlePointerUp(pointer) {
        if (this.resizeInProgress) return;
        const swipeTime = pointer.time - this.swipeStartTime;
        if (swipeTime < this.swipeMinTime || swipeTime > this.swipeMaxTime) return;

        const position = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const dx = position.x - this.swipeStartX;
        const dy = position.y - this.swipeStartY;
        if (Math.sqrt(dx * dx + dy * dy) < this.swipeMinDistance) return;

        const direction = this.getSwipeDirection(dx, dy);
        const start = {
            x: Math.floor(this.swipeStartX / this.tileWidth),
            y: Math.floor(this.swipeStartY / this.tileHeight)
        };
        if (!this.board.isValid(start) || !this.board.get(start)) return;

        const neighbor = this.getNeighborPosition(start, direction);
        if (!neighbor || !this.board.get(neighbor)) return;
        if (
            this.columnLocks.isLocked(start.x) ||
            this.columnLocks.isLocked(neighbor.x)
        ) {
            return;
        }

        this.boardView.clearSelection();
        void this.runSwap(start, neighbor);
    }

    getSwipeDirection(dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? "right" : "left";
        }
        return dy > 0 ? "down" : "up";
    }

    getNeighborPosition(position, direction) {
        const neighbor = { ...position };
        switch (direction) {
        case "left":
            neighbor.x--;
            break;
        case "right":
            neighbor.x++;
            break;
        case "up":
            neighbor.y--;
            break;
        case "down":
            neighbor.y++;
            break;
        default:
            return null;
        }
        return this.board.isValid(neighbor) ? neighbor : null;
    }

    onResize() {
        const gameSize = this.game.displayMetrics;
        configureCamera(this.cameras.main, gameSize);
        if (this.background) {
            this.background.setSize(gameSize.width, gameSize.height);
        }
        this.pendingGameSize = {
            width: gameSize.width,
            height: gameSize.height
        };
        void this.flushPendingWork();
    }

    async applyResize(gameSize) {
        const boardSize = this.getBoardSize(gameSize);
        const changes = this.board.resize(boardSize.rows, boardSize.cols);
        await this.boardView.playResize(changes);
        const events = this.resolutionEngine.resolveCurrentMatches({
            trigger: "resize",
            blockedColumns: new Set()
        });
        await this.playResolutionEvents(events, {
            requestBoardCheck: false
        });
    }

    getBoardSize(gameSize) {
        return {
            rows: Math.floor(
                gameSize.height / this.tileHeight +
                (1 - this.tileVisibilityThreshold)
            ),
            cols: Math.floor(
                gameSize.width / this.tileWidth +
                (1 - this.tileVisibilityThreshold)
            )
        };
    }

    async playResolutionEvents(events, { requestBoardCheck = true } = {}) {
        if (events.length === 0) {
            if (requestBoardCheck) this.requestBoardCheck("column-unlock");
            return;
        }

        const columns = collectEventColumns(events);
        this.columnLocks.lock(columns);
        this.activeResolutions++;

        const selectedTile = this.board.getById(this.boardView.selectedTileId);
        if (
            this.boardView.selectedTileId &&
            (!selectedTile || columns.has(selectedTile.position.x))
        ) {
            this.boardView.clearSelection();
        }

        try {
            await this.boardView.playEvents(events);
        } catch (error) {
            console.error(error);
        } finally {
            this.columnLocks.unlock(columns);
            this.activeResolutions--;
            if (requestBoardCheck) {
                this.pendingBoardCheck = true;
                this.pendingBoardCheckTrigger = "column-unlock";
            }
        }
        void this.flushPendingWork();
    }

    async flushPendingWork() {
        if (this.flushingPendingWork) return;
        this.flushingPendingWork = true;

        try {
            while (true) {
                if (this.pendingGameSize) {
                    if (this.activeResolutions > 0) break;

                    const gameSize = this.pendingGameSize;
                    this.pendingGameSize = null;
                    this.resizeInProgress = true;
                    this.boardView.clearSelection();
                    await this.applyResize(gameSize);
                    this.resizeInProgress = false;
                    this.pendingBoardCheck = true;
                    this.pendingBoardCheckTrigger = "resize";
                    continue;
                }

                if (this.pendingBoardCheck) {
                    const trigger = this.pendingBoardCheckTrigger;
                    this.pendingBoardCheck = false;
                    const events = this.resolutionEngine.resolveCurrentMatches({
                        trigger,
                        blockedColumns: this.columnLocks.snapshot()
                    });

                    if (events.length > 0) {
                        await this.playResolutionEvents(events, {
                            requestBoardCheck: false
                        });
                        this.pendingBoardCheck = true;
                        this.pendingBoardCheckTrigger = "cascade";
                        continue;
                    }
                }

                break;
            }
        } catch (error) {
            this.resizeInProgress = false;
            console.error(error);
        } finally {
            this.flushingPendingWork = false;
        }

        if (
            this.pendingBoardCheck ||
            (this.pendingGameSize && this.activeResolutions === 0)
        ) {
            void this.flushPendingWork();
        }
    }
}

export default Scene1;
