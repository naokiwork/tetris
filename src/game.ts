import { Board } from './board';
import { Piece, PieceType, GameState, Position } from './types';
import { createPiece, rotatePiece, BagSystem } from './pieces';
import { ScoreSystem } from './score';
import { AudioSystem } from './audio';

// タスク68: ライン消去中の操作無効化用のグローバルフラグ
declare global {
    interface Window {
        tetrisRenderer?: {
            isLineClearingActive?: () => boolean;
            setLineClearing?: (clearing: boolean) => void;
        };
    }
}

/**
 * ゲーム管理クラス
 */
export class Game {
    private board: Board;
    private scoreSystem: ScoreSystem;
    private bagSystem: BagSystem;
    private audioSystem: AudioSystem;
    
    private currentPiece: Piece | null = null;
    private nextPieceType: PieceType;
    private holdPieceType: PieceType | null = null;
    private canHold: boolean = true; // 1回のピースにつき1回のみホールド可能
    
    private state: GameState = GameState.MENU;
    
    private dropTimer: number = 0;
    private lockDelay: number = 0;
    private lockDelayTime: number = 500; // 500ms
    private lastDropPosition: Position | null = null;
    // タスク11: 難易度設定
    private difficulty: 'easy' | 'normal' | 'hard' | 'expert' = 'normal';
    // タスク12: ゲームモード
    private gameMode: 'marathon' | 'sprint' | 'ultra' = 'marathon';

    constructor() {
        this.board = new Board();
        this.scoreSystem = new ScoreSystem();
        this.bagSystem = new BagSystem();
        this.audioSystem = new AudioSystem();
        this.nextPieceType = this.bagSystem.getNext();
    }

    /**
     * ゲーム開始（シンプルなデバッグ用実装）
     */
    start(): void {
        // シンプルな実装：黄色のブロック（Oピース）を真ん中ら辺に表示
        this.state = GameState.PLAYING;
        this.currentPiece = {
            type: 'O',
            position: { x: 4, y: 5 }, // 真ん中ら辺の位置
            rotation: 0,
            shape: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 0, y: 1 },
                { x: 1, y: 1 }
            ]
        };
        
        console.log('Game started! Yellow block (O piece) created at:', this.currentPiece.position);
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
        this.dropTimer = 0; // 落下タイマーをリセット

        // デバッグ: ピース生成を確認
        console.log('Piece spawned:', pieceType, 'at position:', this.currentPiece.position);

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
            // タスク7: ハードドロップ時の音響フィードバック
            this.audioSystem.playHardDrop();
            // タスク62: ハードドロップ後はロック遅延をスキップして即座に固定
            this.lockDelay = this.lockDelayTime; // ロック遅延を最大にして即座に固定
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

        // タスク5: ピースの回転可能位置の表示
        const rotationHints = this.getRotationHints(true);
        const rotated = rotatePiece(this.currentPiece, this.board, true);
        if (rotated) {
            // タスク1: ピース回転時の視覚的フィードバック
            const rotateEvent = new CustomEvent('pieceRotated', {
                detail: { piece: this.currentPiece, hints: rotationHints }
            });
            window.dispatchEvent(rotateEvent);
            // タスク6: ピース回転時の音響フィードバック
            this.audioSystem.playRotate();
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

        // タスク5: ピースの回転可能位置の表示
        const rotationHints = this.getRotationHints(false);
        const rotated = rotatePiece(this.currentPiece, this.board, false);
        if (rotated) {
            // タスク1: ピース回転時の視覚的フィードバック
            const rotateEvent = new CustomEvent('pieceRotated', {
                detail: { piece: this.currentPiece, hints: rotationHints }
            });
            window.dispatchEvent(rotateEvent);
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

        // タスク1, 18: ピース固定時のアニメーション（強化）
        const lockEvent = new CustomEvent('pieceLocked', {
            detail: { piece: this.currentPiece }
        });
        window.dispatchEvent(lockEvent);
        // タスク1, 11: ピース固定時の音響フィードバック
        this.audioSystem.playPieceLock();
        
        // タスク78: ピース固定時のタイミングを正確に管理
        const lockTime = performance.now();

        this.board.placePiece(this.currentPiece);
        // タスク2: ライン消去時のパーティクルエフェクト用に消去される行を取得
        const fullRows = this.board.getFullRows();
        const linesCleared = this.board.clearFullRows();
        if (linesCleared > 0) {
            // タスク8: ライン消去時の音響フィードバック
            this.audioSystem.playLineClear(linesCleared);
            // タスク2: ライン消去時のパーティクルエフェクト
            const particleEvent = new CustomEvent('lineClearParticles', {
                detail: { lines: fullRows }
            });
            window.dispatchEvent(particleEvent);
            // タスク68: ライン消去中の操作無効化
            if ((window as any).tetrisRenderer?.setLineClearing) {
                (window as any).tetrisRenderer.setLineClearing(true);
            }
            
            // タスク13: テトリスの特別エフェクト
            if (linesCleared === 4) {
                const tetrisEvent = new CustomEvent('tetris', {});
                window.dispatchEvent(tetrisEvent);
            }
            // タスク14: コンボ表示
            const comboEvent = new CustomEvent('combo', {
                detail: { count: linesCleared }
            });
            window.dispatchEvent(comboEvent);
            this.scoreSystem.addLines(linesCleared);
            
            // タスク68: ライン消去アニメーション後に操作を再有効化
            setTimeout(() => {
                if ((window as any).tetrisRenderer?.setLineClearing) {
                    (window as any).tetrisRenderer.setLineClearing(false);
                }
            }, 500); // 500ms後に再有効化
        }
        this.spawnPiece();
    }

    /**
     * ゲーム更新（落下処理）
     */
    update(deltaTime: number): void {
        // シンプルなデバッグ用実装：何もしない（ブロックを表示するだけ）
        // ゲームが開始されていない場合は更新しない
        if (this.state !== GameState.PLAYING) {
            return;
        }
        // ブロックは固定表示（落下ロジックは一旦無視）
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

    canHoldPiece(): boolean {
        return this.canHold;
    }

    /**
     * タスク5: ピースの回転可能位置を取得
     */
    private getRotationHints(clockwise: boolean): { x: number; y: number }[] {
        if (!this.currentPiece) {
            return [];
        }
        const hints: { x: number; y: number }[] = [];
        // 現在の位置から回転可能な位置を計算（簡易実装）
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const testPiece: Piece = {
                    ...this.currentPiece,
                    position: {
                        x: this.currentPiece.position.x + dx,
                        y: this.currentPiece.position.y + dy
                    }
                };
                const rotated = rotatePiece(testPiece, this.board, clockwise);
                if (rotated && !this.board.hasCollision(rotated)) {
                    hints.push({ x: testPiece.position.x, y: testPiece.position.y });
                }
            }
        }
        return hints;
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

