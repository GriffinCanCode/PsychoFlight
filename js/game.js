// --- Main Game Module ---
import audioSystem from './modules/audio.js';
import weaponsSystem from './modules/weapons.js';
import effectsSystem from './modules/effects.js';
import playerSystem from './modules/player.js';
import targetsSystem from './modules/targets.js';
import bossSystem from './modules/boss.js';
import evolutionUI from './modules/evolution_ui.js';
import worldSystem from './modules/world.js';
import enemiesSystem from './modules/enemies.js';
import hudSystem from './modules/hud.js';

// Make certain variables global for compatibility with the original monolithic approach
window.scene = null;
window.camera = null;
window.renderer = null;
window.plane = null;
window.targetSpawnRadius = 40;
window.targetSpawnDistance = -150;

// Game constants
const SCORE_THRESHOLD_SPREAD = 1500;
const SCORE_THRESHOLD_BEAM = 4000;
const SCORE_THRESHOLD_BOSS = 7500;
const MAX_LOCK_DISTANCE = 300;
const AIM_ASSIST_ANGLE = Math.PI / 6; // 30 degrees cone (increased from 15 degrees)
const AIM_ASSIST_STRENGTH = 0.25; // Increased from 0.1 for stronger aim correction
const AIM_ASSIST_MAX_DISTANCE = 200; // Maximum distance for aim assist to apply
const ACCELERATION_STREAK_INTERVAL = 70; // ms between light streak generation - more frequent
const WARP_EFFECT_INTERVAL = 25; // ms between warp line generation - even more frequent
const DIMENSION_WARP_INTENSITY = 0.7; // Slightly reduced for less blinding effect

// Game state
let gameStartTime = Date.now();
let isPointerLocked = false;
let keys = {};
let isFiring = false;
let lockedTarget = null;
let aimDirection = new THREE.Vector3(0, 0, -1); // Initialize aim direction
let lastAccelerationStreakTime = 0;
let lastWarpEffectTime = 0;
let weaponEnergy = 100; // Full energy
let lastWeaponEnergyRecharge = Date.now(); // For recharging weapon energy
let energyRechargeRate = 10; // Energy points per second
let energyUseRate = 30; // Energy points per second while firing
let fovTransition = {
    current: 75, // Default FOV
    target: 75,
    speed: 0.2 // Transition speed - increased for more responsive FOV change
};

// HUD overlay effect for warp
let warpOverlay = null;
let colorDistortion = {
    active: false,
    intensity: 0,
    targetIntensity: 0
};

// Camera
const cameraOffset = new THREE.Vector3(0, 1.8, 8);

// Clock
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster(); // Reusable raycaster for locking

// Initialize game
async function initGame() {
    try {
        // Show loading message with start button
        const startMessage = document.createElement('div');
        startMessage.style.position = 'fixed';
        startMessage.style.top = '50%';
        startMessage.style.left = '50%';
        startMessage.style.transform = 'translate(-50%, -50%)';
        startMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        startMessage.style.color = 'white';
        startMessage.style.padding = '20px';
        startMessage.style.borderRadius = '10px';
        startMessage.style.fontFamily = 'Arial, sans-serif';
        startMessage.style.textAlign = 'center';
        startMessage.style.zIndex = '1000';
        startMessage.innerHTML = `
            <div style="margin-bottom: 20px;">Click to Start Game</div>
            <button style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Start
            </button>
        `;
        document.body.appendChild(startMessage);

        // Wait for user interaction
        await new Promise(resolve => {
            startMessage.querySelector('button').addEventListener('click', () => {
                startMessage.remove();
                resolve();
            });
        });

        // Initialize UI systems first
        console.log("Initializing UI systems...");
        hudSystem.init();
        evolutionUI.init();
        console.log("UI systems initialized");

        // Initialize audio and wait for it
        console.log("Initializing audio system...");
        const audioReady = await audioSystem.initAudio();
        if (!audioReady) {
            throw new Error("Audio system initialization failed");
        }
        console.log("Audio system initialized successfully");

        // Initialize THREE.js scene
        console.log("Initializing scene...");
        window.scene = new THREE.Scene();
        
        // Initialize camera with proper position and rotation
        window.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        window.camera.position.copy(cameraOffset);
        window.camera.lookAt(new THREE.Vector3(0, 0, -1));
        
        // Initialize renderer with proper settings
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error("Could not find game canvas");
        }
        
        window.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        // Set renderer properties
        window.renderer.setSize(window.innerWidth, window.innerHeight);
        window.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        window.renderer.setClearColor(0x000000);
        window.renderer.shadowMap.enabled = true;
        window.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Initialize world (starfield and lighting)
        console.log("Initializing world...");
        worldSystem.init(window.scene);
        console.log("World initialized successfully");
        
        // Initialize player
        console.log("Creating player plane...");
        window.plane = playerSystem.createPlane(window.scene);
        if (!window.plane) {
            throw new Error("Failed to create player plane");
        }
        console.log("Player plane created successfully");
        
        // Setup input listeners
        setupInputListeners();
        
        // Setup warp overlay
        createWarpOverlay();
        
        // Hide loading message
        hideMessage();
        
        // Start animation loop
        console.log("Starting animation loop...");
        animate();
        
        // Start background music after a short delay
        setTimeout(() => {
            if (audioSystem.isAudioReady()) {
                audioSystem.startBackgroundMusic();
            } else {
                console.warn("Audio not ready for background music");
            }
        }, 1000);
        
    } catch (error) {
        console.error("Error during game initialization:", error);
        showError("Failed to initialize game. Please refresh the page. Error: " + error.message);
    }
}

