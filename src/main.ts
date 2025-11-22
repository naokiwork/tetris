import { Game } from './game';
import { InputHandler } from './input';
import { Renderer } from './renderer';
import { GameState } from './types';

/**
 * メインアプリケーション
 */
class TetrisApp {
    private game: Game;
    private inputHandler: InputHandler;
    private renderer: Renderer;
    private lastTime: number = 0;
    private animationFrameId: number | null = null;

    constructor() {
        this.game = new Game();
        this.inputHandler = new InputHandler(this.game);
        this.renderer = new Renderer(this.game);
        this.setupUI();
    }

    /**
     * UIのセットアップ
     */
    private setupUI(): void {
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.game.start();
                this.hideGameOverModal();
            });
        }

        // ゲーム開始
        this.game.start();
    }

    /**
     * ゲームオーバーモーダルを表示
     */
    private showGameOverModal(): void {
        const modal = document.getElementById('game-over-modal');
        const finalScoreElement = document.getElementById('final-score');
        
        if (modal) {
            modal.classList.remove('hidden');
        }
        
        if (finalScoreElement) {
            finalScoreElement.textContent = this.game.getScoreSystem().formatScore();
        }
    }

    /**
     * ゲームオーバーモーダルを非表示
     */
    private hideGameOverModal(): void {
        const modal = document.getElementById('game-over-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * ゲームループ
     */
    private gameLoop(currentTime: number): void {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // 入力処理
        this.inputHandler.update();

        // ゲーム更新
        this.game.update(deltaTime);

        // 描画
        this.renderer.render(this.game);

        // ゲームオーバー処理
        if (this.game.getState() === GameState.GAME_OVER) {
            this.showGameOverModal();
        }

        // 次のフレーム
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * アプリケーション開始
     */
    start(): void {
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * アプリケーション停止
     */
    stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}

// アプリケーションを開始
const app = new TetrisApp();
app.start();

