// ============================================================================
// 각인된 악몽 2페이즈 - 유리지에 : "역사의 끝 (역사 칼날 패턴)"
// 인게임 액션 물리 및 패턴 판정 시뮬레이션 엔진
// ============================================================================
(() => {
'use strict';
const {
  SyncAudioEngine,
  HISTORY_META,
  HISTORY_STAGES,
  CONFIG,
  BOUNDS,
  CENTER,
  getEnvelopeCenter,
  getEnvelopeRadius,
  getSwordWheelPos,
  getCorridorOffsetY,
  getRotatingCorridorSwords,
  getPlayerHitbox,
  renderFrame
} = window.Yurisie;

const $ = (sel) => document.querySelector(sel);
const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d');

const audio = new SyncAudioEngine();
audio.attachSubtitleEl($('#voiceSub'));

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const dist = (p, pt) => Math.hypot(p.x - pt[0], p.y - pt[1]);

function isPointInOrientedStrip(point, origin, angle, width, length = 2200) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const relX = point.x - origin[0];
  const relY = point.y - origin[1];
  const along = relX * cos + relY * sin;
  const perp = -relX * sin + relY * cos;
  return Math.abs(along) <= length / 2 && Math.abs(perp) <= width / 2;
}

function doesLineCutSegment(lineOrigin, lineAngle, segA, segB) {
  const dx = Math.cos(lineAngle);
  const dy = Math.sin(lineAngle);
  const dA = (segA[0] - lineOrigin[0]) * dy - (segA[1] - lineOrigin[1]) * dx;
  const dB = (segB[0] - lineOrigin[0]) * dy - (segB[1] - lineOrigin[1]) * dx;
  return (dA <= 22 && dB >= -22) || (dA >= -22 && dB <= 22);
}

const STORAGE_KEY = 'yurisie_history_prefs_v5';
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

const prefs = loadPrefs();

const state = {
  active: false,
  paused: false,
  // 원작 난이도 기본값: 무적 OFF, 1대 맞으면 사망
  godMode: prefs.godMode !== undefined ? Boolean(prefs.godMode) : false,
  loopStage: Boolean(prefs.loopStage),
  // 플레이어 캐릭터 실제 피격 히트박스는 기본 ON (B키로 토글 가능)
  showPlayerHitbox: prefs.showPlayerHitbox !== undefined ? Boolean(prefs.showPlayerHitbox) : true,
  // 인위적인 경로 가이드 원/점선은 기본 OFF (H키로 토글 가능)
  showHitbox: prefs.showHitbox !== undefined ? Boolean(prefs.showHitbox) : false,
  showGuide: prefs.showGuide !== undefined ? Boolean(prefs.showGuide) : false,
  speedScale: [0.75, 1.0, 1.25].includes(prefs.speedScale) ? prefs.speedScale : 1.0,
  step: 0,
  worldDeath: false,
  worldTransition: 0,
  influence: 52,
  playerHpPct: 100,
  completedSteps: new Set(),
  noHitSteps: new Set(Array.isArray(prefs.noHitSteps) ? prefs.noHitSteps : []),
  stageHits: 0,
  stage: null,
  elapsed: 0,
  globalTime: 0,
  animTime: 0,
  totalHits: 0,
  maxHits: prefs.maxHits !== undefined ? Number(prefs.maxHits) : 1,
  cameraX: 0,
  bossPos: [...CONFIG.BOSS_ANCHOR],
  bossHitFlash: 0,
  hitFlash: 0,
  hitStop: 0,
  bladeCooldown: 0,
  screenShake: 0,
  counterShatterTimer: 0,
  chainSeverFlashTimer: 0,
  feedbackText: '',
  feedbackTimer: 0,
  isMoving: false,
  dustPuffs: [],
  afterimages: [],
  particles: [],
  floatingTexts: [],
  projectiles: [],
  dashRings: [],
  carryOverAttacks: [],
  p: {
    x: 585,
    y: 505,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    facing: -1,
    running: false,
    backstep: 0,
    backstepVx: 0,
    hitStun: 0,
    knockVx: 0,
    invuln: 0,
    attack: 0,
    animTimer: 0,
    stepSfxTimer: 0
  }
};

function savePrefs() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        speedScale: state.speedScale,
        maxHits: state.maxHits,
        godMode: state.godMode,
        loopStage: state.loopStage,
        showPlayerHitbox: state.showPlayerHitbox,
        showHitbox: state.showHitbox,
        showGuide: state.showGuide,
        audioEnabled: audio.enabled,
        volume: Math.round(audio.masterVolume * 100),
        noHitSteps: Array.from(state.noHitSteps)
      })
    );
  } catch (_) {}
}

const keys = new Set();
const dirMap = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down'
};
const lastTapTime = { left: 0, right: 0, up: 0, down: 0 };

function computeGlobalTime(stepIdx, elapsed) {
  let sum = 0;
  for (let i = 0; i < stepIdx; i++) {
    sum += HISTORY_STAGES[i].duration;
  }
  return sum + elapsed;
}

function cloneStage(raw) {
  return {
    ...raw,
    envelope: raw.envelope
      ? {
          ...raw.envelope,
          from: [...raw.envelope.from],
          to: [...raw.envelope.to],
          radiusKeyframes: raw.envelope.radiusKeyframes
            ? raw.envelope.radiusKeyframes.map((k) => ({ ...k }))
            : undefined
        }
      : null,
    grayCircleZone: raw.grayCircleZone ? { ...raw.grayCircleZone, center: [...raw.grayCircleZone.center] } : null,
    grayCircleZones: raw.grayCircleZones
      ? raw.grayCircleZones.map((z) => ({ ...z, center: [...z.center] }))
      : null,
    corridorYKeyframes: raw.corridorYKeyframes
      ? raw.corridorYKeyframes.map((k) => ({ ...k }))
      : null,
    swordWheel12: raw.swordWheel12
      ? {
          ...raw.swordWheel12,
          keyframes: raw.swordWheel12.keyframes.map((k) => ({ ...k, pos: [...k.pos] }))
        }
      : null,
    attacks: (raw.attacks || []).map((a) => ({
      ...a,
      point: a.point ? [...a.point] : null,
      center: a.center ? [...a.center] : null,
      spawned: false,
      fired: false
    })),
    chain: raw.chain
      ? {
          ...raw.chain,
          anchor: [...raw.chain.anchor],
          flower: raw.chain.flower ? [...raw.chain.flower] : null,
          cut: false,
          fired: false,
          flowerCollected: false
        }
      : null,
    standaloneFlower: raw.standaloneFlower
      ? {
          ...raw.standaloneFlower,
          point: [...raw.standaloneFlower.point],
          collected: false
        }
      : null,
    counter: raw.counter
      ? {
          ...raw.counter,
          point: [...raw.counter.point],
          hit: false,
          warned: false,
          largoClashActive: false,
          groggyTriggered: false
        }
      : null
  };
}

