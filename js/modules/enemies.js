// --- Enemies Module ---
import audioSystem from './audio.js';
import weaponsSystem from './weapons.js';
import effectsSystem from './effects.js';
import enemySprites from './enemy_sprites.js';

const enemiesSystem = (() => {
    // Create textures
    const textures = enemySprites.createTextures();

    // Enemy types with their unique properties
    const ENEMY_TYPES = {
        DRONE: {
            geometry: new THREE.OctahedronGeometry(2),
            material: new THREE.MeshStandardMaterial({
                map: textures.drone,
                color: 0xff0000,
                emissive: 0x500000,
                roughness: 0.3,
                metalness: 0.7,
                transparent: true,
                opacity: 0.9
            }),
            health: 40,
            speed: 0.08,
            behavior: 'chase',
            fireRate: 2000, // ms between shots
            points: 150,
            rotationSpeed: 0.02
        },
        SENTRY: {
            geometry: new THREE.TorusGeometry(1.5, 0.5, 16, 32),
            material: new THREE.MeshStandardMaterial({
                map: textures.sentry,
                color: 0x00ff00,
                emissive: 0x005000,
                roughness: 0.2,
                metalness: 0.8,
                transparent: true,
                opacity: 0.9
            }),
            health: 60,
            speed: 0.04,
            behavior: 'orbit',
            fireRate: 1500,
            points: 200,
            rotationSpeed: 0.01
        },
        STRIKER: {
            geometry: new THREE.ConeGeometry(1.5, 4, 8),
            material: new THREE.MeshStandardMaterial({
                map: textures.striker,
                color: 0x0000ff,
                emissive: 0x000050,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.9
            }),
            health: 30,
            speed: 0.12,
            behavior: 'ambush',
            fireRate: 3000,
            points: 250,
            rotationSpeed: 0.03
        }
    };

    // Private variables
    let enemies = [];
    let lastSpawnTime = 0;
    const spawnInterval = 5000; // 5 seconds between enemy spawns
    const maxEnemies = 5;

    // Behavior patterns
    const behaviors = {
        chase: (enemy, playerPos) => {
            const direction = new THREE.Vector3()
                .subVectors(playerPos, enemy.position)
                .normalize();
            
            enemy.userData.velocity.copy(direction.multiplyScalar(enemy.userData.speed));
            // Look at player
            enemy.lookAt(playerPos);
            // Add continuous rotation for visual effect
            enemy.rotateOnAxis(new THREE.Vector3(0, 1, 0), enemy.userData.rotationSpeed);
        },

        orbit: (enemy, playerPos) => {
            const distanceToPlayer = enemy.position.distanceTo(playerPos);
            const idealDistance = 20; // Desired orbit distance
            
            // Calculate orbit position
            const time = Date.now() * 0.001;
            const orbitX = Math.cos(time * enemy.userData.speed) * idealDistance;
            const orbitY = Math.sin(time * enemy.userData.speed) * idealDistance;
            
            const targetPos = new THREE.Vector3(
                playerPos.x + orbitX,
                playerPos.y + orbitY,
                playerPos.z
            );

            // Move towards orbit position
            const direction = new THREE.Vector3()
                .subVectors(targetPos, enemy.position)
                .normalize();
            
            enemy.userData.velocity.copy(direction.multiplyScalar(enemy.userData.speed));
            // Look at player
            enemy.lookAt(playerPos);
            // Add continuous rotation for shield effect
            enemy.rotateOnAxis(new THREE.Vector3(0, 0, 1), enemy.userData.rotationSpeed);
        },

        ambush: (enemy, playerPos) => {
            const distanceToPlayer = enemy.position.distanceTo(playerPos);
            
            if (distanceToPlayer > 30) {
                // Hide and wait
                enemy.userData.velocity.set(0, 0, 0);
                enemy.userData.charging = false;
                // Slow rotation while waiting
                enemy.rotateOnAxis(new THREE.Vector3(1, 1, 0), enemy.userData.rotationSpeed * 0.5);
            } else {
                // Charge at player
                if (!enemy.userData.charging) {
                    enemy.userData.charging = true;
                    audioSystem.playSound(audioSystem.weaponSynth, "C2", "8n");
                }
                
                const direction = new THREE.Vector3()
                    .subVectors(playerPos, enemy.position)
                    .normalize();
                
                enemy.userData.velocity.copy(direction.multiplyScalar(enemy.userData.speed * 2));
                enemy.lookAt(playerPos);
                // Fast rotation while charging
                enemy.rotateOnAxis(new THREE.Vector3(1, 0, 0), enemy.userData.rotationSpeed * 2);
            }
        }
    };

    function spawnEnemy(scene, playerPos) {
        if (enemies.length >= maxEnemies) return;

        // Choose random enemy type
        const types = Object.keys(ENEMY_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const enemyDef = ENEMY_TYPES[type];

        // Create enemy mesh
        const enemy = new THREE.Mesh(enemyDef.geometry, enemyDef.material.clone());

        // Random spawn position around player
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 20; // Spawn 40-60 units away
        
        enemy.position.set(
            playerPos.x + Math.cos(angle) * distance,
            playerPos.y + Math.sin(angle) * distance,
            playerPos.z - 20 - Math.random() * 20
        );

        // Initialize enemy properties
        enemy.userData = {
            type: type,
            health: enemyDef.health,
            speed: enemyDef.speed,
            behavior: enemyDef.behavior,
            velocity: new THREE.Vector3(),
            lastFireTime: 0,
            fireRate: enemyDef.fireRate,
            points: enemyDef.points,
            collisionRadius: 3.0,
            rotationSpeed: enemyDef.rotationSpeed
        };

        // Enable shadows
        enemy.castShadow = true;
        enemy.receiveShadow = true;

        scene.add(enemy);
        enemies.push(enemy);
        
        return enemy;
    }

    function updateEnemies(deltaTime, scene, playerPos) {
        // Spawn new enemies
        if (Date.now() - lastSpawnTime > spawnInterval) {
            spawnEnemy(scene, playerPos);
            lastSpawnTime = Date.now();
        }

        // Update existing enemies
        enemies.forEach(enemy => {
            // Execute behavior pattern
            behaviors[enemy.userData.behavior](enemy, playerPos);
            
            // Update position
            enemy.position.add(enemy.userData.velocity);

            // Fire at player if in range
            const distanceToPlayer = enemy.position.distanceTo(playerPos);
            if (distanceToPlayer < 30 && Date.now() - enemy.userData.lastFireTime > enemy.userData.fireRate) {
                const direction = new THREE.Vector3()
                    .subVectors(playerPos, enemy.position)
                    .normalize();
                
                weaponsSystem.createEnemyProjectile(enemy.position, direction, 0.3);
                enemy.userData.lastFireTime = Date.now();
                
                // Play firing sound
                audioSystem.playSound(audioSystem.weaponSynth, "E2", "16n");
            }

            // Remove enemies that are too far away
            if (enemy.position.z > 50 || 
                Math.abs(enemy.position.x) > 100 || 
                Math.abs(enemy.position.y) > 100) {
                scene.remove(enemy);
                enemy.geometry.dispose();
                enemy.material.dispose();
                const index = enemies.indexOf(enemy);
                if (index > -1) {
                    enemies.splice(index, 1);
                }
            }
        });
    }

    function damageEnemy(enemy, amount, hitPosition, scene, score, updateScoreCallback) {
        if (!enemy || !enemy.userData) return false;

        enemy.userData.health -= amount;

        // Visual feedback
        const originalColor = enemy.material.color.clone();
        const originalEmissive = enemy.material.emissive.clone();
        
        enemy.material.color.set(0xffffff);
        enemy.material.emissive.set(0xffffff);
        
        setTimeout(() => {
            if (enemy.material) {
                enemy.material.color.copy(originalColor);
                enemy.material.emissive.copy(originalEmissive);
            }
        }, 50);

        if (enemy.userData.health <= 0) {
            // Create explosion effect
            effectsSystem.createExplosion(enemy.position);
            
            // Update score
            updateScoreCallback(score + enemy.userData.points);
            
            // Play destruction sounds
            audioSystem.playSound(audioSystem.hitSynth, "C2", "16n");
            audioSystem.playNoise(audioSystem.explosionSynth);
            
            // Remove enemy
            const index = enemies.indexOf(enemy);
            if (index > -1) {
                scene.remove(enemy);
                enemy.geometry.dispose();
                enemy.material.dispose();
                enemies.splice(index, 1);
            }
            return true;
        }
        return false;
    }

    function getEnemies() {
        return enemies;
    }

    function clearEnemies(scene) {
        enemies.forEach(enemy => {
            scene.remove(enemy);
            enemy.geometry.dispose();
            enemy.material.dispose();
        });
        enemies = [];
    }

    // Public API
    return {
        updateEnemies,
        damageEnemy,
        getEnemies,
        clearEnemies
    };
})();

export default enemiesSystem; 