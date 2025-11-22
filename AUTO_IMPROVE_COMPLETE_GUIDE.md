# 自動コード改善システム - 完全ガイド

GitHub Actionsを使用して、毎時間自動でコードベースを改善するシステムの完全ガイドです。

## 📋 目次

1. [概要](#概要)
2. [クイックスタート（5分でセットアップ）](#クイックスタート5分でセットアップ)
3. [完全セットアップガイド](#完全セットアップガイド)
4. [カスタマイズ方法](#カスタマイズ方法)
5. [CODE_IMPROVEMENTS.mdの書き方](#code_improvementsmdの書き方)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

### 主な機能

- ⏰ **自動実行**: 毎時間（カスタマイズ可能）自動で実行
- 🤖 **AI改善**: OpenAI APIを使用してコード改善を生成
- 📝 **優先度処理**: 高→中→低の順で改善を適用
- 🔄 **自動PR**: 変更があれば自動でPR作成

### システムの動作フロー

1. GitHub Actionsがスケジュールに従って実行
2. `CODE_IMPROVEMENTS.md`から改善点を読み込み
3. 優先度順（高→中→低）に最大3つの改善点を選択
4. 簡単な改善は直接適用、複雑な改善はAIで生成
5. 変更があればブランチ作成、コミット、PR作成

### 必要なもの

- GitHubリポジトリ
- OpenAI APIキー（https://platform.openai.com/api-keys）
- GitHub Personal Access Token（https://github.com/settings/tokens）

---

## クイックスタート（5分でセットアップ）

### ステップ1: GitHub Secretsの設定（2分）

リポジトリの **Settings > Secrets and variables > Actions** で：

- `OPENAI_API_KEY`: OpenAI APIキー
- `GH_PAT_FOR_AUTOMERGE`: GitHub Personal Access Token（`repo`権限）

### ステップ2: 改善点の追加（2分）

`CODE_IMPROVEMENTS.md`に改善点を追加：

```markdown
## 🔴 高優先度
### 1. 改善例
**場所**: `src/example.ts:10`
- 問題の説明
- **修正**: 修正方法の説明
```

### ステップ3: テスト実行（1分）

GitHub Actionsの **Actions** タブから手動実行して確認。

### 完了！

これで毎時間自動でコード改善が実行されます。

---

## 完全セットアップガイド

### ステップ1: 依存関係の確認

以下の依存関係がインストールされていることを確認：

```bash
npm install
```

### ステップ2: GitHub Secretsの設定

#### 必須シークレット

1. **`OPENAI_API_KEY`**
   - OpenAI APIキー
   - 取得方法: https://platform.openai.com/api-keys
   - 用途: コード改善の生成

2. **`GH_PAT_FOR_AUTOMERGE`**
   - GitHub Personal Access Token
   - 必要な権限: `repo` (フルコントロール)
   - 取得方法: https://github.com/settings/tokens
   - 用途: リポジトリへの書き込み、PR作成

### ステップ3: CODE_IMPROVEMENTS.mdの編集

改善点リストを編集します。詳細な書き方は後述の「CODE_IMPROVEMENTS.mdの書き方」セクションを参照してください。

---

## カスタマイズ方法

### 実行頻度の変更

`.github/workflows/auto-improve.yml`の`cron`設定を変更：

```yaml
schedule:
  - cron: '0 * * * *'    # 毎時間（デフォルト）
  # - cron: '0 0 * * *'   # 毎日（UTC 0時）
  # - cron: '0 0 * * 0'   # 毎週日曜日
```

### 処理する改善点の数を変更

`scripts/auto-improve.ts`の`selectImprovements`関数を変更：

```typescript
// デフォルト: 3つ
const selectedImprovements = selectImprovements(allImprovements, 3);

// 変更例: 5つに増やす
const selectedImprovements = selectImprovements(allImprovements, 5);
```

### AIモデルの変更

`scripts/auto-improve.ts`の`generateImprovement`関数を変更：

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4',           // 'gpt-3.5-turbo'などに変更可能
  // ...
});
```

---

## CODE_IMPROVEMENTS.mdの書き方

### 基本的な形式

```markdown
# コード改善点リスト

## 🔴 高優先度（即座に修正すべき）

### 1. 改善点のタイトル
**場所**: `ファイルパス:行番号`
- 問題の詳細な説明
- 影響範囲や理由
- **修正**: 具体的な修正方法や実装方針

## 🟡 中優先度（パフォーマンス・UX改善）

### 2. パフォーマンス改善
**場所**: `src/utils/calculations.ts:15`
- 毎回計算しているが、メモ化できる
- **修正**: `useMemo`やキャッシュを使用

## 🟢 低優先度（コード品質・保守性）

### 3. コード品質
**場所**: `src/constants.ts`
- マジックナンバーが散在している
- **修正**: 定数として一元管理
```

### 優先度の判断基準

#### 🔴 高優先度
- バグやエラー
- セキュリティ問題
- パフォーマンスの重大な問題
- ユーザー体験に直接影響する問題

#### 🟡 中優先度
- UX改善
- パフォーマンス最適化
- コードの可読性
- リファクタリング

#### 🟢 低優先度
- スタイルの統一
- ドキュメントの追加
- テストの追加
- コードの整理

---

## トラブルシューティング

### エラー: OPENAI_API_KEY環境変数が設定されていない

**解決方法**:
1. GitHub Secretsに`OPENAI_API_KEY`が設定されているか確認
2. ワークフローファイルで環境変数が正しく参照されているか確認

### エラー: PRが作成されない

**解決方法**:
1. `GH_PAT_FOR_AUTOMERGE`シークレットが正しく設定されているか確認
2. GitHub CLIの認証が成功しているか確認
3. ワークフローのログでエラーメッセージを確認

### エラー: 改善が適用されない

**解決方法**:
1. `CODE_IMPROVEMENTS.md`の形式が正しいか確認
2. ファイルパスが正しいか確認
3. OpenAI APIのレスポンスを確認（ログを確認）
4. 改善点の優先度が正しく設定されているか確認

---

## ベストプラクティス

### 1. 改善点の優先順位付け

- **高優先度**: バグ、セキュリティ問題、パフォーマンスの重大な問題
- **中優先度**: UX改善、コードの可読性、リファクタリング
- **低優先度**: スタイルの統一、ドキュメント、テストの追加

### 2. 改善点の記述

明確で具体的な改善点を記述：

```markdown
### 良い例
**場所**: `src/components/Button.tsx:15`
- `onClick`ハンドラーが未定義の可能性がある
- **修正**: デフォルトの空関数を追加するか、必須プロパティとして定義

### 悪い例
**場所**: `src/components/Button.tsx`
- バグがある
- **修正**: 修正する
```

### 3. APIコストの管理

- 実行頻度を調整（毎時間ではなく毎日など）
- 処理する改善点の数を制限
- より安価なモデル（`gpt-3.5-turbo`）を使用

---

## 参考リンク

- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [OpenAI API ドキュメント](https://platform.openai.com/docs)
- [GitHub CLI ドキュメント](https://cli.github.com/manual/)
- [Cron式の説明](https://crontab.guru/)

---

**質問や問題がある場合**: GitHub Issuesで報告してください。

