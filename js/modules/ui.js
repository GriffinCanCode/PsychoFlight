// --- UI Module ---
import audioSystem from './audio.js';

const uiSystem = (() => {
    // Private variables
    let score = 0;
    let gameOver = false;
    
    // DOM elements - will be initialized in init()
    let scoreDisplayElement;
    let finalScoreElement;
    let weaponInfoElement;
    let shiftStatusElement;
    let bossHealthBarContainer;
    let bossHealthBar;
    let gameOverOverlay;
    let crosshairElement;
    let notificationElement; // New element for notifications
    
    // Notification timer
    let notificationTimeout = null;
    
    // Public methods
    function init() {
        // Get DOM elements
        scoreDisplayElement = document.getElementById('scoreDisplay');
        finalScoreElement = document.getElementById('finalScore');
        weaponInfoElement = document.getElementById('weaponInfo');
        shiftStatusElement = document.getElementById('shiftStatus');
        bossHealthBarContainer = document.getElementById('bossHealthBarContainer');
        bossHealthBar = document.getElementById('bossHealthBar');
        gameOverOverlay = document.querySelector('.game-over-overlay');
        crosshairElement = document.getElementById('crosshair');
        
        // Create help button and modal
        createHelpElements();
        
        // Create notification element
        createNotificationElement();
        
        // Setup listeners
        document.querySelector('.play-again-button').addEventListener('click', () => {
            if (typeof window.restartGame === 'function') {
                window.restartGame();
            }
        });
        
        // Initialize displays
        updateScoreDisplay();
        updateWeaponInfo('Flamethrower'); // Default weapon
        
        return {
            scoreDisplayElement,
            finalScoreElement,
            weaponInfoElement,
            shiftStatusElement,
            bossHealthBarContainer,
            bossHealthBar,
            gameOverOverlay,
            crosshairElement,
            notificationElement
        };
    }
    
    function createHelpElements() {
        // Create help button
        const helpButton = document.createElement('button');
        helpButton.className = 'help-button';
        helpButton.textContent = '?';
        document.body.appendChild(helpButton);

        // Create help modal
        const helpModal = document.createElement('div');
        helpModal.className = 'help-modal';
        helpModal.style.display = 'none';

        const modalContent = document.createElement('div');
        modalContent.className = 'help-modal-content';

        const closeButton = document.createElement('span');
        closeButton.className = 'help-modal-close';
        closeButton.textContent = '×';
        modalContent.appendChild(closeButton);

        const title = document.createElement('h2');
        title.textContent = 'Game Controls';
        modalContent.appendChild(title);

        const controlsList = document.createElement('ul');
        const controls = [
            ['WASD', 'Steer spacecraft'],
            ['Mouse', 'Look around'],
            ['Space', 'Activate thrusters (fly forward)'],
            ['G', 'Fire weapons'],
            ['X', 'Dimension shift (temporary invulnerability)'],
            ['T', 'Teleport forward'],
            ['Click', 'Lock/unlock target'],
            ['E', 'Evolution menu'],
            ['Esc', 'Exit pointer lock']
        ];

        controls.forEach(([key, description]) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="key">${key}</span> <span class="description">${description}</span>`;
            controlsList.appendChild(li);
        });

        modalContent.appendChild(controlsList);
        helpModal.appendChild(modalContent);
        document.body.appendChild(helpModal);

        // Add CSS for help elements
        const style = document.createElement('style');
        style.textContent = `
            .help-button {
                position: fixed;
                bottom: 60px;
                right: 20px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(0, 20, 40, 0.8);
                color: #60FFFF;
                border: 2px solid #60FFFF;
                font-size: 24px;
                cursor: pointer;
                z-index: 1000;
                font-family: 'Press Start 2P', cursive;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
                transition: all 0.3s ease;
            }

            .help-button:hover {
                background: rgba(0, 40, 80, 0.8);
                box-shadow: 0 0 25px rgba(0, 255, 255, 0.8);
            }

            .help-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 1001;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .help-modal-content {
                background: rgba(0, 20, 40, 0.95);
                padding: 30px;
                border-radius: 10px;
                border: 2px solid #60FFFF;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
                max-width: 500px;
                width: 90%;
                color: #FFFFFF;
                font-family: 'Press Start 2P', cursive;
                position: relative;
            }

            .help-modal-close {
                position: absolute;
                top: 10px;
                right: 15px;
                font-size: 24px;
                cursor: pointer;
                color: #60FFFF;
            }

            .help-modal h2 {
                color: #60FFFF;
                text-align: center;
                margin-bottom: 20px;
                font-size: 1.2em;
            }

            .help-modal ul {
                list-style: none;
                padding: 0;
            }

            .help-modal li {
                margin: 15px 0;
                display: flex;
                align-items: center;
                font-size: 0.8em;
            }

            .help-modal .key {
                background: rgba(96, 255, 255, 0.2);
                padding: 5px 10px;
                border-radius: 5px;
                margin-right: 15px;
                min-width: 80px;
                text-align: center;
                border: 1px solid #60FFFF;
                color: #60FFFF;
            }

            .help-modal .description {
                color: #FFFFFF;
            }
        `;
        document.head.appendChild(style);

        // Add event listeners
        helpButton.addEventListener('click', () => {
            helpModal.style.display = 'flex';
            // Pause game if it's running
            if (typeof evolutionUI !== 'undefined' && !evolutionUI.isOpen()) {
                evolutionUI.toggleEvolutionMenu();
            }
        });

        closeButton.addEventListener('click', () => {
            helpModal.style.display = 'none';
            // Resume game if it was running
            if (typeof evolutionUI !== 'undefined' && evolutionUI.isOpen()) {
                evolutionUI.toggleEvolutionMenu();
            }
        });

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.display = 'none';
                // Resume game if it was running
                if (typeof evolutionUI !== 'undefined' && evolutionUI.isOpen()) {
                    evolutionUI.toggleEvolutionMenu();
                }
            }
        });
    }
    
    // Create the notification element
    function createNotificationElement() {
        // Create the notification element if it doesn't exist yet
        notificationElement = document.createElement('div');
        notificationElement.id = 'notification';
        notificationElement.className = 'game-notification';
        notificationElement.style.display = 'none';
        
        // Add CSS for notifications
        const style = document.createElement('style');
        style.textContent = `
            .game-notification {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 20, 40, 0.8);
                color: #60FFFF;
                font-family: 'Press Start 2P', cursive;
                font-size: 0.9rem;
                padding: 15px 25px;
                border-radius: 5px;
                border: 2px solid #60FFFF;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
                z-index: 10;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
                text-shadow: 0 0 5px #60FFFF;
                animation: glowNotification 2s infinite;
            }
            
            @keyframes glowNotification {
                0% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.5); text-shadow: 0 0 5px #60FFFF; }
                50% { box-shadow: 0 0 25px rgba(0, 255, 255, 0.8); text-shadow: 0 0 10px #60FFFF; }
                100% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.5); text-shadow: 0 0 5px #60FFFF; }
            }
            
            .notification-show {
                opacity: 1 !important;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notificationElement);
    }
    
    // Show a notification message to the player
    function showNotification(message, duration = 5000) {
        if (!notificationElement) return;
        
        // Clear any existing timeout
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
        }
        
        // Set notification text and show it
        notificationElement.textContent = message;
        notificationElement.style.display = 'block';
        
        // Use setTimeout to ensure CSS transition works
        setTimeout(() => {
            notificationElement.classList.add('notification-show');
        }, 10);
        
        // Hide notification after duration
        notificationTimeout = setTimeout(() => {
            notificationElement.classList.remove('notification-show');
            setTimeout(() => {
                notificationElement.style.display = 'none';
            }, 300); // Wait for fade out transition
        }, duration);
        
        // Play notification sound
        audioSystem.playSound(audioSystem.spreadSynth || audioSystem.flamethrowerSynth, ["E5", "A5"], "16n");
    }
    
    function updateScoreDisplay() {
        if (scoreDisplayElement) {
            scoreDisplayElement.textContent = `Score: ${score}`;
        }
    }
    
    function updateWeaponInfo(weaponName) {
        if (weaponInfoElement) {
            weaponInfoElement.textContent = `Weapon: ${weaponName}`;
        }
    }
    
    function updateShiftStatus(status) {
        const shiftElement = document.querySelector('.shift-status');
        if (!shiftElement) return;
        
        if (status.active) {
            shiftElement.textContent = `SHIFT: ${status.timeLeft.toFixed(1)}s`;
            shiftElement.style.color = '#00ff00';
        } else if (status.cooldown > 0) {
            shiftElement.textContent = `SHIFT: ${status.cooldown.toFixed(1)}s`;
            shiftElement.style.color = '#ff0000';
        } else {
            shiftElement.textContent = 'SHIFT: READY';
            shiftElement.style.color = '#ffffff';
        }
    }
    
    function updateTeleportStatus(status) {
        const teleportElement = document.querySelector('.teleport-status');
        if (!teleportElement) return;
        
        if (status.cooldown > 0) {
            teleportElement.textContent = `TELEPORT: ${status.cooldown.toFixed(1)}s`;
            teleportElement.style.color = '#ff0000';
        } else {
            teleportElement.textContent = 'TELEPORT: READY';
            teleportElement.style.color = '#ffffff';
        }
    }
    
    function updateBossHealthBar(healthPercentage) {
        if (bossHealthBarContainer && bossHealthBar) {
            bossHealthBarContainer.style.display = 'block';
            bossHealthBar.style.width = `${healthPercentage}%`;
        }
    }
    
    function hideBossHealthBar() {
        if (bossHealthBarContainer) {
            bossHealthBarContainer.style.display = 'none';
        }
    }
    
    function showGameOver(reason = "Reality Overload") {
        if (gameOverOverlay) {
            gameOver = true;
            
            gameOverOverlay.style.display = 'flex';
            document.querySelector('.game-over-title').textContent = reason;
            
            if (finalScoreElement) {
                finalScoreElement.textContent = score;
            }
            
            // Play game over sound
            audioSystem.playSound(audioSystem.bossSynth, "C1", "2n");
            
            document.exitPointerLock?.();
        }
    }
    
    function hideGameOver() {
        if (gameOverOverlay) {
            gameOverOverlay.style.display = 'none';
            gameOver = false;
        }
    }
    
    function setScore(newScore) {
        score = newScore;
        updateScoreDisplay();
    }
    
    function getScore() {
        return score;
    }
    
    function isGameOver() {
        return gameOver;
    }
    
    function updateCrosshair(isVisible) {
        if (crosshairElement) {
            crosshairElement.style.opacity = isVisible ? "1" : "0";
        }
    }
    
    function highlightTarget(target, isHighlighted) {
        // If we want to add visual highlighting for locked targets
        // This is a placeholder for future implementation
        if (target && target.material) {
            if (isHighlighted) {
                // Store original color if needed
                if (!target.userData.originalEmissiveIntensity) {
                    target.userData.originalEmissiveIntensity = target.material.emissiveIntensity || 0.5;
                }
                if (!target.userData.originalColor) {
                    target.userData.originalColor = target.material.color.clone();
                }
                if (!target.userData.originalEmissive) {
                    target.userData.originalEmissive = target.material.emissive.clone();
                }
                
                // Increase emissive intensity for highlighting and add a bright outline effect
                target.material.emissiveIntensity = 2.0;
                // Change emissive color to make it more noticeable (bright green/cyan)
                target.material.emissive.set(0x00ffaa);
                
                // Add a slight color shift to indicate it's locked
                const highlightColor = new THREE.Color(0x88ffff);
                target.material.color.lerp(highlightColor, 0.3);
                
                console.log("Target highlighted for lock: ", target.uuid);
            } else if (target.userData.originalEmissiveIntensity !== undefined) {
                // Restore original properties
                target.material.emissiveIntensity = target.userData.originalEmissiveIntensity;
                
                if (target.userData.originalColor) {
                    target.material.color.copy(target.userData.originalColor);
                }
                
                if (target.userData.originalEmissive) {
                    target.material.emissive.copy(target.userData.originalEmissive);
                }
                
                console.log("Target highlight removed: ", target.uuid);
            }
        }
    }
    
    function resetUI() {
        score = 0;
        gameOver = false;
        updateScoreDisplay();
        hideGameOver();
        hideBossHealthBar();
        updateCrosshair(false);
        
        // Clear any active notifications
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
            notificationTimeout = null;
        }
        if (notificationElement) {
            notificationElement.classList.remove('notification-show');
            notificationElement.style.display = 'none';
        }
    }
    
    // Public API
    return {
        init,
        updateScoreDisplay,
        updateWeaponInfo,
        updateShiftStatus,
        updateTeleportStatus,
        updateBossHealthBar,
        hideBossHealthBar,
        showGameOver,
        hideGameOver,
        setScore,
        getScore,
        isGameOver,
        resetUI,
        updateCrosshair,
        highlightTarget,
        showNotification
    };
})();

// Export the module
export default uiSystem;
