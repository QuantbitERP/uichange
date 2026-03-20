import EditorJS from "@editorjs/editorjs";
import Undo from "editorjs-undo";

/* ═══════════════════════════════════════════════════════════════════════
   SOUND ENGINE  — Web Audio API, zero dependencies, zero network requests
   All sounds synthesised in real-time. Toggle with WSSounds.toggle().
═══════════════════════════════════════════════════════════════════════ */
const WSSounds = (() => {
	let _ctx  = null;
	let _muted = false;

	/* Lazily create / resume AudioContext on first interaction */
	function ctx() {
		if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
		if (_ctx.state === "suspended") _ctx.resume();
		return _ctx;
	}

	/* ── Core oscillator synth with full ADSR envelope ── */
	function synth({
		freq    = 440,
		type    = "sine",
		attack  = 0.005,
		decay   = 0.12,
		sustain = 0,
		release = 0.1,
		gain    = 0.16,
		delay   = 0,
		detune  = 0,
	} = {}) {
		if (_muted) return;
		const c = ctx();
		const t = c.currentTime + delay;
		const osc = c.createOscillator();
		const env = c.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		osc.detune.value = detune;
		env.gain.setValueAtTime(0, t);
		env.gain.linearRampToValueAtTime(gain, t + attack);
		env.gain.linearRampToValueAtTime(sustain * gain, t + attack + decay);
		env.gain.linearRampToValueAtTime(0, t + attack + decay + release);
		osc.connect(env);
		env.connect(c.destination);
		osc.start(t);
		osc.stop(t + attack + decay + release + 0.02);
	}

	/* ── White-noise burst — used for whoosh / texture ── */
	function noise({
		duration   = 0.12,
		gain       = 0.06,
		filterFreq = 2000,
		attack     = 0.01,
		delay      = 0,
	} = {}) {
		if (_muted) return;
		const c      = ctx();
		const t      = c.currentTime + delay;
		const bufLen = Math.ceil(c.sampleRate * duration);
		const buf    = c.createBuffer(1, bufLen, c.sampleRate);
		const data   = buf.getChannelData(0);
		for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
		const src  = c.createBufferSource();
		src.buffer = buf;
		const filt = c.createBiquadFilter();
		filt.type           = "bandpass";
		filt.frequency.value = filterFreq;
		filt.Q.value         = 1.2;
		const env = c.createGain();
		env.gain.setValueAtTime(0, t);
		env.gain.linearRampToValueAtTime(gain, t + attack);
		env.gain.linearRampToValueAtTime(0, t + duration);
		src.connect(filt);
		filt.connect(env);
		env.connect(c.destination);
		src.start(t);
		src.stop(t + duration + 0.02);
	}

	/* ══════════════════════════════════════════════════════════════
	   NAMED SOUND EFFECTS
	══════════════════════════════════════════════════════════════ */
	const sounds = {

		/* Panel opens — warm rising 4-note arpeggio */
		open() {
			[[440, 0], [554, 0.045], [659, 0.09], [880, 0.15]].forEach(([f, d]) =>
				synth({ freq: f, type: "sine", gain: 0.13 - d * 0.15,
					attack: 0.007, decay: 0.1, release: 0.13, delay: d })
			);
		},

		/* Panel closes — descending soft pop */
		close() {
			[[660, 0], [440, 0.05], [330, 0.1]].forEach(([f, d]) =>
				synth({ freq: f, type: "sine", gain: 0.11,
					attack: 0.004, decay: 0.07, release: 0.09, delay: d })
			);
		},

		/* Sidebar nav click — crisp triangle tick */
		nav() {
			synth({ freq: 800,  type: "triangle", gain: 0.12, attack: 0.003, decay: 0.04, release: 0.05 });
			synth({ freq: 1200, type: "triangle", gain: 0.05, attack: 0.003, decay: 0.03, release: 0.04, delay: 0.02 });
		},

		/* Child-row expand — soft whoosh + low sine */
		expand() {
			noise({ duration: 0.14, gain: 0.07, filterFreq: 1800, attack: 0.01 });
			synth({ freq: 360, type: "sine", gain: 0.08, attack: 0.01, decay: 0.1, release: 0.08, delay: 0.02 });
		},

		/* Child-row collapse — reverse whoosh */
		collapse() {
			noise({ duration: 0.1, gain: 0.05, filterFreq: 1200, attack: 0.005 });
			synth({ freq: 280, type: "sine", gain: 0.06, attack: 0.005, decay: 0.08, release: 0.07 });
		},

		/* Generic click (footer buttons, close, etc.) */
		click() {
			synth({ freq: 700, type: "triangle", gain: 0.10, attack: 0.003, decay: 0.04, release: 0.04 });
		},

		/* New workspace — bright 4-note sparkle */
		newPage() {
			[880, 1108, 1320, 1760].forEach((f, i) =>
				synth({ freq: f, type: "sine", gain: 0.10 - i * 0.015,
					attack: 0.004, decay: 0.08, release: 0.1, delay: i * 0.05 })
			);
		},

		/* Save success — satisfying rising major chord */
		save() {
			[[523, 0], [659, 0.06], [784, 0.12]].forEach(([f, d]) =>
				synth({ freq: f, type: "sine", gain: 0.10,
					attack: 0.005, decay: 0.12, release: 0.18, delay: d })
			);
		},

		/* Discard / cancel — muted downward fall */
		discard() {
			[[580, 0], [420, 0.05], [320, 0.1]].forEach(([f, d]) =>
				synth({ freq: f, type: "triangle", gain: 0.08,
					attack: 0.004, decay: 0.06, release: 0.08, delay: d })
			);
		},

		/* Search-bar focus — airy sine ping */
		search() {
			synth({ freq: 1200, type: "sine", gain: 0.06, attack: 0.01, decay: 0.06, release: 0.08 });
		},

		/* Panel item row clicked — soft pluck */
		item() {
			synth({ freq: 600, type: "triangle", gain: 0.09, attack: 0.003, decay: 0.06, release: 0.07 });
			synth({ freq: 900, type: "sine",     gain: 0.05, attack: 0.003, decay: 0.05, release: 0.06, delay: 0.02 });
		},

		/* Tab switch inside panel — quick bright tick */
		tab() {
			synth({ freq: 1000, type: "triangle", gain: 0.08, attack: 0.002, decay: 0.03, release: 0.04 });
		},

		/* Section-header collapse/expand toggle */
		sectionToggle() {
			synth({ freq: 500, type: "sine", gain: 0.07, attack: 0.004, decay: 0.06, release: 0.07 });
		},

		/* Page navigation (different workspace selected) */
		pageNav() {
			noise({ duration: 0.08, gain: 0.04, filterFreq: 2400, attack: 0.005 });
			synth({ freq: 660, type: "sine", gain: 0.08, attack: 0.005, decay: 0.07, release: 0.09, delay: 0.03 });
		},

		/* Edit mode entered */
		editOn() {
			[440, 550, 660].forEach((f, i) =>
				synth({ freq: f, type: "sine", gain: 0.08, attack: 0.005, decay: 0.08, release: 0.1, delay: i * 0.04 })
			);
		},

		/* Edit mode exited (after save or discard) */
		editOff() {
			[660, 550, 440].forEach((f, i) =>
				synth({ freq: f, type: "sine", gain: 0.08, attack: 0.005, decay: 0.08, release: 0.1, delay: i * 0.04 })
			);
		},

		/* Welcome chord on first load */
		welcome() {
			[[330, 0.15], [440, 0.35], [550, 0.55], [660, 0.75]].forEach(([f, d]) =>
				synth({ freq: f, type: "sine", gain: 0.07, attack: 0.01, decay: 0.14, release: 0.2, delay: d })
			);
		},

		/* Mute toggled ON — downward whomp */
		muteOn() {
			synth({ freq: 300, type: "sine", gain: 0.12, attack: 0.005, decay: 0.1, release: 0.1 });
			synth({ freq: 200, type: "sine", gain: 0.08, attack: 0.005, decay: 0.1, release: 0.1, delay: 0.06 });
		},

		/* Mute toggled OFF — upward chime */
		muteOff() {
			[200, 400, 600].forEach((f, i) =>
				synth({ freq: f, type: "sine", gain: 0.08, attack: 0.005, decay: 0.08, release: 0.08, delay: i * 0.06 })
			);
		},
	};

	return {
		play:    (name) => { if (sounds[name]) sounds[name](); },
		mute:    ()    => { _muted = true; },
		unmute:  ()    => { _muted = false; },
		isMuted: ()    => _muted,
		toggle:  ()    => {
			_muted = !_muted;
			_muted ? sounds.muteOn() : sounds.muteOff();
			return _muted;
		},
	};
})();

/* Expose globally so the mute button in the header can call it */
window.WSSounds = WSSounds;

