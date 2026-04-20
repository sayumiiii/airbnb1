// ── Supabase config ───────────────────────────────────────────────────────────
// To enable cloud sync:
//  1. Create a free project at https://supabase.com
//  2. Go to Settings → API and copy your URL + anon key
//  3. Replace the placeholders below
//  4. Run supabase-setup.sql in your Supabase SQL editor
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

let _sb = null;
let _user = null;

function _initSupabase() {
  if (typeof window.supabase === 'undefined') return;
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  _sb.auth.getSession().then(({ data: { session } }) => {
    _user = session?.user || null;
    _updateAuthUI();
  });
  _sb.auth.onAuthStateChange((event, session) => {
    _user = session?.user || null;
    _updateAuthUI();
    if (_user && event === 'SIGNED_IN') CK._pullFromCloud();
  });
}

function _updateAuthUI() {
  document.querySelectorAll('.auth-chip').forEach(chip => {
    const dot   = chip.querySelector('.auth-dot');
    const label = chip.querySelector('.auth-label');
    if (_user) {
      chip.classList.add('logged-in');
      if (label) label.textContent = _user.email.split('@')[0];
      chip.onclick = () => CK.showAuthModal('account');
    } else {
      chip.classList.remove('logged-in');
      if (label) label.textContent = 'Sign in to sync';
      chip.onclick = () => CK.showAuthModal('signin');
    }
  });
  // hide sync banner if logged in
  const banners = document.querySelectorAll('.sync-banner');
  banners.forEach(b => b.style.display = _user ? 'none' : '');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = {
  show(msg, type = 'info', ms = 3200) {
    let box = document.getElementById('toast-container');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-container';
      document.body.appendChild(box);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    box.appendChild(t);
    setTimeout(() => {
      t.classList.add('hiding');
      setTimeout(() => t.remove(), 280);
    }, ms);
  }
};

// ── CK data layer ─────────────────────────────────────────────────────────────
const CK = {
  getEntries()   { return JSON.parse(localStorage.getItem('ck_entries')  || '[]'); },
  saveEntries(e) {
    localStorage.setItem('ck_entries', JSON.stringify(e));
    if (_sb && _user) this._pushEntries(e).catch(() => {});
  },
  getSettings()  { return JSON.parse(localStorage.getItem('ck_settings') || '{}'); },
  saveSettings(s){ localStorage.setItem('ck_settings', JSON.stringify(s)); },
  getDecodes()   { return parseInt(localStorage.getItem('ck_decodes') || '0'); },
  incDecodes()   {
    const n = this.getDecodes() + 1;
    localStorage.setItem('ck_decodes', n);
    if (_sb && _user) this._pushDecodeCount(n).catch(() => {});
  },
  isPremium()    { return localStorage.getItem('ck_premium') === 'true'; },
  setPremium(v)  { localStorage.setItem('ck_premium', v ? 'true' : 'false'); },

  getStreak() {
    const entries = this.getEntries();
    if (!entries.length) return 0;
    const days = [...new Set(entries.map(e => e.date).filter(Boolean))].sort().reverse();
    if (!days.length) return 0;
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (days[0] !== today && days[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i-1]) - new Date(days[i])) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  },

  // ── Supabase sync ────────────────────────────────────────────────────────────
  async _pushEntries(entries) {
    if (!_sb || !_user) return;
    await _sb.from('journal_entries').delete().eq('user_id', _user.id);
    if (entries.length) {
      const rows = entries.map(e => ({
        id: String(e.id), user_id: _user.id,
        title: e.title, category: e.category,
        date: e.date || null, metrics: e.metrics || null,
        description: e.description || null
      }));
      await _sb.from('journal_entries').insert(rows);
    }
  },

  async _pushDecodeCount(n) {
    if (!_sb || !_user) return;
    await _sb.from('user_settings').upsert(
      { user_id: _user.id, decode_count: n },
      { onConflict: 'user_id' }
    );
  },

  async _pullFromCloud() {
    if (!_sb || !_user) return;
    try {
      const { data: rows } = await _sb
        .from('journal_entries').select('*')
        .eq('user_id', _user.id).order('date', { ascending: true });

      if (rows?.length) {
        const local    = this.getEntries();
        const cloudIds = new Set(rows.map(r => r.id));
        const merged   = [
          ...rows.map(r => ({
            id: parseInt(r.id) || r.id, title: r.title,
            category: r.category, date: r.date,
            metrics: r.metrics, description: r.description
          })),
          ...local.filter(e => !cloudIds.has(String(e.id)))
        ];
        localStorage.setItem('ck_entries', JSON.stringify(merged));
      }

      const { data: settings } = await _sb
        .from('user_settings').select('*')
        .eq('user_id', _user.id).single();

      if (settings?.decode_count) localStorage.setItem('ck_decodes', settings.decode_count);
      if (settings?.is_premium)   localStorage.setItem('ck_premium', 'true');

      Toast.show('Data synced from cloud ☁️', 'success');
      if (typeof render       === 'function') render();
      if (typeof generateAll  === 'function') generateAll();
    } catch (err) { console.warn('Cloud pull error:', err); }
  },

  // ── Auth modal ──────────────────────────────────────────────────────────────
  showAuthModal(mode = 'signin') {
    const notConfigured = SUPABASE_URL === 'YOUR_SUPABASE_URL';

    let overlay = document.getElementById('ck-auth-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ck-auth-modal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:420px;">
          <h3 id="_auth_title">Sign in</h3>
          <p id="_auth_sub" style="color:var(--text-2);font-size:0.85rem;margin:-0.75rem 0 1.5rem;line-height:1.5;"></p>

          <div id="_auth_not_cfg" style="display:none;">
            <div style="background:var(--dark);border:1px solid var(--border);border-radius:10px;padding:1.25rem;font-size:0.82rem;line-height:1.8;color:var(--text-2);">
              <div style="font-weight:700;color:var(--text);margin-bottom:0.5rem;">🔧 Setup cloud sync in 3 steps:</div>
              <div>1. Create a free project at <strong style="color:var(--blue-light);">supabase.com</strong></div>
              <div>2. Copy your <strong>Project URL</strong> and <strong>anon key</strong></div>
              <div>3. Paste them into <code style="color:var(--blue-light);background:rgba(10,102,194,0.12);padding:1px 5px;border-radius:4px;">js/app.js</code> (lines 6–7)</div>
            </div>
            <div style="margin-top:1rem;padding:0.75rem;background:var(--green-dim);border:1px solid var(--green-border);border-radius:8px;font-size:0.8rem;color:var(--text-2);">
              💡 Your data is already saved in your browser's localStorage and won't disappear on refresh — only when you clear browser data.
            </div>
          </div>

          <div id="_auth_acct" style="display:none;text-align:center;padding:1rem 0 0.5rem;">
            <div style="font-size:2.5rem;margin-bottom:0.75rem;">👤</div>
            <div id="_auth_email_disp" style="font-weight:600;margin-bottom:0.25rem;"></div>
            <div style="font-size:0.8rem;color:var(--green);margin-bottom:1.5rem;">● Synced to cloud</div>
            <button class="btn btn-outline" style="width:100%;" onclick="CK.signOut()">Sign out</button>
          </div>

          <div id="_auth_form">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" id="_auth_em" placeholder="you@example.com" autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" class="form-control" id="_auth_pw" placeholder="Min 6 characters" autocomplete="current-password">
            </div>
            <div class="modal-footer" style="flex-direction:column;gap:0.5rem;padding-top:0.25rem;">
              <button class="btn btn-primary" style="width:100%;" id="_auth_submit" onclick="CK._submit()">Sign In</button>
              <button class="btn btn-outline" style="width:100%;" id="_auth_toggle" onclick="CK._toggleMode()">No account? Create one</button>
              <button class="btn" style="color:var(--muted);font-size:0.8rem;" onclick="document.getElementById('ck-auth-modal').classList.remove('open')">Maybe later</button>
            </div>
          </div>

          <div class="modal-footer" id="_auth_close_only" style="display:none;">
            <button class="btn btn-outline" onclick="document.getElementById('ck-auth-modal').classList.remove('open')">Close</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    }

    overlay.classList.add('open');

    if (notConfigured) {
      overlay.querySelector('#_auth_title').textContent = '☁️ Cloud Sync';
      overlay.querySelector('#_auth_sub').textContent   = 'Connect a free Supabase database so your data syncs across devices.';
      overlay.querySelector('#_auth_not_cfg').style.display = 'block';
      overlay.querySelector('#_auth_acct').style.display    = 'none';
      overlay.querySelector('#_auth_form').style.display    = 'none';
      overlay.querySelector('#_auth_close_only').style.display = 'flex';
      return;
    }

    overlay.querySelector('#_auth_not_cfg').style.display    = 'none';
    overlay.querySelector('#_auth_close_only').style.display = 'none';

    if (mode === 'account' && _user) {
      overlay.querySelector('#_auth_title').textContent = 'Your Account';
      overlay.querySelector('#_auth_sub').textContent   = '';
      overlay.querySelector('#_auth_acct').style.display = 'block';
      overlay.querySelector('#_auth_form').style.display = 'none';
      overlay.querySelector('#_auth_email_disp').textContent = _user.email;
    } else {
      overlay.querySelector('#_auth_title').textContent = 'Sign in to sync';
      overlay.querySelector('#_auth_sub').textContent   = 'Your data will sync across all your devices automatically.';
      overlay.querySelector('#_auth_acct').style.display = 'none';
      overlay.querySelector('#_auth_form').style.display = 'block';
    }
  },

  _authMode: 'signin',
  _toggleMode() {
    this._authMode = this._authMode === 'signin' ? 'signup' : 'signin';
    document.getElementById('_auth_submit').textContent = this._authMode === 'signin' ? 'Sign In' : 'Create Account';
    document.getElementById('_auth_toggle').textContent = this._authMode === 'signin' ? 'No account? Create one' : 'Already have one? Sign in';
  },

  async _submit() {
    const email = document.getElementById('_auth_em').value.trim();
    const pass  = document.getElementById('_auth_pw').value;
    if (!email || !pass) { Toast.show('Please fill in all fields', 'error'); return; }

    const btn = document.getElementById('_auth_submit');
    const orig = btn.textContent;
    btn.textContent = 'Please wait…'; btn.disabled = true;

    const fn = this._authMode === 'signup'
      ? _sb.auth.signUp({ email, password: pass })
      : _sb.auth.signInWithPassword({ email, password: pass });
    const { error } = await fn;

    btn.disabled = false; btn.textContent = orig;

    if (error) { Toast.show(error.message, 'error', 5000); return; }

    document.getElementById('ck-auth-modal').classList.remove('open');
    Toast.show(this._authMode === 'signup'
      ? '🎉 Account created! Check your email to confirm.'
      : '✅ Signed in! Syncing your data…', 'success', 4500);
  },

  async signOut() {
    if (_sb) await _sb.auth.signOut();
    _user = null;
    document.getElementById('ck-auth-modal')?.classList.remove('open');
    _updateAuthUI();
    Toast.show('Signed out', 'info');
  }
};

// ── CV bullet helper ──────────────────────────────────────────────────────────
const CATEGORY_VERBS = {
  shipped:    ['Shipped', 'Launched', 'Deployed', 'Released', 'Delivered'],
  closed:     ['Closed', 'Won', 'Secured', 'Landed', 'Negotiated'],
  led:        ['Led', 'Managed', 'Coordinated', 'Directed', 'Oversaw'],
  built:      ['Built', 'Developed', 'Engineered', 'Designed', 'Created'],
  learned:    ['Completed', 'Mastered', 'Acquired', 'Studied', 'Earned'],
  saved:      ['Reduced', 'Saved', 'Cut', 'Optimised', 'Streamlined'],
  recognized: ['Awarded', 'Recognised', 'Received', 'Honoured', 'Commended'],
};

function toCVBullet(entry) {
  const verbs = CATEGORY_VERBS[entry.category] || ['Completed'];
  let bullet = `${verbs[0]} ${entry.title}`;
  if (entry.metrics) bullet += ` — ${entry.metrics}`;
  else if (entry.description) bullet += `: ${entry.description.substring(0, 80)}${entry.description.length > 80 ? '…' : ''}`;
  return bullet;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', _initSupabase);
