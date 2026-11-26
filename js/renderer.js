// ============================================================================
// 각인된 악몽 2페이즈 - 유리지에 : "역사의 끝 (역사 칼날 패턴)"
// 인게임 와이드 아레나 · 패턴 이펙트 · 보스 및 캐릭터 렌더러
// ============================================================================
(() => {
'use strict';
window.Yurisie = window.Yurisie || {};

const CONFIG = {
  WIDTH: 1158,
  HEIGHT: 720,
  CENTER: [579, 465],
  BOSS_ANCHOR: [579, 228],
  BOUNDS: {
    left: -210,
    right: 1330,
    top: 275,
    bottom: 662
  },
  CAMERA_MAX_OFFSET: 420,
  CAMERA_LERP: 9.0,
  TAU: Math.PI * 2
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const ASSETS = {
  stageBg: loadImage('assets/arena_life.png'),
  arenaLife: loadImage('assets/arena_life.png'),
  arenaDeath: loadImage('assets/arena_death.png'),
  bossIllust: loadImage('assets/boss_illust.webp'),
  bossSheet: loadImage('assets/boss_sheet.png'),
  iconYurisie: loadImage('assets/icon_2740.png'),
  iconLargo: loadImage('assets/icon_2344.png'),
  iconDisaster: loadImage('assets/icon_2739.png'),
  iconFlowerBlue: loadImage('assets/icon_2570.png'),
  iconFlowerRed: loadImage('assets/icon_2571.png'),
  playerSheet: loadImage('assets/priest_sheet.png'),
  yurisCloneSheet: loadImage('assets/yuris_clone_sheet.png'),
  largoSheet: loadImage('assets/largo_sheet.png'),
  largoCutinSheet: loadImage('assets/largo_cutin_sheet.png'),
  flowerBlue: loadImage('assets/obj_flower_blue.png'),
  flowerRed: loadImage('assets/obj_flower_red.png'),
  vortex: loadImage('assets/obj_vortex.png'),
  meteor: loadImage('assets/obj_meteor.png'),
  blade: loadImage('assets/obj_blade.png'),
  chain: loadImage('assets/obj_chain.png'),
  shackle: loadImage('assets/obj_shackle.png'),
  motions: {
    idleWings: loadImage('assets/yurisie_motions/motion_idle_sword.png'),
    roarBurst: loadImage('assets/yurisie_motions/motion_tail_release.png'),
    spreadClaws: loadImage('assets/yurisie_motions/motion_spread_claws.png'),
    chargeGather: loadImage('assets/yurisie_motions/motion_charge_gather.png'),
    introClaws: loadImage('assets/yurisie_motions/motion_intro_claws.png'),
    twinCast: loadImage('assets/yurisie_motions/motion_dive_slash.png'),
    crossGuard: loadImage('assets/yurisie_motions/motion_spin_slash.png'),
    coilOrb: loadImage('assets/yurisie_motions/motion_coil_orb.png'),
    lowDash: loadImage('assets/yurisie_motions/motion_low_dash.png'),
    swordStance: loadImage('assets/yurisie_motions/motion_sword_stance.png')
  }
};

function isReady(img) {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

function getEnvelopeCenter(env, elapsed) {
  if (!env) return [...CONFIG.CENTER];
  if (Array.isArray(env.centerKeyframes) && env.centerKeyframes.length > 0) {
    const kf = env.centerKeyframes;
    if (elapsed <= kf[0].t) return [...kf[0].pos];
    for (let i = 0; i < kf.length - 1; i++) {
      const a = kf[i];
      const b = kf[i + 1];
      if (elapsed >= a.t && elapsed <= b.t) {
        const u = (elapsed - a.t) / Math.max(0.001, b.t - a.t);
        return [lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], u)];
      }
    }
    return [...kf[kf.length - 1].pos];
  }
  const startT = env.startTime ?? 0;
  const endT = env.moveEndTime ?? startT;
  const span = Math.max(0.001, endT - startT);
  const ratio = endT > startT ? clamp((elapsed - startT) / span, 0, 1) : 1;
  return [lerp(env.from[0], env.to[0], ratio), lerp(env.from[1], env.to[1], ratio)];
}

function getEnvelopeRadius(env, elapsed) {
  if (!env) return 235;
  let baseR = env.radius;
  if (Array.isArray(env.radiusKeyframes) && env.radiusKeyframes.length > 0) {
    const kf = env.radiusKeyframes;
    if (elapsed <= kf[0].t) {
      baseR = kf[0].r;
    } else if (elapsed >= kf[kf.length - 1].t) {
      baseR = kf[kf.length - 1].r;
    } else {
      for (let i = 0; i < kf.length - 1; i++) {
        if (elapsed >= kf[i].t && elapsed <= kf[i + 1].t) {
          const u = (elapsed - kf[i].t) / Math.max(0.001, kf[i + 1].t - kf[i].t);
          baseR = lerp(kf[i].r, kf[i + 1].r, u);
          break;
        }
      }
    }
  }
  if (
    env.constrictStartTime !== undefined &&
    env.constrictEndTime !== undefined &&
    elapsed >= env.constrictStartTime
  ) {
    const u = clamp(
      (elapsed - env.constrictStartTime) /
        Math.max(0.05, env.constrictEndTime - env.constrictStartTime),
      0,
      1
    );
    return lerp(baseR, env.constrictTargetRadius ?? 42, u);
  }
  return baseR;
}

function interpKeyframesScalar(kf, elapsed, prop, fallback) {
  if (!Array.isArray(kf) || !kf.length) return fallback;
  if (elapsed <= kf[0].t) return kf[0][prop];
  for (let i = 0; i < kf.length - 1; i++) {
    if (elapsed >= kf[i].t && elapsed <= kf[i + 1].t) {
      const u = (elapsed - kf[i].t) / Math.max(0.001, kf[i + 1].t - kf[i].t);
      return lerp(kf[i][prop], kf[i + 1][prop], u);
    }
  }
  return kf[kf.length - 1][prop];
}

function getRotatingCorridorSwords(stage, elapsed, animTime) {
  const rc = stage && stage.rotatingCorridor;
  if (!rc) return [];
  if (rc.startTime !== undefined && elapsed < rc.startTime) return [];
  const center = getEnvelopeCenter(
    { centerKeyframes: rc.centerKeyframes, from: CONFIG.CENTER, to: CONFIG.CENTER },
    elapsed
  );
  const phi = interpKeyframesScalar(rc.angleKeyframes, elapsed, 'angle', 0);
  const halfGap = rc.halfGap || 152;
  const step = rc.stepAlong || 215;
  const len = rc.swordLen || 235;
  const speed = rc.scrollSpeed ?? 165;
  const scroll = (((animTime * speed) % step) + step) % step;

  const ux = Math.cos(phi);
  const uy = Math.sin(phi);
  const nx = -Math.sin(phi);
  const ny = Math.cos(phi);

  const swords = [];
  for (let k = -6; k <= 6; k++) {
    const sA = k * step + scroll;
    const tipAX = center[0] - nx * halfGap + ux * sA;
    const tipAY = center[1] - ny * halfGap + uy * sA;
    const angA = phi + Math.PI / 2;
    swords.push({
      tipX: tipAX,
      tipY: tipAY,
      hiltX: tipAX - Math.cos(angA) * len,
      hiltY: tipAY - Math.sin(angA) * len,
      angle: angA,
      len
    });

    const sB = k * step - scroll + step * 0.45;
    const tipBX = center[0] + nx * halfGap + ux * sB;
    const tipBY = center[1] + ny * halfGap + uy * sB;
    const angB = phi - Math.PI / 2;
    swords.push({
      tipX: tipBX,
      tipY: tipBY,
      hiltX: tipBX - Math.cos(angB) * len,
      hiltY: tipBY - Math.sin(angB) * len,
      angle: angB,
      len
    });
  }
  return swords;
}

function getSwordWheelPos(wheel, elapsed) {
  if (!wheel || !wheel.keyframes || !wheel.keyframes.length) return null;
  if (wheel.startTime !== undefined && elapsed < wheel.startTime) return null;
  const kf = wheel.keyframes;
  if (elapsed <= kf[0].t) return [...kf[0].pos];
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i];
    const b = kf[i + 1];
    if (elapsed >= a.t && elapsed <= b.t) {
      const u = (elapsed - a.t) / Math.max(0.001, b.t - a.t);
      return [lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], u)];
    }
  }
  return [...kf[kf.length - 1].pos];
}

function getActiveBossMotionState(stage, elapsed) {
  let motion = (stage && stage.bossMotion) || 'spreadClaws';
  let stepStartTime = 0;
  let burst = false;
  if (stage && Array.isArray(stage.bossTimeline)) {
    for (const item of stage.bossTimeline) {
      if (elapsed >= item.t) {
        motion = item.motion;
        stepStartTime = item.t;
        burst = Boolean(item.burst);
      }
    }
  }
  return {
    motion,
    sinceSwitch: Math.max(0, elapsed - stepStartTime),
    burst
  };
}

