import { weaponTypes, evolutionTree } from '../data/evolution_tree.js';
import planeIcons from '../data/plane_icons.js';
import audioSystem from './audio.js';
import uiSystem from './ui.js';

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
    const NODE_RADIUS = 35;
    const GRID_SIZE_X = 80;
    const GRID_SIZE_Y = 80;
    const CENTER_X = SVG_WIDTH / 2;
    const CENTER_Y = SVG_HEIGHT / 2 + 310;
    
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
        
        // Add animated background particles
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles-container';
        
        // Create multiple particle elements with different sizes and speeds
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Randomize particle properties
            const size = Math.random() * 3 + 1; // 1-4px
            const posX = Math.random() * 100; // 0-100%
            const posY = Math.random() * 100; // 0-100%
            const duration = Math.random() * 60 + 60; // 60-120s
            const delay = Math.random() * -60; // -60-0s
            
            // Apply styles
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.top = `${posY}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            // Add some variety in particle colors
            if (i % 5 === 0) particle.style.backgroundColor = '#60FFFF'; // Cyan
            else if (i % 5 === 1) particle.style.backgroundColor = '#FF60FF'; // Pink
            else if (i % 5 === 2) particle.style.backgroundColor = '#FFA060'; // Orange
            
            particlesContainer.appendChild(particle);
        }
        
        evolutionContainer.appendChild(particlesContainer);
        
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
        
        // Update SVG rendering quality
        svg.setAttribute('shape-rendering', 'geometricPrecision');
        svg.setAttribute('text-rendering', 'geometricPrecision');
        svg.setAttribute('image-rendering', 'optimizeQuality');
        
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
        
        // Create a pulsing animation for connections
        const pulseAnim = document.createElementNS(svgNS, "animate");
        pulseAnim.setAttribute("attributeName", "stroke-opacity");
        pulseAnim.setAttribute("values", "0.5;1;0.5");
        pulseAnim.setAttribute("dur", "3s");
        pulseAnim.setAttribute("repeatCount", "indefinite");
        
        // Enhanced node glow effect
        const nodeGlow = document.createElementNS(svgNS, "filter");
        nodeGlow.id = "nodeGlow";
        nodeGlow.setAttribute("x", "-50%");
        nodeGlow.setAttribute("y", "-50%");
        nodeGlow.setAttribute("width", "200%");
        nodeGlow.setAttribute("height", "200%");
        
        // Create a multi-step glow effect for more depth
        const feGaussianBlur1 = document.createElementNS(svgNS, "feGaussianBlur");
        feGaussianBlur1.setAttribute("stdDeviation", "4");
        feGaussianBlur1.setAttribute("result", "blur1");
        
        const feGaussianBlur2 = document.createElementNS(svgNS, "feGaussianBlur");
        feGaussianBlur2.setAttribute("in", "SourceGraphic");
        feGaussianBlur2.setAttribute("stdDeviation", "2");
        feGaussianBlur2.setAttribute("result", "blur2");
        
        const feFlood1 = document.createElementNS(svgNS, "feFlood");
        feFlood1.setAttribute("flood-color", "#60FFFF");
        feFlood1.setAttribute("flood-opacity", "0.8");
        feFlood1.setAttribute("result", "glow1");
        
        const feFlood2 = document.createElementNS(svgNS, "feFlood");
        feFlood2.setAttribute("flood-color", "#80FFFF");
        feFlood2.setAttribute("flood-opacity", "0.5");
        feFlood2.setAttribute("result", "glow2");
        
        const feComposite1 = document.createElementNS(svgNS, "feComposite");
        feComposite1.setAttribute("in", "glow1");
        feComposite1.setAttribute("in2", "blur1");
        feComposite1.setAttribute("operator", "in");
        feComposite1.setAttribute("result", "coloredBlur1");
        
        const feComposite2 = document.createElementNS(svgNS, "feComposite");
        feComposite2.setAttribute("in", "glow2");
        feComposite2.setAttribute("in2", "blur2");
        feComposite2.setAttribute("operator", "in");
        feComposite2.setAttribute("result", "coloredBlur2");
        
        const feMerge = document.createElementNS(svgNS, "feMerge");
        
        const feMergeNode1 = document.createElementNS(svgNS, "feMergeNode");
        feMergeNode1.setAttribute("in", "coloredBlur1");
        
        const feMergeNode2 = document.createElementNS(svgNS, "feMergeNode");
        feMergeNode2.setAttribute("in", "coloredBlur2");
        
        const feMergeNode3 = document.createElementNS(svgNS, "feMergeNode");
        feMergeNode3.setAttribute("in", "SourceGraphic");
        
        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);
        feMerge.appendChild(feMergeNode3);
        
        nodeGlow.appendChild(feGaussianBlur1);
        nodeGlow.appendChild(feGaussianBlur2);
        nodeGlow.appendChild(feFlood1);
        nodeGlow.appendChild(feFlood2);
        nodeGlow.appendChild(feComposite1);
        nodeGlow.appendChild(feComposite2);
        nodeGlow.appendChild(feMerge);
        
        defs.appendChild(nodeGlow);
        
        // Add text glow filter for better readability with glow effect
        const textGlow = document.createElementNS(svgNS, "filter");
        textGlow.id = "textGlow";
        textGlow.setAttribute("x", "-50%");
        textGlow.setAttribute("y", "-50%");
        textGlow.setAttribute("width", "200%");
        textGlow.setAttribute("height", "200%");
        
        const textBlur = document.createElementNS(svgNS, "feGaussianBlur");
        textBlur.setAttribute("in", "SourceGraphic");
        textBlur.setAttribute("stdDeviation", "1");
        textBlur.setAttribute("result", "textBlur");
        
        const textFlood = document.createElementNS(svgNS, "feFlood");
        textFlood.setAttribute("flood-color", "#80FFFF");
        textFlood.setAttribute("flood-opacity", "0.6");
        textFlood.setAttribute("result", "textGlowColor");
        
        const textComposite = document.createElementNS(svgNS, "feComposite");
        textComposite.setAttribute("in", "textGlowColor");
        textComposite.setAttribute("in2", "textBlur");
        textComposite.setAttribute("operator", "in");
        textComposite.setAttribute("result", "textColoredBlur");
        
        const textMerge = document.createElementNS(svgNS, "feMerge");
        const textMergeNode1 = document.createElementNS(svgNS, "feMergeNode");
        textMergeNode1.setAttribute("in", "textColoredBlur");
        const textMergeNode2 = document.createElementNS(svgNS, "feMergeNode");
        textMergeNode2.setAttribute("in", "SourceGraphic");
        
        textMerge.appendChild(textMergeNode1);
        textMerge.appendChild(textMergeNode2);
        
        textGlow.appendChild(textBlur);
        textGlow.appendChild(textFlood);
        textGlow.appendChild(textComposite);
        textGlow.appendChild(textMerge);
        
        defs.appendChild(textGlow);
        
        // Add holographic line effect
        const linePattern = document.createElementNS(svgNS, "pattern");
        linePattern.id = "holoLinePattern";
        linePattern.setAttribute("patternUnits", "userSpaceOnUse");
        linePattern.setAttribute("width", "30");
        linePattern.setAttribute("height", "30");
        linePattern.setAttribute("patternTransform", "rotate(45)");
        
        const lineRect = document.createElementNS(svgNS, "rect");
        lineRect.setAttribute("x", "0");
        lineRect.setAttribute("y", "0");
        lineRect.setAttribute("width", "30");
        lineRect.setAttribute("height", "30");
        lineRect.setAttribute("fill", "none");
        lineRect.setAttribute("stroke", "#40A0FF");
        lineRect.setAttribute("stroke-width", "1");
        lineRect.setAttribute("stroke-dasharray", "2,8");
        
        linePattern.appendChild(lineRect);
        defs.appendChild(linePattern);
        
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
                background-color: rgba(0, 5, 20, 0.95);
                backdrop-filter: blur(10px);
                z-index: 100;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
                font-family: 'Press Start 2P', cursive;
                color: #ffffff;
                overflow: hidden;
            }
            
            /* Particles background animation */
            .particles-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                z-index: -2;
            }
            
            .particle {
                position: absolute;
                background-color: #FFFFFF;
                border-radius: 50%;
                opacity: 0;
                transform: translate3d(0, 0, 0);
                animation: floatParticle 8s linear infinite;
                will-change: transform, opacity;
            }
            
            @keyframes floatParticle {
                0% {
                    transform: translate3d(0, 0, 0);
                    opacity: 0;
                }
                15% {
                    opacity: 0.3;
                    transform: translate3d(5px, -10vh, 0);
                }
                85% {
                    opacity: 0.3;
                    transform: translate3d(90px, -90vh, 0);
                }
                100% {
                    transform: translate3d(100px, -100vh, 0);
                    opacity: 0;
                }
            }
            
            /* Background stars effect */
            .evolution-menu-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image: 
                    radial-gradient(circle at 20% 30%, rgba(61, 118, 229, 0.1) 0%, transparent 20%),
                    radial-gradient(circle at 80% 70%, rgba(229, 61, 171, 0.1) 0%, transparent 20%);
                z-index: -1;
            }
            
            /* Grid lines effect */
            .evolution-menu-container::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image: 
                    linear-gradient(to right, rgba(100, 200, 255, 0.05) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(100, 200, 255, 0.05) 1px, transparent 1px);
                background-size: 40px 40px;
                z-index: -1;
            }
            
            .evolution-header {
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-bottom: 30px;
                padding: 0;
                position: relative;
            }
            
            .evolution-title {
                font-size: 3rem;
                color: #60FFFF;
                text-shadow: 0 0 10px #60FFFF, 0 0 20px #4080FF, 0 0 30px #4080FF;
                margin: 0;
                letter-spacing: 4px;
                animation: pulseTitleGlow 3s infinite;
                text-align: center;
                position: relative;
                z-index: 1;
            }
            
            @keyframes pulseTitleGlow {
                0%, 100% { 
                    text-shadow: 0 0 10px #60FFFF, 0 0 20px #4080FF;
                    transform: translate3d(0, 0, 0);
                }
                50% { 
                    text-shadow: 0 0 15px #60FFFF, 0 0 30px #4080FF, 0 0 40px #4080FF;
                    transform: translate3d(0, 0, 0);
                }
            }
            
            .evolution-close-btn {
                background: transparent;
                border: 2px solid #FF60FF;
                color: #FF60FF;
                font-size: 1.5rem;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                box-shadow: 0 0 10px #FF60FF, inset 0 0 5px rgba(255, 96, 255, 0.5);
                text-shadow: 0 0 5px #FF60FF;
                position: absolute;
                right: 40px;
                top: 50%;
                transform: translateY(-50%);
                z-index: 2;
            }
            
            .evolution-close-btn:hover {
                background: rgba(255, 96, 255, 0.2);
                color: #FFFFFF;
                transform: scale(1.1);
                box-shadow: 0 0 20px #FF60FF, inset 0 0 10px rgba(255, 96, 255, 0.7);
            }
            
            .evolution-svg {
                width: 800px;
                height: 600px;
                max-width: 100%;
                background-color: rgba(0, 5, 30, 0.5);
                border-radius: 10px;
                border: 1px solid rgba(100, 200, 255, 0.3);
                box-shadow: 0 0 30px rgba(60, 170, 255, 0.15);
                overflow: visible; /* Allow glow effects to extend beyond SVG boundaries */
                position: relative; /* For pseudo-elements */
            }
            
            /* Add subtle scan line effect to the tree */
            .evolution-svg::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(to bottom, 
                    transparent 0%, 
                    rgba(100, 200, 255, 0.03) 50%, 
                    transparent 100%);
                background-size: 100% 4px;
                pointer-events: none;
                z-index: 1;
                animation: scanEffect 8s linear infinite;
            }
            
            @keyframes scanEffect {
                0%, 100% { 
                    transform: translate3d(0, -100%, 0);
                    opacity: 0.02;
                }
                50% {
                    transform: translate3d(0, 200%, 0);
                    opacity: 0.03;
                }
            }
            
            .evolution-node {
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                filter: drop-shadow(0 0 8px rgba(100, 200, 255, 0.7));
                will-change: transform, filter;
                transform-origin: center center;
                transform-box: fill-box;
            }
            
            .evolution-node:hover {
                filter: drop-shadow(0 0 12px rgba(100, 240, 255, 0.9));
            }
            
            .evolution-node-locked {
                opacity: 0.5;
                filter: grayscale(70%) drop-shadow(0 0 5px rgba(100, 200, 255, 0.3));
            }
            
            .evolution-node-current {
                filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.9));
            }
            
            .evolution-connection {
                stroke-width: 3px;
                stroke-linecap: round;
                opacity: 0.8;
                transform: translate3d(0, 0, 0);
                transition: opacity 0.3s ease;
            }
            
            .evolution-connection-locked {
                opacity: 0.3;
                stroke-dasharray: 5, 5;
                filter: drop-shadow(0 0 3px rgba(100, 200, 255, 0.3));
            }
            
            .evolution-connection-path {
                opacity: 1;
                stroke-width: 4px;
                animation: flowPath 2s linear infinite;
                transform: translate3d(0, 0, 0);
            }
            
            @keyframes flowPath {
                0% {
                    stroke-dashoffset: 100;
                    opacity: 0.8;
                }
                100% {
                    stroke-dashoffset: 0;
                    opacity: 0.8;
                }
            }
            
            .holographic-ring {
                transition: all 0.3s ease;
                opacity: 0.7;
            }
            
            .evolution-node:hover .holographic-ring {
                opacity: 0.9;
                stroke-width: 2px;
            }
            
            .evolution-detail-panel {
                margin-top: 0;
                background-color: rgba(0, 10, 40, 0.7);
                border: 2px solid rgba(100, 200, 255, 0.5);
                border-radius: 10px;
                padding: 15px;
                width: 500px;
                max-width: 90%;
                box-shadow: 0 0 20px rgba(100, 200, 255, 0.3), inset 0 0 10px rgba(100, 200, 255, 0.1);
                position: relative;
                overflow: hidden;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                transform: translateY(-40px);
            }
            
            .evolution-detail-panel::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: 
                    linear-gradient(90deg, transparent 0%, rgba(100, 200, 255, 0.05) 50%, transparent 100%),
                    linear-gradient(rgba(0, 20, 80, 0.7), rgba(0, 20, 80, 0.7));
                background-size: 200% 100%, 100% 100%;
                animation: scanLine 6s linear infinite;
                pointer-events: none;
                z-index: -1;
            }
            
            @keyframes scanLine {
                0% { 
                    background-position: -200% 0, 0 0;
                    opacity: 0.03;
                }
                50% {
                    opacity: 0.05;
                }
                100% { 
                    background-position: 200% 0, 0 0;
                    opacity: 0.03;
                }
            }
            
            .evolution-detail-panel h3 {
                color: #80FFFF;
                margin: 0 auto;
                margin-bottom: 15px;
                font-size: 1.5rem;
                text-shadow: 0 0 8px #60FFFF;
                position: relative;
                display: inline-block;
                font-family: 'Press Start 2P', cursive;
                letter-spacing: 2px;
                padding: 0 10px;
            }
            
            .evolution-detail-panel h3::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 50%;
                transform: translateX(-50%);
                width: 120%;
                height: 2px;
                background: linear-gradient(90deg, transparent, #60FFFF, transparent);
                border-radius: 1px;
            }
            
            .evolution-detail-panel p {
                color: #FFFFFF;
                margin-bottom: 25px;
                font-size: 0.9rem;
                line-height: 1.6;
                text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
            }
            
            .weapon-stats {
                display: flex;
                justify-content: space-between;
                margin-bottom: 25px;
                font-size: 0.8rem;
                gap: 20px;
            }
            
            .weapon-stats div {
                flex: 1;
                background-color: rgba(0, 20, 80, 0.5);
                padding: 15px;
                border-radius: 6px;
                border: 1px solid rgba(100, 200, 255, 0.3);
                box-shadow: 0 0 10px rgba(100, 200, 255, 0.1), inset 0 0 5px rgba(100, 200, 255, 0.05);
                position: relative;
                overflow: hidden;
            }
            
            .weapon-stats div::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 50%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                animation: statsScan 3s infinite;
            }
            
            @keyframes statsScan {
                0% { 
                    left: -100%;
                    opacity: 0;
                }
                25% {
                    opacity: 0.1;
                }
                75% {
                    opacity: 0.1;
                }
                100% { 
                    left: 200%;
                    opacity: 0;
                }
            }
            
            .weapon-stats div span:first-child {
                color: #60FFFF;
                margin-right: 8px;
                text-shadow: 0 0 5px rgba(96, 255, 255, 0.8);
            }
            
            .weapon-stats div span:last-child {
                color: #FFFFFF;
                text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
            }
            
            .select-weapon-btn {
                background: linear-gradient(135deg, #2070FF, #40FFFF);
                border: none;
                padding: 15px 0;
                width: 100%;
                border-radius: 8px;
                color: #FFFFFF;
                font-family: 'Press Start 2P', cursive;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform, box-shadow, background;
                box-shadow: 0 0 15px rgba(64, 255, 255, 0.5), inset 0 0 5px rgba(255, 255, 255, 0.5);
                text-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
                position: relative;
                overflow: hidden;
            }
            
            .select-weapon-btn::after {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transform: rotate(45deg);
                animation: buttonShine 3s infinite;
            }
            
            @keyframes buttonShine {
                0% { 
                    left: -50%;
                    top: -50%;
                    opacity: 0;
                }
                25% {
                    opacity: 0.1;
                }
                75% {
                    opacity: 0.1;
                }
                100% { 
                    left: 100%;
                    top: 100%;
                    opacity: 0;
                }
            }
            
            .select-weapon-btn:hover {
                transform: scale(1.05);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 0 25px rgba(64, 255, 255, 0.7), inset 0 0 10px rgba(255, 255, 255, 0.7);
                background: linear-gradient(135deg, #3080FF, #60FFFF);
            }
            
            .select-weapon-btn:disabled {
                background: linear-gradient(135deg, #404040, #707070);
                cursor: not-allowed;
                opacity: 0.5;
                transform: scale(1);
                box-shadow: 0 0 10px rgba(100, 100, 100, 0.5);
            }
            
            .select-weapon-btn:disabled::after {
                display: none;
            }
            
            .weapon-icon {
                fill: #FFFFFF;
                filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
            }
            
            @keyframes holoEffect {
                0% { 
                    opacity: 0.7;
                    filter: brightness(0.9) drop-shadow(0 0 5px rgba(100, 200, 255, 0.7));
                    transform: scale(1);
                }
                25% {
                    opacity: 0.85;
                    filter: brightness(1.0) drop-shadow(0 0 7px rgba(100, 200, 255, 0.8));
                    transform: scale(1.02);
                }
                50% { 
                    opacity: 1;
                    filter: brightness(1.1) drop-shadow(0 0 10px rgba(100, 200, 255, 0.9));
                    transform: scale(1.05);
                }
                75% {
                    opacity: 0.85;
                    filter: brightness(1.0) drop-shadow(0 0 7px rgba(100, 200, 255, 0.8));
                    transform: scale(1.02);
                }
                100% { 
                    opacity: 0.7;
                    filter: brightness(0.9) drop-shadow(0 0 5px rgba(100, 200, 255, 0.7));
                    transform: scale(1);
                }
            }
            
            .holographic-effect {
                animation: holoEffect 3s infinite;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.98); }
                to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.98); }
            }
            
            .score-requirement {
                opacity: 0.8;
                transition: opacity 0.3s ease;
                text-shadow: 0 0 5px #FF60FF;
            }
            
            .evolution-node:hover .score-requirement {
                opacity: 1;
            }
            
            .weapon-tooltip {
                transition: opacity 0.2s ease-in-out;
                filter: drop-shadow(0 0 10px rgba(96, 255, 255, 0.3));
            }
            
            .weapon-tooltip rect {
                transition: all 0.2s ease-in-out;
            }
            
            .evolution-node:hover .weapon-tooltip rect {
                stroke-width: 2;
                filter: drop-shadow(0 0 5px rgba(96, 255, 255, 0.5));
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

        // Draw connections first (behind nodes)
        evolutionTree.connections.forEach((connection, index) => {
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
                    
                    // Create connection line with enhanced styling
                    const line = document.createElementNS(svgNS, "path");
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2 - 20;
                    const pathData = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
                    
                    line.setAttribute("d", pathData);
                    line.setAttribute("fill", "none");
                    line.setAttribute("stroke", fromWeapon.lineColor || "#60FFFF");
                    line.setAttribute("stroke-width", "3");
                    line.setAttribute("class", `evolution-connection ${!fromWeapon.unlocked || !toWeapon.unlocked ? 'evolution-connection-locked' : ''}`);
                    
                    const connectionKey = `${connection.from}-${connection.to}`;
                    lineElements.set(connectionKey, line);
                    
                    connectionsGroup.appendChild(line);
                }
            }
        });

        // Draw nodes with consistent styling
        Object.keys(evolutionTree.positions).forEach((weaponId, index) => {
            const weapon = evolutionTree.getWeapon(weaponId);
            const pos = evolutionTree.positions[weaponId];
            
            if (weapon && pos) {
                const x = CENTER_X + pos.x * GRID_SIZE_X;
                const y = CENTER_Y - pos.y * GRID_SIZE_Y;
                
                const nodeGroup = document.createElementNS(svgNS, "g");
                nodeGroup.setAttribute("id", `node-${weaponId}-${index}`);
                nodeGroup.setAttribute("class", `evolution-node ${!weapon.unlocked ? 'evolution-node-locked' : ''} ${weaponId === currentWeaponId ? 'evolution-node-current' : ''}`);
                nodeGroup.setAttribute("data-weapon-id", weaponId);
                
                // Set initial position with transform
                const baseTransform = `translate(${x}, ${y})`;
                nodeGroup.setAttribute("transform", baseTransform);
                nodeGroup.setAttribute("data-base-transform", baseTransform);

                // Create node background with consistent glow
                const nodeFilterId = `node-glow-${weaponId}-${index}`;
                const glowFilter = document.getElementById("nodeGlow").cloneNode(true);
                glowFilter.id = nodeFilterId;
                svg.querySelector("defs").appendChild(glowFilter);
                
                if (weapon.unlocked) {
                    nodeGroup.setAttribute("filter", `url(#${nodeFilterId})`);
                }

                // Create circular background with consistent styling
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("r", NODE_RADIUS);
                circle.setAttribute("fill", weapon.color || "#4080FF");
                circle.setAttribute("class", "holographic-effect");
                
                // Add outer glow ring
                const outerRing = document.createElementNS(svgNS, "circle");
                outerRing.setAttribute("r", NODE_RADIUS + 3);
                outerRing.setAttribute("fill", "none");
                outerRing.setAttribute("stroke", weapon.lineColor || "#60FFFF");
                outerRing.setAttribute("stroke-width", "1.5");
                outerRing.setAttribute("opacity", "0.7");
                
                // Create inner circle for depth effect
                const innerCircle = document.createElementNS(svgNS, "circle");
                innerCircle.setAttribute("r", NODE_RADIUS * 0.85);
                innerCircle.setAttribute("fill", shadeColor(weapon.color || "#4080FF", -20));

                // Add rotating holographic rings for all nodes
                const rotationAnimId1 = `rot-${weaponId}-1-${index}`;
                const rotationAnimId2 = `rot-${weaponId}-2-${index}`;
                
                // First ring with animation
                const holoRing1 = document.createElementNS(svgNS, "circle");
                holoRing1.setAttribute("r", NODE_RADIUS * 1.2);
                holoRing1.setAttribute("fill", "none");
                holoRing1.setAttribute("stroke", weapon.lineColor || "#60FFFF");
                holoRing1.setAttribute("stroke-dasharray", "3,10");
                holoRing1.setAttribute("class", "holographic-ring");
                
                const animateTransform1 = document.createElementNS(svgNS, "animateTransform");
                animateTransform1.setAttribute("id", rotationAnimId1);
                animateTransform1.setAttribute("attributeName", "transform");
                animateTransform1.setAttribute("type", "rotate");
                animateTransform1.setAttribute("from", "0 0 0");
                animateTransform1.setAttribute("to", "360 0 0");
                animateTransform1.setAttribute("dur", "10s");
                animateTransform1.setAttribute("repeatCount", "indefinite");
                holoRing1.appendChild(animateTransform1);
                
                // Second ring with opposite rotation
                const holoRing2 = document.createElementNS(svgNS, "circle");
                holoRing2.setAttribute("r", NODE_RADIUS * 1.3);
                holoRing2.setAttribute("fill", "none");
                holoRing2.setAttribute("stroke", shadeColor(weapon.lineColor || "#60FFFF", 20));
                holoRing2.setAttribute("stroke-dasharray", "7,7");
                holoRing2.setAttribute("class", "holographic-ring");
                
                const animateTransform2 = document.createElementNS(svgNS, "animateTransform");
                animateTransform2.setAttribute("id", rotationAnimId2);
                animateTransform2.setAttribute("attributeName", "transform");
                animateTransform2.setAttribute("type", "rotate");
                animateTransform2.setAttribute("from", "360 0 0");
                animateTransform2.setAttribute("to", "0 0 0");
                animateTransform2.setAttribute("dur", "15s");
                animateTransform2.setAttribute("repeatCount", "indefinite");
                holoRing2.appendChild(animateTransform2);

                nodeGroup.appendChild(holoRing1);
                nodeGroup.appendChild(holoRing2);

                // Add weapon icon with consistent styling
                const iconGroup = document.createElementNS(svgNS, "g");
                iconGroup.setAttribute("transform", "translate(-15, -15)");
                const iconKey = weapon.icon || 'planeBasic';
                const iconSvg = planeIcons[iconKey] || planeIcons.planeBasic;
                iconGroup.innerHTML = iconSvg;
                
                // Add label with consistent styling
                const label = document.createElementNS(svgNS, "text");
                label.setAttribute("text-anchor", "middle");
                label.setAttribute("dominant-baseline", "middle");
                label.setAttribute("y", NODE_RADIUS + 22);
                label.setAttribute("font-size", "13");
                label.setAttribute("font-weight", "bold");
                label.setAttribute("fill", "#FFFFFF");
                label.setAttribute("class", "node-label");
                label.setAttribute("filter", "url(#textGlow)");
                label.textContent = weapon.name;

                // Add score requirement label for locked weapons
                if (!weapon.unlocked && weapon.requirements?.score) {
                    const scoreLabel = document.createElementNS(svgNS, "text");
                    scoreLabel.setAttribute("text-anchor", "middle");
                    scoreLabel.setAttribute("dominant-baseline", "middle");
                    scoreLabel.setAttribute("y", NODE_RADIUS + 40);
                    scoreLabel.setAttribute("font-size", "11");
                    scoreLabel.setAttribute("fill", "#FF60FF");
                    scoreLabel.setAttribute("class", "score-requirement");
                    scoreLabel.setAttribute("filter", "url(#textGlow)");
                    scoreLabel.textContent = `Score: ${weapon.requirements.score}`;
                    nodeGroup.appendChild(scoreLabel);
                }

                // Add hover tooltip for locked weapons
                if (!weapon.unlocked && weapon.requirements?.score) {
                    const tooltip = document.createElementNS(svgNS, "g");
                    tooltip.setAttribute("class", "weapon-tooltip");
                    tooltip.style.opacity = "0";
                    tooltip.style.pointerEvents = "none";
                    
                    const tooltipBg = document.createElementNS(svgNS, "rect");
                    tooltipBg.setAttribute("x", "-100");
                    tooltipBg.setAttribute("y", "-80");
                    tooltipBg.setAttribute("width", "200");
                    tooltipBg.setAttribute("height", "40");
                    tooltipBg.setAttribute("rx", "5");
                    tooltipBg.setAttribute("ry", "5");
                    tooltipBg.setAttribute("fill", "rgba(0, 10, 30, 0.9)");
                    tooltipBg.setAttribute("stroke", "#60FFFF");
                    tooltipBg.setAttribute("stroke-width", "1");
                    
                    const tooltipText = document.createElementNS(svgNS, "text");
                    tooltipText.setAttribute("text-anchor", "middle");
                    tooltipText.setAttribute("y", "-55");
                    tooltipText.setAttribute("font-size", "12");
                    tooltipText.setAttribute("fill", "#FFFFFF");
                    tooltipText.setAttribute("filter", "url(#textGlow)");
                    const currentScore = uiSystem.getScore();
                    tooltipText.textContent = `Progress: ${currentScore}/${weapon.requirements.score}`;
                    
                    tooltip.appendChild(tooltipBg);
                    tooltip.appendChild(tooltipText);
                    nodeGroup.appendChild(tooltip);
                }

                // Add hover handlers with consistent behavior
                nodeGroup.addEventListener("mouseenter", (event) => {
                    const baseTransform = nodeGroup.getAttribute("data-base-transform");
                    nodeGroup.setAttribute("transform", `${baseTransform} scale(1.1)`);
                    
                    // Enhance glow effect on hover
                    const glowFilter = document.getElementById(nodeFilterId);
                    if (glowFilter) {
                        const blurElement = glowFilter.querySelector("feGaussianBlur");
                        if (blurElement) {
                            blurElement.setAttribute("stdDeviation", "5");
                        }
                    }
                    
                    // Show tooltip if weapon is locked
                    const tooltip = nodeGroup.querySelector(".weapon-tooltip");
                    if (tooltip) {
                        tooltip.style.opacity = "1";
                        tooltip.style.transition = "opacity 0.2s ease-in-out";
                    }
                });
                
                nodeGroup.addEventListener("mouseleave", (event) => {
                    const baseTransform = nodeGroup.getAttribute("data-base-transform");
                    nodeGroup.setAttribute("transform", baseTransform);
                    
                    // Restore normal glow
                    const glowFilter = document.getElementById(nodeFilterId);
                    if (glowFilter) {
                        const blurElement = glowFilter.querySelector("feGaussianBlur");
                        if (blurElement) {
                            blurElement.setAttribute("stdDeviation", "3");
                        }
                    }
                    
                    // Hide tooltip
                    const tooltip = nodeGroup.querySelector(".weapon-tooltip");
                    if (tooltip) {
                        tooltip.style.opacity = "0";
                    }
                });

                // Add click handler
                nodeGroup.addEventListener("click", () => selectWeapon(weaponId));
                
                // Add elements in proper layering order
                nodeGroup.appendChild(outerRing);
                nodeGroup.appendChild(circle);
                nodeGroup.appendChild(innerCircle);
                nodeGroup.appendChild(iconGroup);
                nodeGroup.appendChild(label);
                
                nodeElements.set(weaponId, nodeGroup);
                nodesGroup.appendChild(nodeGroup);
            }
        });

        // Update selected path
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
        lineElements.forEach(line => {
            line.style.transition = 'opacity 0.2s ease';
            line.classList.remove('evolution-connection-path');
        });
        
        selectedPath.forEach(segment => {
            const connectionKey = `${segment.from}-${segment.to}`;
            const reversedKey = `${segment.to}-${segment.from}`;
            
            const line = lineElements.get(connectionKey) || lineElements.get(reversedKey);
            if (line) {
                requestAnimationFrame(() => {
                    line.classList.add('evolution-connection-path');
                });
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
            // Show requirements and current progress if locked
            const reqScore = weapon.requirements?.score || 0;
            const currentScore = uiSystem.getScore();
            selectButton.textContent = `Locked (Score: ${currentScore}/${reqScore})`;
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
        if (audioSystem.menuSynth) {
            audioSystem.playSound(audioSystem.menuSynth, "C5", "32n");
        } else {
            audioSystem.playSound(audioSystem.flamethrowerSynth, "C5", "32n");
        }
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
        if (audioSystem.spreadSynth) {
            audioSystem.playSound(audioSystem.spreadSynth, ["C4", "E4", "G4"], "8n");
        } else {
            audioSystem.playSound(audioSystem.flamethrowerSynth, ["C4", "E4", "G4"], "8n");
        }
        
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
            evolutionContainer.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
            evolutionContainer.style.opacity = '0';
            evolutionContainer.style.transform = 'translate3d(0, -10px, 0)';
            setTimeout(() => {
                evolutionContainer.style.display = 'none';
                document.getElementById('gameCanvas')?.requestPointerLock?.();
            }, 200);
            isEvolutionMenuOpen = false;
        } else {
            if (document.pointerLockElement) {
                document.exitPointerLock?.();
            }
            renderEvolutionTree();
            evolutionContainer.style.display = 'flex';
            evolutionContainer.style.opacity = '0';
            evolutionContainer.style.transform = 'translate3d(0, 10px, 0)';
            requestAnimationFrame(() => {
                evolutionContainer.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
                evolutionContainer.style.opacity = '1';
                evolutionContainer.style.transform = 'translate3d(0, 0, 0)';
            });
            selectWeapon(currentWeaponId);
            isEvolutionMenuOpen = true;
        }
        
        // Play menu toggle sound effect
        if (audioSystem.menuSynth) {
            audioSystem.playSound(audioSystem.menuSynth, "E4", "16n");
        } else {
            audioSystem.playSound(audioSystem.flamethrowerSynth, "E4", "16n");
        }
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