function createWarpOverlay() {
    // Create warp overlay div
    warpOverlay = document.createElement('div');
    warpOverlay.id = 'warpOverlay';
    warpOverlay.style.position = 'fixed';
    warpOverlay.style.top = '0';
    warpOverlay.style.left = '0';
    warpOverlay.style.width = '100%';
    warpOverlay.style.height = '100%';
    warpOverlay.style.pointerEvents = 'none';
    warpOverlay.style.zIndex = '5'; // Above game canvas but below UI
    warpOverlay.style.transition = 'opacity 0.5s ease, background 0.5s ease'; // Smoother transitions
    warpOverlay.style.background = 'radial-gradient(ellipse at center, transparent 30%, rgba(0, 60, 100, 0) 70%)';
    warpOverlay.style.opacity = '0';
    warpOverlay.style.mixBlendMode = 'screen';
    
    // Create a central vanishing point with animated rings
    const vortexContainer = document.createElement('div');
    vortexContainer.id = 'vortexContainer';
    vortexContainer.style.position = 'absolute';
    vortexContainer.style.top = '50%';
    vortexContainer.style.left = '50%';
    vortexContainer.style.transform = 'translate(-50%, -50%)';
    vortexContainer.style.width = '100%';
    vortexContainer.style.height = '100%';
    vortexContainer.style.opacity = '0';
    vortexContainer.style.perspective = '1200px'; // Higher perspective for stronger depth effect
    vortexContainer.style.perspectiveOrigin = 'center';
    vortexContainer.style.transformStyle = 'preserve-3d';
    vortexContainer.style.overflow = 'hidden';
    
    // Create animated tunnel rings - fewer rings with better animation
    for (let i = 0; i < 5; i++) {
        const ring = document.createElement('div');
        ring.className = 'warp-ring';
        ring.style.position = 'absolute';
        ring.style.top = '50%';
        ring.style.left = '50%';
        ring.style.transform = `translate(-50%, -50%) scale(${i * 0.1 + 0.1})`;
        ring.style.width = '40px'; // Larger rings for better tunnel effect
        ring.style.height = '40px';
        ring.style.borderRadius = '50%';
        ring.style.border = '1px solid rgba(100, 160, 255, 0.4)'; // More subtle ring color
        ring.style.boxShadow = '0 0 8px rgba(80, 160, 255, 0.4)'; // Softer glow
        vortexContainer.appendChild(ring);
    }
    
    warpOverlay.appendChild(vortexContainer);
    
    // Create blur vignette for tunnel effect - blurs the sides of the screen
    const blurVignette = document.createElement('div');
    blurVignette.id = 'blurVignette';
    blurVignette.style.position = 'absolute';
    blurVignette.style.top = '0';
    blurVignette.style.left = '0';
    blurVignette.style.width = '100%';
    blurVignette.style.height = '100%';
    blurVignette.style.opacity = '0';
    blurVignette.style.transition = 'opacity 0.5s ease';
    blurVignette.style.background = 'radial-gradient(circle at center, transparent 20%, rgba(0, 30, 80, 0.3) 60%, rgba(0, 20, 60, 0.5) 100%)';
    blurVignette.style.backdropFilter = 'blur(4px)';
    blurVignette.style.WebkitBackdropFilter = 'blur(4px)';
    blurVignette.style.mixBlendMode = 'normal';
    blurVignette.style.pointerEvents = 'none';
    warpOverlay.appendChild(blurVignette);
    
    // Create radial warp line container
    const lineContainer = document.createElement('div');
    lineContainer.style.position = 'absolute';
    lineContainer.style.top = '0';
    lineContainer.style.left = '0';
    lineContainer.style.width = '100%';
    lineContainer.style.height = '100%';
    lineContainer.style.overflow = 'hidden';
    lineContainer.style.opacity = '0';
    lineContainer.id = 'warpLines';
    
    // Create dynamic radial warp lines - Star Trek style with better distribution
    // Create fewer lines for less visual clutter
    for (let i = 0; i < 60; i++) {
        // Use golden ratio distribution for more natural-looking pattern
        const golden_angle = Math.PI * (3 - Math.sqrt(5));
        const angle = i * golden_angle;
        
        // Calculate distance from center with edge bias
        // Concentrate more lines toward the edge of the screen to create tunnel effect
        // Create more empty space in the center
        const minRadius = 30; // Keep center more clear
        const radius = minRadius + (Math.sqrt(i / 60) * 100);
        
        const line = document.createElement('div');
        line.className = 'warp-line';
        line.style.position = 'absolute';
        line.style.top = '50%';
        line.style.left = '50%';
        
        // Calculate position based on polar coordinates
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        // Vary line lengths - shorter lines to reduce dominance
        const lengthPercent = 30 + Math.random() * 20; // 30-50% length (shorter)
        
        // Calculate line angle in degrees
        const lineAngleDeg = (angle * 180 / Math.PI);
        
        line.style.transformOrigin = 'left center';
        line.style.width = `${lengthPercent}%`; 
        line.style.height = '1px';
        
        // Use subtler gradient that fades more towards the end
        line.style.background = `linear-gradient(90deg, 
            rgba(255, 255, 255, 0.5), 
            rgba(180, 220, 255, 0.3) 40%, 
            rgba(100, 180, 255, 0.0) 100%)`; 
        
        // Position and rotate the line
        line.style.transform = `translate(${x}px, ${y}px) rotate(${lineAngleDeg}deg)`;
        
        // Lower opacity for subtlety
        line.style.opacity = Math.random() * 0.25 + 0.15; // 0.15-0.4 opacity
        
        lineContainer.appendChild(line);
    }
    
    warpOverlay.appendChild(lineContainer);
    document.body.appendChild(warpOverlay);
    
    // Create vignette effect for tunnel-like visualization
    const vignette = document.createElement('div');
    vignette.id = 'vignette';
    vignette.style.position = 'fixed';
    vignette.style.top = '0';
    vignette.style.left = '0';
    vignette.style.width = '100%';
    vignette.style.height = '100%';
    vignette.style.pointerEvents = 'none';
    vignette.style.zIndex = '3';
    vignette.style.opacity = '0';
    vignette.style.background = 'radial-gradient(ellipse at center, transparent 60%, rgba(0, 20, 50, 0.5) 100%)'; // Wider clear area
    document.body.appendChild(vignette);
    
    // Create color distortion shader effect (similar to Star Trek warp)
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes hueRotate {
            0% { filter: hue-rotate(0deg); }
            50% { filter: hue-rotate(15deg); } /* Even more subtle rotation */
            100% { filter: hue-rotate(0deg); }
        }
        
        @keyframes warpZoom {
            0% { transform: translate(-50%, -50%) scale(0.1); opacity: 0.4; }
            100% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
        }
        
        .warp-ring {
            animation: warpZoom 4s infinite linear; /* Slower animation for more realistic effect */
            animation-delay: calc(var(--i) * 0.6s);
        }
        
        @keyframes warpLineStretch {
            0% { transform-origin: left center; width: 0%; opacity: 0; }
            20% { opacity: 0.5; }
            100% { width: 120%; opacity: 0; } /* Less stretching for subtlety */
        }
    `;
    document.head.appendChild(style);
    
    // Apply the animation delay to each ring
    const rings = document.querySelectorAll('.warp-ring');
    rings.forEach((ring, i) => {
        ring.style.setProperty('--i', i);
        ring.style.animationDelay = `${i * 0.6}s`; // Longer delays for smoother motion
    });
}

function updateWarpOverlay(isAccelerating, deltaTime) {
    if (!warpOverlay) return;
    
    // Lerp the intensity for smoother transitions (existing code)
    colorDistortion.targetIntensity = isAccelerating ? DIMENSION_WARP_INTENSITY : 0;
    colorDistortion.intensity = THREE.MathUtils.lerp(
        colorDistortion.intensity, 
        colorDistortion.targetIntensity, 
        Math.min(1, deltaTime * 5)
    );
    
    // Update warp overlay effects based on acceleration
    const warpOpacity = Math.min(1, colorDistortion.intensity * 1.2);
    
    // Use the HUD system to manage warp effect visuals
    hudSystem.updateWarpEffect(warpOpacity);
    
    // Keep the rest of the existing code for other warp effects not in the HUD
    if (warpOpacity > 0.05) {
        warpOverlay.style.background = `radial-gradient(ellipse at center, 
            rgba(0, 70, 120, ${warpOpacity * 0.1}) 50%, 
            rgba(10, 40, 100, ${warpOpacity * 0.15}) 75%, 
            rgba(0, 20, 60, ${warpOpacity * 0.2}) 100%)`; // Subtle gradient
    } else {
        warpOverlay.style.background = 'radial-gradient(ellipse at center, transparent 50%, rgba(0, 20, 50, 0) 100%)';
    }
    
    // Update scanlines with very subtle intensity
    const scanlines = document.getElementById('scanlines');
    if (scanlines) {
        scanlines.style.opacity = (warpOpacity * 0.1).toString(); // Almost invisible scanlines
    }
    
    // Update blur vignette for tunnel-like vision
    const blurVignette = document.getElementById('blurVignette');
    if (blurVignette) {
        blurVignette.style.opacity = (warpOpacity * 0.8).toString(); // Strong blur effect
    }
    
    // Update vignette effect - smoother application
    const vignette = document.getElementById('vignette');
    if (vignette) {
        vignette.style.opacity = (warpOpacity * 0.5).toString(); // Less intense vignette
    }
    
    // Update vortex container (animated rings)
    const vortex = document.getElementById('vortexContainer');
    if (vortex) {
        vortex.style.opacity = warpOpacity.toString();
    }
    
    // Update warp line effect - smoother activation
    const lines = document.getElementById('warpLines');
    if (lines) {
        lines.style.opacity = warpOpacity.toString();
        
        // Animate the lines when accelerating
        if (isAccelerating && colorDistortion.intensity > 0.3) {
            // Only update animation when sufficiently accelerating
            const warpLines = lines.querySelectorAll('.warp-line');
            warpLines.forEach((line, index) => {
                if (!line.style.animation || line.style.animation === 'none') {
                    // Variable animation speeds based on position from center
                    // This creates a more natural, dynamic tunnel effect
                    const transform = window.getComputedStyle(line).transform;
                    const matrix = new DOMMatrix(transform);
                    const distance = Math.sqrt(matrix.m41*matrix.m41 + matrix.m42*matrix.m42);
                    
                    // Faster animations for lines further from center
                    const distanceFactor = Math.min(1.5, distance / 100); // 1.0-1.5 range
                    const duration = (Math.random() * 0.4 + 0.6) / distanceFactor; // 0.6-1.0s / factor
                    
                    line.style.animation = `warpLineStretch ${duration}s infinite linear`;
                    // Staggered delays for more natural flow
                    line.style.animationDelay = `${Math.random() * 1.2}s`;
                }
            });
        } else if (colorDistortion.intensity < 0.1) {
            // Stop animations when slowing down
            const warpLines = lines.querySelectorAll('.warp-line');
            warpLines.forEach(line => {
                line.style.animation = 'none';
            });
        }
    }
    
    // Fade crosshair during acceleration
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        // Completely fade out crosshair when accelerating
        const crosshairOpacity = isAccelerating ? 
            Math.max(0, 1 - colorDistortion.intensity * 5) : // Fade to 0 opacity much faster
            1; // Full opacity when not accelerating
        crosshair.style.opacity = crosshairOpacity.toString();
    }
    
    // Apply color distortion to game canvas
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        if (colorDistortion.intensity > 0.05) {
            // Very subtle color effects
            const hueRotation = 8 * colorDistortion.intensity; // Minimal rotation
            const saturation = 1 + colorDistortion.intensity * 0.5; // Less saturation boost
            const brightness = 1 + colorDistortion.intensity * 0.15; // Subtle brightness boost
            const contrast = 1 + colorDistortion.intensity * 0.1; // Minimal contrast
            
            canvas.style.filter = `hue-rotate(${hueRotation}deg) saturate(${saturation}) brightness(${brightness}) contrast(${contrast})`;
            
            if (colorDistortion.intensity > 0.6 && !colorDistortion.active) { // Higher threshold
                colorDistortion.active = true;
                canvas.style.animation = 'hueRotate 2s infinite'; // Slower animation
            }
        } else {
            colorDistortion.active = false;
            canvas.style.filter = 'none';
            canvas.style.animation = 'none';
        }
    }
}

function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.id = 'gameMessage';
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '20px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.fontFamily = 'Arial, sans-serif';
    messageDiv.style.zIndex = '1000';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
}

function hideMessage() {
    const messageDiv = document.getElementById('gameMessage');
    if (messageDiv) {
        messageDiv.remove();
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'gameError';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.borderRadius = '10px';
    errorDiv.style.fontFamily = 'Arial, sans-serif';
    errorDiv.style.zIndex = '1000';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
}

function updateBackground(audioLevel) {
    // Use worldSystem to update the world instead of direct updates here
    worldSystem.update(
        clock.getDelta(), 
        audioLevel, 
        window.renderer, 
        gameStartTime,
        hudSystem.getScore(),
        targetsSystem,
        playerSystem
    );
}

function updateCamera() {
    const d = cameraOffset.clone();
    d.applyQuaternion(window.plane.quaternion);
    d.add(window.plane.position);
    window.camera.position.lerp(d, 0.15);
    
    const l = new THREE.Vector3(0, 0.5, -15);
    const t = l.clone();
    t.applyQuaternion(window.plane.quaternion);
    t.add(window.plane.position);
    window.camera.lookAt(t);
    
    // Update FOV with smooth transition
    fovTransition.current = THREE.MathUtils.lerp(fovTransition.current, fovTransition.target, fovTransition.speed);
    window.camera.fov = fovTransition.current;
    window.camera.updateProjectionMatrix();
}

function setupInputListeners() {
    const canvas = document.getElementById('gameCanvas');
    
    // Initialize keys object
    keys = {};
    
    // Keyboard event listeners
    document.addEventListener('keydown', (e) => {
        // Don't process keyboard input when evolution menu is open
        if (evolutionUI.isOpen()) return;
        
        keys[e.key.toLowerCase()] = true;
        
        // Handle special keys
        switch(e.key.toLowerCase()) {
            case ' ':
                playerSystem.setIsFlying(true);
                break;
            case 'g':
                isFiring = true;
                break;
            case 'x':
                if (playerSystem.startShift()) {
                    hudSystem.updateShiftStatus(true);
                }
                break;
            case 't':
                if (playerSystem.startTeleport()) {
                    hudSystem.updateTeleportStatus(true);
                }
                break;
            case 'e':
                evolutionUI.toggleEvolutionMenu();
                break;
            case 'shift':
                playerSystem.setIsAccelerating(true);
                // Set target FOV for acceleration
                fovTransition.target = playerSystem.getAcceleratedFOV();
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
        
        // Handle special key releases
        switch(e.key.toLowerCase()) {
            case ' ':
                playerSystem.setIsFlying(false);
                break;
            case 'g':
                isFiring = false;
                break;
            case 'shift':
                playerSystem.setIsAccelerating(false);
                // Reset FOV to normal
                fovTransition.target = playerSystem.getNormalFOV();
                break;
        }
    });
    
    canvas.addEventListener('click', () => {
        // Don't process clicks when evolution menu is open
        if (evolutionUI.isOpen()) return;
        
        if (!audioSystem.isAudioReady()) {
            audioSystem.initAudio().then(ready => {
                if (ready) console.log("Audio Context Ready");
            }).catch(e => console.error("Tone.js start failed:", e));
        }
        
        if (!isPointerLocked) {
            canvas.requestPointerLock?.();
        } else {
            // If pointer is locked, handle target locking/unlocking
            if (lockedTarget) {
                console.log("Target unlocked manually."); // Log unlock
                // Unhighlight the locked target
                hudSystem.highlightTarget(lockedTarget, false, window.plane.position);
                lockedTarget = null; 
            } else {
                findAndLockTarget();
            }
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === canvas;
        // Update crosshair visibility using UI module
        hudSystem.updateCrosshair(isPointerLocked);
        
        if (!isPointerLocked) {
            // If we lose pointer lock, unlock target
            if (lockedTarget) {
                // Unhighlight the locked target
                hudSystem.highlightTarget(lockedTarget, false, window.plane.position);
                lockedTarget = null;
            }
            // Optional: Pause game or show menu
        }
    }, false);
    
    document.addEventListener('mousemove', (e) => {
        // Don't process mouse movement when evolution menu is open
        if (evolutionUI.isOpen()) return;
        
        if (isPointerLocked) {
            const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
            const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
            
            // Convert mouse movement to radians and apply sensitivity
            const mouseSensitivity = 0.002;
            playerSystem.updateYaw(movementX, mouseSensitivity);
            playerSystem.updatePitch(movementY, mouseSensitivity);
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.camera && window.renderer) {
            window.camera.aspect = window.innerWidth / window.innerHeight;
            window.camera.updateProjectionMatrix();
            window.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });
}

function findAndLockTarget() {
    // Raycast from camera center
    raycaster.setFromCamera({ x: 0, y: 0 }, window.camera); 
    
    console.log("Attempting to lock target...");
    const potentialTargets = [...targetsSystem.getTargets()];
    const bossObject = bossSystem.getBossObject();
    if (bossSystem.isBossActive() && bossObject) {
        potentialTargets.push(bossObject);
    }
    
    // Filter out targets that are too far away
    const MAX_ACQUISITION_DISTANCE = 350; // Even longer distance for acquisition
    const filteredTargets = potentialTargets.filter(target => {
        const distance = target.position.distanceTo(playerSystem.getProjectileOrigin());
        return distance < MAX_ACQUISITION_DISTANCE;
    });
    
    if (filteredTargets.length === 0) {
        console.log("No targets in range for locking.");
        return;
    }
    
    // Cast ray to see if we hit anything directly
    const intersects = raycaster.intersectObjects(filteredTargets);
    
    // If we have direct hits, use the closest one
    if (intersects.length > 0) {
        // If we already had a locked target, unhighlight it
        if (lockedTarget && lockedTarget !== intersects[0].object) {
            hudSystem.highlightTarget(lockedTarget, false, window.plane.position);
        }
        
        lockedTarget = intersects[0].object;
        // Highlight the newly locked target
        hudSystem.highlightTarget(lockedTarget, true, window.plane.position);
        
        // Play a target lock sound
        audioSystem.playSound(audioSystem.spreadSynth || audioSystem.flamethrowerSynth, ["A5", "E6"], "16n");
        
        console.log("Target locked via direct hit:", { id: lockedTarget.uuid, pos: lockedTarget.position });
        return;
    }
    
    // If no direct hit, use weighted scoring to find best target
    // More forgiving than just using angle from camera forward
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(window.camera.quaternion);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(window.camera.quaternion);
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(window.camera.quaternion);
    
    let bestTarget = null;
    let bestScore = -1;
    const MAX_ANGLE = Math.PI / 4; // 45 degrees from center view
    
    // Center of screen in normalized device coordinates
    const screenCenter = new THREE.Vector2(0, 0);
    
    for (const target of filteredTargets) {
        // Calculate target position in normalized device coordinates (-1 to 1)
        const targetPos = target.position.clone();
        const targetVector = targetPos.clone().sub(window.camera.position);
        
        // 1. Distance from camera (closer targets are better)
        const distance = targetVector.length();
        const distanceScore = 1.0 - Math.min(1.0, distance / MAX_ACQUISITION_DISTANCE);
        
        // 2. Angle from camera forward (centered targets are better)
        targetVector.normalize();
        const angle = targetVector.angleTo(camForward);
        
        // Skip if beyond our maximum angle
        if (angle > MAX_ANGLE) continue;
        
        const angleScore = 1.0 - (angle / MAX_ANGLE);
        
        // 3. Target size (bigger targets are easier to hit)
        const sizeScore = target.userData.collisionRadius ? Math.min(1.0, target.userData.collisionRadius / 5.0) : 0.5;
        
        // 4. Distance from screen center
        const targetNDC = target.position.clone().project(window.camera);
        const screenDistance = screenCenter.distanceTo(new THREE.Vector2(targetNDC.x, targetNDC.y));
        const screenScore = 1.0 - Math.min(1.0, screenDistance / 1.0); // 1.0 is edge of screen
        
        // Combined score - heavily weight the screen position and angle
        const combinedScore = 
            (angleScore * 0.3) + 
            (distanceScore * 0.2) + 
            (sizeScore * 0.1) + 
            (screenScore * 0.4);
        
        // Debug target scores
        console.log(`Target ${target.uuid} score: ${combinedScore.toFixed(2)} (angle: ${(angle * 180 / Math.PI).toFixed(1)}°, distance: ${distance.toFixed(1)})`);
        
        if (combinedScore > bestScore) {
            bestScore = combinedScore;
            bestTarget = target;
        }
    }
    
    if (bestTarget) {
        // If we already had a locked target, unhighlight it
        if (lockedTarget && lockedTarget !== bestTarget) {
            hudSystem.highlightTarget(lockedTarget, false, window.plane.position);
        }
        
        lockedTarget = bestTarget;
        // Highlight the newly locked target
        hudSystem.highlightTarget(lockedTarget, true, window.plane.position);
        
        // Play a target lock sound
        audioSystem.playSound(audioSystem.spreadSynth || audioSystem.flamethrowerSynth, ["A5", "E6"], "16n");
        
        console.log("Target locked via weighted score:", { id: lockedTarget.uuid, score: bestScore.toFixed(2) });
        return;
    }
    
    console.log("No suitable target found for locking.");
}

function updateAimDirection() {
    const projectileOrigin = playerSystem.getProjectileOrigin();
    const baseDirection = playerSystem.getProjectileDirection(); // Player's forward direction
    
    // --- Check Locked Target Validity ---
    if (lockedTarget) {
        const targets = targetsSystem.getTargets();
        const bossObject = bossSystem.getBossObject();
        let targetStillExists = targets.includes(lockedTarget);
        if (bossSystem.isBossActive() && bossObject === lockedTarget) {
             targetStillExists = true;
        }
        
        // Check if target still exists in scene graph children as a fallback
        if (!targetStillExists && window.scene) {
             targetStillExists = window.scene.children.includes(lockedTarget);
        }

        if (!targetStillExists || !lockedTarget.parent || // Check if removed from scene
            lockedTarget.position.distanceTo(projectileOrigin) > MAX_LOCK_DISTANCE * 1.5) { // Check if target moved too far
            
            console.log("Locked target invalidated.");
            hudSystem.highlightTarget(lockedTarget, false, window.plane.position); // Unhighlight target
            lockedTarget = null; // Invalidate lock
        }
    }

    // --- Calculate Aim Direction ---
    if (lockedTarget) {
        // Aim directly at the locked target's center
        aimDirection.copy(lockedTarget.position).sub(projectileOrigin).normalize();
        
        // Debug locked aim
        console.log("Locked aim at target:", lockedTarget.uuid);
    } else {
        // Just use the player's forward direction when not locked
        aimDirection.copy(baseDirection);
    }
}

// Game interaction functions
function checkWeaponLevelUp() {
    const score = hudSystem.getScore();
    
    // Use the evolution system to check for unlocks
    const result = weaponsSystem.checkWeaponUnlocks(score, evolutionUI);
    
    if (result.leveledUp) {
        // Update the weapon info in the UI
        hudSystem.updateWeaponInfo(weaponsSystem.getWeaponName());
        
        // Add notification about new weapons being available
        hudSystem.showNotification("New weapon evolution available! Press E to view");
    }
    
    return result;
}

// Wrap original damage functions to potentially clear lock
function damageTargetWrapper(target, amount, hitPosition) {
    // Add extensive debug logging
    console.log(`DAMAGE TARGET WRAPPER: Target: ${target?.uuid}, Amount: ${amount}, Position: ${JSON.stringify(hitPosition)}`);
    
    // Validate target
    if (!target || !target.userData) {
        console.error("Invalid target object passed to damageTargetWrapper");
        return false;
    }
    
    // Check if targetsSystem and its damageTarget method exist
    if (!targetsSystem || typeof targetsSystem.damageTarget !== 'function') {
        console.error("targetsSystem.damageTarget is not available!");
        return false; 
    }
    
    // Debug: log target health before damage
    console.log(`Target health before damage: ${target.userData.health || 'unknown'}`);
    
    // Call the actual damage function with all required parameters
    const destroyed = targetsSystem.damageTarget(
        target, 
        amount, 
        hitPosition, 
        window.scene, 
        hudSystem.getScore(), 
        hudSystem.setScore
    );
    
    // Debug: log target health after damage or destruction status
    if (destroyed) {
        console.log(`Target destroyed: ${target.uuid}`);
    } else if (target.userData) {
        console.log(`Target health after damage: ${target.userData.health}`);
    }
    
    // If target was destroyed and it was the locked target, unlock it
    if (destroyed && target === lockedTarget) {
        console.log("Locked target destroyed, unlocking.");
        hudSystem.highlightTarget(lockedTarget, false, window.plane.position); // Unhighlight it first
        lockedTarget = null; // Unlock if the locked target is destroyed
    }
    
    return destroyed;
}

// Ensure bossSystem provides necessary functions
const originalDamageBoss = bossSystem ? bossSystem.damageBoss : null; // Check bossSystem exists
function damageBossWrapper(amount, hitPosition) {
    console.log(`Damage Boss Wrapper called, amount: ${amount}`); // Log wrapper call
    if (!originalDamageBoss) {
         console.error("bossSystem.damageBoss is not available!");
         return null; // Or appropriate default
    }
    
    const result = originalDamageBoss(
        amount, 
        hitPosition, 
        window.scene, 
        hudSystem.getScore(), 
        hudSystem.setScore
    );

    // Check boss health after damage (ensure getBossHealth exists)
    const bossHealth = bossSystem.getBossHealth ? bossSystem.getBossHealth() : null;
    const bossObject = bossSystem.getBossObject ? bossSystem.getBossObject() : null;

    if (bossHealth) {
        // Update boss health bar in HUD
        hudSystem.updateBossHealthBar(bossHealth.percentage);
    }
    if (bossHealth && bossHealth.current <= 0 && bossObject && bossObject === lockedTarget) {
        console.log("Locked boss destroyed, unlocking.");
        lockedTarget = null; // Unlock if boss is destroyed
    }
    return result; 
}

function damageTarget(target, amount, hitPosition) {
    return targetsSystem.damageTarget(
        target, 
        amount, 
        hitPosition, 
        window.scene, 
        hudSystem.getScore(), 
        hudSystem.setScore
    );
}

function damageBoss(amount, hitPosition) {
    return bossSystem.damageBoss(
        amount, 
        hitPosition, 
        window.scene, 
        hudSystem.getScore(), 
        hudSystem.setScore
    );
}

function checkGameOver() {
    if (hudSystem.isGameOver()) return;
    
    // Check if player is too far from origin
    if (window.plane.position.length() > 2500 || window.plane.position.z < -1500) {
        triggerGameOver("Lost in the Void");
        return;
    }
    
    // Check player collisions only if not invulnerable
    if (!playerSystem.isInvulnerable()) {
        // Enemy projectiles and enemies
        const flames = weaponsSystem.getFlames();
        const enemies = enemiesSystem.getEnemies();
        
        // Check projectile collisions
        for (let i = flames.length - 1; i >= 0; i--) {
            const projectile = flames[i];
            if (projectile && projectile.userData && projectile.userData.isEnemyProjectile && window.plane && window.plane.position) { 
                if (projectile.position.distanceTo(window.plane.position) < 1.5) {
                    triggerGameOver("Annihilated");
                    effectsSystem.createExplosion(window.plane.position);
                    if (projectile.parent) projectile.userData.markedForRemoval = true;
                    return;
                }
            }
        }
        
        // Check enemy collisions
        for (const enemy of enemies) {
            if (enemy && window.plane && window.plane.position) {
                if (enemy.position.distanceTo(window.plane.position) < 3.0) {
                    triggerGameOver("Crashed into Enemy");
                    effectsSystem.createExplosion(window.plane.position);
                    return;
                }
            }
        }
    }
    
    if (lockedTarget) {
        // TODO: Unhighlight if needed
        lockedTarget = null;
    }
}

function triggerGameOver(reason = "Reality Overload") {
    if (hudSystem.isGameOver()) return;
    
    // Stop player
    playerSystem.setIsFlying(false);
    isFiring = false;
    
    // Exit pointer lock
    document.exitPointerLock?.();
    
    // Show game over screen
    hudSystem.showGameOver(reason);
    
    // Clean up game objects
    cleanupGameObjects();
}

function cleanupGameObjects() {
    // Clear projectiles
    weaponsSystem.clearProjectiles();
    
    // Clear targets
    targetsSystem.clearTargets(window.scene, playerSystem.getOriginalMaterials());
    
    // Reset boss
    bossSystem.resetBoss();
    
    // Clear effects
    effectsSystem.clearEffects();
}

// Game restart
function restartGame() {
    // Reset game state
    hudSystem.resetHUD();
    playerSystem.resetPlane();
    
    // Reset weapon to basic
    weaponsSystem.setCurrentWeapon('basic');
    hudSystem.updateWeaponInfo(weaponsSystem.getWeaponName());
    
    // Reset game variables
    keys = {};
    isFiring = false;
    weaponEnergy = 100; // Reset weapon energy
    
    // Reset targeting
    if (lockedTarget) {
        hudSystem.highlightTarget(lockedTarget, false, window.plane.position);
        lockedTarget = null;
    }
    aimDirection.set(0, 0, -1); // Reset aim direction
    
    gameStartTime = Date.now();
    
    // Reset zone progression
    worldSystem.resetZoneProgression();
    
    // Clean up any remaining objects
    cleanupGameObjects();
    
    // Reset warp/HUD effects
    resetWarpEffects();
    
    // Hide game over screen using the HUD system
    hudSystem.hideGameOver();
    
    // Lock cursor again
    const canvas = document.getElementById('gameCanvas');
    canvas.requestPointerLock?.();
    
    // Start animation
    animate();
}

// Main animation loop
function animate() {
    if (hudSystem.isGameOver()) return;
    
    // Don't animate when evolution menu is open
    if (evolutionUI.isOpen()) {
        requestAnimationFrame(animate);
        return;
    }
    
    try {
        requestAnimationFrame(animate);
        
        const deltaTime = Math.min(clock.getDelta(), 0.1);
        const elapsedTime = Date.now() - gameStartTime;
        
        // Audio analysis
        const audioLevel = audioSystem.updateAudioAnalysis();
        
        // Update background and zone effects
        updateBackground(audioLevel);
        
        // Update player
        playerSystem.updateMovement(deltaTime, keys);
        
        // Update player visuals (engine glow, etc.)
        playerSystem.updateVisuals(deltaTime, elapsedTime);
        
        // Update camera AFTER player movement
        updateCamera();
        
        // Update visual effects (streaks, warp lines, etc.)
        updateVisualEffects(elapsedTime, audioLevel, deltaTime);
        
        // Update aim direction for weapon targeting
        updateAimDirection();
        
        // Update target information display with latest distance
        if (lockedTarget) {
            hudSystem.updateTargetInfo(lockedTarget, true, window.plane.position);
        }
        
        // Update dimension shift
        const shiftStatus = playerSystem.updateShiftStatus();
        hudSystem.updateShiftStatus(shiftStatus);
        
        // Update teleport
        const teleportStatus = playerSystem.updateTeleportStatus();
        hudSystem.updateTeleportStatus(teleportStatus);
        
        // Update effects
        effectsSystem.updateEffects(deltaTime);
        
        // Update enemies
        enemiesSystem.updateEnemies(deltaTime, window.scene, window.plane.position);
        
        // Update projectiles with both targets and enemies
        weaponsSystem.updateProjectiles(
            deltaTime,
            [...targetsSystem.getTargets(), ...enemiesSystem.getEnemies()],
            bossSystem.getBossObject(),
            bossSystem.isBossActive(),
            (target, amount, hitPosition) => {
                if (target.userData.type) {
                    // This is an enemy
                    return enemiesSystem.damageEnemy(target, amount, hitPosition, window.scene, hudSystem.getScore(), hudSystem.setScore);
                } else {
                    // This is a regular target
                    return targetsSystem.damageTarget(target, amount, hitPosition, window.scene, hudSystem.getScore(), hudSystem.setScore);
                }
            },
            damageBossWrapper
        );
        
        // Update targets
        targetsSystem.updateTargets(
            deltaTime,
            window.plane,
            window.scene,
            playerSystem.isShifting(),
            playerSystem.getShiftMaterial(),
            playerSystem.getOriginalMaterials(),
            bossSystem.isBossActive(),
            lockedTarget
        );
        
        // Update boss if active
        if (bossSystem.isBossActive()) {
            bossSystem.updateBoss(deltaTime, window.scene);
            const bossHealth = bossSystem.getBossHealth();
            if (bossHealth) {
                hudSystem.updateBossHealthBar(bossHealth.percentage);
            }
        }
        
        // Firing logic
        if (isFiring && !playerSystem.isShifting()) {
            const projectileOrigin = playerSystem.getProjectileOrigin();
            weaponsSystem.fireWeapon(
                projectileOrigin,
                aimDirection,
                window.scene,
                [...targetsSystem.getTargets(), ...enemiesSystem.getEnemies()],
                bossSystem.getBossObject(),
                bossSystem.isBossActive()
            );
        }
        
        // Handle weapon energy
        const now = Date.now();
        const deltaSeconds = deltaTime;
        
        // Decrease energy while firing
        if (isFiring && !playerSystem.isShifting()) {
            weaponEnergy = Math.max(0, weaponEnergy - energyUseRate * deltaSeconds);
        } 
        // Recharge energy when not firing
        else {
            // Only recharge after a short delay since last fire
            if (now - lastWeaponEnergyRecharge > 1000) { // 1 second recharge delay
                weaponEnergy = Math.min(100, weaponEnergy + energyRechargeRate * deltaSeconds);
            }
        }
        
        // Update the energy display
        hudSystem.updateWeaponEnergy(weaponEnergy, weaponsSystem.getWeaponName());
        
        // If we run out of energy, stop firing
        if (weaponEnergy <= 0 && isFiring) {
            // Can't fire with no energy
            isFiring = false;
            // Set recharge delay
            lastWeaponEnergyRecharge = now;
        }
        
        // If we start firing, update the last recharge time
        if (isFiring) {
            lastWeaponEnergyRecharge = now;
        }
        
        // Check for game over conditions
        checkGameOver();
        
        // Render the scene
        if (window.renderer && window.scene && window.camera) {
            window.renderer.render(window.scene, window.camera);
        } else {
            console.error("Render call skipped: Renderer, Scene or Camera missing.");
        }
    } catch (error) {
        console.error("Error in animation loop:", error);
    }
}

function applyGravityToObjects(deltaTime) {
    // Apply to player
    effectsSystem.applyGravity(window.plane, playerSystem.getVelocity(), deltaTime);
    
    // Apply to projectiles
    const flames = weaponsSystem.getFlames();
    flames.forEach(flame => {
        if (flame && flame.userData && flame.userData.velocity) { // Add safety checks
            effectsSystem.applyGravity(flame, flame.userData.velocity, deltaTime);
        }
    });
    
    // Apply to targets
    const targets = targetsSystem.getTargets();
    targets.forEach(target => {
        if (target && target.userData && target.userData.velocity) { // Add safety checks
            effectsSystem.applyGravity(target, target.userData.velocity, deltaTime);
        }
    });
    
    // Apply to boss
    const bossObject = bossSystem.getBossObject();
    if (bossSystem.isBossActive() && bossObject && bossObject.userData && bossObject.userData.velocity) { // Add safety checks
        effectsSystem.applyGravity(bossObject, bossObject.userData.velocity, deltaTime);
    }
}

function updateVisualEffects(elapsedTime, audioLevel, deltaTime) {
    // Add acceleration light streaks if player is accelerating
    if (playerSystem.getIsAccelerating() && playerSystem.getIsFlying()) {
        const now = Date.now();
        // Calculate velocity magnitude for effect intensity
        const velocity = playerSystem.getVelocity();
        const speed = velocity.length();
        // Adjust effect frequency based on speed (faster speed = more frequent effects)
        const speedFactor = Math.min(1.5, Math.max(1.0, speed / 15));
        const dynamicStreakInterval = ACCELERATION_STREAK_INTERVAL / speedFactor;
        const dynamicWarpInterval = WARP_EFFECT_INTERVAL / speedFactor;
        
        // Generate light streaks behind player
        if (now - lastAccelerationStreakTime > dynamicStreakInterval) {
            // Add light streaks
            effectsSystem.createLightStreak(
                window.plane.position,
                playerSystem.getVelocity()
            );
            lastAccelerationStreakTime = now;
        }
        
        // Generate Star Trek warp lines
        if (now - lastWarpEffectTime > dynamicWarpInterval) {
            // Forward direction for camera (where we're going)
            const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(window.camera.quaternion);
            
            // Create warp line effect 
            effectsSystem.createWarpEffect(
                window.camera.position,
                cameraForward
            );
            lastWarpEffectTime = now;
        }
    }
    
    // Update warp overlay HUD effect
    updateWarpOverlay(playerSystem.getIsAccelerating() && playerSystem.getIsFlying(), deltaTime);
    
    // Update star size is now handled in worldSystem.update()
}

function resetWarpEffects() {
    // Use the HUD system to reset warp effects
    hudSystem.updateWarpEffect(0);
    
    // Reset any other warp-related effects not handled by HUD
    colorDistortion.intensity = 0;
    colorDistortion.targetIntensity = 0;
}

// Make functions globally available (Careful with globals!)
window.damageTarget = damageTargetWrapper; // Expose the wrapper
window.damageBoss = damageBossWrapper;   // Expose the wrapper
window.restartGame = restartGame;

// Start the game when the window loads
window.addEventListener('load', initGame);

// Export for potential access from other modules if needed (less likely now)
export {
    initGame,
    restartGame,
    triggerGameOver
    // damageTargetWrapper as damageTarget, // Export wrappers if needed by other modules
    // damageBossWrapper as damageBoss
};
