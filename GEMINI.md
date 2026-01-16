# Project Overview

This is a web-based Match-3 game built using the Phaser 3 game engine. The project is hosted on GitHub Pages, with the source code located in the `docs/` directory. The main game logic is contained in `docs/assets/js/Scene1.js` and handles the game grid, gem swapping, match detection, and the main game loop.

## Project Structure

*   `docs/index.html`: The main entry point of the game.
*   `docs/manifest.json`: Web app manifest for PWA support.
*   `docs/sw.js`: Service worker for offline caching and PWA support.
*   `docs/assets/js/game.js`: Initializes the Phaser game and the main scene.
*   `docs/assets/js/Scene1.js`: Contains the core gameplay logic for the Match-3 game.
*   `docs/assets/js/WavePipeline.js`: Custom Phaser PostFX Pipeline for a glare effect.
*   `docs/assets/images/`: Contains all the image assets for the game.
*   `eslint.config.js`: ESLint configuration file (at project root).

## Running the Project

To run this project, you need a local web server. You can use Python's built-in `http.server` for this.

1.  Open a terminal in the project's root directory.
2.  Run the following command:

    ```bash
    python3 -m http.server
    ```

3.  Open your web browser and navigate to `http://localhost:8000/docs/`.

## Development Conventions

*   **Modules:** The project uses JavaScript ES modules (`type="module"` in `package.json` and `<script type="module">` in `index.html`).
*   **Linting:** Code quality is maintained using ESLint.

## Linting

This project uses [ESLint](https://eslint.org/) for maintaining code quality and consistency.

**Configuration:**
ESLint is configured via `eslint.config.js` at the project root.

**Running the Linter:**
You can run ESLint to check and automatically fix issues in your JavaScript files using the following command from the project root:

```bash
npm exec eslint docs/assets/js/Scene1.js -- --fix
```
Replace `docs/assets/js/Scene1.js` with the path to the file you wish to lint, or omit it to lint all configured JavaScript files.

## Gemini Added Memories
- The user prefers code change descriptions to be provided before the tool calls so they can be read during the approval process.