function spawnFloatingText(x, y, text, color = '#fde047', size = 20, subText = '') {
  state.floatingTexts.push({
    x: x + (Math.random() - 0.5) * 18,
    y,
    vx: (Math.random() - 0.5) * 28,
    vy: -135,
    text,
    subText,
    color,
    size,
    life: 0.78,
    maxLife: 0.78
  });
}

function showOverlay(quote, title, desc, btnText, statsHtml = '') {
  $('#overlayQuote').textContent = quote;
  $('#overlayTitle').textContent = title;
  $('#overlayDesc').textContent = desc;
  $('#startBtn').textContent = btnText;
  const statsEl = $('#overlayStats');
  if (statsHtml) {
    statsEl.innerHTML = statsHtml;
    statsEl.classList.remove('hidden');
  } else {
    statsEl.innerHTML = '';
    statsEl.classList.add('hidden');
  }
  $('#overlay').classList.remove('hidden');
}

function hideOverlay() {
  $('#overlay').classList.add('hidden');
}

function setFeedback(text, duration = 1.0) {
  state.feedbackText = text;
  state.feedbackTimer = duration;
}

function spawnDust(x, y, dir, count = 4) {
  for (let i = 0; i < count; i++) {
    state.dustPuffs.push({
      x: x - dir * (6 + Math.random() * 10),
      y: y + (Math.random() - 0.5) * 8,
      vx: -dir * (35 + Math.random() * 55),
      vy: (Math.random() - 0.5) * 20,
      r: 4 + Math.random() * 4,
      life: 0.25 + Math.random() * 0.12,
      maxLife: 0.37
    });
  }
}

function spawnBurst(x, y, color, count = 16, speed = 210) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = speed * (0.35 + Math.random() * 0.85);
    const maxLife = 0.28 + Math.random() * 0.28;
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: 2.5 + Math.random() * 3.5,
      color,
      life: maxLife,
      maxLife
    });
  }
}

function setWorldDeath(nextDeath, withEffect = false) {
  const next = Boolean(nextDeath);
  if (withEffect && state.worldDeath !== next) {
    state.worldTransition = 0.55;
    audio.playTone('worldShift');
    spawnBurst(state.p.x, state.p.y - 25, next ? '#be6eff' : '#52e8ff', 26, 260);
    spawnFloatingText(
      state.p.x,
      state.p.y - 95,
      next ? '죽음의 세계 진입' : '생명의 세계 복귀',
      next ? '#d8b4fe' : '#7dd3fc',
      17
    );
  }
  state.worldDeath = next;
  syncHud();
}

function renderTimelineMarkers(stage) {
  const track = $('#timelineTrack');
  if (!track) return;
  track.querySelectorAll('.timeline-marker').forEach((el) => el.remove());

  const dur = Math.max(0.1, stage.duration);
  const addMarker = (t, cls) => {
    const el = document.createElement('div');
    el.className = `timeline-marker ${cls}`;
    el.style.left = `${clamp((t / dur) * 100, 1, 99)}%`;
    track.appendChild(el);
  };

  for (const a of stage.attacks) {
    const cls =
      a.kind === 'purple_pillar' || a.kind === 'outer_purple_explosion'
        ? 'void'
        : a.cutsChain
        ? 'chain'
        : '';
    addMarker(a.fireTime, cls);
  }
  if (stage.chain && stage.chain.flower) {
    addMarker(stage.chain.cutTime + 0.25, 'flower');
  }
  if (stage.standaloneFlower) {
    addMarker(stage.standaloneFlower.spawnTime || 0.1, 'flower');
  }
  if (stage.counter) {
    addMarker(stage.counter.grayscaleStart, 'counter');
  }
}

function renderStepList() {
  const list = $('#stepList');
  if (!list) return;
  list.innerHTML = '';
  HISTORY_STAGES.forEach((s, idx) => {
    const btn = document.createElement('button');
    btn.className = 'step-item';
    if (idx === state.step) btn.classList.add('active');
    if (state.completedSteps.has(idx)) btn.classList.add('done');
    const noHitBadge = state.noHitSteps.has(idx) ? '<span class="step-badge">노히트</span>' : '';
    btn.innerHTML = `
      <div class="step-num"><span>${idx + 1} / ${HISTORY_STAGES.length} 구간 (${s.timeRange || s.duration.toFixed(1) + 's'})</span>${noHitBadge}</div>
      <div class="step-title">${s.stepTitle}</div>
    `;
    btn.addEventListener('click', () => {
      state.active = true;
      state.paused = false;
      $('#btnPause').textContent = '일시정지 P';
      hideOverlay();
      loadStage(idx, true);
      canvas.focus?.();
    });
    list.appendChild(btn);
  });
}

function syncHud() {
  const s = state.stage;
  if (!s) return;
  if ($('#stageLabel')) {
    $('#stageLabel').textContent = `${state.step + 1} / ${HISTORY_STAGES.length} 구간 (${s.timeRange || ''})`;
  }
  if ($('#progressFill')) {
    $('#progressFill').style.width = `${((state.step + 1) / HISTORY_STAGES.length) * 100}%`;
  }
  if ($('#influenceFill')) {
    $('#influenceFill').style.width = `${state.influence}%`;
  }
  if ($('#hitCount')) {
    $('#hitCount').textContent =
      state.maxHits > 0 && !state.godMode
        ? `${state.totalHits} / ${state.maxHits}`
        : `${state.totalHits} / ∞`;
  }
  if ($('#speedLabel')) {
    $('#speedLabel').textContent = `${state.speedScale}x`;
  }
  if ($('#cueText')) {
    $('#cueText').innerHTML = `<strong>[${s.stepTitle}]</strong> ${s.message}`;
  }

  const pill = $('#worldPill');
  if (pill) {
    pill.textContent = state.worldDeath ? '죽음의 세계 (보라 HP)' : '생명의 세계 (적색 HP)';
    pill.classList.toggle('death', Boolean(state.worldDeath));
  }

  const erosion = $('#erosionPill');
  if (erosion) {
    erosion.classList.toggle('hidden', !state.worldDeath);
  }

  renderStepList();
}

