import { Game } from './game';
import { Piece, PieceType, Position, BOARD_WIDTH, BOARD_HEIGHT, PIECE_COLORS } from './types';
import { getPieceShape } from './pieces';

/**
 * 描画システム
 */
export class Renderer {
    private gameCanvas: HTMLCanvasElement;
    private gameCtx: CanvasRenderingContext2D;
    private nextCanvas: HTMLCanvasElement;
    private nextCtx: CanvasRenderingContext2D;
    private holdCanvas: HTMLCanvasElement;
    private holdCtx: CanvasRenderingContext2D;

    private readonly CELL_SIZE = 40; // 30から40に拡大（約33%大きくなる）
    private readonly GRID_COLOR = '#8b949e'; // より明るいグリッド線（見やすく）
    private readonly BG_COLOR = '#2d3136'; // より明るい背景色（GitHub風、見やすく）
    private readonly GHOST_ALPHA = 0.3;
    private lineClearFlash: number = 0;
    private lastKeyPress: { key: string; time: number } | null = null;
    private pieceLockFlash: { x: number; y: number; time: number }[] = []; // タスク1: ピース固定アニメーション
    private levelUpNotification: { level: number; time: number } | null = null; // タスク2: レベルアップ通知
    private tetrisFlash: number = 0; // タスク13: テトリスの特別エフェクト
    private comboCount: number = 0; // タスク14: コンボ表示
    private comboTime: number = 0; // タスク14: コンボ表示
    private isLineClearing: boolean = false; // タスク68: ライン消去中の操作無効化
    private rotationFlash: { x: number; y: number; time: number }[] = []; // タスク1: ピース回転時の視覚的フィードバック
    private hardDropTrail: { x: number; y: number; time: number }[] = []; // タスク2: ハードドロップ時のエフェクト
    private showGrid: boolean = true; // タスク39: グリッド線の表示/非表示
    private boardBorderPulse: number = 0; // タスク4: ボードの境界線のアニメーション
    private scoreAnimation: { oldValue: number; newValue: number; time: number } | null = null; // タスク12: スコア表示のアニメーション
    private levelAnimation: { oldValue: number; newValue: number; time: number } | null = null; // タスク19: レベル表示のアニメーション
    private linesAnimation: { oldValue: number; newValue: number; time: number } | null = null; // タスク20: ライン数表示のアニメーション
    private lineClearParticles: { x: number; y: number; vx: number; vy: number; time: number }[] = []; // タスク2: ライン消去時のパーティクルエフェクト
    private gameOverAnimation: number = 0; // タスク6, 20: ゲームオーバー時のアニメーション
    private rotationHints: { x: number; y: number }[] = []; // タスク5: ピースの回転可能位置の表示

    constructor(game: Game) {
        // ゲームボードCanvas
        this.gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!this.gameCanvas) {
            throw new Error('Game canvas not found');
        }
        this.gameCtx = this.gameCanvas.getContext('2d')!;
        this.gameCanvas.width = BOARD_WIDTH * this.CELL_SIZE;
        this.gameCanvas.height = BOARD_HEIGHT * this.CELL_SIZE;
        
        // タスク74: Canvasのリサイズ時の描画問題 - リサイズを検出
        const resizeObserver = new ResizeObserver(() => {
            // Canvasのサイズが変更された場合、再描画
            this.gameCanvas.width = BOARD_WIDTH * this.CELL_SIZE;
            this.gameCanvas.height = BOARD_HEIGHT * this.CELL_SIZE;
        });
        resizeObserver.observe(this.gameCanvas);

        // ネクストピースCanvas
        this.nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
        if (!this.nextCanvas) {
            throw new Error('Next canvas not found');
        }
        this.nextCtx = this.nextCanvas.getContext('2d')!;

        // ホールドピースCanvas
        this.holdCanvas = document.getElementById('hold-canvas') as HTMLCanvasElement;
        if (!this.holdCanvas) {
            throw new Error('Hold canvas not found');
        }
        this.holdCtx = this.holdCanvas.getContext('2d')!;

