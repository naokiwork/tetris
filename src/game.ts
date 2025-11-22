import { Board } from './board';
import { Piece, PieceType, GameState, Position } from './types';
import { createPiece, rotatePiece, BagSystem } from './pieces';
import { ScoreSystem } from './score';

/**
 * ゲーム管理クラス
 */
export class Game {
    private board: Board;
    private scoreSystem: ScoreSystem;
    private bagSystem: BagSystem;
    
    private currentPiece: Piece | null = null;
    private nextPieceType: PieceType;
    private holdPieceType: PieceType | null = null;
    private canHold: boolean = true; // 1回のピースにつき1回のみホールド可能
    
    private state: GameState = GameState.MENU;
    
    private dropTimer: number = 0;
    private lockDelay: number = 0;
    private lockDelayTime: number = 500; // 500ms
    private lastDropPosition: Position | null = null;

    constructor() {
        this.board = new Board();
        this.scoreSystem = new ScoreSystem();
        this.bagSystem = new BagSystem();
        this.nextPieceType = this.bagSystem.getNext();
    }

    /**
     * ゲーム開始
     */
    start(): void {
        this.board.clear();
        this.scoreSystem.reset();
        this.bagSystem = new BagSystem();
        this.holdPieceType = null;
        this.canHold = true;
        this.state = GameState.PLAYING;
        this.nextPieceType = this.bagSystem.getNext();
        this.spawnPiece();
    }

    /**
     * 新しいピースを出現させる
     */
    private spawnPiece(): void {
        const pieceType = this.nextPieceType;
        this.nextPieceType = this.bagSystem.getNext();
        this.currentPiece = createPiece(pieceType);
        this.canHold = true;
        this.lockDelay = 0;
        this.lastDropPosition = null;

        // ゲームオーバー判定
        if (this.board.isGameOver(this.currentPiece)) {
            this.state = GameState.GAME_OVER;
        }
    }

    /**
     * ピースを左に移動
     */
    moveLeft(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) {
            return false;
        }

        const newPiece: Piece = {
            ...this.currentPiece,
            position: {
                x: this.currentPiece.position.x - 1,
                y: this.currentPiece.position.y
            }
        };