function loadStage(idx, resetPlayerPos = true) {
  const prevStage = state.stage;
  const prevElapsed = state.elapsed;

  // 연속 구간 전환(resetPlayerPos === false) 시 직전 구간에서 아직 폭발 여운이 남아있는 공격들을 이월해
  // 화면이 뚝 끊기지 않고 자연스럽게 페이드아웃되도록 유지!
  if (!resetPlayerPos && prevStage && Array.isArray(prevStage.attacks)) {
    const carried = [];
    for (const a of prevStage.attacks) {
      if (a.fired && prevElapsed - a.fireTime >= 0 && prevElapsed - a.fireTime < 0.52) {
        const cloned = JSON.parse(JSON.stringify(a));
        cloned._carryElapsedOffset = prevElapsed;
        carried.push(cloned);
      }
    }
    state.carryOverAttacks = carried;
  } else {
    state.carryOverAttacks = [];
  }

  state.step = clamp(idx, 0, HISTORY_STAGES.length - 1);
  state.stage = cloneStage(HISTORY_STAGES[state.step]);
  state.elapsed = 0;
  state.globalTime = computeGlobalTime(state.step, 0);
  state.stageHits = 0;
  state.bladeCooldown = 0;
  state.counterShatterTimer = 0;

  // 구간을 직접 선택하거나 재시작할 때만 상태 초기화; 연속 진행 중에는 체력/세계/점프/이펙트를 그대로 유지!
  if (resetPlayerPos) {
    state.playerHpPct = 100;
    state.chainSeverFlashTimer = 0;
    state.hitFlash = 0;
    state.hitStop = 0;
    state.bossHitFlash = 0;
    setWorldDeath(Boolean(state.stage.worldState), false);
    if (state.stage.startPos) {
      state.p.x = state.stage.startPos[0];
      state.p.y = state.stage.startPos[1];
      state.cameraX = clamp(
        (state.p.x - CENTER[0]) * 0.65,
        -CONFIG.CAMERA_MAX_OFFSET,
        CONFIG.CAMERA_MAX_OFFSET
      );
    }
    state.p.z = 0;
    state.p.vz = 0;
    state.p.backstep = 0;
    state.p.hitStun = 0;
    state.p.knockVx = 0;
    state.p.invuln = 0;
    state.dustPuffs = [];
    state.afterimages = [];
    state.particles = [];
    state.floatingTexts = [];
    state.projectiles = [];
    state.dashRings = [];
  }
  state.bossPos = state.stage.bossPos ? [...state.stage.bossPos] : [...CONFIG.BOSS_ANCHOR];

  audio.triggerStageVoice(state.step);
  audio.syncPlayback(state.active, state.paused);
  renderTimelineMarkers(state.stage);
  syncHud();
}

function registerHit(reason, options = {}) {
  const { instantDeath = false, ignoreInvuln = false, deathTitle = '' } = options;
  if (!ignoreInvuln && state.p.invuln > 0) {
    spawnFloatingText(state.p.x, state.p.y - 88, 'EVADE', '#38bdf8', 19, '무적 회피!');
    return;
  }
  state.totalHits++;
  state.stageHits++;
  state.screenShake = instantDeath ? 0.5 : 0.34;
  state.hitFlash = instantDeath ? 0.42 : 0.28;
  state.hitStop = 0.045; // 원작 DNF 피격 역경직(Hit-stop)
  state.influence = clamp(state.influence - 5, 0, 100);
  const willDie =
    !state.godMode && (instantDeath || (state.maxHits > 0 && state.totalHits >= state.maxHits));
  state.playerHpPct = willDie ? 0 : Math.max(8, state.playerHpPct - 26);

  // 캐릭터 실제 피격 경직 및 에어본 넉백 물리
  state.p.hitStun = 0.26;
  state.p.knockVx = -state.p.facing * 220;
  if (state.p.z < 14) {
    state.p.z = 14;
    state.p.vz = 175;
  }

  const dmg = instantDeath ? 999999 : 38400 + Math.floor(Math.random() * 9500);
  spawnFloatingText(
    state.p.x,
    state.p.y - 85 - state.p.z,
    instantDeath ? 'INSTANT DEATH!' : `-${dmg.toLocaleString()}`,
    '#ff2a55',
    instantDeath ? 28 : 24,
    reason
  );

  setFeedback(reason, 1.0);
  audio.playTone('hit');
  spawnBurst(state.p.x, state.p.y - 35 - state.p.z, '#ff1744', 24, 270);
  syncHud();

  if (willDie) {
    state.active = false;
    audio.syncPlayback(false, false);
    showOverlay(
      `"${HISTORY_META.quoteIntro1}. ${HISTORY_META.quoteIntro2}"`,
      deathTitle || (instantDeath ? '패턴 즉사' : '역사의 끝 패턴 파훼 실패'),
      `${state.stage.stepTitle} — ${reason} (우측 구간 목록에서 해당 구간만 반복 연습할 수 있습니다.)`,
      '다시 도전 (R / Enter)'
    );
  }
}

function advanceStage() {
  state.completedSteps.add(state.step);
  if (state.stageHits === 0) {
    state.noHitSteps.add(state.step);
    savePrefs();
  }

  if (state.loopStage) {
    loadStage(state.step, true);
    setFeedback(`${state.step + 1}구간 무한 반복 재시작`, 0.8);
    return;
  }

  if (state.step + 1 < HISTORY_STAGES.length) {
    loadStage(state.step + 1, false);
    return;
  }

  state.active = false;
  audio.playVoice('defeat');
  showOverlay(
    '"유리지에 : 그래, 만족하는가? 긴 악연의 끝을, 나의 죽음을... 생명의 저편에서 기다리겠다."',
    '역사의 끝 (역사 칼날 패턴) 완벽 파훼!',
    `9구간 역사의 끝 패턴 및 해방된 라르고 합동 그로기를 모두 완벽하게 파훼했습니다!`,
    '다시 도전 (R / Enter)',
    `<div class="stat-chip">총 피격 <strong>${state.totalHits}회</strong></div>
     <div class="stat-chip">노히트 구간 <strong>${state.noHitSteps.size} / ${HISTORY_STAGES.length}</strong></div>`
  );
}

function firePlayerAttack() {
  const p = state.p;
  if (p.comboResetTimer > 0) {
    p.attackCombo = ((p.attackCombo || 0) + 1) % 3;
  } else {
    p.attackCombo = 0;
  }
  p.comboResetTimer = 0.68;
  p.attack = 0.28;
  audio.playTone('slash');

  // 프리스트 권격 충격파 생성 -> 보스 타격 시 데미지 폰트 & 타격 스파크!
  state.projectiles.push({
    x: p.x + p.facing * 52,
    y: p.y - 46 - p.z,
    vx: p.facing * 1150,
    facing: p.facing,
    life: 0.28
  });

  tryCounterAttack();
}

function tryCounterAttack() {
  if (!state.stage || !state.stage.counter) return;
  const c = state.stage.counter;
  if (c.hit) return;

  // 원작 고증: 과도한 타이밍 보정 제거 — 실제 흑백 섬광 구간 내에서만 카운터 인정!
  const inTime = state.elapsed >= c.windowStart - 0.06 && state.elapsed <= c.windowEnd + 0.06;
  const nearBoss = dist(state.p, c.point) <= (c.range || 250);

  if (inTime && nearBoss) {
    c.hit = true;
    c.largoClashActive = true;
    state.counterShatterTimer = 0.75;
    state.bossHitFlash = 0.35;
    state.hitStop = 0.08;
    state.screenShake = 0.48;
    state.influence = clamp(state.influence + 25, 0, 100);
    spawnFloatingText(
      c.point[0],
      c.point[1] - 120,
      'COUNTER!!',
      '#fde047',
      30,
      '9,842,150'
    );
    setFeedback('생명의 끝 흑백 카운터 성공!! 해방된 라르고 합동 격돌!', 1.6);
    audio.playTone('counter');
    audio.playVoice('largo_1');
    spawnBurst(c.point[0] + 55, c.point[1], '#fde047', 34, 320);
    syncHud();
  }
}

