import { EventBus } from './EventBus';
import { CellType } from '../core/types';

interface ArpeggioNote {
  freq: number;
  duration: number;
  offset: number;
  type?: OscillatorType;
  vol?: number;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private sfxBus: GainNode | null = null;
  private sfxFilter: BiquadFilterNode | null = null;
  private bgmBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private isMuted = false;
  private lastMoveTime = 0;

  // BGM 控制属性
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmSourceNode: MediaElementAudioSourceNode | null = null;
  private isBGMPlaying = false;
  private bgmVolume = 0.22; // 默认 22% 平衡音量：作为舒适温暖的律动衬底，绝不掩盖合成器音效与操作微触觉

  constructor(eventBus?: EventBus) {
    if (eventBus) {
      this.attachToEventBus(eventBus);
    }
  }

  /**
   * 初始化 AudioContext 及总线拓扑
   * 用户首次点击/按键时触发
   */
  public init(): void {
    if (!this.ctx) {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      // 1. 母带防爆音限幅压缩器 (Master Limiter)
      // 软性天花板 -5dB，比率 12:1，防止多音效并发叠加产生数字削波爆音
      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-5, this.ctx.currentTime);
      this.masterLimiter.knee.setValueAtTime(6, this.ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.1, this.ctx.currentTime);

      // 2. 主输出增益 (Master Gain: 标称 0.75，安全物理余量)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);

      this.masterLimiter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // 3. SFX 专用总线与复古温润低通滤波 (5.2kHz 滚降，去除尖锐毛刺，同时保留清脆明亮的微触觉)
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.sfxFilter = this.ctx.createBiquadFilter();
      this.sfxFilter.type = 'lowpass';
      this.sfxFilter.frequency.setValueAtTime(5200, this.ctx.currentTime);
      this.sfxFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);

      this.sfxBus.connect(this.sfxFilter);
      this.sfxFilter.connect(this.masterLimiter);

      // 4. BGM 专用总线 (直通 Master Limiter，默认平衡音量 0.22)
      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.bgmBus.connect(this.masterLimiter);

      // 5. 预生成 1 秒白噪声缓存（用于高频打击声、按键机械回弹与破裂音效）
      this.createNoiseBuffer();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * 生成静态白噪声缓冲，杜绝运行时重复计算与垃圾回收抖动
   */
  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate; // 1 秒时长
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * 绑定事件总线
   */
  public attachToEventBus(eventBus: EventBus): void {
    eventBus.on('snake:eat', ({ type }) => {
      if (type === CellType.FOOD) {
        this.playEatFood();
      } else {
        this.playEatBonus();
      }
    });

    eventBus.on('snake:severed', () => {
      this.playCutTail();
    });

    eventBus.on('piece:shift', () => {
      this.playPieceMove();
    });

    eventBus.on('piece:rotate', () => {
      this.playPieceRotate();
    });

    eventBus.on('piece:lock', () => {
      this.playDropBlock();
    });

    eventBus.on('piece:hard_drop', () => {
      this.playHardDrop();
    });

    eventBus.on('line:cleared', () => {
      this.duckBGM(0.07, 450);
      this.playLineClear();
    });

    eventBus.on('game:start', () => {
      this.playBGM();
    });

    eventBus.on('game:restart', () => {
      this.restartBGM();
    });

    eventBus.on('game:pause', () => {
      this.pauseBGM();
    });

    eventBus.on('game:resume', () => {
      this.resumeBGM();
    });

    eventBus.on('game:over', () => {
      this.fadeOutBGM(800);
      this.playGameOver();
    });

    eventBus.on('ui:click', () => {
      this.playUIClick();
    });
  }

  // ============================================================================
  // 程序化底层合成器工具集 (Web Audio API 原生时间轴微秒调度)
  // ============================================================================

