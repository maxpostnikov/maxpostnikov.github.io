/**
 * WavePipeline
 * 
 * A custom Phaser PostFX Pipeline that creates a diagonal "glare" or "sheen" effect 
 * passing across the game screen.
 * 
 * Key Features:
 * - Constant 45-degree angle regardless of aspect ratio.
 * - Constant physical width (in pixels) regardless of window size.
 * - Constant physical speed (pixels/sec) regardless of window size.
 * - Robust against window resizing (uses absolute time-based positioning).
 * - "Smart" glare that highlights bright objects (gems) while ignoring the dark background.
 */
export default class WavePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game: game,
            name: "WavePipeline",
            fragShader: `
                precision mediump float;
                uniform sampler2D uMainSampler;
                uniform vec2 uResolution;   // Screen resolution in pixels (width, height)
                uniform float uWaveCenter;  // Current position of the wave center in "diagonal pixels"
                uniform float uActive;      // 1.0 if the effect is active, 0.0 otherwise
                varying vec2 outTexCoord;

                void main(void) {
                    vec2 uv = outTexCoord;
                    
                    // --- Coordinate System Transformation ---
                    // Convert normalized UV coordinates (0.0 to 1.0) to absolute screen pixels.
                    // We assume a Top-Left origin for visual elements.
                    vec2 px = uv * uResolution;
                    
                    // Calculate the "diagonal value" for the current pixel.
                    // We use the distance from the TOP edge for stability.
                    // diagonal = x + y_from_top
                    float y_from_top = uResolution.y - px.y;
                    float diagonal = px.x + y_from_top;
                    
                    vec4 color = texture2D(uMainSampler, uv);

                    if (uActive > 0.5) {
                        // --- Wave Shape Calculation ---
                        // Calculate distance from the current pixel's diagonal value to the wave center.
                        float dist = abs(diagonal - uWaveCenter);
                        
                        // Define the half-width of the wave in pixels.
                        float width = 150.0;
                        
                        if (dist < width) {
                            // Calculate base intensity: 1.0 at center, fading to 0.0 at edges.
                            float intensity = smoothstep(width, 0.0, dist);
                            
                            // --- Smart Glare Logic ---
                            // Calculate the brightness (luminance) of the underlying pixel.
                            // Standard rec.601 luma coefficients.
                            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                            
                            // Create a background mask.
                            // We only want the glare to appear on brighter objects (gems).
                            // smoothstep(0.4, 0.7, luminance) means:
                            // - Luminance < 0.4: Mask is 0 (No glare on dark background)
                            // - Luminance > 0.7: Mask is 1 (Full glare on bright spots)
                            // - In between: Smooth transition
                            float bgMask = smoothstep(0.4, 0.7, luminance);
                            
                            // Combine all factors:
                            // - Pure White (vec3(1.0))
                            // - Wave Shape (intensity)
                            // - Underlying Brightness (luminance) - makes glare look "integrated"
                            // - Background Mask (bgMask) - prevents washing out the background
                            // - Global Multiplier (0.3) - controls overall brightness
                            vec3 glare = vec3(1.0, 1.0, 1.0) * intensity * luminance * bgMask * 0.3;
                            
                            // Additive blending for the glare effect
                            color.rgb += glare;
                        }
                    }
                    
                    gl_FragColor = color;
                }
            `
        });

        this.wavePos = -2000.0; // Safe initial off-screen value
        this.PAUSE_DELAY = 3000; // Time in ms to wait between waves
        
        // State Machine: 'WAITING' -> 'RUNNING' -> 'WAITING'
        this.state = "WAITING"; 
        this.timer = 0;
        this.startTime = 0;
    }

    onPreRender() {
        const width = this.game.renderer.width;
        const height = this.game.renderer.height;
        const now = this.game.loop.now;

        // Constant speed: 0.6 pixels per millisecond (~600 pixels/second)
        const speed = 0.6;
        const buffer = 200.0;
        
        // Start position is fixed to ensure stability relative to Top-Left
        const startVal = -buffer;
        // End position depends on screen size to fully clear the view
        const endVal = width + height + buffer;

        if (this.state === "WAITING") {
            // Initialize timer if this is the first frame of waiting
            if (this.timer === 0) this.timer = now;
            
            // Check if pause duration has elapsed
            if (now - this.timer > this.PAUSE_DELAY) {
                this.state = "RUNNING";
                this.startTime = now;
            }
        } 
        
        if (this.state === "RUNNING") {
            const elapsed = now - this.startTime;
            
            // Calculate absolute position: Start + (Time * Speed)
            this.wavePos = startVal + (elapsed * speed);

            // Check if the wave has passed the current end boundary
            if (this.wavePos > endVal) {
                this.state = "WAITING";
                this.timer = now; // Reset timer for the next wait period
            }
        }

        // Update Shader Uniforms
        this.set2f("uResolution", width, height);
        this.set1f("uWaveCenter", this.wavePos);
        this.set1f("uActive", this.state === "RUNNING" ? 1.0 : 0.0);
    }
}
