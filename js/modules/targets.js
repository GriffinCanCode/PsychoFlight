// --- Targets Module ---
import audioSystem from './audio.js';
import effectsSystem from './effects.js';

const targetsSystem = (() => {
    // Private variables
    let targets = [];
    let lastSpawnTime = 0;
    
    // Constants
    const targetSpawnInterval = 1000;
    const maxTargets = 15;
    
    // These will be exposed to be set by the game module
    let targetSpawnDistance = -150;
    let targetSpawnRadius = 40;
    
    // Target geometries and materials
    const targetGeometries = [
        new THREE.TorusKnotGeometry(1, 0.3, 100, 16),
        new THREE.IcosahedronGeometry(1.5),
        new THREE.OctahedronGeometry(1.8),
        new THREE.BoxGeometry(2, 2, 2)
    ];
    
    const targetMaterials = [
        new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0xaa00aa,
            roughness: 0.1,
            metalness: 0.9
        }),
        new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00aaaa,
            roughness: 0.2,
            metalness: 0.8
        }),
        new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xaaaa00,
            roughness: 0.3,
            metalness: 0.7
        }),
        new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00aa00,
            roughness: 0.4,
            metalness: 0.6
        })
    ];
    
    // Public methods
    function spawnTarget(plane, scene, originalMaterials, bossActive) {
        if (targets.length >= maxTargets || bossActive) return null;
        
        const geometry = targetGeometries[Math.floor(Math.random() * targetGeometries.length)];
        const material = targetMaterials[Math.floor(Math.random() * targetMaterials.length)].clone();
        
        const target = new THREE.Mesh(geometry, material);
        
        const spawnOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 2 * targetSpawnRadius,
            (Math.random() - 0.5) * 2 * targetSpawnRadius,
            targetSpawnDistance
        );
        
        const spawnPosition = plane.localToWorld(spawnOffset);
        target.position.copy(spawnPosition);
        target.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        target.castShadow = true;
        
        target.userData = {
            health: 30,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05,
                (Math.random()) * 0.1 + 0.05
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ),
            collisionRadius: 4.0,
            originalMaterial: material
        };
        
        originalMaterials.set(target, material);
        scene.add(target);
        targets.push(target);
        
        return target;
    }
    
    function damageTarget(target, amount, hitPosition, scene, score, updateScoreCallback) {
        // Safety checks first
        if (!target || !target.userData) {
            console.error("Invalid target passed to damageTarget:", target);
            return false;
        }
        
        console.log(`Target ${target?.uuid} taking damage: ${amount}. Current health: ${target?.userData?.health}`);
        
        // Safer health update
        if (typeof target.userData.health !== 'number') {
            console.warn("Target has invalid health value:", target.userData.health);
            target.userData.health = 30; // Reset to default
        }
        
        target.userData.health -= amount;
        
        // Material flash effect
        if (target.material) {
            const originalColor = target.material.color.clone();
            const originalEmissive = target.material.emissive.clone();
            
            target.material.color.set(0xffffff);
            target.material.emissive.set(0xffffff);
            
            setTimeout(() => {
                if (target.material) {
                    target.material.color.copy(originalColor);
                    target.material.emissive.copy(originalEmissive);
                }
            }, 50);
        }
        
        if (target.userData.health <= 0) {
            console.log(`Target ${target?.uuid} health <= 0. Destroying.`);
            effectsSystem.createExplosion(target.position);
            
            // Update score
            const scoreValue = 100;
            updateScoreCallback(score + scoreValue);
            
            // Play sounds
            audioSystem.playSound(audioSystem.hitSynth, "C3", "16n");
            audioSystem.playNoise(audioSystem.explosionSynth);
            
            // Remove target
            const index = targets.indexOf(target);
            if (index > -1) {
                console.log(`Removing target ${target?.uuid} from scene and array.`);
                scene.remove(target);
                if (target.userData.originalMaterial) {
                    target.userData.originalMaterial = null;
                }
                target.geometry.dispose();
                target.material.dispose();
                targets.splice(index, 1);
            }
            
            return true; // Target destroyed
        } else {
            console.log(`Target ${target?.uuid} damaged. New health: ${target.userData.health}`);
            audioSystem.playSound(audioSystem.hitSynth, "A4", "32n");
            return false; // Target damaged but not destroyed
        }
    }
    
    function updateTargets(deltaTime, plane, scene, isShifting, shiftMaterial, originalMaterials, bossActive) {
        // Update existing targets
        for (let i = targets.length - 1; i >= 0; i--) {
            const target = targets[i];
            
            // Safety check
            if (!target || !target.userData) {
                targets.splice(i, 1);
                continue;
            }
            
            // Move and rotate
            target.position.add(target.userData.velocity.clone().multiplyScalar(deltaTime));
            target.rotation.x += target.userData.rotationSpeed.x;
            target.rotation.y += target.userData.rotationSpeed.y;
            target.rotation.z += target.userData.rotationSpeed.z;
            
            // Handle material updating for dimension shift
            if (!isShifting && target.material !== target.userData.originalMaterial) {
                target.material = target.userData.originalMaterial;
            } else if (isShifting && target.material !== shiftMaterial) {
                target.material = shiftMaterial;
            }
            
            // Pulsating effect for emissive materials
            if (target.material.emissive) {
                const time = performance.now() * 0.002 + i * 0.5;
                target.material.emissiveIntensity = 0.5 + Math.sin(time) * 0.4;
                target.material.needsUpdate = true;
            }
            
            // Remove targets that go too far
            const distanceToPlane = target.position.distanceTo(plane.position);
            if (target.position.z > plane.position.z + 50 || distanceToPlane > 300) {
                scene.remove(target);
                originalMaterials.delete(target);
                target.geometry.dispose();
                target.material.dispose();
                targets.splice(i, 1);
            }
        }
        
        // Spawn new targets if needed
        const now = performance.now();
        if (!bossActive && now - lastSpawnTime > targetSpawnInterval) {
            spawnTarget(plane, scene, originalMaterials, bossActive);
            lastSpawnTime = now;
        }
    }
    
    function getTargets() {
        return targets;
    }
    
    function clearTargets(scene, originalMaterials) {
        for (let i = targets.length - 1; i >= 0; i--) {
            const target = targets[i];
            scene.remove(target);
            originalMaterials.delete(target);
            target.geometry.dispose();
            target.material.dispose();
        }
        targets = [];
    }
    
    function setSpawnParameters(distance, radius) {
        targetSpawnDistance = distance;
        targetSpawnRadius = radius;
    }
    
    function getSpawnParameters() {
        return {
            targetSpawnDistance,
            targetSpawnRadius
        };
    }
    
    // Public API
    return {
        spawnTarget,
        damageTarget,
        updateTargets,
        getTargets,
        clearTargets,
        setSpawnParameters,
        getSpawnParameters
    };
})();

// Export the module
export default targetsSystem;
