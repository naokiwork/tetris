import { Piece, PieceType, Cell, BOARD_WIDTH, BOARD_HEIGHT, Position } from './types';

/**
 * ゲームボード管理クラス
 */
export class Board {
    private grid: Cell[][];

    constructor() {
        this.grid = Array(BOARD_HEIGHT)
            .fill(null)
            .map(() => Array(BOARD_WIDTH).fill(null));
    }

    /**
     * ボードの状態を取得
     */
    getGrid(): Cell[][] {
        return this.grid;
    }

    /**
     * セルの値を取得
     */
    getCell(x: number, y: number): Cell {
        if (y < 0 || y >= BOARD_HEIGHT || x < 0 || x >= BOARD_WIDTH) {
            return null;
        }
        return this.grid[y][x];
    }

    /**
     * セルに値を設定
     */
    setCell(x: number, y: number, value: Cell): void {
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
            this.grid[y][x] = value;
        }
    }

    /**
     * ピースが衝突しているかチェック
     */
    hasCollision(piece: Piece): boolean {
        for (const block of piece.shape) {
            const x = piece.position.x + block.x;
            const y = piece.position.y + block.y;

            // 壁との衝突
            if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
                return true;
            }

            // 既存ブロックとの衝突
            if (this.grid[y] && this.grid[y][x] !== null) {
                return true;
            }
        }
        return false;
    }

    /**
     * ピースをボードに固定
     */
    placePiece(piece: Piece): void {
        for (const block of piece.shape) {
            const x = piece.position.x + block.x;
            const y = piece.position.y + block.y;

            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
                this.grid[y][x] = piece.type;
            }
        }
    }

    /**
     * 完全に埋まっている行を検出（タスク2: パーティクルエフェクト用に公開）
     */
    getFullRows(): number[] {
        const fullRows: number[] = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (this.grid[y].every(cell => cell !== null)) {
                fullRows.push(y);
            }
        }
        return fullRows;
    }

    /**
     * 指定された行を削除
     */
    clearRow(row: number): void {
        if (row >= 0 && row < BOARD_HEIGHT) {
            this.grid.splice(row, 1);
            this.grid.unshift(Array(BOARD_WIDTH).fill(null));
        }
    }

    /**
     * 複数の行を削除し、上のブロックを落下させる
     */
    clearRows(rows: number[]): number {
        // 降順にソート（上から削除するとインデックスがずれるため）
        const sortedRows = [...rows].sort((a, b) => b - a);
        
        for (const row of sortedRows) {
            this.clearRow(row);
        }

        return sortedRows.length;
    }

    /**
     * ライン消去処理（完全に埋まった行を削除）
     * @returns 消去した行数
     */
    clearFullRows(): number {
        const fullRows = this.getFullRows();
        if (fullRows.length > 0) {
            // ライン消去エフェクトをトリガー
            this.triggerLineClearEffect(fullRows);
            this.clearRows(fullRows);
        }
        return fullRows.length;
    }

    /**
     * ライン消去エフェクトをトリガー
     */
    private triggerLineClearEffect(rows: number[]): void {
        // フラッシュエフェクト用のイベントを発火
        const event = new CustomEvent('lineClear', { 
            detail: { rows, count: rows.length } 
        });
        window.dispatchEvent(event);
    }

    /**
     * ゴーストピースの位置を計算（最下部まで落下させた位置）
     */
    getGhostPosition(piece: Piece): Position {
        let testPiece: Piece = { ...piece };
        
        while (!this.hasCollision(testPiece)) {
            testPiece = {
                ...testPiece,
                position: {
                    x: testPiece.position.x,
                    y: testPiece.position.y + 1
                }
            };
        }

        // 衝突した位置の1つ上
        return {
            x: testPiece.position.x,
            y: testPiece.position.y - 1
        };
    }

    /**
     * ゲームオーバー判定（新しいピースが配置できない）
     */
    isGameOver(piece: Piece): boolean {
        return this.hasCollision(piece);
    }

    /**
     * ボードをクリア
     */
    clear(): void {
        this.grid = Array(BOARD_HEIGHT)
            .fill(null)
            .map(() => Array(BOARD_WIDTH).fill(null));
    }
}

