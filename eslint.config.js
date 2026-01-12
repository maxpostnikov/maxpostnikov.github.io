// eslint.config.js
import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021, // Adjust based on your project's target ECMAScript version
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Add Phaser specific globals if not imported (e.g., if using Phaser CE or older practices)
        Phaser: "readonly", // Assuming Phaser is a global
        // TWEEN: "readonly" // If you use TweenMax/Lite directly
      }
    },
    rules: {
      // Your custom rules here
      "no-unused-vars": "warn", // Warn about unused variables
      "indent": ["error", 4], // Enforce 4-space indentation
      "linebreak-style": ["error", "unix"],
      "quotes": ["error", "double"],
      "semi": ["error", "always"]
    }
  }
];
