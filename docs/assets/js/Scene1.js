class Scene1 extends Phaser.Scene {
    constructor() {
        super("bootGame");
    }

    preload() {
        this.load.image("background", "assets/images/background.png");
        this.load.spritesheet("gems", "assets/images/gems.png", {
            frameWidth: 105,
            frameHeight: 105
        });
    }

    create() {
        // Game Grid properties
        this.tileWidth = 80;
        this.tileHeight = 80;
        this.gemScale = 80 / 105;
        this.TILE_VISIBILITY_THRESHOLD = 1 / 3;
        
        // Dynamic grid size based on screen
        this.gridRows = Math.floor(this.scale.height / this.tileHeight + (1 - this.TILE_VISIBILITY_THRESHOLD));
        this.gridCols = Math.floor(this.scale.width / this.tileWidth + (1 - this.TILE_VISIBILITY_THRESHOLD));

        this.grid = [];
        this.gems = this.add.group();
        this.selectedGem = null;
        this.wiggleTween = null;
        
        // Animation tracking
        this.animatingCols = new Set();
        this.colsNeedingResize = new Set();

        // Background
        this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, "background").setOrigin(0,0);

        // Create Grid
        for (let y = 0; y < this.gridRows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridCols; x++) {
                this.addGem(x, y);
            }
        }

        // Scene-wide input handler
        this.input.on("gameobjectdown", this.handleGemClick, this);

        // Listen for resize events
        this.scale.on("resize", this.onResize, this);

        // Swipe properties
        this.swipeMinDistance = 20;
        this.swipeMinTime = 100; //ms
        this.swipeMaxTime = 1000; //ms
        this.swipeStartTime = 0;
        this.swipeStartX = 0;
        this.swipeStartY = 0;

        this.input.on("pointerdown", this.handlePointerDown, this);
        this.input.on("pointerup", this.handlePointerUp, this);

        // Enable custom wave shader
        this.cameras.main.setPostPipeline("WavePipeline");
        this.cameras.main.setPostPipeline("ExplosionPipeline");
        
        // Initial check for matches to ensure a valid starting board
        this.time.delayedCall(500, this.checkMatches, [], this);
    }

    addGem(x, y, isBomb = false, onComplete = null) {
        let gem;
        if (isBomb) {
            gem = this.gems.create(x * this.tileWidth + this.tileWidth / 2, y * this.tileHeight + this.tileHeight / 2, "gems", 6);
            gem.isBomb = true;

            // Pop-in animation for bombs
            gem.setScale(0);
            this.tweens.add({
                targets: gem,
                scale: this.gemScale,
                duration: 400,
                ease: "Back.out",
                onComplete: () => {
                    if (onComplete) onComplete();
                }
            });
        } else {
            gem = this.gems.create(x * this.tileWidth + this.tileWidth / 2, y * this.tileHeight + this.tileHeight / 2, "gems", Phaser.Math.Between(0, 5));
            gem.isBomb = false;
            gem.setScale(this.gemScale);
            if (onComplete) onComplete();
        }
        gem.setInteractive();
        gem.gridPosition = new Phaser.Geom.Point(x, y);
        this.grid[y][x] = gem;
        // The listener is now on the scene, not the individual gem
        return gem;
    }

    handleGemClick(_, gem) {
        // Ignore clicks on non-gem objects
        if (!this.gems.contains(gem)) return;

        // Block input if the gem's column is animating
        if (this.animatingCols.has(gem.gridPosition.x)) return;

        // If a gem is already selected, stop its wiggle
        if (this.selectedGem) {
            if (this.wiggleTween) this.wiggleTween.stop();
            this.selectedGem.angle = 0; // Reset angle
        }

        if (this.selectedGem === null) {
            // First gem selected
            this.selectedGem = gem;
            this.selectedGem.setScale(this.gemScale * 1.1); // Use new 1.1 scale
            
            // Start wiggle animation
            this.wiggleTween = this.tweens.add({
                targets: this.selectedGem,
                angle: { from: -5, to: 5 },
                duration: 200,
                yoyo: true,
                repeat: -1
            });

        } else if (this.selectedGem === gem) {
            // Deselect the same gem
            this.selectedGem.setScale(this.gemScale);
            this.selectedGem = null;
        } else {
            // Second gem selected, attempt swap
            // The wiggle is already stopped from the check at the top
            if (this.canSwap(this.selectedGem, gem)) {
                // Ensure both columns are free
                if (this.animatingCols.has(this.selectedGem.gridPosition.x) || 
                    this.animatingCols.has(gem.gridPosition.x)) {
                    this.selectedGem.setScale(this.gemScale);
                    this.selectedGem = null;
                    return;
                }

                this.animatingCols.add(this.selectedGem.gridPosition.x);
                this.animatingCols.add(gem.gridPosition.x);
                this.swapGems(this.selectedGem, gem);
            } else {
                // Invalid swap, deselect first gem
                this.selectedGem.setScale(this.gemScale);
                this.selectedGem = null;
            }
        }
    }

    canSwap(gem1, gem2) {
        const dx = Math.abs(gem1.gridPosition.x - gem2.gridPosition.x);
        const dy = Math.abs(gem1.gridPosition.y - gem2.gridPosition.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    swapGems(gem1, gem2) {
        // Store original positions for potential reversal
        const gem1Pos = { x: gem1.x, y: gem1.y };
        const gem2Pos = { x: gem2.x, y: gem2.y };
        const gem1GridPos = gem1.gridPosition;
        const gem2GridPos = gem2.gridPosition;

        // Animate the visual swap
        this.tweens.add({
            targets: gem1,
            x: gem2Pos.x,
            y: gem2Pos.y,
            duration: 200,
        });

        this.tweens.add({
            targets: gem2,
            x: gem1Pos.x,
            y: gem1Pos.y,
            duration: 200,
            onComplete: () => {
                const colsToUnlock = new Set([gem1GridPos.x, gem2GridPos.x]);
                
                // Unlock to allow match checking
                colsToUnlock.forEach(col => this.animatingCols.delete(col));

                // Provisionally swap in the grid data structure
                this.grid[gem1GridPos.y][gem1GridPos.x] = gem2;
                this.grid[gem2GridPos.y][gem2GridPos.x] = gem1;

                const matches = this.getMatches();

                if (matches.length > 0) {
                    // If matches found, confirm the swap by updating gridPositions
                    gem1.gridPosition = gem2GridPos;
                    gem2.gridPosition = gem1GridPos;
                    
                    this.checkMatches();
                } else {
                    // Re-lock for revert animation
                    colsToUnlock.forEach(col => this.animatingCols.add(col));

                    // No matches, revert the provisional swap in the grid data
                    this.grid[gem1GridPos.y][gem1GridPos.x] = gem1;
                    this.grid[gem2GridPos.y][gem2GridPos.x] = gem2;
                    
                    this.revertSwap(gem1, gem2, gem1Pos, gem2Pos);
                }
            }
        });

        // Deselect gems
        if(this.selectedGem) this.selectedGem.setScale(this.gemScale);
        this.selectedGem = null;
    }

    revertSwap(gem1, gem2, gem1Pos, gem2Pos) {
        // Shake and revert animation
        this.tweens.add({
            targets: [gem1, gem2],
            x: "+=4", // Shake right
            yoyo: true,
            repeat: 2,
            duration: 50,
            onComplete: () => {
                // Animate back to original positions
                this.tweens.add({
                    targets: gem1,
                    x: gem1Pos.x,
                    y: gem1Pos.y,
                    duration: 200,
                });
                this.tweens.add({
                    targets: gem2,
                    x: gem2Pos.x,
                    y: gem2Pos.y,
                    duration: 200,
                    onComplete: () => {
                        const colsToUnlock = new Set([gem1.gridPosition.x, gem2.gridPosition.x]);
                        colsToUnlock.forEach(col => this.setColAnimating(col, false));
                    }
                });
            }
        });
    }

    isValid(x, y) {
        return x >= 0 && x < this.gridCols && y >= 0 && y < this.gridRows;
    }
    
    checkMatches() {
        let groups = this.getMatches();
    
        if (groups.length > 0) {
            let affectedCols = new Set();
                
            groups.forEach(group => {
                group.forEach(gem => {
                    affectedCols.add(gem.gridPosition.x);
                });
            });
    
            // Lock all initially affected columns
            affectedCols.forEach(col => this.animatingCols.add(col));
    
            this.removeMatches(groups, affectedCols);
        }
    }
    
    removeMatches(groups, affectedCols) {
        let allGemsToRemove = new Set();
        let gemsToAnimateOnly = new Set();
        let bombOrigins = [];
        let bombsToSpawn = [];
    
        // 1. Initial Processing
        groups.forEach(group => {
            group.forEach(gem => allGemsToRemove.add(gem));
            if (group.length >= 4) {
                bombsToSpawn.push({ x: group[0].gridPosition.x, y: group[0].gridPosition.y });
            }
        });
    
        // 2. Recursive Bomb Logic
        let gemsToCheck = Array.from(allGemsToRemove);
        let checkedGems = new Set();
    
        while (gemsToCheck.length > 0) {
            let gem = gemsToCheck.pop();
            if (checkedGems.has(gem)) continue;
            checkedGems.add(gem);
    
            if (gem.isBomb) {
                bombOrigins.push(gem);
                this.processBombArea(gem, allGemsToRemove, gemsToAnimateOnly, gemsToCheck, affectedCols);
            }
        }
    
        // 3. Execute
        if (bombOrigins.length > 0) {
            this.animateShockwave(bombOrigins, gemsToAnimateOnly, allGemsToRemove, () => {
                this.finalizeRemoval(allGemsToRemove, bombsToSpawn, affectedCols);
            });
        } else {
            this.finalizeRemoval(allGemsToRemove, bombsToSpawn, affectedCols);
        }
    }
    
    processBombArea(bomb, allGemsToRemove, gemsToAnimateOnly, gemsToCheck, affectedCols) {
        const { x, y } = bomb.gridPosition;
        const radiusRemove = 1;
        const radiusAnim = 4;    
        for (let dy = -radiusAnim; dy <= radiusAnim; dy++) {
            for (let dx = -radiusAnim; dx <= radiusAnim; dx++) {
                if (dx === 0 && dy === 0) continue;
    
                let nx = x + dx;
                let ny = y + dy;
    
                if (this.isValid(nx, ny)) {
                    let target = this.grid[ny][nx];
                    if (!target) continue;
    
                    let dist = Math.max(Math.abs(dx), Math.abs(dy));
    
                    // Lock column for any affected gem
                    if (!affectedCols.has(nx)) {
                        affectedCols.add(nx);
                        this.animatingCols.add(nx);
                    }
    
                    if (dist <= radiusRemove) {
                        if (!allGemsToRemove.has(target)) {
                            allGemsToRemove.add(target);
                            gemsToCheck.push(target);
                            // If it was marked for animation only, upgrade it to removal
                            if (gemsToAnimateOnly.has(target)) gemsToAnimateOnly.delete(target);
                        }
                    } else {
                        // Radius 4-5: Animate only
                        if (!allGemsToRemove.has(target) && !gemsToAnimateOnly.has(target)) {
                            gemsToAnimateOnly.add(target);
                        }
                    }
                }
            }
        }
    }
    
    animateShockwave(bombOrigins, gemsToAnimateOnly, allGemsToRemove, onComplete) {
        // Trigger Explosion Shader
        if (bombOrigins.length > 0) {
            const pipeline = this.cameras.main.getPostPipeline("ExplosionPipeline");
            
            if (pipeline) {
                // Use the first bomb as the center for the shockwave
                const bomb = bombOrigins[0];
                pipeline.set2f("uCenter", bomb.x, bomb.y);
                pipeline.set1f("uActive", 1.0); // Activate shader
                
                // Stop previous shader tween if active
                if (this.explosionShaderTween) {
                    this.explosionShaderTween.stop();
                }

                // Tween the shader time uniform
                let shaderData = { time: 0.0 };
                this.explosionShaderTween = this.tweens.add({
                    targets: shaderData,
                    time: 1.0,
                    duration: 600, 
                    onUpdate: () => {
                        pipeline.set1f("uTime", shaderData.time);
                    },
                    onComplete: () => {
                        pipeline.set1f("uActive", 0.0); // Deactivate shader
                        this.explosionShaderTween = null;
                    }
                });
            }
        }

        let offsets = new Map();
            
        // Combine sets for animation calculation
        let allAnimatedGems = new Set([...gemsToAnimateOnly, ...allGemsToRemove]);
    
        // Calculate forces
        allAnimatedGems.forEach(gem => {
            let totalDx = 0;
            let totalDy = 0;
    
            bombOrigins.forEach(bomb => {
                let dx = gem.gridPosition.x - bomb.gridPosition.x;
                let dy = gem.gridPosition.y - bomb.gridPosition.y;
                let dist = Math.max(Math.abs(dx), Math.abs(dy));
                    
                // Only affect gems within radius of THIS bomb
                if (dist <= 4 && dist > 0) {
                    // Euclidean length for direction normalization
                    let len = Math.sqrt(dx * dx + dy * dy);
                        
                    // Exponential force: base^ (max_dist - dist)
                    // Ring 1: 2.5^4 * 2 = ~78px
                    // Ring 4: 2.5^1 * 2 = ~5px
                    let force = Math.pow(2.5, 5 - dist) * 2;
                        
                    totalDx += (dx / len) * force;
                    totalDy += (dy / len) * force;
                }
            });
    
            if (Math.abs(totalDx) > 0.1 || Math.abs(totalDy) > 0.1) {
                offsets.set(gem, { x: totalDx, y: totalDy });
            }
        });
    
        // Apply tweens
        if (offsets.size === 0) {
            if (onComplete) onComplete();
            return;
        }
    
        let completed = 0;
        offsets.forEach((offset, gem) => {
            this.tweens.add({
                targets: gem,
                x: gem.x + offset.x,
                y: gem.y + offset.y,
                duration: 100,
                yoyo: true,
                ease: "Cubic.easeOut",
                onComplete: () => {
                    completed++;
                    if (completed === offsets.size) {
                        if (onComplete) onComplete();
                    }
                }
            });
        });
    }
    
    finalizeRemoval(allGemsToRemove, bombsToSpawn, affectedCols) {
        const gemsArray = Array.from(allGemsToRemove);
        let count = 0;
            
        gemsArray.forEach(gem => {
            // Set grid cell to null immediately
            this.grid[gem.gridPosition.y][gem.gridPosition.x] = null;
                
            this.tweens.add({
                targets: gem,
                scale: 0,
                duration: 200,
                onComplete: () => {
                    gem.destroy();
                    count++;
                    if (count === gemsArray.length) {
                        // Prepare synchronization
                        let colWaitCount = new Map();
                        affectedCols.forEach(col => colWaitCount.set(col, 1));
    
                        const checkUnlock = (col) => {
                            let c = colWaitCount.get(col) - 1;
                            colWaitCount.set(col, c);
                            if (c === 0) {
                                this.setColAnimating(col, false);
                            }
                        };
    
                        // Spawn new bombs
                        bombsToSpawn.forEach(pos => {
                            if (this.grid[pos.y][pos.x] === null) {
                                colWaitCount.set(pos.x, colWaitCount.get(pos.x) + 1);
                                this.addGem(pos.x, pos.y, true, () => {
                                    checkUnlock(pos.x);
                                });
                            }
                        });
    
                        // Drop and Fill
                        affectedCols.forEach(col => {
                            this.dropGemsInColumn(col, () => {
                                this.fillNewGemsInColumn(col, () => {
                                    checkUnlock(col);
                                });
                            });
                        });
                    }
                }
            });
        });
    }
    getMatches() {
        let matchGroups = [];

        // Helper to check a line (row or column) for matches
        const findMatchesInLine = (line) => {
            let i = 0;
            while (i < line.length) {
                let currentBatch = [];
                let batchColor = null;

                for (let j = i; j < line.length; j++) {
                    const gem = line[j];
                    if (!gem || this.animatingCols.has(gem.gridPosition.x)) {
                        break;
                    }

                    if (gem.isBomb) {
                        currentBatch.push(gem);
                    } else {
                        if (batchColor === null) {
                            batchColor = gem.frame.name;
                            currentBatch.push(gem);
                        } else if (gem.frame.name === batchColor) {
                            currentBatch.push(gem);
                        } else {
                            break;
                        }
                    }
                }

                if (currentBatch.length >= 3) {
                    matchGroups.push(currentBatch);
                    i += currentBatch.length;
                } else {
                    i++;
                }
            }
        };

        // Find horizontal matches
        for (let y = 0; y < this.gridRows; y++) {
            if (this.grid[y]) findMatchesInLine(this.grid[y]);
        }

        // Find vertical matches
        for (let x = 0; x < this.gridCols; x++) {
            if (this.animatingCols.has(x)) continue;
            let column = [];
            for (let y = 0; y < this.gridRows; y++) {
                column.push(this.grid[y] ? this.grid[y][x] : null);
            }
            findMatchesInLine(column);
        }

        return matchGroups;
    }

    dropGemsInColumn(col, onComplete) {
        const gemsToDrop = [];
        // 1. Collect all existing gems in the column
        for (let y = 0; y < this.gridRows; y++) {
            if (this.grid[y] && this.grid[y][col]) {
                gemsToDrop.push(this.grid[y][col]);
                this.grid[y][col] = null; // Remove from grid temporarily
            }
        }

        let drops = 0;
        let totalToDrop = 0;
        let currentY = this.gridRows - 1;

        // 2. Place gems back from the bottom up
        for (let i = gemsToDrop.length - 1; i >= 0; i--) {
            const gem = gemsToDrop[i];
            const targetY = currentY;
            currentY--;

            this.grid[targetY][col] = gem;
            gem.gridPosition.y = targetY;

            const targetPixelY = targetY * this.tileHeight + this.tileHeight / 2;

            if (Math.abs(gem.y - targetPixelY) > 1) { // Allow small float tolerance
                totalToDrop++;
                this.tweens.add({
                    targets: gem,
                    y: targetPixelY,
                    duration: 400,
                    ease: "Bounce.easeOut",
                    onComplete: () => {
                        drops++;
                        if (drops === totalToDrop) {
                            if (onComplete) onComplete();
                        }
                    }
                });
            } else {
                // Ensure exact position if no animation
                gem.y = targetPixelY;
            }
        }

        if (totalToDrop === 0) {
            if (onComplete) onComplete();
        }
    }

    fillNewGemsInColumn(col, onComplete) {
        // If this column is flagged for resize, skip filling now.
        // The processColumn -> resizeColumn loop will handle the Restack & Fill.
        if (this.colsNeedingResize.has(col)) {
            if (onComplete) onComplete();
            return;
        }

        let fills = 0;
        let totalToFill = 0;

        for (let y = 0; y < this.gridRows; y++) {
            if (this.grid[y] && this.grid[y][col] === null) {
                totalToFill++;
                let newGem = this.addGem(col, y);
                newGem.y = -this.tileHeight * (totalToFill); // Stagger entry

                this.tweens.add({
                    targets: newGem,
                    y: y * this.tileHeight + this.tileHeight / 2,
                    duration: 400,
                    ease: "Bounce.easeOut",
                    onComplete: () => {
                        fills++;
                        if (fills === totalToFill) onComplete();
                    }
                });
            }
        }
        if (totalToFill === 0) onComplete();
    }

    onResize(gameSize) {
        // Immediately resize the background
        if (this.background) {
            this.background.setSize(gameSize.width, gameSize.height);
        }

        this.handleResize(gameSize);
    }

    handleResize(gameSize) {
        if (this.selectedGem) {
            if (this.wiggleTween) this.wiggleTween.complete();
            this.selectedGem.setScale(this.gemScale);
            this.selectedGem = null;
        }

        const oldRows = this.gridRows;
        const oldCols = this.gridCols;
        const newRows = Math.floor(gameSize.height / this.tileHeight + (1 - this.TILE_VISIBILITY_THRESHOLD));
        const newCols = Math.floor(gameSize.width / this.tileWidth + (1 - this.TILE_VISIBILITY_THRESHOLD));

        if (oldRows === newRows && oldCols === newCols) {
            return; // No change
        }

        // 1. Handle horizontal changes (columns)
        if (newCols < oldCols) {
            this.removeCols(newCols, oldCols, Math.max(oldRows, newRows));
        }
        
        this.gridCols = newCols;
        this.gridRows = newRows;

        // 2. Ensure row arrays exist for newRows
        if (this.grid.length < newRows) {
            for (let y = this.grid.length; y < newRows; y++) {
                this.grid[y] = new Array(newCols).fill(null);
            }
        }

        if (newCols > oldCols) {
            this.addCols(oldCols, newCols, newRows);
        }

        // 3. Trigger per-column resize
        for (let x = 0; x < this.gridCols; x++) {
            if (this.animatingCols.has(x)) {
                this.colsNeedingResize.add(x);
            } else {
                this.resizeColumn(x);
            }
        }
    }

    addCols(from, to, numRows) {
        for (let y = 0; y < numRows; y++) {
            if (!this.grid[y]) continue; // In case rows were removed
            for (let x = from; x < to; x++) {
                this.grid[y][x] = null;
            }
        }
    }

    removeCols(newCols, oldCols, numRows) {
        for (let x = newCols; x < oldCols; x++) {
            for (let y = 0; y < numRows; y++) {
                if (this.grid[y] && this.grid[y][x]) {
                    this.grid[y][x].destroy();
                    this.grid[y][x] = null;
                }
            }
        }
        for (let y = 0; y < numRows; y++) {
            if (this.grid[y]) {
                this.grid[y].length = newCols;
            }
        }
    }


    handlePointerDown(pointer) {
        this.swipeStartX = pointer.x;
        this.swipeStartY = pointer.y;
        this.swipeStartTime = pointer.time;
    }

    handlePointerUp(pointer) {
        const swipeTime = pointer.time - this.swipeStartTime;
        if (swipeTime < this.swipeMinTime || swipeTime > this.swipeMaxTime) {
            return; // Not a swipe (too fast or too slow)
        }

        const dx = pointer.x - this.swipeStartX;
        const dy = pointer.y - this.swipeStartY;

        const swipeDistance = Math.sqrt(dx * dx + dy * dy); // Use Euclidean distance for overall swipe distance

        if (swipeDistance < this.swipeMinDistance) {
            return; // Not a swipe (too short)
        }

        const swipeDirection = this.getSwipeDirection(dx, dy);
        if (!swipeDirection) {
            return; // No clear direction
        }

        // Determine the grid position where the swipe started
        const startGridX = Math.floor(this.swipeStartX / this.tileWidth);
        const startGridY = Math.floor(this.swipeStartY / this.tileHeight);
        
        // Ensure swipe started within the valid grid boundaries
        if (startGridX < 0 || startGridX >= this.gridCols || startGridY < 0 || startGridY >= this.gridRows) {
            return; // Swipe started outside grid bounds
        }

        const swipedGem = this.grid[startGridY][startGridX];
        if (!swipedGem) {
            return; // No gem at the swipe start position
        }

        if (this.animatingCols.has(startGridX)) return;

        const neighborGem = this.getNeighbor(swipedGem, swipeDirection);

        if (swipedGem && neighborGem) {
            if (this.animatingCols.has(neighborGem.gridPosition.x)) return;

            // Deselect any currently selected gem to avoid conflicts with swipe
            if(this.selectedGem) {
                if (this.wiggleTween) this.wiggleTween.stop();
                this.selectedGem.angle = 0;
                this.selectedGem.setScale(this.gemScale);
                this.selectedGem = null;
            }

            // Attempt to swap the gems if it's a valid move
            if (this.canSwap(swipedGem, neighborGem)) {
                this.animatingCols.add(swipedGem.gridPosition.x);
                this.animatingCols.add(neighborGem.gridPosition.x);
                this.swapGems(swipedGem, neighborGem);
            }
        }
    }

    getSwipeDirection(dx, dy) {
        // Determine if it's primarily horizontal or vertical
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? "right" : "left"; // Horizontal swipe
        } else {
            return dy > 0 ? "down" : "up";     // Vertical swipe
        }
    }

    getNeighbor(gem, direction) {
        if (!gem) return null; // Ensure a valid gem is provided

        let { x, y } = gem.gridPosition; // Get the grid coordinates of the gem

        // Adjust coordinates based on swipe direction
        switch (direction) {
        case "left":
            x--;
            break;
        case "right":
            x++;
            break;
        case "up":
            y--;
            break;
        case "down":
            y++;
            break;
        default:
            return null; // Unknown direction
        }

        // Check if the calculated neighbor coordinates are within the grid bounds
        if (x >= 0 && x < this.gridCols && y >= 0 && y < this.gridRows) {
            return this.grid[y][x]; // Return the neighbor gem
        }

        return null; // No valid neighbor found
    }

    setColAnimating(col, animating) {
        if (animating) {
            this.animatingCols.add(col);
        } else {
            this.animatingCols.delete(col);
            this.processColumn(col);
        }
    }

    processColumn(col) {
        // 1. Check if resize is pending for this column
        if (this.colsNeedingResize.has(col)) {
            this.colsNeedingResize.delete(col);
            // Apply resize logic for this column (vertical)
            // Note: If gridRows changed, we might need to add/remove gems
            this.resizeColumn(col);
            return;
        }

        // 2. Check for matches involving this column (and neighbors)
        // Since we don't track which column triggered the check easily, 
        // we can run a check that filters for stable columns.
        // Or simpler: Just run checkMatches(), it should ignore unstable cols.
        this.checkMatches();
    }

    resizeColumn(col) {
        // Only handle vertical resize (adding/removing rows) per column
        // If gridCols changed, that's handled in handleResize mainly.
        
        // We assume this.gridRows is the *new* target height.
        // Current gems in this column might be more or fewer.
        
        // 1. If we shrunk, handleResize might have already destroyed gems?
        // No, handleResize deferred destruction for animating columns.
        
        // So:
        // Ensure grid structure is correct for this col?
        // handleResize already updated gridRows global and grid structure (mostly).
        // If we need to remove gems that are now "out of bounds":
        for (let y = this.gridRows; y < this.grid.length; y++) {
            if (this.grid[y] && this.grid[y][col]) {
                this.grid[y][col].destroy();
                this.grid[y][col] = null;
            }
        }
        
        // Now fill/drop
        this.setColAnimating(col, true);
        this.dropGemsInColumn(col, () => {
            this.fillNewGemsInColumn(col, () => {
                this.setColAnimating(col, false);
            });
        });
    }


}

export default Scene1;
