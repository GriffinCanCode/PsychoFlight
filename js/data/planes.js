// js/data/plane_data.js

// Defines the visual assets and basic properties for player planes.
// This structure allows adding more plane types later.

const planeData = {
    default: {
        name: "DefaultInterceptor",
        
        // --- Materials --- 
        materials: {
            fuselage: new THREE.MeshStandardMaterial({ 
                color: 0xcccccc, // Slightly darker base
                metalness: 0.9, 
                roughness: 0.2, 
                emissive: 0x00aaff, // Adjusted emissive
                emissiveIntensity: 0.4 
            }),
            wing: new THREE.MeshStandardMaterial({ 
                color: 0xaaaaaa, 
                metalness: 0.8, 
                roughness: 0.3, 
                emissive: 0xff00cc, // Adjusted emissive
                emissiveIntensity: 0.3 
            }),
            cockpit: new THREE.MeshStandardMaterial({ 
                color: 0x88ffff, // Cyan-ish cockpit
                emissive: 0xaaffff, 
                emissiveIntensity: 0.6, 
                transparent: true, 
                opacity: 0.75, 
                metalness: 0.1, 
                roughness: 0.1 
            }),
            engineGlow: new THREE.MeshBasicMaterial({
                color: 0xff8800,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            })
        },

        // --- Geometry Creation Function --- 
        createGeometry: function(materials) {
            const planeGroup = new THREE.Group();

            // Fuselage (using Cylinder for smoother look)
            const fuselageGeo = new THREE.CylinderGeometry(0.3, 0.4, 4, 16); // Tapered cylinder
            const fuselage = new THREE.Mesh(fuselageGeo, materials.fuselage);
            fuselage.rotation.x = Math.PI / 2; // Orient correctly
            fuselage.position.z = 0; // Center it for now
            fuselage.castShadow = true;
            planeGroup.add(fuselage);
            
            // Wings (using Box for now, could be Shape/Extrude later)
            const wingGeo = new THREE.BoxGeometry(6, 0.15, 1.5); // Slightly thicker
            const leftWing = new THREE.Mesh(wingGeo, materials.wing);
            leftWing.position.set(-3, 0, -0.5); // Position relative to fuselage center
            leftWing.castShadow = true;
            planeGroup.add(leftWing);
            
            const rightWing = leftWing.clone();
            rightWing.position.set(3, 0, -0.5);
            planeGroup.add(rightWing);
            
            // Tail Fin (Vertical Stabilizer)
            const tailFinGeo = new THREE.BoxGeometry(0.2, 1.2, 1); // Taller fin
            const tailFin = new THREE.Mesh(tailFinGeo, materials.wing);
            tailFin.position.set(0, 0.6, -1.8); // Position relative to fuselage
            tailFin.castShadow = true;
            planeGroup.add(tailFin);

             // Horizontal Stabilizers
             const hStabGeo = new THREE.BoxGeometry(2.5, 0.1, 0.8);
             const leftHStab = new THREE.Mesh(hStabGeo, materials.wing);
             leftHStab.position.set(-1.25, 0.1, -1.9);
             planeGroup.add(leftHStab);
 
             const rightHStab = leftHStab.clone();
             rightHStab.position.set(1.25, 0.1, -1.9);
             planeGroup.add(rightHStab);

            // Cockpit (Smoother Sphere segment)
            const cockpitGeo = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            const cockpit = new THREE.Mesh(cockpitGeo, materials.cockpit);
            cockpit.position.set(0, 0.3, 1.3); // Position on top/front
            cockpit.rotation.x = -Math.PI / 18; // Slight tilt
            planeGroup.add(cockpit);

            // Engine Glow (Simple sphere at the back)
            const engineGlowGeo = new THREE.SphereGeometry(0.25, 8, 8);
            const engineGlow = new THREE.Mesh(engineGlowGeo, materials.engineGlow);
            engineGlow.position.z = -2.1; // Position at the back of the fuselage
            planeGroup.add(engineGlow);
            engineGlow.userData.isEngineGlow = true; // Flag for animation

            // Store references to original materials for shift effect
            planeGroup.userData.originalMaterialsMap = new Map();
            planeGroup.traverse((child) => {
                if (child.isMesh) {
                    planeGroup.userData.originalMaterialsMap.set(child, child.material);
                }
            });

            return planeGroup;
        }
    }
    // --- Add more plane types here later --- 
    // experimental: { ... } 
};

export default planeData; 