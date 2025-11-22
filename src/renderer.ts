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
    private readonly GRID_COLOR = '#3d4147'; // より明るいグリッド線
    private readonly BG_COLOR = '#1a1d23'; // 少し明るい背景色
    private readonly GHOST_ALPHA = 0.3;
    private lineClearFlash: number = 0;
    private lastKeyPress: { key: string; time: number } | null = null;

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

        // ボードの境界線を強調
        this.gameCtx.strokeStyle = '#656d76';
        this.gameCtx.lineWidth = 2;
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
     * ゴーストピースを描画
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
        this.gameCtx.globalAlpha = this.GHOST_ALPHA;
        this.drawPiece(this.gameCtx, ghostPiece, this.CELL_SIZE, true);
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
     * ホールドピースを描画
     */
    private drawHoldPiece(game: Game): void {
        const pieceType = game.getHoldPieceType();
        if (!pieceType) {
            return;
        }

        const shape = getPieceShape(pieceType, 0);
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
            // 通常のブロック（より見やすく）
            ctx.fillStyle = color;
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            
            // ハイライト（より明るく）
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(x + 1, y + 1, cellSize - 2, (cellSize - 2) / 3);
            
            // シャドウ
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(x + 1, y + cellSize - (cellSize - 2) / 3, cellSize - 2, (cellSize - 2) / 3);
            
            // アウトライン（より太く、明るく）
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
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
     * キー入力フィードバックを設定
     */
    setKeyPressFeedback(key: string): void {
        this.lastKeyPress = { key, time: Date.now() };
    }
}

