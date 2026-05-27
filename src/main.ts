import * as GaussianSplats3D from "gaussian-splat-renderer-for-lam"

const div = document.getElementById('LAM_WebRender') as HTMLDivElement;
const params = new URLSearchParams(window.location.search);
const assetPath = params.get('zip') || './andres.zip';

let mouseNdcX = 0;
let mouseNdcY = 0;
let isOnPage = false;
let isOnHead = false;
let flyReaction = 0;
let blinkValue = 0;
let nextBlinkTime = randomBlinkDelay();
let rendererInstance: any = null;

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
  isOnHead = false;
  mouseNdcX = 0;
  mouseNdcY = 0;
});

function checkMouseOnHead(): boolean {
  if (!rendererInstance?.viewer?.camera) return false;

  const camera = rendererInstance.viewer.camera;
  const headCenter = { x: 0, y: 0, z: 0 };

  const cx = headCenter.x, cy = headCenter.y, cz = headCenter.z;
  const mvp = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
  const e = mvp.elements;
  const w = e[3] * cx + e[7] * cy + e[11] * cz + e[15];
  if (w <= 0) return false;
  const screenX = (e[0] * cx + e[4] * cy + e[8] * cz + e[12]) / w;
  const screenY = (e[1] * cx + e[5] * cy + e[9] * cz + e[13]) / w;

  const dx = mouseNdcX - screenX;
  const dy = mouseNdcY - screenY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const headScreenRadius = 0.35;
  return dist < headScreenRadius;
}

function getChatState() {
  return "Idle";
}

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();

  if (isOnPage) {
    isOnHead = checkMouseOnHead();
  } else {
    isOnHead = false;
  }

  // --- Eyes follow mouse (always) ---
  const yaw = mouseNdcX;
  const pitch = mouseNdcY;

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

  // --- Subtle resting expression ---
  bs["browDownLeft"] = 0.12;
  bs["browOuterUpRight"] = 0.15;
  bs["eyeSquintLeft"] = 0.08;
  bs["mouthPressLeft"] = 0.06;
  bs["noseSneerLeft"] = 0.05;

  // --- Fly-on-face reaction ---
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
  rendererInstance = await GaussianSplats3D.GaussianSplatRenderer.getInstance(
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
