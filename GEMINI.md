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

## Linting

This project uses [ESLint](https://eslint.org/) for maintaining code quality and consistency. ESLint analyzes your code for potential errors, stylistic issues, and adherence to best practices.

**Configuration:**
ESLint is configured via `eslint.config.js` at the project root. This file defines the rules and environment for linting.

**Running the Linter:**
You can run ESLint to check and automatically fix issues in your JavaScript files using the following command:

```bash
npm exec eslint assets/js/Scene1.js -- --fix
```
Replace `assets/js/Scene1.js` with the path to the file you wish to lint, or omit it to lint all configured JavaScript files.
