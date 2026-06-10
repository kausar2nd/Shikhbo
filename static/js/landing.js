/* ── Curriculum → Class Mapping ────────────────────────────────────────────── */
const CLASS_OPTIONS = {
    local: [
        { value: 'Class 8', label: { en: 'Class 8', bn: 'ক্লাস ৮' } },
        { value: 'Class 9', label: { en: 'Class 9', bn: 'ক্লাস ৯' } },
        { value: 'SSC', label: { en: 'SSC (Class 10)', bn: 'এসএসসি (ক্লাস ১০)' } },
        { value: 'Class 11', label: { en: 'Class 11', bn: 'ক্লাস ১১' } },
        { value: 'HSC', label: { en: 'HSC (Class 12)', bn: 'এইচএসসি (ক্লাস ১২)' } },
    ],
    international: [
        { value: 'Standard 8', label: { en: 'Standard 8', bn: 'স্ট্যান্ডার্ড ৮' } },
        { value: 'Standard 9', label: { en: 'Standard 9', bn: 'স্ট্যান্ডার্ড ৯' } },
        { value: 'O-Level', label: { en: 'O-Level', bn: 'ও-লেভেল' } },
        { value: 'Standard 11', label: { en: 'Standard 11', bn: 'স্ট্যান্ডার্ড ১১' } },
        { value: 'A-Level', label: { en: 'A-Level', bn: 'এ-লেভেল' } },
    ],
};

const LOCAL_CURRICULA = ['NCTB (Bangla)', 'NCTB (English)', 'Madrasah'];

function populateClassDropdown(curriculumValue, classSelectId) {
    const classSelect = document.getElementById(classSelectId);
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'bn';

    // Clear existing options
    classSelect.innerHTML = '';

    if (!curriculumValue) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = lang === 'en' ? 'Select curriculum first' : 'আগে কারিকুলাম নির্বাচন করো';
        classSelect.appendChild(placeholder);
        classSelect.disabled = true;
        return;
    }

    // Add placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = lang === 'en' ? 'Select class…' : 'ক্লাস নির্বাচন করো…';
    classSelect.appendChild(placeholder);

    // Determine which class set to use
    const isLocal = LOCAL_CURRICULA.includes(curriculumValue);
    const options = isLocal ? CLASS_OPTIONS.local : CLASS_OPTIONS.international;

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label[lang] || opt.label.en;
        classSelect.appendChild(option);
    });

    classSelect.disabled = false;
}


/* ── Tab Switching ────────────────────────────────────────────────────────── */
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');

    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
        tabLogin.classList.remove('active');
        tabSignup.classList.add('active');
    }
}

/* ── Login ───────────────────────────────────────────────────────────────── */
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    errEl.textContent = '';
    setLoading(btn, true);

    try {
        const res = await fetch('/api/login', {
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

/* ── Sign Up ─────────────────────────────────────────────────────────────── */
async function handleSignup(e) {
    e.preventDefault();
    const btn = document.getElementById('signupBtn');
    const errEl = document.getElementById('signupError');

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const curriculum = document.getElementById('signupCurriculum').value;
    const classValue = document.getElementById('signupClass').value;

    errEl.textContent = '';

    if (!name || !email || !password || !curriculum || !classValue) {
        errEl.textContent = 'সব তথ্য পূরণ করো।';
        return;
    }

    if (password.length < 6) {
        errEl.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
        return;
    }

    setLoading(btn, true);

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                email,
                password,
                class: classValue,
                curriculum
            })
        });
        const data = await res.json();

        if (!res.ok) {
            errEl.textContent = data.error || 'Sign up failed.';
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
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    text.style.display = loading ? 'none' : 'inline';
    loader.style.display = loading ? 'inline' : 'none';
}
