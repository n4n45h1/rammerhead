// Bald Eagle - Cloudflare Workers対応サーバー
import config from './config.js';

export function createServer(env) {
  return {
    async handleRequest(request) {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // 静的ファイルの処理
      if (path.startsWith('/public/') || path === '/') {
        return await this.handleStaticFile(request, path);
      }
      
      // API エンドポイントの処理
      if (path.startsWith('/api/') || 
          path === '/newsession' || 
          path === '/needpassword' ||
          path === '/mainport') {
        return await this.handleAPI(request, path, env);
      }
      
      // プロキシリクエストの処理
      return await this.handleProxy(request, env);
    },
    
    async handleStaticFile(request, path) {
      try {
        // 静的ファイルをfetchで取得
        const assetUrl = path === '/' ? '/index.html' : path;
        const response = await fetch(`${request.url.split('/')[0]}//${request.url.split('/')[2]}${assetUrl}`);
        
        if (response.ok) {
          const headers = new Headers(response.headers);
          
          // キャッシュヘッダーを追加
          if (path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.png')) {
            headers.set('Cache-Control', 'public, max-age=31536000');
          }
          
          return new Response(response.body, {
            status: response.status,
            headers
          });
        }
      } catch (error) {
        console.error('Static file error:', error);
      }
      
      return new Response('Not Found', { status: 404 });
    },
    
    async handleAPI(request, path, env) {
      const headers = {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      };
      
      switch (path) {
        case '/needpassword':
          return new Response('false', { headers });
          
        case '/newsession':
          const sessionId = this.generateSessionId();
          // KVストレージに保存
          if (env.SESSIONS) {
            await env.SESSIONS.put(sessionId, JSON.stringify({
              id: sessionId,
              created: Date.now(),
              lastAccess: Date.now()
            }), { expirationTtl: 259200 }); // 3日間
          }
          return new Response(sessionId, { headers });
          
        case '/mainport':
          return new Response('443', { headers }); // HTTPS
          
        default:
          return new Response('Not Found', { status: 404, headers });
      }
    },
    
    async handleProxy(request, env) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      if (pathParts.length < 2) {
        return new Response('Invalid proxy request', { status: 400 });
      }
      
      const sessionId = pathParts[0];
      const targetUrl = pathParts.slice(1).join('/');
      
      try {
        // セッション確認
        if (env.SESSIONS) {
          const session = await env.SESSIONS.get(sessionId);
          if (!session) {
            return new Response('Session not found', { status: 404 });
          }
          
          // 最終アクセス時間を更新
          const sessionData = JSON.parse(session);
          sessionData.lastAccess = Date.now();
          await env.SESSIONS.put(sessionId, JSON.stringify(sessionData), { expirationTtl: 259200 });
        }
        
        // プロキシリクエストを実行
        const proxyResponse = await fetch(targetUrl, {
          method: request.method,
          headers: this.filterHeaders(request.headers),
          body: request.method !== 'GET' ? request.body : undefined
        });
        
        // レスポンスヘッダーを処理
        const responseHeaders = new Headers();
        for (const [key, value] of proxyResponse.headers) {
          if (!this.isRestrictedHeader(key)) {
            responseHeaders.set(key, value);
          }
        }
        
        // CORSヘッダーを追加
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', '*');
        responseHeaders.set('Access-Control-Allow-Headers', '*');
        
        return new Response(proxyResponse.body, {
          status: proxyResponse.status,
          headers: responseHeaders
        });
        
      } catch (error) {
        console.error('Proxy error:', error);
        return new Response('Proxy Error', { status: 500 });
      }
    },
    
    generateSessionId() {
      return Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    },
    
    filterHeaders(headers) {
      const filtered = new Headers();
      const allowedHeaders = [
        'accept', 'accept-language', 'content-type', 'user-agent',
        'referer', 'authorization', 'cache-control'
      ];
      
      for (const [key, value] of headers) {
        if (allowedHeaders.includes(key.toLowerCase())) {
          filtered.set(key, value);
        }
      }
      
      return filtered;
    },
    
    isRestrictedHeader(name) {
      const restricted = [
        'content-encoding', 'content-length', 'transfer-encoding',
        'connection', 'upgrade', 'x-frame-options'
      ];
      return restricted.includes(name.toLowerCase());
    }
  };
}
