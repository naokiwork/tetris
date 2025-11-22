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
    private fps: number = 0;
    private fpsCounter: number = 0;
    private fpsLastTime: number = 0;
    private debugMode: boolean = false;

    constructor() {
        this.game = new Game();
        this.inputHandler = new InputHandler(this.game);
        this.inputHandler.setDebugToggleCallback(() => this.toggleDebugMode());
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

        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showHelpModal();
            });
        }

        const closeHelpBtn = document.getElementById('close-help-btn');
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => {
                this.hideHelpModal();
            });
        }

        // ハイスコアの読み込みと表示
        this.loadHighScore();
        this.updateHighScoreDisplay();

        // ゲーム開始
        this.game.start();
    }

    /**
     * ヘルプモーダルを表示
     */
    private showHelpModal(): void {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * ヘルプモーダルを非表示
     */
    private hideHelpModal(): void {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * ハイスコアの読み込み
     */
    private loadHighScore(): number {
        const saved = localStorage.getItem('tetris-high-score');
        return saved ? parseInt(saved, 10) : 0;
    }

    /**
     * ハイスコアの保存
     */
    private saveHighScore(score: number): void {
        const currentHigh = this.loadHighScore();
        if (score > currentHigh) {
            localStorage.setItem('tetris-high-score', score.toString());
            this.updateHighScoreDisplay();
        }
    }

    /**
     * ハイスコア表示の更新
     */
    private updateHighScoreDisplay(): void {
        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            const highScore = this.loadHighScore();
            highScoreElement.textContent = String(highScore).padStart(6, '0');
        }
    }

    /**
     * ゲームオーバーモーダルを表示
     */
    private showGameOverModal(): void {
        const modal = document.getElementById('game-over-modal');
        const finalScoreElement = document.getElementById('final-score');
        const finalHighScoreElement = document.getElementById('final-high-score');
        
        if (modal) {
            modal.classList.remove('hidden');
        }
        
        if (finalScoreElement) {
            finalScoreElement.textContent = this.game.getScoreSystem().formatScore();
        }
        
        if (finalHighScoreElement) {
            const highScore = this.loadHighScore();
            finalHighScoreElement.textContent = String(highScore).padStart(6, '0');
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
        try {
            const deltaTime = currentTime - this.lastTime;
            // 異常に大きなdeltaTimeを無視（タブが非アクティブになった場合など）
            if (deltaTime > 1000) {
                this.lastTime = currentTime;
                this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
                return;
            }
            this.lastTime = currentTime;

            // FPS計算
            this.updateFPS(currentTime);

            // 入力処理
            this.inputHandler.update();

            // ゲーム更新
            this.game.update(deltaTime);

            // 描画
            this.renderer.render(this.game);

            // FPS表示の更新
            this.updateFPSDisplay();

            // デバッグ情報の表示
            if (this.debugMode) {
                this.renderDebugInfo();
            }

            // ゲームオーバー処理
            if (this.game.getState() === GameState.GAME_OVER) {
                const finalScore = this.game.getScoreSystem().getScore();
                this.saveHighScore(finalScore);
                this.showGameOverModal();
            }

            // 次のフレーム
            this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
        } catch (error) {
            console.error('Game loop error:', error);
            // エラー通知UIを表示（簡易版）
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:red;color:white;padding:10px;border-radius:5px;z-index:10000;';
            errorMsg.textContent = 'ゲームエラーが発生しました。ページをリロードしてください。';
            document.body.appendChild(errorMsg);
            // ゲームループを停止
            this.stop();
        }
    }

    /**
     * FPS更新
     */
    private updateFPS(currentTime: number): void {
        this.fpsCounter++;
        if (currentTime - this.fpsLastTime >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsLastTime = currentTime;
        }
    }

    /**
     * FPS表示の更新
     */
    private updateFPSDisplay(): void {
        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.textContent = String(this.fps);
        }
    }

    /**
     * デバッグ情報の表示
     */
    private renderDebugInfo(): void {
        const debugDiv = document.getElementById('debug-info') || this.createDebugElement();
        const piece = this.game.getCurrentPiece();
        const state = this.game.getState();
        
        debugDiv.innerHTML = `
            <div style="position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.8);color:white;padding:10px;font-family:monospace;font-size:12px;z-index:1000;border-radius:5px;">
                <div>FPS: ${this.fps}</div>
                <div>State: ${state}</div>
                ${piece ? `<div>Piece: ${piece.type} (${piece.position.x}, ${piece.position.y})</div>` : ''}
                <div>Level: ${this.game.getScoreSystem().getLevel()}</div>
                <div>Score: ${this.game.getScoreSystem().getScore()}</div>
                <div>Lines: ${this.game.getScoreSystem().getLines()}</div>
            </div>
        `;
    }

    /**
     * デバッグ要素の作成
     */
    private createDebugElement(): HTMLElement {
        const div = document.createElement('div');
        div.id = 'debug-info';
        document.body.appendChild(div);
        return div;
    }

    /**
     * デバッグモードの切り替え
     */
    toggleDebugMode(): void {
        this.debugMode = !this.debugMode;
        if (!this.debugMode) {
            const debugDiv = document.getElementById('debug-info');
            if (debugDiv) {
                debugDiv.remove();
            }
        }
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
        // イベントリスナーのクリーンアップはInputHandlerで行う
        if (this.inputHandler) {
            this.inputHandler.cleanup();
        }
    }
}

// アプリケーションを開始
const app = new TetrisApp();
app.start();

