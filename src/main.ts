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
let rendererInstance: any = null;
let splatRaycaster: any = null;
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

let debugCounter = 0;

function checkMouseOnHead(): boolean {
  if (!rendererInstance?.viewer) { if (debugCounter++ < 3) console.log("no viewer"); return false; }
  const viewer = rendererInstance.viewer;
  const camera = viewer.camera;
  const splatMesh = viewer.splatMesh;
  if (!camera) { if (debugCounter++ < 3) console.log("no camera"); return false; }
  if (!splatMesh) { if (debugCounter++ < 3) console.log("no splatMesh"); return false; }

  const splatTree = splatMesh.getSplatTree?.();
  if (!splatTree) { if (debugCounter++ < 5) console.log("no splatTree"); return false; }

  if (!splatRaycaster) {
    splatRaycaster = new (GaussianSplats3D as any).Raycaster();
    console.log("Raycaster created:", splatRaycaster);
  }

  splatRaycaster.setFromCameraAndScreenPosition(
    camera,
    { x: mouseClientX, y: mouseClientY },
    { x: window.innerWidth, y: window.innerHeight }
  );

  const hits: any[] = [];
  splatRaycaster.intersectSplatMesh(splatMesh, hits);
  if (debugCounter < 10 && hits.length > 0) {
    console.log("HIT!", hits.length, "splats at", mouseClientX, mouseClientY);
    debugCounter = 100;
  }
  return hits.length > 0;
}

function getChatState() {
  return "Idle";
}

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();

  hitCheckCounter++;
  if (hitCheckCounter === 1) console.log("getExpressionData called, isOnPage:", isOnPage);
  if (hitCheckCounter % 4 === 0 && isOnPage) {
    const prev = isOnHead;
    isOnHead = checkMouseOnHead();
    if (isOnHead !== prev) console.log("isOnHead changed:", isOnHead);
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
  console.log("init starting...");
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

init().then(() => console.log("init complete, renderer:", !!rendererInstance)).catch(e => console.error("init failed:", e));