        // ライン消去エフェクトのイベントリスナー
        window.addEventListener('lineClear', ((e: CustomEvent) => {
            this.lineClearFlash = 0.8;
        }) as EventListener);

        // タスク1: ピース固定時のアニメーション
        window.addEventListener('pieceLocked', ((e: CustomEvent) => {
            const piece = e.detail.piece;
            piece.shape.forEach((block: { x: number; y: number }) => {
                this.pieceLockFlash.push({
                    x: piece.position.x + block.x,
                    y: piece.position.y + block.y,
                    time: Date.now()
                });
            });
        }) as EventListener);

        // タスク2: レベルアップ時の通知
        window.addEventListener('levelUp', ((e: CustomEvent) => {
            this.levelUpNotification = {
                level: e.detail.newLevel,
                time: Date.now()
            };
        }) as EventListener);

        // タスク13: テトリスの特別エフェクト
        window.addEventListener('tetris', (() => {
            this.tetrisFlash = 1.0;
        }) as EventListener);

        // タスク14: コンボ表示
        window.addEventListener('combo', ((e: CustomEvent) => {
            this.comboCount = e.detail.count;
            this.comboTime = Date.now();
        }) as EventListener);

        // タスク13: テトリスの特別エフェクト
        window.addEventListener('tetris', (() => {
            this.tetrisFlash = 1.0;
        }) as EventListener);

        // タスク14: コンボ表示
        window.addEventListener('combo', ((e: CustomEvent) => {
            this.comboCount = e.detail.count;
            this.comboTime = Date.now();
        }) as EventListener);

        // タスク1: ピース回転時の視覚的フィードバック
        window.addEventListener('pieceRotated', ((e: CustomEvent) => {
            const piece = e.detail.piece;
            piece.shape.forEach((block: { x: number; y: number }) => {
                this.rotationFlash.push({
                    x: piece.position.x + block.x,
                    y: piece.position.y + block.y,
                    time: Date.now()
                });
            });
        }) as EventListener);

