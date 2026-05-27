import * as GaussianSplats3D from "gaussian-splat-renderer-for-lam"

const div = document.getElementById('LAM_WebRender') as HTMLDivElement;
const params = new URLSearchParams(window.location.search);
const assetPath = params.get('zip') || './andres.zip';

let mouseNdcX = 0;
let mouseNdcY = 0;
let isOnPage = false;
let flyReaction = 0;
let blinkValue = 0;
let nextBlinkTime = randomBlinkDelay();

// Head center in NDC — calibrated to where the head actually appears on screen.
// The renderer's camera sits at y=1.8 looking forward, so the head renders
// roughly centered horizontally and slightly above vertical center.
const HEAD_CENTER_X = 0;
const HEAD_CENTER_Y = 0.1;
const HEAD_RADIUS = 0.22;

function randomBlinkDelay(): number {
  return performance.now() + 2000 + Math.random() * 5000;
}

document.addEventListener('mousemove', (e) => {
  mouseNdcX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNdcY = -((e.clientY / window.innerHeight) * 2 - 1);
  isOnPage = true;
});

document.addEventListener('mouseleave', () => {
  isOnPage = false;
  mouseNdcX = 0;
  mouseNdcY = 0;
});

function isMouseOnHead(): boolean {
  if (!isOnPage) return false;
  const dx = mouseNdcX - HEAD_CENTER_X;
  const dy = mouseNdcY - HEAD_CENTER_Y;
  return (dx * dx + dy * dy) < HEAD_RADIUS * HEAD_RADIUS;
}

function getChatState() {
  return "Idle";
}

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();
  const onHead = isMouseOnHead();

  // --- Eyes follow mouse ---
  bs["eyeLookInLeft"] = Math.max(0, -mouseNdcX);
  bs["eyeLookOutLeft"] = Math.max(0, mouseNdcX);
  bs["eyeLookInRight"] = Math.max(0, mouseNdcX);
  bs["eyeLookOutRight"] = Math.max(0, -mouseNdcX);
  bs["eyeLookUpLeft"] = Math.max(0, mouseNdcY) * 0.8;
  bs["eyeLookUpRight"] = Math.max(0, mouseNdcY) * 0.8;
  bs["eyeLookDownLeft"] = Math.max(0, -mouseNdcY) * 0.8;
  bs["eyeLookDownRight"] = Math.max(0, -mouseNdcY) * 0.8;

  // --- Blink ---
  if (now > nextBlinkTime) {
    const elapsed = now - nextBlinkTime;
    if (elapsed < 150) {
      blinkValue = Math.sin((elapsed / 150) * Math.PI);
    } else {
      blinkValue = 0;
      nextBlinkTime = randomBlinkDelay();
    }
  }
  bs["eyeBlinkLeft"] = blinkValue;
  bs["eyeBlinkRight"] = blinkValue;

  // --- Subtle resting expression ---
  bs["browDownLeft"] = 0.12;
  bs["browOuterUpRight"] = 0.15;
  bs["eyeSquintLeft"] = 0.08;
  bs["mouthPressLeft"] = 0.06;
  bs["noseSneerLeft"] = 0.05;

  // --- Fly-on-face: smooth in/out ---
  const target = onHead ? 1 : 0;
  flyReaction += (target - flyReaction) * 0.08;

  if (flyReaction > 0.05) {
    const f = flyReaction;
    bs["eyeSquintLeft"] = 0.08 + f * 0.55;
    bs["eyeSquintRight"] = f * 0.45;
    bs["noseSneerLeft"] = 0.05 + f * 0.5;
    bs["noseSneerRight"] = f * 0.4;
    bs["mouthUpperUpLeft"] = f * 0.35;
    bs["mouthUpperUpRight"] = f * 0.2;
    bs["mouthPressLeft"] = 0.06 + f * 0.25;
    bs["browDownLeft"] = 0.12 + f * 0.3;
    bs["browDownRight"] = f * 0.3;
    bs["browInnerUp"] = f * 0.2;
  }

  return bs;
}

async function init() {
  await GaussianSplats3D.GaussianSplatRenderer.getInstance(
    div,
    assetPath,
    {
      getChatState,
      getExpressionData,
      backgroundColor: "0x0e0e14",
      alpha: 1.0,
    },
  );
}

init();
