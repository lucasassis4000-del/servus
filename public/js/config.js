// SERVUS — Configuração do Supabase
const SUPABASE_URL = 'https://lrpjowkjchezjvmchbdg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycGpvd2tqY2hlemp2bWNoYmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjM3MDgsImV4cCI6MjA4OTA5OTcwOH0.JqfFQrYd7lAnPkneXIJ3qom8Qy73YJOz--BuN_A4LXA';

// REST API helpers
const API = {
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer': 'return=representation'
  },

  authHeaders() {
    const session = JSON.parse(localStorage.getItem('servus_session') || 'null');
    return {
      ...this.headers,
      'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`
    };
  },

  async get(table, params = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`, {
      headers: this.authHeaders()
    });
    return r.json();
  },

  async post(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body)
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || JSON.stringify(e)); }
    return r.json();
  },

  async patch(table, id, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(body)
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || JSON.stringify(e)); }
    return r.json();
  }
};

// Auth helpers
const Auth = {
  async signUp(email, password, nome, tipo, telefone, cidade, estado) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message || data.error);

    const session = data.session || data;
    if (session.access_token) {
      localStorage.setItem('servus_session', JSON.stringify(session));
    }

    // Create profile
    const userId = data.user?.id || data.id;
    if (userId) {
      const authH = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token || SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      };
      await fetch(`${SUPABASE_URL}/rest/v1/servus_perfis`, {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({ id: userId, nome, tipo, email, telefone, whatsapp: telefone, cidade, estado })
      });
    }
    return data;
  },

  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message || data.error);
    localStorage.setItem('servus_session', JSON.stringify(data));
    return data;
  },

  signOut() {
    localStorage.removeItem('servus_session');
    localStorage.removeItem('servus_perfil');
    window.location.href = '/';
  },

  getSession() {
    return JSON.parse(localStorage.getItem('servus_session') || 'null');
  },

  getPerfil() {
    return JSON.parse(localStorage.getItem('servus_perfil') || 'null');
  },

  async loadPerfil() {
    const session = this.getSession();
    if (!session) return null;
    const userId = session.user?.id;
    if (!userId) return null;
    const perfis = await API.get('servus_perfis', `id=eq.${userId}`);
    if (perfis && perfis[0]) {
      localStorage.setItem('servus_perfil', JSON.stringify(perfis[0]));
      return perfis[0];
    }
    return null;
  },

  isLoggedIn() {
    const session = this.getSession();
    if (!session) return false;
    const exp = session.expires_at || (session.user?.exp);
    if (exp && Date.now() / 1000 > exp) {
      this.signOut();
      return false;
    }
    return true;
  }
};

// Helpers
function estrelas(nota) {
  return '★'.repeat(nota) + '☆'.repeat(5 - nota);
}

function formatData(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR');
}

function cidadeEstado(cidade, estado) {
  if (cidade && estado) return `${cidade}, ${estado}`;
  return cidade || estado || '';
}
