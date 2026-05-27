import * as GaussianSplats3D from "gaussian-splat-renderer-for-lam"

const div = document.getElementById('LAM_WebRender') as HTMLDivElement;

function getChatState() { return "Idle"; }

let frame = 0;
function getExpressionData() {
  frame++;
  const bs: Record<string, number> = {};
  
  // Force eyes hard right — should be immediately visible
  bs["eyeLookOutLeft"] = 1.0;
  bs["eyeLookInRight"] = 1.0;
  
  // Force big smile
  bs["mouthSmileLeft"] = 0.8;
  bs["mouthSmileRight"] = 0.8;
  
  // Force one brow up
  bs["browOuterUpLeft"] = 0.7;
  
  return bs;
}

async function init() {
  await GaussianSplats3D.GaussianSplatRenderer.getInstance(
    div,
    './andres.zip',
    {
      getChatState,
      getExpressionData,
      backgroundColor: "0x0e0e14",
      alpha: 1.0,
    },
  );
}

init();
