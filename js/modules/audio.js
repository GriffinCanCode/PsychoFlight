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

    // Public methods
    function playSound(synth, note, duration = "8n", time = Tone.now()) { 
        if (!audioReady) return; 
        
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
            return true;
        }).catch(e => {
            console.error("Tone.js start failed:", e);
            return false;
        });
    }
    
    function isAudioReady() {
        return audioReady;
    }
    
    // Public API
    return {
        playSound,
        playNoise,
        updateAudioAnalysis,
        initAudio,
        isAudioReady,
        // Expose synths
        hitSynth,
        explosionSynth,
        flamethrowerSynth,
        spreadSynth,
        beamSynth,
        shiftSynth,
        levelUpSynth,
        gravitySynth,
        bossSynth
    };
})();

// Export the module
export default audioSystem;
