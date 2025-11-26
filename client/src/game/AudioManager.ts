/**
 * 音效管理器
 * 管理游戏中所有音效的加载和播放
 */

export enum SoundType {
  // P0 核心音效
  RUNE_LAUNCH = 'rune_launch',                    // 符文炮弹发射
  GOLEM_SHATTER = 'golem_shatter',                // 晶石魔像破碎
  ENERGY_CHARGING = 'energy_charging',            // 能量充能
  FORTUNE_SEAL = 'fortune_seal',                  // 命运刻印触发
  RUNE_INSCRIPTION = 'rune_inscription',          // 符文铭刻
  GOLEM_DESCENDING = 'golem_descending',          // 魔像下沉
  SHIELD_DAMAGE = 'shield_damage',                // 护盾受损
  ENERGY_DEPLETED = 'energy_depleted',            // 能量不足
  COMBO_RESONANCE = 'combo_resonance',            // 连击共鸣
  PERFECT_CLEAR = 'perfect_clear',                // 完美清屏
  
  // P1 补充音效
  AIMING_LOCK = 'aiming_lock',                    // 瞄准锁定
  MENU_TRANSITION = 'menu_transition',            // 菜单转换
  PAUSE = 'pause',                                // 暂停
  RESUME = 'resume',                              // 恢复
  RARE_RUNE = 'rare_rune',                        // 稀有符文发现
  SPACE_TEAR = 'space_tear',                      // 空间撕裂
  
  // P2 环境音效
  AMBIENT_ALTAR = 'ambient_altar',                // 祭坛环境音
  AMBIENT_TEMPLE = 'ambient_temple',              // 神殿环境音
  AMBIENT_VICTORY = 'ambient_victory',            // 胜利环境音
  AMBIENT_DEFEAT = 'ambient_defeat',              // 失败环境音
  
  // P3 UI音效
  UI_BUTTON = 'ui_button',                        // 按钮点击
  UI_ERROR = 'ui_error',                          // 错误提示
  UI_SUCCESS = 'ui_success',                      // 成功提示
}

// 音效文件映射
const SOUND_FILES: Record<SoundType, string> = {
  // P0 核心音效
  [SoundType.RUNE_LAUNCH]: '/sounds/p0_core/sfx_rune_projectile_launch.wav',
  [SoundType.GOLEM_SHATTER]: '/sounds/p0_core/sfx_crystal_golem_shatter.wav',
  [SoundType.ENERGY_CHARGING]: '/sounds/p0_core/sfx_energy_charging_ritual.wav',
  [SoundType.FORTUNE_SEAL]: '/sounds/p0_core/sfx_fortune_seal_divine.wav',
  [SoundType.RUNE_INSCRIPTION]: '/sounds/p0_core/sfx_rune_inscription_reality.wav',
  [SoundType.GOLEM_DESCENDING]: '/sounds/p0_core/sfx_golem_descending_doom.wav',
  [SoundType.SHIELD_DAMAGE]: '/sounds/p0_core/sfx_shield_ward_failing.wav',
  [SoundType.ENERGY_DEPLETED]: '/sounds/p0_core/sfx_energy_depleted_dying.wav',
  [SoundType.COMBO_RESONANCE]: '/sounds/p0_core/sfx_combo_resonance_cascade.wav',
  [SoundType.PERFECT_CLEAR]: '/sounds/p0_core/sfx_perfect_clear_purification.wav',
  
  // P1 补充音效
  [SoundType.AIMING_LOCK]: '/sounds/p1_supplement/sfx_aiming_trajectory_lock.wav',
  [SoundType.MENU_TRANSITION]: '/sounds/p1_supplement/sfx_menu_transition_portal.wav',
  [SoundType.PAUSE]: '/sounds/p1_supplement/sfx_pause_time_freeze.wav',
  [SoundType.RESUME]: '/sounds/p1_supplement/sfx_resume_time_flow.wav',
  [SoundType.RARE_RUNE]: '/sounds/p1_supplement/sfx_rare_rune_discovery.wav',
  [SoundType.SPACE_TEAR]: '/sounds/p1_supplement/sfx_space_tear_dimensional.wav',
  
  // P2 环境音效
  [SoundType.AMBIENT_ALTAR]: '/sounds/p2_ambient/sfx_ambient_altar_active.wav',
  [SoundType.AMBIENT_TEMPLE]: '/sounds/p2_ambient/sfx_ambient_temple_chamber.wav',
  [SoundType.AMBIENT_VICTORY]: '/sounds/p2_ambient/sfx_ambient_victory_ethereal.wav',
  [SoundType.AMBIENT_DEFEAT]: '/sounds/p2_ambient/sfx_ambient_defeat_ominous.wav',
  
  // P3 UI音效
  [SoundType.UI_BUTTON]: '/sounds/p3_ui/sfx_ui_button_rune_tap.wav',
  [SoundType.UI_ERROR]: '/sounds/p3_ui/sfx_ui_error_ward_block.wav',
  [SoundType.UI_SUCCESS]: '/sounds/p3_ui/sfx_ui_success_blessing.wav',
};

