const path = require('path');
const fs = require('fs');
const os = require('os');
const RammerheadJSMemCache = require('./classes/RammerheadJSMemCache.js');
const RammerheadJSFileCache = require('./classes/RammerheadJSFileCache.js');

const enableWorkers = os.cpus().length !== 1;

module.exports = {
    //// BALD EAGLE CONFIGURATION ////
    
    // プロジェクト情報
    projectName: 'Bald Eagle',
    version: '1.0.0',
    description: 'Enhanced Rammerhead Proxy with Japanese support and modern features',

    //// HOSTING CONFIGURATION ////

    bindingAddress: '0.0.0.0', // Codespaces対応: 全てのIPからのアクセスを許可
    port: 8080,
    crossDomainPort: 8081,
    publicDir: path.join(__dirname, '../public'), // set to null to disable

    // enable or disable multithreading
    enableWorkers,
    workers: os.cpus().length,

    // ssl object is either null or { key: fs.readFileSync('path/to/key'), cert: fs.readFileSync('path/to/cert') }
    // for more info, see https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
    ssl: null,

    // Codespaces対応: 動的ホスト名取得
    getServerInfo: (req) => {
        // Codespacesの環境変数をチェック
        if (process.env.CODESPACE_NAME) {
            const codespaceName = process.env.CODESPACE_NAME;
            const hostname = `${codespaceName}-8080.app.github.dev`;
            const crossDomainHostname = `${codespaceName}-8081.app.github.dev`;
            
            return { 
                hostname: hostname,
                port: 443, // Codespacesは443ポートでHTTPS
                crossDomainPort: 443,
                protocol: 'https:' 
            };
        }
        
        // ローカル環境の場合
        if (req && req.headers.host) {
            const host = req.headers.host;
            const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
            
            if (isLocalhost) {
                return { 
                    hostname: 'localhost', 
                    port: 8080, 
                    crossDomainPort: 8081, 
                    protocol: 'http:' 
                };
            }
        }
        
        // デフォルト
        return { hostname: 'localhost', port: 8080, crossDomainPort: 8081, protocol: 'http:' };
    },

    // enforce a password for creating new sessions. set to null to disable
    password: null, // Bald Eagle: パスワードを無効化（必要に応じて設定）

    // disable or enable localStorage sync (turn off if clients send over huge localStorage data, resulting in huge memory usages)
    disableLocalStorageSync: false,

    // restrict sessions to be only used per IP
    restrictSessionToIP: true,

    // caching options for js rewrites. (disk caching not recommended for slow HDD disks)
    // recommended: 50mb for memory, 5gb for disk
    // Bald Eagle: キャッシュサイズを増加して高速化
    jsCache: new RammerheadJSFileCache(path.join(__dirname, '../cache-js'), 10 * 1024 * 1024 * 1024, 100000, enableWorkers),

    // whether to disable http2 support or not (from proxy to destination site).
    // disabling may reduce number of errors/memory, but also risk
    // removing support for picky sites like web.whatsapp.com that want
    // the client to connect to http2 before connecting to their websocket
    disableHttp2: false,

    //// REWRITE HEADER CONFIGURATION ////

    // removes reverse proxy headers
    // cloudflare example:
    // stripClientHeaders: ['cf-ipcountry', 'cf-ray', 'x-forwarded-proto', 'cf-visitor', 'cf-connecting-ip', 'cdn-loop', 'x-forwarded-for'],
    stripClientHeaders: [],
    // if you want to modify response headers, like removing the x-frame-options header, do it like so:
    // rewriteServerHeaders: {
    //     // you can also specify a function to modify/add the header using the original value (undefined if adding the header)
    //     // 'x-frame-options': (originalHeaderValue) => '',
    //     'x-frame-options': null, // set to null to tell rammerhead that you want to delete it
    // },
    rewriteServerHeaders: {},

    //// SESSION STORE CONFIG ////

    // see src/classes/RammerheadSessionFileCache.js for more details and options
    fileCacheSessionConfig: {
        saveDirectory: path.join(__dirname, '../sessions'),
        cacheTimeout: 1000 * 60 * 20, // 20 minutes
        cacheCheckInterval: 1000 * 60 * 10, // 10 minutes
        deleteUnused: true,
        staleCleanupOptions: {
            staleTimeout: 1000 * 60 * 60 * 24 * 3, // 3 days
            maxToLive: null,
            staleCheckInterval: 1000 * 60 * 60 * 6 // 6 hours
        },
        // corrupted session files happens when nodejs exits abruptly while serializing the JSON sessions to disk
        deleteCorruptedSessions: true,
    },

    //// LOGGING CONFIGURATION ////

    // valid values: 'disabled', 'debug', 'traffic', 'info', 'warn', 'error'
    logLevel: process.env.DEVELOPMENT ? 'debug' : 'info',
    generatePrefix: (level) => `[${new Date().toISOString()}] [${level.toUpperCase()}] `,

    // logger depends on this value
    getIP: (req) => req.socket.remoteAddress
    // use the example below if rammerhead is sitting behind a reverse proxy like nginx
    // getIP: req => (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim()
};

if (fs.existsSync(path.join(__dirname, '../config.js'))) Object.assign(module.exports, require('../config'));
