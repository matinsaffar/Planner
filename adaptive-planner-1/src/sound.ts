// Cozy, satisfying Nintendo-Switch-inspired sound design: bright marimba-like
// "bloops", crisp pitched clicks with tiny pitch-bends, playful little
// arpeggios for success states, and soft low "thuds" for cancel/negative
// actions. All synthesized in real time via the Web Audio API — no audio
// files needed, so it stays lightweight and instant.

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  localStorage.setItem("planner_muted", m ? "1" : "0");
}
export function isMuted(): boolean {
  return localStorage.getItem("planner_muted") === "1";
}
muted = isMuted();

// A bright, marimba-like "bloop" — quick pitch bend up then a fast decay,
// this is the core building block for most of the cozy UI feedback sounds.
function bloop(freq: number, duration: number, peak: number, delay = 0, bend = 1.15, filterFreq = 5200) {
  if (muted) return;
  try {
    const c = getCtx();
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = filterFreq; filter.Q.value = 0.6;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq * bend, t0);
    osc.frequency.exponentialRampToValueAtTime(freq, t0 + duration * 0.35);
    osc.connect(filter); filter.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.start(t0); osc.stop(t0 + duration + 0.05);
  } catch (e) {}
}

// A crisp, tactile little "tick" — used for lightweight UI feedback like
// step navigation or dragging, similar to Switch menu-cursor clicks.
function tick(delay = 0, peak = 0.035, freq = 1500) {
  if (muted) return;
  try {
    const c = getCtx();
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.value = freq; filter.Q.value = 3.2;
    osc.type = "square"; osc.frequency.value = freq;
    osc.connect(filter); filter.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(peak, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    osc.start(t0); osc.stop(t0 + 0.06);
  } catch (e) {}
}

// A soft low "thud" for negative/cancel actions — rounded, not harsh.
function thud(delay = 0, peak = 0.05) {
  if (muted) return;
  try {
    const c = getCtx();
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 900; filter.Q.value = 0.5;
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.18);
    osc.connect(filter); filter.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
    osc.start(t0); osc.stop(t0 + 0.28);
  } catch (e) {}
}

// A playful ascending arpeggio of bloops — the "reward" sound for finishing
// tasks, saving, or achieving goals. Evokes the little jingles from
// item-collection or menu-confirm moments in cozy Switch games.
function arpeggio(freqs: number[], noteDuration: number, peak = 0.05, spread = 0.07, bend = 1.2) {
  freqs.forEach((f, i) => bloop(f, noteDuration, peak * (1 - i * 0.08), i * spread, bend));
}

export const sound = {
  // Focus session starts — warm rising two-note bloop, inviting.
  start: () => arpeggio([392, 523.25], 0.32, 0.055, 0.09, 1.1),
  // Pausing — single soft descending bloop.
  pause: () => bloop(330, 0.22, 0.04, 0, 0.9, 3200),
  // Task finished — bright three-note ascending jingle, satisfying "success" feel.
  finish: () => arpeggio([523.25, 659.25, 987.77], 0.28, 0.06, 0.075, 1.15),
  // Picking up a card to drag — tiny crisp tick.
  drag: () => tick(0, 0.03, 1700),
  // Dropping successfully — a satisfying little double-bloop "snap into place".
  drop: () => { bloop(660, 0.16, 0.05, 0, 1.25, 5000); bloop(880, 0.16, 0.035, 0.06, 1.1, 5500); },
  // Approaching deadline — gentle two-tone chime, not alarming.
  deadline: () => arpeggio([440, 349.23], 0.3, 0.04, 0.09, 1.05),
  // Saving something — warm confirming two-note bloop.
  save: () => arpeggio([587.33, 880], 0.24, 0.05, 0.065, 1.15),
  // Taking a break — soft low bloop, relaxed.
  break: () => bloop(349.23, 0.3, 0.032, 0, 0.95, 2800),
  // Navigating tabs — light, quick tick.
  navigate: () => tick(0, 0.022, 1400),
  // Wizard step forward — slightly higher tick than navigate for variety.
  step: () => tick(0, 0.02, 1650),
  // Cancel/negative action — soft rounded thud, not jarring.
  cancel: () => thud(0, 0.045),
  // Achieving a goal — the biggest reward jingle, a cheerful four-note run.
  achieve: () => arpeggio([523.25, 659.25, 783.99, 1046.5], 0.26, 0.065, 0.08, 1.2),
};
