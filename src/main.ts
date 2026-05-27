import * as GaussianSplats3D from "gaussian-splat-renderer-for-lam"

const div = document.getElementById('LAM_WebRender') as HTMLDivElement;
const params = new URLSearchParams(window.location.search);
const assetPath = params.get('zip') || './andres.zip';

let mouseClientX = 0;
let mouseClientY = 0;
let isOnPage = false;
let flyReaction = 0;
let blinkValue = 0;
let nextBlinkTime = randomBlinkDelay();
let isOnHead = false;
let hitCheckCounter = 0;

function randomBlinkDelay(): number {
  return performance.now() + 2000 + Math.random() * 5000;
}

document.addEventListener('mousemove', (e) => {
  mouseClientX = e.clientX;
  mouseClientY = e.clientY;
  isOnPage = true;
});

document.addEventListener('mouseleave', () => {
  isOnPage = false;
});

function checkMouseOnHead(): boolean {
  const canvas = div.querySelector('canvas');
  if (!canvas) return false;

  // Get the EXISTING WebGL context (don't request a new one)
  const gl = (canvas as any).__gl
    || (canvas as any).getContext('webgl2')
    || (canvas as any).getContext('webgl');
  if (!gl) return false;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((mouseClientX - rect.left) * dpr);
  const y = Math.floor((rect.height - (mouseClientY - rect.top)) * dpr);

  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return false;

  const pixel = new Uint8Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  // Background is 0x0e0e14 = (14, 14, 20). Anything significantly different is a splat.
  const diff = Math.abs(pixel[0] - 14) + Math.abs(pixel[1] - 14) + Math.abs(pixel[2] - 20);
  return diff > 30;
}

function getChatState() {
  return "Idle";
}

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();

  // Check hit every 3rd frame — we're inside the render loop so framebuffer is valid
  hitCheckCounter++;
  if (hitCheckCounter % 3 === 0) {
    isOnHead = isOnPage && checkMouseOnHead();
  }
  if (!isOnPage) isOnHead = false;

  const ndcX = (mouseClientX / window.innerWidth) * 2 - 1;
  const ndcY = -((mouseClientY / window.innerHeight) * 2 - 1);

  // --- Eyes follow mouse ---
  bs["eyeLookInLeft"] = Math.max(0, -ndcX);
  bs["eyeLookOutLeft"] = Math.max(0, ndcX);
  bs["eyeLookInRight"] = Math.max(0, ndcX);
  bs["eyeLookOutRight"] = Math.max(0, -ndcX);
  bs["eyeLookUpLeft"] = Math.max(0, ndcY) * 0.8;
  bs["eyeLookUpRight"] = Math.max(0, ndcY) * 0.8;
  bs["eyeLookDownLeft"] = Math.max(0, -ndcY) * 0.8;
  bs["eyeLookDownRight"] = Math.max(0, -ndcY) * 0.8;

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

  // --- Fly-on-face: BIG reaction ---
  const target = isOnHead ? 1 : 0;
  flyReaction += (target - flyReaction) * 0.1;

  if (flyReaction > 0.05) {
    const f = flyReaction;
    bs["eyeWideLeft"] = f * 0.5;
    bs["eyeWideRight"] = f * 0.4;
    bs["eyeSquintLeft"] = 0.08 + f * 0.3;
    bs["eyeSquintRight"] = f * 0.25;
    bs["noseSneerLeft"] = 0.05 + f * 0.7;
    bs["noseSneerRight"] = f * 0.6;
    bs["mouthUpperUpLeft"] = f * 0.5;
    bs["mouthUpperUpRight"] = f * 0.35;
    bs["mouthPressLeft"] = 0.06 + f * 0.35;
    bs["mouthPressRight"] = f * 0.2;
    bs["browDownLeft"] = 0.12 + f * 0.5;
    bs["browDownRight"] = f * 0.2;
    bs["browOuterUpRight"] = 0.15 + f * 0.45;
    bs["browInnerUp"] = f * 0.35;
    bs["cheekPuff"] = f * 0.2;
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
