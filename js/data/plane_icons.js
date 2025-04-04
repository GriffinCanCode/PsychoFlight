// js/data/plane_icons.js

// SVG icons for the planes in the evolution tree
// These are used to visually represent different weapon types

// Helper function to generate unique IDs for SVG elements
function createIconSvg(type, content) {
    return `
        <svg viewBox="0 0 24 24" width="36" height="36" shape-rendering="geometricPrecision">
            <defs>
                ${content.replace(/id="([^"]+)"/g, `id="${type}_$1"`)}
            </defs>
            <g class="plane-icon">
                ${content.replace(/url\(#([^)]+)\)/g, `url(#${type}_$1)`)}
            </g>
        </svg>
    `;
}

const planeIcons = {
    // Basic plane - simple delta wing
    planeBasic: createIconSvg('basic', `
        <linearGradient id="basicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#80C0FF" />
            <stop offset="40%" stop-color="#40A0FF" />
            <stop offset="60%" stop-color="#2080FF" />
            <stop offset="100%" stop-color="#1060CC" />
        </linearGradient>
        <filter id="basicGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feFlood flood-color="#40A0FF" flood-opacity="0.7" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
            <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <g class="plane-icon">
            <path d="M12,2 L3,16 L21,16 Z" fill="url(#basicGradient)" filter="url(#basicGlow)" />
            <rect x="11" y="16" width="2" height="6" fill="#40A0FF" />
            <circle cx="8" cy="14" r="1.2" fill="#FFFFFF" />
            <circle cx="16" cy="14" r="1.2" fill="#FFFFFF" />
            <path d="M12,6 L9,13 L15,13 Z" fill="#FFFFFF" fill-opacity="0.6" />
        </g>
    `),
    
    // Flamethrower plane - angular with flame ports
    planeFlame: createIconSvg('flame', `
        <linearGradient id="flameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF9060" />
            <stop offset="40%" stop-color="#FF6030" />
            <stop offset="60%" stop-color="#FF4000" />
            <stop offset="100%" stop-color="#CC3000" />
        </linearGradient>
        <filter id="flameGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feFlood flood-color="#FF6000" flood-opacity="0.7" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
            <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <g class="plane-icon">
            <path d="M12,2 L3,16 L21,16 Z" fill="url(#flameGradient)" filter="url(#flameGlow)" />
            <rect x="11" y="16" width="2" height="6" fill="#FF8040" />
            <circle cx="8" cy="14" r="1.2" fill="#FFFF80" />
            <circle cx="16" cy="14" r="1.2" fill="#FFFF80" />
            <path d="M12,6 L9,13 L15,13 Z" fill="#FFFFFF" fill-opacity="0.6" />
        </g>
    `),
    
    // Spread shot plane - wider wings
    planeSpread: createIconSvg('spread', `
        <linearGradient id="spreadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#40CFFF" />
            <stop offset="25%" stop-color="#50DFFF" />
            <stop offset="50%" stop-color="#60FFFF" />
            <stop offset="75%" stop-color="#50DFFF" />
            <stop offset="100%" stop-color="#40CFFF" />
        </linearGradient>
        <filter id="spreadGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feFlood flood-color="#60FFFF" flood-opacity="0.8" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
            <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <path d="M12,2 L2,14 L22,14 Z" fill="url(#spreadGradient)" filter="url(#spreadGlow)" />
        <rect x="11" y="14" width="2" height="8" fill="#40CFFF" />
        <line x1="6" y1="12" x2="18" y2="12" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
        <line x1="8" y1="10" x2="16" y2="10" stroke="#FFFFFF" stroke-width="0.8" stroke-linecap="round" opacity="0.8" />
        <path d="M12,6 L9,12 L15,12 Z" fill="#FFFFFF" fill-opacity="0.6" />
    `),
    
    // Beam plane - streamlined with central beam emitter
    planeBeam: createIconSvg('beam', `
        <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FF90FF" />
            <stop offset="50%" stop-color="#FF60FF" />
            <stop offset="100%" stop-color="#FF40FF" />
        </linearGradient>
        <filter id="beamGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feFlood flood-color="#FF60FF" flood-opacity="0.8" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
            <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <radialGradient id="emitterGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="40%" stop-color="#FF90FF" />
            <stop offset="70%" stop-color="#FF60FF" />
            <stop offset="100%" stop-color="#FF40FF" />
        </radialGradient>
        <path d="M12,2 L6,16 L18,16 Z" fill="url(#beamGradient)" filter="url(#beamGlow)" />
        <rect x="11" y="16" width="2" height="6" fill="#FF60FF" />
        <circle cx="12" cy="14" r="1.8" fill="url(#emitterGlow)" filter="url(#beamGlow)" />
        <path d="M12,3 L11,14 L13,14 Z" fill="#FFFFFF" fill-opacity="0.7" />
    `),
    
    // Nova plane - burst emitter configuration
    planeNova: createIconSvg('nova', `
        <linearGradient id="novaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FF4080" />
            <stop offset="25%" stop-color="#FF5090" />
            <stop offset="50%" stop-color="#FF6090" />
            <stop offset="75%" stop-color="#FF5090" />
            <stop offset="100%" stop-color="#FF4080" />
        </linearGradient>
        <filter id="novaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feFlood flood-color="#FF4080" flood-opacity="0.8" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
            <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <radialGradient id="burstGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="40%" stop-color="#FF90B0" />
            <stop offset="70%" stop-color="#FF70A0" />
            <stop offset="100%" stop-color="#FF4080" />
        </radialGradient>
        <path d="M12,2 L4,14 L20,14 Z" fill="url(#novaGradient)" filter="url(#novaGlow)" />
        <rect x="11" y="14" width="2" height="7" fill="#FF6090" />
        <circle cx="12" cy="13" r="2.2" fill="url(#burstGlow)" filter="url(#novaGlow)" />
        <circle cx="8" cy="12" r="1.2" fill="#FFA0A0" />
        <circle cx="16" cy="12" r="1.2" fill="#FFA0A0" />
        <path d="M12,4 L9,10 L15,10 Z" fill="#FFFFFF" fill-opacity="0.6" />
    `),
    
    // Phase plane - sleek with phase disruptors
    planePhase: createIconSvg('phase', `
        <linearGradient id="phaseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#D070FF" />
            <stop offset="50%" stop-color="#B050FF" />
            <stop offset="100%" stop-color="#A040FF" />
        </linearGradient>
        <filter id="phaseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feFlood flood-color="#A040FF" flood-opacity="0.9" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
            <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <path d="M12,2 L5,18 L19,18 Z" fill="url(#phaseGradient)" filter="url(#phaseGlow)" />
        <rect x="11" y="18" width="2" height="4" fill="#C060FF" />
        <path d="M9,14 L15,14 L12,10 Z" fill="#FFFFFF" fill-opacity="0.8" />
        <path d="M12,2 L11.3,10 L12.7,10 Z" fill="#FFFFFF" fill-opacity="0.8" />
        <ellipse cx="12" cy="14" rx="3" ry="0.6" fill="#E0C0FF" opacity="0.7" />
    `),
    
    // Singularity plane - gravity well generator
    planeSingularity: createIconSvg('singularity', `
        <linearGradient id="singularityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFB060" />
            <stop offset="25%" stop-color="#FFA050" />
            <stop offset="50%" stop-color="#FF8000" />
            <stop offset="75%" stop-color="#FF7000" />
            <stop offset="100%" stop-color="#FF6000" />
        </linearGradient>
        <filter id="singularityGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feFlood flood-color="#FF8000" flood-opacity="0.8" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
            <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="30%" stop-color="#FFD090" />
            <stop offset="60%" stop-color="#FFCC80" />
            <stop offset="100%" stop-color="#FF8000" />
        </radialGradient>
        <path d="M12,2 L3,16 L21,16 Z" fill="url(#singularityGradient)" filter="url(#singularityGlow)" />
        <rect x="11" y="16" width="2" height="6" fill="#FF8000" />
        <circle cx="12" cy="12" r="3.2" stroke="#FFCC80" stroke-width="1.2" fill="none" filter="url(#singularityGlow)" />
        <circle cx="12" cy="12" r="2" fill="url(#coreGlow)" />
        <path d="M12,5 L9,10 L15,10 Z" fill="#FFFFFF" fill-opacity="0.7" />
    `)
};

export default planeIcons; 