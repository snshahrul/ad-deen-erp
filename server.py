"""
AD Deen Engineering - ERP Web Server (SQLite)
Port: 8080

Multi-user safe: all data stored per-record in SQLite.
Clients preload cache on startup, send granular writes.
"""

import http.server
import socketserver
import json
import os
import time
import threading
import sqlite3
import datetime
import re

PORT = 8080
DB_FILE = 'erp_data.db'

# --- SQLite ---

def get_db():
    # Allow connections to be used from different threads safely
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=3000")
    return conn


def init_db():
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS records (
        store TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (store, id)
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
    )''')
    conn.commit()
    conn.close()


# --- Online Sessions ---

online_sessions = {}
SESSION_TIMEOUT = 60

# --- In-Memory Cache ---

data_cache = {}
cache_lock = threading.Lock()


def rebuild_cache():
    global data_cache
    conn = get_db()
    rows = conn.execute('SELECT store, id, data FROM records').fetchall()
    cache = {}
    for row in rows:
        s = row['store']
        if s not in cache:
            cache[s] = {}
        cache[s][row['id']] = row['data']
    conn.close()
    with cache_lock:
        data_cache = cache


def get_last_update():
    conn = get_db()
    row = conn.execute("SELECT value FROM meta WHERE key='lastUpdate'").fetchone()
    conn.close()
    return row['value'] if row else datetime.datetime.now().isoformat()


# --- HTTP Handler ---

class ERPHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        self.directory = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args, directory=self.directory, **kwargs)

    # ---- GET ----

    def do_GET(self):
        try:
            if self.path == '/api/data':
                self._send_data()
            elif self.path.startswith('/api/data/'):
                parts = [p for p in self.path.split('/') if p]
                if len(parts) == 3:        # /api/data/{store}
                    self._get_store(parts[2])
                elif len(parts) == 4:       # /api/data/{store}/{id}
                    self._get_record(parts[2], parts[3])
                else:
                    self.send_error(404)
            elif self.path == '/api/health':
                self.send_json({
                    'status': 'running', 'server': 'AD Deen ERP',
                    'port': PORT, 'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                })
            elif self.path.startswith('/api/genId'):
                self._gen_id(self._get_store_from_path())
            elif self.path == '/api/online':
                self._get_online_users()
            else:
                super().do_GET()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass
        except Exception as e:
            print(f"[ERROR] GET {self.path}: {e}")

    # ---- POST ----

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode() if length else '{}'
            data = json.loads(body) if length else {}

            if self.path == '/api/save':
                self._save_data(data)
            elif self.path.startswith('/api/data/'):
                parts = [p for p in self.path.split('/') if p]
                if len(parts) >= 4 and parts[2] and parts[3]:
                    self._update_record(parts[2], parts[3], data)
                elif len(parts) >= 3 and parts[2]:
                    self._add_record(parts[2], data)
                else:
                    self.send_error(404)
            elif self.path.startswith('/api/genId'):
                self._gen_id(self._get_store_from_path())
            elif self.path == '/api/online':
                self._handle_online(data)
            else:
                self.send_error(404)
        except Exception as e:
            print(f"[ERROR] POST {self.path}: {e}")

    # ---- DELETE ----

    def do_DELETE(self):
        try:
            parts = [p for p in self.path.split('/') if p]
            if len(parts) >= 4 and parts[2] and parts[3]:
                self._delete_record(parts[2], parts[3])
            else:
                self.send_error(404)
        except Exception as e:
            print(f"[ERROR] DELETE {self.path}: {e}")

    # ---- PUT (alias for update) ----

    def do_PUT(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode() if length else '{}'
            data = json.loads(body) if length else {}
            parts = [p for p in self.path.split('/') if p]
            if len(parts) >= 4 and parts[2] and parts[3]:
                self._update_record(parts[2], parts[3], data)
            else:
                self.send_error(404)
        except Exception as e:
            print(f"[ERROR] PUT {self.path}: {e}")

    # ---- OPTIONS ----

    def do_OPTIONS(self):
        self._cors_headers()
        self.send_response(200)
        self.end_headers()

    # ---- API Implementations ----

    def _send_data(self):
        """Return full data dump (same format as original flat-file)."""
        conn = get_db()
        rows = conn.execute('SELECT store, data FROM records ORDER BY store').fetchall()
        conn.close()
        result = {}
        for row in rows:
            s = row['store']
            if s not in result:
                result[s] = []
            try:
                result[s].append(json.loads(row['data']))
            except Exception:
                pass
        result['lastUpdate'] = get_last_update()
        self.send_json(result)

    def _get_store(self, store):
        conn = get_db()
        rows = conn.execute('SELECT data FROM records WHERE store=? ORDER BY id', [store]).fetchall()
        conn.close()
        items = []
        for row in rows:
            try:
                items.append(json.loads(row['data']))
            except Exception:
                pass
        self.send_json(items)

    def _get_record(self, store, item_id):
        conn = get_db()
        row = conn.execute('SELECT data FROM records WHERE store=? AND id=?', [store, item_id]).fetchone()
        conn.close()
        if row:
            try:
                self.send_json(json.loads(row['data']))
            except Exception:
                self.send_json({})
        else:
            self.send_json(None)

    def _save_data(self, data):
        """Bulk import from client full-state push."""
        ts = datetime.datetime.now().isoformat()
        conn = get_db()
        for store, items in data.items():
            if store in ('lastUpdate', 'lastSync', '_version', 'lastActivity'):
                continue
            if not isinstance(items, list):
                continue
            for item in items:
                item_id = item.get('id', '')
                if item_id:
                    conn.execute(
                        'INSERT OR REPLACE INTO records VALUES (?,?,?,?)',
                        [store, item_id, json.dumps(item), ts]
                    )
        conn.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', ['lastUpdate', ts])
        conn.commit()
        conn.close()
        rebuild_cache()
        self.send_json({'status': 'success', 'lastUpdate': ts})

    def _add_record(self, store, data):
        ts = datetime.datetime.now().isoformat()
        item_id = data.get('id', '')
        if not item_id:
            item_id = self._gen_id_sync(store)
            data['id'] = item_id
        conn = get_db()
        conn.execute(
            'INSERT OR REPLACE INTO records VALUES (?,?,?,?)',
            [store, item_id, json.dumps(data), ts]
        )
        conn.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', ['lastUpdate', ts])
        conn.commit()
        conn.close()
        rebuild_cache()
        self.send_json({'status': 'success', 'id': item_id, 'data': data})

    def _update_record(self, store, item_id, data):
        ts = datetime.datetime.now().isoformat()
        conn = get_db()
        existing = conn.execute(
            'SELECT data FROM records WHERE store=? AND id=?', [store, item_id]
        ).fetchone()
        if existing:
            try:
                current = json.loads(existing['data'])
            except Exception:
                current = {}
            current.update(data)
            conn.execute(
                'UPDATE records SET data=?, updated_at=? WHERE store=? AND id=?',
                [json.dumps(current), ts, store, item_id]
            )
        else:
            if 'id' not in data:
                data['id'] = item_id
            conn.execute(
                'INSERT INTO records VALUES (?,?,?,?)',
                [store, item_id, json.dumps(data), ts]
            )
        conn.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', ['lastUpdate', ts])
        conn.commit()
        conn.close()
        rebuild_cache()
        self.send_json({'status': 'success'})

    def _delete_record(self, store, item_id):
        ts = datetime.datetime.now().isoformat()
        conn = get_db()
        conn.execute('DELETE FROM records WHERE store=? AND id=?', [store, item_id])
        conn.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', ['lastUpdate', ts])
        conn.commit()
        conn.close()
        rebuild_cache()
        self.send_json({'status': 'success'})

    def _gen_id(self, store):
        if not store:
            store = self._get_store_from_path()
        if not store:
            self.send_json({'error': 'No store specified'})
            return
        new_id = self._gen_id_sync(store)
        self.send_json({'id': new_id, 'store': store})

    def _gen_id_sync(self, store):
        conn = get_db()
        rows = conn.execute('SELECT id FROM records WHERE store=?', [store]).fetchall()
        conn.close()
        name_map = {
            'workOrders': 'WO', 'serviceCalls': 'SC', 'pmContracts': 'PMC',
            'inspections': 'INSP', 'inventory': 'INV', 'assets': 'AST',
            'customers': 'CUST', 'fabOrders': 'FO', 'salesOrders': 'SO',
            'quotations': 'Q', 'invoices': 'INVC', 'accountingEntries': 'ACC',
            'purchaseRequisitions': 'PR', 'purchaseOrders': 'PO',
            'users': 'U', 'documents': 'DOC', 'clientPOs': 'CPO'
        }
        prefix = name_map.get(store, store[0].upper() if store else 'X')
        max_num = 0
        for row in rows:
            parts = row['id'].split('-')
            try:
                n = int(parts[-1])
                if n > max_num:
                    max_num = n
            except ValueError:
                pass
        return f'{prefix}-{max_num + 1:04d}'

    def _get_store_from_path(self):
        """Parse store name from URL path for /api/genId/{store}."""
        m = re.match(r'/api/genId/(.+)', self.path)
        return m.group(1) if m else ''

    # ---- Online ----

    def _get_online_users(self):
        now = time.time()
        expired = [s for s, v in online_sessions.items() if now - v['last_seen'] > SESSION_TIMEOUT]
        for s in expired:
            del online_sessions[s]
        users = [{'username': v['username'], 'name': v['name']} for v in online_sessions.values()]
        self.send_json({'count': len(users), 'users': users})

    def _handle_online(self, data):
        action = data.get('action', 'heartbeat')
        sid = data.get('sessionId', '')
        now = time.time()
        if action == 'register':
            online_sessions[sid] = {
                'username': data.get('username', ''),
                'name': data.get('name', ''),
                'last_seen': now
            }
        elif action == 'heartbeat' and sid in online_sessions:
            online_sessions[sid]['last_seen'] = now
        elif action == 'unregister' and sid in online_sessions:
            del online_sessions[sid]
        expired = [s for s, v in online_sessions.items() if now - v['last_seen'] > SESSION_TIMEOUT]
        for s in expired:
            del online_sessions[s]
        users = [{'username': v['username'], 'name': v['name']} for v in online_sessions.values()]
        self.send_json({'count': len(users), 'users': users})

    # ---- Helpers ----

    def send_json(self, data):
        try:
            self.send_response(200)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        msg = str(args[0]) if args else ''
        if 'favicon.ico' in msg or '.well-known' in msg:
            return
        if any(x in msg for x in ['.html', '.js', '.css', '/api/', '200']):
            print(f"  {args[1] if len(args) > 1 else ''} {msg}")
        elif '404' in str(args):
            if not any(x in msg for x in ['favicon', '.well-known']):
                print(f"  [404] {msg}")


# --- Startup ---

if __name__ == '__main__':
    init_db()
    rebuild_cache()

    print(f"""
{'=' * 55}
   AD DEEN ENGINEERING - ERP WEB SERVER
   SQLite Backend  |  Port {PORT}
{'=' * 55}
""")

    try:
        # Use a threaded server so multiple clients can be served concurrently
        socketserver.ThreadingTCPServer.allow_reuse_address = True
        with socketserver.ThreadingTCPServer(("", PORT), ERPHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[STOP] Server stopped.")
