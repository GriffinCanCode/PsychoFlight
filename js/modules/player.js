// --- Player Module ---
import audioSystem from './audio.js';
import planeData from '../data/planes.js'; // Import plane definitions

const playerSystem = (() => {
    // Private variables
    let plane;
    let currentPlaneType = 'default'; // Track the current plane type
    let planeVelocity = new THREE.Vector3();
    let moveSpeed = 1.5;
    let rollSpeed = 0.08;
    let pitchSpeed = 0.06;
    let yawSpeed = 0.05;
    let autoLevelSpeed = 0.03;
    let rollTarget = 0;
    let pitchTarget = 0;
    let yawTarget = 0;
    const damping = 0.80;
    const velocityDamping = 0.98;
    
    let isFlying = false;
    let isShifting = false;
    let shiftStartTime = 0;
    let lastShiftTime = -5.0 * 1000; // SHIFT_COOLDOWN * 1000
    let playerInvulnerable = false;
    
    // Materials are now defined in plane_data.js
    // const fuselageMaterial = ... (removed)
    // const wingMaterial = ... (removed)
    // const cockpitMaterial = ... (removed)
    
    const shiftMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        wireframe: true 
    });
    // originalMaterials map is now stored in plane group userData
    // const originalMaterials = new Map(); 
    
    // Constants
    const SHIFT_DURATION = 10.0;
    const SHIFT_COOLDOWN = 5.0;
    
    // Public methods
    function createPlane(scene) {
        try {
            const selectedPlaneData = planeData[currentPlaneType];
            if (!selectedPlaneData) {
                console.error(`Plane data for type '${currentPlaneType}' not found. Using default.`);
                selectedPlaneData = planeData.default;
            }

            // Use the createGeometry function from planeData
            plane = selectedPlaneData.createGeometry(selectedPlaneData.materials);
            
            // Old geometry creation removed...
            // plane = new THREE.Group();
            // const fuselage = ...
            // plane.add(fuselage);
            // originalMaterials.set(fuselage, fuselageMaterial);
            // ... etc ...
            
            plane.position.set(0, 0, 10);
            plane.scale.set(0.5, 0.5, 0.5);
            scene.add(plane);
            
            console.log(`Plane '${selectedPlaneData.name}' created successfully.`);
            return plane;
        } catch(error) {
            console.error("Error creating plane:", error);
            return null;
        }
    }
    
    function updateMovement(deltaTime, keys) {
        // Apply player controls to orientation
        if (keys['a']) rollTarget += rollSpeed;
        if (keys['d']) rollTarget -= rollSpeed;
        if (keys['w']) pitchTarget += pitchSpeed;
        if (keys['s']) pitchTarget -= pitchSpeed;
        
        pitchTarget = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitchTarget));
        rollTarget = Math.max(-Math.PI, Math.min(Math.PI, rollTarget));
        
        const targetQuaternion = new THREE.Quaternion();
        const currentQuaternion = plane.quaternion.clone();
        const targetEuler = new THREE.Euler(pitchTarget, yawTarget, rollTarget, 'YXZ');
        targetQuaternion.setFromEuler(targetEuler);
        
        currentQuaternion.slerp(targetQuaternion, 1 - damping);
        plane.quaternion.copy(currentQuaternion);
        
        if (!keys['a'] && !keys['d']) {
            rollTarget = THREE.MathUtils.lerp(rollTarget, 0, autoLevelSpeed);
        }
        
        // Calculate forward thrust vector based on current orientation
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(plane.quaternion);
        
        // Apply forward thrust if flying
        if (isFlying) {
            planeVelocity.add(forward.multiplyScalar(moveSpeed * deltaTime * 10));
        } else {
            // Apply damping if not actively thrusting
            planeVelocity.multiplyScalar(velocityDamping);
        }
        
        // Limit overall velocity
        const maxSpeed = 10.0;
        if (planeVelocity.length() > maxSpeed) {
            planeVelocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // Update position based on final velocity
        plane.position.add(planeVelocity.clone().multiplyScalar(deltaTime));
    }
    
    function updateYaw(movementX, sensitivity) {
        yawTarget -= movementX * sensitivity;
    }
    
    function updatePitch(movementY, sensitivity) {
        pitchTarget -= movementY * sensitivity;
        pitchTarget = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitchTarget));
    }
    
    function startShift() {
        const now = Date.now();
        if (!isShifting && now - lastShiftTime > SHIFT_COOLDOWN * 1000) {
            isShifting = true;
            playerInvulnerable = true;
            shiftStartTime = now;
            lastShiftTime = now;
            
            // Play the shift sound effect
            audioSystem.playSound(audioSystem.shiftSynth, "C3", 0.5);
            
            // Use the map stored in userData
            const originalMaterialsMap = plane.userData.originalMaterialsMap;
            if (!originalMaterialsMap) {
                console.error("Original materials map not found on plane!");
                return false;
            }

            plane.traverse((c) => {
                if (c.isMesh && originalMaterialsMap.has(c)) { 
                    c.material = shiftMaterial; 
                }
            });
            
            // These will be handled in game.js:
            // targets.forEach(t => { if(t.material !== shiftMaterial) t.material = shiftMaterial; });
            // if(bossActive && bossObject && bossObject.material !== shiftMaterial) bossObject.material = shiftMaterial;
            
            return true;
        }
        return false;
    }
    
    function endShift() {
        isShifting = false;
        playerInvulnerable = false;
        audioSystem.playSound(audioSystem.shiftSynth, "G2", 0.3);
        
        // Use the map stored in userData
        const originalMaterialsMap = plane.userData.originalMaterialsMap;
         if (!originalMaterialsMap) {
            console.error("Original materials map not found on plane!");
            return;
        }

        plane.traverse((c) => {
            if (c.isMesh && originalMaterialsMap.has(c)) { 
                c.material = originalMaterialsMap.get(c); 
            }
        });
        
        // These will be handled in game.js:
        // targets.forEach(t => { if(originalMaterials.has(t)) t.material = originalMaterials.get(t); });
        // if(bossActive && bossObject && originalMaterials.has(bossObject)) bossObject.material = originalMaterials.get(bossObject);
    }
    
    function updateShiftStatus() {
        const now = Date.now();
        if (isShifting) {
            const elapsedTime = (now - shiftStartTime) / 1000;
            if (elapsedTime >= SHIFT_DURATION) {
                endShift();
                return { active: false, timeLeft: 0, cooldown: SHIFT_COOLDOWN };
            }
            const timeLeft = Math.max(0, SHIFT_DURATION - elapsedTime);
            return { active: true, timeLeft, cooldown: 0 };
        } else {
            const cooldown = Math.max(0, SHIFT_COOLDOWN - (now - lastShiftTime) / 1000);
            return { active: false, timeLeft: 0, cooldown };
        }
    }
    
    function getProjectileOrigin() {
        const origin = new THREE.Vector3(0, 0, -2.2);  // Front of the plane
        return plane.localToWorld(origin.clone());
    }
    
    function getProjectileDirection() {
        // Get the forward direction in world space - match the movement direction
        const forward = new THREE.Vector3(0, 0, -1);  // Forward is negative Z
        forward.applyQuaternion(plane.quaternion);
        return forward.normalize();
    }
    
    function setIsFlying(value) {
        isFlying = value;
    }
    
    function getIsFlying() {
        return isFlying;
    }
    
    function isInvulnerable() {
        return playerInvulnerable;
    }
    
    function getVelocity() {
        return planeVelocity;
    }
    
    function resetPlane() {
        // Check if plane exists before resetting
        if (plane) { 
            plane.position.set(0, 0, 10);
            plane.quaternion.identity();
            // Reset visuals (e.g., engine glow)
            updateVisuals(0, 0); 
        } else {
            console.warn("Attempted to reset non-existent plane.");
        }
        planeVelocity.set(0, 0, 0);
        pitchTarget = 0;
        rollTarget = 0;
        yawTarget = 0;
        isFlying = false;
        isShifting = false;
        playerInvulnerable = false;
        lastShiftTime = -SHIFT_COOLDOWN * 1000;
        return plane;
    }
    
    function getPlane() {
        return plane;
    }
    
    function getShiftMaterial() {
        return shiftMaterial;
    }
    
    function getOriginalMaterials() {
        // Return the map from the plane's userData
        return plane ? plane.userData.originalMaterialsMap : new Map();
    }
    
    function getMaterials() {
        // Return materials from the data definition
        const selectedPlaneData = planeData[currentPlaneType] || planeData.default;
        return selectedPlaneData.materials;
    }
    
    // New function to handle plane animations
    function updateVisuals(deltaTime, elapsedTime) {
        if (!plane || isShifting) return; // Don't update visuals if plane doesn't exist or is shifting

        const selectedPlaneData = planeData[currentPlaneType] || planeData.default;
        const materials = selectedPlaneData.materials;

        // Animate engine glow based on thrust (isFlying)
        const engineGlowMesh = plane.children.find(child => child.userData.isEngineGlow);
        if (engineGlowMesh && materials.engineGlow) {
            const targetIntensity = isFlying ? 1.5 : 0.5; // Brighter when flying
            const targetScale = isFlying ? 1.2 : 1.0;
            const lerpFactor = 0.1;

            engineGlowMesh.material.opacity = THREE.MathUtils.lerp(engineGlowMesh.material.opacity, targetIntensity * 0.6, lerpFactor);
            const currentScale = engineGlowMesh.scale.x; // Assume uniform scale
            const newScale = THREE.MathUtils.lerp(currentScale, targetScale, lerpFactor);
            engineGlowMesh.scale.set(newScale, newScale, newScale);
        }

        // General material pulsing (similar to game.js updateVisualEffects but moved here)
        const planePulse = 0.5 + Math.sin(elapsedTime * 0.005) * 0.3; 

        if (materials.fuselage) materials.fuselage.emissiveIntensity = planePulse * 0.6; // Adjusted intensity
        if (materials.wing) materials.wing.emissiveIntensity = planePulse * 0.4; // Adjusted intensity
        if (materials.cockpit) materials.cockpit.emissiveIntensity = planePulse * 0.8; // Adjusted intensity
    }
    
    // Public API
    return {
        createPlane,
        updateMovement,
        updateYaw,
        updatePitch,
        startShift,
        endShift,
        updateShiftStatus,
        getProjectileOrigin,
        getProjectileDirection,
        setIsFlying,
        getIsFlying,
        isInvulnerable,
        getVelocity,
        resetPlane,
        getPlane,
        getShiftMaterial,
        getOriginalMaterials,
        updateVisuals,
        getMaterials
    };
})();

// Export the module
export default playerSystem;