/* ═══════════════════════════════════════════════════════════════════════
   INJECT STYLES  (including ripple + sound-pill + toast)
═══════════════════════════════════════════════════════════════════════ */
(function injectStyles() {
	if (document.getElementById("ws-v2-styles")) return;
	const s = document.createElement("style");
	s.id = "ws-v2-styles";
	s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,500;0,600;1,400&display=swap');

/* ── Variables ─────────────────────────────────────────────────────── */
.ws2 {
  --c-accent:      #4f46e5;
  --c-accent-lt:   #818cf8;
  --c-accent-bg:   rgba(79,70,229,0.08);
  --c-accent-glow: rgba(79,70,229,0.18);
  --c-bg:          #f8f8fc;
  --c-surface:     #ffffff;
  --c-surface2:    rgba(255,255,255,0.8);
  --c-sidebar-bg:  #ffffff;
  --c-border:      rgba(0,0,0,0.06);
  --c-border2:     rgba(0,0,0,0.10);
  --c-text:        #1e1b4b;
  --c-text2:       #6b7280;
  --c-text3:       #9ca3af;
  --c-panel-bg:    #fafafa;
  --radius:        12px;
  --radius-sm:     8px;
  --radius-xs:     6px;
  --sb-w:          224px;
  --panel-w:       360px;
  --easing:        cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --dur:           0.26s;
  --shadow-sm:     0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:     0 4px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04);
  --shadow-panel:  -4px 0 32px rgba(0,0,0,0.05);
}

@media (prefers-color-scheme: dark) {
  .ws2 {
    --c-bg:         #0f0e1a;
    --c-surface:    #1a1830;
    --c-surface2:   rgba(26,24,48,0.85);
    --c-sidebar-bg: #151328;
    --c-panel-bg:   #12112a;
    --c-border:     rgba(255,255,255,0.07);
    --c-border2:    rgba(255,255,255,0.12);
    --c-text:       #e9e8ff;
    --c-text2:      #8b8aaa;
    --c-text3:      #5a5880;
    --shadow-sm:    0 1px 3px rgba(0,0,0,0.3);
    --shadow-md:    0 4px 16px rgba(0,0,0,0.3);
    --shadow-panel: -4px 0 32px rgba(0,0,0,0.25);
  }
}

/* ── Reset & root ───────────────────────────────────────────────────── */
.ws2 *, .ws2 *::before, .ws2 *::after { box-sizing: border-box; margin: 0; padding: 0; }
.ws2 {
  display: flex;
  min-height: 100vh;
  background: var(--c-bg);
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--c-text);
  position: relative;
}

/* ── Ripple effect ──────────────────────────────────────────────────── */
.ws2-ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(79,70,229,0.18);
  transform: scale(0);
  animation: ws2-ripple-anim 0.55s linear forwards;
  pointer-events: none;
}
@keyframes ws2-ripple-anim {
  to { transform: scale(4); opacity: 0; }
}

/* ── Sound toggle pill ──────────────────────────────────────────────── */
.ws2-sound-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--c-accent-bg);
  border: 1px solid rgba(79,70,229,0.18);
  color: var(--c-accent);
  font-size: 10.5px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all var(--dur);
  flex-shrink: 0;
}
.ws2-sound-pill:hover { background: rgba(79,70,229,0.14); }
.ws2-sound-pill.muted {
  background: var(--c-border);
  border-color: var(--c-border2);
  color: var(--c-text3);
}
.ws2-sound-wave {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 12px;
}
.ws2-sound-wave span {
  display: block;
  width: 2px;
  border-radius: 1px;
  background: currentColor;
  animation: ws2-wave 0.8s ease-in-out infinite;
}
.ws2-sound-wave span:nth-child(1) { height: 4px;  animation-delay: 0s; }
.ws2-sound-wave span:nth-child(2) { height: 8px;  animation-delay: .1s; }
.ws2-sound-wave span:nth-child(3) { height: 12px; animation-delay: .2s; }
.ws2-sound-wave span:nth-child(4) { height: 8px;  animation-delay: .3s; }
.ws2-sound-wave span:nth-child(5) { height: 4px;  animation-delay: .4s; }
.muted .ws2-sound-wave span { animation: none; height: 3px; }
@keyframes ws2-wave {
  0%, 100% { transform: scaleY(0.4); }
  50%      { transform: scaleY(1); }
}

/* ── Toast notification ─────────────────────────────────────────────── */
.ws2-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  background: var(--c-text);
  color: var(--c-bg);
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 11.5px;
  font-family: 'Inter', system-ui, sans-serif;
  opacity: 0;
  pointer-events: none;
  z-index: 9999;
  white-space: nowrap;
  transition: opacity 0.25s, transform 0.25s var(--easing);
}
.ws2-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Sidebar ────────────────────────────────────────────────────────── */
.ws2-sidebar {
  position: fixed;
  left: 0; top: 0; bottom: 0;
  width: var(--sb-w);
  background: var(--c-sidebar-bg);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  z-index: 200;
  box-shadow: var(--shadow-sm);
}

.ws2-sb-top {
  padding: 18px 14px 14px;
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}

.ws2-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
  text-decoration: none;
  cursor: pointer;
}

.ws2-brand-icon {
  width: 28px; height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--c-accent), var(--c-accent-lt));
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 10px var(--c-accent-glow);
  flex-shrink: 0;
  transition: transform 0.15s, box-shadow 0.15s;
  overflow: hidden;
  position: relative;
}
.ws2-brand-icon:hover { transform: scale(1.08); box-shadow: 0 5px 16px var(--c-accent-glow); }
.ws2-brand-icon:active { transform: scale(0.95); }
.ws2-brand-icon svg { width: 13px; height: 13px; fill: #fff; }

.ws2-brand-name {
  font-family: 'Playfair Display', serif;
  font-size: 14px; font-weight: 500;
  color: var(--c-text);
  letter-spacing: -0.01em;
}

.ws2-search { position: relative; }
.ws2-search-ico {
  position: absolute; left: 9px; top: 50%; transform: translateY(-50%);
  width: 13px; height: 13px; color: var(--c-text3); pointer-events: none;
}
.ws2-search input {
  width: 100%; height: 32px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--c-border2);
  background: var(--c-bg);
  padding: 0 10px 0 30px;
  font-size: 12px; font-family: inherit; color: var(--c-text);
  outline: none;
  transition: border-color var(--dur), box-shadow var(--dur);
}
.ws2-search input::placeholder { color: var(--c-text3); }
.ws2-search input:focus {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px var(--c-accent-bg);
}

/* ── Nav ────────────────────────────────────────────────────────────── */
.ws2-nav {
  flex: 1; overflow-y: auto;
  padding: 8px 8px 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-border2) transparent;
}
.ws2-nav::-webkit-scrollbar { width: 3px; }
.ws2-nav::-webkit-scrollbar-thumb { background: var(--c-border2); border-radius: 2px; }

.ws2-section-hd {
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--c-text3);
  padding: 12px 8px 5px;
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer; user-select: none;
}
.ws2-section-hd-chevron {
  width: 13px; height: 13px;
  transition: transform var(--dur) var(--easing);
  color: var(--c-text3);
}
.ws2-section-hd.collapsed .ws2-section-hd-chevron { transform: rotate(-90deg); }

.ws2-section-items {
  overflow: hidden;
  transition: max-height 0.32s var(--easing), opacity 0.22s;
}
.ws2-section-items.collapsed { max-height: 0 !important; opacity: 0; }

.ws2-ni-wrap { display: flex; flex-direction: column; }

.ws2-ni {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 9px;
  border-radius: var(--radius-xs);
  cursor: pointer;
  color: var(--c-text2);
  font-size: 12.5px; font-weight: 400;
  position: relative;
  transition: background var(--dur), color var(--dur), transform 0.14s;
  user-select: none; text-decoration: none;
  overflow: hidden;
}
.ws2-ni:hover { background: var(--c-accent-bg); color: var(--c-accent); transform: translateX(2px); }
.ws2-ni.active {
  background: var(--c-accent-bg); color: var(--c-accent); font-weight: 500;
}
.ws2-ni.active::before {
  content: '';
  position: absolute; left: 0; top: 18%; bottom: 18%;
  width: 2.5px; border-radius: 0 2px 2px 0;
  background: var(--c-accent);
}
.ws2-ni-ico {
  width: 26px; height: 26px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; background: var(--c-bg); flex-shrink: 0;
  transition: background var(--dur);
}
.ws2-ni.active .ws2-ni-ico { background: rgba(79,70,229,0.12); }
.ws2-ni-lbl { flex: 1; }
.ws2-ni-arr {
  width: 12px; height: 12px; color: var(--c-text3); flex-shrink: 0;
  transition: transform var(--dur) var(--easing), color var(--dur);
}
.ws2-ni.open .ws2-ni-arr { transform: rotate(90deg); color: var(--c-accent); }

.ws2-children {
  overflow: hidden; max-height: 0; opacity: 0;
  transition: max-height 0.3s var(--easing), opacity 0.2s;
  margin-left: 15px; padding-left: 10px;
  border-left: 1px solid var(--c-border2);
}
.ws2-children.open { opacity: 1; }

.ws2-child {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 8px; border-radius: 5px;
  font-size: 12px; color: var(--c-text2);
  cursor: pointer;
  transition: background var(--dur), color var(--dur);
  text-decoration: none;
}
.ws2-child:hover { background: var(--c-accent-bg); color: var(--c-accent); }
.ws2-child.active { color: var(--c-accent); font-weight: 500; }

