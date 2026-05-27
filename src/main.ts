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
let rendererInstance: any = null;
let isOnHead = false;
let hitCheckCounter = 0;

// Screen-space bounding box of the head, updated from splat projections
let headBounds = { minX: -0.3, maxX: 0.3, minY: -0.4, maxY: 0.4 };
let boundsCalibrated = false;

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
});

function calibrateHeadBounds() {
  if (boundsCalibrated || !rendererInstance?.viewer) return;
  const viewer = rendererInstance.viewer;
  const camera = viewer.camera;
  const splatMesh = viewer.splatMesh;
  if (!camera || !splatMesh) return;

  const count = splatMesh.getSplatCount?.();
  if (!count || count === 0) return;

  const mvp = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
  const e = mvp.elements;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let projected = 0;

  // Sample every 20th splat to find bounding box in screen space
  const step = Math.max(1, Math.floor(count / 500));
  const center = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < count; i += step) {
    try {
      splatMesh.getSplatCenter(i, center);
    } catch {
      continue;
    }
    const cx = center.x, cy = center.y, cz = center.z;
    const w = e[3] * cx + e[7] * cy + e[11] * cz + e[15];
    if (w <= 0.001) continue;
    const sx = (e[0] * cx + e[4] * cy + e[8] * cz + e[12]) / w;
    const sy = (e[1] * cx + e[5] * cy + e[9] * cz + e[13]) / w;
    if (sx < -2 || sx > 2 || sy < -2 || sy > 2) continue;

    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
    projected++;
  }

  if (projected > 10) {
    // Shrink bounds to ~70% to exclude outlier splats (hair edges etc)
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const hw = (maxX - minX) / 2 * 0.6;
    const hh = (maxY - minY) / 2 * 0.55;
    headBounds = { minX: cx - hw, maxX: cx + hw, minY: cy - hh, maxY: cy + hh };
    boundsCalibrated = true;
    console.log("Head bounds calibrated:", headBounds, `(${projected} splats sampled)`);
  }
}

function checkMouseOnHead(): boolean {
  if (!boundsCalibrated) return false;
  return mouseNdcX >= headBounds.minX && mouseNdcX <= headBounds.maxX &&
         mouseNdcY >= headBounds.minY && mouseNdcY <= headBounds.maxY;
}

function getChatState() {
  return "Idle";
}

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();

  hitCheckCounter++;
  if (!boundsCalibrated && hitCheckCounter % 30 === 0) {
    calibrateHeadBounds();
  }

  if (isOnPage) {
    isOnHead = checkMouseOnHead();
  } else {
    isOnHead = false;
  }

  const ndcX = mouseNdcX;
  const ndcY = mouseNdcY;

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
