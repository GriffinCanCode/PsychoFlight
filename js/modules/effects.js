// --- Effects Module ---
import audioSystem from './audio.js';

const effectsSystem = (() => {
    // Private variables
    let explosions = [];
    let gravityWells = [];
    let effects = [];
    let zoneTransitions = [];
    let lightStreaks = []; // New array for light streaks
    let warpEffects = []; // New array for warp effects
    
    // Constants
    const explosionParticles = 30;
    const explosionParticleSize = 0.2;
    const explosionSpeed = 1.5;
    const explosionMaxAge = 40;
    const explosionColors = [0xffffff, 0xffff00, 0x00ffff, 0xff00ff];
    
    const gravityWellSpawnInterval = 8000;
    let lastGravityWellSpawn = 0;
    const gravityWellDuration = 10000;
    const gravityWellRadius = 15;
    const gravityWellStrength = 50;
    
    // Light streak constants
    const MAX_LIGHT_STREAKS = 30;
    const STREAK_COLORS = [0x00ffff, 0xffff00, 0xff00ff, 0xffffff];
    
    // Warp effect constants
    const MAX_WARP_LINES = 40;
    const WARP_LINE_COLORS = [0x00ffff, 0x8866ff, 0xff00ff, 0xffffff];
    const WARP_LINE_LENGTH_MIN = 50;
    const WARP_LINE_LENGTH_MAX = 150;
    
    // Textures
    const explosionTexture = (() => {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const x = c.getContext('2d');
        const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.7)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 32, 32);
        return new THREE.CanvasTexture(c);
    })();
    
    const lightStreakTexture = (() => {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 8;
        const x = c.getContext('2d');
        const g = x.createLinearGradient(0, 4, 64, 4);
        g.addColorStop(0.0, 'rgba(255,255,255,0)');
        g.addColorStop(0.2, 'rgba(255,255,255,0.5)');
        g.addColorStop(0.5, 'rgba(255,255,255,1)');
        g.addColorStop(0.8, 'rgba(255,255,255,0.5)');
        g.addColorStop(1.0, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 64, 8);
        return new THREE.CanvasTexture(c);
    })();
    
    const warpLineTexture = (() => {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 4;
        const x = c.getContext('2d');
        const g = x.createLinearGradient(0, 2, 256, 2);
        g.addColorStop(0.0, 'rgba(255,255,255,0)');
        g.addColorStop(0.1, 'rgba(255,255,255,0.2)');
        g.addColorStop(0.5, 'rgba(255,255,255,1)');
        g.addColorStop(0.9, 'rgba(255,255,255,0.2)');
        g.addColorStop(1.0, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 256, 4);
        return new THREE.CanvasTexture(c);
    })();
    
    // Public methods
    function createExplosion(position) {
        const d = {
            p: position.clone(),
            ps: []
        };
        const c = new THREE.Color(explosionColors[Math.floor(Math.random() * explosionColors.length)]);
        for (let i = 0; i < explosionParticles; i++) {
            const g = new THREE.PlaneGeometry(explosionParticleSize, explosionParticleSize);
            const m = new THREE.MeshBasicMaterial({
                map: explosionTexture,
                color: c,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const p = new THREE.Mesh(g, m);
            p.position.copy(position);
            const v = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
            v.normalize().multiplyScalar(explosionSpeed * (0.5 + Math.random() * 0.5));
            p.userData = {
                v: v,
                a: 0,
                ma: explosionMaxAge * (0.8 + Math.random() * 0.4)
            };
            window.scene.add(p);
            d.ps.push(p);
        }
        explosions.push(d);
        // Add explosion sound
        audioSystem.playNoise(audioSystem.explosionSynth, "4n");
    }
    
    function updateExplosions() {
        for (let i = explosions.length - 1; i >= 0; i--) {
            const e = explosions[i];
            let a = false;
            for (let j = e.ps.length - 1; j >= 0; j--) {
                const p = e.ps[j];
                p.position.add(p.userData.v);
                p.userData.a++;
                const n = p.userData.a / p.userData.ma;
                p.material.opacity = Math.max(0, 1.0 - n);
                const s = Math.max(0.1, 1.0 - n * 0.5);
                p.scale.set(s, s, s);
                if (p.userData.a < p.userData.ma) {
                    a = true;
                } else {
                    window.scene.remove(p);
                    if (p.material.map) p.material.map.dispose();
                    p.material.dispose();
                    p.geometry.dispose();
                    e.ps.splice(j, 1);
                }
            }
            if (!a) {
                explosions.splice(i, 1);
            }
        }
    }
    
    function spawnGravityWell() {
        const type = Math.random() > 0.5 ? 'well' : 'repulsor';
        const color = type === 'well' ? 0x8800ff : 0xff8800;
        const geometry = new THREE.SphereGeometry(gravityWellRadius, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15,
            wireframe: true
        });
        const well = new THREE.Mesh(geometry, material);
        
        // Safely access global spawn parameters
        const targetSpawnRadius = typeof window.targetSpawnRadius !== 'undefined' ? window.targetSpawnRadius : 40;
        const targetSpawnDistance = typeof window.targetSpawnDistance !== 'undefined' ? window.targetSpawnDistance : -150;
        
        const spawnOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 2 * targetSpawnRadius * 0.8,
            (Math.random() - 0.5) * 2 * targetSpawnRadius * 0.8,
            targetSpawnDistance * 0.7
        );
        
        if (!window.plane) {
            console.error("Cannot spawn gravity well: plane not defined");
            return;
        }
        
        const spawnPosition = window.plane.localToWorld(spawnOffset);
        well.position.copy(spawnPosition);
        well.userData = {
            type: type,
            strength: gravityWellStrength * (type === 'well' ? 1 : -1),
            radiusSq: gravityWellRadius * gravityWellRadius,
            spawnTime: Date.now(),
            duration: gravityWellDuration
        };
        window.scene.add(well);
        gravityWells.push(well);
        audioSystem.playSound(audioSystem.gravitySynth, type === 'well' ? "C2" : "G2", 1.5);
    }
    
    function applyGravity(object, objectVelocity, deltaTime) {
        const objectPos = object.position;
        gravityWells.forEach(well => {
            const wellPos = well.position;
            const diff = objectPos.clone().sub(wellPos);
            const distSq = diff.lengthSq();
            if (distSq < well.userData.radiusSq && distSq > 0.01) {
                const forceMagnitude = well.userData.strength / distSq;
                const force = diff.normalize().multiplyScalar(-forceMagnitude * deltaTime);
                objectVelocity.add(force); // Apply force to velocity
                objectVelocity.multiplyScalar(0.99); // Dampen
            }
        });
    }
    
    function updateGravityWells(deltaTime) {
        const now = Date.now();
        if (now - lastGravityWellSpawn > gravityWellSpawnInterval) {
            spawnGravityWell();
            lastGravityWellSpawn = now;
        }
        for (let i = gravityWells.length - 1; i >= 0; i--) {
            const well = gravityWells[i];
            const age = now - well.userData.spawnTime;
            if (age > well.userData.duration) {
                // Add sound for gravity well dissipation
                audioSystem.playSound(audioSystem.gravitySynth, "C1", 0.2); 
                window.scene.remove(well);
                well.geometry.dispose();
                well.material.dispose();
                gravityWells.splice(i, 1);
                continue;
            }
            well.material.opacity = 0.15 * (1 - age / well.userData.duration);
        }
    }
    
    function getGravityWells() {
        return gravityWells;
    }
    
    function clearEffects() {
        // Clean up explosions
        explosions.forEach(e => e.ps.forEach(p => {
            if (p.parent) p.parent.remove(p);
            if (p.geometry) p.geometry.dispose();
            if (p.material) p.material.dispose();
        }));
        explosions = [];
        
        // Clean up gravity wells
        gravityWells.forEach(well => {
            if (well.parent) well.parent.remove(well);
            if (well.geometry) well.geometry.dispose();
            if (well.material) well.material.dispose();
        });
        gravityWells = [];
        
        // Clean up light streaks
        lightStreaks.forEach(streak => {
            if (streak.parent) streak.parent.remove(streak);
            if (streak.geometry) streak.geometry.dispose();
            if (streak.material) streak.material.dispose();
        });
        lightStreaks = [];
        
        // Clean up warp effects
        warpEffects.forEach(line => {
            if (line.parent) line.parent.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        });
        warpEffects = [];
        
        // Reset timing
        lastGravityWellSpawn = performance.now();
    }
    
    function createTeleportEffect(position) {
        const geometry = new THREE.RingGeometry(0, 5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.lookAt(window.camera.position);
        
        ring.userData = {
            type: 'teleport_effect',
            createdAt: Date.now(),
            duration: 0.5 // Duration in seconds
        };
        
        window.scene.add(ring);
        
        // Add to effects array for updating
        effects.push(ring);
    }

    function createZoneTransitionEffect(position) {
        const transitionEffect = {
            position: position.clone(),
            age: 0,
            maxAge: 60,
            radius: 0,
            maxRadius: 100,
            particles: []
        };

        // Create expanding ring effect
        const ringGeometry = new THREE.RingGeometry(0, 1, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.scale.set(0.1, 0.1, 0.1);
        window.scene.add(ring);
        transitionEffect.ring = ring;

        // Create particles that expand outward
        for (let i = 0; i < 50; i++) {
            const particleGeometry = new THREE.PlaneGeometry(0.5, 0.5);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);

            // Random direction for particle
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 0.5;
            const direction = new THREE.Vector3(
                Math.cos(angle),
                Math.sin(angle),
                (Math.random() - 0.5) * 2
            ).normalize();

            particle.userData = {
                velocity: direction.multiplyScalar(speed),
                rotationSpeed: (Math.random() - 0.5) * 0.1
            };

            window.scene.add(particle);
            transitionEffect.particles.push(particle);
        }

        zoneTransitions.push(transitionEffect);
    }

    function updateZoneTransitions() {
        for (let i = zoneTransitions.length - 1; i >= 0; i--) {
            const effect = zoneTransitions[i];
            effect.age++;

            if (effect.age >= effect.maxAge) {
                // Remove effect
                if (effect.ring) {
                    window.scene.remove(effect.ring);
                    effect.ring.geometry.dispose();
                    effect.ring.material.dispose();
                }

                effect.particles.forEach(particle => {
                    window.scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                });

                zoneTransitions.splice(i, 1);
                continue;
            }

            // Update ring
            if (effect.ring) {
                const progress = effect.age / effect.maxAge;
                const scale = effect.maxRadius * Math.pow(progress, 0.5);
                effect.ring.scale.set(scale, scale, scale);
                effect.ring.material.opacity = 1 - progress;
            }

            // Update particles
            effect.particles.forEach(particle => {
                particle.position.add(particle.userData.velocity);
                particle.rotation.z += particle.userData.rotationSpeed;
                particle.material.opacity = 1 - (effect.age / effect.maxAge);
            });
        }
    }

    // Create light streak for acceleration effect
    function createLightStreak(playerPosition, playerVelocity) {
        // Check if we've reached the maximum number of streaks
        if (lightStreaks.length >= MAX_LIGHT_STREAKS) {
            // Reuse oldest streak
            const oldestStreak = lightStreaks.shift();
            window.scene.remove(oldestStreak);
            oldestStreak.geometry.dispose();
            oldestStreak.material.dispose();
        }
        
        // Calculate streak parameters
        const randomOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15
        );
        
        // Position the streak behind the player
        const streakPosition = playerPosition.clone().add(randomOffset);
        
        // Create streak mesh
        const streakLength = Math.random() * 3 + 2; // Random length between 2-5 units
        const streakWidth = Math.random() * 0.1 + 0.05; // Random width
        const streakGeometry = new THREE.PlaneGeometry(streakLength, streakWidth);
        
        // Choose random color from array
        const streakColor = new THREE.Color(STREAK_COLORS[Math.floor(Math.random() * STREAK_COLORS.length)]);
        
        const streakMaterial = new THREE.MeshBasicMaterial({
            map: lightStreakTexture,
            color: streakColor,
            transparent: true,
            opacity: Math.random() * 0.3 + 0.3, // Random opacity
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const streak = new THREE.Mesh(streakGeometry, streakMaterial);
        streak.position.copy(streakPosition);
        
        // Orient the streak to align with player motion
        streak.lookAt(streakPosition.clone().add(playerVelocity));
        
        // Rotate the streak randomly for variation
        streak.rotation.z = Math.random() * Math.PI * 2;
        
        // Add metadata for animation
        streak.userData = {
            createdAt: Date.now(),
            lifetime: Math.random() * 500 + 500, // 500-1000ms lifetime
            initialOpacity: streak.material.opacity
        };
        
        window.scene.add(streak);
        lightStreaks.push(streak);
        return streak;
    }
    
    // Update light streaks
    function updateLightStreaks() {
        const now = Date.now();
        
        for (let i = lightStreaks.length - 1; i >= 0; i--) {
            const streak = lightStreaks[i];
            const age = now - streak.userData.createdAt;
            
            if (age > streak.userData.lifetime) {
                // Remove expired streak
                window.scene.remove(streak);
                streak.geometry.dispose();
                streak.material.dispose();
                lightStreaks.splice(i, 1);
            } else {
                // Fade out streak over its lifetime
                const fadeRatio = age / streak.userData.lifetime;
                streak.material.opacity = streak.userData.initialOpacity * (1 - fadeRatio);
                
                // Stretch the streak as it ages
                const stretch = 1.0 + fadeRatio * 0.5;
                streak.scale.set(stretch, 1, 1);
            }
        }
    }

    // Create Star Trek style warp line effect
    function createWarpEffect(cameraPosition, cameraForward) {
        // Check if we've reached the maximum number of warp lines
        if (warpEffects.length >= MAX_WARP_LINES) {
            // Reuse oldest warp line
            const oldestLine = warpEffects.shift();
            window.scene.remove(oldestLine);
            oldestLine.geometry.dispose();
            oldestLine.material.dispose();
        }
        
        // Star Trek style lines should all appear to come from a single vanishing point
        // Higher density at the edges, less in center for better tunnel effect
        const angle = Math.random() * Math.PI * 2; // Random angle around the circle
        
        // Calculate distance from center with bias toward edges
        // Lower chance of lines in the center of view to reduce obstruction
        const minDistanceFactor = 0.3; // Minimum distance from center (0.0-1.0)
        let distanceFactor;
        
        // Use distribution that favors edges over center
        const rand = Math.random();
        if (rand < 0.7) {
            // 70% chance of edge-biased lines
            distanceFactor = minDistanceFactor + (1.0 - minDistanceFactor) * Math.pow(rand, 0.4);
        } else {
            // 30% chance of more centered lines (but still not exactly centered)
            distanceFactor = minDistanceFactor + (1.0 - minDistanceFactor) * Math.pow(rand, 1.2);
        }
        
        const distanceFromCenter = distanceFactor * 150; // Scale factor
        
        // Calculate angle-based offset from center line
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(window.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(window.camera.quaternion);
        
        // Start far in front and offset from center
        const startPositionOffset = new THREE.Vector3();
        startPositionOffset.addScaledVector(right, Math.cos(angle) * distanceFromCenter);
        startPositionOffset.addScaledVector(up, Math.sin(angle) * distanceFromCenter);
        // Place further out in front of camera
        startPositionOffset.addScaledVector(cameraForward, -700); // Further away for better perspective
        
        const lineStartPosition = cameraPosition.clone().add(startPositionOffset);
        
        // Calculate end position with stronger convergence for tunnel effect
        const endPositionOffset = new THREE.Vector3();
        // Very small convergence factor makes all lines converge to create tunnel
        const convergenceFactor = 0.01; // Very strong convergence
        endPositionOffset.addScaledVector(right, Math.cos(angle) * distanceFromCenter * convergenceFactor);
        endPositionOffset.addScaledVector(up, Math.sin(angle) * distanceFromCenter * convergenceFactor);
        // Place closer to camera but still in front
        endPositionOffset.addScaledVector(cameraForward, -60); // Closer to create stronger tunnel effect
        
        const lineEndPosition = cameraPosition.clone().add(endPositionOffset);
        
        // Create line geometry with better performance
        const lineGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            lineStartPosition.x, lineStartPosition.y, lineStartPosition.z,
            lineEndPosition.x, lineEndPosition.y, lineEndPosition.z
        ]);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        // Choose color with more subtle/cooler palette
        // Weight toward blue-white spectrum with subtle variation
        const colorRand = Math.random();
        let lineColor;
        
        if (colorRand < 0.8) {
            // 80% chance of subtle blue-white spectrum
            const blueShade = 0.6 + Math.random() * 0.4; // 0.6-1.0 range for blue
            const whiteAmount = 0.75 + Math.random() * 0.25; // 0.75-1.0 range for white
            lineColor = new THREE.Color(
                whiteAmount,  // More white tint
                whiteAmount,  // More white tint
                blueShade     // More blue
            );
        } else if (colorRand < 0.95) {
            // 15% chance of subtle cyan
            lineColor = new THREE.Color(0x88ccff);
        } else {
            // 5% chance of other colors from original array (for subtle color variety)
            lineColor = new THREE.Color(WARP_LINE_COLORS[Math.floor(Math.random() * WARP_LINE_COLORS.length)]);
        }
        
        // Create line material with much lower opacity for subtlety
        const lineMaterial = new THREE.LineBasicMaterial({
            color: lineColor,
            transparent: true,
            opacity: Math.random() * 0.15 + 0.1, // Much lower opacity (0.1-0.25)
            blending: THREE.AdditiveBlending,
            fog: false,
            linewidth: Math.random() * 1.5 + 0.5 // Thinner lines
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        
        // Add metadata for animation
        line.userData = {
            createdAt: Date.now(),
            lifetime: Math.random() * 600 + 400, // 400-1000ms lifetime for smoother appearance
            initialOpacity: lineMaterial.opacity,
            startPoint: lineStartPosition.clone(),
            endPoint: lineEndPosition.clone(),
            angle: angle,
            distanceFromCenter: distanceFromCenter,
            velocity: cameraForward.clone().multiplyScalar(-Math.random() * 100 - 150) // More velocity variation
        };
        
        window.scene.add(line);
        warpEffects.push(line);
        return line;
    }
    
    // Update warp effects
    function updateWarpEffects(deltaTime) {
        const now = Date.now();
        
        for (let i = warpEffects.length - 1; i >= 0; i--) {
            const line = warpEffects[i];
            const age = now - line.userData.createdAt;
            
            if (age > line.userData.lifetime) {
                // Remove expired line
                window.scene.remove(line);
                line.geometry.dispose();
                line.material.dispose();
                warpEffects.splice(i, 1);
            } else {
                // Smooth fade-in and fade-out for better appearance
                const fadeRatio = age / line.userData.lifetime;
                
                // Smooth fade curve
                let opacity;
                if (fadeRatio < 0.2) {
                    // Fade in during first 20% of lifetime (slower fade-in)
                    opacity = line.userData.initialOpacity * (fadeRatio / 0.2);
                } else if (fadeRatio > 0.6) {
                    // Fade out during last 40% of lifetime (gradual fade)
                    opacity = line.userData.initialOpacity * (1 - ((fadeRatio - 0.6) / 0.4));
                } else {
                    // Full opacity during middle portion of lifetime
                    opacity = line.userData.initialOpacity;
                }
                
                line.material.opacity = opacity;
                
                // Move line toward camera for tunnel effect
                if (line.userData.velocity) {
                    // Extract positions from geometry
                    const positions = line.geometry.attributes.position.array;
                    
                    // Apply velocity with more movement toward the camera
                    for (let j = 0; j < positions.length; j += 3) {
                        positions[j] += line.userData.velocity.x * deltaTime;
                        positions[j + 1] += line.userData.velocity.y * deltaTime;
                        positions[j + 2] += line.userData.velocity.z * deltaTime;
                    }
                    
                    // If too close to camera, fade out quickly
                    const endPoint = new THREE.Vector3(
                        positions[3], positions[4], positions[5]
                    );
                    
                    if (endPoint.z > -20) { // Closer to camera
                        line.material.opacity *= 0.7; // Faster fade out
                    }
                    
                    line.geometry.attributes.position.needsUpdate = true;
                }
                
                // Slight elongation effect for lines closer to camera
                if (age > line.userData.lifetime * 0.4) {
                    const stretchFactor = 1.0 + (fadeRatio - 0.4) * 0.4;
                    line.userData.stretchScale = stretchFactor;
                }
            }
        }
    }

    // Update effects array to include teleport effects
    function updateEffects(deltaTime) {
        const now = Date.now();
        
        for (let i = effects.length - 1; i >= 0; i--) {
            const effect = effects[i];
            
            if (effect.userData.type === 'teleport_effect') {
                const age = (now - effect.userData.createdAt) / 1000;
                if (age >= effect.userData.duration) {
                    window.scene.remove(effect);
                    effects.splice(i, 1);
                } else {
                    // Scale and fade out the ring
                    const progress = age / effect.userData.duration;
                    effect.scale.setScalar(1 + progress * 2);
                    effect.material.opacity = 0.8 * (1 - progress);
                }
            }
            // ... existing effect updates ...
        }

        updateExplosions();
        updateGravityWells(deltaTime);
        updateZoneTransitions();
        updateLightStreaks();
        updateWarpEffects(deltaTime);
    }
    
    // Public API
    return {
        createExplosion,
        updateExplosions,
        spawnGravityWell,
        applyGravity,
        updateGravityWells,
        getGravityWells,
        clearEffects,
        createTeleportEffect,
        updateEffects,
        createZoneTransitionEffect,
        createLightStreak,
        createWarpEffect
    };
})();

// Export the module
export default effectsSystem;
