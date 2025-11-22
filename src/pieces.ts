import { PieceType, RotationState, PieceShape, Position, Piece } from './types';
import { Board } from './board';

// 各ピースの基本形状（回転0の状態、中心を(0,0)とした相対座標）
const PIECE_SHAPES: Record<PieceType, PieceShape> = {
    'I': [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    'O': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    'T': [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    'S': [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    'Z': [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    'J': [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }],
    'L': [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]
};

// SRS (Super Rotation System) の壁キックデータ
// [rotation][test] -> [x, y] オフセット
// test 0-4: 5つのテスト位置
const SRS_KICKS: Record<string, [number, number][]> = {
    // Iピースの壁キック（特殊）
    'I-0->1': [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1]],
    'I-1->0': [[0, 0], [1, 0], [-1, 0], [0, 1], [1, 1]],
    'I-1->2': [[0, 0], [1, 0], [0, 1], [-1, 0], [1, 1]],
    'I-2->1': [[0, 0], [-1, 0], [0, -1], [1, 0], [-1, -1]],
    'I-2->3': [[0, 0], [1, 0], [-1, 0], [0, 1], [1, 1]],
    'I-3->2': [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1]],
    'I-3->0': [[0, 0], [0, 1], [0, -1], [-1, 0], [0, -2]],
    'I-0->3': [[0, 0], [0, -1], [0, 1], [1, 0], [0, 2]],
    
    // その他のピースの壁キック（標準）
    'JLSTZ-0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    'JLSTZ-1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    'JLSTZ-1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    'JLSTZ-2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    'JLSTZ-2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    'JLSTZ-3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    'JLSTZ-3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    'JLSTZ-0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
};

// Oピースは回転しないので壁キック不要

/**
 * 座標を回転させる（時計回り90度）
 */
function rotatePosition(pos: Position, rotation: RotationState): Position {
    let { x, y } = pos;
    for (let i = 0; i < rotation; i++) {
        [x, y] = [-y, x];
    }
    return { x, y };
}

/**
 * ピースの形状を取得（回転を考慮）
 */
export function getPieceShape(type: PieceType, rotation: RotationState): PieceShape {
    const baseShape = PIECE_SHAPES[type];
    return baseShape.map(pos => rotatePosition(pos, rotation));
}

/**
 * 新しいピースを作成
 */
export function createPiece(type: PieceType, x: number = 4, y: number = 0): Piece {
    return {
        type,
        position: { x, y },
        rotation: 0,
        shape: getPieceShape(type, 0)
    };
}

/**
 * ピースを回転させる（SRS適用）
 */
export function rotatePiece(
    piece: Piece,
    board: Board,
    clockwise: boolean = true
): Piece | null {
    if (piece.type === 'O') {
        return piece; // Oピースは回転しない
    }

    const newRotation = clockwise
        ? ((piece.rotation + 1) % 4) as RotationState
        : ((piece.rotation + 3) % 4) as RotationState;

    const fromRotation = piece.rotation;
    const toRotation = newRotation;

    // SRSキックデータのキーを生成
    let kickKey: string;
    if (piece.type === 'I') {
        kickKey = `I-${fromRotation}->${toRotation}`;
    } else {
        kickKey = `JLSTZ-${fromRotation}->${toRotation}`;
    }

    const kicks = SRS_KICKS[kickKey];
    if (!kicks) {
        return null;
    }

    // 各キック位置をテスト
    for (const kick of kicks) {
        const [offsetX, offsetY] = kick;
        const testPiece: Piece = {
            ...piece,
            rotation: newRotation,
            position: {
                x: piece.position.x + offsetX,
                y: piece.position.y + offsetY
            },
            shape: getPieceShape(piece.type, newRotation)
        };

        if (!board.hasCollision(testPiece)) {
            return testPiece;
        }
    }

    return null; // 回転できなかった
}

/**
 * バッグシステム（7種類をランダムに並べ替えて順番に出現）
 */
export class BagSystem {
    private bag: PieceType[] = [];
    private index: number = 0;

    constructor() {
        this.refillBag();
    }

    private refillBag(): void {
        const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        // Fisher-Yates シャッフル
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        this.bag = pieces;
        this.index = 0;
    }

    getNext(): PieceType {
        if (this.index >= this.bag.length) {
            this.refillBag();
        }
        return this.bag[this.index++];
    }

    peekNext(): PieceType {
        if (this.index >= this.bag.length) {
            this.refillBag();
        }
        return this.bag[this.index];
    }
}

