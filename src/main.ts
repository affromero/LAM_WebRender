import * as GaussianSplats3D from "gaussian-splat-renderer-for-lam"

const div = document.getElementById('LAM_WebRender') as HTMLDivElement;
const params = new URLSearchParams(window.location.search);
const assetPath = params.get('zip') || './andres.zip';

let mouseX = 0;
let mouseY = 0;
let isOnPage = false;
let isOnHead = false;
let flyReaction = 0;
let blinkValue = 0;
let nextBlinkTime = randomBlinkDelay();
let glContext: WebGLRenderingContext | WebGL2RenderingContext | null = null;

function randomBlinkDelay(): number {
  return performance.now() + 2000 + Math.random() * 5000;
}

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  isOnPage = true;
});

document.addEventListener('mouseleave', () => {
  isOnPage = false;
  isOnHead = false;
  mouseX = 0;
  mouseY = 0;
});

function getGLContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
  if (glContext) return glContext;
  const canvas = div.querySelector('canvas');
  if (!canvas) return null;
  glContext = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
    || canvas.getContext('webgl', { preserveDrawingBuffer: true });
  return glContext;
}

function checkMouseOnHead(e?: MouseEvent): boolean {
  const gl = getGLContext();
  if (!gl) return false;

  const dpr = window.devicePixelRatio || 1;
  const x = (e ? e.clientX : (mouseX + 1) / 2 * window.innerWidth) * dpr;
  const y = (e ? (window.innerHeight - e.clientY) : (mouseY + 1) / 2 * window.innerHeight) * dpr;

  const pixel = new Uint8Array(4);
  gl.readPixels(Math.floor(x), Math.floor(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  const bgR = 14, bgG = 14, bgB = 20;
  const diff = Math.abs(pixel[0] - bgR) + Math.abs(pixel[1] - bgG) + Math.abs(pixel[2] - bgB);
  return diff > 40;
}

document.addEventListener('click', (e) => {
  const hit = checkMouseOnHead(e);
  console.log('click hit:', hit, 'at', e.clientX, e.clientY);
});

let hitCheckCounter = 0;

function getChatState() {
  return "Idle";
}

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();

  hitCheckCounter++;
  if (hitCheckCounter % 5 === 0 && isOnPage) {
    isOnHead = checkMouseOnHead();
  }
  if (!isOnPage) {
    isOnHead = false;
  }

  // --- Eyes follow mouse (always) ---
  const yaw = mouseX;
  const pitch = mouseY;

  bs["eyeLookInLeft"] = Math.max(0, -yaw);
  bs["eyeLookOutLeft"] = Math.max(0, yaw);
  bs["eyeLookInRight"] = Math.max(0, yaw);
  bs["eyeLookOutRight"] = Math.max(0, -yaw);

  bs["eyeLookUpLeft"] = Math.max(0, pitch) * 0.8;
  bs["eyeLookUpRight"] = Math.max(0, pitch) * 0.8;
  bs["eyeLookDownLeft"] = Math.max(0, -pitch) * 0.8;
  bs["eyeLookDownRight"] = Math.max(0, -pitch) * 0.8;

  // --- Blink (always) ---
  if (now > nextBlinkTime) {
    const blinkDuration = 150;
    const elapsed = now - nextBlinkTime;
    if (elapsed < blinkDuration) {
      blinkValue = Math.sin((elapsed / blinkDuration) * Math.PI);
    } else {
      blinkValue = 0;
      nextBlinkTime = randomBlinkDelay();
    }
  }
  bs["eyeBlinkLeft"] = blinkValue;
  bs["eyeBlinkRight"] = blinkValue;

  // --- Subtle resting "really?" expression ---
  bs["browDownLeft"] = 0.12;
  bs["browOuterUpRight"] = 0.15;
  bs["eyeSquintLeft"] = 0.08;
  bs["mouthPressLeft"] = 0.06;
  bs["noseSneerLeft"] = 0.05;

  // --- Fly-on-face reaction (only when cursor is on the head) ---
  const targetFly = isOnHead ? 1 : 0;
  flyReaction += (targetFly - flyReaction) * 0.08;

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
