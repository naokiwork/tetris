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

    constructor(game: Game) {
        // ゲームボードCanvas
        this.gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!this.gameCanvas) {
            throw new Error('Game canvas not found');
        }
        this.gameCtx = this.gameCanvas.getContext('2d')!;
        this.gameCanvas.width = BOARD_WIDTH * this.CELL_SIZE;
        this.gameCanvas.height = BOARD_HEIGHT * this.CELL_SIZE;

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

        // グリッド線を描画（より見やすく）
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

        // ボードの境界線を強調（より明るく、太く）
        this.gameCtx.strokeStyle = '#8b949e';
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
     * ゴーストピースを描画（タスク1, 18: 改善）
     */
    private drawGhostPiece(game: Game): void {
        const piece = game.getCurrentPiece();
        if (!piece) {
            return;
        }

        const ghostPos = game.getGhostPosition();
        if (!ghostPos) {
            return;
        }

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
            
            // シャドウ（控えめに）
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 2, y + cellSize - (cellSize - 4) / 3 - 2, cellSize - 4, (cellSize - 4) / 3);
            
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
     * UI更新（スコア、レベル、ライン数）
     */
    private updateUI(game: Game): void {
        const scoreSystem = game.getScoreSystem();
        
        // requestAnimationFrameを使用して確実に更新
        requestAnimationFrame(() => {
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                scoreElement.textContent = scoreSystem.formatScore();
            }

            const levelElement = document.getElementById('level');
            if (levelElement) {
                levelElement.textContent = scoreSystem.formatLevel();
            }

            const linesElement = document.getElementById('lines');
            if (linesElement) {
                linesElement.textContent = scoreSystem.formatLines();
            }
        });
    }

    /**
     * ゲーム速度インジケーターを描画
     */
    private drawSpeedIndicator(game: Game): void {
        const dropInterval = game.getScoreSystem().getDropInterval();
        const level = game.getScoreSystem().getLevel();
        
        // 速度インジケーターをCanvas上に描画
        this.gameCtx.fillStyle = level >= 10 ? '#ef4444' : level >= 5 ? '#f97316' : '#22c55e';
        this.gameCtx.fillRect(5, 5, Math.min(50, (1000 - dropInterval) / 20), 5);
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
     * タスク2: レベルアップ通知を描画
     */
    private drawLevelUpNotification(): void {
        if (!this.levelUpNotification) return;

        const elapsed = Date.now() - this.levelUpNotification.time;
        if (elapsed > 3000) {
            this.levelUpNotification = null;
            return;
        }

        const alpha = elapsed < 500 ? elapsed / 500 : (elapsed > 2500 ? (3000 - elapsed) / 500 : 1);
        const fontSize = 80;
        const text = `LEVEL ${this.levelUpNotification.level}!`;

        this.gameCtx.save();
        this.gameCtx.globalAlpha = alpha;
        this.gameCtx.fillStyle = '#0969da';
        this.gameCtx.font = `bold ${fontSize}px sans-serif`;
        this.gameCtx.textAlign = 'center';
        this.gameCtx.textBaseline = 'middle';
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
     * タスク13: テトリスの特別エフェクト
     */
    private drawTetrisEffect(): void {
        if (this.tetrisFlash > 0) {
            this.gameCtx.fillStyle = `rgba(0, 240, 255, ${this.tetrisFlash})`;
            this.gameCtx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
            this.tetrisFlash = Math.max(0, this.tetrisFlash - 0.05);
        }
    }

    /**
     * タスク14: コンボ表示
     */
    private drawComboDisplay(): void {
        if (this.comboCount > 0 && Date.now() - this.comboTime < 2000) {
            const elapsed = Date.now() - this.comboTime;
            const alpha = elapsed < 500 ? 1 : (elapsed > 1500 ? (2000 - elapsed) / 500 : 1);
            
            this.gameCtx.save();
            this.gameCtx.globalAlpha = alpha;
            this.gameCtx.fillStyle = '#ffeb3b';
            this.gameCtx.font = 'bold 48px sans-serif';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.textBaseline = 'middle';
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
     * キー入力フィードバックを設定
     */
    setKeyPressFeedback(key: string): void {
        this.lastKeyPress = { key, time: Date.now() };
    }
}

