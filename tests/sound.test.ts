import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundEngine } from '../src/systems/SoundEngine';
import { EventBus } from '../src/systems/EventBus';
import { CellType } from '../src/core/types';

describe('SoundEngine & Retro Chiptune Audio Architecture', () => {
  it('should not throw in environments where AudioContext is unavailable (SSR/Node)', () => {
    const eventBus = new EventBus();
    const soundEngine = new SoundEngine(eventBus);

    expect(() => soundEngine.init()).not.toThrow();
    expect(() => soundEngine.playEatFood()).not.toThrow();
    expect(() => soundEngine.playDropBlock()).not.toThrow();
    expect(() => soundEngine.playLineClear()).not.toThrow();
    expect(() => soundEngine.playGameOver()).not.toThrow();
    expect(() => soundEngine.initBGM()).not.toThrow();
    expect(() => soundEngine.playBGM()).not.toThrow();
    expect(() => soundEngine.pauseBGM()).not.toThrow();
    expect(() => soundEngine.resumeBGM()).not.toThrow();
    expect(() => soundEngine.restartBGM()).not.toThrow();
    expect(() => soundEngine.fadeOutBGM()).not.toThrow();
    expect(() => soundEngine.duckBGM()).not.toThrow();
    expect(() => soundEngine.setBGMVolume(0.4)).not.toThrow();
    expect(() => soundEngine.toggleMute()).not.toThrow();
  });

  describe('Web Audio Graph Topology & Synthesis', () => {
    let mockCtx: any;

    beforeEach(() => {
      const createParam = (defaultVal = 0) => ({
        value: defaultVal,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn()
      });

      mockCtx = {
        currentTime: 0.1,
        sampleRate: 44100,
        state: 'running',
        destination: {},
        createGain: vi.fn(() => ({
          gain: createParam(1),
          connect: vi.fn()
        })),
        createDynamicsCompressor: vi.fn(() => ({
          threshold: createParam(-6),
          knee: createParam(6),
          ratio: createParam(12),
          attack: createParam(0.003),
          release: createParam(0.1),
          connect: vi.fn()
        })),
        createBiquadFilter: vi.fn(() => ({
          type: 'lowpass',
          frequency: createParam(4600),
          Q: createParam(0.8),
          connect: vi.fn()
        })),
        createBuffer: vi.fn(() => ({
          getChannelData: vi.fn(() => new Float32Array(44100))
        })),
        createBufferSource: vi.fn(() => ({
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn()
        })),
        createMediaElementSource: vi.fn(() => ({
          connect: vi.fn()
        })),
        createOscillator: vi.fn(() => ({
          type: 'square',
          frequency: createParam(440),
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn()
        })),
        resume: vi.fn()
      };

      const mockAudio = {
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        volume: 1,
        currentTime: 0,
        loop: false,
        preload: ''
      };
      (globalThis as any).Audio = vi.fn(() => mockAudio);

      (globalThis as any).window = {
        AudioContext: vi.fn(() => mockCtx)
      };
    });

    it('should construct Master Limiter, SFX Bus and pre-allocate BGM Bus', () => {
      const soundEngine = new SoundEngine();
      soundEngine.init();

      expect(mockCtx.createDynamicsCompressor).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
      expect(soundEngine.getBGMBus()).toBeDefined();
    });

    it('should trigger all 10 retro procedural sound effects without error', () => {
      const soundEngine = new SoundEngine();
      soundEngine.init();

      expect(() => soundEngine.playEatFood()).not.toThrow();
      expect(() => soundEngine.playEatBonus()).not.toThrow();
      expect(() => soundEngine.playDropBlock()).not.toThrow();
      expect(() => soundEngine.playHardDrop()).not.toThrow();
      expect(() => soundEngine.playPieceMove()).not.toThrow();
      expect(() => soundEngine.playPieceRotate()).not.toThrow();
      expect(() => soundEngine.playCutTail()).not.toThrow();
      expect(() => soundEngine.playLineClear()).not.toThrow();
      expect(() => soundEngine.playGameOver()).not.toThrow();
      expect(() => soundEngine.playUIClick()).not.toThrow();
    });

    it('should react to EventBus events properly', () => {
      const eventBus = new EventBus();
      const soundEngine = new SoundEngine(eventBus);
      soundEngine.init();

      const playFoodSpy = vi.spyOn(soundEngine, 'playEatFood');
      const playBonusSpy = vi.spyOn(soundEngine, 'playEatBonus');
      const playCutSpy = vi.spyOn(soundEngine, 'playCutTail');
      const playShiftSpy = vi.spyOn(soundEngine, 'playPieceMove');
      const playRotateSpy = vi.spyOn(soundEngine, 'playPieceRotate');
      const playLockSpy = vi.spyOn(soundEngine, 'playDropBlock');
      const playHardDropSpy = vi.spyOn(soundEngine, 'playHardDrop');
      const playLineClearSpy = vi.spyOn(soundEngine, 'playLineClear');
      const playGameOverSpy = vi.spyOn(soundEngine, 'playGameOver');
      const playUISpy = vi.spyOn(soundEngine, 'playUIClick');
      const playBGMSpy = vi.spyOn(soundEngine, 'playBGM');
      const pauseBGMSpy = vi.spyOn(soundEngine, 'pauseBGM');
      const resumeBGMSpy = vi.spyOn(soundEngine, 'resumeBGM');
      const restartBGMSpy = vi.spyOn(soundEngine, 'restartBGM');
      const fadeOutBGMSpy = vi.spyOn(soundEngine, 'fadeOutBGM');
      const duckBGMSpy = vi.spyOn(soundEngine, 'duckBGM');

      eventBus.emit('snake:eat', { type: CellType.FOOD, pos: { x: 0, y: 0 }, growth: 1, points: 10 });
      expect(playFoodSpy).toHaveBeenCalled();

      eventBus.emit('snake:eat', { type: CellType.BONUS_FOOD, pos: { x: 0, y: 0 }, growth: 3, points: 50 });
      expect(playBonusSpy).toHaveBeenCalled();

      eventBus.emit('snake:severed', { index: 1, severedSegments: [] });
      expect(playCutSpy).toHaveBeenCalled();

      eventBus.emit('piece:shift', { dx: 1 });
      expect(playShiftSpy).toHaveBeenCalled();

      eventBus.emit('piece:rotate', { piece: null as any });
      expect(playRotateSpy).toHaveBeenCalled();

      eventBus.emit('piece:lock', { piece: null as any, cells: [] });
      expect(playLockSpy).toHaveBeenCalled();

      eventBus.emit('piece:hard_drop', { landingY: 10, cells: [] });
      expect(playHardDropSpy).toHaveBeenCalled();

      eventBus.emit('line:cleared', { rows: [10], count: 1, bonusFoods: [] });
      expect(playLineClearSpy).toHaveBeenCalled();
      expect(duckBGMSpy).toHaveBeenCalled();

      eventBus.emit('game:start', undefined as void);
      expect(playBGMSpy).toHaveBeenCalled();

      eventBus.emit('game:pause', undefined as void);
      expect(pauseBGMSpy).toHaveBeenCalled();

      eventBus.emit('game:resume', undefined as void);
      expect(resumeBGMSpy).toHaveBeenCalled();

      eventBus.emit('game:restart', undefined as void);
      expect(restartBGMSpy).toHaveBeenCalled();

      eventBus.emit('game:over', { reason: 'Test' });
      expect(playGameOverSpy).toHaveBeenCalled();
      expect(fadeOutBGMSpy).toHaveBeenCalled();

      eventBus.emit('ui:click', undefined as void);
      expect(playUISpy).toHaveBeenCalled();
    });

    it('should throttle piece move sounds to avoid spamming', () => {
      const soundEngine = new SoundEngine();
      soundEngine.init();

      const playChirpSpy = vi.spyOn<any, any>(soundEngine, 'playTone');
      mockCtx.currentTime = 1.0;
      soundEngine.playPieceMove();

      // Second move within 42ms interval
      mockCtx.currentTime = 1.02;
      soundEngine.playPieceMove();

      // Only one move sound should have played
      expect(playChirpSpy).toHaveBeenCalledTimes(1);

      // Third move after 45ms
      mockCtx.currentTime = 1.05;
      soundEngine.playPieceMove();
      expect(playChirpSpy).toHaveBeenCalledTimes(2);
    });

    it('should support volume control, BGM lifecycle and mute', () => {
      const soundEngine = new SoundEngine();
      soundEngine.init();

      expect(() => soundEngine.setSFXVolume(0.5)).not.toThrow();
      expect(() => soundEngine.setBGMVolume(0.3)).not.toThrow();

      soundEngine.playBGM();
      expect(mockCtx.createMediaElementSource).toHaveBeenCalled();

      soundEngine.pauseBGM();
      soundEngine.resumeBGM();
      soundEngine.restartBGM();
      soundEngine.duckBGM(0.2, 400);
      soundEngine.fadeOutBGM(500);

      expect(soundEngine.muted).toBe(false);
      const isMuted = soundEngine.toggleMute();
      expect(isMuted).toBe(true);
      expect(soundEngine.muted).toBe(true);
      soundEngine.toggleMute();
      expect(soundEngine.muted).toBe(false);

      expect(() => soundEngine.setMuted(true)).not.toThrow();
      expect(() => soundEngine.setMuted(false)).not.toThrow();
    });
  });
});
