// Synchronized Audio Engine (BGM, Voice Ducking, Telegraph & Impact SFX)
(() => {
'use strict';
window.Yurisie = window.Yurisie || {};

const VOICE_DATA = {
  history_start: {
    file: 'assets/audio/voice_history_start.mp3',
    speaker: '유리지에',
    line: '네 역사는 여기까지다! 무력한 생명이여, 절망 속에서 익사하라!'
  },
  history_sub: {
    file: 'assets/audio/voice_history_sub.mp3',
    speaker: '유리지에',
    line: '그 무력함에 끝없이 절망하라. 네 역사의 끝을 목도하라! 난 네놈을 짓밟고 일어서리라!'
  },
  atk_1: { file: 'assets/audio/voice_atk_1.mp3', speaker: '유리지에', line: '파멸하라!' },
  atk_2: { file: 'assets/audio/voice_atk_2.mp3', speaker: '유리지에', line: '갈라져라!' },
  atk_3: { file: 'assets/audio/voice_atk_3.mp3', speaker: '유리지에', line: '죽어라!' },
  atk_4: { file: 'assets/audio/voice_atk_4.mp3', speaker: '유리지에', line: '절망하라!' },
  counter_1: {
    file: 'assets/audio/voice_counter_1.mp3',
    speaker: '유리지에',
    line: '네놈 때문에... 난...!! (절규)'
  },
  counter_2: {
    file: 'assets/audio/voice_counter_2.mp3',
    speaker: '유리지에',
    line: '난 죽음을 넘어서리라! 나는 운명을 극복하리라! 딛고 일어선다!'
  },
  largo_1: {
    file: 'assets/audio/voice_largo_1.mp3',
    speaker: '해방된 라르고',
    line: '지금이다! 그 틈을 베어라!'
  },
  largo_2: {
    file: 'assets/audio/voice_largo_2.mp3',
    speaker: '해방된 라르고',
    line: '네놈의 역사는 여기서 끝난다, 유리지에!'
  },
  defeat: {
    file: 'assets/audio/voice_defeat.mp3',
    speaker: '유리지에',
    line: '그래, 만족하는가? 긴 악연의 끝을, 나의 죽음을... 생명의 저편에서 기다리겠다.'
  }
};

class SyncAudioEngine {
  constructor() {
    this.enabled = true;
    this.masterVolume = 0.85;
    this.speedScale = 1.0;
    this.ctx = null;

    this.bgm = new Audio('assets/audio/bgm_yurisie.mp3');
    this.bgm.loop = true;
    this.bgm.volume = 0.34 * this.masterVolume;

    this.currentVoice = null;
    this.currentVoiceKey = null;
    this.currentVoiceMeta = null;
    this.voiceSubEl = null;
  }

  attachSubtitleEl(el) {
    this.voiceSubEl = el;
  }

  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    const voicePlaying = this.currentVoice && !this.currentVoice.ended && !this.currentVoice.paused;
    this.bgm.volume = (voicePlaying ? 0.14 : 0.34) * this.masterVolume;
    if (this.currentVoice) {
      this.currentVoice.volume = 0.92 * this.masterVolume;
    }
  }

  setEnabled(flag) {
    this.enabled = flag;
    if (!flag) {
      this.bgm.pause();
      if (this.currentVoice) {
        this.currentVoice.pause();
      }
      this.updateSubtitle('');
    }
  }

  setSpeed(scale) {
    this.speedScale = scale;
    this.bgm.playbackRate = Math.max(0.75, Math.min(1.3, scale));
    if (this.currentVoice && !this.currentVoice.paused) {
      this.currentVoice.playbackRate = Math.max(0.75, Math.min(1.3, scale));
    }
  }

  syncPlayback(active, paused) {
    if (!this.enabled || !active || paused) {
      this.bgm.pause();
      if (this.currentVoice && !this.currentVoice.paused) {
        this.currentVoice.pause();
      }
      return;
    }

    const voicePlaying = this.currentVoice && !this.currentVoice.ended && this.currentVoice.currentTime > 0;
    this.bgm.volume = (voicePlaying && !this.currentVoice.paused ? 0.14 : 0.34) * this.masterVolume;
    if (this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
    if (this.currentVoice && this.currentVoice.paused && !this.currentVoice.ended) {
      this.currentVoice.play().catch(() => {});
    }
  }

  stopVoice() {
    if (this.currentVoice) {
      this.currentVoice.pause();
      this.currentVoice.currentTime = 0;
      this.currentVoice = null;
    }
    this.currentVoiceKey = null;
    this.currentVoiceMeta = null;
    this.updateSubtitle('');
  }

  playVoice(key, { allowInterrupt = true } = {}) {
    if (!this.enabled) return;
    const info = VOICE_DATA[key];
    if (!info) return;

    const isLongPlaying =
      this.currentVoice &&
      !this.currentVoice.paused &&
      !this.currentVoice.ended &&
      (this.currentVoiceKey === 'history_start' || this.currentVoiceKey === 'history_sub');

    if (!allowInterrupt && isLongPlaying) {
      return;
    }

    this.stopVoice();
    const audio = new Audio(info.file);
    audio.volume = 0.92 * this.masterVolume;
    audio.playbackRate = Math.max(0.75, Math.min(1.3, this.speedScale));
    this.currentVoice = audio;
    this.currentVoiceKey = key;
    this.currentVoiceMeta = info;
    this.updateSubtitle(`[${info.speaker}] "${info.line}"`);
    this.bgm.volume = 0.14 * this.masterVolume;

    audio.addEventListener('ended', () => {
      if (this.currentVoice === audio) {
        this.currentVoice = null;
        this.currentVoiceKey = null;
        this.bgm.volume = 0.34 * this.masterVolume;
        this.updateSubtitle('');
      }
    });

    audio.play().catch(() => {});
  }

  seekBgm(offsetSeconds) {
    try {
      if (this.bgm.readyState >= 1 && this.bgm.duration > 0) {
        this.bgm.currentTime = offsetSeconds % this.bgm.duration;
      } else {
        this.bgm.currentTime = 0;
      }
    } catch (_) {}
  }

  triggerStageVoice(stepIdx) {
    if (stepIdx === 0) {
      this.playVoice('history_start', { allowInterrupt: true });
    } else if (stepIdx === 5) {
      this.playVoice('history_sub', { allowInterrupt: true });
    } else if (stepIdx === 2 || stepIdx === 8) {
      const atkKeys = ['atk_1', 'atk_2', 'atk_3', 'atk_4'];
      this.playVoice(atkKeys[stepIdx % atkKeys.length], { allowInterrupt: false });
    }
  }

  updateSubtitle(text) {
    if (this.voiceSubEl) {
      this.voiceSubEl.textContent = text;
    }
  }

  ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(type) {
    if (!this.enabled || this.masterVolume <= 0.01) return;
    try {
      this.ensureCtx();
      const now = this.ctx.currentTime;
      const v = this.masterVolume;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      switch (type) {
        case 'tick':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1180, now + 0.045);
          gain.gain.setValueAtTime(0.065 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        case 'slash':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.exponentialRampToValueAtTime(85, now + 0.14);
          gain.gain.setValueAtTime(0.12 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.16);
          break;
        case 'quake':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(125, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.28);
          gain.gain.setValueAtTime(0.24 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.31);
          break;
        case 'chain':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(540, now);
          osc.frequency.exponentialRampToValueAtTime(1380, now + 0.18);
          gain.gain.setValueAtTime(0.16 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.21);
          break;
        case 'flower':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.exponentialRampToValueAtTime(1040, now + 0.18);
          gain.gain.setValueAtTime(0.15 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.21);
          break;
        case 'worldShift': {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.24);
          gain.gain.setValueAtTime(0.16 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc.start(now);
          osc.stop(now + 0.34);
          break;
        }
        case 'counterWarn': {
          // Sharp DNF golden glint "DING!"
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1560, now);
          osc.frequency.exponentialRampToValueAtTime(2093, now + 0.08);
          gain.gain.setValueAtTime(0.18 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc.start(now);
          osc.stop(now + 0.34);
          break;
        }
        case 'counter':
          osc.type = 'square';
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(1640, now + 0.22);
          gain.gain.setValueAtTime(0.18 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        case 'hit':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
          gain.gain.setValueAtTime(0.2 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.23);
          break;
        case 'dash':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);
          gain.gain.setValueAtTime(0.06 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        case 'jump':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);
          gain.gain.setValueAtTime(0.07 * v, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.11);
          break;
      }
    } catch (_) {}
  }
}

window.Yurisie.VOICE_DATA = VOICE_DATA;
window.Yurisie.SyncAudioEngine = SyncAudioEngine;
})();
