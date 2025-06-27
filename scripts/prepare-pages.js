#!/usr/bin/env node
/**
 * Cloudflare Pages用のビルド準備スクリプト
 * - クライアントファイルを最適化
 * - 静的ファイルを整理
 * - 不要なファイルを除去
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Cloudflare Pages用のビルド準備を開始...');

const publicDir = path.join(__dirname, '..', 'public');
const srcDir = path.join(__dirname, '..', 'src');

// 1. 必要なクライアントファイルをpublicにコピー
const clientFiles = [
    'rammerhead.min.js',
    'hammerhead.min.js',
    'transport-worker.min.js',
    'worker-hammerhead.min.js'
];

const clientSrcDir = path.join(srcDir, 'client');
clientFiles.forEach(file => {
    const srcPath = path.join(clientSrcDir, file);
    const destPath = path.join(publicDir, 'js', file);
    
    if (fs.existsSync(srcPath)) {
        // jsディレクトリを作成
        const jsDir = path.join(publicDir, 'js');
        if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
        }
        
        try {
            fs.copyFileSync(srcPath, destPath);
            console.log(`✅ コピー完了: ${file}`);
        } catch (error) {
            console.log(`ℹ️  ${file} が見つかりません (ビルド済みでない可能性があります)`);
        }
    }
});

// 2. Pages Functions用の設定ファイルを作成
const functionsDir = path.join(__dirname, '..', 'functions');
if (!fs.existsSync(functionsDir)) {
    fs.mkdirSync(functionsDir, { recursive: true });
}

// 3. 不要なファイルを除去（開発用ファイルなど）
const filesToRemove = [
    path.join(publicDir, 'package.json'),
    path.join(publicDir, 'node_modules'),
    path.join(publicDir, '.git')
];

filesToRemove.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        try {
            if (fs.statSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(filePath);
            }
            console.log(`🗑️  削除完了: ${path.basename(filePath)}`);
        } catch (error) {
            console.log(`⚠️  削除に失敗: ${path.basename(filePath)}`);
        }
    }
});

// 4. _headers ファイルを作成（Cloudflare Pages用）
const headersContent = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin

/api/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With

/js/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=86400

/*.css
  Cache-Control: public, max-age=86400

/*.png
  Cache-Control: public, max-age=2592000

/*.ico
  Cache-Control: public, max-age=2592000
`;

fs.writeFileSync(path.join(publicDir, '_headers'), headersContent);
console.log('✅ _headers ファイルを作成');

// 5. _redirects ファイルを作成
const redirectsContent = `/proxy/* /api/proxy/:splat 200
/session/* /api/session/:splat 200
/rammerhead/* /api/rammerhead/:splat 200
`;

fs.writeFileSync(path.join(publicDir, '_redirects'), redirectsContent);
console.log('✅ _redirects ファイルを作成');

// 6. バージョン情報を含むメタファイルを作成
const buildInfo = {
    name: 'Bald Eagle Proxy',
    version: require('../package.json').version,
    buildTime: new Date().toISOString(),
    environment: 'cloudflare-pages',
    commit: process.env.CF_PAGES_COMMIT_SHA || 'unknown'
};

fs.writeFileSync(
    path.join(publicDir, 'build-info.json'), 
    JSON.stringify(buildInfo, null, 2)
);
console.log('✅ build-info.json を作成');

console.log('✨ Cloudflare Pages用のビルド準備が完了しました！');
console.log('📁 公開ディレクトリ:', publicDir);
console.log('🚀 デプロイ準備OK');
