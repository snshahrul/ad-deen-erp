// ========================================================================
// AD Deen Engineering ERP System - Application Script
// ========================================================================

// ===== AI CHAT ASSISTANT =====

// ===== CLAUDE AI CONFIGURATION =====
const CLAUDE_CONFIG = {
    apiKey: localStorage.getItem('claude_api_key') || '',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1500,
    temperature: 0.3,
};

let useClaudeAPI = CLAUDE_CONFIG.apiKey ? true : false;
let conversationHistory = [];

// ===== TOGGLE PANEL (Click robot to open/close) =====
function toggleAiChat() {
    const panel = document.getElementById('aiChatPanel');
    const toggleBtn = document.getElementById('aiChatToggle');
    const isOpen = panel.style.display === 'flex';

    if (isOpen) {
        // Close panel
        panel.style.display = 'none';
        toggleBtn.style.display = 'flex'; // Show robot button
    } else {
        // Open panel
        panel.style.display = 'flex';
        document.getElementById('aiChatInput').focus();
        document.getElementById('aiNotifBadge').style.display = 'none';
    }
}

// ===== CLEAR CHAT =====
function clearAiChat() {
    conversationHistory = [];
    const messages = document.getElementById('aiChatMessages');
    messages.innerHTML = `
        <div class="ai-message ai-bot">
            <div class="ai-avatar">🤖</div>
            <div class="ai-bubble">Chat cleared. How can I help you?</div>
        </div>`;
}

// ===== API KEY MANAGEMENT =====
function setClaudeApiKey() {
    const currentKey = CLAUDE_CONFIG.apiKey ? CLAUDE_CONFIG.apiKey.substring(0, 10) + '...' : 'None';
    const key = prompt('Enter your Claude API Key:\n\nCurrent: ' + currentKey + '\n\nGet key at: https://console.anthropic.com\n\nLeave empty to use offline mode.', '');

    if (key === null) return; // Cancel

    if (key.trim()) {
        CLAUDE_CONFIG.apiKey = key.trim();
        localStorage.setItem('claude_api_key', key.trim());
        useClaudeAPI = true;
        updateAiModeLabel();
        showToast('✅ Claude API key saved!', 'success');
    } else {
        CLAUDE_CONFIG.apiKey = '';
        localStorage.removeItem('claude_api_key');
        useClaudeAPI = false;
        updateAiModeLabel();
        showToast('🖥️ Switched to offline mode', 'info');
    }
}
// Update the toggleAiChat function to also update robot color
function updateAiModeLabel() {
    const label = document.getElementById('aiModeLabel');
    const robotBtn = document.getElementById('aiChatToggle');
    const dot = document.getElementById('aiStatusDot');

    if (useClaudeAPI && CLAUDE_CONFIG.apiKey) {
        if (label) label.textContent = 'Claude AI Mode (Online)';
        if (robotBtn) {
            robotBtn.style.background = 'linear-gradient(135deg,#8b5cf6,#6366f1)';
            robotBtn.style.boxShadow = '0 8px 32px rgba(139,92,246,0.6)';
        }
        if (dot) {
            dot.style.background = '#10b981';
            dot.style.boxShadow = '0 0 10px rgba(16,185,129,0.6)';
            dot.title = 'Claude AI - Online';
        }
    } else {
        if (label) label.textContent = 'Offline Mode (Local AI)';
        if (robotBtn) {
            robotBtn.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
            robotBtn.style.boxShadow = '0 8px 32px rgba(245,158,11,0.4)';
        }
        if (dot) {
            dot.style.background = '#f59e0b';
            dot.style.boxShadow = '0 0 10px rgba(245,158,11,0.6)';
            dot.title = 'Offline - Local AI';
        }
    }
}
// ===== TOGGLE AI MODE =====
function toggleAIMode() {
    if (!CLAUDE_CONFIG.apiKey) {
        showToast('⚠️ Set your Claude API key first! Click Key button.', 'warning');
        return;
    }
    useClaudeAPI = !useClaudeAPI;
    updateAiModeLabel();
    showToast(useClaudeAPI ? '🤖 Using Claude AI' : '🖥️ Using Offline Mode', 'info');
}

// ===== QUICK QUESTION =====
function askQuickQuestion(question) {
    // Open panel if closed
    const panel = document.getElementById('aiChatPanel');
    if (panel.style.display !== 'flex') {
        panel.style.display = 'flex';
    }
    document.getElementById('aiChatInput').value = question;
    sendAiMessage();
}

// ===== TYPING INDICATOR =====
function addTypingIndicator() {
    const messages = document.getElementById('aiChatMessages');
    const typing = document.createElement('div');
    typing.className = 'ai-message ai-bot';
    typing.id = 'aiTypingIndicator';
    typing.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-bubble ai-typing">
            <span></span><span></span><span></span>
        </div>`;
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
}

function removeTypingIndicator() {
    const typing = document.getElementById('aiTypingIndicator');
    if (typing) typing.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatAiResponse(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n- /g, '\n• ')
        .replace(/\n/g, '<br>')
        .replace(/`(.*?)`/g, '<code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:12px;">$1</code>');
}

function displayAiResponse(response) {
    const messages = document.getElementById('aiChatMessages');
    messages.innerHTML += `
        <div class="ai-message ai-bot">
            <div class="ai-avatar">🤖</div>
            <div class="ai-bubble">${formatAiResponse(response)}</div>
        </div>`;
    messages.scrollTop = messages.scrollHeight;
}

// ===== MAIN SEND FUNCTION =====
async function sendAiMessage() {
    const input = document.getElementById('aiChatInput');
    const msg = input.value.trim();
    if (!msg) return;

    const messages = document.getElementById('aiChatMessages');
    messages.innerHTML += `
        <div class="ai-message ai-user">
            <div class="ai-avatar">👤</div>
            <div class="ai-bubble">${escapeHtml(msg)}</div>
        </div>`;
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    conversationHistory.push({ role: 'user', content: msg });
    addTypingIndicator();
    messages.scrollTop = messages.scrollHeight;

    try {
        let response;
        if (useClaudeAPI && CLAUDE_CONFIG.apiKey) {
            response = await callClaudeAPI(msg);
        } else {
            await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800));
            response = generateAiResponse(msg);
        }
        removeTypingIndicator();
        displayAiResponse(response);
    } catch (error) {
        console.log('API Error:', error.message);
        removeTypingIndicator();
        const localResponse = generateAiResponse(msg);
        displayAiResponse(localResponse);
    }
}

// ===== CLAUDE API CALL =====
async function callClaudeAPI(userMessage) {
    const erpData = getErpSummary();
    const systemPrompt = `You are an AI assistant for AD Deen Engineering's ERP system. You specialize in pressure vessel fabrication, boilers, and industrial equipment per ASME standards.

Current ERP Data:
${erpData}

You can answer questions about engineering (ASME codes, materials, welding, NDT, calculations), regulations (Malaysian DOSH/JKKP), ERP data (work orders, inventory, quality, sales), and processes. Be concise but thorough. Use bullet points.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_CONFIG.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: CLAUDE_CONFIG.model,
            max_tokens: CLAUDE_CONFIG.maxTokens,
            temperature: CLAUDE_CONFIG.temperature,
            system: systemPrompt,
            messages: conversationHistory.slice(-10)
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const claudeResponse = data.content[0].text;
    conversationHistory.push({ role: 'assistant', content: claudeResponse });
    return claudeResponse;
}

// ===== GET ERP DATA SUMMARY =====
function getErpSummary() {
    const workOrders = DB.get('workOrders');
    const inventory = DB.get('inventory');
    const inspections = DB.get('inspections');
    const salesOrders = DB.get('salesOrders');
    const fabOrders = DB.get('fabOrders');
    const customers = DB.get('customers');

    const activeWO = workOrders.filter(w => w.status !== 'Closed' && w.status !== 'Completed');
    const lowStock = inventory.filter(i => i.status === 'Low Stock');
    const pendingInsp = inspections.filter(i => !i.result.includes('Pass'));

    return `Active Work Orders: ${activeWO.length} | Low Stock: ${lowStock.length} | Pending Inspections: ${pendingInsp.length} | Customers: ${customers.length} | Sales Orders: ${salesOrders.length} | Fab Orders: ${fabOrders.length}`;
}

// ===== LOCAL AI =====
function generateAiResponse(msg) {
    const q = msg.toLowerCase();
    const data = {
        workOrders: DB.get('workOrders'),
        inventory: DB.get('inventory'),
        inspections: DB.get('inspections'),
        customers: DB.get('customers'),
        fabOrders: DB.get('fabOrders'),
        salesOrders: DB.get('salesOrders'),
    };

    if (q.includes('work order') || q.includes('active job')) {
        const active = data.workOrders.filter(w => w.status !== 'Closed' && w.status !== 'Completed');
        return `📋 <strong>${active.length}</strong> active work orders<br>🔧 ${active.filter(w=>w.status==='In Progress').length} in progress | 🆕 ${active.filter(w=>w.status==='New').length} new | ⚠️ ${active.filter(w=>w.priority==='High'||w.priority==='Critical').length} high priority`;
    }
    if (q.includes('inventory') || q.includes('stock')) {
        const low = data.inventory.filter(i => i.status === 'Low Stock');
        return `📦 ${data.inventory.length} items | ⚠️ ${low.length} low stock: ${low.map(i=>i.code).join(', ') || 'None'}`;
    }
    if (q.includes('qa') || q.includes('quality') || q.includes('inspection')) {
        const passed = data.inspections.filter(i => i.result.includes('Pass')).length;
        return `✅ ${data.inspections.length} inspections | ${passed} passed (${data.inspections.length?Math.round(passed/data.inspections.length*100):0}%)`;
    }
    if (q.includes('revenue') || q.includes('sales')) {
        const rev = data.salesOrders.filter(s=>s.status==='Completed').reduce((s,o)=>s+(o.amount||0),0);
        return `💰 Revenue: <strong>RM ${rev.toLocaleString()}</strong> | ${data.salesOrders.length} orders`;
    }
    if (q.includes('fab')) {
        const active = data.fabOrders.filter(f=>f.status!=='Completed'&&f.status!=='Closed');
        return `🏭 ${data.fabOrders.length} fab orders | ${active.length} active`;
    }
    if (q.includes('dosh') || q.includes('jkkp')) {
        return `🏛️ <strong>DOSH/JKKP:</strong> FMA 1967 | All pressure vessels must be registered | CF valid 15 months | Major repairs need prior approval`;
    }
    return `🤖 I can help with: Work Orders | Inventory | Quality | Sales | Fabrication | DOSH Regulations | ASME Codes | Try typing "active work orders" or "low stock"`;
}

// ===== NOTIFICATIONS =====
function checkAiNotifications() {
    const lowStock = DB.get('inventory').filter(i => i.status === 'Low Stock').length;
    const pendingQA = DB.get('inspections').filter(i => !i.result.includes('Pass')).length;
    const urgentWO = DB.get('workOrders').filter(w => w.priority === 'Critical' && w.status !== 'Closed').length;
    const totalAlerts = lowStock + pendingQA + urgentWO;
    const badge = document.getElementById('aiNotifBadge');

    if (totalAlerts > 0 && document.getElementById('aiChatPanel').style.display !== 'flex') {
        badge.style.display = 'block';
        badge.textContent = totalAlerts;
    }
}

setInterval(checkAiNotifications, 60000);
setTimeout(checkAiNotifications, 5000);

console.log('🤖 AI Assistant Ready — Click robot to open');


// ===== MAIN APPLICATION =====

        // ========================================================================
        //  DATABASE LAYER - localStorage persistence with CRUD operations
        // ========================================================================
        // ==================== PERMISSION SYSTEM ====================
        var PERMISSION_RULES = {
            'Administrator': '*',
            'Manager': {
                read: '*',
                create: '*',
                update: '*',
                delete: '*',
            },
            'Engineer': {
                read: '*',
                create: '*',
                updateOwn: '*',
                delete: [],
            },
            'Inspector': {
                read: ['inspections', 'workOrders', 'fabOrders', 'documents', 'customers'],
                create: [],
                update: ['inspections'],
                delete: [],
            },
            'Staff': {
                read: '*',
                create: ['workOrders', 'serviceCalls', 'jobProgress'],
                update: [],
                delete: [],
            }
        };

        function canUser(action, store, record) {
            var user = Auth && Auth.getUser();
            if (!user) return false;
            var perms = PERMISSION_RULES[user.role];
            if (!perms) return false;
            if (perms === '*') return true;
            var permVal = perms[action];
            if (permVal === '*') return true;
            // Check ownership for updateOwn/deleteOwn
            if (action === 'update') {
                var allowedOwn = perms['updateOwn'];
                if (allowedOwn === '*' || (Array.isArray(allowedOwn) && (allowedOwn.indexOf('*') !== -1 || allowedOwn.indexOf(store) !== -1))) {
                    if (record && record.createdBy && record.createdBy.id === user.id) return true;
                    // If regular 'update' also allows this store, bypass ownership
                    if (Array.isArray(perms['update']) && (perms['update'].indexOf('*') !== -1 || perms['update'].indexOf(store) !== -1)) return true;
                    return false;
                }
                if (Array.isArray(permVal) && (permVal.indexOf('*') !== -1 || permVal.indexOf(store) !== -1)) return true;
                return false;
            }
            if (action === 'delete') {
                var allowedOwn = perms['deleteOwn'];
                if (allowedOwn === '*' || (Array.isArray(allowedOwn) && (allowedOwn.indexOf('*') !== -1 || allowedOwn.indexOf(store) !== -1))) {
                    if (record && record.createdBy && record.createdBy.id === user.id) return true;
                    if (Array.isArray(perms['delete']) && (perms['delete'].indexOf('*') !== -1 || perms['delete'].indexOf(store) !== -1)) return true;
                    return false;
                }
                if (Array.isArray(permVal) && (permVal.indexOf('*') !== -1 || permVal.indexOf(store) !== -1)) return true;
                return false;
            }
            return Array.isArray(permVal) && (permVal.indexOf('*') !== -1 || permVal.indexOf(store) !== -1);
        }

        // ==================== DATABASE CLASS ====================
        class AppDatabase {
            constructor() {
                this.DB_KEY = 'ad_deen_erp_db';
                this.DB_VERSION = 2;
                this._token = localStorage.getItem('ad_deen_erp_token') || null;
                this._serverUrl = window.location.origin;
                this._cache = {};
                this._initCache();
            }

            _initCache() {
                try {
                    const raw = localStorage.getItem(this.DB_KEY);
                    if (raw) {
                        const saved = JSON.parse(raw);
                        if (saved && saved._version === this.DB_VERSION) {
                            this._cache = saved;
                            return;
                        }
                        if (saved && typeof saved === 'object') {
                            this._cache = saved;
                            this._cache._version = this.DB_VERSION;
                            this._saveBackup();
                            return;
                        }
                    }
                } catch(e) {}
                this._cache = {
                    workOrders: [], serviceCalls: [], pmContracts: [], inspections: [],
                    inventory: [],
                    salesOrders: [], clientPOs: [], purchaseRequisitions: [], purchaseOrders: [],
                    assets: [],
                    customers: [],
                    equipment: [],
                    fabOrders: [], invoices: [], quotations: [], accountingEntries: [], jobCosting: [], jobProgress: [],
                    documents: [],
                    users: [],
                    _version: this.DB_VERSION
                };
                this._saveBackup();
            }

            setToken(token) {
                this._token = token;
                if (token) localStorage.setItem('ad_deen_erp_token', token);
                else localStorage.removeItem('ad_deen_erp_token');
            }

            _apiHeaders() {
                var h = { 'Content-Type': 'application/json' };
                if (this._token) h['x-auth-token'] = this._token;
                return h;
            }

            async _fetchApi(path, options) {
                try {
                    var url = this._serverUrl + path;
                    var opts = options || {};
                    opts.headers = Object.assign(this._apiHeaders(), opts.headers || {});
                    var res = await fetch(url, opts);
                    if (!res.ok) {
                        var errBody = await res.json().catch(function() { return {}; });
                        if (res.status === 401) { this._token = null; localStorage.removeItem('ad_deen_erp_token'); localStorage.removeItem('ad_deen_erp_session'); } else { console.warn('[DB] API error ' + res.status + ' for ' + path + ': ' + (errBody.error || res.statusText)); }
                        return null;
                    }
                    return await res.json();
                } catch (e) {
                    console.warn('[DB] Server unreachable for ' + path + ', using local cache');
                    return null;
                }
            }

            async init() {
                // Try to sync from server
            if (this._token) {
                var data = await this._fetchApi('/api/data');
                if (data) {
                    Object.keys(data).forEach(function(key) {
                        if (key === '_version' || key === 'lastUpdate') return;
                        if (Array.isArray(data[key])) {
                            this._cache[key] = JSON.parse(JSON.stringify(data[key]));
                        }
                    }.bind(this));
                    this._cache._version = this.DB_VERSION;
                    if (data.lastUpdate) this._cache.lastUpdate = data.lastUpdate;
                    this._saveBackup();
                    console.log('[DB] Synced from server');
                } else {
                    
            }       
                    // Server offline — try to seed local defaults if empty
            
                    if (!this._cache.users || this._cache.users.length === 0) {
                        this._cache.users = [
                            { id: 'U1', username: 'admin', password: 'admin123', name: 'Shahrul Azmi Salim Shah', role: 'Administrator', avatar: 'SA', email: 'design.addeen@sh-shahrul.com', phone: '+601139794166' },
                            { id: 'U2', username: 'user', password: 'user123', name: 'Sollahuddin Ilias', role: 'Manager', avatar: 'SI', firstLogin: true, email: 'manager.addeen@sn-shahrul.com', phone: '+60193838699' },
                            { id: 'U3', username: 'yazid', password: 'yazid123', name: 'Mohd Yazid', role: 'Engineer', avatar: 'MY', firstLogin: true },
                        ];
                        this._saveBackup();
                    }
                    if (this._cache.inventory.length === 0) {
                        this._cache.inventory = [
                            { code: 'TUBE-2IN-SMLS', desc: 'Boiler Tube 2" OD Seamless SA-178', lot: 'LOT-2026-A001', location: 'WH-A-01', qty: 45, min: 20, unit: 'meters', status: 'In Stock', woLink: 'WO-2026-0001' },
                            { code: 'ELEC-E7018-3.2', desc: 'Welding Electrode E7018 3.2mm', lot: 'LOT-2026-B001', location: 'WH-B-03', qty: 8, min: 50, unit: 'kg', status: 'Low Stock', woLink: 'WO-2026-0001' },
                        ];
                        this._saveBackup();
                    }
                    if (this._cache.customers.length === 0) {
                        this._cache.customers = [
                            { id: 'CUST-001', name: 'Petronas Refinery', contact: 'Ahmad Faizal', email: 'afaizal@petronas.com.my', phone: '+60-3-1234-5678', address: 'Kerteh, Terengganu', company: 'Petronas', type: 'Corporate', status: 'Active', since: '2019-06-15' },
                            { id: 'CUST-002', name: 'Shell Malaysia', contact: 'Linda Tan', email: 'linda.tan@shell.com', phone: '+60-3-8765-4321', address: 'Port Dickson, Negeri Sembilan', company: 'Shell', type: 'Corporate', status: 'Active', since: '2020-03-22' },
                        ];
                        this._saveBackup();
                    }
                    if (this._cache.assets.length === 0) {
                        this._cache.assets = [
                            { id: 'EQ-001', name: 'Welding Machine Miller 350', lastService: '2026-01-05', nextDue: '2026-07-05', status: 'Operational' },
                            { id: 'EQ-002', name: 'Hydrostatic Test Pump', lastService: '2025-12-15', nextDue: '2026-03-15', status: 'Due Soon' },
                        ];
                        this._saveBackup();
                    }
                    if (this._cache.documents.length === 0) {
                        this._cache.documents = [
                            { id: 'DOC-0001', name: 'Air Receiver GA Drawing Rev 4', type: 'Drawing', category: 'ASME', version: '4.0', description: 'General arrangement drawing for 2000L air receiver', tags: 'ASME, UV-Stamp, Pressure Vessel', status: 'Approved', createdAt: '2026-01-15T08:00:00Z' },
                        ];
                        this._saveBackup();
                    }
                    console.log('[DB] Server offline, using local cache');
                }
                return this._cache;
            }

            _saveBackup() {
                try { localStorage.setItem(this.DB_KEY, JSON.stringify(this._cache)); } catch(e) {}
            }

            get(store) {
                return this._cache[store] || [];
            }

            getById(store, id, field) {
                if (field === undefined) field = 'id';
                return this.get(store).find(function(item) { return item[field] === id; }) || null;
            }

            async add(store, item) {
                if (!this._cache[store]) this._cache[store] = [];
                // Try server first
                var result = await this._fetchApi('/api/data/' + store, {
                    method: 'POST',
                    body: JSON.stringify(item)
                });
                if (result && result.item) {
                    // Use server response (has createdBy etc)
                    this._cache[store].unshift(result.item);
                } else {
                    // Server offline — add locally
                    this._cache[store].unshift(item);
                }
                this._saveBackup();
                return this._cache[store][0];
            }

            async update(store, id, updates, field) {
                if (field === undefined) field = 'id';
                if (!this._cache[store]) return null;
                var result = await this._fetchApi('/api/data/' + store + '/' + encodeURIComponent(id), {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                });
                var idx = this._cache[store].findIndex(function(item) { return item[field] === id; });
                if (idx === -1) return null;
                this._cache[store][idx] = Object.assign({}, this._cache[store][idx], updates);
                this._saveBackup();
                return this._cache[store][idx];
            }

            async delete(store, id, field) {
                if (field === undefined) field = 'id';
                if (!this._cache[store]) return false;
                await this._fetchApi('/api/data/' + store + '/' + encodeURIComponent(id), {
                    method: 'DELETE'
                });
                var len = this._cache[store].length;
                this._cache[store] = this._cache[store].filter(function(item) { return item[field] !== id; });
                if (this._cache[store].length === len) return false;
                this._saveBackup();
                return true;
            }

            reset(store) {
                this._cache[store] = [];
                this._saveBackup();
            }

            async loginViaServer(username, password) {
                var result = await this._fetchApi('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ username: username, password: password })
                });
                if (result && result.token) {
                    this.setToken(result.token);
                    // Sync full DB after login
                    await this.init();
                    return result.user;
                }
                return null;
            }

            authenticate(username, password) {
                var users = this.get('users');
                return users.find(function(u) { return u.username === username && u.password === password; }) || null;
            }

            genId(store) {
                var items = this.get(store);
                var prefix = store.charAt(0).toUpperCase();
                var maxNum = 0;
                items.forEach(function(item) {
                    if (item.id) {
                        var parts = item.id.split('-');
                        var num = parseInt(parts[parts.length - 1]);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                });
                return prefix + '-' + String(maxNum + 1).padStart(4, '0');
            }

            getAll(store) {
                return this.get(store);
            }
        }
        // ==================== OWNER-BASED PERMISSION SYSTEM ====================

        function getCurrentUser() {
            try {
                var session = JSON.parse(localStorage.getItem('ad_deen_erp_session') || '{}');
                if (session.username) {
                    return session;
                }
            } catch(e) {}
            return null;
        }

        function isOwner(record) {
            var user = getCurrentUser();
            if (!user || !record) return false;
            return record.createdBy === user.username ||
                record.createdBy === user.id ||
                record.assignedTo === user.username ||
                record.assignedTo === user.id ||
                record.raisedBy === user.username ||
                record.requestedBy === user.username;
        }

        function isAdmin() {
            var user = getCurrentUser();
            return user && user.role === 'Administrator';
        }

        function isManager() {
            var user = getCurrentUser();
            return user && (user.role === 'Administrator' || user.role === 'Manager');
        }

        function canEdit(record) {
            if (!record) return false;
            if (isAdmin() || isManager()) return true;
            return isOwner(record);
        }

        function canDeleteRecord(record) {
            if (!record) return false;
            if (isAdmin()) return true;
            if (isOwner(record)) {
                var status = record.status || '';
                if (status === 'Approved' || status === 'Closed' || status === 'Completed') return false;
                return true;
            }
            return false;
        }

        function canChangeStatus(record) {
            if (!record) return false;
            if (isAdmin() || isManager()) return true;
            return isOwner(record);
        }

        function canAssign() {
            return isAdmin() || isManager();
        }

        // ==================== SAVE WITH OWNERSHIP ====================

        function saveWithOwner(store, data) {
            var user = getCurrentUser();
            if (!user) { showToast('🔒 Please login first'); return null; }
            
            data.createdBy = user.username;
            data.createdByName = user.name;
            data.createdAt = new Date().toISOString();
            data.lastModifiedBy = user.username;
            data.lastModifiedAt = new Date().toISOString();
            if (!data.assignedTo) { data.assignedTo = user.username; data.assignedToName = user.name; }
            
            var saved = DB.add(store, data);
            showToast('✅ Saved as ' + user.name);
            return saved;
        }

        function updateWithPermission(store, id, updates) {
            var record = DB.getById(store, id);
            if (!record) { showToast('❌ Record not found'); return false; }
            if (!canEdit(record)) { showToast('🔒 You can only edit your own records'); return false; }
            
            var user = getCurrentUser();
            updates.lastModifiedBy = user.username;
            updates.lastModifiedAt = new Date().toISOString();
            DB.update(store, id, updates);
            showToast('✅ Updated');
            return true;
        }

        function deleteWithPermission(store, id) {
            var record = DB.getById(store, id);
            if (!record) { showToast('❌ Record not found'); return false; }
            if (!canDeleteRecord(record)) { showToast('🔒 Cannot delete this record'); return false; }
            if (!confirm('Delete this record? This cannot be undone.')) return false;
            
            DB.delete(store, id);
            showToast('🗑️ Deleted');
            return true;
        }

        // ==================== ACTION BUTTONS ====================

        function getActionButtons(record, store) {
            var id = record.id || record.number || '';
            var buttons = '';
            if (canEdit(record)) { buttons += '<button class="btn btn-xs btn-info" onclick="editRecord(\'' + store + '\',\'' + id + '\')" title="Edit">✏️</button> '; }
            else { buttons += '<button class="btn btn-xs btn-ghost" disabled title="Only owner can edit">🔒</button> '; }
            if (canDeleteRecord(record)) { buttons += '<button class="btn btn-xs btn-danger" onclick="deleteWithPermission(\'' + store + '\',\'' + id + '\')" title="Delete">🗑️</button> '; }
            return buttons;
        }

        // ==================== LOGIN CHECK ====================

        function checkLoginAndRedirect() {
            if (!getCurrentUser()) {
                document.getElementById('loginScreen').style.display = 'flex';
                document.getElementById('appContainer').style.display = 'none';
            }
        }
        // ==================== ONLINE TRACKER ====================
        // ==================== ONLINE USER TRACKING ====================

        var _onlineWs = null;
        var _onlineWsReconnectTimer = null;
        var _wsConnected = false;
        var _wsOnlineUsers = [];
        var _wsReconnectAttempts = 0;

        // Use BroadcastChannel for cross-tab sync fallback (same browser)
        var _onlineChannel = null;
        try { _onlineChannel = new BroadcastChannel('erp_online'); } catch(e) {}

        function getWsUrl() {
            var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            var host = window.location.host; // includes port if non-default
            if (window.location.protocol === 'file:') {
                return 'ws://localhost:3001';
            }
            return protocol + '//' + host;
        }

        function connectWs() {
            return; // ADD THIS LINE
            if (_onlineWs && (_onlineWs.readyState === WebSocket.OPEN || _onlineWs.readyState === WebSocket.CONNECTING)) return;
            var url = getWsUrl();
            console.log('[Online] Connecting to ' + url + '...');
            try {
                _onlineWs = new WebSocket(url);
                _onlineWs.onopen = function() {
                    _wsConnected = true;
                    _wsReconnectAttempts = 0;
                    console.log('[Online] Connected to server');
                    var user = Auth.getUser();
                    if (user) {
                        _onlineWs.send(JSON.stringify({ type: 'register', username: user.username, name: user.name }));
                    }
                    // Start heartbeat
                    if (_onlineWsHeartbeat) clearInterval(_onlineWsHeartbeat);
                    _onlineWsHeartbeat = setInterval(function() {
                        if (_onlineWs && _onlineWs.readyState === WebSocket.OPEN) {
                            var u = Auth.getUser();
                            if (u) { _onlineWs.send(JSON.stringify({ type: 'ping', username: u.username, name: u.name })); }
                        }
                    }, 10000);
                    updateOnlineIndicator();
                };
                _onlineWs.onmessage = function(e) {
                    try {
                        var msg = JSON.parse(e.data);
                        if (msg.type === 'users') {
                            _wsOnlineUsers = msg.users || [];
                            updateOnlineIndicator();
                        }
                    } catch (err) {}
                };
                _onlineWs.onclose = function() {
                    _wsConnected = false;
                    if (_onlineWsHeartbeat) clearInterval(_onlineWsHeartbeat);
                    _wsReconnectAttempts++;
                    var delay = Math.min(5000 * Math.pow(1.5, _wsReconnectAttempts - 1), 30000);
                    console.log('[Online] Disconnected, reconnecting in ' + delay + 'ms (attempt ' + _wsReconnectAttempts + ')');
                    if (_onlineWsReconnectTimer) clearTimeout(_onlineWsReconnectTimer);
                    _onlineWsReconnectTimer = setTimeout(connectWs, delay);
                    // Fall back to localStorage tracking until reconnected
                    updateOnlineStatus();
                    updateOnlineIndicator();
                };
                _onlineWs.onerror = function() {
                    _wsConnected = false;
                    if (_onlineWsHeartbeat) clearInterval(_onlineWsHeartbeat);
                    _wsReconnectAttempts++;
                    var delay = Math.min(5000 * Math.pow(1.5, _wsReconnectAttempts - 1), 30000);
                    if (_onlineWsReconnectTimer) clearTimeout(_onlineWsReconnectTimer);
                    _onlineWsReconnectTimer = setTimeout(connectWs, delay);
                };
            } catch(e) {
                _wsConnected = false;
                console.log('[Online] Connection error:', e);
            }
        }
        var _onlineWsHeartbeat = null;

        var OnlineTracker = {
            register: function(user) {
                if (!user) return;
                updateOnlineStatus();
                updateOnlineIndicator();
                if (_onlineChannel) {
                    _onlineChannel.postMessage({ type: 'ping', username: user.username, name: user.name, id: CURRENT_USER_ID });
                }
            },
            unregister: function() {
                localStorage.removeItem('erp_user_' + CURRENT_USER_ID);
                if (_onlineWs && _onlineWs.readyState === WebSocket.OPEN) {
                    try { _onlineWs.send(JSON.stringify({ type: 'unregister', username: Auth.getUser() ? Auth.getUser().username : '' })); } catch(e) {}
                }
                if (_onlineWs) { try { _onlineWs.close(); } catch(e) {} }
                _onlineWs = null;
                _wsConnected = false;
                updateOnlineIndicator();
                if (_onlineChannel) {
                    _onlineChannel.postMessage({ type: 'leave', id: CURRENT_USER_ID });
                }
            }
        };

        // ========================================================================
        //  AUTHENTICATION SYSTEM
        // ========================================================================
        const SESSION_KEY = 'ad_deen_erp_session';
        const CURRENT_USER_ID = 'user_' + Math.random().toString(36).substr(2, 9);

        const Auth = {
            currentUser: null,

            init() {
                const stored = localStorage.getItem(SESSION_KEY);
                if (stored) {
                    try {
                        this.currentUser = JSON.parse(stored);
                        return true;
                    } catch (e) { localStorage.removeItem(SESSION_KEY); }
                }
                return false;
            },

            login(username, password) {
                var self = this;
                
                // Use local authentication
                var user = DB.authenticate(username, password);
                
                if (user) {
                    var sessionUser = {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        role: user.role,
                        avatar: user.avatar || user.name.charAt(0).toUpperCase(),
                        firstLogin: user.firstLogin
                    };
                    
                    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
                    self.currentUser = sessionUser;
                    
                    // Online tracker
                    try {
                        if (typeof OnlineTracker !== 'undefined' && OnlineTracker.register) {
                            OnlineTracker.register(sessionUser);
                        }
                    } catch(e) {}
                    
                    // Return as resolved Promise for compatibility
                    return Promise.resolve(sessionUser);
                }
                
                return Promise.resolve(null);
            },

            logout() {
                try {
                    if (typeof OnlineTracker !== 'undefined' && OnlineTracker.unregister) {
                        OnlineTracker.unregister();
                    } else if (typeof updateOnlineIndicator === 'function') {
                        localStorage.removeItem('erp_user_' + CURRENT_USER_ID);
                        updateOnlineIndicator();
                    }
                } catch(e) {}
                localStorage.removeItem(SESSION_KEY);
                this.currentUser = null;
            },

            isLoggedIn() {
                return this.currentUser !== null;
            },

            getUser() {
                return this.currentUser;
            }
        };

        // ==================== ONLINE USER TRACKING ====================

        // Active users tracking
        let onlineUsers = new Map();

        // Update user activity every 10 seconds
        function updateOnlineStatus() {
            const currentUser = (Auth.getUser && Auth.getUser()) || { username: 'admin', name: 'Administrator' };
            
            // Store this user's activity in localStorage
            const userData = {
                id: CURRENT_USER_ID,
                username: currentUser.username || 'admin',
                name: currentUser.name || 'User',
                lastActive: new Date().toISOString(),
                page: window.location.pathname
            };
            
            // Save to localStorage (shared across tabs)
            localStorage.setItem('erp_user_' + CURRENT_USER_ID, JSON.stringify(userData));
            
            // Clean up old entries (older than 30 seconds for faster refresh)
            cleanupOldUsers();
            
            // Broadcast to other tabs
            if (_onlineChannel) {
                try { _onlineChannel.postMessage({ type: 'ping', username: currentUser.username, name: currentUser.name, id: CURRENT_USER_ID }); } catch(e) {}
            }
            
            // Update the display
            updateOnlineIndicator();
        }

        // Clean up users inactive for more than 30 seconds
        function cleanupOldUsers() {
            const now = new Date();
            const keys = Object.keys(localStorage).filter(k => k.startsWith('erp_user_'));
            
            keys.forEach(key => {
                try {
                    const userData = JSON.parse(localStorage.getItem(key));
                    const lastActive = new Date(userData.lastActive);
                    const diffSeconds = (now - lastActive) / 1000;
                    
                    if (diffSeconds > 30) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            });
        }

        // Update the online indicator display
        function updateOnlineIndicator() {
            const indicator = document.getElementById('onlineIndicator');
            const count = document.getElementById('onlineCount');
            const dot = document.getElementById('onlineDot');
            
            if (!indicator || !count) return;
            
            var uniqueUsers = [];
            var isServerMode = false;
            
            if (_wsConnected) {
                // Use server data (cross-browser)
                uniqueUsers = _wsOnlineUsers;
                isServerMode = true;
            }
            
            // Also merge in localStorage users (same-browser tabs that may not be on WS yet)
            var lsUsers = [];
            var keys = Object.keys(localStorage).filter(k => k.startsWith('erp_user_'));
            keys.forEach(function(key) {
                try { lsUsers.push(JSON.parse(localStorage.getItem(key))); } catch(e) {}
            });
            
            // Combine: WS users first, then add localStorage users not already in WS list
            var seen = {};
            uniqueUsers.forEach(function(u) { seen[u.username] = true; });
            lsUsers.forEach(function(u) {
                if (u && u.username && !seen[u.username]) {
                    seen[u.username] = true;
                    uniqueUsers.push(u);
                }
            });
            
            // Update display
            var onlineCount = uniqueUsers.length;
            var label = onlineCount + ' online user' + (onlineCount !== 1 ? 's' : '');
            if (!isServerMode && onlineCount > 0) {
                label += ' (local)';
            }
            count.textContent = label;
            
            if (onlineCount > 0) {
                indicator.style.display = 'inline-flex';
                indicator.style.backgroundColor = onlineCount > 1 ? '#10b981' : '#3b82f6';
            } else {
                indicator.style.display = 'none';
            }
            
            // Server status via dot color
            if (dot) {
                if (_wsConnected) {
                    dot.style.background = '#10b981'; // green = server connected
                } else if (_onlineWsReconnectTimer) {
                    dot.style.background = '#f59e0b'; // amber = reconnecting
                } else {
                    dot.style.background = '#ef4444'; // red = disconnected
                }
            }
            
            // Tooltip with user names
            var names = uniqueUsers.map(function(u) { return u.name || u.username; }).join(', ');
            var tip = isServerMode ? '🟢 Server • ' : '🔴 Local • ';
            tip += 'Online: ' + (names || 'none');
            indicator.title = tip;
        }

        // Clean up when user leaves
        window.addEventListener('beforeunload', function() {
            localStorage.removeItem('erp_user_' + CURRENT_USER_ID);
            if (_onlineChannel) {
                try { _onlineChannel.postMessage({ type: 'leave', id: CURRENT_USER_ID }); } catch(e) {}
            }
        });

        // Listen for pings from other tabs to keep our view fresh
        if (_onlineChannel) {
            _onlineChannel.onmessage = function(e) {
                if (e.data && e.data.type === 'ping') {
                    // Another tab broadcast — refresh our indicator in case we missed it
                    updateOnlineIndicator();
                } else if (e.data && e.data.type === 'leave') {
                    // Another tab closed — clean up stale entry and refresh
                    if (e.data.id && e.data.id !== CURRENT_USER_ID) {
                        var staleKey = 'erp_user_' + e.data.id;
                        if (localStorage.getItem(staleKey)) {
                            localStorage.removeItem(staleKey);
                        }
                    }
                    updateOnlineIndicator();
                }
            };
        }

        // Start tracking
        updateOnlineStatus();
        setInterval(updateOnlineStatus, 10000); // Update every 10 seconds

        // Also update on page visibility change
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                updateOnlineStatus();
            }
        });

        // ========================================================================
        //  TOAST NOTIFICATIONS
        // ========================================================================
        function showToast(message, type = 'success') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
            toast.innerHTML = `<span style="font-size:16px;font-weight:700;">${icons[type] || 'ℹ'}</span> ${message}`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'toastOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }

        // ========================================================================
        //  INIT DATABASE & APP STATE
        // ========================================================================
        const DB = new AppDatabase();
        // Start server sync in background — local cache is available immediately
        var _serverSyncPromise = DB.init();

        // ========================================================================
        //  AUTH HANDLERS
        // ========================================================================
        function handleLogin(event) {
            event.preventDefault();
            var username = document.getElementById('loginUsername').value.trim();
            var password = document.getElementById('loginPassword').value.trim();
            
            Auth.login(username, password).then(function(user) {
                if (user) {
                    document.getElementById('loginScreen').style.display = 'none';
                    document.getElementById('appContainer').style.display = 'flex';
                    
                    // UPDATE UI WITH LOGGED-IN USER
                    updateUserUI(user);
                    
                    if (typeof refreshAll === 'function') refreshAll();
                    console.log('✅ Login successful as', user.role);
                } else {
                    document.getElementById('loginError').textContent = 'Invalid username or password';
                    document.getElementById('loginError').style.display = 'block';
                }
            });
        }

        function updateUserUI(user) {
            if (!user) return;
            
            // Update header
            var headerName = document.getElementById('headerUserName');
            var headerRole = document.getElementById('headerUserRole');
            var headerAvatar = document.getElementById('headerAvatar');
            var sidebarName = document.getElementById('sidebarUserName');
            var sidebarRole = document.getElementById('sidebarUserRole');
            var sidebarAvatar = document.getElementById('sidebarAvatar');
            
            if (headerName) headerName.textContent = user.name || user.username;
            if (headerRole) headerRole.textContent = user.role || 'Staff';
            if (headerAvatar) headerAvatar.textContent = (user.name || user.username).charAt(0).toUpperCase();
            if (sidebarName) sidebarName.textContent = user.name || user.username;
            if (sidebarRole) sidebarRole.textContent = user.role || 'Staff';
            if (sidebarAvatar) sidebarAvatar.textContent = (user.name || user.username).charAt(0).toUpperCase();
        }

        function proceedAfterLogin(user) {
            document.getElementById('loginScreen').classList.add('hidden');
            setTimeout(() => {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('appContainer').classList.add('show');
                updateUserUI(user);
                DB._saveBackup();
                refreshAll();
                // Sync from server in background
                DB.init().then(function() {
                    refreshAll();
                });
                connectWs(); // Start WebSocket tracking
                showToast(`Welcome back, ${user.name}!`, 'success');
            }, 500);
        }

        function showForcePasswordChange(user) {
            document.getElementById('loginScreen').classList.add('hidden');
            setTimeout(() => {
                document.getElementById('loginScreen').style.display = 'none';
                var modal = document.getElementById('forcePwModal');
                modal.style.display = 'flex';
                modal.classList.add('active');
                document.getElementById('forcePwCurrent').value = '';
                document.getElementById('forcePwNew').value = '';
                document.getElementById('forcePwConfirm').value = '';
                document.getElementById('forcePwError').textContent = '';
                document.getElementById('forcePwCurrent').focus();
                window._forcePwUser = user;
            }, 400);
        }

        function submitForcePasswordChange() {
            var user = window._forcePwUser;
            if (!user) return;
            var current = document.getElementById('forcePwCurrent').value.trim();
            var newPw = document.getElementById('forcePwNew').value.trim();
            var confirmPw = document.getElementById('forcePwConfirm').value.trim();
            var errorEl = document.getElementById('forcePwError');

            if (!current || !newPw || !confirmPw) {
                errorEl.textContent = 'All fields are required.';
                return;
            }
            if (newPw.length < 6) {
                errorEl.textContent = 'Password must be at least 6 characters.';
                return;
            }
            if (newPw !== confirmPw) {
                errorEl.textContent = 'New passwords do not match.';
                return;
            }

            var users = DB.get('users');
            var u = users.find(function(x) { return x.id === user.id; });
            if (!u) return;

            if (u.password !== current) {
                errorEl.textContent = 'Current password is incorrect.';
                return;
            }

            u.password = newPw;
            u.firstLogin = false;
            saveWithOwner('users', u);

            var modal = document.getElementById('forcePwModal');
            modal.style.display = 'none';
            modal.classList.remove('active');

            var sessionUser = Auth.getUser();
            if (sessionUser) {
                sessionUser.firstLogin = false;
                localStorage.setItem('ad_deen_erp_session', JSON.stringify(sessionUser));
            }

            proceedAfterLogin(user);
        }

        // ========================================================================
        //  PROFILE
        // ========================================================================
        function openProfileModal() {
            const user = Auth.getUser();
            if (!user) return;
            document.getElementById('profileAvatarText').textContent = user.avatar || user.name.charAt(0).toUpperCase();
            document.getElementById('profileName').textContent = user.name;
            document.getElementById('profileRole').textContent = user.role;
            document.getElementById('profileUsername').textContent = user.username;
            // Load saved settings — prefer DB user record, fallback to localStorage, then defaults
            const u = DB.get('users').find(x => x.id === user.id);
            const saved = JSON.parse(localStorage.getItem('ad_deen_profile') || '{}');
            document.getElementById('profileEmail').value = (u && u.email) || saved.email || user.name.toLowerCase().replace(/\s+/g, '.') + '@adeen-engineering.my';
            document.getElementById('profilePhone').value = (u && u.phone) || saved.phone || '+60-12-3456-7890';
            document.getElementById('profileSince').textContent = saved.since || 'January 2024';
            document.getElementById('profileNewPw').value = '';
            document.getElementById('profileConfirmPw').value = '';
            closeModal('userDropdown');
            document.getElementById('profileModal').classList.add('active');
        }

        function saveProfile() {
            const user = Auth.getUser();
            if (!user) return;
            const email = document.getElementById('profileEmail').value.trim();
            const phone = document.getElementById('profilePhone').value.trim();
            const newPw = document.getElementById('profileNewPw').value;
            const confirmPw = document.getElementById('profileConfirmPw').value;

            if (newPw && newPw !== confirmPw) {
                showToast('Passwords do not match', 'error');
                return;
            }

            // Save email/phone/password to DB for persistence across sessions
            const users = DB.get('users');
            const u = users.find(x => x.id === user.id);
            if (u) {
                u.email = email;
                u.phone = phone;
                if (newPw) u.password = newPw;
                const data = JSON.parse(localStorage.getItem('ad_deen_erp_db') || '{}');
                data.users = users;
                localStorage.setItem('ad_deen_erp_db', JSON.stringify(data));
                // Update session user so changes reflect immediately
                user.email = email;
                user.phone = phone;
            }

            // Save profile data (fallback for display)
            const profile = { email, phone, since: document.getElementById('profileSince').textContent };
            localStorage.setItem('ad_deen_profile', JSON.stringify(profile));
            closeModal('profileModal');
            showToast('Profile updated successfully', 'success');
        }

        function handleProfileAvatar(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                localStorage.setItem('ad_deen_avatar', e.target.result);
                document.getElementById('profileAvatarText').textContent = '📷';
                document.getElementById('headerAvatar').textContent = '📷';
                document.getElementById('sidebarAvatar').textContent = '📷';
                showToast('Avatar updated!', 'success');
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }

        // ========================================================================
        //  SETTINGS
        // ========================================================================
// ============================================
// SAVE & LOAD SETTINGS
// ============================================

function saveSettings() {
    const settings = {
        darkMode: document.getElementById('settingDarkMode')?.checked || false,
        compactView: document.getElementById('settingCompact')?.checked || false,
        emailNotif: document.getElementById('settingEmailNotif')?.checked || true,
        pushNotif: document.getElementById('settingPushNotif')?.checked || true,
        defaultView: document.getElementById('settingDefaultView')?.value || 'dashboard',
        pageSize: document.getElementById('settingPageSize')?.value || '25',
        outlookCC: document.getElementById('settingOutlookCC')?.value || '',
        outlookBCC: document.getElementById('settingOutlookBCC')?.value || '',
        outlookFromName: document.getElementById('settingOutlookFromName')?.value || '',
        attachmentBehavior: document.getElementById('settingAttachmentBehavior')?.value || 'link'
    };

    localStorage.setItem('appSettings', JSON.stringify(settings));

    // Apply settings immediately
    if (settings.darkMode) applyDarkMode(true);
    if (settings.compactView) applyCompactView(true);

    showToast('Settings saved successfully!', 'success');
    closeModal('settingsModal');
}

function loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (!saved) return;

    try {
        const settings = JSON.parse(saved);

        if (document.getElementById('settingDarkMode'))
            document.getElementById('settingDarkMode').checked = settings.darkMode || false;
        if (document.getElementById('settingCompact'))
            document.getElementById('settingCompact').checked = settings.compactView || false;
        if (document.getElementById('settingEmailNotif'))
            document.getElementById('settingEmailNotif').checked = settings.emailNotif !== undefined ? settings.emailNotif : true;
        if (document.getElementById('settingPushNotif'))
            document.getElementById('settingPushNotif').checked = settings.pushNotif !== undefined ? settings.pushNotif : true;
        if (document.getElementById('settingDefaultView'))
            document.getElementById('settingDefaultView').value = settings.defaultView || 'dashboard';
        if (document.getElementById('settingPageSize'))
            document.getElementById('settingPageSize').value = settings.pageSize || '25';
        if (document.getElementById('settingOutlookCC'))
            document.getElementById('settingOutlookCC').value = settings.outlookCC || '';
        if (document.getElementById('settingOutlookBCC'))
            document.getElementById('settingOutlookBCC').value = settings.outlookBCC || '';
        if (document.getElementById('settingOutlookFromName'))
            document.getElementById('settingOutlookFromName').value = settings.outlookFromName || '';
        if (document.getElementById('settingAttachmentBehavior'))
            document.getElementById('settingAttachmentBehavior').value = settings.attachmentBehavior || 'link';

        // Apply visual settings
        if (settings.darkMode) applyDarkMode(true);
        if (settings.compactView) applyCompactView(true);

    } catch(e) {
        console.error('Failed to load settings:', e);
    }
}



function sendViaOutlook(to, subject, bodyHtml, bodyText = '', quoteNumber = '', attachments = []) {
    // Get settings
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const cc = settings.outlookCC || '';
    const bcc = settings.outlookBCC || '';
    const fromName = settings.outlookFromName || '';
    const attachmentBehavior = settings.attachmentBehavior || 'link';

    // Build email body
    let finalBody = '';

    // Add from name if provided
    if (fromName) {
        finalBody += `From: ${fromName}\n\n`;
    }

    // Add main content
    if (bodyText) {
        finalBody += bodyText;
    } else if (bodyHtml) {
        // Convert HTML to plain text for mailto
        finalBody += bodyHtml.replace(/<br\s*\/?>/gi, '\n')
                             .replace(/<p>/gi, '\n')
                             .replace(/<\/p>/gi, '\n')
                             .replace(/<[^>]*>/g, '')
                             .replace(/&nbsp;/g, ' ');
    }

    // Add attachment note based on behavior
    if (attachments.length > 0) {
        finalBody += '\n\n---\n';
        if (attachmentBehavior === 'link') {
            finalBody += `📎 ${attachments.length} file(s) attached. Download link: ${window.location.origin}/download/${quoteNumber}\n`;
        } else if (attachmentBehavior === 'note') {
            finalBody += `📎 ${attachments.length} PDF file(s) are attached separately to this email.\n`;
        }
        // 'none' = no mention
    }

    // Add signature
    finalBody += '\n\n---\nBest regards,\n' + (fromName || 'Your Company Name');

    // Build mailto URL
    let mailtoLink = `mailto:${encodeURIComponent(to)}`;
    mailtoLink += `?subject=${encodeURIComponent(subject)}`;
    mailtoLink += `&body=${encodeURIComponent(finalBody)}`;

    if (cc && cc.trim()) {
        mailtoLink += `&cc=${encodeURIComponent(cc)}`;
    }
    if (bcc && bcc.trim()) {
        mailtoLink += `&bcc=${encodeURIComponent(bcc)}`;
    }

    // Open default email client (Outlook if set as default)
    window.location.href = mailtoLink;

    // Return true to indicate email was initiated
    return true;
}

// ============================================
// EXAMPLE: Send Quotation Email
// ============================================

function sendQuotationEmail(qtId) {
    var qt = qtId ? DB.getById('quotations', qtId) : null;
    if (!qt && qtId) { showToast('Quotation not found', 'error'); return; }
    if (!qt) {
        var email = document.getElementById('qtEmail').value;
        var subject = document.getElementById('qtSubject').value;
        if (!email) { showToast('No email address for this customer', 'error'); return; }
        var tbody = document.getElementById('qtItemsBody');
        var itemsHtml = '', itemsText = '';
        tbody.querySelectorAll('tr').forEach(function(tr, i) {
            var desc = (tr.querySelector('input[id^="qtItemDesc_"]')||{}).value || 'Item ' + (i+1);
            var qty = parseFloat((tr.querySelector('input[id^="qtItemQty_"]')||{}).value) || 0;
            var price = parseFloat((tr.querySelector('input[id^="qtItemPrice_"]')||{}).value) || 0;
            var total = qty * price;
            itemsHtml += '<tr><td>' + desc + '</td><td>' + qty + '</td><td>RM ' + price.toFixed(2) + '</td><td>RM ' + total.toFixed(2) + '</td></tr>';
            itemsText += '  ' + desc + '  x' + qty + '  @ RM ' + price.toFixed(2) + '  =  RM ' + total.toFixed(2) + '\n';
        });
        var grandTotal = (document.getElementById('qtTotal')||{}).value || '';
        var contact = (document.getElementById('qtContact')||{}).value || 'Customer';
        var emailBodyText = 'Dear ' + contact + ',\n\nPlease find our quotation below.\n\n' + subject + '\n\n' + itemsText + '\nGrand Total: ' + grandTotal + '\n\nThank you for your consideration.\n\nBest regards,\n' + contact;
        openEmailCompose(email, 'Quotation: ' + subject, emailBodyText, '');
        return;
    }
    if (!qt.email) { showToast('No email address for this customer', 'error'); return; }
    openQuotationEmailCompose(qt);
}

// ============================================
// APPEARANCE FUNCTIONS
// ============================================

function toggleDarkMode(enabled) {
    applyDarkMode(enabled);
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    settings.darkMode = enabled;
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

function applyDarkMode(enabled) {
    if (enabled) {
        document.body.classList.add('dark-mode');
        document.documentElement.style.setProperty('--bg-color', '#1a1a2e');
        document.documentElement.style.setProperty('--text-color', '#eeeeee');
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.style.setProperty('--bg-color', '#f5f5f5');
        document.documentElement.style.setProperty('--text-color', '#333333');
    }
}

function toggleCompactView(enabled) {
    applyCompactView(enabled);
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    settings.compactView = enabled;
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

function applyCompactView(enabled) {
    if (enabled) {
        document.body.classList.add('compact-view');
        document.documentElement.style.setProperty('--table-padding', '6px 8px');
        document.documentElement.style.setProperty('--row-margin', '4px 0');
    } else {
        document.body.classList.remove('compact-view');
        document.documentElement.style.setProperty('--table-padding', '12px 16px');
        document.documentElement.style.setProperty('--row-margin', '8px 0');
    }
}

function closeModal(modalId) {
    var el = document.getElementById(modalId);
    if (el) {
        el.classList.remove('active');
        el.style.display = 'none';
    }
    if (modalId === 'jobModal' && _salesMode) {
        _salesMode = false;
        var sf = document.getElementById('soSalesFields');
        if (sf) sf.style.display = 'none';
        var title = document.getElementById('jobModalTitle');
        if (title) title.textContent = 'New Work Order';
        var btn = document.getElementById('jobModalSubmitBtn');
        if (btn) { btn.textContent = 'Submit Work Order'; btn.onclick = createWorkOrder; }
    }
}

function openModal(modalId) {
    loadSettings();
    var el = document.getElementById(modalId);
    if (el) {
        el.style.display = '';
        el.classList.add('active');
    }
}

// ============================================
// CSS VARIABLES TO ADD TO YOUR STYLESHEET
// ============================================
/* Add these CSS variables to your :root or body selector

:root {
    --bg-color: #f5f5f5;
    --text-color: #333333;
    --accent: #0066cc;
    --text-muted: #666666;
    --table-padding: 12px 16px;
    --row-margin: 8px 0;
}

body.dark-mode {
    --bg-color: #1a1a2e;
    --text-color: #eeeeee;
    --text-muted: #aaaaaa;
}

body.compact-view {
    --table-padding: 6px 8px;
    --row-margin: 4px 0;
}

*/

// Load saved settings on init
window.addEventListener('DOMContentLoaded', function() {
    loadSettings();
});

        // ========================================================================
        //  RENDER FUNCTIONS
        // ========================================================================
        function renderDashboardStats() {
            const container = document.getElementById('dashboardStats');
            const activeWO = DB.get('workOrders').filter(w => w.status !== 'Completed').length;
            const activeSC = DB.get('serviceCalls').filter(s => s.status !== 'Completed').length;
            const passRate = DB.get('inspections').length > 0
                ? Math.round((DB.get('inspections').filter(i => i.result.includes('Pass')).length / DB.get('inspections').length) * 100) + '%'
                : 'N/A';
            const contracts = DB.get('pmContracts').length;
            const totalDocs = DB.get('documents').length;

            container.innerHTML = `
                <div class="stat-card" onclick="navigateTo('documents',document.querySelector('[data-section=&quot;documents&quot;]'))" style="cursor:pointer;">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe);">[D]</div>
                    <div class="stat-content">
                        <h3>${totalDocs}</h3>
                        <p>Documents</p>
                        <div class="stat-trend trend-up">↑ ${DB.get('documents').filter(d => { const d30 = new Date(); d30.setDate(d30.getDate() - 30); return new Date(d.createdAt || 0) > d30; }).length} added (30d)</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">🔧</div>
                    <div class="stat-content">
                        <h3>${activeWO}</h3>
                        <p>Active Work Orders</p>
                        <div class="stat-trend trend-up">↑ ${DB.get('workOrders').filter(w => w.status === 'In Progress').length} in progress</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe);">🔩</div>
                    <div class="stat-content">
                        <h3>${activeSC}</h3>
                        <p>Active Service Calls</p>
                        <div class="stat-trend trend-up">↑ ${DB.get('serviceCalls').filter(s => s.status === 'Dispatched').length} dispatched</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">✅</div>
                    <div class="stat-content">
                        <h3>${passRate}</h3>
                        <p>QA Pass Rate</p>
                        <div class="stat-trend trend-up">↑ Based on ${DB.get('inspections').length} inspections</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #fef3c7, #fde68a);">📋</div>
                    <div class="stat-content">
                        <h3>${contracts}</h3>
                        <p>Service Contracts</p>
                        <div class="stat-trend trend-up">↑ ${contracts > 0 ? 'Active' : 'No contracts'}</div>
                    </div>
                </div>
            `;
            renderReportCardSummaries();
        }

        function renderReportCardSummaries() {
            const wo = DB.get('workOrders');
            const insp = DB.get('inspections');
            const inv = DB.get('inventory');
            const cust = DB.get('customers');
            const sc = DB.get('serviceCalls');
            const docs = DB.get('documents');
            const assets = DB.get('assets');
            const sales = DB.get('salesOrders');
            const invArr = inv;

            // Job Overview
            const byStatus = {};
            wo.forEach(w => { byStatus[w.status] = (byStatus[w.status] || 0) + 1; });
            const topStatus = Object.entries(byStatus).sort((a, b) => b[1] - a[1])[0];
            const el = id => document.getElementById(id);
            if (el('rptJobSummary')) el('rptJobSummary').innerHTML = `${wo.length} orders · ${topStatus ? topStatus[0] + ': ' + topStatus[1] : '—'}`;

            // QA Performance
            const passCount = insp.filter(i => (i.result || '').includes('Pass')).length;
            const failCount = insp.filter(i => (i.result || '').includes('Fail')).length;
            if (el('rptQaSummary')) el('rptQaSummary').innerHTML = `${insp.length} inspections · Pass: ${passCount} · Fail: ${failCount}`;

            // Inventory Status
            const lowStock = inv.filter(i => (i.status || '') === 'Low Stock').length;
            const inStock = inv.filter(i => (i.status || '') === 'In Stock').length;
            if (el('rptInvSummary')) el('rptInvSummary').innerHTML = `${inv.length} items · ${lowStock} low stock · ${inStock} in stock`;

            // Customer Analytics
            const activeCust = cust.filter(c => (c.status || '') === 'Active').length;
            const corpCust = cust.filter(c => (c.type || '') === 'Corporate').length;
            if (el('rptCustSummary')) el('rptCustSummary').innerHTML = `${cust.length} total · ${activeCust} active · ${corpCust} corporate`;

            // Service Stats
            const scPending = sc.filter(s => (s.status || '') === 'Pending' || (s.status || '') === 'Dispatched').length;
            const scDone = sc.filter(s => (s.status || '') === 'Completed').length;
            if (el('rptServiceSummary')) el('rptServiceSummary').innerHTML = `${sc.length} calls · ${scPending} pending · ${scDone} completed`;

            // Document Summary
            const docTypes = {};
            docs.forEach(d => { docTypes[d.type] = (docTypes[d.type] || 0) + 1; });
            const topDoc = Object.entries(docTypes).sort((a, b) => b[1] - a[1])[0];
            if (el('rptDocSummary')) el('rptDocSummary').innerHTML = `${docs.length} docs · ${topDoc ? topDoc[0] + ': ' + topDoc[1] : '—'}`;

            // Material Usage
            const linkedToJob = inv.filter(i => i.woLink && i.woLink !== '').length;
            if (el('rptMatSummary')) el('rptMatSummary').innerHTML = `${inv.length} items · ${linkedToJob} linked to jobs`;

            // Financial Summary
            const totalSO = sales.reduce((s, so) => s + (so.amount || 0), 0);
            const soCount = sales.length;
            if (el('rptFinSummary')) el('rptFinSummary').innerHTML = `${soCount} sales orders · Total: RM ${totalSO.toLocaleString()}`;

            // Maintenance / Asset
            const dueSoon = assets.filter(a => (a.status || '') === 'Due Soon').length;
            const overdue = assets.filter(a => {
                if (!a.nextDue) return false;
                return new Date(a.nextDue) < new Date();
            }).length;
            const operational = assets.filter(a => (a.status || '') === 'Operational').length;
            if (el('rptMaintSummary')) el('rptMaintSummary').innerHTML = `${assets.length} assets · ${operational} operational · ${dueSoon} due soon · ${overdue} overdue`;
            if (el('dashRptMaint')) el('dashRptMaint').innerHTML = `${assets.length} assets · ${operational} operational · ${dueSoon} due soon · ${overdue} overdue`;

            // Inventory Management
            const byLocation = {};
            inv.forEach(i => { const loc = i.location || 'Unknown'; byLocation[loc] = (byLocation[loc] || 0) + 1; });
            const topLoc = Object.entries(byLocation).sort((a, b) => b[1] - a[1])[0];
            if (el('rptInvMgmtSummary')) el('rptInvMgmtSummary').innerHTML = `${inv.length} items · Top: ${topLoc ? topLoc[0] + ' (' + topLoc[1] + ')' : '—'} · ${lowStock} low`;
            if (el('dashRptInv')) el('dashRptInv').innerHTML = `${inv.length} items · Top: ${topLoc ? topLoc[0] + ' (' + topLoc[1] + ')' : '—'} · ${lowStock} low`;

            // Customer Management
            const types = {};
            cust.forEach(c => { types[c.type || 'Other'] = (types[c.type || 'Other'] || 0) + 1; });
            const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
            if (el('rptCustMgmtSummary')) el('rptCustMgmtSummary').innerHTML = `${cust.length} customers · ${activeCust} active · ${topType ? topType[0] + ': ' + topType[1] : '—'}`;
            if (el('dashRptCust')) el('dashRptCust').innerHTML = `${cust.length} customers · ${activeCust} active · ${topType ? topType[0] + ': ' + topType[1] : '—'}`;
        }

        function renderKanbanBoard() {
            const board = document.getElementById('kanbanBoard');
            const columns = { 'Work Orders': [], 'Service Calls': [], 'QA Review': [], 'Completed': [] };

            DB.get('workOrders').forEach(wo => {
                if (wo.status === 'Closed' || wo.status === 'Completed') columns['Completed'].push({ ...wo, type: 'WO' });
                else if (wo.status === 'QA Review') columns['QA Review'].push({ ...wo, type: 'WO' });
                else columns['Work Orders'].push({ ...wo, type: 'WO' });
            });
            DB.get('serviceCalls').forEach(sc => {
                if (sc.status === 'Completed') columns['Completed'].push({ ...sc, type: 'SC' });
                else columns['Service Calls'].push({ ...sc, type: 'SC' });
            });

            board.innerHTML = Object.entries(columns).map(([status, items]) => `
                <div class="kanban-column">
                    <h4>${status} (${items.length})</h4>
                    ${items.map(item => `
                        <div class="kanban-card ${item.priority === 'Critical' || item.priority === 'Urgent' || item.priority === 'Emergency' ? 'urgent' : item.priority === 'High' ? 'high' : ''}">
                            <strong>${item.type === 'WO' ? '🔧' : '📞'} ${item.id}</strong><br>
                            <small>${item.client}</small><br>
                            <small>${item.title || item.equipment || item.equipTag || ''}</small><br>
                            ${item.type === 'WO' ? `<small>${item.branch === 'fab' ? '🔧 Fab' : item.branch === 'mar' ? '🔩 M&R' : '📋 Pending'} | ${item.trade || '—'}</small><br>` : ''}
                            ${item.type === 'SC' ? `<small>Tech: ${item.technician}</small><br>` : ''}
                            <span class="badge badge-${(item.status || '').toLowerCase().replace(/[\s-]+/g, '-')}">${item.status || 'Active'}</span>
                            ${item.priority ? ` <span class="badge badge-${item.priority.toLowerCase()}">${item.priority}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            `).join('');
        }

        function renderJobsTable(filter = 'all') {
            let jobs = DB.get('workOrders');
            if (filter !== 'all') {
                jobs = jobs.filter(j => (j.status || '').toLowerCase().replace(/[\s-]+/g, '-').includes(filter));
            }
            document.getElementById('jobsTableBody').innerHTML = jobs.map(job => `
                <tr>
                    <td><strong><span class="trace-link">${job.id}</span></strong></td>
                    <td><strong>${job.client}</strong><br><small>${job.site}</small></td>
                    <td>${job.title || job.equipment}<br><small>${job.branch === 'fab' ? '🔧 Fab' : job.branch === 'mar' ? '🔩 M&R' : '📋 Pending'}${job.assetTag ? ' | Tag: ' + job.assetTag : ''}</small></td>
                    <td>${(job.description || '').substring(0, 60)}${(job.description || '').length > 60 ? '...' : ''}</td>
                    <td><span class="badge badge-${(job.status || '').toLowerCase().replace(/[\s-]+/g, '-')}">${job.status || 'New'}</span></td>
                    <td>${job.trade || '—'}</td>
                    <td><span class="badge badge-${(job.priority || 'medium').toLowerCase()}">${job.priority || 'Medium'}</span></td>
                    <td>${job.dueDate || '—'}</td>
                    <td>${job.assignedTo || '—'}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-xs btn-info" onclick="openMarDetail('${job.id}')">View</button>
                            <button class="btn btn-xs btn-primary" onclick="openMarDetail('${job.id}')">Edit</button>
                            <button class="btn btn-xs btn-secondary" onclick="printWorkOrderPDF('${job.id}')">🖨️</button>
                            ${job.status === 'Closed' ? '<button class="btn btn-xs btn-success" onclick="openInvoiceModalFromWo(\''+job.id+'\')">🧾</button>' : ''}
                            <button class="btn btn-xs btn-danger" onclick="deleteRecord('workOrders','${job.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderServiceCalls() {
            const calls = DB.get('serviceCalls');
            document.getElementById('serviceCallsTable').innerHTML = calls.map(sc => `
                <tr>
                    <td><strong><span class="trace-link">${sc.id}</span></strong></td>
                    <td>${sc.client}</td>
                    <td>${sc.equipment}</td>
                    <td>${sc.issue}</td>
                    <td><span class="badge badge-${sc.priority.toLowerCase().split(' - ')[0]}">${sc.priority.split(' - ')[0]}</span></td>
                    <td><span class="badge badge-${sc.status.toLowerCase()}">${sc.status}</span></td>
                    <td>${sc.technician}</td>
                    <td>${sc.eta}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-xs btn-info">Edit</button>
                            <button class="btn btn-xs btn-ghost">History</button>
                            <button class="btn btn-xs btn-danger" onclick="deleteRecord('customers','${sc.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');

            const kanban = document.getElementById('serviceKanban');
            const scColumns = {
                'Pending': calls.filter(s => s.status === 'Pending'),
                'Scheduled': calls.filter(s => s.status === 'Scheduled'),
                'Dispatched': calls.filter(s => s.status === 'Dispatched'),
                'In Progress': calls.filter(s => s.status === 'In Progress'),
            };
            kanban.innerHTML = Object.entries(scColumns).map(([status, items]) => `
                <div class="kanban-column">
                    <h4>${status} (${items.length})</h4>
                    ${items.map(sc => `
                        <div class="kanban-card ${sc.priority === 'Critical' || sc.priority === 'Emergency' ? 'urgent' : ''}">
                            <strong>${sc.id}</strong><br>
                            <small>${sc.client}</small><br>
                            <small>Tech: ${sc.technician}</small><br>
                            <span class="badge badge-${sc.priority.toLowerCase().split(' - ')[0]}">${sc.priority.split(' - ')[0]}</span>
                        </div>
                    `).join('')}
                </div>
            `).join('');
        }

        function renderServiceStats() {
            const calls = DB.get('serviceCalls');
            const emergency = calls.filter(s => s.priority === 'Critical' || s.priority === 'Emergency').length;
            const scheduled = DB.get('pmContracts').length;
            const deployed = calls.filter(s => s.status === 'Dispatched' || s.status === 'In Progress').length;
            document.getElementById('serviceStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #fee2e2, #fecaca);">🚨</div>
                    <div class="stat-content">
                        <h3>${emergency}</h3>
                        <p>Emergency Calls</p>
                        <div class="stat-trend ${emergency > 0 ? 'trend-down' : 'trend-up'}">${emergency > 0 ? `⚠ ${emergency} critical` : 'None'}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">📅</div>
                    <div class="stat-content">
                        <h3>${scheduled * 4}</h3>
                        <p>Scheduled PMs This Month</p>
                        <div class="stat-trend trend-up">${scheduled > 0 ? '↑ Active' : 'No contracts'}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #fef3c7, #fde68a);">👷</div>
                    <div class="stat-content">
                        <h3>${deployed}</h3>
                        <p>Field Teams Deployed</p>
                        <div class="stat-trend trend-up">${calls.length - deployed} available</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #ede9fe, #ddd6fe);">⏱️</div>
                    <div class="stat-content">
                        <h3>4.2 hrs</h3>
                        <p>Avg Response Time</p>
                        <div class="stat-trend trend-up">↓ Improved 15%</div>
                    </div>
                </div>
            `;
        }

        function renderPMContracts() {
            document.getElementById('pmContractsGrid').innerHTML = DB.get('pmContracts').map(pm => `
                <div class="contract-card">
                    <div class="contract-header">
                        <div>
                            <h4>${pm.id}</h4>
                            <p style="color: var(--text-secondary); font-size: 13px;">${pm.client}</p>
                        </div>
                        <span class="badge badge-approved">${pm.status}</span>
                    </div>
                    <p style="font-size: 13px;"><strong>Equipment:</strong> ${pm.equipment}</p>
                    <p style="font-size: 13px;"><strong>Frequency:</strong> ${pm.frequency}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${pm.completion}%;"></div>
                    </div>
                    <p style="font-size: 12px; color: var(--text-secondary);">Contract Completion: ${pm.completion}%</p>
                    <p style="font-size: 12px;"><strong>Last Service:</strong> ${pm.lastService}</p>
                    <p style="font-size: 12px;"><strong>Next Due:</strong> ${pm.nextDue}</p>
                    <p style="font-size: 12px;"><strong>Annual Value:</strong> ${pm.value}</p>
                    <button class="btn btn-sm btn-info" style="margin-top: 10px;">View Schedule</button>
                </div>
            `).join('');
        }

        function renderServiceHistory() {
            const timeline = document.getElementById('serviceTimeline');
            const allServices = [
                ...DB.get('serviceCalls').map(sc => ({ ...sc, type: 'Service Call', date: sc.eta })),
                ...DB.get('pmContracts').map(pm => ({ ...pm, type: 'PM Service', date: pm.lastService }))
            ];
            timeline.innerHTML = allServices.slice(0, 8).map(service => `
                <div class="service-event">
                    <div class="event-date">${service.date || 'N/A'}</div>
                    <div class="event-details">
                        <h4>${service.type}: ${service.id}</h4>
                        <p>Client: ${service.client} | Equipment: ${service.equipment}</p>
                        <p>Status: <span class="badge badge-${(service.status || 'Active').toLowerCase()}">${service.status || 'Active'}</span></p>
                    </div>
                </div>
            `).join('');
        }

        function renderQualityStats() {
            const inspections = DB.get('inspections');
            const pending = inspections.filter(i => !i.result || !i.result.includes('Pass')).length;
            const passed = inspections.filter(i => i.result.includes('Pass')).length;
            document.getElementById('qualityStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">📋</div>
                    <div class="stat-content">
                        <h3>${inspections.length}</h3>
                        <p>Total Inspections</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #fee2e2, #fecaca);">❌</div>
                    <div class="stat-content">
                        <h3>${inspections.length - passed}</h3>
                        <p>Open / Failed</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe);">📜</div>
                    <div class="stat-content">
                        <h3>${passed}</h3>
                        <p>Certificates Issued</p>
                    </div>
                </div>
            `;
        }

        function renderInspections() {
            document.getElementById('inspectionsTable').innerHTML = DB.get('inspections').map(insp => `
                <tr>
                    <td><strong>${insp.id}</strong></td>
                    <td><span class="trace-link">${insp.wo}</span></td>
                    <td>${insp.type}</td>
                    <td>${insp.inspector}</td>
                    <td>${insp.date}</td>
                    <td><span class="badge ${insp.result.includes('Pass') ? 'badge-approved' : 'badge-urgent'}">${insp.result}</span></td>
                    <td><span class="trace-link">📄 ${insp.cert}</span></td>
                    <td><small class="trace-link">${insp.traceability}</small></td>
                    <td><button class="btn btn-xs btn-danger" onclick="deleteRecord('inspections','${insp.id}')">Delete</button></td>
                </tr>
            `).join('');
        }

        function renderInventory() {
            document.getElementById('inventoryTable').innerHTML = DB.get('inventory').map(item => `
                <tr>
                    <td><strong>${item.code}</strong></td>
                    <td>${item.desc}</td>
                    <td><span class="trace-link">${item.lot}</span></td>
                    <td>${item.location}</td>
                    <td><strong>${item.qty}</strong></td>
                    <td>${item.min}</td>
                    <td>${item.unit}</td>
                    <td><span class="badge badge-${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span></td>
                    <td><span class="trace-link">→ ${item.woLink}</span></td>
                    <td><button class="btn btn-xs btn-danger" onclick="deleteRecord('inventory','${item.code}','code')">Delete</button></td>
                </tr>
            `).join('');
        }

        function renderAssets() {
            document.getElementById('maintenanceTable').innerHTML = DB.get('assets').map(asset => `
                <tr>
                    <td><strong>${asset.id}</strong></td>
                    <td>${asset.name}</td>
                    <td>${asset.lastService}</td>
                    <td>${asset.nextDue}</td>
                    <td><span class="badge badge-${asset.status.toLowerCase().replace(/\s+/g, '-')}">${asset.status}</span></td>
                    <td><button class="btn btn-xs btn-danger" onclick="deleteRecord('assets','${asset.id}')">Delete</button></td>
                </tr>
            `).join('');
        }

        // ===== FABRICATION RENDER =====
        function renderFabStats() {
            const orders = DB.get('fabOrders');
            const planned = orders.filter(o => o.status === 'Planned').length;
            const inProg = orders.filter(o => o.status === 'In Progress').length;
            const completed = orders.filter(o => o.status === 'Completed').length;
            const woReceived = DB.get('workOrders').filter(wo => wo.branch === 'fab').length;
            const linkedWO = orders.filter(o => o.woRef).length;
            document.getElementById('fabStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);">🏭</div>
                    <div class="stat-content"><h3>${orders.length}</h3><p>Total Orders</p><div class="stat-trend trend-up">${inProg} in progress</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);">📋</div>
                    <div class="stat-content"><h3>${planned}</h3><p>Planned / Scheduled</p><div class="stat-trend trend-up">Ready to release</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);">✅</div>
                    <div class="stat-content"><h3>${completed}</h3><p>Completed</p><div class="stat-trend trend-up">This quarter</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);">📥</div>
                    <div class="stat-content"><h3>${woReceived}</h3><p>WOs Received</p><div class="stat-trend trend-up">${linkedWO} linked to FO</div></div>
                </div>
            `;
        }

        function renderFabOrders() {
            const filter = document.getElementById('fabStatusFilter')?.value || 'all';
            let orders = DB.get('fabOrders');
            if (filter !== 'all') orders = orders.filter(o => o.status === filter);
            document.getElementById('fabOrdersTable').innerHTML = orders.length
                ? orders.map(o => {
                    const bomCount = (o.bom || []).length;
                    return `<tr>
                        <td><strong><span class="trace-link" onclick="openFabDetail('${o.id}')">${o.id}</span></strong></td>
                        <td>${o.product || o.component}<br><small style="color:var(--text-muted);">${o.type || '—'}</small></td>
                        <td>${o.customer || '—'}</td>
                        <td>${o.quantity || 1}</td>
                        <td>${o.shop || '—'}</td>
                        <td><span class="badge badge-${o.status.toLowerCase().replace(/\s+/g, '-')}">${o.status}</span></td>
                        <td style="font-size:12px;">${o.startDate || '—'} → ${o.endDate || '—'}</td>
                        <td><span class="trace-link" onclick="openFabDetail('${o.id}')">${bomCount} items</span></td>
                        <td>
                    <div class="btn-group">
                        <button class="btn btn-xs btn-info" onclick="openFabDetail('${o.id}')">View</button>
                        <button class="btn btn-xs btn-success" onclick="quickFabStatus('${o.id}')">Status</button>
                        <button class="btn btn-xs btn-danger" onclick="deleteRecord('fabOrders','${o.id}')">Delete</button>
                    </div>
                        </td>
                    </tr>`;
                }).join('')
                : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">No fabrication orders found</td></tr>';
        }

        function renderMarWorkOrders() {
            const filter = document.getElementById('marStatusFilter')?.value || 'all';
            const search = document.getElementById('marSearch');
            const q = search ? search.value.toLowerCase() : '';
            let orders = DB.get('workOrders').filter(wo => wo.branch === 'mar' || wo.scope === 'repair');
            if (filter !== 'all') orders = orders.filter(o => (o.status || '') === filter);
            if (q) orders = orders.filter(o =>
                o.id.toLowerCase().includes(q) || (o.client || '').toLowerCase().includes(q) ||
                (o.title || '').toLowerCase().includes(q) || (o.equipment || '').toLowerCase().includes(q)
            );
            // Stats
            const inProg = orders.filter(o => o.status === 'In Progress').length;
            const completed = orders.filter(o => o.status === 'Completed' || o.status === 'Closed').length;
            const pending = orders.filter(o => o.status === 'Pending' || o.status === 'New').length;
            document.getElementById('marStats').innerHTML = `
                <div class="stat-card"><div class="stat-value">${orders.length}</div><div class="stat-label">Total Repair Orders</div></div>
                <div class="stat-card"><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div>
                <div class="stat-card"><div class="stat-value">${inProg}</div><div class="stat-label">In Progress</div></div>
                <div class="stat-card"><div class="stat-value">${completed}</div><div class="stat-label">Completed</div></div>
            `;
            document.getElementById('marOrdersTable').innerHTML = orders.length
                ? orders.map(o => `
                    <tr>
                        <td><strong><span class="trace-link" onclick="openMarDetail('${o.id}')">${o.id}</span></strong></td>
                        <td>${o.client || '—'}</td>
                        <td>${o.title || o.equipment || '—'}</td>
                        <td>${o.scope === 'repair' ? '🔩 Repair' : o.branch === 'mar' ? 'M&R' : '—'}</td>
                        <td><span class="badge badge-${(o.status || '').toLowerCase().replace(/[\s-]+/g, '-')}">${o.status || 'New'}</span></td>
                        <td><span class="badge badge-${(o.priority || 'medium').toLowerCase()}">${o.priority || 'Medium'}</span></td>
                        <td>${o.dueDate || '—'}</td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-xs btn-info" onclick="openMarDetail('${o.id}')">View</button>
                                <button class="btn btn-xs btn-danger" onclick="deleteRecord('workOrders','${o.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')
                : '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">No repair work orders found</td></tr>';
        }

        function showFabTab(tab, el) {
            document.querySelectorAll('.fab-tab-content').forEach(t => t.style.display = 'none');
            document.getElementById('fab-' + tab + '-tab').style.display = 'block';
            document.querySelectorAll('#fabrication-section .tab').forEach(t => t.classList.remove('active'));
            if (el) el.classList.add('active');
        }

        // ===== FAB WIZARD =====
        let fabWizardStep = 0;
        let fabApproved = false;
        const FAB_STEPS = 8;

        function openFabOrderModal() {
            fabWizardStep = 0;
            fabApproved = false;
            // Reset approval UI
            document.getElementById('fabApprovalBadge').textContent = 'Pending Approval';
            document.getElementById('fabApprovalBadge').style.cssText = 'font-size:12px;padding:4px 12px;border-radius:20px;background:#f3f4f6;color:#374151;font-weight:600;';
            document.getElementById('fabApproveBtn').style.display = 'inline-flex';
            document.getElementById('fabRejectBtn').style.display = 'none';
            document.getElementById('fabApprovalSignature').textContent = '';
            document.getElementById('fabApprover').value = '';
            document.getElementById('fabApprovalNotes').value = '';
            document.getElementById('fabApprovalDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('fabRevision').value = 'Rev 0';
            // Populate customer dropdown
            const custSel = document.getElementById('fabCustomer');
            custSel.innerHTML = '<option>Select Customer...</option>' +
                DB.get('customers').map(c => `<option value="${c.company}">${c.company}</option>`).join('');
            // Set default dates
            const today = new Date();
            const start = document.getElementById('fabStartDate');
            if (start) { start.value = today.toISOString().split('T')[0]; }
            const end = document.getElementById('fabEndDate');
            if (end) { const e = new Date(); e.setDate(e.getDate() + 45); end.value = e.toISOString().split('T')[0]; }
            const del = document.getElementById('fabDeliveryDate');
            if (del) { const d = new Date(); d.setDate(d.getDate() + 60); del.value = d.toISOString().split('T')[0]; }
            // Initialize BOM with default row
            document.getElementById('fabBomTable').innerHTML = '';
            addFabBomRow();
            // Initialize routing with default rows
            document.getElementById('fabRoutingTable').innerHTML = '';
            ['Cutting', 'Fit-up', 'Welding', 'NDT', 'Hydrotest'].forEach((wc, i) => addFabRoutingRow(wc, i));
            document.getElementById('fabSubTable').innerHTML = '';
            document.getElementById('fabDocList').innerHTML = '';
            document.getElementById('fabNotes').value = '';
            fabWizardUpdateUI();
            document.getElementById('fabOrderModal').classList.add('active');
        }

        function submitFabApproval(approved) {
            const approver = document.getElementById('fabApprover').value;
            if (!approver) { showToast('Please select an approving authority', 'error'); return; }
            const preChecks = ['fabPre1', 'fabPre2', 'fabPre3', 'fabPre4', 'fabPre5'];
            const checked = preChecks.filter(id => document.getElementById(id).checked).length;
            if (checked < 5) { showToast('All prerequisite checks must be completed before approval', 'warning'); return; }

            const badge = document.getElementById('fabApprovalBadge');
            const now = new Date().toISOString().split('T')[0];
            const rev = document.getElementById('fabRevision').value || 'Rev 0';

            if (approved) {
                fabApproved = true;
                badge.textContent = '✅ Approved — ' + now;
                badge.style.cssText = 'font-size:12px;padding:4px 12px;border-radius:20px;background:rgba(16,185,129,0.15);color:#34d399;font-weight:600;';
                document.getElementById('fabApproveBtn').style.display = 'none';
                document.getElementById('fabRejectBtn').style.display = 'inline-flex';
                document.getElementById('fabRejectBtn').innerHTML = '↻ Revise';
                document.getElementById('fabApprovalSignature').innerHTML = '✍️ Signed by <strong>' + approver + '</strong> | ' + now + ' | ' + rev;
                showToast('Prerequisites approved by ' + approver, 'success');
            } else {
                fabApproved = false;
                badge.textContent = '🔄 Revisions Requested — ' + now;
                badge.style.cssText = 'font-size:12px;padding:4px 12px;border-radius:20px;background:rgba(239,68,68,0.15);color:#f87171;font-weight:600;';
                document.getElementById('fabApproveBtn').style.display = 'inline-flex';
                document.getElementById('fabApproveBtn').textContent = '✅ Resubmit for Approval';
                document.getElementById('fabRejectBtn').style.display = 'none';
                document.getElementById('fabApprovalSignature').innerHTML = '';
                showToast('Revision requested — please update prerequisites and resubmit', 'warning');
            }
        }

        function fabWizardUpdateUI() {
            // Update dots
            document.querySelectorAll('.fab-step-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === fabWizardStep);
                dot.classList.toggle('done', i < fabWizardStep);
            });
            document.querySelectorAll('.fab-step-line').forEach((line, i) => {
                line.classList.toggle('done', i < fabWizardStep);
            });
            // Show/hide steps
            document.querySelectorAll('.fab-step').forEach((s, i) => {
                s.style.display = i === fabWizardStep ? 'block' : 'none';
            });
            // Nav buttons
            document.getElementById('fabWizPrev').style.display = fabWizardStep > 0 ? 'inline-flex' : 'none';
            const isLast = fabWizardStep === FAB_STEPS - 1;
            document.getElementById('fabWizNext').style.display = isLast ? 'none' : 'inline-flex';
            document.getElementById('fabWizCreate').style.display = isLast ? 'inline-flex' : 'none';
        }

        function fabWizardNext() {
            if (fabWizardStep === 0) {
                // Validate prerequisites
                const preChecks = ['fabPre1', 'fabPre2', 'fabPre3', 'fabPre4', 'fabPre5'];
                const checked = preChecks.filter(id => document.getElementById(id).checked).length;
                if (checked < 5) { showToast('All 5 prerequisite checks must be completed', 'warning'); return; }
                // Check design/engineering approval
                if (!fabApproved) { showToast('Prerequisites must be approved by Design/Engineering before proceeding', 'warning'); return; }
            }
            if (fabWizardStep === 1) {
                if (!document.getElementById('fabProduct').value.trim()) { showToast('Product/Component name is required', 'error'); return; }
            }
            if (fabWizardStep === 2) {
                if (!document.getElementById('fabCustomer').value || document.getElementById('fabCustomer').value === 'Select Customer...') { showToast('Please select a customer', 'error'); return; }
            }
            if (fabWizardStep < FAB_STEPS - 1) { fabWizardStep++; fabWizardUpdateUI(); }
            if (fabWizardStep === FAB_STEPS - 1) updateFabReleaseSummary();
        }

        function fabWizardPrev() {
            if (fabWizardStep > 0) { fabWizardStep--; fabWizardUpdateUI(); }
        }

        function addFabBomRow() {
            const tbody = document.getElementById('fabBomTable');
            const idx = tbody.children.length + 1;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" class="form-control" value="${idx * 10}" style="width:45px;padding:4px 6px;font-size:12px;"></td>
                <td><input type="text" class="form-control" placeholder="Component name" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="text" class="form-control" placeholder="Spec / Material" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="number" class="form-control" value="1" min="1" style="width:50px;padding:4px 6px;font-size:12px;"></td>
                <td><input type="text" class="form-control" placeholder="Warehouse / Source" style="font-size:12px;padding:4px 8px;"></td>
                <td style="text-align:center;"><input type="checkbox"></td>
                <td style="text-align:center;"><input type="checkbox" checked></td>
                <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()">✕</button></td>
            `;
            tbody.appendChild(row);
        }

        function addFabRoutingRow(workCenter, idx) {
            const tbody = document.getElementById('fabRoutingTable');
            const i = idx !== undefined ? idx : tbody.children.length;
            const stepNum = String((i + 1) * 10).padStart(3, '0');
            const centers = ['Plate Cutting', 'Rolling', 'Fit-up', 'Welding', 'NDT', 'Nozzle Fit-up', 'Hydrotest', 'Blasting/Painting'];
            const descs = ['CNC Plasma cut', '3-roll initial pinch', 'Tack weld assembly', 'SAW seam weld', 'Radiography test', 'Weld nozzles/manhole', 'Hydrostatic pressure test', 'Epoxy primer coating'];
            const hrs = [2.0, 1.5, 3.0, 5.0, 2.0, 4.0, 2.0, 3.0];
            const row = document.createElement('tr');
            const wcVal = workCenter || centers[i] || 'Work Center';
            const descVal = descs[i] || 'Operation';
            const hrVal = hrs[i] || 1.0;
            row.innerHTML = `
                <td><input type="text" class="form-control" value="${stepNum}" style="width:50px;padding:4px 6px;font-size:12px;"></td>
                <td><select class="form-control" style="font-size:12px;padding:4px 6px;">${centers.map(c => `<option ${c === wcVal ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
                <td><input type="text" class="form-control" value="${descVal}" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="number" class="form-control" value="${hrVal}" step="0.5" style="width:65px;padding:4px 6px;font-size:12px;"></td>
                <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()">✕</button></td>
            `;
            tbody.appendChild(row);
        }

        function addFabSubRow() {
            const tbody = document.getElementById('fabSubTable');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><select class="form-control" style="font-size:12px;padding:4px 6px;"><option>Purchase Requisition</option><option>Subcontract PO</option><option>Heat Treatment</option><option>Material Transfer</option></select></td>
                <td><input type="text" class="form-control" placeholder="Description" style="font-size:12px;padding:4px 8px;"></td>
                <td><select class="form-control" style="font-size:12px;padding:4px 6px;"><option>Pending</option><option>Approved</option><option>Completed</option></select></td>
                <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()">✕</button></td>
            `;
            tbody.appendChild(row);
        }

        function updateFabReleaseSummary() {
            const container = document.getElementById('fabReleaseSummary');
            const data = [
                ['Order Type', document.getElementById('fabType').value],
                ['Product', document.getElementById('fabProduct').value || '—'],
                ['Customer', document.getElementById('fabCustomer').value || '—'],
                ['PO Ref', document.getElementById('fabPO').value || '—'],
                ['Shop', document.getElementById('fabShop').value],
                ['Quantity', document.getElementById('fabQty').value],
                ['Start Date', document.getElementById('fabStartDate').value || '—'],
                ['End Date', document.getElementById('fabEndDate').value || '—'],
                ['Drawing Spec', document.getElementById('fabDrawingSpec').value],
                ['WPS', document.getElementById('fabWps').value || '—'],
                ['PQR', document.getElementById('fabPqr').value || '—'],
                ['WQT', document.getElementById('fabWqt').value || '—'],
                ['NDT', document.getElementById('fabNdt').value || '—'],
                ['BOM Items', document.getElementById('fabBomTable').children.length],
                ['Routing Steps', document.getElementById('fabRoutingTable').children.length],
                ['Sub-Orders', document.getElementById('fabSubTable').children.length],
            ];
            container.innerHTML = data.map(([label, val]) => `
                <div style="background:var(--bg);padding:8px 12px;border-radius:6px;font-size:12px;">
                    <span style="color:var(--text-muted);">${label}</span><br>
                    <strong>${val}</strong>
                </div>
            `).join('');
            // Preset doc list
            document.getElementById('fabDocList').innerHTML = [
                'Air_Receiver_GA_Drawing_Rev3.pdf',
                'WPS_SMAW_6G.pdf',
                'Material_Certificate_SA516_70.pdf'
            ].map(d => `<span style="background:var(--bg);padding:4px 10px;border-radius:4px;font-size:12px;border:1px solid var(--border);">📄 ${d}</span>`).join('');
        }

        function createFabOrder() {
            if (!document.getElementById('fabReleaseCheck').checked) { showToast('Please confirm release by checking the box', 'warning'); return; }
            // Gather BOM
            const bomRows = document.querySelectorAll('#fabBomTable tr');
            const bom = Array.from(bomRows).map(tr => {
                const cells = tr.querySelectorAll('input, select');
                return { item: parseInt(cells[0]?.value) || 0, component: cells[1]?.value || '', spec: cells[2]?.value || '', qty: parseInt(cells[3]?.value) || 1, source: cells[4]?.value || '', backflush: cells[5]?.checked || false, issue: cells[6]?.checked || false };
            }).filter(b => b.component);
            // Gather routing
            const routingRows = document.querySelectorAll('#fabRoutingTable tr');
            const routing = Array.from(routingRows).map(tr => {
                const cells = tr.querySelectorAll('input, select');
                return { step: cells[0]?.value || '', workCenter: cells[1]?.value || '', description: cells[2]?.value || '', stdHours: parseFloat(cells[3]?.value) || 0 };
            }).filter(r => r.workCenter);
            // Gather sub-orders
            const subRows = document.querySelectorAll('#fabSubTable tr');
            const subOrders = Array.from(subRows).map(tr => {
                const cells = tr.querySelectorAll('select, input');
                return { type: cells[0]?.value || '', description: cells[1]?.value || '', status: cells[2]?.value || 'Pending' };
            }).filter(s => s.description);
            // Gather inspection holds
            const holdChecks = document.querySelectorAll('#fabStep5 input[type="checkbox"]:checked');
            const holds = Array.from(holdChecks).map(c => c.value);
            // Build order
            const now = new Date();
            const id = 'FO-' + now.getFullYear().toString().slice(-2) + String(DB.get('fabOrders').length + 1).padStart(3, '0');
            const newOrder = {
                id, type: document.getElementById('fabType').value,
                product: document.getElementById('fabProduct').value.trim(),
                quantity: parseInt(document.getElementById('fabQty').value) || 1,
                startDate: document.getElementById('fabStartDate').value || '',
                endDate: document.getElementById('fabEndDate').value || '',
                shop: document.getElementById('fabShop').value,
                customer: document.getElementById('fabCustomer').value,
                poRef: document.getElementById('fabPO').value.trim() || '',
                drawingSpec: document.getElementById('fabDrawingSpec').value,
                materialList: document.getElementById('fabMaterialList').value.trim() || '',
                wps: document.getElementById('fabWps').value.trim() || '',
                pqr: document.getElementById('fabPqr').value.trim() || '',
                wqt: document.getElementById('fabWqt').value.trim() || '',
                wpsPqr: document.getElementById('fabWps').value.trim() || '',
                ndtRequirements: document.getElementById('fabNdt').value.trim() || '',
                deliveryDate: document.getElementById('fabDeliveryDate').value || '',
                status: 'Scheduled',
                notes: document.getElementById('fabNotes').value.trim() || '',
                bom, routing, subOrders,
                labor: { primaryWelder: document.getElementById('fabWelder').value, inspectionHolds: holds },
                documents: ['Air_Receiver_GA_Drawing_Rev3.pdf', 'WPS_SMAW_6G.pdf', 'Material_Certificate_SA516_70.pdf'].map(n => ({ name: n, uploaded: true })),
                createdAt: now.toISOString().split('T')[0]
            };
            saveWithOwner('fabOrders', newOrder);
            // Reset wizard
            document.querySelectorAll('#fabStep0 input[type="checkbox"]').forEach(c => c.checked = false);
            fabWizardStep = 0;
            fabWizardUpdateUI();
            closeModal('fabOrderModal');
            refreshAll();
            showToast(`🏭 Fabrication Order ${newOrder.id} released to ${newOrder.shop}!`);
        }

        function quickFabStatus(orderId) {
            const order = DB.getById('fabOrders', orderId);
            if (!order) return;
            const statuses = ['Scheduled', 'In Progress', 'Completed', 'Closed'];
            const idx = statuses.indexOf(order.status);
            if (idx === -1 || idx >= statuses.length - 1) { showToast('Order already at final status', 'warning'); return; }
            const next = statuses[idx + 1];
            if (!confirm('Advance ' + orderId + ' status to "' + next + '"?')) return;
            DB.update('fabOrders', orderId, { ...order, status: next });
            renderFabOrders();
            renderFabStats();
            showToast('✅ ' + orderId + ' status updated to ' + next, 'success');
        }

        // ===== FAB ORDER DETAIL VIEW =====
        function openFabDetail(orderId) {
            const order = DB.getById('fabOrders', orderId);
            if (!order) { showToast('Order not found', 'error'); return; }
            _currentFabOrderId = orderId;
            document.getElementById('fabDetailId').textContent = order.id;
            document.getElementById('fabDetailStatus').innerHTML = `<span class="badge badge-${order.status.toLowerCase().replace(/\s+/g, '-')}">${order.status}</span>`;
            document.getElementById('fabDetailInfo').innerHTML = `
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;"><span style="color:var(--text-muted);font-size:12px;">Product</span><br><strong>${order.product || '—'}</strong></div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;"><span style="color:var(--text-muted);font-size:12px;">Type</span><br><strong>${order.type || '—'}</strong></div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;"><span style="color:var(--text-muted);font-size:12px;">Customer</span><br><strong>${order.customer || '—'}</strong></div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;"><span style="color:var(--text-muted);font-size:12px;">PO Ref</span><br><strong>${order.poRef || '—'}</strong></div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;"><span style="color:var(--text-muted);font-size:12px;">Shop</span><br><strong>${order.shop || '—'}</strong></div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;"><span style="color:var(--text-muted);font-size:12px;">Qty</span><br><strong>${order.quantity || 1}</strong></div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;"><span style="color:var(--text-muted);font-size:12px;">Dates</span><br><strong>${order.startDate || '—'} → ${order.endDate || '—'}</strong></div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;"><span style="color:var(--text-muted);font-size:12px;">Drawing Spec</span><br><strong>${order.drawingSpec || '—'}</strong></div>
            `;
            // BOM
            const bom = order.bom || [];
            document.getElementById('fabDetailBom').innerHTML = bom.length ? bom.map(b => `
                <tr>
                    <td>${b.item}</td>
                    <td>${b.component}</td>
                    <td style="font-size:12px;">${b.spec || ''}</td>
                    <td>${b.qty}</td>
                    <td style="font-size:12px;">${b.source || ''}</td>
                    <td style="text-align:center;">${b.issue ? '📋' : '—'}</td>
                </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No BOM items</td></tr>';
            // Routing
            const routing = order.routing || [];
            document.getElementById('fabDetailRouting').innerHTML = routing.length ? routing.map(r => `
                <tr>
                    <td>${r.step}</td>
                    <td>${r.workCenter}</td>
                    <td>${r.description}</td>
                    <td>${r.stdHours}h</td>
                </tr>
            `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No routing defined</td></tr>';
            // Labor
            const labor = order.labor || {};
            document.getElementById('fabDetailLabor').innerHTML = `
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;">
                    <span style="color:var(--text-muted);font-size:12px;">Primary Welder</span><br><strong>${labor.primaryWelder || 'Not assigned'}</strong>
                </div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;">
                    <span style="color:var(--text-muted);font-size:12px;">Inspection Holds</span><br>
                    ${(labor.inspectionHolds || []).length ? (labor.inspectionHolds || []).map(h => `<span class="badge badge-pending" style="margin:2px;">${h}</span>`).join('') : '<span style="font-size:13px;">None</span>'}
                </div>
            `;
            // Sub-Orders
            const subs = order.subOrders || [];
            document.getElementById('fabDetailSubs').innerHTML = subs.length ? subs.map(s => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg);border-radius:6px;">
                    <div><strong style="font-size:13px;">${s.type}</strong><br><span style="font-size:12px;color:var(--text-muted);">${s.description}</span></div>
                    <span class="badge badge-${s.status.toLowerCase()}">${s.status}</span>
                </div>
            `).join('') : '<p style="color:var(--text-muted);font-size:13px;">No sub-orders</p>';
            // WPS / PQR / WQT
            document.getElementById('fabDetailQuals').innerHTML = `
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;">
                    <span style="color:var(--text-muted);font-size:12px;">📄 WPS (Welding Procedure Spec)</span><br><strong>${order.wps || order.wpsPqr || '—'}</strong>
                </div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;">
                    <span style="color:var(--text-muted);font-size:12px;">📋 PQR (Procedure Qualification Record)</span><br><strong>${order.pqr || '—'}</strong>
                </div>
                <div style="background:var(--bg);padding:10px 14px;border-radius:6px;">
                    <span style="color:var(--text-muted);font-size:12px;">🔧 WQT (Welder Qualification Test)</span><br><strong>${order.wqt || '—'}</strong>
                </div>
            `;
            renderFabQualUploaded(order);
            // Docs
            const docs = order.documents || [];
            document.getElementById('fabDetailDocs').innerHTML = docs.length ? docs.map(d => `
                <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg);border-radius:6px;">
                    <span>📄</span>
                    <span style="font-size:13px;">${d.name}</span>
                    <span style="margin-left:auto;color:var(--accent);font-size:12px;">${d.uploaded ? '✓ Uploaded' : 'Pending'}</span>
                </div>
            `).join('') : '<p style="color:var(--text-muted);font-size:13px;">No documents</p>';
            renderFabDocUploaded(order);
            // NDT / Material / Notes
            document.getElementById('fabDetailNdt').innerHTML = order.ndtRequirements || '—';
            document.getElementById('fabDetailMaterial').innerHTML = order.materialList || '—';
            document.getElementById('fabDetailNotes').innerHTML = order.notes || '<span style="color:var(--text-muted);">No notes</span>';

            document.getElementById('fabDetailModal').classList.add('active');
        }

        function renderFabQualUploaded(order) {
            const quals = order.qualDocs || [];
            document.getElementById('fabQualUploadedList').innerHTML = quals.length
                ? quals.map(q => `
                    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg);border-radius:6px;font-size:12px;margin-top:6px;">
                        <span>📄</span>
                        <span><strong>${q.type}</strong>: ${q.ref}</span>
                        <span style="margin-left:auto;color:var(--text-muted);font-size:11px;">${q.name}</span>
                        <span style="color:var(--accent);font-size:11px;">✓</span>
                    </div>
                `).join('')
                : '<p style="font-size:12px;color:var(--text-muted);margin-top:6px;">No qualification documents uploaded yet</p>';
        }

        function renderFabDocUploaded(order) {
            const docs = order.fabDocs || [];
            document.getElementById('fabDocUploadedList').innerHTML = docs.length
                ? docs.map(d => `
                    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg);border-radius:6px;font-size:12px;margin-top:6px;">
                        <span>📄</span>
                        <span>${d.name}</span>
                        <span style="margin-left:auto;color:var(--text-muted);font-size:11px;">${new Date(d.uploadedAt).toLocaleDateString()}</span>
                        <span style="color:var(--accent);font-size:11px;">✓</span>
                    </div>
                `).join('')
                : '<p style="font-size:12px;color:var(--text-muted);margin-top:6px;">No drawings or documents uploaded yet</p>';
        }

        function uploadFabQualDoc() {
            const orderId = _currentFabOrderId;
            if (!orderId) return;
            const fileInput = document.getElementById('fabQualFileInput');
            const file = fileInput.files[0];
            if (!file) return;
            const type = document.getElementById('fabQualUploadType').value;
            const ref = document.getElementById('fabQualRef').value.trim() || '—';
            const reader = new FileReader();
            reader.onload = function(ev) {
                const order = DB.getById('fabOrders', orderId);
                if (!order) return;
                const quals = order.qualDocs || [];
                quals.push({ type, ref, name: file.name, data: ev.target.result, uploadedAt: new Date().toISOString() });
                order.qualDocs = quals;
                DB.update('fabOrders', order.id, order);
                renderFabQualUploaded(order);
                showToast('✅ ' + type + ' document uploaded: ' + file.name, 'success');
                fileInput.value = '';
                document.getElementById('fabQualRef').value = '';
            };
            reader.readAsDataURL(file);
        }

        function uploadFabDoc() {
            const orderId = _currentFabOrderId;
            if (!orderId) return;
            const fileInput = document.getElementById('fabDocFileInput');
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                const order = DB.getById('fabOrders', orderId);
                if (!order) return;
                const docs = order.fabDocs || [];
                docs.push({ name: file.name, data: ev.target.result, uploadedAt: new Date().toISOString() });
                order.fabDocs = docs;
                DB.update('fabOrders', order.id, order);
                renderFabDocUploaded(order);
                showToast('✅ Drawing/document uploaded: ' + file.name, 'success');
                fileInput.value = '';
            };
            reader.readAsDataURL(file);
        }

        function printFabTraveler() {
            const orderId = _currentFabOrderId;
            if (!orderId) { showToast('No order selected', 'error'); return; }
            const order = DB.getById('fabOrders', orderId);
            if (!order) { showToast('Order not found', 'error'); return; }
            const w = window.open('', '_blank');
            w.document.write(`
                <html><head><title>Traveler - ${order.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
                    h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 6px; }
                    h2 { font-size: 14px; margin-top: 16px; }
                    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                    th, td { border: 1px solid #999; padding: 4px 8px; text-align: left; }
                    th { background: #eee; }
                    .info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 10px 0; }
                    .info div { background: #f5f5f5; padding: 6px 10px; border-radius: 4px; }
                    .info strong { display: block; font-size: 13px; }
                    .info span { font-size: 11px; color: #666; }
                    .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 11px; color: #666; }
                    .status-box { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 13px; }
                </style></head><body>
                <h1>🏭 Fabrication Traveler — ${order.id}</h1>
                <div class="info">
                    <div><span>Product</span><strong>${order.product || '—'}</strong></div>
                    <div><span>Customer</span><strong>${order.customer || '—'}</strong></div>
                    <div><span>PO Ref</span><strong>${order.poRef || '—'}</strong></div>
                    <div><span>Shop</span><strong>${order.shop || '—'}</strong></div>
                    <div><span>Qty</span><strong>${order.quantity || 1}</strong></div>
                    <div><span>Status</span><strong>${order.status}</strong></div>
                    <div><span>Start</span><strong>${order.startDate || '—'}</strong></div>
                    <div><span>End</span><strong>${order.endDate || '—'}</strong></div>
                    <div><span>Drawing Spec</span><strong>${order.drawingSpec || '—'}</strong></div>
                </div>
                <h2>📦 BOM (${(order.bom || []).length} items)</h2>
                ${(order.bom || []).length ? '<table><tr><th>Item</th><th>Component</th><th>Spec</th><th>Qty</th><th>Source</th></tr>' + order.bom.map(b => '<tr><td>' + b.item + '</td><td>' + b.component + '</td><td>' + (b.spec || '') + '</td><td>' + b.qty + '</td><td>' + (b.source || '') + '</td></tr>').join('') + '</table>' : '<p>No BOM items</p>'}
                <h2>🔧 Routing (${(order.routing || []).length} steps)</h2>
                ${(order.routing || []).length ? '<table><tr><th>Step</th><th>Work Center</th><th>Description</th><th>Std Hrs</th></tr>' + order.routing.map(r => '<tr><td>' + r.step + '</td><td>' + r.workCenter + '</td><td>' + r.description + '</td><td>' + (r.stdHours || 0) + 'h</td></tr>').join('') + '</table>' : '<p>No routing defined</p>'}
                <h2>📄 WPS / PQR / WQT</h2>
                <div class="info">
                    <div><span>WPS</span><strong>${order.wps || order.wpsPqr || '—'}</strong></div>
                    <div><span>PQR</span><strong>${order.pqr || '—'}</strong></div>
                    <div><span>WQT</span><strong>${order.wqt || '—'}</strong></div>
                </div>
                <h2>🔬 NDT Requirements</h2>
                <p>${order.ndtRequirements || '—'}</p>
                <h2>📝 Notes</h2>
                <p>${order.notes || 'None'}</p>
                <div class="footer">
                    <p>Printed: ${new Date().toLocaleString()} | Traveler for ${order.id}</p>
                    <div style="margin-top:20px;">
                        <div style="display:inline-block;margin-right:40px;"><span>Inspector: _______________</span></div>
                        <div style="display:inline-block;"><span>Date: _______________</span></div>
                    </div>
                </div>
                </body></html>
            `);
            w.document.close();
            setTimeout(() => { w.focus(); w.print(); }, 500);
        }

        function updateFabStatus() {
            const orderId = _currentFabOrderId;
            if (!orderId) return;
            const order = DB.getById('fabOrders', orderId);
            if (!order) return;
            const statuses = ['Scheduled', 'In Progress', 'Completed', 'Closed'];
            const idx = statuses.indexOf(order.status);
            if (idx === -1 || idx >= statuses.length - 1) { showToast('Order already at final status', 'warning'); return; }
            const next = statuses[idx + 1];
            if (!confirm('Advance ' + orderId + ' status to "' + next + '"?')) return;
            DB.update('fabOrders', orderId, { ...order, status: next });
            openFabDetail(orderId);
            renderFabOrders();
            renderFabStats();
            showToast('✅ ' + orderId + ' status updated to ' + next, 'success');
        }

        function showFabDetailTab(tab, el) {
            ['bom','routing','labor','subs','quals','docs'].forEach(t => {
                document.getElementById('fabDetail' + t.charAt(0).toUpperCase() + t.slice(1) + 'Tab').style.display = t === tab ? 'block' : 'none';
            });
            if (el) {
                el.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                el.classList.add('active');
            }
        }

        function renderCustomers() {
            const customers = DB.get('customers');
            console.log('[DEBUG] renderCustomers — count:', customers.length, 'IDs:', customers.map(c => c.id).join(', '));
            document.getElementById('customersTable').innerHTML = customers.map(c => `
                <tr>
                    <td><strong><span class="trace-link">${c.id}</span></strong></td>
                    <td><strong>${c.company}</strong></td>
                    <td>${c.name}</td>
                    <td><a href="mailto:${c.email}" style="color:var(--info);text-decoration:none;">${c.email}</a></td>
                    <td>${c.phone}</td>
                    <td>${c.address ? c.address.split(',')[0] : '-'}</td>
                    <td><span class="badge badge-${(c.type || 'Other').toLowerCase().replace(/\s+/g, '-')}">${c.type || 'Other'}</span></td>
                    <td><span class="badge badge-${(c.status || 'Active').toLowerCase().replace(/\s+/g, '-')}">${c.status || 'Active'}</span></td>
                    <td>${c.assignedTo || '-'}</td>
                    <td style="font-size:12px;">${c.since || '-'}</td>
                    <td>
                        <button class="btn btn-xs btn-info" onclick="editCustomer('${c.id}')">Edit</button>
                        <button class="btn btn-xs btn-danger" onclick="deleteRecord('customers','${c.id}')">Delete</button>
                    </td>
                </tr>
            `).join('');

            // Customer stats
            const active = customers.filter(c => c.status === 'Active').length;
            const leads = customers.filter(c => c.status === 'Lead').length;
            const corporate = customers.filter(c => c.type === 'Corporate').length;
            document.getElementById('customerStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">👥</div>
                    <div class="stat-content">
                        <h3>${customers.length}</h3>
                        <p>Total Customers</p>
                        <div class="stat-trend trend-up">↑ ${active} active</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe);">🏢</div>
                    <div class="stat-content">
                        <h3>${corporate}</h3>
                        <p>Corporate Accounts</p>
                        <div class="stat-trend trend-up">Major clients</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #fef3c7, #fde68a);">⭐</div>
                    <div class="stat-content">
                        <h3>${leads}</h3>
                        <p>Active Leads</p>
                        <div class="stat-trend trend-up">↑ Follow up</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #ede9fe, #ddd6fe);">📋</div>
                    <div class="stat-content">
                        <h3>${DB.get('workOrders').filter(w => customers.some(c => (w.client||'').includes(c.company||''))).length}</h3>
                        <p>Associated Jobs</p>
                        <div class="stat-trend trend-up">Active projects</div>
                    </div>
                </div>
            `;
        }

        function updateHeaderStats() {
            const activeWO = DB.get('workOrders').filter(w => w.status !== 'Closed' && w.status !== 'Completed').length;
            const pendingQA = DB.get('workOrders').filter(w => w.status === 'QA Review').length;
            const lowStock = DB.get('inventory').filter(i => i.status === 'Low Stock').length;
            const activeSC = DB.get('serviceCalls').filter(s => s.status !== 'Completed').length;

            document.getElementById('headerActiveJobs').textContent = activeWO;
            document.getElementById('headerPendingQA').textContent = pendingQA;
            document.getElementById('headerLowStock').textContent = lowStock;
            document.getElementById('headerServiceCalls').textContent = activeSC;
        }

        // ========================================================================
        //  DOCUMENT MANAGEMENT
        // ========================================================================
        let currentDocId = null;

        function escHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function getValue(id) {
            var el = document.getElementById(id);
            return el ? el.value : '';
        }
        function getText(id) {
            var el = document.getElementById(id);
            return el ? (el.textContent || el.innerText || '') : '';
        }
        function setText(id, val) {
            var el = document.getElementById(id);
            if (el) el.textContent = val;
        }
        function setVal(id, val) {
            var el = document.getElementById(id);
            if (el) el.value = val;
        }
        function isChecked(id) {
            var el = document.getElementById(id);
            return el ? el.checked : false;
        }

        function formatFileSize(bytes) {
            if (!bytes) return '--';
            const units = ['B', 'KB', 'MB', 'GB'];
            let i = 0;
            let size = bytes;
            while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
            return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
        }

        function getDocIcon(type) {
            const icons = { 'Drawing': '[D]', 'Certificate': '[C]', 'WPS': '[W]', 'Report': '[R]', 'Specification': '[S]', 'Manual': '[M]', 'Other': '[F]' };
            return icons[type] || '[F]';
        }

        function getDocTypeClass(type) {
            const map = { 'Drawing': 'drawing', 'Certificate': 'certificate', 'WPS': 'wps', 'Report': 'report', 'Specification': 'specification', 'Manual': 'manual' };
            return 'doc-type-' + (map[type] || 'other');
        }

        function renderDocuments() {
            let docs = DB.get('documents');
            const q = (document.getElementById('docSearch') ? document.getElementById('docSearch').value : '').toLowerCase();
            const typeFilter = document.getElementById('docTypeFilter') ? document.getElementById('docTypeFilter').value : 'all';

            if (q) docs = docs.filter(d => d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q) || (d.tags || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q));
            if (typeFilter !== 'all') docs = docs.filter(d => d.type === typeFilter);

            const total = DB.get('documents').length;
            const typeCounts = {};
            DB.get('documents').forEach(d => { typeCounts[d.type] = (typeCounts[d.type] || 0) + 1; });
            const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
            const linked = DB.get('documents').filter(d => d.linkedRef).length;
            const d30 = new Date(); d30.setDate(d30.getDate() - 30);
            const recent = DB.get('documents').filter(d => { return new Date(d.createdAt || 0) > d30; }).length;

            document.getElementById('docStats').innerHTML = [
                '<div class="doc-stat-card" onclick="document.getElementById(\'docTypeFilter\').value=\'all\';renderDocuments();">',
                    '<div class="ds-icon" style="background:rgba(6,182,212,0.12);color:var(--secondary);">[D]</div>',
                    '<div class="ds-content"><h4>' + total + '</h4><p>Total Documents</p></div>',
                '</div>',
                '<div class="doc-stat-card" onclick="document.getElementById(\'docTypeFilter\').value=\'' + (topType ? topType[0] : 'all') + '\';renderDocuments();">',
                    '<div class="ds-icon" style="background:rgba(16,185,129,0.12);color:var(--accent);">[T]</div>',
                    '<div class="ds-content"><h4>' + (topType ? escHtml(topType[0]) : '--') + '</h4><p>Top Type</p></div>',
                '</div>',
                '<div class="doc-stat-card">',
                    '<div class="ds-icon" style="background:rgba(59,130,246,0.12);color:var(--info);">[L]</div>',
                    '<div class="ds-content"><h4>' + linked + '</h4><p>Linked Records</p></div>',
                '</div>',
                '<div class="doc-stat-card">',
                    '<div class="ds-icon" style="background:rgba(245,158,11,0.12);color:var(--warning);">[N]</div>',
                    '<div class="ds-content"><h4>' + recent + '</h4><p>Added (30d)</p></div>',
                '</div>'
            ].join('\n');

            const grid = document.getElementById('docGrid');
            if (!docs.length) {
                grid.innerHTML = '<div class="doc-empty"><span>[D]</span><h3>No documents found</h3><p style="color:var(--text-muted);">' + (q ? 'Try a different search term' : 'Upload your first document to get started') + '</p></div>';
                return;
            }

            grid.innerHTML = docs.map(function(d) {
                const typeClass = getDocTypeClass(d.type);
                const linkedLabel = d.linkedRef ? (d.linkedType === 'workOrder' ? '[WO] ' + d.linkedRef : d.linkedType === 'fabOrder' ? '[FO] ' + d.linkedRef : d.linkedType === 'customer' ? '[C] ' + d.linkedRef : d.linkedType === 'salesOrder' ? '[SO] ' + d.linkedRef : d.linkedRef) : '';
                const sizeLabel = d.fileSize ? formatFileSize(d.fileSize) : '';
                const statusBadge = d.status ? '<span class="badge badge-' + d.status.toLowerCase() + '">' + d.status + '</span>' : '';
                const dateLabel = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '';
                return '<div class="doc-card ' + typeClass + '" onclick="viewDocument(\'' + d.id + '\')">' +
                    '<div class="doc-card-preview">' + getDocIcon(d.type) + '</div>' +
                    '<div class="doc-card-body">' +
                        '<h4 title="' + escHtml(d.name) + '">' + escHtml(d.name) + '</h4>' +
                        '<div class="dc-meta">' +
                            '<span>' + statusBadge + (d.type ? ' <span style="color:var(--text-secondary);">' + escHtml(d.type) + '</span>' : '') + '</span>' +
                            (d.category ? '<span>[F] ' + escHtml(d.category) + '</span>' : '') +
                            (linkedLabel ? '<span>[L] ' + linkedLabel + '</span>' : '') +
                            '<span style="display:flex;justify-content:space-between;">' + (dateLabel ? '<span>[D] ' + dateLabel + '</span>' : '') + (sizeLabel ? '<span>' + sizeLabel + '</span>' : '') + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="doc-card-footer">' +
                        '<button class="btn btn-xs btn-success" onclick="event.stopPropagation();downloadDocument(\'' + d.id + '\')">[v]</button>' +
                        '<button class="btn btn-xs btn-info" onclick="event.stopPropagation();editDocument(\'' + d.id + '\')">[E]</button>' +
                        '<button class="btn btn-xs btn-danger" onclick="event.stopPropagation();confirmDeleteDoc(\'' + d.id + '\')">[X]</button>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        function openUploadDocModal(editData) {
            document.getElementById('docUploadModal').classList.add('active');
            document.getElementById('docEditId').value = editData ? editData.id : '';
            document.getElementById('docName').value = editData ? editData.name : '';
            document.getElementById('docType').value = editData ? editData.type : 'Drawing';
            document.getElementById('docCategory').value = editData ? (editData.category || '') : '';
            document.getElementById('docVersion').value = editData ? (editData.version || '1.0') : '1.0';
            document.getElementById('docDescription').value = editData ? (editData.description || '') : '';
            document.getElementById('docTags').value = editData ? (editData.tags || '') : '';
            document.getElementById('docStatus').value = editData ? editData.status : 'Final';
            document.getElementById('docNotes').value = editData ? (editData.notes || '') : '';
            document.getElementById('docSaveBtn').textContent = editData ? '[*] Update Document' : '[+] Save Document';

            const refSelect = document.getElementById('docLinkedRef');
            const linkedType = document.getElementById('docLinkedType');
            refSelect.innerHTML = '<option value="">-- None --</option>';

            var groups = [
                { label: 'Work Orders', key: 'workOrder', items: DB.get('workOrders') },
                { label: 'Fab Orders', key: 'fabOrder', items: DB.get('fabOrders') },
                { label: 'Customers', key: 'customer', items: DB.get('customers') },
                { label: 'Sales Orders', key: 'salesOrder', items: DB.get('salesOrders') }
            ];
            groups.forEach(function(group) {
                if (group.items.length) {
                    var optGroup = document.createElement('optgroup');
                    optGroup.label = group.label;
                    group.items.forEach(function(item) {
                        var id = item.id || item.code || item.name;
                        var opt = document.createElement('option');
                        opt.value = group.key + '::' + id;
                        opt.textContent = id + ' - ' + (item.name || item.title || item.client || item.company || '');
                        if (editData && editData.linkedType === group.key && editData.linkedRef === id) opt.selected = true;
                        optGroup.appendChild(opt);
                    });
                    refSelect.appendChild(optGroup);
                }
            });

            if (editData && editData.linkedType && editData.linkedRef) {
                linkedType.value = editData.linkedType;
            } else {
                linkedType.value = '';
            }

            clearDocFile();
            setTimeout(setupDocDropArea, 100);
        }

        function handleDocFileSelect(event) {
            var file = event.target.files[0];
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) { showToast('File exceeds 20MB limit', 'error'); return; }
            showDocFileInfo(file);
        }

        function showDocFileInfo(file) {
            document.getElementById('docFileInfo').style.display = 'block';
            document.getElementById('docFileIcon').textContent = getDocIconByExt(file.name);
            document.getElementById('docFileName').textContent = file.name;
            document.getElementById('docFileSize').textContent = formatFileSize(file.size);
            var nameInput = document.getElementById('docName');
            if (!nameInput.value) nameInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        }

        function getDocIconByExt(filename) {
            var ext = filename.split('.').pop().toLowerCase();
            var icons = { 'pdf': '[P]', 'dwg': '[D]', 'jpg': '[I]', 'jpeg': '[I]', 'png': '[I]', 'doc': '[W]', 'docx': '[W]', 'xls': '[X]', 'xlsx': '[X]' };
            return icons[ext] || '[F]';
        }

        function setupDocDropArea() {
            var area = document.getElementById('docUploadArea');
            var input = document.getElementById('docFileInput');
            if (!area) return;
            area.onclick = function() { input.click(); };
            area.ondragover = function(e) { e.preventDefault(); area.classList.add('dragover'); };
            area.ondragleave = function() { area.classList.remove('dragover'); };
            area.ondrop = function(e) {
                e.preventDefault();
                area.classList.remove('dragover');
                var file = e.dataTransfer.files[0];
                if (file) {
                    if (file.size > 20 * 1024 * 1024) { showToast('File exceeds 20MB limit', 'error'); return; }
                    input.files = e.dataTransfer.files;
                    showDocFileInfo(file);
                }
            };
        }

        function clearDocFile() {
            document.getElementById('docFileInfo').style.display = 'none';
            document.getElementById('docFileInput').value = '';
        }

        function updateDocLinkedLabel() {
            var val = document.getElementById('docLinkedRef').value;
            document.getElementById('docLinkedType').value = val ? val.split('::')[0] : '';
        }

        function saveDocument() {
            var name = document.getElementById('docName').value.trim();
            var type = document.getElementById('docType').value;
            if (!name) { showToast('Please enter a document name', 'error'); return; }

            var editId = document.getElementById('docEditId').value;
            var fileInput = document.getElementById('docFileInput');
            var file = fileInput.files[0];
            var refVal = document.getElementById('docLinkedRef').value;
            var linkedType = refVal ? refVal.split('::')[0] : '';
            var linkedRef = refVal ? refVal.split('::')[1] : '';

            var docData = {
                name: name,
                type: type,
                category: document.getElementById('docCategory').value.trim(),
                version: document.getElementById('docVersion').value.trim() || '1.0',
                description: document.getElementById('docDescription').value.trim(),
                tags: document.getElementById('docTags').value.trim(),
                status: document.getElementById('docStatus').value,
                linkedType: linkedType,
                linkedRef: linkedRef,
                notes: document.getElementById('docNotes').value.trim(),
                fileSize: file ? file.size : 0,
                fileName: file ? file.name : '',
                fileData: null
            };

            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    docData.fileData = e.target.result;
                    finalizeSave(docData, editId);
                };
                reader.readAsDataURL(file);
            } else {
                if (editId) {
                    var existing = DB.getById('documents', editId, 'id');
                    if (existing && existing.fileData) {
                        docData.fileData = existing.fileData;
                        docData.fileName = existing.fileName;
                        docData.fileSize = existing.fileSize;
                    }
                }
                finalizeSave(docData, editId);
            }
        }

        function finalizeSave(docData, editId) {
            if (editId) {
                docData.id = editId;
                docData.updatedAt = new Date().toISOString();
                var existing = DB.getById('documents', editId, 'id');
                docData.createdAt = existing ? existing.createdAt : new Date().toISOString();
                DB.update('documents', editId, docData, 'id');
                showToast('Document updated', 'success');
            } else {
                var count = DB.get('documents').length;
                docData.id = 'DOC-' + String(count + 1).padStart(4, '0');
                docData.createdAt = new Date().toISOString();
                docData.updatedAt = new Date().toISOString();
                saveWithOwner('documents', docData);
                showToast('Document uploaded', 'success');
            }
            closeModal('docUploadModal');
            renderDocuments();
        }

        function viewDocument(id) {
            currentDocId = id;
            var d = DB.getById('documents', id, 'id');
            if (!d) { showToast('Document not found', 'error'); return; }

            document.getElementById('docViewerTitle').textContent = getDocIcon(d.type) + ' ' + escHtml(d.name);
            document.getElementById('docViewerIcon').textContent = getDocIcon(d.type);
            document.getElementById('docViewerType').textContent = d.type || '--';
            document.getElementById('docViewerCategory').textContent = d.category || '--';
            document.getElementById('docViewerVersion').textContent = d.version || '1.0';
            document.getElementById('docViewerStatus').textContent = d.status || 'Draft';
            document.getElementById('docViewerStatus').className = 'badge badge-' + (d.status || 'draft').toLowerCase();
            document.getElementById('docViewerSize').textContent = d.fileSize ? formatFileSize(d.fileSize) : '--';
            document.getElementById('docViewerCreated').textContent = d.createdAt ? new Date(d.createdAt).toLocaleString() : '--';
            document.getElementById('docViewerTags').textContent = d.tags || '--';
            document.getElementById('docViewerNotes').textContent = d.notes || '--';

            if (d.linkedRef) {
                var linkLabels = { workOrder: 'Work Order', fabOrder: 'Fab Order', customer: 'Customer', salesOrder: 'Sales Order' };
                document.getElementById('docViewerLinked').innerHTML = '<span style="cursor:pointer;color:var(--info);text-decoration:underline;" onclick="navigateToRef(\'' + d.linkedType + '\',\'' + d.linkedRef + '\')">' + (linkLabels[d.linkedType] || d.linkedType) + ': ' + d.linkedRef + '</span>';
            } else {
                document.getElementById('docViewerLinked').innerHTML = '<span style="color:var(--text-muted);">--</span>';
            }

            var previewPanel = document.getElementById('docPreviewPanel');
            if (d.fileData) {
                var ext = (d.fileName || '').split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].indexOf(ext) !== -1) {
                    previewPanel.innerHTML = '<img src="' + d.fileData + '" style="max-width:100%;max-height:400px;border-radius:6px;" alt="' + escHtml(d.name) + '">';
                } else if (ext === 'pdf') {
                    previewPanel.innerHTML = '<embed src="' + d.fileData + '" type="application/pdf" style="width:100%;height:400px;border-radius:6px;">';
                } else {
                    previewPanel.innerHTML = '<div style="text-align:center;color:var(--text-muted);"><span style="font-size:64px;">' + getDocIcon(d.type) + '</span><p style="margin-top:12px;font-size:13px;">Preview not available for this file type</p><p style="font-size:12px;color:var(--text-muted);">Click Download to view the file</p></div>';
                }
            } else {
                previewPanel.innerHTML = '<div style="text-align:center;color:var(--text-muted);"><span style="font-size:64px;">' + getDocIcon(d.type) + '</span><p style="margin-top:12px;font-size:13px;">No file uploaded</p></div>';
            }

            document.getElementById('docViewerModal').classList.add('active');
        }

        function downloadDocument(id) {
            var d = DB.getById('documents', id, 'id');
            if (!d) { showToast('Document not found', 'error'); return; }
            if (d.fileData) {
                var a = document.createElement('a');
                a.href = d.fileData;
                a.download = d.fileName || d.name + '.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast('Downloading ' + d.name, 'info');
            } else {
                showToast('No file attached to this document', 'warning');
            }
        }

        function confirmDeleteDoc(id) {
            var d = DB.getById('documents', id, 'id');
            if (!d) return;
            if (confirm('Are you sure you want to delete "' + d.name + '"?')) {
                deleteDocument(id);
            }
        }

        function deleteDocument(id) {
            DB.delete('documents', id, 'id');
            showToast('Document deleted', 'info');
            closeModal('docViewerModal');
            renderDocuments();
        }

        function editDocument(id) {
            var d = DB.getById('documents', id, 'id');
            if (!d) { showToast('Document not found', 'error'); return; }
            closeModal('docViewerModal');
            openUploadDocModal(d);
        }

        function navigateToRef(type, ref) {
            closeModal('docViewerModal');
            if (type === 'workOrder') {
                var el = document.querySelector('[data-section="job-management"]');
                if (el) navigateTo('job-management', el);
            } else if (type === 'fabOrder') {
                var el = document.querySelector('[data-section="fabrication"]');
                if (el) navigateTo('fabrication', el);
            } else if (type === 'customer') {
                var el = document.querySelector('[data-section="customers"]');
                if (el) navigateTo('customers', el);
            } else if (type === 'salesOrder') {
                var el = document.querySelector('[data-section="sales"]');
                if (el) navigateTo('sales', el);
            }
        }

        function importEmbeddedDocs() {
            var existing = DB.get('documents').map(function(d) { return d.name; });
            var imported = 0;

            DB.get('workOrders').forEach(function(wo) {
                (wo.documents || []).forEach(function(doc) {
                    if (existing.indexOf(doc.name) === -1) {
                        var count = DB.get('documents').length;
                        var newDoc = {
                            id: 'DOC-' + String(count + 1).padStart(4, '0'),
                            name: doc.name,
                            type: 'Other',
                            category: 'From Work Order',
                            version: '1.0',
                            description: 'Imported from ' + wo.id,
                            tags: '',
                            status: 'Final',
                            linkedType: 'workOrder',
                            linkedRef: wo.id,
                            fileName: doc.name,
                            fileSize: 0,
                            fileData: null,
                            notes: 'Auto-imported from Work Order',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        saveWithOwner('documents', newDoc);
                        imported++;
                        existing.push(doc.name);
                    }
                });
            });

            DB.get('fabOrders').forEach(function(fo) {
                var fields = ['documents', 'qualDocs', 'fabDocs'];
                fields.forEach(function(field) {
                    (fo[field] || []).forEach(function(doc) {
                        var docName = typeof doc === 'string' ? doc : doc.name;
                        if (docName && existing.indexOf(docName) === -1) {
                            var count = DB.get('documents').length;
                            var newDoc = {
                                id: 'DOC-' + String(count + 1).padStart(4, '0'),
                                name: docName,
                                type: field === 'qualDocs' ? 'Certificate' : 'Drawing',
                                category: 'From Fab Order',
                                version: '1.0',
                                description: 'Imported from ' + fo.id + ' (' + field + ')',
                                tags: '',
                                status: 'Final',
                                linkedType: 'fabOrder',
                                linkedRef: fo.id,
                                fileName: docName,
                                fileSize: 0,
                                fileData: null,
                                notes: 'Auto-imported from Fabrication Order',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            saveWithOwner('documents', newDoc);
                            imported++;
                            existing.push(docName);
                        }
                    });
                });
            });

            showToast('Imported ' + imported + ' document(s) from jobs', imported > 0 ? 'success' : 'info');
            renderDocuments();
        }
        // ========================================================================
        //  NAVIGATION
        // ========================================================================
        function navigateTo(section, element) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(`${section}-section`);
            if (target) target.classList.add('active');

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            if (element) element.classList.add('active');

            // Update breadcrumb
            const labels = {
                'dashboard': 'Dashboard', 'job-management': 'Job Management', 'fabrication': 'Fabrication / MRP',
                'maintenance-services': 'Maintenance & Repair', 'quality': 'Quality Management',
                'design': 'Design Department',
                'maintenance': 'Maintenance / Assets', 'inventory': 'Inventory',
                'customers': 'Customer Management', 'purchasing': 'Purchasing', 'client-pos': 'Client P.O', 'sales': 'Sales & Billing', 'accounting': 'Accounting',
                'reports': 'Reports & BI', 'documents': 'Documents',
                'costing': 'Project Costing'
            };
            document.getElementById('breadcrumbSection').textContent = labels[section] || section;
            document.getElementById('breadcrumbCurrent').textContent = 'Overview';

            if (window.innerWidth < 768) {
                document.getElementById('sidebar').classList.remove('mobile-open');
                document.getElementById('sidebarOverlay').classList.remove('show');
            }

            // Refresh section-specific content
            if (section === 'maintenance-services') {
                renderMarWorkOrders();
            }
            if (section === 'fabrication') {
                renderFabStats();
                renderFabOrders();
            }
            if (section === 'design') {
                renderDesignReviews();
            }
            if (section === 'quality') {
                renderMethodStatements();
            }
            if (section === 'accounting') {
                renderAccounting();
            }
            if (section === 'purchasing') {
                renderPurchasing();
            }
            if (section === 'client-pos') {
                renderClientPOs();
            }
            if (section === 'sales') {
                renderSales();
            }
            if (section === 'documents') {
                renderDocuments();
            }
            if (section === 'costing') {
                renderCosting();
            }
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('mobile-open');
            document.getElementById('sidebarOverlay').classList.toggle('show');
        }

        // ========================================================================
        //  MODAL FUNCTIONS
        // ========================================================================
        function selectWoBranch(branch) {
            // Update card styles
            document.querySelectorAll('[id^="woBranch"]').forEach(el => {
                if (el.id.startsWith('woBranch') && el.id.endsWith('Details')) return;
                el.style.borderColor = 'var(--border)';
                el.style.background = '';
            });
            const fabCard = document.getElementById('woBranchFab');
            const marCard = document.getElementById('woBranchMar');
            const npCard = document.getElementById('woBranchNp');
            // Hide all detail sections first
            document.getElementById('woBranchFabDetails').style.display = 'none';
            document.getElementById('woBranchMarDetails').style.display = 'none';
            document.getElementById('woBranchNpDetails').style.display = 'none';
            document.getElementById('woApprovalHseRow').style.display = 'none';
            document.getElementById('woApprovalQcRow').style.display = 'none';
            document.getElementById('woApprovalNpRow').style.display = 'none';
            if (branch === 'fab') {
                fabCard.style.borderColor = 'var(--accent)';
                fabCard.style.background = '#f0fdf4';
                document.getElementById('woBranchFabDetails').style.display = 'block';
                document.getElementById('woApprovalQcRow').style.display = 'table-row';
            } else if (branch === 'mar') {
                marCard.style.borderColor = 'var(--info)';
                marCard.style.background = '#f0f7ff';
                document.getElementById('woBranchMarDetails').style.display = 'block';
                document.getElementById('woApprovalHseRow').style.display = 'table-row';
            } else if (branch === 'nonpressure') {
                npCard.style.borderColor = '#d97706';
                npCard.style.background = '#fffbeb';
                document.getElementById('woBranchNpDetails').style.display = 'block';
                document.getElementById('woApprovalNpRow').style.display = 'table-row';
            }
            // Select the radio
            const radio = document.querySelector(`input[name="woBranch"][value="${branch}"]`);
            if (radio) radio.checked = true;
        }

        function setWoCategory(category) {
            // Update code reference dropdown
            const sel = document.getElementById('woCodeRef');
            sel.innerHTML = '';
            const fabCodes = ['ASME Section VIII, Div 1', 'ASME Section I', 'ASME B31.3', 'MS 1262 (Malaysia)', 'PED 2014/68/EU', 'Customer Specific'];
            const repairCodes = ['ASME PCC-2', 'API 510', 'API 570', 'API 653', 'API 579 / FFS', 'Customer Specific'];
            const npCodes = ['AWS D1.1 / D1.3', 'BS 5950 / EN 1993', 'MS 1464 (Malaysia)', 'ISO 3834', 'API 650 (Tank)', 'Customer Specific'];
            const codeMap = { fab: fabCodes, repair: repairCodes, nonpressure: npCodes };
            (codeMap[category] || fabCodes).forEach(c => { const o = document.createElement('option'); o.textContent = c; sel.appendChild(o); });

            // Auto-select the matching branch in Section 4
            const branchMap = { fab: 'fab', repair: 'mar', nonpressure: 'nonpressure' };
            selectWoBranch(branchMap[category] || 'fab');

            // Auto-set the document type in Submission Responsibility section
            const docType = document.getElementById('woSubDocType');
            if (docType) {
                const dtMap = { fab: 'drawing', repair: 'method', nonpressure: 'fabrication-drawing' };
                docType.value = dtMap[category] || 'drawing';
                updateWoResponsibleHint();
            }

            // Update trade/skill dropdown based on category
            const tradeSel = document.getElementById('woTrade');
            if (tradeSel) {
                const tradeMap = {
                    fab: ['Fabrication / Welding (ASME Sec IX)', 'Fitting / Assembly', 'NDT / Inspection', 'Electrical / Instrument', 'Machining', 'General Labour'],
                    repair: ['Operations', 'HSE / Maintenance', 'Fitter', 'NDT Level II', 'Certified Welder', 'QC', 'Painter', 'Compliance'],
                    nonpressure: ['Structural Welding / Erection', 'Fitting / Assembly', 'Electrical / Instrument', 'Machining', 'General Labour', 'Painter / Coating']
                };
                const opts = tradeMap[category] || tradeMap.fab;
                tradeSel.innerHTML = opts.map(t => '<option' + (t === opts[0] ? ' selected' : '') + '>' + t + '</option>').join('');
            }

            // Auto-switch approval type radio
            const approvalRadio = document.querySelector('input[name="woRegApprovalType"][value="' + (category === 'repair' ? 'repair' : 'design') + '"]');
            if (approvalRadio) { approvalRadio.checked = true; toggleWoRegApprovalType(); }
        }

        // Backward compat
        function toggleWoCodeRef(category) { setWoCategory(category); }

        function insertRegulatoryTemplate() {
            const ta = document.getElementById('woDescription');
            const title = document.getElementById('woTitle').value.trim() || '[Equipment Name]';
            const drawingNo = prompt('Enter Drawing No. (e.g. AR-101-Rev3):', 'AR-101-Rev3') || '[Drawing No.]';
            const regulator = document.getElementById('woRegBody').value || '[Regulatory Body]';
            const thirdParty = document.getElementById('woRegThirdParty').value || '[Third Party]';
            const template = `Regulatory Requirement:\nThis pressure vessel (${title}) falls under Factories and Machinery (FMA) Act 1967 (Malaysia) / or local equivalent.\n\nMandatory Condition Before Fabrication Start:\nThe construction drawing (Drawing No. ${drawingNo}) must be submitted to and fully approved by ${regulator} (or appointed third-party: ${thirdParty}).\n\nAction upon approval:\nThe approved drawing, stamped with DOSH/Third-Party approval chop and reference number, shall be uploaded to this Work Order before the Fabrication Order can be released to the shop floor.\n\nConsequence of non-compliance:\nFabrication without approved drawing is a violation of FMA 1967 (Section 24) and will result in:\n- Rejection of the vessel\n- Inability to obtain Certificate of Fitness (CF)\n- Potential legal action and fines`;
            ta.value = ta.value ? ta.value + '\n\n---\n\n' + template : template;
            showToast('📋 Regulatory template inserted into description');
        }

        function handleWoRegFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            document.getElementById('woRegDoc').value = file.name;
            showToast(`✅ ${file.name} selected for approval document`);
            event.target.value = '';
        }

        function toggleWoRegApprovalType() {
            const type = document.querySelector('input[name="woRegApprovalType"]:checked');
            if (!type) return;
            const isDesign = type.value === 'design';
            document.getElementById('woRegDesignFields').style.display = isDesign ? 'block' : 'none';
            document.getElementById('woRegRepairFields').style.display = isDesign ? 'none' : 'block';
            const title = document.getElementById('woSubTitle');
            const subtitle = document.getElementById('woSubSubtitle');
            if (isDesign) {
                title.textContent = '👤 Submission Design Approval Gate';
                subtitle.textContent = 'Assign who prepares & submits the required document for approval';
            } else {
                title.textContent = '📝 Submission Responsibility Assignment Document Repair';
                subtitle.textContent = 'Assign responsibility for preparing and submitting the repair document to AI / DOSH';
            }
        }

        function handleWoRegRepairFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            document.getElementById('woRegRepairDoc').value = file.name;
            showToast(`✅ ${file.name} selected for repair document`);
            event.target.value = '';
        }

        function addMarScopeRow() {
            const container = document.getElementById('woMarScopeContainer');
            const rows = container.querySelectorAll('.wo-mar-scope-row');
            const num = rows.length + 1;
            const div = document.createElement('div');
            div.className = 'wo-mar-scope-row';
            div.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center;';
            div.innerHTML = `<span style="font-size:11px;min-width:24px;font-weight:700;">${num}</span>
                <input type="text" class="form-control" placeholder="Activity description" style="font-size:12px;flex:2;">
                <select class="form-control" style="font-size:12px;flex:1;">
                    <option>Operations</option><option>HSE / Maintenance</option><option>Fitter</option><option>NDT Level II</option><option>Certified Welder</option><option>QC</option><option>Painter</option><option>Compliance</option>
                </select>
                <button class="btn btn-xs btn-ghost" onclick="this.closest('.wo-mar-scope-row').remove()" style="color:#dc2626;">✕</button>`;
            container.appendChild(div);
        }

        function addMarHpRow() {
            const container = document.getElementById('woMarHoldPoints');
            const rows = container.querySelectorAll('.wo-mar-hp-row');
            const num = rows.length + 1;
            const div = document.createElement('div');
            div.className = 'wo-mar-hp-row';
            div.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;align-items:center;font-size:11px;';
            div.innerHTML = `<span style="min-width:36px;font-weight:700;">HP-${num}</span>
                <input type="text" class="form-control" style="font-size:11px;flex:2;" placeholder="After activity">
                <input type="text" class="form-control" style="font-size:11px;flex:1;" placeholder="Required sign-off">
                <select class="form-control" style="font-size:11px;width:90px;"><option>Waiting</option><option>Cleared</option><option>N/A</option></select>
                <button class="btn btn-xs btn-ghost" onclick="this.closest('.wo-mar-hp-row').remove()" style="color:#dc2626;">✕</button>`;
            container.appendChild(div);
        }

        function updateWoResponsibleHint() {
            const type = document.getElementById('woSubDocType').value;
            const hint = document.getElementById('woResponsibleHint');
            const label = document.getElementById('woResponsibleLabel');
            const sheetsLabel = document.getElementById('woTotalSheetsLabel');
            if (type === 'drawing') {
                label.textContent = 'Responsible Person / Department *';
                sheetsLabel.textContent = 'Total Sheets / Pages';
                hint.textContent = '🖊️ Assign the engineer or department responsible for preparing the construction drawing and submitting it to DOSH / Third Party for approval.';
            } else if (type === 'method') {
                label.textContent = 'Responsible Person / Department *';
                sheetsLabel.textContent = 'Total Pages';
                hint.textContent = '📝 Assign the engineer or department responsible for preparing the method statement (including risk assessment, procedure, and checklist) and submitting it for review and approval.';
            } else {
                label.textContent = 'Responsible Person / Department *';
                sheetsLabel.textContent = 'Total Sheets';
                hint.textContent = '🔩 Assign the person or department responsible for preparing the fabrication / weld map drawing for non-pressure equipment and submitting it for internal QA review.';
            }
        }

        let _salesMode = false;

        function openJobModal() {
            // If sales mode, skip work-order-specific reset and show sales fields
            if (_salesMode) {
                document.getElementById('soSalesFields').style.display = 'block';
                // Set default dates
                const due = document.getElementById('woDueDate');
                if (due) { const d = new Date(); d.setDate(d.getDate() + 21); due.value = d.toISOString().split('T')[0]; }
                const raised = document.getElementById('woRaisedBy');
                if (raised && Auth.getUser()) raised.value = Auth.getUser().name + ', ' + Auth.getUser().role;
                // Reset to Fab
                document.querySelector('input[name="woWorkCategory"][value="fab"]').checked = true;
                setWoCategory('fab');
                document.getElementById('jobModal').classList.add('active');
                return;
            }
            // Reset uploaded files
            window._woUploadedDocs = [];
            document.getElementById('woFileList').innerHTML = '';
            // Set default dates
            const due = document.getElementById('woDueDate');
            if (due) { const d = new Date(); d.setDate(d.getDate() + 21); due.value = d.toISOString().split('T')[0]; }
            const raised = document.getElementById('woRaisedBy');
            if (raised && Auth.getUser()) raised.value = Auth.getUser().name + ', ' + Auth.getUser().role;
            // Preview WO ID
            const preview = document.getElementById('woPreviewId');
            if (preview) preview.textContent = 'WO-' + new Date().getFullYear() + '-' + String(DB.get('workOrders').length + 1).padStart(6, '0');
            // Reset M&R scope/hold points to default rows
            const marScope = document.getElementById('woMarScopeContainer');
            if (marScope) marScope.innerHTML = `<div class="wo-mar-scope-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
                <span style="font-size:11px;min-width:24px;font-weight:700;">1</span>
                <input type="text" class="form-control" placeholder="Activity description" style="font-size:12px;flex:2;" value="Isolate, drain, purge, and degas vessel">
                <select class="form-control" style="font-size:12px;flex:1;">
                    <option>Operations</option><option>HSE / Maintenance</option><option>Fitter</option><option>NDT Level II</option><option>Certified Welder</option><option>QC</option><option>Painter</option><option>Compliance</option>
                </select>
                <button class="btn btn-xs btn-ghost" onclick="this.closest('.wo-mar-scope-row').remove()" style="color:#dc2626;">✕</button>
            </div>`;
            const marHp = document.getElementById('woMarHoldPoints');
            if (marHp) marHp.innerHTML = `<div class="wo-mar-hp-row" style="display:flex;gap:6px;margin-bottom:4px;align-items:center;font-size:11px;">
                <span style="min-width:36px;font-weight:700;">HP-1</span>
                <input type="text" class="form-control" style="font-size:11px;flex:2;" value="Surface preparation (grinding)" placeholder="After activity">
                <input type="text" class="form-control" style="font-size:11px;flex:1;" value="AI visual inspection of repair area" placeholder="Required sign-off">
                <select class="form-control" style="font-size:11px;width:90px;"><option>Waiting</option><option>Cleared</option><option>N/A</option></select>
            </div>`;
            // Reset BOM and routing tables with default rows
            const bomTbody = document.getElementById('woBomTable');
            if (bomTbody) { bomTbody.innerHTML = ''; addWoBomRow(); addWoBomRow(); }
            const routingTbody = document.getElementById('woRoutingTable');
            if (routingTbody) { routingTbody.innerHTML = ''; addWoRoutingRow(); addWoRoutingRow(); }
            // Reset WPS/PQR/WQT/NDT fields
            ['woWpsRef','woPqrRef','woWqtRef','woNdtReq'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            // Reset work category to default (New Fabrication)
            document.querySelector('input[name="woWorkCategory"][value="fab"]').checked = true;
            setWoCategory('fab');
            document.getElementById('woAssignedTo').value = '';
            document.getElementById('jobModal').classList.add('active');
        }
        function openServiceCallModal() { document.getElementById('serviceCallModal').classList.add('active'); }
        function openInspectionModal() {
            // Populate WO/SC dropdown
            const sel = document.getElementById('inspWO');
            sel.innerHTML = [
                ...DB.get('workOrders').map(w => `<option>${w.id}</option>`),
                ...DB.get('serviceCalls').map(s => `<option>${s.id}</option>`)
            ].join('');
            document.getElementById('inspectionModal').classList.add('active');
        }
        function openJobCompletionReportModal() {
            // Populate WO/SC dropdown
            const sel = document.getElementById('jcrWO');
            sel.innerHTML = [
                ...DB.get('workOrders').map(w => `<option value="${w.id}">${w.id} - ${w.project || w.title || ''}</option>`),
                ...DB.get('serviceCalls').map(s => `<option value="${s.id}">${s.id} - ${s.description || s.title || ''}</option>`)
            ].join('');
            // Generate report number
            const rpt = document.getElementById('jcrReportNo');
            if (rpt) rpt.value = 'JCR-' + Date.now().toString(36).toUpperCase();
            // Set default dates
            const today = new Date().toISOString().slice(0, 10);
            const dt = document.getElementById('jcrDate');
            if (dt) dt.value = today;
            const cd = document.getElementById('jcrCompletionDate');
            if (cd) cd.value = today;
            document.getElementById('jobCompletionReportModal').classList.add('active');
        }
        function populateWOFields() {
            const woId = document.getElementById('jcrWO').value;
            if (!woId) return;
            
            // Find the selected work order or service call
            const workOrder = DB.get('workOrders').find(w => w.id === woId);
            const serviceCall = DB.get('serviceCalls').find(s => s.id === woId);
            
            // Clear previous values
            document.getElementById('jcrClient').value = '';
            document.getElementById('jcrEquipment').value = '';
            document.getElementById('jcrEquipmentRegNo').value = '';
            document.getElementById('jcrEquipmentSerialNo').value = '';
            document.getElementById('jcrMaterialUsed').value = '';
            document.getElementById('jcrWelderName').value = '';
            document.getElementById('jcrWelderID').value = '';
            
            // Populate with work order data (if available)
            if (workOrder) {
                // Common fields that might exist in work orders
                if (workOrder.client) document.getElementById('jcrClient').value = workOrder.client;
                if (workOrder.clientName) document.getElementById('jcrClient').value = workOrder.clientName;
                if (workOrder.equipment) document.getElementById('jcrEquipment').value = workOrder.equipment;
                if (workOrder.equipmentName) document.getElementById('jcrEquipment').value = workOrder.equipmentName;
                if (workOrder.equipmentRegNo) document.getElementById('jcrEquipmentRegNo').value = workOrder.equipmentRegNo;
                if (workOrder.equipmentSerialNo) document.getElementById('jcrEquipmentSerialNo').value = workOrder.equipmentSerialNo;
                if (workOrder.materials) document.getElementById('jcrMaterialUsed').value = workOrder.materials;
                if (workOrder.welderName) document.getElementById('jcrWelderName').value = workOrder.welderName;
                if (workOrder.welderNo) document.getElementById('jcrWelderID').value = workOrder.welderNo;
                
                // Work details
                if (workOrder.weldedLength) document.getElementById('jcrMaterialUsed').value = workOrder.weldedLength + 'm of ' + (workOrder.material || '');
                if (workOrder.weldingType) document.getElementById('jcrMaterialUsed').value = workOrder.weldingType;
            }
            
            // Populate with service call data (if available and no work order found)
            else if (serviceCall) {
                if (serviceCall.client) document.getElementById('jcrClient').value = serviceCall.client;
                if (serviceCall.clientName) document.getElementById('jcrClient').value = serviceCall.clientName;
                if (serviceCall.equipment) document.getElementById('jcrEquipment').value = serviceCall.equipment;
                if (serviceCall.equipmentName) document.getElementById('jcrEquipment').value = serviceCall.equipmentName;
                if (serviceCall.equipmentRegNo) document.getElementById('jcrEquipmentRegNo').value = serviceCall.equipmentRegNo;
                if (serviceCall.equipmentSerialNo) document.getElementById('jcrEquipmentSerialNo').value = serviceCall.equipmentSerialNo;
                if (serviceCall.materials) document.getElementById('jcrMaterialUsed').value = serviceCall.materials;
                if (serviceCall.welderName) document.getElementById('jcrWelderName').value = serviceCall.welderName;
                if (serviceCall.welderNo) document.getElementById('jcrWelderID').value = serviceCall.welderNo;
                
                if (serviceCall.weldedLength) document.getElementById('jcrMaterialUsed').value = serviceCall.weldedLength + 'm of ' + (serviceCall.material || '');
                if (serviceCall.weldingType) document.getElementById('jcrMaterialUsed').value = serviceCall.weldingType;
            }
        }
        function saveJobCompletionReport() {
            const reportNo = getValue('jcrReportNo');
            const date = getValue('jcrDate');
            const wo = getValue('jcrWO');
            const client = getValue('jcrClient');
            const equipment = getValue('jcrEquipment');
            const equipmentRegNo = getValue('jcrEquipmentRegNo');
            const equipmentSerialNo = getValue('jcrEquipmentSerialNo');
            const materialUsed = getValue('jcrMaterialUsed');
            const welderName = getValue('jcrWelderName');
            const welderID = getValue('jcrWelderID');
            const workPerformed = getValue('jcrWorkPerformed');
            const completionDate = getValue('jcrCompletionDate');
            const completedBy = getValue('jcrCompletedBy');
            const qualityStatus = getValue('jcrQualityStatus');
            const siteSupervisor = getValue('jcrSiteSupervisor');
            const qcInspector = getValue('jcrQcInspector');
            const notes = getValue('jcrNotes');

            if (!reportNo || !date || !wo || !client || !equipment || !workPerformed || !completionDate || !completedBy || !qualityStatus) {
                showToast('Please fill all required fields', 'error');
                return;
            }

            const data = {
                id: DB.genId('quality'),
                type: 'jobCompletionReport',
                reportNo: reportNo,
                date: date,
                wo: wo,
                client: client,
                equipment: equipment,
                equipmentRegNo: equipmentRegNo,
                equipmentSerialNo: equipmentSerialNo,
                materialUsed: materialUsed,
                welderName: welderName,
                welderID: welderID,
                workPerformed: workPerformed,
                completionDate: completionDate,
                completedBy: completedBy,
                qualityStatus: qualityStatus,
                siteSupervisor: siteSupervisor,
                qcInspector: qcInspector,
                notes: notes,
                createdAt: new Date().toISOString()
            };

            saveWithOwner('quality', data);
            closeModal('jobCompletionReportModal');
            showToast('Job completion report saved', 'success');
        }
        function printJobCompletionReport() {
            var win = window.open('', '_blank', 'width=1000,height=800');
            if (!win) {
                showToast('⚠️ Please allow popups for PDF printing', 'error');
                return;
            }
            var html = '<h1 style="text-align:center;color:#dc2626;">JOB COMPLETION REPORT</h1>';
            html += '<p style="text-align:center;">Generated from ADDeN ERP System</p>';
            html += '<div style="margin-bottom:20px;">';
            html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
            html += '<tr><td style="width:25%;"><strong>Report No:</strong> ' + getValue('jcrReportNo') + '</td><td style="width:25%;"><strong>Date:</strong> ' + getValue('jcrDate') + '</td><td style="width:25%;"><strong>Related WO/SO:</strong> ' + getValue('jcrWO') + '</td><td style="width:25%;"><strong>Equipment:</strong> ' + getValue('jcrEquipment') + '</td></tr>';
            html += '<tr><td><strong>Client:</strong> ' + getValue('jcrClient') + '</td><td><strong>Completion Date:</strong> ' + getValue('jcrCompletionDate') + '</td><td><strong>Completed By:</strong> ' + getValue('jcrCompletedBy') + '</td><td><strong>Quality Status:</strong> ' + getValue('jcrQualityStatus') + '</td></tr>';
            html += '</table></div>';
            html += '<h2 style="color:#dc2626;border-bottom:1px solid #ddd;">Equipment Information</h2>';
            html += '<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:20px;">';
            html += '<tr><td style="width:33%;"><strong>Equipment Reg. No.:</strong> ' + getValue('jcrEquipmentRegNo') + '</td><td style="width:33%;"><strong>Equipment Serial No.:</strong> ' + getValue('jcrEquipmentSerialNo') + '</td><td style="width:34%;"><strong>Material Used:</strong> ' + getValue('jcrMaterialUsed') + '</td></tr>';
            html += '</table>';
            html += '<h2 style="color:#dc2626;border-bottom:1px solid #ddd;">Welding Information</h2>';
            html += '<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:20px;">';
            html += '<tr><td style="width:50%;"><strong>Welder Name:</strong> ' + getValue('jcrWelderName') + '</td><td style="width:50%;"><strong>Welder ID No.:</strong> ' + getValue('jcrWelderID') + '</td></tr>';
            html += '</table>';
            html += '<h2 style="color:#dc2626;border-bottom:1px solid #ddd;">Work Performed</h2>';
            html += '<p style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:4px;font-size:12px;margin-bottom:20px;">' + getValue('jcrWorkPerformed') + '</p>';
            html += '<h2 style="color:#dc2626;border-bottom:1px solid #ddd;">Signatures</h2>';
            html += '<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:20px;">';
            html += '<tr style="background:#dc2626;color:#fff;"><th style="padding:8px;border:1px solid #999;">Role</th><th style="padding:8px;border:1px solid #999;">Name</th><th style="padding:8px;border:1px solid #999;">Date</th></tr>';
            html += '<tr><td style="padding:8px;border:1px solid #999;"><strong>Client</strong></td><td style="padding:8px;border:1px solid #999;">-</td><td style="padding:8px;border:1px solid #999;">-</td></tr>';
            html += '<tr><td style="padding:8px;border:1px solid #999;"><strong>Site Supervisor</strong></td><td style="padding:8px;border:1px solid #999;">' + getValue('jcrSiteSupervisor') + '</td><td style="padding:8px;border:1px solid #999;">-</td></tr>';
            html += '<tr><td style="padding:8px;border:1px solid #999;"><strong>QC Inspector</strong></td><td style="padding:8px;border:1px solid #999;">' + getValue('jcrQcInspector') + '</td><td style="padding:8px;border:1px solid #999;">-</td></tr>';
            html += '</table>';
            if (getValue('jcrNotes')) {
                html += '<h2 style="color:#dc2626;border-bottom:1px solid #ddd;margin-top:20px;">Additional Notes</h2>';
                html += '<p style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:4px;font-size:12px;">' + getValue('jcrNotes') + '</p>';
            }
            printWindow(win, 'Job Completion Report - ' + getValue('jcrReportNo'), html);
        }
        function openInventoryModal() { showToast('📱 Open barcode scanner or manual entry form', 'info'); }

        function openCustomerModal() { 
            document.getElementById('custEditId').value = '';
            document.getElementById('customerModalTitle').textContent = '👥 New Customer Record';
            document.getElementById('custCompany').value = '';
            document.getElementById('custName').value = '';
            document.getElementById('custEmail').value = '';
            document.getElementById('custPhone').value = '';
            document.getElementById('custAddress').value = '';
            document.getElementById('custType').value = 'Corporate';
            document.getElementById('custStatus').value = 'Active';
            document.getElementById('custAssignedTo').value = '';
            document.getElementById('customerModal').classList.add('active');
        }

        function editCustomer(id) {
            const c = DB.getById('customers', id);
            if (!c) { showToast('Customer not found', 'error'); return; }
            document.getElementById('custEditId').value = id;
            document.getElementById('customerModalTitle').textContent = '✏️ Edit Customer';
            document.getElementById('custCompany').value = c.company || '';
            document.getElementById('custName').value = c.name || '';
            document.getElementById('custEmail').value = c.email || '';
            document.getElementById('custPhone').value = c.phone || '';
            document.getElementById('custAddress').value = c.address || '';
            document.getElementById('custType').value = c.type || 'Corporate';
            document.getElementById('custStatus').value = c.status || 'Active';
            document.getElementById('custAssignedTo').value = c.assignedTo || '';
            document.getElementById('customerModal').classList.add('active');
        }

        function saveCustomer() {
            const editId = document.getElementById('custEditId').value;
            const company = document.getElementById('custCompany').value.trim();
            const name = document.getElementById('custName').value.trim();
            if (!company || !name) { showToast('Company and customer name are required', 'error'); return; }
            if (editId) {
                DB.update('customers', editId, {
                    name: name,
                    company: company,
                    email: document.getElementById('custEmail').value.trim(),
                    phone: document.getElementById('custPhone').value.trim(),
                    address: document.getElementById('custAddress').value.trim() || 'Address TBD',
                    type: document.getElementById('custType').value,
                    status: document.getElementById('custStatus').value,
                    assignedTo: document.getElementById('custAssignedTo').value.trim()
                });
                closeModal('customerModal');
                refreshAll();
                showToast('Customer ' + company + ' updated!', 'success');
            } else {
                const newCust = {
                    id: 'CUST-' + String(DB.get('customers').length + 1).padStart(3, '0'),
                    name: name,
                    company: company,
                    contact: name,
                    email: document.getElementById('custEmail').value.trim(),
                    phone: document.getElementById('custPhone').value.trim(),
                    address: document.getElementById('custAddress').value.trim() || 'Address TBD',
                    type: document.getElementById('custType').value,
                    status: document.getElementById('custStatus').value,
                    assignedTo: document.getElementById('custAssignedTo').value.trim(),
                    since: new Date().toISOString().split('T')[0]
                };
                saveWithOwner('customers', newCust);
                closeModal('customerModal');
                refreshAll();
                console.log('[DEBUG] Saved customer:', newCust.id, 'Total:', DB.get('customers').length);
                showToast('Customer ' + company + ' (' + name + ') added!');
            }
        }

        function switchCustomerTab(tab) {
            document.getElementById('customerListTab').style.display = tab === 'list' ? '' : 'none';
            document.getElementById('equipmentListTab').style.display = tab === 'equipment' ? '' : 'none';
            document.getElementById('tabCustomers').className = 'tab' + (tab === 'list' ? ' active' : '');
            document.getElementById('tabEquipment').className = 'tab' + (tab === 'equipment' ? ' active' : '');
            if (tab === 'equipment') renderEquipment();
        }

        function renderEquipment() {
            const list = DB.get('equipment');
            const customers = DB.get('customers');
            document.getElementById('equipmentTable').innerHTML = list.map(e => {
                const cust = customers.find(c => c.id === e.customerId);
                return '<tr>' +
                    '<td><strong>' + e.name + '</strong></td>' +
                    '<td>' + (e.regNo || '-') + '</td>' +
                    '<td>' + (e.serialNo || '-') + '</td>' +
                    '<td>' + (e.yearMfg || '-') + '</td>' +
                    '<td>' + (e.lastRepair || '-') + '</td>' +
                    '<td>' + (e.designPressure || '-') + '</td>' +
                    '<td>' + (e.designTemp || '-') + '</td>' +
                    '<td>' + (cust ? cust.company : '-') + '</td>' +
                    '<td>' + (e.assignedTo || '-') + '</td>' +
                    '<td><div class="btn-group">' +
                    '<button class="btn btn-xs btn-info" onclick="editEquipment(\'' + e.id + '\')">Edit</button>' +
                    '<button class="btn btn-xs btn-danger" onclick="deleteRecord(\'equipment\',\'' + e.id + '\')">Delete</button>' +
                    '</div></td></tr>';
            }).join('');
        }

        function openEquipmentModal() {
            document.getElementById('equipEditId').value = '';
            document.getElementById('equipmentModalTitle').textContent = '🔧 New Pressure Equipment';
            document.getElementById('equipName').value = '';
            document.getElementById('equipRegNo').value = '';
            document.getElementById('equipSerialNo').value = '';
            document.getElementById('equipYearMfg').value = '';
            document.getElementById('equipLastRepair').value = '';
            document.getElementById('equipDesignPressure').value = '';
            document.getElementById('equipDesignTemp').value = '';
            document.getElementById('equipAssignedTo').value = '';
            const sel = document.getElementById('equipCustomer');
            sel.innerHTML = '<option value="">-- Select Customer --</option>' +
                DB.get('customers').map(c => '<option value="' + c.id + '">' + c.company + ' (' + c.name + ')</option>').join('');
            document.getElementById('equipmentModal').classList.add('active');
        }

        function editEquipment(id) {
            const e = DB.get('equipment').find(eq => eq.id === id);
            if (!e) { showToast('Equipment not found', 'error'); return; }
            document.getElementById('equipEditId').value = id;
            document.getElementById('equipmentModalTitle').textContent = '✏️ Edit Pressure Equipment';
            document.getElementById('equipName').value = e.name || '';
            document.getElementById('equipRegNo').value = e.regNo || '';
            document.getElementById('equipSerialNo').value = e.serialNo || '';
            document.getElementById('equipYearMfg').value = e.yearMfg || '';
            document.getElementById('equipLastRepair').value = e.lastRepair || '';
            document.getElementById('equipDesignPressure').value = e.designPressure || '';
            document.getElementById('equipDesignTemp').value = e.designTemp || '';
            const sel = document.getElementById('equipCustomer');
            sel.innerHTML = '<option value="">-- Select Customer --</option>' +
                DB.get('customers').map(c => '<option value="' + c.id + '">' + c.company + ' (' + c.name + ')</option>').join('');
            sel.value = e.customerId || '';
            document.getElementById('equipAssignedTo').value = e.assignedTo || '';
            document.getElementById('equipmentModal').classList.add('active');
        }

        function saveEquipment() {
            const editId = document.getElementById('equipEditId').value;
            const name = document.getElementById('equipName').value.trim();
            if (!name) { showToast('Equipment name is required', 'error'); return; }
            const data = {
                name: name,
                regNo: document.getElementById('equipRegNo').value.trim(),
                serialNo: document.getElementById('equipSerialNo').value.trim(),
                yearMfg: document.getElementById('equipYearMfg').value,
                lastRepair: document.getElementById('equipLastRepair').value,
                designPressure: document.getElementById('equipDesignPressure').value,
                designTemp: document.getElementById('equipDesignTemp').value,
                customerId: document.getElementById('equipCustomer').value,
                assignedTo: document.getElementById('equipAssignedTo').value.trim()
            };
            if (editId) {
                DB.update('equipment', editId, data);
                closeModal('equipmentModal');
                renderEquipment();
                showToast('Equipment updated!', 'success');
            } else {
                data.id = 'EQP-' + String(DB.get('equipment').length + 1).padStart(3, '0');
                saveWithOwner('equipment', data);
                closeModal('equipmentModal');
                renderEquipment();
                showToast('Equipment ' + data.name + ' added!');
            }
        }

        function handleWoFileUpload(event) {
            const files = event.target.files;
            if (!files.length) return;
            if (!window._woUploadedDocs) window._woUploadedDocs = [];
            const list = document.getElementById('woFileList');
            for (const file of files) {
                if (file.type !== 'application/pdf') {
                    showToast(file.name + ' is not a PDF — skipped', 'error');
                    continue;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    const doc = { name: file.name, size: file.size, data: e.target.result, uploadedAt: new Date().toISOString() };
                    window._woUploadedDocs.push(doc);
                    const chip = document.createElement('span');
                    chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:var(--accent);color:white;padding:4px 10px;border-radius:20px;font-size:11px;';
                    chip.innerHTML = `📄 ${file.name} <span style="cursor:pointer;opacity:0.8;" onclick="removeWoFile(this,'${file.name}')">×</span>`;
                    list.appendChild(chip);
                };
                reader.readAsDataURL(file);
            }
            event.target.value = '';
        }

        function removeWoFile(el, name) {
            el.parentElement.removeChild(el);
            if (window._woUploadedDocs) {
                window._woUploadedDocs = window._woUploadedDocs.filter(d => d.name !== name);
            }
        }

        function createWorkOrder() {
            const title = document.getElementById('woTitle').value.trim();
            const client = document.getElementById('woClient').value;
            const branch = document.querySelector('input[name="woBranch"]:checked');
            if (!title) { showToast('Work order title is required', 'error'); return; }
            if (client === 'Select Client...') { showToast('Please select a client', 'error'); return; }
            if (!branch) { showToast('Please select a branch: Fabrication, Maintenance & Repair, or Non-Pressure Equipment', 'error'); return; }

            // Validate regulatory gate
            const regStatus = document.getElementById('woRegStatus').value;
            if (regStatus === 'Rejected') {
                showToast('⚠️ Regulatory approval is REJECTED — cannot proceed. Update approval status before submitting.', 'error');
                return;
            }

            const now = new Date();
            const id = 'WO-' + now.getFullYear() + '-' + String(DB.get('workOrders').length + 1).padStart(6, '0');
            const branchVal = branch.value;

            const wo = {
                id, workCategory: document.querySelector('input[name="woWorkCategory"]:checked')?.value || 'fab',
                codeRef: document.getElementById('woCodeRef').value,
                type: document.getElementById('woType').value,
                status: 'New', priority: document.getElementById('woPriority').value,
                raisedBy: document.getElementById('woRaisedBy').value.trim() || 'Unknown',
                assignedTo: document.getElementById('woAssignedTo').value.trim(),
                raisedDate: now.toISOString().split('T')[0] + ' ' + now.toLocaleTimeString(),
                dueDate: document.getElementById('woDueDate').value || '',
                title, client, site: document.getElementById('woSite').value.trim() || 'TBD',
                description: document.getElementById('woDescription').value.trim() || '',
                reason: document.getElementById('woReason').value.trim() || '',
                attachments: (window._woUploadedDocs || []).map(d => d.name).join(', '),
                documents: window._woUploadedDocs || [],
                // Technical design data
                designPressure: document.getElementById('woDesignPressure').value.trim() || '',
                designTemperature: document.getElementById('woDesignTemp').value.trim() || '',
                shellHeadMaterial: document.getElementById('woMaterial').value.trim() || '',
                headType: document.getElementById('woHeadType').value || '',
                testingRequirement: document.getElementById('woTestingReq').value.trim() || '',
                drawingRef: document.getElementById('woDrawingRef').value.trim() || '',
                equipment: document.getElementById('woEquipment').value,
                assetTag: document.getElementById('woAssetTag').value.trim() || '',
                productCode: document.getElementById('woProductCode').value.trim() || '',
                quantity: parseInt(document.getElementById('woQty').value) || 1,
                trade: document.getElementById('woTrade').value,
                laborHours: parseInt(document.getElementById('woLaborHrs').value) || 32,
                requestedEquip: document.getElementById('woRequestedEquip').value || '',
                branch: branchVal,
                // Branch-specific details
                fabType: branchVal === 'fab' ? document.getElementById('woFabType').value : '',
                fabDesignCode: branchVal === 'fab' ? document.getElementById('woFabCode').value : '',
                fabTraceability: branchVal === 'fab' ? document.getElementById('woFabTrace').value : '',
                fabHoldPoints: branchVal === 'fab' ? document.getElementById('woFabHolds').value.trim() : '',
                // BOM / Routing / WPS (merged from Enhanced)
                fabBom: branchVal === 'fab' ? Array.from(document.querySelectorAll('#woBomTable tr')).map(tr => {
                    const cells = tr.querySelectorAll('input');
                    return { item: cells[0]?.value || '', component: cells[1]?.value || '', spec: cells[2]?.value || '', qty: parseInt(cells[3]?.value) || 1, source: cells[4]?.value || '' };
                }).filter(b => b.component) : [],
                fabRouting: branchVal === 'fab' ? Array.from(document.querySelectorAll('#woRoutingTable tr')).map(tr => {
                    const inputs = tr.querySelectorAll('input');
                    const select = tr.querySelector('select');
                    return { step: inputs[0]?.value || '', workCenter: select?.value || '', description: inputs[1]?.value || '', stdHours: parseFloat(inputs[2]?.value) || 0 };
                }).filter(r => r.workCenter) : [],
                fabWpsRef: branchVal === 'fab' ? document.getElementById('woWpsRef').value.trim() : '',
                fabPqrRef: branchVal === 'fab' ? document.getElementById('woPqrRef').value.trim() : '',
                fabWqtRef: branchVal === 'fab' ? document.getElementById('woWqtRef').value.trim() : '',
                fabNdtReq: branchVal === 'fab' ? document.getElementById('woNdtReq').value.trim() : '',
                // M&R branch fields (extended)
                marAssetTag: branchVal === 'mar' ? document.getElementById('woMarAssetTag').value.trim() : '',
                marAssetDesc: branchVal === 'mar' ? document.getElementById('woMarAssetDesc').value.trim() : '',
                marMfr: branchVal === 'mar' ? document.getElementById('woMarMfr').value.trim() : '',
                marYearMfr: branchVal === 'mar' ? document.getElementById('woMarYearMfr').value.trim() : '',
                marDoshReg: branchVal === 'mar' ? document.getElementById('woMarDoshReg').value.trim() : '',
                marCfNo: branchVal === 'mar' ? document.getElementById('woMarCfNo').value.trim() : '',
                marCfExpiry: branchVal === 'mar' ? document.getElementById('woMarCfExpiry').value || '' : '',
                marDesignP: branchVal === 'mar' ? document.getElementById('woMarDesignP').value.trim() : '',
                marMawp: branchVal === 'mar' ? document.getElementById('woMarMawp').value.trim() : '',
                marDesignT: branchVal === 'mar' ? document.getElementById('woMarDesignT').value.trim() : '',
                marMaterial: branchVal === 'mar' ? document.getElementById('woMarMaterial').value.trim() : '',
                marCorrosionAllow: branchVal === 'mar' ? document.getElementById('woMarCorrosionAllow').value.trim() : '',
                marRemWall: branchVal === 'mar' ? document.getElementById('woMarRemWall').value.trim() : '',
                marFaultCodeSel: branchVal === 'mar' ? document.getElementById('woMarFaultCodeSel').value : '',
                marDiscovery: branchVal === 'mar' ? document.getElementById('woMarDiscovery').value : '',
                marProblemDesc: branchVal === 'mar' ? document.getElementById('woMarProblemDesc').value.trim() : '',
                marRisk: branchVal === 'mar' ? document.getElementById('woMarRisk').value.trim() : '',
                marRepairMethod: branchVal === 'mar' ? document.getElementById('woMarRepairMethod').value.trim() : '',
                marRepairClass: branchVal === 'mar' ? document.getElementById('woMarRepairClass').value : '',
                marDoshRequired: branchVal === 'mar' ? document.getElementById('woMarDoshRequired').value : '',
                marAiName: branchVal === 'mar' ? document.getElementById('woMarAiName').value.trim() : '',
                marAiLicense: branchVal === 'mar' ? document.getElementById('woMarAiLicense').value.trim() : '',
                marAiContact: branchVal === 'mar' ? document.getElementById('woMarAiContact').value.trim() : '',
                marChkRepairProc: branchVal === 'mar' ? document.getElementById('woMarChkRepairProc').checked : false,
                marRepairProcRef: branchVal === 'mar' ? document.getElementById('woMarRepairProcRef').value.trim() : '',
                marChkWps: branchVal === 'mar' ? document.getElementById('woMarChkWps').checked : false,
                marWpsRef: branchVal === 'mar' ? document.getElementById('woMarWpsRef').value.trim() : '',
                marChkWelder: branchVal === 'mar' ? document.getElementById('woMarChkWelder').checked : false,
                marWelderRef: branchVal === 'mar' ? document.getElementById('woMarWelderRef').value.trim() : '',
                marChkNdt: branchVal === 'mar' ? document.getElementById('woMarChkNdt').checked : false,
                marChkHydro: branchVal === 'mar' ? document.getElementById('woMarChkHydro').checked : false,
                marHydroPress: branchVal === 'mar' ? document.getElementById('woMarHydroPress').value.trim() : '',
                marDocDosh: branchVal === 'mar' ? document.getElementById('woMarDocDosh').value.trim() : '',
                marDocUt: branchVal === 'mar' ? document.getElementById('woMarDocUt').value.trim() : '',
                marDocRp: branchVal === 'mar' ? document.getElementById('woMarDocRp').value.trim() : '',
                marDocApproval: branchVal === 'mar' ? document.getElementById('woMarDocApproval').value.trim() : '',
                marDocWps: branchVal === 'mar' ? document.getElementById('woMarDocWps').value.trim() : '',
                marDocWelder: branchVal === 'mar' ? document.getElementById('woMarDocWelder').value.trim() : '',
                marDocHydro: branchVal === 'mar' ? document.getElementById('woMarDocHydro').value.trim() : '',
                marSignMgr: branchVal === 'mar' ? document.getElementById('woMarSignMgr').value.trim() : '',
                marSignMgrDate: branchVal === 'mar' ? document.getElementById('woMarSignMgrDate').value || '' : '',
                marSignEng: branchVal === 'mar' ? document.getElementById('woMarSignEng').value.trim() : '',
                marSignEngDate: branchVal === 'mar' ? document.getElementById('woMarSignEngDate').value || '' : '',
                marSignAi: branchVal === 'mar' ? document.getElementById('woMarSignAi').value.trim() : '',
                marSignAiDate: branchVal === 'mar' ? document.getElementById('woMarSignAiDate').value || '' : '',
                marSignHse: branchVal === 'mar' ? document.getElementById('woMarSignHse').value.trim() : '',
                marSignHseDate: branchVal === 'mar' ? document.getElementById('woMarSignHseDate').value || '' : '',
                marClosureNdt: branchVal === 'mar' ? document.getElementById('woMarClosureNdt').checked : false,
                marClosureHydro: branchVal === 'mar' ? document.getElementById('woMarClosureHydro').checked : false,
                marClosureDosh: branchVal === 'mar' ? document.getElementById('woMarClosureDosh').checked : false,
                marClosureReg: branchVal === 'mar' ? document.getElementById('woMarClosureReg').checked : false,
                marClosureCf: branchVal === 'mar' ? document.getElementById('woMarClosureCf').checked : false,
                marClosureWall: branchVal === 'mar' ? document.getElementById('woMarClosureWall').checked : false,
                marClosureNextInsp: branchVal === 'mar' ? document.getElementById('woMarClosureNextInsp').checked : false,
                // Scope rows (collect all)
                marScopeItems: branchVal === 'mar' ? Array.from(document.querySelectorAll('#woMarScopeContainer .wo-mar-scope-row')).map((r,i) => ({
                    item: i+1,
                    activity: r.querySelector('input')?.value || '',
                    trade: r.querySelector('select')?.value || ''
                })) : [],
                // Hold points
                marHoldPoints: branchVal === 'mar' ? Array.from(document.querySelectorAll('#woMarHoldPoints .wo-mar-hp-row')).map((r,i) => ({
                    hp: 'HP-'+(i+1),
                    afterActivity: r.querySelectorAll('input')[0]?.value || '',
                    signoff: r.querySelectorAll('input')[1]?.value || '',
                    status: r.querySelector('select')?.value || 'Waiting'
                })) : [],
                // Non-pressure branch details
                npCategory: branchVal === 'nonpressure' ? document.getElementById('woNpCategory').value : '',
                npWeldStd: branchVal === 'nonpressure' ? document.getElementById('woNpWeldStd').value : '',
                npMaterial: branchVal === 'nonpressure' ? document.getElementById('woNpMaterial').value.trim() : '',
                npPaint: branchVal === 'nonpressure' ? document.getElementById('woNpPaint').value.trim() : '',
                npWeight: branchVal === 'nonpressure' ? document.getElementById('woNpWeight').value.trim() : '',
                npQaRelease: branchVal === 'nonpressure' ? document.getElementById('woNpQaRelease').value : '',
                // Regulatory & Design Approval Gate
                regDesignCode: document.getElementById('woRegDesignCode').value,
                regBody: document.getElementById('woRegBody').value,
                regThirdParty: document.getElementById('woRegThirdParty').value,
                regStatus: document.getElementById('woRegStatus').value,
                regRefNo: document.getElementById('woRegRefNo').value.trim() || '',
                regApprovalDate: document.getElementById('woRegApprovalDate').value || '',
                regValidity: document.getElementById('woRegValidity').value.trim() || '',
                regDoc: document.getElementById('woRegDoc').value.trim() || '',
                regApprovalType: document.querySelector('input[name="woRegApprovalType"]:checked')?.value || 'design',
                regRepairClass: document.getElementById('woRegRepairClass')?.value || '',
                regRepairCode: document.getElementById('woRegRepairCode')?.value || '',
                regDoshNotify: document.getElementById('woRegDoshNotify')?.value || '',
                regAiName: document.getElementById('woRegAiName')?.value.trim() || '',
                regAiLicense: document.getElementById('woRegAiLicense')?.value.trim() || '',
                regAiContact: document.getElementById('woRegAiContact')?.value.trim() || '',
                regRepairProcRef: document.getElementById('woRegRepairProcRef')?.value.trim() || '',
                regRepairDoc: document.getElementById('woRegRepairDoc')?.value.trim() || '',
                // Submission responsibility
                responsiblePerson: document.getElementById('woResponsiblePerson').value.trim() || '',
                subDocType: document.getElementById('woSubDocType').value,
                subTargetDate: document.getElementById('woSubTargetDate').value || '',
                subInstructions: document.getElementById('woSubInstructions').value.trim() || '',
                subSheets: document.getElementById('woSubSheets').value.trim() || '',
                // Approval workflow
                approvalSteps: branchVal === 'fab' ? [
                    { step: 0, role: 'Design Engineer', action: 'Submit construction drawing to DOSH / Third Party', status: 'Pending' },
                    { step: '0a', role: 'DOSH / Third Party', action: 'Review and approve drawing ⛔ BLOCKING POINT', status: 'Pending' },
                    { step: '0b', role: 'QC Manager', action: 'Verify approval document is uploaded', status: 'Pending' },
                    { step: 1, role: 'Requester', action: 'Submit Work Order', status: 'Completed' },
                    { step: 2, role: 'Engineering Manager', action: 'Verify scope & drawing', status: 'Pending' },
                    { step: 3, role: 'Production Planner', action: 'Assign branch', status: 'Pending' },
                    { step: 4, role: 'QC', action: 'Confirm code requirements', status: 'Pending' },
                ] : branchVal === 'nonpressure' ? [
                    { step: 0, role: 'Design Engineer', action: 'Submit construction drawing to DOSH / Third Party', status: 'Pending' },
                    { step: '0a', role: 'DOSH / Third Party', action: 'Review and approve drawing ⛔ BLOCKING POINT', status: 'Pending' },
                    { step: '0b', role: 'QC Manager', action: 'Verify approval document is uploaded', status: 'Pending' },
                    { step: 1, role: 'Requester', action: 'Submit Work Order', status: 'Completed' },
                    { step: 2, role: 'Engineering Manager', action: 'Verify scope & drawing', status: 'Pending' },
                    { step: 3, role: 'Production Planner', action: 'Assign branch', status: 'Pending' },
                    { step: 4, role: 'QA Supervisor', action: 'Release non-pressure equipment — internal QA sign-off', status: 'Pending' },
                ] : [
                    { step: 'Gate 1', role: 'Maintenance Manager', action: 'Submit WO to compliance', status: 'Completed' },
                    { step: 'Gate 2', role: 'PV Engineer', action: 'Draft repair procedure & submit to AI', status: 'In Progress' },
                    { step: 'Gate 3 🔒', role: 'AI / DOSH TPI', action: 'Review & approve repair procedure & WPS ⛔ BLOCKING POINT', status: 'Pending' },
                    { step: 'Gate 4', role: 'HSE Officer', action: 'Issue Hot Work Permit (after approval)', status: 'Pending' },
                    { step: 'Gate 5', role: 'QC / AI', action: 'Witness hydrotest (post-repair)', status: 'Pending' },
                    { step: 'Gate 6', role: 'Compliance', action: 'Update vessel registration (Form JKKP 13)', status: 'Pending' },
                ],
                certifications: ['ASME IX', 'CoC'],
                // Technical prerequisites readiness
                techPreDrawSpec: document.getElementById('woPreDrawSpec').checked,
                techPreMatBom: document.getElementById('woPreMatBom').checked,
                techPreWpsPqr: document.getElementById('woPreWpsPqr').checked,
                techPreNdt: document.getElementById('woPreNdt').checked,
                techPrePoDel: document.getElementById('woPrePoDel').checked,
                createdAt: now.toISOString().split('T')[0]
            };
            saveWithOwner('workOrders', wo);
            closeModal('jobModal');
            refreshAll();
            const branchLabel = { fab: 'Fabrication', mar: 'Maintenance & Repair', nonpressure: 'Non-Pressure Equipment' };
            showToast(`📋 Work Order ${id} created — ${branchLabel[branchVal] || branchVal} branch`);
        }

        function createServiceCall() {
            const newSC = {
                id: 'SC-2024-' + String(DB.get('serviceCalls').length + 1).padStart(3, '0'),
                client: document.getElementById('scClient').value,
                equipment: document.getElementById('scEquipment').value,
                issue: document.getElementById('scDescription').value || 'Issue TBD',
                type: document.getElementById('scType').value,
                priority: document.getElementById('scPriority').value.split(' - ')[0],
                status: 'Dispatched',
                technician: document.getElementById('scTechnician').value,
                eta: new Date().toISOString().split('T')[0] + ' ' + new Date().toLocaleTimeString(),
                sla: document.getElementById('scSLA').value + 'hr'
            };
            saveWithOwner('serviceCalls', newSC);
            closeModal('serviceCallModal');
            refreshAll();
            showToast(`Service Call ${newSC.id} dispatched!`);
        }

        function submitInspection() {
            const newInsp = {
                id: 'INS-2024-' + String(DB.get('inspections').length + 1).padStart(3, '0'),
                wo: document.getElementById('inspWO').value,
                type: document.getElementById('inspType').value,
                inspector: Auth.getUser() ? Auth.getUser().name : 'Current User',
                date: new Date().toISOString().split('T')[0],
                result: document.getElementById('inspResult').value,
                cert: `CERT-${String(DB.get('inspections').length + 1).padStart(3, '0')}.pdf`,
                traceability: `Lot trace verified → ${document.getElementById('inspWO').value}`
            };
            saveWithOwner('inspections', newInsp);
            closeModal('inspectionModal');
            refreshAll();
            showToast('Inspection submitted successfully!');
        }

        // ========================================================================
        //  M&R WORK ORDER DETAIL
        // ========================================================================
        const MAR_PHASES = ['overview','regulatory','material','siteprep','removal','cleaning','antirust','laydown','tackweld','fullweld','testing','reporting','close','closeout','progress'];
        const MAR_PHASE_LABELS = { overview:'📋 Overview', regulatory:'🔒 Regulatory', material:'📦 Material', siteprep:'🚧 Site Prep', removal:'🔨 Removal', cleaning:'🧹 Cleaning', antirust:'🎨 Anti-Rust', laydown:'📐 Laydown', tackweld:'⚡ Tack', fullweld:'🔥 Weld', testing:'💧 Test', reporting:'📝 Reports', close:'✅ Close', closeout:'📊 Closeout', progress:'📈 Progress' };
        const FAB_PHASES = ['overview', 'fabSetup', 'regulatory', 'dispatch', 'progress'];
        const FAB_PHASE_LABELS = { overview:'📋 Overview', fabSetup:'🏭 Fab Wizard', regulatory:'🔒 Regulatory', dispatch:'🚀 Dispatch', progress:'📈 Progress' };

        let _currentMarWoId = null;
        let _isFabWo = false;
        let _currentFabOrderId = null;

        function openMarDetail(woId) {
            const job = DB.getById('workOrders', woId);
            if (!job) return showToast('Work order not found', 'error');
            _currentMarWoId = woId;
            _isFabWo = job.branch === 'fab';

            document.getElementById('marDetailTitle').textContent = job.id + (_isFabWo ? ' — Fabrication' : job.branch === 'mar' ? ' — Maintenance & Repair' : ' — Unassigned');

            // Populate overview
            document.getElementById('marOvStatus').textContent = job.status || 'New';
            document.getElementById('marOvStatus').className = 'badge badge-' + (job.status||'new').toLowerCase().replace(/[\s-]+/g, '-');
            document.getElementById('marOvPriority').textContent = job.priority || 'Medium';
            document.getElementById('marOvPriority').className = 'badge badge-' + (job.priority||'medium').toLowerCase();
            document.getElementById('marOvEquip').value = job.equipment || '';
            document.getElementById('marOvAssetTag').value = job.marAssetTag || job.assetTag || '';
            document.getElementById('marOvClient').value = job.client || '';
            document.getElementById('marOvSite').value = job.site || '';
            document.getElementById('marOvDue').value = job.dueDate || '';
            document.getElementById('marOvDesc').value = job.description || '';
            // Set input values (used for both display and editing)
            document.getElementById('marOvDesignP').value = job.designPressure || '';
            document.getElementById('marOvDesignT').value = job.designTemperature || '';
            document.getElementById('marOvMaterial').value = job.shellHeadMaterial || job.marMaterial || '';
            document.getElementById('marOvHeadType').value = job.headType || '';
            document.getElementById('marOvTesting').value = job.testingRequirement || '';
            document.getElementById('marOvDoshReg').value = job.marDoshReg || '';

            // Show ALL data from linked Sales Order
            const soMatEl = document.getElementById('soMatContent');
            const soMatToggle = document.getElementById('toggleSoMatBtn');
            const soLinked = (job.salesId || job.woRef) ? DB.getById('salesOrders', job.salesId || job.woRef) : null;
            if (soLinked) {
                const so = soLinked;
                const pe = so.peMaterials || {};
                const ri = so.repairInfo || {};
                const html = [];
                // Customer & Product info
                html.push('<div style="margin-bottom:10px;padding:8px;background:#f0f4ff;border-radius:4px;">');
                html.push('<p style="margin:0;"><b>SO Reference:</b> ' + so.id + ' &nbsp;|&nbsp; <b>Customer:</b> ' + (so.custName||'—') + ' &nbsp;|&nbsp; <b>Contact:</b> ' + (so.contact||'—') + ' &nbsp;|&nbsp; <b>Email:</b> ' + (so.email||'—') + '</p>');
                html.push('<p style="margin:2px 0 0;"><b>Product:</b> ' + (so.productName||'—') + ' &nbsp;|&nbsp; <b>Order Type:</b> ' + (so.type||'—') + ' &nbsp;|&nbsp; <b>Equipment:</b> ' + (so.equipType||'—') + ' &nbsp;|&nbsp; <b>Budget:</b> RM ' + (so.budget||'0') + '</p>');
                html.push('</div>');
                // Pressure Equipment
                if (so.equipType === 'Pressure Equipment' || (so.equipType||'').includes('Pressure')) {
                    if (pe.designCheck || pe.fabCheck) {
                        html.push('<p><b>Checklist:</b> Design Drawing: ' + (pe.designCheck?'✅':'❌') + ' &nbsp;|&nbsp; Shop Fab Drawing: ' + (pe.fabCheck?'✅':'❌') + '</p>');
                    }
                    if (pe.designCode || pe.designPressure || pe.designTemp) {
                        if (pe.designCode) html.push('<p><b>Design Code:</b> ' + pe.designCode + '</p>');
                        html.push('<p><b>Design Pressure:</b> ' + (pe.designPressure||'—') + ' ' + (pe.designPressureUnit||'') + ' &nbsp;|&nbsp; <b>Design Temperature:</b> ' + (pe.designTemp||'—') + ' °C</p>');
                    }
                    if (pe.shellSpec || pe.shellSize) {
                        html.push('<p><b>Shell:</b> Size: ' + (pe.shellSize||'—') + ' &nbsp;|&nbsp; Spec: ' + pe.shellSpec + ' &nbsp;|&nbsp; Qty: ' + (pe.shellQty||'—') + '</p>');
                    }
                    if (pe.headSpec || pe.headSize) {
                        html.push('<p><b>Head:</b> Size: ' + (pe.headSize||'—') + ' &nbsp;|&nbsp; Spec: ' + pe.headSpec + ' &nbsp;|&nbsp; Type: ' + (pe.headType||'—') + ' &nbsp;|&nbsp; Qty: ' + (pe.headQty||'—') + '</p>');
                    }
                    // Nozzle main + dynamic rows
                    if ((pe.nozzleList && pe.nozzleList.length) || pe.shellSpec || pe.headSpec) {
                        html.push('<p><b>Nozzles:</b></p><ul style="margin:2px 0 6px 18px;">');
                        (pe.nozzleList||[]).forEach(function(r){ html.push('<li>' + ((r[0]||'')+' '+(r[1]||'')) + ' — ' + (r[2]||'—') + ' × ' + (r[3]||'') + '</li>'); });
                        if (!(pe.nozzleList && pe.nozzleList.length)) html.push('<li style="color:#888;">No nozzles specified</li>');
                        html.push('</ul>');
                    }
                    // Flange main + dynamic rows
                    if ((pe.flangeList && pe.flangeList.length) || pe.shellSpec || pe.headSpec) {
                        html.push('<p><b>Flanges:</b></p><ul style="margin:2px 0 6px 18px;">');
                        (pe.flangeList||[]).forEach(function(r){ html.push('<li>' + ((r[0]||'')+' '+(r[1]||'')) + ' — ' + (r[2]||'—') + ' × ' + (r[3]||'') + '</li>'); });
                        if (!(pe.flangeList && pe.flangeList.length)) html.push('<li style="color:#888;">No flanges specified</li>');
                        html.push('</ul>');
                    }
                    if (pe.saddleSpec || pe.saddleName) {
                        html.push('<p><b>Saddle/Leg:</b> ' + (pe.saddleName||'—') + ' — ' + pe.saddleSpec + ' × ' + (pe.saddleQty||'—') + '</p>');
                    }
                    if (pe.otherSpec || pe.otherName || (pe.otherList && pe.otherList.length)) {
                        html.push('<p><b>Other:</b></p><ul style="margin:2px 0 6px 18px;">');
                        if (pe.otherSpec || pe.otherName) html.push('<li>' + (pe.otherName||'—') + ' — ' + (pe.otherSpec||'—') + ' × ' + (pe.otherQty||'—') + '</li>');
                        (pe.otherList||[]).forEach(function(r){ html.push('<li>' + (r[0]||'—') + ' — ' + (r[1]||'—') + ' × ' + (r[2]||'') + '</li>'); });
                        html.push('</ul>');
                    }
                    if (pe.misc) html.push('<p><b>Miscellaneous:</b> ' + pe.misc + '</p>');
                }
                // Non-Pressure Equipment
                if (so.equipType === 'Non-Pressure' || so.type === 'fabrication' && (so.equipType||'').includes('Non')) {
                    if (so.materials && so.materials.length) {
                        html.push('<p><b>Materials:</b></p><ul style="margin:2px 0 6px 18px;">');
                        so.materials.forEach(function(m){ html.push('<li>' + (m.desc||'—') + (m.grade?' ('+m.grade+')':'') + ' × ' + (m.qty||'') + ' ' + (m.unit||'') + '</li>'); });
                        html.push('</ul>');
                    }
                }
                // Repair info
                if (so.type === 'repair' && ri.equipName) {
                    html.push('<p><b>Repair — Equipment:</b> ' + ri.equipName + '</p>');
                    html.push('<p><b>Reg No:</b> ' + (ri.regNo||'—') + ' &nbsp;|&nbsp; <b>Serial:</b> ' + (ri.serial||'—') + ' &nbsp;|&nbsp; <b>Year:</b> ' + (ri.yearMfg||'—') + '</p>');
                    html.push('<p><b>Design Pressure:</b> ' + (ri.designP||'—') + ' bar &nbsp;|&nbsp; <b>Design Temp:</b> ' + (ri.designT||'—') + ' °C</p>');
                    html.push('<p><b>Scope:</b> ' + (ri.scope||'—') + '</p>');
                    if (ri.tests) {
                        var tList = Object.keys(ri.tests).filter(function(k){return ri.tests[k];}).map(function(k){return k.charAt(0).toUpperCase()+k.slice(1);});
                        if (tList.length) html.push('<p><b>Tests:</b> ' + tList.join(', ') + '</p>');
                    }
                    if (so.materials && so.materials.length) {
                        html.push('<p><b>Repair Materials:</b></p><ul style="margin:2px 0 6px 18px;">');
                        so.materials.forEach(function(m){ html.push('<li>' + (m.desc||'—') + ' × ' + (m.qty||'') + '</li>'); });
                        html.push('</ul>');
                    }
                }
                // Installation & handover
                if (so.installDuration || so.installDate || so.handoverDuration || so.handoverDate) {
                    html.push('<p><b>Installation:</b> Duration: ' + (so.installDuration||'—') + ' &nbsp;|&nbsp; Due: ' + (so.installDate||'—') + '</p>');
                    html.push('<p><b>Handover:</b> Duration: ' + (so.handoverDuration||'—') + ' &nbsp;|&nbsp; Due: ' + (so.handoverDate||'—') + '</p>');
                }
                if (so.projectCost) html.push('<p><b>Project Cost:</b> RM ' + so.projectCost + '</p>');
                soMatEl.innerHTML = html.length ? html.join('') : '<span style="color:#888;">No data found in linked Sales Order.</span>';
                soMatToggle.style.display = 'inline-flex';
            } else {
                soMatEl.innerHTML = '<span style="color:#888;">Not linked to a Sales Order.</span>';
                soMatToggle.style.display = 'none';
            }
            // Show material data by default if there's a linked SO
            document.getElementById('soMatDisplay').style.display = (soLinked && soMatEl.innerHTML && soMatEl.innerHTML.indexOf('No data') === -1 && soMatEl.innerHTML.indexOf('Not linked') === -1) ? 'block' : 'none';
            if (soLinked && soMatEl.innerHTML && soMatEl.innerHTML.indexOf('No data') === -1 && soMatEl.innerHTML.indexOf('Not linked') === -1) {
                soMatToggle.textContent = '🙈 Hide Material Data';
            }
            // Show WO fabMaterials from design job
            var fabMatContainer=document.getElementById('woFabMatDisplay');
            if(fabMatContainer){
                var fm=job.fabMaterials||{};
                var sections=['shell','head','nozzle','flange','saddle','otherMat','electrode'];
                var sectionLabels={'shell':'Shell','head':'Head','nozzle':'Nozzle','flange':'Flanges','saddle':'Saddle/Leg','otherMat':'Other Material','electrode':'Electrode'};
                var sectionIcons={'shell':'🔵','head':'🔵','nozzle':'🔵','flange':'🔵','saddle':'🔵','otherMat':'🔵','electrode':'🔵'};
                var fmChecks=fm.checks||{};
                var fmHtml=[];
                var hasAny=false;
                sections.forEach(function(s){
                    var rows=fm[s];
                    if(rows&&rows.length){
                        hasAny=true;
                        var checked=fmChecks[s];
                        fmHtml.push('<div style="margin-bottom:6px;padding:4px 8px;background:'+(checked?'#f0fdf4':'#fafafa')+';border-radius:4px;border-left:3px solid '+(checked?'#16a34a':'#d1d5db')+';display:flex;align-items:center;gap:8px;">');
                        fmHtml.push('<span style="width:110px;font-weight:600;font-size:12px;">'+sectionIcons[s]+' '+sectionLabels[s]+(checked?' ✅':'')+'</span>');
                        fmHtml.push('<span style="font-size:12px;">');
                        rows.forEach(function(r,i){
                            if(i>0)fmHtml.push('; ');
                            fmHtml.push((r.desc||'—')+(r.qty?' × '+r.qty:'')+(r.unit?' '+r.unit:''));
                        });
                        fmHtml.push('</span></div>');
                    }
                });
                if(hasAny){
                    fmHtml.unshift('<div style="margin-top:10px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;"><h4 style="margin:0 0 8px;font-size:13px;color:#2563eb;">📦 Materials from Design Job</h4>');
                    fmHtml.push('</div>');
                    fabMatContainer.style.display='block';
                    fabMatContainer.innerHTML=fmHtml.join('');
                }else{
                    fabMatContainer.style.display='none';
                }
            }
            // Check if materials already approved for purchase
            var apprBtn=document.getElementById('approveMatPurchaseBtn');
            var prStatusEl=document.getElementById('matPurchaseStatus');
            if(apprBtn){
                if(job.materialApproved){
                    apprBtn.textContent='✅ Approved';apprBtn.disabled=true;apprBtn.style.opacity='0.6';
                    if(prStatusEl){
                        prStatusEl.style.display='block';prStatusEl.style.background='#dcfce7';prStatusEl.style.color='#166534';
                        prStatusEl.innerHTML='✅ Materials approved for purchase — PR <strong>'+(job.prRef||'')+'</strong>';
                    }
                }else{
                    apprBtn.textContent='✅ Approve Materials for Purchase';apprBtn.disabled=false;apprBtn.style.opacity='1';
                    if(prStatusEl){prStatusEl.style.display='none';}
                }
            }

            if (_isFabWo) {
                // Fab WO — show overview + BOM + routing + labor + regulatory + dispatch + progress (if sent to fab)
                document.querySelectorAll('.mar-phase').forEach(el => {
                    const id = el.id || '';
                    const visibleBase = id === 'marPhase_overview' || id === 'marPhase_fabSetup' || id === 'marPhase_regulatory' || id === 'marPhase_dispatch';
                    const visibleProgress = id === 'marPhase_progress' && (job.status === 'In Fab' || job.status === 'In Progress' || job.status === 'Completed' || job.status === 'Closed');
                    el.style.display = (visibleBase || visibleProgress) ? 'block' : 'none';
                });
                document.querySelectorAll('.mar-ov-input').forEach(el => {
                    el.readOnly = false;
                    el.classList.add('editable');
                });
                document.getElementById('marOvFabActions').style.display = 'block';
                document.getElementById('marOvAssignActions').style.display = 'none';
                // Design review UI
                const ds = job.designStatus || 'Pending';
                document.getElementById('marDesignStatusBadge').textContent = ds === 'Approved' ? '✅ Approved' : ds === 'Submitted' ? '📤 Under Review' : '⏳ Pending';
                document.getElementById('marDesignStatusBadge').className = 'badge badge-' + (ds === 'Approved' ? 'success' : ds === 'Submitted' ? 'warning' : 'pending');
                document.getElementById('marDesignStatusText').textContent = ds === 'Approved' ? 'Design approved. You may now create Purchase Requisition and proceed to dispatch.'
                    : ds === 'Submitted' ? 'Design submitted for review. Check Regulatory phase for approval status.'
                    : 'Complete the design data above, then submit for Design Department review.';
                document.getElementById('marSubmitDesignBtn').style.display = (job.status === 'Design Review' && ds === 'Pending') ? 'inline-flex' : 'none';
                document.getElementById('marApproveDesignBtn').style.display = (job.status === 'Design Review' && ds === 'Submitted') ? 'inline-flex' : 'none';
                document.getElementById('fabSendBtn').style.display = (job.status === 'In Progress' && job.status !== 'Completed' && job.status !== 'Closed') ? 'inline-flex' : 'none';
                document.getElementById('marCloseBtn').style.display = job.status === 'In Progress' || job.status === 'Completed' ? 'inline-flex' : 'none';
                document.getElementById('createPrBtn').style.display = job.status === 'In Progress' ? 'inline-flex' : 'none';
                renderMarPhaseProgress({});
                showMarPhase('overview');
                const existingPr = DB.get('purchaseRequisitions').filter(p => p.woRef === woId);
                if (existingPr.length > 0) {
                    updatePrStatusBlock(existingPr[0]);
                } else {
                    document.getElementById('prStatusBlock').style.display = 'none';
                    document.getElementById('createPrBtn').textContent = '🛒 Create Purchase Requisition';
                    document.getElementById('createPrBtn').disabled = false;
                    document.getElementById('createPrBtn').style.opacity = '1';
                }
                // Init and populate Fab wizard from saved data (job.fabWizard)
                woInitFabWizard();
                // Auto-populate from WO data
                var jobProd=document.getElementById('wo_fabProduct');
                if(jobProd&&(job.productName||job.equipment)) jobProd.value=job.productName||job.equipment;
                var jobType=document.getElementById('wo_fabType');
                if(jobType){
                    var eqType=job.equipType||'';
                    if(eqType.includes('Pressure')) jobType.value='Pressure Vessel';
                    else if(job.productName&&job.productName.toLowerCase().includes('boiler')) jobType.value='Boiler Assembly';
                    else if(job.productName&&job.productName.toLowerCase().includes('exchanger')) jobType.value='Heat Exchanger';
                    else if(job.productName&&job.productName.toLowerCase().includes('piping')) jobType.value='Piping Spool';
                    else if(job.productName&&job.productName.toLowerCase().includes('structural')) jobType.value='Structural Steel';
                }
                // Build material summary from fabMaterials or linked SO
                var fm=job.fabMaterials||{};
                var matSummary=[];
                ['shell','head','nozzle','flange','saddle','otherMat','electrode'].forEach(function(s){
                    var rows=fm[s];
                    if(rows&&rows.length){
                        var label=s.charAt(0).toUpperCase()+s.slice(1);
                        var items=rows.map(function(r){return (r.desc||'')+(r.qty?' × '+r.qty:'');}).join(', ');
                        matSummary.push(label+': '+items);
                    }
                });
                if(!matSummary.length){
                    // Try from linked SO peMaterials
                    var so=job.salesId?DB.getById('salesOrders',job.salesId):job.woRef?DB.getById('salesOrders',job.woRef):null;
                    if(so&&so.peMaterials){
                        var pe=so.peMaterials;
                        if(pe.shellSpec)matSummary.push('Shell: '+pe.shellSpec+(pe.shellQty?' × '+pe.shellQty:''));
                        if(pe.headSpec)matSummary.push('Head: '+pe.headSpec+(pe.headQty?' × '+pe.headQty:''));
                        if(pe.nozzleList)matSummary.push('Nozzles: '+pe.nozzleList.map(function(n){return (n.s||'')+' '+(n.sp||'');}).join(', '));
                        if(pe.flangeList)matSummary.push('Flanges: '+pe.flangeList.map(function(f){return (f.s||'')+' '+(f.sp||'');}).join(', '));
                    }
                }
                var jobMat=document.getElementById('wo_fabMaterialList');
                if(jobMat&&matSummary.length) jobMat.value=matSummary.join('\n');
                // Auto-populate BOM from WO materials
                var autoBomTbody=document.getElementById('wo_fabBomTable');
                var fmRows=job.fabMaterials||{};
                var bomAdded=false;
                if(autoBomTbody){
                    ['shell','head','nozzle','flange','saddle','otherMat','electrode'].forEach(function(s){
                        var rows=fmRows[s];
                        if(rows&&rows.length){
                            rows.forEach(function(r){
                                if(r.desc||r.qty){
                                    var tr=document.createElement('tr');
                                    var itemNo=String((autoBomTbody.children.length+1)*10);
                                    var qtyVal=r.qty||1;
                                    tr.innerHTML='<td><input type="text" class="form-control" value="'+itemNo+'" style="width:45px;padding:4px 6px;font-size:12px;"></td>'+
                                        '<td><input type="text" class="form-control" value="'+escHtml(s.charAt(0).toUpperCase()+s.slice(1))+': '+escHtml(r.desc||'')+'" style="font-size:12px;padding:4px 8px;"></td>'+
                                        '<td><input type="text" class="form-control" value="'+escHtml(r.desc||'')+'" style="font-size:12px;padding:4px 8px;"></td>'+
                                        '<td><input type="number" class="form-control" value="'+qtyVal+'" min="1" style="width:50px;padding:4px 6px;font-size:12px;"></td>'+
                                        '<td><input type="text" class="form-control" placeholder="Warehouse / Source" style="font-size:12px;padding:4px 8px;"></td>'+
                                        '<td style="text-align:center;"><input type="checkbox"></td>'+
                                        '<td style="text-align:center;"><input type="checkbox" checked></td>'+
                                        '<td style="text-align:center;"><input type="checkbox"></td>'+
                                        '<td style="text-align:center;"><input type="checkbox"></td>'+
                                        '<td><button class="btn btn-xs btn-ghost" onclick="this.closest(\'tr\').remove()">✕</button></td>';
                                    autoBomTbody.appendChild(tr);
                                    bomAdded=true;
                                }
                            });
                        }
                    });
                }
                if(!bomAdded&&autoBomTbody) woAddFabBomRow();
                // Init WPS table
                var autoWpsTbody=document.getElementById('wo_fabWpsTable');
                if(autoWpsTbody&&!autoWpsTbody.children.length) woAddFabWpsRow();
                // Auto-populate Step 2 (Header) from WO
                var jobCust=document.getElementById('wo_fabCustomer');
                if(jobCust){
                    var custName=job.client||job.custName||'';
                    if(custName){
                        var opts=jobCust.options;
                        for(var ci=0;ci<opts.length;ci++){
                            if(opts[ci].value===custName){opts[ci].selected=true;break;}
                        }
                    }
                }
                // PO ref from linked sales order
                var soPO=job.salesId?DB.getById('salesOrders',job.salesId):job.woRef?DB.getById('salesOrders',job.woRef):null;
                if(soPO&&soPO.clientPO){
                    var poEl=document.getElementById('wo_fabPO');
                    if(poEl) poEl.value=soPO.clientPO;
                }
                // Dates - use WO dates or linked SO dates
                var soDates=soPO||null;
                var sDate=job.startDate||job.installDate||(soDates?soDates.installDate:'');
                var eDate=job.endDate||(soDates?soDates.handoverDate:'');
                var dDate=job.dueDate||job.deliveryDate||(soDates?soDates.handoverDate:'');
                var stEl=document.getElementById('wo_fabStartDate');if(stEl&&sDate) stEl.value=sDate;
                var enEl=document.getElementById('wo_fabEndDate');if(enEl&&eDate) enEl.value=eDate;
                var ddEl=document.getElementById('wo_fabDeliveryDate');if(ddEl&&dDate) ddEl.value=dDate;
                // Restore saved wizard data (overrides auto-populated)
                const wiz = job.fabWizard || {};
                if (wiz.prerequisites) {
                    ['wo_fabPre1','wo_fabPre2','wo_fabPre3','wo_fabPre4','wo_fabPre5'].forEach((id, i) => {
                        const el = document.getElementById(id);
                        if (el) el.checked = wiz.prerequisites[i] || false;
                    });
                    if (wiz.approval) {
                        document.getElementById('wo_fabApprovalBadge').textContent = wiz.approval.badge || 'Pending Approval';
                        document.getElementById('wo_fabApprover').value = wiz.approval.approver || '';
                        document.getElementById('wo_fabApprovalDate').value = wiz.approval.date || '';
                        document.getElementById('wo_fabRevision').value = wiz.approval.revision || 'Rev 0';
                        document.getElementById('wo_fabApprovalNotes').value = wiz.approval.notes || '';
                    }
                }
                if (wiz.type) document.getElementById('wo_fabType').value = wiz.type;
                if (wiz.product) document.getElementById('wo_fabProduct').value = wiz.product;
                if (wiz.drawingSpec) document.getElementById('wo_fabDrawingSpec').value = wiz.drawingSpec;
                if (wiz.materialList) document.getElementById('wo_fabMaterialList').value = wiz.materialList;
                if (wiz.quantity) document.getElementById('wo_fabQty').value = wiz.quantity;
                if (wiz.shop) document.getElementById('wo_fabShop').value = wiz.shop;
                if (wiz.customer) document.getElementById('wo_fabCustomer').value = wiz.customer;
                if (wiz.poRef) document.getElementById('wo_fabPO').value = wiz.poRef;
                if (wiz.startDate) document.getElementById('wo_fabStartDate').value = wiz.startDate;
                if (wiz.endDate) document.getElementById('wo_fabEndDate').value = wiz.endDate;
                if (wiz.deliveryDate) document.getElementById('wo_fabDeliveryDate').value = wiz.deliveryDate;
                if (wiz.ndt) document.getElementById('wo_fabNdt').value = wiz.ndt;
                if (wiz.inspectionHolds) {
                    var laborCbs=document.querySelectorAll('#wo_fabLaborTable input[type="checkbox"]');
                    laborCbs.forEach(function(cb){
                        cb.checked = (wiz.inspectionHolds || []).includes(cb.value);
                    });
                }
                if (wiz.laborAssignments) {
                    var laborRows=document.querySelectorAll('#wo_fabLaborTable tr');
                    laborRows.forEach(function(tr, i){
                        var a=wiz.laborAssignments[i];
                        if(a&&a.person){
                            var sel=tr.querySelector('select');
                            if(sel) sel.value=a.person;
                        }
                    });
                }
                // Populate BOM and routing tables
                const bomTbody = document.getElementById('wo_fabBomTable');
                if (bomTbody) {
                    bomTbody.innerHTML = '';
                    (wiz.bom || []).forEach(d => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = '<td><input type="text" class="form-control" value="'+(d.item||0)+'" style="width:45px;padding:4px 6px;font-size:12px;"></td>' +
                            '<td><input type="text" class="form-control" value="'+(d.component||'')+'" style="font-size:12px;padding:4px 8px;"></td>' +
                            '<td><input type="text" class="form-control" value="'+(d.spec||'')+'" style="font-size:12px;padding:4px 8px;"></td>' +
                            '<td><input type="number" class="form-control" value="'+(d.qty||1)+'" min="1" style="width:50px;padding:4px 6px;font-size:12px;"></td>' +
                            '<td><input type="text" class="form-control" value="'+(d.source||'')+'" style="font-size:12px;padding:4px 8px;"></td>' +
                            '<td style="text-align:center;"><input type="checkbox"'+(d.backflush?' checked':'')+'></td>' +
                            '<td style="text-align:center;"><input type="checkbox"'+(d.issue?' checked':'')+'></td>' +
                            '<td style="text-align:center;"><input type="checkbox"'+(d.ordered?' checked':'')+'></td>' +
                            '<td style="text-align:center;"><input type="checkbox"'+(d.received?' checked':'')+'></td>' +
                            '<td><button class="btn btn-xs btn-ghost" onclick="this.closest(\'tr\').remove()">✕</button></td>';
                        bomTbody.appendChild(tr);
                    });
                    if (!wiz.bom || !wiz.bom.length) woAddFabBomRow();
                }
                // Restore WPS table
                const wpsTbody = document.getElementById('wo_fabWpsTable');
                if (wpsTbody) {
                    wpsTbody.innerHTML = '';
                    (wiz.wpsTable || []).forEach(d => woAddFabWpsRow(d));
                    if (!wiz.wpsTable || !wiz.wpsTable.length) woAddFabWpsRow();
                }
                const routingTbody = document.getElementById('wo_fabRoutingTable');
                if (routingTbody) {
                    routingTbody.innerHTML = '';
                    (wiz.routing || []).forEach((d, i) => {
                        const tr = document.createElement('tr');
                        const centers = ['Material Marking','Material Cutting','Fit Up','Welding','Visual Inspection','NDT','Hold Point','Hydrostatic Test'];
                        tr.innerHTML = '<td><input type="text" class="form-control" value="'+(d.step||String(i+1).padStart(2,'0'))+'" style="width:40px;padding:4px 6px;font-size:12px;"></td>' +
                            '<td><select class="form-control" style="font-size:12px;padding:4px 6px;">'+centers.map(c => '<option'+(c===d.workCenter?' selected':'')+'>'+c+'</option>').join('')+'</select></td>' +
                            '<td><input type="text" class="form-control" value="'+(d.description||'')+'" style="font-size:12px;padding:4px 8px;"></td>' +
                            '<td><input type="number" class="form-control" value="'+(d.stdHours||1)+'" step="0.5" style="width:60px;padding:4px 6px;font-size:12px;"></td>' +
                            '<td style="text-align:center;"><input type="checkbox"'+(d.holdPoint?' checked':'')+'></td>' +
                            '<td><button class="btn btn-xs btn-ghost" onclick="this.closest(\'tr\').remove()">✕</button></td>';
                        routingTbody.appendChild(tr);
                    });
                    if (!wiz.routing || !wiz.routing.length) {
                        woAddFabRoutingRow();woAddFabRoutingRow();woAddFabRoutingRow();woAddFabRoutingRow();
                        woAddFabRoutingRow();woAddFabRoutingRow();woAddFabRoutingRow();woAddFabRoutingRow();
                    }
                }
            } else if (job.branch === 'mar') {
                document.querySelectorAll('.mar-ov-input').forEach(el => {
                    el.readOnly = false;
                    el.classList.add('editable');
                });
                if (job.status === 'In Progress') {
                    document.querySelectorAll('.mar-phase').forEach(el => el.style.display = 'block');
                    document.getElementById('fabSendBtn').style.display = 'none';
                    document.getElementById('marCloseBtn').style.display = 'inline-flex';
                    document.getElementById('marOvFabActions').style.display = 'none';
                    document.getElementById('marOvAssignActions').style.display = 'none';
                    document.getElementById('createPrBtn').style.display = 'none';
                    document.getElementById('sendToFabBtn').style.display = 'none';
                    const saved = JSON.parse(localStorage.getItem('mar_workflow_' + woId) || '{}');
                    restoreMarPhaseData(saved);
                    renderMarMatInspChecks(saved);
                    renderMarToolboxChecks(saved);
                    renderMarRemovalChecks(saved);
                    renderMarParentShell(saved);
                    renderMarCleaningChecks(saved);
                    renderMarAntirustChecks(saved);
                    renderMarLaydownChecks(saved);
                    renderMarTackChecks(saved);
                    renderMarNdtChecks(saved);
                    renderMarCloseChecks(saved);
                    renderMarHandoverChecks(saved);
                    renderMarDocRegister(saved);
                    renderMarPhaseProgress(saved);
                    document.querySelectorAll('.mar-ov-input').forEach(el => {
                        el.readOnly = true;
                        el.classList.remove('editable');
                    });
                } else {
                    // Design Review — show only overview with design actions
                    document.querySelectorAll('.mar-phase').forEach(el => {
                        const id = el.id || '';
                        el.style.display = id === 'marPhase_overview' ? 'block' : 'none';
                    });
                    document.getElementById('fabSendBtn').style.display = 'none';
                    document.getElementById('marCloseBtn').style.display = 'none';
                    document.getElementById('marOvFabActions').style.display = 'block';
                    document.getElementById('marOvAssignActions').style.display = 'none';
                    const ds = job.designStatus || 'Pending';
                    document.getElementById('marDesignStatusBadge').textContent = ds === 'Approved' ? '✅ Approved' : ds === 'Submitted' ? '📤 Under Review' : '⏳ Pending';
                    document.getElementById('marDesignStatusBadge').className = 'badge badge-' + (ds === 'Approved' ? 'success' : ds === 'Submitted' ? 'warning' : 'pending');
                    document.getElementById('marDesignStatusText').textContent = ds === 'Approved' ? 'Repair method statement approved. Full M&R workflow is now accessible.'
                        : ds === 'Submitted' ? 'Repair method statement submitted for review.'
                        : 'Complete the repair data above, then submit repair method statement for Design Department approval.';
                    document.getElementById('marSubmitDesignBtn').style.display = (job.status === 'Design Review' && ds === 'Pending') ? 'inline-flex' : 'none';
                    document.getElementById('marApproveDesignBtn').style.display = (job.status === 'Design Review' && ds === 'Submitted') ? 'inline-flex' : 'none';
                    renderMarPhaseProgress({});
                }
                showMarPhase('overview');
            } else {
                // Unassigned — show overview + branch assignment
                document.querySelectorAll('.mar-phase').forEach(el => {
                    const id = el.id || '';
                    el.style.display = id === 'marPhase_overview' ? 'block' : 'none';
                });
                document.getElementById('fabSendBtn').style.display = 'none';
                document.getElementById('marCloseBtn').style.display = 'none';
                document.querySelectorAll('.mar-ov-input').forEach(el => {
                    el.readOnly = false;
                    el.classList.add('editable');
                });
                document.getElementById('marOvFabActions').style.display = 'none';

                // Show design status info when coming back from design dept
                const ds = job.designStatus || 'Pending';
                if (ds === 'Approved') {
                    document.getElementById('marOvAssignActions').querySelector('h4').textContent = '✅ Design Approved — Assign Department';
                    document.getElementById('marOvAssignActions').querySelector('p').textContent = 'Design has been approved. Select a department to proceed.';
                } else if (ds === 'Rejected') {
                    document.getElementById('marOvAssignActions').querySelector('h4').textContent = '❌ Design Rejected';
                    document.getElementById('marOvAssignActions').querySelector('p').textContent = job.designRejectedReason ? 'Reason: ' + job.designRejectedReason : 'Design was rejected. Please fix the data and resubmit.';
                } else {
                    document.getElementById('marOvAssignActions').querySelector('h4').textContent = '🔀 Assign Work Order';
                    document.getElementById('marOvAssignActions').querySelector('p').textContent = 'Fill in the design data above, then assign this Work Order to a department or send to Design Department for review.';
                }

                document.getElementById('marOvAssignActions').style.display = 'block';
                renderMarPhaseProgress({});
                showMarPhase('overview');
            }

            document.getElementById('woMarDetailModal').classList.add('active');
        }

        function renderMarPhaseProgress(saved) {
            const phases = _isFabWo ? FAB_PHASES : MAR_PHASES;
            const labels = _isFabWo ? FAB_PHASE_LABELS : MAR_PHASE_LABELS;
            const bar = document.getElementById('marPhaseProgress');
            bar.innerHTML = phases.map((p, i) => {
                const phaseData = saved[p] || {};
                const done = phaseData._complete || false;
                const blocked = phaseData._blocked || false;
                let cls = 'phase-step';
                if (done) cls += ' done';
                if (blocked) cls += ' blocked';
                return `<button class="${cls}" onclick="showMarPhase('${p}")">${labels[p] || p}</button>` + (i < phases.length - 1 ? '<span class="phase-arrow">›</span>' : '');
            }).join('');
        }

        // ----- Checklist renderers -----
        const MAR_MAT_INSP = ['Material test certificate (MTC) received — EN 10204 Type 3.1','Dimensional check (cut plates) — ±2mm','Rolling radius check — ±3mm','Surface finish (no scratches >0.5mm)'];
        const MAR_TOOLBOX = ['Scope of work reviewed with all crew','Hazards identified (confined space, fume, steam isolation)','Emergency plan reviewed (rescue tripod, air monitor)','Toolbox register signed by all attendees'];
        const MAR_REMOVAL = ['Mark damaged liner boundaries','Original weld map reviewed','Remove cut sections from steriliser','Inspect parent shell under removed liner'];
        const MAR_CLEAN = ['Scrape loose scale & residue','Degrease (alkaline degreaser + water rinse)','Grind to bright metal (all repair areas + 50mm overlap)','Final cleaning (vacuum + lint-free cloth with acetone)'];
        const MAR_ANTIRUST = ['Zinc-rich epoxy primer applied (if CS shell exposed)','Dry film thickness verified (80-100 microns)','Curing time allowed per manufacturer specification'];
        const MAR_LAYDOWN = ['Mark reference lines on shell (longitudinal centreline, circumferential rings)','Dry-fit plates — check curvature match (gap 1-2mm)','Sequence plates outward (bottom centre → sides)','Verify plate alignment (straight edge + level)'];
        const MAR_TACK = ['Tack plate #1 (bottom centre)','Tack plates outward sequence #2 → #18','Inspect all tacks — no cracks, no slag','Tack size 25-30mm, spacing 150-200mm'];
        const MAR_NDT = ['Dye Penetrant Test (PT) — ASTM E1417','Vacuum Box Test — ASME Sec V','Hardness Test (weld metal) — ISO 6508, HRC <35'];
        const MAR_CLOSE = ['Remove all tools & equipment','Remove all debris & scrap liner pieces','Final cleaning of steriliser interior','Install manway cover (new gasket)','Close confined space permit','Close hot work permit','Final walkthrough with customer','Customer sign-off on completion'];
        const MAR_HANDOVER = ['Final job report (hard copy + PDF)','As-built weld map','AI acceptance certificate','DOSH repair notification acknowledgement','Warranty statement (12 months workmanship)'];
        const MAR_DOCS = [
            { icon:'📄', name:'Work Order', file:'01_Work_Order.pdf' },
            { icon:'🔒', name:'AI/DOSH Approvals', file:'02_Approvals_AI_DOSH' },
            { icon:'📦', name:'Material Certs', file:'03_Material_Certs' },
            { icon:'🔬', name:'NDT Reports', file:'04_NDT_Reports' },
            { icon:'📝', name:'Daily Logs', file:'05_Daily_Logs' },
            { icon:'📷', name:'Photos', file:'06_Photos' },
            { icon:'📋', name:'Final Report', file:'07_Final_Report.pdf' },
            { icon:'✍️', name:'Customer Sign-Off', file:'08_Customer_Signoff.pdf' },
        ];

        function renderMarMatInspChecks(saved) { renderChecklist('marMatInspChecks', MAR_MAT_INSP, 'material', 'matInsp'); }
        function renderMarToolboxChecks(saved) { renderChecklist('marToolboxChecks', MAR_TOOLBOX, 'siteprep', 'toolbox'); }
        function renderMarRemovalChecks(saved) { renderChecklist('marRemovalChecks', MAR_REMOVAL, 'removal', 'removal'); }
        function renderMarCleaningChecks(saved) { renderChecklist('marCleaningChecks', MAR_CLEAN, 'cleaning', 'cleaning'); }
        function renderMarAntirustChecks(saved) { renderChecklist('marAntirustChecks', MAR_ANTIRUST, 'antirust', 'antirust'); }
        function renderMarLaydownChecks(saved) { renderChecklist('marLaydownChecks', MAR_LAYDOWN, 'laydown', 'laydown'); }
        function renderMarTackChecks(saved) { renderChecklist('marTackChecks', MAR_TACK, 'tackweld', 'tack'); }
        function renderMarNdtChecks(saved) { renderChecklist('marNdtChecks', MAR_NDT, 'testing', 'ndt'); }
        function renderMarCloseChecks(saved) { renderChecklist('marCloseChecks', MAR_CLOSE, 'close', 'close'); }
        function renderMarHandoverChecks(saved) { renderChecklist('marHandoverChecks', MAR_HANDOVER, 'close', 'handover'); }

        function renderMarParentShell(saved) {
            const container = document.getElementById('marParentShell');
            if (!container) return;
            const phaseData = saved['removal'] || {};
            const state = phaseData.parentShell || {};
            const rows = [
                { loc:'Row 1 (bottom centre)', orig:'12mm', min: state.r1 || '11.2mm', action:'No further repair' },
                { loc:'Row 2 (30° from bottom)', orig:'12mm', min: state.r2 || '10.8mm', action:'No further repair' },
                { loc:'Row 3 (60° from bottom)', orig:'12mm', min: state.r3 || '11.5mm', action:'No further repair' },
            ];
            container.innerHTML = `<table class="mar-table"><thead><tr><th>Location</th><th>Original</th><th>Min. Thickness</th><th>Action</th></tr></thead><tbody>${rows.map((r,i) => `<tr><td>${r.loc}</td><td>${r.orig}</td><td><input type="text" value="${r.min}" style="width:80px;padding:2px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarParentShell(${i},this.value)"></td><td>${r.action}</td></tr>`).join('')}</tbody></table>
            <div style="margin-top:8px;font-size:12px;"><strong>QC Sign-Off:</strong> <select id="marParentShellQc" onchange="saveMarPhase('removal')" style="padding:3px 8px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;"><option>Pending</option><option>Approved — Ready for Cleaning</option></select></div>`;
        }

        function saveMarParentShell(idx, val) {
            if (!_currentMarWoId) return;
            const key = 'mar_workflow_' + _currentMarWoId;
            const saved = JSON.parse(localStorage.getItem(key) || '{}');
            if (!saved['removal']) saved['removal'] = {};
            if (!saved['removal'].parentShell) saved['removal'].parentShell = {};
            const labels = ['r1','r2','r3'];
            saved['removal'].parentShell[labels[idx]] = val;
            localStorage.setItem(key, JSON.stringify(saved));
        }

        function renderMarDocRegister(saved) {
            const container = document.getElementById('marDocRegister');
            if (!container) return;
            container.innerHTML = MAR_DOCS.map(d => {
                const phaseData = saved['reporting'] || {};
                const status = phaseData['doc_' + d.file] || 'Pending';
                const statusCls = status === 'Uploaded' ? 'badge badge-completed' : 'badge badge-pending';
                return `<div class="mar-doc-item" onclick="uploadMarDoc('${d.file}')">
                    <span class="doc-icon">${d.icon}</span>
                    <span class="doc-name">${d.name}</span>
                    <span class="${statusCls}" id="marDocStatus_${d.file}">${status}</span>
                </div>`;
            }).join('');
        }

        function uploadMarDoc(fileKey) {
            showToast('📁 Upload placeholder for: ' + fileKey, 'info');
            // Mark as uploaded
            if (!_currentMarWoId) return;
            const key = 'mar_workflow_' + _currentMarWoId;
            const saved = JSON.parse(localStorage.getItem(key) || '{}');
            if (!saved['reporting']) saved['reporting'] = {};
            saved['reporting']['doc_' + fileKey] = 'Uploaded';
            localStorage.setItem(key, JSON.stringify(saved));
            const el = document.getElementById('marDocStatus_' + fileKey);
            if (el) { el.textContent = 'Uploaded'; el.className = 'badge badge-completed'; }
            showToast('✅ Document marked as uploaded: ' + fileKey, 'success');
            saveMarPhase('reporting');
        }

        function showMarPhase(phase) {
            document.querySelectorAll('.mar-phase').forEach(el => el.classList.remove('active'));
            document.getElementById('marPhase_' + phase).classList.add('active');
            document.querySelectorAll('.phase-step').forEach(el => el.classList.remove('active'));
            const steps = document.querySelectorAll('.phase-step');
            const phases = _isFabWo ? FAB_PHASES : MAR_PHASES;
            const idx = phases.indexOf(phase);
            if (steps[idx]) steps[idx].classList.add('active');
            if (phase === 'progress') {
                renderWOGantt(_currentMarWoId, 'woGanttContainer');
            }
        }

        function saveMarPhase(phase) {
            if (!_currentMarWoId) return;
            const key = 'mar_workflow_' + _currentMarWoId;
            const saved = JSON.parse(localStorage.getItem(key) || '{}');
            saved[phase] = collectMarPhaseData(phase);
            // Check if regulatory gate is fully approved
            if (phase === 'regulatory') {
                const reg = saved[phase] || {};
                saved[phase]._blocked = reg.aiApproval !== 'Received';
            }
            localStorage.setItem(key, JSON.stringify(saved));
            renderMarPhaseProgress(saved);
        }

        function collectMarPhaseData(phase) {
            const data = { _complete: false, _blocked: false };
            // Collect input/select/checkbox values from marPhase_{phase} container
            const container = document.getElementById('marPhase_' + phase);
            if (!container) return data;
            container.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.id) data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
            });
            // Check if all required fields are done for _complete
            return data;
        }

        function restoreMarPhaseData(saved) {
            const phases = _isFabWo ? FAB_PHASES : MAR_PHASES;
            for (const phase of phases) {
                const phaseData = saved[phase] || {};
                const container = document.getElementById('marPhase_' + phase);
                if (!container) continue;
                container.querySelectorAll('input, select, textarea').forEach(el => {
                    if (el.id && phaseData[el.id] !== undefined) {
                        if (el.type === 'checkbox') el.checked = phaseData[el.id];
                        else el.value = phaseData[el.id];
                    }
                });
            }
        }

        // ----- Checklist helpers -----
        function renderChecklist(containerId, items, phase, storageKey) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const saved = JSON.parse(localStorage.getItem('mar_workflow_' + _currentMarWoId) || '{}');
            const phaseData = saved[phase] || {};
            const checkState = phaseData[storageKey] || {};
            container.innerHTML = items.map((item, i) => {
                const checked = checkState[i] || false;
                return `<div class="mar-checklist-item"><input type="checkbox" class="chk" ${checked ? 'checked' : ''} onchange="toggleMarCheck('${phase}','${storageKey}',${i},this.checked)"><span class="cl ${checked ? 'done' : ''}">${item}</span></div>`;
            }).join('');
        }

        function toggleMarCheck(phase, key, idx, checked) {
            if (!_currentMarWoId) return;
            const saveKey = 'mar_workflow_' + _currentMarWoId;
            const saved = JSON.parse(localStorage.getItem(saveKey) || '{}');
            if (!saved[phase]) saved[phase] = {};
            if (!saved[phase][key]) saved[phase][key] = {};
            saved[phase][key][idx] = checked;
            localStorage.setItem(saveKey, JSON.stringify(saved));
            // Update visual
            const container = document.getElementById('marPhase_' + phase);
            if (container) {
                const items = container.querySelectorAll('.mar-checklist-item');
                if (items[idx]) {
                    items[idx].querySelector('.cl').classList.toggle('done', checked);
                }
            }
            saveMarPhase(phase);
        }

        // ----- Dynamic row helpers -----
        function addMarMtoRow() {
            const tb = document.getElementById('marMtoBody');
            const row = tb.insertRow();
            row.innerHTML = `<td><input type="text" placeholder="Component" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"></td><td><input type="text" placeholder="Material spec" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"></td><td><input type="text" placeholder="Dimensions" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"></td><td><input type="number" value="1" style="width:60px;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"></td><td><select style="padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"><option>Ordered</option><option>Received</option><option>Inspected</option></select></td>`;
        }
        function addMarShopRow() {
            const tb = document.getElementById('marShopBody');
            const row = tb.insertRow();
            row.innerHTML = `<td><input type="text" placeholder="Operation" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"></td><td><input type="text" placeholder="Work center" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"></td><td><input type="text" placeholder="Details" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"></td><td><select style="padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('material')"><option>Pending</option><option>In Progress</option><option>Completed</option></select></td>`;
        }
        function addMarPermitRow() {
            const tb = document.getElementById('marPermitBody');
            const row = tb.insertRow();
            row.innerHTML = `<td><input type="text" placeholder="Permit type" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('siteprep')"></td><td><input type="text" placeholder="Issued by" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('siteprep')"></td><td><input type="text" placeholder="Number" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('siteprep')"></td><td><input type="date" style="width:110px;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('siteprep')"></td><td><select style="padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('siteprep')"><option>Active</option><option>Closed</option></select></td>`;
        }
        function addMarWeldJointRow() {
            const tb = document.getElementById('marWeldJoints');
            const row = tb.insertRow();
            row.innerHTML = `<td><input type="text" placeholder="Joint type" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('fullweld')"></td><td><input type="text" placeholder="Welder name" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('fullweld')"></td><td><input type="date" style="width:110px;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('fullweld')"></td><td><select style="padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('fullweld')"><option>Pending</option><option>Pass</option><option>Fail</option></select></td>`;
        }
        function addMarBubbleRow() {
            const tb = document.getElementById('marBubbleBody');
            const row = tb.insertRow();
            row.innerHTML = `<td><input type="text" placeholder="Test section" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('testing')"></td><td><input type="text" value="5 PSIG" style="width:80px;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('testing')"></td><td><select style="padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('testing')"><option>Yes</option><option>No</option></select></td><td><input type="text" placeholder="Observation" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('testing')"></td><td><select style="padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('testing')"><option>Pending</option><option>Pass</option><option>Fail</option></select></td>`;
        }
        function addMarDailyLogRow() {
            const tb = document.getElementById('marDailyLogBody');
            const row = tb.insertRow();
            row.innerHTML = `<td><input type="date" style="width:110px;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('reporting')"></td><td><input type="text" placeholder="Work completed" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('reporting')"></td><td><input type="number" placeholder="hrs" style="width:70px;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('reporting')"></td><td><input type="text" placeholder="Issues" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:3px;font-size:11px;" onchange="saveMarPhase('reporting')"></td></tr>`;
        }

        function updateMarCosts() {
            const mat = parseFloat(document.getElementById('marCloseMatCost').value) || 0;
            const lab = parseFloat(document.getElementById('marCloseLabCost').value) || 0;
            const hrs = parseFloat(document.getElementById('marCloseHours').value) || 0;
            document.getElementById('marCostMat').textContent = 'RM ' + mat.toLocaleString();
            document.getElementById('marCostLab').textContent = 'RM ' + lab.toLocaleString();
            document.getElementById('marCostTotal').textContent = 'RM ' + (mat + lab).toLocaleString();
            document.getElementById('marCostHrs').textContent = hrs;
            saveMarPhase('closeout');
        }

        function completeMarWorkOrder() {
            if (!_currentMarWoId) return;
            if (!confirm('Close this Work Order as COMPLETED? This action is final.')) return;
            const jobs = DB.get('workOrders');
            const job = jobs.find(j => j.id === _currentMarWoId);
            if (job) {
                job.status = 'Closed';
                job.actualCompletionDate = new Date().toISOString().split('T')[0];
                job.actualManHours = document.getElementById('marCloseHours').value;
                job.actualMaterialCost = document.getElementById('marCloseMatCost').value;
                job.actualLabourCost = document.getElementById('marCloseLabCost').value;
                const data = JSON.parse(localStorage.getItem('ad_deen_erp_db') || '{}');
                data.workOrders = jobs;
                localStorage.setItem('ad_deen_erp_db', JSON.stringify(data));
            }
            closeModal('woMarDetailModal');
            refreshAll();
            showToast('✅ Work Order ' + _currentMarWoId + ' closed successfully!');

            // Ask if user wants to create an invoice for this completed WO
            if (confirm('Would you like to create an Invoice for this completed Work Order?')) {
                openInvoiceModalFromWo(_currentMarWoId);
            }
        }

        function saveFabWoDesign() {
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return showToast('Work order not found', 'error');
            job.designPressure = document.getElementById('marOvDesignP').value.trim();
            job.designTemperature = document.getElementById('marOvDesignT').value.trim();
            job.shellHeadMaterial = document.getElementById('marOvMaterial').value.trim();
            job.headType = document.getElementById('marOvHeadType').value.trim();
            job.testingRequirement = document.getElementById('marOvTesting').value.trim();
            job.marDoshReg = document.getElementById('marOvDoshReg').value.trim();
            DB.update('workOrders', _currentMarWoId, job);
            showToast('✅ Technical data saved for ' + job.id);
        }

        function saveWoGeneral() {
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return showToast('Work order not found', 'error');
            job.title = document.getElementById('marOvEquip').value.trim();
            job.equipment = document.getElementById('marOvEquip').value.trim();
            job.client = document.getElementById('marOvClient').value.trim();
            job.site = document.getElementById('marOvSite').value.trim();
            job.dueDate = document.getElementById('marOvDue').value;
            job.description = document.getElementById('marOvDesc').value.trim();
            job.marAssetTag = document.getElementById('marOvAssetTag').value.trim();
            job.assetTag = document.getElementById('marOvAssetTag').value.trim();
            DB.update('workOrders', _currentMarWoId, job);
            renderJobsTable();
            renderKanbanBoard();
            showToast('✅ WO details saved for ' + job.id);
        }

        function toggleSoMatDisplay() {
            const el = document.getElementById('soMatDisplay');
            const btn = document.getElementById('toggleSoMatBtn');
            const show = el.style.display !== 'block';
            el.style.display = show ? 'block' : 'none';
            btn.textContent = show ? '🙈 Hide Material Data' : '📋 Show Material Data from Sales';
        }

        function approveMaterialsForPurchase(){
            if(!_currentMarWoId)return showToast('No work order selected','error');
            var job=DB.getById('workOrders',_currentMarWoId);
            if(!job)return showToast('Work order not found','error');
            var so=job.salesId?DB.getById('salesOrders',job.salesId):job.woRef?DB.getById('salesOrders',job.woRef):null;
            if(!so)return showToast('No linked Sales Order found','error');
            if(!confirm('Approve all materials from '+so.id+' for Purchase Requisition?'))return;
            // Create Purchase Requisition from SO materials
            var pe=so.peMaterials||{};
            var ri=so.repairInfo||{};
            var matItems=[];
            if(so.equipType==='Pressure Equipment'||(so.equipType||'').includes('Pressure')){
                if(pe.shellSpec)matItems.push({desc:'Shell Plate',spec:pe.shellSpec,size:pe.shellSize,qty:pe.shellQty});
                if(pe.headSpec)matItems.push({desc:'Head Plate ('+(pe.headType||'')+')',spec:pe.headSpec,size:pe.headSize,qty:pe.headQty});
                (pe.nozzleList||[]).forEach(function(r){matItems.push({desc:'Nozzle '+(r[0]||''),spec:r[2]||'',size:r[1]||'',qty:r[3]||''});});
                (pe.flangeList||[]).forEach(function(r){matItems.push({desc:'Flange '+(r[0]||''),spec:r[2]||'',size:r[1]||'',qty:r[3]||''});});
                if(pe.saddleSpec)matItems.push({desc:'Saddle/Leg '+(pe.saddleName||''),spec:pe.saddleSpec,size:'',qty:pe.saddleQty});
                if(pe.otherSpec)matItems.push({desc:'Other '+(pe.otherName||''),spec:pe.otherSpec,size:'',qty:pe.otherQty});
                (pe.otherList||[]).forEach(function(r){matItems.push({desc:'Other '+(r[0]||''),spec:r[1]||'',size:'',qty:r[2]||''});});
            }
            if(so.materials&&so.materials.length){
                so.materials.forEach(function(m){matItems.push({desc:m.desc||m.name||'',spec:m.grade||m.spec||'',size:m.size||'',qty:m.qty||''});});
            }
            if(so.type==='repair'&&ri.equipName){
                if(so.materials&&so.materials.length)so.materials.forEach(function(m){matItems.push({desc:'Repair: '+(m.desc||''),spec:m.grade||'',size:'',qty:m.qty||''});});
            }
            if(!matItems.length){showToast('No material items found in Sales Order','error');return;}
            var prId=DB.genId('purchaseRequisitions');
            var pr={id:prId,woRef:job.id,salesRef:so.id,custName:so.custName||job.custName||job.client||'',productName:so.productName||job.productName||job.equipment||'',items:matItems,status:'Approved',approvedBy:'Design Dept',approvedAt:new Date().toISOString(),createdAt:new Date().toISOString()};
            saveWithOwner('purchaseRequisitions',pr);
            // Update WO
            job.prRef=prId;
            job.materialApproved=true;
            job.materialApprovedDate=new Date().toISOString().split('T')[0];
            DB.update('workOrders',_currentMarWoId,job);
            // Show status
            var statusEl=document.getElementById('matPurchaseStatus');
            if(statusEl){
                statusEl.style.display='block';
                statusEl.style.background='#dcfce7';
                statusEl.style.color='#166534';
                statusEl.innerHTML='✅ Materials approved for purchase — PR <strong>'+prId+'</strong> created ('+matItems.length+' items)';
            }
            var apprBtn=document.getElementById('approveMatPurchaseBtn');
            if(apprBtn){apprBtn.textContent='✅ Approved';apprBtn.disabled=true;apprBtn.style.opacity='0.6';}
            showToast('✅ Materials approved — PR '+prId+' created for '+matItems.length+' items','success');
        }

        // ===== WO FAB WIZARD (EMBEDDED 8-STEP) =====

        let woFabWizardStep = 0;
        let woFabApproved = false;

        function woInitFabWizard() {
            woFabWizardStep = 0;
            woFabApproved = false;
            document.getElementById('wo_fabApprovalBadge').textContent = 'Pending Approval';
            document.getElementById('wo_fabApprovalBadge').style.cssText = 'font-size:12px;padding:4px 12px;border-radius:20px;background:#f3f4f6;color:#374151;font-weight:600;';
            document.getElementById('wo_fabApproveBtn').style.display = 'inline-flex';
            document.getElementById('wo_fabApproveBtn').textContent = '✅ Approve Prerequisites';
            document.getElementById('wo_fabRejectBtn').style.display = 'none';
            document.getElementById('wo_fabApprovalSignature').textContent = '';
            // Reset form fields
            ['wo_fabApprover','wo_fabApprovalNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('wo_fabApprovalDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('wo_fabRevision').value = 'Rev 0';
            ['wo_fabPre1','wo_fabPre2','wo_fabPre3','wo_fabPre4','wo_fabPre5'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
            document.getElementById('wo_fabProduct').value = '';
            document.getElementById('wo_fabMaterialList').value = '';
            document.getElementById('wo_fabPO').value = '';
            document.getElementById('wo_fabNdt').value = '';
            document.getElementById('wo_fabNotes').value = '';
            document.getElementById('wo_fabReleaseCheck').checked = false;
            // Populate customer dropdown
            const custSel = document.getElementById('wo_fabCustomer');
            if (custSel) {
                custSel.innerHTML = '<option>Select Customer...</option>' +
                    DB.get('customers').map(c => `<option value="${c.company}">${c.company}</option>`).join('');
            }
            // Init BOM table
            const bomTbody = document.getElementById('wo_fabBomTable');
            if (bomTbody) { bomTbody.innerHTML = ''; }
            // Init WPS table
            const wpsTbody = document.getElementById('wo_fabWpsTable');
            if (wpsTbody) { wpsTbody.innerHTML = ''; }
            // Init routing table (8 default steps)
            const routingTbody = document.getElementById('wo_fabRoutingTable');
            if (routingTbody) { routingTbody.innerHTML = ''; for(let ri=0;ri<8;ri++) woAddFabRoutingRow(); }
            // Init sub-orders table
            const subTbody = document.getElementById('wo_fabSubTable');
            if (subTbody) subTbody.innerHTML = '';
            // Reset doc list
            const docList = document.getElementById('wo_fabDocList');
            if (docList) docList.innerHTML = '';
            woFabWizardUpdateUI();
        }

        function woSubmitFabApproval(approved) {
            const approver = document.getElementById('wo_fabApprover').value;
            if (!approver) { showToast('Please select an approving authority', 'error'); return; }
            const preChecks = ['wo_fabPre1', 'wo_fabPre2', 'wo_fabPre3', 'wo_fabPre4', 'wo_fabPre5'];
            const checked = preChecks.filter(id => document.getElementById(id).checked).length;
            if (checked < 5) { showToast('All prerequisite checks must be completed before approval', 'warning'); return; }

            const badge = document.getElementById('wo_fabApprovalBadge');
            const now = new Date().toISOString().split('T')[0];
            const rev = document.getElementById('wo_fabRevision').value || 'Rev 0';

            if (approved) {
                woFabApproved = true;
                badge.textContent = '✅ Approved — ' + now;
                badge.style.cssText = 'font-size:12px;padding:4px 12px;border-radius:20px;background:rgba(16,185,129,0.15);color:#34d399;font-weight:600;';
                document.getElementById('wo_fabApproveBtn').style.display = 'none';
                document.getElementById('wo_fabRejectBtn').style.display = 'inline-flex';
                document.getElementById('wo_fabRejectBtn').innerHTML = '↻ Revise';
                document.getElementById('wo_fabApprovalSignature').innerHTML = '✍️ Signed by <strong>' + approver + '</strong> | ' + now + ' | ' + rev;
                showToast('Prerequisites approved by ' + approver, 'success');
            } else {
                woFabApproved = false;
                badge.textContent = '🔄 Revisions Requested — ' + now;
                badge.style.cssText = 'font-size:12px;padding:4px 12px;border-radius:20px;background:rgba(239,68,68,0.15);color:#f87171;font-weight:600;';
                document.getElementById('wo_fabApproveBtn').style.display = 'inline-flex';
                document.getElementById('wo_fabApproveBtn').textContent = '✅ Resubmit for Approval';
                document.getElementById('wo_fabRejectBtn').style.display = 'none';
                document.getElementById('wo_fabApprovalSignature').innerHTML = '';
                showToast('Revision requested — please update prerequisites and resubmit', 'warning');
            }
        }

        function woFabWizardUpdateUI() {
            document.querySelectorAll('#marPhase_fabSetup .fab-step-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === woFabWizardStep);
                dot.classList.toggle('done', i < woFabWizardStep);
            });
            document.querySelectorAll('#marPhase_fabSetup .fab-step-line').forEach((line, i) => {
                line.classList.toggle('done', i < woFabWizardStep);
            });
            document.querySelectorAll('#marPhase_fabSetup .fab-step').forEach((s, i) => {
                s.style.display = i === woFabWizardStep ? 'block' : 'none';
            });
            document.getElementById('wo_fabWizPrev').style.display = woFabWizardStep > 0 ? 'inline-flex' : 'none';
            const isLast = woFabWizardStep === 7;
            document.getElementById('wo_fabWizNext').style.display = isLast ? 'none' : 'inline-flex';
            document.getElementById('wo_fabWizCreate').style.display = isLast ? 'inline-flex' : 'none';
        }

        function woFabWizardNext() {
            if (woFabWizardStep === 0) {
                const preChecks = ['wo_fabPre1', 'wo_fabPre2', 'wo_fabPre3', 'wo_fabPre4', 'wo_fabPre5'];
                const checked = preChecks.filter(id => document.getElementById(id).checked).length;
                if (checked < 5) { showToast('All 5 prerequisite checks must be completed', 'warning'); return; }
                if (!woFabApproved) { showToast('Prerequisites must be approved by Design/Engineering before proceeding', 'warning'); return; }
            }
            if (woFabWizardStep === 1) {
                if (!document.getElementById('wo_fabProduct').value.trim()) { showToast('Product/Component name is required', 'error'); return; }
            }
            if (woFabWizardStep === 2) {
                if (!document.getElementById('wo_fabCustomer').value || document.getElementById('wo_fabCustomer').value === 'Select Customer...') { showToast('Please select a customer', 'error'); return; }
            }
            if (woFabWizardStep < 7) { woFabWizardStep++; woFabWizardUpdateUI(); }
            if (woFabWizardStep === 7) woUpdateFabReleaseSummary();
        }

        function woFabWizardPrev() {
            if (woFabWizardStep > 0) { woFabWizardStep--; woFabWizardUpdateUI(); }
        }

        function woAddFabBomRow() {
            const tbody = document.getElementById('wo_fabBomTable');
            if (!tbody) return;
            const idx = tbody.children.length + 1;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" class="form-control" value="${idx * 10}" style="width:45px;padding:4px 6px;font-size:12px;"></td>
                <td><input type="text" class="form-control" placeholder="Component name" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="text" class="form-control" placeholder="Spec / Material" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="number" class="form-control" value="1" min="1" style="width:50px;padding:4px 6px;font-size:12px;"></td>
                <td><input type="text" class="form-control" placeholder="Warehouse / Source" style="font-size:12px;padding:4px 8px;"></td>
                <td style="text-align:center;"><input type="checkbox"></td>
                <td style="text-align:center;"><input type="checkbox" checked></td>
                <td style="text-align:center;"><input type="checkbox"></td>
                <td style="text-align:center;"><input type="checkbox"></td>
                <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()">✕</button></td>
            `;
            tbody.appendChild(row);
        }
        function woAddFabWpsRow(data) {
            const tbody = document.getElementById('wo_fabWpsTable');
            if (!tbody) return;
            const idx = tbody.children.length + 1;
            const row = document.createElement('tr');
            const d = data || {};
            row.innerHTML = `
                <td style="text-align:center;font-size:12px;padding:4px;">${idx}</td>
                <td><input type="text" class="form-control" placeholder="WPS-SMAW-6G" value="${escHtml(d.wps||'')}" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="text" class="form-control" placeholder="PQR-2026-001" value="${escHtml(d.pqr||'')}" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="text" class="form-control" placeholder="WQT-JS-6G-2026" value="${escHtml(d.wqt||'')}" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="text" class="form-control" placeholder="e.g. SMAW/GTAW/SAW" value="${escHtml(d.process||'')}" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="text" class="form-control" placeholder="e.g. SA-516 Gr.70" value="${escHtml(d.materialGroup||'')}" style="font-size:12px;padding:4px 8px;"></td>
                <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()">✕</button></td>
            `;
            tbody.appendChild(row);
        }

        function woAddFabRoutingRow(workCenter, idx) {
            const tbody = document.getElementById('wo_fabRoutingTable');
            if (!tbody) return;
            const i = idx !== undefined ? idx : tbody.children.length;
            const stepNum = String(i + 1).padStart(2, '0');
            const centers = ['Material Marking', 'Material Cutting', 'Fit Up', 'Welding', 'Visual Inspection', 'NDT', 'Hold Point', 'Hydrostatic Test'];
            const descs = ['Mark material trace IDs per ITP', 'Cut plate to drawing dimensions', 'Tack weld assembly and fit-up check', 'Weld per approved WPS', 'Visual weld inspection per AWS D1.1', 'RT/UT/MPI per ITP', 'Hold — repair re-inspect if needed', 'Hydrostatic pressure test per ASME'];
            const hrs = [1.0, 2.0, 3.0, 5.0, 1.0, 2.0, 0.5, 2.0];
            const row = document.createElement('tr');
            const wcVal = workCenter || centers[i] || 'Work Center';
            const descVal = descs[i] || 'Operation';
            const hrVal = hrs[i] || 1.0;
            row.innerHTML = `
                <td><input type="text" class="form-control" value="${stepNum}" style="width:40px;padding:4px 6px;font-size:12px;"></td>
                <td><select class="form-control" style="font-size:12px;padding:4px 6px;">${centers.map(c => `<option ${c === wcVal ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
                <td><input type="text" class="form-control" value="${descVal}" style="font-size:12px;padding:4px 8px;"></td>
                <td><input type="number" class="form-control" value="${hrVal}" step="0.5" style="width:60px;padding:4px 6px;font-size:12px;"></td>
                <td style="text-align:center;"><input type="checkbox" ${i === 6 ? 'checked' : ''}></td>
                <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()">✕</button></td>
            `;
            tbody.appendChild(row);
        }

        function woAddFabSubRow() {
            const tbody = document.getElementById('wo_fabSubTable');
            if (!tbody) return;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><select class="form-control" style="font-size:12px;padding:4px 6px;"><option>Purchase Requisition</option><option>Subcontract PO</option><option>Heat Treatment</option><option>Material Transfer</option></select></td>
                <td><input type="text" class="form-control" placeholder="Description" style="font-size:12px;padding:4px 8px;"></td>
                <td><select class="form-control" style="font-size:12px;padding:4px 6px;"><option>Pending</option><option>Approved</option><option>Completed</option></select></td>
                <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()">✕</button></td>
            `;
            tbody.appendChild(row);
        }

        function woUpdateFabReleaseSummary() {
            const container = document.getElementById('wo_fabReleaseSummary');
            if (!container) return;
            const data = [
                ['Order Type', document.getElementById('wo_fabType').value],
                ['Product', document.getElementById('wo_fabProduct').value || '—'],
                ['Customer', document.getElementById('wo_fabCustomer').value || '—'],
                ['PO Ref', document.getElementById('wo_fabPO').value || '—'],
                ['Shop', document.getElementById('wo_fabShop').value],
                ['Quantity', document.getElementById('wo_fabQty').value],
                ['Start Date', document.getElementById('wo_fabStartDate').value || '—'],
                ['End Date', document.getElementById('wo_fabEndDate').value || '—'],
                ['Drawing Spec', document.getElementById('wo_fabDrawingSpec').value],
                ['WPS Items', document.getElementById('wo_fabWpsTable').children.length],
                ['NDT', document.getElementById('wo_fabNdt').value || '—'],
                ['BOM Items', document.getElementById('wo_fabBomTable').children.length],
                ['Routing Steps', document.getElementById('wo_fabRoutingTable').children.length],
                ['Labor / Assignments', document.getElementById('wo_fabLaborTable').children.length],
                ['Sub-Orders', document.getElementById('wo_fabSubTable').children.length],
            ];
            container.innerHTML = data.map(([label, val]) => `
                <div style="background:var(--bg);padding:8px 12px;border-radius:6px;font-size:12px;">
                    <span style="color:var(--text-muted);">${label}</span><br>
                    <strong>${val}</strong>
                </div>
            `).join('');
            document.getElementById('wo_fabDocList').innerHTML = [
                'Air_Receiver_GA_Drawing_Rev3.pdf',
                'WPS_SMAW_6G.pdf',
                'Material_Certificate_SA516_70.pdf'
            ].map(d => `<span style="background:var(--bg);padding:4px 10px;border-radius:4px;font-size:12px;border:1px solid var(--border);">📄 ${d}</span>`).join('');
        }

        function woCreateFabOrder() {
            if (!document.getElementById('wo_fabReleaseCheck').checked) { showToast('Please confirm release by checking the box', 'warning'); return; }
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return showToast('Work order not found', 'error');

            // Gather BOM
            const bomRows = document.querySelectorAll('#wo_fabBomTable tr');
            const bom = Array.from(bomRows).map(tr => {
                const cells = tr.querySelectorAll('input, select');
                return { item: parseInt(cells[0]?.value) || 0, component: cells[1]?.value || '', spec: cells[2]?.value || '', qty: parseInt(cells[3]?.value) || 1, source: cells[4]?.value || '', backflush: cells[5]?.checked || false, issue: cells[6]?.checked || false, ordered: cells[7]?.checked || false, received: cells[8]?.checked || false };
            }).filter(b => b.component);
            // Gather routing
            const routingRows = document.querySelectorAll('#wo_fabRoutingTable tr');
            const routing = Array.from(routingRows).map(tr => {
                const cells = tr.querySelectorAll('input, select');
                return { step: cells[0]?.value || '', workCenter: cells[1]?.value || '', description: cells[2]?.value || '', stdHours: parseFloat(cells[3]?.value) || 0, holdPoint: cells[4]?.checked || false };
            }).filter(r => r.workCenter);
            // Gather sub-orders
            const subRows = document.querySelectorAll('#wo_fabSubTable tr');
            const subOrders = Array.from(subRows).map(tr => {
                const cells = tr.querySelectorAll('select, input');
                return { type: cells[0]?.value || '', description: cells[1]?.value || '', status: cells[2]?.value || 'Pending' };
            }).filter(s => s.description);
            // Gather inspection holds
            const holdChecks = document.querySelectorAll('#wo_fabLaborTable input[type="checkbox"]:checked');
            const holds = Array.from(holdChecks).map(c => c.value);
            // Gather labor assignments
            const laborRows = document.querySelectorAll('#wo_fabLaborTable tr');
            const laborAssignments = Array.from(laborRows).map(tr => {
                const cells = tr.querySelectorAll('td');
                const sel = cells[2] ? cells[2].querySelector('select') : null;
                return { step: cells[0]?.textContent?.trim() || '', scope: cells[1]?.textContent?.trim() || '', person: sel ? sel.value : '' };
            }).filter(r => r.person);
            // Gather prerequisite check state
            const preState = ['wo_fabPre1','wo_fabPre2','wo_fabPre3','wo_fabPre4','wo_fabPre5'].map(id => document.getElementById(id).checked);

            // Save wizard data to WO
            const wizData = {
                prerequisites: preState,
                approved: woFabApproved,
                approval: {
                    approver: document.getElementById('wo_fabApprover').value,
                    date: document.getElementById('wo_fabApprovalDate').value,
                    revision: document.getElementById('wo_fabRevision').value,
                    notes: document.getElementById('wo_fabApprovalNotes').value,
                    badge: document.getElementById('wo_fabApprovalBadge').textContent,
                    signature: document.getElementById('wo_fabApprovalSignature').innerHTML
                },
                type: document.getElementById('wo_fabType').value,
                product: document.getElementById('wo_fabProduct').value.trim(),
                drawingSpec: document.getElementById('wo_fabDrawingSpec').value,
                materialList: document.getElementById('wo_fabMaterialList').value.trim(),
                quantity: parseInt(document.getElementById('wo_fabQty').value) || 1,
                shop: document.getElementById('wo_fabShop').value,
                customer: document.getElementById('wo_fabCustomer').value,
                poRef: document.getElementById('wo_fabPO').value.trim(),
                startDate: document.getElementById('wo_fabStartDate').value,
                endDate: document.getElementById('wo_fabEndDate').value,
                deliveryDate: document.getElementById('wo_fabDeliveryDate').value,
                wps: document.getElementById('wo_fabWps').value.trim(),
                pqr: document.getElementById('wo_fabPqr').value.trim(),
                wqt: document.getElementById('wo_fabWqt').value.trim(),
                ndt: document.getElementById('wo_fabNdt').value.trim(),
                inspectionHolds: holds,
                laborAssignments: laborAssignments,
                notes: document.getElementById('wo_fabNotes').value.trim(),
                wpsTable: Array.from(document.querySelectorAll('#wo_fabWpsTable tr')).map(tr => {
                    const cells = tr.querySelectorAll('input');
                    return { wps: cells[0]?.value || '', pqr: cells[1]?.value || '', wqt: cells[2]?.value || '', process: cells[3]?.value || '', materialGroup: cells[4]?.value || '' };
                }).filter(d => d.wps || d.pqr || d.wqt),
                bom, routing, subOrders
            };
            job.fabWizard = wizData;
            DB.update('workOrders', _currentMarWoId, job);

            // Create the Fabrication Order
            const now = new Date();
            const allFOs = DB.get('fabOrders');
            const foId = 'FO-' + now.getFullYear() + '-' + String(allFOs.length + 1).padStart(4, '0');
            const fo = {
                id: foId,
                type: wizData.type || 'Pressure Vessel',
                product: wizData.product || job.title || job.equipment || 'Fabrication Order',
                quantity: wizData.quantity || 1,
                startDate: wizData.startDate || now.toISOString().split('T')[0],
                endDate: wizData.endDate || '',
                shop: wizData.shop || 'Bay 2 - Heavy Fab',
                customer: wizData.customer || job.client || '—',
                poRef: wizData.poRef || '',
                woRef: _currentMarWoId,
                drawingSpec: wizData.drawingSpec || 'ASME Section VIII, Div 1',
                materialList: wizData.materialList || 'TBD',
                wpsTable: wizData.wpsTable || [],
                wpsPqr: (wizData.wpsTable||[]).map(function(d){return d.wps;}).filter(Boolean).join(', ') || 'TBD',
                ndtRequirements: wizData.ndt || 'TBD',
                deliveryDate: wizData.deliveryDate || job.dueDate || '',
                status: 'Scheduled',
                notes: wizData.notes || 'Created from Work Order ' + _currentMarWoId,
                bom: wizData.bom || [],
                routing: wizData.routing || [],
                subOrders: wizData.subOrders || [],
                labor: { primaryWelder: (wizData.laborAssignments||[]).filter(function(a){return a.scope==='Welding';}).map(function(a){return a.person;}).join(', ') || 'TBD', inspectionHolds: holds.length ? holds : ['03-FitUp', '06-NDT', '07-HoldPoint', '08-Hydrotest'] },
                documents: ['Air_Receiver_GA_Drawing_Rev3.pdf', 'WPS_SMAW_6G.pdf', 'Material_Certificate_SA516_70.pdf'].map(n => ({ name: n, uploaded: true })),
                createdAt: now.toISOString().split('T')[0]
            };
            saveWithOwner('fabOrders', fo);

            // Update WO status to In Fab
            const data = JSON.parse(localStorage.getItem('ad_deen_erp_db') || '{}');
            const jobs = data.workOrders || [];
            const idx = jobs.findIndex(j => j.id === _currentMarWoId);
            if (idx !== -1) {
                jobs[idx].status = 'In Fab';
                jobs[idx].fabWizard = wizData;
                data.workOrders = jobs;
                localStorage.setItem('ad_deen_erp_db', JSON.stringify(data));
            }

            closeModal('woMarDetailModal');
            refreshAll();
            showToast('🏭 Fabrication Order ' + foId + ' created from ' + _currentMarWoId);
            _currentMarWoId = null;
            _isFabWo = false;
        }

        function assignWoToBranch(branch) {
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return showToast('Work order not found', 'error');
            const designP = document.getElementById('marOvDesignP').value.trim();
            const designT = document.getElementById('marOvDesignT').value.trim();
            const material = document.getElementById('marOvMaterial').value.trim();
            if (!designP && !designT && !material) {
                showToast('⚠️ Please complete technical design data first', 'error');
                return;
            }
            if (!confirm('Assign ' + _currentMarWoId + ' to ' + (branch === 'fab' ? 'Fabrication' : 'Maintenance & Repair') + '?')) return;
            job.title = document.getElementById('marOvEquip').value.trim();
            job.equipment = document.getElementById('marOvEquip').value.trim();
            job.client = document.getElementById('marOvClient').value.trim();
            job.site = document.getElementById('marOvSite').value.trim();
            job.dueDate = document.getElementById('marOvDue').value;
            job.description = document.getElementById('marOvDesc').value.trim();
            job.marAssetTag = document.getElementById('marOvAssetTag').value.trim();
            job.assetTag = document.getElementById('marOvAssetTag').value.trim();
            job.branch = branch;
            job.workCategory = branch === 'fab' ? 'fab' : 'repair';
            job.trade = branch === 'fab' ? 'Fabrication / Welding (ASME Sec IX)' : 'Operations';
            job.designPressure = designP;
            job.designTemperature = designT;
            job.shellHeadMaterial = material;
            job.headType = document.getElementById('marOvHeadType').value.trim();
            job.testingRequirement = document.getElementById('marOvTesting').value.trim();
            job.marDoshReg = document.getElementById('marOvDoshReg').value.trim();
            job.status = 'Design Review';
            job.designStatus = 'Pending';
            DB.update('workOrders', _currentMarWoId, job);
            openMarDetail(_currentMarWoId);
            renderKanbanBoard();
            renderJobsTable();
            showToast('✅ ' + _currentMarWoId + ' assigned to ' + (branch === 'fab' ? 'Fabrication' : 'Maintenance & Repair') + ' — sent for Design Review');
        }

        function sendToDesignDept() {
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return showToast('Work order not found', 'error');
            const designP = document.getElementById('marOvDesignP').value.trim();
            const designT = document.getElementById('marOvDesignT').value.trim();
            const material = document.getElementById('marOvMaterial').value.trim();
            if (!designP && !designT && !material) {
                showToast('⚠️ Please complete technical design data first', 'error');
                return;
            }
            if (!confirm('Send ' + _currentMarWoId + ' to Design Department for review?')) return;
            job.title = document.getElementById('marOvEquip').value.trim();
            job.equipment = document.getElementById('marOvEquip').value.trim();
            job.client = document.getElementById('marOvClient').value.trim();
            job.site = document.getElementById('marOvSite').value.trim();
            job.dueDate = document.getElementById('marOvDue').value;
            job.description = document.getElementById('marOvDesc').value.trim();
            job.marAssetTag = document.getElementById('marOvAssetTag').value.trim();
            job.assetTag = document.getElementById('marOvAssetTag').value.trim();
            job.designPressure = designP;
            job.designTemperature = designT;
            job.shellHeadMaterial = material;
            job.headType = document.getElementById('marOvHeadType').value.trim();
            job.testingRequirement = document.getElementById('marOvTesting').value.trim();
            job.marDoshReg = document.getElementById('marOvDoshReg').value.trim();
            job.designStatus = 'Submitted';
            job.designSubmittedDate = new Date().toISOString().split('T')[0];
            job.status = 'Design Review';
            DB.update('workOrders', _currentMarWoId, job);
            closeModal('woMarDetailModal');
            renderJobsTable();
            renderKanbanBoard();
            renderDesignReviews();
            showToast('📐 ' + _currentMarWoId + ' sent to Design Department');
        }

        function sendToQualityMgmt(){
            if(!_currentMarWoId)return;
            var job=DB.getById('workOrders',_currentMarWoId);
            if(!job)return showToast('Work order not found','error');
            if(!confirm('Send '+_currentMarWoId+' to Quality Management for inspection?'))return;
            job.status='Quality Review';
            job.qualityStatus='Pending';
            job.qualitySubmittedDate=new Date().toISOString().split('T')[0];
            DB.update('workOrders',_currentMarWoId,job);
            closeModal('woMarDetailModal');
            renderJobsTable();
            renderKanbanBoard();
            renderDesignReviews();
            showToast('🔍 '+_currentMarWoId+' sent to Quality Management');
        }

        function submitForDesignReview() {
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return;
            const designP = document.getElementById('marOvDesignP').value.trim();
            const designT = document.getElementById('marOvDesignT').value.trim();
            const material = document.getElementById('marOvMaterial').value.trim();
            if (!designP && !designT && !material) {
                showToast('⚠️ Please complete technical design data first', 'error');
                return;
            }
            if (!confirm('Submit ' + _currentMarWoId + ' for Design Review?')) return;
            job.title = document.getElementById('marOvEquip').value.trim();
            job.equipment = document.getElementById('marOvEquip').value.trim();
            job.client = document.getElementById('marOvClient').value.trim();
            job.site = document.getElementById('marOvSite').value.trim();
            job.dueDate = document.getElementById('marOvDue').value;
            job.description = document.getElementById('marOvDesc').value.trim();
            job.marAssetTag = document.getElementById('marOvAssetTag').value.trim();
            job.assetTag = document.getElementById('marOvAssetTag').value.trim();
            job.designPressure = designP;
            job.designTemperature = designT;
            job.shellHeadMaterial = material;
            job.headType = document.getElementById('marOvHeadType').value.trim();
            job.testingRequirement = document.getElementById('marOvTesting').value.trim();
            job.marDoshReg = document.getElementById('marOvDoshReg').value.trim();
            job.designStatus = 'Submitted';
            DB.update('workOrders', _currentMarWoId, job);
            openMarDetail(_currentMarWoId);
            showToast('📤 ' + _currentMarWoId + ' submitted for Design Review');
        }

        function approveDesign() {
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return;
            if (!confirm('Approve design for ' + _currentMarWoId + '?')) return;
            job.designStatus = 'Approved';
            job.status = 'In Progress';
            DB.update('workOrders', _currentMarWoId, job);
            openMarDetail(_currentMarWoId);
            renderKanbanBoard();
            renderJobsTable();
            showToast('✅ Design approved for ' + _currentMarWoId + ' — now proceed to PR and dispatch');
        }

        function sendToFab() {
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return showToast('Work order not found', 'error');

            if (job.designStatus !== 'Approved') {
                showToast('⚠️ Design must be approved before sending to Fabrication', 'error');
                return;
            }

            // Grab latest values from inputs first
            const designP = document.getElementById('marOvDesignP').value.trim();
            const designT = document.getElementById('marOvDesignT').value.trim();
            const material = document.getElementById('marOvMaterial').value.trim();
            const headType = document.getElementById('marOvHeadType').value.trim();
            const testingReq = document.getElementById('marOvTesting').value.trim();

            // Validate design data is filled
            if (!designP && !designT && !material) {
                showToast('⚠️ Please complete technical design data in the Overview first', 'error');
                return;
            }

            if (!confirm('Send Work Order ' + _currentMarWoId + ' to Fabrication? A Fabrication Order will be created.')) return;

            const now = new Date();
            const allFOs = DB.get('fabOrders');
            const foId = 'FO-' + now.getFullYear() + '-' + String(allFOs.length + 1).padStart(4, '0');

            const wiz = job.fabWizard || {};
            const wizBom = wiz.bom || [];
            const wizRouting = wiz.routing || [];
            const wizSubOrders = wiz.subOrders || [];
            const wizHolds = wiz.inspectionHolds || [];

            const fo = {
                id: foId,
                type: wiz.type || 'Pressure Vessel',
                product: wiz.product || job.title || job.equipment || 'Fabrication Order',
                quantity: wiz.quantity || 1,
                startDate: wiz.startDate || now.toISOString().split('T')[0],
                endDate: wiz.endDate || '',
                shop: wiz.shop || 'Bay 2 - Heavy Fab',
                customer: wiz.customer || job.client || '—',
                poRef: wiz.poRef || '',
                woRef: _currentMarWoId,
                drawingSpec: wiz.drawingSpec || 'ASME Section VIII, Div 1',
                materialList: wiz.materialList || material || 'TBD',
                wpsTable: wiz.wpsTable || [],
                wpsPqr: (wiz.wpsTable||[]).map(function(d){return d.wps;}).filter(Boolean).join(', ') || 'TBD',
                ndtRequirements: wiz.ndt || testingReq || 'TBD',
                deliveryDate: wiz.deliveryDate || job.dueDate || '',
                status: 'Scheduled',
                notes: wiz.notes || 'Auto-generated from Work Order ' + _currentMarWoId,
                bom: wizBom.length ? wizBom : (function() {
                    const list = [];
                    let itemNo = 10;
                    if (material) list.push({ item: itemNo, component: 'Shell Plate (' + (job.shellMaterial || material) + ')', spec: material, qty: 1, source: 'Warehouse', backflush: false, issue: true });
                    itemNo += 10;
                    if (headType || job.headMaterial) list.push({ item: itemNo, component: 'Dished Ends (' + (job.headMaterial || headType || '2:1 Ellipsoidal') + ')', spec: headType || '2:1 Ellipsoidal', qty: 2, source: 'Subcontractor', backflush: false, issue: true });
                    itemNo += 10;
                    (job.nozzleItems || []).forEach(n => { list.push({ item: itemNo, component: 'Nozzle ' + n.size, spec: n.mat + ' × ' + n.qty + ' pcs', qty: n.qty || 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; });
                    (job.flangeItems || []).forEach(f => { list.push({ item: itemNo, component: 'Flange ' + f.type + ' ' + f.size, spec: f.type, qty: 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; });
                    (job.safetyValves || []).forEach(v => { list.push({ item: itemNo, component: 'Safety Valve ' + v.model, spec: v.size, qty: 1, source: 'Supplier', backflush: false, issue: true }); itemNo += 10; });
                    (job.boilerTubes || []).forEach(b => { list.push({ item: itemNo, component: 'Boiler Tube ' + b.spec, spec: b.size + ' × ' + b.qty, qty: b.qty || 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; });
                    (job.npPlateItems || []).forEach(p => { list.push({ item: itemNo, component: 'Plate ' + p.size, spec: p.spec + ' × ' + p.qty, qty: p.qty || 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; });
                    (job.npAngleItems || []).forEach(a => { list.push({ item: itemNo, component: 'Angle Bar ' + a.size, spec: a.spec + ' × ' + a.qty, qty: a.qty || 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; });
                    (job.npFlatItems || []).forEach(f => { list.push({ item: itemNo, component: 'Flat Bar ' + f.size, spec: f.spec + ' × ' + f.qty, qty: f.qty || 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; });
                    (job.npBeamItems || []).forEach(b => { list.push({ item: itemNo, component: 'Beam ' + b.size, spec: b.spec + ' × ' + b.qty, qty: b.qty || 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; });
                    if (job.boltNutSpec) { list.push({ item: itemNo, component: 'Bolt & Nut (' + job.boltNutSpec + ')', spec: job.boltNutSpec, qty: 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; }
                    if (job.pressureGauge) { list.push({ item: itemNo, component: 'Pressure Gauge', spec: job.pressureGauge, qty: 1, source: 'Supplier', backflush: false, issue: true }); itemNo += 10; }
                    if (job.saddleMaterial) { list.push({ item: itemNo, component: 'Saddle / Leg Support', spec: job.saddleMaterial, qty: 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; }
                    if (job.npOtherMaterial) { list.push({ item: itemNo, component: 'Other Material', spec: job.npOtherMaterial.substring(0, 60), qty: 1, source: 'Warehouse', backflush: false, issue: true }); itemNo += 10; }
                    if (list.length === 0) {
                        list.push({ item: 10, component: 'Shell Plate', spec: material || 'TBD', qty: 1, source: 'Warehouse', backflush: false, issue: true });
                        list.push({ item: 20, component: 'Dished Ends', spec: headType || '2:1 Ellipsoidal', qty: 2, source: 'Subcontractor', backflush: false, issue: true });
                        list.push({ item: 30, component: 'Nozzles & Fittings', spec: 'Per drawing', qty: 1, source: 'Warehouse', backflush: false, issue: true });
                    }
                    return list;
                })(),
                routing: wizRouting.length ? wizRouting : [
                    { step: '01', workCenter: 'Material Marking', description: 'Mark material trace IDs per ITP', stdHours: 1.0 },
                    { step: '02', workCenter: 'Material Cutting', description: 'Cut plate to drawing dimensions', stdHours: 2.0 },
                    { step: '03', workCenter: 'Fit Up', description: 'Tack weld assembly and fit-up check', stdHours: 3.0 },
                    { step: '04', workCenter: 'Welding', description: 'Weld per approved WPS', stdHours: 5.0 },
                    { step: '05', workCenter: 'Visual Inspection', description: 'Visual weld inspection per AWS D1.1', stdHours: 1.0 },
                    { step: '06', workCenter: 'NDT', description: 'RT/UT/MPI per ITP', stdHours: 2.0 },
                    { step: '07', workCenter: 'Hold Point', description: 'Hold — repair re-inspect if needed', stdHours: 0.5 },
                    { step: '08', workCenter: 'Hydrostatic Test', description: 'Hydrostatic pressure test per ASME', stdHours: 2.0 },
                ],
                labor: { primaryWelder: (wiz.laborAssignments||[]).filter(function(a){return a.scope==='Welding';}).map(function(a){return a.person;}).join(', ') || 'TBD', inspectionHolds: wizHolds.length ? wizHolds : ['03-FitUp', '06-NDT', '07-HoldPoint', '08-Hydrotest'] },
                subOrders: wizSubOrders.length ? wizSubOrders : [],
                documents: [],
                createdAt: now.toISOString().split('T')[0]
            };

            saveWithOwner('fabOrders', fo);

            const data = JSON.parse(localStorage.getItem('ad_deen_erp_db') || '{}');
            const jobs = data.workOrders || [];
            const idx = jobs.findIndex(j => j.id === _currentMarWoId);
            if (idx !== -1) {
                jobs[idx].status = 'In Fab';
                jobs[idx].fabWizard = wiz;
                jobs[idx].designPressure = designP;
                jobs[idx].designTemperature = designT;
                jobs[idx].shellHeadMaterial = material;
                jobs[idx].headType = headType;
                jobs[idx].testingRequirement = testingReq;
                data.workOrders = jobs;
                localStorage.setItem('ad_deen_erp_db', JSON.stringify(data));
            }

            closeModal('woMarDetailModal');
            refreshAll();
            showToast('🏭 Fabrication Order ' + foId + ' created from ' + _currentMarWoId);
            _currentMarWoId = null;
            _isFabWo = false;
        }

        function exportMarReport() {
            showToast('📄 Generating completion report... (PDF export placeholder)', 'info');
        }

        function printWorkOrderPDF(woId) {
            const job = DB.getById('workOrders', woId);
            if (!job) { showToast('Work order not found', 'error'); return; }
            const isFab = job.branch === 'fab';
            const isMar = job.branch === 'mar';
            const ds = job.designStatus || 'Pending';
            const today = new Date().toLocaleString();

            // Gather BOM rows
            const bom = (job.fabBom || []).map((b, i) =>
                '<tr><td>' + (i + 1) + '</td><td>' + (b.item || '') + '</td><td>' + (b.component || '') + '</td><td>' + (b.spec || '') + '</td><td>' + b.qty + '</td><td>' + (b.source || '') + '</td></tr>'
            ).join('');

            // Gather Routing
            const routing = (job.fabRouting || []).map(r =>
                '<tr><td>' + r.step + '</td><td>' + r.workCenter + '</td><td>' + r.description + '</td><td>' + r.stdHours + '</td></tr>'
            ).join('');

            // Gather M&R scope
            const marScope = isMar && job.marProblemDesc ? '<p><strong>Problem:</strong> ' + job.marProblemDesc + '</p>' : '';
            const marRepair = isMar && job.marRepairMethod ? '<p><strong>Repair Method:</strong> ' + job.marRepairMethod + '</p>' : '';
            const marFault = isMar && job.marFaultCodeSel ? '<p><strong>Fault Code:</strong> ' + job.marFaultCodeSel + '</p>' : '';

            // Gather prerequisites
            const preReqs = job.fabWizard?.prerequisites ? job.fabWizard.prerequisites.map((v, i) => {
                const labels = ['MDR', 'Drawing', 'WPS', 'PQR', 'WQT'];
                return '<span style="display:inline-block;margin:2px 6px 2px 0;padding:2px 10px;border-radius:4px;font-size:11px;background:' + (v ? '#d1fae5' : '#fee2e2') + ';color:' + (v ? '#065f46' : '#991b1b') + ';">' + labels[i] + ': ' + (v ? '✅' : '❌') + '</span>';
            }).join('') : '';

            const w = window.open('', '_blank', 'width=900,height=700');
            w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + job.id + ' — Work Order</title>');
            w.document.write('<style>');
            w.document.write('*{box-sizing:border-box;margin:0;padding:0}');
            w.document.write('body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;padding:30px;max-width:1000px;margin:0 auto;}');
            w.document.write('h1{font-size:22px;margin-bottom:4px;}');
            w.document.write('h2{font-size:16px;margin:24px 0 8px;border-bottom:2px solid #2563eb;padding-bottom:4px;}');
            w.document.write('h3{font-size:14px;margin:16px 0 6px;}');
            w.document.write('table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;}');
            w.document.write('th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}');
            w.document.write('th{background:#2563eb;color:#fff;font-weight:600;}');
            w.document.write('tr:nth-child(even){background:#f3f4f6;}');
            w.document.write('.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #2563eb;}');
            w.document.write('.header .logo{font-size:11px;color:#666;}');
            w.document.write('.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0;}');
            w.document.write('.info-item{padding:6px 10px;background:#f9fafb;border-radius:4px;border:1px solid #e5e7eb;}');
            w.document.write('.info-item .label{font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;}');
            w.document.write('.info-item .value{font-size:13px;color:#111;margin-top:1px;}');
            w.document.write('.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;}');
            w.document.write('.badge-new{background:#dbeafe;color:#1e40af;}');
            w.document.write('.badge-design-review{background:#fef3c7;color:#92400e;}');
            w.document.write('.badge-in-progress{background:#d1fae5;color:#065f46;}');
            w.document.write('.badge-completed{background:#e0e7ff;color:#3730a3;}');
            w.document.write('.badge-closed{background:#e5e7eb;color:#374151;}');
            w.document.write('.badge-success{background:#d1fae5;color:#065f46;}');
            w.document.write('.badge-warning{background:#fef3c7;color:#92400e;}');
            w.document.write('.badge-pending{background:#e5e7eb;color:#374151;}');
            w.document.write('.badge-critical{background:#fee2e2;color:#991b1b;}');
            w.document.write('.badge-high{background:#fed7aa;color:#9a3412;}');
            w.document.write('.badge-medium{background:#fef3c7;color:#92400e;}');
            w.document.write('.badge-low{background:#d1fae5;color:#065f46;}');
            w.document.write('.footer{margin-top:30px;padding-top:12px;border-top:1px solid #d1d5db;font-size:11px;color:#6b7280;}');
            w.document.write('.no-print{display:none;}');
            w.document.write('@media print{body{padding:15px;}.no-print{display:none;}}');
            w.document.write('</style></head><body>');

            // Print button (no-print)
            w.document.write('<div class="no-print" style="text-align:right;margin-bottom:12px;"><button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">🖨️ Print / Save PDF</button></div>');

            // Header
            w.document.write('<div class="header">');
            w.document.write('<div><h1>🔧 ' + job.id + '</h1><div style="font-size:13px;color:#4b5563;">' + (job.title || 'Work Order') + '</div></div>');
            w.document.write('<div class="logo">AD DEEN ENGINEERING SDN BHD<br>Work Order Document</div>');
            w.document.write('</div>');

            // Status bar
            w.document.write('<div style="display:flex;gap:12px;margin-bottom:16px;align-items:center;">');
            w.document.write('<span class="badge badge-' + (job.status||'new').toLowerCase().replace(/[\s-]+/g,'-') + '">' + (job.status||'New') + '</span>');
            w.document.write('<span class="badge badge-' + (job.priority||'medium').toLowerCase() + '">Priority: ' + (job.priority||'Medium') + '</span>');
            w.document.write('<span style="font-size:12px;color:#6b7280;">' + (isFab ? '🔧 Fabrication' : isMar ? '🔩 Maintenance & Repair' : '📋 General') + '</span>');
            w.document.write('</div>');

            // General Info
            w.document.write('<h2>General Information</h2>');
            w.document.write('<div class="info-grid">');
            w.document.write('<div class="info-item"><div class="label">Client</div><div class="value">' + (job.client || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Site</div><div class="value">' + (job.site || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Equipment</div><div class="value">' + (job.equipment || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Asset Tag</div><div class="value">' + (job.marAssetTag || job.assetTag || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Raised By</div><div class="value">' + (job.raisedBy || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Raised Date</div><div class="value">' + (job.raisedDate || job.createdAt || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Due Date</div><div class="value">' + (job.dueDate || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Trade / Discipline</div><div class="value">' + (job.trade || '—') + '</div></div>');
            w.document.write('</div>');

            // Description
            if (job.description) {
                w.document.write('<h2>Scope of Work</h2>');
                w.document.write('<p style="margin:4px 0;font-size:13px;line-height:1.5;padding:10px;background:#f9fafb;border-radius:4px;border:1px solid #e5e7eb;">' + job.description + '</p>');
            }

            // Design Data
            w.document.write('<h2>Technical Data</h2>');
            w.document.write('<div class="info-grid">');
            w.document.write('<div class="info-item"><div class="label">Design Code</div><div class="value">' + (job.fabDesignCode || job.designCode || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Design Pressure</div><div class="value">' + (job.designPressure || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Design Temp</div><div class="value">' + (job.designTemperature || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Material</div><div class="value">' + (job.shellHeadMaterial || job.marMaterial || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Head Type</div><div class="value">' + (job.headType || '—') + '</div></div>');
            w.document.write('<div class="info-item"><div class="label">Testing Requirement</div><div class="value">' + (job.testingRequirement || '—') + '</div></div>');
            w.document.write('</div>');

            // Prerequisites (Fab only)
            if (isFab && preReqs) {
                w.document.write('<h2>Prerequisites</h2>');
                w.document.write('<div style="margin:4px 0;">' + preReqs + '</div>');
            }

            // Fab-specific: BOM
            if (isFab && bom) {
                w.document.write('<h2>Bill of Materials</h2>');
                w.document.write('<table><thead><tr><th>#</th><th>Item</th><th>Component</th><th>Specification</th><th>Qty</th><th>Source</th></tr></thead><tbody>' + bom + '</tbody></table>');
            }

            // Fab-specific: Routing
            if (isFab && routing) {
                w.document.write('<h2>Routing / Process Flow</h2>');
                w.document.write('<table><thead><tr><th>Step</th><th>Work Center</th><th>Description</th><th>Std Hours</th></tr></thead><tbody>' + routing + '</tbody></table>');
            }

            // Fab-specific: WPS/PQR/WQT
            if (isFab) {
                const wps = job.fabWpsRef || job.wps || '';
                const pqr = job.fabPqrRef || job.pqr || '';
                const wqt = job.fabWqtRef || job.wqt || '';
                const ndt = job.fabNdtReq || job.ndtRequirements || '';
                if (wps || pqr || wqt || ndt) {
                    w.document.write('<h2>Welding & NDT References</h2>');
                    w.document.write('<div class="info-grid">');
                    if (wps) w.document.write('<div class="info-item"><div class="label">WPS</div><div class="value">' + wps + '</div></div>');
                    if (pqr) w.document.write('<div class="info-item"><div class="label">PQR</div><div class="value">' + pqr + '</div></div>');
                    if (wqt) w.document.write('<div class="info-item"><div class="label">WQT</div><div class="value">' + wqt + '</div></div>');
                    w.document.write('</div>');
                    if (ndt) w.document.write('<p style="margin:4px 0;"><strong>NDT Requirements:</strong> ' + ndt + '</p>');
                }
            }

            // M&R-specific: Fault, Problem, Repair
            if (isMar) {
                w.document.write('<h2>Maintenance & Repair Details</h2>');
                if (marFault || marScope || marRepair) {
                    w.document.write('<div style="padding:10px;background:#f9fafb;border-radius:4px;border:1px solid #e5e7eb;font-size:13px;line-height:1.5;">');
                    if (marFault) w.document.write(marFault);
                    if (marScope) w.document.write(marScope);
                    if (marRepair) w.document.write(marRepair);
                    if (job.marDiscovery) w.document.write('<p><strong>Discovery:</strong> ' + job.marDiscovery + '</p>');
                    if (job.marRisk) w.document.write('<p><strong>Risk Assessment:</strong> ' + job.marRisk + '</p>');
                    if (job.marRepairClass) w.document.write('<p><strong>Repair Class:</strong> ' + job.marRepairClass + '</p>');
                    if (job.marDoshRequired) w.document.write('<p><strong>DOSH Notification:</strong> ' + job.marDoshRequired + '</p>');
                    w.document.write('</div>');
                }
                if (job.marAiName) {
                    w.document.write('<div class="info-grid" style="margin-top:8px;">');
                    w.document.write('<div class="info-item"><div class="label">AI Name</div><div class="value">' + (job.marAiName || '—') + '</div></div>');
                    w.document.write('<div class="info-item"><div class="label">AI License</div><div class="value">' + (job.marAiLicense || '—') + '</div></div>');
                    w.document.write('<div class="info-item"><div class="label">AI Contact</div><div class="value">' + (job.marAiContact || '—') + '</div></div>');
                    if (job.marChkRepairProc) w.document.write('<div class="info-item"><div class="label">Repair Procedure Approved</div><div class="value">✅ Yes</div></div>');
                    w.document.write('</div>');
                }
            }

            // Design Status
            w.document.write('<h2>Design & Approval Status</h2>');
            w.document.write('<p><strong>Design Status:</strong> ' + (ds === 'Approved' ? '✅ Approved' : ds === 'Submitted' ? '📤 Under Review' : '⏳ Pending') + '</p>');

            // Notes
            if (job.notes) {
                w.document.write('<h2>Notes</h2>');
                w.document.write('<p style="padding:10px;background:#fffbeb;border-radius:4px;border:1px solid #fde68a;font-size:13px;">' + job.notes + '</p>');
            }

            // Footer
            w.document.write('<div class="footer">');
            w.document.write('<p>Printed: ' + today + ' | AD DEEN ENGINEERING SDN BHD | ' + job.id + '</p>');
            w.document.write('<p style="margin-top:4px;">This document is computer-generated and does not require a signature.</p>');
            w.document.write('</div>');

            w.document.write('</body></html>');
            w.document.close();
        }

        function filterJobs(filter, element) {
            document.querySelectorAll('#job-management-section .tab').forEach(t => t.classList.remove('active'));
            if (element) element.classList.add('active');
            renderJobsTable(filter);
        }

        function generateReport(type) {
            const wo = DB.get('workOrders');
            const insp = DB.get('inspections');
            const inv = DB.get('inventory');
            const cust = DB.get('customers');
            const sc = DB.get('serviceCalls');
            const docs = DB.get('documents');
            const assets = DB.get('assets');
            const sales = DB.get('salesOrders');
            let msg = '';

            if (type === 'job-overview') {
                const byStatus = {};
                wo.forEach(w => { byStatus[w.status] = (byStatus[w.status] || 0) + 1; });
                const byPriority = {};
                wo.forEach(w => { byPriority[w.priority || 'Normal'] = (byPriority[w.priority || 'Normal'] || 0) + 1; });
                msg = '📊 Job Overview Report\n\nTotal: ' + wo.length + '\n\nBy Status:\n' + Object.entries(byStatus).map(([k, v]) => '  ' + k + ': ' + v).join('\n') + '\n\nBy Priority:\n' + Object.entries(byPriority).map(([k, v]) => '  ' + k + ': ' + v).join('\n');
            } else if (type === 'qa-performance') {
                const pass = insp.filter(i => (i.result || '').includes('Pass')).length;
                const fail = insp.filter(i => (i.result || '').includes('Fail')).length;
                const rate = insp.length > 0 ? Math.round((pass / insp.length) * 100) : 0;
                msg = '📈 QA Performance Report\n\nTotal Inspections: ' + insp.length + '\nPass: ' + pass + '\nFail: ' + fail + '\nPass Rate: ' + rate + '%';
            } else if (type === 'inventory-status') {
                const low = inv.filter(i => i.status === 'Low Stock').length;
                const inS = inv.filter(i => i.status === 'In Stock').length;
                msg = '📦 Inventory Status Report\n\nTotal Items: ' + inv.length + '\nIn Stock: ' + inS + '\nLow Stock: ' + low;
            } else if (type === 'customer-analytics') {
                const active = cust.filter(c => c.status === 'Active').length;
                const byType = {};
                cust.forEach(c => { byType[c.type || 'Other'] = (byType[c.type || 'Other'] || 0) + 1; });
                msg = '👥 Customer Analytics Report\n\nTotal: ' + cust.length + '\nActive: ' + active + '\n\nBy Type:\n' + Object.entries(byType).map(([k, v]) => '  ' + k + ': ' + v).join('\n');
            } else if (type === 'service-stats') {
                const done = sc.filter(s => s.status === 'Completed').length;
                const pend = sc.filter(s => s.status === 'Pending' || s.status === 'Dispatched').length;
                msg = '📞 Service Stats Report\n\nTotal Calls: ' + sc.length + '\nPending: ' + pend + '\nCompleted: ' + done;
            } else if (type === 'document-summary') {
                const byType = {};
                docs.forEach(d => { byType[d.type] = (byType[d.type] || 0) + 1; });
                msg = '📄 Document Summary Report\n\nTotal: ' + docs.length + '\n\nBy Type:\n' + Object.entries(byType).map(([k, v]) => '  ' + k + ': ' + v).join('\n');
            } else if (type === 'material-usage') {
                const linked = inv.filter(i => i.woLink && i.woLink !== '').length;
                const unlinked = inv.length - linked;
                msg = '🧱 Material Usage Report\n\nTotal Items: ' + inv.length + '\nLinked to Jobs: ' + linked + '\nUnlinked: ' + unlinked;
            } else if (type === 'financial-summary') {
                const totalSO = sales.reduce((s, so) => s + (so.amount || 0), 0);
                msg = '💰 Financial Summary Report\n\nSales Orders: ' + sales.length + '\nTotal Value: RM ' + totalSO.toLocaleString();
            } else if (type === 'maintenance-asset') {
                const dueSoon = assets.filter(a => a.status === 'Due Soon').length;
                const overdue = assets.filter(a => a.nextDue && new Date(a.nextDue) < new Date()).length;
                const operational = assets.filter(a => a.status === 'Operational').length;
                const byStatus = {};
                assets.forEach(a => { byStatus[a.status || 'Unknown'] = (byStatus[a.status || 'Unknown'] || 0) + 1; });
                msg = '🔧 Maintenance / Asset Report\n\nTotal Assets: ' + assets.length + '\nOperational: ' + operational + '\nDue Soon: ' + dueSoon + '\nOverdue: ' + overdue + '\n\nBy Status:\n' + Object.entries(byStatus).map(([k, v]) => '  ' + k + ': ' + v).join('\n');
            } else if (type === 'inventory-mgmt') {
                const low = inv.filter(i => i.status === 'Low Stock').length;
                const byLoc = {};
                inv.forEach(i => { const loc = i.location || 'Unknown'; byLoc[loc] = (byLoc[loc] || 0) + 1; });
                const linked = inv.filter(i => i.woLink && i.woLink !== '').length;
                msg = '📦 Inventory Management Report\n\nTotal Items: ' + inv.length + '\nLow Stock Alerts: ' + low + '\nLinked to Jobs: ' + linked + '\n\nBy Location:\n' + Object.entries(byLoc).map(([k, v]) => '  ' + k + ': ' + v).join('\n');
            } else if (type === 'customer-mgmt') {
                const active = cust.filter(c => c.status === 'Active').length;
                const inactive = cust.filter(c => c.status !== 'Active').length;
                const byType = {};
                cust.forEach(c => { byType[c.type || 'Other'] = (byType[c.type || 'Other'] || 0) + 1; });
                const byCompany = {};
                cust.forEach(c => { byCompany[c.company || 'Unknown'] = (byCompany[c.company || 'Unknown'] || 0) + 1; });
                const topCompanies = Object.entries(byCompany).sort((a, b) => b[1] - a[1]).slice(0, 5);
                msg = '👥 Customer Management Report\n\nTotal: ' + cust.length + '\nActive: ' + active + '\nInactive: ' + inactive + '\n\nBy Type:\n' + Object.entries(byType).map(([k, v]) => '  ' + k + ': ' + v).join('\n') + '\n\nTop Companies:\n' + topCompanies.map(([k, v]) => '  ' + k + ': ' + v).join('\n');
            } else {
                msg = 'Report not available for: ' + type;
            }

            showToast(msg.split('\n')[0] + ' — generated', 'info');
            console.log(msg);
        }


        // ========================================================================
        //  PURCHASING FUNCTIONS
        // ========================================================================
        function renderPurchasing() {
            const filter = document.getElementById('prStatusFilter')?.value || 'all';
            const search = document.getElementById('prSearch');
            const q = search ? search.value.toLowerCase() : '';
            let prs = DB.get('purchaseRequisitions');
            if (filter !== 'all') prs = prs.filter(p => (p.status || '') === filter);
            if (q) prs = prs.filter(p =>
                p.id.toLowerCase().includes(q) || (p.woRef || '').toLowerCase().includes(q) ||
                (p.supplier || '').toLowerCase().includes(q)
            );
            let pos = DB.get('purchaseOrders');
            if (filter !== 'all') pos = pos.filter(p => (p.status || '') === filter);
            if (q) pos = pos.filter(p =>
                p.id.toLowerCase().includes(q) || (p.supplier || '').toLowerCase().includes(q) ||
                (p.prRef || '').toLowerCase().includes(q)
            );

            const prTotal = DB.get('purchaseRequisitions').length;
            const prPending = DB.get('purchaseRequisitions').filter(p => p.status === 'Pending').length;
            const poTotal = DB.get('purchaseOrders').length;
            const poActive = DB.get('purchaseOrders').filter(p => p.status === 'Sent' || p.status === 'Confirmed').length;
            const poCost = DB.get('purchaseOrders').reduce((s, p) => s + (p.totalCost || 0), 0);

            document.getElementById('purchasingStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);">🛒</div>
                    <div class="stat-content"><h3>${prTotal}</h3><p>Total PRs</p><div class="stat-trend trend-up">${prPending} pending</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);">⏳</div>
                    <div class="stat-content"><h3>${prPending}</h3><p>Pending Approval</p><div class="stat-trend trend-up">Awaiting PO</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);">📦</div>
                    <div class="stat-content"><h3>${poTotal}</h3><p>Total POs</p><div class="stat-trend trend-up">${poActive} active</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);">💰</div>
                    <div class="stat-content"><h3>RM ${poCost.toLocaleString()}</h3><p>Total PO Value</p><div class="stat-trend trend-up">All POs</div></div>
                </div>
            `;

            document.getElementById('prTable').innerHTML = prs.length
                ? prs.map(p => `
                    <tr>
                        <td><strong><span class="trace-link">${p.id}</span></strong></td>
                        <td>${p.woRef ? '<span class="trace-link">' + p.woRef + '</span>' : '<span style="color:var(--text-muted);">—</span>'}</td>
                        <td>${(p.items||[]).length} items<br><small style="color:var(--text-muted);">${(p.items||[]).map(i=>i.material).join(', ').substring(0,40)}</small></td>
                        <td>${p.supplier || '—'}</td>
                        <td><strong>RM ${(p.estCost||0).toLocaleString()}</strong></td>
                        <td><span class="badge badge-${p.status.toLowerCase().replace(/\s+/g,'-')}">${p.status}</span></td>
                        <td style="font-size:12px;">${p.createdAt || '—'}</td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-xs btn-info" onclick="showToast('📋 ${p.id}: ${(p.items||[]).length} items, RM ${(p.estCost||0).toLocaleString()}')">View</button>
                                <button class="btn btn-xs btn-success" onclick="updatePrStatus('${p.id}')">Status</button>
                                <button class="btn btn-xs btn-danger" onclick="deleteRecord('purchaseRequisitions','${p.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')
                : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">No purchase requisitions found</td></tr>';

            document.getElementById('poTable').innerHTML = pos.length
                ? pos.map(p => `
                    <tr>
                        <td><strong><span class="trace-link">${p.id}</span></strong></td>
                        <td>${p.prRef ? '<span class="trace-link">' + p.prRef + '</span>' : '<span style="color:var(--text-muted);">—</span>'}</td>
                        <td>${p.supplier || '—'}</td>
                        <td>${(p.items||[]).length} items<br><small style="color:var(--text-muted);">${(p.items||[]).map(i=>i.material).join(', ').substring(0,40)}</small></td>
                        <td><strong>RM ${(p.totalCost||0).toLocaleString()}</strong></td>
                        <td><span class="badge badge-${p.status.toLowerCase().replace(/\s+/g,'-')}">${p.status}</span></td>
                        <td style="font-size:12px;">${p.deliveryDate || '—'}</td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-xs btn-info" onclick="showToast('📦 ${p.id}: ${(p.items||[]).length} items, RM ${(p.totalCost||0).toLocaleString()}')">View</button>
                                <button class="btn btn-xs btn-success" onclick="updatePoStatus('${p.id}')">Status</button>
                                <button class="btn btn-xs btn-danger" onclick="deleteRecord('purchaseOrders','${p.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')
                : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">No purchase orders found</td></tr>';
        }

        function switchPurchasingTab(tab) {
            document.getElementById('prCard').style.display = tab === 'pr' ? 'block' : 'none';
            document.getElementById('poCard').style.display = tab === 'po' ? 'block' : 'none';
            document.getElementById('tabPr').className = tab === 'pr' ? 'tab active' : 'tab';
            document.getElementById('tabPo').className = tab === 'po' ? 'tab active' : 'tab';
        }

        function openPrModal(prefillWo) {
            const sel = document.getElementById('prWoRef');
            sel.innerHTML = '<option value="">— None (standalone PR) —</option>';
            DB.get('workOrders').forEach(wo => {
                const opt = document.createElement('option');
                opt.value = wo.id;
                opt.textContent = wo.id + ' — ' + (wo.title || wo.equipment || '');
                sel.appendChild(opt);
            });
            if (prefillWo) sel.value = prefillWo;
            document.getElementById('prSupplier').value = '';
            document.getElementById('prEstCost').value = '';
            document.getElementById('prRequestedByOld').value = (Auth.getUser() ? Auth.getUser().name : 'Shahrul Azmi Salim Shah');
            document.getElementById('prItemsBody').innerHTML = `
                <tr>
                    <td>1</td>
                    <td><input type="text" class="form-control" style="font-size:11px;" placeholder="e.g. Steel Plate" id="prItemDesc_0"></td>
                    <td><input type="text" class="form-control" style="font-size:11px;" placeholder="e.g. SA-516 Gr.70 10mm" id="prItemSpec_0"></td>
                    <td><input type="number" class="form-control" style="font-size:11px;width:70px;" value="1" min="1" id="prItemQty_0"></td>
                    <td><select class="form-control" style="font-size:11px;width:80px;" id="prItemUnit_0"><option>pcs</option><option>m</option><option>kg</option><option>bag</option><option>set</option></select></td>
                    <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove()">✕</button></td>
                </tr>`;
            document.getElementById('prModal').classList.add('active');
        }

        function addPrItemRow() {
            const tb = document.getElementById('prItemsBody');
            const num = tb.querySelectorAll('tr').length;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${num+1}</td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="e.g. Steel Plate" id="prItemDesc_${num}"></td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="e.g. SA-516 Gr.70 10mm" id="prItemSpec_${num}"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:70px;" value="1" min="1" id="prItemQty_${num}"></td>
                <td><select class="form-control" style="font-size:11px;width:80px;" id="prItemUnit_${num}"><option>pcs</option><option>m</option><option>kg</option><option>bag</option><option>set</option></select></td>
                <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove()">✕</button></td>`;
            tb.appendChild(tr);
        }

        function createPurchaseRequisition() {
            const woRef = document.getElementById('prWoRef').value;
            const supplier = document.getElementById('prSupplier').value.trim();
            const estCost = parseFloat(document.getElementById('prEstCost').value) || 0;
            const requestedBy = document.getElementById('prRequestedByOld').value.trim() || 'Unknown';

            const rows = document.getElementById('prItemsBody').querySelectorAll('tr');
            const items = [];
            rows.forEach((row, i) => {
                const desc = row.querySelector(`#prItemDesc_${i}`)?.value?.trim();
                if (desc) {
                    items.push({
                        item: i+1,
                        material: desc,
                        spec: row.querySelector(`#prItemSpec_${i}`)?.value?.trim() || '',
                        qty: parseInt(row.querySelector(`#prItemQty_${i}`)?.value) || 1,
                        unit: row.querySelector(`#prItemUnit_${i}`)?.value || 'pcs'
                    });
                }
            });

            if (items.length === 0) { showToast('Please add at least one item', 'error'); return; }

            const now = new Date();
            const allPRs = DB.get('purchaseRequisitions');
            const id = 'PR-' + now.getFullYear() + '-' + String(allPRs.length + 1).padStart(4, '0');

            const pr = { id, woRef, items, supplier, estCost, status: 'Pending', createdAt: now.toISOString().split('T')[0], requestedBy };
            saveWithOwner('purchaseRequisitions', pr);

            closeModal('prModal');
            if (document.getElementById('purchasing-section')?.classList.contains('active')) {
                renderPurchasing();
            }
            showToast('🛒 Purchase Requisition ' + id + ' created' + (woRef ? ' for ' + woRef : ''));
        }

        function createPrFromWo() {
            if (!_currentMarWoId) return;
            const job = DB.getById('workOrders', _currentMarWoId);
            if (!job) return showToast('Work order not found', 'error');
            if (job.designStatus !== 'Approved') {
                showToast('⚠️ Design must be approved before creating Purchase Requisition', 'error');
                return;
            }

            // Check if PR already exists for this WO
            const existing = DB.get('purchaseRequisitions').filter(p => p.woRef === _currentMarWoId);
            if (existing.length > 0) {
                showToast('⚠️ PR already exists: ' + existing[0].id, 'error');
                updatePrStatusBlock(existing[0]);
                return;
            }

            const now = new Date();
            const allPRs = DB.get('purchaseRequisitions');
            const id = 'PR-' + now.getFullYear() + '-' + String(allPRs.length + 1).padStart(4, '0');

            const items = [
                { item: 1, material: job.shellHeadMaterial || 'Steel Plate', spec: 'Per drawing', qty: job.quantity || 1, unit: 'pcs' },
                { item: 2, material: 'Dished Ends', spec: job.headType || '2:1 Ellipsoidal', qty: 2, unit: 'pcs' },
                { item: 3, material: 'Nozzles & Fittings', spec: 'Per drawing', qty: 1, unit: 'set' },
                { item: 4, material: 'Welding Consumables', spec: 'E7018 / ER70S-6', qty: 1, unit: 'set' },
            ];

            const pr = { id, woRef: _currentMarWoId, items, supplier: '', estCost: 0, status: 'Pending', createdAt: now.toISOString().split('T')[0], requestedBy: job.raisedBy || 'Unknown' };
            saveWithOwner('purchaseRequisitions', pr);
            updatePrStatusBlock(pr);
            showToast('🛒 Purchase Requisition ' + id + ' created for ' + _currentMarWoId);
        }

        function updatePrStatusBlock(pr) {
            const block = document.getElementById('prStatusBlock');
            const ref = document.getElementById('prRefDisplay');
            const badge = document.getElementById('prStatusBadge');
            const viewBtn = document.getElementById('prViewBtn');
            const createBtn = document.getElementById('createPrBtn');
            const chkPr = document.getElementById('fabDispChkPr');

            block.style.display = 'block';
            ref.textContent = pr.id;
            badge.textContent = pr.status;
            badge.className = 'badge badge-' + pr.status.toLowerCase().replace(/\s+/g, '-');
            viewBtn.style.display = 'inline-flex';
            viewBtn.onclick = () => showToast('📋 ' + pr.id + ': ' + (pr.items||[]).length + ' items, RM ' + (pr.estCost||0).toLocaleString());
            createBtn.textContent = '✅ PR Created (' + pr.id + ')';
            createBtn.disabled = true;
            createBtn.style.opacity = '0.6';
            chkPr.checked = true;
        }

        function updatePrStatus(id) {
            const pr = DB.getById('purchaseRequisitions', id);
            if (!pr) return;
            const statuses = ['Pending', 'Ordered', 'Received', 'Completed'];
            const next = statuses[(statuses.indexOf(pr.status) + 1) % statuses.length];
            if (!confirm('Update ' + id + ' status from "' + pr.status + '" to "' + next + '"?')) return;
            DB.update('purchaseRequisitions', id, { status: next });
            renderPurchasing();
            showToast('✅ ' + id + ' status updated to ' + next);
        }

        // ========================================================================
        //  PURCHASE ORDER FUNCTIONS
        // ========================================================================
        function openPoModal() {
            const sel = document.getElementById('poPrRef');
            sel.innerHTML = '<option value="">— None (standalone PO) —</option>';
            DB.get('purchaseRequisitions').forEach(pr => {
                const opt = document.createElement('option');
                opt.value = pr.id;
                opt.textContent = pr.id + ' — ' + (pr.supplier || 'No supplier') + ' | RM ' + (pr.estCost || 0).toLocaleString();
                sel.appendChild(opt);
            });
            document.getElementById('poSupplier').value = '';
            document.getElementById('poDeliveryDateOld').value = '';
            document.getElementById('poNotesOld').value = '';
            resetPoItems();
            updatePoTotal();
            document.getElementById('poModal').classList.add('active');
        }

        function resetPoItems() {
            document.getElementById('poItemsBody').innerHTML = `
                <tr>
                    <td>1</td>
                    <td><input type="text" class="form-control" style="font-size:11px;" placeholder="e.g. Steel Plate" id="poItemDesc_0"></td>
                    <td><input type="text" class="form-control" style="font-size:11px;" placeholder="e.g. SA-516 Gr.70 10mm" id="poItemSpec_0"></td>
                    <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="1" min="1" id="poItemQty_0"></td>
                    <td><select class="form-control" style="font-size:11px;width:70px;" id="poItemUnit_0"><option>pcs</option><option>m</option><option>kg</option><option>bag</option><option>set</option></select></td>
                    <td><input type="number" class="form-control" style="font-size:11px;width:80px;" value="0" min="0" step="0.01" id="poItemPrice_0" oninput="updatePoTotal()"></td>
                    <td style="font-size:12px;font-weight:600;" id="poItemTotal_0">RM 0</td>
                    <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updatePoTotal();">✕</button></td>
                </tr>`;
        }

        function addPoItemRow() {
            const tb = document.getElementById('poItemsBody');
            const num = tb.querySelectorAll('tr').length;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${num+1}</td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="e.g. Steel Plate" id="poItemDesc_${num}"></td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="e.g. SA-516 Gr.70 10mm" id="poItemSpec_${num}"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="1" min="1" id="poItemQty_${num}"></td>
                <td><select class="form-control" style="font-size:11px;width:70px;" id="poItemUnit_${num}"><option>pcs</option><option>m</option><option>kg</option><option>bag</option><option>set</option></select></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:80px;" value="0" min="0" step="0.01" id="poItemPrice_${num}" oninput="updatePoTotal()"></td>
                <td style="font-size:12px;font-weight:600;" id="poItemTotal_${num}">RM 0</td>
                <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updatePoTotal();">✕</button></td>`;
            tb.appendChild(tr);
        }

        function updatePoTotal() {
            const tb = document.getElementById('poItemsBody');
            let total = 0;
            tb.querySelectorAll('tr').forEach((row, i) => {
                const qty = parseFloat(document.getElementById(`poItemQty_${i}`)?.value) || 0;
                const price = parseFloat(document.getElementById(`poItemPrice_${i}`)?.value) || 0;
                const lineTotal = qty * price;
                const cell = document.getElementById(`poItemTotal_${i}`);
                if (cell) cell.textContent = 'RM ' + lineTotal.toLocaleString(undefined, {minimumFractionDigits:2});
                total += lineTotal;
            });
            document.getElementById('poTotalCost').value = 'RM ' + total.toLocaleString(undefined, {minimumFractionDigits:2});
        }

        function createPurchaseOrder() {
            const prRef = document.getElementById('poPrRef').value;
            const supplier = document.getElementById('poSupplier').value.trim();
            if (!supplier) { showToast('Please enter a supplier', 'error'); return; }

            const rows = document.getElementById('poItemsBody').querySelectorAll('tr');
            const items = [];
            rows.forEach((row, i) => {
                const desc = document.getElementById(`poItemDesc_${i}`)?.value?.trim();
                if (desc) {
                    const qty = parseFloat(document.getElementById(`poItemQty_${i}`)?.value) || 1;
                    const price = parseFloat(document.getElementById(`poItemPrice_${i}`)?.value) || 0;
                    items.push({
                        item: i+1,
                        material: desc,
                        spec: document.getElementById(`poItemSpec_${i}`)?.value?.trim() || '',
                        qty,
                        unit: document.getElementById(`poItemUnit_${i}`)?.value || 'pcs',
                        unitPrice: price
                    });
                }
            });

            if (items.length === 0) { showToast('Please add at least one item', 'error'); return; }

            const totalCost = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
            const now = new Date();
            const allPOs = DB.get('purchaseOrders');
            const id = 'PO-' + now.getFullYear() + '-' + String(allPOs.length + 1).padStart(4, '0');

            const po = {
                id, prRef, supplier, items, totalCost,
                deliveryDate: document.getElementById('poDeliveryDateOld').value || '',
                notes: document.getElementById('poNotesOld').value.trim() || '',
                status: 'Draft',
                createdAt: now.toISOString().split('T')[0],
                createdBy: Auth.getUser() ? Auth.getUser().name : 'Shahrul Azmi Salim Shah'
            };
            saveWithOwner('purchaseOrders', po);
            closeModal('poModal');
            renderPurchasing();
            showToast('📦 Purchase Order ' + id + ' created — RM ' + totalCost.toLocaleString());
        }

        function updatePoStatus(id) {
            const po = DB.getById('purchaseOrders', id);
            if (!po) return;
            const statuses = ['Draft', 'Sent', 'Confirmed', 'Shipped', 'Received'];
            const next = statuses[(statuses.indexOf(po.status) + 1) % statuses.length];
            if (!confirm('Update ' + id + ' status from "' + po.status + '" to "' + next + '"?')) return;
            DB.update('purchaseOrders', id, { status: next });
            renderPurchasing();
            showToast('✅ ' + id + ' status updated to ' + next);
        }

// ==================== PURCHASING ENHANCED FUNCTIONS ====================

// PR Counter
let prCounter = 0;

function _getCurrentUser() {
return (Auth.getUser && Auth.getUser()) || { username: 'admin', name: 'Administrator' };
}

// Add PR Item Row
        function addPRItem() {
            const table = document.getElementById('prItemsTable');
            if (!table) return;
            const rowCount = table.children.length + 1;
            const row = document.createElement('tr');
            row.id = 'prRow' + rowCount;
            row.innerHTML = '<td style="text-align:center;">' + rowCount + '</td>' +
                '<td><input type="text" class="form-control" style="font-size:11px;" id="prDesc' + rowCount + '" placeholder="Item description" oninput="updatePRTotal()"></td>' +
                '<td><input type="text" class="form-control" style="font-size:11px;" id="prSpec' + rowCount + '" placeholder="Specification"></td>' +
                '<td><input type="number" class="form-control" style="font-size:11px;width:70px;" id="prQty' + rowCount + '" value="1" min="1" oninput="updatePRTotal()"></td>' +
                '<td><select class="form-control" style="font-size:11px;width:80px;" id="prUnit' + rowCount + '"><option>pcs</option><option>kg</option><option>m</option><option>set</option><option>box</option><option>pack</option></select></td>' +
                '<td><input type="number" class="form-control" style="font-size:11px;width:100px;" id="prPrice' + rowCount + '" value="0" min="0" step="0.01" oninput="updatePRTotal()"></td>' +
                '<td style="font-weight:600;" id="prTotal' + rowCount + '">RM 0.00</td>' +
                '<td><input type="date" class="form-control" style="font-size:11px;width:110px;" id="prItemDate' + rowCount + '"></td>' +
                '<td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest(\'tr\').remove();updatePRTotal();">&times;</button></td>';
            table.appendChild(row);
            prCounter = rowCount;
        }

        // Update PR Grand Total
        function updatePRTotal() {
            let grandTotal = 0;
            document.querySelectorAll('#prItemsTable tr').forEach(function(row) {
                const id = row.id ? row.id.replace('prRow', '') : '';
                if (!id) return;
                const qty = parseFloat(document.getElementById('prQty' + id)?.value) || 0;
                const price = parseFloat(document.getElementById('prPrice' + id)?.value) || 0;
                const total = qty * price;
                const totalCell = document.getElementById('prTotal' + id);
                if (totalCell) totalCell.textContent = 'RM ' + total.toFixed(2);
                grandTotal += total;
            });
            const gt = document.getElementById('prGrandTotal');
            if (gt) gt.textContent = 'RM ' + grandTotal.toFixed(2);
        }

        // Auto-fill PR from selected WO
        function autoFillPRFromWO() {
            const woRef = document.getElementById('prWORef').value;
            if (!woRef) return;
            const wo = DB.getById('workOrders', woRef);
            if (!wo) return;
            const reqBy = document.getElementById('prRequestedBy');
            if (reqBy && !reqBy.value) reqBy.value = _getCurrentUser().name;
            // Try to populate items from Materials list
            if (wo.items && wo.items.length > 0) {
                const table = document.getElementById('prItemsTable');
                if (table) table.innerHTML = '';
                wo.items.forEach(function(item, i) {
                    addPRItem();
                    const rowNum = i + 1;
                    const descEl = document.getElementById('prDesc' + rowNum);
                    if (descEl) descEl.value = item.desc || item.description || item.name || '';
                    const specEl = document.getElementById('prSpec' + rowNum);
                    if (specEl) specEl.value = item.spec || item.specification || '';
                    const qtyEl = document.getElementById('prQty' + rowNum);
                    if (qtyEl) qtyEl.value = item.qty || item.quantity || 1;
                });
                updatePRTotal();
            }
        }

        // Save PR (full)
        function saveAndCreatePR() {
            const prNumber = document.getElementById('prNumber').value;
            if (!prNumber) { showToast('⚠️ PR number is required', 'error'); return; }

            const items = [];
            document.querySelectorAll('#prItemsTable tr').forEach(function(row) {
                const id = row.id ? row.id.replace('prRow', '') : '';
                if (!id) return;
                const desc = document.getElementById('prDesc' + id)?.value || '';
                if (!desc) return;
                items.push({
                    description: desc,
                    specification: document.getElementById('prSpec' + id)?.value || '',
                    quantity: parseFloat(document.getElementById('prQty' + id)?.value) || 0,
                    unit: document.getElementById('prUnit' + id)?.value || 'pcs',
                    unitPrice: parseFloat(document.getElementById('prPrice' + id)?.value) || 0,
                    total: parseFloat((document.getElementById('prTotal' + id)?.textContent || '0').replace('RM ', '')) || 0,
                    requiredDate: document.getElementById('prItemDate' + id)?.value || ''
                });
            });

            if (items.length === 0) { showToast('⚠️ Add at least one item', 'error'); return; }

            const user = _getCurrentUser();
            const prData = {
                id: prNumber,
                number: prNumber,
                date: document.getElementById('prDate').value,
                priority: document.getElementById('prPriority').value,
                woRef: document.getElementById('prWORef').value,
                requestedBy: document.getElementById('prRequestedBy').value || user.name,
                department: document.getElementById('prDepartment').value,
                requiredDate: document.getElementById('prRequiredDate').value,
                deliveryLocation: document.getElementById('prDeliveryLocation').value,
                reason: document.getElementById('prReason').value,
                budgetCode: document.getElementById('prBudgetCode').value,
                notes: document.getElementById('prNotes').value,
                requirements: {
                    mtr: document.getElementById('prReqMTR')?.checked || false,
                    coc: document.getElementById('prReqCOC')?.checked || false,
                    ndt: document.getElementById('prReqNDT')?.checked || false,
                    dosh: document.getElementById('prReqDOSH')?.checked || false,
                    cal: document.getElementById('prReqCal')?.checked || false,
                    thirdParty: document.getElementById('prReq3rd')?.checked || false
                },
                items: items,
                status: 'Approved',
                grandTotal: parseFloat((document.getElementById('prGrandTotal')?.textContent || '0').replace('RM ', '')) || 0,
                createdBy: user.username,
                createdAt: new Date().toISOString(),
                estCost: parseFloat((document.getElementById('prGrandTotal')?.textContent || '0').replace('RM ', '')) || 0,
                supplier: ''
            };

            // Check if PR already exists (edit mode)
            const existing = DB.getById('purchaseRequisitions', prNumber);
            if (existing) {
                DB.update('purchaseRequisitions', prNumber, prData);
            } else {
                saveWithOwner('purchaseRequisitions', prData);
            }

            showToast('✅ Purchase Requisition ' + prNumber + ' created successfully!');

            setTimeout(function() {
                if (confirm('PR created! Do you want to compare supplier quotations now?')) {
                    openSupplierComparison(prNumber);
                }
            }, 500);

            closeModal('prFullModal');
            if (typeof renderPurchasing === 'function') renderPurchasing();
        }

        // Submit PR for Approval
        function submitPRForApproval() {
            const prNumber = document.getElementById('prNumber').value;
            if (!prNumber) return;
            const user = _getCurrentUser();
            const prData = {
                id: prNumber,
                number: prNumber,
                status: 'Pending Approval',
                submittedBy: user.username,
                submittedAt: new Date().toISOString()
            };

            const existing = DB.getById('purchaseRequisitions', prNumber);
            if (existing) {
                DB.update('purchaseRequisitions', prNumber, Object.assign({}, existing, prData));
            } else {
                saveWithOwner('purchaseRequisitions', prData);
            }

            const statusDiv = document.getElementById('prApprovalStatus');
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="background:#fef3c7;padding:10px;border-radius:6px;">' +
                    '<strong>⏳ Status: Pending Approval</strong><br>' +
                    '<span style="font-size:12px;">Submitted by: ' + user.name + ' on ' + new Date().toLocaleDateString() + '</span></div>' +
                    '<div style="margin-top:8px;">' +
                    '<button class="btn btn-success btn-sm" onclick="approvePR(\'' + prNumber + '\')">✅ Approve</button> ' +
                    '<button class="btn btn-danger btn-sm" onclick="rejectPR(\'' + prNumber + '\')">❌ Reject</button></div>';
            }

            showToast('📤 PR submitted for approval!');
        }

        // Approve PR
        function approvePR(prNumber) {
            const pr = DB.getById('purchaseRequisitions', prNumber);
            if (pr) {
                const user = _getCurrentUser();
                DB.update('purchaseRequisitions', prNumber, {
                    status: 'Approved',
                    approvedBy: user.username,
                    approvedAt: new Date().toISOString()
                });
            }

            const statusDiv = document.getElementById('prApprovalStatus');
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="background:#f0fdf4;padding:10px;border-radius:6px;">' +
                    '<strong>✅ Status: Approved</strong><br>' +
                    '<span style="font-size:12px;">Approved by: ' + _getCurrentUser().name + ' on ' + new Date().toLocaleDateString() + '</span></div>' +
                    '<button class="btn btn-info btn-sm" style="margin-top:8px;" onclick="openSupplierComparison(\'' + prNumber + '\')">📊 Compare Suppliers</button>';
            }

            showToast('✅ PR Approved! Ready for supplier comparison.');
            if (typeof renderPurchasing === 'function') renderPurchasing();
        }

        // Reject PR
        function rejectPR(prNumber) {
            const reason = prompt('Reason for rejection:');
            const pr = DB.getById('purchaseRequisitions', prNumber);
            if (pr) {
                DB.update('purchaseRequisitions', prNumber, {
                    status: 'Rejected',
                    rejectedBy: _getCurrentUser().username,
                    rejectedAt: new Date().toISOString(),
                    rejectionReason: reason
                });
            }

            const statusDiv = document.getElementById('prApprovalStatus');
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="background:#fef2f2;padding:10px;border-radius:6px;">' +
                    '<strong>❌ Status: Rejected</strong><br>' +
                    '<span style="font-size:12px;">Reason: ' + (reason || 'Not specified') + '</span></div>';
            }

            showToast('❌ PR Rejected.');
        }

        // Save PR Draft
        function savePRDraft() {
            const prNumber = document.getElementById('prNumber').value;
            if (!prNumber) return;
            const user = _getCurrentUser();
            const existing = DB.getById('purchaseRequisitions', prNumber);
            if (existing) {
                DB.update('purchaseRequisitions', prNumber, Object.assign({}, existing, { status: 'Draft', savedAt: new Date().toISOString() }));
            } else {
                saveWithOwner('purchaseRequisitions', {
                    id: prNumber,
                    number: prNumber,
                    status: 'Draft',
                    savedAt: new Date().toISOString(),
                    createdBy: user.username
                });
            }
            showToast('💾 PR saved as draft.');
            closeModal('prFullModal');
            if (typeof renderPurchasing === 'function') renderPurchasing();
        }

        // ==================== SUPPLIER COMPARISON ====================

        function openSupplierComparison(prNumber) {
            const modal = document.getElementById('supplierCompareModal');
            if (!modal) return;
            modal.style.display = 'flex';
            modal.classList.add('active');

            const prs = DB.get('purchaseRequisitions');
            const pr = prNumber ? prs.find(function(p) { return p.number === prNumber || p.id === prNumber; }) : (prs.length > 0 ? prs[prs.length - 1] : null);

            const infoDiv = document.getElementById('comparePRInfo');
            if (infoDiv) {
                infoDiv.innerHTML = '<div style="background:var(--bg);padding:10px;border-radius:6px;margin-bottom:12px;">' +
                    '<strong>PR: ' + (prNumber || 'N/A') + '</strong> | Items: ' + (pr && pr.items ? pr.items.length : 0) +
                    ' | Total: RM ' + (pr && pr.grandTotal ? pr.grandTotal.toFixed(2) : '0.00') + '</div>';
            }

            const body = document.getElementById('compareBody');
            if (body && pr && pr.items) {
                let html = '';
                pr.items.forEach(function(item, i) {
                    const basePrice = item.unitPrice || 0;
                    html += '<tr>' +
                        '<td>' + (item.description || 'Item ' + (i + 1)) + '</td>' +
                        '<td><input type="number" class="form-control" id="compA' + i + '" style="font-size:11px;" value="' + basePrice + '" oninput="updateComparison()"></td>' +
                        '<td><input type="number" class="form-control" id="compB' + i + '" style="font-size:11px;" value="' + (basePrice * 1.05).toFixed(2) + '" oninput="updateComparison()"></td>' +
                        '<td><input type="number" class="form-control" id="compC' + i + '" style="font-size:11px;" value="' + (basePrice * 0.95).toFixed(2) + '" oninput="updateComparison()"></td>' +
                        '<td id="compBest' + i + '"></td></tr>';
                });
                body.innerHTML = html;
                updateComparison();
            }
        }

        function updateComparison() {
            let totalA = 0, totalB = 0, totalC = 0;
            document.querySelectorAll('#compareBody tr').forEach(function(row, i) {
                const a = parseFloat(document.getElementById('compA' + i)?.value) || 0;
                const b = parseFloat(document.getElementById('compB' + i)?.value) || 0;
                const c = parseFloat(document.getElementById('compC' + i)?.value) || 0;
                totalA += a; totalB += b; totalC += c;
                const best = Math.min(a, b, c);
                const bestName = best === a ? 'A' : best === b ? 'B' : 'C';
                const bestCell = document.getElementById('compBest' + i);
                if (bestCell) { bestCell.textContent = bestName; bestCell.style.color = '#059669'; }
            });

            ['compareTotalA', 'compareTotalB', 'compareTotalC'].forEach(function(id, idx) {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<strong>RM ' + [totalA, totalB, totalC][idx].toFixed(2) + '</strong>';
            });

            const bestTotal = Math.min(totalA, totalB, totalC);
            const bestSupplier = bestTotal === totalA ? 'Supplier A' : bestTotal === totalB ? 'Supplier B' : 'Supplier C';
            const bestEl = document.getElementById('compareBest');
            if (bestEl) bestEl.innerHTML = '<strong style="color:#059669;">' + bestSupplier + '</strong>';
        }

        // ==================== PURCHASE ORDER ENHANCED ====================

        function openPRFullModal(editId) {
            const modal = document.getElementById('prFullModal');
            if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
        }

        function openPOFullModal(editId) {
            const modal = document.getElementById('poFullModal');
            if (!modal) return;
            modal.style.display = 'flex';
            modal.classList.add('active');

            if (!editId) {
                const date = new Date();
                const pos = DB.get('purchaseOrders');
                const num = 'PO-' + date.getFullYear() + '-' + String(pos.length + 1).padStart(4, '0');
                document.getElementById('poNumber').value = num;
                document.getElementById('poDate').value = date.toISOString().split('T')[0];
            }

            const prSelect = document.getElementById('poPRRef');
            if (prSelect) {
                prSelect.innerHTML = '<option value="">-- Select PR --</option>';
                DB.get('purchaseRequisitions').filter(function(p) { return p.status === 'Approved'; }).forEach(function(pr) {
                    prSelect.innerHTML += '<option value="' + (pr.number || pr.id) + '">' + (pr.number || pr.id) + ' - RM ' + ((pr.grandTotal || pr.estCost || 0).toFixed(2)) + '</option>';
                });
            }
        }

        function autoFillPOFromPR() {
            const prNumber = document.getElementById('poPRRef').value;
            if (!prNumber) return;
            const pr = DB.getById('purchaseRequisitions', prNumber) || DB.get('purchaseRequisitions').find(function(p) { return p.number === prNumber; });
            if (!pr) return;

            const table = document.getElementById('poItemsTable');
            if (table) table.innerHTML = '';

            if (pr.items) {
                pr.items.forEach(function(item, i) {
                    const row = document.createElement('tr');
                    row.innerHTML = '<td>' + (i + 1) + '</td>' +
                        '<td>' + (item.description || '') + '</td>' +
                        '<td>' + (item.specification || '') + '</td>' +
                        '<td>' + (item.quantity || 0) + '</td>' +
                        '<td>' + (item.unit || 'pcs') + '</td>' +
                        '<td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="' + (item.unitPrice || 0) + '" oninput="updatePOTotal()"></td>' +
                        '<td style="font-weight:600;">RM ' + ((item.total || item.unitPrice * item.quantity || 0).toFixed(2)) + '</td>';
                    if (table) table.appendChild(row);
                });
            }

            updatePOTotal();
        }

        function updatePOTotal() {
            let total = 0;
            document.querySelectorAll('#poItemsTable tr').forEach(function(row) {
                const priceInput = row.querySelector('td:nth-child(6) input');
                const price = parseFloat(priceInput?.value) || 0;
                const qty = parseFloat(row.querySelector('td:nth-child(4)')?.textContent) || 0;
                const lineTotal = price * qty;
                total += lineTotal;
                const totalCell = row.querySelector('td:nth-child(7)');
                if (totalCell) totalCell.textContent = 'RM ' + lineTotal.toFixed(2);
            });
            const gt = document.getElementById('poGrandTotal');
            if (gt) gt.textContent = 'RM ' + total.toFixed(2);
        }

        function savePO() {
            const poNumber = document.getElementById('poNumber').value;
            if (!poNumber) { showToast('⚠️ PO number is required', 'error'); return; }

            const items = [];
            document.querySelectorAll('#poItemsTable tr').forEach(function(row) {
                const desc = row.querySelector('td:nth-child(2)')?.textContent || '';
                if (!desc) return;
                const price = parseFloat(row.querySelector('td:nth-child(6) input')?.value) || 0;
                const qty = parseFloat(row.querySelector('td:nth-child(4)')?.textContent) || 0;
                items.push({
                    description: desc,
                    specification: row.querySelector('td:nth-child(3)')?.textContent || '',
                    quantity: qty,
                    unit: row.querySelector('td:nth-child(5)')?.textContent || 'pcs',
                    unitPrice: price,
                    total: price * qty
                });
            });

            const poData = {
                id: poNumber,
                number: poNumber,
                date: document.getElementById('poDate').value,
                prRef: document.getElementById('poPRRef').value,
                supplierName: document.getElementById('poSupplierName').value,
                supplierContact: document.getElementById('poSupplierContact').value,
                supplierEmail: document.getElementById('poSupplierEmail').value,
                supplierPhone: document.getElementById('poSupplierPhone').value,
                quoteRef: document.getElementById('poQuoteRef').value,
                paymentTerms: document.getElementById('poPaymentTerms').value,
                deliveryDate: document.getElementById('poDeliveryDate').value,
                deliveryLocation: document.getElementById('poDeliveryLocation').value,
                notes: document.getElementById('poNotes').value,
                status: document.getElementById('poStatus').value,
                confirmDate: document.getElementById('poConfirmDate').value,
                actualDelivery: document.getElementById('poActualDelivery').value,
                grandTotal: parseFloat((document.getElementById('poGrandTotal')?.textContent || '0').replace('RM ', '')) || 0,
                totalCost: parseFloat((document.getElementById('poGrandTotal')?.textContent || '0').replace('RM ', '')) || 0,
                items: items,
                supplier: document.getElementById('poSupplierName').value,
                createdAt: new Date().toISOString()
            };

            const existing = DB.getById('purchaseOrders', poNumber);
            if (existing) {
                DB.update('purchaseOrders', poNumber, Object.assign({}, existing, poData));
            } else {
                saveWithOwner('purchaseOrders', poData);
            }

            showToast('✅ Purchase Order ' + poNumber + ' saved!');
            closeModal('poFullModal');
            if (typeof renderPurchasing === 'function') renderPurchasing();
        }

        function savePODraft() {
            const poNumber = document.getElementById('poNumber').value;
            if (!poNumber) return;
            const existing = DB.getById('purchaseOrders', poNumber);
            if (existing) {
                DB.update('purchaseOrders', poNumber, Object.assign({}, existing, { status: 'Draft', savedAt: new Date().toISOString() }));
            } else {
                saveWithOwner('purchaseOrders', {
                    id: poNumber,
                    number: poNumber,
                    status: 'Draft',
                    savedAt: new Date().toISOString()
                });
            }
            showToast('💾 PO saved as draft.');
            closeModal('poFullModal');
            if (typeof renderPurchasing === 'function') renderPurchasing();
        }

        function sendPOToSupplier() {
            const poNumber = document.getElementById('poNumber').value;
            const supplierEmail = document.getElementById('poSupplierEmail').value;
            if (!supplierEmail) {
                showToast('⚠️ Please enter supplier email first.', 'error');
                return;
            }
            const subject = 'Purchase Order ' + poNumber + ' - AD Deen Engineering';
            const body = 'Dear Supplier,\n\nPlease find attached our Purchase Order ' + poNumber + '.\n\nThank you.\n\nAD Deen Engineering';
            window.open('mailto:' + encodeURIComponent(supplierEmail) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body));

            document.getElementById('poStatus').value = 'Sent';
            // Save PO with status update
            const existing = DB.getById('purchaseOrders', poNumber);
            if (existing) {
                DB.update('purchaseOrders', poNumber, Object.assign({}, existing, { status: 'Sent' }));
            }
            savePO();
            showToast('📧 Opening email client to send PO to supplier...');
        }

        function printPO() {
            window.print();
        }

        function createPOFromComparison() {
            openPOFullModal();
            const decision = document.getElementById('compareDecision')?.value || '';
            const notesEl = document.getElementById('poNotes');
            if (notesEl && decision) notesEl.value = 'Supplier Comparison Decision: ' + decision;
            closeModal('supplierCompareModal');
        }

        // ========================================================================
        //  CLIENT P.O FUNCTIONS
        // ========================================================================

        function renderClientPOs() {
            var pos = DB.get('clientPOs');
            var search = (document.getElementById('clientPOSearch')?.value || '').toLowerCase();
            if (search) {
                pos = pos.filter(function(p) {
                    return (p.poNumber || '').toLowerCase().includes(search) ||
                           (p.client || '').toLowerCase().includes(search);
                });
            }
            document.getElementById('cpoTotal').textContent = pos.length;
            document.getElementById('cpoPending').textContent = pos.filter(function(p) { return p.status === 'Pending'; }).length;
            document.getElementById('cpoConverted').textContent = pos.filter(function(p) { return p.status === 'Converted'; }).length;
            var tbody = document.getElementById('clientPOTable');
            if (!tbody) return;
            if (!pos.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No client purchase orders yet</td></tr>';
                return;
            }
            tbody.innerHTML = pos.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); }).map(function(p) {
                var statusClass = (p.status || 'Pending').toLowerCase().replace(/\s+/g, '-');
                var soLink = p.salesOrderId ? '<a href="#" onclick="navigateTo(\'sales\');return false;" style="color:var(--secondary);">' + p.salesOrderId + '</a>' : '<span style="color:var(--text-muted);font-size:11px;">—</span>';
                var actions = '<div class="btn-group">';
                if (p.status !== 'Converted' && p.status !== 'Cancelled') {
                    actions += '<button class="btn btn-xs btn-info" onclick="convertPOToSalesOrder(\'' + p.id + '\')">→ SO</button>';
                    actions += '<button class="btn btn-xs btn-secondary" onclick="editClientPO(\'' + p.id + '\')">Edit</button>';
                }
                actions += '<button class="btn btn-xs btn-ghost" onclick="deleteClientPO(\'' + p.id + '\')">×</button></div>';
                return '<tr>' +
                    '<td><strong>' + escHtml(p.poNumber || p.id) + '</strong></td>' +
                    '<td>' + escHtml(p.client || '—') + '</td>' +
                    '<td>' + (p.date || '—') + '</td>' +
                    '<td>' + (p.amount ? 'RM ' + parseFloat(p.amount).toFixed(2) : '—') + '</td>' +
                    '<td><span class="badge badge-' + statusClass + '">' + escHtml(p.status || 'Pending') + '</span></td>' +
                    '<td>' + soLink + '</td>' +
                    '<td>' + actions + '</td>' +
                '</tr>';
            }).join('');
        }

        function openClientPOModal() {
            var modal = document.getElementById('clientPOModal');
            if (!modal) return;
            document.getElementById('cpoEditId').value = '';
            document.getElementById('cpoNumber').value = '';
            document.getElementById('cpoDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('cpoAmount').value = '';
            document.getElementById('cpoDescription').value = '';
            document.getElementById('cpoStatus').value = 'Pending';
            var sel = document.getElementById('cpoClient');
            sel.innerHTML = '<option value="">-- Select Client --</option>';
            DB.get('customers').forEach(function(c) {
                sel.innerHTML += '<option value="' + escHtml(c.company || c.name) + '">' + escHtml(c.company || c.name) + ' — ' + escHtml(c.name) + '</option>';
            });
            modal.style.display = 'flex';
            modal.classList.add('active');
        }

        function onCpoClientChange() {
            var sel = document.getElementById('cpoClient');
            if (!sel || !sel.value) return;
            var clientName = sel.value;
            var qts = DB.get('quotations').filter(function(q) {
                return q.customer === clientName && q.status === 'Accepted';
            });
            if (qts.length > 0) {
                var qt = qts[qts.length - 1];
                var descEl = document.getElementById('cpoDescription');
                var amountEl = document.getElementById('cpoAmount');
                if (descEl) descEl.value = qt.subject || qt.description || '';
                if (amountEl && qt.total) amountEl.value = qt.total;
                showToast('Auto-filled from quotation ' + qt.id, 'info');
            }
        }

        function editClientPO(id) {
            var p = DB.getById('clientPOs', id, 'id');
            if (!p) return;
            document.getElementById('cpoEditId').value = id;
            document.getElementById('cpoNumber').value = p.poNumber || '';
            document.getElementById('cpoDate').value = p.date || '';
            document.getElementById('cpoAmount').value = p.amount || '';
            document.getElementById('cpoDescription').value = p.description || '';
            document.getElementById('cpoStatus').value = p.status || 'Pending';
            var sel = document.getElementById('cpoClient');
            sel.innerHTML = '<option value="">-- Select Client --</option>';
            DB.get('customers').forEach(function(c) {
                sel.innerHTML += '<option value="' + escHtml(c.company || c.name) + '">' + escHtml(c.company || c.name) + ' — ' + escHtml(c.name) + '</option>';
            });
            sel.value = p.client || '';
            document.getElementById('clientPOModal').style.display = 'flex';
            document.getElementById('clientPOModal').classList.add('active');
        }

        function saveClientPO() {
            var editId = document.getElementById('cpoEditId').value;
            var poNumber = document.getElementById('cpoNumber').value.trim();
            var client = document.getElementById('cpoClient').value;
            var date = document.getElementById('cpoDate').value;
            var amount = document.getElementById('cpoAmount').value;
            var description = document.getElementById('cpoDescription').value.trim();
            var status = document.getElementById('cpoStatus').value;

            if (!poNumber || !client) {
                showToast('PO number and client are required', 'error');
                return;
            }

            var data = {
                poNumber: poNumber,
                client: client,
                date: date,
                amount: amount ? parseFloat(amount) : 0,
                description: description,
                status: status
            };

            if (editId) {
                var existing = DB.getById('clientPOs', editId, 'id');
                if (existing) {
                    data.salesOrderId = existing.salesOrderId || '';
                    data.createdAt = existing.createdAt;
                    data.id = editId;
                    saveWithOwner('clientPOs', data);
                    showToast('P.O updated', 'success');
                }
            } else {
                var count = DB.get('clientPOs').length;
                data.id = 'CPO-' + String(count + 1).padStart(4, '0');
                data.createdAt = new Date().toISOString();
                data.salesOrderId = '';
                saveWithOwner('clientPOs', data);
                showToast('P.O saved', 'success');
            }

            closeModal('clientPOModal');
            renderClientPOs();
        }

        function deleteClientPO(id) {
            if (!confirm('Delete this client P.O?')) return;
            DB.delete('clientPOs', id);
            renderClientPOs();
            showToast('P.O deleted', 'info');
        }

        function convertPOToSalesOrder(poId) {
            var po = DB.getById('clientPOs', poId, 'id');
            if (!po) return;
            openSalesNewOrderModal();
            var sel = document.getElementById('soCustName');
            if (sel) {
                for (var i = 0; i < sel.options.length; i++) {
                    if (sel.options[i].text.indexOf(po.client) !== -1) {
                        sel.value = sel.options[i].value;
                        break;
                    }
                }
            }
            var desc = document.getElementById('soProductName');
            if (desc) desc.value = po.description || 'PO: ' + po.poNumber;
            var budget = document.getElementById('soBudget');
            if (budget && po.amount) budget.value = po.amount;
            var poRef = document.getElementById('soClientPONumber');
            if (poRef) poRef.value = po.poNumber || '';
            // Trigger customer change to populate PO dropdown, then re-select
            if (sel && sel.value) onSoCustChange();
            if (poRef && po.poNumber) {
                for (var j = 0; j < poRef.options.length; j++) {
                    if (poRef.options[j].value === po.poNumber) { poRef.value = po.poNumber; break; }
                }
            }

            po.salesOrderId = '(pending)';
            po.status = 'Converted';
            saveWithOwner('clientPOs', po);
            showToast('Sales order form pre-filled from ' + po.poNumber, 'success');
        }

        // ========================================================================
        //  PROJECT COSTING FUNCTIONS
        // ========================================================================
        function calcCostTotal() {
            var qty = parseFloat(document.getElementById('costQty').value) || 0;
            var unit = parseFloat(document.getElementById('costUnitCost').value) || 0;
            document.getElementById('costTotal').value = (qty * unit).toFixed(2);
        }

        function openCostingModal(editId) {
            document.getElementById('costEditId').value = editId || '';
            document.getElementById('costingModalTitle').textContent = editId ? '✏️ Edit Cost Entry' : '💰 New Cost Entry';
            document.getElementById('costDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('costDescription').value = '';
            document.getElementById('costQty').value = '';
            document.getElementById('costUnitCost').value = '';
            document.getElementById('costTotal').value = '';
            document.getElementById('costCategory').value = 'Material';
            // Populate WO dropdown
            var woSel = document.getElementById('costWO');
            if (woSel) {
                woSel.innerHTML = '<option value="">-- Select Work Order --</option>';
                DB.get('workOrders').forEach(function(wo) {
                    woSel.innerHTML += '<option value="' + wo.id + '">' + wo.id + ' — ' + (wo.title || wo.equipment || wo.client || '') + '</option>';
                });
            }
            if (editId) {
                var entry = DB.getById('jobCosting', editId);
                if (entry) {
                    document.getElementById('costDate').value = entry.date || '';
                    if (woSel) woSel.value = entry.woId || '';
                    document.getElementById('costCategory').value = entry.category || 'Material';
                    document.getElementById('costDescription').value = entry.description || '';
                    document.getElementById('costQty').value = entry.qty || '';
                    document.getElementById('costUnitCost').value = entry.unitCost || '';
                    document.getElementById('costTotal').value = entry.total || '';
                }
            }
            document.getElementById('costingModal').classList.add('active');
        }

        function saveCostingEntry() {
            var editId = document.getElementById('costEditId').value;
            var date = document.getElementById('costDate').value;
            var woId = document.getElementById('costWO').value;
            var category = document.getElementById('costCategory').value;
            var description = document.getElementById('costDescription').value.trim();
            var qty = parseFloat(document.getElementById('costQty').value) || 0;
            var unitCost = parseFloat(document.getElementById('costUnitCost').value) || 0;
            var total = (qty * unitCost).toFixed(2);
            if (!date) { showToast('Date is required', 'error'); return; }
            if (!woId) { showToast('Please select a project', 'error'); return; }
            var currentUser = (Auth.getUser && Auth.getUser()) ? Auth.getUser().name : 'Unknown';
            var entry = { date: date, woId: woId, category: category, description: description, qty: qty, unitCost: unitCost, total: total, enteredBy: currentUser };
            if (editId) {
                DB.update('jobCosting', editId, entry);
                closeModal('costingModal');
                renderCosting();
                showToast('Cost entry updated!', 'success');
            } else {
                entry.id = DB.genId('jobCosting');
                saveWithOwner('jobCosting', entry);
                closeModal('costingModal');
                renderCosting();
                showToast('Cost entry added!', 'success');
            }
        }

        function editCostingEntry(id) {
            openCostingModal(id);
        }

        function deleteCostingEntry(id) {
            if (!confirm('Delete this cost entry?')) return;
            DB.delete('jobCosting', id);
            renderCosting();
            showToast('Cost entry deleted', 'info');
        }

        function renderCosting() {
            var entries = DB.get('jobCosting');
            var filter = document.getElementById('costWOFilter');
            var filterVal = filter ? filter.value : '';
            // Populate filter dropdown
            if (filter) {
                var currentVal = filter.value;
                filter.innerHTML = '<option value="">All Projects</option>';
                var wos = DB.get('workOrders');
                var usedWOs = {};
                entries.forEach(function(e) { if (e.woId) usedWOs[e.woId] = true; });
                Object.keys(usedWOs).sort().forEach(function(woId) {
                    var wo = wos.find(function(w) { return w.id === woId; });
                    var label = wo ? (wo.title || wo.equipment || wo.client || woId) : woId;
                    filter.innerHTML += '<option value="' + woId + '">' + woId + ' — ' + label + '</option>';
                });
                filter.value = currentVal || '';
                filterVal = filter.value;
            }
            if (filterVal) entries = entries.filter(function(e) { return e.woId === filterVal; });
            // Sort by date descending
            entries.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
            document.getElementById('costingTable').innerHTML = entries.map(function(e) {
                return '<tr>' +
                    '<td>' + (e.date || '-') + '</td>' +
                    '<td><strong>' + (e.woId || '-') + '</strong></td>' +
                    '<td><span class="badge badge-' + (e.category || '').toLowerCase() + '">' + (e.category || '-') + '</span></td>' +
                    '<td>' + (e.description || '-') + '</td>' +
                    '<td>' + (e.qty || 0) + '</td>' +
                    '<td>' + parseFloat(e.unitCost || 0).toFixed(2) + '</td>' +
                    '<td><strong>' + parseFloat(e.total || 0).toFixed(2) + '</strong></td>' +
                    '<td>' + (e.enteredBy || '-') + '</td>' +
                    '<td><div class="btn-group">' +
                    '<button class="btn btn-xs btn-info" onclick="editCostingEntry(\'' + e.id + '\')">Edit</button>' +
                    '<button class="btn btn-xs btn-danger" onclick="deleteCostingEntry(\'' + e.id + '\')">Delete</button>' +
                    '</div></td></tr>';
            }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">No cost entries yet. Click "+ Add Cost Entry" to begin.</td></tr>';
            // Summary by project
            var summary = {};
            entries.forEach(function(e) {
                if (!e.woId) return;
                if (!summary[e.woId]) summary[e.woId] = { total: 0, count: 0 };
                summary[e.woId].total += parseFloat(e.total || 0);
                summary[e.woId].count++;
            });
            var wos = DB.get('workOrders');
            document.getElementById('costingSummaryTable').innerHTML = Object.keys(summary).map(function(woId) {
                var wo = wos.find(function(w) { return w.id === woId; });
                var label = wo ? (wo.title || wo.equipment || wo.client || woId) : woId;
                return '<tr><td><strong>' + woId + '</strong> — ' + label + '</td><td><strong>' + summary[woId].total.toFixed(2) + '</strong></td><td>' + summary[woId].count + '</td></tr>';
            }).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:16px;">No data</td></tr>';
            // Stats
            var totalCost = 0;
            entries.forEach(function(e) { totalCost += parseFloat(e.total || 0); });
            document.getElementById('costingStats').innerHTML = '<div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);">💰</div><div class="stat-content"><h3>' + entries.length + '</h3><p>Entries</p></div></div>' +
                '<div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);">💵</div><div class="stat-content"><h3>RM ' + totalCost.toFixed(2) + '</h3><p>Total Cost</p></div></div>';
        }

        // ========================================================================
        //  WORK ORDER PROGRESS — GANTT CHART (per WO, inline in WO detail)
        // ========================================================================
        function calcWODuration() {
            var start = document.getElementById('woProgressStart').value;
            var end = document.getElementById('woProgressEnd').value;
            var dur = document.getElementById('woProgressDuration');
            if (start && end) {
                var s = start.split(':'), e = end.split(':');
                var sm = parseInt(s[0]) * 60 + parseInt(s[1]);
                var em = parseInt(e[0]) * 60 + parseInt(e[1]);
                if (em < sm) em += 1440;
                var diff = em - sm;
                dur.value = Math.floor(diff / 60) + 'h ' + (diff % 60) + 'm';
            } else { dur.value = ''; }
        }

        function openWOProgressModal(woId, editId) {
            document.getElementById('woProgressEditId').value = editId || '';
            document.getElementById('woProgressModalTitle').textContent = editId ? '✏️ Edit Progress Entry' : '📈 New Progress Entry';
            document.getElementById('woProgressDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('woProgressStart').value = '';
            document.getElementById('woProgressEnd').value = '';
            document.getElementById('woProgressDuration').value = '';
            document.getElementById('woProgressDesc').value = '';
            document.getElementById('woProgressStatus').value = 'In Progress';
            if (editId) {
                var entry = DB.getById('jobProgress', editId);
                if (entry) {
                    document.getElementById('woProgressDate').value = entry.date || '';
                    document.getElementById('woProgressStart').value = entry.startTime || '';
                    document.getElementById('woProgressEnd').value = entry.endTime || '';
                    document.getElementById('woProgressDuration').value = entry.duration || '';
                    document.getElementById('woProgressDesc').value = entry.description || '';
                    document.getElementById('woProgressStatus').value = entry.status || 'In Progress';
                }
            }
            document.getElementById('woProgressModal').classList.add('active');
        }

        function saveWOProgressEntry() {
            var editId = document.getElementById('woProgressEditId').value;
            var woId = _currentMarWoId;
            var date = document.getElementById('woProgressDate').value;
            var startTime = document.getElementById('woProgressStart').value;
            var endTime = document.getElementById('woProgressEnd').value;
            var duration = document.getElementById('woProgressDuration').value;
            var description = document.getElementById('woProgressDesc').value.trim();
            var status = document.getElementById('woProgressStatus').value;
            if (!date) { showToast('Date is required', 'error'); return; }
            if (!woId) { showToast('No work order selected', 'error'); return; }
            if (!startTime || !endTime) { showToast('Job start and end times are required', 'error'); return; }
            if (!description) { showToast('Work description is required', 'error'); return; }
            var currentUser = (Auth.getUser && Auth.getUser()) ? Auth.getUser().name : 'Unknown';
            var entry = { woId: woId, date: date, startTime: startTime, endTime: endTime, duration: duration, description: description, status: status, enteredBy: currentUser };
            if (editId) {
                DB.update('jobProgress', editId, entry);
                closeModal('woProgressModal');
                renderWOGantt(woId, 'woGanttContainer');
                showToast('Progress entry updated!', 'success');
            } else {
                entry.id = DB.genId('jobProgress');
                saveWithOwner('jobProgress', entry);
                closeModal('woProgressModal');
                renderWOGantt(woId, 'woGanttContainer');
                showToast('Progress entry added!', 'success');
            }
        }

        function editWOProgressEntry(id) { openWOProgressModal(_currentMarWoId, id); }

        function deleteWOProgressEntry(id) {
            if (!confirm('Delete this progress entry?')) return;
            DB.delete('jobProgress', id);
            renderWOGantt(_currentMarWoId, 'woGanttContainer');
            showToast('Progress entry deleted', 'info');
        }

        function renderWOGantt(woId, containerId) {
            var container = document.getElementById(containerId);
            if (!container) return;
            var entries = DB.get('jobProgress').filter(function(e) { return e.woId === woId; });
            entries.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });

            if (!entries.length) {
                container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px;">No progress entries yet for this Work Order. Click "+ Add Progress Entry" to begin.</div>';
                return;
            }

            // Collect all unique dates for the Gantt header
            var dates = [];
            entries.forEach(function(e) { if (e.date && dates.indexOf(e.date) === -1) dates.push(e.date); });
            dates.sort();

            var html = '<div style="min-width:600px;">';

            // Header row: Date columns
            html += '<div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:8px;position:sticky;top:0;background:var(--bg);z-index:1;">';
            html += '<div style="width:180px;flex-shrink:0;padding:6px 8px;font-weight:600;font-size:12px;">Task / Activity</div>';
            html += '<div style="display:flex;gap:2px;">';
            dates.forEach(function(d) {
                html += '<div style="width:90px;flex-shrink:0;text-align:center;padding:6px 4px;font-size:11px;font-weight:600;border-left:1px solid var(--border);">' + d + '</div>';
            });
            html += '</div></div>';

            // Bars
            entries.forEach(function(e) {
                var barColor = '#22c55e';
                if (e.status === 'In Progress') barColor = '#3b82f6';
                else if (e.status === 'On Hold') barColor = '#f59e0b';
                else if (e.status === 'Delayed') barColor = '#ef4444';
                else if (e.status === 'Completed') barColor = '#22c55e';

                html += '<div style="display:flex;align-items:center;margin-bottom:4px;">';
                html += '<div style="width:180px;flex-shrink:0;padding:4px 8px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">';
                html += '<span style="font-weight:500;">' + (e.description || '(no desc)').substring(0, 28) + '</span>';
                html += '<br><span style="font-size:10px;color:var(--text-muted);">' + (e.startTime || '-') + ' - ' + (e.endTime || '-') + ' (' + (e.duration || '-') + ')</span>';
                html += '</div>';

                // Gantt bar for each date — show bar only on the entry's date
                dates.forEach(function(d) {
                    var isActive = (e.date === d);
                    html += '<div style="width:90px;flex-shrink:0;height:32px;border-left:1px solid var(--border);padding:2px;position:relative;">';
                    if (isActive) {
                        html += '<div style="height:100%;border-radius:4px;background:' + barColor + ';opacity:0.85;display:flex;align-items:center;justify-content:center;position:relative;">';
                        html += '<span style="color:#fff;font-size:9px;font-weight:600;text-shadow:0 0 2px rgba(0,0,0,0.5);">' + (e.startTime || '') + '</span>';
                        html += '</div>';
                    }
                    html += '</div>';
                });

                // Actions
                html += '<div style="flex-shrink:0;padding-left:8px;">';
                html += '<button class="btn btn-xs btn-info" onclick="editWOProgressEntry(\'' + e.id + '\')" title="Edit">✏️</button> ';
                html += '<button class="btn btn-xs btn-danger" onclick="deleteWOProgressEntry(\'' + e.id + '\')" title="Delete">🗑️</button>';
                html += '</div>';
                html += '</div>';
            });

            // Legend
            html += '<div style="margin-top:12px;display:flex;gap:12px;font-size:11px;color:var(--text-muted);">';
            html += '<span><span style="display:inline-block;width:12px;height:12px;background:#22c55e;border-radius:2px;vertical-align:middle;"></span> Completed</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border-radius:2px;vertical-align:middle;"></span> In Progress</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border-radius:2px;vertical-align:middle;"></span> On Hold</span>';
            html += '<span><span style="display:inline-block;width:12px;height:12px;background:#ef4444;border-radius:2px;vertical-align:middle;"></span> Delayed</span>';
            html += '</div></div>';

            container.innerHTML = html;
        }

        // ========================================================================
        //  SALES & BILLING FUNCTIONS
        // ========================================================================
        function renderSales() {
            const filter = document.getElementById('salesStatusFilter')?.value || 'all';
            const search = document.getElementById('salesSearch');
            const q = search ? search.value.toLowerCase() : '';
            let orders = DB.get('salesOrders');
            if (filter !== 'all') orders = orders.filter(o => (o.status || '') === filter);
            if (q) orders = orders.filter(o =>
                (o.id || '').toLowerCase().includes(q) ||
                (o.customer || o.custName || '').toLowerCase().includes(q) ||
                (o.equipment || o.productName || '').toLowerCase().includes(q) ||
                (o.contact || '').toLowerCase().includes(q) ||
                (o.description || '').toLowerCase().includes(q)
            );
            const total = DB.get('salesOrders').length;
            const pending = DB.get('salesOrders').filter(o => o.status === 'Pending').length;
            const completed = DB.get('salesOrders').filter(o => o.status === 'Completed').length;
            const revenue = DB.get('salesOrders').filter(o => o.status === 'Completed').reduce((s, o) => s + (o.amount || 0), 0);
            const qts = DB.get('quotations');
            const qtDraft = qts.filter(q => q.status === 'Draft').length;
            const qtAccepted = qts.filter(q => q.status === 'Accepted').length;
            const qtConverted = qts.filter(q => q.status === 'Converted').length;
            const qtTotal = qts.reduce((s, q) => s + (q.total || 0), 0);
            const invs = DB.get('invoices');
            const invUnpaid = invs.filter(i => i.status === 'Unpaid' || i.status === 'Overdue').reduce((s, i) => s + (i.total || i.amount || 0), 0);
            document.getElementById('salesStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);">💳</div>
                    <div class="stat-content"><h3>${total}</h3><p>Total Orders</p><div class="stat-trend trend-up">${pending} pending</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);">⏳</div>
                    <div class="stat-content"><h3>${pending}</h3><p>Pending / In Progress</p><div class="stat-trend trend-up">Awaiting fulfillment</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);">✅</div>
                    <div class="stat-content"><h3>${completed}</h3><p>Completed</p><div class="stat-trend trend-up">Delivered</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);">💰</div>
                    <div class="stat-content"><h3>RM ${revenue.toLocaleString()}</h3><p>Total Revenue</p><div class="stat-trend trend-up">Completed orders</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#fce7f3,#fbcfe8);">📄</div>
                    <div class="stat-content"><h3>${qts.length}</h3><p>Quotations</p><div class="stat-trend trend-up">${qtDraft} draft · ${qtAccepted} accepted</div></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#ffedd5,#fed7aa);">🧾</div>
                    <div class="stat-content"><h3>RM ${invUnpaid.toLocaleString()}</h3><p>Outstanding</p><div class="stat-trend trend-up">${invs.length} invoices</div></div>
                </div>
            `;
             document.getElementById('salesOrdersTable').innerHTML = orders.length
                ? orders.map(o => {
                    var scopeType = o.type === 'rep' ? 'Repair' : 'Fabrication';
                    var safeStatus = o.status || 'Pending';
                    return '<tr>' +
                        '<td><strong><span class="trace-link">' + o.id + '</span></strong></td>' +
                        '<td><strong>' + o.customer + '</strong><br><small style="color:var(--text-muted);">' + (o.contact || '') + '</small></td>' +
                        '<td>' + o.equipment + '<br><small style="color:var(--text-muted);">' + (o.description||'').substring(0,40) + ((o.description||'').length>40?'...':'') + '</small></td>' +
                        '<td>' + scopeType + '</td>' +
                        '<td><strong>RM ' + (o.amount||0).toLocaleString() + '</strong></td>' +
                        '<td><span class="badge badge-' + safeStatus.toLowerCase().replace(/\s+/g,'-') + '">' + safeStatus + '</span></td>' +
                        '<td style="font-size:12px;">' + (o.createdAt || '—') + '</td>' +
                        '<td>' +
                            '<div class="btn-group">' +
                                '<button class="btn btn-xs btn-info" onclick="viewSalesOrder(\'' + o.id + '\')">View</button>' +
                                '<button class="btn btn-xs btn-secondary" onclick="openSalesEditModal(\'' + o.id + '\')">Edit</button>' +
                                '<button class="btn btn-xs btn-danger" onclick="deleteRecord(\'salesOrders\',\'' + o.id + '\')">Delete</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                }).join('')
                : '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">No sales orders found</td></tr>';
            try { renderQuotations(); } catch (e) { console.error('renderQuotations error:', e); }
            try { renderInvoices(); } catch (e) { console.error('renderInvoices error:', e); }
        }

        function openSalesModal() {
            // Populate customer dropdown in sales section
            const sel = document.getElementById('soCustomer');
            sel.innerHTML = '<option>Select Customer...</option>';
            DB.get('customers').forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.company + ' — ' + c.name;
                sel.appendChild(opt);
            });
            // Clear sales-specific fields
            document.getElementById('soContact').value = '';
            document.getElementById('soEmail').value = '';
            document.getElementById('soPhone').value = '';
            document.getElementById('soAmount').value = '';
            document.getElementById('soShellMat').value = '';
            document.getElementById('soHeadMat').value = '';
            document.getElementById('soMainholeQty').value = '0';
            document.getElementById('soMainholeType').value = '';
            document.getElementById('soNozzleSize').value = '';
            document.getElementById('soNozzleQty').value = '1';
            document.getElementById('soNozzleMat').value = '';
            document.getElementById('soFlangeType').value = '';
            document.getElementById('soFlangeSize').value = '';
            document.getElementById('soTotalFlanges').value = '0';
            document.getElementById('soBlindReq').value = 'No';
            document.getElementById('soSaddleMat').value = '';
            document.getElementById('soLiftingLug').value = 'No';
            document.getElementById('soBoltNut').value = '';
            document.getElementById('soSvModel').value = '';
            document.getElementById('soSvSize').value = '';
            document.getElementById('soPressGauge').value = '';
            document.getElementById('soBoilerTubeSpec').value = '';
            document.getElementById('soBoilerTubeSize').value = '';
            document.getElementById('soBoilerTubeQty').value = '1';
            document.getElementById('soNpPlateSize').value = '';
            document.getElementById('soNpPlateSpec').value = '';
            document.getElementById('soNpPlateQty').value = '1';
            document.getElementById('soNpAngleSize').value = '';
            document.getElementById('soNpAngleSpec').value = '';
            document.getElementById('soNpAngleQty').value = '1';
            document.getElementById('soNpFlatSize').value = '';
            document.getElementById('soNpFlatSpec').value = '';
            document.getElementById('soNpFlatQty').value = '1';
            document.getElementById('soNpBeamSize').value = '';
            document.getElementById('soNpBeamSpec').value = '';
            document.getElementById('soNpBeamQty').value = '1';
            document.getElementById('soNpOtherMat').value = '';
            // Reset add-step arrays
            _soNozzleItems = []; _soFlangeItems = []; _soSvItems = []; _soBoilerTubeItems = [];
            _soNpPlateItems = []; _soNpAngleItems = []; _soNpFlatItems = []; _soNpBeamItems = [];
            renderSoNozzleList(); renderSoFlangeList(); renderSoSvList(); renderSoBoilerTubeList();
            renderSoNpPlateList(); renderSoNpAngleList(); renderSoNpFlatList(); renderSoNpBeamList();
            // Open the shared job modal in sales mode
            _salesMode = true;
            document.getElementById('jobModalTitle').textContent = '💳 Sales New Order';
            document.getElementById('soSalesFields').style.display = 'block';
            document.getElementById('jobModalSubmitBtn').textContent = '💳 Create Sales Order';
            document.getElementById('jobModalSubmitBtn').onclick = createSalesOrder;
            openJobModal();
        }

        function updateSalesContact() {
            const custId = document.getElementById('soCustomer').value;
            const customer = DB.getById('customers', custId);
            if (customer) {
                document.getElementById('soContact').value = customer.name || '';
                document.getElementById('soEmail').value = customer.email || '';
                document.getElementById('soPhone').value = customer.phone || '';
            } else {
                document.getElementById('soContact').value = '';
                document.getElementById('soEmail').value = '';
                document.getElementById('soPhone').value = '';
            }
        }

        function createSalesOrder() {
            const customer = document.getElementById('soCustomer').value;
            const amount = parseFloat(document.getElementById('soAmount').value) || 0;
            if (customer === 'Select Customer...') { showToast('Please select a customer', 'error'); return; }
            if (!document.getElementById('woTitle').value.trim()) { showToast('Equipment / service description is required', 'error'); return; }
            if (amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }

            const now = new Date();
            const allOrders = DB.get('salesOrders');
            const num = allOrders.length + 1;
            const id = 'SO-' + now.getFullYear() + '-' + String(num).padStart(4, '0');
            const customerObj = DB.getById('customers', customer);

            // Read from shared jobModal fields (wo* IDs)
            const designP = document.getElementById('woDesignPressure').value.trim();
            const designT = document.getElementById('woDesignTemp').value.trim();
            const material = document.getElementById('woMaterial').value.trim();
            const headType = document.getElementById('woHeadType').value;
            const testingReq = document.getElementById('woTestingReq').value.trim();
            const description = document.getElementById('woDescription').value.trim();

            // Material requirement data (so* IDs in sales section)
            const shellMat = document.getElementById('soShellMat').value;
            const headMat = document.getElementById('soHeadMat').value;
            const mainholeQty = document.getElementById('soMainholeQty').value;
            const mainholeType = document.getElementById('soMainholeType').value;
            const blindReq = document.getElementById('soBlindReq').value;
            const saddleMat = document.getElementById('soSaddleMat').value;
            const liftingLug = document.getElementById('soLiftingLug').value;
            const boltNut = document.getElementById('soBoltNut').value;
            const totalFlanges = document.getElementById('soTotalFlanges').value;
            const pressGauge = document.getElementById('soPressGauge').value.trim();
            const boilerTubeSpec = document.getElementById('soBoilerTubeSpec').value;

            const so = {
                id,
                customer: customerObj ? customerObj.company : customer,
                contact: customerObj ? customerObj.name : '',
                email: customerObj ? customerObj.email : '',
                phone: customerObj ? customerObj.phone : '',
                site: document.getElementById('woSite').value.trim() || '',
                equipment: document.getElementById('woTitle').value.trim(),
                description: description,
                amount,
                status: 'Pending',
                woRef: '',
                createdAt: now.toISOString().split('T')[0],
                createdBy: Auth.getUser() ? Auth.getUser().name : 'Sales Team',
                designPressure: designP,
                designTemperature: designT,
                shellHeadMaterial: material,
                headType: headType,
                testingRequirement: testingReq,
                // Material & item requirements
                shellMaterial: shellMat,
                headMaterial: headMat,
                mainholeQty: mainholeQty,
                mainholeType: mainholeType,
                nozzleItems: _soNozzleItems || [],
                flangeItems: _soFlangeItems || [],
                totalFlanges: totalFlanges,
                blindRequired: blindReq,
                saddleMaterial: saddleMat,
                liftingLug: liftingLug,
                boltNutSpec: boltNut,
                safetyValves: _soSvItems || [],
                pressureGauge: pressGauge,
                boilerTubeSpec: boilerTubeSpec,
                boilerTubes: _soBoilerTubeItems || [],
                // Non-pressure equipment materials
                npPlateItems: _soNpPlateItems || [],
                npAngleItems: _soNpAngleItems || [],
                npFlatItems: _soNpFlatItems || [],
                npBeamItems: _soNpBeamItems || [],
                npOtherMaterial: document.getElementById('soNpOtherMat').value.trim()
            };

            saveWithOwner('salesOrders', so);
            closeModal('jobModal');
            _salesMode = false;
            document.getElementById('soSalesFields').style.display = 'none';
            document.getElementById('jobModalTitle').textContent = '📋 New Work Order';
            document.getElementById('jobModalSubmitBtn').textContent = '📋 Submit Work Order';
            document.getElementById('jobModalSubmitBtn').onclick = createWorkOrder;
            renderSales();
            showToast('💳 Sales Order ' + id + ' created');
        }

        function viewSalesOrder(id) {
            const so = DB.getById('salesOrders', id);
            if (!so) return showToast('Sales order not found', 'error');
            showToast('📋 ' + so.id + ' — ' + so.customer + ' | RM ' + (so.amount||0).toLocaleString() + (so.woRef ? ' | Linked WO: ' + so.woRef : ''));
        }

        function openSalesEditModal(id) {
            var so = DB.getById('salesOrders', id);
            if (!so) { showToast('Sales order not found', 'error'); return; }
            document.getElementById('seModalId').value = id;
            document.getElementById('seModalTitle').textContent = so.id + ' — ' + so.customer;
            document.getElementById('seCustName').value = so.customer || '';
            document.getElementById('seContactPerson').value = so.contact || '';
            document.getElementById('seEmailAddr').value = so.email || '';
            document.getElementById('sePhone').value = so.phone || '';
            document.getElementById('seStatus').value = so.status || 'Pending';
            document.getElementById('seEquipment').value = so.equipment || '';
            document.getElementById('seBudget').value = so.amount || 0;
            document.getElementById('seDescription').value = so.description || '';
            document.getElementById('seInstDuration').value = so.installationDuration || '';
            document.getElementById('seInstDueDate').value = so.installationDueDate || '';
            document.getElementById('seHandoverDuration').value = so.handoverDuration || '';
            document.getElementById('seHandoverDueDate').value = so.handoverDueDate || '';
            document.getElementById('seProjectCost').value = so.projectCost || '';
            var matSummary = document.getElementById('seMaterialSummary');
            if (matSummary) {
                var parts = [];
                if (so.shellMaterial) parts.push('Shell: ' + so.shellMaterial);
                if (so.headMaterial) parts.push('Head: ' + so.headMaterial);
                if (so.totalFlanges && so.totalFlanges > 0) parts.push('Flanges: ' + so.totalFlanges + ' pcs');
                if (so.nozzleItems && so.nozzleItems.length) parts.push('Nozzles: ' + so.nozzleItems.length + ' items');
                if (so.saddleMaterial) parts.push('Saddle: ' + so.saddleMaterial);
                matSummary.innerHTML = parts.length ? parts.join('<br>') : '<span style="color:#999;">— No material data —</span>';
            }
            var el = document.getElementById('salesEditModal');
            el.style.display = '';
            el.classList.add('active');
        }

        function saveSalesAmendment() {
            var id = document.getElementById('seModalId').value;
            if (!id) { showToast('No sales order selected', 'error'); return; }
            var updates = {
                customer: document.getElementById('seCustName').value,
                contact: document.getElementById('seContactPerson').value,
                email: document.getElementById('seEmailAddr').value,
                phone: document.getElementById('sePhone').value,
                status: document.getElementById('seStatus').value,
                equipment: document.getElementById('seEquipment').value,
                amount: parseFloat(document.getElementById('seBudget').value) || 0,
                description: document.getElementById('seDescription').value,
                installationDuration: document.getElementById('seInstDuration').value,
                installationDueDate: document.getElementById('seInstDueDate').value,
                handoverDuration: document.getElementById('seHandoverDuration').value,
                handoverDueDate: document.getElementById('seHandoverDueDate').value,
                projectCost: document.getElementById('seProjectCost').value,
                amended: true,
                amendedAt: new Date().toISOString()
            };
            DB.update('salesOrders', id, updates);
            closeModal('salesEditModal');
            renderSales();
            showToast('✅ Amendment saved for ' + id);
        }

        function _printSalesOrderPDFInner(id) {
            const so = DB.getById('salesOrders', id);
            if (!so) return showToast('Sales order not found', 'error');

            const fmtArr = (arr, cols) => {
                if (!arr || !arr.length) return '<p style="color:#888;">— None —</p>';
                const hdr = Object.values(cols).join('</th><th>');
                const rows = arr.map(x => '<tr>' + Object.keys(cols).map(k => '<td>' + (x[k] || '—') + '</td>').join('') + '</tr>').join('');
                return '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:4px 0;"><tr style="background:#e5e7eb;"><th>' + hdr + '</th></tr>' + rows + '</table>';
            };

            const w = window.open('', '_blank', 'width=900,height=700');
            w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + so.id + ' - Sales Order</title>');
            w.document.write('<style>' +
                'body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:30px;}' +
                '.header{text-align:center;border-bottom:3px double #1e3a5f;padding-bottom:14px;margin-bottom:20px;}' +
                '.header h1{margin:0;font-size:22px;color:#1e3a5f;}' +
                '.header h3{margin:4px 0 0;font-size:14px;color:#555;font-weight:400;}' +
                '.section{margin-bottom:16px;}' +
                '.section h3{font-size:14px;color:#1e3a5f;border-bottom:1px solid #ccc;padding-bottom:4px;margin:0 0 8px;}' +
                '.section p{margin:3px 0;}' +
                '.section table{width:100%;border-collapse:collapse;margin:6px 0;}' +
                '.section table td,.section table th{border:1px solid #ccc;padding:5px 8px;text-align:left;}' +
                '.section table th{background:#e5e7eb;font-weight:600;font-size:12px;}' +
                '.row{display:flex;gap:20px;flex-wrap:wrap;}' +
                '.row > div{flex:1;min-width:200px;}' +
                '.footer{text-align:center;margin-top:30px;padding-top:14px;border-top:1px solid #ccc;font-size:11px;color:#888;}' +
                '.badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;}' +
                '.badge-ok{background:#d1fae5;color:#065f46;}' +
                '.badge-pending{background:#fef3c7;color:#92400e;}' +
                '@media print{body{margin:15px;}.no-print{display:none;}}' +
                '</style></head><body>');

            const statusBadge = so.status === 'Completed' ? '<span class="badge badge-ok">' + so.status + '</span>' : '<span class="badge badge-pending">' + so.status + '</span>';

            w.document.write('<div class="header"><h1>' + so.id + '</h1><h3>' + so.equipment + '</h3><p style="margin:6px 0 0;font-size:14px;"><strong>Customer:</strong> ' + so.customer + ' &nbsp;|&nbsp; <strong>Amount:</strong> RM ' + (so.amount||0).toLocaleString() + ' &nbsp;|&nbsp; <strong>Status:</strong> ' + statusBadge + '</p></div>');

            // Customer info
            w.document.write('<div class="section"><h3>👤 Customer Information</h3><div class="row"><div><p><strong>Company:</strong> ' + so.customer + '</p><p><strong>Contact:</strong> ' + (so.contact||'—') + '</p></div><div><p><strong>Email:</strong> ' + (so.email||'—') + '</p><p><strong>Phone:</strong> ' + (so.phone||'—') + '</p></div></div></div>');

            // Description & Technical
            w.document.write('<div class="section"><h3>📋 Scope & Technical Specifications</h3>');
            w.document.write('<p><strong>Description:</strong> ' + (so.description||'—') + '</p>');
            w.document.write('<table><tr><th>Design Pressure</th><th>Design Temp</th><th>Material / Grade</th><th>Head Type</th><th>Testing Req.</th></tr>');
            w.document.write('<tr><td>' + (so.designPressure||'—') + '</td><td>' + (so.designTemperature||'—') + '</td><td>' + (so.shellHeadMaterial||'—') + '</td><td>' + (so.headType||'—') + '</td><td>' + (so.testingRequirement||'—') + '</td></tr></table></div>');

            // Pressure equipment materials
            w.document.write('<div class="section"><h3>🧱 Material & Item Requirement For Pressure Equipment</h3>');
            w.document.write('<div class="row"><div><p><strong>Shell Material:</strong> ' + (so.shellMaterial||'—') + '</p><p><strong>Head Material:</strong> ' + (so.headMaterial||'—') + '</p>');
            w.document.write('<p><strong>Mainhole:</strong> ' + (so.mainholeQty||'0') + ' × ' + (so.mainholeType||'—') + '</p>');
            w.document.write('<p><strong>Blind Required:</strong> ' + (so.blindRequired||'No') + '</p>');
            w.document.write('<p><strong>Saddle/Leg Material:</strong> ' + (so.saddleMaterial||'—') + '</p></div>');
            w.document.write('<div><p><strong>Lifting Lug:</strong> ' + (so.liftingLug||'No') + '</p><p><strong>Bolt & Nut:</strong> ' + (so.boltNutSpec||'—') + '</p>');
            w.document.write('<p><strong>Total Flanges:</strong> ' + (so.totalFlanges||'0') + '</p>');
            w.document.write('<p><strong>Pressure Gauge:</strong> ' + (so.pressureGauge||'—') + '</p></div></div>');

            if (so.nozzleItems && so.nozzleItems.length) {
                w.document.write('<p style="margin:8px 0 2px;font-weight:600;">Nozzle Items:</p>' + fmtArr(so.nozzleItems, {size:'Size',qty:'Qty',mat:'Material'}));
            }
            if (so.flangeItems && so.flangeItems.length) {
                w.document.write('<p style="margin:8px 0 2px;font-weight:600;">Flange Items:</p>' + fmtArr(so.flangeItems, {type:'Type',size:'Size'}));
            }
            if (so.safetyValves && so.safetyValves.length) {
                w.document.write('<p style="margin:8px 0 2px;font-weight:600;">Safety Valves:</p>' + fmtArr(so.safetyValves, {model:'Model',size:'Size'}));
            }
            w.document.write('</div>');

            // Boiler repair
            if (so.boilerTubeSpec || (so.boilerTubes && so.boilerTubes.length)) {
                w.document.write('<div class="section"><h3>🔥 Material For Boiler Repair</h3>');
                w.document.write('<p><strong>Tube Specification:</strong> ' + (so.boilerTubeSpec||'—') + '</p>');
                if (so.boilerTubes && so.boilerTubes.length) {
                    w.document.write(fmtArr(so.boilerTubes, {spec:'Spec',size:'Size',qty:'Qty'}));
                }
                w.document.write('</div>');
            }

            // Non-pressure materials
            const hasNp = so.npPlateItems?.length || so.npAngleItems?.length || so.npFlatItems?.length || so.npBeamItems?.length || so.npOtherMaterial;
            if (hasNp) {
                w.document.write('<div class="section"><h3>🔩 Material For Non-Pressure Equipment</h3>');
                if (so.npPlateItems?.length) { w.document.write('<p style="margin:6px 0 2px;font-weight:600;">Plate:</p>' + fmtArr(so.npPlateItems, {size:'Size',spec:'Spec',qty:'Qty'})); }
                if (so.npAngleItems?.length) { w.document.write('<p style="margin:6px 0 2px;font-weight:600;">Angle Bar:</p>' + fmtArr(so.npAngleItems, {size:'Size',spec:'Spec',qty:'Qty'})); }
                if (so.npFlatItems?.length) { w.document.write('<p style="margin:6px 0 2px;font-weight:600;">Flat Bar:</p>' + fmtArr(so.npFlatItems, {size:'Size',spec:'Spec',qty:'Qty'})); }
                if (so.npBeamItems?.length) { w.document.write('<p style="margin:6px 0 2px;font-weight:600;">H / I Beam:</p>' + fmtArr(so.npBeamItems, {size:'Size',spec:'Spec',qty:'Qty'})); }
                if (so.npOtherMaterial) { w.document.write('<p><strong>Other:</strong> ' + so.npOtherMaterial + '</p>'); }
                w.document.write('</div>');
            }

            // Work Order reference
            if (so.woRef) {
                w.document.write('<div class="section"><h3>🔗 Linked Work Order</h3><p><strong>WO:</strong> ' + so.woRef + '</p></div>');
            }

            // Footer
            w.document.write('<div class="footer"><p>AD Deen Engineering ERP — Sales Order ' + so.id + '</p><p>Generated: ' + new Date().toLocaleString() + ' | Created: ' + (so.createdAt||'—') + '</p></div>');

            w.document.write('<div class="no-print" style="text-align:center;margin-bottom:20px;"><button onclick="window.print()" style="padding:10px 28px;font-size:15px;cursor:pointer;background:#1e3a5f;color:#fff;border:none;border-radius:6px;">🖨️ Print / Save PDF</button></div>');
            w.document.write('</body></html>');
            w.document.close();
        }

        function generateWoFromSales(id) {
            const so = DB.getById('salesOrders', id);
            if (!so) return showToast('Sales order not found', 'error');
            const now = new Date();
            const woId = 'WO-' + now.getFullYear() + '-' + String(DB.get('workOrders').length + 1).padStart(4, '0');
            const wo = {
                id: woId, equipCategory: 'pressure', equipType: 'unfired-pv', scope: 'new',
                codeRef: 'ASME Section VIII Div.1', type: 'Standard',
                status: 'New', priority: 'Medium',
                raisedBy: so.contact || 'Sales Team',
                raisedDate: now.toISOString().split('T')[0] + ' ' + now.toLocaleTimeString(),
                dueDate: '', title: so.equipment, client: so.customer, site: so.site || 'TBD',
                description: so.description || so.equipment,
                reason: 'Generated from Sales Order ' + so.id,
                attachments: '', documents: [],
                designPressure: so.designPressure || '', designTemperature: so.designTemperature || '', shellHeadMaterial: so.shellHeadMaterial || '',
                headType: so.headType || '', testingRequirement: so.testingRequirement || '', drawingRef: '',
                equipment: so.equipment, assetTag: '', trade: '',
                laborHours: 0, requestedEquip: '',
                upvNewDesignStatus: 'Pending',
                approvalSteps: [
                    { step: 0, role: 'Requester', action: 'Submit Work Order', status: 'Completed' },
                    { step: 1, role: 'Engineering Manager', action: 'Verify scope & drawing', status: 'Pending' },
                    { step: 2, role: 'Production Planner', action: 'Assign branch', status: 'Pending' },
                ],
                certifications: [], woRef: so.id, createdAt: now.toISOString().split('T')[0],
                // Copy material requirement data from Sales Order
                shellMaterial: so.shellMaterial || '',
                headMaterial: so.headMaterial || '',
                mainholeQty: so.mainholeQty || '0',
                mainholeType: so.mainholeType || '',
                nozzleItems: so.nozzleItems ? JSON.parse(JSON.stringify(so.nozzleItems)) : [],
                flangeItems: so.flangeItems ? JSON.parse(JSON.stringify(so.flangeItems)) : [],
                totalFlanges: so.totalFlanges || '0',
                blindRequired: so.blindRequired || 'No',
                saddleMaterial: so.saddleMaterial || '',
                liftingLug: so.liftingLug || 'No',
                boltNutSpec: so.boltNutSpec || '',
                safetyValves: so.safetyValves ? JSON.parse(JSON.stringify(so.safetyValves)) : [],
                pressureGauge: so.pressureGauge || '',
                boilerTubeSpec: so.boilerTubeSpec || '',
                boilerTubes: so.boilerTubes ? JSON.parse(JSON.stringify(so.boilerTubes)) : [],
                npPlateItems: so.npPlateItems ? JSON.parse(JSON.stringify(so.npPlateItems)) : [],
                npAngleItems: so.npAngleItems ? JSON.parse(JSON.stringify(so.npAngleItems)) : [],
                npFlatItems: so.npFlatItems ? JSON.parse(JSON.stringify(so.npFlatItems)) : [],
                npBeamItems: so.npBeamItems ? JSON.parse(JSON.stringify(so.npBeamItems)) : [],
                npOtherMaterial: so.npOtherMaterial || ''
            };
            saveWithOwner('workOrders', wo);
            DB.update('salesOrders', so.id, { woRef: woId, status: 'In Progress' });
            renderSales();
            showToast('🔗 Work Order ' + woId + ' generated from ' + so.id);
        }

        function deleteRecord(store, id, field) {
            if (field === undefined) field = 'id';
            if (!canUser('delete', store)) {
                showToast('You do not have permission to delete this record.', 'error');
                return;
            }
            if (!confirm('Delete ' + id + '? This cannot be undone.')) return;
            if (DB.delete(store, id, field)) {
                refreshAll();
                showToast('🗑️ ' + id + ' deleted successfully', 'info');
            } else {
                showToast('Failed to delete ' + id, 'error');
            }
        }

        function refreshAll() {
            renderDashboardStats();
            renderKanbanBoard();
            renderJobsTable();
            renderMarWorkOrders();
            renderQualityStats();
            renderInspections();
            renderMethodStatements();
            renderInventory();
            renderAssets();
            renderFabStats();
            renderFabOrders();
            renderDesignReviews();
            renderCustomers();
            renderEquipment();
            renderPurchasing();
            renderSales();
            renderAccounting();
            renderDocuments();
            renderCosting();
            updateHeaderStats();
        }

        // ========================================================================
        //  EVENT LISTENERS
        // ========================================================================
        document.getElementById('customerSearch')?.addEventListener('keyup', function(e) {
            const q = e.target.value.toLowerCase();
            const filtered = DB.get('customers').filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.company.toLowerCase().includes(q) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.phone && c.phone.toLowerCase().includes(q))
            );
            document.getElementById('customersTable').innerHTML = filtered.map(c => `
                <tr>
                    <td><strong><span class="trace-link">${c.id}</span></strong></td>
                    <td><strong>${c.company}</strong></td>
                    <td>${c.name}</td>
                    <td><a href="mailto:${c.email}" style="color:var(--info);text-decoration:none;">${c.email}</a></td>
                    <td>${c.phone}</td>
                    <td>${c.address ? c.address.split(',')[0] : '-'}</td>
                    <td><span class="badge badge-${c.type.toLowerCase().replace(/\s+/g, '-')}">${c.type}</span></td>
                    <td><span class="badge badge-${c.status.toLowerCase().replace(/\s+/g, '-')}">${c.status}</span></td>
                    <td style="font-size:12px;">${c.since || '-'}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-xs btn-info" onclick="editCustomer('${c.id}')">Edit</button>
                            <button class="btn btn-xs btn-danger" onclick="deleteRecord('customers','${c.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        });

        document.getElementById('jobSearch')?.addEventListener('keyup', function(e) {
            const q = e.target.value.toLowerCase();
            const filtered = DB.get('workOrders').filter(wo =>
                wo.id.toLowerCase().includes(q) ||
                (wo.client || '').toLowerCase().includes(q) ||
                (wo.title || '').toLowerCase().includes(q) ||
                (wo.equipment || '').toLowerCase().includes(q) ||
                (wo.assetTag || '').toLowerCase().includes(q)
            );
            document.getElementById('jobsTableBody').innerHTML = filtered.map(job => `
                <tr>
                    <td><strong>${job.id}</strong></td>
                    <td>${job.client}</td>
                    <td>${job.title || job.equipment}</td>
                    <td>${(job.description || '').substring(0, 50)}</td>
                    <td><span class="badge badge-${(job.status || '').toLowerCase().replace(/[\s-]+/g, '-')}">${job.status || 'New'}</span></td>
                    <td>${job.trade || '—'}</td>
                    <td>${job.priority}</td>
                    <td>${job.dueDate || '—'}</td>
                    <td><button class="btn btn-xs btn-info" onclick="openMarDetail('${job.id}')">View</button>
                        <button class="btn btn-xs btn-danger" onclick="deleteRecord('workOrders','${job.id}')">Delete</button></td>
                </tr>
            `).join('');
        });

        document.getElementById('marSearch')?.addEventListener('keyup', function() { renderMarWorkOrders(); });
        document.getElementById('salesSearch')?.addEventListener('keyup', function() { renderSales(); });
        document.getElementById('prSearch')?.addEventListener('keyup', function() { renderPurchasing(); });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) this.classList.remove('active');
            });
        });

        // ========================================================================
        //  INITIALIZATION
        // ========================================================================
        function init() {
            // Check session
            if (Auth.init()) {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('appContainer').classList.add('show');
                updateUserUI(Auth.getUser());
                refreshAll();
                connectWs(); // Start WebSocket tracking
                // Register with online tracker on session restore
                try {
                    if (typeof OnlineTracker !== 'undefined' && OnlineTracker.register) {
                        OnlineTracker.register(Auth.getUser());
                    } else if (typeof updateOnlineStatus === 'function') {
                        updateOnlineStatus();
                        updateOnlineIndicator();
                    }
                } catch(e) {}
                console.log('✅ AD Deen Engineering ERP — Authenticated');
            } else {
                document.getElementById('loginScreen').style.display = 'flex';
                console.log('🔐 Please sign in to continue');
            }

            // Set default date in job modal
            const today = new Date().toISOString().split('T')[0];
            const dueDate = document.getElementById('jobDueDate');
            if (dueDate) {
                const future = new Date();
                future.setDate(future.getDate() + 21);
                dueDate.value = future.toISOString().split('T')[0];
            }

            // Load saved settings
            loadSettings();

            // Navigate to saved default view
            const settings = JSON.parse(localStorage.getItem('ad_deen_settings') || '{}');
            if (settings.defaultView && settings.defaultView !== 'dashboard') {
                const navItem = document.querySelector(`.nav-item[data-section="${settings.defaultView}"]`);
                if (navItem) navigateTo(settings.defaultView, navItem);
            }

            console.log('⚙️ AD Deen Engineering ERP System');
            console.log('📦 Database: localStorage (persistent)');
        }

        init();

        // ===== DESIGN DEPARTMENT FUNCTIONS =====

function renderDesignReviews() {
    var orders = DB.get('salesOrders').filter(function(o) { return o.designStatus === 'Under Review' || o.designStatus === 'Submitted' || o.designStatus === 'Approved' || o.designStatus === 'Rejected'; });
    orders.sort(function(a, b) { return (b.designSubmittedDate || b.createdAt || '').localeCompare(a.designSubmittedDate || a.createdAt || ''); });
    var statusFilter = document.getElementById('designStatusFilter');
    var fv = statusFilter ? statusFilter.value : 'all';
    var search = (document.getElementById('designSearch') ? document.getElementById('designSearch').value : '').toLowerCase();
    var typeRadios = document.querySelectorAll('input[name="designTypeFilter"]');
    var typeFilter = 'all';
    typeRadios.forEach(function(r) { if (r.checked) typeFilter = r.value; });
    var filtered = orders.filter(function(o) {
        if (fv !== 'all' && (o.designStatus || 'Pending') !== fv) return false;
        if (typeFilter !== 'all' && o.type !== typeFilter) return false;
        var s = search;
        if (!s) return true;
        return (o.id || '').toLowerCase().includes(s) || (o.productName || o.equipment || '').toLowerCase().includes(s) || (o.custName || o.customer || '').toLowerCase().includes(s);
    });
    var tbody = document.getElementById('designTable');
    if (!tbody) return;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-secondary);">No design reviews found</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(function(o) {
        var ds = o.designStatus || 'Pending';
        var pe = o.peMaterials || {};
        var rep = o.repairInfo || {};
        var typeBadge = o.type === 'repair' ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:11px;">🔧 Repair</span>' : '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:10px;font-size:11px;">🆕 Fab</span>';
        var equipBadge = o.equipType === 'pressure-equipment' ? '🔴 PE' : o.equipType === 'non-pressure' ? '🟢 NP' : '';
        var dwgInfo = '—';
        if (o.type === 'fabrication') {
            dwgInfo = (pe.designCheck || pe.fabCheck) ? '✅ Yes' : '❌ No';
        } else if (o.type === 'repair') {
            dwgInfo = rep.scope ? '📋 ' + rep.scope.substring(0, 30) : '—';
        }
        var statusBadge = ds === 'Approved' ? '<span class="badge badge-success">✅ Approved</span>'
            : ds === 'Rejected' ? '<span class="badge badge-danger">❌ Rejected</span>'
            : ds === 'Submitted' ? '<span class="badge badge-info">📤 Submitted</span>'
            : '<span class="badge badge-warning">🔍 Under Review</span>';
        var date = o.designSubmittedDate || (o.createdAt ? o.createdAt.slice(0, 10) : '—');
        var details = o.type === 'repair'
            ? (rep.equipName || '—')
            : (pe.shellSpec || '—') + ' ' + (pe.shellSize || '') + ' | ' + (pe.headType || '');
        var pmtNo = o.type === 'repair' ? (rep.regNo || o.id) : o.id;
        var actions = '';
        if (ds === 'Under Review' || ds === 'Submitted') {
            actions = '<button class="btn btn-sm btn-success" onclick="approveDesignReview(\'' + o.id + '\')">✅</button> ' +
                '<button class="btn btn-sm btn-danger" onclick="rejectDesignReview(\'' + o.id + '\')">❌</button> ' +
                '<button class="btn btn-sm btn-ghost" onclick="openDesignDetailSO(\'' + o.id + '\')">👁️</button> ' +
                '<button class="btn btn-sm btn-ghost" onclick="deleteDesignReview(\'' + o.id + '\')">🗑️</button>';
        } else {
            actions = '<button class="btn btn-sm btn-ghost" onclick="openDesignDetailSO(\'' + o.id + '\')">👁️</button> ' +
                '<button class="btn btn-sm btn-ghost" onclick="deleteDesignReview(\'' + o.id + '\')">🗑️</button>';
        }
        return '<tr>' +
            '<td><a href="#" onclick="openDesignDetailSO(\'' + o.id + '\');return false;" style="font-weight:600;">' + pmtNo + '</a><br><span style="font-size:11px;color:var(--text-muted);">' + typeBadge + ' ' + equipBadge + '</span></td>' +
            '<td>' + (o.productName || o.equipment || '—') + '<br><span style="font-size:11px;color:var(--text-muted);">' + details + '</span></td>' +
            '<td>' + (o.custName || o.customer || '—') + (o.contact ? '<br><span style="font-size:11px;">' + o.contact + '</span>' : '') + '</td>' +
            '<td>' + o.id + '</td>' +
            '<td>' + dwgInfo + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' + date + '</td>' +
            '<td style="white-space:nowrap;">' + actions + '</td>' +
            '</tr>';
    }).join('');
    var stats =
        '<div class="stat-card"><div class="stat-icon" style="background:#e0f2fe;color:#0284c7;">🔍</div><div class="stat-value">' + orders.filter(function(o) { return o.designStatus === 'Under Review'; }).length + '</div><div class="stat-label">Under Review</div></div>' +
        '<div class="stat-card"><div class="stat-icon" style="background:#fef9c3;color:#ca8a04;">📤</div><div class="stat-value">' + orders.filter(function(o) { return o.designStatus === 'Submitted'; }).length + '</div><div class="stat-label">Submitted</div></div>' +
        '<div class="stat-card"><div class="stat-icon" style="background:#dcfce7;color:#16a34a;">✅</div><div class="stat-value">' + orders.filter(function(o) { return o.designStatus === 'Approved'; }).length + '</div><div class="stat-label">Approved</div></div>' +
        '<div class="stat-card"><div class="stat-icon" style="background:#fef2f2;color:#dc2626;">❌</div><div class="stat-value">' + orders.filter(function(o) { return o.designStatus === 'Rejected'; }).length + '</div><div class="stat-label">Rejected</div></div>';
    document.getElementById('designStats').innerHTML = stats;
}

        function approveDesignReview(soId) {
            var so = DB.getById('salesOrders', soId);
            if (!so) return showToast('Sales order not found', 'error');
            if (so.designStatus === 'Under Review') {
                so.designStatus = 'Submitted';
                so.designSubmittedDate = new Date().toISOString().split('T')[0];
                DB.update('salesOrders', soId, so);
                renderDesignReviews();
                renderSales();
                showToast('📤 ' + soId + ' design submitted — ready for final approval');
                return;
            }
            // Check DOSH approval before creating WO
            var dwf=so.designWorkFlow||[];
            if(!dwf[2]||dwf[2].status!=='completed'){
                showToast('⚠️ DOSH Design Approval (Step 03) must be completed before issuing Work Order','error');
                renderDesignReviews();return;
            }
            if (!confirm('Approve design for ' + soId + '? This will create a Work Order.')) return;
            so.designStatus = 'Approved';
            so.designApprovedDate = new Date().toISOString().split('T')[0];
            so.status = 'Design Approved';
            DB.update('salesOrders', soId, so);
            // Create Work Order from approved SO
            var wo={id:DB.genId('workOrders'),salesId:so.id,woRef:so.id,custName:so.custName,client:so.custName,productName:so.productName,equipment:so.productName,type:so.type,equipType:so.equipType,status:'New',designStatus:'Approved',materials:so.materials||[],createdAt:new Date().toISOString(),
                site:'',priority:'Medium',dueDate:'',
                peMaterials:so.peMaterials||null,
                designPressure:so.peMaterials?so.peMaterials.designPressure:'',designTemperature:so.peMaterials?so.peMaterials.designTemp:'',
                shellHeadMaterial:so.peMaterials?((so.peMaterials.shellSpec||'')+(so.peMaterials.headSpec?' / '+so.peMaterials.headSpec:'')):'',
                headType:so.peMaterials?so.peMaterials.headType:'',
                description:'Sales Order '+so.id+' — '+so.productName+' for '+so.custName,
                repairInfo:so.repairInfo||null,
                branch:so.type==='repair'?'mar':'fab'
            };
            if(so.type==='repair'){
                wo.testingRequirement=so.repairInfo&&so.repairInfo.tests?Object.keys(so.repairInfo.tests).filter(function(k){return so.repairInfo.tests[k];}).map(function(k){return k.charAt(0).toUpperCase()+k.slice(1);}).join(', '):'';
                wo.marDoshReg=so.repairInfo?so.repairInfo.regNo||'':'';
            }
            saveWithOwner('workOrders',wo);
            renderDesignReviews();
            renderJobsTable();
            renderKanbanBoard();
            renderSales();
            showToast('✅ Design approved for ' + soId + ' — Work Order ' + wo.id + ' created');
        }

        function rejectDesignReview(soId) {
            const reason = prompt('Enter reason for rejection:');
            if (reason === null) return;
            var so = DB.getById('salesOrders', soId);
            if (!so) return showToast('Sales order not found', 'error');
            so.designStatus = 'Rejected';
            so.designRejectedReason = reason;
            so.designRejectedDate = new Date().toISOString().split('T')[0];
            so.status = 'Design Rejected';
            DB.update('salesOrders', soId, so);
            renderDesignReviews();
            renderSales();
            showToast('❌ Design rejected for ' + soId);
        }

        function deleteDesignReview(soId){
            if(!confirm('Delete sales order '+soId+'? This cannot be undone.'))return;
            DB.delete('salesOrders',soId);
            renderDesignReviews();
            renderSales();
            showToast('🗑️ '+soId+' deleted');
        }

function openDesignDetailSO(soId) {
    var so = DB.getById('salesOrders', soId);
    if (!so) return showToast('Sales order not found', 'error');
    var pe = so.peMaterials || {};
    var rep = so.repairInfo || {};
    var isRepair = so.type === 'repair';
    var isPE = so.equipType === 'pressure-equipment';
    var ds = so.designStatus || 'Pending';
    var statusColor = ds === 'Approved' ? '#059669' : ds === 'Rejected' ? '#dc2626' : ds === 'Submitted' ? '#0284c7' : '#d97706';
    var statusLabel = ds === 'Approved' ? '✅ Approved' : ds === 'Rejected' ? '❌ Rejected' : ds === 'Submitted' ? '📤 Submitted' : '🔍 Under Review';
    var typeLabel = isRepair ? '🔧 Repair' : '🆕 New Fabrication';
    var equipLabel = isPE ? '🔴 Pressure Equipment' : '🟢 Non-Pressure';

    var html = '';
    html += '<div style="max-height:70vh;overflow-y:auto;padding:20px;">';

    // Header card
    html += '<div style="background:linear-gradient(135deg,#1e40af,#7c3aed);color:white;padding:16px;border-radius:8px;margin-bottom:16px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div><div style="font-size:18px;font-weight:700;">' + so.id + ' — ' + (so.productName || so.equipment || '—') + '</div>';
    html += '<div style="font-size:13px;opacity:0.85;margin-top:4px;">' + typeLabel + ' | ' + equipLabel + ' | ' + (so.custName || so.customer || '—') + '</div></div>';
    html += '<div style="text-align:right;"><span style="background:' + statusColor + ';padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;">' + statusLabel + '</span>';
    html += '<div style="font-size:11px;opacity:0.7;margin-top:4px;">Submitted: ' + (so.designSubmittedDate || (so.createdAt ? so.createdAt.slice(0, 10) : '—')) + '</div></div>';
    html += '</div></div>';

    // Customer Info
    html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
    html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">👤 Customer Information</h4>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">';
    html += '<div><strong>Client:</strong> ' + (so.custName || so.customer || '—') + '</div>';
    html += '<div><strong>Contact:</strong> ' + (so.contact || '—') + '</div>';
    html += '<div><strong>Email:</strong> ' + (so.email || '—') + '</div>';
    html += '<div><strong>Budget:</strong> RM ' + (so.budget || so.amount || 0).toLocaleString() + '</div>';
    html += '</div></div>';

    if (isRepair) {
        // ============ REPAIR DETAILS ============
        html += '<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:#dc2626;">🔧 Repair Equipment Details</h4>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">';
        html += '<div><strong>Equipment Name:</strong> ' + (rep.equipName || so.productName || '—') + '</div>';
        html += '<div><strong>Registration No:</strong> ' + (rep.regNo || '—') + '</div>';
        html += '<div><strong>Serial No:</strong> ' + (rep.serial || '—') + '</div>';
        html += '<div><strong>Year of Manufacture:</strong> ' + (rep.yearMfg || '—') + '</div>';
        html += '<div><strong>Design Pressure:</strong> ' + (rep.designP || '—') + '</div>';
        html += '<div><strong>Design Temperature:</strong> ' + (rep.designT || '—') + '</div>';
        html += '</div></div>';

        // Scope of Work
        html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">📋 Scope of Work</h4>';
        html += '<div style="font-size:13px;line-height:1.6;">' + (rep.scope || '—').replace(/\n/g, '<br>') + '</div></div>';

        // Testing Requirements
        if (rep.tests) {
            html += '<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:14px;margin-bottom:12px;">';
            html += '<h4 style="margin:0 0 10px;font-size:13px;color:#d97706;">🧪 Testing Requirements</h4>';
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">';
            var testNames = {hydro:'Hydrostatic Test',bubble:'Bubble Test',dpt:'DPT',mpi:'MPI',xray:'X-Ray/Radiography',visual:'Visual Inspection',ut:'UT'};
            Object.keys(testNames).forEach(function(k) {
                var checked = rep.tests[k];
                html += '<div>' + (checked ? '✅' : '⬜') + ' ' + testNames[k] + '</div>';
            });
            html += '</div></div>';
        }

        // Repair Materials
        if (so.materials && so.materials.length) {
            html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
            html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">🔩 Materials</h4>';
            html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
            html += '<tr style="background:var(--bg-secondary);"><th style="padding:6px;text-align:left;">Description</th><th style="padding:6px;text-align:left;">Grade</th><th style="padding:6px;text-align:right;">Qty</th><th style="padding:6px;text-align:left;">Unit</th></tr>';
            so.materials.forEach(function(m) {
                html += '<tr><td style="padding:6px;border-top:1px solid var(--border);">' + (m.desc || m.description || '—') + '</td>';
                html += '<td style="padding:6px;border-top:1px solid var(--border);">' + (m.grade || '—') + '</td>';
                html += '<td style="padding:6px;border-top:1px solid var(--border);text-align:right;">' + (m.qty || 0) + '</td>';
                html += '<td style="padding:6px;border-top:1px solid var(--border);">' + (m.unit || '—') + '</td></tr>';
            });
            html += '</table></div>';
        }

    } else {
        // ============ FABRICATION DETAILS ============
        if (isPE && Object.keys(pe).length) {
            // Design Parameters
            html += '<div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:14px;margin-bottom:12px;">';
            html += '<h4 style="margin:0 0 10px;font-size:13px;color:#2563eb;">📐 Design Parameters</h4>';
            html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:13px;">';
            html += '<div><strong>Design Code:</strong> ' + (pe.designCode || '—') + '</div>';
            html += '<div><strong>Design Pressure:</strong> ' + (pe.designPressure || '—') + ' ' + (pe.designPressureUnit || 'Bar') + '</div>';
            html += '<div><strong>Design Temperature:</strong> ' + (pe.designTemp || '—') + ' °C</div>';
            html += '<div><strong>Equip Type:</strong> ' + equipLabel + '</div>';
            html += '<div><strong>Design Drawing:</strong> ' + (pe.designCheck ? '✅' : '⬜') + '</div>';
            html += '<div><strong>Shop Fab Drawing:</strong> ' + (pe.fabCheck ? '✅' : '⬜') + '</div>';
            html += '</div></div>';

            // Material List
            html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
            html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">🔩 Material List & Quantity</h4>';

            // Shell
            if (pe.shellSpec || pe.shellSize) {
                html += '<div style="margin-bottom:8px;padding:8px;background:rgba(16,185,129,0.06);border-radius:6px;font-size:13px;">';
                html += '<strong>Shell:</strong> ' + (pe.shellSize || '—') + ' | ' + (pe.shellSpec || '—') + ' | Qty: ' + (pe.shellQty || '—');
                html += '</div>';
            }
            // Head
            if (pe.headSpec || pe.headSize) {
                html += '<div style="margin-bottom:8px;padding:8px;background:rgba(16,185,129,0.06);border-radius:6px;font-size:13px;">';
                html += '<strong>Head:</strong> ' + (pe.headSize || '—') + ' | ' + (pe.headSpec || '—') + ' | Type: ' + (pe.headType || '—') + ' | Qty: ' + (pe.headQty || '—');
                html += '</div>';
            }
            // Nozzles
            if (pe.nozzleList && pe.nozzleList.length) {
                html += '<div style="margin-bottom:8px;padding:8px;background:rgba(245,158,11,0.06);border-radius:6px;font-size:13px;">';
                html += '<strong>Nozzles (' + pe.nozzleList.length + '):</strong><table style="width:100%;font-size:12px;margin-top:4px;border-collapse:collapse;">';
                html += '<tr style="background:var(--bg-secondary);"><th style="padding:4px;text-align:left;">Name</th><th style="padding:4px;text-align:left;">Size</th><th style="padding:4px;text-align:left;">Spec</th><th style="padding:4px;text-align:right;">Qty</th></tr>';
                pe.nozzleList.forEach(function(n) {
                    html += '<tr><td style="padding:4px;border-top:1px solid var(--border);">' + (n[0] || '—') + '</td><td style="padding:4px;">' + (n[1] || '—') + '</td><td style="padding:4px;">' + (n[2] || '—') + '</td><td style="padding:4px;text-align:right;">' + (n[3] || '—') + '</td></tr>';
                });
                html += '</table></div>';
            }
            // Flanges
            if (pe.flangeList && pe.flangeList.length) {
                html += '<div style="margin-bottom:8px;padding:8px;background:rgba(168,85,247,0.06);border-radius:6px;font-size:13px;">';
                html += '<strong>Flanges (' + pe.flangeList.length + '):</strong><table style="width:100%;font-size:12px;margin-top:4px;border-collapse:collapse;">';
                html += '<tr style="background:var(--bg-secondary);"><th style="padding:4px;text-align:left;">Name</th><th style="padding:4px;text-align:left;">Size</th><th style="padding:4px;text-align:left;">Spec</th><th style="padding:4px;text-align:right;">Qty</th></tr>';
                pe.flangeList.forEach(function(f) {
                    html += '<tr><td style="padding:4px;border-top:1px solid var(--border);">' + (f[0] || '—') + '</td><td style="padding:4px;">' + (f[1] || '—') + '</td><td style="padding:4px;">' + (f[2] || '—') + '</td><td style="padding:4px;text-align:right;">' + (f[3] || '—') + '</td></tr>';
                });
                html += '</table></div>';
            }
            // Saddle/Leg
            if (pe.saddleName || pe.saddleSpec) {
                html += '<div style="margin-bottom:8px;padding:8px;background:rgba(234,179,8,0.06);border-radius:6px;font-size:13px;">';
                html += '<strong>Saddle/Leg:</strong> ' + (pe.saddleName || '—') + ' | ' + (pe.saddleSpec || '—') + ' | Qty: ' + (pe.saddleQty || '—');
                html += '</div>';
            }
            // Other
            if (pe.otherList && pe.otherList.length) {
                html += '<div style="margin-bottom:8px;padding:8px;background:var(--bg-secondary);border-radius:6px;font-size:13px;">';
                html += '<strong>Other Materials (' + pe.otherList.length + '):</strong><table style="width:100%;font-size:12px;margin-top:4px;border-collapse:collapse;">';
                html += '<tr style="background:var(--bg);"><th style="padding:4px;text-align:left;">Name</th><th style="padding:4px;text-align:left;">Spec</th><th style="padding:4px;text-align:right;">Qty</th></tr>';
                pe.otherList.forEach(function(o) {
                    html += '<tr><td style="padding:4px;border-top:1px solid var(--border);">' + (o[0] || '—') + '</td><td style="padding:4px;">' + (o[1] || '—') + '</td><td style="padding:4px;text-align:right;">' + (o[2] || '—') + '</td></tr>';
                });
                html += '</table></div>';
            }
            // Misc
            if (pe.misc) {
                html += '<div style="margin-top:8px;padding:8px;background:var(--bg-secondary);border-radius:6px;font-size:12px;line-height:1.6;"><strong>Miscellaneous Notes:</strong><br>' + pe.misc.replace(/\n/g, '<br>') + '</div>';
            }
            html += '</div>';

        } else if (!isPE && so.materials && so.materials.length) {
            // NP Materials
            html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
            html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">🔩 Non-Pressure Materials</h4>';
            html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
            html += '<tr style="background:var(--bg-secondary);"><th style="padding:6px;text-align:left;">Description</th><th style="padding:6px;text-align:left;">Grade</th><th style="padding:6px;text-align:right;">Qty</th><th style="padding:6px;text-align:left;">Unit</th></tr>';
            so.materials.forEach(function(m) {
                html += '<tr><td style="padding:6px;border-top:1px solid var(--border);">' + (m.desc || m.description || '—') + '</td>';
                html += '<td style="padding:6px;border-top:1px solid var(--border);">' + (m.grade || '—') + '</td>';
                html += '<td style="padding:6px;border-top:1px solid var(--border);text-align:right;">' + (m.qty || 0) + '</td>';
                html += '<td style="padding:6px;border-top:1px solid var(--border);">' + (m.unit || '—') + '</td></tr>';
            });
            html += '</table></div>';
        } else {
            html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
            html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">🔩 Materials</h4>';
            html += '<div style="font-size:13px;color:var(--text-secondary);">No material details recorded.</div></div>';
        }
    }

    // Schedule & Cost (shared)
    html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
    html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">📅 Schedule & Cost</h4>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">';
    html += '<div><strong>Installation Duration:</strong> ' + (so.installDuration || '—') + '</div>';
    html += '<div><strong>Installation Due Date:</strong> ' + (so.installDate || '—') + '</div>';
    html += '<div><strong>Handover Duration:</strong> ' + (so.handoverDuration || '—') + '</div>';
    html += '<div><strong>Handover Due Date:</strong> ' + (so.handoverDate || '—') + '</div>';
    html += '<div style="grid-column:span 2;"><strong>Project Cost:</strong> RM ' + (so.projectCost || 0).toLocaleString() + '</div>';
    html += '</div>';
    // Parse cost breakdown from misc notes
    if (pe.misc) {
        var lines = pe.misc.split('\n');
        var costLines = lines.filter(function(l) { return l.match(/(Fabrication Cost|Consumable|Manpower|Drawing|Inspection|Testing|Others|TOTAL ESTIMATED|Design Code|Testing Type)/i); });
        if (costLines.length) {
            html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);">';
            html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">💰 Cost Breakdown (from PV Calculator)</div>';
            html += '<div style="display:grid;grid-template-columns:1fr auto;gap:4px 16px;font-size:12px;">';
            costLines.forEach(function(l) {
                var parts = l.split(':');
                if (parts.length >= 2) {
                    var label = parts[0].trim();
                    var val = parts.slice(1).join(':').trim();
                    var isTotal = label.toUpperCase().includes('TOTAL');
                    html += '<div style="' + (isTotal ? 'font-weight:700;color:#059669;border-top:1px solid var(--border);padding-top:4px;' : '') + '">' + label + '</div>';
                    html += '<div style="text-align:right;' + (isTotal ? 'font-weight:700;color:#059669;font-size:14px;' : '') + '">' + val + '</div>';
                }
            });
            html += '</div></div>';
        }
    }
    html += '</div>';

    // Rejection reason if rejected
    if (ds === 'Rejected' && so.designRejectedReason) {
        html += '<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:#dc2626;">❌ Rejection Reason</h4>';
        html += '<div style="font-size:13px;">' + so.designRejectedReason + '</div></div>';
    }

    // Design Notes (added by design dept)
    if (so.designNotes) {
        html += '<div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:#2563eb;">📝 Design Department Notes</h4>';
        html += '<div style="font-size:13px;line-height:1.6;white-space:pre-wrap;">' + so.designNotes + '</div></div>';
    }

    // Modified Items (design changes)
    if (so.designModifiedItems && so.designModifiedItems.length) {
        html += '<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:#d97706;">✏️ Modified Items</h4>';
        html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
        html += '<tr style="background:rgba(245,158,11,0.1);"><th style="padding:6px;text-align:left;">Item</th><th style="padding:6px;text-align:left;">Original</th><th style="padding:6px;text-align:left;">Modified To</th></tr>';
        so.designModifiedItems.forEach(function(m) {
            html += '<tr><td style="padding:6px;border-top:1px solid var(--border);font-weight:600;">' + (m.item || '—') + '</td>';
            html += '<td style="padding:6px;border-top:1px solid var(--border);color:var(--text-muted);">' + (m.original || '—') + '</td>';
            html += '<td style="padding:6px;border-top:1px solid var(--border);color:#059669;font-weight:600;">' + (m.modified || '—') + '</td></tr>';
        });
        html += '</table></div>';
    }

    // Design Notes Input (editable when Under Review or Submitted)
    if (ds === 'Under Review' || ds === 'Submitted') {
        html += '<div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:#4f46e5;">✏️ Add Design Notes / Modifications</h4>';
        html += '<textarea id="designNotesInput" class="form-control" rows="3" placeholder="Add design notes, modifications, special instructions..." style="font-size:12px;">' + (so.designNotes || '') + '</textarea>';
        html += '<div style="margin-top:10px;"><div style="font-size:12px;font-weight:600;margin-bottom:6px;">Modified Items (optional):</div>';
        html += '<div id="designModifiedItemsList">';
        if (so.designModifiedItems && so.designModifiedItems.length) {
            so.designModifiedItems.forEach(function(m, idx) {
                html += '<div style="display:flex;gap:6px;margin-bottom:4px;align-items:center;">';
                html += '<input type="text" class="form-control design-mod-item" placeholder="Item" value="' + (m.item || '') + '" style="flex:1;font-size:11px;">';
                html += '<input type="text" class="form-control design-mod-original" placeholder="Original" value="' + (m.original || '') + '" style="flex:1;font-size:11px;">';
                html += '<input type="text" class="form-control design-mod-modified" placeholder="Modified to" value="' + (m.modified || '') + '" style="flex:1;font-size:11px;">';
                html += '<button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest(\'div\').remove()">✕</button>';
                html += '</div>';
            });
        }
        html += '</div>';
        html += '<button class="btn btn-xs btn-outline" onclick="addDesignModItem()" style="margin-top:4px;">+ Add Modified Item</button>';
        html += '</div></div>';
    }

    // DOSH Design Workflow
    var dwf = so.designWorkFlow || [
        {status:'pending', date:'', reference:''},
        {status:'pending', date:'', reference:''},
        {status:'pending', date:'', reference:''},
        {status:'pending', date:'', reference:''}
    ];
    var dwfSteps = [
        '01 — Draft &amp; Create Technical Drawing with Design Calculation — Get Client Approval',
        '02 — Submission Detail Design to DOSH — Until Getting Approval',
        '03 — Design Approval from DOSH',
        '04 — Issue Approved for Construction (AFC) Drawing'
    ];
    var dwfAllDone = dwf.every(function(s){return s.status==='completed';});
    html += '<div style="margin-top:16px;border:1px solid var(--border);border-radius:var(--radius);padding:12px;background:var(--bg);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<h4 style="margin:0;font-size:13px;color:#2563eb;">📐 DOSH Design Work Flow</h4>';
    html += '<span id="doshFlowBadge" style="font-size:11px;padding:3px 10px;border-radius:12px;font-weight:600;background:'+(dwfAllDone?'rgba(16,185,129,0.15)':'#f3f4f6')+';color:'+(dwfAllDone?'#34d399':'#374151')+';">'+(dwfAllDone?'✅ All Completed':'⏳ In Progress')+'</span>';
    html += '</div>';
    html += '<p style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">Design must be approved by DOSH before Work Order can be issued.</p>';
    html += '<table style="width:100%;font-size:11px;border-collapse:collapse;">';
    html += '<thead><tr style="background:#f1f5f9;"><th style="padding:4px 6px;border:1px solid var(--border);">#</th><th style="padding:4px 6px;border:1px solid var(--border);">Work Flow Step</th><th style="padding:4px 6px;border:1px solid var(--border);width:85px;">Status</th><th style="padding:4px 6px;border:1px solid var(--border);width:100px;">Date</th><th style="padding:4px 6px;border:1px solid var(--border);width:120px;">Reference</th></tr></thead>';
    html += '<tbody>';
    for(var dwi=0;dwi<4;dwi++){
        var d=dwf[dwi];
        html += '<tr>';
        html += '<td style="padding:3px 6px;border:1px solid var(--border);text-align:center;font-weight:600;">0'+(dwi+1)+'</td>';
        html += '<td style="padding:3px 6px;border:1px solid var(--border);">'+dwfSteps[dwi]+'</td>';
        html += '<td style="padding:3px 6px;border:1px solid var(--border);"><select class="form-control" style="font-size:11px;padding:2px 4px;" data-dwf-idx="'+dwi+'" onchange="saveDoshWorkFlow(\''+so.id+'\')"><option value="pending" '+(d.status==='pending'?'selected':'')+'>⏳ Pending</option><option value="in-progress" '+(d.status==='in-progress'?'selected':'')+'>🔄 In Progress</option><option value="completed" '+(d.status==='completed'?'selected':'')+'>✅ Completed</option></select></td>';
        html += '<td style="padding:3px 6px;border:1px solid var(--border);"><input type="date" class="form-control" style="font-size:11px;padding:2px 4px;" value="'+(d.date||'')+'" data-dwf-idx="'+dwi+'" onchange="saveDoshWorkFlow(\''+so.id+'\')"></td>';
        html += '<td style="padding:3px 6px;border:1px solid var(--border);"><input type="text" class="form-control" style="font-size:11px;padding:2px 4px;" placeholder="Ref / remarks" value="'+escHtml(d.reference||'')+'" data-dwf-idx="'+dwi+'" onchange="saveDoshWorkFlow(\''+so.id+'\')"></td>';
        html += '</tr>';
    }
    html += '</tbody></table></div>';

    // Action buttons
    html += '<div style="display:flex;gap:8px;justify-content:space-between;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">';
    html += '<div><button class="btn btn-ghost" onclick="closeModal(\'designReviewDetailModal\')">Close</button></div>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn btn-secondary" onclick="printSalesOrderPDF(\'' + so.id + '\');closeModal(\'designReviewDetailModal\')">🖨️ Print PDF</button>';
    if (ds === 'Under Review' || ds === 'Submitted') {
        html += '<button class="btn btn-danger" onclick="saveDesignNotesAndReject(\'' + so.id + '\')">❌ Reject</button>';
        html += '<button class="btn btn-success" onclick="saveDesignNotesAndApprove(\'' + so.id + '\')">' + (ds === 'Under Review' ? '📤 Submit Review' : '✅ Approve & Create WO') + '</button>';
    }
    html += '</div></div>';

    html += '</div>';

    // Create and show modal
    var modal = document.getElementById('designReviewDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'designReviewDetailModal';
        modal.className = 'modal-overlay';
        modal.onclick = function(e) { if (e.target === modal) closeModal('designReviewDetailModal'); };
        modal.innerHTML = '<div class="modal" style="max-width:800px;"><div class="modal-header"><h3>📐 Design Review — ' + so.id + '</h3><button class="modal-close" onclick="closeModal(\'designReviewDetailModal\')">×</button></div><div class="modal-body" id="designReviewDetailBody"></div></div>';
        document.body.appendChild(modal);
    }
    document.getElementById('designReviewDetailBody').innerHTML = html;
    modal.style.display = 'flex';
    modal.classList.add('active');
}

function saveDoshWorkFlow(soId){
    var so=DB.getById('salesOrders',soId);
    if(!so)return;
    var badge=document.getElementById('doshFlowBadge');
    var rows=document.querySelectorAll('#designReviewDetailBody table tbody tr');
    var dwf=[];
    var allDone=true;
    rows.forEach(function(tr){
        var sel=tr.querySelector('select');
        var inputs=tr.querySelectorAll('input');
        var status=sel?sel.value:'pending';
        var date=inputs[0]?inputs[0].value:'';
        var ref=inputs[1]?inputs[1].value:'';
        dwf.push({status:status,date:date,reference:ref});
        if(status!=='completed')allDone=false;
    });
    so.designWorkFlow=dwf;
    DB.update('salesOrders',soId,so);
    if(badge){
        badge.textContent=allDone?'✅ All Completed':'⏳ In Progress';
        badge.style.cssText='font-size:11px;padding:3px 10px;border-radius:12px;font-weight:600;background:'+(allDone?'rgba(16,185,129,0.15)':'#f3f4f6')+';color:'+(allDone?'#34d399':'#374151')+';';
    }
}

function addDesignModItem() {
    var list = document.getElementById('designModifiedItemsList');
    if (!list) return;
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;align-items:center;';
    div.innerHTML = '<input type="text" class="form-control design-mod-item" placeholder="Item" style="flex:1;font-size:11px;">' +
        '<input type="text" class="form-control design-mod-original" placeholder="Original" style="flex:1;font-size:11px;">' +
        '<input type="text" class="form-control design-mod-modified" placeholder="Modified to" style="flex:1;font-size:11px;">' +
        '<button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest(\'div\').remove()">✕</button>';
    list.appendChild(div);
}

function collectDesignNotes() {
    var notesEl = document.getElementById('designNotesInput');
    var notes = notesEl ? notesEl.value.trim() : '';
    var items = [];
    var itemEls = document.querySelectorAll('.design-mod-item');
    var origEls = document.querySelectorAll('.design-mod-original');
    var modEls = document.querySelectorAll('.design-mod-modified');
    for (var i = 0; i < itemEls.length; i++) {
        var item = itemEls[i] ? itemEls[i].value.trim() : '';
        var orig = origEls[i] ? origEls[i].value.trim() : '';
        var mod = modEls[i] ? modEls[i].value.trim() : '';
        if (item || orig || mod) items.push({ item: item, original: orig, modified: mod });
    }
    return { notes: notes, modifiedItems: items };
}

function saveDesignNotesAndApprove(soId) {
    var data = collectDesignNotes();
    var so = DB.getById('salesOrders', soId);
    if (!so) return showToast('Sales order not found', 'error');
    if (data.notes) so.designNotes = data.notes;
    if (data.modifiedItems.length) so.designModifiedItems = data.modifiedItems;
    DB.update('salesOrders', soId, so);
    closeModal('designReviewDetailModal');
    approveDesignReview(soId);
}

function saveDesignNotesAndReject(soId) {
    var data = collectDesignNotes();
    var so = DB.getById('salesOrders', soId);
    if (!so) return showToast('Sales order not found', 'error');
    if (data.notes) so.designNotes = data.notes;
    if (data.modifiedItems.length) so.designModifiedItems = data.modifiedItems;
    DB.update('salesOrders', soId, so);
    closeModal('designReviewDetailModal');
    rejectDesignReview(soId);
}

        function openDesignDetail(woId) {
            _currentMarWoId = woId;
            openMarDetail(woId);
        }

        // ===== INVOICE RENDERING =====

        function renderInvoices() {
            const invs = DB.get('invoices');
            const tbody = document.getElementById('invoicesTable');
            if (!tbody) return;
            tbody.innerHTML = invs.length
                ? invs.map(inv => `
                    <tr>
                        <td><strong>${inv.id}</strong></td>
                        <td>${inv.customer}</td>
                        <td>${inv.soRef || '—'}</td>
                        <td>${inv.qtRef || '—'}</td>
                        <td>${inv.woRef || '—'}</td>
                        <td><strong>RM ${(inv.total || inv.amount || 0).toLocaleString()}</strong></td>
                        <td><span class="badge badge-${(inv.status||'Unpaid').toLowerCase()}">${inv.status || 'Unpaid'}</span></td>
                        <td>${inv.date || '—'}</td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-xs btn-info" onclick="viewInvoice('${inv.id}')">View</button>
                                <button class="btn btn-xs btn-secondary" onclick="sendInvoiceEmail('${inv.id}')">📧</button>
                                ${inv.status !== 'Paid' ? '<button class="btn btn-xs btn-success" onclick="markInvoicePaid(\''+inv.id+'\')">Paid</button>' : ''}
                            </div>
                        </td>
                    </tr>`).join('')
                : '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted);">No invoices yet</td></tr>';
        }

        // ===== EMAIL COMPOSE FUNCTIONS =====

        function buildEmailHtml(docType, subject, contact, itemsHtml, grandTotal, notes, dueDate) {
            return `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                    <div style="background:#2563eb;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
                        <h2 style="margin:0;font-size:18px;">${docType}</h2>
                    </div>
                    <div style="border:1px solid #ddd;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
                        <p style="margin:0 0 16px;">Dear <strong>${contact}</strong>,</p>
                        <p style="margin:0 0 16px;">Please find our ${docType.toLowerCase()} details below.</p>
                        <h3 style="color:#2563eb;margin:0 0 8px;">${subject}</h3>
                        <table style="width:100%;border-collapse:collapse;margin:12px 0;">
                            <thead><tr style="background:#f3f4f6;"><th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Description</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:center;">Qty</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:right;">Unit Price</th><th style="padding:6px 8px;border:1px solid #ddd;text-align:right;">Total</th></tr></thead>
                            <tbody>${itemsHtml || '<tr><td colspan="4" style="padding:8px;text-align:center;color:#999;">No items</td></tr>'}</tbody>
                        </table>
                        <p style="text-align:right;font-size:16px;font-weight:bold;margin:8px 0;">Grand Total: ${grandTotal}</p>
                        ${dueDate ? '<p style="text-align:right;margin:4px 0;color:#666;">Due Date: ' + dueDate + '</p>' : ''}
                        ${notes ? '<p style="margin:12px 0 0;padding:8px;background:#f9fafb;border-radius:4px;font-style:italic;">' + notes + '</p>' : ''}
                        <hr style="margin:16px 0;border:none;border-top:1px solid #eee;">
                        <p style="margin:0;color:#666;font-size:12px;">Thank you for your trust in our services.</p>
                        <p style="margin:0;color:#666;font-size:12px;">Best regards,<br>Your Sales Team</p>
                    </div>
                </div>
            `;
        }

        function toggleEmailPreview() {
            const area = document.getElementById('emailPreviewArea');
            const toggle = document.getElementById('emailPreviewToggle');
            if (area.style.display === 'none') {
                area.style.display = 'block';
                // Re-render preview from current body text
                const body = document.getElementById('emailBody').value;
                // Simple text-to-HTML conversion for preview
                const html = body.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;');
                area.innerHTML = '<div style="font-family:monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;">' + html + '</div>';
                toggle.textContent = '▲';
            } else {
                area.style.display = 'none';
                toggle.textContent = '▼';
            }
        }

        function openEmailCompose(to, subject, bodyText, htmlPreview) {
            document.getElementById('emailTo').value = to || '';
            document.getElementById('emailSubject').value = subject || '';
            document.getElementById('emailBody').value = bodyText || '';
            document.getElementById('emailPreviewArea').innerHTML = htmlPreview || '<div style="color:#999;text-align:center;padding:20px;">Preview ready</div>';
            document.getElementById('emailPreviewArea').style.display = 'block';
            document.getElementById('emailPreviewToggle').textContent = '▲';
            document.getElementById('emailModalTitle').textContent = '📧 Send Email';
            document.getElementById('emailComposeModal').classList.add('active');
        }

        function openQuotationEmailCompose(qt) {
            let itemsHtml = '', itemsText = '';
            (qt.items || []).forEach(item => {
                const total = (item.qty || 0) * (item.unitPrice || 0);
                itemsHtml += `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${item.description}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${item.qty}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">RM ${(item.unitPrice||0).toLocaleString(undefined,{minFrac:2,maxFrac:2})}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">RM ${total.toLocaleString(undefined,{minFrac:2,maxFrac:2})}</td></tr>`;
                itemsText += `  ${item.description}  x${item.qty}  @ RM ${(item.unitPrice||0).toLocaleString(undefined,{minFrac:2,maxFrac:2})}  =  RM ${total.toLocaleString(undefined,{minFrac:2,maxFrac:2})}\n`;
            });
            const grandTotal = 'RM ' + (qt.total || qt.subtotal || 0).toLocaleString(undefined, {minFrac:2, maxFrac:2});
            const subject = 'Quotation: ' + qt.id + ' - ' + qt.subject;
            const contact = qt.contact || 'Customer';
            const htmlPreview = buildEmailHtml('Quotation', subject, contact, itemsHtml, grandTotal, qt.notes, qt.validUntil ? 'Valid until: ' + qt.validUntil : '');
            const bodyText = 'Dear ' + contact + ',\n\nPlease find our quotation below.\n\n' + subject + '\n\n' + itemsText + '\nGrand Total: ' + grandTotal + '\n' + (qt.validUntil ? 'Valid Until: ' + qt.validUntil + '\n' : '') + '\n' + (qt.notes ? 'Notes: ' + qt.notes + '\n\n' : '\n') + 'Thank you for your consideration.\n\nBest regards,\n' + (qt.createdBy || 'Sales Team');
            openEmailCompose(qt.email, subject, bodyText, htmlPreview);
        }

        function openInvoiceEmailCompose(inv) {
            let itemsHtml = '', itemsText = '';
            (inv.items || []).forEach(item => {
                const total = (item.qty || 0) * (item.unitPrice || 0);
                itemsHtml += `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${item.description}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${item.qty}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">RM ${(item.unitPrice||0).toLocaleString(undefined,{minFrac:2,maxFrac:2})}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">RM ${total.toLocaleString(undefined,{minFrac:2,maxFrac:2})}</td></tr>`;
                itemsText += `  ${item.description}  x${item.qty}  @ RM ${(item.unitPrice||0).toLocaleString(undefined,{minFrac:2,maxFrac:2})}  =  RM ${total.toLocaleString(undefined,{minFrac:2,maxFrac:2})}\n`;
            });
            const grandTotal = 'RM ' + (inv.total || inv.amount || 0).toLocaleString(undefined, {minFrac:2, maxFrac:2});
            const subject = 'Invoice: ' + inv.id;
            const contact = inv.contact || inv.customer || 'Customer';
            const htmlPreview = buildEmailHtml('Invoice', subject, contact, itemsHtml, grandTotal, inv.notes, inv.dueDate);
            const bodyText = 'Dear ' + contact + ',\n\nPlease find our invoice below.\n\n' + subject + '\n\n' + itemsText + '\nGrand Total: ' + grandTotal + '\nDue Date: ' + (inv.dueDate || 'Upon receipt') + '\n\n' + (inv.notes ? 'Notes: ' + inv.notes + '\n\n' : '\n') + 'Thank you for your business.\n\nBest regards,\nBilling Team';
            openEmailCompose(inv.email, subject, bodyText, htmlPreview);
        }

        function initEmailJS() {
            const settings = JSON.parse(localStorage.getItem('ad_deen_settings') || '{}');
            if (settings.emailjsPublicKey && typeof emailjs !== 'undefined') {
                emailjs.init(settings.emailjsPublicKey);
            }
        }

        function sendEmailViaEmailJS(to, subject, htmlBody, textBody) {
            return new Promise((resolve, reject) => {
                const settings = JSON.parse(localStorage.getItem('ad_deen_settings') || '{}');
                const serviceId = settings.emailjsServiceId;
                const templateId = settings.emailjsTemplateId;
                if (!serviceId || !templateId) {
                    reject(new Error('EmailJS not configured'));
                    return;
                }
                if (typeof emailjs === 'undefined') {
                    reject(new Error('EmailJS library not loaded yet'));
                    return;
                }
                emailjs.send(serviceId, templateId, {
                    to_email: to,
                    from_name: 'Adeen Engineering ERP',
                    subject: subject,
                    message_html: htmlBody,
                    message_text: textBody,
                }).then(function(response) {
                    resolve(response);
                }, function(error) {
                    reject(error);
                });
            });
        }

        function sendComposedEmail() {
            const to = document.getElementById('emailTo').value.trim();
            const subject = document.getElementById('emailSubject').value.trim();
            const body = document.getElementById('emailBody').value.trim();
            const htmlPreview = document.getElementById('emailPreviewArea').innerHTML;
            if (!to) { showToast('Please enter recipient email address', 'error'); return; }
            if (!subject) { showToast('Please enter a subject', 'error'); return; }

            // Try EmailJS first
            const settings = JSON.parse(localStorage.getItem('ad_deen_settings') || '{}');
            if (settings.emailjsServiceId && settings.emailjsTemplateId) {
                initEmailJS();
                sendEmailViaEmailJS(to, subject, htmlPreview, body)
                    .then(() => {
                        closeModal('emailComposeModal');
                        showToast('✅ Email sent successfully via EmailJS');
                    })
                    .catch((err) => {
                        showToast('EmailJS failed: ' + (err.text || err.message || 'unknown error') + ' — falling back to email client', 'error');
                        // Fallback to mailto:
                        const mailtoLink = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
                        window.open(mailtoLink, '_blank');
                        closeModal('emailComposeModal');
                    });
            } else {
                // No EmailJS config — use mailto: directly
                const mailtoLink = 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
                window.open(mailtoLink, '_blank');
                closeModal('emailComposeModal');
                showToast('📧 Email client opened. Configure EmailJS in Settings to send directly.');
            }
        }

        // ===== QUOTATION FUNCTIONS =====

        function renderQuotations() {
            const qts = DB.get('quotations');
            const tbody = document.getElementById('quotationsTable');
            if (!tbody) return;
            let html = '';
            if (!qts.length) {
                html = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No quotations yet</td></tr>';
            } else {
                qts.forEach(q => {
                    var safeStatus = q.status || 'Draft';
                    var canConvert = safeStatus === 'Accepted' && !q.invRef;
                    var safeDesc = q.description || '';
                    html += '<tr>' +
                        '<td><strong>' + q.id + '</strong></td>' +
                        '<td><strong>' + (q.customer || '') + '</strong><br><small style="color:var(--text-muted);">' + (q.contact || '') + '</small></td>' +
                        '<td>' + (q.subject || '') + '<br><small style="color:var(--text-muted);">' + safeDesc.substring(0,30) + '</small></td>' +
                        '<td><strong>RM ' + ((q.total || q.subtotal || 0)).toLocaleString() + '</strong></td>' +
                        '<td><span class="badge badge-' + safeStatus.toLowerCase() + '">' + safeStatus + '</span></td>' +
                        '<td style="font-size:12px;">' + (q.createdAt || '—') + '</td>' +
                        '<td>' +
                            '<div class="btn-group">' +
                                '<button class="btn btn-xs btn-info" onclick="viewQuotation(\'' + q.id + '\')">View</button>' +
                                '<button class="btn btn-xs btn-secondary" onclick="sendQuotationEmail(\'' + q.id + '\')">📧</button>' +
                                (canConvert ? '<button class="btn btn-xs btn-success" onclick="convertQtToInvoice(\''+q.id+'\')">🧾 Invoice</button>' : '') +
                                '<button class="btn btn-xs btn-danger" onclick="deleteRecord(\'quotations\',\'' + q.id + '\')">Delete</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                });
            }
            tbody.innerHTML = html;
        }

        function updateQtContact() {
            const custId = document.getElementById('qtCustomer').value;
            const customer = DB.getById('customers', custId);
            if (customer) {
                document.getElementById('qtContact').value = customer.name || '';
                document.getElementById('qtEmail').value = customer.email || '';
                document.getElementById('qtPhone').value = customer.phone || '';
            } else {
                document.getElementById('qtContact').value = '';
                document.getElementById('qtEmail').value = '';
                document.getElementById('qtPhone').value = '';
            }
        }

        let _qtItemCount = 1;

        function addQtItemRow() {
            const tbody = document.getElementById('qtItemsBody');
            const idx = _qtItemCount++;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="Item description" id="qtItemDesc_${idx}"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="1" min="1" id="qtItemQty_${idx}"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="0" min="0" step="0.01" id="qtItemPrice_${idx}" oninput="updateQtTotal()"></td>
                <td style="font-size:12px;font-weight:600;" id="qtItemTotal_${idx}">RM 0</td>
                <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updateQtTotal();">✕</button></td>
            `;
            tbody.appendChild(tr);
        }

        function updateQtTotal() {
            const tbody = document.getElementById('qtItemsBody');
            let subtotal = 0;
            tbody.querySelectorAll('tr').forEach((tr, i) => {
                const qty = parseFloat(tr.querySelector('input[id^="qtItemQty_"]')?.value) || 0;
                const price = parseFloat(tr.querySelector('input[id^="qtItemPrice_"]')?.value) || 0;
                const total = qty * price;
                subtotal += total;
                const totalEl = tr.querySelector('td[id^="qtItemTotal_"]');
                if (totalEl) totalEl.textContent = 'RM ' + total.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2});
            });
            const taxPct = parseFloat(document.getElementById('qtTaxPercent')?.value) || 0;
            const taxAmt = subtotal * taxPct / 100;
            const grandTotal = subtotal + taxAmt;
            document.getElementById('qtSubtotal').value = 'RM ' + subtotal.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2});
            document.getElementById('qtTotal').value = 'RM ' + grandTotal.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2});
            return { subtotal, taxPct, taxAmt, grandTotal };
        }

        function openQuotationModal(editId) {
            document.getElementById('qtEditId').value = editId || '';
            document.getElementById('qtConvertSection').style.display = 'none';
            document.getElementById('qtEmailBtn').style.display = 'none';
            document.getElementById('qtSubmitBtn').textContent = editId ? '💾 Update Quotation' : '💾 Save Quotation';
            document.getElementById('qtModalTitle').textContent = editId ? '📄 Edit Quotation' : '📄 New Quotation';

            // Populate customer dropdown
            const sel = document.getElementById('qtCustomer');
            sel.innerHTML = '<option value="">Select Customer...</option>';
            DB.get('customers').forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.company + ' — ' + c.name;
                sel.appendChild(opt);
            });

            // Reset fields
            document.getElementById('qtSubject').value = '';
            document.getElementById('qtContact').value = '';
            document.getElementById('qtEmail').value = '';
            document.getElementById('qtPhone').value = '';
            document.getElementById('qtDescription').value = '';
            document.getElementById('qtValidUntil').value = '';
            document.getElementById('qtStatus').value = 'Draft';
            document.getElementById('qtNotes').value = '';
            document.getElementById('qtTaxPercent').value = '0';
            document.getElementById('qtSubtotal').value = 'RM 0.00';
            document.getElementById('qtTotal').value = 'RM 0.00';
            _qtItemCount = 1;
            const tbody = document.getElementById('qtItemsBody');
            tbody.innerHTML = `<tr>
                <td>1</td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="Item description" id="qtItemDesc_0"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="1" min="1" id="qtItemQty_0"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="0" min="0" step="0.01" id="qtItemPrice_0" oninput="updateQtTotal()"></td>
                <td style="font-size:12px;font-weight:600;" id="qtItemTotal_0">RM 0</td>
                <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updateQtTotal();">✕</button></td>
            </tr>`;

            if (editId) {
                const qt = DB.getById('quotations', editId);
                if (qt) {
                    sel.value = '';
                    // find customer by name
                    const custOpt = Array.from(sel.options).find(o => o.textContent.startsWith(qt.customer));
                    if (custOpt) sel.value = custOpt.value;
                    document.getElementById('qtSubject').value = qt.subject || '';
                    document.getElementById('qtContact').value = qt.contact || '';
                    document.getElementById('qtEmail').value = qt.email || '';
                    document.getElementById('qtPhone').value = qt.phone || '';
                    document.getElementById('qtDescription').value = qt.description || '';
                    document.getElementById('qtValidUntil').value = qt.validUntil || '';
                    document.getElementById('qtStatus').value = qt.status || 'Draft';
                    document.getElementById('qtNotes').value = qt.notes || '';
                    document.getElementById('qtTaxPercent').value = qt.taxPercent || 0;

                    // Restore items
                    tbody.innerHTML = '';
                    _qtItemCount = 0;
                    (qt.items || []).forEach((item, i) => {
                        const idx = _qtItemCount++;
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${i + 1}</td>
                            <td><input type="text" class="form-control" style="font-size:11px;" placeholder="Item description" id="qtItemDesc_${idx}" value="${item.description || ''}"></td>
                            <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="${item.qty || 1}" min="1" id="qtItemQty_${idx}"></td>
                            <td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="${item.unitPrice || 0}" min="0" step="0.01" id="qtItemPrice_${idx}" oninput="updateQtTotal()"></td>
                            <td style="font-size:12px;font-weight:600;" id="qtItemTotal_${idx}">RM ${((item.qty||0)*(item.unitPrice||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                            <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updateQtTotal();">✕</button></td>
                        `;
                        tbody.appendChild(tr);
                    });
                    if (!qt.items || qt.items.length === 0) {
                        // add one empty row
                        addQtItemRow();
                    }
                    updateQtTotal();

                    // Show email button
                    if (qt.email) document.getElementById('qtEmailBtn').style.display = 'inline-flex';

                    // Show convert section if Accepted and not yet converted
                    if (qt.status === 'Accepted' && !qt.invRef) {
                        document.getElementById('qtConvertSection').style.display = 'block';
                    }
                }
            }

            var qtModal = document.getElementById('quotationModal');
            qtModal.style.display = '';
            qtModal.classList.add('active');
        }

        async function createQuotation() {
            const editId = document.getElementById('qtEditId').value;
            const customerSel = document.getElementById('qtCustomer');
            const customerText = customerSel.options[customerSel.selectedIndex]?.textContent || '';
            const customer = customerText.split(' — ')[0] || customerText;
            const subject = document.getElementById('qtSubject').value.trim();
            if (!customer || !subject) { showToast('Please select customer and enter subject', 'error'); return; }

            const items = [];
            const tbody = document.getElementById('qtItemsBody');
            tbody.querySelectorAll('tr').forEach(tr => {
                const desc = tr.querySelector('input[id^="qtItemDesc_"]')?.value?.trim();
                const qty = parseFloat(tr.querySelector('input[id^="qtItemQty_"]')?.value) || 0;
                const price = parseFloat(tr.querySelector('input[id^="qtItemPrice_"]')?.value) || 0;
                if (desc) items.push({ description: desc, qty, unitPrice: price });
            });
            if (!items.length) { showToast('Add at least one item', 'error'); return; }

            const totals = updateQtTotal();
            const qt = {
                customer,
                contact: document.getElementById('qtContact').value,
                email: document.getElementById('qtEmail').value,
                phone: document.getElementById('qtPhone').value,
                subject,
                description: document.getElementById('qtDescription').value.trim(),
                items,
                subtotal: totals.subtotal,
                taxPercent: totals.taxPct,
                taxAmount: totals.taxAmt,
                total: totals.grandTotal,
                status: document.getElementById('qtStatus').value,
                validUntil: document.getElementById('qtValidUntil').value,
                notes: document.getElementById('qtNotes').value.trim()
            };

            if (editId) {
                qt.id = editId;
                // Preserve createdAt, woRef, invRef
                const existing = DB.getById('quotations', editId);
                if (existing) {
                    qt.createdAt = existing.createdAt;
                    qt.woRef = existing.woRef;
                    qt.invRef = existing.invRef;
                }
                DB.update('quotations', editId, qt);
                showToast('✅ Quotation ' + editId + ' updated');
            } else {
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const year = now.getFullYear();
                const count = DB.get('quotations').length + 1;
                const id = 'QT-' + year + '-' + String(count).padStart(4, '0');
                qt.id = id;
                qt.createdAt = dateStr;
                qt.createdBy = 'Sales Team';
                await saveWithOwner('quotations', qt);
                showToast('✅ Quotation ' + id + ' created');
            }

            closeModal('quotationModal');
            renderSales();
        }

        function viewQuotation(id) {
            openQuotationModal(id);
        }

        function convertQtToInvoice(qtId) {
            const qt = DB.getById('quotations', qtId);
            if (!qt) { showToast('Quotation not found', 'error'); return; }
            if (qt.status !== 'Accepted') { showToast('Only Accepted quotations can be converted to Invoice', 'error'); return; }
            if (qt.invRef) { showToast('Already converted to ' + qt.invRef, 'error'); return; }

            // Open invoice modal pre-populated from quotation
            openInvoiceModalFromQt(qtId);
        }

        // ===== INVOICE FUNCTIONS =====

        let _invItemCount = 1;

        function addInvItemRow() {
            const tbody = document.getElementById('invItemsBody');
            const idx = _invItemCount++;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="Item description" id="invItemDesc_${idx}"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="1" min="1" id="invItemQty_${idx}"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="0" min="0" step="0.01" id="invItemPrice_${idx}" oninput="updateInvTotal()"></td>
                <td style="font-size:12px;font-weight:600;" id="invItemTotal_${idx}">RM 0</td>
                <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updateInvTotal();">✕</button></td>
            `;
            tbody.appendChild(tr);
        }

        function updateInvTotal() {
            const tbody = document.getElementById('invItemsBody');
            let subtotal = 0;
            tbody.querySelectorAll('tr').forEach(tr => {
                const qty = parseFloat(tr.querySelector('input[id^="invItemQty_"]')?.value) || 0;
                const price = parseFloat(tr.querySelector('input[id^="invItemPrice_"]')?.value) || 0;
                const total = qty * price;
                subtotal += total;
                const totalEl = tr.querySelector('td[id^="invItemTotal_"]');
                if (totalEl) totalEl.textContent = 'RM ' + total.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2});
            });
            const taxPct = parseFloat(document.getElementById('invTaxPercent')?.value) || 0;
            const taxAmt = subtotal * taxPct / 100;
            const grandTotal = subtotal + taxAmt;
            document.getElementById('invSubtotal').value = 'RM ' + subtotal.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2});
            document.getElementById('invTotal').value = 'RM ' + grandTotal.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2});
            return { subtotal, taxPct, taxAmt, grandTotal };
        }

        function updateInvContact() {
            const custId = document.getElementById('invCustomer').value;
            const customer = DB.getById('customers', custId);
            if (customer) {
                document.getElementById('invContact').value = customer.name || '';
                document.getElementById('invEmail').value = customer.email || '';
                document.getElementById('invPhone').value = customer.phone || '';
            } else {
                document.getElementById('invContact').value = '';
                document.getElementById('invEmail').value = '';
                document.getElementById('invPhone').value = '';
            }
        }

        function openInvoiceModal(invId) {
            document.getElementById('invEditId').value = invId || '';
            document.getElementById('invFromQt').value = '';
            document.getElementById('invEmailBtn').style.display = 'none';
            document.getElementById('invSubmitBtn').textContent = invId ? '💾 Update Invoice' : '🧾 Create Invoice';
            document.getElementById('invModalTitle').textContent = invId ? '🧾 Edit Invoice' : '🧾 New Invoice';

            // Populate customer and SO dropdowns
            const custSel = document.getElementById('invCustomer');
            custSel.innerHTML = '<option value="">Select Customer...</option>';
            DB.get('customers').forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.company + ' — ' + c.name;
                custSel.appendChild(opt);
            });

            const soSel = document.getElementById('invSoRef');
            soSel.innerHTML = '<option value="">— None —</option>';
            DB.get('salesOrders').forEach(so => {
                const opt = document.createElement('option');
                opt.value = so.id;
                opt.textContent = so.id + ' — ' + so.customer + ' — RM ' + (so.amount || 0).toLocaleString();
                soSel.appendChild(opt);
            });

            // Reset fields
            document.getElementById('invContact').value = '';
            document.getElementById('invEmail').value = '';
            document.getElementById('invPhone').value = '';
            document.getElementById('invWoRef').value = '';
            document.getElementById('invQtRef').value = '';
            document.getElementById('invDueDate').value = '';
            document.getElementById('invPoNumber').value = '';
            document.getElementById('invNotes').value = '';
            document.getElementById('invStatus').value = 'Unpaid';
            document.getElementById('invTaxPercent').value = '0';
            document.getElementById('invSubtotal').value = 'RM 0.00';
            document.getElementById('invTotal').value = 'RM 0.00';
            _invItemCount = 1;
            const tbody = document.getElementById('invItemsBody');
            tbody.innerHTML = `<tr>
                <td>1</td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="Item description" id="invItemDesc_0"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="1" min="1" id="invItemQty_0"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="0" min="0" step="0.01" id="invItemPrice_0" oninput="updateInvTotal()"></td>
                <td style="font-size:12px;font-weight:600;" id="invItemTotal_0">RM 0</td>
                <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updateInvTotal();">✕</button></td>
            </tr>`;

            if (invId) {
                const inv = DB.getById('invoices', invId);
                if (inv) {
                    // Set customer
                    const custOpt = Array.from(custSel.options).find(o => o.textContent.startsWith(inv.customer));
                    if (custOpt) custSel.value = custOpt.value;
                    // Set SO ref
                    if (inv.soRef) soSel.value = inv.soRef;

                    document.getElementById('invContact').value = inv.contact || '';
                    document.getElementById('invEmail').value = inv.email || '';
                    document.getElementById('invPhone').value = inv.phone || '';
                    document.getElementById('invWoRef').value = inv.woRef || '';
                    document.getElementById('invQtRef').value = inv.qtRef || '';
                    document.getElementById('invDueDate').value = inv.dueDate || '';
                    document.getElementById('invPoNumber').value = inv.poNumber || '';
                    document.getElementById('invNotes').value = inv.notes || '';
                    document.getElementById('invStatus').value = inv.status || 'Unpaid';
                    document.getElementById('invTaxPercent').value = inv.taxPercent || 0;

                    // Restore items
                    tbody.innerHTML = '';
                    _invItemCount = 0;
                    (inv.items || []).forEach((item, i) => {
                        const idx = _invItemCount++;
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${i + 1}</td>
                            <td><input type="text" class="form-control" style="font-size:11px;" placeholder="Item description" id="invItemDesc_${idx}" value="${item.description || ''}"></td>
                            <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="${item.qty || 1}" min="1" id="invItemQty_${idx}"></td>
                            <td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="${item.unitPrice || 0}" min="0" step="0.01" id="invItemPrice_${idx}" oninput="updateInvTotal()"></td>
                            <td style="font-size:12px;font-weight:600;" id="invItemTotal_${idx}">RM ${((item.qty||0)*(item.unitPrice||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                            <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updateInvTotal();">✕</button></td>
                        `;
                        tbody.appendChild(tr);
                    });
                    if (!inv.items || inv.items.length === 0) addInvItemRow();
                    updateInvTotal();

                    if (inv.email) document.getElementById('invEmailBtn').style.display = 'inline-flex';
                }
            }

            document.getElementById('invoiceModal').classList.add('active');
        }

        function openInvoiceModalFromQt(qtId) {
            const qt = DB.getById('quotations', qtId);
            if (!qt) { showToast('Quotation not found', 'error'); return; }

            document.getElementById('invEditId').value = '';
            document.getElementById('invFromQt').value = qtId;
            document.getElementById('invEmailBtn').style.display = 'none';
            document.getElementById('invSubmitBtn').textContent = '🧾 Create Invoice from Quotation';
            document.getElementById('invModalTitle').textContent = '🧾 New Invoice (from ' + qtId + ')';

            // Populate customer and SO dropdowns
            const custSel = document.getElementById('invCustomer');
            custSel.innerHTML = '<option value="">Select Customer...</option>';
            DB.get('customers').forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.company + ' — ' + c.name;
                custSel.appendChild(opt);
            });
            const custOpt = Array.from(custSel.options).find(o => o.textContent.startsWith(qt.customer));
            if (custOpt) custSel.value = custOpt.value;

            const soSel = document.getElementById('invSoRef');
            soSel.innerHTML = '<option value="">— None —</option>';
            DB.get('salesOrders').forEach(so => {
                const opt = document.createElement('option');
                opt.value = so.id;
                opt.textContent = so.id + ' — ' + so.customer;
                soSel.appendChild(opt);
            });

            // Pre-fill from quotation
            document.getElementById('invContact').value = qt.contact || '';
            document.getElementById('invEmail').value = qt.email || '';
            document.getElementById('invPhone').value = qt.phone || '';
            document.getElementById('invWoRef').value = qt.woRef || '';
            document.getElementById('invQtRef').value = qtId;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            document.getElementById('invDueDate').value = dueDate.toISOString().split('T')[0];
            document.getElementById('invPoNumber').value = '';
            document.getElementById('invNotes').value = qt.notes || '';
            document.getElementById('invStatus').value = 'Unpaid';
            document.getElementById('invTaxPercent').value = qt.taxPercent || 0;

            // Copy items from quotation
            const tbody = document.getElementById('invItemsBody');
            tbody.innerHTML = '';
            _invItemCount = 0;
            (qt.items || []).forEach((item, i) => {
                const idx = _invItemCount++;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${i + 1}</td>
                    <td><input type="text" class="form-control" style="font-size:11px;" placeholder="Item description" id="invItemDesc_${idx}" value="${item.description || ''}"></td>
                    <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="${item.qty || 1}" min="1" id="invItemQty_${idx}"></td>
                    <td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="${item.unitPrice || 0}" min="0" step="0.01" id="invItemPrice_${idx}" oninput="updateInvTotal()"></td>
                    <td style="font-size:12px;font-weight:600;" id="invItemTotal_${idx}">RM ${((item.qty||0)*(item.unitPrice||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                    <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updateInvTotal();">✕</button></td>
                `;
                tbody.appendChild(tr);
            });
            if (!qt.items || qt.items.length === 0) addInvItemRow();
            updateInvTotal();

            document.getElementById('invoiceModal').classList.add('active');
        }

        function openInvoiceModalFromWo(woId) {
            const wo = DB.getById('workOrders', woId);
            if (!wo) { showToast('Work Order not found', 'error'); return; }

            document.getElementById('invEditId').value = '';
            document.getElementById('invFromQt').value = '';
            document.getElementById('invEmailBtn').style.display = 'none';
            document.getElementById('invSubmitBtn').textContent = '🧾 Create Invoice from Work Order';
            document.getElementById('invModalTitle').textContent = '🧾 New Invoice (from ' + woId + ')';

            const custSel = document.getElementById('invCustomer');
            custSel.innerHTML = '<option value="">Select Customer...</option>';
            DB.get('customers').forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.company + ' — ' + c.name;
                custSel.appendChild(opt);
            });
            const custOpt = Array.from(custSel.options).find(o => o.textContent.startsWith(wo.client || wo.customer));
            if (custOpt) custSel.value = custOpt.value;

            const soSel = document.getElementById('invSoRef');
            soSel.innerHTML = '<option value="">— None —</option>';
            DB.get('salesOrders').forEach(so => {
                const opt = document.createElement('option');
                opt.value = so.id;
                opt.textContent = so.id + ' — ' + so.customer;
                soSel.appendChild(opt);
            });
            if (wo.woRef) {
                // Check if woRef is actually an SO ref
                if (DB.getById('salesOrders', wo.woRef)) soSel.value = wo.woRef;
            }

            document.getElementById('invContact').value = '';
            document.getElementById('invEmail').value = '';
            document.getElementById('invPhone').value = '';
            document.getElementById('invWoRef').value = woId;
            document.getElementById('invQtRef').value = '';
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            document.getElementById('invDueDate').value = dueDate.toISOString().split('T')[0];
            document.getElementById('invPoNumber').value = '';
            document.getElementById('invNotes').value = 'Invoice for completed work order: ' + (wo.title || woId);
            document.getElementById('invStatus').value = 'Unpaid';
            document.getElementById('invTaxPercent').value = '0';

            const tbody = document.getElementById('invItemsBody');
            tbody.innerHTML = '';
            _invItemCount = 0;
            const idx = _invItemCount++;
            tbody.innerHTML = `<tr>
                <td>1</td>
                <td><input type="text" class="form-control" style="font-size:11px;" placeholder="Item description" id="invItemDesc_${idx}" value="${wo.title || 'Work Order: ' + woId}"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:60px;" value="1" min="1" id="invItemQty_${idx}"></td>
                <td><input type="number" class="form-control" style="font-size:11px;width:100px;" value="0" min="0" step="0.01" id="invItemPrice_${idx}" oninput="updateInvTotal()"></td>
                <td style="font-size:12px;font-weight:600;" id="invItemTotal_${idx}">RM 0</td>
                <td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest('tr').remove();updateInvTotal();">✕</button></td>
            </tr>`;
            addInvItemRow();
            updateInvTotal();

            document.getElementById('invoiceModal').classList.add('active');
        }

        function viewInvoice(id) {
            openInvoiceModal(id);
        }

        function createInvoice() {
            const editId = document.getElementById('invEditId').value;
            const fromQt = document.getElementById('invFromQt').value;
            const customerSel = document.getElementById('invCustomer');
            const customerText = customerSel.options[customerSel.selectedIndex]?.textContent || '';
            const customer = customerText.split(' — ')[0] || customerText;
            if (!customer) { showToast('Please select a customer', 'error'); return; }

            const items = [];
            const tbody = document.getElementById('invItemsBody');
            tbody.querySelectorAll('tr').forEach(tr => {
                const desc = tr.querySelector('input[id^="invItemDesc_"]')?.value?.trim();
                const qty = parseFloat(tr.querySelector('input[id^="invItemQty_"]')?.value) || 0;
                const price = parseFloat(tr.querySelector('input[id^="invItemPrice_"]')?.value) || 0;
                if (desc) items.push({ description: desc, qty, unitPrice: price });
            });
            if (!items.length) { showToast('Add at least one item', 'error'); return; }

            const totals = updateInvTotal();
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];

            const inv = {
                customer,
                contact: document.getElementById('invContact').value,
                email: document.getElementById('invEmail').value,
                phone: document.getElementById('invPhone').value,
                soRef: document.getElementById('invSoRef').value || '',
                woRef: document.getElementById('invWoRef').value || '',
                qtRef: document.getElementById('invQtRef').value || '',
                items,
                amount: totals.subtotal,
                taxPercent: totals.taxPct,
                taxAmount: totals.taxAmt,
                total: totals.grandTotal,
                status: document.getElementById('invStatus').value,
                date: dateStr,
                dueDate: document.getElementById('invDueDate').value,
                paidDate: '',
                poNumber: document.getElementById('invPoNumber').value.trim(),
                notes: document.getElementById('invNotes').value.trim(),
                createdAt: dateStr
            };

            if (editId) {
                inv.id = editId;
                const existing = DB.getById('invoices', editId);
                if (existing) {
                    inv.createdAt = existing.createdAt;
                    inv.paidDate = existing.paidDate;
                }
                DB.update('invoices', editId, inv);
                showToast('✅ Invoice ' + editId + ' updated');
            } else {
                const year = now.getFullYear();
                const count = DB.get('invoices').length + 1;
                const id = 'INV-' + year + '-' + String(count).padStart(4, '0');
                inv.id = id;
                saveWithOwner('invoices', inv);

                // If created from a quotation, mark quotation as Converted and link it
                if (fromQt) {
                    DB.update('quotations', fromQt, { status: 'Converted', invRef: id });
                }

                showToast('✅ Invoice ' + id + ' created');
            }

            closeModal('invoiceModal');
            renderSales();
        }

        function markInvoicePaid(invId) {
            if (!confirm('Mark ' + invId + ' as PAID?')) return;
            const inv = DB.getById('invoices', invId);
            if (!inv) { showToast('Invoice not found', 'error'); return; }
            const paidDate = new Date().toISOString().split('T')[0];
            DB.update('invoices', invId, { status: 'Paid', paidDate: paidDate });
            showToast('✅ ' + invId + ' marked as Paid');

            // Also create accounting entry
            const year = new Date().getFullYear();
            const count = DB.get('accountingEntries').length + 1;
            saveWithOwner('accountingEntries', {
                id: 'GL-' + year + '-' + String(count).padStart(4, '0'),
                date: inv.paidDate,
                description: 'Payment received - ' + inv.customer + ' - ' + invId,
                debit: 0,
                credit: inv.total || inv.amount || 0,
                account: 'Revenue'
            });

            renderSales();
            renderAccounting();
        }

        function sendInvoiceEmail(invId) {
            const inv = invId ? DB.getById('invoices', invId) : null;
            if (!inv && invId) { showToast('Invoice not found', 'error'); return; }
            if (!inv) {
                const email = document.getElementById('invEmail').value;
                if (!email) { showToast('No email address for this customer', 'error'); return; }
                const tbody = document.getElementById('invItemsBody');
                let itemsHtml = '', itemsText = '';
                tbody.querySelectorAll('tr').forEach((tr, i) => {
                    const desc = tr.querySelector('input[id^="invItemDesc_"]')?.value?.trim() || 'Item ' + (i+1);
                    const qty = parseFloat(tr.querySelector('input[id^="invItemQty_"]')?.value) || 0;
                    const price = parseFloat(tr.querySelector('input[id^="invItemPrice_"]')?.value) || 0;
                    const total = qty * price;
                    itemsHtml += `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${desc}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center;">${qty}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">RM ${price.toLocaleString(undefined,{minFrac:2,maxFrac:2})}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">RM ${total.toLocaleString(undefined,{minFrac:2,maxFrac:2})}</td></tr>`;
                    itemsText += `  ${desc}  x${qty}  @ RM ${price.toLocaleString(undefined,{minFrac:2,maxFrac:2})}  =  RM ${total.toLocaleString(undefined,{minFrac:2,maxFrac:2})}\n`;
                });
                const grandTotal = document.getElementById('invTotal').value;
                const contact = document.getElementById('invContact').value || 'Customer';
                const invNum = document.getElementById('invEditId').value || '(new)';
                const subject = 'Invoice: ' + invNum;
                const htmlPreview = buildEmailHtml('Invoice', subject, contact, itemsHtml, grandTotal, document.getElementById('invNotes').value, document.getElementById('invDueDate').value);
                const emailBodyText = 'Dear ' + contact + ',\n\nPlease find our invoice below.\n\n' + subject + '\n\n' + itemsText + '\nGrand Total: ' + grandTotal + '\nDue Date: ' + (document.getElementById('invDueDate').value || 'Upon receipt') + '\n\n' + (document.getElementById('invNotes').value ? 'Notes: ' + document.getElementById('invNotes').value + '\n\n' : '') + 'Thank you for your business.\n\nBest regards,\nBilling Team';
                openEmailCompose(email, subject, emailBodyText, htmlPreview);
                return;
            }
            if (!inv.email) { showToast('No email address for this customer', 'error'); return; }
            openInvoiceEmailCompose(inv);
        }

        // ===== ACCOUNTING RENDERING =====

        function deleteAccountingEntry(entryId){
            if(!confirm('Delete accounting entry '+entryId+'?'))return;
            DB.delete('accountingEntries',entryId);
            renderAccounting();
            showToast('🗑️ Entry '+entryId+' deleted');
        }

        function renderAccounting() {
            const entries = DB.get('accountingEntries');
            const tbody = document.getElementById('accountingTable');
            if (!tbody) return;
            tbody.innerHTML = entries.length
                ? entries.map(e => `
                    <tr>
                        <td><strong>${e.id}</strong></td>
                        <td>${e.date || '—'}</td>
                        <td>${e.description || '—'}</td>
                        <td>${e.account || '—'}</td>
                        <td>${e.debit ? 'RM ' + e.debit.toLocaleString() : '—'}</td>
                        <td>${e.credit ? 'RM ' + e.credit.toLocaleString() : '—'}</td>
                        <td><button class="btn btn-xs btn-danger" onclick="deleteAccountingEntry('${e.id}')">🗑️</button></td>
                    </tr>`).join('')
                : '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No entries yet</td></tr>';
        }

        // ===== SEED DEMO PROJECT =====

        function seedDemoProject() {
            if (!confirm('This will create sample data for the full lifecycle: Sales → Work Order → Fabrication → Design → Quality → Billing/Accounting. Continue?')) return;

            const now = new Date();
            const today = now.toISOString().split('T')[0];

            // 1. Ensure Petronas customer exists
            let cust = DB.get('customers').find(c => c.company === 'Petronas');
            if (!cust) {
                cust = {
                    id: 'CUST-006',
                    name: 'Ahmad Faizal',
                    company: 'Petronas',
                    email: 'afaizal@petronas.com.my',
                    phone: '+60-3-1234-5678',
                    address: 'Kerteh, Terengganu',
                    type: 'Corporate',
                    status: 'Active',
                    since: today
                };
                saveWithOwner('customers', cust);
            }

            // 2. Sales Order
            const soId = 'SO-2026-0001';
            let so = DB.getById('salesOrders', soId);
            if (!so) {
                so = {
                    id: soId,
                    customer: 'Petronas',
                    contact: 'Ahmad Faizal',
                    email: 'afaizal@petronas.com.my',
                    phone: '+60-3-1234-5678',
                    equipment: 'Vertical Air Receiver SK-304',
                    description: 'Design, fabrication, and supply of vertical air receiver vessel. ASME Section VIII Div.1 stamped.',
                    amount: 450000,
                    status: 'Completed',
                    woRef: 'WO-2026-0001',
                    createdAt: today,
                    createdBy: 'Sales Team',
                    designPressure: '12.5',
                    designTemperature: '150',
                    shellHeadMaterial: 'SA-516 Gr.70',
                    headType: '2:1 Ellipsoidal',
                    testingRequirement: 'Hydrostatic @ 18.8 bar'
                };
                saveWithOwner('salesOrders', so);
            }

            // 3. Work Order
            const woId = 'WO-2026-0001';
            let wo = DB.getById('workOrders', woId);
            if (!wo) {
                wo = {
                    id: woId,
                    workCategory: 'fab',
                    codeRef: 'ASME Section VIII, Div 1',
                    type: 'Standard',
                    status: 'In Progress',
                    priority: 'High',
                    raisedBy: 'Ahmad Faizal',
                    raisedDate: today + ' 09:00:00',
                    dueDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
                    title: 'Vertical Air Receiver SK-304',
                    client: 'Petronas',
                    site: 'Kerteh, Terengganu',
                    description: 'Design, fabricate and supply ASME stamped vertical air receiver',
                    reason: 'New pressure vessel required for instrument air system',
                    attachments: '',
                    documents: [],
                    designPressure: '12.5',
                    designTemperature: '150',
                    shellHeadMaterial: 'SA-516 Gr.70',
                    headType: '2:1 Ellipsoidal',
                    testingRequirement: 'Hydrostatic @ 18.8 bar',
                    drawingRef: 'DW-304-REV-A',
                    equipment: 'Vertical Air Receiver SK-304',
                    assetTag: 'V-304',
                    trade: 'Fabrication',
                    laborHours: 120,
                    branch: 'fab',
                    fabType: 'pressure',
                    fabDesignCode: 'ASME VIII Div.1',
                    fabTraceability: 'Full',
                    fabHoldPoints: 'NDT, Hydrotest',
                    designStatus: 'Approved',
                    designSubmittedDate: today,
                    designApprovedDate: today,
                    approvals: [
                        { step: 0, role: 'Design Engineer', action: 'Submit drawing', status: 'Completed' },
                        { step: '0a', role: 'DOSH / Third Party', action: 'Review and approve drawing', status: 'Completed' },
                        { step: '0b', role: 'QC Manager', action: 'Verify approval document', status: 'Completed' },
                        { step: 1, role: 'Requester', action: 'Submit Work Order', status: 'Completed' },
                        { step: 2, role: 'Engineering Manager', action: 'Verify scope & drawing', status: 'Completed' },
                        { step: 3, role: 'Production Planner', action: 'Assign branch', status: 'Completed' },
                    ],
                    certifications: ['ASME IX', 'CoC'],
                    woRef: soId,
                    createdAt: today
                };
                saveWithOwner('workOrders', wo);
            }

            // 4. Fabrication Order
            const foId = 'FO-2026-0001';
            let fo = DB.getById('fabOrders', foId);
            if (!fo) {
                fo = {
                    id: foId,
                    type: 'Pressure Vessel',
                    product: 'Vertical Air Receiver SK-304',
                    quantity: 1,
                    startDate: today,
                    endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
                    shop: 'Bay 2 - Heavy Fab',
                    customer: 'Petronas',
                    poRef: '',
                    woRef: woId,
                    drawingSpec: 'DW-304-REV-A',
                    materialList: 'SA-516 Gr.70',
                    wps: 'WPS-001 Rev.B',
                    pqr: 'PQR-001 Rev.A',
                    wqt: 'WQT-001 Rev.A',
                    wpsPqr: 'WPS-001 Rev.B / PQR-001 Rev.A',
                    ndtRequirements: 'RT per UW-51 / UT per UW-53',
                    deliveryDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
                    status: 'In Progress',
                    notes: 'Demo project - fabrication in progress',
                    bom: [
                        { item: 10, component: 'Shell Plate SA-516 Gr.70', spec: '30mm x 2500mm x 8000mm', qty: 1, source: 'Warehouse', backflush: false, issue: true },
                        { item: 20, component: 'Dished Ends 2:1 Ellipsoidal', spec: 'DN1200 x 30mm', qty: 2, source: 'Subcontractor', backflush: false, issue: true },
                        { item: 30, component: 'Nozzles & Fittings', spec: 'Per DW-304', qty: 1, source: 'Warehouse', backflush: false, issue: true },
                    ],
                    routing: [
                        { step: '010', workCenter: 'Plate Cutting', description: 'CNC Plasma cut shell', stdHours: 2.0 },
                        { step: '020', workCenter: 'Rolling', description: '3-roll initial pinch', stdHours: 1.5 },
                        { step: '030', workCenter: 'Fit-up', description: 'Tack weld shell to ends', stdHours: 3.0 },
                        { step: '040', workCenter: 'Welding', description: 'SAW seam weld', stdHours: 5.0 },
                        { step: '050', workCenter: 'NDT', description: 'RT / UT per spec', stdHours: 2.0 },
                        { step: '060', workCenter: 'Hydrotest', description: 'Hydrostatic @ 18.8 bar', stdHours: 2.0 },
                        { step: '070', workCenter: 'Blasting/Painting', description: 'Epoxy coating', stdHours: 3.0 },
                    ],
                    labor: { primaryWelder: 'Ali bin Hassan', inspectionHolds: ['Step 050 (NDT)', 'Step 060 (Hydrotest)'] },
                    subOrders: [],
                    documents: [
                        { name: 'DW-304-REV-A.pdf', uploaded: true },
                        { name: 'WPS-001-REV-B.pdf', uploaded: true },
                        { name: 'PQR-001-REV-A.pdf', uploaded: true },
                    ],
                    createdAt: today
                };
                saveWithOwner('fabOrders', fo);
            }

            // 5. Purchase Requisition
            const prId = 'PR-2026-0001';
            let pr = DB.getById('purchaseRequisitions', prId);
            if (!pr) {
                pr = {
                    id: prId,
                    woRef: woId,
                    items: [
                        { item: 1, material: 'SA-516 Gr.70 Plate', spec: '30mm x 2500mm x 8000mm', qty: 2, unit: 'pcs' },
                        { item: 2, material: 'Dished Ends 2:1 Ellipsoidal', spec: 'DN1200 x 30mm', qty: 2, unit: 'pcs' },
                        { item: 3, material: 'Welding Consumables', spec: 'E7018 / ER70S-6', qty: 1, unit: 'set' },
                    ],
                    supplier: 'Steel Supply Sdn Bhd',
                    estCost: 185000,
                    status: 'Approved',
                    createdAt: today,
                    requestedBy: 'Ahmad Faizal'
                };
                saveWithOwner('purchaseRequisitions', pr);
            }

            // 6. Quality Inspections
            const ins1Id = 'INS-2026-0001';
            if (!DB.getById('inspections', ins1Id)) {
                saveWithOwner('inspections', {
                    id: ins1Id, wo: woId, type: 'Visual Inspection',
                    inspector: 'QC Inspector', date: today,
                    result: 'Passed', cert: 'CERT-001.pdf',
                    traceability: 'Lot trace verified → WO-' + woId
                });
            }
            const ins2Id = 'INS-2026-0002';
            if (!DB.getById('inspections', ins2Id)) {
                saveWithOwner('inspections', {
                    id: ins2Id, wo: woId, type: 'Hydrostatic Test',
                    inspector: 'QC Inspector', date: today,
                    result: 'Passed', cert: 'CERT-002.pdf',
                    traceability: 'Hydrotest @ 18.8 bar verified → WO-' + woId
                });
            }
            const ins3Id = 'INS-2026-0003';
            if (!DB.getById('inspections', ins3Id)) {
                saveWithOwner('inspections', {
                    id: ins3Id, wo: woId, type: 'NDT (RT/UT)',
                    inspector: 'NDT Level II', date: today,
                    result: 'Passed', cert: 'CERT-003.pdf',
                    traceability: 'RT UW-51 / UT UW-53 verified → WO-' + woId
                });
            }

            // 7. Quotation (accepted → convertible to invoice)
            const qtId = 'QT-2026-0001';
            if (!DB.getById('quotations', qtId)) {
                saveWithOwner('quotations', {
                    id: qtId,
                    customer: 'Petronas',
                    contact: 'Ahmad Faizal',
                    email: 'afaizal@petronas.com.my',
                    phone: '+60-3-1234-5678',
                    subject: 'Vertical Air Receiver SK-304',
                    description: 'Design, fabrication, and supply of vertical air receiver vessel.',
                    items: [
                        { description: 'Air Receiver Vessel SK-304', qty: 1, unitPrice: 380000 },
                        { description: 'Installation & Commissioning', qty: 1, unitPrice: 45000 },
                        { description: 'NDT & Hydrostatic Testing', qty: 1, unitPrice: 25000 }
                    ],
                    subtotal: 450000,
                    taxPercent: 0,
                    taxAmount: 0,
                    total: 450000,
                    status: 'Accepted',
                    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                    woRef: woId,
                    invRef: '',
                    notes: 'Payment terms: 30% deposit, 70% on delivery',
                    createdAt: today,
                    createdBy: 'Sales Team'
                });
            }

            // 8. Invoice
            const invId = 'INV-2026-0001';
            if (!DB.getById('invoices', invId)) {
                saveWithOwner('invoices', {
                    id: invId,
                    customer: 'Petronas',
                    contact: 'Ahmad Faizal',
                    email: 'afaizal@petronas.com.my',
                    phone: '+60-3-1234-5678',
                    soRef: soId,
                    woRef: woId,
                    qtRef: qtId,
                    items: [
                        { description: 'Air Receiver Vessel SK-304 - Fabrication', qty: 1, unitPrice: 380000 },
                        { description: 'Installation & Commissioning', qty: 1, unitPrice: 45000 },
                        { description: 'NDT & Hydrostatic Testing', qty: 1, unitPrice: 25000 }
                    ],
                    amount: 450000,
                    taxPercent: 0,
                    taxAmount: 0,
                    total: 450000,
                    status: 'Paid',
                    date: today,
                    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                    paidDate: today,
                    poNumber: 'PO-2026-0451',
                    notes: '',
                    createdAt: today
                });
                // Also update quotation to mark as converted
                DB.update('quotations', qtId, { invRef: invId, status: 'Converted' });
            }

            // 9. Accounting Entries
            if (DB.get('accountingEntries').length === 0) {
                saveWithOwner('accountingEntries', {
                    id: 'GL-2026-0001', date: today,
                    description: 'Invoice INV-2026-0001 - Air Receiver SK-304',
                    debit: 450000, credit: 0, account: 'Accounts Receivable'
                });
                saveWithOwner('accountingEntries', {
                    id: 'GL-2026-0002', date: today,
                    description: 'Payment received - Petronas - INV-2026-0001',
                    debit: 0, credit: 450000, account: 'Revenue'
                });
                saveWithOwner('accountingEntries', {
                    id: 'GL-2026-0003', date: today,
                    description: 'Material cost - SA-516 Gr.70 Plate',
                    debit: 0, credit: 185000, account: 'Inventory / COGS'
                });
            }

            // Refresh everything
            refreshAll();
            renderInvoices();
            renderAccounting();
            showToast('✅ Demo project loaded — Sales → WO → Fab → Design → Quality → Billing → Accounting');
        }

        // ===== SALES ORDER MATERIAL ADD-STEP FUNCTIONS =====

        let _soNozzleItems = [];
        let _soFlangeItems = [];
        let _soSvItems = [];
        let _soBoilerTubeItems = [];
        let _soNpPlateItems = [];
        let _soNpAngleItems = [];
        let _soNpFlatItems = [];
        let _soNpBeamItems = [];

        function renderSoNozzleList() {
            const el = document.getElementById('soNozzleList');
            if (!el) return;
            el.innerHTML = _soNozzleItems.length
                ? '<table style="width:100%;font-size:12px;margin-top:4px;"><tr style="background:var(--primary);"><th style="padding:4px 6px;">Size</th><th style="padding:4px 6px;">Qty</th><th style="padding:4px 6px;">Material</th><th style="padding:4px 6px;width:50px;"></th></tr>' +
                  _soNozzleItems.map((n, i) => '<tr><td style="padding:3px 6px;">' + n.size + '</td><td style="padding:3px 6px;">' + n.qty + '</td><td style="padding:3px 6px;">' + n.mat + '</td><td style="padding:3px 6px;"><button class="btn btn-xs btn-danger" onclick="_soNozzleItems.splice(' + i + ',1);renderSoNozzleList();">✕</button></td></tr>').join('') +
                  '</table>'
                : '<div style="font-size:11px;color:var(--text-muted);padding:4px 0;">No nozzle items added yet.</div>';
        }

        function addSoNozzleItem() {
            const size = document.getElementById('soNozzleSize').value;
            const qty = parseInt(document.getElementById('soNozzleQty').value) || 1;
            const mat = document.getElementById('soNozzleMat').value;
            if (!size) { showToast('Please select a nozzle size', 'error'); return; }
            if (!mat) { showToast('Please select neck material', 'error'); return; }
            _soNozzleItems.push({ size, qty, mat });
            renderSoNozzleList();
            document.getElementById('soNozzleSize').value = '';
            document.getElementById('soNozzleQty').value = '1';
            document.getElementById('soNozzleMat').value = '';
        }

        function renderSoFlangeList() {
            const el = document.getElementById('soFlangeList');
            if (!el) return;
            el.innerHTML = _soFlangeItems.length
                ? '<table style="width:100%;font-size:12px;margin-top:4px;"><tr style="background:var(--primary);"><th style="padding:4px 6px;">Type</th><th style="padding:4px 6px;">Size</th><th style="padding:4px 6px;width:50px;"></th></tr>' +
                  _soFlangeItems.map((f, i) => '<tr><td style="padding:3px 6px;">' + f.type + '</td><td style="padding:3px 6px;">' + f.size + '</td><td style="padding:3px 6px;"><button class="btn btn-xs btn-danger" onclick="_soFlangeItems.splice(' + i + ',1);renderSoFlangeList();">✕</button></td></tr>').join('') +
                  '</table>'
                : '<div style="font-size:11px;color:var(--text-muted);padding:4px 0;">No flange items added yet.</div>';
        }

        function addSoFlangeItem() {
            const type = document.getElementById('soFlangeType').value;
            const size = document.getElementById('soFlangeSize').value;
            if (!type) { showToast('Please select flange type', 'error'); return; }
            if (!size) { showToast('Please select flange size', 'error'); return; }
            _soFlangeItems.push({ type, size });
            renderSoFlangeList();
            document.getElementById('soFlangeType').value = '';
            document.getElementById('soFlangeSize').value = '';
        }

        function renderSoSvList() {
            const el = document.getElementById('soSvList');
            if (!el) return;
            el.innerHTML = _soSvItems.length
                ? '<table style="width:100%;font-size:12px;margin-top:4px;"><tr style="background:var(--primary);"><th style="padding:4px 6px;">Model</th><th style="padding:4px 6px;">Size</th><th style="padding:4px 6px;width:50px;"></th></tr>' +
                  _soSvItems.map((v, i) => '<tr><td style="padding:3px 6px;">' + v.model + '</td><td style="padding:3px 6px;">' + v.size + '</td><td style="padding:3px 6px;"><button class="btn btn-xs btn-danger" onclick="_soSvItems.splice(' + i + ',1);renderSoSvList();">✕</button></td></tr>').join('') +
                  '</table>'
                : '<div style="font-size:11px;color:var(--text-muted);padding:4px 0;">No safety valves added yet.</div>';
        }

        function addSoSvItem() {
            const model = document.getElementById('soSvModel').value.trim();
            const size = document.getElementById('soSvSize').value;
            if (!model) { showToast('Please enter valve type/model', 'error'); return; }
            if (!size) { showToast('Please select valve size', 'error'); return; }
            _soSvItems.push({ model, size });
            renderSoSvList();
            document.getElementById('soSvModel').value = '';
            document.getElementById('soSvSize').value = '';
        }

        function renderSoBoilerTubeList() {
            const el = document.getElementById('soBoilerTubeList');
            if (!el) return;
            el.innerHTML = _soBoilerTubeItems.length
                ? '<table style="width:100%;font-size:12px;margin-top:4px;"><tr style="background:var(--primary);"><th style="padding:4px 6px;">Spec</th><th style="padding:4px 6px;">Size</th><th style="padding:4px 6px;">Qty</th><th style="padding:4px 6px;width:50px;"></th></tr>' +
                  _soBoilerTubeItems.map((b, i) => '<tr><td style="padding:3px 6px;">' + b.spec + '</td><td style="padding:3px 6px;">' + b.size + '</td><td style="padding:3px 6px;">' + b.qty + '</td><td style="padding:3px 6px;"><button class="btn btn-xs btn-danger" onclick="_soBoilerTubeItems.splice(' + i + ',1);renderSoBoilerTubeList();">✕</button></td></tr>').join('') +
                  '</table>'
                : '<div style="font-size:11px;color:var(--text-muted);padding:4px 0;">No boiler tubes added yet.</div>';
        }

        function addSoBoilerTubeItem() {
            const spec = document.getElementById('soBoilerTubeSpec').value;
            const size = document.getElementById('soBoilerTubeSize').value.trim();
            const qty = parseInt(document.getElementById('soBoilerTubeQty').value) || 1;
            if (!spec) { showToast('Please select tube specification', 'error'); return; }
            if (!size) { showToast('Please enter tube size', 'error'); return; }
            _soBoilerTubeItems.push({ spec, size, qty });
            renderSoBoilerTubeList();
            document.getElementById('soBoilerTubeSize').value = '';
            document.getElementById('soBoilerTubeQty').value = '1';
        }

        // ===== NON-PRESSURE MATERIAL ADD-STEP =====

        function renderSoNpPlateList() {
            const el = document.getElementById('soNpPlateList');
            if (!el) return;
            el.innerHTML = _soNpPlateItems.length
                ? '<table style="width:100%;font-size:12px;margin-top:2px;"><tr style="background:var(--primary);"><th style="padding:2px 6px;">Size</th><th style="padding:2px 6px;">Spec</th><th style="padding:2px 6px;">Qty</th><th style="padding:2px 6px;width:40px;"></th></tr>' +
                  _soNpPlateItems.map((x, i) => '<tr><td style="padding:2px 6px;">' + x.size + '</td><td style="padding:2px 6px;">' + x.spec + '</td><td style="padding:2px 6px;">' + x.qty + '</td><td style="padding:2px 6px;"><button class="btn btn-xs btn-danger" onclick="_soNpPlateItems.splice(' + i + ',1);renderSoNpPlateList();">✕</button></td></tr>').join('') +
                  '</table>' : '<div style="font-size:11px;color:var(--text-muted);padding:2px 0;">None added</div>';
        }
        function addSoNpPlateItem() {
            const size = document.getElementById('soNpPlateSize').value.trim();
            const spec = document.getElementById('soNpPlateSpec').value.trim();
            const qty = parseInt(document.getElementById('soNpPlateQty').value) || 1;
            if (!size || !spec) { showToast('Please enter plate size and specification', 'error'); return; }
            _soNpPlateItems.push({ size, spec, qty });
            renderSoNpPlateList();
            document.getElementById('soNpPlateSize').value = ''; document.getElementById('soNpPlateSpec').value = ''; document.getElementById('soNpPlateQty').value = '1';
        }

        function renderSoNpAngleList() {
            const el = document.getElementById('soNpAngleList');
            if (!el) return;
            el.innerHTML = _soNpAngleItems.length
                ? '<table style="width:100%;font-size:12px;margin-top:2px;"><tr style="background:var(--primary);"><th style="padding:2px 6px;">Size</th><th style="padding:2px 6px;">Spec</th><th style="padding:2px 6px;">Qty</th><th style="padding:2px 6px;width:40px;"></th></tr>' +
                  _soNpAngleItems.map((x, i) => '<tr><td style="padding:2px 6px;">' + x.size + '</td><td style="padding:2px 6px;">' + x.spec + '</td><td style="padding:2px 6px;">' + x.qty + '</td><td style="padding:2px 6px;"><button class="btn btn-xs btn-danger" onclick="_soNpAngleItems.splice(' + i + ',1);renderSoNpAngleList();">✕</button></td></tr>').join('') +
                  '</table>' : '<div style="font-size:11px;color:var(--text-muted);padding:2px 0;">None added</div>';
        }
        function addSoNpAngleItem() {
            const size = document.getElementById('soNpAngleSize').value.trim();
            const spec = document.getElementById('soNpAngleSpec').value.trim();
            const qty = parseInt(document.getElementById('soNpAngleQty').value) || 1;
            if (!size || !spec) { showToast('Please enter angle bar size and specification', 'error'); return; }
            _soNpAngleItems.push({ size, spec, qty });
            renderSoNpAngleList();
            document.getElementById('soNpAngleSize').value = ''; document.getElementById('soNpAngleSpec').value = ''; document.getElementById('soNpAngleQty').value = '1';
        }

        function renderSoNpFlatList() {
            const el = document.getElementById('soNpFlatList');
            if (!el) return;
            el.innerHTML = _soNpFlatItems.length
                ? '<table style="width:100%;font-size:12px;margin-top:2px;"><tr style="background:var(--primary);"><th style="padding:2px 6px;">Size</th><th style="padding:2px 6px;">Spec</th><th style="padding:2px 6px;">Qty</th><th style="padding:2px 6px;width:40px;"></th></tr>' +
                  _soNpFlatItems.map((x, i) => '<tr><td style="padding:2px 6px;">' + x.size + '</td><td style="padding:2px 6px;">' + x.spec + '</td><td style="padding:2px 6px;">' + x.qty + '</td><td style="padding:2px 6px;"><button class="btn btn-xs btn-danger" onclick="_soNpFlatItems.splice(' + i + ',1);renderSoNpFlatList();">✕</button></td></tr>').join('') +
                  '</table>' : '<div style="font-size:11px;color:var(--text-muted);padding:2px 0;">None added</div>';
        }
        function addSoNpFlatItem() {
            const size = document.getElementById('soNpFlatSize').value.trim();
            const spec = document.getElementById('soNpFlatSpec').value.trim();
            const qty = parseInt(document.getElementById('soNpFlatQty').value) || 1;
            if (!size || !spec) { showToast('Please enter flat bar size and specification', 'error'); return; }
            _soNpFlatItems.push({ size, spec, qty });
            renderSoNpFlatList();
            document.getElementById('soNpFlatSize').value = ''; document.getElementById('soNpFlatSpec').value = ''; document.getElementById('soNpFlatQty').value = '1';
        }

        function renderSoNpBeamList() {
            const el = document.getElementById('soNpBeamList');
            if (!el) return;
            el.innerHTML = _soNpBeamItems.length
                ? '<table style="width:100%;font-size:12px;margin-top:2px;"><tr style="background:var(--primary);"><th style="padding:2px 6px;">Size</th><th style="padding:2px 6px;">Spec</th><th style="padding:2px 6px;">Qty</th><th style="padding:2px 6px;width:40px;"></th></tr>' +
                  _soNpBeamItems.map((x, i) => '<tr><td style="padding:2px 6px;">' + x.size + '</td><td style="padding:2px 6px;">' + x.spec + '</td><td style="padding:2px 6px;">' + x.qty + '</td><td style="padding:2px 6px;"><button class="btn btn-xs btn-danger" onclick="_soNpBeamItems.splice(' + i + ',1);renderSoNpBeamList();">✕</button></td></tr>').join('') +
                  '</table>' : '<div style="font-size:11px;color:var(--text-muted);padding:2px 0;">None added</div>';
        }
        function addSoNpBeamItem() {
            const size = document.getElementById('soNpBeamSize').value.trim();
            const spec = document.getElementById('soNpBeamSpec').value.trim();
            const qty = parseInt(document.getElementById('soNpBeamQty').value) || 1;
            if (!size || !spec) { showToast('Please enter beam size and specification', 'error'); return; }
            _soNpBeamItems.push({ size, spec, qty });
            renderSoNpBeamList();
            document.getElementById('soNpBeamSize').value = ''; document.getElementById('soNpBeamSpec').value = ''; document.getElementById('soNpBeamQty').value = '1';
        }

        // ===== ENHANCED WORK ORDER FUNCTIONS =====

function addWoBomRow() {
    const tbody = document.getElementById('woBomTable');
    const idx = tbody.children.length + 1;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="form-control" value="${idx * 10}" style="width:45px;padding:3px 5px;font-size:11px;"></td>
        <td><input type="text" class="form-control" placeholder="Component" style="font-size:11px;padding:4px 6px;"></td>
        <td><input type="text" class="form-control" placeholder="Spec" style="font-size:11px;padding:4px 6px;"></td>
        <td><input type="number" class="form-control" value="1" min="1" style="width:50px;padding:3px 5px;font-size:11px;"></td>
        <td><input type="text" class="form-control" placeholder="Source" style="font-size:11px;padding:4px 6px;"></td>
        <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()" style="color:#dc2626;">✕</button></td>
    `;
    tbody.appendChild(row);
}

function addWoRoutingRow() {
    const tbody = document.getElementById('woRoutingTable');
    const idx = tbody.children.length + 1;
    const stepNum = String(idx * 10).padStart(3, '0');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="form-control" value="${stepNum}" style="width:45px;padding:3px 5px;font-size:11px;"></td>
        <td><select class="form-control" style="font-size:11px;padding:3px 5px;"><option>Plate Cutting</option><option>Rolling</option><option>Fit-up</option><option>Welding</option><option>NDT</option><option>Hydrotest</option><option>Blasting/Painting</option></select></td>
        <td><input type="text" class="form-control" placeholder="Description" style="font-size:11px;padding:4px 6px;"></td>
        <td><input type="number" class="form-control" value="1.5" step="0.5" style="width:55px;padding:3px 5px;font-size:11px;"></td>
        <td><button class="btn btn-xs btn-ghost" onclick="this.closest('tr').remove()" style="color:#dc2626;">✕</button></td>
    `;
    tbody.appendChild(row);
}

// ========================================================================
//  TONNES CALCULATOR
// ========================================================================
var _tcalcLastResult = null;

var electrodePriceData = [
    { grade: "E 6013",   type: "Carbon Steel",      rmPerKg: 8.50 },
    { grade: "E 7016",   type: "Carbon Steel",      rmPerKg: 10.00 },
    { grade: "E 7018",   type: "Carbon Steel",      rmPerKg: 12.00 },
    { grade: "308-16",   type: "Stainless 308",     rmPerKg: 72.00, usdPacks: [{size:"3/32",lb:1,usd:9.95},{size:"3/32",lb:8,usd:58.00},{size:"3/32",lb:10,usd:72.50},{size:"1/8",lb:1,usd:9.95},{size:"1/8",lb:10,usd:65.00},{size:"5/32",lb:1,usd:9.95},{size:"5/32",lb:10,usd:65.00}] },
    { grade: "308L-16",  type: "Stainless 308L",    rmPerKg: 80.00, usdPacks: [{size:"3/32",lb:1,usd:11.95},{size:"3/32",lb:8,usd:65.00},{size:"3/32",lb:10,usd:81.25},{size:"1/8",lb:1,usd:11.95},{size:"1/8",lb:10,usd:68.00},{size:"5/32",lb:1,usd:11.95},{size:"5/32",lb:10,usd:68.00}] },
    { grade: "309-16",   type: "Stainless 309",     rmPerKg: 84.00, usdPacks: [{size:"1/16",lb:1,usd:14.95},{size:"3/32",lb:1,usd:10.95},{size:"3/32",lb:8,usd:68.00},{size:"3/32",lb:10,usd:85.00},{size:"1/8",lb:1,usd:10.95},{size:"1/8",lb:10,usd:69.50},{size:"5/32",lb:1,usd:10.95},{size:"5/32",lb:10,usd:69.50}] },
    { grade: "309L-16",  type: "Stainless 309L",    rmPerKg: 85.00, usdPacks: [{size:"3/32",lb:1,usd:12.95},{size:"3/32",lb:8,usd:69.00},{size:"3/32",lb:10,usd:86.25},{size:"1/8",lb:1,usd:11.95},{size:"1/8",lb:10,usd:80.00},{size:"5/32",lb:1,usd:11.95},{size:"5/32",lb:10,usd:80.00}] }
];

var plateMaterialData = [
    { grade: "SA516 Gr.70",  std: "ASME",  type: "Carbon Steel", density: 7850 },
    { grade: "SA283 Gr.C",   std: "ASME",  type: "Carbon Steel", density: 7850 },
    { grade: "SA36",         std: "ASME",  type: "Carbon Steel", density: 7850 },
    { grade: "SS400",        std: "JIS G3101", type: "Mild Steel", density: 7850 },
    { grade: "S275JR",       std: "EN10025", type: "Carbon Steel", density: 7850 },
    { grade: "SA240 Gr.304", std: "ASME",  type: "Stainless Steel", density: 7930 },
    { grade: "SA240 Gr.316", std: "ASME",  type: "Stainless Steel", density: 7980 }
];

var flangeDensityMap = { GCI: 7200, Cu: 8300, CFS: 7850, DCI: 7200 };

var pipeNpsData = [
    { nps: '15mm (1/2")', od: 21.3 }, { nps: '20mm (3/4")', od: 26.7 }, { nps: '25mm (1")', od: 33.4 },
    { nps: '32mm (1-1/4")', od: 42.2 }, { nps: '40mm (1-1/2")', od: 48.3 }, { nps: '50mm (2")', od: 60.3 },
    { nps: '65mm (2-1/2")', od: 73.0 }, { nps: '80mm (3")', od: 88.9 }, { nps: '100mm (4")', od: 114.3 },
    { nps: '125mm (5")', od: 141.3 }, { nps: '150mm (6")', od: 168.3 }, { nps: '200mm (8")', od: 219.1 },
    { nps: '250mm (10")', od: 273.0 }, { nps: '300mm (12")', od: 323.8 }, { nps: '350mm (14")', od: 355.6 },
    { nps: '400mm (16")', od: 406.4 }, { nps: '450mm (18")', od: 457.0 }, { nps: '500mm (20")', od: 508.0 },
    { nps: '600mm (24")', od: 610.0 }
];

var pipeSchData = {
    '15mm (1/2")':  { Sch5:1.6, Sch10:2.0, Sch40:2.8, Sch80:3.7, Sch160:4.8 },
    '20mm (3/4")':  { Sch5:1.6, Sch10:2.0, Sch40:2.9, Sch80:3.9, Sch160:5.1 },
    '25mm (1")':    { Sch5:1.6, Sch10:2.2, Sch40:3.4, Sch80:4.5, Sch160:6.4 },
    '32mm (1-1/4")':{ Sch5:1.6, Sch10:2.3, Sch40:3.6, Sch80:4.9, Sch160:6.4 },
    '40mm (1-1/2")':{ Sch5:1.8, Sch10:2.4, Sch40:3.7, Sch80:5.1, Sch160:7.1 },
    '50mm (2")':    { Sch5:1.8, Sch10:2.8, Sch40:3.9, Sch80:5.5, Sch160:8.7 },
    '65mm (2-1/2")':{ Sch5:2.0, Sch10:3.0, Sch40:5.2, Sch80:7.0, Sch160:9.7 },
    '80mm (3")':    { Sch5:2.1, Sch10:3.0, Sch40:5.5, Sch80:7.6, Sch160:11.1 },
    '100mm (4")':   { Sch5:2.1, Sch10:3.0, Sch40:6.0, Sch80:8.6, Sch160:13.5 },
    '125mm (5")':   { Sch5:2.2, Sch10:3.4, Sch40:6.5, Sch80:9.5, Sch160:15.9 },
    '150mm (6")':   { Sch5:2.2, Sch10:3.4, Sch40:7.1, Sch80:11.0, Sch160:18.3 },
    '200mm (8")':   { Sch5:2.4, Sch10:3.8, Sch40:8.2, Sch80:12.7, Sch160:20.6 },
    '250mm (10")':  { Sch5:2.8, Sch10:4.0, Sch40:9.3, Sch80:15.1, Sch160:22.2 },
    '300mm (12")':  { Sch5:2.8, Sch10:4.2, Sch40:9.5, Sch80:17.5, Sch160:25.4 },
    '350mm (14")':  { Sch5:3.0, Sch10:4.8, Sch40:9.5, Sch80:19.0, Sch160:28.6 },
    '400mm (16")':  { Sch5:3.2, Sch10:4.8, Sch40:9.5, Sch80:21.4, Sch160:31.8 },
    '450mm (18")':  { Sch5:3.2, Sch10:4.8, Sch40:9.5, Sch80:23.8, Sch160:34.9 },
    '500mm (20")':  { Sch5:3.2, Sch10:5.5, Sch40:9.5, Sch80:26.2, Sch160:38.1 },
    '600mm (24")':  { Sch5:3.2, Sch10:5.5, Sch40:9.5, Sch80:30.2, Sch160:44.5 }
};

// [size, standard, rating, od, bcd, bolts, holeDia, rfDiaIron, rfDiaSteel, rfHeight, thkGCI, thkCu, thkCFS, thkDCI]
var flangeData = [
    // --- 15mm (1/2") ---
    [15,"BS EN 1092","PN6",80,55,4,11,38,40,2,12,null,12,null],
    [15,"BS EN 1092","PN10",95,65,4,14,46,45,2,14,null,16,14],
    [15,"BS EN 1092","PN16",95,65,4,14,46,45,2,14,6,16,14],
    [15,"BS EN 1092","PN25",95,65,4,14,46,45,2,16,8,16,14],
    [15,"BS EN 1092","PN40",95,65,4,14,46,45,2,null,9,16,16],
    [15,"BS EN 1092","PN64",105,75,4,14,null,45,2,null,null,20,null],
    [15,"ANSI","Class 125/150",89,60.3,4,16,null,35,2,null,8,11,null],
    [15,"ANSI","Class 300",95,66.5,4,16,null,35,2,null,null,15,null],
    [15,"ANSI","Class 600",105,66.5,4,19,null,35,6,null,null,15,null],
    [15,"BS 10","Table A",95,67,4,11,null,null,null,14,10,14,null],
    [15,"BS 10","Table D",95,67,4,13,null,null,null,14,10,14,null],
    [15,"BS 10","Table E",95,67,4,13,null,null,null,14,11,14,null],
    // --- 20mm (3/4") ---
    [20,"BS EN 1092","PN6",90,65,4,11,48,50,2,12,null,14,null],
    [20,"BS EN 1092","PN10",105,75,4,14,56,58,2,16,null,18,16],
    [20,"BS EN 1092","PN16",105,75,4,14,56,58,2,16,8,18,16],
    [20,"BS EN 1092","PN25",105,75,4,14,56,58,2,16,10,18,16],
    [20,"BS EN 1092","PN40",105,75,4,14,56,58,2,null,10,18,18],
    [20,"BS EN 1092","PN64",130,90,4,14,null,58,2,null,null,22,null],
    [20,"ANSI","Class 125/150",99,69.9,4,16,null,43,2,null,10,13,null],
    [20,"ANSI","Class 300",117,82.6,4,19,null,43,2,null,null,16,null],
    [20,"ANSI","Class 600",125,82.6,4,22,null,43,6,null,null,16,null],
    [20,"BS 10","Table A",108,80,4,13,null,null,null,16,12,16,null],
    [20,"BS 10","Table D",108,80,4,13,null,null,null,16,12,16,null],
    [20,"BS 10","Table E",108,80,4,13,null,null,null,16,13,16,null],
    // --- 25mm (1") ---
    [25,"BS EN 1092","PN6",100,75,4,11,58,60,2,12,null,14,null],
    [25,"BS EN 1092","PN10",115,85,4,14,66,68,2,16,null,18,16],
    [25,"BS EN 1092","PN16",115,85,4,14,66,68,2,16,8,18,16],
    [25,"BS EN 1092","PN25",115,85,4,14,66,68,2,18,10,18,16],
    [25,"BS EN 1092","PN40",115,85,4,14,66,68,2,null,12,18,18],
    [25,"BS EN 1092","PN64",140,100,4,14,null,68,2,null,null,24,null],
    [25,"ANSI","Class 125/150",108,79.4,4,16,null,51,2,null,10,14,null],
    [25,"ANSI","Class 300",124,88.9,4,19,null,51,2,null,null,18,null],
    [25,"ANSI","Class 600",140,88.9,4,22,null,51,6,null,null,18,null],
    [25,"BS 10","Table A",114,86,4,13,null,null,null,16,12,16,null],
    [25,"BS 10","Table D",114,86,4,13,null,null,null,16,12,16,null],
    [25,"BS 10","Table E",114,86,4,13,null,null,null,18,14,18,null],
    // --- 32mm (1-1/4") ---
    [32,"BS EN 1092","PN6",120,90,4,14,68,70,2,12,null,16,null],
    [32,"BS EN 1092","PN10",140,100,4,19,76,78,2,16,null,18,16],
    [32,"BS EN 1092","PN16",140,100,4,19,76,78,2,16,10,18,16],
    [32,"BS EN 1092","PN25",140,100,4,19,76,78,2,18,13,20,18],
    [32,"BS EN 1092","PN40",140,100,4,19,76,78,2,null,13,20,20],
    [32,"BS EN 1092","PN64",155,110,4,19,null,76,2,null,null,24,null],
    [32,"ANSI","Class 125/150",117,88.9,4,16,null,64,2,null,14,17,null],
    [32,"ANSI","Class 300",133,98.4,4,19,null,64,2,null,null,20,null],
    [32,"ANSI","Class 600",155,98.4,4,22,null,64,6,null,null,20,null],
    [32,"BS 10","Table D",133,105,4,17,null,null,null,16,14,16,null],
    [32,"BS 10","Table E",133,105,4,17,null,null,null,20,16,20,null],
    // --- 40mm (1-1/2") ---
    [40,"BS EN 1092","PN6",130,100,4,14,78,80,2,14,null,16,null],
    [40,"BS EN 1092","PN10",150,110,4,19,86,88,2,16,null,20,18],
    [40,"BS EN 1092","PN16",150,110,4,19,86,88,2,18,12,20,18],
    [40,"BS EN 1092","PN25",150,110,4,19,86,88,2,20,14,22,20],
    [40,"BS EN 1092","PN40",150,110,4,19,86,88,2,null,14,24,22],
    [40,"BS EN 1092","PN64",170,125,4,22,null,88,2,null,null,28,null],
    [40,"ANSI","Class 125/150",127,98.4,4,16,null,73,2,null,14,18,null],
    [40,"ANSI","Class 300",155,114.3,4,22,null,73,2,null,null,22,null],
    [40,"ANSI","Class 600",165,114.3,4,25,null,73,6,null,null,22,null],
    [40,"BS 10","Table A",165,121,4,17,null,90,3,19,14,19,null],
    [40,"BS 10","Table D",133,105,4,17,null,null,null,16,14,16,null],
    [40,"BS 10","Table E",133,105,4,17,null,null,null,22,16,22,null],
    // --- 50mm (2") ---
    [50,"BS EN 1092","PN6",140,110,4,14,88,90,3,14,null,16,null],
    [50,"BS EN 1092","PN10",165,125,4,19,96,102,3,20,null,22,20],
    [50,"BS EN 1092","PN16",165,125,4,19,96,102,3,20,14,22,20],
    [50,"BS EN 1092","PN25",165,125,4,19,96,102,3,22,15,24,22],
    [50,"BS EN 1092","PN40",165,125,4,19,96,102,3,null,16,26,24],
    [50,"BS EN 1092","PN64",180,135,4,22,null,102,2,null,null,30,null],
    [50,"BS EN 1092","PN100",195,145,4,26,null,102,2,null,null,38,null],
    [50,"ANSI","Class 125/150",152,120.7,4,19,null,92,2,null,16,19,null],
    [50,"ANSI","Class 300",165,127,8,19,null,92,2,null,null,25,null],
    [50,"ANSI","Class 600",210,127,8,22,null,92,6,null,null,25,null],
    [50,"BS 10","Table A",178,129,4,17,null,105,3,20,16,20,null],
    [50,"BS 10","Table D",165,127,4,17,null,null,null,18,16,18,null],
    [50,"BS 10","Table E",165,127,4,17,null,null,null,24,18,24,null],
    // --- 65mm (2-1/2") ---
    [65,"BS EN 1092","PN6",160,130,4,14,108,110,3,14,null,18,null],
    [65,"BS EN 1092","PN10",185,145,4,19,116,122,3,20,null,24,20],
    [65,"BS EN 1092","PN16",185,145,4,19,116,122,3,22,16,24,22],
    [65,"BS EN 1092","PN25",185,145,4,19,116,122,3,24,18,26,24],
    [65,"BS EN 1092","PN40",185,145,4,19,116,122,3,null,18,30,28],
    [65,"BS EN 1092","PN64",205,160,4,22,null,122,2,null,null,32,null],
    [65,"ANSI","Class 125/150",178,139.7,4,19,null,105,2,null,17,22,null],
    [65,"ANSI","Class 300",190,149.2,8,19,null,105,2,null,null,28,null],
    [65,"ANSI","Class 600",210,149.2,8,22,null,105,6,null,null,28,null],
    [65,"BS 10","Table A",184,149,4,17,null,118,3,22,17,22,null],
    [65,"BS 10","Table D",178,140,4,17,null,null,null,22,16,22,null],
    [65,"BS 10","Table E",178,140,4,20,null,null,null,25,18,25,null],
    // --- 80mm (3") ---
    [80,"BS EN 1092","PN6",190,150,4,19,118,120,3,16,null,18,null],
    [80,"BS EN 1092","PN10",200,160,8,19,132,138,3,20,null,24,22],
    [80,"BS EN 1092","PN16",200,160,8,19,132,138,3,24,18,26,24],
    [80,"BS EN 1092","PN25",200,160,8,19,132,138,3,26,20,28,26],
    [80,"BS EN 1092","PN40",200,160,8,19,132,138,3,null,22,32,30],
    [80,"BS EN 1092","PN64",215,170,8,22,null,138,2,null,null,34,null],
    [80,"ANSI","Class 125/150",191,152.4,4,19,null,127,2,null,18,24,null],
    [80,"ANSI","Class 300",210,168.3,8,22,null,127,2,null,null,30,null],
    [80,"ANSI","Class 600",240,168.3,8,25,null,127,6,null,null,32,null],
    [80,"BS 10","Table A",203,168,4,19,null,133,3,24,18,24,null],
    [80,"BS 10","Table D",200,159,4,19,null,null,null,24,18,24,null],
    [80,"BS 10","Table E",200,159,4,22,null,null,null,28,22,28,null],
    // --- 100mm (4") ---
    [100,"BS EN 1092","PN6",210,170,4,19,144,148,3,18,null,16,null],
    [100,"BS EN 1092","PN10",220,180,8,19,156,158,3,24,null,20,19],
    [100,"BS EN 1092","PN16",220,180,8,19,156,158,3,24,16,20,19],
    [100,"BS EN 1092","PN25",235,190,8,23,156,162,3,28,17,24,19],
    [100,"BS EN 1092","PN40",235,190,8,23,156,162,3,null,19,24,19],
    [100,"BS EN 1092","PN64",250,200,8,26,null,162,2,null,null,30,null],
    [100,"BS EN 1092","PN100",265,210,8,30,null,162,2,null,null,40,null],
    [100,"ANSI","Class 125/150",229,190.5,8,19,null,157,2,null,19,24,null],
    [100,"ANSI","Class 300",254,200,8,22,null,157,2,null,null,32,null],
    [100,"ANSI","Class 600",290,200,8,29,null,157,6,null,null,38,null],
    [100,"BS 10","Table A",229,194,4,19,null,159,3,25,19,25,null],
    [100,"BS 10","Table D",229,184,4,22,null,null,null,25,19,25,null],
    [100,"BS 10","Table E",229,184,4,22,null,null,null,32,24,32,null],
    // --- 125mm (5") ---
    [125,"BS EN 1092","PN6",240,200,8,19,170,175,3,18,null,18,null],
    [125,"BS EN 1092","PN10",250,210,8,19,184,188,3,26,null,22,21],
    [125,"BS EN 1092","PN16",250,210,8,19,184,188,3,28,18,22,21],
    [125,"BS EN 1092","PN25",270,220,8,26,184,192,3,30,20,28,25],
    [125,"BS EN 1092","PN40",270,220,8,26,184,192,3,null,22,30,27],
    [125,"ANSI","Class 125/150",254,215.9,8,22,null,186,2,null,19,24,null],
    [125,"ANSI","Class 300",279,235,8,22,null,186,2,null,null,35,null],
    [125,"ANSI","Class 600",330,235,8,29,null,186,6,null,null,44,null],
    [125,"BS 10","Table A",254,219,8,22,null,178,3,27,22,27,null],
    [125,"BS 10","Table D",254,210,8,22,null,null,null,27,22,27,null],
    [125,"BS 10","Table E",254,210,8,22,null,null,null,35,27,35,null],
    // --- 150mm (6") ---
    [150,"BS EN 1092","PN6",265,225,8,19,194,200,3,20,null,18,null],
    [150,"BS EN 1092","PN10",285,240,8,22,210,212,3,26,16,24,22],
    [150,"BS EN 1092","PN16",285,240,8,22,210,212,3,30,20,24,22],
    [150,"BS EN 1092","PN25",300,250,8,26,210,218,3,35,22,30,28],
    [150,"BS EN 1092","PN40",300,250,8,26,210,218,3,null,24,32,30],
    [150,"BS EN 1092","PN64",300,250,8,26,null,212,2,null,null,36,null],
    [150,"BS EN 1092","PN100",320,280,8,30,null,218,2,null,null,48,null],
    [150,"ANSI","Class 125/150",279,241.3,8,22,null,216,2,null,20,25,null],
    [150,"ANSI","Class 300",318,269.9,12,22,null,216,2,null,null,37,null],
    [150,"ANSI","Class 600",360,269.9,8,29,null,216,6,null,null,48,null],
    [150,"BS 10","Table A",279,244,8,22,null,216,3,29,22,29,null],
    [150,"BS 10","Table D",267,235,8,22,null,null,null,29,22,29,null],
    [150,"BS 10","Table E",267,235,8,22,null,null,null,38,29,38,null],
    // --- 200mm (8") ---
    [200,"BS EN 1092","PN6",315,280,8,19,246,250,3,22,null,20,null],
    [200,"BS EN 1092","PN10",340,295,8,22,266,268,3,28,18,26,24],
    [200,"BS EN 1092","PN16",340,295,12,22,266,268,3,32,22,28,24],
    [200,"BS EN 1092","PN25",360,310,12,26,266,278,3,38,26,34,30],
    [200,"BS EN 1092","PN40",375,320,12,30,266,285,3,null,28,38,34],
    [200,"BS EN 1092","PN64",360,310,12,26,null,268,2,null,null,42,null],
    [200,"ANSI","Class 125/150",343,298.5,8,22,null,270,2,null,21,28,null],
    [200,"ANSI","Class 300",381,330.2,12,25,null,270,2,null,null,41,null],
    [200,"ANSI","Class 600",470,330.2,12,32,null,270,6,null,null,56,null],
    [200,"BS 10","Table A",343,308,12,22,null,273,3,33,24,33,null],
    [200,"BS 10","Table D",330,292,12,22,null,null,null,33,24,33,null],
    [200,"BS 10","Table E",330,292,12,22,null,null,null,41,35,41,null],
    // --- 250mm (10") ---
    [250,"BS EN 1092","PN6",370,335,12,22,300,305,3,24,null,22,null],
    [250,"BS EN 1092","PN10",395,350,12,26,320,324,3,30,20,28,26],
    [250,"BS EN 1092","PN16",405,355,12,26,320,330,3,36,26,32,28],
    [250,"BS EN 1092","PN25",425,370,12,30,320,335,3,42,30,38,34],
    [250,"BS EN 1092","PN40",450,385,12,33,320,345,3,null,32,44,38],
    [250,"ANSI","Class 125/150",406,362,12,25,null,324,2,null,24,30,null],
    [250,"ANSI","Class 300",444,387.4,16,28,null,324,2,null,null,48,null],
    [250,"ANSI","Class 600",545,387.4,12,35,null,324,6,null,null,64,null],
    [250,"BS 10","Table A",406,362,12,25,null,330,3,35,27,35,null],
    [250,"BS 10","Table D",394,356,12,25,null,null,null,35,27,35,null],
    [250,"BS 10","Table E",394,356,12,25,null,null,null,48,38,48,null],
    // --- 300mm (12") ---
    [300,"BS EN 1092","PN6",435,395,12,26,335,345,4,26,null,24,null],
    [300,"BS EN 1092","PN10",445,400,12,26,366,370,4,32,22,30,28],
    [300,"BS EN 1092","PN16",460,410,12,26,366,380,4,38,28,34,30],
    [300,"BS EN 1092","PN25",485,430,16,30,366,385,4,46,34,42,36],
    [300,"BS EN 1092","PN40",515,450,16,33,378,400,4,null,36,48,42],
    [300,"ANSI","Class 125/150",483,431.8,12,25,null,381,2,null,26,32,null],
    [300,"ANSI","Class 300",521,450.9,16,32,null,381,2,null,null,51,null],
    [300,"ANSI","Class 600",610,450.9,12,38,null,381,6,null,null,70,null],
    [300,"BS 10","Table A",470,419,12,25,null,390,3,38,30,38,null],
    [300,"BS 10","Table D",457,406,12,25,null,null,null,38,30,38,null],
    [300,"BS 10","Table E",457,406,12,25,null,null,null,52,41,52,null],
    // --- 350mm (14") ---
    [350,"BS EN 1092","PN6",485,445,12,26,370,380,4,26,null,24,null],
    [350,"BS EN 1092","PN10",505,460,16,26,385,390,4,34,24,32,30],
    [350,"BS EN 1092","PN16",520,470,16,26,385,400,4,42,30,36,32],
    [350,"BS EN 1092","PN25",535,490,16,30,385,405,4,48,36,44,38],
    [350,"ANSI","Class 125/150",533,476.3,12,28,null,413,2,null,28,35,null],
    [350,"ANSI","Class 300",584,514.4,20,32,null,413,2,null,null,54,null],
    [350,"ANSI","Class 600",640,514.4,12,41,null,413,6,null,null,76,null],
    [350,"BS 10","Table D",533,476,12,25,null,null,null,40,32,40,null],
    [350,"BS 10","Table E",533,476,12,25,null,null,null,55,44,55,null],
    // --- 400mm (16") ---
    [400,"BS EN 1092","PN6",540,495,16,23,463,465,4,28,null,22,null],
    [400,"BS EN 1092","PN10",565,515,16,28,480,482,4,32,null,26,25],
    [400,"BS EN 1092","PN16",580,525,16,31,480,490,4,38,null,32,28],
    [400,"BS EN 1092","PN25",620,550,16,37,503,505,4,48,null,40,32],
    [400,"BS EN 1092","PN40",660,585,16,41,535,535,4,null,null,50,48],
    [400,"ANSI","Class 125/150",597,539.8,16,29,null,470,2,null,null,37,null],
    [400,"ANSI","Class 300",648,571.5,20,35,null,470,2,null,null,57,null],
    [400,"ANSI","Class 600",686,603.3,20,41,null,470,6,null,null,76,null],
    [400,"BS 10","Table A",578,521,12,25,null,null,null,27,25,null,null],
    [400,"BS 10","Table D",578,521,12,25,null,null,null,29,25,25,null],
    [400,"BS 10","Table E",578,521,12,25,null,null,null,32,25,25,null],
    // --- 450mm (18") ---
    [450,"BS EN 1092","PN6",595,550,16,23,518,520,4,28,null,22,null],
    [450,"BS EN 1092","PN10",615,565,20,28,530,532,4,32,null,28,26],
    [450,"BS EN 1092","PN16",640,585,20,31,548,550,4,40,null,40,30],
    [450,"BS EN 1092","PN25",670,600,20,37,548,555,4,50,null,46,35],
    [450,"ANSI","Class 125/150",635,577.9,16,32,null,533,2,null,null,40,null],
    [450,"ANSI","Class 300",711,628.7,24,35,null,533,2,null,null,60,null],
    [450,"ANSI","Class 600",743,654.1,20,44,null,533,6,null,null,83,null],
    [450,"BS 10","Table A",641,584,12,25,null,null,null,27,27,null,null],
    [450,"BS 10","Table D",641,584,12,25,null,null,null,32,29,29,null],
    [450,"BS 10","Table E",641,584,12,25,null,null,null,32,29,29,null],
    // --- 500mm (20") ---
    [500,"BS EN 1092","PN6",645,600,20,23,568,570,4,30,null,24,null],
    [500,"BS EN 1092","PN10",670,620,20,28,580,585,4,36,null,30,28],
    [500,"BS EN 1092","PN16",715,650,20,34,610,610,4,44,null,44,32],
    [500,"BS EN 1092","PN25",730,660,20,41,610,615,4,54,null,48,38],
    [500,"ANSI","Class 125/150",699,635,20,32,null,584,2,null,null,44,null],
    [500,"ANSI","Class 300",775,685.8,24,35,null,584,2,null,null,64,null],
    [500,"ANSI","Class 600",813,685.8,20,48,null,584,6,null,null,92,null],
    [500,"BS 10","Table D",699,610,12,25,null,null,null,35,32,32,null],
    [500,"BS 10","Table E",699,610,12,25,null,null,null,35,32,32,null],
    // --- 600mm (24") ---
    [600,"BS EN 1092","PN6",755,705,20,26,670,675,4,32,null,26,null],
    [600,"BS EN 1092","PN10",780,725,20,31,682,690,4,40,null,32,30],
    [600,"BS EN 1092","PN16",840,770,20,37,718,720,4,48,null,48,36],
    [600,"BS EN 1092","PN25",845,780,20,41,718,730,4,60,null,52,44],
    [600,"ANSI","Class 125/150",813,749.3,20,35,null,692,2,null,null,48,null],
    [600,"ANSI","Class 300",914,812.8,24,41,null,692,2,null,null,70,null],
    [600,"ANSI","Class 600",940,838.2,24,51,null,692,6,null,null,102,null],
    [600,"BS 10","Table D",826,756,16,29,null,null,null,35,35,35,null],
    [600,"BS 10","Table E",826,756,16,32,null,null,null,41,38,38,null],
];

function fillPlateMaterial() {
    var sel = document.getElementById('tcPlateMaterial');
    if (!sel) return;
    if (sel.options.length > 1) return;
    sel.innerHTML = '<option value="">-- Select --</option>';
    plateMaterialData.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.grade;
        opt.textContent = m.grade + ' (' + m.type + ', ' + m.std + ')';
        sel.appendChild(opt);
    });
}

function populateElectrodeDropdown() {
    var sel = document.getElementById('tcElecType');
    if (!sel) return;
    if (sel.options.length > 1) return;
    electrodePriceData.forEach(function(e) {
        var opt = document.createElement('option');
        opt.value = e.grade;
        opt.textContent = e.grade + ' (' + e.type + ', RM ' + e.rmPerKg.toFixed(2) + '/kg)';
        sel.appendChild(opt);
    });
}

function fillElectrodePrice() {
    var sel = document.getElementById('tcElecType');
    var priceInput = document.getElementById('tcElecPrice');
    var marketInput = document.querySelector('.tcalc-market[data-mat="electrode"]');
    if (!sel || !priceInput) return;
    var grade = sel.value;
    if (!grade) return;
    var found = electrodePriceData.find(function(e) { return e.grade === grade; });
    if (found) {
        priceInput.value = found.rmPerKg;
        if (marketInput) {
            marketInput.value = found.rmPerKg;
            updateTcalcMarketValue();
        }
    }
}

function populatePipeNpsDropdown() {
    var sel = document.getElementById('tcPipeNps');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select NPS --</option>';
    pipeNpsData.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p.nps;
        opt.textContent = p.nps + ' — ' + p.od + 'mm OD';
        sel.appendChild(opt);
    });
}

function populatePipeSchDropdown() {
    var sel = document.getElementById('tcPipeSch');
    var npsSel = document.getElementById('tcPipeNps');
    var odInput = document.getElementById('tcPipeOD');
    if (!sel || !npsSel) return;
    var nps = npsSel.value;
    var found = pipeNpsData.find(function(p) { return p.nps === nps; });
    if (found) { odInput.value = found.od; }
    sel.innerHTML = '<option value="">-- Manual --</option>';
    if (!nps || !pipeSchData[nps]) return;
    var scheds = pipeSchData[nps];
    Object.keys(scheds).forEach(function(sch) {
        var opt = document.createElement('option');
        opt.value = sch;
        opt.textContent = sch + ' (' + scheds[sch] + 'mm)';
        sel.appendChild(opt);
    });
}

function fillPipeSchedule() {
    var npsSel = document.getElementById('tcPipeNps');
    var schSel = document.getElementById('tcPipeSch');
    var wtInput = document.getElementById('tcPipeWT');
    if (!npsSel || !schSel || !wtInput) return;
    var nps = npsSel.value;
    var sch = schSel.value;
    if (sch && pipeSchData[nps] && pipeSchData[nps][sch]) {
        wtInput.value = pipeSchData[nps][sch];
    }
}

function fillDishMaterial() {
    var sel = document.getElementById('tcDishMaterial');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select --</option>';
    plateMaterialData.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.grade;
        opt.textContent = m.grade + ' (' + m.type + ')';
        sel.appendChild(opt);
    });
}

function onPlateMatChange() {
    var sel = document.getElementById('tcPlateMaterial');
    var densityInput = document.getElementById('tcPlateDensity');
    if (!sel || !densityInput) return;
    var grade = sel.value;
    if (!grade) return;
    var found = plateMaterialData.find(function(m) { return m.grade === grade; });
    if (found) {
        densityInput.value = found.density;
    }
}

function onDishMatChange() {
    var sel = document.getElementById('tcDishMaterial');
    var densityInput = document.getElementById('tcDishDensity');
    if (!sel || !densityInput) return;
    var grade = sel.value;
    if (!grade) return;
    var found = plateMaterialData.find(function(m) { return m.grade === grade; });
    if (found) {
        densityInput.value = found.density;
    }
}

function onFlgMatChange() {
    var sel = document.getElementById('tcFlgMat');
    var densityInput = document.getElementById('tcFlgDensity');
    if (!sel || !densityInput) return;
    var mat = sel.value;
    if (flangeDensityMap[mat]) {
        densityInput.value = flangeDensityMap[mat];
    }
}

function getFlange(size, std, rating) {
    return flangeData.find(function(f) {
        return f[0] === size && f[1] === std && f[2] === rating;
    });
}

function getFlangeThk(entry, matKey) {
    var idx = { GCI: 10, Cu: 11, CFS: 12, DCI: 13 }[matKey];
    return entry ? entry[idx] : null;
}

function filterFlangeRatings() {
    try {
        var sizeSel = document.getElementById('tcFlgSize');
        var stdSel = document.getElementById('tcFlgStd');
        var ratingSel = document.getElementById('tcFlgRating');
        var odInput = document.getElementById('tcFlgOD');
        var thkInput = document.getElementById('tcFlgThk');
        if (!sizeSel || !stdSel || !ratingSel) return;
        var size = parseInt(sizeSel.value);
        var std = stdSel.value;
        if (odInput) odInput.value = '—';
        if (thkInput) thkInput.value = '—';
        ratingSel.innerHTML = '<option value="">-- Select --</option>';
        if (!size || !std) return;
        var matches = flangeData.filter(function(f) { return f[0] === size && f[1] === std; });
        var seen = {};
        matches.forEach(function(f) {
            if (!seen[f[2]]) {
                var opt = document.createElement('option');
                opt.value = f[2];
                opt.textContent = f[2];
                ratingSel.appendChild(opt);
                seen[f[2]] = true;
            }
        });
    } catch (e) {
        console.error('filterFlangeRatings error:', e);
    }
}

function switchTcalcTab(tab) {
    document.querySelectorAll('.tcalc-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tcalc-pane').forEach(function(p) { p.style.display = 'none'; });
    var btn = document.querySelector('.tcalc-tab[onclick*="' + tab + '"]');
    if (btn) btn.classList.add('active');
    var pane = document.getElementById('tcalc-' + tab);
    if (pane) pane.style.display = 'block';
    if (tab === 'pipe') {
        var pipeSel = document.getElementById('tcPipeNps');
        if (pipeSel && pipeSel.options.length === 0) populatePipeNpsDropdown();
        populatePipeSchDropdown();
    }
    if (tab === 'flange') {
        filterFlangeRatings();
        var flgSize = document.getElementById('tcFlgSize');
        var flgStd = document.getElementById('tcFlgStd');
        if (flgSize && !flgSize._flangeBound) {
            flgSize.addEventListener('change', filterFlangeRatings);
            flgSize._flangeBound = true;
        }
        if (flgStd && !flgStd._flangeBound) {
            flgStd.addEventListener('change', filterFlangeRatings);
            flgStd._flangeBound = true;
        }
    }
    if (tab === 'plate') {
        var matSel = document.getElementById('tcPlateMaterial');
        if (matSel && matSel.options.length <= 1) { fillPlateMaterial(); }
    }
    if (tab === 'electrode') {
        populateElectrodeDropdown();
    }
    if (tab === 'dishend') {
        var dishSel = document.getElementById('tcDishMaterial');
        if (dishSel && dishSel.options.length <= 1) { fillDishMaterial(); }
    }
}

function calcTcalc(type) {
    var density, w, t, l, qty, od, wt, a, b, d, leg, eff, joint, vol;
    var kg = 0, kgPerUnit = 0, desc = '';
    var DENSITY_STEEL = 7850;

    if (type === 'plate') {
        w = parseFloat(document.getElementById('tcPlateW').value) || 0;
        t = parseFloat(document.getElementById('tcPlateT').value) || 0;
        l = parseFloat(document.getElementById('tcPlateL').value) || 0;
        qty = parseFloat(document.getElementById('tcPlateQty').value) || 1;
        density = parseFloat(document.getElementById('tcPlateDensity').value) || DENSITY_STEEL;
        var volM3 = (w / 1000) * (t / 1000) * (l / 1000);
        kgPerUnit = volM3 * density;
        kg = kgPerUnit * qty;
        desc = 'Plate ' + w + 'mm x ' + t + 'mm x ' + l + 'mm';

    } else if (type === 'pipe') {
        od = parseFloat(document.getElementById('tcPipeOD').value) || 0;
        wt = parseFloat(document.getElementById('tcPipeWT').value) || 0;
        l = parseFloat(document.getElementById('tcPipeL').value) || 0;
        qty = parseFloat(document.getElementById('tcPipeQty').value) || 1;
        density = parseFloat(document.getElementById('tcPipeDensity').value) || DENSITY_STEEL;
        var id = od - 2 * wt;
        volM3 = (Math.PI / 4) * ((od * od - id * id) / 1000000) * l;
        kgPerUnit = volM3 * density;
        kg = kgPerUnit * qty;
        desc = 'Pipe OD ' + od + 'mm x WT ' + wt + 'mm x ' + l + 'm';

    } else if (type === 'angle') {
        a = parseFloat(document.getElementById('tcAngleA').value) || 0;
        b = parseFloat(document.getElementById('tcAngleB').value) || 0;
        t = parseFloat(document.getElementById('tcAngleT').value) || 0;
        l = parseFloat(document.getElementById('tcAngleL').value) || 0;
        qty = parseFloat(document.getElementById('tcAngleQty').value) || 1;
        var csArea = ((a + b - t) * t) / 100;
        kgPerUnit = csArea * l * 0.785;
        kg = kgPerUnit * qty;
        desc = 'Angle ' + a + 'mm x ' + b + 'mm x ' + t + 'mm x ' + l + 'm';

    } else if (type === 'flat') {
        w = parseFloat(document.getElementById('tcFlatW').value) || 0;
        t = parseFloat(document.getElementById('tcFlatT').value) || 0;
        l = parseFloat(document.getElementById('tcFlatL').value) || 0;
        qty = parseFloat(document.getElementById('tcFlatQty').value) || 1;
        density = parseFloat(document.getElementById('tcFlatDensity').value) || DENSITY_STEEL;
        volM3 = (w / 1000) * (t / 1000) * l;
        kgPerUnit = volM3 * density;
        kg = kgPerUnit * qty;
        desc = 'Flat Bar ' + w + 'mm x ' + t + 'mm x ' + l + 'm';

    } else if (type === 'round') {
        d = parseFloat(document.getElementById('tcRoundD').value) || 0;
        l = parseFloat(document.getElementById('tcRoundL').value) || 0;
        qty = parseFloat(document.getElementById('tcRoundQty').value) || 1;
        density = parseFloat(document.getElementById('tcRoundDensity').value) || DENSITY_STEEL;
        volM3 = (Math.PI / 4) * (d / 1000) * (d / 1000) * l;
        kgPerUnit = volM3 * density;
        kg = kgPerUnit * qty;
        desc = 'Round Bar D ' + d + 'mm x ' + l + 'm';

    } else if (type === 'electrode') {
        l = parseFloat(document.getElementById('tcElecWeldL').value) || 0;
        leg = parseFloat(document.getElementById('tcElecLeg').value) || 0;
        qty = parseFloat(document.getElementById('tcElecQty').value) || 1;
        eff = parseFloat(document.getElementById('tcElecEff').value) || 65;
        joint = document.getElementById('tcElecJoint').value;
        if (joint === 'fillet') {
            vol = 0.5 * (leg / 1000) * (leg / 1000) * (l / 1000);
        } else if (joint === 'butt-single') {
            vol = 0.5 * (leg / 1000) * (l / 1000) * (leg / 1000);
        } else {
            vol = 0.75 * (leg / 1000) * (l / 1000) * (leg / 1000);
        }
        var depositKg = vol * 7850;
        kgPerUnit = depositKg / (eff / 100);
        kg = kgPerUnit * qty;
        desc = 'Weld L=' + l + 'mm leg=' + leg + 'mm (' + joint + ')';

    } else if (type === 'dishend') {
        var dishType = document.getElementById('tcDishType').value;
        var dishDiam = parseFloat(document.getElementById('tcDishOD').value) || 0;
        var dishThk = parseFloat(document.getElementById('tcDishThk').value) || 0;
        qty = parseFloat(document.getElementById('tcDishQty').value) || 1;
        var dishDensity = parseFloat(document.getElementById('tcDishDensity').value) || 7850;
        var dishMfgFactor = parseFloat(document.getElementById('tcDishMfgFactor').value) || 1.3;
        var dishMat = document.getElementById('tcDishMaterial').value;
        var dishDM = dishDiam / 1000;
        var dishTM = dishThk / 1000;
        var saFactor = 0;
        if (dishType === 'torispherical') { saFactor = 0.915; }
        else if (dishType === 'ellipsoidal') { saFactor = 1.084; }
        else if (dishType === 'hemispherical') { saFactor = 1.571; }
        var surfaceArea = saFactor * dishDM * dishDM;
        kgPerUnit = surfaceArea * dishTM * dishDensity;
        kg = kgPerUnit * qty * dishMfgFactor;
        var dishTypeLabel = { torispherical: 'Tori', ellipsoidal: '2:1 Ellip', hemispherical: 'Hemi' }[dishType] || dishType;
        desc = 'Dish End ' + dishTypeLabel + ' ' + dishDiam + 'mm OD x ' + dishThk + 'mm thk (' + (dishMat || 'CS') + ')';

    } else if (type === 'flange') {
        var flgSize = parseInt(document.getElementById('tcFlgSize').value);
        var flgStd = document.getElementById('tcFlgStd').value;
        var flgRating = document.getElementById('tcFlgRating').value;
        var flgMat = document.getElementById('tcFlgMat').value;
        qty = parseFloat(document.getElementById('tcFlgQty').value) || 1;
        density = parseFloat(document.getElementById('tcFlgDensity').value) || 7850;
        if (!flgSize || !flgStd || !flgRating) {
            showToast('Select size, standard and rating', 'error');
            return;
        }
        var entry = getFlange(flgSize, flgStd, flgRating);
        if (!entry) {
            showToast('No data for this selection', 'error');
            return;
        }
        var flgOD = entry[3];
        var thk = getFlangeThk(entry, flgMat);
        if (!thk) {
            var matName = { GCI: 'Grey CI', Cu: 'Copper', CFS: 'Forged Steel', DCI: 'Ductile CI' }[flgMat] || flgMat;
            showToast('No thickness data for ' + matName + ' with this flange', 'error');
            return;
        }
        document.getElementById('tcFlgOD').value = flgOD + ' mm';
        document.getElementById('tcFlgThk').value = thk + ' mm';
        volM3 = (Math.PI / 4) * (flgOD / 1000) * (flgOD / 1000) * (thk / 1000);
        kgPerUnit = volM3 * density;
        kg = kgPerUnit * qty;
        var matLabel = { GCI: 'Grey CI', Cu: 'Copper', CFS: 'Forged Steel', DCI: 'Ductile CI' }[flgMat] || flgMat;
        desc = 'Flange ' + flgSize + 'mm (' + flgStd + ' ' + flgRating + ') ' + matLabel + ' OD' + flgOD + 'mm x ' + thk + 'mm';
    }

    var tonnes = kg / 1000;
    var marketPrice = 0;
    if (type === 'electrode') {
        marketPrice = parseFloat(document.querySelector('.tcalc-market[data-mat="electrode"]')?.value) || 0;
    } else if (type === 'dishend') {
        var dishMatVal = document.getElementById('tcDishMaterial').value;
        var isSS = dishMatVal && (dishMatVal.indexOf('304') !== -1 || dishMatVal.indexOf('316') !== -1);
        marketPrice = parseFloat(document.querySelector('.tcalc-market[data-mat="' + (isSS ? 'dishend-ss' : 'dishend') + '"]')?.value) || 0;
    } else if (type === 'flange') {
        var flgMatVal = document.getElementById('tcFlgMat').value;
        var flgPriceKey = 'flange-cs';
        if (flgMatVal === 'Cu') { flgPriceKey = 'flange-ss'; }
        else if (flgMatVal === 'GCI' || flgMatVal === 'DCI') { flgPriceKey = 'flange-ci'; }
        marketPrice = parseFloat(document.querySelector('.tcalc-market[data-mat="' + flgPriceKey + '"]')?.value) || 0;
    } else {
        marketPrice = parseFloat(document.querySelector('.tcalc-market[data-mat="' + type + '"]')?.value) || 0;
    }
    var marketValue = tonnes * marketPrice;
    var resultHtml = '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:12px;">' +
        '<div style="background:var(--bg-secondary);padding:6px 12px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted);">' + escHtml(desc) + '</div>' +
        '<table class="table" style="width:100%;margin:0;border:0;font-size:13px;">' +
        '<tbody>' +
        '<tr><td style="padding:6px 12px;width:50%;">Weight</td><td style="padding:6px 12px;text-align:right;">' + kg.toFixed(2) + ' kg</td></tr>' +
        '<tr><td style="padding:6px 12px;">Tonnes</td><td style="padding:6px 12px;text-align:right;">' + tonnes.toFixed(4) + ' t</td></tr>' +
        (marketPrice && marketValue > 0 ? '<tr><td style="padding:6px 12px;">Market Value</td><td style="padding:6px 12px;text-align:right;">RM ' + marketValue.toFixed(2) + ' @ RM ' + marketPrice + '/t</td></tr>' : '') +
        (kgPerUnit > 0 ? '<tr><td style="padding:6px 12px;">Per Unit</td><td style="padding:6px 12px;text-align:right;">' + kgPerUnit.toFixed(2) + ' kg</td></tr>' : '') +
        '</tbody></table></div>';

    document.getElementById('tcResult-' + type).innerHTML = resultHtml;
    _tcalcLastResult = { desc: desc, kg: kg, tonnes: tonnes, qty: qty, marketValue: marketValue, marketPrice: marketPrice, type: type };
}

function updateTcalcMarketValue() {
    var activeType = document.querySelector('.tcalc-pane[style*="block"]');
    if (!activeType) return;
    var type = activeType.id.replace('tcalc-', '');
    if (document.getElementById('tcResult-' + type)?.querySelector('.tcalc-result-inner')) {
        calcTcalc(type);
    }
}

function copyCalcToQuote() {
    if (!_tcalcLastResult) { showToast('Calculate a value first', 'error'); return; }
    var r = _tcalcLastResult;
    var desc = r.desc + ' [' + r.kg.toFixed(2) + ' kg / ' + r.tonnes.toFixed(4) + ' t';
    if (r.marketValue) { desc += ' | RM ' + r.marketValue.toFixed(2); }
    desc += ']';
    var tbody = document.getElementById('qtItemsBody');
    if (!tbody) { showToast('Open a quotation first', 'error'); return; }

    // Check if quotation modal is open
    var qtModal = document.getElementById('quotationModal');
    var tbody = document.getElementById('qtItemsBody');
    if (!qtModal || !tbody) {
        showToast('Open a quotation first', 'error');
        return;
    }
    // Ensure modal is visible
    qtModal.style.display = '';
    qtModal.classList.add('active');

    // If no edit ID, create a new draft quotation in DB first
    var editIdEl = document.getElementById('qtEditId');
    var qtId = editIdEl ? editIdEl.value : '';
    if (!qtId) {
        var custSel = document.getElementById('qtCustomer');
        var custText = custSel && custSel.options[custSel.selectedIndex] ? custSel.options[custSel.selectedIndex].text : '';
        var now = new Date();
        var qtNum = 'QT-' + now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(Math.floor(Math.random()*900)+100);
        var newQt = {
            id: qtNum,
            quoteNumber: qtNum,
            customer: custText.split(' — ')[0] || 'Walk-in',
            subject: document.getElementById('qtSubject') ? document.getElementById('qtSubject').value : '',
            contact: document.getElementById('qtContact') ? document.getElementById('qtContact').value : '',
            email: document.getElementById('qtEmail') ? document.getElementById('qtEmail').value : '',
            phone: document.getElementById('qtPhone') ? document.getElementById('qtPhone').value : '',
            description: document.getElementById('qtDescription') ? document.getElementById('qtDescription').value : '',
            validUntil: document.getElementById('qtValidUntil') ? document.getElementById('qtValidUntil').value : '',
            status: 'Draft',
            notes: document.getElementById('qtNotes') ? document.getElementById('qtNotes').value : '',
            taxPercent: parseFloat(document.getElementById('qtTaxPercent') ? document.getElementById('qtTaxPercent').value : 0) || 0,
            items: [],
            subtotal: 0, taxAmount: 0, total: 0,
            createdAt: now.toISOString()
        };
        saveWithOwner('quotations', newQt);
        qtId = newQt.id;
        if (editIdEl) editIdEl.value = qtId;
        // Update modal title
        var titleEl = document.getElementById('qtModalTitle');
        if (titleEl) titleEl.textContent = 'Edit Quotation';
        var submitBtn = document.getElementById('qtSubmitBtn');
        if (submitBtn) submitBtn.textContent = 'Update Quotation';
        console.log('[DEBUG copyCalcToQuote] auto-created quotation', qtId);
    }

    // Add row to table
    var row = document.createElement('tr');
    row.id = '_qtItem_' + (window._qtItemCount || 0);
    window._qtItemCount = (window._qtItemCount || 0) + 1;
    var unitPrice = r.qty > 0 ? (r.marketValue / r.qty) : 0;
    var idx = window._qtItemCount - 1;
    row.innerHTML =
        '<td style="padding:4px;"><input class="form-control" style="font-size:11px;width:100%;border:1px solid var(--border);padding:4px 6px;border-radius:4px;" value="' + escHtml(desc) + '" id="qtItemDesc_' + idx + '" onchange="updateQtTotal()"></td>' +
        '<td style="padding:4px;"><input type="number" class="form-control qt-qty" style="font-size:11px;width:70px;border:1px solid var(--border);padding:4px 6px;border-radius:4px;" value="' + r.qty + '" min="0" step="1" id="qtItemQty_' + idx + '" onchange="updateQtTotal()"></td>' +
        '<td style="padding:4px;"><input type="number" class="form-control qt-price" style="font-size:11px;width:100px;border:1px solid var(--border);padding:4px 6px;border-radius:4px;" value="' + unitPrice.toFixed(2) + '" min="0" step="0.01" id="qtItemPrice_' + idx + '" onchange="updateQtTotal()"></td>' +
        '<td style="padding:4px;"><span class="qt-total" style="font-size:12px;" id="qtItemTotal_' + idx + '">RM ' + (r.marketValue).toFixed(2) + '</span></td>' +
        '<td style="padding:4px;"><button class="btn btn-xs btn-ghost" onclick="this.closest(\'tr\').remove();updateQtTotal();" style="color:#dc2626;">X</button></td>';
    tbody.appendChild(row);
    updateQtTotal();

    // Collect all items and save to DB
    var items = [];
    document.querySelectorAll('#qtItemsBody tr').forEach(function(tr) {
        var descInput = tr.querySelector('input[id^="qtItemDesc_"]') || tr.cells[0]?.querySelector('input');
        var qtyInput = tr.querySelector('input[id^="qtItemQty_"]') || tr.cells[1]?.querySelector('input');
        var priceInput = tr.querySelector('input[id^="qtItemPrice_"]') || tr.cells[2]?.querySelector('input');
        if (descInput && qtyInput && priceInput) {
            var d = descInput.value;
            var q = parseFloat(qtyInput.value) || 0;
            var p = parseFloat(priceInput.value) || 0;
            if (d && (q > 0 || p > 0)) {
                items.push({ description: d, qty: q, unitPrice: p });
            }
        }
    });
    var qt = DB.getById('quotations', qtId);
    if (qt) {
        qt.items = items;
        qt.subtotal = items.reduce(function(s, i) { return s + i.qty * i.unitPrice; }, 0);
        qt.taxPercent = parseFloat(document.getElementById('qtTaxPercent') ? document.getElementById('qtTaxPercent').value : 0) || 0;
        qt.taxAmount = qt.subtotal * qt.taxPercent / 100;
        qt.total = qt.subtotal + qt.taxAmount;
        DB.update('quotations', qtId, qt);
        console.log('[DEBUG copyCalcToQuote] saved', items.length, 'items to qt', qtId);
    }
    showToast('Added to quotation: ' + r.desc, 'success');
}
    

// ========== SALES NEW ORDER ==========
function openSalesNewOrderModal(){
    var el=document.getElementById('salesNewOrderModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    var custSel=document.getElementById('soCustName');
    if(custSel){custSel.innerHTML='<option value="">-- Select --</option>';
        DB.get('customers').forEach(function(c){custSel.innerHTML+='<option value="'+c.id+'">'+(c.company||c.name)+' — '+c.name+'</option>';});}
    ['soProductName','soContactPerson','soEmailAddr','soBudget','soPEShellSize','soPEShellSpec','soPEShellQty','soPEHeadSize','soPEHeadSpec','soPEHeadType','soPEHeadQty','soPESaddleName','soPESaddleSpec','soPESaddleQty','soPEOtherName','soPEOtherSpec','soPEOtherQty','soClientPONumber','soAssignedTo'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
    setSalesOrderType('fab');setSalesEquipType('pe-fab');
    ['soPENozzleList','soPEFlangeList','soPEOtherList','soNPMaterialList','soRepMaterialList','soFileList'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML='';});
}
function setSalesOrderType(t){
    var fabFrame=document.getElementById('soFabFrame');
    var repFrame=document.getElementById('soRepFrame');
    if(fabFrame)fabFrame.style.display=(t==='fab')?'block':'none';
    if(repFrame)repFrame.style.display=(t==='rep')?'block':'none';
    var fabBtn=document.getElementById('soTypeFabBtn');
    var repBtn=document.getElementById('soTypeRepBtn');
    if(fabBtn){fabBtn.className=(t==='fab')?'btn':'btn btn-ghost';}
    if(repBtn){repBtn.className=(t==='rep')?'btn':'btn btn-ghost';}
}
function setSalesEquipType(t){
    var pe=document.getElementById('soPEFabFrame');
    var np=document.getElementById('soNPFabFrame');
    if(pe)pe.style.display=(t==='pe-fab')?'block':'none';
    if(np)np.style.display=(t==='np-fab')?'block':'none';
    var peBtn=document.getElementById('soEquipPEFabBtn');
    var npBtn=document.getElementById('soEquipNPFabBtn');
    if(peBtn){peBtn.className=(t==='pe-fab')?'btn':'btn btn-ghost';}
    if(npBtn){npBtn.className=(t==='np-fab')?'btn':'btn btn-ghost';}
}
function onSoCustChange(){
    var sel=document.getElementById('soCustName');
    var manual=document.getElementById('soCustNameManual');
    if(sel&&manual)manual.style.display=sel.value?'none':'block';
    populateSoClientPOs();
    if(sel&&sel.value){
        var cust=DB.getById('customers',sel.value);
        if(cust){
            var cp=document.getElementById('soContactPerson');
            var em=document.getElementById('soEmailAddr');
            if(cp)cp.value=cust.contact||cust.name||'';
            if(em)em.value=cust.email||'';
        }
        loadRepairEquipmentDropdown(sel.value);
    } else {
        loadRepairEquipmentDropdown(null);
    }
}
function populateSoClientPOs(){
    var sel=document.getElementById('soCustName');
    var manual=document.getElementById('soCustNameManual');
    var poSel=document.getElementById('soClientPONumber');
    if(!poSel)return;
    var company='';
    if(sel&&sel.value){var cust=DB.getById('customers',sel.value);if(cust)company=cust.company||cust.name;}
    else if(manual&&manual.value.trim()){company=manual.value.trim();}
    var pos=DB.get('clientPOs').filter(function(p){return p.client===company||p.clientName===company||p.customer===company;});
    poSel.innerHTML='<option value="">-- Select PO --</option>';
    pos.forEach(function(p){poSel.innerHTML+='<option value="'+escHtml(p.poNumber||p.id)+'">'+escHtml(p.poNumber||p.id)+(p.description?' — '+escHtml(p.description):'')+'</option>';});
}
function addSoPENozzleRow(){
    var list=document.getElementById('soPENozzleList');if(!list)return;
    var row=document.createElement('div');row.className='flex gap-1 mt-1';
    row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
    row.innerHTML='<input type="text" placeholder="Name" style="width:80px;font-size:12px;"><input type="text" placeholder="Size NB" style="width:70px;font-size:12px;"><select style="flex:1;min-width:130px;font-size:12px;"><option value="">Select Spec...</option><option>SA106 GR.B</option><option>SA320 TP304</option><option>SA320 TP316</option><option>SA312 TP304</option><option>SA312 TP316</option><option>SA105</option><option>SA182 F304</option><option>SA182 F316</option></select><input type="number" placeholder="Qty" style="width:60px;font-size:12px;" min="1"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>';
    list.appendChild(row);
}
function addSoPEFlangeRow(){
    var list=document.getElementById('soPEFlangeList');if(!list)return;
    var row=document.createElement('div');row.className='flex gap-1 mt-1';
    row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
    row.innerHTML='<input type="text" placeholder="Name" style="width:80px;font-size:12px;"><input type="text" placeholder="Size NB" style="width:70px;font-size:12px;"><select style="flex:1;min-width:140px;font-size:12px;"><option value="">Select Spec...</option><option>A105</option><option>SA516 GR.70 (machined)</option><option>A182 F304</option><option>A182 F316</option><option>SA240 GR.304</option><option>SA240 GR.316</option></select><input type="number" placeholder="Qty" style="width:60px;font-size:12px;" min="1"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>';
    list.appendChild(row);
}
function addSoPEOtherRow(){
    var list=document.getElementById('soPEOtherList');if(!list)return;
    var row=document.createElement('div');row.className='flex gap-1 mt-1';
    row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
    row.innerHTML='<input type="text" placeholder="Name" style="width:100px;font-size:12px;"><select style="flex:1;min-width:140px;font-size:12px;"><option value="">Select Spec...</option><option>SA516 GR.70</option><option>SA283 GR.C</option><option>SA240 GR.304</option><option>SA240 GR.316</option><option>SA36</option><option>JIS G3101 SS400</option><option>EN10025 S275JR</option><option>Angle Bar</option><option>Channel</option><option>I-Beam</option><option>Hollow Section</option></select><input type="number" placeholder="Qty" style="width:60px;font-size:12px;" min="1"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>';
    list.appendChild(row);
}
function addSalesMaterialRow(containerId){
    var list=document.getElementById(containerId);if(!list)return;
    var row=document.createElement('div');row.className='flex gap-1 mt-1';
    row.innerHTML='<input type="text" placeholder="Description" style="flex:1"><input type="text" placeholder="Grade" style="width:80px"><input type="number" placeholder="Qty" style="width:60px"><input type="text" placeholder="Unit" style="width:60px"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>';
    list.appendChild(row);
}
function handleSalesFileUpload(e){
    var files=e.target.files;var list=document.getElementById('soFileList');if(!list)return;
    for(var i=0;i<files.length;i++){
        var d=document.createElement('div');d.className='flex gap-1 mt-1 items-center';
        d.innerHTML='<span>'+files[i].name+'</span><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>';
        list.appendChild(d);
    }
}
function saveAndSubmitSalesOrder(){
    var custSel=document.getElementById('soCustName');
    var custManual=document.getElementById('soCustNameManual');
    var custId=custSel?custSel.value:'';
    var custName=custManual?custManual.value:'';
    if(custSel&&custSel.options[custSel.selectedIndex]){
        var optText=custSel.options[custSel.selectedIndex].text;
        custName=optText.split(' — ')[0]||optText;
    }
    if(!custName){alert('Please select a customer');return;}
    var isRepair=document.getElementById('soRepFrame')&&document.getElementById('soRepFrame').style.display!=='none';
    var isPE=document.getElementById('soPEFabFrame')&&document.getElementById('soPEFabFrame').style.display!=='none';
    var orderType=isRepair?'repair':'fabrication';
    var equipType=isPE?'pressure-equipment':'non-pressure';
    var productName=getValue('soProductName')||'';
    var contact=getValue('soContactPerson')||'';
    var email=getValue('soEmailAddr')||'';
    var budget=parseFloat(getValue('soBudget'))||0;
    var installDur=getValue(isRepair?'soRepInstallDur':'soPEInstallDur')||getValue('soNPInstallDur')||'';
    var installDate=getValue(isRepair?'soRepInstallDate':'soPEInstallDate')||getValue('soNPInstallDate')||'';
    var handoverDur=getValue(isRepair?'soRepHandoverDur':'soPEHandoverDur')||getValue('soNPHandoverDur')||'';
    var handoverDate=getValue(isRepair?'soRepHandoverDate':'soPEHandoverDate')||getValue('soNPHandoverDate')||'';
    var projectCost=parseFloat(getValue(isRepair?'soRepProjectCost':'soPEProjectCost'))||parseFloat(getValue('soNPProjectCost'))||0;
    var materials=[];
    var matContainers=isRepair?['soRepMaterialList']:['soNPMaterialList'];
    if(isPE){materials=collectPOMaterials();}
    matContainers.forEach(function(cid){
        var c=document.getElementById(cid);if(!c)return;
        c.querySelectorAll('.flex.gap-1').forEach(function(row){
            var inputs=row.querySelectorAll('input');
            if(inputs.length>=3&&inputs[0].value)materials.push({desc:inputs[0].value,grade:inputs[1]?inputs[1].value:'',qty:parseFloat(inputs[2].value)||0,unit:inputs[3]?inputs[3].value:''});
        });
    });
    var so={
        id:DB.genId('salesOrders'),
        custName:custName,custId:custId,contact:contact,email:email,
        productName:productName,type:orderType,equipType:equipType,budget:budget,
        customer:custName,equipment:productName,amount:budget,description:productName,
        materials:materials,
        installDuration:installDur,installDate:installDate,
        handoverDuration:handoverDur,handoverDate:handoverDate,
        projectCost:projectCost,
        status:'Under Review',designStatus:'Under Review',createdAt:new Date().toISOString(),
        clientPONumber:document.getElementById('soClientPONumber')?.value||'',
        assignedTo:document.getElementById('soAssignedTo')?.value||''
    };
    if(isRepair){
        so.repairInfo={equipName:getValue('soRepEquipName'),regNo:getValue('soRepRegNo'),serial:getValue('soRepSerial'),yearMfg:getValue('soRepYearMfg'),designP:getValue('soRepDesignP'),designT:getValue('soRepDesignT'),scope:getValue('soRepScope'),
        tests:{hydro:isChecked('soRepTestHydro'),bubble:isChecked('soRepTestBubble'),dpt:isChecked('soRepTestDPT'),mpi:isChecked('soRepTestMPI'),xray:isChecked('soRepTestXRay'),visual:isChecked('soRepTestVisual'),ut:isChecked('soRepTestUT')}};
    }
    if(isPE){
        so.peMaterials={
            shellSize:getValue('soPEShellSize'),shellSpec:getValue('soPEShellSpec'),shellQty:getValue('soPEShellQty'),
            headSize:getValue('soPEHeadSize'),headSpec:getValue('soPEHeadSpec'),headType:getValue('soPEHeadType'),headQty:getValue('soPEHeadQty'),
            nozzleList:(function(){var main=[getValue('soPENozzleName'),getValue('soPENozzleSize'),getValue('soPENozzleSpec'),getValue('soPENozzleQty')];var rows=collectDivRows('soPENozzleList');if(main[1]||main[2])rows.unshift(main);return rows;})(),
            flangeList:(function(){var main=[getValue('soPEFlangeName'),getValue('soPEFlangeSize'),getValue('soPEFlangeSpec'),getValue('soPEFlangeQty')];var rows=collectDivRows('soPEFlangeList');if(main[1]||main[2])rows.unshift(main);return rows;})(),
            saddleName:getValue('soPESaddleName'),saddleSpec:getValue('soPESaddleSpec'),saddleQty:getValue('soPESaddleQty'),
            otherName:getValue('soPEOtherName'),otherSpec:getValue('soPEOtherSpec'),otherQty:getValue('soPEOtherQty'),
            otherList:(function(){var main=[getValue('soPEOtherName'),getValue('soPEOtherSpec'),getValue('soPEOtherQty')];var rows=collectDivRows('soPEOtherList');if(main[0]||main[1])rows.unshift(main);return rows;})(),misc:getValue('soPEMisc'),
        designCheck:isChecked('soPECheckDesign'),fabCheck:isChecked('soPECheckFab'),
        designPressure:getValue('soPEDesignPressure'),designPressureUnit:getValue('soPEDesignPressureUnit'),designTemp:getValue('soPEDesignTemp'),
        designCode:getValue('soPEDesignCode')};
    }
    saveWithOwner('salesOrders',so);
    // Create journal entry
    if(projectCost>0){
        var je={id:DB.genId('journal'),date:new Date().toISOString().slice(0,10),ref:'SO-'+so.id,desc:'Project cost - '+productName,lines:[{acct:'5000-COGS',dr:projectCost,cr:0},{acct:'1200-AR',dr:0,cr:projectCost}],status:'Posted'};
        saveWithOwner('journal',je);
    }
    // Create accounting entry for Account Dept
    var year=new Date().getFullYear();
    var acCount=DB.get('accountingEntries').length+1;
    var acId='GL-'+year+'-'+String(acCount).padStart(4,'0');
    saveWithOwner('accountingEntries',{id:acId,date:new Date().toISOString().slice(0,10),description:'Sales Order '+so.id+' - '+productName+' ('+custName+')',debit:projectCost||0,credit:0,account:'Accounts Receivable'});
    var acCount2=DB.get('accountingEntries').length+1;
    saveWithOwner('accountingEntries',{id:'GL-'+year+'-'+String(acCount2).padStart(4,'0'),date:new Date().toISOString().slice(0,10),description:'Revenue recognition - '+so.id+' - '+productName,debit:0,credit:budget||0,account:'Revenue'});

    closeModal('salesNewOrderModal');
    renderSales();
    renderAccounting();
    showToast('Sales order created and sent to Design & Account','success');
}
function collectPOMaterials(){
    var mats=[];
    ['soPENozzleList','soPEFlangeList','soPEOtherList'].forEach(function(cid){
        var c=document.getElementById(cid);if(!c)return;
        c.querySelectorAll('.flex.gap-1,.flex').forEach(function(row){
            var fields=[];
            row.querySelectorAll('input,select').forEach(function(el){
                var val=el.value;
                if(val)fields.push(val);
            });
            if(fields.length>=2)mats.push({name:fields[0],size:fields[1],spec:fields[2]||'',qty:parseFloat(fields[fields.length-1])||0});
        });
    });
    return mats;
}
function collectDivRows(divId){
    var c=document.getElementById(divId);if(!c)return[];
    var rows=[];
    c.querySelectorAll('.flex.gap-1,.flex').forEach(function(row){
        var fields=[];
        row.querySelectorAll('input,select').forEach(function(el){
            var val=el.tagName==='SELECT'?el.value:el.value;
            if(val)fields.push(val);
        });
        if(fields.length)rows.push(fields);
    });
    return rows;
}
function printSalesOrderPDF(id){
    var so = id ? DB.getById('salesOrders', id) : null;
    if (!so) {
        var isRep=document.getElementById('soRepFrame')&&document.getElementById('soRepFrame').style.display!=='none';
        var isPE=document.getElementById('soPEFabFrame')&&document.getElementById('soPEFabFrame').style.display!=='none';
        so = {
            id: 'SO-NEW',
            custName: (function(){
                var s=document.getElementById('soCustName');
                if(s&&s.options[s.selectedIndex])return s.options[s.selectedIndex].text.split(' — ')[0];
                return (document.getElementById('soCustNameManual')||{}).value || '';
            })(),
            contact: getValue('soContactPerson'),
            email: getValue('soEmailAddr'),
            productName: getValue('soProductName'),
            budget: getValue('soBudget'),
            type: isRep ? 'Repair' : 'Fabrication',
            equipType: isPE ? 'Pressure Equipment' : 'Non-Pressure',
            designPressure: getValue('soPEDesignPressure') + ' ' + getValue('soPEDesignPressureUnit'),
            designTemp: getValue('soPEDesignTemp') + ' °C',
            peMaterials: {
                shellSize: getValue('soPEShellSize'), shellSpec: getValue('soPEShellSpec'), shellQty: getValue('soPEShellQty'),
                headSize: getValue('soPEHeadSize'), headSpec: getValue('soPEHeadSpec'), headType: getValue('soPEHeadType'), headQty: getValue('soPEHeadQty'),
                nozzleList: collectDivRows('soPENozzleList'), flangeList: collectDivRows('soPEFlangeList'),
                saddleName: getValue('soPESaddleName'), saddleSpec: getValue('soPESaddleSpec'), saddleQty: getValue('soPESaddleQty'),
                otherName: getValue('soPEOtherName'), otherSpec: getValue('soPEOtherSpec'), otherQty: getValue('soPEOtherQty'),
                otherList: collectDivRows('soPEOtherList'), misc: getValue('soPEMisc'),
                designCheck: isChecked('soPECheckDesign'), fabCheck: isChecked('soPECheckFab'),
                designPressure: getValue('soPEDesignPressure'), designPressureUnit: getValue('soPEDesignPressureUnit'), designTemp: getValue('soPEDesignTemp')
            },
            installDuration: getValue(isRep?'soRepInstallDur':'soPEInstallDur') || getValue('soNPInstallDur'),
            installDate: getValue(isRep?'soRepInstallDate':'soPEInstallDate') || getValue('soNPInstallDate'),
            handoverDuration: getValue(isRep?'soRepHandoverDur':'soPEHandoverDur') || getValue('soNPHandoverDur'),
            handoverDate: getValue(isRep?'soRepHandoverDate':'soPEHandoverDate') || getValue('soNPHandoverDate'),
            projectCost: getValue(isRep?'soRepProjectCost':'soPEProjectCost') || getValue('soNPProjectCost'),
            status: 'Draft'
        };
        if(isRep){
            so.repairInfo={equipName:getValue('soRepEquipName'),regNo:getValue('soRepRegNo'),serial:getValue('soRepSerial'),yearMfg:getValue('soRepYearMfg'),designP:getValue('soRepDesignP'),designT:getValue('soRepDesignT'),scope:getValue('soRepScope'),
            tests:{hydro:isChecked('soRepTestHydro'),bubble:isChecked('soRepTestBubble'),dpt:isChecked('soRepTestDPT'),mpi:isChecked('soRepTestMPI'),xray:isChecked('soRepTestXRay'),visual:isChecked('soRepTestVisual'),ut:isChecked('soRepTestUT')}};
            so.materials=[];
            var repList=document.getElementById('soRepMaterialList');
            if(repList)repList.querySelectorAll('.so-mat-row').forEach(function(row){var inp=row.querySelectorAll('input');if(inp.length>=2&&inp[0].value)so.materials.push({desc:inp[0].value,qty:inp[1].value});});
        }
    }
    _printSOPdf(so);
}

function _printSOPdf(so) {
    var w = window.open('', '_blank', 'width=900,height=700');
    var css = 'body{font-family:Arial,sans-serif;font-size:12px;color:#222;margin:25px;line-height:1.5;}';
    css += '.header{text-align:center;border-bottom:3px double #1e3a5f;padding-bottom:12px;margin-bottom:16px;}';
    css += '.header h1{margin:0;font-size:20px;color:#1e3a5f;} .header h3{margin:4px 0 0;font-size:13px;color:#555;font-weight:400;}';
    css += '.section{margin-bottom:14px;} .section h3{font-size:13px;color:#1e3a5f;border-bottom:1px solid #ccc;padding-bottom:3px;margin:0 0 6px;}';
    css += '.section p{margin:2px 0;} .row{display:flex;gap:16px;flex-wrap:wrap;} .row>div{flex:1;min-width:180px;}';
    css += 'table{width:100%;border-collapse:collapse;margin:4px 0;font-size:11px;}';
    css += 'table td,table th{border:1px solid #ccc;padding:4px 6px;text-align:left;}';
    css += 'table th{background:#e5e7eb;font-weight:600;font-size:11px;}';
    css += '.footer{text-align:center;margin-top:24px;padding-top:10px;border-top:1px solid #ccc;font-size:10px;color:#888;}';
    css += '@media print{body{margin:12px;}.no-print{display:none;}}';
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+so.id+' - Sales Order</title>');
    w.document.write('<style>'+css+'</style></head><body>');

    // Header
    w.document.write('<div class="header"><h1>SALES ORDER — '+so.id+'</h1><h3>AD Deen Engineering</h3>');
    w.document.write('<p style="margin:6px 0 0;"><strong>Customer:</strong> '+(so.custName||'—')+' &nbsp;|&nbsp; <strong>Type:</strong> '+(so.type||'—')+' &nbsp;|&nbsp; <strong>Category:</strong> '+(so.equipType||'—')+' &nbsp;|&nbsp; <strong>Status:</strong> '+(so.status||'Draft')+'</p></div>');

    // 1. Customer Info
    w.document.write('<div class="section"><h3>1. Customer Information</h3><div class="row"><div>');
    w.document.write('<p><strong>Customer:</strong> '+(so.custName||'—')+'</p>');
    w.document.write('<p><strong>Contact Person:</strong> '+(so.contact||'—')+'</p>');
    w.document.write('</div><div>');
    w.document.write('<p><strong>Email:</strong> '+(so.email||'—')+'</p>');
    w.document.write('<p><strong>Budget:</strong> RM '+(so.budget||'0')+'</p>');
    w.document.write('</div></div></div>');

    // 2. Product
    w.document.write('<div class="section"><h3>2. Product / Equipment</h3>');
    w.document.write('<p><strong>Product Name:</strong> '+(so.productName||'—')+'</p>');
    w.document.write('<p><strong>Order Type:</strong> '+(so.type||'—')+' &nbsp;|&nbsp; <strong>Equipment Category:</strong> '+(so.equipType||'—')+'</p>');
    w.document.write('</div>');

    if (so.type !== 'Repair') {
        if (so.equipType === 'Pressure Equipment') {
            var pe = so.peMaterials || {};
            // 3. Checklist & Design
            w.document.write('<div class="section"><h3>3. Pressure Equipment — Checklist & Design</h3>');
            w.document.write('<p><strong>Design Drawing:</strong> '+(so.designCheck?'Yes':'No')+' &nbsp;|&nbsp; <strong>Shop Fab Drawing:</strong> '+(so.fabCheck?'Yes':'No')+'</p>');
            w.document.write('<p><strong>Design Pressure:</strong> '+(so.designPressure||'—')+' &nbsp;|&nbsp; <strong>Design Temperature:</strong> '+(so.designTemp||'—')+'</p>');
            w.document.write('</div>');

            // 4. Material List
            w.document.write('<div class="section"><h3>4. Material List & Quantity</h3>');
            w.document.write('<table><tr><th>Item</th><th>Name / Plate Size</th><th>Specification</th><th>Type</th><th>Qty</th></tr>');
            if (pe.shellSpec||pe.shellSize) w.document.write('<tr><td>Shell</td><td>'+(pe.shellSize||'—')+'</td><td>'+pe.shellSpec+'</td><td>—</td><td>'+(pe.shellQty||'—')+'</td></tr>');
            if (pe.headSpec||pe.headSize) w.document.write('<tr><td>Head</td><td>'+(pe.headSize||'—')+'</td><td>'+pe.headSpec+'</td><td>'+(pe.headType||'—')+'</td><td>'+(pe.headQty||'—')+'</td></tr>');
            // Nozzle main + dynamic rows
            var nMain={n:getValue('soPENozzleName'),s:getValue('soPENozzleSize'),sp:getValue('soPENozzleSpec'),q:getValue('soPENozzleQty')};
            if(nMain.sp||nMain.s)w.document.write('<tr><td>Nozzle</td><td>'+nMain.n+' '+nMain.s+'</td><td>'+nMain.sp+'</td><td>—</td><td>'+nMain.q+'</td></tr>');
            (pe.nozzleList||[]).forEach(function(r){w.document.write('<tr><td>Nozzle</td><td>'+((r[0]||'')+' '+(r[1]||''))+'</td><td>'+(r[2]||'—')+'</td><td>—</td><td>'+(r[3]||'—')+'</td></tr>');});
            // Flange main + dynamic rows
            var fMain={n:getValue('soPEFlangeName'),s:getValue('soPEFlangeSize'),sp:getValue('soPEFlangeSpec'),q:getValue('soPEFlangeQty')};
            if(fMain.sp||fMain.s)w.document.write('<tr><td>Flange</td><td>'+fMain.n+' '+fMain.s+'</td><td>'+fMain.sp+'</td><td>—</td><td>'+fMain.q+'</td></tr>');
            (pe.flangeList||[]).forEach(function(r){w.document.write('<tr><td>Flange</td><td>'+((r[0]||'')+' '+(r[1]||''))+'</td><td>'+(r[2]||'—')+'</td><td>—</td><td>'+(r[3]||'—')+'</td></tr>');});
            if (pe.saddleSpec||pe.saddleName) w.document.write('<tr><td>Saddle/Leg</td><td>'+(pe.saddleName||'—')+'</td><td>'+pe.saddleSpec+'</td><td>—</td><td>'+(pe.saddleQty||'—')+'</td></tr>');
            if (pe.otherSpec||pe.otherName) w.document.write('<tr><td>Other</td><td>'+(pe.otherName||'—')+'</td><td>'+pe.otherSpec+'</td><td>—</td><td>'+(pe.otherQty||'—')+'</td></tr>');
            (pe.otherList||[]).forEach(function(r){w.document.write('<tr><td>Other</td><td>'+(r[0]||'—')+'</td><td>'+(r[1]||'—')+'</td><td>—</td><td>'+(r[2]||'—')+'</td></tr>');});
            w.document.write('</table>');
            if(pe.misc)w.document.write('<p><strong>Miscellaneous:</strong> '+pe.misc+'</p>');
            w.document.write('</div>');

            // 5. Installation & Handover
            w.document.write('<div class="section"><h3>5. Installation & Handover</h3><div class="row"><div>');
            w.document.write('<p><strong>Installation Duration:</strong> '+(so.installDuration||'—')+'</p>');
            w.document.write('<p><strong>Installation Due Date:</strong> '+(so.installDate||'—')+'</p>');
            w.document.write('</div><div>');
            w.document.write('<p><strong>Handover Duration:</strong> '+(so.handoverDuration||'—')+'</p>');
            w.document.write('<p><strong>Handover Due Date:</strong> '+(so.handoverDate||'—')+'</p>');
            w.document.write('</div></div>');
            w.document.write('<p><strong>Project Cost:</strong> RM '+(so.projectCost||'0')+'</p></div>');

        } else {
            // Non-Pressure
            w.document.write('<div class="section"><h3>3. Non-Pressure Equipment</h3>');
            w.document.write('<p><strong>Equipment Name:</strong> '+(getValue('soNPEquipName')||'—')+'</p>');
            w.document.write('<p><strong>Scope of Work:</strong> '+(getValue('soNPScope')||'—')+'</p></div>');
            var npMats=[];
            var npList=document.getElementById('soNPMaterialList');
            if(npList)npList.querySelectorAll('.so-mat-row').forEach(function(row){var inp=row.querySelectorAll('input');if(inp.length>=2&&inp[0].value)npMats.push({d:inp[0].value,q:inp[1].value});});
            if(npMats.length){w.document.write('<div class="section"><h3>4. Material List</h3><table><tr><th>Description</th><th>Qty</th></tr>');npMats.forEach(function(m){w.document.write('<tr><td>'+m.d+'</td><td>'+m.q+'</td></tr>');});w.document.write('</table></div>');}
            w.document.write('<div class="section"><h3>5. Installation & Handover</h3><div class="row"><div>');
            w.document.write('<p><strong>Installation Duration:</strong> '+(getValue('soNPInstallDur')||'—')+'</p>');
            w.document.write('<p><strong>Installation Due Date:</strong> '+(getValue('soNPInstallDate')||'—')+'</p></div><div>');
            w.document.write('<p><strong>Handover Duration:</strong> '+(getValue('soNPHandoverDur')||'—')+'</p>');
            w.document.write('<p><strong>Handover Due Date:</strong> '+(getValue('soNPHandoverDate')||'—')+'</p></div></div>');
            w.document.write('<p><strong>Project Cost:</strong> RM '+(getValue('soNPProjectCost')||'0')+'</p></div>');
        }
    }

    // === REPAIR ===
    if (so.type === 'Repair') {
        w.document.write('<div class="section"><h3>3. Equipment Details</h3><div class="row"><div>');
        w.document.write('<p><strong>Equipment Name:</strong> '+(getValue('soRepEquipName')||'—')+'</p>');
        w.document.write('<p><strong>Registration No:</strong> '+(getValue('soRepRegNo')||'—')+'</p>');
        w.document.write('<p><strong>Serial No:</strong> '+(getValue('soRepSerial')||'—')+'</p>');
        w.document.write('<p><strong>Year Manufactured:</strong> '+(getValue('soRepYearMfg')||'—')+'</p></div><div>');
        w.document.write('<p><strong>Design Pressure:</strong> '+(getValue('soRepDesignP')||'—')+' bar</p>');
        w.document.write('<p><strong>Design Temperature:</strong> '+(getValue('soRepDesignT')||'—')+' °C</p></div></div>');
        w.document.write('<p><strong>Scope of Repair:</strong> '+(getValue('soRepScope')||'—')+'</p></div>');
        var tests=[];
        if(isChecked('soRepTestHydro'))tests.push('Hydrostatic Test');
        if(isChecked('soRepTestBubble'))tests.push('Bubble Leak Test');
        if(isChecked('soRepTestDPT'))tests.push('Dye Penetration Test');
        if(isChecked('soRepTestMPI'))tests.push('Magnetic Particle Inspection');
        if(isChecked('soRepTestXRay'))tests.push('X-Ray / Radiography');
        if(isChecked('soRepTestVisual'))tests.push('Visual Inspection');
        if(isChecked('soRepTestUT'))tests.push('Thickness Measurement');
        w.document.write('<div class="section"><h3>4. Testing Requirements</h3><p>'+(tests.length?tests.join(', '):'—')+'</p></div>');
        var repMats=[];
        var repList=document.getElementById('soRepMaterialList');
        if(repList)repList.querySelectorAll('.so-mat-row').forEach(function(row){var inp=row.querySelectorAll('input');if(inp.length>=2&&inp[0].value)repMats.push({d:inp[0].value,q:inp[1].value});});
        if(repMats.length){w.document.write('<div class="section"><h3>5. Material List</h3><table><tr><th>Description</th><th>Qty</th></tr>');repMats.forEach(function(m){w.document.write('<tr><td>'+m.d+'</td><td>'+m.q+'</td></tr>');});w.document.write('</table></div>');}
        w.document.write('<div class="section"><h3>6. Installation & Handover</h3><div class="row"><div>');
        w.document.write('<p><strong>Installation Duration:</strong> '+(getValue('soRepInstallDur')||'—')+'</p>');
        w.document.write('<p><strong>Installation Due Date:</strong> '+(getValue('soRepInstallDate')||'—')+'</p></div><div>');
        w.document.write('<p><strong>Handover Duration:</strong> '+(getValue('soRepHandoverDur')||'—')+'</p>');
        w.document.write('<p><strong>Handover Due Date:</strong> '+(getValue('soRepHandoverDate')||'—')+'</p></div></div>');
        w.document.write('<p><strong>Project Cost:</strong> RM '+(getValue('soRepProjectCost')||'0')+'</p></div>');
    }

    // Attachments
    var fl=document.getElementById('soFileList');
    if(fl&&fl.children.length){
        w.document.write('<div class="section"><h3>Attachments</h3><ul style="margin:0;padding-left:18px;">');
        Array.from(fl.children).forEach(function(d){var sp=d.querySelector('span');if(sp)w.document.write('<li>'+sp.textContent+'</li>');});
        w.document.write('</ul></div>');
    }

    w.document.write('<div class="footer">Generated on '+new Date().toLocaleString()+' — AD Deen Engineering ERP</div>');
    w.document.write('<div class="no-print" style="text-align:center;margin-top:16px;"><button onclick="window.print()" style="padding:10px 24px;font-size:14px;cursor:pointer;">Print / Save as PDF</button></div>');
    w.document.write('</body></html>');
    w.document.close();
}

// ========== TONNES CALC OPENER ==========
function openTonnesCalc(){
    var el=document.getElementById('tonnesCalcModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    switchTcalcTab('plate');
}

// ==================== COMPLETE PV CALCULATOR JS ====================
let lastPVCResult = null;
let nozzleCounter = 0;

function openPVCompleteCalculator() {
    document.getElementById('pvCompleteModal').style.display = 'flex';
    if (nozzleCounter === 0) {
        // Add default nozzles
        addPVCNozzle("DN50", "Safety Valve");
        addPVCNozzle("DN15", "Pressure Relief Valve");
        addPVCNozzle("DN25", "Pressure Gauge");
        addPVCNozzle("DN40", "Drain");
        addPVCNozzle("DN80", "Inlet/Outlet");
    }
}

function addPVCNozzle(defaultSize = "DN50", defaultPurpose = "") {
    nozzleCounter++;
    const sizes = ["DN15","DN25","DN40","DN50","DN65","DN80","DN100","DN150","DN200"];
    const purposes = ["Inlet","Outlet","Safety Valve","Pressure Gauge","Drain","Vent","Level Gauge","Spare"];
    
    const div = document.getElementById('pvcNozzleList');
    const html = `
        <div class="pvc-nozzle-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;" id="nozzleRow${nozzleCounter}">
            <span style="font-size:11px;">N${nozzleCounter}</span>
            <select class="form-control" style="font-size:11px;flex:1;" id="nozzleSize${nozzleCounter}">
                ${sizes.map(s => `<option value="${s}" ${s===defaultSize?'selected':''}>${s}</option>`).join('')}
            </select>
            <select class="form-control" style="font-size:11px;flex:1.5;" id="nozzlePurpose${nozzleCounter}">
                ${purposes.map(p => `<option value="${p}" ${p===defaultPurpose?'selected':''}>${p}</option>`).join('')}
            </select>
            <input type="number" class="form-control" style="font-size:11px;width:80px;" value="150" id="nozzleProj${nozzleCounter}" placeholder="Proj. mm">
            <button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="document.getElementById('nozzleRow${nozzleCounter}').remove()">×</button>
        </div>
    `;
    div.insertAdjacentHTML('beforeend', html);
}

function toggleMHFields() {
    document.getElementById('pvcMHFields').style.display = 
        document.getElementById('pvcIncludeMH').checked ? 'block' : 'none';
}

function toggleHHFields() {
    document.getElementById('pvcHHFields').style.display = 
        document.getElementById('pvcIncludeHH').checked ? 'block' : 'none';
}

function toggleMHPositionFields() {
    var pos = document.getElementById('pvcMHPosition').value;
    document.getElementById('pvcMHLevelGroup').style.display = pos === 'custom-level' ? 'block' : 'none';
}

function toggleHHPositionFields() {
    var pos = document.getElementById('pvcHHPosition').value;
    document.getElementById('pvcHHLevelGroup').style.display = pos === 'custom-level' ? 'block' : 'none';
}

function toggleLugFields() {
    var fields = document.getElementById('pvcLugFields');
    if (fields) fields.style.display = document.getElementById('pvcIncludeLugs').checked ? 'block' : 'none';
}

function updatePositionOptions() {
    var orientation = document.getElementById('pvcOrientation').value;
    var mhPos = document.getElementById('pvcMHPosition');
    var hhPos = document.getElementById('pvcHHPosition');
    var opts;
    if (orientation === 'horizontal') {
        opts = '<option value="left-dish-center">Left Dish End — Center</option>' +
               '<option value="right-dish-center">Right Dish End — Center</option>' +
               '<option value="shell-center">Shell Body — Center</option>' +
               '<option value="custom-level">Custom Level (from bottom)</option>';
    } else {
        opts = '<option value="bottom-dish-center">Bottom Dish End — Center</option>' +
               '<option value="top-dish-center">Top Dish End — Center</option>' +
               '<option value="shell-center">Shell Body — Center</option>' +
               '<option value="custom-level">Custom Level (from bottom weld seam)</option>';
    }
    if (mhPos) { mhPos.innerHTML = opts; toggleMHPositionFields(); }
    if (hhPos) { hhPos.innerHTML = opts; toggleHHPositionFields(); }
}

function updatePVCTotalCost() {
    var fabricCost = 0;
    if (lastPVCResult && lastPVCResult.calculations && lastPVCResult.calculations.cost_estimate) {
        fabricCost = lastPVCResult.calculations.cost_estimate.grand_total_rm || 0;
    }
    var consumable = parseFloat(document.getElementById('pvcConsumableCost').value) || 0;
    var manpower = parseFloat(document.getElementById('pvcManpowerCost').value) || 0;
    var drawing = parseFloat(document.getElementById('pvcDrawingCost').value) || 0;
    var inspection = parseFloat(document.getElementById('pvcInspectionCost').value) || 0;
    var testing = parseFloat(document.getElementById('pvcTestingCost').value) || 0;
    var others = parseFloat(document.getElementById('pvcOthersCost').value) || 0;
    var total = fabricCost + consumable + manpower + drawing + inspection + testing + others;
    document.getElementById('pvcTotalEstCost').textContent = 'RM ' + total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}

function toggleSupportType() {
    const orientation = document.getElementById('pvcOrientation').value;
    const supportDiv = document.getElementById('pvcSupportFields');
    if (orientation === 'vertical') {
        supportDiv.innerHTML = `
            <div class="form-row-3">
                <div class="form-group">
                    <label class="form-label">Leg Type</label>
                    <select class="form-control" id="pvcLegType">
                        <option value="Pipe Leg DN100">Pipe Leg DN100</option>
                        <option value="Pipe Leg DN80">Pipe Leg DN80</option>
                        <option value="Pipe Leg DN150">Pipe Leg DN150</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Leg Height (mm)</label>
                    <input type="number" class="form-control" id="pvcLegHeight" value="800" step="50">
                </div>
                <div class="form-group">
                    <label class="form-label">Legs Qty</label>
                    <input type="number" class="form-control" id="pvcLegsQty" value="4" min="1" max="12">
                </div>
            </div>
        `;
    } else {
        supportDiv.innerHTML = `
            <p style="font-size:12px;color:var(--text-muted);">Saddle type will be auto-selected based on vessel weight.</p>
        `;
    }
}

async function runCompleteCalculation() {
    document.getElementById('pvcResults').style.display = 'none';
    document.getElementById('pvcLoading').style.display = 'block';
    
    // Collect nozzles
    const nozzles = [];
    document.querySelectorAll('.pvc-nozzle-row').forEach(row => {
        const id = row.id.replace('nozzleRow', '');
        nozzles.push({
            size: document.getElementById(`nozzleSize${id}`)?.value || "DN50",
            purpose: document.getElementById(`nozzlePurpose${id}`)?.value || "Nozzle",
            projection_mm: parseInt(document.getElementById(`nozzleProj${id}`)?.value) || 150,
            flange_type: document.getElementById('pvcFlangeStd').value
        });
    });
    
    const data = {
        design_pressure_bar: parseFloat(document.getElementById('pvcPressure').value) || 10,
        inner_diameter_mm: parseFloat(document.getElementById('pvcDiameter').value) || 1000,
        shell_length_mm: parseFloat(document.getElementById('pvcLength').value) || 2000,
        shell_material: document.getElementById('pvcShellMaterial').value,
        head_material: document.getElementById('pvcHeadMaterial').value === 'same' ? 
                       document.getElementById('pvcShellMaterial').value : 
                       document.getElementById('pvcHeadMaterial').value,
        head_type: document.getElementById('pvcHeadType').value,
        temperature_c: parseFloat(document.getElementById('pvcTemp').value) || 100,
        joint_efficiency: parseFloat(document.getElementById('pvcJointEff').value) || 0.85,
        corrosion_allowance_mm: parseFloat(document.getElementById('pvcCorrosion').value) || 3.0,
        orientation: document.getElementById('pvcOrientation').value,
        default_flange_type: document.getElementById('pvcFlangeStd').value,
        design_code: document.getElementById('pvcDesignCode')?.value || 'ASME VIII Div 1',
        nozzles: nozzles,
        manhole: {
            include: document.getElementById('pvcIncludeMH').checked,
            size: document.getElementById('pvcMHSize')?.value || "500mm ID",
            position: document.getElementById('pvcMHPosition')?.value || 'left-dish-center',
            level_mm: parseInt(document.getElementById('pvcMHLevel')?.value) || 0
        },
        handhole: {
            include: document.getElementById('pvcIncludeHH')?.checked || false,
            size: document.getElementById('pvcHHSize')?.value || 'NB300',
            type: document.getElementById('pvcHHType')?.value || 'Blind Flange',
            qty: parseInt(document.getElementById('pvcHHQty')?.value) || 1,
            position: document.getElementById('pvcHHPosition')?.value || 'left-dish-center',
            level_mm: parseInt(document.getElementById('pvcHHLevel')?.value) || 0
        },
        leg_type: document.getElementById('pvcLegType')?.value || "Pipe Leg DN100",
        leg_height_mm: parseInt(document.getElementById('pvcLegHeight')?.value) || 800,
        num_legs: parseInt(document.getElementById('pvcLegsQty')?.value) || 4,
        lifting_lugs: {
            include: document.getElementById('pvcIncludeLugs').checked,
            type: document.getElementById('pvcLugType')?.value || 'standard',
            quantity: parseInt(document.getElementById('pvcLugQty')?.value) || 2
        },
        misc_material: document.getElementById('pvcMiscMaterial')?.value || ''
    };
    
    const result = localPVCompleteCalculation(data);
    lastPVCResult = result;
    displayPVCResults(result);
}

function localPVCompleteCalculation(d) {
    const P = d.design_pressure_bar * 0.1;
    const R = d.inner_diameter_mm / 2;
    const S = getAllowableStress(d.shell_material);
    const E = d.joint_efficiency;
    const CA = d.corrosion_allowance_mm;
    const t_shell = (P * R) / (S * E - 0.6 * P) + CA;
    const t_shell_std = Math.max(Math.ceil(t_shell), 6);
    let t_head;
    if (d.head_type === 'Hemispherical') {
        t_head = (P * d.inner_diameter_mm) / (4 * S * E - 0.4 * P) + CA;
    } else if (d.head_type === 'Torispherical') {
        t_head = (0.885 * P * d.inner_diameter_mm) / (S * E - 0.1 * P) + CA;
    } else {
        t_head = (P * d.inner_diameter_mm) / (2 * S * E - 0.2 * P) + CA;
    }
    const t_head_std = Math.max(Math.ceil(t_head), 6);
    const D = d.inner_diameter_mm / 1000;
    const L = d.shell_length_mm / 1000;
    const density = 7850;
    const shell_wt = Math.PI * D * (t_shell_std / 1000) * L * density;
    const head_factor = d.head_type === 'Hemispherical' ? 0.542 : d.head_type === 'Torispherical' ? 0.95 : 1.084;
    const head_wt = 2 * head_factor * D * D * (t_head_std / 1000) * density;
    const nozzle_wt = d.nozzles ? d.nozzles.length * 8 : 0;
    const manhole_wt = d.manhole && d.manhole.include ? 35 : 0;
    const handhole_wt = d.handhole && d.handhole.include ? d.handhole.qty * 8 : 0;
    const support_wt = d.orientation === 'horizontal' ? 45 : (d.num_legs || 4) * 12;
    const lug_wt = d.lifting_lugs && d.lifting_lugs.include ? d.lifting_lugs.quantity * 6 : 0;
    const total_wt = shell_wt + head_wt + nozzle_wt + manhole_wt + handhole_wt + support_wt + lug_wt;
    const mat_cost = total_wt * getMaterialCost(d.shell_material);
    const labor_cost = total_wt * 10;
    const ndt_cost = total_wt * 2.5;
    const paint_cost = total_wt * 1.5;
    const overhead = (mat_cost + labor_cost + ndt_cost + paint_cost) * 0.25;
    const grand_total = mat_cost + labor_cost + ndt_cost + paint_cost + overhead;
    const est_hours = Math.round(total_wt / 25 + d.nozzles.length * 3 + (d.manhole && d.manhole.include ? 8 : 0));
    const nozzleCalcs = (d.nozzles || []).map(n => {
        const nd = getNozzleOD(n.size);
        return { size: n.size, purpose: n.purpose, pipe_od_mm: nd, flange_type: n.flange_type, projection_mm: n.projection_mm };
    });
    const reportNum = 'PVC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString().slice(-4);
    return {
        status: 'success',
        report_number: reportNum,
        inputs: d,
        calculations: {
            shell: { min_thickness_mm: parseFloat((t_shell - CA).toFixed(2)), total_thickness_mm: parseFloat(t_shell.toFixed(2)), standard_thickness_mm: t_shell_std, allowable_stress_mpa: S },
            head: { min_thickness_mm: parseFloat((t_head - CA).toFixed(2)), total_thickness_mm: parseFloat(t_head.toFixed(2)), standard_thickness_mm: t_head_std, head_type: d.head_type },
            nozzles: nozzleCalcs,
            manhole: d.manhole && d.manhole.include ? { size: d.manhole.size, bolts: '16x M16 SA193 B7', position: d.manhole.position || 'left-dish-center', level_mm: d.manhole.level_mm || 0 } : null,
            handhole: d.handhole && d.handhole.include ? { size: d.handhole.size, type: d.handhole.type, qty: d.handhole.qty, position: d.handhole.position || 'left-dish-center', level_mm: d.handhole.level_mm || 0 } : null,
            support: { type: d.orientation === 'horizontal' ? 'Saddle (2 nos)' : (d.leg_type || 'Pipe Leg DN100') + ' x ' + (d.num_legs || 4) },
            lifting_lugs: d.lifting_lugs && d.lifting_lugs.include ? { num_lugs: d.lifting_lugs.quantity } : null,
            weight_summary: {
                shell_weight_kg: parseFloat(shell_wt.toFixed(1)),
                head_weight_kg: parseFloat(head_wt.toFixed(1)),
                nozzles_weight_kg: parseFloat(nozzle_wt.toFixed(1)),
                manhole_weight_kg: parseFloat(manhole_wt.toFixed(1)),
                handhole_weight_kg: parseFloat(handhole_wt.toFixed(1)),
                support_weight_kg: parseFloat(support_wt.toFixed(1)),
                lifting_lugs_kg: parseFloat(lug_wt.toFixed(1)),
                total_weight_kg: parseFloat(total_wt.toFixed(1)),
                total_weight_tonnes: parseFloat((total_wt / 1000).toFixed(3))
            },
            cost_estimate: {
                material_cost_rm: parseFloat(mat_cost.toFixed(2)),
                labor_cost_rm: parseFloat(labor_cost.toFixed(2)),
                ndt_cost_rm: parseFloat(ndt_cost.toFixed(2)),
                paint_cost_rm: parseFloat(paint_cost.toFixed(2)),
                overhead_rm: parseFloat(overhead.toFixed(2)),
                grand_total_rm: parseFloat(grand_total.toFixed(2)),
                estimated_hours: est_hours
            },
            hydrotest: { test_pressure_bar: parseFloat((d.design_pressure_bar * 1.3).toFixed(1)), medium: 'Water' }
        },
        summary: {
            description: (d.design_code || 'ASME VIII Div 1') + ' | ' + d.inner_diameter_mm + 'mm ID x ' + d.shell_length_mm + 'mm TL, ' + d.shell_material + ', ' + d.head_type,
            design_conditions: d.design_pressure_bar + ' Bar @ ' + d.temperature_c + '\u00B0C, Joint Eff: ' + d.joint_efficiency,
            shell_thickness: 'Shell: ' + t_shell_std + 'mm (min ' + parseFloat((t_shell - CA).toFixed(2)) + 'mm + ' + CA + 'mm CA)',
            head_thickness: 'Head: ' + t_head_std + 'mm (min ' + parseFloat((t_head - CA).toFixed(2)) + 'mm + ' + CA + 'mm CA)',
            estimated_weight: 'Total: ' + parseFloat(total_wt.toFixed(1)) + ' kg (' + parseFloat((total_wt / 1000).toFixed(3)) + ' tonnes)',
            estimated_cost: 'Estimated: RM ' + parseFloat(grand_total.toFixed(2)).toLocaleString()
        }
    };
}

function getAllowableStress(material) {
    const stresses = { 'SA-516 Gr.70': 138, 'SA-240 Gr.304': 138, 'SA-240 Gr.316': 138, 'SA-387 Gr.11': 150, 'SA-106 Gr.B': 118 };
    return stresses[material] || 138;
}

function getMaterialCost(material) {
    const costs = { 'SA-516 Gr.70': 3.5, 'SA-240 Gr.304': 18, 'SA-240 Gr.316': 28, 'SA-387 Gr.11': 12, 'SA-106 Gr.B': 4.5 };
    return costs[material] || 3.5;
}

function getNozzleOD(size) {
    const ods = { 'DN25': 33.4, 'DN40': 48.3, 'DN50': 60.3, 'DN65': 73, 'DN80': 88.9, 'DN100': 114.3, 'DN150': 168.3, 'DN200': 219.1 };
    return ods[size] || 60.3;
}

function displayPVCResults(result) {
    const calc = result.calculations;
    const summary = result.summary;
    
    document.getElementById('pvcReportNo').textContent = 'Report: ' + result.report_number;
    document.getElementById('pvcDesc').textContent = summary.description;
    document.getElementById('pvcConditions').textContent = summary.design_conditions;
    document.getElementById('pvcShellThk').textContent = calc.shell.standard_thickness_mm + ' mm';
    document.getElementById('pvcHeadThk').textContent = calc.head.standard_thickness_mm + ' mm';
    document.getElementById('pvcWeight').textContent = calc.weight_summary.total_weight_kg + ' kg';
    document.getElementById('pvcHydro').textContent = calc.hydrotest.test_pressure_bar + ' Bar';
    document.getElementById('pvcCost').textContent = 'RM ' + calc.cost_estimate.grand_total_rm.toLocaleString();
    document.getElementById('pvcHours').textContent = 'Estimated: ' + calc.cost_estimate.estimated_hours + ' hours';
    
    // Components list
    let compHtml = '';
    compHtml += `• Shell: ${calc.shell.standard_thickness_mm}mm ${result.inputs.shell_material}<br>`;
    compHtml += `• Heads (2): ${calc.head.standard_thickness_mm}mm ${calc.head.head_type}<br>`;
    
    if (calc.nozzles) {
        calc.nozzles.forEach(n => {
            compHtml += `• ${n.purpose}: ${n.size} (Pipe ${n.pipe_od_mm}mm OD, ${n.flange_type} Flange)<br>`;
        });
    }
    
    if (calc.manhole) {
        var posLabel = calc.manhole.position === 'left-dish-center' ? 'Left Dish End — Center' :
                       calc.manhole.position === 'right-dish-center' ? 'Right Dish End — Center' :
                       calc.manhole.position === 'shell-center' ? 'Shell Body — Center' :
                       calc.manhole.position === 'bottom-dish-center' ? 'Bottom Dish End — Center' :
                       calc.manhole.position === 'top-dish-center' ? 'Top Dish End — Center' :
                       'Custom Level (' + calc.manhole.level_mm + 'mm)';
        compHtml += `• Manhole: ${calc.manhole.size} with Blind Flange<br>`;
        compHtml += `  Position: ${posLabel}<br>`;
        compHtml += `  Bolts: ${calc.manhole.bolts}<br>`;
    }
    
    if (calc.handhole) {
        var hhPosLabel = calc.handhole.position === 'left-dish-center' ? 'Left Dish End — Center' :
                         calc.handhole.position === 'right-dish-center' ? 'Right Dish End — Center' :
                         calc.handhole.position === 'shell-center' ? 'Shell Body — Center' :
                         calc.handhole.position === 'bottom-dish-center' ? 'Bottom Dish End — Center' :
                         calc.handhole.position === 'top-dish-center' ? 'Top Dish End — Center' :
                         'Custom Level (' + calc.handhole.level_mm + 'mm)';
        compHtml += `• Handhole: ${calc.handhole.size} ${calc.handhole.type} (${calc.handhole.qty} nos)<br>`;
        compHtml += `  Position: ${hhPosLabel}<br>`;
    }
    
    if (calc.support) {
        compHtml += `• Support: ${calc.support.type}<br>`;
    }
    
    if (calc.lifting_lugs) {
        compHtml += `• Lifting Lugs: ${calc.lifting_lugs.num_lugs} nos<br>`;
    }
    
    if (result.inputs.misc_material) {
        compHtml += `• Misc Material: ${result.inputs.misc_material}<br>`;
    }
    
    compHtml += `<br><strong>Weight Breakdown:</strong><br>`;
    compHtml += `• Shell: ${calc.weight_summary.shell_weight_kg} kg<br>`;
    compHtml += `• Heads: ${calc.weight_summary.head_weight_kg} kg<br>`;
    compHtml += `• Nozzles: ${calc.weight_summary.nozzles_weight_kg} kg<br>`;
    compHtml += `• Manhole: ${calc.weight_summary.manhole_weight_kg} kg<br>`;
    if (calc.weight_summary.handhole_weight_kg) {
        compHtml += `• Handhole: ${calc.weight_summary.handhole_weight_kg} kg<br>`;
    }
    compHtml += `• Support: ${calc.weight_summary.support_weight_kg} kg<br>`;
    compHtml += `<strong>Total: ${calc.weight_summary.total_weight_kg} kg (${calc.weight_summary.total_weight_tonnes} tonnes)</strong>`;
    
    document.getElementById('pvcComponents').innerHTML = compHtml;
    
    document.getElementById('pvcLoading').style.display = 'none';
    document.getElementById('pvcResults').style.display = 'block';
    
    showToast('✅ Complete calculation finished!');
}

function addPVCToSalesOrder() {
    if (!lastPVCResult) {
        showToast('⚠️ Run calculation first');
        return;
    }
    
    const r = lastPVCResult;
    const calc = r.calculations;
    const inp = r.inputs;
    
    // Open sales order modal in Fabrication > PE mode
    openSalesNewOrderModal();
    setSalesOrderType('fab');
    setSalesEquipType('pe-fab');
    
    setTimeout(function() {
        // Material name map: PV calc format -> SO dropdown format
        var matMap = {
            'SA-516 Gr.70': 'SA516 GR.70',
            'SA-240 Gr.304': 'SA240 GR.304',
            'SA-240 Gr.316': 'SA240 GR.316',
            'SA-387 Gr.11': 'SA387 GR.11',
            'SA-106 Gr.B': 'SA106 GR.B'
        };
        var headTypeMap = {
            '2:1 Ellipsoidal': 'Ellipsoidal Head',
            'Ellipsoidal': 'Ellipsoidal Head',
            'Hemispherical': 'Hemispherical Head',
            'Torispherical': 'Torispherical Head'
        };
        
        // --- Header fields ---
        var soProductName = document.getElementById('soProductName');
        if (soProductName) soProductName.value = (inp.design_code || 'ASME VIII Div 1') + ' | ' + inp.inner_diameter_mm + 'mm ID x ' + inp.shell_length_mm + 'mm ' + inp.shell_material + ' Pressure Vessel';
        
        var soBudget = document.getElementById('soBudget');
        if (soBudget) {
            var fabricCost = calc.cost_estimate.grand_total_rm || 0;
            var addConsumable = parseFloat(document.getElementById('pvcConsumableCost')?.value) || 0;
            var addManpower = parseFloat(document.getElementById('pvcManpowerCost')?.value) || 0;
            var addDrawing = parseFloat(document.getElementById('pvcDrawingCost')?.value) || 0;
            var addInspection = parseFloat(document.getElementById('pvcInspectionCost')?.value) || 0;
            var addTesting = parseFloat(document.getElementById('pvcTestingCost')?.value) || 0;
            var addOthers = parseFloat(document.getElementById('pvcOthersCost')?.value) || 0;
            soBudget.value = (fabricCost + addConsumable + addManpower + addDrawing + addInspection + addTesting + addOthers).toFixed(2);
        }
        
        // --- Design Parameters ---
        var dp = document.getElementById('soPEDesignPressure');
        if (dp) dp.value = inp.design_pressure_bar;
        var dpu = document.getElementById('soPEDesignPressureUnit');
        if (dpu) dpu.value = 'bar';
        var dt = document.getElementById('soPEDesignTemp');
        if (dt) dt.value = inp.temperature_c;
        var dc = document.getElementById('soPEDesignCode');
        if (dc) dc.value = inp.design_code || 'ASME VIII Div 1';
        
        // --- Shell ---
        var shellSize = document.getElementById('soPEShellSize');
        if (shellSize) shellSize.value = inp.inner_diameter_mm + ' x ' + inp.shell_length_mm;
        var shellSpec = document.getElementById('soPEShellSpec');
        if (shellSpec) shellSpec.value = matMap[inp.shell_material] || inp.shell_material;
        var shellQty = document.getElementById('soPEShellQty');
        if (shellQty) shellQty.value = 1;
        
        // --- Heads ---
        var headSize = document.getElementById('soPEHeadSize');
        if (headSize) headSize.value = inp.inner_diameter_mm;
        var headSpec = document.getElementById('soPEHeadSpec');
        if (headSpec) headSpec.value = matMap[inp.head_material] || inp.head_material;
        var headType = document.getElementById('soPEHeadType');
        if (headType) headType.value = headTypeMap[inp.head_type] || inp.head_type;
        var headQty = document.getElementById('soPEHeadQty');
        if (headQty) headQty.value = 2;
        
        // --- Nozzles: fill first row + add extra rows ---
        var nozzles = calc.nozzles || [];
        if (nozzles.length > 0) {
            var n0 = nozzles[0];
            var nzName = document.getElementById('soPENozzleName');
            var nzSize = document.getElementById('soPENozzleSize');
            var nzSpec = document.getElementById('soPENozzleSpec');
            var nzQty = document.getElementById('soPENozzleQty');
            if (nzName) nzName.value = n0.purpose;
            if (nzSize) nzSize.value = n0.size;
            if (nzSpec) nzSpec.value = 'SA106 GR.B';
            if (nzQty) nzQty.value = 1;
            
            for (var i = 1; i < nozzles.length; i++) {
                addSoPENozzleRow();
                var rows = document.getElementById('soPENozzleList');
                if (rows) {
                    var lastRow = rows.lastElementChild;
                    if (lastRow) {
                        var inputs = lastRow.querySelectorAll('input,select');
                        if (inputs[0]) inputs[0].value = nozzles[i].purpose;
                        if (inputs[1]) inputs[1].value = nozzles[i].size;
                        if (inputs[2]) inputs[2].value = 'SA106 GR.B';
                        if (inputs[3]) inputs[3].value = 1;
                    }
                }
            }
        }
        
        // --- Flanges: one row per nozzle ---
        if (nozzles.length > 0) {
            var fl0 = nozzles[0];
            var flName = document.getElementById('soPEFlangeName');
            var flSize = document.getElementById('soPEFlangeSize');
            var flSpec = document.getElementById('soPEFlangeSpec');
            var flQty = document.getElementById('soPEFlangeQty');
            if (flName) flName.value = fl0.purpose + ' Flange';
            if (flSize) flSize.value = fl0.size;
            if (flSpec) flSpec.value = 'A105';
            if (flQty) flQty.value = 1;
            
            for (var j = 1; j < nozzles.length; j++) {
                addSoPEFlangeRow();
                var flRows = document.getElementById('soPEFlangeList');
                if (flRows) {
                    var flLast = flRows.lastElementChild;
                    if (flLast) {
                        var flInputs = flLast.querySelectorAll('input,select');
                        if (flInputs[0]) flInputs[0].value = nozzles[j].purpose + ' Flange';
                        if (flInputs[1]) flInputs[1].value = nozzles[j].size;
                        if (flInputs[2]) flInputs[2].value = 'A105';
                        if (flInputs[3]) flInputs[3].value = 1;
                    }
                }
            }
        }
        
        // --- Saddle/Leg ---
        var saddleName = document.getElementById('soPESaddleName');
        var saddleSpec = document.getElementById('soPESaddleSpec');
        var saddleQty = document.getElementById('soPESaddleQty');
        if (saddleName) saddleName.value = calc.support ? calc.support.type : '';
        if (saddleSpec) saddleSpec.value = 'SA516 GR.70';
        if (saddleQty) saddleQty.value = 1;
        
        // --- Other: Manhole + Lifting Lugs ---
        var otherAdded = false;
        if (calc.manhole) {
            addSoPEOtherRow();
            var oList = document.getElementById('soPEOtherList');
            if (oList && oList.lastElementChild) {
                var oInputs = oList.lastElementChild.querySelectorAll('input,select');
                if (oInputs[0]) oInputs[0].value = 'Manhole ' + calc.manhole.size;
                if (oInputs[1]) oInputs[1].value = 'SA516 GR.70';
                if (oInputs[2]) oInputs[2].value = 1;
                otherAdded = true;
            }
        }
        if (calc.lifting_lugs) {
            addSoPEOtherRow();
            var oList2 = document.getElementById('soPEOtherList');
            if (oList2 && oList2.lastElementChild) {
                var oInputs2 = oList2.lastElementChild.querySelectorAll('input,select');
                if (oInputs2[0]) oInputs2[0].value = 'Lifting Lugs (' + calc.lifting_lugs.num_lugs + ' nos)';
                if (oInputs2[1]) oInputs2[1].value = 'SA516 GR.70';
                if (oInputs2[2]) oInputs2[2].value = calc.lifting_lugs.num_lugs;
                otherAdded = true;
            }
        }
        if (!otherAdded) {
            var on = document.getElementById('soPEOtherName');
            var os2 = document.getElementById('soPEOtherSpec');
            var oq = document.getElementById('soPEOtherQty');
            if (calc.manhole) {
                if (on) on.value = 'Manhole ' + calc.manhole.size;
                if (os2) os2.value = 'SA516 GR.70';
                if (oq) oq.value = 1;
            } else if (calc.lifting_lugs) {
                if (on) on.value = 'Lifting Lugs (' + calc.lifting_lugs.num_lugs + ' nos)';
                if (os2) os2.value = 'SA516 GR.70';
                if (oq) oq.value = calc.lifting_lugs.num_lugs;
            }
        }
        
        // --- Misc: full calculation summary ---
        var misc = document.getElementById('soPEMisc');
        if (misc) {
            var lines = [];
            lines.push('PV CALCULATION REPORT: ' + r.report_number);
            lines.push('Design Code: ' + (inp.design_code || 'ASME VIII Div 1'));
            lines.push(inp.inner_diameter_mm + 'mm ID x ' + inp.shell_length_mm + 'mm TL, ' + inp.head_type);
            lines.push(inp.design_pressure_bar + ' Bar @ ' + inp.temperature_c + '°C, Joint Eff: ' + inp.joint_efficiency + ', CA: ' + inp.corrosion_allowance_mm + 'mm');
            lines.push('Shell: ' + calc.shell.standard_thickness_mm + 'mm ' + inp.shell_material);
            lines.push('Heads (' + (calc.head.head_type || inp.head_type) + '): ' + calc.head.standard_thickness_mm + 'mm ' + inp.head_material);
            if (calc.nozzles && calc.nozzles.length) {
                calc.nozzles.forEach(function(n) { lines.push('Nozzle: ' + n.purpose + ' ' + n.size + ' (' + n.pipe_od_mm + 'mm OD, ' + n.flange_type + ' Flange)'); });
            }
            if (calc.manhole) {
                var mhPosLabel = calc.manhole.position === 'left-dish-center' ? 'Left Dish End Center' :
                    calc.manhole.position === 'right-dish-center' ? 'Right Dish End Center' :
                    calc.manhole.position === 'shell-center' ? 'Shell Body Center' :
                    calc.manhole.position === 'bottom-dish-center' ? 'Bottom Dish End Center' :
                    calc.manhole.position === 'top-dish-center' ? 'Top Dish End Center' :
                    'Custom Level ' + calc.manhole.level_mm + 'mm';
                lines.push('Manhole: ' + calc.manhole.size + ', Bolts: ' + calc.manhole.bolts + ', Position: ' + mhPosLabel);
            }
            if (calc.handhole) {
                var hhPosLabel = calc.handhole.position === 'left-dish-center' ? 'Left Dish End Center' :
                    calc.handhole.position === 'right-dish-center' ? 'Right Dish End Center' :
                    calc.handhole.position === 'shell-center' ? 'Shell Body Center' :
                    calc.handhole.position === 'bottom-dish-center' ? 'Bottom Dish End Center' :
                    calc.handhole.position === 'top-dish-center' ? 'Top Dish End Center' :
                    'Custom Level ' + calc.handhole.level_mm + 'mm';
                lines.push('Handhole: ' + calc.handhole.size + ' ' + calc.handhole.type + ' (' + calc.handhole.qty + ' nos), Position: ' + hhPosLabel);
            }
            lines.push('Support: ' + (calc.support ? calc.support.type : '-'));
            if (calc.lifting_lugs) lines.push('Lifting Lugs: ' + calc.lifting_lugs.num_lugs + ' nos');
            if (inp.misc_material) lines.push('Misc Material: ' + inp.misc_material);
            lines.push('---');
            lines.push('WEIGHT: Shell ' + calc.weight_summary.shell_weight_kg + 'kg, Heads ' + calc.weight_summary.head_weight_kg + 'kg, Nozzles ' + calc.weight_summary.nozzles_weight_kg + 'kg, Manhole ' + calc.weight_summary.manhole_weight_kg + 'kg');
            if (calc.weight_summary.handhole_weight_kg) lines.push('Handhole Weight: ' + calc.weight_summary.handhole_weight_kg + 'kg');
            lines.push('Support: ' + calc.weight_summary.support_weight_kg + 'kg, Lugs: ' + calc.weight_summary.lifting_lugs_kg + 'kg');
            lines.push('TOTAL: ' + calc.weight_summary.total_weight_kg + ' kg (' + calc.weight_summary.total_weight_tonnes + ' tonnes)');
            lines.push('Hydrotest: ' + calc.hydrotest.test_pressure_bar + ' Bar');
            lines.push('FABRICATION COST: RM ' + calc.cost_estimate.grand_total_rm.toLocaleString() + ' (' + calc.cost_estimate.estimated_hours + ' hrs)');
            var consumable = parseFloat(document.getElementById('pvcConsumableCost')?.value) || 0;
            var manpower = parseFloat(document.getElementById('pvcManpowerCost')?.value) || 0;
            var drawing = parseFloat(document.getElementById('pvcDrawingCost')?.value) || 0;
            var inspection = parseFloat(document.getElementById('pvcInspectionCost')?.value) || 0;
            var testingType = document.getElementById('pvcTestingType')?.value || '';
            var testing = parseFloat(document.getElementById('pvcTestingCost')?.value) || 0;
            var others = parseFloat(document.getElementById('pvcOthersCost')?.value) || 0;
            if (consumable || manpower || drawing || inspection || testing || others || testingType) {
                lines.push('Consumable: RM ' + consumable.toLocaleString());
                lines.push('Manpower: RM ' + manpower.toLocaleString());
                lines.push('Drawing & Approval: RM ' + drawing.toLocaleString());
                lines.push('Inspection: RM ' + inspection.toLocaleString());
                if (testingType) lines.push('Testing Type: ' + testingType);
                lines.push('Testing: RM ' + testing.toLocaleString());
                lines.push('Others: RM ' + others.toLocaleString());
                lines.push('TOTAL ESTIMATED: RM ' + (calc.cost_estimate.grand_total_rm + consumable + manpower + drawing + inspection + testing + others).toLocaleString());
            }
            misc.value = lines.join('\n');
        }
        
        // --- Checkboxes ---
        var cd = document.getElementById('soPECheckDesign');
        var cf = document.getElementById('soPECheckFab');
        if (cd) cd.checked = true;
        if (cf) cf.checked = true;
        
        // Close PV calculator modal
        closeModal('pvCompleteModal');
        showToast('✅ All PV data transferred to Sales Order');
    }, 300);
}

// ==================== PRESSURE VESSEL CALCULATOR ====================

let lastPVResult = null;

function openPVCalculator() {
    openPVCompleteCalculator();
}

// ========== DESIGN JOB MODAL ==========
function openDesignJobModal(woId){
    var el=document.getElementById('designJobModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    el.setAttribute('data-wo-id',woId||'');
    var custSel=document.getElementById('djClientName');
    if(custSel){custSel.innerHTML='<option value="">-- Select --</option>';
        DB.get('customers').forEach(function(c){custSel.innerHTML+='<option value="'+c.id+'">'+(c.company||c.name)+' — '+c.name+'</option>';});}
    // Reset all material lists and checkboxes
    ['djShellList','djHeadList','djNozzleList','djFlangeList','djSaddleList','djOtherMatList','djElectrodeList'].forEach(function(id){
        var list=document.getElementById(id);if(list)list.innerHTML='';
    });
    ['djCheckShell','djCheckHead','djCheckNozzle','djCheckFlange','djCheckSaddle','djCheckOtherMat','djCheckElectrode'].forEach(function(id){
        var cb=document.getElementById(id);if(cb)cb.checked=false;
    });
    document.getElementById('djFabInstructions').value='';
            if(woId){
        var wo=DB.getById('workOrders',woId);
        if(wo){
            var eq=document.getElementById('djFabEquipName');if(eq)eq.value=wo.productName||wo.equipment||'';
            var rep=document.getElementById('djRepEquipName');if(rep)rep.value=wo.productName||wo.equipment||'';
            setDesignJobType(wo.type==='repair'?'rep':'fab');
            // Restore saved materials
            var mats=wo.fabMaterials||{};
            if(mats.shell) mats.shell.forEach(function(r){addDesignMatRow('djShellList',r.desc||'', r.qty, r.unit);});
            if(mats.head) mats.head.forEach(function(r){addDesignMatRow('djHeadList',r.desc||'', r.qty, r.unit);});
            if(mats.nozzle) mats.nozzle.forEach(function(r){addDesignMatRow('djNozzleList',r.desc||'', r.qty, r.unit);});
            if(mats.flange) mats.flange.forEach(function(r){addDesignMatRow('djFlangeList',r.desc||'', r.qty, r.unit);});
            if(mats.saddle) mats.saddle.forEach(function(r){addDesignMatRow('djSaddleList',r.desc||'', r.qty, r.unit);});
            if(mats.otherMat) mats.otherMat.forEach(function(r){addDesignMatRow('djOtherMatList',r.desc||'', r.qty, r.unit);});
            if(mats.electrode) mats.electrode.forEach(function(r){addDesignMatRow('djElectrodeList',r.desc||'', r.qty, r.unit);});
            // Restore checkboxes
            if(mats.checks){
                Object.keys(mats.checks).forEach(function(k){
                    var cb=document.getElementById('djCheck'+k.charAt(0).toUpperCase()+k.slice(1));
                    if(cb)cb.checked=mats.checks[k];
                });
            }
            if(wo.fabInstructions) document.getElementById('djFabInstructions').value=wo.fabInstructions;
            // Also try to populate from linked sales order
            var so=wo.salesId?DB.getById('salesOrders',wo.salesId):wo.woRef?DB.getById('salesOrders',wo.woRef):null;
            if(so&&so.peMaterials){
                var pe=so.peMaterials;
                // Only populate if material lists are empty (no saved fabMaterials)
                if(!mats.shell||mats.shell.length===0){
                    if(pe.shellSpec){addDesignMatRow('djShellList',pe.shellSpec,pe.shellQty||1);}
                }
                if(!mats.head||mats.head.length===0){
                    if(pe.headSpec){addDesignMatRow('djHeadList',pe.headSpec+' ('+(pe.headType||'')+')',pe.headQty||1);}
                }
                if(!mats.nozzle||mats.nozzle.length===0){
                    if(pe.nozzleList){
                        pe.nozzleList.forEach(function(n){
                            if(n&&(n.s||n.sp))addDesignMatRow('djNozzleList',(n.s||'')+' '+(n.sp||''),n.q||1);
                        });
                    }
                }
                if(!mats.flange||mats.flange.length===0){
                    if(pe.flangeList){
                        pe.flangeList.forEach(function(f){
                            if(f&&(f.s||f.sp))addDesignMatRow('djFlangeList',(f.s||'')+' '+(f.sp||''),f.q||1);
                        });
                    }
                }
                if(!mats.saddle||mats.saddle.length===0){
                    if(pe.saddleSpec){addDesignMatRow('djSaddleList',pe.saddleSpec,pe.saddleQty||1);}
                }
                if(!mats.otherMat||mats.otherMat.length===0){
                    if(pe.otherName||pe.otherSpec){
                        addDesignMatRow('djOtherMatList',(pe.otherName||'')+' '+(pe.otherSpec||''),pe.otherQty||1);
                    }
                    if(pe.otherList){
                        pe.otherList.forEach(function(o){
                            if(o&&(o[0]||o[1]))addDesignMatRow('djOtherMatList',(o[0]||'')+' '+(o[1]||''),o[2]||1);
                        });
                    }
                }
            }
        }
    }else{setDesignJobType('fab');}
}
function setDesignJobType(t){
    var fab=document.getElementById('djFabFrame');
    var rep=document.getElementById('djRepFrame');
    if(fab)fab.style.display=(t==='fab')?'block':'none';
    if(rep)rep.style.display=(t==='rep')?'block':'none';
}
function onDjClientChange(){
    var sel=document.getElementById('djClientName');
    var manual=document.getElementById('djClientNameManual');
    if(sel&&manual)manual.style.display=sel.value?'none':'block';
}
function addDesignMatRow(containerId, desc, qty, unit){
    var list=document.getElementById(containerId);if(!list)return;
    var row=document.createElement('div');row.className='flex gap-1 mt-1';
    row.innerHTML='<input type="text" placeholder="Description" style="flex:1" value="'+escHtml(desc||'')+'"><input type="number" placeholder="Qty" style="width:60px" value="'+(qty||'')+'"><input type="text" placeholder="Unit" style="width:60px" value="'+escHtml(unit||'')+'"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>';
    list.appendChild(row);
}
function handleDesignDrawingUpload(e){
    var files=e.target.files;var list=document.getElementById('djFabDrawingList');if(!list)return;
    for(var i=0;i<files.length;i++){
        var d=document.createElement('div');d.className='flex gap-1 mt-1 items-center';
        d.innerHTML='<span>'+files[i].name+'</span><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>';
        list.appendChild(d);
    }
}
function saveDesignJob(){
    var woId=document.getElementById('designJobModal').getAttribute('data-wo-id');
    if(!woId){alert('No work order selected');return;}
    var wo=DB.getById('workOrders',woId);if(!wo)return;
    var isFab=document.getElementById('djFabFrame')&&document.getElementById('djFabFrame').style.display!=='none';
    var jobData={type:isFab?'fabrication':'repair',updatedAt:new Date().toISOString()};
    if(isFab){
        jobData.fabEquipName=getValue('djFabEquipName');
        jobData.fabInstructions=getValue('djFabInstructions');
        jobData.fabTests={hydro:isChecked('djFabTestHydro'),pneu:isChecked('djFabTestPneu'),mpi:isChecked('djFabTestMPI'),xray:isChecked('djFabTestXRay')};
        jobData.fabDocs={dwgs:isChecked('djFabDocDwgs'),wps:isChecked('djFabDocWPS'),mtr:isChecked('djFabDocMTR'),ndt:isChecked('djFabDocNDT')};
    }else{
        jobData.repScope=getValue('djRepScope');
        jobData.repEquipName=getValue('djRepEquipName');
        jobData.repRegNo=getValue('djRepRegNo');
        jobData.repSerial=getValue('djRepSerial');
        jobData.repTests={hydro:isChecked('djRepTestHydro'),bubble:isChecked('djRepTestBubble'),dpt:isChecked('djRepTestDPT'),mpi:isChecked('djRepTestMPI'),xray:isChecked('djRepTestXRay'),visual:isChecked('djRepTestInsp')};
        jobData.repPerson=getValue('djRepPerson');
    }
    jobData.installDuration=getValue('djInstallDur');
    jobData.installDate=getValue('djInstallDate');
    jobData.handoverDuration=getValue('djHandoverDur');
    jobData.handoverDate=getValue('djHandoverDate');
    // Save material lists and checkboxes
    jobData.fabMaterials={
        shell: getDesignMatRows('djShellList'),
        head: getDesignMatRows('djHeadList'),
        nozzle: getDesignMatRows('djNozzleList'),
        flange: getDesignMatRows('djFlangeList'),
        saddle: getDesignMatRows('djSaddleList'),
        otherMat: getDesignMatRows('djOtherMatList'),
        electrode: getDesignMatRows('djElectrodeList'),
        checks: {
            shell: isChecked('djCheckShell'),
            head: isChecked('djCheckHead'),
            nozzle: isChecked('djCheckNozzle'),
            flange: isChecked('djCheckFlange'),
            saddle: isChecked('djCheckSaddle'),
            otherMat: isChecked('djCheckOtherMat'),
            electrode: isChecked('djCheckElectrode')
        }
    };
    DB.update('workOrders',woId,jobData);
    closeModal('designJobModal');
    renderDesignReviews();
    showToast('Design job saved','success');
}
function getDesignMatRows(containerId){
    var c=document.getElementById(containerId);if(!c)return [];
    var rows=[];
    var els=c.children;
    for(var i=0;i<els.length;i++){
        var row=els[i];
        var inputs=row.querySelectorAll('input');
        if(inputs.length>=2){
            rows.push({desc:inputs[0].value,qty:inputs[1].value,unit:inputs[2]?inputs[2].value:''});
        }
    }
    return rows;
}
function sendDesignToJobWO(){
    var woId=document.getElementById('designJobModal').getAttribute('data-wo-id');
    if(!woId)return;
    var approval=document.querySelector('input[name="djFabApproval"]:checked');
    var status=approval?approval.value:'in-progress';
    DB.update('workOrders',woId,{designStatus:status==='approved'?'Approved':'Submitted',updatedAt:new Date().toISOString()});
    closeModal('designJobModal');
    renderDesignReviews();
    showToast('Design sent to Job WO','success');
}
function sendDesignToQuality(){
    var woId=document.getElementById('designJobModal').getAttribute('data-wo-id');
    if(!woId)return;
    DB.update('workOrders',woId,{designStatus:'Submitted',qualityRequired:true,updatedAt:new Date().toISOString()});
    closeModal('designJobModal');
    renderDesignReviews();
    showToast('Sent to Quality Department','success');
}

// ========== HYDRO TEST ==========
function openHydroTestModal(){
    var el=document.getElementById('hydroTestModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    var rpt=document.getElementById('htReportNo');if(rpt)rpt.textContent='HT-'+Date.now().toString(36).toUpperCase();
    var dt=document.getElementById('htDate');if(dt)dt.value=new Date().toISOString().slice(0,10);
    var tbl=document.getElementById('htReadingTable');if(tbl)tbl.innerHTML='<tr><td><input type="text" style="width:80px"></td><td><input type="number" style="width:80px"></td><td><input type="number" style="width:80px"></td><td><input type="text" style="flex:1"></td></tr>';
}
function addHTReading(){
    var tbl=document.getElementById('htReadingTable');if(!tbl)return;
    var row=document.createElement('tr');
    row.innerHTML='<td><input type="text" style="width:80px"></td><td><input type="number" style="width:80px"></td><td><input type="number" style="width:80px"></td><td><input type="text" style="flex:1"></td>';
    tbl.appendChild(row);
}
function calculateHTPressure(){
    var mawp=parseFloat(getValue('htMAWP'))||0;
    var code=document.getElementById('htCode')?document.getElementById('htCode').value:'';
    var factor=1.5;
    if(code==='ASME VIII Div1')factor=1.43;
    else if(code==='ASME I')factor=1.5;
    else if(code==='ASME B31.3')factor=1.5;
    else if(code==='PED')factor=1.43;
    else if(code==='MS 1262')factor=1.5;
    var tp=mawp*factor;
    var tpEl=document.getElementById('htTestPressure');if(tpEl)tpEl.value=tp.toFixed(2);
}
function autoFillHTExample(){
    var fields={htDate:new Date().toISOString().slice(0,10),htWONumber:'WO-2024-001',htEquipment:'Pressure Vessel V-101',htSerialNo:'SN-2024-001',htClient:'Demo Client',htLocation:'Workshop 1',htMAWP:10,htTestPressure:15,htDesignTemp:150,htDesignTempUnit:'C',htTestTemp:'20-25',htMetalTemp:'20-25',htGaugeID:'PG-001',htGaugeRange:'0-25 Bar',htPumpType:'Manual Test Pump',htReliefValve:'PRV-001',htDuration:'30 min',htRemarks:'Test completed successfully',htTestedBy:'John Smith',htQcName:'QC Inspector'};
    Object.keys(fields).forEach(function(k){var e=document.getElementById(k);if(e)e.value=fields[k];});
}
function saveHydroTestReport(){
    var data={id:DB.genId('quality'),type:'hydroTest',reportNo:getText('htReportNo'),date:getValue('htDate'),woNumber:getValue('htWONumber'),equipment:getValue('htEquipment'),serialNo:getValue('htSerialNo'),client:getValue('htClient'),location:getValue('htLocation'),code:getValue('htCode'),mawp:getValue('htMAWP'),testPressure:getValue('htTestPressure'),designTemp:getValue('htDesignTemp'),medium:getValue('htMedium'),result:getValue('htResult'),remarks:getValue('htRemarks'),inspector:getValue('htTestedBy'),qcName:getValue('htQcName'),aiName:getValue('htAiName'),createdAt:new Date().toISOString()};
    saveWithOwner('quality',data);
    closeModal('hydroTestModal');
    showToast('Hydro test report saved','success');
}
function printHydroTestReport(){
    var win=window.open('', '_blank', 'width=1000,height=800');
    if(!win){showToast('⚠️ Please allow popups for PDF printing','error');return;}
    var html='<h1 style="text-align:center;color:#1e40af;">HYDROSTATIC PRESSURE TEST REPORT</h1>';
    html+='<p style="text-align:center;">Per ASME Section VIII Div 1 UG-99 / ASME Section I PG-99</p>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>Report No:</strong> '+getText('htReportNo')+'</td><td style="width:25%;"><strong>Date:</strong> '+getValue('htDate')+'</td><td style="width:25%;"><strong>WO/FO:</strong> '+getValue('htWONumber')+'</td><td style="width:25%;"><strong>Equipment:</strong> '+getValue('htEquipment')+'</td></tr>';
    html+='<tr><td><strong>Serial No:</strong> '+getValue('htSerialNo')+'</td><td><strong>Client:</strong> '+getValue('htClient')+'</td><td><strong>Location:</strong> '+getValue('htLocation')+'</td><td><strong>Code:</strong> '+getValue('htCode')+'</td></tr>';
    html+='</table>';

    // Section 1
    html+='<h2 style="color:#1e40af;border-bottom:1px solid #ddd;">Section 1: Equipment / Vessel Information</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>WO/FO:</strong> '+getValue('htWONumber')+'</td><td style="width:25%;"><strong>Equipment:</strong> '+getValue('htEquipment')+'</td><td style="width:25%;"><strong>Serial No:</strong> '+getValue('htSerialNo')+'</td><td style="width:25%;"><strong>Client:</strong> '+getValue('htClient')+'</td></tr>';
    html+='<tr><td><strong>Location:</strong> '+getValue('htLocation')+'</td><td><strong>Governing Code:</strong> '+getValue('htCode')+'</td><td></td><td></td></tr>';
    html+='</table>';

    // Section 2
    html+='<h2 style="color:#1e40af;border-bottom:1px solid #ddd;">Section 2: Design Parameters</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>MAWP:</strong> '+getValue('htMAWP')+' '+getValue('htMAWPUnit')+'</td><td style="width:25%;"><strong>Test Pressure:</strong> '+getValue('htTestPressure')+' '+getValue('htTestPressureUnit')+'</td><td style="width:25%;"><strong>Design Temp:</strong> '+getValue('htDesignTemp')+' '+getValue('htDesignTempUnit')+'</td><td style="width:25%;"><strong>Test Medium:</strong> '+getValue('htMedium')+'</td></tr>';
    html+='<tr><td><strong>Test Temp:</strong> '+getValue('htTestTemp')+'</td><td><strong>Metal Temp:</strong> '+getValue('htMetalTemp')+'</td><td></td><td></td></tr>';
    html+='</table>';

    // Section 3
    html+='<h2 style="color:#1e40af;border-bottom:1px solid #ddd;">Section 3: Test Equipment & Calibration</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>Gauge ID:</strong> '+getValue('htGaugeID')+'</td><td style="width:25%;"><strong>Gauge Range:</strong> '+getValue('htGaugeRange')+'</td><td style="width:25%;"><strong>Calibration Date:</strong> '+getValue('htGaugeCalDate')+'</td><td style="width:25%;"><strong>Pump Type:</strong> '+getValue('htPumpType')+'</td></tr>';
    html+='<tr><td><strong>Relief Valve:</strong> '+getValue('htReliefValve')+'</td><td><strong>Chart Recorder:</strong> '+getValue('htChartRecorder')+'</td><td></td><td></td></tr>';
    html+='</table>';

    // Section 4
    html+='<h2 style="color:#1e40af;border-bottom:1px solid #ddd;">Section 4: Test Procedure & Results</h2>';
    html+='<h3 style="font-size:13px;margin:10px 0 4px;">Test Sequence</h3>';
    html+='<table style="width:100%;font-size:10px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr style="background:#1e40af;color:#fff;"><th style="padding:5px;border:1px solid #999;">Step</th><th style="padding:5px;border:1px solid #999;">Description</th><th style="padding:5px;border:1px solid #999;">Status</th><th style="padding:5px;border:1px solid #999;">Remarks</th></tr>';
    document.querySelectorAll('#hydroTestModal .report-section table tbody tr').forEach(function(row){
        var tds=row.querySelectorAll('td');
        if(tds.length>=4){
            html+='<tr><td style="padding:3px;border:1px solid #999;text-align:center;">'+tds[0].textContent.trim()+'</td><td style="padding:3px;border:1px solid #999;">'+tds[1].textContent.trim()+'</td><td style="padding:3px;border:1px solid #999;">'+(tds[2].querySelector('select')?tds[2].querySelector('select').value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(tds[3].querySelector('input')?tds[3].querySelector('input').value:'')+'</td></tr>';
        }
    });
    html+='</table>';
    html+='<h3 style="font-size:13px;margin:10px 0 4px;">Pressure Readings</h3>';
    html+='<table style="width:100%;font-size:10px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr style="background:#1e40af;color:#fff;"><th style="padding:5px;border:1px solid #999;">Time</th><th style="padding:5px;border:1px solid #999;">Pressure</th><th style="padding:5px;border:1px solid #999;">Temperature</th><th style="padding:5px;border:1px solid #999;">Remarks</th></tr>';
    document.querySelectorAll('#htReadingTable tr').forEach(function(row){
        var inputs=row.querySelectorAll('input');
        html+='<tr><td style="padding:3px;border:1px solid #999;">'+(inputs[0]?inputs[0].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[1]?inputs[1].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[2]?inputs[2].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[3]?inputs[3].value:'')+'</td></tr>';
    });
    html+='</table>';

    // Section 5
    html+='<h2 style="color:#1e40af;border-bottom:1px solid #ddd;">Section 5: Visual Inspection During Test</h2>';
    var checks=[];
    ['htCheckWeld','htCheckNozzle','htCheckFlange','htCheckDeform','htCheckDrop','htCheckDrain'].forEach(function(id){
        var el=document.getElementById(id);if(el&&el.checked)checks.push(el.nextSibling?el.nextSibling.textContent.trim():id);
    });
    html+='<p style="font-size:12px;"><strong>Checklist:</strong> '+(checks.join('; ')||'None checked')+'</p>';
    html+='<p style="font-size:12px;"><strong>Leakage / Defects Observed:</strong> '+getValue('htDefects')+'</p>';

    // Section 6
    html+='<h2 style="color:#1e40af;border-bottom:1px solid #ddd;">Section 6: Final Test Result</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:50%;"><strong>Test Result:</strong> '+getValue('htResult')+'</td><td style="width:50%;"><strong>Test Duration:</strong> '+getValue('htDuration')+'</td></tr>';
    html+='</table>';
    html+='<p style="font-size:12px;"><strong>Conditions / Remarks:</strong> '+getValue('htRemarks')+'</p>';

    // Section 7
    html+='<h2 style="color:#1e40af;border-bottom:1px solid #ddd;">Section 7: Sign-Off & Approval</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:20px;">';
    html+='<tr style="background:#1e40af;color:#fff;"><th style="padding:8px;border:1px solid #999;">Role</th><th style="padding:8px;border:1px solid #999;">Name</th><th style="padding:8px;border:1px solid #999;">Date</th></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>Test Performed By</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('htTestedBy')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('htTestedDate')+'</td></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>Witnessed By (QC)</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('htQcName')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('htQcDate')+'</td></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>Authorized Inspector (AI)</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('htAiName')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('htAiDate')+'</td></tr>';
    html+='</table>';

    printWindow(win, 'Hydrostatic Test Report - '+getText('htReportNo'), html);
}
function printWindow(win, title, html){
    win.document.write('<!DOCTYPE html><html><head><title>'+title+'</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#333;}@media print{@page{size:landscape;margin:12mm;}body{padding:0;}}</style></head><body>'+html+'<div style="margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#999;text-align:center;">Generated from ADDeN ERP System | '+new Date().toLocaleString()+'</div></body></html>');
    win.document.close();
    setTimeout(function(){win.print();},500);
}

// ========== BUBBLE TEST ==========
function openBubbleTestModal(){
    var el=document.getElementById('bubbleTestModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    var rpt=document.getElementById('btReportNo');if(rpt)rpt.textContent='BT-'+Date.now().toString(36).toUpperCase();
    var dt=document.getElementById('btDate');if(dt)dt.value=new Date().toISOString().slice(0,10);
}
function addBTLocation(){
    var tbl=document.getElementById('btLocationTable');if(!tbl)return;
    var row=document.createElement('tr');
    row.innerHTML='<td><input type="text" style="flex:1"></td><td><input type="number" style="width:60px"></td><td><input type="text" style="width:80px"></td><td><input type="text" style="width:80px"></td><td><select><option>No</option><option>Yes</option></select></td><td><select><option>PASS</option><option>FAIL</option></select></td><td><input type="text" style="width:100px"></td>';
    tbl.appendChild(row);
}
function autoFillBTExample(){
    var fields={btDate:new Date().toISOString().slice(0,10),btWONumber:'WO-2024-001',btEquipment:'Vessel V-101',btClient:'Demo Client',btJointID:'J-001',btTestPressure:3.5,btAmbientTemp:'28',btSurfaceTemp:'27',btGauge:'PG-002',btTotalLength:12.5,btRemarks:'No leaks detected',btTestedBy:'John Smith',btQcName:'QC Inspector'};
    Object.keys(fields).forEach(function(k){var e=document.getElementById(k);if(e)e.value=fields[k];});
}
function saveBubbleTestReport(){
    var data={id:DB.genId('quality'),type:'bubbleTest',reportNo:getText('btReportNo'),date:getValue('btDate'),woNumber:getValue('btWONumber'),equipment:getValue('btEquipment'),client:getValue('btClient'),jointId:getValue('btJointID'),weldType:getValue('btWeldType'),standard:getValue('btStandard'),testPressure:getValue('btTestPressure'),medium:getValue('btMedium'),soapType:getValue('btSoapType'),result:getValue('btResult'),totalLength:getValue('btTotalLength'),remarks:getValue('btRemarks'),inspector:getValue('btTestedBy'),qcName:getValue('btQcName'),createdAt:new Date().toISOString()};
    saveWithOwner('quality',data);
    closeModal('bubbleTestModal');
    showToast('Bubble test report saved','success');
}
function printBubbleTestReport(){
    var win=window.open('', '_blank', 'width=1000,height=800');
    if(!win){showToast('⚠️ Please allow popups for PDF printing','error');return;}
    var html='<h1 style="text-align:center;color:#0891b2;">BUBBLE LEAK TEST REPORT</h1>';
    html+='<p style="text-align:center;">Per ASME Section V Article 10 / AWS D1.1</p>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>Report No:</strong> '+getText('btReportNo')+'</td><td style="width:25%;"><strong>Date:</strong> '+getValue('btDate')+'</td><td style="width:25%;"><strong>WO/FO:</strong> '+getValue('btWONumber')+'</td><td style="width:25%;"><strong>Equipment:</strong> '+getValue('btEquipment')+'</td></tr>';
    html+='<tr><td><strong>Client:</strong> '+getValue('btClient')+'</td><td><strong>Joint ID:</strong> '+getValue('btJointID')+'</td><td><strong>Weld Type:</strong> '+getValue('btWeldType')+'</td><td><strong>Standard:</strong> '+getValue('btStandard')+'</td></tr>';
    html+='</table>';
    html+='<h2 style="color:#0891b2;border-bottom:1px solid #ddd;">Section 1: General Information</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>WO/FO:</strong> '+getValue('btWONumber')+'</td><td style="width:25%;"><strong>Equipment:</strong> '+getValue('btEquipment')+'</td><td style="width:25%;"><strong>Client:</strong> '+getValue('btClient')+'</td><td style="width:25%;"><strong>Joint ID:</strong> '+getValue('btJointID')+'</td></tr>';
    html+='<tr><td><strong>Weld Type:</strong> '+getValue('btWeldType')+'</td><td><strong>Standard:</strong> '+getValue('btStandard')+'</td><td></td><td></td></tr>';
    html+='</table>';
    html+='<h2 style="color:#0891b2;border-bottom:1px solid #ddd;">Section 2: Test Parameters</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>Test Pressure:</strong> '+getValue('btTestPressure')+' '+getValue('btPressureUnit')+'</td><td style="width:25%;"><strong>Gas Medium:</strong> '+getValue('btMedium')+'</td><td style="width:25%;"><strong>Soap Type:</strong> '+getValue('btSoapType')+'</td><td style="width:25%;"><strong>Ambient Temp:</strong> '+getValue('btAmbientTemp')+'</td></tr>';
    html+='<tr><td><strong>Surface Temp:</strong> '+getValue('btSurfaceTemp')+'</td><td><strong>Gauge Used:</strong> '+getValue('btGauge')+'</td><td></td><td></td></tr>';
    html+='</table>';
    html+='<h2 style="color:#0891b2;border-bottom:1px solid #ddd;">Section 3: Test Locations & Results</h2>';
    html+='<table style="width:100%;font-size:10px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr style="background:#0891b2;color:#fff;"><th style="padding:5px;border:1px solid #999;">No.</th><th style="padding:5px;border:1px solid #999;">Location</th><th style="padding:5px;border:1px solid #999;">Length</th><th style="padding:5px;border:1px solid #999;">Soap Time</th><th style="padding:5px;border:1px solid #999;">Obs Time</th><th style="padding:5px;border:1px solid #999;">Bubbles</th><th style="padding:5px;border:1px solid #999;">Result</th><th style="padding:5px;border:1px solid #999;">Remarks</th></tr>';
    document.querySelectorAll('#btLocationTable tr').forEach(function(row, i){
        var inputs=row.querySelectorAll('input');
        var selects=row.querySelectorAll('select');
        html+='<tr><td style="padding:3px;border:1px solid #999;text-align:center;">'+(i+1)+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[0]?inputs[0].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[1]?inputs[1].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[2]?inputs[2].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[3]?inputs[3].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(selects[0]?selects[0].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(selects[1]?selects[1].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[4]?inputs[4].value:'')+'</td></tr>';
    });
    html+='</table>';
    html+='<h2 style="color:#0891b2;border-bottom:1px solid #ddd;">Section 4: Final Result</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:50%;"><strong>Overall Result:</strong> '+getValue('btResult')+'</td><td style="width:50%;"><strong>Total Length Tested:</strong> '+getValue('btTotalLength')+' mm</td></tr>';
    html+='</table>';
    html+='<p style="font-size:12px;"><strong>Comments / Remarks:</strong> '+getValue('btRemarks')+'</p>';
    html+='<h2 style="color:#0891b2;border-bottom:1px solid #ddd;">Section 5: Sign-Off</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:20px;">';
    html+='<tr style="background:#0891b2;color:#fff;"><th style="padding:8px;border:1px solid #999;">Role</th><th style="padding:8px;border:1px solid #999;">Name</th><th style="padding:8px;border:1px solid #999;">Date</th></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>Test Performed By</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('btTestedBy')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('btTestedDate')+'</td></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>QC Inspector</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('btQcName')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('btQcDate')+'</td></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>Authorized Inspector (AI)</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('btAiName')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('btAiDate')+'</td></tr>';
    html+='</table>';
    printWindow(win, 'Bubble Leak Test Report - '+getText('btReportNo'), html);
}

// ========== VISUAL INSPECTION ==========
function openVisualInspectionModal(){
    var el=document.getElementById('visualInspectionModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    var rpt=document.getElementById('vtReportNo');if(rpt)rpt.textContent='VT-'+Date.now().toString(36).toUpperCase();
    var dt=document.getElementById('vtDate');if(dt)dt.value=new Date().toISOString().slice(0,10);
}
function autoFillVTExample(){
    var fields={vtDate:new Date().toISOString().slice(0,10),vtWONumber:'WO-2024-001',vtEquipment:'Vessel V-101',vtClient:'Demo Client',vtLocation:'Weld Seam A',vtLighting:'Adequate',vtRemarks:'Surface condition acceptable',vtInspector:'John Smith',vtQcSupervisor:'QC Supervisor'};
    Object.keys(fields).forEach(function(k){var e=document.getElementById(k);if(e)e.value=fields[k];});
}
function saveVisualInspectionReport(){
    var data={id:DB.genId('quality'),type:'visualInspection',reportNo:getText('vtReportNo'),date:getValue('vtDate'),woNumber:getValue('vtWONumber'),equipment:getValue('vtEquipment'),stage:getValue('vtStage'),client:getValue('vtClient'),location:getValue('vtLocation'),code:getValue('vtCode'),lighting:getValue('vtLighting'),result:getValue('vtResult'),ndtRequired:getValue('vtNDTRequired'),remarks:getValue('vtRemarks'),inspector:getValue('vtInspector'),qcName:getValue('vtQcSupervisor'),createdAt:new Date().toISOString()};
    saveWithOwner('quality',data);
    closeModal('visualInspectionModal');
    showToast('Visual inspection report saved','success');
}
function printVisualInspectionReport(){
    var win=window.open('', '_blank', 'width=1000,height=800');
    if(!win){showToast('⚠️ Please allow popups for PDF printing','error');return;}
    var html='<h1 style="text-align:center;color:#7c3aed;">VISUAL INSPECTION REPORT (VT)</h1>';
    html+='<p style="text-align:center;">Per ASME Section V Article 9 / ASME B31.3</p>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>Report No:</strong> '+getText('vtReportNo')+'</td><td style="width:25%;"><strong>Date:</strong> '+getValue('vtDate')+'</td><td style="width:25%;"><strong>WO/FO:</strong> '+getValue('vtWONumber')+'</td><td style="width:25%;"><strong>Equipment:</strong> '+getValue('vtEquipment')+'</td></tr>';
    html+='<tr><td><strong>Stage:</strong> '+getValue('vtStage')+'</td><td><strong>Client:</strong> '+getValue('vtClient')+'</td><td><strong>Location:</strong> '+getValue('vtLocation')+'</td><td><strong>Code:</strong> '+getValue('vtCode')+'</td></tr>';
    html+='</table>';
    html+='<h2 style="color:#7c3aed;border-bottom:1px solid #ddd;">Section 1: General Information</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>WO/FO:</strong> '+getValue('vtWONumber')+'</td><td style="width:25%;"><strong>Equipment:</strong> '+getValue('vtEquipment')+'</td><td style="width:25%;"><strong>Stage:</strong> '+getValue('vtStage')+'</td><td style="width:25%;"><strong>Client:</strong> '+getValue('vtClient')+'</td></tr>';
    html+='<tr><td><strong>Location:</strong> '+getValue('vtLocation')+'</td><td><strong>Code:</strong> '+getValue('vtCode')+'</td><td></td><td></td></tr>';
    html+='</table>';
    html+='<h2 style="color:#7c3aed;border-bottom:1px solid #ddd;">Section 2: Inspection Equipment Used</h2>';
    var tools=[];
    ['vtToolLight','vtToolGauge','vtToolMirror','vtToolMagnify','vtToolTape','vtToolCaliper','vtToolBorescope','vtToolThermo'].forEach(function(id){
        var el=document.getElementById(id);if(el&&el.checked)tools.push(el.nextSibling?el.nextSibling.textContent.trim():id.replace('vtTool',''));
    });
    html+='<p style="font-size:12px;"><strong>Tools Used:</strong> '+(tools.join(', ')||'None selected')+'</p>';
    html+='<p style="font-size:12px;"><strong>Lighting Conditions:</strong> '+getValue('vtLighting')+'</p>';
    html+='<h2 style="color:#7c3aed;border-bottom:1px solid #ddd;">Section 3: Visual Inspection Checklist</h2>';
    html+='<table style="width:100%;font-size:10px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr style="background:#7c3aed;color:#fff;"><th style="padding:5px;border:1px solid #999;">No.</th><th style="padding:5px;border:1px solid #999;">Check Item</th><th style="padding:5px;border:1px solid #999;">Acceptance Criteria</th><th style="padding:5px;border:1px solid #999;">Result</th><th style="padding:5px;border:1px solid #999;">Remarks</th></tr>';
    var itemNo=1;
    document.querySelectorAll('#visualInspectionModal table tbody tr').forEach(function(row){
        var tds=row.querySelectorAll('td');
        if(tds.length>=5){
            html+='<tr><td style="padding:3px;border:1px solid #999;text-align:center;">'+itemNo+'</td><td style="padding:3px;border:1px solid #999;">'+tds[1].textContent.trim()+'</td><td style="padding:3px;border:1px solid #999;">'+tds[2].textContent.trim()+'</td><td style="padding:3px;border:1px solid #999;">'+(tds[3].querySelector('select')?tds[3].querySelector('select').value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(tds[4].querySelector('input')?tds[4].querySelector('input').value:'')+'</td></tr>';
            itemNo++;
        }
    });
    html+='</table>';
    html+='<h2 style="color:#7c3aed;border-bottom:1px solid #ddd;">Section 4: Final Result</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:50%;"><strong>Inspection Result:</strong> '+getValue('vtResult')+'</td><td style="width:50%;"><strong>Follow-up NDT Required:</strong> '+getValue('vtNDTRequired')+'</td></tr>';
    html+='</table>';
    html+='<p style="font-size:12px;"><strong>Detailed Findings / Remarks:</strong> '+getValue('vtRemarks')+'</p>';
    html+='<h2 style="color:#7c3aed;border-bottom:1px solid #ddd;">Section 5: Sign-Off</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:20px;">';
    html+='<tr style="background:#7c3aed;color:#fff;"><th style="padding:8px;border:1px solid #999;">Role</th><th style="padding:8px;border:1px solid #999;">Name</th><th style="padding:8px;border:1px solid #999;">Date</th></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>Inspector</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('vtInspector')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('vtInspectorDate')+'</td></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>QC Supervisor</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('vtQcSupervisor')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('vtQcDate')+'</td></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>AI (if required)</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('vtAiName')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('vtAiDate')+'</td></tr>';
    html+='</table>';
    printWindow(win, 'Visual Inspection Report - '+getText('vtReportNo'), html);
}

// ========== UTM REPORT ==========
function openUtmReportModal(){
    var el=document.getElementById('utmReportModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    var rpt=document.getElementById('utmReportNo');if(rpt)rpt.textContent='UTM-'+Date.now().toString(36).toUpperCase();
    var dt=document.getElementById('utmDate');if(dt)dt.value=new Date().toISOString().slice(0,10);
    generateUTMGrid();
}
function generateUTMGrid(){
    var rows=parseInt(getValue('utmRows'))||5;
    var cols=parseInt(getValue('utmCols'))||5;
    var tbl=document.getElementById('utmGridBody');if(!tbl)return;
    tbl.innerHTML='';
    for(var r=0;r<rows;r++){
        var tr=document.createElement('tr');
        var td=document.createElement('td');td.textContent='Row '+(r+1);tr.appendChild(td);
        for(var c=0;c<cols;c++){
            var td2=document.createElement('td');
            var inp=document.createElement('input');inp.type='number';inp.style.width='60px';
            inp.className='utm-cell';inp.oninput=function(){updateUTMStats();};
            td2.appendChild(inp);tr.appendChild(td2);
        }
        tbl.appendChild(tr);
    }
    updateUTMStats();
}
function updateUTMStats(){
    var cells=document.querySelectorAll('.utm-cell');
    var vals=[];
    cells.forEach(function(c){var v=parseFloat(c.value);if(!isNaN(v))vals.push(v);});
    if(!vals.length)return;
    var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);
    var avg=vals.reduce(function(a,b){return a+b;},0)/vals.length;
    var origThk=parseFloat(getValue('utmOriginalThk'))||0;
    var corrRate=0;
    var years=1;
    if(origThk>0&&mn<origThk)corrRate=((origThk-mn)/years).toFixed(3);
    setText('utmMinReading',mn.toFixed(1));setText('utmMaxReading',mx.toFixed(1));setText('utmAvgReading',avg.toFixed(2));setText('utmCorrosionRate',corrRate);
}
function saveUtmReport(){
    var data={id:DB.genId('quality'),type:'utm',reportNo:getText('utmReportNo'),date:getValue('utmDate'),woNumber:getValue('utmWONumber'),equipment:getValue('utmEquipment'),serialNo:getValue('utmSerialNo'),client:getValue('utmClient'),location:getValue('utmLocation'),equipType:getValue('utmEquipType'),originalThk:getValue('utmOriginalThk'),minReading:getText('utmMinReading'),maxReading:getText('utmMaxReading'),avgReading:getText('utmAvgReading'),corrosionRate:getText('utmCorrosionRate'),result:getValue('utmResult'),nextInspection:getValue('utmNextInspection'),recommendations:getValue('utmRecommendations'),techName:getValue('utmTechName'),qcName:getValue('utmQcName'),createdAt:new Date().toISOString()};
    saveWithOwner('quality',data);
    closeModal('utmReportModal');
    showToast('UTM report saved','success');
}
function printUtmReport(){
    var win=window.open('', '_blank', 'width=1000,height=800');
    if(!win){showToast('⚠️ Please allow popups for PDF printing','error');return;}
    var html='<h1 style="text-align:center;color:#ea580c;">THICKNESS MEASUREMENT REPORT (UTT)</h1>';
    html+='<p style="text-align:center;">Per ASME Section V Article 23 / ASTM E797 / ASME B31.3</p>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>Report No:</strong> '+getText('utmReportNo')+'</td><td style="width:25%;"><strong>Date:</strong> '+getValue('utmDate')+'</td><td style="width:25%;"><strong>WO/FO:</strong> '+getValue('utmWONumber')+'</td><td style="width:25%;"><strong>Equipment:</strong> '+getValue('utmEquipment')+'</td></tr>';
    html+='<tr><td><strong>Tag No:</strong> '+getValue('utmTagNo')+'</td><td><strong>Client:</strong> '+getValue('utmClient')+'</td><td><strong>Location:</strong> '+getValue('utmLocation')+'</td><td><strong>Standard:</strong> '+getValue('utmStandard')+'</td></tr>';
    html+='</table>';
    html+='<h2 style="color:#ea580c;border-bottom:1px solid #ddd;">Section 1: Equipment Information</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>WO/FO:</strong> '+getValue('utmWONumber')+'</td><td style="width:25%;"><strong>Equipment:</strong> '+getValue('utmEquipment')+'</td><td style="width:25%;"><strong>Tag No:</strong> '+getValue('utmTagNo')+'</td><td style="width:25%;"><strong>Client:</strong> '+getValue('utmClient')+'</td></tr>';
    html+='<tr><td><strong>Location:</strong> '+getValue('utmLocation')+'</td><td><strong>Standard:</strong> '+getValue('utmStandard')+'</td><td></td><td></td></tr>';
    html+='</table>';
    html+='<h2 style="color:#ea580c;border-bottom:1px solid #ddd;">Section 2: Design & Reference Data</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>Design Thickness:</strong> '+getValue('utmDesignThickness')+' mm</td><td style="width:25%;"><strong>Minimum Required:</strong> '+getValue('utmMinRequired')+' mm</td><td style="width:25%;"><strong>Allowance:</strong> '+getValue('utmAllowance')+' mm</td><td style="width:25%;"><strong>Corrosion Rate:</strong> '+getValue('utmCorrosionRate')+' mm/year</td></tr>';
    html+='<tr><td><strong>Remaining Life:</strong> '+getValue('utmRemainingLife')+' years</td><td><strong>Next Inspection:</strong> '+getValue('utmNextInspection')+'</td><td></td><td></td></tr>';
    html+='</table>';
    html+='<h2 style="color:#ea580c;border-bottom:1px solid #ddd;">Section 3: Ultrasonic Equipment Details</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:25%;"><strong>Instrument:</strong> '+getValue('utmInstrument')+'</td><td style="width:25%;"><strong>Probe:</strong> '+getValue('utmProbe')+'</td><td style="width:25%;"><strong>Calibration Block:</strong> '+getValue('utmCalBlock')+'</td><td style="width:25%;"><strong>Couplant:</strong> '+getValue('utmCouplant')+'</td></tr>';
    html+='<tr><td><strong>Surface Condition:</strong> '+getValue('utmSurface')+'</td><td><strong>Temperature:</strong> '+getValue('utmTemperature')+'</td><td></td><td></td></tr>';
    html+='</table>';
    html+='<h2 style="color:#ea580c;border-bottom:1px solid #ddd;">Section 4: Thickness Measurement Data</h2>';
    html+='<table style="width:100%;font-size:10px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr style="background:#ea580c;color:#fff;"><th style="padding:5px;border:1px solid #999;">No.</th><th style="padding:5px;border:1px solid #999;">Location / Grid</th><th style="padding:5px;border:1px solid #999;">Nominal</th><th style="padding:5px;border:1px solid #999;">Measured</th><th style="padding:5px;border:1px solid #999;">Minimum Required</th><th style="padding:5px;border:1px solid #999;">Status</th><th style="padding:5px;border:1px solid #999;">Remarks</th></tr>';
    document.querySelectorAll('#utmMeasurementsTable tr').forEach(function(row, i){
        var inputs=row.querySelectorAll('input');
        var selects=row.querySelectorAll('select');
        html+='<tr><td style="padding:3px;border:1px solid #999;text-align:center;">'+(i+1)+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[0]?inputs[0].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[1]?inputs[1].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[2]?inputs[2].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[3]?inputs[3].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(selects[0]?selects[0].value:'')+'</td><td style="padding:3px;border:1px solid #999;">'+(inputs[4]?inputs[4].value:'')+'</td></tr>';
    });
    html+='</table>';
    html+='<h2 style="color:#ea580c;border-bottom:1px solid #ddd;">Section 5: Measurement Location Sketch</h2>';
    html+='<p style="font-size:12px;"><strong>Sketch / Grid Reference:</strong> '+getValue('utmSketch')+'</p>';
    html+='<h2 style="color:#ea580c;border-bottom:1px solid #ddd;">Section 6: Final Assessment</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">';
    html+='<tr><td style="width:50%;"><strong>Final Assessment:</strong> '+getValue('utmFinalAssessment')+'</td><td style="width:50%;"><strong>Remaining Life:</strong> '+getValue('utmRemainingLife')+' years</td></tr>';
    html+='<tr><td><strong>Next Inspection Date:</strong> '+getValue('utmNextInspection')+'</td><td><strong>Remarks:</strong> '+getValue('utmRemarks')+'</td></tr>';
    html+='</table>';
    html+='<h2 style="color:#ea580c;border-bottom:1px solid #ddd;">Section 7: Sign-Off</h2>';
    html+='<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:20px;">';
    html+='<tr style="background:#ea580c;color:#fff;"><th style="padding:8px;border:1px solid #999;">Role</th><th style="padding:8px;border:1px solid #999;">Name</th><th style="padding:8px;border:1px solid #999;">Date</th></tr>';
    html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>NDT Technician</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('utmTechnician')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('utmTechDate')+'</td></tr>';
html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>QC Inspector</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('utmQcInspector')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('utmQcDate')+'</td></tr>';
html+='<tr><td style="padding:8px;border:1px solid #999;"><strong>AI / Authorized Inspector</strong></td><td style="padding:8px;border:1px solid #999;">'+getValue('utmAiName')+'</td><td style="padding:8px;border:1px solid #999;">'+getValue('utmAiDate')+'</td></tr>';
    html+='</table>';
    printWindow(win, 'Thickness UTT Report - '+getText('utmReportNo'), html);
}

// ========== THICKNESS ==========
function openThicknessModal(){
    var el=document.getElementById('thicknessModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    toggleThkCodeFields();
}
function toggleThkCodeFields(){
    var code=getValue('thkCode');
    var comp=getValue('thkComponent');
    var yEl=document.getElementById('thkY');
    if(yEl){
        if(code==='VIII-1'||comp==='vessel')yEl.value='0.7';
        else if(code==='B31.3'||comp==='pipe')yEl.value='0.4';
        else yEl.value='0.5';
    }
}
function calculateThickness(){
    var P=parseFloat(getValue('thkPressure'))||0;
    var D=parseFloat(getValue('thkOD'))||0;
    var S=parseFloat(getValue('thkStress'))||0;
    var E=parseFloat(getValue('thkJointEff'))||1;
    var CA=parseFloat(getValue('thkCA'))||0;
    var Y=parseFloat(getValue('thkY'))||0.4;
    var tnom=parseFloat(getValue('thkNominal'))||0;
    var tact=parseFloat(getValue('thkActual'))||0;
    var tprev=parseFloat(getValue('thkPrevious'))||0;
    var years=parseFloat(getValue('thkYears'))||1;
    var tMin=0,corrRate=0,remLife=0,margin=0,status='GOOD',nextDue='';
    var code=getValue('thkCode');
    if(code==='VIII-1'||code==='API510'){
        tMin=(P*D/(2*S*E-1.2*P))+CA;
    }else if(code==='B31.3'){
        tMin=(P*D/(2*(S*E+P*Y)))+CA;
    }else if(code==='B31.1'){
        tMin=(P*D/(2*S*E+1.2*P))+CA;
    }else{
        tMin=(P*D/(2*S*E-1.2*P))+CA;
    }
    if(tact>0&&tprev>0&&years>0){
        corrRate=(tprev-tact)/years;
        if(corrRate>0)remLife=(tact-tMin)/corrRate;
        else remLife=999;
    }
    margin=tact-tMin;
    if(margin<=0)status='CRITICAL';
    else if(margin<CA*0.5)status='WARNING';
    else status='GOOD';
    if(corrRate>0&&remLife<999){
        var nextDate=new Date();nextDate.setFullYear(nextDate.getFullYear()+Math.floor(remLife));
        nextDue=nextDate.toISOString().slice(0,10);
    }
    setText('thkMinResult',tMin.toFixed(2)+' mm');
    setText('thkCorrRateResult',corrRate.toFixed(3)+' mm/yr');
    setText('thkRemLifeResult',remLife<999?remLife.toFixed(1)+' years':'N/A');
    setText('thkMarginResult',margin.toFixed(2)+' mm');
    setText('thkStatusResult',status);
    setText('thkNextDueResult',nextDue||'N/A');
}
function saveThickness(){
    var data={id:DB.genId('quality'),type:'thickness',equipment:getValue('thkEquipment'),component:getValue('thkComponent'),material:getValue('thkMaterial'),code:getValue('thkCode'),od:getValue('thkOD'),pressure:getValue('thkPressure'),stress:getValue('thkStress'),jointEff:getValue('thkJointEff'),ca:getValue('thkCA'),nominalThk:getValue('thkNominal'),actualThk:getValue('thkActual'),previousThk:getValue('thkPrevious'),years:getValue('thkYears'),minThk:getText('thkMinResult'),corrRate:getText('thkCorrRateResult'),remLife:getText('thkRemLifeResult'),margin:getText('thkMarginResult'),status:getText('thkStatusResult'),nextDue:getText('thkNextDueResult'),location:getValue('thkLocation'),createdAt:new Date().toISOString()};
    saveWithOwner('quality',data);
    closeModal('thicknessModal');
    showToast('Thickness calculation saved','success');
}

// ========== CERTIFICATE ==========
function openCertificateModal(){
    var el=document.getElementById('certificateModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    var inspSel=document.getElementById('certInspRef');if(inspSel){
        inspSel.innerHTML='<option value="">None</option>';
        DB.get('quality').forEach(function(q){inspSel.innerHTML+='<option value="'+q.id+'">'+(q.reportNo||q.type||q.id)+'</option>';});
    }
}
function saveCertificate(){
    var data={id:DB.genId('certificates'),certNo:getValue('certNo'),type:getValue('certType'),issuer:getValue('certIssuer'),inspRef:getValue('certInspRef'),issueDate:getValue('certIssueDate'),expiryDate:getValue('certExpiryDate'),status:getValue('certStatus'),docRef:getValue('certDocRef'),notes:getValue('certNotes'),createdAt:new Date().toISOString()};
    saveWithOwner('certificates',data);
    closeModal('certificateModal');
    showToast('Certificate saved','success');
}

// ========== TRACEABILITY ==========
function openTraceabilityModal(){
    var el=document.getElementById('traceabilityModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    var inspSel=document.getElementById('traceInspRef');if(inspSel){
        inspSel.innerHTML='<option value="">None</option>';
        DB.get('quality').forEach(function(q){inspSel.innerHTML+='<option value="'+q.id+'">'+(q.reportNo||q.type||q.id)+'</option>';});
    }
}
function saveTraceability(){
    var data={id:DB.genId('traceability'),material:getValue('traceMaterial'),grade:getValue('traceGrade'),heatNo:getValue('traceHeatNo'),lotNo:getValue('traceLotNo'),millCert:getValue('traceMillCert'),supplier:getValue('traceSupplier'),qty:getValue('traceQty'),inspRef:getValue('traceInspRef'),notes:getValue('traceNotes'),createdAt:new Date().toISOString()};
    saveWithOwner('traceability',data);
    closeModal('traceabilityModal');
    showToast('Traceability record saved','success');
}

// ========== METHOD STATEMENT, JSA & ITP FUNCTIONS ==========

// Tab Switching
function showMsTab(tabName, btn) {
    document.querySelectorAll('.ms-tab-content').forEach(function(t) { t.style.display = 'none'; });
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    var tabIds = { method: 'msTabMethod', jsa: 'msTabJSA', itp: 'msTabITP' };
    var el = document.getElementById(tabIds[tabName] || 'msTab' + tabName);
    if (el) el.style.display = 'block';
    if (btn) btn.classList.add('active');
}

// ===== METHOD STATEMENT STEPS =====
var msStepCounter = 0;

function addMsStep(description, responsible, tools) {
    description = description || '';
    responsible = responsible || '';
    tools = tools || '';
    msStepCounter++;
    var table = document.getElementById('msStepsTable');
    if (!table) return;
    var row = document.createElement('tr');
    row.id = 'msStep' + msStepCounter;
    row.innerHTML = '<td style="text-align:center;">' + msStepCounter + '</td>' +
        '<td><input type="text" class="form-control" style="font-size:11px;" value="' + escapeHtml(description) + '" placeholder="Describe activity..."></td>' +
        '<td><input type="text" class="form-control" style="font-size:11px;" value="' + escapeHtml(responsible) + '" placeholder="e.g. Welder"></td>' +
        '<td><input type="text" class="form-control" style="font-size:11px;" value="' + escapeHtml(tools) + '" placeholder="e.g. SMAW Machine"></td>' +
        '<td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest(\'tr\').remove()">×</button></td>';
    table.appendChild(row);
}

// ===== JSA FUNCTIONS =====
var jsaRowCounter = 0;

function addJSARow(step, hazard, L, S, controls) {
    step = step || '';
    hazard = hazard || '';
    L = L || 2;
    S = S || 2;
    controls = controls || '';
    jsaRowCounter++;
    var table = document.getElementById('jsaTableBody');
    if (!table) return;
    var risk = L * S;
    var riskClass = 'med';
    if (risk > 16) riskClass = 'extreme';
    else if (risk > 10) riskClass = 'high';
    else if (risk <= 5) riskClass = 'low';
    var row = document.createElement('tr');
    row.id = 'jsaRow' + jsaRowCounter;
    row.innerHTML = '<td style="text-align:center;">' + jsaRowCounter + '</td>' +
        '<td><textarea class="form-control" style="font-size:10px;min-height:40px;" placeholder="Task step...">' + escapeHtml(step) + '</textarea></td>' +
        '<td><textarea class="form-control" style="font-size:10px;min-height:40px;" placeholder="Hazards...">' + escapeHtml(hazard) + '</textarea></td>' +
        '<td><input type="number" class="form-control" style="font-size:10px;width:45px;text-align:center;" value="' + L + '" min="1" max="5" onchange="updateJSARisk(\'' + row.id + '\')"></td>' +
        '<td><input type="number" class="form-control" style="font-size:10px;width:45px;text-align:center;" value="' + S + '" min="1" max="5" onchange="updateJSARisk(\'' + row.id + '\')"></td>' +
        '<td class="score-box ' + riskClass + '" style="text-align:center;font-weight:700;">' + risk + '</td>' +
        '<td><textarea class="form-control" style="font-size:10px;min-height:40px;" placeholder="Control measures...">' + escapeHtml(controls) + '</textarea></td>' +
        '<td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest(\'tr\').remove()">×</button></td>';
    table.appendChild(row);
}

function updateJSARisk(rowId) {
    var row = document.getElementById(rowId);
    if (!row) return;
    var L = parseInt(row.querySelectorAll('td')[3].querySelector('input').value) || 1;
    var S = parseInt(row.querySelectorAll('td')[4].querySelector('input').value) || 1;
    var risk = L * S;
    var riskCell = row.querySelectorAll('td')[5];
    riskCell.textContent = risk;
    riskCell.className = 'score-box';
    if (risk <= 5) riskCell.classList.add('low');
    else if (risk <= 10) riskCell.classList.add('med');
    else if (risk <= 16) riskCell.classList.add('high');
    else riskCell.classList.add('extreme');
}

// ===== ITP FUNCTIONS =====
var itpRowCounter = 0;

function addITPRow(no, activity, ref, criteria, freq, contractor, owner, tp, record) {
    no = no || '';
    activity = activity || '';
    ref = ref || '';
    criteria = criteria || '';
    freq = freq || '100%';
    contractor = contractor || 'Perform';
    owner = owner || 'Review';
    tp = tp || 'Not Req.';
    record = record || '';
    itpRowCounter++;
    var table = document.getElementById('itpTableBody');
    if (!table) return;
    var row = document.createElement('tr');
    row.id = 'itpRow' + itpRowCounter;
    row.innerHTML = '<td><input type="text" class="form-control" style="font-size:10px;text-align:center;" value="' + escapeHtml(no) + '"></td>' +
        '<td><textarea class="form-control" style="font-size:10px;min-height:35px;">' + escapeHtml(activity) + '</textarea></td>' +
        '<td><textarea class="form-control" style="font-size:10px;min-height:35px;">' + escapeHtml(ref) + '</textarea></td>' +
        '<td><textarea class="form-control" style="font-size:10px;min-height:35px;">' + escapeHtml(criteria) + '</textarea></td>' +
        '<td><input type="text" class="form-control" style="font-size:10px;" value="' + escapeHtml(freq) + '"></td>' +
        '<td><select class="form-control" style="font-size:10px;">' +
            '<option' + (contractor === 'Hold' ? ' selected' : '') + '>Hold</option>' +
            '<option' + (contractor === 'Witness' ? ' selected' : '') + '>Witness</option>' +
            '<option' + (contractor === 'Review' ? ' selected' : '') + '>Review</option>' +
            '<option' + (contractor === 'Perform' ? ' selected' : '') + '>Perform</option></select></td>' +
        '<td><select class="form-control" style="font-size:10px;">' +
            '<option' + (owner === 'Review' ? ' selected' : '') + '>Review</option>' +
            '<option' + (owner === 'Witness' ? ' selected' : '') + '>Witness</option>' +
            '<option' + (owner === 'Approve' ? ' selected' : '') + '>Approve</option>' +
            '<option' + (owner === 'Perform' ? ' selected' : '') + '>Perform</option></select></td>' +
        '<td><select class="form-control" style="font-size:10px;">' +
            '<option' + (tp === 'Not Req.' ? ' selected' : '') + '>Not Req.</option>' +
            '<option' + (tp === 'Witness' ? ' selected' : '') + '>Witness</option>' +
            '<option' + (tp === 'Review' ? ' selected' : '') + '>Review</option>' +
            '<option' + (tp === 'Hold' ? ' selected' : '') + '>Hold</option></select></td>' +
        '<td><textarea class="form-control" style="font-size:10px;min-height:35px;">' + escapeHtml(record) + '</textarea></td>' +
        '<td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest(\'tr\').remove()">×</button></td>';
    table.appendChild(row);
}

function addITPSection(title) {
    title = title || 'NEW SECTION';
    var table = document.getElementById('itpTableBody');
    if (!table) return;
    var row = document.createElement('tr');
    row.style.background = '#f2f2f2';
    row.style.fontWeight = 'bold';
    row.innerHTML = '<td colspan="9"><input type="text" class="form-control" style="font-weight:bold;font-size:11px;" value="' + escapeHtml(title) + '"></td>' +
        '<td><button class="btn btn-xs btn-ghost" style="color:#dc2626;" onclick="this.closest(\'tr\').remove()">×</button></td>';
    table.appendChild(row);
}

// ===== INITIALIZE DEFAULT DATA =====
function initMethodStatementDefaults() {
    // Clear existing
    document.getElementById('msStepsTable').innerHTML = '';
    document.getElementById('jsaTableBody').innerHTML = '';
    document.getElementById('itpTableBody').innerHTML = '';
    msStepCounter = 0;
    jsaRowCounter = 0;
    itpRowCounter = 0;

    // Add default MS steps
    addMsStep('Pre-job meeting and toolbox talk', 'Supervisor', 'Toolbox meeting form');
    addMsStep('Equipment isolation and LOTO', 'Operations', 'LOTO kit, locks');
    addMsStep('Surface preparation and cleaning', 'Fitter', 'Wire brush, grinder');
    addMsStep('Welding / repair execution per WPS', 'Certified Welder', 'SMAW Machine, E7018');
    addMsStep('Post-weld visual inspection', 'QC Inspector', 'Weld gauge, flashlight');
    addMsStep('NDT (PT/MT) if required', 'NDT Level II', 'PT kit / MT yoke');
    addMsStep('Final inspection and handover', 'Supervisor + QC', 'Checklist, report');

    // Add default JSA rows
    addJSARow('Pre-job meeting', 'Miscommunication', 2, 2, 'Conduct toolbox talk, review JSA, confirm PPE');
    addJSARow('Isolation & LOTO', 'Unexpected energization', 3, 4, 'Apply LOTO, verify zero energy, use locks');
    addJSARow('Grinding/Cleaning', 'Flying debris, noise, dust', 3, 3, 'Face shield, hearing protection, respirator');
    addJSARow('Welding operations', 'Arc flash, fumes, fire', 3, 4, 'Welding helmet, FR clothing, fire watch, ventilation');
    addJSARow('Post-weld inspection', 'Sharp edges, slips', 2, 2, 'Cut-resistant gloves, good housekeeping');

    // Add default ITP sections
    addITPSection('1.0 PREPARATION & MATERIAL VERIFICATION');
    addITPRow('1.1', 'Material receiving & identification', 'MTC / EN10025', 'Mill cert, thickness 9mm ±0.5', 'Each plate', 'Hold', 'Review', 'Witness', 'MTC, Visual Log');
    addITPRow('1.2', 'WPS & Welder Qualification', 'WPS/PQR', 'WPS qualified, welder certs valid', 'Per job', 'Review', 'Approve', 'Review', 'WPS, PQR, WPQ');
    addITPRow('1.3', 'Surface preparation', 'ISO 8501', 'SA 2.5, no scale, clean', '100%', 'Hold', 'Witness', 'Not Req.', 'Surface prep report');

    addITPSection('2.0 FIT-UP & WELDING');
    addITPRow('2.1', 'Joint fit-up inspection', 'WPS / Drawing', 'Root gap 2-4mm, misalign ≤1.5mm', '100%', 'Hold', 'Witness', 'Witness', 'Fit-up checklist');
    addITPRow('2.2', 'Root pass visual', 'ISO 17637', 'Full penetration, no cracks', 'Per pass', 'Perform', 'Review', 'Not Req.', 'Welding log');

    addITPSection('3.0 POST-WELD INSPECTION');
    addITPRow('3.1', 'Final visual inspection (VT)', 'ISO 5817', 'Reinforcement ≤3mm, undercut ≤0.5mm', '100%', 'Hold', 'Witness', 'Witness', 'VT Report');
    addITPRow('3.2', 'Penetrant Testing (PT)', 'ASME Sec V', 'No linear indications >1.5mm', '100% weld', 'Hold', 'Witness', 'Witness', 'NDT Report');

    addITPSection('4.0 FINAL TESTING & HANDOVER');
    addITPRow('4.1', 'Hydrostatic test (if required)', 'ASME VIII UG-99', 'No leakage, 1.3x MAWP / 30 min', 'Per vessel', 'Hold', 'Witness', 'Witness', 'Pressure test log');
    addITPRow('4.2', 'Final documentation review', 'ITP / MDR', 'All records complete, NCRs closed', 'Final', 'Hold', 'Approve', 'Review', 'Final Dossier');
}

// ===== OPEN MODAL =====
function openMethodStatementModal(editId) {
    var el = document.getElementById('methodStatementModal');
    if (!el) return;
    el.style.display = 'flex';
    el.classList.add('active');

    // Populate WO references
    var sel = document.getElementById('msWO');
    if (sel) {
        sel.innerHTML = '<option value="">— Select Work Order —</option>';
        DB.get('workOrders').concat(DB.get('serviceCalls')).forEach(function(j) {
            sel.innerHTML += '<option value="' + j.id + '">' + j.id + ' — ' + (j.client || j.productName || j.equipment || j.title || '') + '</option>';
        });
    }

    document.getElementById('msEditId').value = editId || '';

    if (editId) {
        // Load existing MS data for editing
        var ms = DB.getById('methodStatements', editId);
        if (ms) {
            document.getElementById('msSubject').value = ms.subject || '';
            document.getElementById('msType').value = ms.type || 'Repair';
            document.getElementById('msPriority').value = ms.priority || 'Normal';
            document.getElementById('msRevision').value = ms.revision || 'Rev 0';
            document.getElementById('msScope').value = ms.scope || '';
            document.getElementById('msRefDocs').value = ms.refDocs || '';
            document.getElementById('msRefDrawings').value = ms.refDrawings || '';
            document.getElementById('msManpower').value = ms.manpower || '';
            document.getElementById('msDuration').value = ms.duration || '';
            document.getElementById('msWPS').value = ms.wps || '';
            document.getElementById('jsaJobTitle').value = ms.jsaJobTitle || '';
            document.getElementById('jsaLocation').value = ms.jsaLocation || '';
            document.getElementById('jsaRefNo').value = ms.jsaRefNo || '';
            document.getElementById('jsaEmergency').value = ms.jsaEmergency || '';
            document.getElementById('itpDocNo').value = ms.itpDocNo || 'ITP-2026-001';
            document.getElementById('itpProject').value = ms.itpProject || '';
            document.getElementById('itpClient').value = ms.itpClient || '';
            document.getElementById('itpNotes').value = ms.itpNotes || '';

            // Load steps, JSA rows, ITP rows
            document.getElementById('msStepsTable').innerHTML = '';
            document.getElementById('jsaTableBody').innerHTML = '';
            document.getElementById('itpTableBody').innerHTML = '';
            msStepCounter = 0;
            jsaRowCounter = 0;
            itpRowCounter = 0;

            if (ms.msSteps && ms.msSteps.length) {
                ms.msSteps.forEach(function(s) { addMsStep(s.description, s.responsible, s.tools); });
            } else {
                addMsStep('Pre-job meeting and toolbox talk', 'Supervisor', 'Toolbox meeting form');
                addMsStep('Equipment isolation and LOTO', 'Operations', 'LOTO kit, locks');
                addMsStep('Welding / repair execution per WPS', 'Certified Welder', 'SMAW Machine, E7018');
                addMsStep('Final inspection and handover', 'Supervisor + QC', 'Checklist, report');
            }

            if (ms.jsaRows && ms.jsaRows.length) {
                ms.jsaRows.forEach(function(r) { addJSARow(r.step, r.hazard, r.L, r.S, r.controls); });
            } else {
                addJSARow('Pre-job meeting', 'Miscommunication', 2, 2, 'Conduct toolbox talk');
                addJSARow('Welding operations', 'Arc flash, fumes, fire', 3, 4, 'Welding helmet, FR clothing, fire watch');
            }

            if (ms.itpRows && ms.itpRows.length) {
                ms.itpRows.forEach(function(r) {
                    if (r.isSection) { addITPSection(r.title); }
                    else { addITPRow(r.no, r.activity, r.ref, r.criteria, r.freq, r.contractor, r.owner, r.tp, r.record); }
                });
            } else {
                addITPRow('1.0', 'Material verification', 'MTC', 'Mill cert match', '100%', 'Hold', 'Review', 'Witness', 'MTC Log');
                addITPRow('2.0', 'Weld visual inspection', 'ISO 5817', 'Reinforcement ≤3mm', '100%', 'Hold', 'Witness', 'Witness', 'VT Report');
            }
        }
    } else {
        // New - set defaults
        document.getElementById('msSubject').value = '';
        document.getElementById('msScope').value = '';
        document.getElementById('msRefDocs').value = '';
        document.getElementById('msRefDrawings').value = '';
        document.getElementById('msManpower').value = '';
        document.getElementById('msDuration').value = '';
        document.getElementById('msWPS').value = '';
        document.getElementById('jsaJobTitle').value = '';
        document.getElementById('jsaLocation').value = '';
        document.getElementById('jsaRefNo').value = '';
        document.getElementById('jsaEmergency').value = '';
        document.getElementById('itpDocNo').value = 'ITP-2026-001';
        document.getElementById('itpProject').value = '';
        document.getElementById('itpClient').value = '';
        document.getElementById('itpNotes').value = '';
        initMethodStatementDefaults();
    }

    // Show first tab
    var firstTab = document.querySelector('.tab.active');
    showMsTab('method', firstTab || document.querySelector('.tab'));
}

// ===== SAVE =====
function saveMethodStatement() {
    var wo = document.getElementById('msWO').value;
    var subject = document.getElementById('msSubject').value.trim();
    if (!wo || !subject) { showToast('WO/SC and Subject are required', 'error'); return; }
    var editId = document.getElementById('msEditId').value;

    // Collect MS steps
    var msSteps = [];
    document.querySelectorAll('#msStepsTable tr').forEach(function(row) {
        var inputs = row.querySelectorAll('input');
        if (inputs.length >= 3) {
            msSteps.push({ description: inputs[0].value, responsible: inputs[1].value, tools: inputs[2].value });
        }
    });

    // Collect JSA rows
    var jsaRows = [];
    document.querySelectorAll('#jsaTableBody tr').forEach(function(row) {
        var textareas = row.querySelectorAll('textarea');
        var inputs = row.querySelectorAll('input');
        if (textareas.length >= 3 && inputs.length >= 2) {
            jsaRows.push({ step: textareas[0].value, hazard: textareas[1].value, L: parseInt(inputs[0].value) || 1, S: parseInt(inputs[1].value) || 1, controls: textareas[2].value });
        }
    });

    // Collect ITP rows
    var itpRows = [];
    document.querySelectorAll('#itpTableBody tr').forEach(function(row) {
        var isSection = row.querySelectorAll('td').length === 2;
        if (isSection) {
            var titleInput = row.querySelector('input');
            itpRows.push({ isSection: true, title: titleInput ? titleInput.value : '' });
        } else {
            var cells = row.querySelectorAll('td');
            if (cells.length >= 10) {
                itpRows.push({
                    no: cells[0].querySelector('input').value,
                    activity: cells[1].querySelector('textarea').value,
                    ref: cells[2].querySelector('textarea').value,
                    criteria: cells[3].querySelector('textarea').value,
                    freq: cells[4].querySelector('input').value,
                    contractor: cells[5].querySelector('select').value,
                    owner: cells[6].querySelector('select').value,
                    tp: cells[7].querySelector('select').value,
                    record: cells[8].querySelector('textarea').value
                });
            }
        }
    });

    var createdBy = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser().name : 'Unknown';
    var data = {
        id: editId || DB.genId('methodStatements'),
        wo: wo,
        subject: subject,
        type: document.getElementById('msType').value,
        priority: document.getElementById('msPriority').value,
        revision: document.getElementById('msRevision').value,
        scope: document.getElementById('msScope').value.trim(),
        refDocs: document.getElementById('msRefDocs').value.trim(),
        refDrawings: document.getElementById('msRefDrawings').value.trim(),
        manpower: document.getElementById('msManpower').value.trim(),
        duration: document.getElementById('msDuration').value.trim(),
        wps: document.getElementById('msWPS').value.trim(),
        msSteps: msSteps,
        jsaJobTitle: document.getElementById('jsaJobTitle').value.trim(),
        jsaLocation: document.getElementById('jsaLocation').value.trim(),
        jsaRefNo: document.getElementById('jsaRefNo').value.trim(),
        jsaEmergency: document.getElementById('jsaEmergency').value.trim(),
        jsaRows: jsaRows,
        itpDocNo: document.getElementById('itpDocNo').value.trim(),
        itpProject: document.getElementById('itpProject').value.trim(),
        itpClient: document.getElementById('itpClient').value.trim(),
        itpNotes: document.getElementById('itpNotes').value.trim(),
        itpRows: itpRows,
        status: 'Draft',
        createdBy: createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editId) {
        data.createdAt = (DB.getById('methodStatements', editId) || {}).createdAt || data.createdAt;
        DB.update('methodStatements', editId, data);
        showToast('Method Statement updated');
    } else {
        saveWithOwner('methodStatements', data);
        showToast('Method Statement created');
    }
    closeModal('methodStatementModal');
    renderMethodStatements();
}

// ===== RENDER LIST =====
function renderMethodStatements() {
    var tbody = document.getElementById('methodStatementsTable');
    if (!tbody) return;
    var items = DB.get('methodStatements');
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">No method statements yet</td></tr>';
        return;
    }
    items.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    tbody.innerHTML = items.map(function(m) {
        var hasRows = (m.msSteps && m.msSteps.length) || (m.jsaRows && m.jsaRows.length) || (m.itpRows && m.itpRows.length);
        var statusBadge = m.status === 'Approved' ? '<span class="badge badge-success">✅ Approved</span>'
            : m.status === 'Submitted' ? '<span class="badge badge-info">📤 Submitted</span>'
            : '<span class="badge badge-warning">📝 Draft</span>';
        return '<tr>' +
            '<td><strong>' + m.id + '</strong></td>' +
            '<td>' + m.wo + '</td>' +
            '<td>' + (m.subject || '—') + '</td>' +
            '<td>' + (m.type || '—') + '</td>' +
            '<td>' + (m.createdBy || '—') + '</td>' +
            '<td>' + (m.createdAt ? m.createdAt.slice(0, 10) : '—') + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td style="white-space:nowrap;">' +
            '<div class="btn-group">' +
            '<button class="btn btn-xs btn-info" onclick="openMethodStatementDetail(\'' + m.id + '\')">View</button>' +
            '<button class="btn btn-xs btn-secondary" onclick="openMethodStatementModal(\'' + m.id + '\')">Edit</button>' +
            '<button class="btn btn-xs btn-success" onclick="submitMethodStatement(\'' + m.id + '\')">📤</button>' +
            '<button class="btn btn-xs btn-danger" onclick="deleteRecord(\'methodStatements\',\'' + m.id + '\')">🗑️</button>' +
            '</div></td></tr>';
    }).join('');
}

// ===== DETAIL VIEW =====
function openMethodStatementDetail(msId) {
    var ms = DB.getById('methodStatements', msId);
    if (!ms) return showToast('Method Statement not found', 'error');
    var html = '<div style="max-height:70vh;overflow-y:auto;padding:20px;">';
    html += '<div style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;padding:16px;border-radius:8px;margin-bottom:16px;">';
    html += '<div style="font-size:18px;font-weight:700;">📋 ' + ms.id + ' — ' + (ms.subject || '') + '</div>';
    html += '<div style="font-size:13px;opacity:0.85;margin-top:4px;">WO: ' + ms.wo + ' | ' + (ms.type || '—') + ' | ' + (ms.priority || 'Normal') + ' Priority</div></div>';

    // Scope
    if (ms.scope) {
        html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">📋 Scope of Work</h4>';
        html += '<div style="font-size:13px;line-height:1.6;white-space:pre-wrap;">' + ms.scope + '</div></div>';
    }

    // Work Steps
    if (ms.msSteps && ms.msSteps.length) {
        html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">🔧 Work Steps</h4>';
        html += '<table style="font-size:12px;width:100%;border-collapse:collapse;"><thead><tr style="background:var(--primary);"><th>#</th><th>Activity</th><th>Responsible</th><th>Tools</th></tr></thead><tbody>';
        ms.msSteps.forEach(function(s, i) {
            html += '<tr><td style="padding:4px;border:1px solid #ddd;">' + (i+1) + '</td><td style="padding:4px;border:1px solid #ddd;">' + (s.description || '') + '</td><td style="padding:4px;border:1px solid #ddd;">' + (s.responsible || '') + '</td><td style="padding:4px;border:1px solid #ddd;">' + (s.tools || '') + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }

    // JSA Summary
    if (ms.jsaRows && ms.jsaRows.length) {
        html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:#e65100;">⚠️ JSA — ' + (ms.jsaJobTitle || '') + '</h4>';
        html += '<div style="font-size:11px;margin-bottom:6px;">Ref: ' + (ms.jsaRefNo || '—') + ' | Location: ' + (ms.jsaLocation || '—') + '</div>';
        html += '<table style="font-size:11px;width:100%;border-collapse:collapse;"><thead><tr style="background:#1e2f3a;color:#fff;"><th>#</th><th>Task</th><th>Hazard</th><th>L</th><th>S</th><th>Risk</th><th>Controls</th></tr></thead><tbody>';
        ms.jsaRows.forEach(function(r, i) {
            var risk = (r.L || 1) * (r.S || 1);
            var cls = risk <= 5 ? 'low' : risk <= 10 ? 'med' : risk <= 16 ? 'high' : 'extreme';
            html += '<tr><td style="padding:3px;border:1px solid #ddd;">' + (i+1) + '</td>' +
                '<td style="padding:3px;border:1px solid #ddd;">' + (r.step || '') + '</td>' +
                '<td style="padding:3px;border:1px solid #ddd;">' + (r.hazard || '') + '</td>' +
                '<td style="padding:3px;border:1px solid #ddd;text-align:center;">' + (r.L || 1) + '</td>' +
                '<td style="padding:3px;border:1px solid #ddd;text-align:center;">' + (r.S || 1) + '</td>' +
                '<td style="padding:3px;border:1px solid #ddd;text-align:center;font-weight:bold;background:' + (cls === 'low' ? '#ccffcc' : cls === 'med' ? '#fff3bf' : cls === 'high' ? '#ffe0cc' : '#ffcdd2') + ';">' + risk + '</td>' +
                '<td style="padding:3px;border:1px solid #ddd;">' + (r.controls || '') + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }

    // ITP Summary
    if (ms.itpRows && ms.itpRows.length) {
        html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">✅ ITP — ' + (ms.itpDocNo || '') + '</h4>';
        html += '<div style="font-size:11px;margin-bottom:6px;">Project: ' + (ms.itpProject || '—') + ' | Client: ' + (ms.itpClient || '—') + '</div>';
        html += '<table style="font-size:10px;width:100%;border-collapse:collapse;"><thead><tr style="background:#e0e0e0;"><th>No</th><th>Activity</th><th>Criteria</th><th>Freq</th><th>Contractor</th><th>Owner</th></tr></thead><tbody>';
        ms.itpRows.forEach(function(r) {
            if (r.isSection) {
                html += '<tr style="background:#f2f2f2;font-weight:bold;"><td colspan="6" style="padding:3px;border:1px solid #ddd;">' + (r.title || '') + '</td></tr>';
            } else {
                html += '<tr><td style="padding:3px;border:1px solid #ddd;">' + (r.no || '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #ddd;">' + (r.activity || '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #ddd;">' + (r.criteria || '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #ddd;">' + (r.freq || '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #ddd;">' + (r.contractor || '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #ddd;">' + (r.owner || '') + '</td></tr>';
            }
        });
        html += '</tbody></table></div>';
    }

    // Ref Docs
    if (ms.refDocs) {
        html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">📚 Reference Documents</h4>';
        html += '<div style="font-size:13px;line-height:1.6;white-space:pre-wrap;">' + ms.refDocs + '</div></div>';
    }

    // Ref Drawings
    if (ms.refDrawings) {
        html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">';
        html += '<h4 style="margin:0 0 10px;font-size:13px;color:var(--primary);">📐 Reference Drawings</h4>';
        html += '<div style="font-size:13px;line-height:1.6;white-space:pre-wrap;">' + ms.refDrawings + '</div></div>';
    }

    // Status
    html += '<div style="margin-top:16px;padding:12px;background:var(--bg-secondary);border-radius:8px;">';
    html += '<div style="font-size:12px;">Status: <strong>' + (ms.status || 'Draft') + '</strong> | Revision: ' + (ms.revision || 'Rev 0') + ' | Created by: ' + (ms.createdBy || '—') + ' on ' + (ms.createdAt ? ms.createdAt.slice(0, 10) : '—') + '</div></div>';
    html += '</div>';

    var modal = document.getElementById('methodStatementDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'methodStatementDetailModal';
        modal.className = 'modal-overlay';
        modal.onclick = function(e) { if (e.target === modal) closeModal('methodStatementDetailModal'); };
        modal.innerHTML = '<div class="modal" style="max-width:800px;"><div class="modal-header" style="background:linear-gradient(135deg,#6366f1,#4f46e5);"><h3 style="color:#fff;">📋 Method Statement Details</h3><button class="modal-close" onclick="closeModal(\'methodStatementDetailModal\')" style="color:#fff;">×</button></div><div class="modal-body" id="methodStatementDetailBody"></div></div>';
        document.body.appendChild(modal);
    }
    document.getElementById('methodStatementDetailBody').innerHTML = html;
    modal.style.display = 'flex';
    modal.classList.add('active');
}

function submitMethodStatement(msId) {
    if (!confirm('Submit ' + msId + ' for review?')) return;
    DB.update('methodStatements', msId, { status: 'Submitted', submittedDate: new Date().toISOString().split('T')[0] });
    renderMethodStatements();
    showToast('📤 ' + msId + ' submitted for review');
}

function deleteMethodStatement(msId) {
    if (!confirm('Delete ' + msId + '? This cannot be undone.')) return;
    DB.delete('methodStatements', msId);
    renderMethodStatements();
    showToast('🗑️ ' + msId + ' deleted');
}

function printMethodStatement() {
    var wo = getValue('msWO') || '';
    var subject = getValue('msSubject') || '';
    var type = getValue('msType') || '';
    var priority = getValue('msPriority') || '';
    var revision = getValue('msRevision') || '';
    var scope = getValue('msScope') || '';
    var refDocs = getValue('msRefDocs') || '';
    var refDrawings = getValue('msRefDrawings') || '';
    var manpower = getValue('msManpower') || '';
    var duration = getValue('msDuration') || '';
    var wps = getValue('msWPS') || '';

    var jsaTitle = getValue('jsaJobTitle') || '';
    var jsaLoc = getValue('jsaLocation') || '';
    var jsaRef = getValue('jsaRefNo') || '';
    var jsaEmerg = getValue('jsaEmergency') || '';

    var itpDoc = getValue('itpDocNo') || '';
    var itpProject = getValue('itpProject') || '';
    var itpClient = getValue('itpClient') || '';
    var itpNotes = getValue('itpNotes') || '';

    var stepsHtml = '';
    var stepRows = document.querySelectorAll('#msStepsTable tr');
    if (stepRows.length > 0) {
        stepsHtml = '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#6366f1;color:#fff;"><th style="padding:6px;border:1px solid #999;">No</th><th style="padding:6px;border:1px solid #999;">Activity</th><th style="padding:6px;border:1px solid #999;">Responsible</th><th style="padding:6px;border:1px solid #999;">Tools</th></tr></thead><tbody>';
        stepRows.forEach(function(tr, i) {
            var inputs = tr.querySelectorAll('input');
            if (inputs.length >= 3) {
                stepsHtml += '<tr><td style="padding:4px;border:1px solid #999;text-align:center;">' + (i + 1) + '</td>' +
                    '<td style="padding:4px;border:1px solid #999;">' + inputs[0].value + '</td>' +
                    '<td style="padding:4px;border:1px solid #999;">' + inputs[1].value + '</td>' +
                    '<td style="padding:4px;border:1px solid #999;">' + inputs[2].value + '</td></tr>';
            }
        });
        stepsHtml += '</tbody></table>';
    }

    var jsaHtml = '';
    var jsaRows = document.querySelectorAll('#jsaTableBody tr');
    if (jsaRows.length > 0) {
        jsaHtml = '<table style="width:100%;border-collapse:collapse;font-size:10px;"><thead><tr style="background:#1e2f3a;color:#fff;"><th style="padding:5px;border:1px solid #999;">#</th><th style="padding:5px;border:1px solid #999;">Task</th><th style="padding:5px;border:1px solid #999;">Hazard</th><th style="padding:5px;border:1px solid #999;">L</th><th style="padding:5px;border:1px solid #999;">S</th><th style="padding:5px;border:1px solid #999;">Risk</th><th style="padding:5px;border:1px solid #999;">Controls</th></tr></thead><tbody>';
        jsaRows.forEach(function(tr, i) {
            var tds = tr.querySelectorAll('textarea');
            var inputs = tr.querySelectorAll('input');
            if (tds.length >= 3 && inputs.length >= 2) {
                var L = parseInt(inputs[0].value) || 1;
                var S = parseInt(inputs[1].value) || 1;
                var risk = L * S;
                var bg = risk <= 5 ? '#ccffcc' : risk <= 10 ? '#fff3bf' : risk <= 16 ? '#ffe0cc' : '#ffcdd2';
                jsaHtml += '<tr><td style="padding:3px;border:1px solid #999;text-align:center;">' + (i + 1) + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + tds[0].value + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + tds[1].value + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;text-align:center;">' + L + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;text-align:center;">' + S + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;text-align:center;font-weight:bold;background:' + bg + ';">' + risk + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + tds[2].value + '</td></tr>';
            }
        });
        jsaHtml += '</tbody></table>';
    }

    var itpHtml = '';
    var itpRows = document.querySelectorAll('#itpTableBody tr');
    if (itpRows.length > 0) {
        itpHtml = '<table style="width:100%;border-collapse:collapse;font-size:9px;"><thead><tr style="background:#e0e0e0;"><th style="padding:4px;border:1px solid #999;">No</th><th style="padding:4px;border:1px solid #999;">Activity</th><th style="padding:4px;border:1px solid #999;">Criteria</th><th style="padding:4px;border:1px solid #999;">Freq</th><th style="padding:4px;border:1px solid #999;">Contractor</th><th style="padding:4px;border:1px solid #999;">Owner</th><th style="padding:4px;border:1px solid #999;">3rd Party</th></tr></thead><tbody>';
        itpRows.forEach(function(tr) {
            var cells = tr.querySelectorAll('td');
            if (cells.length === 2) {
                var inp = cells[0].querySelector('input');
                itpHtml += '<tr style="background:#f2f2f2;font-weight:bold;"><td colspan="7" style="padding:4px;border:1px solid #999;">' + (inp ? inp.value : '') + '</td></tr>';
            } else if (cells.length >= 10) {
                itpHtml += '<tr><td style="padding:3px;border:1px solid #999;">' + (cells[0].querySelector('input') ? cells[0].querySelector('input').value : '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + (cells[1].querySelector('textarea') ? cells[1].querySelector('textarea').value : '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + (cells[3].querySelector('textarea') ? cells[3].querySelector('textarea').value : '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + (cells[4].querySelector('input') ? cells[4].querySelector('input').value : '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + (cells[5].querySelector('select') ? cells[5].querySelector('select').value : '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + (cells[6].querySelector('select') ? cells[6].querySelector('select').value : '') + '</td>' +
                    '<td style="padding:3px;border:1px solid #999;">' + (cells[7].querySelector('select') ? cells[7].querySelector('select').value : '') + '</td></tr>';
            }
        });
        itpHtml += '</tbody></table>';
    }

    var win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) { showToast('⚠️ Please allow popups for PDF printing', 'error'); return; }

    var html = '<h1 style="text-align:center;color:#6366f1;">METHOD STATEMENT, JSA &amp; ITP</h1>';
    html += '<p style="text-align:center;">' + subject + ' | Ref: ' + wo + ' | Rev: ' + revision + '</p>';

    html += '<h2 style="font-size:16px;color:#6366f1;border-bottom:1px solid #ddd;padding-bottom:4px;">1. METHOD STATEMENT</h2>';
    html += '<table style="font-size:12px;width:100%;"><tr><td style="width:25%;"><strong>Type:</strong> ' + type + '</td><td style="width:25%;"><strong>Priority:</strong> ' + priority + '</td><td style="width:25%;"><strong>Manpower:</strong> ' + manpower + '</td><td style="width:25%;"><strong>Duration:</strong> ' + duration + '</td></tr></table>';
    if (wps) html += '<p style="font-size:12px;"><strong>WPS:</strong> ' + wps + '</p>';
    if (scope) html += '<div style="background:#f9fafb;padding:10px;border-radius:4px;font-size:12px;line-height:1.5;margin:8px 0;"><strong>Scope of Work:</strong><br>' + scope + '</div>';
    if (stepsHtml) html += '<h3 style="font-size:13px;margin:10px 0 4px;">Work Steps</h3>' + stepsHtml;
    if (refDocs) html += '<p style="font-size:11px;"><strong>Codes &amp; Standards:</strong> ' + refDocs + '</p>';
    if (refDrawings) html += '<p style="font-size:11px;"><strong>Drawings:</strong> ' + refDrawings + '</p>';

    html += '<h2 style="font-size:16px;color:#e65100;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:20px;">2. JOB SAFETY ANALYSIS (JSA)</h2>';
    html += '<p style="font-size:12px;"><strong>Title:</strong> ' + jsaTitle + ' | <strong>Location:</strong> ' + jsaLoc + ' | <strong>Ref:</strong> ' + jsaRef + '</p>';
    if (jsaHtml) html += jsaHtml;
    if (jsaEmerg) html += '<p style="font-size:11px;"><strong>Emergency Procedures:</strong> ' + jsaEmerg + '</p>';
    html += '<div style="display:flex;gap:10px;font-size:10px;margin-top:6px;"><span style="background:#ccffcc;padding:2px 8px;border-radius:8px;">1-5 Low</span><span style="background:#fff3bf;padding:2px 8px;border-radius:8px;">6-10 Med</span><span style="background:#ffe0cc;padding:2px 8px;border-radius:8px;">12-16 High</span><span style="background:#ffcdd2;padding:2px 8px;border-radius:8px;">18-25 Extreme</span></div>';

    html += '<h2 style="font-size:16px;color:#6366f1;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:20px;">3. INSPECTION TEST PLAN (ITP)</h2>';
    html += '<p style="font-size:12px;"><strong>Doc No:</strong> ' + itpDoc + ' | <strong>Project:</strong> ' + itpProject + ' | <strong>Client:</strong> ' + itpClient + '</p>';
    if (itpHtml) html += itpHtml;
    if (itpNotes) html += '<p style="font-size:11px;"><strong>Notes:</strong> ' + itpNotes + '</p>';

    html += '<div style="margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#999;text-align:center;">Generated from ADDeN ERP System | ' + new Date().toLocaleString() + '</div>';

    printWindow(win, 'Method Statement - ' + subject, html);
}

// ========== ACCOUNTING ==========
function openAccountModal(){
    var el=document.getElementById('accountModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    document.getElementById('accEditId').value='';
    document.getElementById('accCode').value='';
    document.getElementById('accName').value='';
    document.getElementById('accType').value='Asset';
    updateAccCategory();
}
function updateAccCategory(){
    var type=getValue('accType');
    var cat=document.getElementById('accCategory');if(!cat)return;
    var cats={
        'Asset':['Current Asset','Fixed Asset','Intangible Asset'],
        'Liability':['Current Liability','Long-term Liability'],
        'Equity':['Capital','Retained Earnings','Drawings'],
        'Revenue':['Sales Revenue','Service Revenue','Other Income'],
        'COGS':['Direct Material','Direct Labour','Manufacturing Overhead'],
        'Expense':['Operating Expense','Administrative Expense','Financial Expense']
    };
    var opts=(cats[type]||['General']).map(function(c){return '<option>'+c+'</option>';}).join('');
    cat.innerHTML=opts;
}
function saveAccount(){
    var editId=getValue('accEditId');
    var data={code:getValue('accCode'),name:getValue('accName'),type:getValue('accType'),category:getValue('accCategory')};
    if(editId){DB.update('accounts',editId,data);}
    else{data.id=DB.genId('accounts');data.createdAt=new Date().toISOString();saveWithOwner('accounts',data);}
    closeModal('accountModal');
    renderAccounting();
    showToast('Account saved','success');
}

// ========== JOURNAL ==========
function openJournalModal(){
    var el=document.getElementById('journalModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    document.getElementById('journalEditId').value='';
    document.getElementById('journalDate').value=new Date().toISOString().slice(0,10);
    document.getElementById('journalRef').value='';
    document.getElementById('journalDesc').value='';
    var tbody=document.getElementById('journalLinesBody');if(tbody)tbody.innerHTML='';
    var acctSel=document.getElementById('jl_acct_0');
    if(acctSel){
        acctSel.innerHTML='<option value="">Select Account</option>';
        DB.get('accounts').forEach(function(a){acctSel.innerHTML+='<option value="'+a.code+'-'+a.name+'">'+a.code+' - '+a.name+'</option>';});
    }
    setText('journalTotalsMsg','Dr: 0.00 | Cr: 0.00');
    setText('journalDiffMsg','');
}
function addJournalLine(){
    var tbody=document.getElementById('journalLinesBody');if(!tbody)return;
    var idx=tbody.querySelectorAll('tr').length;
    var tr=document.createElement('tr');
    var acctOpts='<option value="">Select</option>';
    DB.get('accounts').forEach(function(a){acctOpts+='<option value="'+a.code+'-'+a.name+'">'+a.code+' - '+a.name+'</option>';});
    tr.innerHTML='<td><select id="jl_acct_'+idx+'" style="width:100%">'+acctOpts+'</td><td><input type="number" id="jl_db_'+idx+'" style="width:100px" oninput="updateJournalTotals()"></td><td><input type="number" id="jl_cr_'+idx+'" style="width:100px" oninput="updateJournalTotals()"></td><td><button class="btn btn-danger btn-sm" onclick="removeJournalLine('+idx+')">X</button></td>';
    tbody.appendChild(tr);
}
function removeJournalLine(idx){
    var row=document.getElementById('jl_acct_'+idx);
    if(row&&row.closest('tr'))row.closest('tr').remove();
    updateJournalTotals();
}
function updateJournalTotals(){
    var totalDr=0,totalCr=0;
    document.querySelectorAll('[id^="jl_db_"]').forEach(function(e){totalDr+=parseFloat(e.value)||0;});
    document.querySelectorAll('[id^="jl_cr_"]').forEach(function(e){totalCr+=parseFloat(e.value)||0;});
    setText('journalTotalsMsg','Dr: '+totalDr.toFixed(2)+' | Cr: '+totalCr.toFixed(2));
    var diff=Math.abs(totalDr-totalCr);
    setText('journalDiffMsg',diff<0.01?'Balanced':'Difference: '+diff.toFixed(2));
}
function saveJournalEntry(){
    var lines=[];
    var tbody=document.getElementById('journalLinesBody');if(!tbody)return;
    tbody.querySelectorAll('tr').forEach(function(tr){
        var sel=tr.querySelector('select');
        var inputs=tr.querySelectorAll('input');
        if(sel&&sel.value&&inputs.length>=2){
            lines.push({acct:sel.value,dr:parseFloat(inputs[0].value)||0,cr:parseFloat(inputs[1].value)||0});
        }
    });
    if(!lines.length){alert('Add at least one journal line');return;}
    var totalDr=lines.reduce(function(a,l){return a+l.dr;},0);
    var totalCr=lines.reduce(function(a,l){return a+l.cr;},0);
    if(Math.abs(totalDr-totalCr)>0.01){alert('Journal is not balanced');return;}
    var data={id:DB.genId('journal'),date:getValue('journalDate'),ref:getValue('journalRef'),desc:getValue('journalDesc'),lines:lines,status:'Posted',createdAt:new Date().toISOString()};
    saveWithOwner('journal',data);
    closeModal('journalModal');
    renderAccounting();
    showToast('Journal entry saved','success');
}
function refreshTrialBalance(){renderAccounting();showToast('Trial balance refreshed','info');}
function switchAccTab(tab){
    document.querySelectorAll('.acc-tab-content').forEach(function(el){el.style.display='none';});
    document.querySelectorAll('.acc-tab-btn').forEach(function(el){el.classList.remove('active');});
    var panel=document.getElementById('acc-'+tab+'-tab');
    if(panel)panel.style.display='block';
    var btn=document.querySelector('.acc-tab-btn[data-tab="'+tab+'"]');
    if(btn)btn.classList.add('active');
}

// ========== WELD COST CALCULATOR ==========
function openWeldCostCalculator(){
    var el=document.getElementById('weldCostModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    updateProcessDefaults();
    updateJointTypeUI();
    calculateWeldCost();
}
function setWeldPreset(){
    var preset=getValue('weldPreset');
    var presets={
        'light':{process:'GMAW',thickness:4,rootFace:1,rootGap:2,bevelAngle:30,legLength:4,passes:1,wireDia:1.2,density:7.85,current:180,voltage:24,travelSpeed:400,efficiency:85,opFactor:1.0},
        'medium':{process:'GMAW',thickness:10,rootFace:2,rootGap:3,bevelAngle:30,legLength:8,passes:3,wireDia:1.2,density:7.85,current:250,voltage:28,travelSpeed:350,efficiency:85,opFactor:1.0},
        'heavy':{process:'SAW',thickness:25,rootFace:3,rootGap:0,bevelAngle:45,legLength:25,passes:6,wireDia:4.0,density:7.85,current:550,voltage:32,travelSpeed:250,efficiency:90,opFactor:1.0},
        'pipeSch40':{process:'GMAW',thickness:7,rootFace:1,rootGap:2,bevelAngle:30,legLength:7,passes:2,wireDia:1.2,density:7.85,current:220,voltage:26,travelSpeed:350,efficiency:85,opFactor:1.0},
        'pipeSch80':{process:'SMAW',thickness:10,rootFace:1,rootGap:3,bevelAngle:30,legLength:10,passes:3,wireDia:3.2,density:7.85,current:140,voltage:24,travelSpeed:200,efficiency:75,opFactor:1.2}
    };
    var p=presets[preset];
    if(!p)return;
    setVal('weldProcess',p.process);setVal('weldThickness',p.thickness);setVal('weldRootFace',p.rootFace);setVal('weldRootGap',p.rootGap);setVal('weldBevelAngle',p.bevelAngle);setVal('weldLegLength',p.legLength);setVal('weldPasses',p.passes);setVal('weldWireDia',p.wireDia);setVal('weldDensity',p.density);setVal('weldCurrent',p.current);setVal('weldVoltage',p.voltage);setVal('weldTravelSpeed',p.travelSpeed);setVal('weldEfficiency',p.efficiency);setVal('weldOpFactor',p.opFactor);
    updateJointTypeUI();calculateWeldCost();
}
function updateJointTypeUI(){
    var jt = getValue('weldJointType');
    var buttVals = ['singleV','doubleV','singleU','doubleU','singleBevel','doubleBevel'];
    var pipeVals = ['singleVpipe','doubleVpipe'];
    var isButt = buttVals.indexOf(jt) >= 0;
    var isFillet = jt === 'fillet';
    var isPipe = pipeVals.indexOf(jt) >= 0;
    var ids = { butt:['weldRootFace','weldRootGap','weldBevelAngle'], fillet:['weldLegLength'], pipe:['weldPipeOD','weldPipeWall'] };
    function toggle(id, show){
        var el = document.getElementById(id);
        if(el && el.parentElement) el.parentElement.style.display = show ? '' : 'none';
    }
    for(var i=0;i<ids.butt.length;i++) toggle(ids.butt[i], isButt || isPipe);
    for(var i=0;i<ids.fillet.length;i++) toggle(ids.fillet[i], isFillet);
    for(var i=0;i<ids.pipe.length;i++) toggle(ids.pipe[i], isPipe);
}
function updateProcessDefaults(){
    var proc=getValue('weldProcess');
    var defaults={SMAW:{current:120,voltage:25,travelSpeed:200,efficiency:85,opFactor:1.2},GMAW:{current:250,voltage:28,travelSpeed:400,efficiency:85,opFactor:1.0},GTAW:{current:150,voltage:20,travelSpeed:150,efficiency:75,opFactor:1.3},FCAW:{current:220,voltage:26,travelSpeed:350,efficiency:85,opFactor:1.1},SAW:{current:500,voltage:30,travelSpeed:300,efficiency:90,opFactor:1.0}};
    var d=defaults[proc]||defaults.SMAW;
    setVal('weldCurrent',d.current);setVal('weldVoltage',d.voltage);setVal('weldTravelSpeed',d.travelSpeed);setVal('weldEfficiency',d.efficiency);setVal('weldOpFactor',d.opFactor);
}
function calculateWeldCost(){
    var jt = getValue('weldJointType');
    var thickness = parseFloat(getValue('weldThickness')) || 6;
    var rootFace = parseFloat(getValue('weldRootFace')) || 0;
    var rootGap = parseFloat(getValue('weldRootGap')) || 0;
    var bevelAngle = parseFloat(getValue('weldBevelAngle')) || 30;
    var legLength = parseFloat(getValue('weldLegLength')) || thickness;
    var length = parseFloat(getValue('weldLength')) || 1000;
    var jointCount = parseInt(getValue('weldJointCount')) || 1;
    var passes = parseInt(getValue('weldPasses')) || 1;
    var wireDia = parseFloat(getValue('weldWireDia')) || 1.2;
    var densityInput = parseFloat(getValue('weldDensity')) || 7.85;
    var density = densityInput; // g/cm³ — used consistently with mm³ conversions below
    var current = parseFloat(getValue('weldCurrent')) || 200;
    var voltage = parseFloat(getValue('weldVoltage')) || 25;
    var travelSpeed = parseFloat(getValue('weldTravelSpeed')) || 300;
    var efficiencyInput = parseFloat(getValue('weldEfficiency')) || 85;
    var efficiency = efficiencyInput / 100;
    var opFactor = parseFloat(getValue('weldOpFactor')) || 1.0;
    var fillerCost = parseFloat(getValue('weldFillerCost')) || 5;
    var labourRate = parseFloat(getValue('weldLabourRate')) || 50;
    var overheadRate = parseFloat(getValue('weldOverheadRate')) || 20;
    var powerCostRate = parseFloat(getValue('weldPowerCost')) || 0.1;
    var gasCostRate = parseFloat(getValue('weldGasCost')) || 0;
    var consumableCostRate = parseFloat(getValue('weldConsumableCost')) || 0;
    var prepCost = parseFloat(getValue('weldPrepCost')) || 0;
    var pipeOD = parseFloat(getValue('weldPipeOD')) || 168.3;
    var pipeWall = parseFloat(getValue('weldPipeWall')) || 7.1;

    var buttVals = ['singleV','doubleV','singleU','doubleU','singleBevel','doubleBevel'];
    var pipeVals = ['singleVpipe','doubleVpipe'];
    var isButt = buttVals.indexOf(jt) >= 0;
    var isFillet = jt === 'fillet';
    var isPipe = pipeVals.indexOf(jt) >= 0;
    var factorMap = {singleV:1, doubleV:0.5, singleU:0.85, doubleU:0.425, singleBevel:0.5, doubleBevel:0.25, singleVpipe:1, doubleVpipe:0.5};
    var factor = factorMap[jt] || 1;

    var crossSection = 0;
    if(isFillet){
        crossSection = legLength * legLength * 0.5;
    } else {
        var vArea = factor * (thickness - rootFace) * (thickness - rootFace) * Math.tan(bevelAngle * Math.PI / 180);
        var gapArea = rootGap * (thickness - rootFace);
        crossSection = vArea + gapArea;
    }

    var weldVol_mm3 = crossSection * length;
    var metalDep_kg = weldVol_mm3 / 1000 * density / 1000;

    var wireArea = Math.PI * (wireDia / 2) * (wireDia / 2);
    var depRate_gps = wireArea * (travelSpeed / 60) * efficiency * density / 1000;

    var arcTime_s = depRate_gps > 0 ? (metalDep_kg * 1000 / depRate_gps) * passes : 0;
    var totalTime_s = arcTime_s * opFactor;

    var fillerCostTotal = metalDep_kg * fillerCost * passes;
    var labourCost = totalTime_s / 3600 * labourRate;
    var overheadCost = totalTime_s / 3600 * overheadRate;
    var powerCost = current * voltage * arcTime_s / 3600000 * powerCostRate;
    var gasCost = totalTime_s / 3600 * gasCostRate;
    var consumableCost = totalTime_s / 3600 * consumableCostRate;
    var totalPrep = prepCost * jointCount;
    var totalCost = fillerCostTotal + labourCost + overheadCost + powerCost + gasCost + consumableCost + totalPrep;
    var costPerJoint = totalCost / jointCount;
    var costPerMeter = totalCost / (length * jointCount / 1000);

    setText('weldVolResult', weldVol_mm3.toFixed(0));
    setText('weldMetalResult', metalDep_kg.toFixed(3));
    setText('weldDepRateResult', depRate_gps.toFixed(2));
    setText('weldArcTimeResult', (arcTime_s / 3600).toFixed(3));
    setText('weldTotalTimeResult', (totalTime_s / 3600).toFixed(3));
    setText('weldFillerCostResult', fillerCostTotal.toFixed(2));
    setText('weldLabourCostResult', labourCost.toFixed(2));
    setText('weldOverheadCostResult', overheadCost.toFixed(2));
    setText('weldPowerCostResult', powerCost.toFixed(2));
    setText('weldGasCostResult', gasCost.toFixed(2));
    setText('weldConsumableCostResult', consumableCost.toFixed(2));
    setText('weldPrepCostResult', totalPrep.toFixed(2));
    setText('weldTotalCostResult', totalCost.toFixed(2));
    setText('weldCostPerJoint', costPerJoint.toFixed(2));
    setText('weldCostPerMeter', costPerMeter.toFixed(2));
    populateWeldComparison();
}
function populateWeldComparison(){
    var tbody = document.getElementById('weldComparisonBody');
    if(!tbody) return;
    var jt = getValue('weldJointType');
    var thickness = parseFloat(getValue('weldThickness')) || 6;
    var rootFace = parseFloat(getValue('weldRootFace')) || 0;
    var rootGap = parseFloat(getValue('weldRootGap')) || 0;
    var bevelAngle = parseFloat(getValue('weldBevelAngle')) || 30;
    var legLength = parseFloat(getValue('weldLegLength')) || thickness;
    var length = parseFloat(getValue('weldLength')) || 1000;
    var jointCount = parseInt(getValue('weldJointCount')) || 1;
    var passes = parseInt(getValue('weldPasses')) || 1;
    var pipeOD = parseFloat(getValue('weldPipeOD')) || 168.3;
    var pipeWall = parseFloat(getValue('weldPipeWall')) || 7.1;
    var buttVals = ['singleV','doubleV','singleU','doubleU','singleBevel','doubleBevel'];
    var pipeVals = ['singleVpipe','doubleVpipe'];
    var isButt = buttVals.indexOf(jt) >= 0;
    var isFillet = jt === 'fillet';
    var isPipe = pipeVals.indexOf(jt) >= 0;
    var factorMap = {singleV:1, doubleV:0.5, singleU:0.85, doubleU:0.425, singleBevel:0.5, doubleBevel:0.25, singleVpipe:1, doubleVpipe:0.5};
    var factor = factorMap[jt] || 1;
    var crossSection = 0;
    if(isFillet){ crossSection = legLength * legLength * 0.5; }
    else { crossSection = factor * (thickness - rootFace) * (thickness - rootFace) * Math.tan(bevelAngle * Math.PI / 180) + rootGap * (thickness - rootFace); }
    var weldVol_mm3 = crossSection * length;
    var metalDep_kg = weldVol_mm3 / 1000 * 7.85 / 1000;
    var allProcs = ['SMAW','GMAW','GTAW','FCAW','SAW'];
    var procDefs = {SMAW:{wireDia:3.2,travelSpeed:200,current:120,voltage:25,efficiency:85,opFactor:1.2,passes:passes},GMAW:{wireDia:1.2,travelSpeed:400,current:250,voltage:28,efficiency:85,opFactor:1.0,passes:passes},GTAW:{wireDia:2.4,travelSpeed:150,current:150,voltage:20,efficiency:75,opFactor:1.3,passes:passes},FCAW:{wireDia:1.6,travelSpeed:350,current:220,voltage:26,efficiency:85,opFactor:1.1,passes:passes},SAW:{wireDia:4.0,travelSpeed:300,current:500,voltage:30,efficiency:90,opFactor:1.0,passes:Math.max(passes,1)}};
    var html = '';
    for(var p=0;p<allProcs.length;p++){
        var key = allProcs[p];
        var d = procDefs[key];
        var eff = d.efficiency/100;
        var wireArea = Math.PI*(d.wireDia/2)*(d.wireDia/2);
        var depRate_gps = wireArea*(d.travelSpeed/60)*eff*7.85/1000;
        var depRate_kgph = depRate_gps * 3.6;
        var mdep = metalDep_kg * d.passes;
        var arcTime = depRate_gps>0 ? (mdep*1000/depRate_gps) : 0;
        var totalTime = arcTime * d.opFactor;
        var fillerCost = mdep * 25;
        var labourCost = totalTime/3600*35;
        var total = fillerCost + labourCost;
        html += '<tr><td>'+key+'</td><td>'+weldVol_mm3.toFixed(0)+'</td><td>'+mdep.toFixed(3)+'</td><td>'+depRate_kgph.toFixed(2)+'</td><td>'+(arcTime/3600).toFixed(3)+'</td><td>'+(totalTime/3600).toFixed(3)+'</td><td>'+fillerCost.toFixed(2)+'</td><td>'+labourCost.toFixed(2)+'</td><td>'+total.toFixed(2)+'</td></tr>';
    }
    tbody.innerHTML = html;
}
function addWeldCostToQuote(){
    var total=parseFloat(getText('weldTotalCostResult'))||0;
    var jt=getValue('weldJointType');
    var proc=getValue('weldProcess');
    if(total<=0){alert('Calculate weld cost first');return;}
    if(!confirm('Add weld cost (RM '+total.toFixed(2)+') to current quotation?'))return;
    var qtId=window._editingQtId||null;
    if(!qtId){
        alert('Open a quotation first, then click Add to Quotation');
        return;
    }
    var qt=DB.getById('quotations',qtId);
    if(!qt)return;
    if(!qt.items)qt.items=[];
    qt.items.push({id:Date.now(),name:'Weld Cost - '+jt+' ('+proc+')',qty:1,rate:total,total:total});
    qt.subtotal=qt.items.reduce(function(a,i){return a+(i.total||i.qty*i.rate);},0);
    qt.taxAmount=qt.subtotal*(qt.taxRate||0)/100;
    qt.total=qt.subtotal+qt.taxAmount;
    DB.update('quotations',qtId,qt);
    closeModal('weldCostModal');
    openQuotationModal(qtId);
    showToast('Weld cost added to quotation','success');
}
function printWeldCost(){showToast('Print coming soon','info');}

// ========== SETTINGS ==========
function openSettingsModal(){
    var el=document.getElementById('settingsModal');if(!el)return;
    el.style.display='';el.classList.add('active');
    var s=DB.getSettings?DB.getSettings():{};
    var dm=document.getElementById('settingDarkMode');if(dm)dm.checked=!!s.darkMode;
    var cv=document.getElementById('settingCompact');if(cv)cv.checked=!!s.compactView;
    var en=document.getElementById('settingEmailNotif');if(en)en.checked=!!s.emailNotif;
    var pn=document.getElementById('settingPushNotif');if(pn)pn.checked=!!s.pushNotif;
    var dv=document.getElementById('settingDefaultView');if(dv)dv.value=s.defaultView||'dashboard';
    var ps=document.getElementById('settingPageSize');if(ps)ps.value=s.pageSize||'25';
    var oc=document.getElementById('settingOutlookCC');if(oc)oc.value=s.outlookCC||'';
    var ob=document.getElementById('settingOutlookBCC');if(ob)ob.value=s.outlookBCC||'';
    var of=document.getElementById('settingOutlookFromName');if(of)of.value=s.outlookFromName||'';
    var ab=document.getElementById('settingAttachmentBehavior');if(ab)ab.value=s.attachmentBehavior||'link';
}
function exportReportCSV(){showToast('CSV export coming soon','info');}

// ==================== ALL MISSING UI FUNCTIONS ====================

// User Dropdown
function toggleUserDropdown(event) {
    event.stopPropagation();
    var dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    var dropdown = document.getElementById('userDropdown');
    var userMenu = document.querySelector('.user-menu');
    if (dropdown && userMenu && !userMenu.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Logout
function handleLogout() {
    try {
        if (typeof OnlineTracker !== 'undefined' && OnlineTracker.logout) {
            var user = typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : { username: 'admin' };
            OnlineTracker.logout(user);
        }
    } catch(e) {}
    
    sessionStorage.removeItem('erp_session');
    
    var loginScreen = document.getElementById('loginScreen');
    var appContainer = document.getElementById('appContainer');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    
    showToast('👋 Logged out successfully');
}

function addMsStep() {
    var table = document.getElementById('msStepsTable');
    if (!table) return;
    var count = table.rows.length + 1;
    var row = document.createElement('tr');
    row.innerHTML = 
        '<td style="text-align:center;">' + count + '</td>' +
        '<td><input type="text" class="form-control" style="font-size:11px;" placeholder="Describe activity..."></td>' +
        '<td><input type="text" class="form-control" style="font-size:11px;" placeholder="Responsible"></td>' +
        '<td><input type="text" class="form-control" style="font-size:11px;" placeholder="Equipment/Tools"></td>' +
        '<td><button class="btn btn-xs" style="color:#dc2626;" onclick="this.closest(\'tr\').remove()">×</button></td>';
    table.appendChild(row);
}

function saveMethodStatement() {
    showToast('✅ Method Statement saved!');
    closeModal('methodStatementModal');
}

function printMethodStatement() {
    window.print();
}

// Purchasing
function openPRFullModal() {
    var modal = document.getElementById('prModal');
    if (modal) modal.style.display = 'flex';
}

function openPOFullModal() {
    var modal = document.getElementById('poModal');
    if (modal) modal.style.display = 'flex';
}

function openSupplierComparison(prNumber) {
    showToast('📊 Supplier Comparison - Opening...');
}

// Settings & Profile
function openSettingsModal() {
    var modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex';
}

function saveSettings() {
    showToast('💾 Settings saved!');
    closeModal('settingsModal');
}

function toggleDarkMode(checked) {
    document.body.classList.toggle('dark-mode', checked);
}

function toggleCompactView(checked) {
    document.body.classList.toggle('compact-view', checked);
}

// Modal Utility
function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Toast
function showToast(message) {
    var container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;';
        document.body.appendChild(container);
    }
    var msg = document.createElement('div');
    msg.style.cssText = 'background:#1e2a3a;color:#fff;padding:12px 20px;margin-bottom:8px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:slideIn 0.3s ease;';
    msg.textContent = message;
    container.appendChild(msg);
    setTimeout(function() {
        msg.style.opacity = '0';
        msg.style.transition = 'opacity 0.3s';
        setTimeout(function() { msg.remove(); }, 300);
    }, 3000);
}

// Print
function printPO() { window.print(); }
function printFabTraveler() { window.print(); }
function exportMarReport() { window.print(); }
function exportReportCSV() { showToast('📊 Exporting CSV...'); }

// ==================== SERVER ONLINE TRACKER ====================
function updateServerOnlineCount() {
    if (!localStorage.getItem('ad_deen_erp_token')) return;
        fetch(window.location.origin + '/api/online')
        .then(r => r.json())
        .then(data => {
            var count = document.getElementById('onlineCount');
            if (count) count.textContent = data.count || 1;
        })
        .catch(() => {});
}

// Send heartbeat to server every 30 seconds
        function sendHeartbeat() {
    var user = (typeof Auth !== "undefined" && Auth.getUser) ? (Auth.getUser() || { username: "admin", name: "Administrator" }) : { username: "admin", name: "Administrator" };
    if (!localStorage.getItem('ad_deen_erp_token')) return;
        fetch(window.location.origin + '/api/online', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'heartbeat',
            sessionId: user.username + '_' + (localStorage.getItem('session_id') || 'default'),
            username: user.username,
            name: user.name
        })
    }).catch(() => {});
}

// Generate a simple session ID if not exists
if (!localStorage.getItem('session_id')) {
    localStorage.setItem('session_id', Date.now().toString(36) + Math.random().toString(36).substr(2));
}

// Start heartbeat and update
sendHeartbeat();
setInterval(sendHeartbeat, 30000);         // heartbeat every 30s
setInterval(updateServerOnlineCount, 10000); // refresh count every 10s

// ==================== AUTO-FILL CUSTOMER & EQUIPMENT ====================

function onCustomerSelect(selectEl) {
    var customerId = selectEl.value;
    var customers = DB.get('customers');
    var customer = customers.find(function(c) { return c.id === customerId || c.company === customerId; });
    
    if (!customer) return;
    
    // Auto-fill contact fields
    setField('soContact', customer.name);
    setField('soEmail', customer.email);
    setField('soPhone', customer.phone);
    setField('woContact', customer.name);
    setField('woEmail', customer.email);
    setField('woPhone', customer.phone);
    setField('custAddress', customer.address);
    
    // Load equipment for this customer
    loadCustomerEquipment(customer.id || customerId);
    
    console.log('[AUTOFILL] Customer loaded:', customer.company);
}

function loadCustomerEquipment(customerId) {
    var eqSelect = document.getElementById('woEquipment') || document.getElementById('soEquipment');
    if (!eqSelect) return;
    
    var equipment = DB.get('equipment') || [];
    var customerEq = equipment.filter(function(e) { 
        return e.customerId === customerId || e.clientId === customerId;
    });
    
    eqSelect.innerHTML = '<option value="">-- Select Equipment --</option>';
    
    customerEq.forEach(function(eq) {
        eqSelect.innerHTML += '<option value="' + eq.id + '">' + eq.name + ' (' + (eq.type || 'N/A') + ')</option>';
    });
    
    eqSelect.innerHTML += '<option value="NEW">+ Add New Equipment</option>';
    
    console.log('[AUTOFILL] Equipment loaded:', customerEq.length, 'items');
}

function onEquipmentSelect(selectEl) {
    var eqId = selectEl.value;
    
    if (eqId === 'NEW') {
        openEquipmentQuickAdd();
        return;
    }
    
    var equipment = DB.get('equipment');
    var eq = equipment.find(function(e) { return e.id === eqId; });
    
    if (!eq) return;
    
    // Auto-fill equipment details
    setField('woEquipType', eq.type);
    setField('woAssetTag', eq.assetTag || eq.id);
    setField('woMaterial', eq.material);
    setField('woDesignPressure', eq.designPressure);
    setField('woDesignTemp', eq.designTemp);
    setField('soEquipment', eq.name);
    
    // Auto-fill description for repair
    var descField = document.getElementById('woDescription');
    if (descField) {
        descField.value = 'Repair: ' + eq.name + ' | ' +
                         'Asset: ' + (eq.assetTag || eq.id) + ' | ' +
                         'Material: ' + (eq.material || 'N/A');
    }
    
    console.log('[AUTOFILL] Equipment loaded:', eq.name);
}

function setField(id, value) {
    var el = document.getElementById(id);
    if (el && value) el.value = value;
}

function openEquipmentQuickAdd() {
    var customerId = (document.getElementById('woClient') || document.getElementById('soClient')).value;
    
    var name = prompt('Equipment Name:');
    if (!name) return;
    var type = prompt('Type (Boiler, Pressure Vessel, Heat Exchanger, etc.):');
    var assetTag = prompt('Asset Tag:');
    var material = prompt('Material:');
    var designPressure = prompt('Design Pressure:');
    
    var eqData = {
        id: DB.genId('equipment'),
        name: name,
        type: type || '',
        assetTag: assetTag || '',
        material: material || '',
        designPressure: designPressure || '',
        customerId: customerId,
        createdAt: new Date().toISOString()
    };
    
    saveWithOwner('equipment', eqData);
    loadCustomerEquipment(customerId);
    showToast('✅ Equipment added!');
}

// ==================== AUTO-FILL REPAIR EQUIPMENT ====================

// Load equipment dropdown when customer is selected
var originalOnCustomerSelect = onCustomerSelect;
onCustomerSelect = function(selectEl) {
    // Call original function
    if (typeof originalOnCustomerSelect === 'function') {
        originalOnCustomerSelect(selectEl);
    }
    
    var customerId = selectEl.value;
    loadRepairEquipmentDropdown(customerId);
};

function loadRepairEquipmentDropdown(customerId) {
    var eqSelect = document.getElementById('soRepEquipmentSelect');
    if (!eqSelect) return;
    
    var equipment = DB.get('equipment') || [];
    var customerEq = equipment.filter(function(e) { 
        return e.customerId === customerId || e.clientId === customerId;
    });
    
    eqSelect.innerHTML = '<option value="">-- Select Equipment --</option>';
    
    customerEq.forEach(function(eq) {
        eqSelect.innerHTML += '<option value="' + eq.id + '">' + 
            eq.name + ' | ' + (eq.type || 'N/A') + ' | ' + (eq.assetTag || eq.id) + '</option>';
    });
    
    if (customerEq.length === 0) {
        eqSelect.innerHTML += '<option value="">No equipment found for this customer</option>';
    }
    
    console.log('[REPAIR] Loaded ' + customerEq.length + ' equipment for customer');
}

function autoFillRepairEquipment(selectEl) {
    var eqId = selectEl.value;
    if (!eqId) return;
    
    var equipment = DB.get('equipment');
    var eq = equipment.find(function(e) { return e.id === eqId; });
    
    if (!eq) return;
    
    // Auto-fill all repair fields
    document.getElementById('soRepEquipName').value = eq.name || '';
    document.getElementById('soRepRegNo').value = eq.regNo || eq.doshRegNo || '';
    document.getElementById('soRepSerial').value = eq.serialNo || eq.assetTag || '';
    document.getElementById('soRepYearMfg').value = eq.yearMfg || '';
    document.getElementById('soRepDesignP').value = eq.designPressure || '';
    document.getElementById('soRepDesignT').value = eq.designTemp || '';
    document.getElementById('soRepScope').value = 'Repair for ' + eq.name + '\nMaterial: ' + (eq.material || 'N/A') + '\nAsset: ' + (eq.assetTag || eq.id);
    
    console.log('[REPAIR] Auto-filled equipment:', eq.name);
    
    // Check relevant test requirements
    if (eq.testHydro) document.getElementById('soRepTestHydro').checked = true;
    if (eq.testBubble) document.getElementById('soRepTestBubble').checked = true;
    if (eq.testDPT) document.getElementById('soRepTestDPT').checked = true;
    if (eq.testUT) document.getElementById('soRepTestUT').checked = true;
    
    showToast('✅ Equipment details auto-filled!');
}