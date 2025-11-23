# テトリスのブロック生成アルゴリズム

## 概要

テトリスのブロック（テトリミノ）生成アルゴリズムは、ゲームのバランスとプレイヤー体験に大きく影響を与える重要な要素です。適切なアルゴリズムを選択することで、ゲームの公平性と楽しさを向上させることができます。

## 主要なアルゴリズム

### 1. 完全ランダム方式（Pure Random）

**説明:**
- 初期のテトリスで採用されていた方式
- 7種類のテトリミノ（I, O, T, S, Z, J, L）が完全にランダムな順序で生成される

**実装方法:**
```javascript
function getRandomPieceType() {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}
```

**メリット:**
- 実装が簡単
- 完全に予測不可能

**デメリット:**
- 同じテトリミノが連続して出現する可能性がある
- 特定のテトリミノが長期間出現しない可能性がある
- ゲームバランスが不安定になる可能性がある

**採用例:**
- 初期のテトリス（1984年）
- 一部のシンプルな実装

---

### 2. 7-Bag System（7種1組方式 / Bag Randomizer）

**説明:**
- 現代のテトリスで標準的に採用されている方式
- 7種類のテトリミノを1セット（バッグ）としてシャッフルし、その順序でブロックを生成
- すべてのテトリミノが一度ずつ出現するまで、同じテトリミノが連続して出現することがない

**実装方法:**
```javascript
// 7種類のテトリミノを格納するバッグ
let pieceBag = [];

// Fisher-Yatesアルゴリズムでシャッフル
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 新しいバッグを生成
function generateNewBag() {
    pieceBag = shuffleArray([...PIECE_TYPES]);
}

// バッグから次のテトリミノを取得
function getNextPieceFromBag() {
    if (pieceBag.length === 0) {
        generateNewBag();
    }
    return pieceBag.shift();
}
```

**メリット:**
- すべてのテトリミノが均等に出現する
- 同じテトリミノが連続して出現しない（バッグ内では）
- ゲームバランスが安定している
- プレイヤーが予測しやすい

**デメリット:**
- 完全にランダムではないため、ある程度予測可能
- 実装がやや複雑

**採用例:**
- テトリスガイドライン準拠の現代版テトリス
- Tetris Effect
- Puyo Puyo Tetris
- 多くの公式テトリスゲーム

---

### 3. セガ版アルゴリズム

**説明:**
- セガが開発したアーケード版テトリスで採用されていた方式
- 262,144回で一巡する特定のパターンを持つ
- ゲーム開始時に1,000個のブロックを事前に生成して内部に記憶

**特徴:**
- 2人同時プレイ時には両者が同じ順序でブロックを受け取ることが保証される
- ゲームオーバー後の再スタート時にも同じ順序でブロックが出現する
- 公平な対戦環境を提供

**メリット:**
- 対戦時の公平性が保証される
- 再現性がある

**デメリット:**
- 実装が複雑
- パターンが固定されているため、学習すれば予測可能

**採用例:**
- セガのアーケード版テトリス（システム16A/16B）

---

### 4. HATETRIS方式

**説明:**
- プレイヤーにとって最も不利なテトリミノを意図的に選択する方式
- 盤面を分析し、プレイヤーが最も困難に感じるであろうテトリミノを生成

**実装方法:**
- 盤面の状態を分析
- 各テトリミノを配置した場合の盤面の高さや穴の数を評価
- 最も不利な結果をもたらすテトリミノを選択

**メリット:**
- 極限の難易度を提供
- 挑戦的なゲーム体験

**デメリット:**
- 通常のテトリスには不適切
- 実装が非常に複雑

**採用例:**
- HATETRIS（高難度版テトリス）

---

## 本プロジェクトでの実装

### 現在の実装: 7-Bag System

本プロジェクトでは、現代の標準的な**7-Bag System**を採用しています。

**実装箇所:**
- `index.html` の `generateNewBag()`, `getNextPieceFromBag()` 関数
- `prepareNextBlocks()` 関数
- `spawnBlock()` 関数内の新しいブロック追加処理

**実装の詳細:**
1. 7種類のテトリミノ（I, O, T, S, Z, J, L）を配列に格納
2. Fisher-Yatesアルゴリズムを使用してシャッフル
3. バッグが空になったら自動的に新しいバッグを生成
4. バッグから順番にテトリミノを取得

**コード例:**
```javascript
// バッグ管理
let pieceBag = [];

// シャッフル関数（Fisher-Yates）
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 新しいバッグを生成
function generateNewBag() {
    pieceBag = shuffleArray([...PIECE_TYPES]);
}

// バッグから次のテトリミノを取得
function getNextPieceFromBag() {
    if (pieceBag.length === 0) {
        generateNewBag();
    }
    return pieceBag.shift();
}
```

---

## アルゴリズムの比較

| アルゴリズム | 公平性 | 予測可能性 | 実装の難易度 | 採用状況 |
|------------|--------|-----------|------------|---------|
| 完全ランダム | 低 | 低 | 簡単 | 初期のテトリス |
| 7-Bag System | 高 | 中 | 中 | 現代の標準 |
| セガ版 | 高 | 高 | 複雑 | セガ版のみ |
| HATETRIS | - | - | 非常に複雑 | 特殊版のみ |

---

## 参考資料

### 調査元URL
- [テトリスのブロック生成アルゴリズムについて](https://kani.no.coocan.jp/tetris/tetris.htm)
- [HATETRISについて](https://gigazine.net/news/20240714-hatetris-record/)

### 関連リソース
- Tetris Guideline（公式テトリスの仕様）
- Fisher-Yatesアルゴリズム（シャッフルアルゴリズム）

---

## まとめ

テトリスのブロック生成アルゴリズムは、ゲームのバランスとプレイヤー体験に大きく影響します。本プロジェクトでは、現代の標準である**7-Bag System**を採用することで、公平で予測可能なゲーム体験を提供しています。

このアルゴリズムにより：
- すべてのテトリミノが均等に出現
- 同じテトリミノの連続出現を防止
- 安定したゲームバランスを実現

しています。