function distToSegment(pt, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy || 1;
  const t = clamp(((pt.x - ax) * vx + (pt.y - ay) * vy) / lenSq, 0, 1);
  return Math.hypot(pt.x - (ax + t * vx), pt.y - (ay + t * vy));
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const ccw = (p1x, p1y, p2x, p2y, p3x, p3y) =>
    (p3y - p1y) * (p2x - p1x) > (p2y - p1y) * (p3x - p1x);
  return (
    ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
  );
}

// 선분(칼날 검신)과 플레이어 동적 히트박스 직사각형 [left, top, right, bottom] 사이의 최소 거리 계산 (빈틈 0px!)
function distSegmentToRect(ax, ay, bx, by, left, top, right, bottom) {
  if (
    (ax >= left && ax <= right && ay >= top && ay <= bottom) ||
    (bx >= left && bx <= right && by >= top && by <= bottom)
  ) {
    return 0;
  }
  if (
    segmentsIntersect(ax, ay, bx, by, left, top, right, top) ||
    segmentsIntersect(ax, ay, bx, by, right, top, right, bottom) ||
    segmentsIntersect(ax, ay, bx, by, right, bottom, left, bottom) ||
    segmentsIntersect(ax, ay, bx, by, left, bottom, left, top)
  ) {
    return 0;
  }
  return Math.min(
    distToSegment({ x: left, y: top }, ax, ay, bx, by),
    distToSegment({ x: right, y: top }, ax, ay, bx, by),
    distToSegment({ x: right, y: bottom }, ax, ay, bx, by),
    distToSegment({ x: left, y: bottom }, ax, ay, bx, by),
    distToSegment({ x: ax, y: ay }, left, top, right, top),
    distToSegment({ x: ax, y: ay }, right, top, right, bottom),
    distToSegment({ x: ax, y: ay }, right, bottom, left, bottom),
    distToSegment({ x: ax, y: ay }, left, bottom, left, top),
    distToSegment({ x: bx, y: by }, left, top, right, top),
    distToSegment({ x: bx, y: by }, right, top, right, bottom),
    distToSegment({ x: bx, y: by }, right, bottom, left, bottom),
    distToSegment({ x: bx, y: by }, left, bottom, left, top)
  );
}

function isPlayerHitByAttack(attack) {
  const p = state.p;
  if (attack.ignoreHitBeforeJump) return false;

  // 현재 프레임(대기/걷기/달리기/점프)의 확대된 도트 실루엣과 1:1 연동된 동적 히트박스 적용!
  const hb = getPlayerHitbox ? getPlayerHitbox(p, state.isMoving) : null;
  const footR = hb ? hb.groundHalfW : 24;
  const bodyHalfW = hb ? Math.max(footR, hb.w * 0.35) : 28;

  if (attack.kind === 'red_band' || attack.kind === 'purple_beam') {
    return isPointInOrientedStrip(
      p,
      attack.point,
      attack.angle,
      attack.width + footR * 1.85,
      attack.length || 2600
    );
  }

  if (attack.kind === 'black_slash') {
    return isPointInOrientedStrip(
      p,
      attack.point,
      attack.angle,
      attack.width + Math.min(34, footR * 1.35),
      attack.length || 2600
    );
  }

  if (attack.kind === 'purple_pillar') {
    // 수직 번개 기둥: 확대된 캐릭터 몸통/발판 가로 폭 기준으로 엄격 판정 (점프 회피 불가)
    return Math.abs(p.x - attack.x) <= attack.width * 0.5 + bodyHalfW;
  }

  if (attack.kind === 'ground_quake') {
    const inRange = dist(p, attack.point) <= (attack.radius || 1600);
    if (!inRange) return false;
    if (attack.jumpRequired) {
      return p.z < 24 && p.backstep <= 0;
    }
    return true;
  }

  if (attack.kind === 'outer_purple_explosion') {
    // 확대된 발판 히트박스가 회색 안전 타원 테두리 밖으로 걸치면 즉시 피격!
    const dx = (p.x - attack.center[0]) / 1.18;
    const dy = (p.y - attack.center[1]) / 0.56;
    return Math.hypot(dx, dy) >= attack.safeRadius - Math.min(18, footR * 0.62);
  }

  if (attack.kind === 'black_hole_gear') {
    return dist(p, attack.point) <= attack.radius + footR;
  }

  if (attack.kind === 'red_giant_circle') {
    // 7구간 이중 적색 원: 안쪽 원(0 ~ coreR)이나 바깥쪽 원(innerR ~ outerR)에 발판이 걸치면 즉사!
    const dx = (p.x - attack.point[0]) / 1.22;
    const dy = (p.y - (attack.point[1] + 55)) / 0.56;
    const dEll = Math.hypot(dx, dy);
    const coreR = attack.coreDangerRadius || 0;
    const innerR = attack.innerSafeRadius || 320;
    const outerR = attack.radius || 980;
    const pad = Math.min(15, footR * 0.52);
    if (coreR > 0 && dEll <= coreR + pad) return true;
    return dEll >= innerR - pad && dEll <= outerR + pad;
  }

  return false;
}