        // タスク2: ハードドロップ時のエフェクト
        window.addEventListener('hardDrop', ((e: CustomEvent) => {
            const piece = e.detail.piece;
            const distance = e.detail.distance;
            // 落下軌跡を記録
            for (let i = 0; i < distance; i++) {
                piece.shape.forEach((block: { x: number; y: number }) => {
                    this.hardDropTrail.push({
                        x: piece.position.x + block.x,
                        y: piece.position.y + block.y - i,
                        time: Date.now() - (distance - i) * 10
                    });
                });
            }
        }) as EventListener);
    }

    /**
     * 全体を描画
     */
    render(game: Game): void {
        this.clearAll();
        this.drawBoard(game);
        this.drawGhostPiece(game);
        this.drawCurrentPiece(game);
        this.drawNextPiece(game);
        this.drawHoldPiece(game);
        this.updateUI(game);
        this.drawSpeedIndicator(game);
        this.drawKeyPressFeedback();
        this.drawLineClearEffect();
        this.drawPieceLockAnimation(); // タスク1
        this.drawLevelUpNotification(); // タスク2
        this.drawDropIntervalDisplay(game); // タスク4
        this.drawTetrisEffect(); // タスク13
        this.drawComboDisplay(); // タスク14
        this.drawPausedOverlay(game); // タスク3
        this.drawRotationFlash(); // タスク1
        this.drawHardDropTrail(); // タスク2
        this.drawScoreMultiplier(game); // タスク5
        this.updateBoardBorderAnimation(); // タスク4
        this.drawLineClearParticles(); // タスク2
        this.drawGameOverAnimation(game); // タスク6, 20
        this.drawRotationHints(game); // タスク5
    }

    /**
     * すべてのCanvasをクリア
     */
    private clearAll(): void {
        this.gameCtx.fillStyle = this.BG_COLOR;
        this.gameCtx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        this.nextCtx.fillStyle = this.BG_COLOR;
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        this.holdCtx.fillStyle = this.BG_COLOR;
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    }

    /**
     * ゲームボードを描画
     */
    private drawBoard(game: Game): void {
        const board = game.getBoard().getGrid();

        // グリッド線を描画（タスク39: 表示/非表示対応）
        if (this.showGrid) {
            this.gameCtx.strokeStyle = this.GRID_COLOR;
            this.gameCtx.lineWidth = 1;

            for (let x = 0; x <= BOARD_WIDTH; x++) {
                this.gameCtx.beginPath();
                this.gameCtx.moveTo(x * this.CELL_SIZE, 0);
                this.gameCtx.lineTo(x * this.CELL_SIZE, BOARD_HEIGHT * this.CELL_SIZE);
                this.gameCtx.stroke();
            }

            for (let y = 0; y <= BOARD_HEIGHT; y++) {
                this.gameCtx.beginPath();
                this.gameCtx.moveTo(0, y * this.CELL_SIZE);
                this.gameCtx.lineTo(BOARD_WIDTH * this.CELL_SIZE, y * this.CELL_SIZE);
                this.gameCtx.stroke();
            }
        }

        // ボードの境界線を強調（タスク4: アニメーション追加）
        const pulse = Math.sin(this.boardBorderPulse) * 0.3 + 0.7;
        this.gameCtx.strokeStyle = `rgba(139, 148, 158, ${pulse})`;
        this.gameCtx.lineWidth = 3;
        this.gameCtx.strokeRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        // 固定されたブロックを描画
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cell = board[y][x];
                if (cell !== null) {
                    this.drawBlock(this.gameCtx, x, y, cell);
                }
            }
        }
    }

    /**
     * 現在のピースを描画
     */
    private drawCurrentPiece(game: Game): void {
        const piece = game.getCurrentPiece();
        if (!piece) {
            // ピースがない場合は何も描画しない
            return;
        }

        // ピースが確実に表示されるように描画
        this.drawPiece(this.gameCtx, piece, this.CELL_SIZE);
    }

    /**
     * ゴーストピースを描画（タスク1, 18, 61, 80: 改善・最適化）
     */
    private drawGhostPiece(game: Game): void {
        const piece = game.getCurrentPiece();
        if (!piece) {
            return;
        }

        // タスク80: ゴーストピース計算のパフォーマンス問題 - 必要な時のみ計算
        const ghostPos = game.getGhostPosition();
        if (!ghostPos) {
            return;
        }
        
        // タスク61: ゴーストピースの描画ずれを修正 - 正確な位置に描画

        const ghostPiece: Piece = {
            ...piece,
            position: ghostPos
        };

        this.gameCtx.save();
        // タスク18: より目立つ色とアニメーション
        const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.5;
        this.gameCtx.globalAlpha = pulse;
        this.gameCtx.strokeStyle = '#00f0ff';
        this.gameCtx.lineWidth = 3;
        this.gameCtx.setLineDash([6, 4]); // タスク1: 点線で描画
        piece.shape.forEach((block: { x: number; y: number }) => {
            const x = (ghostPiece.position.x + block.x) * this.CELL_SIZE;
            const y = (ghostPiece.position.y + block.y) * this.CELL_SIZE;
            this.gameCtx.strokeRect(x + 2, y + 2, this.CELL_SIZE - 4, this.CELL_SIZE - 4);
        });
        this.gameCtx.setLineDash([]);
        this.gameCtx.restore();
    }

    /**
     * ネクストピースを描画
     */
    private drawNextPiece(game: Game): void {
        const pieceType = game.getNextPieceType();
        const shape = getPieceShape(pieceType, 0);
        
        this.drawPreviewPiece(this.nextCtx, shape, pieceType, this.nextCanvas.width, this.nextCanvas.height);
    }

    /**
     * ホールドピースを描画（タスク5: 視覚的強調）
     */
    private drawHoldPiece(game: Game): void {
        const pieceType = game.getHoldPieceType();
        const canHold = game.canHoldPiece();
        
        // 背景をクリア
        this.holdCtx.fillStyle = this.BG_COLOR;
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        if (!pieceType) {
            // ホールド可能な場合、アニメーション枠を表示
            if (canHold) {
                const time = Date.now();
                const pulse = Math.sin(time / 500) * 0.3 + 0.7;
                this.holdCtx.strokeStyle = `rgba(9, 105, 218, ${pulse})`;
                this.holdCtx.lineWidth = 2;
                this.holdCtx.setLineDash([4, 4]);
                this.holdCtx.strokeRect(5, 5, this.holdCanvas.width - 10, this.holdCanvas.height - 10);
                this.holdCtx.setLineDash([]);
            }
            return;
        }

        const shape = getPieceShape(pieceType, 0);
        
        // ホールド可能/不可能の状態を色で区別
        if (canHold) {
            // ホールド可能: アニメーション枠
            const time = Date.now();
            const pulse = Math.sin(time / 500) * 0.3 + 0.7;
            this.holdCtx.strokeStyle = `rgba(9, 105, 218, ${pulse})`;
            this.holdCtx.lineWidth = 3;
            this.holdCtx.strokeRect(2, 2, this.holdCanvas.width - 4, this.holdCanvas.height - 4);
        } else {
            // ホールド不可能: グレーの枠
            this.holdCtx.strokeStyle = '#656d76';
            this.holdCtx.lineWidth = 2;
            this.holdCtx.strokeRect(2, 2, this.holdCanvas.width - 4, this.holdCanvas.height - 4);
        }

        this.drawPreviewPiece(this.holdCtx, shape, pieceType, this.holdCanvas.width, this.holdCanvas.height);
    }

    /**
     * プレビュー用ピース描画（4x4グリッド中央に配置）
     */
    private drawPreviewPiece(
        ctx: CanvasRenderingContext2D,
        shape: Position[],
        pieceType: PieceType,
        canvasWidth: number,
        canvasHeight: number
    ): void {
        const cellSize = Math.min(canvasWidth, canvasHeight) / 4;
        const offsetX = (canvasWidth - cellSize * 4) / 2;
        const offsetY = (canvasHeight - cellSize * 4) / 2;

        // ピースの中心を計算
        let minX = Math.min(...shape.map(p => p.x));
        let maxX = Math.max(...shape.map(p => p.x));
        let minY = Math.min(...shape.map(p => p.y));
        let maxY = Math.max(...shape.map(p => p.y));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // 4x4グリッドの中心に配置
        const gridCenterX = 1.5;
        const gridCenterY = 1.5;

        shape.forEach(block => {
            const x = (block.x - centerX + gridCenterX) * cellSize + offsetX;
            const y = (block.y - centerY + gridCenterY) * cellSize + offsetY;
            
            this.drawBlockAt(ctx, x, y, cellSize, pieceType);
        });
    }

    /**
     * ピースを描画
     */
    private drawPiece(
        ctx: CanvasRenderingContext2D,
        piece: Piece,
        cellSize: number,
        isGhost: boolean = false
    ): void {
        if (!piece || !piece.shape || piece.shape.length === 0) {
            return;
        }

        piece.shape.forEach(block => {
            const x = (piece.position.x + block.x) * cellSize;
            const y = (piece.position.y + block.y) * cellSize;
            // 画面内かチェック
            if (x >= 0 && x < this.gameCanvas.width && y >= 0 && y < this.gameCanvas.height) {
                this.drawBlockAt(ctx, x, y, cellSize, piece.type, isGhost);
            }
        });
    }

    /**
     * ブロックを描画（座標指定）
     */
    private drawBlockAt(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        cellSize: number,
        pieceType: PieceType,
        isGhost: boolean = false
    ): void {
        const color = PIECE_COLORS[pieceType];
        
        if (isGhost) {
            // ゴーストピースはアウトラインのみ（より見やすく）
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            ctx.setLineDash([]);
        } else {
            // 通常のブロック（より見やすく、明るく）
            // 背景を明るく塗りつぶし
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            
            // ハイライト（より明るく）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(x + 2, y + 2, cellSize - 4, (cellSize - 4) / 3);
            
            // シャドウ（タスク3: より強調）
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x + 2, y + cellSize - (cellSize - 4) / 3 - 2, cellSize - 4, (cellSize - 4) / 3);
            
            // タスク3, 9: グラデーション効果を追加（強化）
            const gradient = ctx.createLinearGradient(x + 2, y + 2, x + cellSize - 2, y + cellSize - 2);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            
            // アウトライン（より太く、明るく、確実に見えるように）
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            
            // 内側のアウトライン（コントラストを強化）
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
        }
    }

    /**
     * ブロックを描画（グリッド座標指定）
     */
    private drawBlock(
        ctx: CanvasRenderingContext2D,
        gridX: number,
        gridY: number,
        pieceType: PieceType
    ): void {
        const x = gridX * this.CELL_SIZE;
        const y = gridY * this.CELL_SIZE;
        this.drawBlockAt(ctx, x, y, this.CELL_SIZE, pieceType);
    }

    /**
     * UI更新（スコア、レベル、ライン数）（タスク12, 19, 20: アニメーション追加）
     */
    private updateUI(game: Game): void {
        const scoreSystem = game.getScoreSystem();
        const currentScore = scoreSystem.getScore();
        const currentLevel = scoreSystem.getLevel();
        const currentLines = scoreSystem.getLines();
        
        // タスク12: スコア表示のアニメーション
        if (!this.scoreAnimation || this.scoreAnimation.newValue !== currentScore) {
            if (this.scoreAnimation) {
                this.scoreAnimation.newValue = currentScore;
            } else {
                this.scoreAnimation = {
                    oldValue: currentScore,
                    newValue: currentScore,
                    time: Date.now()
                };
            }
        }

        // タスク19: レベル表示のアニメーション
        if (!this.levelAnimation || this.levelAnimation.newValue !== currentLevel) {
            if (this.levelAnimation) {
                this.levelAnimation.newValue = currentLevel;
            } else {
                this.levelAnimation = {
                    oldValue: currentLevel,
                    newValue: currentLevel,
                    time: Date.now()
                };
            }
        }

        // タスク20: ライン数表示のアニメーション
        if (!this.linesAnimation || this.linesAnimation.newValue !== currentLines) {
            if (this.linesAnimation) {
                this.linesAnimation.newValue = currentLines;
            } else {
                this.linesAnimation = {
                    oldValue: currentLines,
                    newValue: currentLines,
                    time: Date.now()
                };
            }
        }

        // requestAnimationFrameを使用して確実に更新
        requestAnimationFrame(() => {
            const scoreElement = document.getElementById('score');
            if (scoreElement && this.scoreAnimation) {
                const elapsed = Date.now() - this.scoreAnimation.time;
                const duration = 500;
                if (elapsed < duration) {
                    const progress = elapsed / duration;
                    const value = Math.floor(this.scoreAnimation.oldValue + (this.scoreAnimation.newValue - this.scoreAnimation.oldValue) * progress);
                    scoreElement.textContent = String(value).padStart(8, '0');
                } else {
                    scoreElement.textContent = scoreSystem.formatScore();
                    this.scoreAnimation = null;
                }
            } else if (scoreElement) {
                scoreElement.textContent = scoreSystem.formatScore();
            }

            const levelElement = document.getElementById('level');
            if (levelElement && this.levelAnimation) {
                const elapsed = Date.now() - this.levelAnimation.time;
                const duration = 500;
                if (elapsed < duration) {
                    const progress = elapsed / duration;
                    const value = Math.floor(this.levelAnimation.oldValue + (this.levelAnimation.newValue - this.levelAnimation.oldValue) * progress);
                    levelElement.textContent = String(value).padStart(2, '0');
                } else {
                    levelElement.textContent = scoreSystem.formatLevel();
                    this.levelAnimation = null;
                }
            } else if (levelElement) {
                levelElement.textContent = scoreSystem.formatLevel();
            }

            const linesElement = document.getElementById('lines');
            if (linesElement && this.linesAnimation) {
                const elapsed = Date.now() - this.linesAnimation.time;
                const duration = 500;
                if (elapsed < duration) {
                    const progress = elapsed / duration;
                    const value = Math.floor(this.linesAnimation.oldValue + (this.linesAnimation.newValue - this.linesAnimation.oldValue) * progress);
                    linesElement.textContent = String(value).padStart(3, '0');
                } else {
                    linesElement.textContent = scoreSystem.formatLines();
                    this.linesAnimation = null;
                }
            } else if (linesElement) {
                linesElement.textContent = scoreSystem.formatLines();
            }
        });
    }

    /**
     * ゲーム速度インジケーターを描画（タスク6: 改善）
     */
    private drawSpeedIndicator(game: Game): void {
        const difficulty = (window as any).tetrisSettings?.difficulty || 'normal';
        const dropInterval = game.getScoreSystem().getDropInterval(difficulty);
        const level = game.getScoreSystem().getLevel();
        
        // タスク6: より大きなインジケーター
        const width = Math.min(100, (1000 - dropInterval) / 10);
        const height = 8;
        this.gameCtx.fillStyle = level >= 10 ? '#ef4444' : level >= 5 ? '#f97316' : '#22c55e';
        this.gameCtx.fillRect(5, 5, width, height);
        
        // 境界線
        this.gameCtx.strokeStyle = '#8b949e';
        this.gameCtx.lineWidth = 1;
        this.gameCtx.strokeRect(5, 5, 100, height);
    }

    /**
     * キー入力フィードバックを描画
     */
    private drawKeyPressFeedback(): void {
        if (this.lastKeyPress && Date.now() - this.lastKeyPress.time < 200) {
            this.gameCtx.fillStyle = 'rgba(9, 105, 218, 0.5)';
            this.gameCtx.font = '16px monospace';
            this.gameCtx.fillText(this.lastKeyPress.key, 10, 25);
        }
    }

    /**
     * ライン消去エフェクトを描画
     */
    private drawLineClearEffect(): void {
        if (this.lineClearFlash > 0) {
            this.gameCtx.fillStyle = `rgba(255, 255, 255, ${this.lineClearFlash})`;
            this.gameCtx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            this.lineClearFlash = Math.max(0, this.lineClearFlash - 0.1);
        }
    }

    /**
     * タスク1: ピース固定時のアニメーションを描画
     */
    private drawPieceLockAnimation(): void {
        const now = Date.now();
        this.pieceLockFlash = this.pieceLockFlash.filter(flash => {
            const elapsed = now - flash.time;
            if (elapsed > 500) return false; // 500msで消える

            const alpha = 1 - (elapsed / 500);
            const x = flash.x * this.CELL_SIZE;
            const y = flash.y * this.CELL_SIZE;

            // 点滅エフェクト
            this.gameCtx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            this.gameCtx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);

            return true;
        });
    }

    /**
     * タスク2, 19: レベルアップ通知を描画（強化）
     */
    private drawLevelUpNotification(): void {
        if (!this.levelUpNotification) return;

        const elapsed = Date.now() - this.levelUpNotification.time;
        if (elapsed > 3000) {
            this.levelUpNotification = null;
            return;
        }

        const alpha = elapsed < 500 ? elapsed / 500 : (elapsed > 2500 ? (3000 - elapsed) / 500 : 1);
        const scale = elapsed < 500 ? 1 + (elapsed / 500) * 0.2 : 1.2;
        const fontSize = 80 * scale;
        const text = `LEVEL ${this.levelUpNotification.level}!`;

        this.gameCtx.save();
        this.gameCtx.globalAlpha = alpha;
        // タスク19: より目立つエフェクト
        const pulse = Math.sin(Date.now() / 100) * 0.2 + 0.8;
        this.gameCtx.fillStyle = `rgba(9, 105, 218, ${pulse})`;
        this.gameCtx.font = `bold ${fontSize}px sans-serif`;
        this.gameCtx.textAlign = 'center';
        this.gameCtx.textBaseline = 'middle';
        // 影を追加
        this.gameCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.gameCtx.shadowBlur = 10;
        this.gameCtx.fillText(text, this.gameCanvas.width / 2, this.gameCanvas.height / 2);
        this.gameCtx.restore();
    }

    /**
     * タスク4: 落下速度の視覚的表示
     */
    private drawDropIntervalDisplay(game: Game): void {
        // 難易度を取得（簡易実装）
        const difficulty = (window as any).tetrisSettings?.difficulty || 'normal';
        const dropInterval = game.getScoreSystem().getDropInterval(difficulty);
        const x = 10;
        const y = this.gameCanvas.height - 30;

        this.gameCtx.fillStyle = '#8b949e';
        this.gameCtx.font = '14px monospace';
        this.gameCtx.textAlign = 'left';
        this.gameCtx.fillText(`Drop: ${dropInterval}ms`, x, y);
    }

    /**
     * タスク13, 14: テトリスの特別エフェクト（強化）
     */
    private drawTetrisEffect(): void {
        if (this.tetrisFlash > 0) {
            // タスク14: パーティクルエフェクト風の強化
            const pulse = Math.sin(Date.now() / 50) * 0.3 + 0.7;
            this.gameCtx.fillStyle = `rgba(0, 240, 255, ${this.tetrisFlash * pulse})`;
            this.gameCtx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            this.tetrisFlash = Math.max(0, this.tetrisFlash - 0.03);
        }
    }

    /**
     * タスク13, 14: コンボ表示（強化）
     */
    private drawComboDisplay(): void {
        if (this.comboCount > 0 && Date.now() - this.comboTime < 2000) {
            const elapsed = Date.now() - this.comboTime;
            const alpha = elapsed < 500 ? 1 : (elapsed > 1500 ? (2000 - elapsed) / 500 : 1);
            const scale = elapsed < 500 ? 1 + (elapsed / 500) * 0.3 : 1.3;
            
            this.gameCtx.save();
            this.gameCtx.globalAlpha = alpha;
            this.gameCtx.fillStyle = '#ffeb3b';
            this.gameCtx.font = `bold ${48 * scale}px sans-serif`;
            this.gameCtx.textAlign = 'center';
            this.gameCtx.textBaseline = 'middle';
            // タスク13: 連続コンボ時の特別なエフェクト
            if (this.comboCount >= 4) {
                this.gameCtx.strokeStyle = '#ff0000';
                this.gameCtx.lineWidth = 3;
                this.gameCtx.strokeText(`TETRIS! ${this.comboCount} LINES!`, this.gameCanvas.width / 2, this.gameCanvas.height / 2 - 50);
            }
            this.gameCtx.fillText(`${this.comboCount} LINES!`, this.gameCanvas.width / 2, this.gameCanvas.height / 2 - 50);
            this.gameCtx.restore();
        } else if (this.comboCount > 0) {
            this.comboCount = 0;
        }
    }

    /**
     * タスク3: 一時停止中のUI改善
     */
    private drawPausedOverlay(game: Game): void {
        if (game.getState() === 'PAUSED') {
            this.gameCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.gameCtx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            
            this.gameCtx.fillStyle = '#ffffff';
            this.gameCtx.font = 'bold 60px sans-serif';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.textBaseline = 'middle';
            this.gameCtx.fillText('PAUSED', this.gameCanvas.width / 2, this.gameCanvas.height / 2);
        }
    }

    /**
     * タスク68: ライン消去中の操作無効化フラグを設定
     */
    setLineClearing(clearing: boolean): void {
        this.isLineClearing = clearing;
    }

    /**
     * タスク68: ライン消去中かどうかを取得
     */
    isLineClearingActive(): boolean {
        return this.isLineClearing;
    }

    /**
     * タスク1: ピース回転時の視覚的フィードバックを描画
     */
    private drawRotationFlash(): void {
        const now = Date.now();
        this.rotationFlash = this.rotationFlash.filter(flash => {
            const elapsed = now - flash.time;
            if (elapsed > 300) return false;

            const alpha = 1 - (elapsed / 300);
            const x = flash.x * this.CELL_SIZE;
            const y = flash.y * this.CELL_SIZE;

            // 光るエフェクト
            this.gameCtx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            this.gameCtx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);

            return true;
        });
    }

    /**
     * タスク2: ハードドロップ時の軌跡を描画
     */
    private drawHardDropTrail(): void {
        const now = Date.now();
        this.hardDropTrail = this.hardDropTrail.filter(trail => {
            const elapsed = now - trail.time;
            if (elapsed > 500) return false;

            const alpha = 1 - (elapsed / 500);
            const x = trail.x * this.CELL_SIZE;
            const y = trail.y * this.CELL_SIZE;

            // 軌跡エフェクト
            this.gameCtx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
            this.gameCtx.fillRect(x + 5, y + 5, this.CELL_SIZE - 10, this.CELL_SIZE - 10);

            return true;
        });
    }

    /**
     * タスク4: ボードの境界線のアニメーションを更新
     */
    private updateBoardBorderAnimation(): void {
        this.boardBorderPulse += 0.05;
        if (this.boardBorderPulse > Math.PI * 2) {
            this.boardBorderPulse = 0;
        }
    }

    /**
     * タスク5, 11: スコア倍率表示（改善）
     */
    private drawScoreMultiplier(game: Game): void {
        const level = game.getScoreSystem().getLevel();
        const multiplier = level;
        const x = this.gameCanvas.width - 120;
        const y = 30;

        // タスク11: より目立つように表示
        const pulse = Math.sin(Date.now() / 500) * 0.2 + 0.8;
        this.gameCtx.fillStyle = `rgba(139, 148, 158, ${pulse})`;
        this.gameCtx.font = 'bold 16px monospace';
        this.gameCtx.textAlign = 'left';
        this.gameCtx.fillText(`Score x${multiplier}`, x, y);
        
        // レベルアップ時に強調
        if (this.levelUpNotification) {
            this.gameCtx.fillStyle = '#0969da';
            this.gameCtx.font = 'bold 20px monospace';
            this.gameCtx.fillText(`Score x${multiplier}`, x, y);
        }
    }

    /**
     * タスク39: グリッド線の表示/非表示を切り替え
     */
    toggleGrid(): void {
        this.showGrid = !this.showGrid;
    }

    /**
     * タスク2: ライン消去時のパーティクルエフェクトを描画
     */
    private drawLineClearParticles(): void {
        const now = Date.now();
        this.lineClearParticles = this.lineClearParticles.filter(particle => {
            const elapsed = now - particle.time;
            if (elapsed > 1000) return false;

            const alpha = 1 - (elapsed / 1000);
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3; // 重力

            this.gameCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.gameCtx.fillRect(particle.x - 2, particle.y - 2, 4, 4);

            return true;
        });
    }

    /**
     * タスク6, 20: ゲームオーバー時のアニメーションを描画
     */
    private drawGameOverAnimation(game: Game): void {
        if (game.getState() === 'GAME_OVER' && this.gameOverAnimation > 0) {
            // 暗転エフェクト
            this.gameCtx.fillStyle = `rgba(0, 0, 0, ${this.gameOverAnimation * 0.8})`;
            this.gameCtx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            
            // タスク20: 固定されたブロックが崩れるようなアニメーション
            const board = game.getBoard().getGrid();
            const shake = Math.sin(Date.now() / 50) * (this.gameOverAnimation * 5);
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    const cell = board[y][x];
                    if (cell !== null) {
                        const offsetX = (Math.random() - 0.5) * shake;
                        const offsetY = (Math.random() - 0.5) * shake;
                        this.drawBlock(this.gameCtx, x + offsetX / this.CELL_SIZE, y + offsetY / this.CELL_SIZE, cell);
                    }
                }
            }
            
            this.gameOverAnimation = Math.max(0, this.gameOverAnimation - 0.01);
        }
    }

    /**
     * タスク5: ピースの回転可能位置を描画
     */
    private drawRotationHints(game: Game): void {
        if (this.rotationHints.length > 0) {
            this.gameCtx.save();
            this.gameCtx.strokeStyle = 'rgba(9, 105, 218, 0.5)';
            this.gameCtx.lineWidth = 2;
            this.gameCtx.setLineDash([4, 4]);
            this.rotationHints.forEach(hint => {
                const x = hint.x * this.CELL_SIZE;
                const y = hint.y * this.CELL_SIZE;
                this.gameCtx.strokeRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
            });
            this.gameCtx.setLineDash([]);
            this.gameCtx.restore();
        }
    }

    /**
     * キー入力フィードバックを設定
     */
    setKeyPressFeedback(key: string): void {
        this.lastKeyPress = { key, time: Date.now() };
    }
}

