// --- Zones Module ---
import audioSystem from './audio.js';
import effectsSystem from './effects.js';

const zonesSystem = (() => {
    // Private variables
    let currentZone = 'default';
    let zoneTransitionTime = 0;
    const ZONE_TRANSITION_DURATION = 2000; // 2 seconds for zone transitions
    
    // Zone definitions with their unique properties
    const zones = {
        default: {
            name: 'Void',
            baseColor: new THREE.Color(0x000000),
            ambientLight: {
                skyColor: 0xff00ff,
                groundColor: 0x00ffff,
                intensity: 1.5
            },
            targetSpawnRate: 1000,
            maxTargets: 15,
            targetSpeedMultiplier: 1.0,
            backgroundHueSpeed: 0.0005,
            starfieldRotationSpeed: 0.0001,
            starSize: 2.0,
            audioEffects: {
                reverbAmount: 0.5,
                delayAmount: 0.25
            }
        },
        crystal: {
            name: 'Crystal Caverns',
            baseColor: new THREE.Color(0x000022),
            ambientLight: {
                skyColor: 0x4040ff,
                groundColor: 0x00ffaa,
                intensity: 1.2
            },
            targetSpawnRate: 800,
            maxTargets: 20,
            targetSpeedMultiplier: 0.8,
            backgroundHueSpeed: 0.0003,
            starfieldRotationSpeed: 0.00005,
            starSize: 3.0,
            audioEffects: {
                reverbAmount: 0.8,
                delayAmount: 0.4
            }
        },
        plasma: {
            name: 'Plasma Storm',
            baseColor: new THREE.Color(0x220000),
            ambientLight: {
                skyColor: 0xff4040,
                groundColor: 0xffaa00,
                intensity: 1.8
            },
            targetSpawnRate: 600,
            maxTargets: 25,
            targetSpeedMultiplier: 1.2,
            backgroundHueSpeed: 0.001,
            starfieldRotationSpeed: 0.0002,
            starSize: 1.5,
            audioEffects: {
                reverbAmount: 0.3,
                delayAmount: 0.15
            }
        },
        quantum: {
            name: 'Quantum Realm',
            baseColor: new THREE.Color(0x002200),
            ambientLight: {
                skyColor: 0x40ff40,
                groundColor: 0xaaff00,
                intensity: 1.4
            },
            targetSpawnRate: 1200,
            maxTargets: 12,
            targetSpeedMultiplier: 1.5,
            backgroundHueSpeed: 0.0008,
            starfieldRotationSpeed: 0.00015,
            starSize: 2.5,
            audioEffects: {
                reverbAmount: 0.6,
                delayAmount: 0.3
            }
        }
    };

    // Public methods
    function getCurrentZone() {
        return zones[currentZone];
    }

    function getZoneByName(zoneName) {
        return zones[zoneName] || zones.default;
    }

    function transitionToZone(newZoneName) {
        if (!zones[newZoneName]) {
            console.error(`Invalid zone name: ${newZoneName}`);
            return false;
        }

        const oldZone = getCurrentZone();
        currentZone = newZoneName;
        const newZone = getCurrentZone();
        zoneTransitionTime = Date.now();

        // Play transition sound
        audioSystem.playSound(audioSystem.shiftSynth, "C4", "4n");

        // Create transition effect
        if (window.scene && window.plane) {
            effectsSystem.createZoneTransitionEffect(window.plane.position);
        }

        return true;
    }

    function updateZone(deltaTime, elapsedTime) {
        const currentZoneData = getCurrentZone();
        const transitionProgress = Math.min(
            (Date.now() - zoneTransitionTime) / ZONE_TRANSITION_DURATION,
            1.0
        );

        return {
            transitionProgress,
            currentZoneData
        };
    }

    // Export public API
    return {
        getCurrentZone,
        getZoneByName,
        transitionToZone,
        updateZone
    };
})();

export default zonesSystem; 