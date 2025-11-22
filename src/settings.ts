/**
 * ゲーム設定管理クラス（タスク6, 7）
 */
export interface GameSettings {
    volume: number;
    keyBindings: Record<string, string>;
    drawQuality: 'low' | 'medium' | 'high';
    autoReplay: boolean; // タスク15
    difficulty: 'easy' | 'normal' | 'hard' | 'expert'; // タスク11
    gameMode: 'marathon' | 'sprint' | 'ultra'; // タスク12
    nextPiecesCount: number; // タスク13
    boardBackground: string; // タスク14
}

const DEFAULT_SETTINGS: GameSettings = {
    volume: 0.7,
    keyBindings: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        hardDrop: 'ArrowUp',
        rotateCCW: 'z',
        rotateCW: 'x',
        hold: 'c',
        pause: 'p'
    },
    drawQuality: 'high',
    autoReplay: false,
    difficulty: 'normal',
    gameMode: 'marathon',
    nextPiecesCount: 1,
    boardBackground: 'default'
};

export class SettingsManager {
    private static readonly STORAGE_KEY = 'tetris-settings';

    /**
     * 設定を読み込む（タスク6）
     */
    static load(): GameSettings {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * 設定を保存する（タスク6）
     */
    static save(settings: GameSettings): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    /**
     * デフォルト設定にリセット
     */
    static reset(): void {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

