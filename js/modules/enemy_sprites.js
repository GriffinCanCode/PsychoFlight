// --- Enemy Sprites Module ---
const enemySprites = (() => {
    // Create canvas for sprite generation
    function createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    // Helper function to create gradient patterns
    function createGradient(ctx, width, height, colors, isRadial = false) {
        let gradient;
        if (isRadial) {
            gradient = ctx.createRadialGradient(
                width/2, height/2, 0,
                width/2, height/2, width/2
            );
        } else {
            gradient = ctx.createLinearGradient(0, 0, width, height);
        }
        
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });
        
        return gradient;
    }

    // Create the DRONE texture - High-tech hexagonal pattern with energy core
    function createDroneTexture() {
        const size = 256;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        // Background
        const bgGradient = createGradient(ctx, size, size, 
            ['#ff0000', '#aa0000', '#660000'], true);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, size, size);
        
        // Hexagonal pattern
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        const hexSize = 20;
        
        for (let row = 0; row < size/hexSize; row++) {
            for (let col = 0; col < size/hexSize; col++) {
                const x = col * hexSize * 1.5;
                const y = row * hexSize * Math.sqrt(3) + (col % 2) * hexSize * Math.sqrt(3)/2;
                
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3;
                    const px = x + hexSize * Math.cos(angle);
                    const py = y + hexSize * Math.sin(angle);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
        
        // Energy core
        const coreGradient = createGradient(ctx, size, size,
            ['#ffffff', '#ffaaaa', '#ff0000'], true);
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/6, 0, Math.PI * 2);
        ctx.fill();
        
        return canvas;
    }

    // Create the SENTRY texture - Circular shield with energy rings
    function createSentryTexture() {
        const size = 256;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        // Background
        const bgGradient = createGradient(ctx, size, size,
            ['#00ff00', '#00aa00', '#006600'], true);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, size, size);
        
        // Energy rings
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/3 - i * 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 255, 200, ${0.8 - i * 0.15})`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        
        // Shield pattern
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            ctx.save();
            ctx.translate(size/2, size/2);
            ctx.rotate(angle);
            
            ctx.beginPath();
            ctx.moveTo(0, -size/3);
            ctx.lineTo(10, -size/4);
            ctx.lineTo(0, -size/6);
            ctx.lineTo(-10, -size/4);
            ctx.closePath();
            
            ctx.fillStyle = '#00ff00';
            ctx.fill();
            ctx.restore();
        }
        
        return canvas;
    }

    // Create the STRIKER texture - Sharp, aggressive design with lightning effects
    function createStrikerTexture() {
        const size = 256;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        // Background
        const bgGradient = createGradient(ctx, size, size,
            ['#0000ff', '#0000aa', '#000066'], true);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, size, size);
        
        // Lightning pattern
        ctx.strokeStyle = '#aaaaff';
        ctx.lineWidth = 3;
        
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * size, 0);
            
            let x = size/2;
            let y = size/2;
            
            for (let j = 0; j < 5; j++) {
                x += (Math.random() - 0.5) * 100;
                y += size/5;
                ctx.lineTo(x, y);
            }
            
            ctx.stroke();
        }
        
        // Energy core
        const coreGradient = createGradient(ctx, size, size,
            ['#ffffff', '#aaaaff', '#0000ff'], true);
        ctx.fillStyle = coreGradient;
        
        // Create star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5;
            const x = size/2 + Math.cos(angle) * size/4;
            const y = size/2 + Math.sin(angle) * size/4;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        return canvas;
    }

    // Create all textures and convert to Three.js textures
    function createTextures() {
        const droneCanvas = createDroneTexture();
        const sentryCanvas = createSentryTexture();
        const strikerCanvas = createStrikerTexture();

        return {
            drone: new THREE.CanvasTexture(droneCanvas),
            sentry: new THREE.CanvasTexture(sentryCanvas),
            striker: new THREE.CanvasTexture(strikerCanvas)
        };
    }

    // Public API
    return {
        createTextures
    };
})();

export default enemySprites; 