export class AudioManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private masterVolume: number = 0.7;
  private sfxVolume: number = 0.8;
  private ambientVolume: number = 0.5;
  private enabled: boolean = true;
  private currentAmbient: HTMLAudioElement | null = null;

  constructor() {
    this.preloadSounds();
  }

  /**
   * 预加载所有音效
   */
  private preloadSounds(): void {
    for (const [type, path] of Object.entries(SOUND_FILES)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(type as SoundType, audio);
    }
  }

  /**
   * 播放音效
   */
  play(type: SoundType, options?: { volume?: number; loop?: boolean }): void {
    if (!this.enabled) return;

    const audio = this.sounds.get(type);
    if (!audio) {
      console.warn(`Sound not found: ${type}`);
      return;
    }

    // 克隆音频以支持同时播放多个相同音效
    const clone = audio.cloneNode() as HTMLAudioElement;
    
    // 设置音量
    const baseVolume = this.isAmbient(type) ? this.ambientVolume : this.sfxVolume;
    clone.volume = (options?.volume ?? 1) * baseVolume * this.masterVolume;
    
    // 设置循环
    clone.loop = options?.loop ?? false;
    
    // 播放
    clone.play().catch(err => {
      console.warn(`Failed to play sound ${type}:`, err);
    });

    // 环境音管理
    if (this.isAmbient(type)) {
      if (this.currentAmbient) {
        this.fadeOut(this.currentAmbient, 1000);
      }
      this.currentAmbient = clone;
    }

    // 非循环音效播放完后清理
    if (!clone.loop) {
      clone.addEventListener('ended', () => {
        clone.remove();
      });
    }
  }

  /**
   * 停止音效
   */
  stop(type: SoundType): void {
    const audio = this.sounds.get(type);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // 停止当前环境音
    if (this.isAmbient(type) && this.currentAmbient) {
      this.currentAmbient.pause();
      this.currentAmbient = null;
    }
  }

  /**
   * 停止所有音效
   */
  stopAll(): void {
    for (const audio of Array.from(this.sounds.values())) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (this.currentAmbient) {
      this.currentAmbient.pause();
      this.currentAmbient = null;
    }
  }

  /**
   * 淡出音效
   */
  private fadeOut(audio: HTMLAudioElement, duration: number): void {
    const startVolume = audio.volume;
    const fadeStep = startVolume / (duration / 50);
    
    const fadeInterval = setInterval(() => {
      if (audio.volume > fadeStep) {
        audio.volume -= fadeStep;
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(fadeInterval);
      }
    }, 50);
  }

  /**
   * 判断是否为环境音
   */
  private isAmbient(type: SoundType): boolean {
    return type.startsWith('ambient_');
  }

  /**
   * 设置主音量
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 设置音效音量
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 设置环境音音量
   */
  setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.currentAmbient) {
      this.currentAmbient.volume = this.ambientVolume * this.masterVolume;
    }
  }

  /**
   * 启用/禁用音效
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * 获取音效启用状态
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopAll();
    this.sounds.clear();
  }
}
