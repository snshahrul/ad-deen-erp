/**
 * AD Deen Engineering - ERP Web Server (Node.js)
 * 
 * PostgreSQL (when DATABASE_URL set) or SQLite fallback for local dev.
 * Serves static files + REST API + WebSocket on a single port.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// ==================== MIME TYPES ====================
const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.pdf': 'application/pdf',
};

// ==================== DATABASE ABSTRACTION ====================

let db; // Will be PgDb or SqliteDb

// --- PostgreSQL ---
class PgDb {
    constructor() {
        const { Pool } = require('pg');
        this.pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }

    async init() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS records (
                store TEXT NOT NULL,
                id TEXT NOT NULL,
                data JSONB DEFAULT '{}',
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (store, id)
            )
        `);
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS meta (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('[DB] PostgreSQL connected');
    }

    async getAll() {
        const { rows } = await this.pool.query('SELECT store, data FROM records ORDER BY store');
        const result = {};
        for (const row of rows) {
            if (!result[row.store]) result[row.store] = [];
            result[row.store].push(typeof row.data === 'string' ? JSON.parse(row.data) : row.data);
        }
        const meta = await this.pool.query("SELECT value FROM meta WHERE key='lastUpdate'");
        result.lastUpdate = meta.rows[0] ? meta.rows[0].value : new Date().toISOString();
        return result;
    }

    async getStore(store) {
        const { rows } = await this.pool.query('SELECT data FROM records WHERE store=$1 ORDER BY id', [store]);
        return rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
    }

    async getRecord(store, id) {
        const { rows } = await this.pool.query('SELECT data FROM records WHERE store=$1 AND id=$2', [store, id]);
        if (rows.length === 0) return null;
        return typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    }

    async addRecord(store, data) {
        const ts = new Date().toISOString();
        const id = data.id || genIdSync(store);
        data.id = id;
        await this.pool.query(
            'INSERT INTO records (store, id, data, updated_at) VALUES ($1,$2,$3,$4) ON CONFLICT (store, id) DO UPDATE SET data=$3, updated_at=$4',
            [store, id, JSON.stringify(data), ts]
        );
        await this.pool.query("INSERT INTO meta (key, value) VALUES ('lastUpdate', $1) ON CONFLICT (key) DO UPDATE SET value=$1", [ts]);
        return { id, data };
    }

    async updateRecord(store, id, updates) {
        const ts = new Date().toISOString();
        const existing = await this.getRecord(store, id);
        const merged = existing ? Object.assign({}, existing, updates) : Object.assign({ id }, updates);
        await this.pool.query(
            'INSERT INTO records (store, id, data, updated_at) VALUES ($1,$2,$3,$4) ON CONFLICT (store, id) DO UPDATE SET data=$3, updated_at=$4',
            [store, id, JSON.stringify(merged), ts]
        );
        await this.pool.query("INSERT INTO meta (key, value) VALUES ('lastUpdate', $1) ON CONFLICT (key) DO UPDATE SET value=$1", [ts]);
        return merged;
    }

    async deleteRecord(store, id) {
        const ts = new Date().toISOString();
        await this.pool.query('DELETE FROM records WHERE store=$1 AND id=$2', [store, id]);
        await this.pool.query("INSERT INTO meta (key, value) VALUES ('lastUpdate', $1) ON CONFLICT (key) DO UPDATE SET value=$1", [ts]);
    }

    async saveBulk(data) {
        const ts = new Date().toISOString();
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (const [store, items] of Object.entries(data)) {
                if (['lastUpdate', 'lastSync', '_version', 'lastActivity'].includes(store)) continue;
                if (!Array.isArray(items)) continue;
                for (const item of items) {
                    const id = item.id || '';
                    if (!id) continue;
                    await client.query(
                        'INSERT INTO records (store, id, data, updated_at) VALUES ($1,$2,$3,$4) ON CONFLICT (store, id) DO UPDATE SET data=$3, updated_at=$4',
                        [store, id, JSON.stringify(item), ts]
                    );
                }
            }
            await client.query("INSERT INTO meta (key, value) VALUES ('lastUpdate', $1) ON CONFLICT (key) DO UPDATE SET value=$1", [ts]);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

// --- SQLite Fallback (local dev) ---
class SqliteDb {
    constructor() {
        this.dbFile = path.join(__dirname, 'erp_data.db');
        this.sqlite3 = null;
        try {
            this.sqlite3 = require('better-sqlite3');
        } catch (e) {
            console.log('[DB] better-sqlite3 not found, using raw sqlite3 command fallback');
        }
    }

    async init() {
        if (this.sqlite3) {
            this.conn = new this.sqlite3(this.dbFile);
            this.conn.pragma('journal_mode = WAL');
            this.conn.exec(`
                CREATE TABLE IF NOT EXISTS records (
                    store TEXT NOT NULL,
                    id TEXT NOT NULL,
                    data TEXT DEFAULT '{}',
                    updated_at TEXT DEFAULT (datetime('now')),
                    PRIMARY KEY (store, id)
                )
            `);
            this.conn.exec(`
                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            `);
        } else {
            this._useFileFallback = true;
        }
        console.log('[DB] SQLite (' + (this._useFileFallback ? 'file fallback' : 'better-sqlite3') + ')');
    }

    async getAll() {
        if (this._useFileFallback) return this._fileGetAll();
        const rows = this.conn.prepare('SELECT store, data FROM records ORDER BY store').all();
        const result = {};
        for (const row of rows) {
            if (!result[row.store]) result[row.store] = [];
            result[row.store].push(JSON.parse(row.data));
        }
        const meta = this.conn.prepare("SELECT value FROM meta WHERE key='lastUpdate'").get();
        result.lastUpdate = meta ? meta.value : new Date().toISOString();
        return result;
    }

    async getStore(store) {
        if (this._useFileFallback) return this._fileGetStore(store);
        const rows = this.conn.prepare('SELECT data FROM records WHERE store=? ORDER BY id').all(store);
        return rows.map(r => JSON.parse(r.data));
    }

    async getRecord(store, id) {
        if (this._useFileFallback) return this._fileGetRecord(store, id);
        const row = this.conn.prepare('SELECT data FROM records WHERE store=? AND id=?').get(store, id);
        return row ? JSON.parse(row.data) : null;
    }

    async addRecord(store, data) {
        const ts = new Date().toISOString();
        const id = data.id || genIdSync(store);
        data.id = id;
        if (this._useFileFallback) return this._fileAddRecord(store, id, data, ts);
        this.conn.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?,?)').run(store, id, JSON.stringify(data), ts);
        this.conn.prepare("INSERT OR REPLACE INTO meta VALUES (?,?)").run('lastUpdate', ts);
        return { id, data };
    }

    async updateRecord(store, id, updates) {
        const ts = new Date().toISOString();
        if (this._useFileFallback) return this._fileUpdateRecord(store, id, updates, ts);
        const existing = this.conn.prepare('SELECT data FROM records WHERE store=? AND id=?').get(store, id);
        const merged = existing ? Object.assign({}, JSON.parse(existing.data), updates) : Object.assign({ id }, updates);
        this.conn.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?,?)').run(store, id, JSON.stringify(merged), ts);
        this.conn.prepare("INSERT OR REPLACE INTO meta VALUES (?,?)").run('lastUpdate', ts);
        return merged;
    }

    async deleteRecord(store, id) {
        const ts = new Date().toISOString();
        if (this._useFileFallback) return this._fileDeleteRecord(store, id, ts);
        this.conn.prepare('DELETE FROM records WHERE store=? AND id=?').run(store, id);
        this.conn.prepare("INSERT OR REPLACE INTO meta VALUES (?,?)").run('lastUpdate', ts);
    }

    async saveBulk(data) {
        const ts = new Date().toISOString();
        if (this._useFileFallback) return this._fileSaveBulk(data, ts);
        const insert = this.conn.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?,?)');
        const insertMeta = this.conn.prepare("INSERT OR REPLACE INTO meta VALUES (?,?)");
        const tx = this.conn.transaction(() => {
            for (const [store, items] of Object.entries(data)) {
                if (['lastUpdate', 'lastSync', '_version', 'lastActivity'].includes(store)) continue;
                if (!Array.isArray(items)) continue;
                for (const item of items) {
                    if (!item.id) continue;
                    insert.run(store, item.id, JSON.stringify(item), ts);
                }
            }
            insertMeta.run('lastUpdate', ts);
        });
        tx();
    }

    // ---- JSON file fallback (no better-sqlite3) ----
    _getDbJson() {
        const fp = path.join(__dirname, 'db.json');
        try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) { return {}; }
    }
    _saveDbJson(data) {
        fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2));
    }
    _fileGetAll() {
        const data = this._getDbJson();
        data.lastUpdate = data.lastUpdate || new Date().toISOString();
        return data;
    }
    _fileGetStore(store) {
        const data = this._getDbJson();
        return data[store] || [];
    }
    _fileGetRecord(store, id) {
        const items = this._fileGetStore(store);
        return items.find(i => i.id === id) || null;
    }
    _fileAddRecord(store, id, data, ts) {
        const dbData = this._getDbJson();
        if (!dbData[store]) dbData[store] = [];
        const idx = dbData[store].findIndex(i => i.id === id);
        if (idx >= 0) dbData[store][idx] = data;
        else dbData[store].unshift(data);
        dbData.lastUpdate = ts;
        this._saveDbJson(dbData);
        return { id, data };
    }
    _fileUpdateRecord(store, id, updates, ts) {
        const dbData = this._getDbJson();
        if (!dbData[store]) dbData[store] = [];
        const idx = dbData[store].findIndex(i => i.id === id);
        let merged;
        if (idx >= 0) {
            merged = Object.assign({}, dbData[store][idx], updates);
            dbData[store][idx] = merged;
        } else {
            merged = Object.assign({ id }, updates);
            dbData[store].unshift(merged);
        }
        dbData.lastUpdate = ts;
        this._saveDbJson(dbData);
        return merged;
    }
    _fileDeleteRecord(store, id, ts) {
        const dbData = this._getDbJson();
        if (dbData[store]) {
            dbData[store] = dbData[store].filter(i => i.id !== id);
        }
        dbData.lastUpdate = ts;
        this._saveDbJson(dbData);
    }
    _fileSaveBulk(data, ts) {
        const dbData = this._getDbJson();
        for (const [store, items] of Object.entries(data)) {
            if (['lastUpdate', 'lastSync', '_version', 'lastActivity'].includes(store)) continue;
            if (!Array.isArray(items)) continue;
            if (!dbData[store]) dbData[store] = [];
            for (const item of items) {
                if (!item.id) continue;
                const idx = dbData[store].findIndex(i => i.id === item.id);
                if (idx >= 0) dbData[store][idx] = item;
                else dbData[store].unshift(item);
            }
        }
        dbData.lastUpdate = ts;
        this._saveDbJson(dbData);
    }
}

// ==================== ID GENERATION ====================
const PREFIX_MAP = {
    workOrders: 'WO', serviceCalls: 'SC', pmContracts: 'PMC',
    inspections: 'INSP', inventory: 'INV', assets: 'AST',
    customers: 'CUST', fabOrders: 'FO', salesOrders: 'SO',
    quotations: 'Q', invoices: 'INVC', accountingEntries: 'ACC',
    purchaseRequisitions: 'PR', purchaseOrders: 'PO',
    users: 'U', documents: 'DOC', clientPOs: 'CPO', equipment: 'EQ'
};

function genIdSync(store) {
    const prefix = PREFIX_MAP[store] || (store ? store.charAt(0).toUpperCase() : 'X');
    return prefix + '-' + String(Math.floor(Math.random() * 9000) + 1000);
}

// ==================== AUTH (simple token) ====================
const sessions = new Map();

function createToken(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { userId, created: Date.now() });
    return token;
}

function validateToken(token) {
    if (!token) return null;
    const s = sessions.get(token);
    if (!s) return null;
    // 24h expiry
    if (Date.now() - s.created > 24 * 60 * 60 * 1000) {
        sessions.delete(token);
        return null;
    }
    return s.userId;
}

// ==================== HTTP SERVER ====================
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
        // --- API Routes ---
        if (pathname === '/api/login' && req.method === 'POST') {
            return handleLogin(req, res);
        }
        if (pathname === '/api/data' && req.method === 'GET') {
            return handleGetAll(req, res);
        }
        if (pathname === '/api/save' && req.method === 'POST') {
            return handleSaveBulk(req, res);
        }
        if (pathname.match(/^\/api\/data\/[^/]+$/) && req.method === 'GET') {
            const store = pathname.split('/')[3];
            return handleGetStore(req, res, store);
        }
        if (pathname.match(/^\/api\/data\/[^/]+\/[^/]+$/) && req.method === 'GET') {
            const parts = pathname.split('/');
            return handleGetRecord(req, res, parts[3], decodeURIComponent(parts[4]));
        }
        if (pathname.match(/^\/api\/data\/[^/]+$/) && req.method === 'POST') {
            const store = pathname.split('/')[3];
            return handleAddRecord(req, res, store);
        }
        if (pathname.match(/^\/api\/data\/[^/]+\/[^/]+$/) && req.method === 'PUT') {
            const parts = pathname.split('/');
            return handleUpdateRecord(req, res, parts[3], decodeURIComponent(parts[4]));
        }
        if (pathname.match(/^\/api\/data\/[^/]+\/[^/]+$/) && req.method === 'DELETE') {
            const parts = pathname.split('/');
            return handleDeleteRecord(req, res, parts[3], decodeURIComponent(parts[4]));
        }
        if (pathname === '/api/health') {
            return sendJson(res, { status: 'running', server: 'AD Deen ERP', port: PORT, timestamp: new Date().toISOString() });
        }

        // --- Static Files ---
        return serveStatic(req, res, pathname);
    } catch (e) {
        console.error(`[ERROR] ${req.method} ${pathname}:`, e.message);
        sendJson(res, { error: 'Internal server error' }, 500);
    }
});

// ==================== API HANDLERS ====================

async function handleLogin(req, res) {
    const body = await readBody(req);
    const { username, password } = body;
    if (!username || !password) return sendJson(res, { error: 'Username and password required' }, 400);

    const data = await db.getAll();
    const users = data.users || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return sendJson(res, { error: 'Invalid credentials' }, 401);

    const token = createToken(user.id);
    const safeUser = { id: user.id, username: user.username, name: user.name, role: user.role, avatar: user.avatar || user.name.charAt(0).toUpperCase() };
    sendJson(res, { token, user: safeUser });
}

async function handleGetAll(req, res) {
    const data = await db.getAll();
    sendJson(res, data);
}

async function handleSaveBulk(req, res) {
    const body = await readBody(req);
    await db.saveBulk(body);
    const ts = new Date().toISOString();
    sendJson(res, { status: 'success', lastUpdate: ts });
}

async function handleGetStore(req, res, store) {
    const items = await db.getStore(store);
    sendJson(res, items);
}

async function handleGetRecord(req, res, store, id) {
    const item = await db.getRecord(store, id);
    sendJson(res, item);
}

async function handleAddRecord(req, res, store) {
    const body = await readBody(req);
    if (!body.id) body.id = genIdSync(store);
    const result = await db.addRecord(store, body);
    sendJson(res, { status: 'success', item: result.data });
}

async function handleUpdateRecord(req, res, store, id) {
    const body = await readBody(req);
    const merged = await db.updateRecord(store, id, body);
    sendJson(res, { status: 'success', data: merged });
}

async function handleDeleteRecord(req, res, store, id) {
    await db.deleteRecord(store, id);
    sendJson(res, { status: 'success' });
}

// ==================== STATIC FILE SERVER ====================

function serveStatic(req, res, pathname) {
    if (pathname === '/') pathname = '/ADDeen_ERP.html';

    const filePath = path.join(__dirname, pathname);

    // Security: prevent path traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Try .html extension
            if (!path.extname(filePath)) {
                const htmlPath = filePath + '.html';
                if (fs.existsSync(htmlPath)) {
                    return serveFile(res, htmlPath);
                }
            }
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        serveFile(res, filePath);
    });
}

function serveFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error reading file');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

// ==================== HELPERS ====================

function sendJson(res, data, status) {
    res.writeHead(status || 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { resolve({}); }
        });
        req.on('error', reject);
    });
}

// ==================== STARTUP ====================

async function start() {
    // Initialize database
    if (DATABASE_URL) {
        console.log('[DB] PostgreSQL detected — using DATABASE_URL');
        db = new PgDb();
    } else {
        console.log('[DB] No DATABASE_URL — using SQLite/file fallback');
        db = new SqliteDb();
    }
    await db.init();

    server.listen(PORT, () => {
        console.log(`
${'='.repeat(55)}
   AD DEEN ENGINEERING - ERP WEB SERVER
   ${DATABASE_URL ? 'PostgreSQL' : 'SQLite/File'} Backend  |  Port ${PORT}
${'='.repeat(55)}
`);
    });
}

start().catch(e => {
    console.error('[FATAL]', e);
    process.exit(1);
});
