// --- Main Game Module ---
import audioSystem from './modules/audio.js';
import effectsSystem from './modules/effects.js';
import playerSystem from './modules/player.js';
import weaponsSystem from './modules/weapons.js';
import targetsSystem from './modules/targets.js';
import bossSystem from './modules/boss.js';
import uiSystem from './modules/ui.js';
import evolutionUI from './modules/evolution_ui.js';

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

// Game state
let gameStartTime = Date.now();
let isPointerLocked = false;
let keys = {};
let isFiring = false;
let lockedTarget = null;
let aimDirection = new THREE.Vector3(0, 0, -1); // Initialize aim direction

// Initialize scene
let baseStarSize = 2.0;
let stars;
let backgroundHue = 0;
let backgroundHueSpeed = 0.0005;
const baseBackgroundHueSpeed = 0.0005;
const maxBackgroundHueSpeedBoost = 0.0015;

// Camera
const cameraOffset = new THREE.Vector3(0, 1.8, 8);

// Clock
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster(); // Reusable raycaster for locking

// Initialize the game
function initGame() {
    try {
        // Setup Scene
        window.scene = new THREE.Scene();
        window.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
        
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) throw new Error("Canvas element not found!");
        
        window.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        window.renderer.setClearColor(0x000000);
        window.renderer.shadowMap.enabled = true;
        window.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Set renderer size
        const setSize = () => {
            if (!window.renderer || !window.camera) return;
            const width = window.innerWidth;
            const height = window.innerHeight;
            window.renderer.setSize(width, height, false);
            window.camera.aspect = width / height;
            window.camera.updateProjectionMatrix();
        };
        
        setSize();
        window.addEventListener('resize', setSize);
        
        // Add lighting
        setupLighting();
        
        // Create starfield
        createStarfield();
        
        // Create player
        window.plane = playerSystem.createPlane(window.scene);
        
        // Set target spawn parameters
        targetsSystem.setSpawnParameters(window.targetSpawnDistance, window.targetSpawnRadius);
        
        // Initialize UI
        uiSystem.init();
        
        // Initialize evolution UI
        evolutionUI.init();
        
        // Setup input listeners
        setupInputListeners();
        
        console.log("Initialization complete. Starting animation loop.");
        
        // Start the game loop
        animate();
        
        // Update camera matrix for raycasting
        window.camera.updateMatrixWorld(); 
        
        return true;
    } catch(error) {
        console.error("Error during initialization:", error);
        
        // Display error if setup failed
        if (!window.renderer) {
            document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace;">Fatal Error during initialization: ${error.message}. Cannot start game. Check console.</div>`;
        } else {
            triggerGameOver(`Initialization Error: ${error.message}`);
        }
        
        return false;
    }
}