function updateSimulation(dt) {
  state.animTime += dt;
  if (state.feedbackTimer > 0) state.feedbackTimer = Math.max(0, state.feedbackTimer - dt);
  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt);
  if (state.counterShatterTimer > 0) state.counterShatterTimer = Math.max(0, state.counterShatterTimer - dt);
  if (state.chainSeverFlashTimer > 0) state.chainSeverFlashTimer = Math.max(0, state.chainSeverFlashTimer - dt);
  if (state.worldTransition > 0) state.worldTransition = Math.max(0, state.worldTransition - dt);
  if (state.hitFlash > 0) state.hitFlash = Math.max(0, state.hitFlash - dt);
  if (state.bossHitFlash > 0) state.bossHitFlash = Math.max(0, state.bossHitFlash - dt);

  if (state.hitStop > 0) {
    state.hitStop = Math.max(0, state.hitStop - dt);
    return;
  }

  if (!state.active || state.paused || !state.stage) return;

  const simDt = dt * state.speedScale;
  state.elapsed += simDt;
  state.globalTime = computeGlobalTime(state.step, state.elapsed);

  if (state.playerHpPct < 100 && state.godMode) {
    state.playerHpPct = Math.min(100, state.playerHpPct + dt * 14);
  }

  const dur = Math.max(0.1, state.stage.duration);
  const pct = clamp((state.elapsed / dur) * 100, 0, 100);
  const cursor = $('#timelineCursor');
  if (cursor) cursor.style.left = `${pct}%`;
  const timeText = $('#timeText');
  if (timeText) {
    timeText.textContent = `구간 ${state.elapsed.toFixed(2)}s / ${dur.toFixed(2)}s (전체 ${state.globalTime.toFixed(1)}s)`;
  }

  const p = state.p;
  if (p.attack > 0) p.attack = Math.max(0, p.attack - dt);
  if (p.comboResetTimer > 0) p.comboResetTimer = Math.max(0, p.comboResetTimer - dt);
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
  if (state.bladeCooldown > 0) state.bladeCooldown = Math.max(0, state.bladeCooldown - dt);

  // 1. 플레이어 이동 / 피격 넉백 / 백스텝 물리
  if (p.hitStun > 0) {
    p.hitStun = Math.max(0, p.hitStun - dt);
    p.x = clamp(p.x + p.knockVx * dt, BOUNDS.left, BOUNDS.right);
    p.knockVx *= 0.88;
  } else if (p.backstep > 0) {
    p.backstep = Math.max(0, p.backstep - dt);
    p.x = clamp(p.x + p.backstepVx * dt, BOUNDS.left, BOUNDS.right);
    if (Math.random() < 0.65) {
      state.afterimages.push({
        x: p.x,
        y: p.y,
        z: p.z,
        facing: p.facing,
        frameIdx: 23,
        life: 0.16,
        maxLife: 0.16
      });
    }
  } else {
    const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    const dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    state.isMoving = Boolean(dx || dy || state._botMoving);
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const isRun = p.running || keys.has('shift');
      const speed = isRun ? 545 : 340;
      p.x = clamp(p.x + (dx / len) * speed * dt, BOUNDS.left, BOUNDS.right);
      // 2.5D 원작 벨트스크롤 비율 (Y축 이동은 X축의 72%)
      p.y = clamp(p.y + (dy / len) * speed * 0.72 * dt, BOUNDS.top, BOUNDS.bottom);
      p.animTimer += dt * (isRun ? 16 : 9);

      if (p.z === 0) {
        p.stepSfxTimer -= dt * (isRun ? 1.65 : 1.0);
        if (p.stepSfxTimer <= 0) {
          p.stepSfxTimer = 0.24;
          spawnDust(p.x, p.y + 16, p.facing, isRun ? 3 : 1);
        }
      }
      if (isRun && Math.random() < 0.48) {
        const curHb = getPlayerHitbox ? getPlayerHitbox(p, true) : null;
        state.afterimages.push({
          x: p.x,
          y: p.y,
          z: p.z,
          facing: p.facing,
          frameIdx: curHb ? curHb.frameIdx : 11,
          life: 0.14,
          maxLife: 0.14
        });
      }
    } else {
      if (!state._botMoving) p.running = false;
      p.animTimer += dt * 4;
    }
  }

  // 점프 중력 물리
  if (p.z > 0 || p.vz > 0) {
    p.z += p.vz * dt;
    p.vz -= 1420 * dt;
    if (p.z <= 0) {
      p.z = 0;
      p.vz = 0;
      spawnDust(p.x, p.y + 16, p.facing, 5);
    }
  }

  // 카메라가 플레이어를 부드럽게 추적
  const targetCamX = clamp(
    (p.x - CENTER[0]) * 0.65,
    -CONFIG.CAMERA_MAX_OFFSET,
    CONFIG.CAMERA_MAX_OFFSET
  );
  state.cameraX = lerp(state.cameraX, targetCamX, clamp(dt * CONFIG.CAMERA_LERP, 0, 1));

  // 파티클 & 플로팅 텍스트 & 발사체 업데이트
  for (const d of state.dustPuffs) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.life -= dt;
  }
  state.dustPuffs = state.dustPuffs.filter((d) => d.life > 0);

  for (const a of state.afterimages) a.life -= dt;
  state.afterimages = state.afterimages.filter((a) => a.life > 0);

  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);

  for (const ft of state.floatingTexts) {
    ft.x += ft.vx * dt;
    ft.y += ft.vy * dt;
    ft.vy *= 0.92;
    ft.life -= dt;
  }
  state.floatingTexts = state.floatingTexts.filter((ft) => ft.life > 0);

  for (const dr of state.dashRings) {
    dr.life -= dt;
  }
  state.dashRings = state.dashRings.filter((dr) => dr.life > 0);

  for (const proj of state.projectiles) {
    proj.x += proj.vx * dt;
    proj.life -= dt;
    // 보스 본체 타격 판정
    const bx = state.bossPos[0];
    const by = state.bossPos[1] + 80;
    if (Math.abs(proj.x - bx) < 110 && Math.abs(proj.y - by) < 180) {
      proj.life = 0;
      state.bossHitFlash = 0.12;
      const hitDmg = 842000 + Math.floor(Math.random() * 310000);
      spawnFloatingText(
        bx + (Math.random() - 0.5) * 70,
        by - 40 + (Math.random() - 0.5) * 40,
        hitDmg.toLocaleString(),
        '#fde047',
        21,
        'CRITICAL'
      );
      spawnBurst(proj.x, proj.y, '#38bdf8', 12, 220);
    }
  }
  state.projectiles = state.projectiles.filter((pr) => pr.life > 0);

  // 2. 세계별 활성화 칼날 접촉 체크 (점프 상태에서도 캐릭터 히트박스에 닿으면 즉시 즉사!)
  // - 생명의 세계(worldDeath=false): 36검 포위망 / 12검 회전 수레바퀴 활성(진홍), 상하단 이동 칼날 비활성(회색)
  // - 죽음의 세계(worldDeath=true): 상하단 이동 칼날 활성(진홍), 36검 포위망 / 12검 회전 수레바퀴 비활성(회색)
  if (state.bladeCooldown <= 0) {
    const hb = getPlayerHitbox ? getPlayerHitbox(p, state.isMoving) : null;
    const bodyPoints = hb
      ? hb.samplePoints
      : [
          { x: p.x, y: p.y },
          { x: p.x, y: p.y - p.z - 68 }
        ];
    const rLeft = hb ? hb.left + 3 : p.x - 24;
    const rRight = hb ? hb.right - 3 : p.x + 24;
    const rTop = hb ? hb.top + 3 : p.y - p.z - 125;
    const rBottom = hb ? hb.bottom - 3 : p.y + 8;
    let hitBladeReason = null;

    if (state.stage.envelope) {
      const env = state.stage.envelope;
      const envStarted = env.startTime === undefined || state.elapsed >= env.startTime;
      const isGrayDeactivated = Boolean(env.belongsToLifeWorld && state.worldDeath);
      if (envStarted && !isGrayDeactivated) {
        const c = getEnvelopeCenter(env, state.elapsed);
        const curRadius = getEnvelopeRadius ? getEnvelopeRadius(env, state.elapsed) : env.radius;
        for (const pt of bodyPoints) {
          const d = dist(pt, c);
          if (d > curRadius - 5 && d < curRadius + 225) {
            hitBladeReason = '천본앵 36검 칼날 접촉 즉사!';
            break;
          }
        }
      }
    }

    if (!hitBladeReason && state.stage.swordWheel12) {
      const wheel = state.stage.swordWheel12;
      const isGrayDeactivated = Boolean(wheel.belongsToLifeWorld && state.worldDeath);
      if (!isGrayDeactivated) {
        const wPos = getSwordWheelPos(wheel, state.elapsed);
        if (wPos) {
          const killR = wheel.killRadius || 175;
          const spokeLen = wheel.spokeLength || 215;
          const numSpokes = wheel.numSpokes || 16;
          const rot = state.animTime * 4.2;
          const maxSpokeR = 34 + spokeLen;
          for (const pt of bodyPoints) {
            if (dist(pt, wPos) < killR - 8) {
              hitBladeReason = '회전 칼날 수레바퀴 접촉 즉사!';
              break;
            }
          }
          if (!hitBladeReason) {
            for (let k = 0; k < numSpokes; k++) {
              const sAng = rot + (k / numSpokes) * CONFIG.TAU;
              const sx2 = wPos[0] + Math.cos(sAng) * maxSpokeR;
              const sy2 = wPos[1] + Math.sin(sAng) * maxSpokeR;
              if (distSegmentToRect(wPos[0], wPos[1], sx2, sy2, rLeft, rTop, rRight, rBottom) < 9.0) {
                hitBladeReason = '회전 칼날 수레바퀴 접촉 즉사!';
                break;
              }
            }
          }
        }
      }
    }

    // 죽음의 세계(worldDeath=true) 활성 칼날 전체 연속 직사각형(AABB)-선분 정밀 판정:
    // 히트박스 사각형 내부 어디든 칼날 선분이 스치면 샘플 점 사이 빈틈 없이 즉시 피격!
    if (!hitBladeReason && state.worldDeath) {
      const denseCorridor = Boolean(state.stage.corridorBorderSwords);
      const stepX = denseCorridor ? 195 : 235;
      const speed = state.stage.swordScrollSpeed || 260;
      const scrollX = (((state.animTime * speed) % stepX) + stepX) % stepX;
      const offsetY = denseCorridor && getCorridorOffsetY ? getCorridorOffsetY(state.stage, state.elapsed) : 0;
      const topLimitY = denseCorridor ? 305 + offsetY : 295;
      const botLimitY = 595 + offsetY;

      if ((state.stage.ambientSwords || denseCorridor) && rTop <= topLimitY && rBottom >= 40) {
        for (let baseX = -320; baseX <= 1480; baseX += stepX) {
          const sx = baseX + scrollX;
          if (sx >= rLeft - 10.5 && sx <= rRight + 10.5) {
            hitBladeReason = '죽음의 세계 상단 이동 칼날 접촉 즉사!';
            break;
          }
        }
      }

      if (!hitBladeReason && denseCorridor && botLimitY < 735 && rBottom >= botLimitY && rTop <= 740) {
        for (let baseX = -320; baseX <= 1480; baseX += stepX) {
          const bx = baseX + (stepX - scrollX) + 95;
          if (bx >= rLeft - 10.5 && bx <= rRight + 10.5) {
            hitBladeReason = '죽음의 세계 하단 이동 칼날 접촉 즉사!';
            break;
          }
        }
      }

      if (!hitBladeReason && state.stage.rotatingCorridor && getRotatingCorridorSwords) {
        const rcSwords = getRotatingCorridorSwords(state.stage, state.elapsed, state.animTime);
        for (let i = 0; i < rcSwords.length; i++) {
          const sw = rcSwords[i];
          if (distSegmentToRect(sw.tipX, sw.tipY, sw.hiltX, sw.hiltY, rLeft, rTop, rRight, rBottom) < 9.0) {
            hitBladeReason = '죽음의 세계 사선 회전 칼날 접촉 즉사!';
            break;
          }
        }
      }
    }

    if (hitBladeReason) {
      state.bladeCooldown = 0.65;
      registerHit(hitBladeReason, {
        instantDeath: true,
        ignoreInvuln: true,
        deathTitle: '칼날 접촉 즉사'
      });
    }
  }

  // 3. 패턴 공격 예고 사운드(착! 착! 착!) 및 폭발·사슬 절단 판정
  for (const attack of state.stage.attacks) {
    const spawnTime = attack.spawnTime ?? 0;
    if (state.elapsed < spawnTime) continue;

    if (!attack.spawned) {
      attack.spawned = true;
      if (attack.kind !== 'ground_quake') {
        audio.playTone('tick');
      }
    }

    if (!attack.fired && state.elapsed >= attack.fireTime) {
      attack.fired = true;
      audio.playTone(attack.kind === 'ground_quake' ? 'quake' : 'slash');
      if (attack.kind === 'ground_quake' || attack.kind === 'purple_pillar') {
        state.screenShake = Math.max(state.screenShake, 0.16);
      }

      if (attack.cutsChain && state.stage.chain && !state.stage.chain.cut) {
        const ch = state.stage.chain;
        const curHb = getPlayerHitbox ? getPlayerHitbox(p, state.isMoving) : null;
        const slashPad = curHb ? Math.min(34, curHb.groundHalfW * 1.35) : 30;
        const hitPlayer = isPointInOrientedStrip(
          p,
          attack.point,
          attack.angle,
          attack.width + slashPad,
          attack.length || 2000
        );
        const cutsTether = doesLineCutSegment(
          attack.point,
          attack.angle,
          [p.x, p.y],
          ch.anchor
        );

        if (!hitPlayer && cutsTether) {
          ch.cut = true;
          ch.fired = true;
          state.chainSeverFlashTimer = 0.55;
          state.hitStop = 0.04;
          state.screenShake = 0.22;
          spawnFloatingText(p.x, p.y - 95, 'CHAIN CUT!', '#e879f9', 22, '사슬 절단 성공');
          setFeedback('구속 사슬 절단 성공!', 0.9);
          audio.playTone('chain');
          spawnBurst(p.x, p.y - 30, '#e879f9', 24, 260);
        } else {
          ch.fired = true;
          registerHit(
            hitPlayer
              ? '검은 사슬 절단 검선에 직접 피격 즉사!'
              : '구속 사슬 절단 실패 즉사!',
            { instantDeath: true, ignoreInvuln: true, deathTitle: '구속 사슬 파훼 실패 즉사' }
          );
        }
      }

      if (isPlayerHitByAttack(attack)) {
        // 원작 고증(무적x, 백강x): 모든 역사의 끝 패턴 공격은 무적 회피 불가 & 피격 즉시 치명타/즉사!
        registerHit(`${attack.label || '패턴 공격'} 피격!`, {
          instantDeath: true,
          ignoreInvuln: true,
          deathTitle: '역사의 끝 패턴 피격 사망'
        });
      } else if (attack.kind === 'ground_quake' && attack.jumpRequired) {
        spawnFloatingText(p.x, p.y - 95 - p.z, 'EVADE!', '#69f0ae', 21, '점프 회피 성공');
      }
    }
  }

  // 4. 사슬 절단 후 피어난 꽃 및 독립 꽃 습득 판정 (제한시간 내 미습득 시 즉사, 시간 경과로 세계가 자동 전환되지 않음)
  const ch = state.stage.chain;
  if (ch && ch.flower && !ch.flowerCollected) {
    if (ch.cut && dist(p, ch.flower) < 62) {
      ch.flowerCollected = true;
      audio.playTone('flower');
      if (ch.switchesToDeathWorld) setWorldDeath(true, true);
      if (ch.switchesToLifeWorld) setWorldDeath(false, true);
      setFeedback(
        ch.flowerColor === 'blue'
          ? '생명의 꽃 습득 → 죽음의 세계 진입!'
          : '죽음의 꽃 습득 → 생명의 세계 복귀!',
        1.0
      );
    } else {
      const chExpire = ch.flowerExpireTime || state.stage.duration - 0.12;
      if (state.elapsed >= chExpire) {
        ch.flowerCollected = true;
        registerHit(
          ch.flowerColor === 'blue'
            ? '생명의 꽃 제한시간 초과 즉사!'
            : '죽음의 꽃 제한시간 초과 즉사!',
          { instantDeath: true, ignoreInvuln: true, deathTitle: '꽃 제한시간 초과 즉사' }
        );
      }
    }
  }

  const fl = state.stage.standaloneFlower;
  if (fl && !fl.collected && state.elapsed >= (fl.spawnTime ?? 0)) {
    if (dist(p, fl.point) < 64) {
      fl.collected = true;
      audio.playTone('flower');
      if (fl.switchesToDeathWorld) setWorldDeath(true, true);
      if (fl.switchesToLifeWorld) setWorldDeath(false, true);
      setFeedback(
        fl.color === 'blue'
          ? '생명의 꽃 습득 → 죽음의 세계 진입!'
          : '죽음의 꽃 습득 → 생명의 세계 복귀!',
        1.0
      );
    } else if (fl.expireTime && state.elapsed >= fl.expireTime) {
      fl.collected = true;
      // 꽃을 못 먹었으면 세계 전환 없이 즉시 사망!
      registerHit(
        fl.color === 'blue'
          ? '생명의 꽃 제한시간 초과 즉사!'
          : '죽음의 꽃 제한시간 초과 즉사!',
        { instantDeath: true, ignoreInvuln: true, deathTitle: '꽃 제한시간 초과 즉사' }
      );
    }
  }

  // 5. 9구간 최종 흑백 카운터 & 해방된 라르고 합동 격돌
  const c = state.stage.counter;
  if (c) {
    if (!c.warned && state.elapsed >= c.grayscaleStart) {
      c.warned = true;
      audio.playTone('counterWarn');
    }
    if (!c.hit && state.elapsed > c.windowEnd) {
      c.hit = true;
      c.largoClashActive = true;
      registerHit('생명의 끝 흑백 카운터 실패 즉사!', {
        instantDeath: true,
        ignoreInvuln: true,
        deathTitle: '생명의 끝 카운터 실패 즉사'
      });
      audio.playVoice('largo_1');
    }
    if (c.largoClashActive && !c.groggyTriggered && state.elapsed >= 10.70) {
      c.groggyTriggered = true;
      state.screenShake = 0.55;
      spawnFloatingText(c.point[0] + 40, c.point[1] - 120, 'GROGGY!!', '#fde047', 32, '유리지에 무력화!');
      setFeedback('해방된 라르고 합동 격돌 완료! 유리지에 그로기!', 1.5);
      audio.playTone('counter');
      audio.playVoice('largo_2');
      spawnBurst(c.point[0] + 50, c.point[1], '#fde047', 36, 320);
    }
  }

  // 6. 구간 종료 체크
  if (state.elapsed >= state.stage.duration) {
    advanceStage();
  }
}

