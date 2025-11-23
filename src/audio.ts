/**
 * 音響システム
 */
export class AudioSystem {
    private audioContext: AudioContext | null = null;
    private masterVolume: number = 0.5;
    private soundEffects: { [key: string]: number } = {
        'pieceLock': 0.5,
        'levelUp': 0.7,
        'countdown': 0.6,
        'rotate': 0.4,
        'hardDrop': 0.5,
        'lineClear': 0.6,
        'combo': 0.5,
        'tetris': 0.8,
        'gameOver': 0.7
    };

    constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('AudioContext not supported');
        }
    }

    /**
     * 音を再生
     */
    playSound(type: string, frequency: number = 440, duration: number = 0.1): void {
        if (!this.audioContext) return;

        const volume = (this.soundEffects[type] || 0.5) * this.masterVolume;
        if (volume === 0) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * ピース固定時の音
     */
    playPieceLock(): void {
        this.playSound('pieceLock', 200, 0.1);
    }

    /**
     * レベルアップ時の音
     */
    playLevelUp(): void {
        this.playSound('levelUp', 523.25, 0.2); // C5
        setTimeout(() => {
            this.playSound('levelUp', 659.25, 0.2); // E5
        }, 100);
        setTimeout(() => {
            this.playSound('levelUp', 783.99, 0.3); // G5
        }, 200);
    }

    /**
     * カウントダウン時の音
     */
    playCountdown(): void {
        this.playSound('countdown', 440, 0.15);
    }

    /**
     * ピース回転時の音
     */
    playRotate(): void {
        this.playSound('rotate', 330, 0.05);
    }

    /**
     * ハードドロップ時の音
     */
    playHardDrop(): void {
        this.playSound('hardDrop', 150, 0.15);
    }

    /**
     * ライン消去時の音
     */
    playLineClear(lines: number): void {
        const frequencies = [440, 523.25, 659.25, 783.99]; // A4, C5, E5, G5
        const frequency = frequencies[Math.min(lines - 1, frequencies.length - 1)];
        this.playSound('lineClear', frequency, 0.2);
    }

    /**
     * コンボ時の音
     */
    playCombo(count: number): void {
        const frequency = 440 + (count * 50);
        this.playSound('combo', frequency, 0.15);
    }

    /**
     * テトリス時の音
     */
    playTetris(): void {
        // テトリスのテーマ音
        this.playSound('tetris', 523.25, 0.1); // C5
        setTimeout(() => {
            this.playSound('tetris', 659.25, 0.1); // E5
        }, 50);
        setTimeout(() => {
            this.playSound('tetris', 783.99, 0.1); // G5
        }, 100);
        setTimeout(() => {
            this.playSound('tetris', 987.77, 0.2); // B5
        }, 150);
    }

    /**
     * ゲームオーバー時の音
     */
    playGameOver(): void {
        this.playSound('gameOver', 220, 0.3);
        setTimeout(() => {
            this.playSound('gameOver', 196, 0.3);
        }, 200);
        setTimeout(() => {
            this.playSound('gameOver', 174.61, 0.4);
        }, 400);
    }

    /**
     * マスター音量を設定
     */
    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * サウンドエフェクトの音量を設定
     */
    setSoundEffectVolume(type: string, volume: number): void {
        this.soundEffects[type] = Math.max(0, Math.min(1, volume));
    }
}