function setupLighting() {
    const ambientLight = new THREE.HemisphereLight(0xff00ff, 0x00ffff, 1.5);
    window.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(20, 40, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    window.scene.add(directionalLight);
}

function createStarfield() {
    try {
        const starsGeometry = new THREE.BufferGeometry();
        const starVertices = [];
        const starColors = [];
        const starCount = 20000;
        const starSpread = 2000;
        const baseStarColor = new THREE.Color();
        
        for (let i = 0; i < starCount; i++) {
            const x = (Math.random() - 0.5) * starSpread * 2;
            const y = (Math.random() - 0.5) * starSpread * 2;
            const z = (Math.random() - 0.5) * starSpread * 2;
            starVertices.push(x, y, z);
            baseStarColor.setHSL(Math.random(), 1.0, 0.7);
            starColors.push(baseStarColor.r, baseStarColor.g, baseStarColor.b);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
        
        const starsMaterial = new THREE.PointsMaterial({
            size: baseStarSize,
            sizeAttenuation: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8
        });
        
        stars = new THREE.Points(starsGeometry, starsMaterial);
        window.scene.add(stars);
        
        console.log("Stars created successfully.");
    } catch(error) {
        console.error("Error creating stars:", error);
    }
}

function updateBackground(audioLevel) {
    const targetHueSpeed = baseBackgroundHueSpeed + maxBackgroundHueSpeedBoost * audioLevel;
    backgroundHueSpeed = THREE.MathUtils.lerp(backgroundHueSpeed, targetHueSpeed, 0.1);
    backgroundHue = (backgroundHue + backgroundHueSpeed) % 1;
    
    const bgColor = new THREE.Color();
    bgColor.setHSL(backgroundHue, 0.8, 0.1);
    window.renderer.setClearColor(bgColor);
    
    const ambientLight = window.scene.children.find(c => c instanceof THREE.HemisphereLight);
    if (ambientLight) {
        ambientLight.color.setHSL(backgroundHue, 1.0, 0.6 + audioLevel * 0.2);
        ambientLight.groundColor.setHSL((backgroundHue + 0.5) % 1, 1.0, 0.4 + audioLevel * 0.1);
    }
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
}

function setupInputListeners() {
    const canvas = document.getElementById('gameCanvas');
    
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
                uiSystem.highlightTarget(lockedTarget, false);
                lockedTarget = null; 
            } else {
                findAndLockTarget();
            }
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === canvas;
        // Update crosshair visibility using UI module
        uiSystem.updateCrosshair(isPointerLocked);
        
        if (!isPointerLocked) {
            // If we lose pointer lock, unlock target
            if (lockedTarget) {
                // Unhighlight the locked target
                uiSystem.highlightTarget(lockedTarget, false);
                lockedTarget = null;
            }
            // Optional: Pause game or show menu
        }
    }, false);
    
    document.addEventListener('mousemove', (e) => {
        // Don't process mouse movement when evolution menu is open
        if (evolutionUI.isOpen()) return;
        
        if (isPointerLocked && !uiSystem.isGameOver()) {
            const sensitivity = 0.002;
            const dX = e.movementX || 0;
            const dY = e.movementY || 0;
            
            // Allow mouse movement even when locked, but maybe reduce sensitivity slightly?
            playerSystem.updateYaw(dX, sensitivity);
            playerSystem.updatePitch(dY, sensitivity);
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (uiSystem.isGameOver()) return;
        
        const k = e.key.toLowerCase();
        keys[k] = true;
        
        if (k === ' ') playerSystem.setIsFlying(true);
        if (k === 'g') isFiring = true;
        if (k === 'x') playerSystem.startShift();
        if (k === 'e' && !evolutionUI.isOpen()) evolutionUI.toggleEvolutionMenu(); // Toggle evolution menu with E key
    });
    
    document.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        keys[k] = false;
        
        if (k === ' ') playerSystem.setIsFlying(false);
        if (k === 'g') isFiring = false;
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
            uiSystem.highlightTarget(lockedTarget, false);
        }
        
        lockedTarget = intersects[0].object;
        // Highlight the newly locked target
        uiSystem.highlightTarget(lockedTarget, true);
        
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
            uiSystem.highlightTarget(lockedTarget, false);
        }
        
        lockedTarget = bestTarget;
        // Highlight the newly locked target
        uiSystem.highlightTarget(lockedTarget, true);
        
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
            uiSystem.highlightTarget(lockedTarget, false); // Unhighlight target
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
    const score = uiSystem.getScore();
    
    // Use the evolution system to check for unlocks
    const result = weaponsSystem.checkWeaponUnlocks(score, evolutionUI);
    
    if (result.leveledUp) {
        // Update the weapon info in the UI
        uiSystem.updateWeaponInfo(weaponsSystem.getWeaponName());
        
        // Add notification about new weapons being available
        uiSystem.showNotification("New weapon evolution available! Press E to view");
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
        uiSystem.getScore(), 
        uiSystem.setScore
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
        uiSystem.highlightTarget(lockedTarget, false); // Unhighlight it first
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
        uiSystem.getScore(), 
        uiSystem.setScore
    );

    // Check boss health after damage (ensure getBossHealth exists)
    const bossHealth = bossSystem.getBossHealth ? bossSystem.getBossHealth() : null; 
    const bossObject = bossSystem.getBossObject ? bossSystem.getBossObject() : null;

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
        uiSystem.getScore(), 
        uiSystem.setScore
    );
}

