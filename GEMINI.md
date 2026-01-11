# Project Overview

This is a web-based Match-3 game built using the Phaser 3 game engine. The main game logic is contained in `assets/js/Scene1.js` and handles the game grid, gem swapping, match detection, and the main game loop.

## Running the Project

To run this project, you need a local web server. You can use Python's built-in `http.server` for this.

1.  Open a terminal in the project's root directory.
2.  Run the following command:

    ```bash
    python3 -m http.server
    ```

3.  Open your web browser and navigate to `http://localhost:8000`.

## Development Conventions

The project follows a simple structure with JavaScript modules.

*   `index.html`: The main entry point of the game.
*   `assets/js/game.js`: Initializes the Phaser game and the main scene.
*   `assets/js/Scene1.js`: Contains the core gameplay logic for the Match-3 game.
*   `assets/images/`: Contains all the image assets for the game.
