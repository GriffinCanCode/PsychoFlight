// --- Boss Module ---
import audioSystem from './audio.js';
import effectsSystem from './effects.js';
import weaponsSystem from './weapons.js';

const bossSystem = (() => {
    // Private variables
    let bossActive = false;
    let bossObject = null;
    let bossMaxHealth = 500;
    let bossHealth = bossMaxHealth;
    let bossPhase = 1;
    let bossNextAttackTime = 0;
    let bossAttackInterval = 2000;
    
    // Public methods
    function spawnBoss(plane, scene, originalMaterials) {
        if (bossActive) return null;
        
        bossActive = true;
        bossHealth = bossMaxHealth;
        bossPhase = 1;
        
        // Create boss mesh
        const geometry = new THREE.TorusKnotGeometry(8, 1.5, 150, 20);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xaa0000,
            roughness: 0.1,
            metalness: 0.9,
            wireframe: false
        });
        
        bossObject = new THREE.Mesh(geometry, material);
        
        const spawnOffset = new THREE.Vector3(0, 15, -100);
        const spawnPosition = plane.localToWorld(spawnOffset);
        bossObject.position.copy(spawnPosition);
        bossObject.castShadow = true;
        
        bossObject.userData = {
            collisionRadius: 10,
            velocity: new THREE.Vector3(0, 0, 0.02),
            rotationSpeed: new THREE.Vector3(0, 0.005, 0.002),
            originalMaterial: material
        };
        
        originalMaterials.set(bossObject, material);
        scene.add(bossObject);
        
        // Play boss entrance sound
        audioSystem.playSound(audioSystem.bossSynth, "C2", "2n");
        
        return bossObject;
    }
    
    function damageBoss(amount, hitPosition, scene, score, updateScoreCallback) {
        if (!bossActive || !bossObject) return false;
        
        bossHealth -= amount;
        
        // Material flash effect
        if (bossObject.material) {
            const originalColor = bossObject.material.color.clone();
            const originalEmissive = bossObject.material.emissive.clone();
            
            bossObject.material.color.set(0xffffff);
            bossObject.material.emissive.set(0xffffff);
            
            setTimeout(() => {
                if (bossObject && bossObject.material) {
                    bossObject.material.color.copy(originalColor);
                    bossObject.material.emissive.copy(originalEmissive);
                }
            }, 80);
        }
        
        // Phase transition
        if (bossPhase === 1 && bossHealth <= bossMaxHealth / 2) {
            bossPhase = 2;
            bossAttackInterval = 1000;
            
            bossObject.material.color.set(0xff8800);
            bossObject.material.emissive.set(0xaa4400);
            
            if (bossObject.userData.originalMaterial) {
                bossObject.userData.originalMaterial.color.copy(bossObject.material.color);
                bossObject.userData.originalMaterial.emissive.copy(bossObject.material.emissive);
            }
            
            audioSystem.playSound(audioSystem.bossSynth, "G2", "1n");
        }
        
        // Boss defeat
        if (bossHealth <= 0) {
            defeatBoss(scene, score, updateScoreCallback);
            return true;
        }
        
        // Play hit sound
        audioSystem.playSound(audioSystem.hitSynth, "E2", "8n");
        
        return false;
    }
    
    function defeatBoss(scene, score, updateScoreCallback) {
        if (!bossActive || !bossObject) return;
        
        bossActive = false;
        
        // Multiple explosions
        effectsSystem.createExplosion(bossObject.position);
        effectsSystem.createExplosion(bossObject.position.clone().add(new THREE.Vector3(5, 5, 0)));
        effectsSystem.createExplosion(bossObject.position.clone().add(new THREE.Vector3(-5, -5, 0)));
        
        // Remove boss
        scene.remove(bossObject);
        bossObject.geometry.dispose();
        bossObject.material.dispose();
        bossObject = null;
        
        // Update score
        const scoreValue = 5000;
        updateScoreCallback(score + scoreValue);
        
        // Play victory sound
        audioSystem.playSound(audioSystem.levelUpSynth, "C6", "1n");
    }
    
    function bossAttack(scene) {
        if (!bossActive || !bossObject) return;
        
        const now = Date.now();
        if (now > bossNextAttackTime) {
            const attackType = Math.random();
            
            // Target the player
            if (!window.plane) {
                console.error("Cannot target player: plane not defined");
                return;
            }
            
            const targetPosition = window.plane.position.clone().add(
                new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0).multiplyScalar(5)
            );
            
            const direction = targetPosition.sub(bossObject.position).normalize();
            
            if (bossPhase === 1) {
                // Phase 1: Simple single shots
                weaponsSystem.createEnemyProjectile(bossObject.position, direction, 0.3);
                audioSystem.playSound(audioSystem.weaponSynth, "A2", "8n");
                
                bossNextAttackTime = now + bossAttackInterval * (1 + Math.random());
            } else {
                // Phase 2: Mix of single shots and spread shots
                if (attackType < 0.7) {
                    // Fast single shot
                    weaponsSystem.createEnemyProjectile(bossObject.position, direction, 0.6);
                    audioSystem.playSound(audioSystem.weaponSynth, "C3", "16n");
                } else {
                    // Spread shot
                    audioSystem.playSound(audioSystem.weaponSynth, ["A2", "C3", "E3"], "8n");
                    
                    for (let i = 0; i < 3; i++) {
                        const spreadDirection = direction.clone();
                        const angle = (i - 1) * Math.PI / 16;
                        const axis = new THREE.Vector3(0, 1, 0);
                        spreadDirection.applyAxisAngle(axis, angle);
                        
                        weaponsSystem.createEnemyProjectile(bossObject.position, spreadDirection, 0.5);
                    }
                }
                
                bossNextAttackTime = now + bossAttackInterval * (0.8 + Math.random() * 0.4);
            }
        }
    }
    
    function updateBoss(deltaTime, plane, scene, isShifting, shiftMaterial, originalMaterials) {
        if (!bossActive || !bossObject) return;
        
        // Move and rotate
        bossObject.position.add(bossObject.userData.velocity.clone().multiplyScalar(deltaTime));
        bossObject.rotation.x += bossObject.userData.rotationSpeed.x;
        bossObject.rotation.y += bossObject.userData.rotationSpeed.y;
        bossObject.rotation.z += bossObject.userData.rotationSpeed.z;
        
        // Handle material updating for dimension shift
        if (!isShifting && bossObject.material !== bossObject.userData.originalMaterial) {
            bossObject.material = bossObject.userData.originalMaterial;
        } else if (isShifting && bossObject.material !== shiftMaterial) {
            bossObject.material = shiftMaterial;
        }
        
        // Boss attacks
        bossAttack(scene);
    }
    
    function isBossActive() {
        return bossActive;
    }
    
    function getBossObject() {
        return bossObject;
    }
    
    function getBossHealth() {
        return {
            current: bossHealth,
            max: bossMaxHealth,
            percentage: Math.max(0, bossHealth / bossMaxHealth) * 100
        };
    }
    
    function resetBoss() {
        if (bossObject) {
            if (bossObject.parent) bossObject.parent.remove(bossObject);
            bossObject.geometry.dispose();
            bossObject.material.dispose();
            bossObject = null;
        }
        
        bossActive = false;
        bossHealth = bossMaxHealth;
        bossPhase = 1;
        bossAttackInterval = 2000;
    }
    
    // Public API
    return {
        spawnBoss,
        damageBoss,
        updateBoss,
        isBossActive,
        getBossObject,
        getBossHealth,
        resetBoss
    };
})();

// Export the module
export default bossSystem;