function damageBoss(amount, hitPosition) {
    return bossSystem.damageBoss(
        amount, 
        hitPosition, 
        window.scene, 
        uiSystem.getScore(), 
        uiSystem.setScore
    );
}

function checkGameOver() {
    if (uiSystem.isGameOver()) return;
    
    // Check if player is too far from origin
    if (window.plane.position.length() > 2500 || window.plane.position.z < -1500) {
        triggerGameOver("Lost in the Void");
        return;
    }
    
    // Check player collisions only if not invulnerable
    if (!playerSystem.isInvulnerable()) {
        // Enemy projectiles
        const flames = weaponsSystem.getFlames();
        for (let i = flames.length - 1; i >= 0; i--) {
            const projectile = flames[i];
            // Add thorough checks before accessing properties
            if (projectile && projectile.userData && projectile.userData.isEnemyProjectile && window.plane && window.plane.position) { 
                if (projectile.position.distanceTo(window.plane.position) < 1.5) { // Approximate player collision radius
                    triggerGameOver("Annihilated");
                    effectsSystem.createExplosion(window.plane.position);
                    // Safely request removal, let update loop handle it
                    if (projectile.parent) projectile.userData.markedForRemoval = true; 
                    return;
                }
            }
        }
        
        // Target collisions
        const targets = targetsSystem.getTargets();
        for (const target of targets) {
            if (target && window.plane && target.userData && target.position && window.plane.position &&
                window.plane.position.distanceTo(target.position) < 1.5 + (target.userData.collisionRadius || 1.0)) {
                triggerGameOver("Collided with Entity");
                effectsSystem.createExplosion(window.plane.position);
                return;
            }
        }
        
        // Boss collision
        const bossObject = bossSystem.getBossObject();
        // Add thorough checks
        if (bossSystem.isBossActive() && bossObject && bossObject.userData && bossObject.position &&
            window.plane && window.plane.position && 
            window.plane.position.distanceTo(bossObject.position) < 1.5 + (bossObject.userData.collisionRadius || 5.0)) { // Boss likely larger
            triggerGameOver("Consumed by the Anomaly");
            effectsSystem.createExplosion(window.plane.position);
            return;
        }
    }
    
    if (lockedTarget) {
        // TODO: Unhighlight if needed
        lockedTarget = null;
    }
}

function triggerGameOver(reason = "Reality Overload") {
    if (uiSystem.isGameOver()) return;
    
    // Stop player
    playerSystem.setIsFlying(false);
    isFiring = false;
    
    // Exit pointer lock
    document.exitPointerLock?.();
    
    // Show game over screen
    uiSystem.showGameOver(reason);
    
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
    uiSystem.resetUI();
    playerSystem.resetPlane();
    
    // Reset weapon to basic
    weaponsSystem.setCurrentWeapon('basic');
    uiSystem.updateWeaponInfo(weaponsSystem.getWeaponName());
    
    // Reset game variables
    keys = {};
    isFiring = false;
    
    // Reset targeting
    if (lockedTarget) {
        uiSystem.highlightTarget(lockedTarget, false);
        lockedTarget = null;
    }
    aimDirection.set(0, 0, -1); // Reset aim direction
    
    gameStartTime = Date.now();
    
    // Clean up any remaining objects
    cleanupGameObjects();
    
    // Hide UI overlays
    document.querySelector('.game-over-overlay').style.display = 'none';
    
    // Lock cursor again
    const canvas = document.getElementById('gameCanvas');
    canvas.requestPointerLock?.();
    
    // Start animation
    animate();
}

