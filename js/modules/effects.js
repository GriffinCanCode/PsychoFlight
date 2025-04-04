// --- Effects Module ---
import audioSystem from './audio.js';

const effectsSystem = (() => {
    // Private variables
    let explosions = [];
    let gravityWells = [];
    
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
        
        // Reset timing
        lastGravityWellSpawn = performance.now();
    }
    
    // Public API
    return {
        createExplosion,
        updateExplosions,
        spawnGravityWell,
        applyGravity,
        updateGravityWells,
        getGravityWells,
        clearEffects
    };
})();

// Export the module
export default effectsSystem;
