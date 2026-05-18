import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { getRouteSpan } from '../context.js';

// Session-level behavioral state. Persists across route changes intentionally —
// paste_ratio and interaction_rate_60s are session characteristics, not per-page.
// mouse_entropy is continuously updated on the current route span.
const state = {
  firstInteractionReported: false,
  pasteCount: 0,
  typedCount: 0,
  interactionCount: 0,
  rate60sReported: false,
  mouseSamples: [] as number[],
  lastMouseX: -1,
  lastMouseY: -1,
  lastMouseTime: -1,
};

function onInteraction(): void {
  state.interactionCount++;
  if (state.firstInteractionReported) return;
  state.firstInteractionReported = true;
  const ms = Math.round(performance.now());
  getRouteSpan()?.setAttribute('ux.session.time_to_first_interaction_ms', ms);
}

function flushPasteRatio(): void {
  const total = state.pasteCount + state.typedCount;
  if (total === 0) return;
  const ratio = Math.round((state.pasteCount / total) * 100) / 100;
  getRouteSpan()?.setAttribute('ux.input.paste_ratio', ratio);
}

function sampleMouse(event: MouseEvent): void {
  const now = performance.now();
  if (state.lastMouseTime >= 0) {
    const dt = now - state.lastMouseTime;
    // Only sample at human timescales (10–200 ms). Outliers outside this window
    // are typically synthetic events or idle gaps — exclude them from entropy.
    if (dt >= 10 && dt <= 200) {
      const dx = event.clientX - state.lastMouseX;
      const dy = event.clientY - state.lastMouseY;
      const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
      state.mouseSamples.push(velocity);
      if (state.mouseSamples.length > 60) state.mouseSamples.shift();

      if (state.mouseSamples.length >= 10) {
        const entropy = varianceScore(state.mouseSamples);
        getRouteSpan()?.setAttribute('ux.interaction.mouse_entropy', entropy);
      }
    }
  }
  state.lastMouseX = event.clientX;
  state.lastMouseY = event.clientY;
  state.lastMouseTime = now;
}

// Normalise variance to a 0–1 score. Human cursor movement produces velocity
// variance in roughly the 0.001–0.015 (px/ms)² range due to Fitts's Law
// deceleration and biological tremor. Scripted movement clusters near 0.
// Cap at 0.02 to avoid outlier inflation.
function varianceScore(samples: number[]): number {
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length;
  return Math.round(Math.min(variance / 0.02, 1) * 100) / 100;
}

export function initBehavior(_config: ResolvedConfig): void {
  // Time to first interaction + interaction counter
  window.addEventListener('click', onInteraction, { capture: true });
  window.addEventListener('keydown', onInteraction, { capture: true });
  window.addEventListener('touchstart', onInteraction, { capture: true, passive: true });

  // Paste vs typed ratio — only counts characters in input/textarea fields
  window.addEventListener(
    'paste',
    (event) => {
      if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
      state.pasteCount++;
      flushPasteRatio();
    },
    { capture: true },
  );

  window.addEventListener(
    'keydown',
    (event) => {
      const t = event.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
      // Count single printable characters only — not modifier combos, arrows, etc.
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        state.typedCount++;
        flushPasteRatio();
      }
    },
    { capture: true },
  );

  // Mouse entropy — skip on touch-primary devices where mouse events are synthetic
  const isTouchPrimary =
    typeof navigator !== 'undefined' &&
    navigator.maxTouchPoints > 0 &&
    !window.matchMedia('(pointer: fine)').matches;

  if (!isTouchPrimary) {
    window.addEventListener('mousemove', sampleMouse, { capture: true, passive: true });
  }

  // Interaction rate in the first 60 s
  setTimeout(() => {
    if (state.rate60sReported) return;
    state.rate60sReported = true;
    getRouteSpan()?.setAttribute('ux.session.interaction_rate_60s', state.interactionCount);
  }, 60_000);
}
