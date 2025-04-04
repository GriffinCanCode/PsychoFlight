// --- Main Game Module ---
import audioSystem from './modules/audio.js';
import effectsSystem from './modules/effects.js';
import playerSystem from './modules/player.js';
import weaponsSystem from './modules/weapons.js';
import targetsSystem from './modules/targets.js';
import bossSystem from './modules/boss.js';
import uiSystem from './modules/ui.js';
import evolutionUI from './modules/evolution_ui.js';
import zonesSystem from './modules/zones.js';
import enemiesSystem from './modules/enemies.js';

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

// Add zone progression variables
let nextZoneScore = 2000;
const ZONE_SCORE_INCREMENT = 2000;
const ZONE_SEQUENCE = ['default', 'crystal', 'plasma', 'quantum'];
let currentZoneIndex = 0;

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
        uiSystem.init();
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
        
        // Add lights
        setupLighting();
        
        // Initialize player
        console.log("Creating player plane...");
        window.plane = playerSystem.createPlane(window.scene);
        if (!window.plane) {
            throw new Error("Failed to create player plane");
        }
        console.log("Player plane created successfully");
        
        // Initialize starfield
        console.log("Creating starfield...");
        createStarfield();
        console.log("Starfield created successfully");
        
        // Setup input listeners
        setupInputListeners();
        
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

function setupLighting() {
    const currentZone = zonesSystem.getCurrentZone();
    const ambientLight = new THREE.HemisphereLight(
        currentZone.ambientLight.skyColor,
        currentZone.ambientLight.groundColor,
        currentZone.ambientLight.intensity
    );
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
    const currentZone = zonesSystem.getCurrentZone();
    const { transitionProgress, currentZoneData } = zonesSystem.updateZone(clock.getDelta(), Date.now() - gameStartTime);

    // Update background hue speed based on zone and audio level
    const targetHueSpeed = currentZone.backgroundHueSpeed + maxBackgroundHueSpeedBoost * audioLevel;
    backgroundHueSpeed = THREE.MathUtils.lerp(backgroundHueSpeed, targetHueSpeed, 0.1);
    backgroundHue = (backgroundHue + backgroundHueSpeed) % 1;
    
    // Blend between base color and hue-shifted color
    const bgColor = new THREE.Color();
    bgColor.setHSL(backgroundHue, 0.8, 0.1);
    bgColor.lerp(currentZone.baseColor, 0.5);
    window.renderer.setClearColor(bgColor);
    
    // Update ambient lighting
    const ambientLight = window.scene.children.find(c => c instanceof THREE.HemisphereLight);
    if (ambientLight) {
        const skyColor = new THREE.Color(currentZone.ambientLight.skyColor);
        const groundColor = new THREE.Color(currentZone.ambientLight.groundColor);
        
        ambientLight.color.copy(skyColor).multiplyScalar(1.0 + audioLevel * 0.2);
        ambientLight.groundColor.copy(groundColor).multiplyScalar(1.0 + audioLevel * 0.1);
        ambientLight.intensity = currentZone.ambientLight.intensity * (1.0 + audioLevel * 0.2);
    }

    // Update star field
    if (stars && stars.material) {
        stars.material.size = currentZone.starSize + audioLevel * 1.5;
        stars.rotation.y += currentZone.starfieldRotationSpeed + audioLevel * 0.0002;
    }

    // Update audio effects based on zone
    audioSystem.updateZoneEffects(currentZone.audioEffects);
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
                    uiSystem.updateShiftStatus(true);
                }
                break;
            case 't':
                if (playerSystem.startTeleport()) {
                    uiSystem.updateTeleportStatus(true);
                }
                break;
            case 'e':
                evolutionUI.toggleEvolutionMenu();
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

function checkZoneProgression(score) {
    if (score >= nextZoneScore && currentZoneIndex < ZONE_SEQUENCE.length - 1) {
        currentZoneIndex++;
        const nextZone = ZONE_SEQUENCE[currentZoneIndex];
        zonesSystem.transitionToZone(nextZone);
        nextZoneScore += ZONE_SCORE_INCREMENT;
        
        // Update target parameters for new zone
        const zoneData = zonesSystem.getCurrentZone();
        targetsSystem.updateZoneParameters(
            zoneData.targetSpawnRate,
            zoneData.maxTargets,
            zoneData.targetSpeedMultiplier
        );
        
        return true;
    }
    return false;
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
        
        const deltaTime = Math.min(clock.getDelta(), 0.1);
        const elapsedTime = Date.now() - gameStartTime;
        
        // Audio analysis
        const audioLevel = audioSystem.updateAudioAnalysis();
        
        // Update background and zone effects
        updateBackground(audioLevel);
        
        // Check for zone progression
        const score = uiSystem.getScore();
        if (checkZoneProgression(score)) {
            // Zone transition occurred
            console.log(`Transitioned to zone: ${zonesSystem.getCurrentZone().name}`);
        }
        
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
        
        // Update teleport
        const teleportStatus = playerSystem.updateTeleportStatus();
        uiSystem.updateTeleportStatus(teleportStatus);
        
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
                    return enemiesSystem.damageEnemy(target, amount, hitPosition, window.scene, uiSystem.getScore(), uiSystem.setScore);
                } else {
                    // This is a regular target
                    return targetsSystem.damageTarget(target, amount, hitPosition, window.scene, uiSystem.getScore(), uiSystem.setScore);
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
        }
        
        // Update explosions and effects
        effectsSystem.updateExplosions();
        effectsSystem.updateGravityWells(deltaTime);
        
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
