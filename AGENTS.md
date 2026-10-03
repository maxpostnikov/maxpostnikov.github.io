# Project Overview

This is a web-based Match-3 game built using the Phaser 3 game engine. The project is hosted on GitHub Pages, with the source code located in the `docs/` directory. Gameplay rules live in rendering-independent model modules under `docs/assets/js/model/`; `Scene1.js` coordinates input, the engine, and the Phaser view.

## Project Structure

*   `docs/index.html`: The main entry point of the game.
*   `docs/manifest.json`: Web app manifest for PWA support.
*   `docs/sw.js`: Service worker for offline caching and PWA support. Uses a **Stale-While-Revalidate** strategy for automatic background updates.
*   `docs/assets/js/game.js`: Initializes the Phaser game and the main scene.
*   `docs/assets/js/Scene1.js`: Phaser scene controller for input, resizing, and engine event playback.
*   `docs/assets/js/view/`: Phaser views that map logical tiles and engine events to sprites and tweens.
*   `docs/assets/js/model/`: Rendering-independent board, matching, special-tile registry, and resolution engine.
*   `docs/assets/js/specials/`: Pluggable special-tile modules, with each type grouped in its own subfolder.
*   `docs/assets/js/effects/`: Generic effect infrastructure shared by special-tile plugins.
*   `docs/assets/js/pipelines/`: Custom Phaser PostFX pipelines, including glare and explosion shaders.
*   `docs/assets/images/`: Contains all the image assets for the game.
*   `eslint.config.js`: ESLint configuration file (at project root).

## Key Features

*   **PWA Support:** The app can be installed on mobile or desktop. It uses a Stale-While-Revalidate strategy, meaning it loads instantly from the cache while updating in the background for the next launch.
*   **Custom Shaders:**
    *   **Wave Effect:** A periodic diagonal glare that highlights bright objects.
    *   **Explosion Effect:** A ripple wave distortion with a smooth gradient splash at the center, triggered when bombs explode.
*   **Bombs:** Created by matching 4 or more gems. Bombs use frame 6 of the `gems.png` spritesheet.
*   **Pluggable Special Tiles:** Match conditions, activation plans, combinations, and effects are registered without adding type-specific branches to the board engine.
*   **Concurrent Columns:** Only columns touched by an active resolution are locked; disjoint columns remain playable while animations run.

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
*   **Tests:** Pure gameplay modules use Node's built-in test runner.
*   **Offline Cache:** Add every new runtime browser module to `docs/sw.js` and increment `CACHE_NAME`.

## Art Style

*   Modern casual mobile match-3 art: rounded, dimensional cartoon glass/resin pieces with saturated colors, smooth shading, and compact glossy reflections. Avoid heavy outlines, noisy detail, and large flat inset faces.
*   Keep gems distinct: rose-pink square, amethyst hexagon, golden-yellow triangle, red heart, sapphire diamond, and emerald teardrop. The bomb is glossy black with a gold cap and ivory unlit fuse; rockets have no flames or exhaust; the coin is gold with a raised star.
*   Background: dark terracotta (`#5A3A33`) with broad flowing earth layers and large flat fills. Keep layer contrast restrained and pieces readable; avoid grain, bubbles, and busy texture.

## Art Technical Requirements

*   Preserve **80 × 80** board cells and `gems.png` as a **1536 × 512 RGBA** sheet: **6 columns × 2 rows**, **256 × 256** frames, rendered at scale `80 / 256`.
*   Render at device pixel density, capped at **3×**, while keeping board geometry, touch coordinates, and shader distances in CSS pixels. `game.displayMetrics` separates logical viewport size from render-buffer size; do not use the physical canvas size for board layout.
*   Frame order: **0–5** gems in the order above, **6** bomb, **7** rocket right, **8** rocket up, **9** coin, **10–11** empty. Center each sprite, preserve proportions, and keep its maximum extent at **208 pixels** (at least **24 pixels** transparent padding).
*   `background.png` is one opaque **1024 × 1024** tile, seamless horizontally and vertically. Preserve smooth joins; do not stitch or mirror quadrants. Check a repeated preview and the full-screen game.
*   Keep background HSV saturation below **0.58** so the existing wave shader excludes it. Retain the subtle sheen on pieces when changing their colors.
*   Increment `CACHE_NAME` in `docs/sw.js` after runtime art changes; match the page background and theme color in `docs/index.html` when changing the background base.

## Linting

This project uses [ESLint](https://eslint.org/) for maintaining code quality and consistency.

**Configuration:**
ESLint is configured via `eslint.config.js` at the project root.

**Running the Linter:**
Run all unit tests and lint checks from the project root:

```bash
npm test
npm run lint
```

## Gemini Added Memories
- The user prefers code change descriptions to be provided before the tool calls so they can be read during the approval process.
