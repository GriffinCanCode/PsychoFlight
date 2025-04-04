// js/data/evolution_tree.js

// Weapon evolution tree system
// This file defines the structure of the weapon evolution tree shown in the UI

// Define weapon types with unique properties and visual styles
const weaponTypes = {
    // Base weapons
    basic: {
        id: 'basic',
        name: 'Basic Interceptor',
        description: 'Standard issue energy projector',
        damage: 10,
        fireRate: 1.0,
        color: '#40A0FF', // Light blue
        lineColor: '#40C0FF',
        icon: 'basic',
        unlocked: true, // Available from start
    },
    
    // Tier 1 Evolutions (from basic)
    flame: {
        id: 'flame',
        name: 'Flamethrower',
        description: 'Rapid fire energy bursts with spread pattern',
        damage: 15,
        fireRate: 1.2,
        color: '#FF8040', // Orange
        lineColor: '#FFA060',
        icon: 'flame',
        parentId: 'basic',
        requirements: { score: 1000 },
        unlocked: false
    },
    spread: {
        id: 'spread',
        name: 'Spread Shot',
        description: 'Multi-directional energy blasts',
        damage: 25,
        fireRate: 0.8,
        color: '#60FFFF', // Cyan
        lineColor: '#80FFFF',
        icon: 'spread',
        parentId: 'basic',
        requirements: { score: 1500 },
        unlocked: false
    },
    
    // Tier 2 Evolutions
    beam: {
        id: 'beam',
        name: 'Beam Cannon',
        description: 'Concentrated energy beam with high penetration',
        damage: 40,
        fireRate: 0.5,
        color: '#FF60FF', // Pink
        lineColor: '#FF80FF',
        icon: 'beam',
        parentId: 'spread',
        requirements: { score: 4000 },
        unlocked: false
    },
    nova: {
        id: 'nova',
        name: 'Nova Burst',
        description: 'Explosive energy pulses with area damage',
        damage: 35,
        fireRate: 0.7,
        color: '#FF4080', // Hot pink
        lineColor: '#FF6090',
        icon: 'nova',
        parentId: 'flame',
        requirements: { score: 3500 },
        unlocked: false
    },
    
    // Tier 3 Evolutions
    phaseShift: {
        id: 'phaseShift',
        name: 'Phase Disruptor',
        description: 'Reality-bending projectiles that phase through obstacles',
        damage: 50,
        fireRate: 0.6,
        color: '#A040FF', // Purple
        lineColor: '#C060FF',
        icon: 'phase',
        parentId: 'beam',
        requirements: { score: 7000 },
        unlocked: false
    },
    singularity: {
        id: 'singularity',
        name: 'Singularity',
        description: 'Generates miniature black holes that pull in enemies',
        damage: 60,
        fireRate: 0.4,
        color: '#FF8000', // Orange
        lineColor: '#FFA040',
        icon: 'singularity',
        parentId: 'nova',
        requirements: { score: 6500 },
        unlocked: false
    }
};

// Define the tree structure for visualization
const evolutionTree = {
    // Map weapon IDs to their positions in the tree visualization
    positions: {
        basic: { x: 0, y: 2 },     // Center position
        
        // Tier 1 (branching)
        flame: { x: -1.5, y: 1 },
        spread: { x: 1.5, y: 1 },
        
        // Tier 2
        nova: { x: -1.5, y: 0 },
        beam: { x: 1.5, y: 0 },
        
        // Tier 3
        singularity: { x: -1.5, y: -1 },
        phaseShift: { x: 1.5, y: -1 }
    },
    
    // Define the connections between nodes
    connections: [
        { from: 'basic', to: 'flame' },
        { from: 'basic', to: 'spread' },
        { from: 'flame', to: 'nova' },
        { from: 'spread', to: 'beam' },
        { from: 'nova', to: 'singularity' },
        { from: 'beam', to: 'phaseShift' }
    ],
    
    // Helper functions
    getWeapon: function(id) {
        return weaponTypes[id] || null;
    },
    
    getChildren: function(parentId) {
        return Object.values(weaponTypes).filter(weapon => weapon.parentId === parentId);
    },
    
    getParent: function(weaponId) {
        const weapon = this.getWeapon(weaponId);
        if (weapon && weapon.parentId) {
            return this.getWeapon(weapon.parentId);
        }
        return null;
    },
    
    getUnlockableWeapons: function(score) {
        return Object.values(weaponTypes).filter(weapon => 
            !weapon.unlocked && 
            weapon.requirements && 
            weapon.requirements.score <= score &&
            this.isParentUnlocked(weapon.id)
        );
    },
    
    isParentUnlocked: function(weaponId) {
        const weapon = this.getWeapon(weaponId);
        if (!weapon || !weapon.parentId) return true; // No parent means always available
        
        const parent = this.getWeapon(weapon.parentId);
        return parent && parent.unlocked;
    },
    
    unlockWeapon: function(weaponId) {
        const weapon = this.getWeapon(weaponId);
        if (weapon) {
            weapon.unlocked = true;
            return true;
        }
        return false;
    },
    
    getPath: function(fromId, toId) {
        // Find the path between two nodes in the tree
        const visited = new Set();
        const path = [];
        
        const dfs = (current, target, currentPath) => {
            if (current === target) {
                path.push(...currentPath);
                return true;
            }
            
            if (visited.has(current)) return false;
            visited.add(current);
            
            // Check parent direction
            const currentWeapon = this.getWeapon(current);
            if (currentWeapon && currentWeapon.parentId) {
                const newPath = [...currentPath, { from: current, to: currentWeapon.parentId }];
                if (dfs(currentWeapon.parentId, target, newPath)) return true;
            }
            
            // Check children directions
            const children = this.getChildren(current);
            for (const child of children) {
                const newPath = [...currentPath, { from: current, to: child.id }];
                if (dfs(child.id, target, newPath)) return true;
            }
            
            return false;
        };
        
        dfs(fromId, toId, []);
        return path;
    }
};

export { weaponTypes, evolutionTree }; 