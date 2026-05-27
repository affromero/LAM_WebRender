import * as GaussianSplats3D from "gaussian-splat-renderer-for-lam"

const div = document.getElementById('LAM_WebRender') as HTMLDivElement;
const params = new URLSearchParams(window.location.search);
const assetPath = params.get('zip') || './andres.zip';

let mouseX = 0;
let mouseY = 0;
let mousePixelX = 0;
let mousePixelY = 0;
let isOnPage = true;
let isOnHead = false;
let blinkValue = 0;
let nextBlinkTime = randomBlinkDelay();

function randomBlinkDelay(): number {
  return performance.now() + 2000 + Math.random() * 5000;
}

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  mousePixelX = e.clientX * (window.devicePixelRatio || 1);
  mousePixelY = (window.innerHeight - e.clientY) * (window.devicePixelRatio || 1);
  isOnPage = true;
});

document.addEventListener('mouseleave', () => {
  isOnPage = false;
  isOnHead = false;
  mouseX = 0;
  mouseY = 0;
});

function checkMouseOnHead(): boolean {
  const canvas = div.querySelector('canvas');
  if (!canvas) return false;
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return false;

  const pixel = new Uint8Array(4);
  gl.readPixels(
    Math.floor(mousePixelX),
    Math.floor(mousePixelY),
    1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel
  );

  const bgR = 14, bgG = 14, bgB = 20;
  const diff = Math.abs(pixel[0] - bgR) + Math.abs(pixel[1] - bgG) + Math.abs(pixel[2] - bgB);
  return diff > 30;
}

let hitCheckFrame = 0;

function getChatState() {
  return "Idle";
}

function getExpressionData() {
  const bs: Record<string, number> = {};
  const now = performance.now();

  hitCheckFrame++;
  if (hitCheckFrame % 3 === 0 && isOnPage) {
    isOnHead = checkMouseOnHead();
  }

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

  if (isOnHead) {
    bs["browDownLeft"] = 0.5;
    bs["browDownRight"] = 0.15;
    bs["browOuterUpRight"] = 0.5;
    bs["eyeSquintLeft"] = 0.4;
    bs["eyeSquintRight"] = 0.25;
    bs["noseSneerLeft"] = 0.45;
    bs["noseSneerRight"] = 0.3;
    bs["mouthLeft"] = 0.2;
    bs["mouthShrugUpper"] = 0.15;
    bs["mouthPressLeft"] = 0.3;
    bs["mouthPressRight"] = 0.15;
    bs["mouthUpperUpLeft"] = 0.25;
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
