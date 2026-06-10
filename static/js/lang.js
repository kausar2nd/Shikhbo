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

// ── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    applyLanguage();
});
