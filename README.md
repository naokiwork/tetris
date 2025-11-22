# TETRIS

フル機能を備えたテトリスゲーム（GitHubスタイルのUI/UX）

## 機能

- ✅ 7種類のテトリミノ（I, O, T, S, Z, J, L）
- ✅ SRS（Super Rotation System）回転システム
- ✅ バッグシステム（7種類をランダムに並べ替えて順番に出現）
- ✅ ホールド機能
- ✅ ネクストピース表示
- ✅ ゴーストピース表示
- ✅ スコアリングシステム
- ✅ レベルシステム（10ラインごとにレベルアップ）
- ✅ ライン消去アニメーション
- ✅ ロック遅延（500ms）

## 操作方法

- **← →** : 左右移動
- **↓** : ソフトドロップ（下に移動）
- **↑ / Space** : ハードドロップ（最下部まで即座に落下）
- **Z** : 反時計回り回転
- **X** : 時計回り回転
- **C** : ホールド（ピースを保持）
- **P / Escape** : 一時停止/再開

## セットアップ

```bash
# 依存関係のインストール
npm install

# TypeScriptのコンパイル
npm run build

# 開発モード（自動コンパイル）
npm run dev

# ローカルサーバーで起動
npm run serve
```

ブラウザで `http://localhost:8080` にアクセスしてください。

## プロジェクト構造

```
tetris/
├── src/
│   ├── main.ts          # エントリーポイント、ゲームループ
│   ├── types.ts         # 型定義
│   ├── pieces.ts        # テトリミノ形状、SRS、バッグシステム
│   ├── board.ts         # ゲームボード管理、衝突判定
│   ├── game.ts          # ゲーム状態管理、ピース操作
│   ├── input.ts         # キーボード入力処理
│   ├── renderer.ts      # Canvas描画、UI表示
│   └── score.ts         # スコア、レベル管理
├── styles/
│   └── main.css         # GitHubスタイルのCSS
├── dist/                # コンパイル後のJavaScript
├── index.html           # メインHTMLファイル
├── package.json
└── tsconfig.json
```

## 技術スタック

- TypeScript
- HTML5 Canvas
- CSS3（GitHubスタイル）
- バニラJavaScript（フレームワークなし）

## 自動コード改善システム

このプロジェクトには、GitHub Actionsを使用した自動コード改善システムが組み込まれています。

### 機能

- ⏰ **自動実行**: 毎時間（カスタマイズ可能）自動で実行
- 🤖 **AI改善**: OpenAI APIを使用してコード改善を生成
- 📝 **優先度処理**: 高→中→低の順で改善を適用
- 🔄 **自動PR**: 変更があれば自動でPR作成

### セットアップ

1. **GitHub Secretsの設定**

   リポジトリの **Settings > Secrets and variables > Actions** で以下を設定：

   - `OPENAI_API_KEY`: OpenAI APIキー（https://platform.openai.com/api-keys）
   - `GH_PAT_FOR_AUTOMERGE`: GitHub Personal Access Token（`repo`権限、https://github.com/settings/tokens）

2. **改善点の追加**

   `CODE_IMPROVEMENTS.md`に改善点を追加してください。形式は以下の通り：

   ```markdown
   ## 🔴 高優先度
   ### 1. 改善タイトル
   **場所**: `src/file.ts:10`
   - 問題の説明
   - **修正**: 修正方法
   ```

3. **手動実行**

   GitHub Actionsの **Actions** タブから **Auto-improve Codebase** ワークフローを手動実行できます。

### 詳細

詳細な使用方法は `AUTO_IMPROVE_COMPLETE_GUIDE.md` を参照してください。

## ライセンス

MIT

