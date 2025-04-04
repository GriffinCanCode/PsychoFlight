// --- Audio System Module ---
const audioSystem = (() => {
    // Private variables
    let audioReady = false;
    let lastPlayTime = 0;
    const MIN_PLAY_INTERVAL = 0.05; // 50ms minimum time between sounds
    
    // Initialize synths
    const masterVol = new Tone.Volume(-12).toDestination();
    const analyser = new Tone.Analyser('waveform', 1024);
    try { // Defensively connect analyser
        Tone.Destination.connect(analyser);
    } catch (e) { console.error("Failed to connect analyser:", e); }
    
    // Effects Chain Nodes
    const explosionFilter = new Tone.Filter(600, "lowpass").connect(masterVol);
    const explosionWidener = new Tone.StereoWidener(0.8).connect(explosionFilter);
    const gravityPhaser = new Tone.Phaser({ frequency: 0.3, octaves: 2, baseFrequency: 400 }).connect(masterVol);
    const gravityDelay = new Tone.PingPongDelay("4n.", 0.25).connect(gravityPhaser);

    // Weapon Effects
    const flamethrowerFilter = new Tone.Filter(2500, "bandpass").connect(masterVol);
    const spreadChorus = new Tone.Chorus(4, 2.5, 0.5).connect(masterVol);
    const beamReverb = new Tone.Reverb(0.5).connect(masterVol);

    // Dimension Shift Audio
    let dimensionShiftPlayer;
    try {
        dimensionShiftPlayer = new Tone.Player({
            url: "audio/dimension-shift.mp3",
            loop: true,
            volume: -8,
            fadeIn: 0.5,
            fadeOut: 0.5,
            autostart: false,
            onload: () => console.log("Dimension shift audio loaded successfully"),
            onerror: (e) => console.error("Failed to load dimension shift audio:", e)
        }).connect(masterVol);
        console.log("Dimension shift player initialized");
    } catch (e) {
        console.error("Error initializing dimension shift player:", e);
    }

    const hitSynth = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 5, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).connect(masterVol);
    // --- Improved Explosion Synth (Smoother) ---
    const explosionSynth = new Tone.NoiseSynth({
        noise: { type: 'brown' }, // Deeper noise
        envelope: { attack: 0.02, decay: 0.4, sustain: 0 } // Smoother envelope
    }).connect(explosionWidener); // Connect to effects chain
    // Apply filter envelope manually if needed or use FilteredNoiseSynth (more complex setup)
    // For now, the static filter provides basic shaping.

    // --- NEW Weapon Synths ---
    const flamethrowerSynth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
    }).connect(flamethrowerFilter);

    const spreadSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "pulse", width: 0.3 },
        detune: -5,
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.05 }
    }).connect(spreadChorus);

    const beamSynth = new Tone.FMSynth({
        harmonicity: 3.0,
        modulationIndex: 12,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }, // Short decay
        modulationEnvelope: { attack: 0.01, decay: 0.05 }
    }).connect(beamReverb);
    
    // Menu UI synth
    const menuSynth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.05, release: 0.1 }
    }).connect(masterVol);
    // --- END NEW Weapon Synths ---

    const shiftSynth = new Tone.FMSynth({ modulationIndex: 10, harmonicity: 3, envelope: { attack: 0.1, decay: 0.3 }, modulationEnvelope: { attack: 0.05, decay: 0.2 } }).connect(masterVol);
    const levelUpSynth = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.05, decay: 0.5, sustain: 0.1, release: 0.2 } }).connect(masterVol);
    // --- Improved Gravity Synth (Smoother/Subtler) ---
    const gravitySynth = new Tone.AMSynth({
        harmonicity: 1.8, // Less dissonant
        detune: 0,
        oscillator: { type: "sine" },
        envelope: { attack: 0.8, decay: 1.5, sustain: 0.1, release: 2.0 }, // Gentler envelope
        modulation: { type: "sine" }, // Smoother modulation
        modulationEnvelope: { attack: 0.4, decay: 1.0, sustain: 0.2, release: 1.5 } // Adjusted mod envelope
    }).connect(gravityDelay); // Connect to effects chain

    const bossSynth = new Tone.MetalSynth({ frequency: 80, envelope: { attack: 0.1, decay: 0.5, release: 0.5 }, harmonicity: 3.1, modulationIndex: 16, octaves: 1.5 }).connect(masterVol);
    
    let smoothedAudioLevel = 0;
    let dimensionShiftActive = false;

    // Background Music
    let backgroundMusicPlayer;
    try {
        backgroundMusicPlayer = new Tone.Player({
            url: "audio/background-music.mp3",
            loop: true,
            volume: -8,
            fadeIn: 0.5,
            fadeOut: 0.5,
            autostart: false,
            onload: () => console.log("Background music loaded successfully"),
            onerror: (e) => console.error("Failed to load background music:", e)
        }).connect(masterVol);
        console.log("Background music player initialized");
    } catch (e) {
        console.error("Error initializing background music player:", e);
    }

    // Background music control
    let backgroundMusicActive = false;
    
    function startBackgroundMusic() {
        if (!audioReady) {
            console.warn("Cannot start background music: Audio not ready");
            return;
        }
        
        if (backgroundMusicActive) {
            console.log("Background music already playing");
            return;
        }
        
        if (!backgroundMusicPlayer) {
            console.error("Cannot start background music: Player not initialized");
            return;
        }
        
        try {
            console.log("Starting background music...");
            backgroundMusicPlayer.stop(); // Stop first to prevent any bugs with restarting
            backgroundMusicPlayer.start();
            backgroundMusicActive = true;
            console.log("Background music started successfully");
        } catch (e) {
            console.error("Failed to start background music:", e);
        }
    }
    
    function stopBackgroundMusic() {
        if (!audioReady) {
            console.warn("Cannot stop background music: Audio not ready");
            return;
        }
        
        if (!backgroundMusicActive) {
            // Already stopped
            return;
        }
        
        if (!backgroundMusicPlayer) {
            console.error("Cannot stop background music: Player not initialized");
            return;
        }
        
        try {
            console.log("Stopping background music...");
            backgroundMusicPlayer.stop();
            backgroundMusicActive = false;
            console.log("Background music stopped successfully");
        } catch (e) {
            console.error("Failed to stop background music:", e);
            // Force reset state even if there was an error
            backgroundMusicActive = false;
        }
    }

    // Public methods
    function playSound(synth, note, duration = "8n", time = Tone.now()) { 
        if (!audioReady) return;
        
        // Check if synth is valid
        if (!synth || typeof synth.triggerAttackRelease !== 'function') {
            console.warn("Invalid synth passed to playSound");
            return;
        }
        
        try {
            // Check if we need to add a time offset to prevent errors
            const now = Tone.now();
            if (now - lastPlayTime < MIN_PLAY_INTERVAL) {
                time = now + MIN_PLAY_INTERVAL;
            }
            lastPlayTime = time;
            
            synth.triggerAttackRelease(note, duration, time); 
        } catch (e) { 
            console.warn("Tone.js error:", e); 
        } 
    }
    
    function playNoise(synth, duration = "8n", time = Tone.now()) { 
        if (!audioReady) return;
        
        // Check if synth is valid
        if (!synth || typeof synth.triggerAttackRelease !== 'function') {
            console.warn("Invalid synth passed to playNoise");
            return;
        }
        
        try {
            // Check if we need to add a time offset to prevent errors
            const now = Tone.now();
            if (now - lastPlayTime < MIN_PLAY_INTERVAL) {
                time = now + MIN_PLAY_INTERVAL;
            }
            lastPlayTime = time;
            
            synth.triggerAttackRelease(duration, time); 
        } catch (e) { 
            console.warn("Tone.js error:", e); 
        } 
    }
    
    function updateAudioAnalysis() { 
        if (!audioReady || !analyser) return 0; 
        try { 
            const vA = analyser.getValue(); 
            let rms = 0; 
            for (let i = 0; i < vA.length; i++) { 
                rms += vA[i] * vA[i]; 
            } 
            rms = Math.sqrt(rms / vA.length); 
            smoothedAudioLevel = THREE.MathUtils.lerp(smoothedAudioLevel, rms * 5, 0.1); 
            return Math.min(1.0, smoothedAudioLevel); 
        } catch(e) { 
            console.warn("Audio analysis error:", e); 
            return smoothedAudioLevel; /* Return last value on error */ 
        } 
    }
    
    function initAudio() {
        return Tone.start().then(() => {
            audioReady = true;
            console.log("Audio Context Ready");
            
            // Preload background music and start playing it
            return preloadBackgroundMusic().then(() => {
                console.log("Audio initialization complete");
                // Start background music automatically after load
                startBackgroundMusic();
                return true;
            });
        }).catch(e => {
            console.error("Tone.js start failed:", e);
            return false;
        });
    }
    
    function isAudioReady() {
        return audioReady;
    }
    
    function startDimensionShift() {
        if (!audioReady) {
            console.warn("Cannot start dimension shift audio: Audio not ready");
            return;
        }
        
        if (dimensionShiftActive) {
            console.log("Dimension shift audio already playing");
            return;
        }
        
        if (!dimensionShiftPlayer) {
            console.error("Cannot start dimension shift audio: Player not initialized");
            return;
        }
        
        try {
            console.log("Starting dimension shift audio...");
            dimensionShiftPlayer.stop(); // Stop first to prevent any bugs with restarting
            dimensionShiftPlayer.start();
            dimensionShiftActive = true;
            console.log("Dimension shift audio started successfully");
        } catch (e) {
            console.error("Failed to start dimension shift audio:", e);
        }
    }
    
    function stopDimensionShift() {
        if (!audioReady) {
            console.warn("Cannot stop dimension shift audio: Audio not ready");
            return;
        }
        
        if (!dimensionShiftActive) {
            // Already stopped
            return;
        }
        
        if (!dimensionShiftPlayer) {
            console.error("Cannot stop dimension shift audio: Player not initialized");
            return;
        }
        
        try {
            console.log("Stopping dimension shift audio...");
            dimensionShiftPlayer.stop();
            dimensionShiftActive = false;
            console.log("Dimension shift audio stopped successfully");
        } catch (e) {
            console.error("Failed to stop dimension shift audio:", e);
            // Force reset state even if there was an error
            dimensionShiftActive = false;
        }
    }
    
    // Explicitly preload dimension shift audio
    function preloadDimensionShiftAudio() {
        if (!dimensionShiftPlayer) {
            console.error("Cannot preload: Dimension shift player not initialized");
            return Promise.resolve(false);
        }
        
        return new Promise((resolve) => {
            console.log("Preloading dimension shift audio...");
            // Force load the audio file
            dimensionShiftPlayer.load("audio/dimension-shift.mp3").then(() => {
                console.log("Preloaded dimension shift audio successfully");
                resolve(true);
            }).catch(e => {
                console.error("Error preloading dimension shift audio:", e);
                // Try alternative loading method
                try {
                    const audioElement = new Audio("audio/dimension-shift.mp3");
                    audioElement.addEventListener('canplaythrough', () => {
                        console.log("Dimension shift audio preloaded via Audio element");
                        resolve(true);
                    });
                    audioElement.addEventListener('error', (e) => {
                        console.error("Alternative preload also failed:", e);
                        resolve(false);
                    });
                    audioElement.load();
                } catch (err) {
                    console.error("All preload attempts failed:", err);
                    resolve(false);
                }
            });
        });
    }
    
    // Explicitly preload background music
    function preloadBackgroundMusic() {
        if (!backgroundMusicPlayer) {
            console.error("Cannot preload: Background music player not initialized");
            return Promise.resolve(false);
        }
        
        return new Promise((resolve) => {
            console.log("Preloading background music...");
            // Force load the audio file
            backgroundMusicPlayer.load("audio/background-music.mp3").then(() => {
                console.log("Preloaded background music successfully");
                resolve(true);
            }).catch(e => {
                console.error("Error preloading background music:", e);
                // Try alternative loading method
                try {
                    const audioElement = new Audio("audio/background-music.mp3");
                    audioElement.addEventListener('canplaythrough', () => {
                        console.log("Background music preloaded via Audio element");
                        resolve(true);
                    });
                    audioElement.addEventListener('error', (e) => {
                        console.error("Alternative preload also failed:", e);
                        resolve(false);
                    });
                    audioElement.load();
                } catch (err) {
                    console.error("All preload attempts failed:", err);
                    resolve(false);
                }
            });
        });
    }
    
    // Public API
    return {
        playSound,
        playNoise,
        updateAudioAnalysis,
        initAudio,
        isAudioReady,
        startDimensionShift,
        stopDimensionShift,
        preloadDimensionShiftAudio,
        preloadBackgroundMusic,
        // Expose synths
        hitSynth,
        explosionSynth,
        flamethrowerSynth,
        spreadSynth,
        beamSynth,
        shiftSynth,
        levelUpSynth,
        gravitySynth,
        bossSynth,
        menuSynth,
        startBackgroundMusic,
        stopBackgroundMusic
    };
})();

// Export the module
export default audioSystem;
