import { weaponTypes, evolutionTree as treeData } from '../data/evolution_tree.js';
import planeIcons from '../data/plane_icons.js';
import audioSystem from './audio.js';
import uiSystem from './ui.js';

const evolutionUI = (() => {
    // Private variables
    let isMenuOpen = false;
    let evolutionContainer = null;
    let evolutionTreeData = null;
    let evolutionTreeContainer = null;
    let currentWeaponId = 'basic';
    let svg;
    let nodeElements = new Map();
    let lineElements = new Map();
    let selectedPath = [];
    
    // SVG namespace
    const svgNS = "http://www.w3.org/2000/svg";
    
    // Constants
    const SVG_WIDTH = 1200;
    const SVG_HEIGHT = 800;
    const NODE_RADIUS = 35;
    const GRID_SIZE_X = 220;
    const GRID_SIZE_Y = 160;
    const CENTER_X = SVG_WIDTH / 2;
    const CENTER_Y = SVG_HEIGHT / 2;
    
    // Initialize the UI elements
    function init() {
        // Initialize tree data
        evolutionTreeData = treeData;
        
        // Create the evolution menu container if it doesn't exist
        if (!evolutionContainer) {
            evolutionContainer = document.createElement('div');
            evolutionContainer.id = 'evolutionMenu';
            evolutionContainer.style.display = 'none';
            evolutionContainer.style.position = 'fixed';
            evolutionContainer.style.top = '0';
            evolutionContainer.style.left = '0';
            evolutionContainer.style.width = '100vw';
            evolutionContainer.style.height = '100vh';
            evolutionContainer.style.backgroundColor = 'rgba(0, 10, 30, 0.97)';
            evolutionContainer.style.backdropFilter = 'blur(10px)';
            evolutionContainer.style.color = 'white';
            evolutionContainer.style.fontFamily = '"Press Start 2P", monospace';
            evolutionContainer.style.zIndex = '1000';
            evolutionContainer.style.display = 'none';
            evolutionContainer.style.flexDirection = 'column';
            evolutionContainer.style.alignItems = 'center';
            evolutionContainer.style.justifyContent = 'center';
            evolutionContainer.style.overflow = 'hidden';
            
            // Create the evolution tree container
            evolutionTreeContainer = document.createElement('div');
            evolutionTreeContainer.id = 'evolutionTree';
            evolutionTreeContainer.style.position = 'relative';
            evolutionTreeContainer.style.width = '95vw';
            evolutionTreeContainer.style.height = '80vh';
            evolutionTreeContainer.style.background = 'radial-gradient(circle at 50% 50%, rgba(0, 20, 60, 0.9) 0%, rgba(0, 5, 20, 0.95) 100%)';
            evolutionTreeContainer.style.borderRadius = '30px';
            evolutionTreeContainer.style.boxShadow = '0 0 150px rgba(0, 150, 255, 0.2), inset 0 0 300px rgba(0, 100, 255, 0.15)';
            evolutionTreeContainer.style.border = '3px solid rgba(100, 200, 255, 0.3)';
            evolutionTreeContainer.style.padding = '60px';
            evolutionTreeContainer.style.margin = '30px 0';
            evolutionTreeContainer.style.overflow = 'hidden';
            
            // Create and initialize SVG element
            svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.setAttribute('class', 'evolution-svg');
            svg.style.filter = 'drop-shadow(0 0 30px rgba(0, 150, 255, 0.3))';

            // Add SVG definitions
            const defs = document.createElementNS(svgNS, "defs");
            
            // Node glow filter
            const nodeGlow = document.createElementNS(svgNS, "filter");
            nodeGlow.setAttribute("id", "nodeGlow");
            nodeGlow.innerHTML = `
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feFlood flood-color="rgba(0, 150, 255, 0.6)" result="color"/>
                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            `;
            defs.appendChild(nodeGlow);

            // Icon glow filter with improved visibility
            const iconGlow = document.createElementNS(svgNS, "filter");
            iconGlow.setAttribute("id", "iconGlow");
            iconGlow.innerHTML = `
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feFlood flood-color="rgba(255, 255, 255, 0.9)" result="color"/>
                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            `;
            defs.appendChild(iconGlow);

            // Text glow filter
            const textGlow = document.createElementNS(svgNS, "filter");
            textGlow.setAttribute("id", "textGlow");
            textGlow.innerHTML = `
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feFlood flood-color="rgba(0, 150, 255, 0.8)" result="color"/>
                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            `;
            defs.appendChild(textGlow);

            // Line gradient with improved visibility
            const lineGradient = document.createElementNS(svgNS, "linearGradient");
            lineGradient.setAttribute("id", "lineGradient");
            lineGradient.innerHTML = `
                <stop offset="0%" stop-color="rgba(0, 150, 255, 0.9)"/>
                <stop offset="100%" stop-color="rgba(0, 100, 255, 0.6)"/>
            `;
            defs.appendChild(lineGradient);

            // Line pattern filter
            const holoLinePattern = document.createElementNS(svgNS, "filter");
            holoLinePattern.setAttribute("id", "holoLinePattern");
            holoLinePattern.innerHTML = `
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2"/>
            `;
            defs.appendChild(holoLinePattern);

            // Arrow marker with improved visibility
            const arrow = document.createElementNS(svgNS, "marker");
            arrow.setAttribute("id", "arrow");
            arrow.setAttribute("viewBox", "0 0 10 10");
            arrow.setAttribute("refX", "5");
            arrow.setAttribute("refY", "5");
            arrow.setAttribute("markerWidth", "4");
            arrow.setAttribute("markerHeight", "4");
            arrow.setAttribute("orient", "auto-start-reverse");
            const arrowPath = document.createElementNS(svgNS, "path");
            arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
            arrowPath.setAttribute("fill", "rgba(0, 150, 255, 0.9)");
            arrow.appendChild(arrowPath);
            defs.appendChild(arrow);

            svg.appendChild(defs);

            // Add SVG to tree container
            evolutionTreeContainer.appendChild(svg);
            
            // Create header
            const header = document.createElement('div');
            header.style.width = '100%';
            header.style.display = 'flex';
            header.style.justifyContent = 'center';
            header.style.alignItems = 'center';
            header.style.position = 'relative';
            header.style.padding = '20px';
            
            const title = document.createElement('h2');
            title.textContent = 'WEAPON EVOLUTION';
            title.style.fontSize = '3rem';
            title.style.margin = '0';
            title.style.color = '#40FFFF';
            title.style.textShadow = '0 0 20px rgba(64, 255, 255, 0.8), 0 0 40px rgba(64, 255, 255, 0.4)';
            title.style.letterSpacing = '4px';
            title.style.fontFamily = '"Press Start 2P", monospace';
            title.style.animation = 'pulseTitleGlow 3s infinite';
            
            const closeButton = document.createElement('button');
            closeButton.textContent = '×';
            closeButton.style.position = 'absolute';
            closeButton.style.right = '40px';
            closeButton.style.top = '50%';
            closeButton.style.transform = 'translateY(-50%)';
            closeButton.style.background = 'none';
            closeButton.style.border = '2px solid #FF60FF';
            closeButton.style.color = '#FF60FF';
            closeButton.style.width = '60px';
            closeButton.style.height = '60px';
            closeButton.style.borderRadius = '50%';
            closeButton.style.fontSize = '36px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.display = 'flex';
            closeButton.style.alignItems = 'center';
            closeButton.style.justifyContent = 'center';
            closeButton.style.transition = 'all 0.3s ease';
            closeButton.style.boxShadow = '0 0 20px rgba(255, 96, 255, 0.5)';
            closeButton.style.textShadow = '0 0 10px rgba(255, 96, 255, 0.8)';
            closeButton.onclick = toggleEvolutionMenu;

            closeButton.addEventListener('mouseover', () => {
                closeButton.style.background = 'rgba(255, 96, 255, 0.2)';
                closeButton.style.boxShadow = '0 0 30px rgba(255, 96, 255, 0.8)';
                closeButton.style.transform = 'translateY(-50%) scale(1.1)';
            });

            closeButton.addEventListener('mouseout', () => {
                closeButton.style.background = 'none';
                closeButton.style.boxShadow = '0 0 20px rgba(255, 96, 255, 0.5)';
                closeButton.style.transform = 'translateY(-50%) scale(1)';
            });

            header.appendChild(title);
            header.appendChild(closeButton);
            
            // Add elements to container
            evolutionContainer.appendChild(header);
            evolutionContainer.appendChild(evolutionTreeContainer);
            
            // Add to document
            document.body.appendChild(evolutionContainer);

            // Add CSS styles for the evolution UI
            addEvolutionStyles();
        }
    }
    
    // Toggle the evolution menu
    function toggleEvolutionMenu() {
        // Initialize UI elements if they haven't been created yet
        if (!evolutionContainer) {
            init();
        }
        
        isMenuOpen = !isMenuOpen;
        evolutionContainer.style.display = isMenuOpen ? 'flex' : 'none';
        
        if (isMenuOpen) {
            document.body.classList.add('evolution-menu-open');
            renderEvolutionTree();
            // Exit pointer lock when menu is opened
            document.exitPointerLock?.();
        } else {
            document.body.classList.remove('evolution-menu-open');
            // Request pointer lock when menu is closed
            const canvas = document.getElementById('gameCanvas');
            canvas?.requestPointerLock?.();
        }
        
        // Play menu toggle sound effect
        if (audioSystem.menuSynth) {
            audioSystem.playSound(audioSystem.menuSynth, "E4", "16n");
        } else {
            audioSystem.playSound(audioSystem.flamethrowerSynth, "E4", "16n");
        }
    }
    
    // Add CSS styles for the evolution UI
    function addEvolutionStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .node {
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .node circle {
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                stroke: rgba(255, 255, 255, 0.4);
                stroke-width: 3px;
                filter: drop-shadow(0 0 10px rgba(0, 150, 255, 0.3));
            }
            
            .node .icon-container {
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .node .icon-container svg {
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0.95;
            }
            
            .node:hover circle {
                r: ${NODE_RADIUS * 1.15};
                stroke: rgba(255, 255, 255, 0.9);
                stroke-width: 4px;
                filter: drop-shadow(0 0 15px rgba(0, 150, 255, 0.5));
            }
            
            .node:hover .icon-container {
                transform: translate(${-NODE_RADIUS/2}, ${-NODE_RADIUS/2}) scale(1.15);
            }
            
            .node:hover .icon-container svg {
                opacity: 1;
                filter: url(#iconGlow) brightness(1.3);
            }
            
            .node-label {
                font-family: 'Press Start 2P', monospace;
                font-size: 13px;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0.85;
                fill: #FFFFFF;
                text-shadow: 0 0 10px rgba(0, 150, 255, 0.6);
            }
            
            .node:hover .node-label {
                font-size: 14px;
                opacity: 1;
                fill: #40FFFF;
                filter: drop-shadow(0 0 8px rgba(64, 255, 255, 0.8));
            }
            
            .node.selected circle {
                stroke: #40FFFF;
                stroke-width: 4px;
                filter: url(#nodeGlow) brightness(1.3);
            }
            
            .node.selected .icon-container svg {
                opacity: 1;
                filter: url(#iconGlow) brightness(1.3);
            }

            .evolution-detail-panel {
                position: absolute;
                bottom: 50px;
                left: 50%;
                transform: translateX(-50%);
                width: auto;
                min-width: 450px;
                max-width: 650px;
                padding: 35px;
                background: linear-gradient(135deg, rgba(0, 15, 45, 0.97), rgba(0, 8, 25, 0.97));
                border: 2px solid rgba(100, 200, 255, 0.6);
                border-radius: 20px;
                box-shadow: 0 0 50px rgba(100, 200, 255, 0.35),
                           inset 0 0 30px rgba(100, 200, 255, 0.15);
                backdrop-filter: blur(10px);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000;
            }
            
            .info-close-btn {
                background: none;
                border: 2.5px solid #FF60FF;
                color: #FF60FF;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                font-size: 22px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 0 20px rgba(255, 96, 255, 0.45);
                text-shadow: 0 0 8px rgba(255, 96, 255, 0.8);
            }
            
            .info-close-btn:hover {
                background: rgba(255, 96, 255, 0.25);
                box-shadow: 0 0 30px rgba(255, 96, 255, 0.7);
                transform: scale(1.15);
            }
            
            .info-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid rgba(64, 255, 255, 0.2);
            }
            
            .info-panel-header h3 {
                margin: 0;
                color: #40FFFF;
                font-size: 26px;
                text-shadow: 0 0 15px rgba(64, 255, 255, 0.7);
                letter-spacing: 1px;
            }

            .weapon-description {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                line-height: 1.6;
                margin: 20px 0;
                text-shadow: 0 0 10px rgba(100, 200, 255, 0.4);
            }

            .weapon-stats {
                display: flex;
                justify-content: space-around;
                margin: 25px 0;
                padding: 20px;
                background: rgba(0, 20, 60, 0.4);
                border-radius: 15px;
                border: 1px solid rgba(100, 200, 255, 0.3);
            }

            .stat-box {
                text-align: center;
                padding: 15px 25px;
                background: rgba(0, 30, 80, 0.4);
                border-radius: 12px;
                border: 1px solid rgba(100, 200, 255, 0.2);
                transition: all 0.3s ease;
            }

            .stat-box:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0, 150, 255, 0.2);
            }

            .stat-box h4 {
                color: #40FFFF;
                margin: 0 0 10px 0;
                font-size: 14px;
                text-shadow: 0 0 8px rgba(64, 255, 255, 0.6);
            }

            .stat-box p {
                color: white;
                margin: 0;
                font-size: 18px;
                text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
            }

            .requirements {
                margin: 20px 0;
                padding: 15px;
                background: rgba(255, 96, 96, 0.1);
                border-radius: 10px;
                border: 1px solid rgba(255, 96, 96, 0.3);
            }

            .requirements p {
                color: #FF6060;
                margin: 0;
                font-size: 14px;
                text-shadow: 0 0 8px rgba(255, 96, 96, 0.4);
            }

            .select-weapon-btn {
                width: 100%;
                padding: 15px;
                margin-top: 20px;
                background: linear-gradient(135deg, #40FFFF 0%, #2080FF 100%);
                border: none;
                border-radius: 10px;
                color: white;
                font-family: 'Press Start 2P', monospace;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
                box-shadow: 0 0 20px rgba(64, 255, 255, 0.4);
            }

            .select-weapon-btn:hover:not([disabled]) {
                transform: translateY(-2px);
                box-shadow: 0 0 30px rgba(64, 255, 255, 0.6);
            }

            .select-weapon-btn[disabled] {
                background: linear-gradient(135deg, #808080 0%, #404040 100%);
                cursor: not-allowed;
                opacity: 0.7;
            }

            @keyframes pulseTitleGlow {
                0% { text-shadow: 0 0 20px rgba(64, 255, 255, 0.8), 0 0 40px rgba(64, 255, 255, 0.4); }
                50% { text-shadow: 0 0 30px rgba(64, 255, 255, 0.9), 0 0 60px rgba(64, 255, 255, 0.6); }
                100% { text-shadow: 0 0 20px rgba(64, 255, 255, 0.8), 0 0 40px rgba(64, 255, 255, 0.4); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update the evolution tree data
    function updateEvolutionTreeData(data) {
        evolutionTreeData = data;
        renderEvolutionTree();
    }
    
    // Render the evolution tree
    function renderEvolutionTree() {
        if (!evolutionContainer || !svg || !evolutionTreeData) return;

        // Clear existing nodes and lines
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        nodeElements.clear();
        lineElements.clear();
        
        // Render nodes
        Object.values(weaponTypes).forEach(weapon => {
            const position = evolutionTreeData.positions[weapon.id];
            if (position) {
                const nodeElement = createNodeElement(weapon, position);
                svg.appendChild(nodeElement);
                nodeElements.set(weapon.id, nodeElement);
            }
        });
        
        // Render lines
        evolutionTreeData.connections.forEach(connection => {
            const fromWeapon = weaponTypes[connection.from];
            const toWeapon = weaponTypes[connection.to];
            const fromPos = evolutionTreeData.positions[connection.from];
            const toPos = evolutionTreeData.positions[connection.to];
            
            if (fromWeapon && toWeapon && fromPos && toPos) {
                const lineElement = createLineElement(fromPos, toPos);
                svg.appendChild(lineElement);
                lineElements.set(`${connection.from}-${connection.to}`, lineElement);
            }
        });
    }
    
    // Create a node element
    function createNodeElement(weapon, position) {
        const g = document.createElementNS(svgNS, "g");
        g.setAttribute('class', 'node');
        g.setAttribute('transform', `translate(${position.x * GRID_SIZE_X + CENTER_X}, ${position.y * GRID_SIZE_Y + CENTER_Y})`);
        g.setAttribute('data-weapon-id', weapon.id);

        // Create background circle
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute('r', NODE_RADIUS);
        circle.setAttribute('fill', weapon.color);
        circle.setAttribute('filter', 'url(#nodeGlow)');
        g.appendChild(circle);

        // Create icon container
        const iconContainer = document.createElementNS(svgNS, "g");
        iconContainer.setAttribute('class', 'icon-container');
        iconContainer.setAttribute('transform', `translate(${-NODE_RADIUS/2}, ${-NODE_RADIUS/2})`);

        // Get the icon SVG from planeIcons
        const iconKey = `plane${weapon.icon.charAt(0).toUpperCase() + weapon.icon.slice(1)}`;
        if (planeIcons[iconKey]) {
            // Parse the SVG string into a document
            const parser = new DOMParser();
            const iconDoc = parser.parseFromString(planeIcons[iconKey], 'image/svg+xml');
            const iconSvg = iconDoc.documentElement;

            // Set attributes for proper sizing and positioning
            iconSvg.setAttribute('width', NODE_RADIUS * 1.2);
            iconSvg.setAttribute('height', NODE_RADIUS * 1.2);
            iconSvg.setAttribute('x', NODE_RADIUS * 0.15);
            iconSvg.setAttribute('y', NODE_RADIUS * 0.15);
            iconSvg.setAttribute('filter', 'url(#iconGlow)');

            // Import and append the icon SVG
            const importedIcon = document.importNode(iconSvg, true);
            iconContainer.appendChild(importedIcon);
        }

        g.appendChild(iconContainer);

        // Create text label
        const text = document.createElementNS(svgNS, "text");
        text.textContent = weapon.name;
        text.setAttribute('y', NODE_RADIUS + 20);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('filter', 'url(#textGlow)');
        text.setAttribute('class', 'node-label');
        g.appendChild(text);

        // Add hover effects
        g.addEventListener('mouseover', () => onNodeHover(weapon.id));
        g.addEventListener('mouseout', () => onNodeUnhover(weapon.id));
        g.addEventListener('click', () => onNodeClick(weapon.id));

        return g;
    }
    
    // Create a line element
    function createLineElement(fromPos, toPos) {
        const lineGroup = document.createElementNS(svgNS, "g");
        
        // Create path for curved line
        const dx = (toPos.x * GRID_SIZE_X + CENTER_X) - (fromPos.x * GRID_SIZE_X + CENTER_X);
        const dy = (toPos.y * GRID_SIZE_Y + CENTER_Y) - (fromPos.y * GRID_SIZE_Y + CENTER_Y);
        const controlX = (fromPos.x * GRID_SIZE_X + CENTER_X) + dx * 0.5;
        const controlY = (fromPos.y * GRID_SIZE_Y + CENTER_Y) + dy * 0.5;
        
        // Create glow effect
        const glowPath = document.createElementNS(svgNS, "path");
        glowPath.setAttribute("d", `M ${fromPos.x * GRID_SIZE_X + CENTER_X} ${fromPos.y * GRID_SIZE_Y + CENTER_Y} 
                              Q ${controlX} ${controlY} 
                              ${toPos.x * GRID_SIZE_X + CENTER_X} ${toPos.y * GRID_SIZE_Y + CENTER_Y}`);
        glowPath.setAttribute("fill", "none");
        glowPath.setAttribute("stroke", "rgba(0, 150, 255, 0.3)");
        glowPath.setAttribute("stroke-width", "8");
        glowPath.setAttribute("stroke-linecap", "round");
        glowPath.setAttribute("filter", "url(#nodeGlow)");
        lineGroup.appendChild(glowPath);
        
        // Main line
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", `M ${fromPos.x * GRID_SIZE_X + CENTER_X} ${fromPos.y * GRID_SIZE_Y + CENTER_Y} 
                              Q ${controlX} ${controlY} 
                              ${toPos.x * GRID_SIZE_X + CENTER_X} ${toPos.y * GRID_SIZE_Y + CENTER_Y}`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "url(#lineGradient)");
        path.setAttribute("stroke-width", "3");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("filter", "url(#holoLinePattern)");
        path.setAttribute("marker-end", "url(#arrow)");
        
        // Add animation
        const dashLength = Math.sqrt(dx * dx + dy * dy);
        path.setAttribute("stroke-dasharray", `${dashLength}`);
        path.setAttribute("stroke-dashoffset", `${dashLength}`);
        
        const animate = document.createElementNS(svgNS, "animate");
        animate.setAttribute("attributeName", "stroke-dashoffset");
        animate.setAttribute("from", `${dashLength}`);
        animate.setAttribute("to", "0");
        animate.setAttribute("dur", "1.5s");
        animate.setAttribute("repeatCount", "indefinite");
        path.appendChild(animate);
        
        lineGroup.appendChild(path);
        return lineGroup;
    }
    
    // Select a weapon
    function selectWeapon(weaponId) {
        currentWeaponId = weaponId;
        const weapon = weaponTypes[weaponId];
        if (weapon) {
            updateSelectedWeaponInfo(weapon);
            highlightPath(weaponId);
        }
    }
    
    // Update the selected weapon info
    function updateSelectedWeaponInfo(weapon) {
        // Create info panel if it doesn't exist
        let infoPanel = document.querySelector('.evolution-detail-panel');
        if (!infoPanel) {
            infoPanel = document.createElement('div');
            infoPanel.className = 'evolution-detail-panel';
            evolutionTreeContainer.appendChild(infoPanel);
        }

        // Add close button and weapon info
        infoPanel.innerHTML = `
            <div class="info-panel-header">
                <h3>${weapon.name}</h3>
                <button class="info-close-btn">×</button>
            </div>
            <p class="weapon-description">${weapon.description}</p>
            <div class="weapon-stats">
                <div class="stat-box">
                    <h4>Damage</h4>
                    <p>${weapon.damage}</p>
                </div>
                <div class="stat-box">
                    <h4>Fire Rate</h4>
                    <p>${weapon.fireRate}</p>
                </div>
            </div>
            ${!weapon.unlocked ? `
                <div class="requirements">
                    <p>Required Score: ${weapon.requirements?.score || 0}</p>
                </div>
            ` : ''}
            <button class="select-weapon-btn" ${!weapon.unlocked ? 'disabled' : ''}>
                ${weapon.unlocked ? 'Select Weapon' : 'Locked'}
            </button>
        `;

        // Add event listeners
        const closeButton = infoPanel.querySelector('.info-close-btn');
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up
            infoPanel.style.display = 'none';
            
            // Play close sound
            if (audioSystem.menuSynth) {
                audioSystem.playSound(audioSystem.menuSynth, "G4", "16n");
            }
        });

        const selectButton = infoPanel.querySelector('.select-weapon-btn');
        if (selectButton && weapon.unlocked) {
            selectButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling up
                // TODO: Implement weapon selection logic
                toggleEvolutionMenu();
            });
        }

        // Show the panel with a fade-in effect
        infoPanel.style.opacity = '0';
        infoPanel.style.display = 'block';
        requestAnimationFrame(() => {
            infoPanel.style.opacity = '1';
        });
    }
    
    // Highlight the path to the selected weapon
    function highlightPath(weaponId) {
        // Clear existing highlights
        nodeElements.forEach(node => {
            const circle = node.querySelector('circle');
            const weapon = weaponTypes[node.getAttribute('data-weapon-id')];
            circle.setAttribute('fill', weapon.color || 'rgba(0, 20, 60, 0.8)');
        });
        
        lineElements.forEach(line => {
            line.setAttribute('stroke', 'url(#lineGradient)');
            line.style.animation = 'pulse 3s infinite';
        });
        
        // Find and highlight the path
        const path = findPathToWeapon(weaponId);
        selectedPath = path;
        
        path.forEach(nodeId => {
            const node = nodeElements.get(nodeId);
            if (node) {
                const circle = node.querySelector('circle');
                circle.setAttribute('fill', '#40FFFF');
            }
        });
        
        path.forEach((nodeId, index) => {
            if (index < path.length - 1) {
                const line = lineElements.get(`${nodeId}-${path[index + 1]}`);
                if (line) {
                    line.setAttribute('stroke', '#40FFFF');
                    line.style.animation = 'none';
                }
            }
        });
    }
    
    // Find the path to a weapon
    function findPathToWeapon(weaponId) {
        const path = [];
        let currentWeapon = weaponTypes[weaponId];
        
        while (currentWeapon) {
            path.unshift(currentWeapon.id);
            currentWeapon = currentWeapon.parentId ? weaponTypes[currentWeapon.parentId] : null;
        }
        
        return path;
    }
    
    function onNodeHover(weaponId) {
        const node = nodeElements.get(weaponId);
        if (node) {
            node.classList.add('hover');
            // Remove selectWeapon call from hover
        }
    }

    function onNodeUnhover(weaponId) {
        const node = nodeElements.get(weaponId);
        if (node) {
            node.classList.remove('hover');
        }
    }

    function onNodeClick(weaponId) {
        // Hide any existing info panels
        const existingPanels = document.querySelectorAll('.evolution-detail-panel');
        existingPanels.forEach(panel => {
            panel.style.display = 'none';
        });

        // Select weapon and show info panel
        selectWeapon(weaponId);

        // Play selection sound
        if (audioSystem.menuSynth) {
            audioSystem.playSound(audioSystem.menuSynth, "C5", "16n");
        }
    }
    
    // Public methods
    return {
        init,
        toggleEvolutionMenu,
        updateEvolutionTreeData,
        isOpen: () => isMenuOpen,
        getCurrentWeaponId: () => currentWeaponId
    };
})();

export default evolutionUI; 