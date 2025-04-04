// --- Weapons Module ---
import audioSystem from './audio.js';

const weaponsSystem = (() => {
    // Private variables
    let flames = [];
    let beamLine = null;
    let weaponLevel = 0; // WEAPON_FLAMETHROWER
    
    // Constants
    const WEAPON_FLAMETHROWER = 0;
    const WEAPON_SPREAD = 1;
    const WEAPON_BEAM = 2;
    const weaponNames = ["Flamethrower", "Spread Shot", "Beam Cannon"];
    
    const flameSpeed = 1.2;
    const flameSize = 0.18;
    const flameColorStart = [1, 0.8, 0];
    const flameColorEnd = [1, 0.2, 1];
    const flameParticlesPerFrame = 4;
    const flameSpreadAmount = 0.1;
    const flameMaxAge = 45;
    const flameCollisionRadius = 0.5;
    
    // Spread shot visual tweaks
    const spreadParticleSize = 0.15;
    const spreadParticleColor = new THREE.Color(0.8, 1.0, 1.0); // Cyan tint
    const spreadMaxAge = 35;
    
    const spreadAngle = Math.PI / 12;
    const spreadCount = 5;
    
    const beamDuration = 0.1;
    let beamEndTime = 0;
    
    // Textures
    const flameTexture = (() => {
        const c = document.createElement('canvas');
        c.width = 128; // Larger texture for better detail
        c.height = 128;
        const x = c.getContext('2d');
        
        // Create a more vibrant gradient
        const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Bright white core
        g.addColorStop(0.15, 'rgba(255, 240, 220, 1)'); // Warm inner glow
        g.addColorStop(0.4, 'rgba(255, 180, 50, 0.95)'); // Intense orange mid
        g.addColorStop(0.7, 'rgba(255, 50, 220, 0.85)'); // Vibrant pink outer
        g.addColorStop(0.9, 'rgba(150, 0, 255, 0.4)'); // Purple fade
        g.addColorStop(1, 'rgba(100, 0, 255, 0)'); // Final fade to transparent
        
        x.fillStyle = g;
        x.fillRect(0, 0, 128, 128);
        
        // Add some texture/noise for more interest
        x.globalCompositeOperation = 'overlay';
        for (let i = 0; i < 60; i++) { // Increased from 40 for more texture
            const size = Math.random() * 12 + 6; // Increased size variation
            const opacity = Math.random() * 0.3; // Increased max opacity
            x.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            x.beginPath();
            x.arc(
                Math.random() * 128, 
                Math.random() * 128, 
                size, 0, Math.PI * 2
            );
            x.fill();
        }
        
        return new THREE.CanvasTexture(c);
    })();
    
    // Create a special texture for spread shots
    const spreadTexture = (() => {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const x = c.getContext('2d');
        
        // Create a more dynamic cyan/blue gradient
        const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Pure white center
        g.addColorStop(0.2, 'rgba(180, 255, 255, 0.95)'); // Bright cyan
        g.addColorStop(0.4, 'rgba(80, 220, 255, 0.9)'); // Electric blue
        g.addColorStop(0.6, 'rgba(40, 180, 255, 0.8)'); // Deep blue
        g.addColorStop(0.8, 'rgba(0, 120, 255, 0.5)'); // Dark blue fade
        g.addColorStop(1, 'rgba(0, 80, 255, 0)'); // Final fade to transparent
        
        x.fillStyle = g;
        x.fillRect(0, 0, 128, 128);
        
        // Add more dynamic star-like shape with energy tendrils
        x.globalCompositeOperation = 'lighten';
        x.fillStyle = 'rgba(200, 255, 255, 0.8)';
        
        // Main star shape
        x.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2 / 5) - Math.PI/2;
            const length = 60;
            const x1 = 64 + Math.cos(angle) * length;
            const y1 = 64 + Math.sin(angle) * length;
            if (i === 0) x.moveTo(x1, y1);
            else x.lineTo(x1, y1);
            
            // Add energy tendrils
            const angle2 = angle + Math.PI * 2 / 10;
            const x2 = 64 + Math.cos(angle2) * (length * 0.6);
            const y2 = 64 + Math.sin(angle2) * (length * 0.6);
            x.lineTo(x2, y2);
            
            // Add extra detail points
            const angle3 = angle + Math.PI * 2 / 15;
            const x3 = 64 + Math.cos(angle3) * (length * 0.3);
            const y3 = 64 + Math.sin(angle3) * (length * 0.3);
            x.lineTo(x3, y3);
        }
        x.closePath();
        x.fill();
        
        // Add energy ripples
        for (let i = 0; i < 3; i++) {
            x.beginPath();
            x.arc(64, 64, 45 - i * 12, 0, Math.PI * 2);
            x.strokeStyle = `rgba(180, 255, 255, ${0.2 - i * 0.05})`;
            x.lineWidth = 2;
            x.stroke();
        }
        
        return new THREE.CanvasTexture(c);
    })();
    
    // Materials
    const beamMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, 
        linewidth: 3, // Make beam slightly thicker
        transparent: true, // Allow opacity changes
        opacity: 1.0 
    });
    
    // Public methods
    function createFlameParticle(origin, direction, speedMultiplier = 1, isEnemy = false, particleType = 'flame') {
        let size, particleColor, maxAge, texture;
        
        // Create geometry based on particle type
        let geometry;
        if (isEnemy) {
            geometry = new THREE.SphereGeometry(0.5, 8, 8);
        } else if (particleType === 'spread') {
            geometry = new THREE.PlaneGeometry(spreadParticleSize*3, spreadParticleSize*3);
        } else {
            geometry = new THREE.PlaneGeometry(flameSize*3, flameSize*3);
        }
        
        // Select texture and base color based on type
        if (particleType === 'spread') {
            texture = spreadTexture;
            particleColor = spreadParticleColor.clone();
            maxAge = spreadMaxAge;
        } else {
            texture = flameTexture;
            particleColor = new THREE.Color(0xffffff);
            maxAge = flameMaxAge;
        }
        
        // Create material with effects
        const material = isEnemy ? 
            new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.9
            }) : 
            new THREE.MeshBasicMaterial({
                map: texture,
                color: particleColor,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(origin);
        
        // Make projectiles extremely slow for reliable hit detection
        const speed = isEnemy ? 
            flameSpeed * 1.0 : // Enemies slower for player to avoid
            flameSpeed * speedMultiplier * 0.5; // Increased from 0.3 for better range while maintaining hit detection
        
        // Add random velocity variation for more natural look
        const velocityVariation = new THREE.Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            0
        );
        
        // Calculate velocity and orientation
        const normalizedDir = direction.clone().normalize();
        const velocity = normalizedDir.clone().multiplyScalar(speed).add(velocityVariation);
        
        // Set particle orientation - make it face the direction of travel
        // Since our geometry is created facing +Z, and we want it to face the direction of travel,
        // we need to rotate it 180 degrees around Y first
        const baseRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        
        // Then create the rotation to face the direction
        const directionRotation = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        const matrix = new THREE.Matrix4().lookAt(
            new THREE.Vector3(0, 0, 0),  // from origin
            normalizedDir,                // looking in direction of travel
            up                           // up vector
        );
        directionRotation.setFromRotationMatrix(matrix);
        
        // Combine the rotations
        particle.quaternion.multiplyQuaternions(directionRotation, baseRotation);
        
        // Store data for movement and lifecycle
        particle.userData = {
            velocity: velocity,
            age: 0,
            maxAge: (isEnemy ? 150 : maxAge + Math.floor(Math.random() * 15)),
            isEnemyProjectile: isEnemy,
            type: isEnemy ? 'enemy' : particleType,
            previousPosition: origin.clone(),
            radius: isEnemy ? 0.5 : 8.0,
            rotationSpeed: Math.random() * 0.1 - 0.05,
            scale: 1.0,
            createTrail: !isEnemy && Math.random() > 0.3,
            lastTrailTime: performance.now(),
            trailInterval: 50 + Math.random() * 100
        };
        
        if (window.scene) {
            window.scene.add(particle);
            flames.push(particle);
            
            // Add initial burst of light to make firing more impactful
            if (!isEnemy) {
                const burstGeometry = new THREE.PlaneGeometry(
                    particleType === 'spread' ? spreadParticleSize*4 : flameSize*4, 
                    particleType === 'spread' ? spreadParticleSize*4 : flameSize*4
                );
                const burstMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    color: particleColor,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                
                const burst = new THREE.Mesh(burstGeometry, burstMaterial);
                burst.position.copy(origin);
                burst.lookAt(origin.clone().add(direction));
                burst.userData = { 
                    isBurst: true,
                    age: 0, 
                    maxAge: 10
                };
                
                window.scene.add(burst);
                flames.push(burst); // Add to flames array for lifecycle management
            }
        } else {
            console.error("Cannot create flame particle: scene not available");
        }
    }
    
    function createEnemyProjectile(origin, direction, speed) {
        createFlameParticle(origin, direction, speed, true);
    }
    
    function fireWeapon(origin, aimDirection, scene, targets, bossObject, bossActive) {
        const now = Tone.now();
        
        // Ensure we have valid origin and direction
        if (!origin || !aimDirection) {
            console.error("Invalid origin or aimDirection:", origin, aimDirection);
            return;
        }
        
        // Debug projectile origin and direction
        console.log("Firing from:", origin.x.toFixed(2), origin.y.toFixed(2), origin.z.toFixed(2), 
                    "Aiming:", aimDirection.x.toFixed(2), aimDirection.y.toFixed(2), aimDirection.z.toFixed(2));
        
        if (weaponLevel === WEAPON_FLAMETHROWER) {
            audioSystem.playNoise(audioSystem.flamethrowerSynth, "32n", now);
            for (let i = 0; i < flameParticlesPerFrame; i++) {
                const d = aimDirection.clone();
                // Add spread in a cone shape
                const spreadAngle = Math.random() * Math.PI * 2;
                const spreadRadius = Math.random() * flameSpreadAmount;
                d.x += Math.cos(spreadAngle) * spreadRadius;
                d.y += Math.sin(spreadAngle) * spreadRadius;
                d.normalize();
                createFlameParticle(origin, d, 1.0, false, 'flame');
            }
        } else if (weaponLevel === WEAPON_SPREAD) {
            audioSystem.playSound(audioSystem.spreadSynth, ["C4", "E4", "G4"], "8n", now);
            for (let i = 0; i < spreadCount; i++) {
                const angle = (i - (spreadCount - 1) / 2) * spreadAngle;
                const d = aimDirection.clone();
                
                // Use the plane's up vector for consistent spread pattern
                const upVector = new THREE.Vector3(0, 1, 0);
                if (window.plane) {
                    upVector.applyQuaternion(window.plane.quaternion);
                }
                
                d.applyAxisAngle(upVector, angle);
                d.normalize();
                createFlameParticle(origin, d, 0.85, false, 'spread');
            }
        } else if (weaponLevel === WEAPON_BEAM) {
            audioSystem.playSound(audioSystem.beamSynth, "G5", "16n", now);
            const beamRaycaster = new THREE.Raycaster();
            beamRaycaster.set(origin, aimDirection);
            
            const intersectObjects = [...targets];
            if (bossActive && bossObject) {
                intersectObjects.push(bossObject);
            }
            
            const intersects = beamRaycaster.intersectObjects(intersectObjects);
            
            let hitPoint = origin.clone().add(aimDirection.clone().multiplyScalar(500));
            
            if (intersects.length > 0) {
                const firstHit = intersects[0];
                hitPoint = firstHit.point;
                const hitObject = firstHit.object;
                
                const targetIndex = targets.indexOf(hitObject);
                if (targetIndex > -1) {
                    console.log("Beam hit target:", hitObject.uuid);
                    if (typeof window.damageTarget === 'function') {
                        window.damageTarget(targets[targetIndex], 50, hitPoint);
                    }
                } else if (bossActive && hitObject === bossObject) {
                    console.log("Beam hit boss");
                    if (typeof window.damageBoss === 'function') {
                        window.damageBoss(15, hitPoint);
                    }
                }
            }
            
            if (beamLine) scene.remove(beamLine);
            const beamGeometry = new THREE.BufferGeometry().setFromPoints([origin, hitPoint]);
            beamLine = new THREE.Line(beamGeometry, beamMaterial);
            scene.add(beamLine);
            beamEndTime = Date.now() + beamDuration * 1000;
        }
    }
    
    function updateProjectiles(deltaTime, targets, bossObject, bossActive, damageTarget, damageBoss) {
        // Process beam weapon
        if (beamLine && Date.now() > beamEndTime) {
            // Fade out beam quickly
            const fadeDuration = 50; // ms
            const timeSinceEnd = Date.now() - beamEndTime;
            beamLine.material.opacity = Math.max(0, 1.0 - timeSinceEnd / fadeDuration);
            if (beamLine.material.opacity <= 0) {
                if (window.scene) {
                    window.scene.remove(beamLine);
                    beamLine.geometry.dispose();
                    beamLine = null;
                }
            }
        } else if (beamLine) {
            // Keep beam fully opaque while active
            beamLine.material.opacity = 1.0;
        }
        
        const currentTime = performance.now();
        
        for (let i = flames.length - 1; i >= 0; i--) {
            const flame = flames[i];
            
            // Handle marked for removal
            if (flame && flame.userData && flame.userData.markedForRemoval) {
                if (flame.parent) flame.parent.remove(flame);
                if (flame.material) {
                    if (flame.material.map) flame.material.map.dispose();
                    flame.material.dispose();
                }
                if (flame.geometry) flame.geometry.dispose();
                flames.splice(i, 1);
                continue;
            }
            
            // Check if valid
            if (!flame || !flame.userData) {
                flames.splice(i, 1);
                continue;
            }
            
            // Handle trail particles separately - they just fade
            if (flame.userData.isTrail || flame.userData.isBurst) {
                flame.userData.age++;
                const normalizedAge = flame.userData.age / flame.userData.maxAge;
                
                // Fade out trail
                flame.material.opacity = Math.max(0, 0.6 * (1.0 - normalizedAge));
                
                // Grow slightly
                const scale = flame.userData.scale * (1.0 + normalizedAge * 0.5);
                flame.scale.set(scale, scale, scale);
                
                // Remove when expired
                if (flame.userData.age > flame.userData.maxAge) {
                    if (window.scene) window.scene.remove(flame);
                    if (flame.material.map) flame.material.map.dispose();
                    flame.material.dispose();
                    flame.geometry.dispose();
                    flames.splice(i, 1);
                }
                continue;
            }
            
            // Save previous position for continuous collision detection
            if (!flame.userData.previousPosition && flame.position) {
                flame.userData.previousPosition = flame.position.clone();
            }
            
            // Update position - with safety checks
            let nextPosition;
            if (flame.position && flame.userData.velocity) {
                nextPosition = flame.position.clone();
                nextPosition.add(flame.userData.velocity.clone().multiplyScalar(deltaTime));
                flame.position.copy(nextPosition);
                // Store current position as previous for next frame
                if (flame.position) {
                    flame.userData.previousPosition = flame.position.clone();
                }
            } else {
                // If we don't have valid position/velocity, mark for removal
                flame.userData.markedForRemoval = true;
                continue;
            }
            
            // Update aging
            flame.userData.age++;
            const normalizedAge = flame.userData.age / flame.userData.maxAge;
            
            // Create trail particles
            if (flame.userData.createTrail && 
                currentTime - flame.userData.lastTrailTime > flame.userData.trailInterval) {
                createTrailParticle(flame.position.clone(), flame.userData.type);
                flame.userData.lastTrailTime = currentTime;
            }
            
            // Update appearance based on type
            if (!flame.userData.isEnemyProjectile) {
                // Enhanced rotation effect based on velocity
                if (flame.userData.rotationSpeed) {
                    const speedFactor = flame.userData.velocity.length() / flameSpeed;
                    flame.rotation.z += flame.userData.rotationSpeed * speedFactor;
                }
                
                // Enhanced pulsing scale effect
                const age = currentTime - flame.userData.age;
                const pulseSpeed = 0.015; // Increased from 0.01
                const pulseAmount = 0.2; // Increased from 0.15
                const pulseScale = 1.0 + Math.sin(age * pulseSpeed) * pulseAmount;
                
                if (flame.userData.type === 'flame') {
                    let color = new THREE.Color();
                    
                    // More dynamic color transition
                    const startColor = new THREE.Color(
                        flameColorStart[0],
                        flameColorStart[1] + Math.sin(age * 0.01) * 0.2, // Oscillating brightness
                        flameColorStart[2]
                    );
                    const endColor = new THREE.Color(
                        flameColorEnd[0], 
                        flameColorEnd[1] + Math.cos(age * 0.02) * 0.3, // Different oscillation
                        flameColorEnd[2] + Math.sin(age * 0.015) * 0.2 // Third oscillation
                    );
                    
                    // Add velocity-based color shift
                    const speedFactor = flame.userData.velocity.length() / flameSpeed;
                    const colorShift = Math.min(1, Math.max(0, speedFactor - 0.5));
                    
                    color.lerpColors(startColor, endColor, normalizedAge * (1 + colorShift * 0.3));
                    flame.material.color.set(color);
                    
                    // Enhanced opacity curve with velocity influence
                    const opacityCurve = Math.max(0, 1.0 - Math.pow(normalizedAge * (1.2 - colorShift * 0.2), 2));
                    flame.material.opacity = opacityCurve;
                    
                    // Enhanced scaling effect with velocity influence
                    const scaleCurve = Math.max(0.1, 1.0 + 
                        Math.sin(normalizedAge * Math.PI) * 0.4 - 
                        normalizedAge * (0.3 - colorShift * 0.1));
                    const finalScale = scaleCurve * pulseScale * (1 + colorShift * 0.2);
                    flame.scale.set(finalScale, finalScale, finalScale);
                    
                } else if (flame.userData.type === 'spread') {
                    // Enhanced spread shot effects
                    
                    // Velocity-based rotation
                    const speedFactor = flame.userData.velocity.length() / flameSpeed;
                    flame.rotation.z += 0.05 * speedFactor;
                    
                    // Enhanced opacity curve with energy pulse
                    const energyPulse = Math.sin(age * 0.1) * 0.15;
                    const opacityCurve = Math.max(0, 1.0 - Math.pow(normalizedAge, 2.5) + energyPulse);
                    flame.material.opacity = opacityCurve;
                    
                    // Enhanced scale effect with energy surge
                    const energySurge = Math.max(0, Math.sin(normalizedAge * Math.PI * 2) * 0.2);
                    const scaleCurve = Math.max(0.1, 1.0 - Math.pow(normalizedAge, 1.8) * 0.5 + energySurge);
                    const finalScale = scaleCurve * pulseScale * (1 + speedFactor * 0.15);
                    flame.scale.set(finalScale, finalScale, finalScale);
                    
                    // Dynamic color shifting
                    const startColor = new THREE.Color(0.3, 0.8, 1.0);
                    const endColor = new THREE.Color(0.8, 1.0, 1.0);
                    const energyColor = new THREE.Color(0.9, 1.0, 0.9);
                    
                    const baseColor = new THREE.Color().lerpColors(
                        startColor, endColor, Math.sin(normalizedAge * Math.PI)
                    );
                    // Add energy surge color blend
                    baseColor.lerp(energyColor, energySurge);
                    flame.material.color.set(baseColor);
                }
            }
            
            let hit = false;
            
            // Check for collisions if this is a player projectile
            if (!flame.userData.isEnemyProjectile) {
                // Use the projectile's stored radius (or a default large value)
                const projectileRadius = flame.userData.radius || 5.0;
                
                // Simple collision detection against all targets
                for (let j = 0; j < targets.length; j++) {
                    const target = targets[j];
                    if (!target || !target.position || !target.userData) continue;
                    
                    const targetRadius = target.userData.collisionRadius || 4.0;
                    const totalRadius = targetRadius + projectileRadius;
                    
                    // Simple distance-based collision detection
                    const distance = flame.position.distanceTo(target.position);
                    
                    if (distance < totalRadius) {
                        console.log(`DIRECT HIT: Projectile ${i} hit target ${target.uuid} at distance ${distance.toFixed(2)}`);
                        
                        // Try damage function
                        if (typeof damageTarget === 'function') {
                            damageTarget(target, 10, flame.position);
                            hit = true;
                            break;
                        } else if (typeof window.damageTarget === 'function') {
                            window.damageTarget(target, 10, flame.position);
                            hit = true;
                            break;
                        } else {
                            console.error("No damageTarget function available!");
                        }
                    }
                }
                
                // Same simplified approach for boss
                if (!hit && bossActive && bossObject) {
                    const bossRadius = bossObject.userData?.collisionRadius || 10.0;
                    const totalRadius = bossRadius + projectileRadius;
                    
                    const distance = flame.position.distanceTo(bossObject.position);
                    
                    if (distance < totalRadius) {
                        console.log(`DIRECT HIT: Projectile hit boss at distance ${distance.toFixed(2)}`);
                        
                        if (typeof damageBoss === 'function') {
                            damageBoss(5, flame.position);
                            hit = true;
                        } else if (typeof window.damageBoss === 'function') {
                            window.damageBoss(5, flame.position);
                            hit = true;
                        } else {
                            console.error("No damageBoss function available!");
                        }
                    }
                }
            }
            
            // Move to new position after collision check
            flame.position.copy(nextPosition);
            // Store current position as previous for next frame
            flame.userData.previousPosition = flame.position.clone();
            
            // Remove if hit something or expired
            if (hit || flame.userData.age > flame.userData.maxAge) {
                // Create hit effect if projectile hit something
                if (hit && window.scene) {
                    try {
                        // Safely create hit effect with position clone
                        const hitPosition = flame.position ? flame.position.clone() : new THREE.Vector3();
                        createHitEffect(hitPosition, flame.userData.type || 'flame');
                    } catch (err) {
                        console.warn("Error creating hit effect:", err);
                    }
                }
                
                if (window.scene) window.scene.remove(flame);
                if (flame.material && flame.material.map) flame.material.map.dispose();
                if (flame.material) flame.material.dispose();
                if (flame.geometry) flame.geometry.dispose();
                flames.splice(i, 1);
            }
        }
    }
    
    // Create a trail particle behind a projectile
    function createTrailParticle(position, particleType) {
        // Safety check - ensure we have a valid position
        if (!position) {
            console.warn("Invalid position for trail particle");
            return;
        }
        
        const size = particleType === 'spread' ? spreadParticleSize * 2.5 : flameSize * 2.5; // Increased size
        const geometry = new THREE.PlaneGeometry(size, size);
        const texture = particleType === 'spread' ? spreadTexture : flameTexture;
        const color = particleType === 'spread' ? 
            new THREE.Color(0.6 + Math.random() * 0.4, 0.9, 1.0) : // Randomized spread color
            new THREE.Color(1.0, 0.7 + Math.random() * 0.3, 0.5 + Math.random() * 0.5); // Randomized flame color
        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            color: color,
            transparent: true,
            opacity: 0.7, // Increased from 0.6
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        
        const trail = new THREE.Mesh(geometry, material);
        trail.position.copy(position);
        
        // Enhanced rotation for variety
        trail.rotation.z = Math.random() * Math.PI * 2;
        if (Math.random() > 0.5) { // Sometimes add tilt for more dynamism
            trail.rotation.x = (Math.random() - 0.5) * 0.5;
            trail.rotation.y = (Math.random() - 0.5) * 0.5;
        }
        
        trail.userData = {
            isTrail: true,
            age: 0,
            maxAge: 20 + Math.random() * 15, // Increased variation
            scale: 0.8 + Math.random() * 0.4, // Increased variation
            rotationSpeed: (Math.random() - 0.5) * 0.1 // Added rotation
        };
        
        if (window.scene) {
            window.scene.add(trail);
            flames.push(trail);
        }
    }
    
    // Create visual effect when projectile hits a target
    function createHitEffect(position, particleType) {
        // Safety check - ensure we have a valid position
        if (!position) {
            console.warn("Invalid position for hit effect");
            return;
        }
        
        // Default to flame type if not specified
        particleType = particleType || 'flame';
        
        const size = particleType === 'spread' ? 3.0 : 2.5;
        const burstCount = particleType === 'spread' ? 8 : 6;
        const texture = particleType === 'spread' ? spreadTexture : flameTexture;
        
        // Create main hit flash
        const hitGeometry = new THREE.PlaneGeometry(size, size);
        const hitMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            color: particleType === 'spread' ? 0x80ffff : 0xffaa00,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        
        const hitFlash = new THREE.Mesh(hitGeometry, hitMaterial);
        hitFlash.position.copy(position);
        hitFlash.rotation.z = Math.random() * Math.PI * 2;
        hitFlash.userData = {
            isHitEffect: true,
            age: 0,
            maxAge: 10
        };
        
        if (window.scene) {
            window.scene.add(hitFlash);
            flames.push(hitFlash);
            
            // Create burst particles
            for (let i = 0; i < burstCount; i++) {
                const burstGeometry = new THREE.PlaneGeometry(size * 0.5, size * 0.5);
                const burstMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    color: particleType === 'spread' ? 0x40ffff : 0xff8800,
                    transparent: true,
                    opacity: 0.7,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                
                const burst = new THREE.Mesh(burstGeometry, burstMaterial);
                burst.position.copy(position);
                
                // Random direction
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.05 + Math.random() * 0.05;
                const direction = new THREE.Vector3(
                    Math.cos(angle), 
                    Math.sin(angle), 
                    (Math.random() - 0.5) * 0.5
                );
                
                burst.userData = {
                    isHitEffect: true,
                    age: 0,
                    maxAge: 15 + Math.random() * 10,
                    velocity: direction.multiplyScalar(speed)
                };
                
                window.scene.add(burst);
                flames.push(burst);
            }
        }
    }
    
    function checkWeaponLevelUp(score, scoreThresholds) {
        let leveledUp = false;
        
        if (weaponLevel === WEAPON_FLAMETHROWER && score >= scoreThresholds.spread) {
            weaponLevel = WEAPON_SPREAD;
            leveledUp = true;
        }
        
        if (weaponLevel === WEAPON_SPREAD && score >= scoreThresholds.beam) {
            weaponLevel = WEAPON_BEAM;
            leveledUp = true;
        }
        
        if (leveledUp) {
            audioSystem.playSound(audioSystem.levelUpSynth, "C5", "0.5n");
        }
        
        return { weaponLevel, leveledUp };
    }
    
    function getWeaponName() {
        return weaponNames[weaponLevel];
    }
    
    function getFlames() {
        return flames;
    }
    
    function setWeaponLevel(level) {
        weaponLevel = level;
    }
    
    function getWeaponLevel() {
        return weaponLevel;
    }
    
    function clearProjectiles() {
        for (let i = flames.length - 1; i >= 0; i--) {
            const flame = flames[i];
            if (flame.parent) flame.parent.remove(flame);
            if (flame.material) {
                if (flame.material.map) flame.material.map.dispose();
                flame.material.dispose();
            }
            if (flame.geometry) flame.geometry.dispose();
        }
        flames = [];
        
        if (beamLine) {
            if (beamLine.parent) beamLine.parent.remove(beamLine);
            beamLine.geometry.dispose();
            beamLine.material.dispose();
            beamLine = null;
        }
    }
    
    // Public API
    return {
        WEAPON_FLAMETHROWER,
        WEAPON_SPREAD,
        WEAPON_BEAM,
        createFlameParticle,
        createEnemyProjectile,
        fireWeapon,
        updateProjectiles,
        checkWeaponLevelUp,
        getWeaponName,
        getFlames,
        setWeaponLevel,
        getWeaponLevel,
        clearProjectiles
    };
})();

// Export the module
export default weaponsSystem;
