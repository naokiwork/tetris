import { Game } from './game';

/**
 * 入力管理クラス
 */
export class InputHandler {
    private game: Game;
    private keys: Set<string> = new Set();
    private keyRepeatTimers: Map<string, number> = new Map();
    private inputQueue: string[] = []; // 入力キュー
    private isProcessing: boolean = false;
    private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
    private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
    private debugToggleCallback: (() => void) | null = null;
    private rendererCallback: ((key: string) => void) | null = null;
    
    private readonly REPEAT_DELAY = 150; // 初回リピートまでの遅延（ms）
    private readonly REPEAT_INTERVAL = 50; // リピート間隔（ms）

    constructor(game: Game) {
        this.game = game;
        this.setupEventListeners();
    }

    /**
     * デバッグモード切り替えコールバックを設定
     */
    setDebugToggleCallback(callback: () => void): void {
        this.debugToggleCallback = callback;
    }

    /**
     * レンダラーコールバックを設定（キー入力フィードバック用）
     */
    setRendererCallback(callback: (key: string) => void): void {
        this.rendererCallback = callback;
    }

    private setupEventListeners(): void {
        // 既存のリスナーを削除（重複登録を防ぐ）
        this.cleanup();
        
        this.keyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
        this.keyUpHandler = (e: KeyboardEvent) => this.handleKeyUp(e);
        
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);
    }

    /**
     * イベントリスナーのクリーンアップ
     */
    cleanup(): void {
        if (this.keyDownHandler) {
            window.removeEventListener('keydown', this.keyDownHandler);
            this.keyDownHandler = null;
        }
        if (this.keyUpHandler) {
            window.removeEventListener('keyup', this.keyUpHandler);
            this.keyUpHandler = null;
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        // デフォルトの動作を防ぐ（ページスクロールなど）
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
            e.preventDefault();
        }

        if (this.keys.has(e.key)) {
            return; // 既に押されているキーは無視
        }

        this.keys.add(e.key);
        this.handleKeyPress(e.key);

        // リピートタイマーを設定
        if (this.isRepeatableKey(e.key)) {
            this.keyRepeatTimers.set(e.key, Date.now() + this.REPEAT_DELAY);
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.keys.delete(e.key);
        this.keyRepeatTimers.delete(e.key);
    }

    private isRepeatableKey(key: string): boolean {
        return ['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(key);
    }

    private handleKeyPress(key: string): void {
        // キー入力フィードバックを設定（Rendererに通知）
        if (this.rendererCallback) {
            this.rendererCallback(key);
        }
        
        // 入力キューに追加（非同期処理のため）
        this.inputQueue.push(key);
        this.processInputQueue();
    }

    /**
     * 入力キューを処理（非同期で高速な連続入力に対応）
     */
    private async processInputQueue(): Promise<void> {
        if (this.isProcessing || this.inputQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        
        // 次のフレームで処理（非同期）
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        while (this.inputQueue.length > 0) {
            const key = this.inputQueue.shift();
            if (!key) continue;

            switch (key) {
                case 'ArrowLeft':
                    this.game.moveLeft();
                    break;
                case 'ArrowRight':
                    this.game.moveRight();
                    break;
                case 'ArrowDown':
                    this.game.softDrop();
                    break;
                case 'ArrowUp':
                case ' ':
                    this.game.hardDrop();
                    break;
                case 'z':
                case 'Z':
                    this.game.rotateCounterClockwise();
                    break;
                case 'x':
                case 'X':
                    this.game.rotateClockwise();
                    break;
                case 'c':
                case 'C':
                    this.game.hold();
                    break;
            case 'p':
            case 'P':
            case 'Escape':
                this.game.togglePause();
                break;
            case 'd':
            case 'D':
                // デバッグモード切り替え
                if (this.debugToggleCallback) {
                    this.debugToggleCallback();
                }
                break;
            }
        }

        this.isProcessing = false;
    }

    /**
     * 更新処理（キーリピート処理）
     */
    update(): void {
        const now = Date.now();

        for (const [key, nextRepeat] of this.keyRepeatTimers.entries()) {
            if (now >= nextRepeat) {
                this.handleKeyPress(key);
                this.keyRepeatTimers.set(key, now + this.REPEAT_INTERVAL);
            }
        }
    }
}