  /**
   * 播放单音调（带微秒级平滑防爆音包络）
   */
  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    startVol = 0.1,
    offset = 0
  ): void {
    if (!this.ctx || !this.sfxBus || this.isMuted) return;

    try {
      const now = this.ctx.currentTime + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      // 防冲击微渐入 (2ms Attack) + 指数快速衰减 (Decay)
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(startVol, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // 静默防御
    }
  }

  /**
   * 播放频率滑音 (Chirp / Frequency Sweep，复古游戏核心质感秘密)
   */
  private playChirp(
    startFreq: number,
    endFreq: number,
    type: OscillatorType,
    duration: number,
    startVol = 0.1,
    offset = 0
  ): void {
    if (!this.ctx || !this.sfxBus || this.isMuted) return;

    try {
      const now = this.ctx.currentTime + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, startFreq), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(startVol, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // 静默防御
    }
  }

  /**
   * 播放成型滤波噪声脉冲 (Filtered Noise Burst，模拟机械打击、齿轮与剪切)
   */
  private playNoiseBurst(
    duration: number,
    filterType: BiquadFilterType,
    filterFreq: number,
    filterQ = 1.0,
    startVol = 0.08,
    offset = 0
  ): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuffer || this.isMuted) return;

    try {
      const now = this.ctx.currentTime + offset;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.Q.setValueAtTime(filterQ, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(startVol, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);

      source.start(now);
      source.stop(now + duration);
    } catch {
      // 静默防御
    }
  }

  /**
   * 原生时间轴多音琶音调度（彻底废除 setTimeout 带来的时序漂移与卡顿）
   */
  private playArpeggio(notes: ArpeggioNote[], defaultType: OscillatorType = 'square'): void {
    if (!this.ctx || !this.sfxBus || this.isMuted) return;

    notes.forEach(n => {
      this.playTone(n.freq, n.type || defaultType, n.duration, n.vol || 0.08, n.offset);
    });
  }

  // ============================================================================
  // 10 大重构与全新复古质感音效接口
  // ============================================================================

  /**
   * 1. 拾取普通食物 (🔸 金色晶石)：
   * 复古 8-bit 双重轻快跳跃音（D5 -> A5），短促清澈，穿透力充足
   */
  public playEatFood(): void {
    this.init();
    // 音阶 1: 587Hz (D5) -> 740Hz (F#5), 28ms
    this.playChirp(587, 740, 'square', 0.028, 0.13, 0);
    // 音阶 2: 740Hz -> 880Hz (A5), 32ms
    this.playChirp(740, 880, 'square', 0.032, 0.12, 0.022);
  }

  /**
   * 2. 拾取高能食物 (💎 青蓝棱晶)：
   * 晶莹璀璨的三连音琶音（E5-A5-E6），附带高频晶体微光（Shimmer），极具成就感
   */
  public playEatBonus(): void {
    this.init();
    this.playArpeggio([
      { freq: 659, duration: 0.042, offset: 0.0, type: 'triangle', vol: 0.13 },
      { freq: 880, duration: 0.048, offset: 0.032, type: 'square', vol: 0.15 },
      { freq: 1318, duration: 0.075, offset: 0.064, type: 'square', vol: 0.16 }
    ]);
    // 晶莹微光高频微泛音
    this.playTone(2200, 'sine', 0.06, 0.06, 0.064);
  }

  /**
   * 3. 方块落定锁定 (🧱 实体机械嵌合)：
   * 模拟掌机按键卡扣（Latch Thud）：带通白噪冲击 + 80Hz 快速衰减三角波，兼备击打卡扣与下沉厚重感
   */
  public playDropBlock(): void {
    this.init();
    // 机械卡扣高频击打
    this.playNoiseBurst(0.035, 'bandpass', 850, 2.0, 0.09, 0);
    // 底座结实下沉感 (85Hz -> 45Hz)
    this.playChirp(85, 45, 'triangle', 0.055, 0.14, 0);
  }

  /**
   * 4. 空格瞬间硬降 (⚡ 破空坠击)：
   * 急促的空气俯冲下潜声 + 强化的落地重击
   */
  public playHardDrop(): void {
    this.init();
    // 气流急速下潜 (650Hz -> 180Hz 滤波噪声)
    this.playNoiseBurst(0.045, 'lowpass', 650, 1.2, 0.09, 0);
    // 沉重地面撞击
    this.playChirp(95, 42, 'triangle', 0.070, 0.16, 0.02);
    this.playNoiseBurst(0.04, 'bandpass', 1100, 1.5, 0.09, 0.02);
  }

  /**
   * 5. 方块左右平移 (🕹️ 微触觉反馈)：
   * 清脆利落的掌机微动开关滴答声，带 42ms 触发节流杜绝杂音轰炸，声音清晰可辨
   */
  public playPieceMove(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastMoveTime < 0.042) return;
    this.lastMoveTime = now;

    // 清脆微动开关卡扣
    this.playNoiseBurst(0.016, 'bandpass', 1800, 2.5, 0.075, 0);
    this.playTone(520, 'square', 0.016, 0.06, 0);
  }

  /**
   * 6. 方块顺时针旋转 (🔄 机械齿轮拨片)：
   * 齿轮弹片短促上滑音（650Hz -> 1050Hz），清爽坚决
   */
  public playPieceRotate(): void {
    this.init();
    this.playChirp(650, 1050, 'square', 0.028, 0.10, 0);
  }

  /**
   * 7. 蛇身断尾受创 (✂️ 机械剪切与断裂冲击)：
   * 带通滤波剪断脆响 + 220Hz 骤降音，痛感明确但圆润不刺耳
   */
  public playCutTail(): void {
    this.init();
    // 剪切脆响 (1600Hz 带通噪点)
    this.playNoiseBurst(0.045, 'bandpass', 1600, 1.4, 0.12, 0);
    // 受创下沉感 (220Hz -> 75Hz)
    this.playChirp(220, 75, 'triangle', 0.075, 0.15, 0.005);
  }

  /**
   * 8. 共生消行 (🌟 80s 街机大三和弦辉煌琶音)：
   * C5-E5-G5-C6 大三和弦快速辉煌琶音 + 晶体爆破，高光胜利感拉满
   */
  public playLineClear(): void {
    this.init();
    this.playArpeggio([
      { freq: 523, duration: 0.042, offset: 0.0, type: 'square', vol: 0.15 },
      { freq: 659, duration: 0.046, offset: 0.034, type: 'square', vol: 0.16 },
      { freq: 784, duration: 0.050, offset: 0.068, type: 'square', vol: 0.17 },
      { freq: 1046, duration: 0.14, offset: 0.102, type: 'square', vol: 0.20 }
    ]);
    // 晶体碎裂爆破光华
    this.playNoiseBurst(0.05, 'highpass', 3000, 1.0, 0.075, 0.102);
  }

  /**
   * 9. 游戏结束 (💀 复古从容下沉旋律)：
   * G4 -> F4 -> Eb4 -> G3 经典下行律动，柔和温润淡出，表达遗憾而非惩罚感
   */
  public playGameOver(): void {
    this.init();
    this.playArpeggio([
      { freq: 392, duration: 0.09, offset: 0.0, type: 'triangle', vol: 0.14 },
      { freq: 349, duration: 0.09, offset: 0.085, type: 'triangle', vol: 0.14 },
      { freq: 311, duration: 0.11, offset: 0.17, type: 'triangle', vol: 0.15 },
      { freq: 196, duration: 0.28, offset: 0.26, type: 'triangle', vol: 0.16 }
    ]);
  }

  /**
   * 10. UI 交互微确认音 (🔘 经典掌机轻量确认)：
   */
  public playUIClick(): void {
    this.init();
    this.playChirp(800, 920, 'sine', 0.020, 0.09, 0);
  }

  /**
   * 获取为未来背景音乐预留的总线节点
   */
  public getBGMBus(): GainNode | null {
    return this.bgmBus;
  }

  /**
   * 初始化 BGM 实例并连接至 bgmBus (通过 Master Limiter 与 Master Gain)
   */
  public initBGM(src?: string): void {
    if (typeof window === 'undefined') return;
    this.init();

    const defaultSrc = `${(import.meta.env?.BASE_URL || './').replace(/\/$/, '')}/assets/audio/puzzle-pieces.mp3`;
    const audioSrc = src ?? defaultSrc;

    if (!this.bgmAudio && typeof Audio !== 'undefined') {
      try {
        this.bgmAudio = new Audio(audioSrc);
        this.bgmAudio.loop = true;
        this.bgmAudio.preload = 'auto';
      } catch {
        // Audio element fallback
      }
    }

    if (this.ctx && this.bgmAudio && !this.bgmSourceNode && this.bgmBus) {
      try {
        this.bgmSourceNode = this.ctx.createMediaElementSource(this.bgmAudio);
        this.bgmSourceNode.connect(this.bgmBus);
      } catch {
        // Direct volume fallback if routing fails
        if (this.bgmAudio) {
          this.bgmAudio.volume = this.isMuted ? 0 : this.bgmVolume;
        }
      }
    }
  }

  /**
   * 开始播放背景音乐
   */
  public playBGM(): void {
    if (typeof window === 'undefined') return;
    this.initBGM();
    if (!this.bgmAudio) return;

    if (this.bgmBus && this.ctx) {
      this.bgmBus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmBus.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }

    this.bgmAudio.play().then(() => {
      this.isBGMPlaying = true;
    }).catch(() => {
      // Autoplay policy fallback
    });
  }

  /**
   * 暂停背景音乐
   */
  public pauseBGM(): void {
    if (this.bgmAudio && this.isBGMPlaying) {
      this.bgmAudio.pause();
      this.isBGMPlaying = false;
    }
  }

  /**
   * 恢复背景音乐
   */
  public resumeBGM(): void {
    if (this.bgmAudio && !this.isBGMPlaying) {
      this.playBGM();
    }
  }

  /**
   * 重新从头开始播放背景音乐
   */
  public restartBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.currentTime = 0;
    }
    this.playBGM();
  }

  /**
   * 平滑淡出背景音乐（用于游戏结束）
   */
  public fadeOutBGM(durationMs = 800): void {
    if (!this.bgmAudio || !this.isBGMPlaying) return;

    if (this.bgmBus && this.ctx) {
      const now = this.ctx.currentTime;
      const durSec = durationMs / 1000;
      this.bgmBus.gain.cancelScheduledValues(now);
      this.bgmBus.gain.setValueAtTime(this.bgmBus.gain.value, now);
      this.bgmBus.gain.linearRampToValueAtTime(0.001, now + durSec);
      setTimeout(() => {
        if (!this.isBGMPlaying && this.bgmAudio) {
          this.bgmAudio.pause();
        }
      }, durationMs);
    } else {
      this.pauseBGM();
    }
    this.isBGMPlaying = false;
  }

  /**
   * 侧链短暂闪避（Ducking）：消行时 BGM 瞬间微降，突出消行的高光声效，随后恢复
   */
  public duckBGM(targetVolume = 0.07, durationMs = 450): void {
    if (!this.bgmBus || !this.ctx || !this.isBGMPlaying) return;
    const now = this.ctx.currentTime;
    const durSec = durationMs / 1000;
    this.bgmBus.gain.cancelScheduledValues(now);
    this.bgmBus.gain.setValueAtTime(this.bgmVolume, now);
    this.bgmBus.gain.linearRampToValueAtTime(targetVolume, now + 0.04);
    this.bgmBus.gain.linearRampToValueAtTime(this.bgmVolume, now + durSec);
  }

  /**
   * 设置背景音乐音量 (0.0 ~ 1.0)
   */
  public setBGMVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmBus && this.ctx) {
      this.bgmBus.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  /**
   * 获取当前背景音乐音量
   */
  public getBGMVolume(): number {
    return this.bgmVolume;
  }

  /**
   * 切换全局静音状态
   */
  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public get muted(): boolean {
    return this.isMuted;
  }

  /**
   * 设置静音开关
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.75, this.ctx.currentTime);
    }
    if (this.bgmAudio && !this.bgmSourceNode) {
      this.bgmAudio.volume = muted ? 0 : this.bgmVolume;
    }
  }

  /**
   * 设置音效总线音量 (0.0 ~ 1.0)
   */
  public setSFXVolume(vol: number): void {
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  /**
   * 获取当前音效总线音量
   */
  public getSFXVolume(): number {
    return this.sfxBus?.gain.value ?? 1.0;
  }
}
