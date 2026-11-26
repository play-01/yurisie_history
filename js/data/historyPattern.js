// ============================================================================
// 각인된 악몽 2페이즈 - 유리지에 : "역사의 끝 (역사 칼날 패턴)"
// 9구간 패턴 타이밍 · 기믹 좌표 · 세계 전환 데이터
// ============================================================================
(() => {
'use strict';
window.Yurisie = window.Yurisie || {};

const HISTORY_META = {
  bossName: 'Lv145 보스-죽음을 딛고 선 자',
  patternName: '역사의 끝 (역사 칼날 패턴)',
  quoteIntro1: '이제, 또렷이 보이는가',
  quoteIntro2: '네 역사의 끝을 목도하라',
  totalDuration: 63.5
};

const HISTORY_STAGES = [
  // --------------------------------------------------------------------------
  // 1구간 (00:00.0 ~ 00:11.85): 인트로(0~6.45s) + 4연 무빈틈 붉은 장판 + [파멸] 점프(9.55s) +
  //                             8방향(*) 검선 동시 폭발(10.35s) + 양옆→중앙 3단계 조여오는 초대형 보라 기둥(9.15~11.65s)
  // --------------------------------------------------------------------------
  {
    id: 1,
    stepTitle: '1구간 · 인트로 & 무빈틈 4연 붉은 장판 + [파멸] 점프 + 8방향(*) 검선 & 양옆→중앙 조여오는 보라 기둥',
    duration: 11.85,
    timeRange: '00:00.0 ~ 00:11.8',
    worldState: false,
    bossMotion: 'spreadClaws',
    bossTimeline: [
      { t: 0.00, motion: 'spreadClaws', burst: true },
      { t: 3.60, motion: 'spreadClaws', burst: true },
      { t: 6.50, motion: 'spreadClaws', burst: true },
      { t: 8.35, motion: 'spreadClaws', burst: true },
      { t: 9.55, motion: 'spreadClaws', burst: true },
      { t: 11.00, motion: 'spreadClaws', burst: true }
    ],
    bossPos: [579, 228],
    startPos: [579, 420],
    guideWaypoints: [
      [579, 420],
      [422, 405],
      [368, 465]
    ],
    safeSpot: [422, 405],
    altSafeSpot: [515, 625],
    actionCue: '10시 포켓(x=445)에서 [파멸] 점프(9.55초) & 검선 회피 후, 양옆 보라 기둥이 터진 자리(x=368)로 빠져 중앙 기둥(11.58초)을 피하세요!',
    castBar: {
      title: '파멸',
      startTime: 6.60,
      endTime: 9.55,
      color: '#d92b4b',
      icon: 'disaster'
    },
    introCutscene: {
      endTime: 6.45
    },
    ambientSwords: false,
    // 36검 포위망이 외곽(680px)에서 265px로 조여 들어오며, 10.55초부터 좌측 구속 사슬이 걸림!
    envelope: {
      kind: 'ring36',
      startTime: 9.65,
      from: [430, 465],
      to: [579, 465],
      moveEndTime: 11.85,
      radius: 265,
      radiusKeyframes: [
        { t: 9.65, r: 680 },
        { t: 10.80, r: 420 },
        { t: 11.85, r: 265 }
      ],
      belongsToLifeWorld: true
    },
    chain: {
      anchor: [80, 465],
      spawnTime: 10.55,
      cutTime: 99.0 // 2구간(12.55s)에서 이어받아 절단!
    },
    attacks: [
      // 원작 1:1 무빈틈(0px gap) 수학적 고증: 폭 384px 장판 4개가 정중앙 [579, 475]에서 빈틈없이 맞물림
      {
        kind: 'red_band',
        point: [495, 645],
        angle: 0.46,
        width: 384,
        length: 2800,
        spawnTime: 6.75,
        fireTime: 8.15,
        label: '1차 좌하단 초대형 붉은 장판'
      },
      {
        kind: 'red_band',
        point: [663, 645],
        angle: -0.46,
        width: 384,
        length: 2800,
        spawnTime: 7.05,
        fireTime: 8.50,
        label: '2차 우하단 초대형 붉은 장판'
      },
      {
        kind: 'red_band',
        point: [495, 305],
        angle: -0.46,
        width: 384,
        length: 2800,
        spawnTime: 7.35,
        fireTime: 8.92,
        label: '3차 좌상단 초대형 붉은 장판'
      },
      {
        kind: 'red_band',
        point: [663, 305],
        angle: +0.46,
        width: 384,
        length: 2800,
        spawnTime: 7.65,
        fireTime: 9.42,
        label: '4차 우상단 초대형 붉은 장판'
      },

      // 교차 중심 (579, 470 정중앙!), 두께 90px의 8방향(*) 검은 코어 검선 4개 -> 10.35초 동시 폭발!
      {
        kind: 'black_slash',
        point: [579, 470],
        angle: 0,
        width: 90,
        length: 2500,
        spawnTime: 8.35,
        fireTime: 10.35,
        label: '가로 검은 코어 검선'
      },
      {
        kind: 'black_slash',
        point: [579, 470],
        angle: -Math.PI / 4,
        width: 90,
        length: 2500,
        spawnTime: 8.52,
        fireTime: 10.35,
        label: '우상향(/) 검은 코어 검선'
      },
      {
        kind: 'black_slash',
        point: [579, 470],
        angle: Math.PI / 2,
        width: 90,
        length: 2500,
        spawnTime: 8.69,
        fireTime: 10.35,
        label: '세로 검은 코어 검선'
      },
      {
        kind: 'black_slash',
        point: [579, 470],
        angle: Math.PI / 4,
        width: 90,
        length: 2500,
        spawnTime: 8.86,
        fireTime: 10.35,
        label: '우하향(\\) 검은 코어 검선'
      },

      // 9.55초 [파멸] 대지 파쇄 점프 판정
      {
        kind: 'ground_quake',
        point: [579, 465],
        radius: 1600,
        spawnTime: 6.60,
        fireTime: 9.55,
        jumpRequired: true,
        label: '파멸 땅울림 (점프 C / 백스텝 ↓+C)'
      },

      // ======================================================================
      // 양옆 외곽 -> 양옆 내측 -> 정중앙으로 빈틈(0px) 없이 대칭 수축하며 조여 들어오는 3단계 보라 기둥!
      // - 1단계 양끝 외곽: [-160..120] & [1038..1318] (spawn 9.15s -> fire 10.38s)
      // - 2단계 양옆 내측: [120..400] & [758..1038]   (spawn 9.75s -> fire 11.00s)
      // - 3단계 정중앙:   [400..758] (폭 358px)       (spawn 10.35s -> fire 11.58s, 2단계 폭발 직후 x=368로 회피!)
      // ======================================================================
      { kind: 'purple_pillar', x: -20,  width: 280, spawnTime: 9.15,  fireTime: 10.38, label: '1단계 좌외곽 수직 보라 기둥' },
      { kind: 'purple_pillar', x: 1178, width: 280, spawnTime: 9.15,  fireTime: 10.38, label: '1단계 우외곽 수직 보라 기둥' },
      { kind: 'purple_pillar', x: 260,  width: 280, spawnTime: 9.75,  fireTime: 11.00, label: '2단계 좌내측 조여오는 보라 기둥' },
      { kind: 'purple_pillar', x: 898,  width: 280, spawnTime: 9.75,  fireTime: 11.00, label: '2단계 우내측 조여오는 보라 기둥' },
      { kind: 'purple_pillar', x: 579,  width: 358, spawnTime: 10.35, fireTime: 11.58, label: '3단계 정중앙 마감 보라 기둥' }
    ],
    message:
      '4연 붉은 장판이 먼저 터진 10시 포켓(x=445)에서 [파멸] 점프(9.55초) & 8방향 검선(10.35초)을 피한 뒤, 양옆 보라 기둥이 중앙으로 조여오며 2단계(11.00초)가 터진 직후 왼쪽 틈(x=368)으로 빠져 정중앙 기둥(11.58초)을 피하세요!'
  },

  // --------------------------------------------------------------------------
  // 2구간 (11.85s ~ 15.50s): 1차 좌측 사슬 절단(12.55s) + 중앙 원 외곽 폭발(14.45s) + 초대형 X자 2갈래 광폭 보라 빔(15.20s)
  // --------------------------------------------------------------------------
  {
    id: 2,
    stepTitle: '2구간 · 우측 이동 1차 사슬 절단 → 중앙 원 외곽 폭발 대기 → 우측 포켓으로 초대형 X자 2갈래 보라 빔 회피',
    duration: 3.65,
    timeRange: '00:11.8 ~ 00:15.5',
    worldState: false,
    bossMotion: 'spreadClaws',
    bossTimeline: [
      { t: 0.0, motion: 'spreadClaws', burst: true },
      { t: 0.70, motion: 'spreadClaws', burst: true },
      { t: 2.60, motion: 'spreadClaws', burst: true },
      { t: 3.35, motion: 'spreadClaws', burst: true }
    ],
    bossPos: [579, 228],
    startPos: [435, 480],
    guideWaypoints: [
      [435, 480],
      [605, 465],
      [545, 465],
      [725, 455]
    ],
    safeSpot: [725, 455],
    actionCue: '세로 검은 검선 오른쪽(x=605)으로 넘어가 1차 사슬 절단 후, 회색 원 외곽 폭발(2.6초) 직후 우측 틈(x=725)으로 빠져 초대형 X자 빔을 피하세요!',
    ambientSwords: true,
    swordScrollSpeed: 245,
    envelope: {
      kind: 'ring36',
      from: [579, 465],
      to: [545, 465],
      moveEndTime: 0.80,
      radius: 255,
      radiusKeyframes: [
        { t: 0.0, r: 265 },
        { t: 0.75, r: 255 },
        { t: 1.45, r: 495 },
        { t: 2.80, r: 495 },
        { t: 3.65, r: 365 }
      ],
      belongsToLifeWorld: true
    },
    grayCircleZone: {
      center: [545, 465],
      radius: 210,
      startTime: 0.75,
      endTime: 2.70
    },
    chain: {
      anchor: [80, 465],
      spawnTime: 0.00,
      cutTime: 0.70
    },
    attacks: [
      {
        kind: 'black_slash',
        point: [535, 465],
        angle: Math.PI / 2,
        width: 72,
        length: 1600,
        spawnTime: 0.00,
        fireTime: 0.70,
        cutsChain: true,
        label: '1차 사슬 절단 수직 검선'
      },

      {
        kind: 'outer_purple_explosion',
        center: [545, 465],
        safeRadius: 210,
        spawnTime: 1.55,
        fireTime: 2.60,
        label: '중앙 원 외곽 보라 폭발'
      },

      {
        kind: 'purple_beam',
        point: [405, 425],
        angle: 0.76,
        width: 375,
        length: 2400,
        spawnTime: 1.60,
        fireTime: 3.35,
        label: '초대형 우하향(\\) 광폭 보라 빔'
      },
      {
        kind: 'purple_beam',
        point: [405, 425],
        angle: -0.76,
        width: 375,
        length: 2400,
        spawnTime: 1.60,
        fireTime: 3.35,
        label: '초대형 우상향(/) 광폭 보라 빔'
      }
    ],
    message:
      '정중앙 보라 기둥이 터진 직후 세로 검은 검선 오른쪽(x=605)으로 건너가 1차 사슬을 끊고, 회색 원 안에서 외곽 폭발(2.6초)을 기다린 뒤 우측 열린 포켓(x=725)으로 초대형 X자 보라 빔(3.35초)을 피하세요!'
  },

  // --------------------------------------------------------------------------
  // 3구간 (15.50s ~ 16.80s): 우측 2차 구속 사슬 → 중앙 세로 검선 왼쪽(x=495)으로 이동해 사슬 절단
  // --------------------------------------------------------------------------
  {
    id: 3,
    stepTitle: '3구간 · 초대형 X자 보라 빔 폭발 직후 좌측(x=495) 진입으로 2차 우측 사슬 절단',
    duration: 1.30,
    timeRange: '00:15.5 ~ 00:16.8',
    worldState: false,
    bossMotion: 'spreadClaws',
    bossTimeline: [
      { t: 0.0, motion: 'spreadClaws', burst: true },
      { t: 1.05, motion: 'spreadClaws', burst: true }
    ],
    bossPos: [579, 228],
    startPos: [725, 455],
    guideWaypoints: [
      [725, 455],
      [495, 475]
    ],
    safeSpot: [495, 475],
    actionCue: '우측 사슬이 걸리면 즉시 중앙 세로 검은 검선(x=565)의 왼쪽(x=495)으로 가로질러 사슬을 끊으세요!',
    ambientSwords: true,
    swordScrollSpeed: -255,
    envelope: {
      kind: 'ring36',
      from: [545, 465],
      to: [579, 465],
      moveEndTime: 0.45,
      radius: 255,
      radiusKeyframes: [
        { t: 0.0, r: 365 },
        { t: 0.45, r: 255 },
        { t: 1.05, r: 255 },
        { t: 1.30, r: 495 }
      ],
      belongsToLifeWorld: true
    },
    chain: {
      anchor: [1080, 485],
      spawnTime: 0.00,
      cutTime: 1.05
    },
    attacks: [
      {
        kind: 'black_slash',
        point: [565, 465],
        angle: Math.PI / 2,
        width: 72,
        length: 1600,
        spawnTime: 0.05,
        fireTime: 1.05,
        cutsChain: true,
        label: '2차 사슬 절단 중앙 수직 검선'
      }
    ],
    message:
      '초대형 X자 보라 빔이 터진 직후 우측에서 2차 사슬이 걸립니다! 바로 세로 검은 검선(x=565) 왼쪽(x=495)으로 이동해 우측 사슬을 끊으세요!'
  },

  // --------------------------------------------------------------------------
  // 4구간 (16.80s ~ 23.80s): 반시계 6연 회전 검선 + 3차 하단 사슬 절단(12시) + 파멸 점프 + 외곽 보라 폭발 + 중앙 푸른 꽃(36검 회색 무력화!)
  // --------------------------------------------------------------------------
  {
    id: 4,
    stepTitle: '4구간 · 반시계 6연 회전 검선 & 12시 [파멸] 점프 + 하단 사슬 절단 → 중앙 [생명의 꽃]으로 조여오는 36검 회색 무력화',
    duration: 7.00,
    timeRange: '00:16.8 ~ 00:23.8',
    worldState: false,
    bossMotion: 'spreadClaws',
    bossTimeline: [
      { t: 0.0, motion: 'spreadClaws', burst: true },
      { t: 1.1, motion: 'spreadClaws', burst: true },
      { t: 2.5, motion: 'spreadClaws', burst: true },
      { t: 3.45, motion: 'spreadClaws', burst: true },
      { t: 5.15, motion: 'spreadClaws', burst: true }
    ],
    bossPos: [579, 228],
    startPos: [512, 465],
    guideWaypoints: [
      [635, 515],
      [675, 455],
      [645, 395],
      [579, 395],
      [579, 465]
    ],
    safeSpot: [579, 395],
    actionCue: '반시계 회전 → 12시 [파멸] 점프(C) & 사슬 절단 → 중앙 진입 후 [생명의 꽃]을 먹어 조여오는 36검을 회색(판정 소멸)으로 바꾸세요!',
    castBar: {
      title: '파멸',
      startTime: 0.20,
      endTime: 2.45,
      color: '#d92b4b',
      icon: 'disaster'
    },
    largoCastBar: {
      title: '생명의 꽃',
      startTime: 4.10,
      endTime: 6.80,
      color: '#3b82f6',
      icon: 'flower_blue'
    },
    ambientSwords: true,
    swordScrollSpeed: -270, // 상단 부유 칼날들이 빠르게 좌우로 이동
    // 12시 [파멸] 점프(2.45s)가 끝난 뒤 3.25s에 240px로 포위하고, 5.05s부터 38px로 급격히 조여옴!
    envelope: {
      kind: 'ring36',
      from: [579, 465],
      to: [579, 465],
      moveEndTime: 0.1,
      radius: 245,
      radiusKeyframes: [
        { t: 0.0, r: 495 },
        { t: 2.90, r: 415 },
        { t: 3.50, r: 245 }
      ],
      constrictStartTime: 5.05,
      constrictEndTime: 6.85,
      constrictTargetRadius: 38,
      belongsToLifeWorld: true
    },
    grayCircleZone: {
      center: [579, 465],
      radius: 215,
      startTime: 0.0,
      endTime: 5.40
    },
    chain: {
      anchor: [579, 710],
      spawnTime: 2.15,
      cutTime: 4.00
    },
    standaloneFlower: {
      point: [579, 465],
      color: 'blue',
      spawnTime: 5.15,
      expireTime: 6.82,
      switchesToDeathWorld: true
    },
    attacks: [
      // 하단 중앙(579, 515)을 교차점으로 폭 82px 검선 6개가 순차 전개되어 좁은 부채꼴 안전각만 남긴 뒤 빠른 연쇄 폭발!
      { kind: 'black_slash', point: [579, 515], angle: Math.PI / 2, width: 82, length: 1900, spawnTime: 0.00, fireTime: 1.60, label: '1차 회전 검은 검선' },
      { kind: 'black_slash', point: [579, 515], angle: Math.PI / 3, width: 82, length: 1900, spawnTime: 0.17, fireTime: 1.72, label: '2차 회전 검은 검선' },
      { kind: 'black_slash', point: [579, 515], angle: Math.PI / 6, width: 82, length: 1900, spawnTime: 0.34, fireTime: 1.84, label: '3차 회전 검은 검선' },
      { kind: 'black_slash', point: [579, 515], angle: 0, width: 82, length: 1900, spawnTime: 0.51, fireTime: 1.96, label: '4차 회전 검은 검선' },
      { kind: 'black_slash', point: [579, 515], angle: -Math.PI / 6, width: 82, length: 1900, spawnTime: 0.68, fireTime: 2.08, label: '5차 회전 검은 검선' },
      { kind: 'black_slash', point: [579, 515], angle: -Math.PI / 3, width: 82, length: 1900, spawnTime: 0.85, fireTime: 2.20, label: '6차 회전 검은 검선' },

      {
        kind: 'black_slash',
        point: [579, 480],
        angle: 0.06,
        width: 72,
        length: 1800,
        spawnTime: 2.65,
        fireTime: 4.00,
        cutsChain: true,
        label: '3차 사슬 절단 가로 검선'
      },

      {
        kind: 'ground_quake',
        point: [579, 465],
        radius: 1600,
        spawnTime: 0.20,
        fireTime: 2.45,
        jumpRequired: true,
        label: '파멸 땅울림 (점프 C)'
      },

      {
        kind: 'outer_purple_explosion',
        center: [579, 465],
        safeRadius: 215,
        spawnTime: 4.20,
        fireTime: 5.20,
        label: '외곽 보라 장판 대폭발'
      }
    ],
    message:
      '3시에서 반시계 회전하며 6연 검선을 피하고, 12시에서 [파멸] 점프(C) & 사슬 절단 후 즉시 중앙 원으로 들어오세요! 외곽 폭발 직후 36검이 중앙으로 조여오므로, 중앙의 [생명의 꽃(푸른 꽃)]을 먹어 칼날들을 회색(판정 소멸)으로 만들고 빠져나가세요!'
  },

  // --------------------------------------------------------------------------
  // 5구간 (23.80s ~ 29.10s): 상하 칼날 회랑 상승(맨 위로 압박!) + 좌→우 순차 생성·동시 폭발 보라 기둥(맨 오른쪽 위 회피!) +
  //                         기둥 폭발 전 우하단 다음 패턴 둥근 생존구역 사전 예고
  // --------------------------------------------------------------------------
  {
    id: 5,
    stepTitle: '5구간 · 상승하는 위·아래 칼날을 따라 맨 위·맨 오른쪽으로 이동해 좌→우 동시 폭발 보라 기둥 회피',
    duration: 5.30,
    timeRange: '00:23.8 ~ 00:29.1',
    worldState: true,
    bossMotion: 'spreadClaws',
    bossTimeline: [
      { t: 0.0, motion: 'spreadClaws', burst: true },
      { t: 2.15, motion: 'spreadClaws', burst: true },
      { t: 5.05, motion: 'spreadClaws', burst: true }
    ],
    bossPos: [579, 228],
    startPos: [579, 465],
    guideWaypoints: [
      [579, 465],
      [1185, 330]
    ],
    safeSpot: [1185, 330],
    actionCue: '꽃 습득 직후 위·아래 칼날이 점점 위로 올라갑니다! 맨 위·맨 오른쪽(x=1185, y=330)으로 올라가 좌→우 기둥 동시 폭발(5.05초)을 피하세요!',
    ambientSwords: true,
    corridorBorderSwords: true,
    swordScrollSpeed: 310,
    // 캐릭터 중심(y=465) 위·아래에 있던 칼날 회랑이 점점 위로 상승(-145px)해 하단 칼날이 y=443까지 솟구치므로 검 이동에 맞춰 맨 위(y=310~360)까지 올라가야 함!
    corridorYKeyframes: [
      { t: 0.00, y: 0 },
      { t: 0.25, y: 0 },
      { t: 2.35, y: -145 },
      { t: 5.05, y: -145 },
      { t: 5.30, y: -105 }
    ],
    envelope: {
      kind: 'ring36',
      from: [579, 465],
      to: [-450, 465],
      startTime: 0.0,
      moveEndTime: 1.80,
      radius: 52,
      constrictStartTime: 0.0,
      constrictEndTime: 1.20,
      constrictTargetRadius: 28,
      belongsToLifeWorld: true
    },
    // 기둥이 터지기 전(4.15s)에 다음 패턴의 보라 장판 + 우하단 둥근 생존구역[1025, 545]이 미리 생성되어 다음 이동 위치를 예고!
    grayCircleZone: {
      center: [1025, 545],
      radius: 185,
      startTime: 4.15,
      endTime: 5.30
    },
    attacks: [
      // 생성 순서는 좌->우(2.15s~3.20s)이고, 터질 때는 5.05초에 4개 전부 동시 폭발!
      // x=-260..1055 전역을 덮으므로 오직 맨 오른쪽 위(x=1185, y=330)에서만 생존 가능!
      { kind: 'purple_pillar', x: -95, width: 330, spawnTime: 2.15, fireTime: 5.05, label: '1열 좌→우 보라 기둥' },
      { kind: 'purple_pillar', x: 235, width: 330, spawnTime: 2.50, fireTime: 5.05, label: '2열 좌→우 보라 기둥' },
      { kind: 'purple_pillar', x: 565, width: 330, spawnTime: 2.85, fireTime: 5.05, label: '3열 좌→우 보라 기둥' },
      { kind: 'purple_pillar', x: 892, width: 328, spawnTime: 3.20, fireTime: 5.05, label: '4열 좌→우 보라 기둥' }
    ],
    message:
      '위·아래 칼날 회랑이 점점 위로 올라가므로 칼날을 따라 맨 위·맨 오른쪽(x=1185, y=330)까지 올라가 좌→우 보라 기둥 동시 폭발(5.05초)을 피하고, 미리 아래쪽에 열린 우하단 둥근 생존구역을 확인하세요!'
  },

  // --------------------------------------------------------------------------
  // 6구간 (29.10s ~ 34.40s): 우하단 생존원 잠시 대피 → 칼날이 맨 아래로 내려가므로 맨 아래·왼쪽 끝(붉은 사선 왼쪽) 질주 →
  //                         검선 오른쪽 맨 아래(y=628)에서 사슬 절단 & [죽음의 꽃] 습득(칼날 회색 비활성!) → 위쪽 안전지대(y=470) 진입!
  // --------------------------------------------------------------------------
  {
    id: 6,
    stepTitle: '6구간 · 우하단 생존원 → 맨 아래·왼쪽 끝(사선 왼쪽) 기둥 회피 → 맨 아래에서 사슬 절단 & 꽃 먹고 위쪽 안전지대 진입',
    duration: 5.30,
    timeRange: '00:29.1 ~ 00:34.4',
    worldState: true,
    bossMotion: 'spreadClaws',
    bossTimeline: [
      { t: 0.0, motion: 'spreadClaws', burst: true },
      { t: 1.10, motion: 'spreadClaws', burst: true },
      { t: 3.42, motion: 'spreadClaws', burst: true },
      { t: 4.02, motion: 'spreadClaws', burst: true },
      { t: 5.08, motion: 'spreadClaws', burst: true }
    ],
    bossPos: [579, 228],
    startPos: [1025, 470],
    guideWaypoints: [
      [1025, 470],
      [1025, 545],
      [-172, 622],
      [140, 630],
      [310, 632],
      [185, 480]
    ],
    safeSpot: [185, 480],
    actionCue: '왼쪽 끝 기둥 회피 후 사슬 절단 → 맨 아래 [죽음의 꽃](x=310, y=632)을 먹어 위 칼날은 끄고 우측 칼날이 깨어나기 전 위 안전지대로 피하세요!',
    castBar: {
      title: '죽음의 꽃',
      startTime: 0.45,
      endTime: 5.20,
      color: '#ef4444',
      icon: 'flower_red'
    },
    ambientSwords: true,
    corridorBorderSwords: true,
    swordScrollSpeed: -340,
    // 1) 상·하 칼날이 점점 아래로 내려가 상단 검끝이 y=528(위쪽 안전지대 한복판!)을 가로막고 하단 칼날은 화면 아래로 빠짐
    // 2) 기둥 폭발(3.42s) 직후 안전지대 아래쪽 맨 밑([310, 632])에 [죽음의 꽃]이 피어 있고, 그 바로 오른쪽([645, 620])에는 비활성화된 회색 회전 칼날 수레바퀴가 대기 중!
    // 3) [죽음의 꽃]을 먹는 즉시 위쪽 수직 칼날은 회색 비활성화되고, 꽃 오른쪽의 회색 칼날 수레바퀴가 진홍색 활성 칼날로 변하므로 곧바로 좌상단 안전지대([155, 470])로 피해야 함!
    corridorYKeyframes: [
      { t: 0.00, y: -105 },
      { t: 1.10, y: 45 },
      { t: 3.15, y: 185 },
      { t: 5.30, y: 185 }
    ],
    // 바깥 36검 포위망(envelope)과 안쪽 16검 수레바퀴(swordWheel12)는
    // 동일한 중심을 공유하는 이중 고리로, 꽃을 먹은 직후 대반경(1220 -> 900)에서 수축하며 등장한 뒤 7구간에서 함께 위쪽(3시->12시)으로 올라감!
    envelope: {
      kind: 'ring36',
      startTime: 3.50,
      from: [645, 620],
      to: [735, 580],
      centerKeyframes: [
        { t: 3.50, pos: [645, 620] },
        { t: 4.45, pos: [645, 620] },
        { t: 5.30, pos: [735, 580] }
      ],
      radius: 900,
      radiusKeyframes: [
        { t: 3.50, r: 1220 },
        { t: 4.25, r: 1140 },
        { t: 5.30, r: 900 }
      ],
      belongsToLifeWorld: true
    },
    swordWheel12: {
      startTime: 2.50,
      numSpokes: 16,
      keyframes: [
        { t: 2.50, pos: [820, 625] },
        { t: 3.35, pos: [645, 620] },
        { t: 4.45, pos: [645, 620] },
        { t: 5.30, pos: [735, 580] }
      ],
      spokeLength: 235,
      killRadius: 195,
      belongsToLifeWorld: true
    },
    grayCircleZones: [
      {
        center: [1025, 545],
        radius: 185,
        startTime: 0.00,
        endTime: 1.18
      },
      {
        center: [155, 470],
        radius: 195,
        startTime: 3.05,
        endTime: 5.30
      }
    ],
    chain: {
      anchor: [-255, 615],
      spawnTime: 2.15,
      cutTime: 4.02
    },
    // 보라 기둥 동시 폭발(3.42s) 직후 사슬 절단 여부(무적 연습 포함)와 무관하게 바닥([310, 632])에 피어나는 [죽음의 꽃]
    standaloneFlower: {
      point: [310, 646],
      color: 'red',
      spawnTime: 3.45,
      expireTime: 5.20,
      switchesToLifeWorld: true
    },
    attacks: [
      // 1) 우하단 둥근 생존구역[1025, 545] 외곽 보라 장판 폭발 (1.10s)
      {
        kind: 'outer_purple_explosion',
        center: [1025, 545],
        safeRadius: 185,
        spawnTime: 0.00,
        fireTime: 1.10,
        label: '우하단 생존구역 외곽 보라 장판 폭발'
      },

      // 2) 오른쪽~중앙 전역(x=-48..1350)에 한꺼번에 생성(0.30s)되어 3.42s에 일제히 동시 폭발하는 보라 기둥!
      { kind: 'purple_pillar', x: 1210, width: 280, spawnTime: 0.30, fireTime: 3.42, label: '전역 동시 생성 보라 기둥' },
      { kind: 'purple_pillar', x: 930,  width: 280, spawnTime: 0.30, fireTime: 3.42, label: '전역 동시 생성 보라 기둥' },
      { kind: 'purple_pillar', x: 650,  width: 280, spawnTime: 0.30, fireTime: 3.42, label: '전역 동시 생성 보라 기둥' },
      { kind: 'purple_pillar', x: 370,  width: 280, spawnTime: 0.30, fireTime: 3.42, label: '전역 동시 생성 보라 기둥' },
      { kind: 'purple_pillar', x: 91,   width: 278, spawnTime: 0.30, fireTime: 3.42, label: '전역 동시 생성 보라 기둥' },

      // 3) 맨 아래에서 오른쪽(x=55, y=625)으로 넘어와 사슬을 끊어주는 좌측 붉은 테두리 사선(4.02s)
      {
        kind: 'black_slash',
        point: [-68, 565],
        angle: Math.PI / 2 - 0.08,
        width: 76,
        length: 1600,
        spawnTime: 2.15,
        fireTime: 4.02,
        cutsChain: true,
        label: '4차 좌측 사슬 절단 붉은 사선'
      },

      // 4) 맨 아래에서 꽃(y=628)을 먹어 칼날을 회색 무력화한 직후 반드시 위쪽 안전지대([155, 470])로 올라가야만 피할 수 있는 외곽 보라 폭발(5.08s)!
      {
        kind: 'outer_purple_explosion',
        center: [155, 470],
        safeRadius: 195,
        spawnTime: 3.05,
        fireTime: 5.08,
        label: '좌측 위 안전지대 외곽 보라 장판 폭발'
      }
    ],
    message:
      '우하단 생존원 후 위·아래 칼날이 맨 아래로 내려가므로 맨 아래·왼쪽 끝(x=-172, y=622)으로 달려 보라 기둥 폭발(3.42초)을 피하세요! 직후 맨 아래에서 오른쪽으로 넘어와 사슬을 끊고 안전지대 아래쪽 맨 밑(y=628)의 [죽음의 꽃]을 먹어 칼날을 회색으로 만든 뒤, 곧바로 위쪽 안전지대(y=470)로 올라가 외곽 폭발(5.08초)을 피하세요!'
  },

  // --------------------------------------------------------------------------
  // 7구간 (34.40s ~ 42.00s): 12검 수레바퀴(3시->12시 고속 회전 이동) + 우측 거대 붉은 폭발/도넛 링 + 대각선 5차 사슬 절단 + 생명의 꽃
  // --------------------------------------------------------------------------
  {
    id: 7,
    stepTitle: '7구간 · 12검 회전 수레바퀴(3시→12시) + 거대 붉은 원 폭발 + 대각선 5차 사슬 절단 & [생명의 꽃]',
    duration: 7.60,
    timeRange: '00:34.4 ~ 00:42.0',
    worldState: false,
    bossMotion: 'spreadClaws',
    bossTimeline: [
      { t: 0.0, motion: 'spreadClaws', burst: true },
      { t: 0.80, motion: 'spreadClaws', burst: true },
      { t: 2.50, motion: 'spreadClaws', burst: true },
      { t: 5.55, motion: 'spreadClaws', burst: true },
      { t: 6.60, motion: 'spreadClaws', burst: true }
    ],
    bossPos: [579, 228],
    startPos: [220, 485],
    guideWaypoints: [
      [695, 545],
      [355, 455],
      [585, 505]
    ],
    safeSpot: [695, 545],
    actionCue: '두 칼날 고리와 바닥의 안쪽·바깥쪽 붉은 원 사이 좁은 회색 고리 공간(x=695)에서 폭발 회피 → 좌상단(x=355) 사슬 절단 & 푸른 꽃!',
    castBar: {
      title: '생명의 꽃',
      startTime: 4.40,
      endTime: 7.55,
      color: '#3b82f6',
      icon: 'flower_blue'
    },
    ambientSwords: false,
    swordScrollSpeed: 270,
    // 왼쪽에서 조여 들어온 바깥 36검 포위망도 오른쪽 16검 수레바퀴와 같은 중심([735, 580] -> [835, 525] -> [475, 118])을 따라
    // 같은 방향으로 위로 올라가며(상승 회전), 플레이어는 두 칼날 고리 사이 안전지대를 따라 이동해 회색 고리 공간에서 도넛 폭발을 피함!
    envelope: {
      kind: 'ring36',
      startTime: 0.00,
      from: [735, 580],
      to: [435, -35],
      centerKeyframes: [
        { t: 0.0, pos: [735, 580] },
        { t: 1.4, pos: [835, 525] },
        { t: 2.5, pos: [795, 315] },
        { t: 3.6, pos: [625, 115] },
        { t: 4.7, pos: [475, 5] },
        { t: 7.2, pos: [435, -35] }
      ],
      radius: 655,
      radiusKeyframes: [
        { t: 0.00, r: 900 },
        { t: 1.80, r: 725 },
        { t: 3.60, r: 665 },
        { t: 5.40, r: 655 },
        { t: 7.20, r: 650 }
      ],
      belongsToLifeWorld: true,
      fadeOutOnDeathWorld: true
    },
    swordWheel12: {
      numSpokes: 16,
      keyframes: [
        { t: 0.0, pos: [735, 580] },
        { t: 1.4, pos: [835, 525] },
        { t: 2.5, pos: [795, 315] },
        { t: 3.6, pos: [625, 115] },
        { t: 4.7, pos: [475, 5] },
        { t: 7.2, pos: [435, -35] }
      ],
      spokeLength: 235,
      killRadius: 195,
      belongsToLifeWorld: true,
      fadeOutOnDeathWorld: true
    },
    // 5차 사슬 절단(6.60s) 직후 [생명의 꽃]을 먹기 전에
    // 8구간 대각선(좌상단 ↘ / 우하단 ↖) 칼날 회랑이 먼저 회색(판정 없음)으로 나타나 서서히 투명도가 내려가며(0.76 -> 0.30) 통로를 예고하고,
    // [생명의 꽃]을 먹는 즉시 진홍색 활성 칼날(접촉 즉사)로 색이 바뀌며 8구간으로 끊김 없이 이어짐!
    rotatingCorridor: {
      startTime: 6.60,
      centerKeyframes: [
        { t: 6.60, pos: [579, 458] },
        { t: 7.60, pos: [579, 458] }
      ],
      angleKeyframes: [
        { t: 6.60, angle: -0.68 },
        { t: 7.60, angle: -0.68 }
      ],
      halfGap: 146,
      stepAlong: 158,
      swordLen: 235,
      scrollSpeed: 560,
      grayAlphaStart: 0.76,
      grayAlphaEnd: 0.30,
      grayAlphaEndTime: 7.52,
      belongsToDeathWorld: true
    },
    chain: {
      anchor: [965, 575],
      spawnTime: 4.35,
      cutTime: 6.60
    },
    standaloneFlower: {
      point: [585, 505],
      color: 'blue',
      spawnTime: 6.62,
      expireTime: 7.56,
      switchesToDeathWorld: true
    },
    attacks: [
      // 안쪽 붉은 원(0~205px)과 바깥쪽 초대형 붉은 원(320~980px) 사이의 좁은 회색 고리 공간(205~320px)에서 피하는 이중 원 패턴!
      {
        kind: 'red_giant_circle',
        point: [1015, 500],
        coreDangerRadius: 205,
        innerSafeRadius: 320,
        radius: 980,
        spawnTime: 2.35,
        fireTime: 5.40,
        label: '이중 붉은 원 암흑 대폭발 (원과 원 사이 고리 회피)'
      },
      {
        kind: 'black_slash',
        point: [455, 455],
        angle: -1.16,
        width: 74,
        length: 1700,
        spawnTime: 4.85,
        fireTime: 6.60,
        cutsChain: true,
        label: '5차 사슬 절단 대각선 검선'
      }
    ],
    message:
      '우측(3시)에서 12검 수레바퀴가 고속 회전하며 12시로 올라가고 거대 붉은 원이 팽창합니다. 사슬이 생기면 왼쪽 위 대각선(x=355)에 서서 우하단 사슬을 끊은 뒤, 보스 아래 [생명의 꽃(푸른 꽃)]을 밟으세요!'
  },

  // --------------------------------------------------------------------------
  // 8구간 (42.00s ~ 50.80s): 촘촘한 고속 회전 사선 칼날 회랑 + 보라 기둥 & 생존원 상하좌우 연속 이동 파훼
  //   중앙(1차 기둥) → 좌측 생존원(외곽 폭발) → 맨 위(사선 칼날 침투 & 2차 중앙 기둥 회피) → 우상단 → 맨 아래 생존원 & [죽음의 꽃] → 우측(4차 중앙 기둥 회피)
  // --------------------------------------------------------------------------
  {
    id: 8,
    stepTitle: '8구간 · 촘촘한 고속 회전 사선 칼날 & 보라 기둥 상하좌우 이동(중앙→좌→맨 위→맨 아래 꽃→우)',
    duration: 8.80,
    timeRange: '00:42.0 ~ 00:50.8',
    worldState: true,
    bossMotion: 'spreadClaws',
    bossTimeline: [
      { t: 0.0, motion: 'spreadClaws', burst: true },
      { t: 1.20, motion: 'spreadClaws', burst: true },
      { t: 3.15, motion: 'spreadClaws', burst: true },
      { t: 4.00, motion: 'spreadClaws', burst: true },
      { t: 5.55, motion: 'spreadClaws', burst: true },
      { t: 7.65, motion: 'spreadClaws', burst: true }
    ],
    bossPos: [579, 228],
    startPos: [579, 518],
    guideWaypoints: [
      [579, 518],
      [350, 480],
      [350, 325],
      [579, 330],
      [579, 575],
      [780, 515]
    ],
    safeSpot: [579, 575],
    actionCue: '중앙(1차) → 왼쪽 원(2.4초 폭발) → 맨 위 끝(사선 칼날·중앙 기둥 회피) → 오른쪽 위 → 맨 아래 [죽음의 꽃] → 오른쪽(x=780) 이동!',
    castBar: {
      title: '죽음의 꽃',
      startTime: 3.15,
      endTime: 6.45,
      color: '#ef4444',
      icon: 'flower_red'
    },
    ambientSwords: false,
    // 촘촘한(stepAlong=158, halfGap=132) 고속 회전 사선 칼날이 좌측 안전지대까지 밀고 들어오고 중앙에는 보라 기둥이 터지므로
    // 칼날 통로를 따라 [중앙 -> 왼쪽 -> 맨 위 -> 오른쪽 위 -> 맨 아래 -> 오른쪽]으로 상하좌우 이동해야 생존 가능!
    rotatingCorridor: {
      startTime: 0.00,
      centerKeyframes: [
        { t: 0.00, pos: [579, 458] },
        { t: 1.15, pos: [579, 458] },
        { t: 1.85, pos: [355, 422] },
        { t: 2.35, pos: [355, 422] },
        { t: 3.05, pos: [355, 272] },
        { t: 3.90, pos: [579, 276] },
        { t: 4.65, pos: [579, 415] },
        { t: 5.35, pos: [579, 515] },
        { t: 7.40, pos: [579, 515] }
      ],
      angleKeyframes: [
        { t: 0.00, angle: -0.68 },
        { t: 0.55, angle: -0.55 },
        { t: 2.00, angle: 3.14 },
        { t: 3.00, angle: 3.96 },
        { t: 4.55, angle: 7.85 },
        { t: 5.55, angle: 8.38 },
        { t: 7.00, angle: 11.20 }
      ],
      fadeOutAfterLifeSwitch: true,
      halfGap: 146,
      stepAlong: 158,
      swordLen: 235,
      scrollSpeed: 580,
      belongsToDeathWorld: true
    },
    grayCircleZones: [
      {
        center: [335, 480],
        radius: 195,
        startTime: 1.15,
        endTime: 2.45
      },
      {
        center: [579, 585],
        radius: 185,
        startTime: 4.35,
        endTime: 6.10
      }
    ],
    standaloneFlower: {
      point: [579, 565],
      color: 'red',
      spawnTime: 5.48,
      expireTime: 6.38,
      switchesToLifeWorld: true
    },
    attacks: [
      // 1) 1차 4열 보라 기둥 (0.00s -> 1.15s): 좌·우 전역을 덮고 중앙 좁은 틈(x=470..690)만 안전
      { kind: 'purple_pillar', x: -65,  width: 310, spawnTime: 0.00, fireTime: 1.15, label: '1차 최좌측 보라 기둥' },
      { kind: 'purple_pillar', x: 280,  width: 380, spawnTime: 0.00, fireTime: 1.15, label: '1차 좌측 광폭 보라 기둥' },
      { kind: 'purple_pillar', x: 880,  width: 380, spawnTime: 0.00, fireTime: 1.15, label: '1차 우측 광폭 보라 기둥' },
      { kind: 'purple_pillar', x: 1225, width: 310, spawnTime: 0.00, fireTime: 1.15, label: '1차 최우측 보라 기둥' },

      // 2) 좌측 생존원([335, 480]) 외곽 보라 대폭발 (2.38s): 중앙에 남아 있으면 즉사!
      {
        kind: 'outer_purple_explosion',
        center: [335, 480],
        safeRadius: 195,
        spawnTime: 1.25,
        fireTime: 2.38,
        label: '좌측 생존구역 외곽 보라 장판 폭발'
      },

      // 3) 2차 보라 기둥 (2.12s -> 3.15s): 좌측 끝(-110..220)과 중앙(480..830)·우측(850..1200)을 덮어 좌측 틈(x=220..480)만 열림!
      //    동시에 사선 칼날이 아래쪽 안전지대(y=480)까지 밀고 올라오므로 맨 위(x=350, y=325)로 올라가야만 피할 수 있음!
      { kind: 'purple_pillar', x: 55,   width: 330, spawnTime: 2.12, fireTime: 3.15, label: '2차 좌측 끝 보라 기둥' },
      { kind: 'purple_pillar', x: 655,  width: 350, spawnTime: 2.12, fireTime: 3.15, label: '2차 중앙 광폭 보라 기둥' },
      { kind: 'purple_pillar', x: 1025, width: 350, spawnTime: 2.12, fireTime: 3.15, label: '2차 우측 광폭 보라 기둥' },

      // 4) 3차 4열 보라 기둥 (4.00s -> 5.55s): 다시 좌·우 전역을 덮고 중앙 세로 통로(x=467..690)만 남김 -> 위에서 맨 아래로 직진 하강 유도!
      { kind: 'purple_pillar', x: -65,  width: 310, spawnTime: 4.00, fireTime: 5.55, label: '3차 최좌측 보라 기둥' },
      { kind: 'purple_pillar', x: 280,  width: 375, spawnTime: 4.00, fireTime: 5.55, label: '3차 좌측 광폭 보라 기둥' },
      { kind: 'purple_pillar', x: 878,  width: 375, spawnTime: 4.00, fireTime: 5.55, label: '3차 우측 광폭 보라 기둥' },
      { kind: 'purple_pillar', x: 1225, width: 310, spawnTime: 4.00, fireTime: 5.55, label: '3차 최우측 보라 기둥' },

      // 5) 하단 중앙 생존원([579, 585]) 외곽 보라 대폭발 (5.98s): 맨 아래까지 내려오지 않으면 즉사!
      {
        kind: 'outer_purple_explosion',
        center: [579, 585],
        safeRadius: 185,
        spawnTime: 4.45,
        fireTime: 5.98,
        label: '하단 중앙 생존구역 외곽 보라 장판 폭발'
      },

      // 6) 4차 보라 기둥 (6.25s -> 7.65s): 정중앙(345..685)을 덮으므로 꽃을 먹은 직후 반드시 우측 통로(x=685..880, 추천 x=780)로 빠져나가야 함!
      { kind: 'purple_pillar', x: 140,  width: 330, spawnTime: 6.25, fireTime: 7.65, label: '4차 좌측 보라 기둥' },
      { kind: 'purple_pillar', x: 515,  width: 340, spawnTime: 6.25, fireTime: 7.65, label: '4차 중앙 광폭 보라 기둥' },
      { kind: 'purple_pillar', x: 1045, width: 330, spawnTime: 6.25, fireTime: 7.65, label: '4차 우측 보라 기둥' }
    ],
    message:
      '1차 기둥(중앙) 직후 왼쪽 생존원(x=350)으로 이동해 외곽 폭발을 피하고, 아래에서 밀고 올라오는 사선 칼날과 중앙 보라 기둥을 피해 맨 위(y=325)로 올라간 뒤 오른쪽 위(x=579) → 맨 아래(y=575)로 쭉 내려와 [죽음의 꽃]을 먹고 오른쪽 통로(x=780)로 마지막 중앙 기둥을 피하세요!'
  },

  // --------------------------------------------------------------------------
  // 9구간 (50.80s ~ 63.50s): 최종 흑백 카운터 [생명의 끝] (54.0s~54.5s) & 해방된 라르고 합동 격돌 [지금이다, 모험가]
  // --------------------------------------------------------------------------
  {
    id: 9,
    stepTitle: '9구간 · 최종 흑백 카운터 [생명의 끝] (X키) & 해방된 라르고 합동 격돌 [지금이다, 모험가]',
    duration: 12.70,
    timeRange: '00:50.8 ~ 01:03.5',
    worldState: false,
    bossMotion: 'swordStance',
    bossTimeline: [
      { t: 0.0, motion: 'swordStance', burst: false },
      { t: 1.40, motion: 'spreadClaws', burst: true },
      { t: 3.65, motion: 'swordStance', burst: true }
    ],
    bossPos: [515, 415],
    startPos: [685, 455],
    guideWaypoints: [
      [665, 455]
    ],
    safeSpot: [665, 455],
    actionCue: '3.2초(전체 54.0초) 화면이 흑백(Monochrome)으로 변하고 흰 별이 번쩍일 때 기본 공격(X)!',
    castBar: {
      title: '생명의 끝',
      startTime: 1.30,
      endTime: 3.55,
      color: '#d92b4b',
      icon: 'disaster'
    },
    largoCastBar: {
      title: '지금이다, 모험가',
      startTime: 3.65,
      endTime: 10.70,
      color: '#22c55e',
      icon: 'largo'
    },
    counter: {
      point: [515, 415],
      windupStart: 1.40,
      grayscaleStart: 3.15,
      windowStart: 3.05,
      windowEnd: 3.75,
      range: 270
    },
    attacks: [],
    message:
      '유리지에가 양팔을 벌려 [생명의 끝]을 시전하며 보라색 폭풍을 빨아들입니다. 3.15초(전체 54.0초)에 화면 전체가 흑백(Monochrome)으로 변하고 유리지에 머리 위에 하얀 별빛이 번쩍일 때 공격(X)하여 카운터를 넣으세요!'
  }
];

window.Yurisie.HISTORY_META = HISTORY_META;
window.Yurisie.HISTORY_STAGES = HISTORY_STAGES;
})();