// ============================================================================
// 키보드 & UI 이벤트 바인딩
// ============================================================================
function triggerDashRing() {
  state.dashRings.push({
    x: state.p.x,
    y: state.p.y - 38,
    facing: state.p.facing,
    life: 0.22,
    maxLife: 0.22
  });
}

window.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    if (!keys.has('shift')) {
      keys.add('shift');
      state.p.running = true;
      audio.playTone('dash');
      triggerDashRing();
    }
    return;
  }

  const dir = dirMap[e.code];
  if (dir) {
    e.preventDefault();
    if (!keys.has(dir)) {
      const now = performance.now();
      if (now - (lastTapTime[dir] || 0) < 270) {
        state.p.running = true;
        audio.playTone('dash');
        spawnDust(state.p.x, state.p.y + 16, state.p.facing, 5);
        triggerDashRing();
      }
      lastTapTime[dir] = now;
    }
    keys.add(dir);
    if (dir === 'left') state.p.facing = -1;
    if (dir === 'right') state.p.facing = 1;
    return;
  }

  if (e.code === 'KeyC' || e.code === 'Space') {
    e.preventDefault();
    if (!state.active || state.paused) return;
    if (keys.has('down') && state.p.z === 0 && state.p.backstep <= 0) {
      state.p.backstep = 0.24;
      state.p.invuln = 0.22;
      state.p.backstepVx = -state.p.facing * 310;
      state.p.z = 14;
      state.p.vz = 125;
      state.p.running = false;
      spawnFloatingText(state.p.x, state.p.y - 80, 'BACKSTEP', '#7dd3fc', 16);
      audio.playTone('dash');
      triggerDashRing();
    } else if (state.p.z === 0) {
      state.p.vz = 535;
      audio.playTone('jump');
      spawnDust(state.p.x, state.p.y + 16, state.p.facing, 6);
    }
    return;
  }

  if (e.code === 'KeyX' || e.code === 'KeyZ') {
    e.preventDefault();
    if (!state.active || state.paused) return;
    firePlayerAttack();
    return;
  }

  if (e.code === 'Enter') {
    if (!state.active) {
      $('#startBtn')?.click();
    }
    return;
  }

  if (e.code === 'KeyR') {
    e.preventDefault();
    state.active = true;
    state.paused = false;
    state.totalHits = 0;
    hideOverlay();
    loadStage(state.loopStage ? state.step : 0, true);
    return;
  }

  if (e.code === 'KeyP') {
    e.preventDefault();
    $('#btnPause')?.click();
    return;
  }

  if (e.code === 'BracketLeft') {
    e.preventDefault();
    $('#btnPrev')?.click();
    return;
  }

  if (e.code === 'BracketRight') {
    e.preventDefault();
    $('#btnNext')?.click();
    return;
  }

  if (e.code === 'KeyL') {
    e.preventDefault();
    $('#btnLoop')?.click();
    return;
  }

  if (e.code === 'KeyB') {
    e.preventDefault();
    $('#btnPlayerHitbox')?.click();
    return;
  }

  if (e.code === 'KeyH') {
    e.preventDefault();
    $('#btnHitbox')?.click();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    keys.delete('shift');
  }
  const dir = dirMap[e.code];
  if (dir) {
    keys.delete(dir);
    if (!['left', 'right', 'up', 'down'].some((d) => keys.has(d))) {
      state.p.running = false;
    }
  }
});

