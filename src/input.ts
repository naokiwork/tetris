import { Game } from './game';

/**
 * 入力管理クラス
 */
export class InputHandler {
    private game: Game;
    private keys: Set<string> = new Set();
    private keyRepeatTimers: Map<string, number> = new Map();
    
    private readonly REPEAT_DELAY = 150; // 初回リピートまでの遅延（ms）
    private readonly REPEAT_INTERVAL = 50; // リピート間隔（ms）

    constructor(game: Game) {
        this.game = game;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
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
        }
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

