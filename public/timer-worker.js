/**
 * FocusEngine timer worker.
 *
 * setInterval on the main thread is throttled (and sometimes fully
 * suspended) by browsers once a tab is backgrounded, which makes naive
 * "add 1000ms per tick" counters drift by seconds-to-minutes over a long
 * study session. Workers are throttled far less aggressively, and more
 * importantly, this worker never trusts its own tick count — every tick it
 * reports wall-clock `now` (Date.now()) so the main thread can always
 * compute elapsed = now - segmentStartedAt. Drift in the *scheduling* of
 * ticks doesn't matter; only drift in the *reported timestamp* would, and
 * Date.now() has none.
 */

let intervalId = null;
const TICK_MS = 100; // 10Hz is plenty for a 10ms-precision display

function startTicking() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    self.postMessage({ type: "TICK", payload: { now: Date.now() } });
  }, TICK_MS);
}

function stopTicking() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

self.onmessage = (event) => {
  const command = event.data;
  switch (command.type) {
    case "START":
      startTicking();
      break;
    case "STOP":
      stopTicking();
      break;
    case "SYNC":
      // no-op: main thread resyncs itself from Date.now() on receipt;
      // this exists so the protocol is extensible without a worker rewrite.
      break;
    default:
      break;
  }
};
