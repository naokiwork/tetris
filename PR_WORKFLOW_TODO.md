# PRワークフロー To-Do List

このドキュメントは、コミット → プッシュ → PR（レビュー）→ マージの一連のワークフローを管理するためのチェックリストです。

## 📋 コミット前の準備

### ✅ 変更内容の確認
- [ ] 変更したファイルの一覧を確認
- [ ] 変更内容が意図した通りか確認
- [ ] 不要なファイル（一時ファイル、ログファイル等）が含まれていないか確認
- [ ] デバッグ用のコードが残っていないか確認

### ✅ テストの実行
- [ ] TypeScriptのコンパイルエラーがないか確認
  ```bash
  npm run build
  ```
- [ ] リンターエラーがないか確認
  ```bash
  npx eslint src/**/*.ts
  ```
- [ ] ローカルでアプリケーションが正常に動作するか確認
  ```bash
  npm run serve
  ```
- [ ] 主要な機能が正常に動作するか確認
  - [ ] ゲーム開始
  - [ ] ピースの移動・回転
  - [ ] ライン消去
  - [ ] ゲームオーバー
  - [ ] リスタート

### ✅ コード品質の確認
- [ ] コードスタイルが統一されているか確認
- [ ] コメントが適切に追加されているか確認
- [ ] 変数名・関数名が適切か確認
- [ ] マジックナンバーが定数化されているか確認

---

## 📝 コミット

### ✅ 適切なコミットメッセージの作成
- [ ] コミットメッセージの形式を確認
  - 形式: `<type>: <subject>`
  - 例: `feat: Add sound effects`
  - 例: `fix: Fix ghost piece display bug`
  - 例: `refactor: Improve code structure`
- [ ] コミットタイプを選択
  - `feat`: 新機能
  - `fix`: バグ修正
  - `docs`: ドキュメント
  - `style`: コードスタイル
  - `refactor`: リファクタリング
  - `test`: テスト
  - `chore`: その他

### ✅ 変更ファイルのステージング
- [ ] 変更されたファイルを確認
  ```bash
  git status
  ```
- [ ] 必要なファイルをステージング
  ```bash
  git add <file>
  # または
  git add .
  ```
- [ ] ステージングされたファイルを確認
  ```bash
  git diff --cached
  ```

### ✅ コミットの実行
- [ ] コミットメッセージを記入してコミット
  ```bash
  git commit -m "feat: Add improvements and bug fixes"
  ```
- [ ] コミット履歴を確認
  ```bash
  git log --oneline -5
  ```

---

## 🚀 プッシュ

### ✅ リモートブランチの確認
- [ ] 現在のブランチを確認
  ```bash
  git branch
  ```
- [ ] リモートブランチの状態を確認
  ```bash
  git remote -v
  ```
- [ ] リモートの最新状態を取得
  ```bash
  git fetch origin
  ```

### ✅ プッシュの実行
- [ ] 新しいブランチを作成（必要に応じて）
  ```bash
  git checkout -b feature/improvements
  ```
- [ ] ブランチをプッシュ
  ```bash
  git push origin <branch-name>
  # 初回プッシュの場合
  git push -u origin <branch-name>
  ```

### ✅ プッシュ結果の確認
- [ ] プッシュが成功したか確認
- [ ] GitHub上でブランチが作成されたか確認
- [ ] コミットが正しく反映されているか確認

---

## 🔀 PR作成

### ✅ ブランチの作成
- [ ] 機能ブランチを作成（mainブランチから）
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feature/improvements
  ```
- [ ] ブランチ名が適切か確認
  - 命名規則: `feature/`, `fix/`, `refactor/` など

### ✅ PRの作成
- [ ] GitHub CLIを使用してPRを作成
  ```bash
  gh pr create --title "feat: Add improvements and bug fixes" --body "PR説明文"
  ```
- [ ] または、GitHubのWeb UIからPRを作成
  - リポジトリの「Pull requests」タブを開く
  - 「New pull request」をクリック
  - ベースブランチと比較ブランチを選択
  - 「Create pull request」をクリック

### ✅ PR説明文の記入
- [ ] PRのタイトルを記入
  - 簡潔で分かりやすいタイトル
  - 変更内容が一目で分かるように
- [ ] PRの説明文を記入
  - 変更の概要
  - 変更理由
  - 変更内容の詳細
  - テスト方法
  - スクリーンショット（必要に応じて）
- [ ] 関連するIssue番号を記入（あれば）
  - `Closes #123` など
- [ ] レビュアーを指定（必要に応じて）
- [ ] ラベルを追加（必要に応じて）

---

## 👀 レビューとマージ

### ✅ コードレビューの実施
- [ ] PRが作成されたことを確認
- [ ] 自動チェック（CI/CD）が通っているか確認
  - [ ] TypeScriptコンパイル
  - [ ] リンター
  - [ ] テスト（あれば）
- [ ] レビュアーからのフィードバックを確認
- [ ] レビュアーからの承認を確認

### ✅ フィードバックへの対応
- [ ] レビュアーからのコメントを確認
- [ ] 指摘された点を修正
- [ ] 修正をコミット
  ```bash
  git add <file>
  git commit -m "fix: Address review comments"
  git push origin <branch-name>
  ```
- [ ] 修正内容をPRにコメントで説明（必要に応じて）

### ✅ マージの実行
- [ ] すべてのレビューが完了しているか確認
- [ ] すべてのチェックが通っているか確認
- [ ] コンフリクトがないか確認
- [ ] マージ方法を選択
  - **Merge commit**: マージコミットを作成
  - **Squash and merge**: コミットを1つにまとめてマージ
  - **Rebase and merge**: リベースしてマージ
- [ ] マージを実行
  ```bash
  gh pr merge <PR番号> --merge
  # または
  gh pr merge <PR番号> --squash
  # または
  gh pr merge <PR番号> --rebase
  ```
- [ ] マージ後にブランチを削除（オプション）
  ```bash
  gh pr merge <PR番号> --delete-branch
  ```

### ✅ マージ後の確認
- [ ] マージが成功したことを確認
- [ ] mainブランチを最新の状態に更新
  ```bash
  git checkout main
  git pull origin main
  ```
- [ ] ローカルブランチを削除（必要に応じて）
  ```bash
  git branch -d <branch-name>
  ```
- [ ] マージ後の動作確認
  - [ ] アプリケーションが正常に動作するか確認
  - [ ] 新機能が正しく動作するか確認
  - [ ] バグが修正されているか確認

---

## 📌 補足情報

### コミットメッセージのベストプラクティス
- 1行目は50文字以内で簡潔に
- 2行目は空行
- 3行目以降に詳細を記述（必要に応じて）
- 動詞の現在形を使用（例: "Add" ではなく "Adds" でも可、ただし "Added" は避ける）

### PR説明文のテンプレート
```markdown
## 概要
変更の概要を簡潔に記述

## 変更内容
- 変更点1
- 変更点2
- 変更点3

## テスト方法
1. テスト手順1
2. テスト手順2

## スクリーンショット
（必要に応じて）

## 関連Issue
Closes #123
```

### よくある問題と対処法

#### コンフリクトが発生した場合
```bash
git checkout main
git pull origin main
git checkout <branch-name>
git rebase main
# コンフリクトを解決
git add <file>
git rebase --continue
git push origin <branch-name> --force
```

#### コミットメッセージを修正したい場合
```bash
git commit --amend -m "新しいメッセージ"
git push origin <branch-name> --force
```

#### PRを閉じたい場合
```bash
gh pr close <PR番号>
```

---

**最終更新**: 2024-11-23

