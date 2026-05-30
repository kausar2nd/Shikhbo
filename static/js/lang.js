// ── Language ──────────────────────────────────────────────────────────────
let currentLang = localStorage.getItem('shikhbo_lang') || 'bn';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('shikhbo_lang', currentLang);
    applyLanguage();
    if (typeof updateChips === 'function') updateChips();
}

function toggleLanguage() {
    setLanguage(currentLang === 'en' ? 'bn' : 'en');
}

function applyLanguage() {
    document.querySelectorAll('[data-en][data-bn]').forEach(el => {
        const value = el.getAttribute('data-' + currentLang);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.hasAttribute('placeholder')) el.placeholder = value;
            if (el.type === 'button' || el.type === 'submit') el.value = value;
        } else if (el.tagName === 'OPTION') {
            el.text = value;
        } else {
            el.innerHTML = value;
        }
    });

    document.querySelectorAll('.lang-toggle').forEach(btn => {
        btn.textContent = currentLang === 'en' ? 'বাংলা' : 'English';
    });

    const btnBn = document.getElementById('langBnBtn');
    const btnEn = document.getElementById('langEnBtn');
    if (btnBn && btnEn) {
        btnBn.classList.toggle('active', currentLang === 'bn');
        btnEn.classList.toggle('active', currentLang === 'en');
    }
}

// ── Theme ─────────────────────────────────────────────────────────────────
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('shikhbo_theme', theme);
    updateThemeButtons(theme);
}

function updateThemeButtons(theme) {
    const btnDark = document.getElementById('themeDarkBtn');
    const btnLight = document.getElementById('themeLightBtn');
    if (btnDark && btnLight) {
        btnDark.classList.toggle('active', theme !== 'light');
        btnLight.classList.toggle('active', theme === 'light');
    }
}

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('shikhbo_theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    updateThemeButtons(savedTheme);
    applyLanguage();
});
