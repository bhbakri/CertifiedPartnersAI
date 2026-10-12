import { createApp } from './server.js';
if (process.env.NODE_ENV === 'production' && !process.env.MCP_API_KEY) throw new Error('Set MCP_API_KEY before starting in production');
const port = Number(process.env.PORT || 3000);
const http = createApp().listen(port, '0.0.0.0', () => console.log('Outreach MCP listening on port ' + port));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => { http.close(() => process.exit(0)); setTimeout(() => process.exit(1),10000).unref(); });
