export default class ExplosionPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game: game,
            name: "ExplosionPipeline",
            fragShader: `
                precision mediump float;
                uniform sampler2D uMainSampler;
                uniform vec2 uResolution; // Screen resolution in pixels
                uniform vec2 uCenter;     // Explosion center in pixels
                uniform float uTime;      // 0.0 to 1.0
                uniform float uActive;    // 0.0 = off, 1.0 = on
                varying vec2 outTexCoord;

                void main(void) {
                    vec2 uv = outTexCoord;
                    
                    if (uActive < 0.5) {
                        gl_FragColor = texture2D(uMainSampler, uv);
                        return;
                    }
                    
                    // Convert current pixel UV to screen pixel coordinates
                    vec2 fragCoord = uv * uResolution;

                    // Convert uCenter from Top-Left (Phaser) to Bottom-Left (WebGL)
                    vec2 center = vec2(uCenter.x, uResolution.y - uCenter.y);
                    
                    // Calculate distance in pixels
                    float dist = distance(fragCoord, center);

                    // --- Ripple Effect ---
                    // wave: sin(distance * freq - time * speed)
                    // Freq: controls ring spacing (smaller = wider rings)
                    // Speed: controls expansion speed
                    float wave = sin(dist * 0.06 - uTime * 20.0);
                    
                    // Mask/Attenuation
                    // 1. Fade out over time (global)
                    float timeFade = 1.0 - uTime;
                    
                    // 2. Fade out with distance from center (ripples die out)
                    float distFade = exp(-dist * 0.005);
                    
                    // 3. Expanding "front" mask to hide inner ripples after they pass? 
                    // Or just let them ripple out. Let's dampen the center as time goes on.
                    
                    // Distortion Vector
                    vec2 dir = normalize(fragCoord - center);
                    
                    // Strength decreases with time
                    float strength = 0.015 * wave * distFade * timeFade;
                    
                    vec2 offset = dir * strength;
                    
                    // Sample texture with offset
                    vec4 color = texture2D(uMainSampler, uv - offset);
                    
                    // --- Smooth Central Splash (Glare) ---
                    // Using an exponential falloff for a soft, natural glow
                    float splashSpread = 60.0;
                    float splash = exp(-(dist * dist) / (2.0 * splashSpread * splashSpread));
                    splash *= timeFade; // Fades out as the ripple expands
                    
                    // Add warm bright splash to the center
                    color.rgb += vec3(1.0, 0.9, 0.6) * splash * 1.2;
                    
                    // --- Smooth Ripple Highlights ---
                    // Instead of a sharp smoothstep, use a smoother power-based peak
                    float rippleHighlight = max(0.0, wave);
                    rippleHighlight = pow(rippleHighlight, 2.0); // Sharpen the peak but keep it smooth
                    rippleHighlight *= distFade * timeFade * 0.5;
                    
                    color.rgb += vec3(0.8, 0.9, 1.0) * rippleHighlight;
                    
                    gl_FragColor = color;
                }
            `
        });
    }

    onBoot() {
        this.set1f("uActive", 0.0);
    }

    onPreRender() {
        if (this.game.renderer) {
            this.set2f("uResolution", this.game.renderer.width, this.game.renderer.height);
        }
    }
}
