// --- World Module ---
import zonesSystem from './zones.js';
import effectsSystem from './effects.js';
import audioSystem from './audio.js';

const worldSystem = (() => {
    // Private variables
    let scene = null;
    let stars = null;
    let baseStarSize = 2;
    let backgroundHue = 0;
    let backgroundHueSpeed = 0.0005;
    const baseBackgroundHueSpeed = 0.0005;
    const maxBackgroundHueSpeedBoost = 0.0015;
    
    // Zone progression variables
    let nextZoneScore = 2000;
    const ZONE_SCORE_INCREMENT = 2000;
    const ZONE_SEQUENCE = ['default', 'crystal', 'plasma', 'quantum'];
    let currentZoneIndex = 0;

    // Initialize world components
    function init(sceneRef) {
        scene = sceneRef;
        createStarfield();
        setupLighting();
    }

    // Create starfield
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
            scene.add(stars);
            
            console.log("Stars created successfully.");
        } catch(error) {
            console.error("Error creating stars:", error);
        }
    }

    // Setup basic lighting
    function setupLighting() {
        try {
            // Get the current zone for lighting settings
            const currentZone = zonesSystem.getCurrentZone();
            
            // Add ambient light
            const ambientLight = new THREE.HemisphereLight(
                currentZone.ambientLight.skyColor,
                currentZone.ambientLight.groundColor,
                currentZone.ambientLight.intensity
            );
            scene.add(ambientLight);
            
            // Add directional light
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
            
            console.log("Lighting created successfully.");
        } catch(error) {
            console.error("Error setting up lighting:", error);
        }
    }

    // Update world based on zone, time and audio levels
    function update(deltaTime, audioLevel, renderer, gameStartTime, score, targetSystem, playerSystem) {
        if (!scene || !stars) return;
        
        // Check for zone progression
        checkZoneProgression(score, targetSystem);
        
        const currentZone = zonesSystem.getCurrentZone();
        const { transitionProgress, currentZoneData } = zonesSystem.updateZone(deltaTime, Date.now());

        // Update background hue speed based on zone and audio level
        const targetHueSpeed = currentZone.backgroundHueSpeed + maxBackgroundHueSpeedBoost * audioLevel;
        backgroundHueSpeed = THREE.MathUtils.lerp(backgroundHueSpeed, targetHueSpeed, 0.1);
        backgroundHue = (backgroundHue + backgroundHueSpeed) % 1;
        
        // Blend between base color and hue-shifted color
        const bgColor = new THREE.Color();
        bgColor.setHSL(backgroundHue, 0.8, 0.1);
        bgColor.lerp(currentZone.baseColor, 0.5);
        renderer.setClearColor(bgColor);
        
        // Update ambient lighting
        const ambientLight = scene.children.find(c => c instanceof THREE.HemisphereLight);
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

    function checkZoneProgression(score, targetsSystem) {
        if (score >= nextZoneScore && currentZoneIndex < ZONE_SEQUENCE.length - 1) {
            currentZoneIndex++;
            const nextZone = ZONE_SEQUENCE[currentZoneIndex];
            zonesSystem.transitionToZone(nextZone);
            nextZoneScore += ZONE_SCORE_INCREMENT;
            
            // Update target parameters for new zone
            const zoneData = zonesSystem.getCurrentZone();
            if (targetsSystem && targetsSystem.updateZoneParameters) {
                targetsSystem.updateZoneParameters(
                    zoneData.targetSpawnRate,
                    zoneData.maxTargets,
                    zoneData.targetSpeedMultiplier
                );
            }
            
            // Create zone transition effect
            if (window.plane) {
                createZoneTransitionEffect(window.plane.position);
            }
            
            console.log(`Transitioned to zone: ${zoneData.name}`);
            return true;
        }
        return false;
    }

    function createZoneTransitionEffect(position) {
        if (scene) {
            effectsSystem.createZoneTransitionEffect(position);
        }
    }

    // Get stars for external reference if needed
    function getStars() {
        return stars;
    }

    function getCurrentZone() {
        return zonesSystem.getCurrentZone();
    }

    function getCurrentZoneName() {
        return zonesSystem.getCurrentZone().name;
    }

    function getZoneByName(zoneName) {
        return zonesSystem.getZoneByName(zoneName);
    }

    function transitionToZone(zoneName) {
        return zonesSystem.transitionToZone(zoneName);
    }

    function resetZoneProgression() {
        currentZoneIndex = 0;
        nextZoneScore = 2000;
    }

    // Export public API
    return {
        init,
        update,
        createZoneTransitionEffect,
        getStars,
        getCurrentZone,
        getCurrentZoneName,
        getZoneByName,
        transitionToZone,
        resetZoneProgression,
        checkZoneProgression
    };
})();

export default worldSystem; 