$('#startBtn')?.addEventListener('click', () => {
  state.active = true;
  state.paused = false;
  state.totalHits = 0;
  hideOverlay();
  loadStage(0, true);
});

$('#btnPrev')?.addEventListener('click', () => {
  state.active = true;
  state.paused = false;
  hideOverlay();
  loadStage(Math.max(0, state.step - 1), true);
});

$('#btnNext')?.addEventListener('click', () => {
  state.active = true;
  state.paused = false;
  hideOverlay();
  loadStage(Math.min(HISTORY_STAGES.length - 1, state.step + 1), true);
});

$('#btnPause')?.addEventListener('click', () => {
  if (!state.active) return;
  state.paused = !state.paused;
  $('#btnPause').textContent = state.paused ? '재개 P' : '일시정지 P';
  audio.syncPlayback(state.active, state.paused);
});

$('#btnRestart')?.addEventListener('click', () => {
  state.active = true;
  state.paused = false;
  state.totalHits = 0;
  hideOverlay();
  loadStage(state.loopStage ? state.step : 0, true);
});

$('#btnLoop')?.addEventListener('click', () => {
  state.loopStage = !state.loopStage;
  $('#btnLoop').textContent = `구간 반복: ${state.loopStage ? 'ON' : 'OFF'}`;
  $('#btnLoop').classList.toggle('active', state.loopStage);
  savePrefs();
});

