import { weaponTypes, evolutionTree } from '../data/evolution_tree.js';
import audioSystem from './audio.js';

const evolutionUI = (() => {
    // Private variables
    let isEvolutionMenuOpen = false;
    let currentWeaponId = 'basic';
    let evolutionContainer;
    let svg;
    let nodeElements = new Map();
    let lineElements = new Map();
    let selectedPath = [];
    
    // SVG namespace
    const svgNS = "http://www.w3.org/2000/svg";
    
    // Constants
    const SVG_WIDTH = 800;
    const SVG_HEIGHT = 600;
    const NODE_RADIUS = 40;
    const GRID_SIZE_X = 100;
    const GRID_SIZE_Y = 90;
    const CENTER_X = SVG_WIDTH / 2;
    const CENTER_Y = SVG_HEIGHT / 2 - 50; // Shift up a bit
    
    // Initialization
    function init() {
        createEvolutionMenu();
        setupEventListeners();
        return { evolutionContainer };
    }
    
    // Create the main evolution menu container
    function createEvolutionMenu() {
        // Create container
        evolutionContainer = document.createElement('div');
        evolutionContainer.id = 'evolutionMenu';
        evolutionContainer.className = 'evolution-menu-container';
        evolutionContainer.style.display = 'none';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'evolution-header';
        
        const title = document.createElement('h2');
        title.textContent = 'WEAPON EVOLUTION';
        title.className = 'evolution-title';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.className = 'evolution-close-btn';
        closeBtn.addEventListener('click', toggleEvolutionMenu);
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        evolutionContainer.appendChild(header);
        
        // Create SVG container for the tree
        svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute('width', SVG_WIDTH);
        svg.setAttribute('height', SVG_HEIGHT);
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
        svg.setAttribute('class', 'evolution-svg');
        
        // Add gradient definitions
        const defs = document.createElementNS(svgNS, "defs");
        
        // Create glowing line gradient
        const lineGradient = document.createElementNS(svgNS, "linearGradient");
        lineGradient.id = "lineGradient";
        lineGradient.setAttribute("x1", "0%");
        lineGradient.setAttribute("y1", "0%");
        lineGradient.setAttribute("x2", "100%");
        lineGradient.setAttribute("y2", "0%");
        
        const stop1 = document.createElementNS(svgNS, "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "#4080FF");
        stop1.setAttribute("stop-opacity", "0.8");
        
        const stop2 = document.createElementNS(svgNS, "stop");
        stop2.setAttribute("offset", "50%");
        stop2.setAttribute("stop-color", "#60FFFF");
        stop2.setAttribute("stop-opacity", "1");
        
        const stop3 = document.createElementNS(svgNS, "stop");
        stop3.setAttribute("offset", "100%");
        stop3.setAttribute("stop-color", "#4080FF");
        stop3.setAttribute("stop-opacity", "0.8");
        
        lineGradient.appendChild(stop1);
        lineGradient.appendChild(stop2);
        lineGradient.appendChild(stop3);
        defs.appendChild(lineGradient);
        
        // Create glowing node effect
        const nodeGlow = document.createElementNS(svgNS, "filter");
        nodeGlow.id = "nodeGlow";
        
        const feGaussianBlur = document.createElementNS(svgNS, "feGaussianBlur");
        feGaussianBlur.setAttribute("stdDeviation", "3");
        feGaussianBlur.setAttribute("result", "blur");
        
        const feFlood = document.createElementNS(svgNS, "feFlood");
        feFlood.setAttribute("flood-color", "#60FFFF");
        feFlood.setAttribute("flood-opacity", "0.7");
        feFlood.setAttribute("result", "glow");
        
        const feComposite = document.createElementNS(svgNS, "feComposite");
        feComposite.setAttribute("in", "glow");
        feComposite.setAttribute("in2", "blur");
        feComposite.setAttribute("operator", "in");
        feComposite.setAttribute("result", "coloredBlur");
        
        const feMerge = document.createElementNS(svgNS, "feMerge");
        const feMergeNode1 = document.createElementNS(svgNS, "feMergeNode");
        feMergeNode1.setAttribute("in", "coloredBlur");
        const feMergeNode2 = document.createElementNS(svgNS, "feMergeNode");
        feMergeNode2.setAttribute("in", "SourceGraphic");
        
        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);
        
        nodeGlow.appendChild(feGaussianBlur);
        nodeGlow.appendChild(feFlood);
        nodeGlow.appendChild(feComposite);
        nodeGlow.appendChild(feMerge);
        
        defs.appendChild(nodeGlow);
        svg.appendChild(defs);
        
        // Create the connections layer first (behind nodes)
        const connectionsGroup = document.createElementNS(svgNS, "g");
        connectionsGroup.setAttribute('class', 'connections-group');
        svg.appendChild(connectionsGroup);
        
        // Create the nodes layer
        const nodesGroup = document.createElementNS(svgNS, "g");
        nodesGroup.setAttribute('class', 'nodes-group');
        svg.appendChild(nodesGroup);
        
        evolutionContainer.appendChild(svg);
        
        // Create detail panel for selected weapon
        const detailPanel = document.createElement('div');
        detailPanel.className = 'evolution-detail-panel';
        detailPanel.innerHTML = `
            <h3 id="selectedWeaponName">Select a Weapon</h3>
            <p id="selectedWeaponDesc">Click on a weapon to see details.</p>
            <div class="weapon-stats">
                <div><span>Damage:</span> <span id="selectedWeaponDamage">-</span></div>
                <div><span>Fire Rate:</span> <span id="selectedWeaponFireRate">-</span></div>
            </div>
            <button id="selectWeaponBtn" class="select-weapon-btn">Select Weapon</button>
        `;
        evolutionContainer.appendChild(detailPanel);
        
        // Add the evolution container to the document body
        document.body.appendChild(evolutionContainer);
        
        // Add CSS styles for the evolution UI
        addEvolutionStyles();
    }
    
    // Add CSS styles for the evolution tree UI
    function addEvolutionStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .evolution-menu-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 20, 0.9);
                backdrop-filter: blur(10px);
                z-index: 100;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
                font-family: 'Press Start 2P', cursive;
                color: #ffffff;
            }
            
            .evolution-header {
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .evolution-title {
                font-size: 2rem;
                color: #60FFFF;
                text-shadow: 0 0 10px #60FFFF, 0 0 20px #4080FF;
                margin: 0;
                animation: pulseTitleGlow 3s infinite;
            }
            
            @keyframes pulseTitleGlow {
                0% { text-shadow: 0 0 10px #60FFFF, 0 0 20px #4080FF; }
                50% { text-shadow: 0 0 15px #60FFFF, 0 0 30px #4080FF; }
                100% { text-shadow: 0 0 10px #60FFFF, 0 0 20px #4080FF; }
            }
            
            .evolution-close-btn {
                background: transparent;
                border: 2px solid #FF60FF;
                color: #FF60FF;
                font-size: 1.5rem;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                box-shadow: 0 0 10px #FF60FF;
            }
            
            .evolution-close-btn:hover {
                background: #FF60FF;
                color: #000000;
                transform: scale(1.1);
                box-shadow: 0 0 20px #FF60FF;
            }
            
            .evolution-svg {
                width: 800px;
                height: 600px;
                max-width: 100%;
                background-color: rgba(0, 0, 30, 0.5);
                border-radius: 10px;
                border: 1px solid rgba(100, 200, 255, 0.3);
                box-shadow: 0 0 20px rgba(100, 200, 255, 0.2);
            }
            
            .evolution-node {
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .evolution-node:hover {
                transform: scale(1.1);
            }
            
            .evolution-node-locked {
                opacity: 0.5;
                filter: grayscale(70%);
            }
            
            .evolution-node-current {
                stroke: #FFFFFF;
                stroke-width: 3px;
                animation: pulseCurrentNode 2s infinite;
            }
            
            @keyframes pulseCurrentNode {
                0% { stroke-width: 3px; stroke-opacity: 1; }
                50% { stroke-width: 5px; stroke-opacity: 0.8; }
                100% { stroke-width: 3px; stroke-opacity: 1; }
            }
            
            .evolution-connection {
                stroke-width: 3px;
                stroke-linecap: round;
                opacity: 0.8;
                filter: drop-shadow(0 0 3px rgba(100, 200, 255, 0.7));
            }
            
            .evolution-connection-locked {
                opacity: 0.3;
                stroke-dasharray: 5, 5;
            }
            
            .evolution-connection-path {
                opacity: 1;
                stroke-width: 4px;
                animation: flowPath 2s infinite;
            }
            
            @keyframes flowPath {
                0% { stroke-dashoffset: 100; }
                100% { stroke-dashoffset: 0; }
            }
            
            .evolution-detail-panel {
                margin-top: 20px;
                background-color: rgba(0, 0, 40, 0.7);
                border: 1px solid rgba(100, 200, 255, 0.5);
                border-radius: 10px;
                padding: 20px;
                width: 500px;
                max-width: 90%;
                box-shadow: 0 0 15px rgba(100, 200, 255, 0.3);
            }
            
            .evolution-detail-panel h3 {
                color: #60FFFF;
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 1.3rem;
                text-shadow: 0 0 5px #60FFFF;
            }
            
            .evolution-detail-panel p {
                color: #FFFFFF;
                margin-bottom: 20px;
                font-size: 0.8rem;
                line-height: 1.5;
            }
            
            .weapon-stats {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 0.8rem;
                gap: 20px;
            }
            
            .weapon-stats div {
                flex: 1;
                background-color: rgba(0, 0, 60, 0.5);
                padding: 10px;
                border-radius: 5px;
                border: 1px solid rgba(100, 200, 255, 0.3);
            }
            
            .weapon-stats div span:first-child {
                color: #60FFFF;
                margin-right: 5px;
            }
            
            .select-weapon-btn {
                background: linear-gradient(135deg, #4080FF, #60FFFF);
                border: none;
                padding: 12px 0;
                width: 100%;
                border-radius: 5px;
                color: #FFFFFF;
                font-family: 'Press Start 2P', cursive;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 0 10px rgba(100, 200, 255, 0.5);
                text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
            }
            
            .select-weapon-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 0 20px rgba(100, 200, 255, 0.7);
            }
            
            .select-weapon-btn:disabled {
                background: #555555;
                cursor: not-allowed;
                opacity: 0.5;
                transform: scale(1);
                box-shadow: none;
            }
            
            .weapon-icon {
                fill: #FFFFFF;
            }
            
            /* Holographic animation for nodes */
            @keyframes holoEffect {
                0% { opacity: 0.7; }
                50% { opacity: 1; }
                100% { opacity: 0.7; }
            }
            
            .holographic-effect {
                animation: holoEffect 3s infinite;
            }
            
            /* Fade transition for menu */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // Render the evolution tree
    function renderEvolutionTree() {
        const connectionsGroup = svg.querySelector('.connections-group');
        const nodesGroup = svg.querySelector('.nodes-group');
        
        // Clear existing elements
        connectionsGroup.innerHTML = '';
        nodesGroup.innerHTML = '';
        nodeElements.clear();
        lineElements.clear();
        
        // Draw connections first (so they appear behind nodes)
        evolutionTree.connections.forEach(connection => {
            const fromWeapon = evolutionTree.getWeapon(connection.from);
            const toWeapon = evolutionTree.getWeapon(connection.to);
            
            if (fromWeapon && toWeapon) {
                const fromPos = evolutionTree.positions[connection.from];
                const toPos = evolutionTree.positions[connection.to];
                
                if (fromPos && toPos) {
                    const x1 = CENTER_X + fromPos.x * GRID_SIZE_X;
                    const y1 = CENTER_Y - fromPos.y * GRID_SIZE_Y;
                    const x2 = CENTER_X + toPos.x * GRID_SIZE_X;
                    const y2 = CENTER_Y - toPos.y * GRID_SIZE_Y;
                    
                    // Create connection line
                    const line = document.createElementNS(svgNS, "path");
                    
                    // Create a slightly curved path
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2 - 15; // Slight curve upward
                    const pathData = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
                    
                    line.setAttribute("d", pathData);
                    line.setAttribute("fill", "none");
                    line.setAttribute("stroke", toWeapon.lineColor || "#60FFFF");
                    line.setAttribute("stroke-width", "3");
                    line.setAttribute("class", `evolution-connection ${(!fromWeapon.unlocked || !toWeapon.unlocked) ? 'evolution-connection-locked' : ''}`);
                    
                    // Store line element for later reference
                    const connectionKey = `${connection.from}-${connection.to}`;
                    lineElements.set(connectionKey, line);
                    
                    connectionsGroup.appendChild(line);
                }
            }
        });
        
        // Draw nodes
        Object.keys(evolutionTree.positions).forEach(weaponId => {
            const weapon = evolutionTree.getWeapon(weaponId);
            const pos = evolutionTree.positions[weaponId];
            
            if (weapon && pos) {
                const x = CENTER_X + pos.x * GRID_SIZE_X;
                const y = CENTER_Y - pos.y * GRID_SIZE_Y;
                
                // Create node group
                const nodeGroup = document.createElementNS(svgNS, "g");
                nodeGroup.setAttribute("class", `evolution-node ${!weapon.unlocked ? 'evolution-node-locked' : ''} ${weaponId === currentWeaponId ? 'evolution-node-current' : ''}`);
                nodeGroup.setAttribute("data-weapon-id", weaponId);
                nodeGroup.setAttribute("transform", `translate(${x}, ${y})`);
                
                // Add glow filter to unlocked nodes
                if (weapon.unlocked) {
                    nodeGroup.setAttribute("filter", "url(#nodeGlow)");
                }
                
                // Create circular background
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("r", NODE_RADIUS);
                circle.setAttribute("fill", weapon.color || "#4080FF");
                circle.setAttribute("class", "holographic-effect");
                
                // Create inner circle for depth effect
                const innerCircle = document.createElementNS(svgNS, "circle");
                innerCircle.setAttribute("r", NODE_RADIUS * 0.85);
                innerCircle.setAttribute("fill", shadeColor(weapon.color || "#4080FF", -20));
                
                // Add weapon icon (placeholder - would be better with actual icons)
                const icon = document.createElementNS(svgNS, "text");
                icon.setAttribute("text-anchor", "middle");
                icon.setAttribute("dominant-baseline", "middle");
                icon.setAttribute("font-size", "20");
                icon.setAttribute("class", "weapon-icon");
                icon.setAttribute("fill", "#FFFFFF");
                icon.textContent = weapon.name.charAt(0);
                
                // Add label
                const label = document.createElementNS(svgNS, "text");
                label.setAttribute("text-anchor", "middle");
                label.setAttribute("dominant-baseline", "middle");
                label.setAttribute("y", NODE_RADIUS + 20);
                label.setAttribute("font-size", "12");
                label.setAttribute("fill", "#FFFFFF");
                label.textContent = weapon.name;
                
                // Add event listeners
                nodeGroup.addEventListener("click", () => selectWeapon(weaponId));
                
                // Add to group
                nodeGroup.appendChild(circle);
                nodeGroup.appendChild(innerCircle);
                nodeGroup.appendChild(icon);
                nodeGroup.appendChild(label);
                
                // Store node element for later reference
                nodeElements.set(weaponId, nodeGroup);
                
                nodesGroup.appendChild(nodeGroup);
            }
        });
        
        // If we have a selected path, highlight it
        updateSelectedPath();
    }
    
    // Helper function to darken or lighten colors
    function shadeColor(color, percent) {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);

        R = Math.min(255, Math.max(0, R + percent));
        G = Math.min(255, Math.max(0, G + percent));
        B = Math.min(255, Math.max(0, B + percent));

        const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
        const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
        const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

        return "#" + RR + GG + BB;
    }
    
    // Update the selected path in the tree
    function updateSelectedPath() {
        // Reset all connections
        lineElements.forEach(line => {
            line.classList.remove('evolution-connection-path');
            line.removeAttribute('stroke-dasharray');
            line.removeAttribute('stroke-dashoffset');
        });
        
        // Add path effect to the selected connections
        selectedPath.forEach(segment => {
            const connectionKey = `${segment.from}-${segment.to}`;
            const reversedKey = `${segment.to}-${segment.from}`;
            
            const line = lineElements.get(connectionKey) || lineElements.get(reversedKey);
            if (line) {
                line.classList.add('evolution-connection-path');
                line.setAttribute('stroke-dasharray', '10,5');
                line.setAttribute('stroke-dashoffset', '100');
            }
        });
    }
    
    // Handle weapon selection in the tree
    function selectWeapon(weaponId) {
        const weapon = evolutionTree.getWeapon(weaponId);
        if (!weapon) return;
        
        // Update detail panel with weapon info
        document.getElementById('selectedWeaponName').textContent = weapon.name;
        document.getElementById('selectedWeaponDesc').textContent = weapon.description;
        document.getElementById('selectedWeaponDamage').textContent = weapon.damage;
        document.getElementById('selectedWeaponFireRate').textContent = weapon.fireRate.toFixed(1);
        
        // Enable/disable select button based on unlock status
        const selectButton = document.getElementById('selectWeaponBtn');
        selectButton.disabled = !weapon.unlocked;
        
        if (weapon.unlocked) {
            selectButton.textContent = weaponId === currentWeaponId ? "Current Weapon" : "Select Weapon";
            selectButton.onclick = () => {
                if (weaponId !== currentWeaponId) {
                    setCurrentWeapon(weaponId);
                    toggleEvolutionMenu();
                }
            };
        } else {
            // Show requirements if locked
            const reqScore = weapon.requirements?.score || 0;
            selectButton.textContent = `Locked (Score: ${reqScore})`;
        }
        
        // Set the selected path (visual trail from current to selected)
        if (weaponId !== currentWeaponId) {
            selectedPath = evolutionTree.getPath(currentWeaponId, weaponId);
            updateSelectedPath();
        } else {
            selectedPath = [];
            updateSelectedPath();
        }
        
        // Play selection sound
        audioSystem.playSound(audioSystem.menuSynth || audioSystem.flamethrowerSynth, "C5", "32n");
    }
    
    // Set the current weapon
    function setCurrentWeapon(weaponId) {
        const weapon = evolutionTree.getWeapon(weaponId);
        if (!weapon || !weapon.unlocked) return false;
        
        // Remove current class from previous weapon node
        const previousNode = nodeElements.get(currentWeaponId);
        if (previousNode) {
            previousNode.classList.remove('evolution-node-current');
        }
        
        // Update current weapon
        currentWeaponId = weaponId;
        
        // Add current class to new weapon node
        const currentNode = nodeElements.get(currentWeaponId);
        if (currentNode) {
            currentNode.classList.add('evolution-node-current');
        }
        
        // Play upgrade sound
        audioSystem.playSound(audioSystem.spreadSynth || audioSystem.flamethrowerSynth, ["C4", "E4", "G4"], "8n");
        
        // Return the weapon object for external use
        return weapon;
    }
    
    // Check for new weapon unlocks based on score
    function checkWeaponUnlocks(score) {
        const unlockableWeapons = evolutionTree.getUnlockableWeapons(score);
        let hasNewUnlocks = false;
        
        unlockableWeapons.forEach(weapon => {
            evolutionTree.unlockWeapon(weapon.id);
            hasNewUnlocks = true;
            
            // Update visual state in the tree if it's open
            if (isEvolutionMenuOpen) {
                const node = nodeElements.get(weapon.id);
                if (node) {
                    node.classList.remove('evolution-node-locked');
                    node.setAttribute("filter", "url(#nodeGlow)");
                }
                
                // Update connections
                evolutionTree.connections.forEach(connection => {
                    if (connection.from === weapon.id || connection.to === weapon.id) {
                        const fromWeapon = evolutionTree.getWeapon(connection.from);
                        const toWeapon = evolutionTree.getWeapon(connection.to);
                        
                        if (fromWeapon.unlocked && toWeapon.unlocked) {
                            const connectionKey = `${connection.from}-${connection.to}`;
                            const line = lineElements.get(connectionKey);
                            if (line) {
                                line.classList.remove('evolution-connection-locked');
                            }
                        }
                    }
                });
            }
        });
        
        return hasNewUnlocks;
    }
    
    // Toggle the evolution menu
    function toggleEvolutionMenu() {
        if (isEvolutionMenuOpen) {
            // Close menu with animation
            evolutionContainer.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                evolutionContainer.style.display = 'none';
                // Exit pointer lock for the game
                document.getElementById('gameCanvas')?.requestPointerLock?.();
            }, 300);
            isEvolutionMenuOpen = false;
        } else {
            // Exit pointer lock if it's active
            if (document.pointerLockElement) {
                document.exitPointerLock?.();
            }
            
            // Update tree before showing
            renderEvolutionTree();
            
            // Open menu with animation
            evolutionContainer.style.display = 'flex';
            evolutionContainer.style.animation = 'fadeIn 0.3s forwards';
            selectWeapon(currentWeaponId); // Select current weapon by default
            isEvolutionMenuOpen = true;
        }
        
        // Play menu sound
        audioSystem.playSound(audioSystem.menuSynth || audioSystem.flamethrowerSynth, "E4", "16n");
    }
    
    // Get the current weapon ID
    function getCurrentWeaponId() {
        return currentWeaponId;
    }
    
    // Get the current weapon object
    function getCurrentWeapon() {
        return evolutionTree.getWeapon(currentWeaponId);
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Add keyboard shortcut for evolution menu (E key)
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'e' && !document.querySelector('.game-over-overlay')?.style.display !== 'none') {
                toggleEvolutionMenu();
            }
            
            // Close evolution menu with Escape key
            if (e.key === 'Escape' && isEvolutionMenuOpen) {
                toggleEvolutionMenu();
            }
        });
    }
    
    // Public API
    return {
        init,
        toggleEvolutionMenu,
        setCurrentWeapon,
        getCurrentWeaponId,
        getCurrentWeapon,
        checkWeaponUnlocks,
        renderEvolutionTree,
        isOpen: () => isEvolutionMenuOpen
    };
})();

export default evolutionUI; 