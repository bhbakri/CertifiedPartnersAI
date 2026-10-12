import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { buildBrief, cases } from './selection.js';
import { templates } from './templates.js';
const reply = value => ({content: [{type: 'text', text: JSON.stringify(value, null, 2)}], structuredContent: value});
function createServer() {
  const server = new McpServer({name: 'outreach-template-server', version: '1.0.0'});
  const annotations = {readOnlyHint: true, destructiveHint: false, openWorldHint: false};
  server.registerTool('list_outreach_cases', {description: 'List synthetic cases and their identifiers.', annotations}, async () => reply({cases: cases.map(c => ({case_id:c['Case ID'], company:c.Company, relationship:c['Relationship Type']}))}));
  server.registerTool('list_email_templates', {description: 'List the four editable email templates and score thresholds.', annotations}, async () => reply({templates}));
  server.registerTool('prepare_email_brief', {
    description: 'Select a template by information completeness and return joined case data, email eligibility, and instructions for an AI to draft an email. Does not generate or send email.', annotations,
    inputSchema: {case_id: z.string().min(1).max(80), sender: z.object({name:z.string().max(200).optional(),company:z.string().max(200).optional(),offer:z.string().max(2000).optional()}).optional()}
  }, async ({case_id, sender}) => {
    try { return reply(buildBrief(case_id, sender)); }
    catch (error) { return {isError:true, content:[{type:'text',text:error.message}]}; }
  });
  return server;
}
export function createApp({token = process.env.MCP_API_KEY || '', allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({limit:'1mb'}));
  app.get('/health', (_req,res) => res.json({status:'ok'}));
  app.use('/mcp', (req,res,next) => {
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) return res.status(403).json({error:'Origin not allowed'});
    if (token) {
      const value = req.headers.authorization || '';
      const expected = 'Bearer ' + token;
      if (Buffer.byteLength(value) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(value),Buffer.from(expected))) return res.status(401).json({error:'Unauthorized'});
    }
    next();
  });
  app.post('/mcp', async (req,res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator:undefined, enableJsonResponse:true});
    res.on('close', () => { void transport.close(); void server.close(); });
    try { await server.connect(transport); await transport.handleRequest(req,res,req.body); }
    catch { if (!res.headersSent) res.status(500).json({jsonrpc:'2.0',error:{code:-32603,message:'Internal server error'},id:null}); }
  });
  app.all('/mcp', (_req,res) => res.status(405).set('Allow','POST').json({jsonrpc:'2.0',error:{code:-32000,message:'Method not allowed'},id:null}));
  return app;
}
