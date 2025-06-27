// Cloudflare Workers用のBald Eagleエントリーポイント
import { createServer } from './src/server-worker.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // リクエストをNode.jsサーバーに転送
      const server = createServer(env);
      return await server.handleRequest(request);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