// ----------------------------------------------------------------------------
// 천본앵 암홍색 대검 (Ornate Dark-Crimson Sword) 1:1 렌더러 (isGray=true 시 회색 무력화 칼날)
// ----------------------------------------------------------------------------
function drawOrnateCrimsonSword(
  ctx,
  x,
  y,
  angle,
  length = 220,
  alpha = 0.96,
  withRibbon = true,
  isGray = false
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);

  const bladeLen = length * 0.74;
  const guardX = -bladeLen;
  const pommelX = -length;

  if (withRibbon) {
    const ribGrad = ctx.createLinearGradient(0, 0, -length * 1.15, 0);
    if (isGray) {
      ribGrad.addColorStop(0, 'rgba(203, 213, 225, 0.14)');
      ribGrad.addColorStop(0.55, 'rgba(148, 163, 184, 0.36)');
      ribGrad.addColorStop(1, 'rgba(100, 116, 139, 0)');
    } else {
      ribGrad.addColorStop(0, 'rgba(216, 180, 254, 0.12)');
      ribGrad.addColorStop(0.55, 'rgba(192, 132, 252, 0.42)');
      ribGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    }
    ctx.fillStyle = ribGrad;
    ctx.fillRect(-length * 1.12, -13, length * 0.95, 5);
    ctx.fillRect(-length * 1.12, 8, length * 0.95, 5);
  }

  ctx.fillStyle = isGray ? '#94a3b8' : '#ff1744';
  ctx.shadowColor = isGray ? '#64748b' : '#ff1744';
  ctx.shadowBlur = isGray ? 4 : 10;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(-24, -8.5);
  ctx.lineTo(guardX, -7.5);
  ctx.lineTo(guardX, 7.5);
  ctx.lineTo(-24, 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = isGray ? '#334155' : '#0d0612';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-24, -5.5);
  ctx.lineTo(guardX + 2, -5.0);
  ctx.lineTo(guardX + 2, 5.0);
  ctx.lineTo(-24, 5.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = isGray ? 'rgba(203, 213, 225, 0.65)' : 'rgba(255, 42, 95, 0.78)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(guardX + 8, 0);
  ctx.stroke();

  ctx.fillStyle = isGray ? '#475569' : '#1f0d29';
  ctx.strokeStyle = isGray ? '#cbd5e1' : '#ff2a75';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(guardX + 6, -21);
  ctx.lineTo(guardX - 4, -8);
  ctx.lineTo(guardX - 8, 0);
  ctx.lineTo(guardX - 4, 8);
  ctx.lineTo(guardX + 6, 21);
  ctx.lineTo(guardX - 10, 14);
  ctx.lineTo(guardX - 10, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isGray ? '#cbd5e1' : '#f472b6';
  const gems = [
    [guardX + 2, -16],
    [guardX - 8, -12],
    [guardX + 2, 16],
    [guardX - 8, 12]
  ];
  for (const [gx, gy] of gems) {
    ctx.beginPath();
    ctx.arc(gx, gy, 2.6, 0, CONFIG.TAU);
    ctx.fill();
  }

  ctx.fillStyle = isGray ? '#334155' : '#180920';
  ctx.strokeStyle = isGray ? '#94a3b8' : '#e11d48';
  ctx.lineWidth = 1.4;
  ctx.fillRect(pommelX + 8, -3.5, Math.max(8, guardX - pommelX - 12), 7);
  ctx.strokeRect(pommelX + 8, -3.5, Math.max(8, guardX - pommelX - 12), 7);

  ctx.fillStyle = isGray ? '#94a3b8' : '#ff1744';
  ctx.beginPath();
  ctx.moveTo(pommelX, 0);
  ctx.lineTo(pommelX + 8, -5.5);
  ctx.lineTo(pommelX + 12, 0);
  ctx.lineTo(pommelX + 8, 5.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawScrollingArena(ctx, sim) {
  const W = CONFIG.WIDTH;
  const H = CONFIG.HEIGHT;
  const camX = sim.cameraX;

  const bgImg = sim.worldDeath
    ? isReady(ASSETS.arenaDeath)
      ? ASSETS.arenaDeath
      : ASSETS.stageBg
    : isReady(ASSETS.arenaLife)
    ? ASSETS.arenaLife
    : ASSETS.stageBg;

  if (isReady(bgImg)) {
    const skyOffset = -camX * 0.32;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, 225);
    ctx.clip();
    ctx.drawImage(bgImg, skyOffset - 220, 0, W + 440, H);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 210, W, H - 210);
    ctx.clip();
    const tileW = 1280;
    const baseScreenX = -camX - 60;
    ctx.drawImage(bgImg, baseScreenX, 0, tileW, H);

    ctx.save();
    ctx.translate(baseScreenX, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(bgImg, 0, 0, tileW, H);
    ctx.restore();

    ctx.save();
    ctx.translate(baseScreenX + tileW * 2, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(bgImg, 0, 0, tileW, H);
    ctx.restore();
    ctx.restore();
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1e1b24');
    grad.addColorStop(0.32, '#5c5468');
    grad.addColorStop(1, '#2a2232');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  if (sim.worldDeath) {
    const deathOverlay = ctx.createLinearGradient(0, 160, 0, H);
    deathOverlay.addColorStop(0, 'rgba(72, 16, 98, 0.25)');
    deathOverlay.addColorStop(0.45, 'rgba(104, 24, 135, 0.44)');
    deathOverlay.addColorStop(1, 'rgba(48, 10, 68, 0.58)');
    ctx.fillStyle = deathOverlay;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.save();
  ctx.translate(-camX, 0);
  const leftWallGrad = ctx.createLinearGradient(-420, 0, -210, 0);
  leftWallGrad.addColorStop(0, 'rgba(12, 6, 18, 0.55)');
  leftWallGrad.addColorStop(1, 'rgba(12, 6, 18, 0)');
  ctx.fillStyle = leftWallGrad;
  ctx.fillRect(-420, 0, 210, H);

  const rightWallGrad = ctx.createLinearGradient(1330, 0, 1540, 0);
  rightWallGrad.addColorStop(0, 'rgba(12, 6, 18, 0)');
  rightWallGrad.addColorStop(1, 'rgba(12, 6, 18, 0.55)');
  ctx.fillStyle = rightWallGrad;
  ctx.fillRect(1330, 0, 210, H);
  ctx.restore();

  const vigTop = ctx.createLinearGradient(0, 0, 0, 42);
  vigTop.addColorStop(0, 'rgba(28, 4, 18, 0.88)');
  vigTop.addColorStop(1, 'rgba(28, 4, 18, 0)');
  ctx.fillStyle = vigTop;
  ctx.fillRect(0, 0, W, 42);

  const vigBot = ctx.createLinearGradient(0, H - 38, 0, H);
  vigBot.addColorStop(0, 'rgba(28, 4, 18, 0)');
  vigBot.addColorStop(1, 'rgba(28, 4, 18, 0.88)');
  ctx.fillStyle = vigBot;
  ctx.fillRect(0, H - 38, W, 38);
}

function drawIntroBannerText(ctx, text, alpha) {
  const W = CONFIG.WIDTH;
  const y = 398;
  ctx.save();
  ctx.globalAlpha = alpha;
  const barGrad = ctx.createLinearGradient(W * 0.2, y - 24, W * 0.8, y - 24);
  barGrad.addColorStop(0, 'rgba(10, 4, 18, 0)');
  barGrad.addColorStop(0.25, 'rgba(18, 6, 28, 0.86)');
  barGrad.addColorStop(0.75, 'rgba(18, 6, 28, 0.86)');
  barGrad.addColorStop(1, 'rgba(10, 4, 18, 0)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(W * 0.18, y - 28, W * 0.64, 48);

  ctx.strokeStyle = 'rgba(244, 114, 182, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W * 0.25, y - 28);
  ctx.lineTo(W * 0.75, y - 28);
  ctx.moveTo(W * 0.25, y + 20);
  ctx.lineTo(W * 0.75, y + 20);
  ctx.stroke();

  ctx.fillStyle = '#fdf2f8';
  ctx.shadowColor = '#e11d48';
  ctx.shadowBlur = 12;
  ctx.font = '700 22px "Malgun Gothic", "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, y + 3);
  ctx.restore();
}

function getIntroCameraTransform(sim) {
  const t = sim.elapsed;
  // 인트로 보스 및 줌 중심을 화면 정중앙으로 고정 (0.0s~6.45s 시간 동기화)
  const phaseSplit = 3.60;
  const cx = CONFIG.WIDTH / 2;
  const cy = 340;
  let zoom = 1.0;
  let shakeX = 0;
  let shakeY = 0;

  if (t < phaseSplit) {
    // Phase 1 (0.00s ~ 3.60s): 기 모으면서 보스 정중앙으로 서서히 카메라 줌인 (1.00 -> 1.28)
    const u = clamp(t / phaseSplit, 0, 1);
    const eased = 1 - Math.pow(1 - u, 2.2);
    zoom = 1.0 + 0.28 * eased;
    if (u > 0.5) {
      const mag = (u - 0.5) * 10;
      shakeX = Math.sin(t * 73) * mag;
      shakeY = Math.cos(t * 61) * mag;
    }
  } else {
    // Phase 2 (3.60s ~ 6.45s): 기 대방출 순간 임팩트 펀치 후 빠른 줌아웃 (1.28 -> 1.34 -> 1.00) + 강렬한 쉐이크
    const subT = t - phaseSplit;
    if (subT < 0.18) {
      zoom = lerp(1.28, 1.34, subT / 0.18);
    } else if (subT < 0.85) {
      const u = (subT - 0.18) / 0.67;
      zoom = lerp(1.34, 1.0, 1 - Math.pow(1 - u, 3));
    } else {
      zoom = 1.0;
    }
    if (subT < 0.65) {
      const mag = (1 - subT / 0.65) * 22;
      shakeX = Math.sin(subT * 95) * mag;
      shakeY = Math.cos(subT * 83) * mag;
    }
  }
  return { cx, cy, zoom, shakeX, shakeY };
}

function drawFullIntroSequence(ctx, sim) {
  const W = CONFIG.WIDTH;
  const H = CONFIG.HEIGHT;
  const t = sim.elapsed;
  const phaseSplit = 3.60;
  // 보스 및 모든 인트로 연출 중심 = 화면 정중앙 (579, 340)
  const cx = W / 2;
  const cy = 340;
  const META = window.Yurisie.HISTORY_META;

  ctx.save();
  if (t < phaseSplit) {
    // ========================================================================
    // Phase 1 (0.00s ~ 3.60s): 기 모으는 전용 모션 + 정중앙 배치 + 카메라 줌인 ("이제, 또렷이 보이는가")
    // ========================================================================
    const u = clamp(t / phaseSplit, 0, 1);
    const pull = 1 - u;

    // 1) 화면 외곽 암전 비네팅
    const bgDark = ctx.createRadialGradient(cx, cy, 120, cx, cy, 760);
    bgDark.addColorStop(0, 'rgba(32, 6, 48, 0.14)');
    bgDark.addColorStop(0.6, 'rgba(18, 4, 30, 0.44)');
    bgDark.addColorStop(1, 'rgba(8, 2, 14, 0.78)');
    ctx.fillStyle = bgDark;
    ctx.fillRect(-200, -100, W + 400, H + 200);

    // 2) 바닥 거대 암흑-보라 소용돌이(Vortex) — 보스 정중앙으로 강하게 수축 회전
    for (let i = 0; i < 6; i++) {
      const baseR = 115 + i * 74 - u * 48 + Math.sin(t * 10 + i) * 10;
      ctx.save();
      ctx.translate(cx, cy + 58);
      ctx.scale(1.68, 0.56);
      ctx.rotate(t * (i % 2 === 0 ? 4.2 : -3.4) + i * 0.9);
      ctx.strokeStyle =
        i % 2 === 0
          ? `rgba(217, 70, 239, ${0.42 + u * 0.36 - i * 0.04})`
          : `rgba(18, 4, 28, ${0.72 + u * 0.2})`;
      ctx.lineWidth = 30 - i * 3;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(40, baseR), 0, Math.PI * 1.55);
      ctx.stroke();
      ctx.restore();
    }

    // 3) 외곽에서 보스 정중앙으로 빨려 들어가는 분홍-마젠타 기 모으기 에너지 가닥 22줄
    ctx.save();
    ctx.translate(cx, cy + 20);
    for (let i = 0; i < 22; i++) {
      const phase = (t * 2.2 + i * 0.16) % 1;
      const rOuter = lerp(540, 85, phase);
      const rInner = Math.max(22, rOuter - 150);
      const ang = (i / 22) * CONFIG.TAU + phase * 1.15;
      const alpha = Math.sin(phase * Math.PI) * (0.45 + u * 0.48);
      ctx.strokeStyle =
        i % 2 === 0
          ? `rgba(244, 114, 182, ${alpha})`
          : `rgba(192, 38, 211, ${alpha * 0.92})`;
      ctx.lineWidth = 3.2 + (1 - phase) * 5.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * rOuter, Math.sin(ang) * rOuter * 0.58);
      ctx.quadraticCurveTo(
        Math.cos(ang + 0.25) * ((rOuter + rInner) * 0.5),
        Math.sin(ang + 0.25) * ((rOuter + rInner) * 0.5) * 0.58,
        Math.cos(ang + 0.45) * rInner,
        Math.sin(ang + 0.45) * rInner * 0.58
      );
      ctx.stroke();
    }
    ctx.restore();

    // 4) 보스 중심 응축 마력 코어
    const coreR = 140 + u * 90;
    const coreGrad = ctx.createRadialGradient(cx, cy + 15, 10, cx, cy + 15, coreR);
    coreGrad.addColorStop(0, `rgba(255, 180, 240, ${0.32 + u * 0.52})`);
    coreGrad.addColorStop(0.45, `rgba(217, 38, 175, ${0.34 + u * 0.36})`);
    coreGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy + 15, coreR, 0, CONFIG.TAU);
    ctx.fill();

    // 5) 기 모으는 전용 유리지에 모션 (정중앙 배치 + 미세 떨림 + 응축 수축-팽창)
    const chargeSprite = isReady(ASSETS.motions.chargeGather)
      ? ASSETS.motions.chargeGather
      : ASSETS.motions.spreadClaws;
    if (isReady(chargeSprite)) {
      const tremorX = u > 0.38 ? Math.sin(t * 72) * (u * 5.0) : 0;
      const tremorY = u > 0.38 ? Math.cos(t * 63) * (u * 3.5) : 0;
      const chargeScale = 1.0 + u * 0.06;
      ctx.save();
      ctx.translate(cx + tremorX, cy - 10 + tremorY);
      ctx.scale(chargeScale, chargeScale);
      const cw = 720;
      const ch = 474;
      ctx.drawImage(chargeSprite, -cw * 0.5, -ch * 0.5, cw, ch);
      ctx.restore();
    }

    // 6) 전장 위 플레이어 캐릭터
    ctx.save();
    ctx.translate(-sim.cameraX, 0);
    drawPlayer(ctx, sim);
    ctx.restore();

    // 7) 대사: "이제, 또렷이 보이는가"
    drawIntroBannerText(ctx, META.quoteIntro1, clamp(t / 0.22, 0, 1) * (pull > 0.05 ? 1 : pull / 0.05));
  } else {
    // ========================================================================
    // Phase 2 (3.60s ~ 6.45s): 화면 전체를 뒤덮는 거대 기 대방출 + 정중앙 보스 +
    //                          원작 구도(좌 진홍 '/', 우 회색 '\') 촘촘한 고속 사출
    // ========================================================================
    const subT = t - phaseSplit; // 0.00s ~ 2.85s
    const burstFade = clamp(1 - subT / 1.35, 0, 1);

    // 1) 어두운 진홍·암흑 공간 + 정중앙 등 뒤 거대 붉은 일식 달
    ctx.fillStyle = `rgba(18, 4, 26, ${0.42 + burstFade * 0.28})`;
    ctx.fillRect(-200, -100, W + 400, H + 200);

    const moonY = 165;
    const moonR = 148 + burstFade * 18;
    const moonGrad = ctx.createRadialGradient(cx, moonY, 18, cx, moonY, moonR);
    moonGrad.addColorStop(0, 'rgba(135, 16, 40, 0.96)');
    moonGrad.addColorStop(0.62, 'rgba(198, 22, 58, 0.88)');
    moonGrad.addColorStop(0.86, 'rgba(165, 16, 48, 0.45)');
    moonGrad.addColorStop(1, 'rgba(165, 16, 48, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(cx, moonY, moonR, 0, CONFIG.TAU);
    ctx.fill();

    // 2) 기 방출 자세의 유리지에 본체 (얼굴·몸통을 정확히 화면 정중앙 cx에 정렬!)
    const releasePunch = subT < 0.35 ? Math.sin((subT / 0.35) * Math.PI) * 0.12 : 0;
    if (isReady(ASSETS.motions.spreadClaws)) {
      const bw = 760;
      const bh = 445;
      if (subT < 0.48) {
        ctx.save();
        ctx.translate(cx, cy - 18);
        ctx.globalAlpha = (1 - subT / 0.48) * 0.52;
        const gScale = 1.08 + (subT / 0.48) * 0.26;
        ctx.scale(gScale, gScale);
        ctx.drawImage(ASSETS.motions.spreadClaws, -bw * 0.405, -bh * 0.46, bw, bh);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(cx, cy - 18);
      ctx.scale(1 + releasePunch, 1 + releasePunch);
      ctx.drawImage(ASSETS.motions.spreadClaws, -bw * 0.405, -bh * 0.46, bw, bh);
      ctx.restore();
    }

    // 3) 양옆 바깥(좌측 ↖ / 우측 ↗)으로 촘촘하게 쏟아지는 고속 사출 + 다중 잔상!
    // - 화면이 폭발로 가려진 subT = 0.00s부터 이미 2열 교차 스트림으로 촘촘하고 빠르게 이동 중
    // - 좌측 진홍 검: '/' 기울기 유지한 채 왼쪽 위(↖)로 초고속 이동
    // - 우측 회색 검: '\' 기울기 유지한 채 오른쪽 위(↗)로 초고속 이동
    const streamSpacing = 0.082; // 0.082초마다 새 칼날 쌍이 촘촘하게 연속 발사
    const streamCount = 38;
    const speedOut = 980; // 고속 이동 속도 (px/s)
    const rowOffsets = [
      { dy: -46, dx: 22, lenDelta: 14 },
      { dy: 34, dx: -18, lenDelta: -12 }
    ];
    for (let k = 0; k < streamCount; k++) {
      // subT = 0.00s(폭발 시작) 시점에도 이미 5~6자루씩 촘촘히 펼쳐져 날아가고 있도록 초기 오프셋 부여
      const localT = subT + 0.48 - k * streamSpacing;
      if (localT < 0 || localT > 1.05) continue;
      const row = rowOffsets[k % rowOffsets.length];

      for (const side of [-1, 1]) {
        const isGray = side === 1;
        // 좌측은 '/' 기울기(+0.45), 우측은 '\' 기울기(-0.45)
        const swordAngle = -Math.PI / 2 + (side === -1 ? 0.45 : -0.45);
        // 이동 방향: 좌측은 왼쪽 위(↖), 우측은 오른쪽 위(↗)
        const moveX = side * 0.88;
        const moveY = -0.47;

        // 시작점: 보스 양팔/어깨 높이에서 2열 교차로 촘촘하게 출발해 바깥 위쪽(↖ / ↗)으로 고속 이동
        const startX = cx + side * (135 + row.dx);
        const startY = cy - 45 + row.dy;
        const distTraveled = localT * speedOut;
        const sx = startX + moveX * distTraveled;
        const sy = startY + moveY * distTraveled;
        const len = 212 + row.lenDelta + clamp(localT * 42, 0, 32);
        const sAlpha = clamp(localT / 0.07, 0, 1) * clamp((1.05 - localT) / 0.18, 0, 1);

        // (a) 다중 칼날 잔상 (Afterimage 3겹: 이동 반대 방향 ↘ / ↙ 으로 흐려지며 겹침)
        for (let g = 3; g >= 1; g--) {
          const ghostDist = g * 24;
          const gx = sx - moveX * ghostDist;
          const gy = sy - moveY * ghostDist;
          const gAlpha = (0.34 / g) * sAlpha * (isGray ? 0.62 : 1.0);
          drawOrnateCrimsonSword(ctx, gx, gy, swordAngle, len, gAlpha, false, isGray);
        }

        // (b) 이동 방향(↖ / ↗) 속도감 모션 블러 스트릭 (칼끝·중앙·손잡이 3줄 잔광)
        const bladeDx = Math.cos(swordAngle);
        const bladeDy = Math.sin(swordAngle);
        ctx.save();
        for (const frac of [-0.45, 0.0, 0.45]) {
          const px = sx + bladeDx * (len * frac);
          const py = sy + bladeDy * (len * frac);
          const streakGrad = ctx.createLinearGradient(
            px,
            py,
            px - moveX * 165,
            py - moveY * 165
          );
          if (isGray) {
            streakGrad.addColorStop(0, `rgba(226, 232, 240, ${0.34 * sAlpha})`);
            streakGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
          } else {
            streakGrad.addColorStop(0, `rgba(255, 55, 130, ${0.52 * sAlpha})`);
            streakGrad.addColorStop(0.5, `rgba(192, 38, 211, ${0.26 * sAlpha})`);
            streakGrad.addColorStop(1, 'rgba(192, 38, 211, 0)');
          }
          ctx.strokeStyle = streakGrad;
          ctx.lineWidth = frac === 0 ? 12 : 6;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - moveX * 165, py - moveY * 165);
          ctx.stroke();
        }
        ctx.restore();

        // (c) 메인 칼날 렌더링
        drawOrnateCrimsonSword(
          ctx,
          sx,
          sy,
          swordAngle,
          len,
          (isGray ? 0.62 : 0.98) * sAlpha,
          !isGray,
          isGray
        );
      }
    }

    // 4) 전장 위 플레이어 캐릭터
    ctx.save();
    ctx.translate(-sim.cameraX, 0);
    drawPlayer(ctx, sim);
    ctx.restore();

    // 5) 화면 전체를 한 번 완전히 가리는 압도적 기 대방출 풀스크린 폭발 이펙트 (0.00s ~ 0.78s)
    if (subT < 0.85) {
      // 0.00~0.16s 급격히 화면 전체를 덮음(peak 0.96) -> 0.16~0.75s 쫙 걷힘
      const veilIntensity =
        subT < 0.16
          ? lerp(0.55, 0.96, subT / 0.16)
          : clamp(1 - (subT - 0.16) / 0.58, 0, 1) * 0.96;

      // (a) 화면 전체를 뒤덮는 거대 마젠타-퍼플-암흑 방사형 폭발막
      const fullR = 240 + subT * 1450;
      const veilGrad = ctx.createRadialGradient(cx, cy + 20, 30, cx, cy + 20, fullR);
      veilGrad.addColorStop(0, `rgba(255, 220, 255, ${veilIntensity * 0.95})`);
      veilGrad.addColorStop(0.28, `rgba(232, 70, 245, ${veilIntensity * 0.92})`);
      veilGrad.addColorStop(0.62, `rgba(126, 22, 195, ${veilIntensity * 0.88})`);
      veilGrad.addColorStop(1, `rgba(24, 4, 42, ${veilIntensity * 0.84})`);
      ctx.fillStyle = veilGrad;
      ctx.fillRect(-250, -150, W + 500, H + 300);

      // (b) 3겹 초거대 확장 충격파 링
      for (let k = 0; k < 3; k++) {
        const ringT = subT - k * 0.07;
        if (ringT < 0) continue;
        const ringR = 90 + ringT * 1420;
        const rAlpha = clamp(1 - ringT / 0.62, 0, 1);
        ctx.strokeStyle =
          k === 0
            ? `rgba(255, 230, 255, ${0.95 * rAlpha})`
            : k === 1
              ? `rgba(240, 80, 255, ${0.82 * rAlpha})`
              : `rgba(18, 4, 32, ${0.88 * rAlpha})`;
        ctx.lineWidth = (k === 2 ? 56 : 26) * rAlpha;
        ctx.beginPath();
        ctx.arc(cx, cy + 20, ringR, 0, CONFIG.TAU);
        ctx.stroke();
      }

      // (c) 화면 전체를 대각선으로 찢고 지나가는 거대 암흑-네온 마젠타 파동 리본
      const arcFade = clamp(1 - subT / 0.82, 0, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(14, 4, 24, ${0.86 * arcFade})`;
      ctx.lineWidth = 88 * arcFade;
      ctx.beginPath();
      ctx.moveTo(cx - 720, cy - 180 + subT * 160);
      ctx.quadraticCurveTo(cx - 220, cy + 190, cx + 240, cy + 520);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 80, cy - 460);
      ctx.quadraticCurveTo(cx + 460, cy + 10, cx + 740, cy + 320);
      ctx.stroke();

      const arcs = [
        [cx - 560, cy - 150, cx + 20, cy - 310, cx + 640, cy + 410, 11],
        [cx - 40, cy - 450, cx + 330, cy - 40, cx + 620, cy + 460, 13],
        [cx - 640, cy + 150, cx + 160, cy + 220, cx + 680, cy - 200, 8],
        [cx - 260, cy - 390, cx + 280, cy + 100, cx + 660, cy + 430, 6]
      ];
      ctx.shadowColor = '#f0abfc';
      ctx.shadowBlur = 24;
      for (const [x1, y1, qx, qy, x2, y2, lw] of arcs) {
        ctx.strokeStyle = `rgba(250, 165, 255, ${0.94 * arcFade})`;
        ctx.lineWidth = lw * (0.4 + arcFade * 0.9);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(qx, qy, x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6) 대사: "네 역사의 끝을 목도하라"
    drawIntroBannerText(ctx, META.quoteIntro2, clamp(subT / 0.22, 0, 1));
  }
  ctx.restore();
}

function drawGrayCircleZone(ctx, sim, zone) {
  if (sim.elapsed < zone.startTime || sim.elapsed > zone.endTime) return;
  const [cx, cy] = zone.center;
  const r = zone.radius;
  const rx = r * 1.18;
  const ry = r * 0.56;

  // 바닥 원근(2.5D 타원 rx=1.18r, ry=0.56r) 회색 안전지대 + 바깥 보라 바닥 장판
  ctx.save();
  ctx.fillStyle = 'rgba(92, 18, 128, 0.38)';
  ctx.beginPath();
  ctx.rect(-900, 210, 3200, 520);
  ctx.ellipse(cx, cy, rx, ry, 0, 0, CONFIG.TAU, true);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.18, 0.56);
  const innerGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, r);
  innerGrad.addColorStop(0, 'rgba(115, 124, 138, 0.46)');
  innerGrad.addColorStop(0.78, 'rgba(62, 70, 84, 0.58)');
  innerGrad.addColorStop(1, 'rgba(28, 32, 42, 0.72)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, CONFIG.TAU);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#ff1e78';
  ctx.shadowColor = '#ff1e78';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, CONFIG.TAU);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 180, 220, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 7, ry - 4, 0, 0, CONFIG.TAU);
  ctx.stroke();
  ctx.restore();
}

function getCorridorOffsetY(stage, elapsed) {
  if (!stage || !Array.isArray(stage.corridorYKeyframes) || stage.corridorYKeyframes.length === 0) {
    return 0;
  }
  const kf = stage.corridorYKeyframes;
  if (elapsed <= kf[0].t) return kf[0].y;
  if (elapsed >= kf[kf.length - 1].t) return kf[kf.length - 1].y;
  for (let i = 0; i < kf.length - 1; i++) {
    if (elapsed >= kf[i].t && elapsed <= kf[i + 1].t) {
      const u = (elapsed - kf[i].t) / Math.max(0.001, kf[i + 1].t - kf[i].t);
      return lerp(kf[i].y, kf[i + 1].y, u);
    }
  }
  return 0;
}

function drawAmbientBackgroundSwords(ctx, sim, denseCorridor) {
  const startX = -320;
  const endX = 1480;
  const stepX = denseCorridor ? 195 : 235;
  const speed = (sim.stage && sim.stage.swordScrollSpeed) || 260;
  const scrollX = (((sim.animTime * speed) % stepX) + stepX) % stepX;
  const offsetY = denseCorridor ? getCorridorOffsetY(sim.stage, sim.elapsed) : 0;
  // 상하단 수직 이동 칼날 및 8구간 대각선 낙하 칼날은 '죽음의 세계' 소속:
  // 죽음의 세계(worldDeath=true)일 때만 진홍색 활성화(+피격 판정 ON), 생명의 세계(worldDeath=false)에서는 회색 비활성(+피격 OFF)!
  const isGray = !sim.worldDeath;

  // 죽음의 세계 상·하단 칼날 회랑 경계 잔광선 (칼날이 위·아래로 이동하며 안전 통로를 압박하는 높이를 직관적으로 표시)
  if (denseCorridor && !isGray) {
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.34)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(startX, 305 + offsetY);
    ctx.lineTo(endX, 305 + offsetY);
    ctx.moveTo(startX, 595 + offsetY);
    ctx.lineTo(endX, 595 + offsetY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (sim.stage && (sim.stage.ambientSwords || sim.stage.corridorBorderSwords)) {
    for (let baseX = startX; baseX <= endX; baseX += stepX) {
      const x = baseX + scrollX;
      const bob = Math.sin(sim.animTime * 3.4 + baseX * 0.01) * 5;
      const topTipY = denseCorridor ? 305 + offsetY : 295;
      const swordLen = denseCorridor ? 250 : 220;
      const moveSign = Math.sign(speed) || 1;
      // 좌우·상하로 빠르게 이동하는 회랑 칼날 뒤쪽 다중 잔상
      if (denseCorridor) {
        for (let g = 2; g >= 1; g--) {
          drawOrnateCrimsonSword(
            ctx,
            x - moveSign * g * 18,
            topTipY + bob,
            Math.PI / 2,
            swordLen,
            (isGray ? 0.14 : 0.26) / g,
            false,
            isGray
          );
        }
      }
      // 상단 검끝 topTipY, 하단 검끝 595 + offsetY (engine.js 히트박스와 1:1 일치!)
      drawOrnateCrimsonSword(
        ctx,
        x,
        topTipY + bob,
        Math.PI / 2,
        swordLen,
        isGray ? 0.42 : denseCorridor ? 0.96 : 0.82,
        true,
        isGray
      );

      if (denseCorridor && 595 + offsetY < 735) {
        const botX = baseX + (stepX - scrollX);
        drawOrnateCrimsonSword(
          ctx,
          botX + 95,
          595 + offsetY - bob * 0.5,
          -Math.PI / 2,
          260,
          isGray ? 0.38 : 0.94,
          true,
          isGray
        );
      }
    }
  }

  // 원작 7구간 말미(사슬 절단 직후 회색 서서히 감쇠 예고) -> 꽃 습득 즉시 진홍 활성화 -> 8구간 연속 회전 사선 칼날 회랑!
  if (sim.stage && sim.stage.rotatingCorridor) {
    const rc = sim.stage.rotatingCorridor;
    const swords = getRotatingCorridorSwords(sim.stage, sim.elapsed, sim.animTime);
    if (swords.length > 0) {
      const isGray = rc.belongsToDeathWorld ? !sim.worldDeath : Boolean(sim.worldDeath);
      let rcAlpha = isGray ? 0.54 : 0.96;
      if (isGray && rc.grayAlphaStart !== undefined && rc.grayAlphaEnd !== undefined) {
        const span = Math.max(0.1, (rc.grayAlphaEndTime || sim.stage.duration) - (rc.startTime || 0));
        const u = clamp((sim.elapsed - (rc.startTime || 0)) / span, 0, 1);
        rcAlpha = lerp(rc.grayAlphaStart, rc.grayAlphaEnd, u);
      } else if (isGray && rc.fadeOutAfterLifeSwitch) {
        // 8구간 [죽음의 꽃] 습득 직후 회색으로 변하며 서서히 투명해져 사라짐
        const fade = sim.worldTransition > 0 ? clamp(sim.worldTransition / 0.55, 0, 1) : 0;
        rcAlpha = 0.52 * fade;
      }
      if (rcAlpha > 0.02) {
        // 활성 상태(죽음의 세계)에서는 고속 회전 + 고속 직진 스크롤 궤적을 따라 다중 검기 잔상 렌더링!
        if (!isGray) {
          for (let g = 2; g >= 1; g--) {
            const dtGhost = g * 0.032;
            const ghostSwords = getRotatingCorridorSwords(
              sim.stage,
              Math.max(rc.startTime || 0, sim.elapsed - dtGhost),
              sim.animTime - dtGhost
            );
            for (const gsw of ghostSwords) {
              drawOrnateCrimsonSword(
                ctx,
                gsw.tipX,
                gsw.tipY,
                gsw.angle,
                gsw.len,
                0.24 / g,
                false,
                false
              );
            }
          }
        }
        for (const sw of swords) {
          drawOrnateCrimsonSword(ctx, sw.tipX, sw.tipY, sw.angle, sw.len, rcAlpha, !isGray, isGray);
        }
      }
    }
  }
}

// ----------------------------------------------------------------------------
// 보스 유리지에 본체 및 역동적 스킬 시전 모션·검기 방출 연출
// ----------------------------------------------------------------------------
function drawYurisieBoss(ctx, sim) {
  const [bx, by] = sim.bossPos;
  const { motion: motionKey, sinceSwitch, burst } = getActiveBossMotionState(
    sim.stage,
    sim.elapsed
  );

  // 모션 전환 직후 역동적인 스케일 펀치 및 호흡 바운스
  const punch = burst && sinceSwitch < 0.45 ? Math.sin((sinceSwitch / 0.45) * Math.PI) * 0.09 : 0;
  const bob = Math.sin(sim.animTime * 3.1) * 8;
  const swayX = Math.cos(sim.animTime * 1.9) * 5;

  ctx.save();

  // 8구간 흑태양(Black Sun) 연출 (45.15s ~ 47.0s)
  if (sim.stage && sim.stage.id === 8 && sim.elapsed >= 3.1 && sim.elapsed <= 5.4) {
    const sunY = by - 95;
    const sunGrad = ctx.createRadialGradient(bx, sunY, 18, bx, sunY, 92);
    sunGrad.addColorStop(0, '#07020c');
    sunGrad.addColorStop(0.65, '#190526');
    sunGrad.addColorStop(0.85, 'rgba(225, 29, 72, 0.88)');
    sunGrad.addColorStop(1, 'rgba(225, 29, 72, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(bx, sunY, 92, 0, CONFIG.TAU);
    ctx.fill();
  }

  // 1. 보스 등 뒤에서 끊임없이 꿈틀대는 암흑-진홍 마력 촉수/날개 파동
  const auraR = 290 * (1 + punch);
  const aura = ctx.createRadialGradient(bx, by + 10, 20, bx, by + 10, auraR);
  aura.addColorStop(0, 'rgba(235, 25, 75, 0.55)');
  aura.addColorStop(0.45, 'rgba(155, 35, 225, 0.32)');
  aura.addColorStop(1, 'rgba(88, 28, 135, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(bx, by + 10, auraR, 0, CONFIG.TAU);
  ctx.fill();

  // 2. 보스 모션 전환(검기 시전/방출) 시 뻗어나가는 방사형 분홍-진홍 검기 파동 (원작 9.2s, 12.6s, 35.2s, 48.0s 연출)
  if (burst && sinceSwitch < 0.55) {
    const u = sinceSwitch / 0.55;
    const fade = 1 - u;
    ctx.save();
    ctx.translate(bx, by + 15);
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * CONFIG.TAU + u * 0.4;
      const r1 = 45 + u * 90;
      const r2 = 160 + u * 340;
      ctx.strokeStyle = i % 2 === 0
        ? `rgba(255, 75, 165, ${0.72 * fade})`
        : `rgba(255, 210, 240, ${0.55 * fade})`;
      ctx.lineWidth = i % 2 === 0 ? 7 * fade : 3.5 * fade;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1 * 0.75);
      ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2 * 0.75);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. 현재 시전 동작에 따른 메인 보스(양팔 벌린 유리지에 본체) 렌더링 + 시전 시 확장 잔상
  const sprite = ASSETS.motions[motionKey] || ASSETS.motions.spreadClaws;
  if (isReady(sprite)) {
    ctx.save();
    ctx.translate(bx + swayX, by + bob);

    if (motionKey === 'swordStance') {
      ctx.scale(1 + punch, 1 + punch);
      const w = 450;
      const h = 365;
      ctx.drawImage(sprite, -w * 0.45, -h * 0.58, w, h);
    } else {
      // 양팔을 좌우로 크게 벌린 유리지에 본체 (760 x 445px, 얼굴·몸통 정중앙 정렬)
      const w = 760;
      const h = 445;
      if (burst && sinceSwitch < 0.42) {
        const ghostScale = 1.04 + (sinceSwitch / 0.42) * 0.16;
        ctx.save();
        ctx.globalAlpha = (1 - sinceSwitch / 0.42) * 0.45;
        ctx.scale(ghostScale, ghostScale);
        ctx.drawImage(sprite, -w * 0.405, -h * 0.42, w, h);
        ctx.restore();
      }
      if (sim.bossHitFlash > 0) {
        ctx.filter = 'brightness(1.65) contrast(1.2)';
      }
      ctx.scale(1 + punch, 1 + punch);
      ctx.drawImage(sprite, -w * 0.405, -h * 0.42, w, h);
    }
    ctx.restore();
  }

  ctx.restore();
}

function draw36SwordRing(ctx, sim, env) {
  if (env.startTime !== undefined && sim.elapsed < env.startTime) return;
  const [cx, cy] = getEnvelopeCenter(env, sim.elapsed);
  const innerR = getEnvelopeRadius(env, sim.elapsed);
  const swordCount = 36;
  const isConstricting =
    env.constrictStartTime !== undefined && sim.elapsed >= env.constrictStartTime;
  const rotBase = sim.animTime * (isConstricting ? 2.45 : 1.55);

  // 오직 소속 세계에 의해서만 활성화/회색 비활성화 결정 (시간 경과로 회색이 되는 것이 아님!)
  // 생명의 세계 소속 36검: 생명의 세계(worldDeath=false)면 활성(진홍+피격ON), 죽음의 세계(worldDeath=true)면 비활성(회색+피격OFF)
  const isGray = Boolean(env.belongsToLifeWorld && sim.worldDeath);
  let alpha = isGray ? 0.52 : 0.96;
  if (isGray && env.fadeOutOnDeathWorld) {
    alpha = 0.52 * clamp((sim.worldTransition || 0) / 0.55, 0, 1);
    if (alpha < 0.02) return;
  }

  ctx.save();
  if (isGray && innerR < 95) {
    const coreGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, innerR + 95);
    coreGrad.addColorStop(0, `rgba(12, 14, 22, ${0.78 * alpha})`);
    coreGrad.addColorStop(0.5, `rgba(100, 116, 139, ${0.35 * alpha})`);
    coreGrad.addColorStop(1, 'rgba(100, 116, 139, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR + 95, 0, CONFIG.TAU);
    ctx.fill();
  } else if (!isGray && sim.showHitbox) {
    ctx.strokeStyle = 'rgba(255, 35, 105, 0.55)';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, CONFIG.TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (let i = 0; i < swordCount; i++) {
    const theta = rotBase + (i / swordCount) * CONFIG.TAU;
    const tipX = cx + Math.cos(theta) * innerR;
    const tipY = cy + Math.sin(theta) * innerR;
    if (!isGray) {
      // 36검 외곽 분홍-보라 마력 글로우
      const hiltX = cx + Math.cos(theta) * (innerR + 215);
      const hiltY = cy + Math.sin(theta) * (innerR + 215);
      ctx.fillStyle = 'rgba(232, 70, 220, 0.22)';
      ctx.beginPath();
      ctx.arc(hiltX, hiltY, 26, 0, CONFIG.TAU);
      ctx.fill();
    }
    drawOrnateCrimsonSword(ctx, tipX, tipY, theta + Math.PI, 245, alpha, true, isGray);
  }
  ctx.restore();
}

function draw12SpokeSwordWheel(ctx, sim, wheel) {
  const pos = getSwordWheelPos(wheel, sim.elapsed);
  if (!pos) return;
  const [wx, wy] = pos;
  const spokeLen = wheel.spokeLength || 215;
  const numSpokes = wheel.numSpokes || 16;
  const hubR = 34;
  const rot = sim.animTime * 4.2;
  // 생명의 세계 소속 회전 칼날 수레바퀴:
  // - 죽음의 세계(worldDeath=true)에서는 회색 비활성 상태로 대기하다가
  // - [죽음의 꽃]을 먹어 생명의 세계(worldDeath=false)로 돌아오는 즉시 진홍색 치명타 칼날로 활성화!
  const isGray = Boolean(wheel.belongsToLifeWorld && sim.worldDeath);
  let fadeMul = 1;
  if (isGray && wheel.fadeOutOnDeathWorld) {
    fadeMul = clamp((sim.worldTransition || 0) / 0.55, 0, 1);
    if (fadeMul < 0.02) return;
  }

  ctx.save();
  ctx.globalAlpha = fadeMul;
  // 바닥 2.5D 소용돌이 고리 (비활성 시 은회색 소용돌이, 활성 시 진홍·보라 소용돌이)
  ctx.save();
  ctx.translate(wx, wy + 26);
  ctx.scale(1, 0.34);
  for (let rIdx = 0; rIdx < 2; rIdx++) {
    const ringR = (spokeLen * 0.58) + rIdx * 48;
    ctx.strokeStyle = isGray
      ? `rgba(203, 213, 225, ${0.42 - rIdx * 0.14})`
      : `rgba(244, 63, 94, ${0.62 - rIdx * 0.18})`;
    ctx.lineWidth = isGray ? 4 : 5.5;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, sim.animTime * 3 + rIdx, sim.animTime * 3 + rIdx + Math.PI * 1.45);
    ctx.stroke();
  }
  ctx.restore();

  const hubGrad = ctx.createRadialGradient(wx, wy, 6, wx, wy, hubR * 2.8);
  if (isGray) {
    hubGrad.addColorStop(0, 'rgba(51, 65, 85, 0.82)');
    hubGrad.addColorStop(0.48, 'rgba(186, 198, 218, 0.52)');
    hubGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
  } else {
    hubGrad.addColorStop(0, 'rgba(20, 4, 28, 0.98)');
    hubGrad.addColorStop(0.45, 'rgba(225, 29, 72, 0.80)');
    hubGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
  }
  ctx.fillStyle = hubGrad;
  ctx.beginPath();
  ctx.arc(wx, wy, hubR * 2.8, 0, CONFIG.TAU);
  ctx.fill();

  for (let i = 0; i < numSpokes; i++) {
    const ang = rot + (i / numSpokes) * CONFIG.TAU;
    const tipX = wx + Math.cos(ang) * (hubR + spokeLen);
    const tipY = wy + Math.sin(ang) * (hubR + spokeLen);
    drawOrnateCrimsonSword(
      ctx,
      tipX,
      tipY,
      ang,
      spokeLen,
      isGray ? 0.68 : 0.97,
      true,
      isGray
    );
  }
  ctx.restore();
}

function drawAttacks(ctx, sim, layer = 'all') {
  const floorKinds = new Set(['red_band', 'red_giant_circle', 'outer_purple_explosion', 'ground_quake']);
  const allAttacks =
    sim.carryOverAttacks && sim.carryOverAttacks.length > 0
      ? [...sim.carryOverAttacks, ...sim.stage.attacks]
      : sim.stage.attacks;
  for (const attack of allAttacks) {
    const isFloor = floorKinds.has(attack.kind);
    if (layer === 'floor' && !isFloor) continue;
    if (layer === 'air' && isFloor) continue;

    const effElapsed =
      attack._carryElapsedOffset !== undefined
        ? attack._carryElapsedOffset + sim.elapsed
        : sim.elapsed;
    const spawnTime = attack.spawnTime ?? 0;
    if (effElapsed < spawnTime) continue;

    const postFire = effElapsed - attack.fireTime;
    if (postFire > 0.52) continue;

    const duration = Math.max(0.05, attack.fireTime - spawnTime);
    const ratio = clamp((effElapsed - spawnTime) / duration, 0, 1);

    if (attack.kind === 'red_band') {
      // 고속 슬라이드 전개 + 초대형 진홍색 장판
      const sweepIn = clamp((effElapsed - spawnTime) / 0.18, 0.15, 1);
      const len = (attack.length || 2500) * sweepIn;
      const w = attack.width || 275;
      ctx.save();
      ctx.translate(attack.point[0], attack.point[1]);
      ctx.rotate(attack.angle);

      if (postFire < 0) {
        const bandGrad = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
        bandGrad.addColorStop(0, 'rgba(238, 26, 34, 0.78)');
        bandGrad.addColorStop(0.5, 'rgba(215, 18, 26, 0.70)');
        bandGrad.addColorStop(1, 'rgba(238, 26, 34, 0.78)');
        ctx.fillStyle = bandGrad;
        ctx.fillRect(-len / 2, -w / 2, len, w);

        ctx.fillStyle = `rgba(255, 55, 65, ${0.18 + ratio * 0.25})`;
        ctx.fillRect(-len / 2, -w * ratio * 0.5, len, w * ratio);

        ctx.strokeStyle = 'rgba(255, 215, 220, 0.94)';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-len / 2, -w / 2);
        ctx.lineTo(len / 2, -w / 2);
        ctx.moveTo(-len / 2, w / 2);
        ctx.lineTo(len / 2, w / 2);
        ctx.stroke();
      } else {
        const fade = 1 - postFire / 0.52;
        ctx.fillStyle = `rgba(18, 3, 14, ${0.95 * fade})`;
        ctx.fillRect(-len / 2, -w * 0.36, len, w * 0.72);

        ctx.strokeStyle = `rgba(255, 35, 95, ${0.96 * fade})`;
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 6.5 * fade;
        ctx.beginPath();
        ctx.moveTo(-len / 2, -w * 0.36);
        ctx.lineTo(len / 2, -w * 0.36);
        ctx.moveTo(-len / 2, w * 0.36);
        ctx.lineTo(len / 2, w * 0.36);
        ctx.stroke();
      }
      ctx.restore();
    } else if (attack.kind === 'black_slash') {
      const snapOpen = clamp((sim.elapsed - spawnTime) / 0.15, 0.2, 1);
      const len = attack.length || 2300;
      const w = (attack.width || 72) * snapOpen;
      ctx.save();
      ctx.translate(attack.point[0], attack.point[1]);
      ctx.rotate(attack.angle);
      if (postFire < 0) {
        const outerGrad = ctx.createLinearGradient(0, -w * 0.85, 0, w * 0.85);
        outerGrad.addColorStop(0, 'rgba(255, 20, 80, 0)');
        outerGrad.addColorStop(0.2, 'rgba(255, 25, 85, 0.94)');
        outerGrad.addColorStop(0.5, 'rgba(12, 2, 10, 0.98)');
        outerGrad.addColorStop(0.8, 'rgba(255, 25, 85, 0.94)');
        outerGrad.addColorStop(1, 'rgba(255, 20, 80, 0)');
        ctx.fillStyle = outerGrad;
        ctx.fillRect(-len / 2, -w * 0.85, len, w * 1.7);

        ctx.fillStyle = '#0a0208';
        ctx.fillRect(-len / 2, -w * 0.44, len, w * 0.88);

        ctx.strokeStyle = 'rgba(195, 22, 65, 0.62)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([32, 18]);
        ctx.beginPath();
        ctx.moveTo(-len / 2, -w * 0.15);
        ctx.lineTo(len / 2, -w * 0.15);
        ctx.moveTo(-len / 2, w * 0.17);
        ctx.lineTo(len / 2, w * 0.17);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#fecdd3';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-len / 2, -w * 0.45);
        ctx.lineTo(len / 2, -w * 0.45);
        ctx.moveTo(-len / 2, w * 0.45);
        ctx.lineTo(len / 2, w * 0.45);
        ctx.stroke();
      } else {
        // 부드러운 그라데이션 광휘와 중심 코어를 가진 진홍-마젠타 참격 섬광!
        const fade = 1 - postFire / 0.52;
        const slashGrad = ctx.createLinearGradient(0, -w * 0.9, 0, w * 0.9);
        slashGrad.addColorStop(0, 'rgba(244, 63, 155, 0)');
        slashGrad.addColorStop(0.28, `rgba(236, 72, 153, ${0.78 * fade})`);
        slashGrad.addColorStop(0.5, `rgba(255, 235, 252, ${0.98 * fade})`);
        slashGrad.addColorStop(0.72, `rgba(236, 72, 153, ${0.78 * fade})`);
        slashGrad.addColorStop(1, 'rgba(244, 63, 155, 0)');
        ctx.fillStyle = slashGrad;
        ctx.fillRect(-len / 2, -w * 0.9, len, w * 1.8);
      }
      ctx.restore();
    } else if (attack.kind === 'purple_pillar') {
      // 화면 천장~바닥을 통째로 가로지르는 초대형 수직 보라 에너지 기둥 (폭 360~400px)
      const moveU = attack.fromX !== undefined ? clamp(ratio / 0.82, 0, 1) : 1;
      const x = attack.fromX !== undefined ? lerp(attack.fromX, attack.x, moveU) : attack.x;
      const w = attack.width || 360;
      const H = CONFIG.HEIGHT;
      ctx.save();
      if (postFire < 0) {
        // 1) 반투명 자주·보라 초대형 수직 장막 (터지기 직전일수록 내부 에너지 밀도 상승)
        const colGrad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        colGrad.addColorStop(0, `rgba(244, 114, 182, ${0.52 + ratio * 0.28})`);
        colGrad.addColorStop(0.12, `rgba(168, 85, 247, ${0.22 + ratio * 0.24})`);
        colGrad.addColorStop(0.5, `rgba(126, 34, 206, ${0.18 + ratio * 0.24})`);
        colGrad.addColorStop(0.88, `rgba(168, 85, 247, ${0.22 + ratio * 0.24})`);
        colGrad.addColorStop(1, `rgba(244, 114, 182, ${0.52 + ratio * 0.28})`);
        ctx.fillStyle = colGrad;
        ctx.fillRect(x - w / 2, 0, w, H);

        // 2) 기둥 내부에서 수직으로 일렁이는 보라 마력 결
        const innerLines = [-0.32, -0.14, 0.06, 0.26];
        for (let i = 0; i < innerLines.length; i++) {
          const lx = x + innerLines[i] * w + Math.sin(sim.animTime * 9 + i * 2) * 8;
          ctx.fillStyle = `rgba(216, 180, 254, ${(0.08 + ratio * 0.14) * (i % 2 === 0 ? 1 : 0.7)})`;
          ctx.fillRect(lx - 14, 0, 28, H);
        }

        // 3) 원작 특유의 양쪽 경계 강렬한 네온 핑크-화이트 수직 광선 빔 (이중 글로우)
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.78)';
        ctx.shadowColor = '#f472b6';
        ctx.shadowBlur = 22;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, 0);
        ctx.lineTo(x - w / 2, H);
        ctx.moveTo(x + w / 2, 0);
        ctx.lineTo(x + w / 2, H);
        ctx.stroke();

        ctx.strokeStyle = '#fdf2f8';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, 0);
        ctx.lineTo(x - w / 2, H);
        ctx.moveTo(x + w / 2, 0);
        ctx.lineTo(x + w / 2, H);
        ctx.stroke();
      } else {
        // 폭발: 수직 암흑·보라·네온핑크 에너지 화염 기둥 다발
        const fade = 1 - postFire / 0.52;
        const burstGrad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        burstGrad.addColorStop(0, `rgba(244, 114, 182, ${0.86 * fade})`);
        burstGrad.addColorStop(0.14, `rgba(168, 35, 245, ${0.92 * fade})`);
        burstGrad.addColorStop(0.35, `rgba(22, 4, 38, ${0.96 * fade})`);
        burstGrad.addColorStop(0.5, `rgba(12, 2, 24, ${0.98 * fade})`);
        burstGrad.addColorStop(0.65, `rgba(22, 4, 38, ${0.96 * fade})`);
        burstGrad.addColorStop(0.86, `rgba(168, 35, 245, ${0.92 * fade})`);
        burstGrad.addColorStop(1, `rgba(244, 114, 182, ${0.86 * fade})`);
        ctx.fillStyle = burstGrad;
        ctx.fillRect(x - w / 2, 0, w, H);

        // 수직으로 솟구치는 유기적인 암흑 불꽃 & 보라 번개 줄기
        const pillars = [
          { off: -0.42, lw: 9,  col: `rgba(245, 208, 254, ${0.90 * fade})`, glow: '#e879f9', amp: 14 },
          { off: -0.28, lw: 26, col: `rgba(14, 3, 26, ${0.92 * fade})`,     glow: 'transparent', amp: 18 },
          { off: -0.14, lw: 13, col: `rgba(192, 38, 233, ${0.92 * fade})`,  glow: '#c026d3', amp: 16 },
          { off: 0.0,   lw: 32, col: `rgba(10, 2, 20, ${0.95 * fade})`,     glow: 'transparent', amp: 12 },
          { off: 0.15,  lw: 12, col: `rgba(232, 121, 249, ${0.92 * fade})`, glow: '#e879f9', amp: 17 },
          { off: 0.29,  lw: 24, col: `rgba(14, 3, 26, ${0.90 * fade})`,     glow: 'transparent', amp: 15 },
          { off: 0.42,  lw: 9,  col: `rgba(245, 208, 254, ${0.90 * fade})`, glow: '#e879f9', amp: 14 }
        ];
        for (let i = 0; i < pillars.length; i++) {
          const pl = pillars[i];
          const baseSx = x + pl.off * w;
          ctx.strokeStyle = pl.col;
          ctx.shadowColor = pl.glow;
          ctx.shadowBlur = pl.glow === 'transparent' ? 0 : 18;
          ctx.lineWidth = pl.lw * (0.7 + fade * 0.4);
          ctx.beginPath();
          for (let y = 0; y <= H; y += 36) {
            const wave =
              Math.sin(y * 0.028 - sim.animTime * 28 + i * 2.1) * pl.amp +
              Math.cos(y * 0.065 + sim.animTime * 34 + i * 1.3) * (pl.amp * 0.45);
            if (y === 0) ctx.moveTo(baseSx + wave, 0);
            else ctx.lineTo(baseSx + wave, y);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (attack.kind === 'purple_beam') {
      // 화면을 가로지르는 초대형 광폭 보라-마젠타 에너지 빔 + 내부 소용돌이 플라즈마 결 + 폭발 시 암흑·네온보라 참격!
      const len = attack.length || 2400;
      const w = attack.width || 345;
      ctx.save();
      ctx.translate(attack.point[0], attack.point[1]);
      ctx.rotate(attack.angle);
      if (postFire < 0) {
        const beamGrad = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
        beamGrad.addColorStop(0, `rgba(244, 63, 155, ${0.58 + ratio * 0.28})`);
        beamGrad.addColorStop(0.16, `rgba(192, 38, 211, ${0.28 + ratio * 0.26})`);
        beamGrad.addColorStop(0.5, `rgba(168, 55, 225, ${0.22 + ratio * 0.26})`);
        beamGrad.addColorStop(0.84, `rgba(192, 38, 211, ${0.28 + ratio * 0.26})`);
        beamGrad.addColorStop(1, `rgba(244, 63, 155, ${0.58 + ratio * 0.28})`);
        ctx.fillStyle = beamGrad;
        ctx.fillRect(-len / 2, -w / 2, len, w);

        // 내부 대각선 플라즈마 마력 구름 결
        for (let k = -4; k <= 4; k++) {
          const px = k * 195 + ((sim.animTime * 220) % 195);
          const py = Math.sin(k * 1.7 + sim.animTime * 4) * (w * 0.24);
          const wisp = ctx.createRadialGradient(px, py, 6, px, py, w * 0.28);
          wisp.addColorStop(0, `rgba(255, 215, 255, ${0.28 + ratio * 0.24})`);
          wisp.addColorStop(0.5, `rgba(232, 121, 249, ${0.14 + ratio * 0.14})`);
          wisp.addColorStop(1, 'rgba(192, 38, 211, 0)');
          ctx.fillStyle = wisp;
          ctx.beginPath();
          ctx.arc(px, py, w * 0.28, 0, CONFIG.TAU);
          ctx.fill();
        }

        // 양쪽 강렬한 네온 핑크-화이트 이중 경계 광선
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.85)';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(-len / 2, -w / 2);
        ctx.lineTo(len / 2, -w / 2);
        ctx.moveTo(-len / 2, w / 2);
        ctx.lineTo(len / 2, w / 2);
        ctx.stroke();

        ctx.strokeStyle = '#fdf2f8';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-len / 2, -w / 2);
        ctx.lineTo(len / 2, -w / 2);
        ctx.moveTo(-len / 2, w / 2);
        ctx.lineTo(len / 2, w / 2);
        ctx.stroke();
      } else {
        // 암흑 코어 + 네온 퍼플·화이트 다중 참격 결 폭발!
        const fade = 1 - postFire / 0.52;
        const burstGrad = ctx.createLinearGradient(0, -w * 0.55, 0, w * 0.55);
        burstGrad.addColorStop(0, `rgba(232, 121, 249, ${0.82 * fade})`);
        burstGrad.addColorStop(0.25, `rgba(126, 22, 195, ${0.92 * fade})`);
        burstGrad.addColorStop(0.5, `rgba(12, 2, 24, ${0.96 * fade})`);
        burstGrad.addColorStop(0.75, `rgba(126, 22, 195, ${0.92 * fade})`);
        burstGrad.addColorStop(1, `rgba(232, 121, 249, ${0.82 * fade})`);
        ctx.fillStyle = burstGrad;
        ctx.fillRect(-len / 2, -w * 0.55, len, w * 1.1);

        const streaks = [-0.38, -0.18, 0.0, 0.18, 0.38];
        for (let i = 0; i < streaks.length; i++) {
          ctx.strokeStyle =
            i % 2 === 0
              ? `rgba(255, 235, 255, ${0.95 * fade})`
              : `rgba(16, 4, 28, ${0.94 * fade})`;
          ctx.lineWidth = i === 2 ? 18 : 11;
          ctx.beginPath();
          ctx.moveTo(-len / 2, streaks[i] * w);
          ctx.lineTo(len / 2, streaks[i] * w);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (attack.kind === 'ground_quake') {
      const [qx, qy] = attack.point;
      ctx.save();
      if (postFire < 0) {
        if (attack.darkHurricane) {
          // 고속 회전하는 거대 암흑-보라 소용돌이
          for (let i = 0; i < 5; i++) {
            const r = 110 + i * 82;
            ctx.save();
            ctx.translate(qx, qy - 25);
            ctx.scale(1.48, 0.58);
            ctx.rotate(sim.animTime * (i % 2 === 0 ? 8.8 : -7.6) + i * 1.1);
            ctx.strokeStyle =
              i % 2 === 0
                ? `rgba(192, 38, 211, ${0.42 + ratio * 0.38})`
                : `rgba(20, 4, 34, ${0.72 + ratio * 0.24})`;
            ctx.lineWidth = 24 - i * 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 1.45);
            ctx.stroke();
            ctx.restore();
          }
        } else if (ratio > 0.55) {
          const pulseR = 120 + ratio * 380;
          ctx.strokeStyle = `rgba(255, 45, 95, ${(ratio - 0.55) * 1.8})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(qx, qy, pulseR, 0, CONFIG.TAU);
          ctx.stroke();
        }
      } else {
        const fade = 1 - postFire / 0.52;
        ctx.fillStyle = attack.darkHurricane
          ? `rgba(88, 18, 135, ${0.46 * fade})`
          : `rgba(225, 29, 72, ${0.38 * fade})`;
        ctx.fillRect(-900, 230, 3200, 490);
        for (let i = 0; i < 16; i++) {
          const rx = qx - 560 + i * 75;
          const ry = qy + ((i * 53) % 140) - 60 - postFire * 210;
          ctx.fillStyle = `rgba(42, 34, 48, ${0.92 * fade})`;
          ctx.strokeStyle = `rgba(255, 65, 115, ${0.85 * fade})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.rect(rx, ry, 24, 18);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (attack.kind === 'outer_purple_explosion') {
      const [cx, cy] = attack.center;
      const r = attack.safeRadius;
      const rx = r * 1.18;
      const ry = r * 0.56;
      ctx.save();
      if (postFire < 0) {
        const shrink = (1 - ratio) * 90;
        ctx.strokeStyle = `rgba(216, 180, 254, ${0.35 + ratio * 0.55})`;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + shrink * 1.18, ry + shrink * 0.56, 0, 0, CONFIG.TAU);
        ctx.stroke();
      } else {
        const fade = 1 - postFire / 0.52;
        ctx.fillStyle = `rgba(192, 38, 233, ${0.80 * fade})`;
        ctx.beginPath();
        ctx.rect(-900, 190, 3200, 540);
        ctx.ellipse(cx, cy, rx, ry, 0, 0, CONFIG.TAU, true);
        ctx.fill();
      }
      ctx.restore();
    } else if (attack.kind === 'black_hole_gear') {
      const [cx, cy] = attack.point;
      const r = attack.radius;
      ctx.save();
      if (postFire < 0) {
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
        grad.addColorStop(0, 'rgba(8, 2, 14, 0.96)');
        grad.addColorStop(0.55, 'rgba(126, 22, 185, 0.68)');
        grad.addColorStop(1, 'rgba(225, 29, 72, 0.15)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, CONFIG.TAU);
        ctx.fill();
        for (let i = 0; i < 36; i++) {
          const ang = -sim.animTime * 5.2 + (i / 36) * CONFIG.TAU;
          const tipR = lerp(r, 25, ratio);
          drawOrnateCrimsonSword(
            ctx,
            cx + Math.cos(ang) * tipR,
            cy + Math.sin(ang) * tipR,
            ang + Math.PI,
            185,
            0.9,
            false
          );
        }
      } else {
        const fade = 1 - postFire / 0.52;
        ctx.fillStyle = `rgba(217, 70, 239, ${0.82 * fade})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.15, 0, CONFIG.TAU);
        ctx.fill();
      }
      ctx.restore();
    } else if (attack.kind === 'red_giant_circle') {
      // 안쪽 붉은 원(0 ~ coreR)과 바깥쪽 초대형 붉은 원(innerR ~ outerR) 두 원 사이의 좁은 회색 고리 공간(coreR ~ innerR)에서만 피하는 이중 원 패턴!
      const [cx, cy] = attack.point;
      const coreR = attack.coreDangerRadius || 0;
      const innerR = attack.innerSafeRadius || 320;
      const outerR = attack.radius || 980;
      ctx.save();
      ctx.translate(cx, cy + 55);
      ctx.scale(1.22, 0.56);
      if (postFire < 0) {
        const curOuterR = lerp(innerR + 35, outerR, clamp(ratio * 1.32, 0, 1));
        const curCoreR = coreR > 0 ? lerp(18, coreR, clamp((ratio - 0.12) / 0.78, 0, 1)) : 0;

        // 1) 두 원 사이의 회색 생존 고리 트랙 (coreR ~ innerR)
        ctx.fillStyle = 'rgba(44, 50, 64, 0.68)';
        ctx.beginPath();
        ctx.arc(0, 0, innerR, 0, CONFIG.TAU, false);
        if (coreR > 0) {
          ctx.arc(0, 0, coreR, 0, CONFIG.TAU, true);
        }
        ctx.fill();

        // 2) 바깥쪽 초대형 진홍 장판 (innerR 바깥에서 화면 왼쪽 끝까지 팽창!)
        ctx.fillStyle = 'rgba(235, 32, 38, 0.72)';
        ctx.beginPath();
        ctx.arc(0, 0, curOuterR, 0, CONFIG.TAU, false);
        ctx.arc(0, 0, innerR, 0, CONFIG.TAU, true);
        ctx.fill();

        // 바깥 원 내부 충전 밀도 강조
        const outerChargeR = lerp(innerR, curOuterR, ratio);
        ctx.fillStyle = 'rgba(255, 48, 55, 0.45)';
        ctx.beginPath();
        ctx.arc(0, 0, outerChargeR, 0, CONFIG.TAU, false);
        ctx.arc(0, 0, innerR, 0, CONFIG.TAU, true);
        ctx.fill();

        // 3) 안쪽 붉은 폭발 원 (0 ~ coreR: 중심에서 차오르며 안쪽을 막아 '원과 원 사이 고리'만 남김!)
        if (coreR > 0) {
          ctx.fillStyle = 'rgba(38, 28, 42, 0.55)';
          ctx.beginPath();
          ctx.arc(0, 0, coreR, 0, CONFIG.TAU);
          ctx.fill();

          ctx.fillStyle = 'rgba(238, 34, 40, 0.78)';
          ctx.beginPath();
          ctx.arc(0, 0, curCoreR, 0, CONFIG.TAU);
          ctx.fill();

          ctx.strokeStyle = 'rgba(226, 232, 240, 0.88)';
          ctx.shadowColor = '#f87171';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 3.4;
          ctx.beginPath();
          ctx.arc(0, 0, coreR, 0, CONFIG.TAU);
          ctx.stroke();
        }

        // 4) 바깥 원과 회색 고리의 경계선 & 최외곽 경계선
        ctx.strokeStyle = '#f1f5f9';
        ctx.shadowColor = '#f87171';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.arc(0, 0, innerR, 0, CONFIG.TAU);
        ctx.stroke();

        ctx.strokeStyle = '#fecdd3';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.arc(0, 0, curOuterR, 0, CONFIG.TAU);
        ctx.stroke();
      } else {
        // 폭발 시: 안쪽 원(0 ~ coreR)과 바깥쪽 거대 도넛(innerR ~ outerR)이 동시에 폭발하고, 오직 두 원 사이 고리(coreR ~ innerR)만 생존!
        const fade = 1 - postFire / 0.52;
        ctx.fillStyle = `rgba(126, 22, 185, ${0.86 * fade})`;
        ctx.beginPath();
        ctx.arc(0, 0, outerR * 1.02, 0, CONFIG.TAU, false);
        ctx.arc(0, 0, innerR * 0.99, 0, CONFIG.TAU, true);
        ctx.fill();

        if (coreR > 0) {
          ctx.beginPath();
          ctx.arc(0, 0, coreR * 1.01, 0, CONFIG.TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
}

function drawPlayerWaistChainHarness(ctx, px, py, time) {
  ctx.save();
  ctx.translate(px, py);
  const wings = [-0.32, 0.32];
  for (const tilt of wings) {
    ctx.save();
    ctx.rotate(tilt + Math.sin(time * 4) * 0.04);
    ctx.strokeStyle = '#818cf8';
    ctx.shadowColor = '#4f46e5';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 5.5;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 68, 24, 0, 0, CONFIG.TAU);
    ctx.stroke();

    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 68, 24, 0, 0, CONFIG.TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSpiderLilyFlower(ctx, point, color, labelText, time, remainRatio = null) {
  const [fx, fy] = point;
  const isBlue = color === 'blue';
  const pulse = 1 + Math.sin(time * 7.5) * 0.07;

  ctx.save();
  const poolGrad = ctx.createRadialGradient(fx, fy + 10, 6, fx, fy + 10, 64);
  poolGrad.addColorStop(
    0,
    isBlue ? 'rgba(56, 189, 248, 0.55)' : 'rgba(244, 63, 94, 0.55)'
  );
  poolGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = poolGrad;
  ctx.beginPath();
  ctx.ellipse(fx, fy + 10, 62, 24, 0, 0, CONFIG.TAU);
  ctx.fill();

  // 꽃 제한 시간 카운트다운 링 (시간 내에 못 먹으면 즉사!)
  if (remainRatio !== null) {
    const clamped = clamp(remainRatio, 0, 1);
    ctx.save();
    ctx.translate(fx, fy + 10);
    ctx.scale(1, 0.42);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, CONFIG.TAU);
    ctx.stroke();

    ctx.strokeStyle = clamped < 0.3 ? '#ef4444' : isBlue ? '#38bdf8' : '#fb7185';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 64, -Math.PI / 2, -Math.PI / 2 + CONFIG.TAU * clamped);
    ctx.stroke();
    ctx.restore();
  }

  const img = isBlue ? ASSETS.flowerBlue : ASSETS.flowerRed;
  if (isReady(img)) {
    const w = 128 * pulse;
    const h = 144 * pulse;
    ctx.drawImage(img, fx - w / 2, fy - h + 22, w, h);
  }

  ctx.fillStyle = isBlue ? '#bae6fd' : '#fecdd3';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 4;
  ctx.font = '700 12px "Malgun Gothic", "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(labelText, fx, fy + 38);
  ctx.restore();
}

function drawChainAndFlowers(ctx, sim) {
  const chain = sim.stage.chain;

  if (chain && sim.elapsed >= (chain.spawnTime ?? 0)) {
    if (!chain.cut) {
      const px = sim.p.x;
      const py = sim.p.y - 36 - sim.p.z;
      const [ax, ay] = chain.anchor;

      ctx.save();
      ctx.strokeStyle = '#818cf8';
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(ax, ay, 18, 0, CONFIG.TAU);
      ctx.stroke();

      const dx = px - ax;
      const dy = py - ay;
      const totalLen = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const linkStep = 18;
      const numLinks = Math.max(1, Math.floor(totalLen / linkStep));

      ctx.translate(ax, ay);
      ctx.rotate(angle);
      for (let i = 0; i <= numLinks; i++) {
        const lx = i * linkStep;
        ctx.strokeStyle = i % 2 === 0 ? '#a5b4fc' : '#6366f1';
        ctx.fillStyle = 'rgba(30, 27, 75, 0.75)';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.ellipse(lx, 0, 9, i % 2 === 0 ? 5.5 : 3.2, 0, 0, CONFIG.TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      drawPlayerWaistChainHarness(ctx, px, py, sim.animTime);
    } else if (chain.flower && !chain.flowerCollected) {
      const fExp = chain.flowerExpireTime || (sim.stage.duration - 0.12);
      const fStart = chain.cutTime || 0;
      const remain = clamp((fExp - sim.elapsed) / Math.max(0.1, fExp - fStart), 0, 1);
      drawSpiderLilyFlower(
        ctx,
        chain.flower,
        chain.flowerColor || 'red',
        chain.flowerColor === 'blue' ? '생명의 꽃' : '죽음의 꽃',
        sim.animTime,
        remain
      );
    }
  }

  if (sim.chainSeverFlashTimer > 0) {
    const f = sim.chainSeverFlashTimer / 0.55;
    const px = sim.p.x;
    const py = sim.p.y - 36 - sim.p.z;
    ctx.save();
    ctx.translate(px, py);
    ctx.strokeStyle = `rgba(232, 121, 249, ${f})`;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 6 * f;
    const L = 125 * (1.2 - f * 0.4);
    ctx.beginPath();
    ctx.moveTo(-L, -L * 0.65);
    ctx.lineTo(L, L * 0.65);
    ctx.moveTo(L, -L * 0.65);
    ctx.lineTo(-L, L * 0.65);
    ctx.stroke();
    ctx.restore();
  }

  const fl = sim.stage.standaloneFlower;
  if (fl && !fl.collected && sim.elapsed >= (fl.spawnTime ?? 0)) {
    const fStart = fl.spawnTime ?? 0;
    const fExp = fl.expireTime || (sim.stage.duration - 0.12);
    const remain = clamp((fExp - sim.elapsed) / Math.max(0.1, fExp - fStart), 0, 1);
    drawSpiderLilyFlower(
      ctx,
      fl.point,
      fl.color,
      fl.color === 'blue' ? '생명의 꽃' : '죽음의 꽃',
      sim.animTime,
      remain
    );
  }
}

function drawCounterAndLargoClash(ctx, sim, counter) {
  const [bx, by] = counter.point;
  const t = sim.elapsed;

  ctx.save();
  if (!counter.hit && t >= counter.windupStart) {
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * CONFIG.TAU + sim.animTime * 2.5;
      const rOuter = 320 - ((sim.animTime * 260 + i * 35) % 260);
      const x1 = bx + Math.cos(ang) * rOuter;
      const y1 = by + Math.sin(ang) * rOuter * 0.65;
      const x2 = bx + Math.cos(ang) * Math.max(20, rOuter - 75);
      const y2 = by + Math.sin(ang) * Math.max(20, rOuter - 75) * 0.65;

      ctx.strokeStyle = 'rgba(216, 180, 254, 0.62)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  if (!counter.hit && t >= counter.grayscaleStart) {
    // 수묵 먹물 암전 비네팅 + 순백색 방사형 검기 광풍 + 흰 별 섬광
    const inkGrad = ctx.createRadialGradient(bx, by - 40, 120, bx, by - 40, 820);
    inkGrad.addColorStop(0, 'rgba(10, 10, 12, 0.25)');
    inkGrad.addColorStop(0.55, 'rgba(8, 8, 10, 0.68)');
    inkGrad.addColorStop(1, 'rgba(2, 2, 4, 0.92)');
    ctx.fillStyle = inkGrad;
    ctx.fillRect(-600, -100, 2400, 920);

    // 순백색 수묵 검기 광풍 (좌->우로 뻗어나가는 강렬한 흰색 붓터치 파동)
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
    for (let i = 0; i < 6; i++) {
      const yOff = (i - 2.5) * 32;
      const lenW = 280 + (i % 3) * 110;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.38 + (i % 2) * 0.34})`;
      ctx.lineWidth = 4 + (i % 3) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 120, by - 20 + yOff);
      ctx.quadraticCurveTo(bx + lenW * 0.45, by - 55 + yOff * 0.6, bx + lenW, by - 10 + yOff * 1.1);
      ctx.stroke();
    }
    ctx.restore();

    const starX = bx - 10;
    const starY = by - 135;
    const starScale = 1 + Math.sin(sim.animTime * 28) * 0.18;

    ctx.save();
    ctx.translate(starX, starY);
    ctx.scale(starScale, starScale);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 24;

    ctx.beginPath();
    ctx.moveTo(-75, 0);
    ctx.quadraticCurveTo(0, -10, 75, 0);
    ctx.quadraticCurveTo(0, 10, -75, 0);
    ctx.moveTo(0, -65);
    ctx.quadraticCurveTo(10, 0, 0, 65);
    ctx.quadraticCurveTo(-10, 0, 0, -65);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, CONFIG.TAU);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 18px "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ 지금 공격 [X] 카운터! ★', bx, by - 195);
  }

  if (counter.largoClashActive) {
    const lx = bx + 135;
    const ly = by + 10;

    if (isReady(ASSETS.largoSheet)) {
      const fw = ASSETS.largoSheet.naturalWidth / 12;
      const fh = ASSETS.largoSheet.naturalHeight;
      const fIdx = Math.floor(sim.animTime * 14) % 12;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.scale(-1, 1);
      ctx.drawImage(ASSETS.largoSheet, fIdx * fw, 0, fw, fh, -165, -155, 330, 260);
      ctx.restore();
    }

    const clashX = bx + 55;
    const clashY = by - 15;
    ctx.save();
    ctx.translate(clashX, clashY);
    ctx.rotate(-0.62);

    const slashGrad = ctx.createLinearGradient(-320, 0, 320, 0);
    slashGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
    slashGrad.addColorStop(0.25, 'rgba(232, 121, 249, 0.92)');
    slashGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.98)');
    slashGrad.addColorStop(0.75, 'rgba(192, 38, 211, 0.92)');
    slashGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
    ctx.fillStyle = slashGrad;
    ctx.beginPath();
    ctx.moveTo(-320, 0);
    ctx.quadraticCurveTo(0, -28, 320, 0);
    ctx.quadraticCurveTo(0, 28, -320, 0);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(0, 0, 28 + Math.sin(sim.animTime * 40) * 6, 0, CONFIG.TAU);
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * CONFIG.TAU + sim.animTime * 8;
      ctx.strokeStyle = i % 2 === 0 ? '#1e0b2e' : '#f472b6';
      ctx.lineWidth = i % 2 === 0 ? 4.5 : 2.2;
      ctx.beginPath();
      ctx.moveTo(clashX, clashY);
      ctx.lineTo(clashX + Math.cos(ang) * 95, clashY + Math.sin(ang) * 75);
      ctx.lineTo(clashX + Math.cos(ang + 0.25) * 165, clashY + Math.sin(ang + 0.25) * 135);
      ctx.stroke();
    }

    if (t >= 10.65 && t <= 11.65) {
      const u = (t - 10.65) / 1.0;
      const ringR = 60 + u * 520;
      ctx.strokeStyle = `rgba(250, 204, 21, ${(1 - u) * 0.95})`;
      ctx.lineWidth = 36 * (1 - u * 0.6);
      ctx.beginPath();
      ctx.arc(clashX, clashY, ringR, 0, CONFIG.TAU);
      ctx.stroke();

      ctx.strokeStyle = `rgba(244, 63, 94, ${(1 - u) * 0.85})`;
      ctx.lineWidth = 16 * (1 - u * 0.5);
      ctx.beginPath();
      ctx.arc(clashX, clashY, ringR * 0.82, 0, CONFIG.TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPracticeGuide(ctx, sim) {
  const stage = sim.stage;
  ctx.save();

  if (stage.guideWaypoints && stage.guideWaypoints.length > 1) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    stage.guideWaypoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt[0], pt[1]);
      else ctx.lineTo(pt[0], pt[1]);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    stage.guideWaypoints.forEach((pt, idx) => {
      ctx.fillStyle = idx === stage.guideWaypoints.length - 1 ? '#22c55e' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 11, 0, CONFIG.TAU);
      ctx.fill();
      ctx.fillStyle = '#07111e';
      ctx.font = '800 11px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(idx + 1), pt[0], pt[1] + 4);
    });
  }

  if (stage.safeSpot) {
    const [sx, sy] = stage.safeSpot;
    const pulseR = 24 + Math.sin(sim.animTime * 6) * 4;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.16)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, pulseR, 0, CONFIG.TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#bbf7d0';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.font = '700 12px "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('추천 위치 (10시)', sx, sy - pulseR - 6);
  }
  if (stage.altSafeSpot) {
    const [ax, ay] = stage.altSafeSpot;
    const pulseR = 22 + Math.sin(sim.animTime * 6 + 1.5) * 4;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.88)';
    ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(ax, ay, pulseR, 0, CONFIG.TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#bae6fd';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.font = '700 12px "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('보조 위치 (6시)', ax, ay - pulseR - 6);
  }
  ctx.restore();
}

// 프리스트 36프레임 스프라이트 시트 원본 픽셀 외곽 오프셋 [left, right, top, bottom] (기준점 anchor=(88, 152), 우측 +1 기준)
// PLAYER_SPRITE_SCALE(1.18x, 기존 0.78x 대비 약 1.51배 확대)을 곱해 실제 인게임 캐릭터 비율 및 프레임별 히트박스 생성:
// - 0..3   : 기본모션 (전투 대기, ~78x150px)
// - 4..11  : 걷기 (8프레임 직립 보행, ~86x159px)
// - 12..17 : 대시 (6프레임 전방 숙임 돌진, ~122x119px -> 걷기 대비 키가 ~40px 낮아지고 가로 폭 확장!)
// - 18..21 : 점프 (도약·상승·정점·하강 4프레임)
// - 22..24 : 백스텝 (↓+C 후방 회피 전용 3프레임, ~129x135px)
// - 25..33 : 평타 공격 1타(25..27) · 2타(28..30) · 3타 어퍼(31..33)
// - 34..35 : 피격 경직
const PLAYER_SPRITE_SCALE = 1.18;
const PLAYER_FOOT_OFFSET_Y = 12.0;
const PLAYER_RAW_FRAME_BOUNDS = [
  [-29, 37, -126, 1], [-34, 38, -125, 1], [-30, 37, -124, 1], [-30, 35, -125, 1],
  [-44, 29, -135, 0], [-38, 35, -133, 0], [-37, 17, -134, -3], [-43, 29, -135, -4],
  [-44, 35, -135, -4], [-35, 36, -133, 1], [-37, 30, -134, 1], [-43, 24, -135, 1],
  [-57, 45, -108, 0], [-51, 52, -107, -6], [-36, 43, -112, -4], [-47, 63, -108, -5],
  [-37, 47, -106, 0], [-40, 43, -110, 1],
  [-33, 43, -106, -1], [-31, 34, -124, -22], [-39, 41, -133, 1], [-35, 43, -123, -1],
  [-41, 44, -121, 1], [-67, 42, -113, 1], [-67, 42, -113, 1],
  [-48, 77, -105, 1], [-48, 77, -105, 1], [-50, 34, -107, 1],
  [-49, 37, -105, 1], [-47, 89, -102, 1], [-47, 87, -101, 1],
  [-66, 36, -101, 1], [-66, 54, -118, 1], [-67, 18, -152, 1],
  [-49, 41, -109, 1], [-39, 35, -110, 0]
];

function getPlayerFrameIndex(p, isMoving = false) {
  if (p.hitStun > 0) {
    return p.hitStun > 0.12 ? 34 : 35;
  }
  if (p.attack > 0) {
    const combo = (p.attackCombo || 0) % 3;
    const sub = Math.min(2, Math.floor(((0.28 - p.attack) / 0.28) * 3));
    return 25 + combo * 3 + Math.max(0, sub);
  }
  if (p.backstep > 0) {
    const u = 1 - clamp(p.backstep / 0.24, 0, 1);
    return 22 + Math.min(2, Math.floor(u * 3));
  }
  if (p.z > 0) {
    if (p.vz > 340) return 18;
    if (p.vz > 90) return 19;
    if (p.vz > -120) return 20;
    return 21;
  }
  if (isMoving && p.running) {
    return 12 + (Math.floor(p.animTimer) % 6);
  }
  if (isMoving) {
    return 4 + (Math.floor(p.animTimer) % 8);
  }
  return Math.floor(p.animTimer) % 4;
}

function getPlayerHitbox(p, isMoving = false) {
  const frameIdx = getPlayerFrameIndex(p, isMoving);
  const [rL, rR, rT, rB] = PLAYER_RAW_FRAME_BOUNDS[frameIdx] || PLAYER_RAW_FRAME_BOUNDS[0];
  const bL = rL * PLAYER_SPRITE_SCALE;
  const bR = rR * PLAYER_SPRITE_SCALE;
  const bT = rT * PLAYER_SPRITE_SCALE + PLAYER_FOOT_OFFSET_Y;
  const bB = rB * PLAYER_SPRITE_SCALE + PLAYER_FOOT_OFFSET_Y;

  const drawY = p.y - p.z;
  const depthScale = 0.94 + clamp((drawY - 295) / 355, 0, 1) * 0.12;
  const facing = p.facing >= 0 ? 1 : -1;

  const left = facing > 0 ? p.x + bL * depthScale : p.x - bR * depthScale;
  const right = facing > 0 ? p.x + bR * depthScale : p.x - bL * depthScale;
  const top = drawY + bT * depthScale;
  const bottom = drawY + bB * depthScale;
  const w = right - left;
  const h = bottom - top;
  const cx = (left + right) * 0.5;
  const cy = (top + bottom) * 0.5;
  const y25 = top + h * 0.25;
  const y75 = top + h * 0.75;
  const groundY = p.y + 9.5 * depthScale;
  const groundHalfW = clamp(w * 0.30, 21, 36);
  const groundHalfH = 12.5 * depthScale;

  // 확대된 캐릭터 외곽 전체를 촘촘하게 커버하는 15점 샘플링 그리드
  const samplePoints = [
    { x: left, y: top },    { x: cx, y: top },    { x: right, y: top },
    { x: left, y: y25 },    { x: cx, y: y25 },    { x: right, y: y25 },
    { x: left, y: cy },     { x: cx, y: cy },     { x: right, y: cy },
    { x: left, y: y75 },    { x: cx, y: y75 },    { x: right, y: y75 },
    { x: left, y: bottom }, { x: cx, y: bottom }, { x: right, y: bottom }
  ];

  const motion =
    frameIdx >= 34
      ? 'hit'
      : frameIdx >= 25
      ? 'attack'
      : frameIdx >= 22
      ? 'backstep'
      : frameIdx >= 18
      ? 'jump'
      : frameIdx >= 12
      ? 'dash'
      : frameIdx >= 4
      ? 'walk'
      : 'idle';

  return {
    frameIdx,
    motion,
    isRunningPose: motion === 'dash',
    left,
    right,
    top,
    bottom,
    x: left,
    y: top,
    w,
    h,
    cx,
    cy,
    depthScale,
    groundX: p.x,
    groundY,
    groundHalfW,
    groundHalfH,
    samplePoints
  };
}

function drawPlayerSpriteFrame(ctx, x, y, facing, frameIdx, isInvuln, isHitStun = false) {
  ctx.save();
  ctx.translate(x, y);
  const depthScale = 0.94 + clamp((y - 295) / 355, 0, 1) * 0.12;
  const dir = facing >= 0 ? 1 : -1;
  ctx.scale(dir * depthScale, depthScale);
  ctx.imageSmoothingEnabled = false;

  if (isReady(ASSETS.playerSheet)) {
    const totalFrames = 36;
    const fw = ASSETS.playerSheet.naturalWidth / totalFrames;
    const fh = ASSETS.playerSheet.naturalHeight;
    const drawW = 196 * PLAYER_SPRITE_SCALE;
    const drawH = 172 * PLAYER_SPRITE_SCALE;
    const dx = -88 * PLAYER_SPRITE_SCALE;
    const dy = -152 * PLAYER_SPRITE_SCALE + PLAYER_FOOT_OFFSET_Y;

    ctx.shadowColor = isHitStun ? '#ff1744' : isInvuln ? '#38bdf8' : 'rgba(234, 179, 8, 0.72)';
    ctx.shadowBlur = isHitStun || isInvuln ? 14 : 3;
    if (isHitStun) {
      ctx.filter = 'brightness(1.35) sepia(0.6) hue-rotate(-35deg) saturate(3)';
    }
    ctx.drawImage(
      ASSETS.playerSheet,
      frameIdx * fw,
      0,
      fw,
      fh,
      dx,
      dy,
      drawW,
      drawH
    );
  } else {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -45, 24, 0, CONFIG.TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx, sim) {
  const p = sim.p;
  const drawY = p.y - p.z;

  // 대시/백스텝 순간 풍압 충격파 링
  if (sim.dashRings) {
    for (const dr of sim.dashRings) {
      const u = 1 - dr.life / dr.maxLife;
      const a = 1 - u;
      ctx.save();
      ctx.translate(dr.x - dr.facing * 12, dr.y);
      ctx.strokeStyle = `rgba(224, 242, 254, ${0.75 * a})`;
      ctx.lineWidth = 3.5 * a;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12 + u * 18, 34 + u * 26, 0, 0, CONFIG.TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  for (const a of sim.afterimages) {
    const alpha = (a.life / a.maxLife) * 0.38;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPlayerSpriteFrame(ctx, a.x, a.y - a.z, a.facing, a.frameIdx ?? 13, false, false);
    ctx.restore();
  }

  const shadowScale = clamp(1 - p.z / 170, 0.35, 1);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.54)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 11, 38 * shadowScale, 13 * shadowScale, 0, 0, CONFIG.TAU);
  ctx.fill();

  if (p.attack > 0) {
    ctx.save();
    ctx.translate(p.x + p.facing * 64, drawY - 68);
    const muzzleGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 56);
    muzzleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    muzzleGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.85)');
    muzzleGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = muzzleGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, CONFIG.TAU);
    ctx.fill();
    ctx.restore();
  }

  // 플레이어 평타 발사체(검기/탄환) 렌더링
  if (sim.projectiles) {
    for (const proj of sim.projectiles) {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      const pGrad = ctx.createLinearGradient(-proj.facing * 85, 0, proj.facing * 25, 0);
      pGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      pGrad.addColorStop(0.6, 'rgba(125, 211, 252, 0.88)');
      pGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = pGrad;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(0, 0, 46, 10, 0, 0, CONFIG.TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  const hb = getPlayerHitbox(p, Boolean(sim.isMoving));
  drawPlayerSpriteFrame(ctx, p.x, drawY, p.facing, hb.frameIdx, p.invuln > 0, p.hitStun > 0);

  // 플레이어블 캐릭터 도트 이미지 크기·자세(대기/걷기/달리기/점프/사격)와 100% 일치하는 실시간 동적 히트박스 표시
  if (sim.showPlayerHitbox !== false || sim.showHitbox) {
    const isJumpEvade = p.z >= 24;
    const isHurt = p.hitStun > 0 || sim.hitFlash > 0.05;
    // 걷기(시안) vs 달리기 저자세(앰버-시안 강조) vs 피격(로즈) 직관 구분
    const boxStroke = isHurt ? '#fb7185' : hb.isRunningPose ? '#38bdf8' : '#22d3ee';
    const boxFill = isHurt
      ? 'rgba(244, 63, 94, 0.20)'
      : hb.isRunningPose
      ? 'rgba(56, 189, 248, 0.13)'
      : 'rgba(34, 211, 238, 0.11)';
    const groundColor = isHurt ? '#fb7185' : isJumpEvade ? '#38bdf8' : '#4ade80';

    ctx.save();

    // 점프 중 지면 발판 중심과 공중 히트박스 하단 연결선
    if (p.z > 2) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(hb.groundX, hb.groundY);
      ctx.lineTo(hb.cx, hb.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // (A) 캐릭터 도트 실루엣과 1px 오차 없이 일치하는 프레임별 동적 몸통 히트박스 [hb.x, hb.y, hb.w, hb.h]
    ctx.fillStyle = boxFill;
    ctx.strokeStyle = boxStroke;
    ctx.shadowColor = boxStroke;
    ctx.shadowBlur = 5;
    ctx.lineWidth = 1.8;
    ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
    ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);

    // 네 모서리 브래킷 강조 (도트 외곽 정밀 표시)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ecfeff';
    ctx.lineWidth = 2.0;
    const cLen = 6;
    ctx.beginPath();
    ctx.moveTo(hb.left, hb.top + cLen); ctx.lineTo(hb.left, hb.top); ctx.lineTo(hb.left + cLen, hb.top);
    ctx.moveTo(hb.right - cLen, hb.top); ctx.lineTo(hb.right, hb.top); ctx.lineTo(hb.right, hb.top + cLen);
    ctx.moveTo(hb.left, hb.bottom - cLen); ctx.lineTo(hb.left, hb.bottom); ctx.lineTo(hb.left + cLen, hb.bottom);
    ctx.moveTo(hb.right - cLen, hb.bottom); ctx.lineTo(hb.right, hb.bottom); ctx.lineTo(hb.right, hb.bottom - cLen);
    ctx.stroke();

    // (B) 지면 장판·기둥 발밑 타원 히트박스 (걷기/달리기 폭과 연동!)
    ctx.fillStyle = isHurt
      ? 'rgba(244, 63, 94, 0.26)'
      : isJumpEvade
      ? 'rgba(56, 189, 248, 0.22)'
      : 'rgba(74, 222, 128, 0.22)';
    ctx.strokeStyle = groundColor;
    ctx.shadowColor = groundColor;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(hb.groundX, hb.groundY, hb.groundHalfW, hb.groundHalfH, 0, 0, CONFIG.TAU);
    ctx.fill();
    ctx.stroke();

    // 발밑 기준점 십자 코어
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, hb.groundY, 2.6, 0, CONFIG.TAU);
    ctx.fill();

    ctx.restore();
  }
}

function drawParticles(ctx, sim) {
  for (const d of sim.dustPuffs) {
    const a = clamp(d.life / d.maxLife, 0, 1);
    ctx.fillStyle = `rgba(226, 232, 240, ${a * 0.5})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * (1.3 - a * 0.3), 0, CONFIG.TAU);
    ctx.fill();
  }
  for (const s of sim.particles) {
    const a = clamp(s.life / s.maxLife, 0, 1);
    ctx.fillStyle = s.color;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, CONFIG.TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 원작 DNF 스타일 데미지 폰트 & 회피/카운터 플로팅 텍스트
  if (sim.floatingTexts) {
    for (const ft of sim.floatingTexts) {
      const a = clamp(ft.life / ft.maxLife, 0, 1);
      const popScale = ft.life > ft.maxLife * 0.78 ? 1.25 : 1.0;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(ft.x, ft.y);
      ctx.scale(popScale, popScale);
      ctx.textAlign = 'center';

      if (ft.subText) {
        ctx.font = '800 11px "Malgun Gothic", "Noto Sans KR", sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#09030e';
        ctx.strokeText(ft.subText, 0, -ft.size - 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(ft.subText, 0, -ft.size - 2);
      }

      ctx.font = `italic 900 ${ft.size}px "Malgun Gothic", "Noto Sans KR", sans-serif`;
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#09030e';
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }
  }
}

function drawRainbowPrismShatter(ctx, sim) {
  const W = CONFIG.WIDTH;
  const H = CONFIG.HEIGHT;
  const u = 1 - sim.counterShatterTimer / 0.75;
  const fade = 1 - u;
  const cx = (sim.stage?.counter?.point[0] ?? 540) - sim.cameraX + 45;
  const cy = sim.stage?.counter?.point[1] ?? 415;

  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140 + u * 560);
  grad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * fade})`);
  grad.addColorStop(0.28, `rgba(253, 224, 71, ${0.75 * fade})`);
  grad.addColorStop(0.55, `rgba(244, 114, 182, ${0.68 * fade})`);
  grad.addColorStop(0.8, `rgba(56, 189, 248, ${0.52 * fade})`);
  grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = `rgba(125, 211, 252, ${0.88 * fade})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 90 + u * 360, 0, CONFIG.TAU);
  ctx.stroke();
  ctx.restore();
}

function drawInGameDnfHud(ctx, sim) {
  const W = CONFIG.WIDTH;
  const META = window.Yurisie.HISTORY_META;
  const globalT = sim.globalTime || 0;

  ctx.save();
  const hudX = 28;
  const hudY = 72;
  const barW = 395;
  const barH = 18;

  ctx.font = '700 12px "Malgun Gothic", "Noto Sans KR", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e2e8f0';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 4;
  ctx.fillText(META.bossName, hudX + 4, hudY - 6);

  ctx.fillStyle = 'rgba(12, 10, 18, 0.92)';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hudX, hudY);
  ctx.lineTo(hudX + barW, hudY);
  ctx.lineTo(hudX + barW - 10, hudY + barH);
  ctx.lineTo(hudX, hudY + barH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const hpPct = globalT >= 50.2 ? 96.13 : 97.41;
  const hpLines = globalT >= 50.2 ? 'x 1256841' : 'x 1273630';
  const hpGrad = ctx.createLinearGradient(hudX, hudY, hudX + barW, hudY);
  hpGrad.addColorStop(0, '#4c1d95');
  hpGrad.addColorStop(0.65, '#6d28d9');
  hpGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = hpGrad;
  ctx.fillRect(hudX + 2, hudY + 2, (barW - 14) * (hpPct / 100), barH - 4);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 12px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${hpPct.toFixed(2)}%`, hudX + barW * 0.48, hudY + 13);
  ctx.textAlign = 'right';
  ctx.font = 'italic 800 12px "Malgun Gothic", sans-serif';
  ctx.fillText(hpLines, hudX + barW - 14, hudY + 13);

  const stagX = hudX + 225;
  const stagY = hudY + barH + 2;
  const stagW = 160;
  ctx.fillStyle = 'rgba(15, 10, 18, 0.92)';
  ctx.fillRect(stagX, stagY, stagW, 11);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(stagX + 2, stagY + 2, stagW - 42, 7);
  ctx.fillStyle = '#fb923c';
  ctx.font = '700 10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('100%', stagX + stagW - 4, stagY + 9);

  const infX = hudX + 4;
  const infY = hudY + 34;
  const infW = 156;
  ctx.fillStyle = 'rgba(15, 10, 22, 0.92)';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.fillRect(infX, infY, infW, 12);
  ctx.strokeRect(infX, infY, infW, 12);

  const largoRatio = clamp((sim.influence ?? 50) / 100, 0.1, 0.9);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(infX + 2, infY + 2, (infW - 22) * largoRatio, 8);
  ctx.fillStyle = '#7e22ce';
  ctx.fillRect(
    infX + 2 + (infW - 22) * largoRatio,
    infY + 2,
    (infW - 22) * (1 - largoRatio),
    8
  );

  // 하단 중앙 보스 캐스팅 바 ([파멸], [생명의 꽃], [죽음의 꽃], [생명의 끝], [지금이다, 모험가])
  if (sim.stage) {
    const activeCast =
      sim.stage.largoCastBar &&
      sim.elapsed >= sim.stage.largoCastBar.startTime &&
      sim.elapsed <= sim.stage.largoCastBar.endTime
        ? sim.stage.largoCastBar
        : sim.stage.castBar &&
          sim.elapsed >= sim.stage.castBar.startTime &&
          sim.elapsed <= sim.stage.castBar.endTime
        ? sim.stage.castBar
        : null;

    if (activeCast) {
      const castRatio = clamp(
        (sim.elapsed - activeCast.startTime) /
          Math.max(0.05, activeCast.endTime - activeCast.startTime),
        0,
        1
      );
      const cw = 166;
      const ch = 23;
      const cx = W / 2 - cw / 2;
      const cy = 602;

      ctx.fillStyle = 'rgba(15, 10, 16, 0.94)';
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.6;
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeRect(cx, cy, cw, ch);

      ctx.fillStyle = '#292524';
      ctx.fillRect(cx + 2, cy + 2, 19, 19);
      const iconImg =
        activeCast.icon === 'largo'
          ? ASSETS.iconLargo
          : activeCast.icon === 'flower_blue'
          ? ASSETS.iconFlowerBlue
          : activeCast.icon === 'flower_red'
          ? ASSETS.iconFlowerRed
          : ASSETS.iconDisaster;
      if (isReady(iconImg)) {
        ctx.drawImage(iconImg, cx + 2, cy + 2, 19, 19);
      }

      ctx.fillStyle = activeCast.color || '#d92b4b';
      ctx.fillRect(cx + 23, cy + 13, (cw - 26) * castRatio, 7);

      ctx.fillStyle = '#fde047';
      ctx.font = '700 11px "Malgun Gothic", "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activeCast.title, cx + 21 + (cw - 21) / 2, cy + 10);
    }
  }

  // 하단 플레이어 HP/MP 바
  const pBarW = 182;
  const pBarH = 15;
  const pBarX = W / 2 - pBarW / 2;
  const pBarY = 668;

  ctx.fillStyle = 'rgba(14, 10, 18, 0.95)';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(pBarX, pBarY, pBarW, pBarH, 4);
  ctx.fill();
  ctx.stroke();

  if (sim.worldDeath) {
    const dGrad = ctx.createLinearGradient(pBarX, pBarY, pBarX + pBarW, pBarY);
    dGrad.addColorStop(0, '#581c87');
    dGrad.addColorStop(1, '#9333ea');
    ctx.fillStyle = dGrad;
    ctx.fillRect(pBarX + 2, pBarY + 2, pBarW - 4, pBarH - 4);
  } else {
    const lGrad = ctx.createLinearGradient(pBarX, pBarY, pBarX + pBarW, pBarY);
    lGrad.addColorStop(0, '#dc2626');
    lGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = lGrad;
    const hpRatio = clamp((sim.playerHpPct ?? 100) / 100, 0.05, 1);
    ctx.fillRect(pBarX + 2, pBarY + 2, (pBarW - 4) * hpRatio, pBarH - 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(hpRatio * 100)}%`, pBarX + pBarW / 2, pBarY + 11);
  }

  ctx.fillStyle = 'rgba(12, 16, 24, 0.9)';
  ctx.fillRect(pBarX + pBarW + 34, pBarY + 9, 110, 5);
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(pBarX + pBarW + 35, pBarY + 10, 108, 3);

  // 상단 중앙 행동 가이드 배너
  if (sim.stage && sim.stage.actionCue) {
    const cueW = 620;
    const cueX = W / 2 - cueW / 2;
    const cueY = 16;
    ctx.fillStyle = 'rgba(12, 8, 22, 0.84)';
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.48)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(cueX, cueY, cueW, 28, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fdf2f8';
    ctx.font = '700 13px "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`▶ ${sim.stage.actionCue}`, W / 2, cueY + 19);
  }

  if (sim.feedbackTimer > 0 && sim.feedbackText) {
    ctx.fillStyle = 'rgba(15, 6, 26, 0.92)';
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 220, 128, 440, 34, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = '800 15px "Malgun Gothic", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sim.feedbackText, W / 2, 150);
  }

  ctx.restore();
}

function renderFrame(ctx, sim) {
  const W = CONFIG.WIDTH;
  const H = CONFIG.HEIGHT;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  const isGrayscaleMoment =
    sim.stage &&
    sim.stage.counter &&
    !sim.stage.counter.hit &&
    sim.elapsed >= sim.stage.counter.grayscaleStart &&
    sim.elapsed <= sim.stage.counter.windowEnd + 0.15;

  if (isGrayscaleMoment) {
    ctx.filter = 'grayscale(100%) contrast(1.16) brightness(0.94)';
  }

  if (sim.screenShake > 0) {
    const mag = sim.screenShake * 18;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  if (sim.stage && sim.stage.introCutscene && sim.elapsed < sim.stage.introCutscene.endTime) {
    const cam = getIntroCameraTransform(sim);
    ctx.save();
    ctx.translate(cam.cx + cam.shakeX, cam.cy + cam.shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.cx, -cam.cy);
    drawScrollingArena(ctx, sim);
    drawFullIntroSequence(ctx, sim);
    ctx.restore();
    ctx.filter = 'none';
    drawInGameDnfHud(ctx, sim);
    ctx.restore();
    return;
  }

  drawScrollingArena(ctx, sim);

  ctx.save();
  ctx.translate(-sim.cameraX, 0);

  if (sim.stage && sim.stage.grayCircleZone) {
    drawGrayCircleZone(ctx, sim, sim.stage.grayCircleZone);
  }
  if (sim.stage && Array.isArray(sim.stage.grayCircleZones)) {
    for (const z of sim.stage.grayCircleZones) {
      drawGrayCircleZone(ctx, sim, z);
    }
  }

  // 바닥 장판 레이어 (보스 본체 아래쪽 바닥에 깔리는 붉은 대각 장판, 거대 원형 장판, 땅울림 등)
  if (sim.stage) {
    drawAttacks(ctx, sim, 'floor');
  }

  if (sim.stage && (sim.stage.ambientSwords || sim.stage.corridorBorderSwords || sim.stage.rotatingCorridor)) {
    drawAmbientBackgroundSwords(ctx, sim, Boolean(sim.stage.corridorBorderSwords));
  }

  drawYurisieBoss(ctx, sim);

  if (sim.stage && sim.stage.envelope) {
    draw36SwordRing(ctx, sim, sim.stage.envelope);
  }

  if (sim.stage && sim.stage.swordWheel12) {
    draw12SpokeSwordWheel(ctx, sim, sim.stage.swordWheel12);
  }

  // 공중/화면 전체 참격 레이어 (검은 코어 검선, 수직 보라 번개 기둥, 보라 빔, 톱니 블랙홀 등)
  if (sim.stage) {
    drawAttacks(ctx, sim, 'air');
    drawChainAndFlowers(ctx, sim);
  }

  if (sim.stage && sim.stage.counter) {
    drawCounterAndLargoClash(ctx, sim, sim.stage.counter);
  }

  if (sim.showGuide && sim.stage) {
    drawPracticeGuide(ctx, sim);
  }

  drawPlayer(ctx, sim);
  drawParticles(ctx, sim);

  ctx.restore();
  ctx.filter = 'none';

  if (sim.counterShatterTimer > 0) {
    drawRainbowPrismShatter(ctx, sim);
  }

  if (sim.worldTransition > 0) {
    const fade = sim.worldTransition / 0.55;
    ctx.fillStyle = sim.worldDeath
      ? `rgba(59, 130, 246, ${0.22 * fade})`
      : `rgba(244, 63, 94, ${0.22 * fade})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (sim.hitFlash > 0) {
    const hf = sim.hitFlash / 0.28;
    const hitGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.65);
    hitGrad.addColorStop(0, 'rgba(225, 29, 72, 0)');
    hitGrad.addColorStop(1, `rgba(225, 29, 72, ${0.46 * hf})`);
    ctx.fillStyle = hitGrad;
    ctx.fillRect(0, 0, W, H);
  }

  drawInGameDnfHud(ctx, sim);
  ctx.restore();
}

window.Yurisie.CONFIG = CONFIG;
window.Yurisie.BOUNDS = CONFIG.BOUNDS;
window.Yurisie.CENTER = CONFIG.CENTER;
window.Yurisie.getEnvelopeCenter = getEnvelopeCenter;
window.Yurisie.getEnvelopeRadius = getEnvelopeRadius;
window.Yurisie.getSwordWheelPos = getSwordWheelPos;
window.Yurisie.getCorridorOffsetY = getCorridorOffsetY;
window.Yurisie.getRotatingCorridorSwords = getRotatingCorridorSwords;
window.Yurisie.getPlayerHitbox = getPlayerHitbox;
window.Yurisie.renderFrame = renderFrame;
})();