function setSpeedScale(scale) {
  state.speedScale = scale;
  audio.setSpeed(scale);
  $('#btnSpeedSlow')?.classList.toggle('active', scale === 0.75);
  $('#btnSpeedNorm')?.classList.toggle('active', scale === 1.0);
  $('#btnSpeedFast')?.classList.toggle('active', scale === 1.25);
  syncHud();
  savePrefs();
}

$('#btnSpeedSlow')?.addEventListener('click', () => setSpeedScale(0.75));
$('#btnSpeedNorm')?.addEventListener('click', () => setSpeedScale(1.0));
$('#btnSpeedFast')?.addEventListener('click', () => setSpeedScale(1.25));

$('#btnPlayerHitbox')?.addEventListener('click', () => {
  state.showPlayerHitbox = !state.showPlayerHitbox;
  $('#btnPlayerHitbox').textContent = `히트박스(B): ${state.showPlayerHitbox ? 'ON' : 'OFF'}`;
  $('#btnPlayerHitbox').classList.toggle('active', state.showPlayerHitbox);
  savePrefs();
});

$('#btnHitbox')?.addEventListener('click', () => {
  state.showHitbox = !state.showHitbox;
  state.showGuide = state.showHitbox;
  $('#btnHitbox').textContent = `가이드 표시(H): ${state.showHitbox ? 'ON' : 'OFF'}`;
  $('#btnHitbox').classList.toggle('active', state.showHitbox);
  savePrefs();
});

$('#btnGodMode')?.addEventListener('click', () => {
  state.godMode = !state.godMode;
  $('#btnGodMode').textContent = `무적 연습: ${state.godMode ? 'ON' : 'OFF'}`;
  $('#btnGodMode').classList.toggle('active', state.godMode);
  syncHud();
  savePrefs();
});

$('#maxHitsSelect')?.addEventListener('change', (e) => {
  state.maxHits = Number(e.target.value);
  syncHud();
  savePrefs();
});

$('#btnAudio')?.addEventListener('click', () => {
  audio.setEnabled(!audio.enabled);
  $('#btnAudio').textContent = `사운드: ${audio.enabled ? 'ON' : 'OFF'}`;
  $('#btnAudio').classList.toggle('active', audio.enabled);
  audio.syncPlayback(state.active, state.paused);
  savePrefs();
});

$('#volSlider')?.addEventListener('input', (e) => {
  audio.setVolume(Number(e.target.value) / 100);
  savePrefs();
});

$('#timelineTrack')?.addEventListener('click', (e) => {
  if (!state.stage) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 0.99);
  state.elapsed = ratio * state.stage.duration;
  for (const a of state.stage.attacks) {
    a.spawned = state.elapsed >= (a.spawnTime ?? 0);
    a.fired = state.elapsed >= a.fireTime;
  }
  if (state.stage.chain) {
    state.stage.chain.cut = state.elapsed >= state.stage.chain.cutTime;
    state.stage.chain.fired = state.stage.chain.cut;
  }
  if (state.stage.standaloneFlower) {
    state.stage.standaloneFlower.collected = false;
    setWorldDeath(Boolean(state.stage.worldState), false);
  }
  if (state.stage.counter) {
    state.stage.counter.hit = state.elapsed > state.stage.counter.windowEnd;
    state.stage.counter.largoClashActive = state.stage.counter.hit;
    state.stage.counter.warned = state.elapsed >= state.stage.counter.grayscaleStart;
  }
});

window.Yurisie.state = state;
window.Yurisie.loadStage = loadStage;
window.Yurisie.stepSimulation = updateSimulation;
window.Yurisie.firePlayerAttack = firePlayerAttack;
loadStage(0, true);
$('#btnGodMode')?.classList.toggle('active', state.godMode);
if ($('#btnGodMode')) $('#btnGodMode').textContent = `무적 연습: ${state.godMode ? 'ON' : 'OFF'}`;
if ($('#maxHitsSelect')) $('#maxHitsSelect').value = String(state.maxHits);
$('#btnLoop')?.classList.toggle('active', state.loopStage);
if ($('#btnLoop')) $('#btnLoop').textContent = `구간 반복: ${state.loopStage ? 'ON' : 'OFF'}`;
$('#btnPlayerHitbox')?.classList.toggle('active', state.showPlayerHitbox);
if ($('#btnPlayerHitbox')) $('#btnPlayerHitbox').textContent = `히트박스(B): ${state.showPlayerHitbox ? 'ON' : 'OFF'}`;
$('#btnHitbox')?.classList.toggle('active', state.showHitbox);
if ($('#btnHitbox')) $('#btnHitbox').textContent = `가이드 표시(H): ${state.showHitbox ? 'ON' : 'OFF'}`;

let lastFrameTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  updateSimulation(dt);
  renderFrame(ctx, state);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
