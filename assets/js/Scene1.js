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
        // Game Grid
        this.gridSize = 8;
        this.tileWidth = 80;
        this.tileHeight = 80;
        this.gemScale = 80 / 105;
        this.grid = [];
        this.gems = this.add.group();
        this.selectedGem = null;
        this.swapping = false;
        this.wiggleTween = null;

        // Background
        this.add.image(0, 0, "background").setOrigin(0,0);

        // Create Grid
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.addGem(x, y);
            }
        }

        // Scene-wide input handler
        this.input.on('gameobjectdown', this.handleGemClick, this);

        // Initial check for matches to ensure a valid starting board
        this.time.delayedCall(500, this.checkMatches, [], this);
    }

    addGem(x, y) {
        let gem = this.gems.create(x * this.tileWidth + this.tileWidth / 2, y * this.tileHeight + this.tileHeight / 2, "gems", Phaser.Math.Between(0, 5));
        gem.setInteractive();
        gem.setScale(this.gemScale);
        gem.gridPosition = new Phaser.Geom.Point(x, y);
        this.grid[y][x] = gem;
        // The listener is now on the scene, not the individual gem
        return gem;
    }

    handleGemClick(pointer, gem) {
        // Ignore clicks on non-gem objects
        if (!this.gems.contains(gem)) return;

        if (this.swapping) return;

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
                this.swapping = true;
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
                // After visual swap, check for matches
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
            x: '+=4', // Shake right
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
                        this.swapping = false; // Allow new swaps
                    }
                });
            }
        });
    }

    checkMatches() {
        let matches = this.getMatches();

        if (matches.length > 0) {
            this.removeMatches(matches); // Starts the disappearance animation

            // Wait for the animation to finish before dropping and filling
            this.time.delayedCall(200, () => {
                this.dropGems();
                this.fillNewGems();

                // After dropping/filling, check for new chain-reaction matches
                this.time.delayedCall(500, this.checkMatches, [], this);
            }, [], this);
        } else {
            this.swapping = false; // Allow further swaps if no matches found
        }
    }

    getMatches() {
        let matches = [];
        const BATCH_TYPES = { HORIZONTAL: 'H', VERTICAL: 'V' };

        // Find horizontal matches
        for (let y = 0; y < this.gridSize; y++) {
            let currentBatch = [];
            for (let x = 0; x < this.gridSize; x++) {
                const gem = this.grid[y][x];
                if (gem && currentBatch.length > 0 && gem.frame.name === currentBatch[0].frame.name) {
                    currentBatch.push(gem);
                } else {
                    if (currentBatch.length >= 3) {
                        matches = matches.concat(currentBatch);
                    }
                    currentBatch = [gem];
                }
            }
            if (currentBatch.length >= 3) {
                matches = matches.concat(currentBatch);
            }
        }

        // Find vertical matches
        for (let x = 0; x < this.gridSize; x++) {
            let currentBatch = [];
            for (let y = 0; y < this.gridSize; y++) {
                const gem = this.grid[y][x];
                if (gem && currentBatch.length > 0 && gem.frame.name === currentBatch[0].frame.name) {
                    currentBatch.push(gem);
                } else {
                    if (currentBatch.length >= 3) {
                        matches = matches.concat(currentBatch);
                    }
                    currentBatch = [gem];
                }
            }
            if (currentBatch.length >= 3) {
                matches = matches.concat(currentBatch);
            }
        }

        // Remove duplicates from matches array
        return Array.from(new Set(matches));
    }

    removeMatches(matches) {
        matches.forEach(gem => {
            // Set grid cell to null immediately
            this.grid[gem.gridPosition.y][gem.gridPosition.x] = null;
            
            // Animate gem disappearance
            this.tweens.add({
                targets: gem,
                scale: 0,
                duration: 200,
                onComplete: () => {
                    gem.destroy();
                }
            });
        });
    }

    dropGems() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = this.gridSize - 1; y >= 0; y--) {
                if (this.grid[y][x] === null) {
                    // Find the first gem above it
                    for (let yy = y - 1; yy >= 0; yy--) {
                        if (this.grid[yy][x] !== null) {
                            let gem = this.grid[yy][x];
                            this.grid[y][x] = gem;
                            this.grid[yy][x] = null;
                            gem.gridPosition.y = y;

                            // Animate drop
                            this.tweens.add({
                                targets: gem,
                                y: y * this.tileHeight + this.tileHeight / 2,
                                duration: 400,
                                ease: 'Bounce.easeOut'
                            });
                            break;
                        }
                    }
                }
            }
        }
    }

    fillNewGems() {
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                if (this.grid[y][x] === null) {
                    let newGem = this.addGem(x, y);
                    newGem.y = -this.tileHeight; // Start above the grid

                    this.tweens.add({
                        targets: newGem,
                        y: y * this.tileHeight + this.tileHeight / 2,
                        duration: 400,
                        ease: 'Bounce.easeOut'
                    });
                }
            }
        }
    }

}

export default Scene1;