        if (!this.board.hasCollision(newPiece)) {
            this.currentPiece = newPiece;
            this.resetLockDelay();
            return true;
        }
        return false;
    }

    /**
     * ピースを右に移動
     */
    moveRight(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) {
            return false;
        }

        const newPiece: Piece = {
            ...this.currentPiece,
            position: {
                x: this.currentPiece.position.x + 1,
                y: this.currentPiece.position.y
            }
        };

        if (!this.board.hasCollision(newPiece)) {
            this.currentPiece = newPiece;
            this.resetLockDelay();
            return true;
        }
        return false;
    }

    /**
     * ソフトドロップ（下に移動）
     */
    softDrop(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) {
            return false;
        }

        const newPiece: Piece = {
            ...this.currentPiece,
            position: {
                x: this.currentPiece.position.x,
                y: this.currentPiece.position.y + 1
            }
        };

        if (!this.board.hasCollision(newPiece)) {
            this.currentPiece = newPiece;
            this.scoreSystem.addSoftDrop(1);
            this.resetLockDelay();
            return true;
        } else {
            this.lockPiece();
            return false;
        }
    }

    /**
     * ハードドロップ（最下部まで即座に落下）
     */
    hardDrop(): void {
        if (!this.currentPiece || this.state !== GameState.PLAYING) {
            return;
        }

        let dropDistance = 0;
        let testPiece: Piece = { ...this.currentPiece };

        while (!this.board.hasCollision(testPiece)) {
            testPiece = {
                ...testPiece,
                position: {
                    x: testPiece.position.x,
                    y: testPiece.position.y + 1
                }
            };
            dropDistance++;
        }

        if (dropDistance > 0) {
            this.currentPiece = {
                ...this.currentPiece,
                position: {
                    x: this.currentPiece.position.x,
                    y: this.currentPiece.position.y + dropDistance - 1
                }
            };
            this.scoreSystem.addHardDrop(dropDistance - 1);
            this.lockPiece();
        }
    }

    /**
     * ピースを回転（時計回り）
     */
    rotateClockwise(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) {
            return false;
        }

        const rotated = rotatePiece(this.currentPiece, this.board, true);
        if (rotated) {
            this.currentPiece = rotated;
            this.resetLockDelay();
            return true;
        }
        return false;
    }

    /**
     * ピースを回転（反時計回り）
     */
    rotateCounterClockwise(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING) {
            return false;
        }

        const rotated = rotatePiece(this.currentPiece, this.board, false);
        if (rotated) {
            this.currentPiece = rotated;
            this.resetLockDelay();
            return true;
        }
        return false;
    }

    /**
     * ホールド機能
     */
    hold(): boolean {
        if (!this.currentPiece || this.state !== GameState.PLAYING || !this.canHold) {
            return false;
        }

        if (this.holdPieceType === null) {
            // ホールドが空の場合、現在のピースをホールド
            this.holdPieceType = this.currentPiece.type;
            this.spawnPiece();
        } else {
            // ホールドと現在のピースを交換
            const temp = this.holdPieceType;
            this.holdPieceType = this.currentPiece.type;
            this.currentPiece = createPiece(temp);
            this.canHold = false;
        }

        this.canHold = false;
        return true;
    }

    /**
     * ロック遅延をリセット
     */
    private resetLockDelay(): void {
        this.lockDelay = 0;
        this.lastDropPosition = this.currentPiece ? { ...this.currentPiece.position } : null;
    }

    /**
     * ピースを固定
     */
    private lockPiece(): void {
        if (!this.currentPiece) {
            return;
        }

        this.board.placePiece(this.currentPiece);
        const linesCleared = this.board.clearFullRows();
        if (linesCleared > 0) {
            this.scoreSystem.addLines(linesCleared);
        }
        this.spawnPiece();
    }

    /**
     * ゲーム更新（落下処理）
     */
    update(deltaTime: number): void {
        if (this.state !== GameState.PLAYING || !this.currentPiece) {
            return;
        }

        // 異常に大きなdeltaTimeを無視（タブが非アクティブになった場合など）
        if (deltaTime > 1000) {
            return;
        }

        // より正確な時間計測のため、performance.now()を使用
        const currentTime = performance.now();
        const preciseDeltaTime = Math.min(deltaTime, 100); // 最大100msに制限

        // ロック遅延チェック
        if (this.lastDropPosition && 
            this.currentPiece.position.x === this.lastDropPosition.x &&
            this.currentPiece.position.y === this.lastDropPosition.y) {
            this.lockDelay += preciseDeltaTime;
            if (this.lockDelay >= this.lockDelayTime) {
                this.lockPiece();
                return;
            }
        } else {
            this.resetLockDelay();
        }

        // 自動落下
        this.dropTimer += preciseDeltaTime;
        const dropInterval = this.scoreSystem.getDropInterval();

        if (this.dropTimer >= dropInterval) {
            this.dropTimer = 0;
            this.softDrop();
        }
    }

    /**
     * 一時停止/再開
     */
    togglePause(): void {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
        } else if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
        }
    }

    // ゲッター
    getBoard(): Board {
        return this.board;
    }

    getCurrentPiece(): Piece | null {
        return this.currentPiece;
    }

    getNextPieceType(): PieceType {
        return this.nextPieceType;
    }

    getHoldPieceType(): PieceType | null {
        return this.holdPieceType;
    }

    getState(): GameState {
        return this.state;
    }

    getScoreSystem(): ScoreSystem {
        return this.scoreSystem;
    }

    getGhostPosition(): Position | null {
        if (!this.currentPiece) {
            return null;
        }
        return this.board.getGhostPosition(this.currentPiece);
    }
}

