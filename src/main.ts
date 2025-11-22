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
    private isCountdown: boolean = false; // タスク16: カウントダウン中フラグ
    // タスク9: パフォーマンス統計
    private minFPS: number = 60;
    private maxFPS: number = 60;
    private frameDrops: number = 0;
    private lastFrameDropTime: number = 0;

    constructor() {
        this.game = new Game();
        this.inputHandler = new InputHandler(this.game);
        this.inputHandler.setDebugToggleCallback(() => this.toggleDebugMode());
        this.renderer = new Renderer(this.game);
        this.inputHandler.setRendererCallback((key: string) => {
            // Rendererのキー入力フィードバック機能を呼び出し
            this.renderer.setKeyPressFeedback(key);
        });
        this.setupUI();
    }

    /**
     * UIのセットアップ
     */
    private setupUI(): void {
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.hideGameOverModal();
                this.startGameWithCountdown(); // タスク17: リスタート時もカウントダウン
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

        const statsBtn = document.getElementById('stats-btn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                this.showStatsModal();
            });
        }

        const closeStatsBtn = document.getElementById('close-stats-btn');
        if (closeStatsBtn) {
            closeStatsBtn.addEventListener('click', () => {
                this.hideStatsModal();
            });
        }

        const rankingBtn = document.getElementById('ranking-btn');
        if (rankingBtn) {
            rankingBtn.addEventListener('click', () => {
                this.showRankingModal();
            });
        }

        const closeRankingBtn = document.getElementById('close-ranking-btn');
        if (closeRankingBtn) {
            closeRankingBtn.addEventListener('click', () => {
                this.hideRankingModal();
            });
        }

        // ハイスコアの読み込みと表示
        this.loadHighScore();
        this.updateHighScoreDisplay();

        // ゲーム開始（カウントダウンアニメーション付き）
        this.startGameWithCountdown();
    }

    /**
     * カウントダウンアニメーション付きでゲーム開始（タスク16: カウントダウン中は操作無効）
     */
    private startGameWithCountdown(): void {
        // カウントダウン中フラグを設定
        this.isCountdown = true;
        this.inputHandler.setCountdownMode(true);
        
        // ゲームはカウントダウン後に開始
        const countdownElement = document.createElement('div');
        countdownElement.id = 'countdown';
        countdownElement.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:120px;font-weight:bold;color:#0969da;z-index:10000;pointer-events:none;text-shadow:2px 2px 4px rgba(0,0,0,0.5);';
        
        let count = 3;
        const countdown = () => {
            if (count > 0) {
                countdownElement.textContent = count.toString();
                count--;
                setTimeout(countdown, 1000);
            } else {
                countdownElement.textContent = 'GO!';
                // カウントダウン完了後にゲーム開始
                this.game.start();
                this.isCountdown = false;
                this.inputHandler.setCountdownMode(false);
                setTimeout(() => {
                    countdownElement.remove();
                }, 500);
            }
        };
        countdown();
        document.body.appendChild(countdownElement);
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
     * 統計モーダルを表示
     */
    private showStatsModal(): void {
        const modal = document.getElementById('stats-modal');
        if (modal) {
            const stats = this.loadGameStats();
            const totalGamesEl = document.getElementById('total-games');
            const totalTimeEl = document.getElementById('total-time');
            const totalLinesEl = document.getElementById('total-lines');
            const avgScoreEl = document.getElementById('avg-score');
            const highestLevelEl = document.getElementById('highest-level');

            if (totalGamesEl) totalGamesEl.textContent = stats.totalGames.toString();
            if (totalTimeEl) totalTimeEl.textContent = Math.floor(stats.totalTime / 60).toString();
            if (totalLinesEl) totalLinesEl.textContent = stats.totalLines.toString();
            if (avgScoreEl) avgScoreEl.textContent = stats.totalGames > 0 ? Math.floor(stats.totalScore / stats.totalGames).toString() : '0';
            if (highestLevelEl) highestLevelEl.textContent = stats.highestLevel.toString();

            modal.classList.remove('hidden');
        }
    }

    /**
     * 統計モーダルを非表示
     */
    private hideStatsModal(): void {
        const modal = document.getElementById('stats-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * ランキングモーダルを表示
     */
    private showRankingModal(): void {
        const modal = document.getElementById('ranking-modal');
        if (modal) {
            const rankingList = document.getElementById('ranking-list');
            if (rankingList) {
                const rankings = this.loadRankings();
                rankingList.innerHTML = '';
                rankings.slice(0, 10).forEach((entry, index) => {
                    const li = document.createElement('li');
                    li.textContent = `${index + 1}. ${entry.name || 'Anonymous'}: ${entry.score.toString().padStart(6, '0')} (Level ${entry.level})`;
                    rankingList.appendChild(li);
                });
            }
            modal.classList.remove('hidden');
        }
    }

    /**
     * ランキングモーダルを非表示
     */
    private hideRankingModal(): void {
        const modal = document.getElementById('ranking-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * ゲーム統計の読み込み
     */
    private loadGameStats(): { totalGames: number; totalTime: number; totalLines: number; totalScore: number; highestLevel: number } {
        const saved = localStorage.getItem('tetris-stats');
        if (saved) {
            return JSON.parse(saved);
        }
        return { totalGames: 0, totalTime: 0, totalLines: 0, totalScore: 0, highestLevel: 0 };
    }

    /**
     * ゲーム統計の保存（タスク20: 整合性確保）
     */
    private saveGameStats(score: number, level: number, lines: number, playTime: number): void {
        try {
            const stats = this.loadGameStats();
            // データの整合性チェック
            if (isNaN(score) || isNaN(level) || isNaN(lines) || isNaN(playTime)) {
                console.error('Invalid stats data');
                return;
            }
            if (score < 0 || level < 1 || lines < 0 || playTime < 0) {
                console.error('Invalid stats values');
                return;
            }
            
            stats.totalGames++;
            stats.totalTime += playTime;
            stats.totalLines += lines;
            stats.totalScore += score;
            stats.highestLevel = Math.max(stats.highestLevel, level);
            localStorage.setItem('tetris-stats', JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save game stats:', e);
        }
    }

    /**
     * ランキングの読み込み
     */
    private loadRankings(): Array<{ name: string; score: number; level: number; date: string }> {
        const saved = localStorage.getItem('tetris-rankings');
        if (saved) {
            return JSON.parse(saved).sort((a: any, b: any) => b.score - a.score);
        }
        return [];
    }

    /**
     * ランキングの保存（タスク19: 重複チェック追加）
     */
    private saveToRanking(score: number, level: number): void {
        const rankings = this.loadRankings();
        const name = prompt('Enter your name for the ranking:') || 'Anonymous';
        
        // 重複チェック: 同じスコアの場合は最新のもののみを保持
        const existingIndex = rankings.findIndex(r => r.score === score && r.name === name);
        if (existingIndex !== -1) {
            rankings.splice(existingIndex, 1);
        }
        
        rankings.push({
            name,
            score,
            level,
            date: new Date().toISOString()
        });
        rankings.sort((a, b) => b.score - a.score);
        localStorage.setItem('tetris-rankings', JSON.stringify(rankings.slice(0, 10)));
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
     * ゲームオーバーモーダルを表示（タスク3: アニメーション追加）
     */
    private showGameOverModal(): void {
        const modal = document.getElementById('game-over-modal');
        const finalScoreElement = document.getElementById('final-score');
        const finalHighScoreElement = document.getElementById('final-high-score');
        
        if (modal) {
            // フェードアウトアニメーション
            modal.style.opacity = '0';
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.style.transition = 'opacity 0.5s ease-in';
                modal.style.opacity = '1';
            });
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
            // 初回実行時の初期化
            if (this.lastTime === 0) {
                this.lastTime = currentTime;
            }

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

            // 描画（常に実行）
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
                const finalLevel = this.game.getScoreSystem().getLevel();
                const finalLines = this.game.getScoreSystem().getLines();
                this.saveHighScore(finalScore);
                // 統計とランキングに保存（簡易版：プレイ時間は0として記録）
                this.saveGameStats(finalScore, finalLevel, finalLines, 0);
                if (finalScore > 0) {
                    this.saveToRanking(finalScore, finalLevel);
                }
                this.showGameOverModal();
                
                // タスク15: オートリプレイ機能（設定で有効な場合）
                const settings = (window as any).tetrisSettings || { autoReplay: false };
                if (settings.autoReplay) {
                    setTimeout(() => {
                        this.hideGameOverModal();
                        this.startGameWithCountdown();
                    }, 3000);
                }
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
     * タスク9: パフォーマンス統計の更新
     */
    private updatePerformanceStats(deltaTime: number): void {
        const currentFPS = 1000 / deltaTime;
        this.minFPS = Math.min(this.minFPS, currentFPS);
        this.maxFPS = Math.max(this.maxFPS, currentFPS);
        
        // フレームドロップ検出（60FPS未満）
        if (currentFPS < 60 && Date.now() - this.lastFrameDropTime > 1000) {
            this.frameDrops++;
            this.lastFrameDropTime = Date.now();
        }
        
        // グローバルに保存（デバッグ用）
        (window as any).tetrisPerformanceStats = {
            minFPS: this.minFPS,
            maxFPS: this.maxFPS,
            frameDrops: this.frameDrops,
            currentFPS: this.fps
        };
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
        // メモリクリーンアップ：参照を削除
        this.game = null as any;
        this.inputHandler = null as any;
        this.renderer = null as any;
    }
}

// アプリケーションを開始
// DOMContentLoadedを待ってから開始
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new TetrisApp();
        app.start();
    });
} else {
    const app = new TetrisApp();
    app.start();
}

