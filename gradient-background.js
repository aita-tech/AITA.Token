// Animated Gradient Background for AITA Token
// Based on the GradientBlinds component from the desktop project
// Adapted for vanilla JavaScript and AITA brand colors

class GradientBackground {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            gradientColors: ["#1a1a1a", "#2a2a2a", "#28c76f", "#1ea854"],
            angle: 15,
            noise: 0.25,
            blindCount: 13,
            blindMinWidth: 50,
            spotlightRadius: 0.38,
            spotlightSoftness: 1.6,
            spotlightOpacity: 0.42,
            mouseDampening: 0.15,
            distortAmount: 0,
            shineDirection: "left",
            mixBlendMode: "overlay",
            ...options
        };
        
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.mesh = null;
        this.geometry = null;
        this.renderer = null;
        this.mouseTarget = [0, 0];
        this.lastTime = 0;
        this.rafId = null;
        this.isSupported = false;
        
        this.init();
    }
    
    init() {
        console.log('Starting gradient initialization...');
        try {
            this.setupWebGL();
            this.setupShaders();
            this.setupGeometry();
            this.setupEventListeners();
            this.startAnimation();
            this.isSupported = true;
            console.log('WebGL gradient initialized successfully');
        } catch (error) {
            console.warn('WebGL not supported, falling back to CSS gradient:', error);
            this.fallbackToCSS();
        }
    }
    
    setupWebGL() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.display = 'block';
        this.canvas.style.opacity = '0.4';
        
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.container.appendChild(this.canvas);
        this.resize();
        
        // Add class to body to indicate gradient is active
        document.body.classList.add('gradient-active');
    }
    
    setupShaders() {
        const vertexShader = `
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 vUv;
            
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        const fragmentShader = `
            #ifdef GL_ES
            precision mediump float;
            #endif
            
            uniform vec3 iResolution;
            uniform vec2 iMouse;
            uniform float iTime;
            uniform float uAngle;
            uniform float uNoise;
            uniform float uBlindCount;
            uniform float uSpotlightRadius;
            uniform float uSpotlightSoftness;
            uniform float uSpotlightOpacity;
            uniform float uMirror;
            uniform float uDistort;
            uniform float uShineFlip;
            uniform vec3 uColor0;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            uniform int uColorCount;
            
            varying vec2 vUv;
            
            float rand(vec2 co) {
                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            vec2 rotate2D(vec2 p, float a) {
                float c = cos(a);
                float s = sin(a);
                return mat2(c, -s, s, c) * p;
            }
            
            vec3 getGradientColor(float t) {
                float tt = clamp(t, 0.0, 1.0);
                int count = uColorCount;
                if (count < 2) count = 2;
                float scaled = tt * float(count - 1);
                float seg = floor(scaled);
                float f = fract(scaled);
                
                if (seg < 1.0) return mix(uColor0, uColor1, f);
                if (seg < 2.0 && count > 2) return mix(uColor1, uColor2, f);
                if (seg < 3.0 && count > 3) return mix(uColor2, uColor3, f);
                if (count > 3) return uColor3;
                if (count > 2) return uColor2;
                return uColor1;
            }
            
            void main() {
                vec2 uv0 = vUv;
                float aspect = iResolution.x / iResolution.y;
                vec2 p = uv0 * 2.0 - 1.0;
                p.x *= aspect;
                vec2 pr = rotate2D(p, uAngle);
                pr.x /= aspect;
                vec2 uv = pr * 0.5 + 0.5;
                
                vec2 uvMod = uv;
                if (uDistort > 0.0) {
                    float a = uvMod.y * 6.0;
                    float b = uvMod.x * 6.0;
                    float w = 0.01 * uDistort;
                    uvMod.x += sin(a) * w;
                    uvMod.y += cos(b) * w;
                }
                
                float t = uvMod.x;
                if (uMirror > 0.5) {
                    t = 1.0 - abs(1.0 - 2.0 * fract(t));
                }
                vec3 base = getGradientColor(t);
                
                // Glow effect
                float glowWave = sin(iTime * 0.8 + uv0.y * 3.14159) * 0.5 + 0.5;
                float glowPosition = sin(iTime * 0.3) * 0.5 + 0.5;
                float glowDistance = abs(uv0.y - glowPosition);
                float glowIntensity = 1.0 - smoothstep(0.0, 0.25, glowDistance);
                vec3 glowColor = base * (1.0 + glowIntensity * 0.01 * glowWave);
                
                // Spotlight effect
                vec2 offset = vec2(iMouse.x/iResolution.x, iMouse.y/iResolution.y);
                float d = length(uv0 - offset);
                float r = max(uSpotlightRadius, 1e-4);
                float dn = d / r;
                float spot = (1.0 - 2.0 * pow(dn, uSpotlightSoftness)) * uSpotlightOpacity;
                vec3 cir = vec3(spot);
                
                // Blinds effect
                float stripe = fract(uvMod.x * max(uBlindCount, 1.0));
                if (uShineFlip > 0.5) stripe = 1.0 - stripe;
                vec3 ran = vec3(stripe);
                
                vec3 col = cir + glowColor - ran;
                col += (rand(gl_FragCoord.xy + iTime) - 0.5) * uNoise;
                
                gl_FragColor = vec4(col, 1.0);
            }
        `;
        
        const vertexShaderObj = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertexShaderObj, vertexShader);
        this.gl.compileShader(vertexShaderObj);
        
        const fragmentShaderObj = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragmentShaderObj, fragmentShader);
        this.gl.compileShader(fragmentShaderObj);
        
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShaderObj);
        this.gl.attachShader(this.program, fragmentShaderObj);
        this.gl.linkProgram(this.program);
        
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            throw new Error('Shader program failed to link');
        }
        
        this.setupUniforms();
    }
    
    setupUniforms() {
        this.gl.useProgram(this.program);
        
        // Convert hex colors to RGB
        const colors = this.options.gradientColors.map(hex => {
            const c = hex.replace('#', '').padEnd(6, '0');
            return [
                parseInt(c.slice(0, 2), 16) / 255,
                parseInt(c.slice(2, 4), 16) / 255,
                parseInt(c.slice(4, 6), 16) / 255
            ];
        });
        
        // Set uniforms
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, 'iResolution'), 
            this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, 1);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program, 'iMouse'), 
            this.gl.drawingBufferWidth / 2, this.gl.drawingBufferHeight / 2);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'iTime'), 0);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uAngle'), 
            (this.options.angle * Math.PI) / 180);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uNoise'), this.options.noise);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uBlindCount'), 
            Math.max(1, this.options.blindCount));
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpotlightRadius'), 
            this.options.spotlightRadius);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpotlightSoftness'), 
            this.options.spotlightSoftness);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpotlightOpacity'), 
            this.options.spotlightOpacity);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uMirror'), 0);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uDistort'), 
            this.options.distortAmount);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uShineFlip'), 
            this.options.shineDirection === "right" ? 1 : 0);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, 'uColor0'), 
            colors[0][0], colors[0][1], colors[0][2]);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, 'uColor1'), 
            colors[1][0], colors[1][1], colors[1][2]);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, 'uColor2'), 
            colors[2][0], colors[2][1], colors[2][2]);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, 'uColor3'), 
            colors[3][0], colors[3][1], colors[3][2]);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uColorCount'), 
            Math.min(colors.length, 4));
    }
    
    setupGeometry() {
        const vertices = new Float32Array([
            -1, -1, 0, 0,
             1, -1, 1, 0,
            -1,  1, 0, 1,
             1,  1, 1, 1
        ]);
        
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        const uvLocation = this.gl.getAttribLocation(this.program, 'uv');
        
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 16, 0);
        
        this.gl.enableVertexAttribArray(uvLocation);
        this.gl.vertexAttribPointer(uvLocation, 2, this.gl.FLOAT, false, 16, 8);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Resize observer for better performance
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => this.resize());
            resizeObserver.observe(this.container);
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.gl.drawingBufferWidth / rect.width);
        const y = (e.clientY - rect.top) * (this.gl.drawingBufferHeight / rect.height);
        
        this.mouseTarget[0] = x;
        this.mouseTarget[1] = y;
    }
    
    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, 'iResolution'), 
            this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, 1);
        
        // Update blind count based on width
        if (this.options.blindMinWidth && this.options.blindMinWidth > 0) {
            const maxByMinWidth = Math.max(1, Math.floor(rect.width / this.options.blindMinWidth));
            const effective = this.options.blindCount ? 
                Math.min(this.options.blindCount, maxByMinWidth) : maxByMinWidth;
            this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uBlindCount'), 
                Math.max(1, effective));
        }
        
        // Center mouse initially
        const cx = this.gl.drawingBufferWidth / 2;
        const cy = this.gl.drawingBufferHeight / 2;
        this.mouseTarget = [cx, cy];
    }
    
    startAnimation() {
        const animate = (time) => {
            this.rafId = requestAnimationFrame(animate);
            
            this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'iTime'), time * 0.001);
            this.gl.uniform2f(this.gl.getUniformLocation(this.program, 'iMouse'), 
                this.mouseTarget[0], this.mouseTarget[1]);
            
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        };
        
        this.rafId = requestAnimationFrame(animate);
    }
    
    fallbackToCSS() {
        console.log('Creating CSS gradient fallback...');
        // Create CSS gradient fallback
        const gradientDiv = document.createElement('div');
        gradientDiv.className = 'gradient-fallback';
        gradientDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background: linear-gradient(135deg, #1a1a1a 0%, #2a1a3a 25%, #8524d8 50%, #1f1f1f 100%);
            background-size: 400% 400%;
            animation: gradientShift 12s ease infinite;
        `;
        
        // Add animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        `;
        document.head.appendChild(style);
        
        this.container.appendChild(gradientDiv);
        this.isSupported = false;
        
        // Add class to body to indicate fallback is active
        document.body.classList.add('gradient-active');
        console.log('CSS gradient fallback created');
    }
    
    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        if (this.gl && this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing gradient background...');
    const body = document.body;
    const gradient = new GradientBackground(body, {
        gradientColors: ["#1a1a1a", "#2a1a3a", "#8524d8", "#1f1f1f"],
        angle: 15,
        noise: 0.1,
        blindCount: 8,
        spotlightRadius: 0.6,
        spotlightSoftness: 2.0,
        spotlightOpacity: 0.15,
        mouseDampening: 0.15,
        shineDirection: "left",
        mixBlendMode: "normal"
    });
    
    console.log('Gradient initialized:', gradient);
    // Make gradient globally accessible for debugging
    window.aitaGradient = gradient;
});
