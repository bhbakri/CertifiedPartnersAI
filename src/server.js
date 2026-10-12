import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { buildBrief, cases, workbook } from './selection.js';
import { templates } from './templates.js';

const reply = value => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  structuredContent: value
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function createHomepage() {
  const endpoints = [
    ['/', 'GET', 'Homepage, templates, and example data'],
    ['/health', 'GET', 'Server health check'],
    ['/templates', 'GET', 'All email templates as JSON'],
    ['/data', 'GET', 'Complete example data as JSON'],
    ['/mcp', 'POST', 'AI connection endpoint; requires your API key']
  ];

  return `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Certified Partners AI</title>
      <style>
        body {
          margin: 0;
          background: #f4f6fa;
          color: #182334;
          font: 16px/1.6 system-ui, sans-serif;
        }

        main {
          max-width: 1100px;
          margin: auto;
          padding: 40px 24px;
        }

        h1 { line-height: 1.2; }
        h2 { margin-top: 36px; }
        a { color: #245ac5; }

        section, article, details {
          background: white;
          border: 1px solid #dce2ec;
          border-radius: 12px;
          padding: 20px;
          margin: 16px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          text-align: left;
          padding: 12px;
          border-bottom: 1px solid #e5e9f0;
        }

        pre {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          background: #f6f8fc;
          padding: 16px;
          border-radius: 8px;
          font: 14px/1.6 monospace;
        }

        summary { cursor: pointer; font-weight: 600; }
        code { overflow-wrap: anywhere; }
        .scroll { overflow-x: auto; }

        button {
          cursor: pointer;
          padding: 6px 12px;
          margin: 6px;
          border: 1px solid #cbd4e2;
          border-radius: 6px;
          background: white;
        }
      </style>
    </head>
    <body>
      <main>
        <h1>Certified Partners AI</h1>
        <p>Outreach MCP server: endpoints, email templates, and example data.</p>

        <section>
          <h2 style="margin-top: 0">Endpoint URLs</h2>
          <p>Open a browser endpoint or copy its complete URL.</p>

          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Method</th>
                  <th>Description and URL</th>
                </tr>
              </thead>
              <tbody>
                ${endpoints.map(([path, method, description]) => `
                  <tr>
                    <td>
                      ${method === 'GET'
                        ? `<a href="${path}">${path}</a>`
                        : `<code>${path}</code>`}
                    </td>
                    <td>${method}</td>
                    <td>
                      ${description}<br>
                      <code data-path="${path}">${path}</code>
                      <button type="button" data-copy="${path}">
                        Copy URL
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <p>
            Available MCP tools:
            <code>list_outreach_cases</code>,
            <code>list_email_templates</code>,
            <code>prepare_email_brief</code>.
            These tools are called through <code>/mcp</code>;
            they are not separate browser URLs.
          </p>
        </section>

        <h2>Email templates</h2>
        <p>
          These are the exact templates currently in
          <code>src/templates.js</code>.
        </p>

        ${templates.map(template => `
          <article>
            <h3>${escapeHtml(template.name)}</h3>
            <p>
              <strong>ID:</strong> ${escapeHtml(template.id)}<br>
              <strong>Information categories:</strong>
              ${template.min}–${template.max}
            </p>
            <p>${escapeHtml(template.description)}</p>
            <pre>${escapeHtml(template.body)}</pre>
            <details>
              <summary>Full template object</summary>
              <pre>${escapeHtml(JSON.stringify(template, null, 2))}</pre>
            </details>
          </article>
        `).join('')}

        <h2>Example data</h2>
        <p>
          Records currently loaded from <code>data/workbook.json</code>.
          Expand a sheet to view its data.
        </p>
        <p>
          This page publicly displays fictional test data.
          Set <code>ENABLE_PREVIEW=false</code> before adding private records.
        </p>

        ${Object.entries(workbook.sheets).map(([name, records]) => `
          <details>
            <summary>
              ${escapeHtml(name)} — ${records.length} records
            </summary>
            <pre>${escapeHtml(JSON.stringify(records, null, 2))}</pre>
          </details>
        `).join('')}

        <details>
          <summary>
            Complete data file, including original cells and formulas
          </summary>
          <pre>${escapeHtml(JSON.stringify(workbook, null, 2))}</pre>
        </details>
      </main>

      <script>
        document.querySelectorAll('[data-path]').forEach(element => {
          element.textContent = location.origin + element.dataset.path;
        });

        document.querySelectorAll('[data-copy]').forEach(button => {
          button.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(
                location.origin + button.dataset.copy
              );
              button.textContent = 'Copied';
            } catch {
              button.textContent = 'Select the URL to copy';
            }
          });
        });
      </script>
    </body>
    </html>
  `;
}

function createServer() {
  const server = new McpServer({
    name: 'outreach-template-server',
    version: '1.0.0'
  });

  const annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  };

  server.registerTool(
    'list_outreach_cases',
    {
      description: 'List synthetic cases and their identifiers.',
      annotations
    },
    async () => reply({
      cases: cases.map(record => ({
        case_id: record['Case ID'],
        company: record.Company,
        relationship: record['Relationship Type']
      }))
    })
  );

  server.registerTool(
    'list_email_templates',
    {
      description: 'List the four editable email templates and score thresholds.',
      annotations
    },
    async () => reply({ templates })
  );

  server.registerTool(
    'prepare_email_brief',
    {
      description:
        'Select a template by information completeness and return joined ' +
        'case data, email eligibility, and instructions for an AI to draft ' +
        'an email. Does not generate or send email.',
      annotations,
      inputSchema: {
        case_id: z.string().min(1).max(80),
        sender: z.object({
          name: z.string().max(200).optional(),
          company: z.string().max(200).optional(),
          offer: z.string().max(2000).optional()
        }).optional()
      }
    },
    async ({ case_id, sender }) => {
      try {
        return reply(buildBrief(case_id, sender));
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: error.message }]
        };
      }
    }
  );

  return server;
}

export function createApp({
  token = process.env.MCP_API_KEY || '',
  allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const previewEnabled = process.env.ENABLE_PREVIEW !== 'false';

  app.get('/', (_req, res) => {
    if (previewEnabled) {
      return res.type('html').send(createHomepage());
    }

    res.json({
      name: 'outreach-template-server',
      health: '/health',
      mcp: '/mcp'
    });
  });

  if (previewEnabled) {
    app.get('/templates', (_req, res) => {
      res.json({ templates });
    });

    app.get('/data', (_req, res) => {
      res.json(workbook);
    });
  }

  app.use('/mcp', (req, res, next) => {
    if (
      req.headers.origin &&
      !allowedOrigins.includes(req.headers.origin)
    ) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    if (token) {
      const provided = req.headers.authorization || '';
      const expected = 'Bearer ' + token;

      if (
        Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
      ) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    next();
  });

  app.post('/mcp', async (req, res) => {
    const server = createServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  });

  app.all('/mcp', (_req, res) => {
    res.status(405).set('Allow', 'POST').json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed'
      },
      id: null
    });
  });

  return app;
}