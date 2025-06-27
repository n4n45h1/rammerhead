# 🦅 Bald Eagle

> 高速・安全・使いやすい次世代ウェブプロキシ (Rammerhead ベース)

**Bald Eagle** は、元のRammerheadプロキシを大幅に強化し、日本語対応、モダンなUI、便利な新機能を追加した高性能プロキシサーバーです。

## 🌟 主な特徴

### ✨ 新機能
- **日本語完全対応** - インターface全体が日本語で利用可能
- **ブックマーク機能** - よく使うサイトを簡単に保存・アクセス
- **テーマ切り替え** - ダークモード/ライトモードの切り替え
- **利用統計** - アクティブセッション数や接続統計の表示
- **キーボードショートカット** - より高速な操作が可能
- **自動URL補完** - 人気サイトへの簡単アクセス

### 🚀 性能向上
- **拡張キャッシュ** - 従来の2倍のキャッシュサイズで高速化
- **最適化されたUI** - レスポンシブデザインとスムーズなアニメーション
- **非同期処理** - ローディング状態の可視化

### 🎨 モダンなデザイン
- **グラデーション背景** - 美しいビジュアルエフェクト
- **グラスモーフィズム** - 透明感のあるモダンなUI
- **アニメーション** - 滑らかなトランジションとホバーエフェクト
- **レスポンシブ** - スマートフォンからデスクトップまで最適化

## 🛠️ インストールと実行

### 必要要件
- Node.js v16以上
- 4GB以上のRAM（推奨）

### セットアップ手順

1. **リポジトリをクローン**
   ```bash
   git clone <this-repository>
   cd rammerhead
   ```

2. **依存関係をインストール**
   ```bash
   npm install
   ```

3. **プロジェクトをビルド**
   ```bash
   npm run build
   ```

4. **設定をカスタマイズ（オプション）**
   - `src/config.js` を編集するか
   - ルートディレクトリに `config.js` を作成して設定を上書き

5. **サーバーを起動**
   ```bash
   npm run start
   ```

## 🚀 Cloudflare Pagesでのデプロイ

**Bald Eagle**をCloudflare Pagesでホストする手順：

### 1. 準備

```bash
# ビルドとPages用の準備
npm run build:pages

# または手動で
npm run build
npm run prepare:pages
```

### 2. Cloudflare Dashboard設定

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Pages** セクションに移動
3. **Create a project** → **Connect to Git**
4. GitHubリポジトリを選択

### 3. ビルド設定

```
Build command: npm run build:pages
Build output directory: public
Root directory: /
```

### 4. 環境変数設定

```
NODE_ENV=production
ENVIRONMENT=cloudflare-pages
```

### 5. KV Namespace作成

```bash
# Wrangler CLIでKV Namespace作成
wrangler kv:namespace create "SESSIONS"
wrangler kv:namespace create "SESSIONS" --preview
```

### 6. Pages Functions設定

1. Pages設定で**Functions**タブに移動
2. **KV namespace bindings**を追加:
   - Variable name: `SESSIONS`
   - KV namespace: 作成したNamespace ID

### 7. カスタムドメイン（オプション）

1. **Custom domains**タブでドメインを追加
2. DNS設定でCNAMEレコードを追加

### 🔧 ローカル開発

```bash
# Pages用ローカル開発サーバー
npm run dev:pages

# または直接Wranglerで
wrangler pages dev public
```

### 📝 注意事項

- **KV Namespace ID**: `wrangler.toml`の`your-kv-namespace-id`を実際のIDに変更
- **セッション管理**: KVストレージで30分間のTTL
- **プロキシ制限**: CloudflareのRequest制限に注意

### 🌟 自動デプロイ

GitHubにpushすると自動的にビルド・デプロイされます：

```bash
git add .
git commit -m "feat: Cloudflare Pages対応"
git push origin main
```

---

## 🔧 設定オプション

Bald Eagleは以下の追加設定オプションを提供します：

```javascript
module.exports = {
    // プロジェクト情報
    projectName: 'Bald Eagle',
    version: '1.0.0',
    
    // パフォーマンス設定
    jsCache: new RammerheadJSFileCache(
        path.join(__dirname, '../cache-js'), 
        10 * 1024 * 1024 * 1024, // 10GB キャッシュ
        100000, // 最大ファイル数
        enableWorkers
    ),
    
    // セキュリティ設定
    password: null, // デフォルトでパスワード無効
    restrictSessionToIP: true,
};
```

## 🌐 対応サイト

Bald Eagleは以下のサイトを含む、ほぼすべてのウェブサイトをサポートします：

- ✅ YouTube、Twitter、Instagram
- ✅ Wikipedia、Reddit、GitHub
- ✅ ほとんどのストリーミングサービス
- ✅ オンラインゲーム
- ❌ Google ログイン（技術的制限）

## 📱 使用方法

1. **セッション作成** - 「新規作成」ボタンでセッションIDを生成
2. **URL入力** - アクセスしたいサイトのURLを入力
3. **ブックマーク** - よく使うサイトをブックマークに追加
4. **テーマ切り替え** - 右上のボタンでダーク/ライトモードを切り替え

## 🔒 セキュリティとプライバシー

- **セッション分離** - 各セッションは完全に独立
- **IP制限** - セッションは作成したIPアドレスでのみ使用可能
- **自動削除** - 非アクティブなセッションは3日後に自動削除
- **データ暗号化** - 通信データの暗号化

## 🆘 サポート

質問やサポートが必要な場合は、以下のDiscordサーバーにご参加ください：

[Rammerhead Support Server](https://discord.gg/VNT4E7gN5Y)

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

**Bald Eagle** - 次世代のウェブプロキシ体験をお楽しみください！ 🦅
