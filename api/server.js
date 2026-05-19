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

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({ ok: true, db: rows?.[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get('/api/quotes', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        q.id, q.customer_name, q.tax_id, q.expiry_date, q.subtotal, q.total, q.status,
        qa.status as approval_status, qa.approver_name, qa.approved_at, qa.signature_path, qa.id_doc_path
       FROM quotes q
       LEFT JOIN quote_approvals qa ON qa.quote_id = q.id
       ORDER BY q.created_at DESC
       LIMIT 200`
    );
    res.json({ success: true, quotes: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

app.post('/api/quotes', async (req, res) => {
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
      `INSERT INTO quotes (customer_name, tax_id, expiry_date, subtotal, total, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [String(customerName), taxId ? String(taxId) : null, String(expiry), subtotal, total, 'Draft']
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

app.post('/api/quotes/:id/approval-link', async (req, res) => {
  const quoteId = Number(req.params.id);
  if (!Number.isFinite(quoteId)) {
    res.status(400).json({ success: false, error: 'Invalid quote id' });
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT id FROM quotes WHERE id = ?`, [quoteId]);
    if (!rows.length) {
      await conn.rollback();
      res.status(404).json({ success: false, error: 'Quote not found' });
      return;
    }
    await conn.query(
      `INSERT INTO quote_approvals (quote_id, token_hash, status)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), status = VALUES(status)`,
      [quoteId, tokenHash, 'LinkCreated']
    );
    await conn.query(`UPDATE quotes SET status = ? WHERE id = ?`, ['Sent', quoteId]);
    await conn.commit();
    res.json({ success: true, token });
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

app.post('/public/quotes/:id/submit', async (req, res) => {
  const quoteId = Number(req.params.id);
  const { token, approverName } = req.body || {};
  if (!Number.isFinite(quoteId) || !token || !approverName) {
    res.status(400).json({ success: false, error: 'Missing quoteId/token/approverName' });
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
       SET status = ?, approver_name = ?, approved_at = NOW()
       WHERE quote_id = ?`,
      ['PendingVerification', String(approverName), quoteId]
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

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`aquapos-api listening on :${PORT}`);
});

