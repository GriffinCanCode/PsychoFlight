// --- Audio System Module ---
const audioSystem = (() => {
    // Private variables
    let audioReady = false;
    let lastPlayTime = 0;
    let initializationAttempted = false;
    const MIN_PLAY_INTERVAL = 0.05; // 50ms minimum time between sounds
    
    // Initialize synths
    let masterVol, analyser, backgroundMusicPlayer;
    let synths = {};

    // Current zone effects
    let currentZoneEffects = {
        reverb: 0.5,
        delay: 0.3,
        filter: 2000,
        modulation: 0.5
    };

    async function initializeSynths() {
        try {
            // Master volume and analysis chain
            masterVol = new Tone.Volume(-15).toDestination(); // Reduced volume
            analyser = new Tone.Analyser('waveform', 1024);
            Tone.Destination.connect(analyser);

            // Effects Chain Nodes
            const explosionFilter = new Tone.Filter(600, "lowpass").connect(masterVol);
            const explosionWidener = new Tone.StereoWidener(0.8).connect(explosionFilter);
            const gravityPhaser = new Tone.Phaser({ frequency: 0.3, octaves: 2, baseFrequency: 400 }).connect(masterVol);
            const gravityDelay = new Tone.PingPongDelay("4n.", 0.25).connect(gravityPhaser);

            // Weapon Effects
            const flamethrowerFilter = new Tone.Filter(2500, "bandpass").connect(masterVol);
            const spreadChorus = new Tone.Chorus(4, 2.5, 0.5).connect(masterVol);
            const beamReverb = new Tone.Reverb(0.5).connect(masterVol);

            // Initialize all synths with error handling
            synths = {
                hitSynth: new Tone.MembraneSynth({
                    pitchDecay: 0.01,
                    octaves: 5,
                    envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
                }).connect(masterVol),

                explosionSynth: new Tone.NoiseSynth({
                    noise: { type: 'brown' },
                    envelope: { attack: 0.02, decay: 0.4, sustain: 0 }
                }).connect(explosionWidener),

                flamethrowerSynth: new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
                }).connect(flamethrowerFilter),

                spreadSynth: new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "pulse", width: 0.3 },
                    detune: -5,
                    envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.05 }
                }).connect(spreadChorus),

                beamSynth: new Tone.FMSynth({
                    harmonicity: 3.0,
                    modulationIndex: 12,
                    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
                    modulationEnvelope: { attack: 0.01, decay: 0.05 }
                }).connect(beamReverb),

                menuSynth: new Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.01, decay: 0.1, sustain: 0.05, release: 0.1 }
                }).connect(masterVol),

                shiftSynth: new Tone.FMSynth({
                    modulationIndex: 10,
                    harmonicity: 3,
                    envelope: { attack: 0.1, decay: 0.3 },
                    modulationEnvelope: { attack: 0.05, decay: 0.2 }
                }).connect(masterVol),

                levelUpSynth: new Tone.Synth({
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.05, decay: 0.5, sustain: 0.1, release: 0.2 }
                }).connect(masterVol),

                gravitySynth: new Tone.AMSynth({
                    harmonicity: 1.8,
                    detune: 0,
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.8, decay: 1.5, sustain: 0.1, release: 2.0 },
                    modulation: { type: "sine" },
                    modulationEnvelope: { attack: 0.4, decay: 1.0, sustain: 0.2, release: 1.5 }
                }).connect(gravityDelay),

                bossSynth: new Tone.MetalSynth({
                    frequency: 80,
                    envelope: { attack: 0.1, decay: 0.5, release: 0.5 },
                    harmonicity: 3.1,
                    modulationIndex: 16,
                    octaves: 1.5
                }).connect(masterVol)
            };

            // Initialize background music player with error handling
            try {
                backgroundMusicPlayer = new Tone.Player({
                    url: "audio/background-music.mp3",
                    loop: true,
                    volume: -12, // Reduced volume
                    fadeIn: 1,
                    fadeOut: 0.5,
                    autostart: false,
                    onload: () => {
                        console.log("Background music loaded successfully");
                    },
                    onerror: (error) => {
                        console.error("Error loading background music:", error);
                    }
                }).connect(masterVol);
            } catch (error) {
                console.error("Failed to initialize background music player:", error);
                // Continue without background music
            }

            return true;
        } catch (error) {
            console.error("Error initializing synths:", error);
            return false;
        }
    }
    
    let smoothedAudioLevel = 0;
    let backgroundMusicActive = false;
    
    async function initAudio() {
        // Prevent multiple initialization attempts
        if (initializationAttempted) {
            console.log("Audio initialization already attempted");
            return audioReady;
        }
        
        initializationAttempted = true;
        
        try {
            // First check if audio context is already running
            if (Tone.context.state === 'running') {
                console.log("Audio context already running");
                if (!audioReady) {
                    // If context is running but synths aren't initialized, initialize them
                    const synthsInitialized = await initializeSynths();
                    audioReady = synthsInitialized;
                }
                return audioReady;
            }

            console.log("Starting Tone.js...");
            await Tone.start();
            console.log("Tone.js started successfully");

            // Initialize all synths
            const synthsInitialized = await initializeSynths();
            if (!synthsInitialized) {
                throw new Error("Failed to initialize synths");
            }

            // Set audio context state
            audioReady = true;
            console.log("Audio system fully initialized");
            return true;
        } catch (error) {
            console.error("Failed to initialize audio:", error);
            audioReady = false;
            return false;
        }
    }
    
    function startBackgroundMusic() {
        if (!audioReady || !backgroundMusicPlayer) {
            console.warn("Cannot start background music: System not ready");
            return;
        }
        
        if (backgroundMusicActive) {
            console.log("Background music already playing");
            return;
        }
        
        try {
            if (backgroundMusicPlayer.loaded) {
                console.log("Starting background music...");
                backgroundMusicPlayer.stop(); // Ensure clean start
                backgroundMusicPlayer.start();
                backgroundMusicActive = true;
                console.log("Background music started successfully");
            } else {
                console.log("Background music not loaded yet, waiting...");
                backgroundMusicPlayer.load().then(() => {
                    backgroundMusicPlayer.start();
                    backgroundMusicActive = true;
                    console.log("Background music started after loading");
                }).catch(error => {
                    console.error("Failed to load background music:", error);
                });
            }
        } catch (error) {
            console.error("Failed to start background music:", error);
            // Try to recover
            setTimeout(() => {
                try {
                    if (backgroundMusicPlayer && backgroundMusicPlayer.loaded) {
                        backgroundMusicPlayer.start();
                        backgroundMusicActive = true;
                    }
                } catch (e) {
                    console.error("Background music recovery failed:", e);
                }
            }, 1000);
        }
    }
    
    function stopBackgroundMusic() {
        if (!audioReady || !backgroundMusicPlayer) return;
        
        try {
            backgroundMusicPlayer.stop();
            backgroundMusicActive = false;
        } catch (error) {
            console.error("Error stopping background music:", error);
        }
    }

    function playSound(synth, note, duration = "8n", time = Tone.now()) {
        if (!audioReady || !synth) return;
        
        try {
            // Add slight delay between sounds to prevent audio glitches
            const now = Tone.now();
            if (now - lastPlayTime < MIN_PLAY_INTERVAL) {
                time = now + MIN_PLAY_INTERVAL;
            }
            lastPlayTime = time;
            
            synth.triggerAttackRelease(note, duration, time);
        } catch (error) {
            console.warn("Error playing sound:", error);
        }
    }
    
    function playNoise(synth, duration = "8n", time = Tone.now()) {
        if (!audioReady || !synth) return;
        
        try {
            // Add slight delay between sounds to prevent audio glitches
            const now = Tone.now();
            if (now - lastPlayTime < MIN_PLAY_INTERVAL) {
                time = now + MIN_PLAY_INTERVAL;
            }
            lastPlayTime = time;
            
            synth.triggerAttackRelease(duration, time);
        } catch (error) {
            console.warn("Error playing noise:", error);
        }
    }
    
    function updateAudioAnalysis() {
        if (!audioReady || !analyser) return smoothedAudioLevel;
        
        try {
            const values = analyser.getValue();
            let rms = 0;
            for (let i = 0; i < values.length; i++) {
                rms += values[i] * values[i];
            }
            rms = Math.sqrt(rms / values.length);
            smoothedAudioLevel = THREE.MathUtils.lerp(smoothedAudioLevel, rms * 5, 0.1);
            return Math.min(1.0, smoothedAudioLevel);
        } catch (error) {
            console.warn("Error in audio analysis:", error);
            return smoothedAudioLevel;
        }
    }

    function updateZoneEffects(zoneEffects) {
        if (!audioReady || !zoneEffects) return;

        try {
            // Smoothly interpolate between current and target effects
            const lerpFactor = 0.1; // Adjust for smoother/faster transitions

            currentZoneEffects.reverb = THREE.MathUtils.lerp(
                currentZoneEffects.reverb,
                zoneEffects.reverb || 0.5,
                lerpFactor
            );

            currentZoneEffects.delay = THREE.MathUtils.lerp(
                currentZoneEffects.delay,
                zoneEffects.delay || 0.3,
                lerpFactor
            );

            currentZoneEffects.filter = THREE.MathUtils.lerp(
                currentZoneEffects.filter,
                zoneEffects.filter || 2000,
                lerpFactor
            );

            currentZoneEffects.modulation = THREE.MathUtils.lerp(
                currentZoneEffects.modulation,
                zoneEffects.modulation || 0.5,
                lerpFactor
            );

            // Apply effects to synths that should be affected by the zone
            Object.values(synths).forEach(synth => {
                if (synth.envelope) {
                    synth.envelope.attack = Math.max(0.001, currentZoneEffects.reverb * 0.1);
                    synth.envelope.release = Math.max(0.001, currentZoneEffects.reverb * 0.2);
                }
            });

            // Update background music effects if playing
            if (backgroundMusicPlayer && backgroundMusicPlayer.state === "started") {
                // Adjust background music parameters based on zone effects
                backgroundMusicPlayer.volume.value = -12 + (currentZoneEffects.modulation * 2);
            }

        } catch (error) {
            console.warn("Error updating zone effects:", error);
        }
    }

    // Public API
    return {
        initAudio,
        playSound,
        playNoise,
        updateAudioAnalysis,
        startBackgroundMusic,
        stopBackgroundMusic,
        updateZoneEffects,
        isAudioReady: () => audioReady,
        ...synths // Spread synths into public API
    };
})();

export default audioSystem;
