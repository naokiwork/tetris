// テトリミノの種類
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// 回転状態 (0: 0°, 1: 90°, 2: 180°, 3: 270°)
export type RotationState = 0 | 1 | 2 | 3;

// 位置座標
export interface Position {
    x: number;
    y: number;
}

// セルの状態
export type Cell = null | PieceType;

// ゲーム状態
export enum GameState {
    MENU = 'MENU',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    GAME_OVER = 'GAME_OVER'
}

// テトリミノの形状データ（相対座標）
export type PieceShape = Position[];

// ピースの情報
export interface Piece {
    type: PieceType;
    position: Position;
    rotation: RotationState;
    shape: PieceShape;
}

// ボードのサイズ
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// ピースの色
export const PIECE_COLORS: Record<PieceType, string> = {
    'I': '#00d4ff',  // シアン
    'O': '#ffd700',  // 黄色
    'T': '#a855f7',  // 紫
    'S': '#22c55e',  // 緑
    'Z': '#ef4444',  // 赤
    'J': '#3b82f6',  // 青
    'L': '#f97316'   // オレンジ
};

