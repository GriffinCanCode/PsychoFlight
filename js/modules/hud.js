// --- HUD Module ---
import audioSystem from './audio.js';

const hudSystem = (() => {
    // Private variables
    let score = 0;
    let gameOver = false;
    
    // DOM elements - will be initialized in init()
    let scoreDisplayElement;
    let finalScoreElement;
    let weaponInfoElement;
    let shiftStatusElement;
    let teleportStatusElement;
    let bossHealthBarContainer;
    let bossHealthBar;
    let gameOverOverlay;
    let crosshairElement;
    let notificationElement;
    let targetLockIndicator;
    let targetInfoDisplay;
    let targetTypeDisplay;
    let targetDistanceDisplay;
    let weaponEnergyContainer;
    let weaponEnergyBar;
    let weaponEnergyLabel;
    
    // Notification timer
    let notificationTimeout = null;
    
    // Public methods
    function init() {
        // Get DOM elements
        scoreDisplayElement = document.getElementById('scoreDisplay');
        finalScoreElement = document.getElementById('finalScore');
        weaponInfoElement = document.getElementById('weaponInfo');
        shiftStatusElement = document.getElementById('shiftStatus');
        teleportStatusElement = document.getElementById('teleportStatus');
        bossHealthBarContainer = document.getElementById('bossHealthBarContainer');
        bossHealthBar = document.getElementById('bossHealthBar');
        crosshairElement = document.getElementById('crosshair');
        targetLockIndicator = document.getElementById('targetLockIndicator');
        targetInfoDisplay = document.getElementById('targetInfoDisplay');
        targetTypeDisplay = document.getElementById('targetType');
        targetDistanceDisplay = document.getElementById('targetDistance');
        weaponEnergyContainer = document.getElementById('weaponEnergyContainer');
        weaponEnergyBar = document.getElementById('weaponEnergyBar');
        weaponEnergyLabel = document.getElementById('weaponEnergyLabel');
        
        // Create game over overlay
        createGameOverOverlay();
        
        // Create help button and modal
        createHelpElements();
        
        // Create notification element
        createNotificationElement();
        
        // Initialize displays
        updateScoreDisplay();
        updateWeaponInfo('Flamethrower'); // Default weapon
        
        return {
            scoreDisplayElement,
            finalScoreElement,
            weaponInfoElement,
            shiftStatusElement,
            teleportStatusElement,
            bossHealthBarContainer,
            bossHealthBar,
            gameOverOverlay,
            crosshairElement,
            notificationElement,
            targetLockIndicator,
            targetInfoDisplay,
            weaponEnergyContainer,
            weaponEnergyBar
        };
    }
    
    function createGameOverOverlay() {
        // Create game over overlay
        gameOverOverlay = document.createElement('div');
        gameOverOverlay.className = 'game-over-overlay';
        gameOverOverlay.style.display = 'none';
        
        const content = document.createElement('div');
        content.className = 'game-over-content';
        
        const title = document.createElement('h2');
        title.className = 'game-over-title';
        title.textContent = 'TRANSCENDENCE?';
        
        const scoreText = document.createElement('p');
        scoreText.className = 'game-over-score';
        scoreText.innerHTML = 'Final Score: <span id="finalScore">0</span>';
        
        const button = document.createElement('button');
        button.className = 'play-again-button';
        button.textContent = 'RE-CALIBRATE';
        
        // Add event listener to button
        button.addEventListener('click', () => {
            if (typeof window.restartGame === 'function') {
                window.restartGame();
            }
        });
        
        content.appendChild(title);
        content.appendChild(scoreText);
        content.appendChild(button);
        gameOverOverlay.appendChild(content);
        document.body.appendChild(gameOverOverlay);
        
        // Update finalScoreElement reference
        finalScoreElement = document.getElementById('finalScore');
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
            ['Shift', 'Boost acceleration with light streaks'],
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
                pointer-events: auto;
            }

            .help-button:hover {
                background: rgba(0, 40, 80, 0.8);
                box-shadow: 0 0 25px rgba(0, 255, 255, 0.8);
                transform: scale(1.1);
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
                pointer-events: auto;
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
                animation: modalGlow 3s infinite alternate;
            }
            
            @keyframes modalGlow {
                0% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.5); }
                100% { box-shadow: 0 0 50px rgba(0, 255, 255, 0.8); }
            }

            .help-modal-close {
                position: absolute;
                top: 10px;
                right: 15px;
                font-size: 24px;
                cursor: pointer;
                color: #60FFFF;
                transition: all 0.3s ease;
            }
            
            .help-modal-close:hover {
                color: #ffffff;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            }

            .help-modal h2 {
                color: #60FFFF;
                text-align: center;
                margin-bottom: 20px;
                font-size: 1.2em;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
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
                box-shadow: 0 0 10px rgba(0, 255, 255, 0.3) inset;
            }

            .help-modal .description {
                color: #FFFFFF;
            }
        `;
        document.head.appendChild(style);

        // Add event listeners
        helpButton.addEventListener('click', () => {
            helpModal.style.display = 'flex';
            // Exit pointer lock when help is opened
            document.exitPointerLock?.();
        });

        closeButton.addEventListener('click', () => {
            helpModal.style.display = 'none';
            // Request pointer lock when help is closed
            const canvas = document.getElementById('gameCanvas');
            canvas?.requestPointerLock?.();
        });

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.display = 'none';
                // Request pointer lock when help is closed
                const canvas = document.getElementById('gameCanvas');
                canvas?.requestPointerLock?.();
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
                backdrop-filter: blur(2px);
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
        if (!shiftStatusElement) return;
        
        if (status.active) {
            shiftStatusElement.textContent = `SHIFT: ${status.timeLeft.toFixed(1)}s`;
            shiftStatusElement.style.color = '#00ff00';
            shiftStatusElement.style.textShadow = '0 0 10px rgba(0, 255, 0, 0.7)';
            shiftStatusElement.style.borderLeft = '2px solid #00ff00';
            shiftStatusElement.style.paddingLeft = '8px';
        } else if (status.cooldown > 0) {
            shiftStatusElement.textContent = `SHIFT: ${status.cooldown.toFixed(1)}s`;
            shiftStatusElement.style.color = '#ff3333';
            shiftStatusElement.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
            shiftStatusElement.style.borderLeft = '2px solid #ff3333';
            shiftStatusElement.style.paddingLeft = '8px';
        } else {
            shiftStatusElement.textContent = 'SHIFT: READY';
            shiftStatusElement.style.color = '#ffffff';
            shiftStatusElement.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.7)';
            shiftStatusElement.style.borderLeft = '2px solid #ffffff';
            shiftStatusElement.style.paddingLeft = '8px';
        }
    }
    
    function updateTeleportStatus(status) {
        if (!teleportStatusElement) return;
        
        if (status.cooldown > 0) {
            teleportStatusElement.textContent = `TELEPORT: ${status.cooldown.toFixed(1)}s`;
            teleportStatusElement.style.color = '#ff3333';
            teleportStatusElement.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
            teleportStatusElement.style.borderLeft = '2px solid #ff3333';
            teleportStatusElement.style.paddingLeft = '8px';
        } else {
            teleportStatusElement.textContent = 'TELEPORT: READY';
            teleportStatusElement.style.color = '#ffffff';
            teleportStatusElement.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.7)';
            teleportStatusElement.style.borderLeft = '2px solid #ffffff';
            teleportStatusElement.style.paddingLeft = '8px';
        }
    }
    
    function updateBossHealthBar(healthPercentage) {
        if (bossHealthBarContainer && bossHealthBar) {
            bossHealthBarContainer.style.display = 'block';
            bossHealthBar.style.width = `${healthPercentage}%`;
            
            // Update boss bar color based on health percentage
            if (healthPercentage < 25) {
                bossHealthBar.style.background = 'linear-gradient(90deg, #ff0000, #ff3300)';
            } else if (healthPercentage < 50) {
                bossHealthBar.style.background = 'linear-gradient(90deg, #ff3300, #ff6600)';
            } else if (healthPercentage < 75) {
                bossHealthBar.style.background = 'linear-gradient(90deg, #ff6600, #ff9900)';
            } else {
                bossHealthBar.style.background = 'linear-gradient(90deg, #ff0088, #ff00ff)';
            }
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
        if (newScore > score) {
            // Score increased animation
            if (scoreDisplayElement) {
                scoreDisplayElement.style.transform = 'scale(1.2)';
                scoreDisplayElement.style.transition = 'transform 0.1s ease';
                
                setTimeout(() => {
                    if (scoreDisplayElement) {
                        scoreDisplayElement.style.transform = 'scale(1)';
                    }
                }, 100);
            }
        }
        
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
    
    function updateTargetInfo(target, isVisible, playerPosition) {
        if (!targetInfoDisplay || !targetTypeDisplay || !targetDistanceDisplay) return;
        
        if (isVisible && target) {
            // Show the info display
            targetInfoDisplay.style.opacity = "1";
            
            // Determine target type
            let targetType = "TARGET ACQUIRED";
            if (target.userData && target.userData.type) {
                if (target.userData.type === 'boss') {
                    targetType = "BOSS TARGET";
                } else if (target.userData.type.includes('enemy')) {
                    targetType = "HOSTILE TARGET";
                }
            }
            
            // Update display text
            targetTypeDisplay.textContent = targetType;
            
            // Calculate distance if player position is provided
            if (playerPosition) {
                const distance = Math.round(target.position.distanceTo(playerPosition));
                targetDistanceDisplay.textContent = `DISTANCE: ${distance}M`;
            } else {
                targetDistanceDisplay.textContent = "";
            }
        } else {
            // Hide the info display
            targetInfoDisplay.style.opacity = "0";
        }
    }
    
    function highlightTarget(target, isHighlighted, playerPosition) {
        // Update target lock indicator
        if (targetLockIndicator) {
            targetLockIndicator.style.opacity = isHighlighted ? "1" : "0";
        }
        
        // Update target info display
        updateTargetInfo(target, isHighlighted, playerPosition);
        
        // If we want to add visual highlighting for locked targets
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
    
    function updateWarpEffect(intensity = 0) {
        // Update warp overlay effect
        const warpOverlay = document.getElementById('warpOverlay');
        if (warpOverlay) {
            warpOverlay.style.opacity = intensity.toString();
        }
        
        // Update scanlines effect
        const scanlines = document.getElementById('scanlines');
        if (scanlines) {
            scanlines.style.opacity = (intensity * 0.8).toString();
        }
    }
    
    function resetHUD() {
        score = 0;
        gameOver = false;
        updateScoreDisplay();
        hideGameOver();
        hideBossHealthBar();
        updateCrosshair(false);
        updateWarpEffect(0);
        
        // Reset target lock indicator and info
        if (targetLockIndicator) {
            targetLockIndicator.style.opacity = "0";
        }
        if (targetInfoDisplay) {
            targetInfoDisplay.style.opacity = "0";
        }
        
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
    
    // Add a function to update the weapon energy display
    function updateWeaponEnergy(percentage, weaponName) {
        if (!weaponEnergyBar || !weaponEnergyLabel) return;
        
        // Update energy bar width
        weaponEnergyBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        
        // Update label color based on energy level
        if (percentage < 25) {
            weaponEnergyLabel.style.color = '#ff3333';
            weaponEnergyBar.style.background = 'linear-gradient(90deg, #ff3333, #ff6600)';
        } else if (percentage < 50) {
            weaponEnergyLabel.style.color = '#ffff00';
            weaponEnergyBar.style.background = 'linear-gradient(90deg, #ff6600, #ffff00)';
        } else {
            weaponEnergyLabel.style.color = '#ffffff';
            weaponEnergyBar.style.background = 'linear-gradient(90deg, #00ccff, #00ffcc)';
        }
        
        // Update the label text based on weapon
        if (weaponName) {
            weaponEnergyLabel.textContent = `${weaponName.toUpperCase()} ENERGY`;
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
        resetHUD,
        updateCrosshair,
        highlightTarget,
        updateTargetInfo,
        updateWeaponEnergy,
        showNotification,
        updateWarpEffect
    };
})();

// Export the module
export default hudSystem; 