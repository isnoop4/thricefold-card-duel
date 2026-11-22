// One job: every sound of the table, made with WebAudio oscillators at play time. No sound file is
// shipped: the card ticks, the landing snap, the fold verdicts, the win fanfare, the loss toll and
// the quiet five-note table music are all synthesised here.

const MUSIC_SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
const MUSIC_STEP_SECONDS = 0.62;

/** Returns the sound board. It stays silent until `unlock()` is called from a click or a key press. */
export function createSoundEffects() {
  let context = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function unlock() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
  }

  /** One enveloped tone: `wave` at `frequency`, starting `delay` seconds from now. */
  function playTone(frequency, duration, wave, loudness, delay = 0, glideTo = null) {
    if (context === null || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (glideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(loudness, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function playDealTick() {
    playTone(880, 0.05, 'triangle', 0.16, 0, 520);
  }

  function playCardSnap() {
    playTone(190, 0.09, 'square', 0.13, 0, 90);
    playTone(1250, 0.04, 'triangle', 0.07);
  }

  function playCardPick() {
    playTone(660, 0.06, 'sine', 0.12, 0, 820);
  }

  function playFoldWon(withCombo) {
    [523.25, 659.25, 783.99].forEach((note, index) => playTone(note, 0.22, 'triangle', 0.2, index * 0.09));
    if (withCombo) playTone(1046.5, 0.4, 'sine', 0.18, 0.3);
  }

  function playFoldLost() {
    playTone(233.08, 0.3, 'sawtooth', 0.12, 0, 174.61);
    playTone(155.56, 0.42, 'sine', 0.2, 0.1, 110);
  }

  function playFoldLevel() {
    playTone(392, 0.2, 'sine', 0.14);
  }

  function playVictoryFanfare() {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((note, index) => {
      playTone(note, 0.34, 'triangle', 0.22, index * 0.13);
      playTone(note / 2, 0.34, 'sine', 0.12, index * 0.13);
    });
    playTone(1567.98, 0.9, 'sine', 0.16, 0.82);
  }

  function playDefeatToll() {
    [329.63, 293.66, 246.94, 196].forEach((note, index) => playTone(note, 0.5, 'sine', 0.2, index * 0.3));
  }

  /** The table music: a slow walk over a five-note scale, a different turn each bar. */
  function playMusicStep() {
    const walk = [0, 2, 4, 3, 1, 4, 5, 2, 0, 3, 6, 4, 2, 5, 3, 1];
    const note = MUSIC_SCALE[walk[musicStep % walk.length]];
    playTone(note, 1.1, 'sine', 0.05);
    if (musicStep % 4 === 0) playTone(note / 2, 1.8, 'triangle', 0.045);
    musicStep += 1;
  }

  function startTableMusic() {
    if (musicTimer === null) musicTimer = window.setInterval(playMusicStep, MUSIC_STEP_SECONDS * 1000);
  }

  function toggleMuted() {
    muted = !muted;
    if (master !== null) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  return {
    unlock,
    startTableMusic,
    toggleMuted,
    isMuted: () => muted,
    playDealTick,
    playCardSnap,
    playCardPick,
    playFoldWon,
    playFoldLost,
    playFoldLevel,
    playVictoryFanfare,
    playDefeatToll,
  };
}
