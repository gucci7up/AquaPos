import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const {
  PORT = '4000',
  MYSQL_HOST,
  MYSQL_PORT = '3306',
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  CORS_ORIGIN = '*',
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID,
  TELEGRAM_WEBHOOK_TOKEN,
} = process.env;

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
  throw new Error('Missing MySQL env vars (MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE)');
}

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT),
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function ensureSchema() {
  const ensureTable = async (table, createSql) => {
    const [rows] = await pool.query(
      `SELECT 1 as ok
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
       LIMIT 1`,
      [table]
    );
    if (rows.length) return;
    await pool.query(createSql);
  };

  const ensureColumn = async (table, column, definition) => {
    const [rows] = await pool.query(
      `SELECT 1 as ok
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [table, column]
    );
    if (rows.length) return;
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  };

  const ensureUniqueIndex = async (table, indexName, column) => {
    const [rows] = await pool.query(
      `SELECT 1 as ok
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND INDEX_NAME = ?
       LIMIT 1`,
      [table, indexName]
    );
    if (rows.length) return;
    await pool.query(`ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${indexName}\` (\`${column}\`)`);
  };

  await ensureColumn('quote_approvals', 'signature_data', 'LONGTEXT NULL');
  await ensureColumn('quote_approvals', 'signature_mime', 'VARCHAR(128) NULL');
  await ensureColumn('quote_approvals', 'id_doc_data', 'LONGTEXT NULL');
  await ensureColumn('quote_approvals', 'id_doc_mime', 'VARCHAR(128) NULL');
  await ensureColumn('quote_approvals', 'id_doc_filename', 'VARCHAR(255) NULL');
  await ensureColumn('quote_approvals', 'short_code', 'VARCHAR(32) NULL');
  await ensureUniqueIndex('quote_approvals', 'uq_quote_approvals_short_code', 'short_code');
  await ensureColumn('quotes', 'business_id', 'VARCHAR(64) NULL');

  await ensureTable(
    'support_conversations',
    `CREATE TABLE \`support_conversations\` (
      \`id\` BIGINT NOT NULL AUTO_INCREMENT,
      \`business_id\` VARCHAR(64) NOT NULL,
      \`user_id\` VARCHAR(64) NOT NULL,
      \`user_name\` VARCHAR(255) NULL,
      \`user_email\` VARCHAR(255) NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'Open',
      \`last_message_at\` DATETIME NULL,
      \`telegram_last_message_id\` BIGINT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_support_conversations_business_updated\` (\`business_id\`, \`updated_at\`),
      KEY \`idx_support_conversations_business_user\` (\`business_id\`, \`user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await ensureTable(
    'support_messages',
    `CREATE TABLE \`support_messages\` (
      \`id\` BIGINT NOT NULL AUTO_INCREMENT,
      \`conversation_id\` BIGINT NOT NULL,
      \`sender\` VARCHAR(16) NOT NULL,
      \`body\` TEXT NOT NULL,
      \`telegram_message_id\` BIGINT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_support_messages_conversation_id\` (\`conversation_id\`),
      KEY \`idx_support_messages_conversation_created\` (\`conversation_id\`, \`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
}

function parseDataUrl(input) {
  const s = String(input || '');
  if (!s) return null;
  if (s.startsWith('data:')) {
    const match = s.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return { mime: match[1], base64: match[2] };
  }
  return { mime: null, base64: s };
}

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '35mb' }));

function getBusinessId(req) {
  const v = String(req.header('x-business-id') || '').trim();
  return v || null;
}

function getRequester(req) {
  const userId = String(req.header('x-user-id') || '').trim() || null;
  const userName = String(req.header('x-user-name') || '').trim() || null;
  const userEmail = String(req.header('x-user-email') || '').trim() || null;
  const isAdmin = String(req.header('x-user-admin') || '').trim() === '1';
  return { userId, userName, userEmail, isAdmin };
}

function telegramEnabled() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_CHAT_ID);
}

async function sendTelegramMessage(text, replyToMessageId) {
  if (!telegramEnabled()) return null;
  const payload = {
    chat_id: TELEGRAM_ADMIN_CHAT_ID,
    text,
    disable_web_page_preview: true,
  };
  if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.ok) {
    throw new Error(data?.description || `Telegram sendMessage failed (${r.status})`);
  }
  return data.result;
}

app.get('/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({ ok: true, db: rows?.[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get('/api/support/config', async (_req, res) => {
  res.json({
    success: true,
    telegram: {
      enabled: telegramEnabled(),
      inboundEnabled: Boolean(TELEGRAM_WEBHOOK_TOKEN),
    },
  });
});

app.get('/api/support/me', async (req, res) => {
  const businessId = getBusinessId(req);
  const { userId, userName, userEmail } = getRequester(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  if (!userId) {
    res.status(400).json({ success: false, error: 'Missing x-user-id' });
    return;
  }
  try {
    const [cRows] = await pool.query(
      `SELECT id, business_id, user_id, user_name, user_email, status, last_message_at, created_at, updated_at
       FROM support_conversations
       WHERE business_id = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [businessId, userId]
    );
    let conversation = cRows?.[0] || null;
    if (!conversation) {
      const [r] = await pool.query(
        `INSERT INTO support_conversations (business_id, user_id, user_name, user_email, status, last_message_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [businessId, userId, userName, userEmail, 'Open']
      );
      const [fresh] = await pool.query(
        `SELECT id, business_id, user_id, user_name, user_email, status, last_message_at, created_at, updated_at
         FROM support_conversations
         WHERE id = ?
         LIMIT 1`,
        [r.insertId]
      );
      conversation = fresh?.[0] || null;
    }
    const [mRows] = await pool.query(
      `SELECT id, sender, body, created_at
       FROM support_messages
       WHERE conversation_id = ?
       ORDER BY id ASC
       LIMIT 200`,
      [conversation.id]
    );
    res.json({ success: true, conversation, messages: mRows });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/api/support/me/messages', async (req, res) => {
  const businessId = getBusinessId(req);
  const { userId, userName, userEmail } = getRequester(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  if (!userId) {
    res.status(400).json({ success: false, error: 'Missing x-user-id' });
    return;
  }
  const text = String(req.body?.text || '').trim();
  if (!text) {
    res.status(400).json({ success: false, error: 'Missing text' });
    return;
  }
  if (text.length > 3000) {
    res.status(400).json({ success: false, error: 'Message too long' });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [cRows] = await conn.query(
      `SELECT id, telegram_last_message_id
       FROM support_conversations
       WHERE business_id = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [businessId, userId]
    );
    let conversationId = cRows?.[0]?.id || null;
    let telegramLastMessageId = cRows?.[0]?.telegram_last_message_id || null;
    if (!conversationId) {
      const [r] = await conn.query(
        `INSERT INTO support_conversations (business_id, user_id, user_name, user_email, status, last_message_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [businessId, userId, userName, userEmail, 'Open']
      );
      conversationId = r.insertId;
      telegramLastMessageId = null;
    } else {
      await conn.query(
        `UPDATE support_conversations
         SET user_name = COALESCE(?, user_name),
             user_email = COALESCE(?, user_email),
             status = 'Open',
             last_message_at = NOW()
         WHERE id = ?`,
        [userName, userEmail, conversationId]
      );
    }

    const [mRes] = await conn.query(
      `INSERT INTO support_messages (conversation_id, sender, body)
       VALUES (?, ?, ?)`,
      [conversationId, 'user', text]
    );
    const messageId = mRes.insertId;

    if (telegramEnabled()) {
      const header = `SUP-${conversationId}\nNegocio: ${businessId}\nUsuario: ${userName || userEmail || userId}\n\n`;
      const telegramText = header + text;
      const result = await sendTelegramMessage(telegramText, telegramLastMessageId || undefined);
      if (result?.message_id) {
        await conn.query(
          `UPDATE support_messages SET telegram_message_id = ? WHERE id = ?`,
          [result.message_id, messageId]
        );
        await conn.query(
          `UPDATE support_conversations SET telegram_last_message_id = ? WHERE id = ?`,
          [result.message_id, conversationId]
        );
      }
    }

    await conn.commit();

    const [conversationRows] = await pool.query(
      `SELECT id, business_id, user_id, user_name, user_email, status, last_message_at, created_at, updated_at
       FROM support_conversations
       WHERE id = ?
       LIMIT 1`,
      [conversationId]
    );
    const [messageRows] = await pool.query(
      `SELECT id, sender, body, created_at
       FROM support_messages
       WHERE id = ?
       LIMIT 1`,
      [messageId]
    );
    res.json({ success: true, conversation: conversationRows?.[0] || null, message: messageRows?.[0] || null });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, error: String(e?.message || e) });
  } finally {
    conn.release();
  }
});

app.get('/api/support/conversations', async (req, res) => {
  const businessId = getBusinessId(req);
  const { isAdmin } = getRequester(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  if (!isAdmin) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  try {
    const [rows] = await pool.query(
      `SELECT
         c.id, c.user_id, c.user_name, c.user_email, c.status, c.last_message_at, c.created_at, c.updated_at,
         m.sender as last_sender, m.body as last_body, m.created_at as last_created_at
       FROM support_conversations c
       LEFT JOIN support_messages m ON m.id = (
         SELECT sm.id FROM support_messages sm WHERE sm.conversation_id = c.id ORDER BY sm.id DESC LIMIT 1
       )
       WHERE c.business_id = ?
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
       LIMIT 200`,
      [businessId]
    );
    res.json({ success: true, conversations: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.get('/api/support/conversations/:id', async (req, res) => {
  const businessId = getBusinessId(req);
  const { isAdmin } = getRequester(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  if (!isAdmin) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  const conversationId = Number(req.params.id);
  if (!Number.isFinite(conversationId)) {
    res.status(400).json({ success: false, error: 'Invalid conversation id' });
    return;
  }
  try {
    const [cRows] = await pool.query(
      `SELECT id, business_id, user_id, user_name, user_email, status, last_message_at, created_at, updated_at
       FROM support_conversations
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [conversationId, businessId]
    );
    if (!cRows.length) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }
    const [mRows] = await pool.query(
      `SELECT id, sender, body, created_at
       FROM support_messages
       WHERE conversation_id = ?
       ORDER BY id ASC
       LIMIT 500`,
      [conversationId]
    );
    res.json({ success: true, conversation: cRows[0], messages: mRows });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/api/support/conversations/:id/messages', async (req, res) => {
  const businessId = getBusinessId(req);
  const { isAdmin } = getRequester(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  if (!isAdmin) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  const conversationId = Number(req.params.id);
  if (!Number.isFinite(conversationId)) {
    res.status(400).json({ success: false, error: 'Invalid conversation id' });
    return;
  }
  const text = String(req.body?.text || '').trim();
  if (!text) {
    res.status(400).json({ success: false, error: 'Missing text' });
    return;
  }
  if (text.length > 3000) {
    res.status(400).json({ success: false, error: 'Message too long' });
    return;
  }
  try {
    const [cRows] = await pool.query(`SELECT id FROM support_conversations WHERE id = ? AND business_id = ? LIMIT 1`, [
      conversationId,
      businessId,
    ]);
    if (!cRows.length) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }
    const [r] = await pool.query(
      `INSERT INTO support_messages (conversation_id, sender, body)
       VALUES (?, ?, ?)`,
      [conversationId, 'agent', text]
    );
    await pool.query(`UPDATE support_conversations SET status = 'Open', last_message_at = NOW() WHERE id = ?`, [conversationId]);
    const [mRows] = await pool.query(`SELECT id, sender, body, created_at FROM support_messages WHERE id = ? LIMIT 1`, [
      r.insertId,
    ]);
    res.json({ success: true, message: mRows?.[0] || null });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/api/support/conversations/:id/status', async (req, res) => {
  const businessId = getBusinessId(req);
  const { isAdmin } = getRequester(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  if (!isAdmin) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  const conversationId = Number(req.params.id);
  const status = String(req.body?.status || '').trim();
  if (!Number.isFinite(conversationId) || !status) {
    res.status(400).json({ success: false, error: 'Missing conversationId/status' });
    return;
  }
  try {
    const [r] = await pool.query(
      `UPDATE support_conversations
       SET status = ?, last_message_at = NOW()
       WHERE id = ? AND business_id = ?`,
      [status, conversationId, businessId]
    );
    res.json({ success: true, affectedRows: r.affectedRows || 0 });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

function extractConversationFromText(text) {
  const s = String(text || '');
  const cmd = s.match(/^\/r\s+(\d+)\s+([\s\S]+)$/i);
  if (cmd) return { conversationId: Number(cmd[1]), body: String(cmd[2]).trim() };
  const m = s.match(/SUP-(\d+)/i);
  if (m) {
    const conversationId = Number(m[1]);
    let body = s.replace(m[0], '').trim();
    if (body.startsWith(':')) body = body.slice(1).trim();
    return { conversationId, body };
  }
  return null;
}

app.post('/webhooks/telegram', async (req, res) => {
  const token = String(req.query.token || '');
  if (!TELEGRAM_WEBHOOK_TOKEN || token !== TELEGRAM_WEBHOOK_TOKEN) {
    res.status(403).json({ ok: false });
    return;
  }
  const update = req.body || {};
  const msg = update.message || update.edited_message || null;
  const text = msg?.text ? String(msg.text) : '';
  if (!msg || !text) {
    res.json({ ok: true });
    return;
  }
  if (msg?.from?.is_bot) {
    res.json({ ok: true });
    return;
  }
  if (String(msg?.chat?.id || '') !== String(TELEGRAM_ADMIN_CHAT_ID || '')) {
    res.json({ ok: true });
    return;
  }

  const replyText = msg?.reply_to_message?.text ? String(msg.reply_to_message.text) : '';
  const parsed = extractConversationFromText(replyText) || extractConversationFromText(text);
  if (!parsed?.conversationId || !parsed.body) {
    res.json({ ok: true });
    return;
  }
  if (!Number.isFinite(parsed.conversationId)) {
    res.json({ ok: true });
    return;
  }

  try {
    const [cRows] = await pool.query(`SELECT id FROM support_conversations WHERE id = ? LIMIT 1`, [parsed.conversationId]);
    if (!cRows.length) {
      res.json({ ok: true });
      return;
    }
    await pool.query(
      `INSERT INTO support_messages (conversation_id, sender, body, telegram_message_id)
       VALUES (?, ?, ?, ?)`,
      [parsed.conversationId, 'agent', parsed.body, msg.message_id || null]
    );
    await pool.query(`UPDATE support_conversations SET status = 'Open', last_message_at = NOW() WHERE id = ?`, [
      parsed.conversationId,
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get('/api/quotes', async (req, res) => {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE quotes SET business_id = ? WHERE business_id IS NULL`, [businessId]);
      const [rows] = await conn.query(
        `SELECT
          q.id, q.customer_name, q.tax_id, q.expiry_date, q.subtotal, q.total, q.status,
          qa.status as approval_status, qa.approver_name, qa.approved_at, qa.signature_path, qa.id_doc_path
         FROM quotes q
         LEFT JOIN quote_approvals qa ON qa.quote_id = q.id
         WHERE q.business_id = ?
         ORDER BY q.created_at DESC
         LIMIT 200`,
        [businessId]
      );
      await conn.commit();
      res.json({ success: true, quotes: rows });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.get('/api/quotes/:id', async (req, res) => {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  const quoteId = Number(req.params.id);
  if (!Number.isFinite(quoteId)) {
    res.status(400).json({ success: false, error: 'Invalid quote id' });
    return;
  }
  try {
    await pool.query(`UPDATE quotes SET business_id = ? WHERE id = ? AND business_id IS NULL`, [businessId, quoteId]);
    const [qRows] = await pool.query(
      `SELECT
        q.id, q.customer_name, q.tax_id, q.expiry_date, q.subtotal, q.total, q.status, q.created_at,
        qa.status as approval_status, qa.approver_name, qa.approved_at, qa.verified_at,
        qa.signature_data, qa.signature_mime,
        qa.id_doc_data, qa.id_doc_mime, qa.id_doc_filename
       FROM quotes q
       LEFT JOIN quote_approvals qa ON qa.quote_id = q.id
       WHERE q.id = ? AND q.business_id = ?
       LIMIT 1`,
      [quoteId, businessId]
    );
    if (!qRows.length) {
      res.status(404).json({ success: false, error: 'Quote not found' });
      return;
    }
    const [items] = await pool.query(
      `SELECT id, description, qty, price FROM quote_items WHERE quote_id = ? ORDER BY id ASC`,
      [quoteId]
    );
    res.json({ success: true, quote: qRows[0], items });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.get('/api/quotes/:id/id-doc', async (req, res) => {
  const quoteId = Number(req.params.id);
  if (!Number.isFinite(quoteId)) {
    res.status(400).json({ success: false, error: 'Invalid quote id' });
    return;
  }
  try {
    const [rows] = await pool.query(
      `SELECT id_doc_data, id_doc_mime, id_doc_filename
       FROM quote_approvals
       WHERE quote_id = ?
       LIMIT 1`,
      [quoteId]
    );
    if (!rows.length) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
    const parsed = parseDataUrl(rows[0].id_doc_data);
    if (!parsed?.base64) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }
    const mime = rows[0].id_doc_mime || parsed.mime || 'application/octet-stream';
    const filename = rows[0].id_doc_filename || `id-doc-${quoteId}`;
    const data = Buffer.from(parsed.base64, 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(data);
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.get('/api/quotes/:id/signature', async (req, res) => {
  const quoteId = Number(req.params.id);
  if (!Number.isFinite(quoteId)) {
    res.status(400).json({ success: false, error: 'Invalid quote id' });
    return;
  }
  try {
    const [rows] = await pool.query(
      `SELECT signature_data, signature_mime
       FROM quote_approvals
       WHERE quote_id = ?
       LIMIT 1`,
      [quoteId]
    );
    if (!rows.length) {
      res.status(404).json({ success: false, error: 'Signature not found' });
      return;
    }
    const parsed = parseDataUrl(rows[0].signature_data);
    if (!parsed?.base64) {
      res.status(404).json({ success: false, error: 'Signature not found' });
      return;
    }
    const mime = rows[0].signature_mime || parsed.mime || 'image/png';
    const data = Buffer.from(parsed.base64, 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="signature-${quoteId}.png"`);
    res.send(data);
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/api/quotes', async (req, res) => {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  const { customerName, taxId, expiry, items } = req.body || {};
  if (!customerName || !expiry || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: 'Missing customerName/expiry/items' });
    return;
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const total = subtotal;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO quotes (business_id, customer_name, tax_id, expiry_date, subtotal, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [businessId, String(customerName), taxId ? String(taxId) : null, String(expiry), subtotal, total, 'Draft']
    );
    const quoteId = r.insertId;
    for (const it of items) {
      await conn.query(
        `INSERT INTO quote_items (quote_id, description, qty, price)
         VALUES (?, ?, ?, ?)`,
        [quoteId, String(it.desc || it.description || ''), Number(it.qty) || 0, Number(it.price) || 0]
      );
    }
    await conn.commit();
    res.json({ success: true, id: quoteId });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, error: String(e?.message || e) });
  } finally {
    conn.release();
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  const quoteId = Number(req.params.id);
  if (!Number.isFinite(quoteId)) {
    res.status(400).json({ success: false, error: 'Invalid quote id' });
    return;
  }
  const { customerName, taxId, expiry, items, status } = req.body || {};
  if (!customerName || !expiry || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: 'Missing customerName/expiry/items' });
    return;
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const total = subtotal;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT id FROM quotes WHERE id = ? AND business_id = ?`, [quoteId, businessId]);
    if (!rows.length) {
      await conn.rollback();
      res.status(404).json({ success: false, error: 'Quote not found' });
      return;
    }
    await conn.query(
      `UPDATE quotes
       SET customer_name = ?, tax_id = ?, expiry_date = ?, subtotal = ?, total = ?, status = ?
       WHERE id = ?`,
      [
        String(customerName),
        taxId ? String(taxId) : null,
        String(expiry),
        subtotal,
        total,
        status ? String(status) : 'Draft',
        quoteId,
      ]
    );
    await conn.query(`DELETE FROM quote_items WHERE quote_id = ?`, [quoteId]);
    for (const it of items) {
      await conn.query(
        `INSERT INTO quote_items (quote_id, description, qty, price)
         VALUES (?, ?, ?, ?)`,
        [quoteId, String(it.desc || it.description || ''), Number(it.qty) || 0, Number(it.price) || 0]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, error: String(e?.message || e) });
  } finally {
    conn.release();
  }
});

app.delete('/api/quotes/:id', async (req, res) => {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  const quoteId = Number(req.params.id);
  if (!Number.isFinite(quoteId)) {
    res.status(400).json({ success: false, error: 'Invalid quote id' });
    return;
  }
  try {
    const [r] = await pool.query(`DELETE FROM quotes WHERE id = ? AND business_id = ?`, [quoteId, businessId]);
    res.json({ success: true, affectedRows: r.affectedRows || 0 });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/api/quotes/:id/status', async (req, res) => {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  const quoteId = Number(req.params.id);
  const { status } = req.body || {};
  if (!Number.isFinite(quoteId) || !status) {
    res.status(400).json({ success: false, error: 'Missing quoteId/status' });
    return;
  }
  try {
    const [r] = await pool.query(`UPDATE quotes SET status = ? WHERE id = ? AND business_id = ?`, [String(status), quoteId, businessId]);
    res.json({ success: true, affectedRows: r.affectedRows || 0 });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/api/quotes/:id/approval-link', async (req, res) => {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  const quoteId = Number(req.params.id);
  if (!Number.isFinite(quoteId)) {
    res.status(400).json({ success: false, error: 'Invalid quote id' });
    return;
  }
  const shortCode = crypto.randomBytes(9).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(shortCode).digest('hex');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT id FROM quotes WHERE id = ? AND business_id = ?`, [quoteId, businessId]);
    if (!rows.length) {
      await conn.rollback();
      res.status(404).json({ success: false, error: 'Quote not found' });
      return;
    }
    await conn.query(
      `INSERT INTO quote_approvals (quote_id, token_hash, short_code, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), short_code = VALUES(short_code), status = VALUES(status)`,
      [quoteId, tokenHash, shortCode, 'LinkCreated']
    );
    await conn.query(`UPDATE quotes SET status = ? WHERE id = ?`, ['Sent', quoteId]);
    await conn.commit();
    res.json({ success: true, code: shortCode });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, error: String(e?.message || e) });
  } finally {
    conn.release();
  }
});

app.get('/public/quotes/:id', async (req, res) => {
  const quoteId = Number(req.params.id);
  const token = String(req.query.token || '');
  if (!Number.isFinite(quoteId) || !token) {
    res.status(400).json({ success: false, error: 'Missing id/token' });
    return;
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  try {
    const [rows] = await pool.query(
      `SELECT q.id, q.customer_name, q.tax_id, q.expiry_date, q.subtotal, q.total, q.status,
              qa.status as approval_status
       FROM quotes q
       JOIN quote_approvals qa ON qa.quote_id = q.id
       WHERE q.id = ? AND qa.token_hash = ?
       LIMIT 1`,
      [quoteId, tokenHash]
    );
    if (!rows.length) {
      res.status(403).json({ success: false, error: 'Invalid token' });
      return;
    }
    const [items] = await pool.query(
      `SELECT description, qty, price FROM quote_items WHERE quote_id = ? ORDER BY id ASC`,
      [quoteId]
    );
    res.json({ success: true, quote: { ...rows[0], items } });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.get('/public/q/:code', async (req, res) => {
  const shortCode = String(req.params.code || '');
  if (!shortCode) {
    res.status(400).json({ success: false, error: 'Missing code' });
    return;
  }
  try {
    const [rows] = await pool.query(
      `SELECT q.id, q.customer_name, q.tax_id, q.expiry_date, q.subtotal, q.total, q.status,
              qa.status as approval_status
       FROM quotes q
       JOIN quote_approvals qa ON qa.quote_id = q.id
       WHERE qa.short_code = ?
       LIMIT 1`,
      [shortCode]
    );
    if (!rows.length) {
      res.status(403).json({ success: false, error: 'Invalid code' });
      return;
    }
    const quoteId = rows[0].id;
    const [items] = await pool.query(
      `SELECT description, qty, price FROM quote_items WHERE quote_id = ? ORDER BY id ASC`,
      [quoteId]
    );
    res.json({ success: true, quote: { ...rows[0], items } });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/public/quotes/:id/submit', async (req, res) => {
  const quoteId = Number(req.params.id);
  const { token, approverName, signatureDataUrl, idDocDataUrl, idDocMime, idDocFilename } = req.body || {};
  if (!Number.isFinite(quoteId) || !token || !approverName || !signatureDataUrl || !idDocDataUrl) {
    res.status(400).json({ success: false, error: 'Missing quoteId/token/approverName/signatureDataUrl/idDocDataUrl' });
    return;
  }
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT quote_id FROM quote_approvals WHERE quote_id = ? AND token_hash = ? LIMIT 1`,
      [quoteId, tokenHash]
    );
    if (!rows.length) {
      await conn.rollback();
      res.status(403).json({ success: false, error: 'Invalid token' });
      return;
    }
    await conn.query(
      `UPDATE quote_approvals
       SET status = ?, approver_name = ?, approved_at = NOW(),
           signature_data = ?, signature_mime = ?,
           id_doc_data = ?, id_doc_mime = ?, id_doc_filename = ?
       WHERE quote_id = ?`,
      [
        'PendingVerification',
        String(approverName),
        String(signatureDataUrl),
        'image/png',
        String(idDocDataUrl),
        idDocMime ? String(idDocMime) : null,
        idDocFilename ? String(idDocFilename) : null,
        quoteId,
      ]
    );
    await conn.query(`UPDATE quotes SET status = ? WHERE id = ?`, ['InReview', quoteId]);
    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, error: String(e?.message || e) });
  } finally {
    conn.release();
  }
});

app.post('/public/q/:code/submit', async (req, res) => {
  const shortCode = String(req.params.code || '');
  const { approverName, signatureDataUrl, idDocDataUrl, idDocMime, idDocFilename } = req.body || {};
  if (!shortCode || !approverName || !signatureDataUrl || !idDocDataUrl) {
    res.status(400).json({ success: false, error: 'Missing code/approverName/signatureDataUrl/idDocDataUrl' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT quote_id FROM quote_approvals WHERE short_code = ? LIMIT 1`,
      [shortCode]
    );
    if (!rows.length) {
      await conn.rollback();
      res.status(403).json({ success: false, error: 'Invalid code' });
      return;
    }
    const quoteId = rows[0].quote_id;
    await conn.query(
      `UPDATE quote_approvals
       SET status = ?, approver_name = ?, approved_at = NOW(),
           signature_data = ?, signature_mime = ?,
           id_doc_data = ?, id_doc_mime = ?, id_doc_filename = ?
       WHERE quote_id = ?`,
      [
        'PendingVerification',
        String(approverName),
        String(signatureDataUrl),
        'image/png',
        String(idDocDataUrl),
        idDocMime ? String(idDocMime) : null,
        idDocFilename ? String(idDocFilename) : null,
        quoteId,
      ]
    );
    await conn.query(`UPDATE quotes SET status = ? WHERE id = ?`, ['InReview', quoteId]);
    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, error: String(e?.message || e) });
  } finally {
    conn.release();
  }
});

app.post('/api/quotes/:id/verify', async (req, res) => {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(400).json({ success: false, error: 'Missing x-business-id' });
    return;
  }
  const quoteId = Number(req.params.id);
  const { verified } = req.body || {};
  if (!Number.isFinite(quoteId) || typeof verified !== 'boolean') {
    res.status(400).json({ success: false, error: 'Missing quoteId/verified' });
    return;
  }
  const status = verified ? 'Verified' : 'Rejected';
  const quoteStatus = verified ? 'Approved' : 'Rejected';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT qa.quote_id
       FROM quote_approvals qa
       JOIN quotes q ON q.id = qa.quote_id
       WHERE qa.quote_id = ? AND q.business_id = ?
       LIMIT 1`,
      [quoteId, businessId]
    );
    if (!rows.length) {
      await conn.rollback();
      res.status(404).json({ success: false, error: 'Approval not found' });
      return;
    }
    await conn.query(
      `UPDATE quote_approvals SET status = ?, verified_at = NOW() WHERE quote_id = ?`,
      [status, quoteId]
    );
    await conn.query(`UPDATE quotes SET status = ? WHERE id = ?`, [quoteStatus, quoteId]);
    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, error: String(e?.message || e) });
  } finally {
    conn.release();
  }
});

try {
  await ensureSchema();
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`aquapos-api listening on :${PORT}`);
  });
} catch (e) {
  console.error('Failed to start aquapos-api:', e);
  process.exit(1);
}
