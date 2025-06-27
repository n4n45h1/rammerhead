/**
 * Cloudflare Pages Functions - Bald Eagle Proxy
 * すべてのAPIルーティングとプロキシ機能を処理
 */

// セッション管理クラス
class SessionManager {
    constructor(env) {
        this.kv = env.SESSIONS;
        this.sessionTimeout = 30 * 60 * 1000; // 30分
    }

    async createSession() {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            created: Date.now(),
            lastAccess: Date.now(),
            data: {}
        };
        
        await this.kv.put(`session:${sessionId}`, JSON.stringify(session), {
            expirationTtl: this.sessionTimeout / 1000
        });
        
        return session;
    }

    async getSession(sessionId) {
        const sessionData = await this.kv.get(`session:${sessionId}`);
        if (!sessionData) return null;
        
        const session = JSON.parse(sessionData);
        session.lastAccess = Date.now();
        
        // セッション更新
        await this.kv.put(`session:${sessionId}`, JSON.stringify(session), {
            expirationTtl: this.sessionTimeout / 1000
        });
        
        return session;
    }

    async deleteSession(sessionId) {
        await this.kv.delete(`session:${sessionId}`);
    }

    generateSessionId() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

// プロキシ処理クラス
class ProxyHandler {
    constructor(env) {
        this.env = env;
        this.sessionManager = new SessionManager(env);
    }

    async handleRequest(request, path) {
        const url = new URL(request.url);
        const pathSegments = path.split('/').filter(p => p);

        // CORSプリフライト対応
        if (request.method === 'OPTIONS') {
            return this.createCorsResponse();
        }

        try {
            // APIルーティング
            switch (pathSegments[0]) {
                case 'api':
                    return await this.handleApi(request, pathSegments.slice(1));
                case 'proxy':
                    return await this.handleProxy(request, pathSegments.slice(1));
                case 'session':
                    return await this.handleSession(request, pathSegments.slice(1));
                default:
                    return this.createErrorResponse(404, 'エンドポイントが見つかりません');
            }
        } catch (error) {
            console.error('プロキシエラー:', error);
            return this.createErrorResponse(500, 'サーバーエラーが発生しました');
        }
    }

    async handleApi(request, pathSegments) {
        switch (pathSegments[0]) {
            case 'newsession':
                return await this.createNewSession(request);
            case 'editsession':
                return await this.editSession(request);
            case 'sessionexists':
                return await this.checkSessionExists(request);
            case 'deletesession':
                return await this.deleteSession(request);
            default:
                return this.createErrorResponse(404, 'APIエンドポイントが見つかりません');
        }
    }

    async handleProxy(request, pathSegments) {
        const sessionId = pathSegments[0];
        if (!sessionId) {
            return this.createErrorResponse(400, 'セッションIDが必要です');
        }

        const session = await this.sessionManager.getSession(sessionId);
        if (!session) {
            return this.createErrorResponse(404, 'セッションが見つかりません');
        }

        // プロキシ処理（簡易版）
        const targetUrl = pathSegments.slice(1).join('/');
        if (!targetUrl) {
            return this.createErrorResponse(400, 'プロキシ先URLが必要です');
        }

        try {
            // URLの検証とサニタイズ
            const fullUrl = this.validateAndNormalizeUrl(targetUrl);
            
            // プロキシリクエスト実行
            const response = await fetch(fullUrl, {
                method: request.method,
                headers: this.sanitizeHeaders(request.headers),
                body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
            });

            // レスポンスヘッダーの処理
            const responseHeaders = new Headers();
            this.setCorsHeaders(responseHeaders);
            
            // 必要なヘッダーをコピー
            ['content-type', 'content-length'].forEach(header => {
                const value = response.headers.get(header);
                if (value) responseHeaders.set(header, value);
            });

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders
            });

        } catch (error) {
            console.error('プロキシリクエストエラー:', error);
            return this.createErrorResponse(500, 'プロキシリクエストに失敗しました');
        }
    }

    async handleSession(request, pathSegments) {
        // セッション管理API
        const action = pathSegments[0];
        switch (action) {
            case 'list':
                return await this.listSessions(request);
            case 'info':
                return await this.getSessionInfo(request, pathSegments[1]);
            default:
                return this.createErrorResponse(404, 'セッションAPIが見つかりません');
        }
    }

    // セッション作成
    async createNewSession(request) {
        const session = await this.sessionManager.createSession();
        return this.createJsonResponse({ sessionId: session.id });
    }

    // セッション編集
    async editSession(request) {
        const { sessionId, data } = await request.json();
        const session = await this.sessionManager.getSession(sessionId);
        
        if (!session) {
            return this.createErrorResponse(404, 'セッションが見つかりません');
        }

        session.data = { ...session.data, ...data };
        await this.sessionManager.kv.put(`session:${sessionId}`, JSON.stringify(session), {
            expirationTtl: this.sessionManager.sessionTimeout / 1000
        });

        return this.createJsonResponse({ success: true });
    }

    // セッション存在確認
    async checkSessionExists(request) {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('sessionId');
        
        if (!sessionId) {
            return this.createErrorResponse(400, 'セッションIDが必要です');
        }

        const session = await this.sessionManager.getSession(sessionId);
        return this.createJsonResponse({ exists: !!session });
    }

    // セッション削除
    async deleteSession(request) {
        const { sessionId } = await request.json();
        await this.sessionManager.deleteSession(sessionId);
        return this.createJsonResponse({ success: true });
    }

    // URL検証とサニタイズ
    validateAndNormalizeUrl(url) {
        // httpまたはhttpsで始まらない場合はhttpsを追加
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        try {
            const parsedUrl = new URL(url);
            
            // 危険なプロトコルをブロック
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('サポートされていないプロトコルです');
            }

            // ローカルホストやプライベートIPをブロック
            const hostname = parsedUrl.hostname.toLowerCase();
            if (hostname === 'localhost' || 
                hostname.startsWith('127.') ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
                throw new Error('プライベートIPアドレスはプロキシできません');
            }

            return parsedUrl.href;
        } catch (error) {
            throw new Error('無効なURLです: ' + error.message);
        }
    }

    // ヘッダーのサニタイズ
    sanitizeHeaders(headers) {
        const cleanHeaders = new Headers();
        
        // 安全なヘッダーのみを通す
        const allowedHeaders = [
            'accept', 'accept-language', 'content-type', 'user-agent',
            'referer', 'accept-encoding', 'cache-control'
        ];

        for (const [key, value] of headers) {
            if (allowedHeaders.includes(key.toLowerCase())) {
                cleanHeaders.set(key, value);
            }
        }

        return cleanHeaders;
    }

    // CORSヘッダー設定
    setCorsHeaders(headers) {
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }

    // CORSプリフライトレスポンス
    createCorsResponse() {
        const headers = new Headers();
        this.setCorsHeaders(headers);
        return new Response(null, { status: 204, headers });
    }

    // JSONレスポンス作成
    createJsonResponse(data, status = 200) {
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        this.setCorsHeaders(headers);
        
        return new Response(JSON.stringify(data), { status, headers });
    }

    // エラーレスポンス作成
    createErrorResponse(status, message) {
        return this.createJsonResponse({ error: message }, status);
    }
}

// Cloudflare Pages Functions エントリーポイント
export async function onRequest(context) {
    const { request, env, params } = context;
    const path = params.path.join('/');
    
    const handler = new ProxyHandler(env);
    return await handler.handleRequest(request, path);
}
