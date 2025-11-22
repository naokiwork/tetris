/**
 * スコアリングシステム
 */
export class ScoreSystem {
    private score: number = 0;
    private level: number = 1;
    private lines: number = 0;
    private softDropPoints: number = 0;
    private hardDropPoints: number = 0;

    /**
     * ライン消去によるスコア計算
     * @param linesCleared 消去したライン数
     */
    addLines(linesCleared: number): void {
        this.lines += linesCleared;
        
        // レベル計算（10ラインごとにレベルアップ）
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
        }

        // スコア計算（整数演算に統一）
        let baseScore: number = 0;
        switch (linesCleared) {
            case 1:
                baseScore = 100;
                break;
            case 2:
                baseScore = 300;
                break;
            case 3:
                baseScore = 500;
                break;
            case 4:
                baseScore = 800; // テトリス
                break;
        }

        const scoreIncrease = Math.floor(baseScore * this.level);
        const MAX_SCORE = 999999;
        this.score = Math.min(this.score + scoreIncrease, MAX_SCORE);
    }

    /**
     * ソフトドロップによるスコア追加（1ブロックあたり1点）
     */
    addSoftDrop(blocks: number): void {
        this.softDropPoints += blocks;
        this.score += blocks;
    }

    /**
     * ハードドロップによるスコア追加（1ブロックあたり2点）
     */
    addHardDrop(blocks: number): void {
        this.hardDropPoints += blocks;
        this.score += blocks * 2;
    }

    /**
     * 現在のスコアを取得
     */
    getScore(): number {
        return this.score;
    }

    /**
     * 現在のレベルを取得
     */
    getLevel(): number {
        return this.level;
    }

    /**
     * 消去したライン数を取得
     */
    getLines(): number {
        return this.lines;
    }

    /**
     * レベルに応じた落下速度（ミリ秒）を取得
     */
    getDropInterval(): number {
        // レベル1: 1000ms（1秒）, レベル10: 100ms, レベル20以降: 50ms
        // 最初は見やすくするため、少し遅めに設定
        if (this.level >= 20) {
            return 50;
        }
        if (this.level >= 10) {
            return 100;
        }
        // レベル1-9: 1000msから段階的に減少
        return Math.max(100, 1000 - (this.level - 1) * 100);
    }

    /**
     * リセット
     */
    reset(): void {
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.softDropPoints = 0;
        this.hardDropPoints = 0;
    }

    /**
     * スコアをフォーマット（6桁）
     */
    formatScore(): string {
        return String(this.score).padStart(6, '0');
    }

    /**
     * レベルをフォーマット（2桁）
     */
    formatLevel(): string {
        return String(this.level).padStart(2, '0');
    }

    /**
     * ライン数をフォーマット（3桁）
     */
    formatLines(): string {
        return String(this.lines).padStart(3, '0');
    }
}