// Main animation loop
function animate() {
    if (uiSystem.isGameOver()) return;
    
    // Don't animate when evolution menu is open
    if (evolutionUI.isOpen()) {
        requestAnimationFrame(animate);
        return;
    }
    
    try {
        requestAnimationFrame(animate);
        
        const deltaTime = Math.min(clock.getDelta(), 0.1); // Cap delta time to prevent large jumps
        const elapsedTime = Date.now() - gameStartTime;
        
        // Audio analysis
        const audioLevel = audioSystem.updateAudioAnalysis();
        
        // Update background
        updateBackground(audioLevel);
        
        // Update player
        playerSystem.updateMovement(deltaTime, keys);
        
        // Update player visuals (engine glow, etc.)
        playerSystem.updateVisuals(deltaTime, elapsedTime);
        
        // Update camera AFTER player movement
        updateCamera();
        
        // Update aim direction for weapon targeting
        updateAimDirection();
        
        // Update dimension shift
        const shiftStatus = playerSystem.updateShiftStatus();
        uiSystem.updateShiftStatus(shiftStatus);
        
        // Update projectiles
        weaponsSystem.updateProjectiles(
            deltaTime, 
            targetsSystem.getTargets(), 
            bossSystem.getBossObject(), 
            bossSystem.isBossActive(),
            damageTargetWrapper, // Use wrapped function
            damageBossWrapper   // Use wrapped function
        );
        
        // Update targets
        targetsSystem.updateTargets(
            deltaTime,
            window.plane,
            window.scene,
            shiftStatus.active,
            playerSystem.getShiftMaterial(),
            playerSystem.getOriginalMaterials(),
            bossSystem.isBossActive(),
            lockedTarget // Pass locked target for potential highlighting
        );
        
        // Update explosions
        effectsSystem.updateExplosions();
        
        // Update gravity wells
        effectsSystem.updateGravityWells(deltaTime);
        
        // Update boss
        bossSystem.updateBoss(
            deltaTime,
            window.plane,
            window.scene,
            shiftStatus.active,
            playerSystem.getShiftMaterial(),
            playerSystem.getOriginalMaterials(),
            lockedTarget // Pass locked target for potential highlighting
        );
        
        // Update boss health bar
        if (bossSystem.isBossActive()) {
            const bossHealth = bossSystem.getBossHealth();
            uiSystem.updateBossHealthBar(bossHealth.percentage);
        } else {
            uiSystem.hideBossHealthBar();
        }
        
        // Apply gravity forces to objects
        applyGravityToObjects(deltaTime);
        
        // Check for weapon level up
        checkWeaponLevelUp();
        
        // Firing logic (use calculated aimDirection)
        if (isFiring && !shiftStatus.active) { // Don't fire while shifting
             // Ensure necessary components exist before firing
             if (window.scene && playerSystem && weaponsSystem && targetsSystem && bossSystem) {
                // Get projectile origin and direction
                const projectileOrigin = playerSystem.getProjectileOrigin();
                
                // Fire the current weapon
                weaponsSystem.fireWeapon(
                    projectileOrigin,
                    aimDirection,
                    window.scene,
                    targetsSystem.getTargets(),
                    bossSystem.getBossObject(),
                    bossSystem.isBossActive()
                );
             }
        }
        
        // Check game state changes
        checkGameOver();
        
        // Visual effects & pulsations
        updateVisualEffects(elapsedTime, audioLevel);
        
        // Render
        if (window.renderer && window.scene && window.camera) {
            window.renderer.render(window.scene, window.camera);
        } else {
            console.error("Render call skipped: Renderer, Scene or Camera missing.");
        }
    } catch (error) {
        console.error("Animation loop error:", error);
        triggerGameOver(`Runtime Error: ${error.message}`);
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

function updateVisualEffects(elapsedTime, audioLevel) {
    // Update star size based on audio
    if (stars && stars.material) { // Safety check
        stars.material.size = baseStarSize + audioLevel * 1.5;
        stars.rotation.y += 0.0001 + audioLevel * 0.0002;
    }
    
    // Plane visual updates (like pulsing) are now handled in playerSystem.updateVisuals

    // TODO: Add visual feedback for locked target (e.g., in target/boss update or here)
    // Example: Find the locked target and make it glow slightly more
}

// Make functions globally available (Careful with globals!)
window.damageTarget = damageTargetWrapper; // Expose the wrapper
window.damageBoss = damageBossWrapper;   // Expose the wrapper
window.restartGame = restartGame;

// Initialize the game when module loads
document.addEventListener('DOMContentLoaded', initGame);

// Export for potential access from other modules if needed (less likely now)
export {
    initGame,
    restartGame,
    triggerGameOver
    // damageTargetWrapper as damageTarget, // Export wrappers if needed by other modules
    // damageBossWrapper as damageBoss
};