.ws2-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: var(--c-text3);
}
.ws2-dot.indigo  { background: #818cf8; }
.ws2-dot.emerald { background: #34d399; }
.ws2-dot.amber   { background: #fbbf24; }
.ws2-dot.rose    { background: #f87171; }
.ws2-dot.sky     { background: #38bdf8; }
.ws2-dot.purple  { background: #c084fc; }
.ws2-dot.orange  { background: #fb923c; }
.ws2-dot.teal    { background: #2dd4bf; }

/* ── Sidebar footer ─────────────────────────────────────────────────── */
.ws2-sb-footer {
  padding: 10px 8px; border-top: 1px solid var(--c-border);
  display: flex; gap: 6px; flex-shrink: 0;
}
.ws2-fb {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 7px; border-radius: var(--radius-xs);
  border: 1px solid var(--c-border2); background: transparent;
  color: var(--c-text2); font-size: 11.5px; font-family: inherit;
  cursor: pointer; transition: all var(--dur); position: relative; overflow: hidden;
}
.ws2-fb:hover { background: var(--c-bg); color: var(--c-text); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.ws2-fb.primary {
  background: var(--c-accent-bg); border-color: rgba(79,70,229,0.2); color: var(--c-accent);
}
.ws2-fb.primary:hover {
  background: rgba(79,70,229,0.14);
  box-shadow: 0 3px 12px var(--c-accent-glow);
}
.ws2-fb svg { width: 12px; height: 12px; }

/* ── Main content ───────────────────────────────────────────────────── */
.ws2-main {
  margin-left: var(--sb-w); flex: 1; display: flex; min-height: 100vh;
  transition: padding-right var(--dur) var(--easing);
}
.ws2-main.panel-open { padding-right: var(--panel-w); }

.ws2-content {
  flex: 1; padding: 36px 44px 80px; overflow-y: auto; min-width: 0;
}

/* ── Page header ────────────────────────────────────────────────────── */
.ws2-ph { margin-bottom: 32px; animation: ws2-up 0.4s var(--easing) both; }

.ws2-ph-eyebrow-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 6px;
}
.ws2-ph-eyebrow {
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--c-accent);
  display: flex; align-items: center; gap: 6px;
}
.ws2-ph-eyebrow::before {
  content: ''; display: inline-block; width: 14px; height: 2px;
  background: var(--c-accent); border-radius: 1px;
}
.ws2-ph-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px; font-weight: 500; color: var(--c-text);
  letter-spacing: -0.02em; line-height: 1.2;
}
.ws2-ph-sub {
  margin-top: 5px; font-size: 13px; color: var(--c-text2); font-weight: 300;
}

/* ── Section cards ──────────────────────────────────────────────────── */
.ws2-sections {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px; margin-bottom: 28px;
  animation: ws2-up 0.45s 0.06s var(--easing) both;
}

.ws2-sec-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 18px 16px 15px;
  cursor: pointer;
  transition: all var(--dur) var(--easing);
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 10px;
}
.ws2-sec-card::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, var(--c-accent-bg) 0%, transparent 60%);
  opacity: 0; transition: opacity var(--dur);
}
.ws2-sec-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: rgba(79,70,229,0.2); }
.ws2-sec-card:hover::before { opacity: 1; }
.ws2-sec-card.active-panel {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 2px var(--c-accent-bg), var(--shadow-md);
}
.ws2-sec-card-top { display: flex; align-items: flex-start; justify-content: space-between; }
.ws2-sec-ico {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 19px; flex-shrink: 0;
  transition: transform 0.2s;
}
.ws2-sec-card:hover .ws2-sec-ico { transform: scale(1.1) rotate(-4deg); }
.ws2-sec-count {
  font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px;
  background: var(--c-bg); color: var(--c-text3); border: 1px solid var(--c-border);
}
.ws2-sec-card.active-panel .ws2-sec-count {
  background: var(--c-accent-bg); color: var(--c-accent); border-color: rgba(79,70,229,0.2);
}
.ws2-sec-label { font-size: 13px; font-weight: 500; color: var(--c-text); line-height: 1.3; }
.ws2-sec-sub   { font-size: 11px; color: var(--c-text3); margin-top: 1px; }
.ws2-sec-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.ws2-pill {
  font-size: 10px; padding: 2px 6px; border-radius: 20px;
  border: 1px solid var(--c-border2); color: var(--c-text3);
  background: var(--c-bg); white-space: nowrap;
}

/* ── Edit toolbar ───────────────────────────────────────────────────── */
.ws2-toolbar {
  display: none; align-items: center; gap: 8px;
  padding: 10px 14px;
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--radius); box-shadow: var(--shadow-md);
  margin-bottom: 20px;
  animation: ws2-up 0.25s var(--easing) both;
}
.ws2-toolbar.show { display: flex; }
.ws2-tb-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: var(--radius-xs);
  border: 1px solid var(--c-border2); background: transparent;
  color: var(--c-text2); font-family: inherit; font-size: 12px;
  cursor: pointer; transition: all var(--dur); position: relative; overflow: hidden;
}
.ws2-tb-btn:hover { background: var(--c-bg); color: var(--c-text); }
.ws2-tb-btn.save  { background: var(--c-accent); border-color: transparent; color: #fff; }
.ws2-tb-btn.save:hover { background: #4338ca; box-shadow: 0 4px 14px var(--c-accent-glow); transform: translateY(-1px); }
.ws2-tb-btn svg   { width: 12px; height: 12px; }
.ws2-tb-div       { width: 1px; height: 18px; background: var(--c-border2); }
.ws2-tb-space     { flex: 1; }

/* ── Editor wrap ────────────────────────────────────────────────────── */
.ws2-editor-wrap {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--radius); padding: 28px 36px 36px;
  box-shadow: var(--shadow-sm);
  animation: ws2-up 0.5s 0.12s var(--easing) both;
  min-height: 200px;
}

/* ── Right panel ────────────────────────────────────────────────────── */
.ws2-panel {
  position: fixed; right: 0; top: 0; bottom: 0;
  width: var(--panel-w);
  background: var(--c-panel-bg); border-left: 1px solid var(--c-border);
  display: flex; flex-direction: column;
  z-index: 150;
  transform: translateX(100%);
  transition: transform var(--dur) var(--easing);
  box-shadow: var(--shadow-panel);
}
.ws2-panel.open { transform: translateX(0); }

.ws2-ph2       { padding: 20px 18px 14px; border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.ws2-ph2-top   { display: flex; align-items: center; margin-bottom: 12px; }
.ws2-ph2-back  {
  display: flex; align-items: center; gap: 4px;
  font-size: 11.5px; color: var(--c-text3); cursor: pointer;
  padding: 4px 8px 4px 4px; border-radius: 5px;
  transition: all var(--dur); margin-right: auto;
}
.ws2-ph2-back:hover { background: var(--c-border); color: var(--c-text2); }
.ws2-ph2-back svg   { width: 12px; height: 12px; }
.ws2-ph2-close {
  width: 28px; height: 28px; border-radius: 7px;
  border: 1px solid var(--c-border2); background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--c-text3); transition: all var(--dur);
}
.ws2-ph2-close:hover { background: var(--c-bg); color: var(--c-text); }
.ws2-ph2-close svg   { width: 12px; height: 12px; }
.ws2-ph2-hero  { display: flex; align-items: center; gap: 12px; }
.ws2-ph2-ico   {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.ws2-ph2-title {
  font-family: 'Playfair Display', serif;
  font-size: 19px; font-weight: 500; color: var(--c-text); letter-spacing: -0.01em;
}
.ws2-ph2-desc  { font-size: 11.5px; color: var(--c-text3); margin-top: 2px; }

.ws2-tabs {
  display: flex; gap: 2px; padding: 10px 14px;
  border-bottom: 1px solid var(--c-border); flex-shrink: 0; overflow-x: auto;
}
.ws2-tab {
  padding: 5px 12px; border-radius: 20px;
  font-size: 11.5px; font-weight: 500; cursor: pointer;
  color: var(--c-text3); transition: all var(--dur); white-space: nowrap;
  border: 1px solid transparent;
}
.ws2-tab:hover  { color: var(--c-text2); background: var(--c-border); }
.ws2-tab.active { background: var(--c-accent-bg); color: var(--c-accent); border-color: rgba(79,70,229,0.2); }

.ws2-panel-search {
  padding: 10px 14px; border-bottom: 1px solid var(--c-border);
  flex-shrink: 0; position: relative;
}
.ws2-panel-search svg {
  position: absolute; left: 23px; top: 50%; transform: translateY(-50%);
  width: 12px; height: 12px; color: var(--c-text3);
}
.ws2-panel-search input {
  width: 100%; height: 32px; border-radius: var(--radius-xs);
  border: 1px solid var(--c-border2); background: var(--c-surface);
  padding: 0 10px 0 28px; font-size: 12px; font-family: inherit; color: var(--c-text);
  outline: none; transition: border-color var(--dur), box-shadow var(--dur);
}
.ws2-panel-search input:focus {
  border-color: var(--c-accent); box-shadow: 0 0 0 3px var(--c-accent-bg);
}

.ws2-panel-body {
  flex: 1; overflow-y: auto; padding: 6px 8px 24px;
  scrollbar-width: thin; scrollbar-color: var(--c-border2) transparent;
}
.ws2-panel-body::-webkit-scrollbar { width: 3px; }
.ws2-panel-body::-webkit-scrollbar-thumb { background: var(--c-border2); }

.ws2-grp        { margin-bottom: 4px; }
.ws2-grp-label  {
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--c-text3); padding: 10px 10px 4px;
}

.ws2-pi {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: var(--radius-xs);
  cursor: pointer; transition: background var(--dur), transform 0.14s;
  text-decoration: none; position: relative; overflow: hidden;
}
.ws2-pi:hover  { background: var(--c-accent-bg); transform: translateX(2px); }
.ws2-pi:active { transform: translateX(1px) scale(0.99); }

.ws2-pi-ico {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; flex-shrink: 0; transition: transform var(--dur);
}
.ws2-pi:hover .ws2-pi-ico { transform: scale(1.08); }

.ws2-pi-info  { flex: 1; min-width: 0; }
.ws2-pi-name  {
  font-size: 12.5px; font-weight: 400; color: var(--c-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ws2-pi-hint  {
  font-size: 11px; color: var(--c-text3); margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ws2-pi-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 20px;
  font-weight: 500; flex-shrink: 0;
}
.ws2-pi-link  {
  width: 14px; height: 14px; color: var(--c-text3);
  opacity: 0; flex-shrink: 0; transition: opacity var(--dur);
}
.ws2-pi:hover .ws2-pi-link { opacity: 1; }
.ws2-panel-div { height: 1px; background: var(--c-border); margin: 8px 10px; }

/* ── Animations ─────────────────────────────────────────────────────── */
@keyframes ws2-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Skeleton ───────────────────────────────────────────────────────── */
.ws2-skel {
  background: linear-gradient(90deg,var(--c-border) 25%,var(--c-border2) 50%,var(--c-border) 75%);
  background-size: 200% 100%;
  animation: ws2-shimmer 1.4s ease-in-out infinite;
  border-radius: 5px;
}
@keyframes ws2-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.ws2-empty     { text-align: center; padding: 40px 20px; color: var(--c-text3); font-size: 12.5px; }
.ws2-empty-ico { font-size: 32px; margin-bottom: 10px; }
`;
	document.head.appendChild(s);
})();

/* ═══════════════════════════════════════════════════════════════════════
   SVG ICONS
═══════════════════════════════════════════════════════════════════════ */
const I = {
	search:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
	plus:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
	edit:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
	save:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
	close:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
	back:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
	chevDown:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
	chevRight:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
	ext:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
	discard:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>`,
	settings:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
	logo:       `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
	soundOn:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
	soundOff:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
};

/* ═══════════════════════════════════════════════════════════════════════
   SECTION DEFINITIONS
═══════════════════════════════════════════════════════════════════════ */
const SECTION_DEFS = {
	shortcuts: {
		icon: "⚡", label: "Your Shortcuts", desc: "Quick jump to frequent records",
		colorBg: "rgba(79,70,229,0.1)", colorText: "#4f46e5",
		tabs: ["All", "Favourites"],
		buildGroups(page_data) {
			const items = page_data?.shortcuts?.items || [];
			return [{
				label: "Pinned Shortcuts",
				items: items.map((s) => ({
					icon: s.icon || "🔗",
					name: s.link_to || s.label,
					hint: s.type || "Shortcut",
					route: `/app/${frappe.router.slug(s.link_to || s.label)}`,
					badge: s.count != null ? String(s.count) : null,
				})),
				emptyText: "No shortcuts pinned yet",
			}];
		},
	},

	reports_masters: {
		icon: "📊", label: "Reports & Masters", desc: "Analytical reports and master data",
		colorBg: "rgba(34,197,94,0.1)", colorText: "#16a34a",
		tabs: ["All", "Reports", "Masters"],
		buildGroups(page_data) {
			const cards = page_data?.cards?.items || [];
			return cards.map((card) => ({
				label: card.card_name,
				items: (card.links || []).map((link, i) => ({
					icon: link.icon || ICON_FOR(i),
					name: link.label || link.name,
					hint: link.description || link.type || link.name,
					route: link.link_type === "DocType"
						? `/app/${frappe.router.slug(link.name)}`
						: `/app/${frappe.router.slug(link.link_to || link.name)}`,
				})),
			})).filter((g) => g.items.length);
		},
	},

	data_import: {
		icon: "📥", label: "Data Import & Settings", desc: "Import tools and system configuration",
		colorBg: "rgba(249,115,22,0.1)", colorText: "#ea580c",
		tabs: ["All", "Import Tools", "Settings"],
		buildGroups() {
			return [
				{
					label: "Import Tools",
					items: [
						{ icon: "📂", name: "Data Import",                    hint: "Bulk import records via CSV/Excel",   route: "/app/data-import" },
						{ icon: "🧾", name: "Opening Invoice Creation Tool",   hint: "Create opening invoices",             route: "/app/opening-invoice-creation-tool" },
						{ icon: "📋", name: "Chart of Accounts Importer",      hint: "Import COA structure",                route: "/app/chart-of-accounts-importer" },
					],
				},
				{
					label: "Document Settings",
					items: [
						{ icon: "🖼️", name: "Letter Head",   hint: "Company letterhead for print",    route: "/app/letter-head" },
						{ icon: "📧", name: "Email Account", hint: "Configure email accounts",         route: "/app/email-account" },
						{ icon: "🖨️", name: "Print Format",  hint: "Customize print layouts",          route: "/app/print-format" },
					],
				},
			];
		},
	},

	accounting: {
		icon: "💰", label: "Accounting", desc: "Accounts, journals and financial records",
		colorBg: "rgba(168,85,247,0.1)", colorText: "#9333ea",
		tabs: ["All", "Payables", "Receivables", "General"],
		buildGroups() {
			return [
				{
					label: "Core Masters",
					items: [
						{ icon: "🏛️", name: "Chart of Accounts", hint: "Account hierarchy tree",    route: "/app/account" },
						{ icon: "🏢", name: "Company",            hint: "Legal entity settings",     route: "/app/company" },
						{ icon: "👤", name: "Customer",           hint: "Manage customer records",   route: "/app/customer" },
						{ icon: "🏭", name: "Supplier",           hint: "Manage vendor records",     route: "/app/supplier" },
					],
				},
				{
					label: "Transactions",
					items: [
						{ icon: "📝", name: "Journal Entry",      hint: "Manual accounting entries",  route: "/app/journal-entry" },
						{ icon: "💳", name: "Payment Entry",      hint: "Record receipts & payments", route: "/app/payment-entry" },
						{ icon: "📄", name: "Sales Invoice",      hint: "Customer invoices & bills",  route: "/app/sales-invoice" },
						{ icon: "📃", name: "Purchase Invoice",   hint: "Vendor bills & invoices",    route: "/app/purchase-invoice" },
					],
				},
				{
					label: "Reports",
					items: [
						{ icon: "⚖️", name: "Balance Sheet",        hint: "Assets vs liabilities",    route: "/app/balance-sheet" },
						{ icon: "📈", name: "Profit and Loss",       hint: "Income statement",         route: "/app/profit-and-loss-statement" },
						{ icon: "📒", name: "General Ledger",        hint: "Full transaction ledger",  route: "/app/general-ledger" },
						{ icon: "🔄", name: "Trial Balance",         hint: "Debit/credit verification",route: "/app/trial-balance" },
						{ icon: "💧", name: "Cash Flow Statement",   hint: "Liquidity analysis",       route: "/app/cash-flow" },
					],
				},
				{
					label: "Taxes & Compliance",
					items: [
						{ icon: "🧾", name: "Tax Template",  hint: "GST, VAT tax definitions",   route: "/app/sales-taxes-and-charges-template" },
						{ icon: "📅", name: "Fiscal Year",   hint: "Accounting period setup",     route: "/app/fiscal-year" },
						{ icon: "🌐", name: "Currency",      hint: "Exchange rates & currencies", route: "/app/currency" },
					],
				},
			];
		},
	},

	stock: {
		icon: "📦", label: "Stock", desc: "Inventory masters and warehouse management",
		colorBg: "rgba(6,182,212,0.1)", colorText: "#0891b2",
		tabs: ["All", "Items", "Warehouses", "Reports"],
		buildGroups() {
			return [
				{
					label: "Masters",
					items: [
						{ icon: "🏷️", name: "Item",                     hint: "Products and services catalog",      route: "/app/item" },
						{ icon: "🏭", name: "Warehouse",                 hint: "Storage location management",        route: "/app/warehouse" },
						{ icon: "🔖", name: "Brand",                     hint: "Product brands",                     route: "/app/brand" },
						{ icon: "📐", name: "Unit of Measure (UOM)",     hint: "Measurement units",                  route: "/app/uom" },
					],
				},
				{
					label: "Transactions",
					items: [
						{ icon: "📤", name: "Stock Entry",               hint: "Material movements",                 route: "/app/stock-entry" },
						{ icon: "🔍", name: "Stock Reconciliation",      hint: "Physical count reconciliation",      route: "/app/stock-reconciliation" },
						{ icon: "🔄", name: "Material Request",          hint: "Internal stock requests",            route: "/app/material-request" },
					],
				},
				{
					label: "Reports",
					items: [
						{ icon: "📊", name: "Stock Ledger",              hint: "Full inventory transaction log",     route: "/app/stock-ledger" },
						{ icon: "📉", name: "Stock Balance",             hint: "Current inventory levels",           route: "/app/stock-balance" },
						{ icon: "🕒", name: "Stock Ageing",              hint: "Age analysis of inventory",          route: "/app/stock-ageing" },
					],
				},
			];
		},
	},

	crm: {
		icon: "🤝", label: "CRM", desc: "Leads, customers and sales pipeline",
		colorBg: "rgba(251,191,36,0.12)", colorText: "#b45309",
		tabs: ["All", "Pipeline", "Masters"],
		buildGroups() {
			return [
				{
					label: "Pipeline",
					items: [
						{ icon: "🎯", name: "Lead",          hint: "Prospective customers",         route: "/app/crm-lead" },
						{ icon: "🤝", name: "Opportunity",   hint: "Potential deals",               route: "/app/crm-opportunity" },
						{ icon: "📋", name: "Quotation",     hint: "Price quotes sent to prospects",route: "/app/quotation" },
						{ icon: "✅", name: "Sales Order",   hint: "Confirmed customer orders",     route: "/app/sales-order" },
					],
				},
				{
					label: "Masters",
					items: [
						{ icon: "👥", name: "Customer Group", hint: "Group customers by category",  route: "/app/customer-group" },
						{ icon: "🗺️", name: "Territory",     hint: "Geographic sales territories",  route: "/app/territory" },
						{ icon: "📢", name: "Campaign",       hint: "Marketing campaigns",           route: "/app/crm-campaign" },
					],
				},
			];
		},
	},
};

const ICONS = ["📄","🗂️","📊","🔧","📋","📝","🔗","📌","📑","🗃️","🧩","⚙️"];
function ICON_FOR(i) { return ICONS[i % ICONS.length]; }

const BADGE_COLORS = [
	{ bg: "rgba(79,70,229,0.1)",   text: "#4f46e5" },
	{ bg: "rgba(34,197,94,0.1)",   text: "#16a34a" },
	{ bg: "rgba(249,115,22,0.1)",  text: "#ea580c" },
	{ bg: "rgba(6,182,212,0.1)",   text: "#0891b2" },
	{ bg: "rgba(168,85,247,0.1)",  text: "#9333ea" },
	{ bg: "rgba(251,191,36,0.12)", text: "#b45309" },
	{ bg: "rgba(239,68,68,0.1)",   text: "#dc2626" },
];
function badgeColor(i) { return BADGE_COLORS[i % BADGE_COLORS.length]; }

/* ═══════════════════════════════════════════════════════════════════════
   RIPPLE HELPER
═══════════════════════════════════════════════════════════════════════ */
function addRipple(el, e) {
	const rect = el.getBoundingClientRect();
	const r    = document.createElement("div");
	r.className = "ws2-ripple";
	const size  = Math.max(el.offsetWidth, el.offsetHeight) * 2;
	const x     = (e ? e.clientX - rect.left : el.offsetWidth  / 2) - size / 2;
	const y     = (e ? e.clientY - rect.top  : el.offsetHeight / 2) - size / 2;
	r.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
	el.appendChild(r);
	setTimeout(() => r.remove(), 650);
}

/* ═══════════════════════════════════════════════════════════════════════
   TOAST HELPER
═══════════════════════════════════════════════════════════════════════ */
let _toastEl   = null;
let _toastTimer = null;
function showToast(msg) {
	if (!_toastEl) {
		_toastEl = document.createElement("div");
		_toastEl.className = "ws2-toast";
		document.body.appendChild(_toastEl);
	}
	_toastEl.textContent = msg;
	_toastEl.classList.add("show");
	clearTimeout(_toastTimer);
	_toastTimer = setTimeout(() => _toastEl.classList.remove("show"), 2200);
}

/* ═══════════════════════════════════════════════════════════════════════
   WORKSPACE CLASS
═══════════════════════════════════════════════════════════════════════ */
frappe.standard_pages["Workspaces"] = function () {
	const wrapper = frappe.container.add_page("Workspaces");
	frappe.ui.make_app_page({ parent: wrapper, name: "Workspaces", title: __("Workspace") });
	frappe.workspace = new frappe.views.Workspace(wrapper);
	$(wrapper).bind("show", function () { frappe.workspace.show(); });
};

frappe.views.Workspace = class Workspace {
	constructor(wrapper) {
		this.wrapper  = $(wrapper);
		this.page     = wrapper.page;
		this.blocks   = frappe.workspace_block.blocks;
		this.is_read_only = true;
		this.pages    = {};
		this.sorted_public_items  = [];
		this.sorted_private_items = [];
		this.current_page  = {};
		this.sidebar_items = { public: {}, private: {} };
		this.sidebar_categories = [
			{ id: "Personal", label: __("Personal") },
			{ id: "Public",   label: __("Public")   },
		];
		this.indicator_colors = ["indigo","emerald","amber","rose","sky","purple","orange","teal"];
		this._active_panel = null;
		this._active_tab   = "All";

		this.prepare_container();
		this.setup_pages();
		this.register_awesomebar_shortcut();

		/* Welcome sound on first load */
		setTimeout(() => WSSounds.play("welcome"), 700);
	}

	/* ── Container ──────────────────────────────────────────────── */
	prepare_container() {
		const $layout = this.wrapper.find(".layout-main-section-wrapper");
		$layout.empty();
		this.$root = $('<div class="ws2"></div>').appendTo($layout);
		this._build_sidebar();
		this._build_main();
		this._build_panel();
	}

	/* ── Sidebar ────────────────────────────────────────────────── */
	_build_sidebar() {
		this.$sidebar = $(`
		<aside class="ws2-sidebar">
			<div class="ws2-sb-top">
				<a class="ws2-brand" href="/app" id="ws2-brand-link">
					<div class="ws2-brand-icon">${I.logo}</div>
					<span class="ws2-brand-name">ERPNext</span>
				</a>
				<div class="ws2-search">
					<span class="ws2-search-ico">${I.search}</span>
					<input type="text" id="ws2-search" placeholder="${__("Search…")}">
				</div>
			</div>
			<nav class="ws2-nav" id="ws2-nav"></nav>
			<div class="ws2-sb-footer">
				<button class="ws2-fb primary" id="ws2-btn-new">
					${I.plus}<span>${__("New")}</span>
				</button>
				<button class="ws2-fb" id="ws2-btn-edit">
					${I.edit}<span>${__("Edit")}</span>
				</button>
			</div>
		</aside>
		`).appendTo(this.$root);

		this.sidebar = this.$sidebar.find("#ws2-nav");

		/* Brand logo click — thump sound + ripple */
		const $brandIcon = this.$sidebar.find(".ws2-brand-icon")[0];
		this.$sidebar.find("#ws2-brand-link").on("click", (e) => {
			WSSounds.play("logo" in WSSounds ? "logo" : "nav");
			addRipple($brandIcon);
		});

		/* New workspace button */
		this.$sidebar.find("#ws2-btn-new").on("click", (e) => {
			WSSounds.play("newPage");
			addRipple(e.currentTarget, e);
			this.initialize_new_page();
		});

		/* Edit button */
		this.$sidebar.find("#ws2-btn-edit").on("click", async (e) => {
			if (!this.editor || !this.editor.readOnly) return;
			WSSounds.play("editOn");
			addRipple(e.currentTarget, e);
			this.is_read_only = false;
			this.toggle_hidden_workspaces(true);
			await this.editor.readOnly.toggle();
			this.editor.isReady.then(() => {
				this._show_toolbar();
				this.initialize_editorjs_undo();
				this.setup_customization_buttons(this._page);
				this.show_sidebar_actions();
				this.make_blocks_sortable();
			});
		});

		/* Search input — focus sound */
		this.$sidebar.find("#ws2-search").on("focus", () => WSSounds.play("search"));
		this.$sidebar.find("#ws2-search").on("input", (e) => {
			const q = e.target.value.toLowerCase();
			this.$root.find(".ws2-ni").each(function () {
				const lbl = $(this).find(".ws2-ni-lbl").text().toLowerCase();
				$(this).parent().toggle(!q || lbl.includes(q));
			});
		});
	}

	/* ── Main content area ──────────────────────────────────────── */
	_build_main() {
		this.$main    = $('<div class="ws2-main"></div>').appendTo(this.$root);
		this.$content = $('<div class="ws2-content" id="ws2-content"></div>').appendTo(this.$main);

		/* Edit toolbar */
		this.$toolbar = $(`
		<div class="ws2-toolbar" id="ws2-toolbar">
			<button class="ws2-tb-btn save" id="ws2-save">${I.save} ${__("Save")}</button>
			<button class="ws2-tb-btn" id="ws2-discard">${I.discard} ${__("Discard")}</button>
			<div class="ws2-tb-div"></div>
			<div class="ws2-tb-space"></div>
			<button class="ws2-tb-btn" id="ws2-settings">${I.settings} ${__("Settings")}</button>
		</div>
		`).appendTo(this.$content);

		/* Page header row with eyebrow + sound toggle pill */
		this.$content.append(`
			<div class="ws2-ph" id="ws2-ph">
				<div class="ws2-ph-eyebrow-row">
					<div class="ws2-ph-eyebrow" id="ws2-eyebrow">Workspace</div>
					<div class="ws2-sound-pill" id="ws2-sound-pill">
						<div class="ws2-sound-wave"><span></span><span></span><span></span><span></span><span></span></div>
						<span id="ws2-sound-label">${__("Sound On")}</span>
					</div>
				</div>
				<h1 class="ws2-ph-title" id="ws2-title"></h1>
				<p class="ws2-ph-sub" id="ws2-sub"></p>
			</div>
			<div class="ws2-sections" id="ws2-sections"></div>
			<div class="ws2-editor-wrap">
				<div id="editorjs" class="desk-page page-main-content"></div>
			</div>
		`);

		this.body = this.$content;

		/* Sound toggle pill */
		this.$content.find("#ws2-sound-pill").on("click", (e) => {
			const muted = WSSounds.toggle();
			const $pill = $(e.currentTarget);
			$pill.toggleClass("muted", muted);
			$pill.find("#ws2-sound-label").text(muted ? __("Sound Off") : __("Sound On"));
			showToast(muted ? "🔇 Sound off" : "🔊 Sound on");
		});

		/* Save */
		this.$content.find("#ws2-save").on("click", (e) => {
			if (!this._page) return;
			WSSounds.play("save");
			addRipple(e.currentTarget, e);
			this._hide_toolbar();
			this.save_page(this._page).then((saved) => {
				if (!saved) return;
				this.undo.readOnly = true;
				this.editor.readOnly.toggle();
				this.is_read_only = true;
				WSSounds.play("editOff");
			});
		});

		/* Discard */
		this.$content.find("#ws2-discard").on("click", async (e) => {
			WSSounds.play("discard");
			addRipple(e.currentTarget, e);
			this._hide_toolbar();
			this.discard = true;
			this.toggle_hidden_workspaces(false);
			await this.editor.readOnly.toggle();
			this.is_read_only = true;
			this.sidebar_pages = this.cached_pages;
			this.reload();
			frappe.show_alert({ message: __("Customizations Discarded"), indicator: "info" });
			WSSounds.play("editOff");
		});

		/* Settings */
		this.$content.find("#ws2-settings").on("click", (e) => {
			WSSounds.play("click");
			addRipple(e.currentTarget, e);
			if (this._page) frappe.set_route(`workspace/${this._page.name}`);
		});
	}

	/* ── Right panel ────────────────────────────────────────────── */
	_build_panel() {
		this.$panel = $(`
		<aside class="ws2-panel" id="ws2-panel">
			<div class="ws2-ph2">
				<div class="ws2-ph2-top">
					<div class="ws2-ph2-back" id="ws2-panel-back">
						${I.back} <span>${__("Back")}</span>
					</div>
					<button class="ws2-ph2-close" id="ws2-panel-close">${I.close}</button>
				</div>
				<div class="ws2-ph2-hero">
					<div class="ws2-ph2-ico" id="ws2-panel-ico"></div>
					<div>
						<div class="ws2-ph2-title" id="ws2-panel-title"></div>
						<div class="ws2-ph2-desc"  id="ws2-panel-desc"></div>
					</div>
				</div>
			</div>
			<div class="ws2-tabs" id="ws2-tabs"></div>
			<div class="ws2-panel-search">
				${I.search}
				<input type="text" id="ws2-pf" placeholder="${__("Filter…")}">
			</div>
			<div class="ws2-panel-body" id="ws2-panel-body"></div>
		</aside>
		`).appendTo(this.$root);

		/* Close / back — both play close sound */
		this.$panel.find("#ws2-panel-close, #ws2-panel-back").on("click", (e) => {
			WSSounds.play("close");
			addRipple(e.currentTarget, e);
			this._close_panel();
		});

		/* Panel filter search — focus sound */
		this.$panel.find("#ws2-pf")
			.on("focus", () => WSSounds.play("search"))
			.on("input",  (e) => this._filter_panel(e.target.value));
	}

	/* ── Open panel ─────────────────────────────────────────────── */
	_open_panel(key, clickEvent) {
		const def = SECTION_DEFS[key];
		if (!def) return;

		WSSounds.play("open");
		if (clickEvent) addRipple(clickEvent.currentTarget, clickEvent);
		showToast(`${def.icon} ${def.label}`);

		this._active_panel = key;
		this._active_tab   = "All";

		this.$panel.find("#ws2-panel-ico")
			.html(def.icon)
			.css({ background: def.colorBg, color: def.colorText });
		this.$panel.find("#ws2-panel-title").text(def.label);
		this.$panel.find("#ws2-panel-desc").text(def.desc);

		/* Tabs */
		const $tabs = this.$panel.find("#ws2-tabs").empty();
		(def.tabs || ["All"]).forEach((tab) => {
			const $t = $(`<div class="ws2-tab ${tab === "All" ? "active" : ""}">${tab}</div>`);
			$t.on("click", (e) => {
				WSSounds.play("tab");
				addRipple(e.currentTarget, e);
				$tabs.find(".ws2-tab").removeClass("active");
				$t.addClass("active");
				this._active_tab = tab;
				this._render_panel_body(key, tab);
			});
			$tabs.append($t);
		});

		this.$panel.find("#ws2-pf").val("");
		this._render_panel_body(key, "All");

		this.$content.find(".ws2-sec-card").removeClass("active-panel");
		this.$content.find(`[data-section="${key}"]`).addClass("active-panel");

		this.$panel.addClass("open");
		this.$main.addClass("panel-open");
	}

	_render_panel_body(key, activeTab) {
		const def   = SECTION_DEFS[key];
		const $body = this.$panel.find("#ws2-panel-body").empty();
		let groups  = def.buildGroups(this.page_data || {});

		if (activeTab !== "All" && def.tabFilter) groups = def.tabFilter(groups, activeTab);

		if (!groups.length || groups.every((g) => !g.items.length)) {
			$body.html(`
				<div class="ws2-empty">
					<div class="ws2-empty-ico">🔍</div>
					<div>${__("No items found")}</div>
				</div>
			`);
			return;
		}

		groups.forEach((group, gi) => {
			if (!group.items.length) return;
			const $g = $(`<div class="ws2-grp"><div class="ws2-grp-label">${group.label}</div></div>`);
			group.items.forEach((item, ii) => {
				const bc    = badgeColor(gi * 10 + ii);
				const $item = $(`
				<a class="ws2-pi" href="${item.route || "#"}"
				   data-name="${item.name || ""}"
				   data-label="${item.name || ""}">
					<div class="ws2-pi-ico" style="background:${bc.bg}">${item.icon || "📄"}</div>
					<div class="ws2-pi-info">
						<div class="ws2-pi-name">${__(item.name)}</div>
						${item.hint ? `<div class="ws2-pi-hint">${item.hint}</div>` : ""}
					</div>
					${item.badge ? `<span class="ws2-pi-badge" style="background:${bc.bg};color:${bc.text}">${item.badge}</span>` : ""}
					<span class="ws2-pi-link">${I.ext}</span>
				</a>
				`);

				$item.on("click", (e) => {
					e.preventDefault();
					WSSounds.play("item");
					addRipple(e.currentTarget, e);
					const route = item.route
						? item.route.replace(/^\/app\//, "")
						: frappe.router.slug(item.name);
					frappe.set_route(route);
				});

				$g.append($item);
			});
			$body.append($g);
			if (gi < groups.length - 1) $body.append('<div class="ws2-panel-div"></div>');
		});
	}

	_close_panel() {
		this.$panel.removeClass("open");
		this.$main.removeClass("panel-open");
		this.$content.find(".ws2-sec-card").removeClass("active-panel");
		this._active_panel = null;
	}

	_filter_panel(q) {
		const lower = q.toLowerCase();
		this.$panel.find(".ws2-pi").each(function () {
			const name = $(this).find(".ws2-pi-name").text().toLowerCase();
			const hint = $(this).find(".ws2-pi-hint").text().toLowerCase();
			$(this).toggle(!lower || name.includes(lower) || hint.includes(lower));
		});
		this.$panel.find(".ws2-grp").each(function () {
			$(this).toggle(!!$(this).find(".ws2-pi:visible").length);
		});
	}

	/* ── Section cards ──────────────────────────────────────────── */
	_render_sections(page) {
		const $grid = this.$content.find("#ws2-sections").empty();
		if (!page) return;

		const cards  = this.page_data?.cards?.items     || [];
		const shorts = this.page_data?.shortcuts?.items || [];

		Object.keys(SECTION_DEFS).forEach((key) => {
			const def = SECTION_DEFS[key];
			let count = 0;
			let previewItems = [];

			if (key === "shortcuts")       count = shorts.length;
			else if (key === "reports_masters") count = cards.reduce((a, c) => a + (c.links?.length || 0), 0);
			else {
				try {
					const grps = def.buildGroups(this.page_data || {});
					count = grps.reduce((a, g) => a + (g.items?.length || 0), 0);
					previewItems = grps.flatMap((g) => g.items).slice(0, 3);
				} catch (_) {}
			}

			if (!previewItems.length) {
				try {
					previewItems = def.buildGroups(this.page_data || {}).flatMap((g) => g.items).slice(0, 3);
				} catch (_) {}
			}

			const $card = $(`
			<div class="ws2-sec-card" data-section="${key}" tabindex="0" role="button">
				<div class="ws2-sec-card-top">
					<div class="ws2-sec-ico" style="background:${def.colorBg};color:${def.colorText}">
						${def.icon}
					</div>
					${count ? `<span class="ws2-sec-count">${count}</span>` : ""}
				</div>
				<div>
					<div class="ws2-sec-label">${def.label}</div>
					<div class="ws2-sec-sub">${def.desc}</div>
				</div>
				${previewItems.length ? `
				<div class="ws2-sec-pills">
					${previewItems.map((p) => `<span class="ws2-pill">${p.name}</span>`).join("")}
					${count > 3 ? `<span class="ws2-pill">+${count - 3} more</span>` : ""}
				</div>` : ""}
			</div>
			`);

			$card.on("click", (e) => {
				if (this._active_panel === key) {
					WSSounds.play("close");
					addRipple(e.currentTarget, e);
					this._close_panel();
				} else {
					this._open_panel(key, e);
				}
			});

			$card.on("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") $card.trigger("click");
			});

			$grid.append($card);
		});
	}

	/* ── Pages API ──────────────────────────────────────────────── */
	get_pages() {
		return frappe.xcall("frappe.desk.desktop.get_workspace_sidebar_items");
	}

	async setup_pages(reload) {
		!this.discard && this._show_sidebar_skel();
		this.sidebar_pages = !this.discard ? await this.get_pages() : this.sidebar_pages;
		this.cached_pages  = $.extend(true, {}, this.sidebar_pages);
		this.all_pages     = this.sidebar_pages.pages;
		this.has_access    = this.sidebar_pages.has_access;
		this.has_create_access = this.sidebar_pages.has_create_access;

		this.all_pages.forEach((p) => { p.is_editable = !p.public || this.has_access; });
		this.public_pages  = this.all_pages.filter((p) =>  p.public);
		this.private_pages = this.all_pages.filter((p) => !p.public);

		if (this.all_pages) {
			frappe.workspaces = {};
			for (const p of this.all_pages) {
				frappe.workspaces[frappe.router.slug(p.name)] = { title: p.title, public: p.public };
			}
			this.make_sidebar();
			reload && this.show();
		}
	}

	/* ── Sidebar nav ────────────────────────────────────────────── */
	make_sidebar() {
		this.sidebar.empty();
		this.sidebar_items = { public: {}, private: {} };

		this.sidebar_categories.forEach((cat) => {
			const roots = cat.id === "Public"
				? this.public_pages.filter((p) => !p.parent_page)
				: this.private_pages.filter((p) => !p.parent_page);
			const uniq = roots.uniqBy((d) => d.title);
			if (!uniq.length) return;
			this._build_nav_section(cat, uniq);
		});

		const $sel = this.sidebar.find(".ws2-ni.active");
		if ($sel.length && !frappe.dom.is_element_in_viewport($sel[0])) {
			$sel[0].scrollIntoView({ block: "center" });
		}
	}

	_build_nav_section(cat, pages) {
		const $sec  = $('<div class="ws2-nav-section"></div>');
		const $hd   = $(`
			<div class="ws2-section-hd">
				<span>${cat.label}</span>
				<span class="ws2-section-hd-chevron">${I.chevDown}</span>
			</div>
		`).appendTo($sec);
		const $items = $('<div class="ws2-section-items"></div>').appendTo($sec);

		$hd.on("click", () => {
			WSSounds.play("sectionToggle");
			const c = $hd.hasClass("collapsed");
			$hd.toggleClass("collapsed", !c);
			$items.toggleClass("collapsed", !c);
			if (c) $items.css("max-height", $items[0].scrollHeight + "px");
		});

		pages.forEach((p) => this._append_ni(p, $items));
		this.sidebar.append($sec);
		requestAnimationFrame(() => { $items.css("max-height", $items[0].scrollHeight + "px"); });
	}

	_append_ni(item, $container) {
		const is_cur =
			frappe.router.slug(item.title) === frappe.router.slug(this.get_page_to_show().name) &&
			item.public === this.get_page_to_show().public;

		item.selected = is_cur;
		if (is_cur) this.current_page = { name: item.title, public: item.public };

		const pages    = item.public ? this.public_pages : this.private_pages;
		const children = pages.filter((p) => p.parent_page === item.title);
		const hasCh    = children.length > 0;
		const dotColor = this.indicator_colors[Math.floor(Math.random() * this.indicator_colors.length)];

		const iconHtml = item.public
			? `<span style="font-size:13px">${item.icon ? frappe.utils.icon(item.icon, "sm") : "📁"}</span>`
			: `<span class="ws2-dot ${item.indicator_color || dotColor}"></span>`;

		const $wrap = $('<div class="ws2-ni-wrap"></div>');
		const $ni   = $(`
		<div class="ws2-ni ${is_cur ? "active" : ""}"
			 data-page="${item.title}" data-public="${item.public ? 1 : 0}">
			<span class="ws2-ni-ico">${iconHtml}</span>
			<span class="ws2-ni-lbl">${__(item.title)}</span>
			${hasCh ? `<span class="ws2-ni-arr">${I.chevRight}</span>` : ""}
		</div>
		`).appendTo($wrap);

		if (hasCh) {
			const $ch = $('<div class="ws2-children"></div>').appendTo($wrap);
			children.forEach((child) => {
				const cc  = this.indicator_colors[Math.floor(Math.random() * this.indicator_colors.length)];
				const $c  = $(`
				<div class="ws2-child">
					<span class="ws2-dot ${child.indicator_color || cc}"></span>
					<span>${__(child.title)}</span>
				</div>
				`);
				$c.on("click", (e) => {
					WSSounds.play("nav");
					addRipple(e.currentTarget, e);
					this._nav(child);
				});
				$ch.append($c);
			});

			$ni.on("click", (e) => {
				const open = $ni.hasClass("open");
				if (!open) {
					WSSounds.play("expand");
					$ni.addClass("open");
					$ch.addClass("open").css("max-height", $ch[0].scrollHeight + "px");
				} else {
					WSSounds.play("collapse");
					$ni.removeClass("open");
					$ch.removeClass("open").css("max-height", "0");
				}
				addRipple(e.currentTarget, e);
				this._nav(item);
			});
		} else {
			$ni.on("click", (e) => {
				WSSounds.play("nav");
				addRipple(e.currentTarget, e);
				this._nav(item);
			});
		}

		$container.append($wrap);
		this.sidebar_items[item.public ? "public" : "private"][item.title] = $ni;
	}

	_nav(item) {
		const route = item.public
			? frappe.router.slug(item.title)
			: "private/" + frappe.router.slug(item.title);
		frappe.set_route(route);
	}

	/* ── Show ───────────────────────────────────────────────────── */
	show() {
		if (!this.all_pages) { setTimeout(() => this.show(), 100); return; }
		const page = this.get_page_to_show();

		if (!frappe.router.current_route[0]) {
			frappe.route_flags.replace_route = true;
			frappe.set_route(frappe.router.slug(page.public ? page.name : "private/" + page.name));
			return;
		}

		this.page.set_title(__(page.name));
		this.update_selected_sidebar(this.current_page, false);
		this.update_selected_sidebar(page, true);
		this.show_page(page);
	}

	update_selected_sidebar(page, add) {
		const sec = page.public ? "public" : "private";
		if (this.sidebar_items[sec]?.[page.name]) {
			const $ni = this.sidebar_items[sec][page.name];
			const pages = page.public ? this.public_pages : this.private_pages;
			const sp    = pages.find((p) => p.title === page.name);

			if (add) {
				$ni.addClass("active");
				if (sp) sp.selected = true;
				this.current_page = { name: page.name, public: page.public };
				localStorage.current_page = page.name;
				localStorage.is_current_page_public = page.public;
			} else {
				$ni.removeClass("active");
				if (sp) sp.selected = false;
			}
		}
	}

	get_data(page) {
		return frappe.call("frappe.desk.desktop.get_desktop_page", { page })
			.then((data) => {
				this.page_data = data.message;
				this.pages[page.name] && delete this.pages[page.name];
				this.pages[page.name] = data.message;
				if (!this.page_data || !Object.keys(this.page_data).length) return;
				if (this.page_data.charts?.items?.length === 0) return;
				return frappe.dashboard_utils.get_dashboard_settings().then((settings) => {
					if (settings) {
						const cfg = settings.chart_config ? JSON.parse(settings.chart_config) : {};
						this.page_data.charts?.items?.forEach((c) => { c.chart_settings = cfg[c.chart_name] || {}; });
						this.pages[page.name] = this.page_data;
					}
				});
			});
	}

	get_page_to_show() {
		let def;
		if (frappe.boot.user.default_workspace) {
			def = { name: frappe.boot.user.default_workspace.title, public: frappe.boot.user.default_workspace.public };
		} else if (localStorage.current_page && this.all_pages.find((p) => p.title === localStorage.current_page)) {
			def = { name: localStorage.current_page, public: localStorage.is_current_page_public !== "false" };
		} else if (this.all_pages.length) {
			def = { name: this.all_pages[0].title, public: this.all_pages[0].public };
		} else {
			def = { name: "Build", public: true };
		}
		const route = frappe.get_route();
		const page  = (route[1] === "private" ? route[2] : route[1]) || def.name;
		const pub   = route[1] ? route[1] !== "private" : def.public;
		return { name: page, public: pub };
	}

	async show_page(page) {
		if (!this.all_pages.length) return;

		WSSounds.play("pageNav");

		const pages = page.public && this.public_pages.length ? this.public_pages : this.private_pages;
		const cur   = pages.find((p) => p.title === page.name);
		this._page   = cur;
		this.content = cur && JSON.parse(cur.content || "[]");

		this.content && this.add_custom_cards_in_content();

		if (this.pages?.[cur?.name]) {
			this.page_data = this.pages[cur.name];
		} else {
			await frappe.after_ajax(() => this.get_data(cur));
		}

		this.setup_actions(page);

		this.$content.find("#ws2-eyebrow").text(page.public ? __("Public Workspace") : __("Personal Workspace"));
		this.$content.find("#ws2-title").text(__(page.name));
		this.$content.find("#ws2-sub").text(cur?.description || "");

		this._render_sections(cur);
		this.prepare_editorjs();
		this._close_panel();
	}

	add_custom_cards_in_content() {
		let idx = -1;
		this.content.forEach?.((item, i) => { if (item.type === "card") idx = i; });
		if (idx !== -1) {
			this.content.splice(idx + 1, 0, { type: "card", data: { card_name: "Custom Documents", col: 4 } });
			this.content.splice(idx + 2, 0, { type: "card", data: { card_name: "Custom Reports",   col: 4 } });
		}
	}

	prepare_editorjs() {
		if (this.editor) {
			this.editor.isReady.then(() => {
				["chart","shortcut","card","onboarding","quick_list","number_card","custom_block"].forEach((t) => {
					if (this.editor.configuration.tools[t]) {
						this.editor.configuration.tools[t].config.page_data = this.page_data;
					}
				});
				this.editor.render({ blocks: this.content || [] });
			});
		} else {
			this.initialize_editorjs(this.content);
		}
	}

	/* ── Actions / toolbar ──────────────────────────────────────── */
	setup_actions(page) {
		const pages = page.public ? this.public_pages : this.private_pages;
		const cur   = pages.find((p) => p.title === page.name);

		if (!this.is_read_only) { this.setup_customization_buttons(cur); return; }

		this._hide_toolbar();
		this.clear_page_actions();

		const $edit = this.$sidebar.find("#ws2-btn-edit");
		const $new  = this.$sidebar.find("#ws2-btn-new");
		cur?.is_editable         ? $edit.show() : $edit.hide();
		this.has_create_access   ? $new.show()  : $new.hide();
	}

	_show_toolbar() { this.$toolbar.addClass("show"); }
	_hide_toolbar() { this.$toolbar.removeClass("show"); }

	initialize_editorjs_undo() {
		this.undo = new Undo({ editor: this.editor });
		this.undo.initialize({ blocks: this.content || [] });
		this.undo.readOnly = false;
	}

	clear_page_actions() {
		this.page.clear_primary_action();
		this.page.clear_secondary_action();
		this.page.clear_inner_toolbar();
	}

	setup_customization_buttons() { this._show_toolbar(); }

	toggle_hidden_workspaces(show) {
		this.$sidebar.toggleClass("show-hidden-workspaces", show);
	}

	show_sidebar_actions() {
		this.sidebar.find(".ws2-nav-section").addClass("show-control");
		this.make_sidebar_sortable();
	}

	/* ── Sortable ───────────────────────────────────────────────── */
	make_sidebar_sortable() {
		this.$sidebar.find(".ws2-section-items").each(function () {
			new Sortable(this, {
				handle:    ".ws2-ni",
				draggable: ".ws2-ni-wrap",
				group:     "ws2-nested",
				animation: 160,
			});
		});
	}

	make_blocks_sortable() {
		this.page_sortable = Sortable.create(
			this.$content.find(".codex-editor__redactor").get(0),
			{
				handle:    ".drag-handle",
				draggable: ".ce-block",
				animation: 150,
				onEnd:     (evt) => { this.editor.blocks.move(evt.newIndex, evt.oldIndex); },
				setData:   () => {},
			}
		);
	}

	/* ── Skeletons ──────────────────────────────────────────────── */
	_show_sidebar_skel() {
		this.sidebar.html(`
			<div style="padding:8px">
				${[1,2,3,4,5].map((_,i) => `
					<div class="ws2-skel" style="height:30px;border-radius:6px;margin-bottom:4px;opacity:${1-i*0.15}"></div>
				`).join("")}
			</div>
		`);
	}

	create_page_skeleton()    {}
	remove_page_skeleton()    {}
	create_sidebar_skeleton() {}
	remove_sidebar_skeleton() {}

	/* ── EditorJS ───────────────────────────────────────────────── */
	initialize_editorjs(blocks) {
		this.tools = {
			header:       { class: this.blocks["header"],       inlineToolbar: ["HeaderSize","bold","italic","link"], config: { default_size: 4 } },
			paragraph:    { class: this.blocks["paragraph"],    inlineToolbar: ["HeaderSize","bold","italic","link"], config: { placeholder: __("Choose a block or continue typing") } },
			chart:        { class: this.blocks["chart"],        config: { page_data: this.page_data || [] } },
			card:         { class: this.blocks["card"],         config: { page_data: this.page_data || [] } },
			shortcut:     { class: this.blocks["shortcut"],     config: { page_data: this.page_data || [] } },
			onboarding:   { class: this.blocks["onboarding"],   config: { page_data: this.page_data || [] } },
			quick_list:   { class: this.blocks["quick_list"],   config: { page_data: this.page_data || [] } },
			number_card:  { class: this.blocks["number_card"],  config: { page_data: this.page_data || [] } },
			custom_block: { class: this.blocks["custom_block"], config: { page_data: this.page_data || [] } },
			spacer:       this.blocks["spacer"],
			HeaderSize:   frappe.workspace_block.tunes["header_size"],
		};

		this.editor = new EditorJS({
			holder:   "editorjs",
			data:     { blocks: blocks || [] },
			tools:    this.tools,
			autofocus: false,
			readOnly:  true,
			logLevel: "ERROR",
		});
	}

	/* ── Save ───────────────────────────────────────────────────── */
	save_page(page) {
		const me = this;
		this.current_page = { name: page.title, public: page.public };

		return this.editor.save().then((out) => {
			const new_widgets = {};
			out.blocks.forEach((item) => {
				if (item.data.new) {
					if (!new_widgets[item.type]) new_widgets[item.type] = [];
					new_widgets[item.type].push(item.data.new);
					delete item.data["new"];
				}
			});

			const blocks = out.blocks.filter(
				(b) => b.type !== "card" || !["Custom Documents","Custom Reports"].includes(b.data.card_name)
			);

			if (page.content === JSON.stringify(blocks) && !Object.keys(new_widgets).length) {
				frappe.show_alert({ message: __("No changes made on the page"), indicator: "warning" });
				return false;
			}

			page.content = JSON.stringify(blocks);
			frappe.call({
				method: "frappe.desk.doctype.workspace.workspace.save_page",
				args:   { title: page.title, public: page.public || 0, new_widgets, blocks: JSON.stringify(blocks) },
				callback(res) {
					if (res.message) {
						me.discard = true;
						me.update_cached_values(page, page);
						me.reload();
						frappe.show_alert({ message: __("Page Saved Successfully"), indicator: "green" });
					}
				},
			});
			return true;
		}).catch(() => {});
	}

	reload() {
		this.sorted_public_items  = [];
		this.sorted_private_items = [];
		this.setup_pages(true);
		this.discard = false;
		this.undo && (this.undo.readOnly = true);
	}

	/* ── Compatibility stubs ────────────────────────────────────── */
	sidebar_item_container() { return $("<div></div>"); }
	add_sidebar_actions()   {}

	get_parent_pages(page) {
		this.public_parent_pages  = ["", ...this.public_pages.filter((p) => !p.parent_page).map((p) => p.title)];
		this.private_parent_pages = ["", ...this.private_pages.filter((p) => !p.parent_page).map((p) => p.title)];
		if (page) return page.public ? this.public_parent_pages : this.private_parent_pages;
	}

	update_cached_values(old_item, new_item, duplicate, new_page) {
		const [from_pages, to_pages] = old_item.public
			? [this.public_pages, this.private_pages]
			: [this.private_pages, this.public_pages];

		let idx = from_pages.findIndex((p) => p.title === old_item.title);
		if (duplicate) idx++;

		if (frappe.workspaces[frappe.router.slug(old_item.name)] || new_page) {
			!duplicate && delete frappe.workspaces[frappe.router.slug(old_item.name)];
			if (new_item) frappe.workspaces[frappe.router.slug(new_item.name)] = { title: new_item.title };
		}

		if (this.pages?.[old_item.name] || new_page) {
			if (new_item) this.pages[new_item.name] = this.pages[old_item.name] || {};
			!duplicate && delete this.pages[old_item.name];
		}

		if (new_item) {
			const sec_changed = old_item.public !== (new_item.is_public || new_item.public || 0);
			if (sec_changed) { !duplicate && from_pages.splice(idx, 1); to_pages.push(new_item); }
			else if (new_page) from_pages.push(new_item);
			else from_pages.splice(idx, duplicate ? 0 : 1, new_item);
		} else {
			from_pages.splice(idx, 1);
		}

		this.sidebar_pages.pages = [...this.public_pages, ...this.private_pages];
		this.cached_pages = this.sidebar_pages;
	}

	validate_page(new_page, old_page) {
		let msg = "";
		const to_pages   = new_page.is_public ? this.public_pages  : this.private_pages;
		const from_pages = new_page.is_public ? this.private_pages : this.public_pages;

		if (to_pages?.find((p) => p.title === new_page.title))
			msg = __("Page with title {0} already exist.", [new_page.title.bold()]);

		if (frappe.router.doctype_route_exist(frappe.router.slug(new_page.title)))
			msg = __("Doctype with same route already exist. Please choose different title.");

		const child_pages = old_page && from_pages.filter((p) => p.parent_page === old_page.title);
		child_pages?.every((cp) => {
			if (to_pages?.find((p) => p.title === cp.title)) {
				msg = __("Child page {0} already exists in target section.", [cp.title.bold()]);
				cur_dialog?.hide();
				return false;
			}
			return true;
		});

		if (msg) { frappe.throw(msg); return false; }
		return true;
	}

	initialize_new_page() {
		const me = this;
		this.get_parent_pages();
		const d = new frappe.ui.Dialog({
			title: __("New Workspace"),
			fields: [
				{ label: __("Title"),  fieldtype: "Data",   fieldname: "title",  reqd: 1 },
				{ label: __("Parent"), fieldtype: "Select", fieldname: "parent", options: this.private_parent_pages },
				{
					label: __("Public"), fieldtype: "Check", fieldname: "is_public",
					depends_on: `eval:${this.has_access}`,
					onchange() {
						d.set_df_property("parent", "options", this.get_value() ? me.public_parent_pages : me.private_parent_pages);
						d.set_df_property("icon",            "hidden", this.get_value() ? 0 : 1);
						d.set_df_property("indicator_color", "hidden", this.get_value() ? 1 : 0);
					},
				},
				{ fieldtype: "Column Break" },
				{ label: __("Icon"),             fieldtype: "Icon",   fieldname: "icon",             hidden: 1 },
				{ label: __("Indicator color"),  fieldtype: "Select", fieldname: "indicator_color",  options: this.indicator_colors },
			],
			primary_action_label: __("Create"),
			primary_action: (values) => {
				values.title = strip_html(values.title);
				if (!this.validate_page(values)) return;
				d.hide();
				this.initialize_editorjs_undo();
				this.setup_customization_buttons({ is_editable: true });

				const name   = values.title + (values.is_public ? "" : "-" + frappe.session.user);
				const blocks = [{ type: "header", data: { text: values.title } }];

				const new_page = {
					content: JSON.stringify(blocks), name, label: name,
					title: values.title, public: values.is_public || 0,
					for_user: values.is_public ? "" : frappe.session.user,
					icon: values.icon, indicator_color: values.indicator_color,
					parent_page: values.parent || "", is_editable: true, selected: true,
				};

				this.editor.render({ blocks }).then(async () => {
					if (this.editor.configuration.readOnly) {
						this.is_read_only = false;
						await this.editor.readOnly.toggle();
					}

					frappe.call({
						method: "frappe.desk.doctype.workspace.workspace.new_page",
						args:   { new_page },
						callback(res) {
							if (res.message) {
								frappe.show_alert({
									message: __("Workspace {0} Created Successfully", [new_page.title.bold()]),
									indicator: "green",
								});
							}
						},
					});

					this.update_cached_values(new_page, new_page, true, true);
					frappe.set_route((new_page.public ? "" : "private/") + frappe.router.slug(new_page.title));
					this.make_sidebar();
					this.show_sidebar_actions();
					localStorage.setItem("new_workspace", JSON.stringify(new_page));
				});
			},
		});
		d.show();
	}

	/* ── Keyboard shortcuts ─────────────────────────────────────── */
	register_awesomebar_shortcut() {
		"abcdefghijklmnopqrstuvwxyz".split("").forEach((l) => {
			const def = { action: () => { $("#navbar-search").focus(); return false; }, page: this.page };
			frappe.ui.keys.add_shortcut({ shortcut: l,            ...def });
			frappe.ui.keys.add_shortcut({ shortcut: `shift+${l}`, ...def });
		});
	}
};