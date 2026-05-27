import * as GaussianSplats3D from "gaussian-splat-renderer-for-lam"

const div = document.getElementById('LAM_WebRender') as HTMLDivElement;
const params = new URLSearchParams(window.location.search);
const assetPath = params.get('zip') || './andres.zip';

let mouseX = 0;
let mouseY = 0;
let isOnPage = true;
let blinkValue = 0;
let nextBlinkTime = randomBlinkDelay();

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
  mouseX = 0;
  mouseY = 0;
});

function getChatState() {
  return "Idle";
}

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();

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

  const faceCenterX = 0;
  const faceCenterY = 0.15;
  const faceRadius = 0.18;
  const dx = mouseX - faceCenterX;
  const dy = mouseY - faceCenterY;
  const distToFace = Math.sqrt(dx * dx + dy * dy);
  const onFace = isOnPage && distToFace < faceRadius;

  if (onFace) {
    const intensity = 1 - distToFace / faceRadius;
    bs["jawOpen"] = intensity * 0.3;
    bs["mouthFunnel"] = intensity * 0.15;
    bs["noseSneerLeft"] = intensity * 0.25;
    bs["noseSneerRight"] = intensity * 0.25;
    bs["browInnerUp"] = intensity * 0.4;
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
