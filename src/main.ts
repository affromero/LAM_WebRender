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

const FACE_CX = 0;
const FACE_CY = -0.05;
const FACE_RX = 0.18;
const FACE_RY = 0.15;

function isMouseOnFace(): boolean {
  if (!isOnPage) return false;
  const dx = (mouseNdcX - FACE_CX) / FACE_RX;
  const dy = (mouseNdcY - FACE_CY) / FACE_RY;
  return dx * dx + dy * dy < 1;
}

function getChatState() { return "Idle"; }

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();
  const onFace = isMouseOnFace();

  bs["eyeLookInLeft"] = Math.max(0, -mouseNdcX);
  bs["eyeLookOutLeft"] = Math.max(0, mouseNdcX);
  bs["eyeLookInRight"] = Math.max(0, mouseNdcX);
  bs["eyeLookOutRight"] = Math.max(0, -mouseNdcX);
  bs["eyeLookUpLeft"] = Math.max(0, mouseNdcY) * 0.8;
  bs["eyeLookUpRight"] = Math.max(0, mouseNdcY) * 0.8;
  bs["eyeLookDownLeft"] = Math.max(0, -mouseNdcY) * 0.8;
  bs["eyeLookDownRight"] = Math.max(0, -mouseNdcY) * 0.8;

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

  bs["browDownLeft"] = 0.12;
  bs["browOuterUpRight"] = 0.15;
  bs["eyeSquintLeft"] = 0.08;
  bs["mouthPressLeft"] = 0.06;
  bs["noseSneerLeft"] = 0.05;

  const target = onFace ? 1 : 0;
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
