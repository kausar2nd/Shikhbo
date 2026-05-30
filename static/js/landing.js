/* ── Tab Switching ───────────────────────────────────────────────────────── */
function switchTab(tab) {
  const loginForm  = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLogin   = document.getElementById('tabLogin');
  const tabSignup  = document.getElementById('tabSignup');

  if (tab === 'login') {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    clearErrors();
  } else {
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    clearErrors();
  }
}

function clearErrors() {
  document.getElementById('loginError').textContent = '';
  document.getElementById('signupError').textContent = '';
}

/* ── Login ───────────────────────────────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();
  const btn    = document.getElementById('loginBtn');
  const errEl  = document.getElementById('loginError');
  const email  = document.getElementById('loginEmail').value.trim();
  const pass   = document.getElementById('loginPassword').value.trim();

  errEl.textContent = '';
  setLoading(btn, true);

  try {
    const res  = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Login failed.';
    } else {
      window.location.href = '/chat';
    }
  } catch (err) {
    errEl.textContent = 'Network error. Is the server running?';
  } finally {
    setLoading(btn, false);
  }
}

/* ── Signup ──────────────────────────────────────────────────────────────── */
async function handleSignup(e) {
  e.preventDefault();
  const btn        = document.getElementById('signupBtn');
  const errEl      = document.getElementById('signupError');
  const name       = document.getElementById('signupName').value.trim();
  const email      = document.getElementById('signupEmail').value.trim();
  const password   = document.getElementById('signupPassword').value.trim();
  const cls        = document.getElementById('signupClass').value.trim();
  const curriculum = document.getElementById('signupCurriculum').value;

  errEl.textContent = '';

  if (!name || !email || !password || !cls || !curriculum) {
    errEl.textContent = 'Please fill in all fields.';
    return;
  }

  setLoading(btn, true);

  try {
    const res  = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, class: cls, curriculum })
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Signup failed.';
    } else {
      window.location.href = '/chat';
    }
  } catch (err) {
    errEl.textContent = 'Network error. Is the server running?';
  } finally {
    setLoading(btn, false);
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function setLoading(btn, loading) {
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text.style.display   = loading ? 'none' : 'inline';
  loader.style.display = loading ? 'inline' : 'none';
}
