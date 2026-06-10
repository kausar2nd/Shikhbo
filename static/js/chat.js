// ── State ─────────────────────────────────────────────────────────────────
let currentSubject = 'ICT';
let currentMode = 'normal';
let attachedFile = null;

let chatHistory = [];

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof SERVER_USER !== 'undefined' && SERVER_USER !== null) {
        initUserInfo();
    }
    updateChips();
    markActive('.subject-item', 'data-subject', currentSubject);
    markActive('.mode-item', 'data-mode', currentMode);
});

function markActive(selector, attr, value) {
    document.querySelectorAll(selector).forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute(attr) === value);
    });
}

function initUserInfo() {
    const uName = document.getElementById('uName');
    const uMeta = document.getElementById('uMeta');
    const avatarInitial = document.getElementById('avatarInitial');
    const welcomeName = document.getElementById('welcomeName');

    if (uName) uName.textContent = SERVER_USER.name;
    if (uMeta) uMeta.textContent = `${SERVER_USER.class} • ${SERVER_USER.curriculum}`;
    if (avatarInitial) avatarInitial.textContent = SERVER_USER.name.charAt(0).toUpperCase();
    if (welcomeName) welcomeName.textContent = SERVER_USER.name.split(' ')[0];

    document.getElementById('chipClass').textContent = SERVER_USER.class;
    document.getElementById('chipCurriculum').textContent = SERVER_USER.curriculum;
}

// ── Subject / Mode / Quality ──────────────────────────────────────────────
function selectSubject(subject) {
    currentSubject = subject;
    markActive('.subject-item', 'data-subject', subject);
    updateChips();
}

function setMode(mode) {
    currentMode = mode;
    markActive('.mode-item', 'data-mode', mode);
    updateChips();
}

function updateChips() {
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'bn';

    const subjectLabels = {
        'ICT': { en: 'ICT', bn: 'আইসিটি' },
        'Bangla': { en: 'Bangla', bn: 'বাংলা' },
        'Physics': { en: 'Physics', bn: 'পদার্থ' }
    };

    const modeLabels = {
        'normal': { en: 'Normal', bn: 'স্বাভাবিক' },
        'simple': { en: 'Simple', bn: 'সহজ' },
        'quiz': { en: 'Quiz', bn: 'কুইজ' },
        'step-by-step': { en: 'Step-by-Step', bn: 'ধাপে ধাপে' }
    };

    const subChip = document.getElementById('chipSubject');
    const modeChip = document.getElementById('chipMode');

    if (subChip) subChip.textContent = subjectLabels[currentSubject]?.[lang] ?? currentSubject;
    if (modeChip) modeChip.textContent = modeLabels[currentMode]?.[lang] ?? currentMode;
}

// ── Auth ──────────────────────────────────────────────────────────────────
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
        console.error('Logout request failed', e);
    }
    window.location.href = '/';
}

// ── Input ─────────────────────────────────────────────────────────────────
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuery();
    }
}

// ── File Attachment ───────────────────────────────────────────────────────
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
        alert('File too large. Maximum size is 20MB.');
        event.target.value = '';
        return;
    }

    attachedFile = file;
    const preview = document.getElementById('attachmentPreview');
    const nameEl = document.getElementById('attachmentName');
    nameEl.textContent = file.name;
    preview.style.display = 'flex';

    // Highlight the clip button
    document.getElementById('clipBtn').classList.add('has-file');
}

function removeAttachment() {
    attachedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('attachmentPreview').style.display = 'none';
    document.getElementById('clipBtn').classList.remove('has-file');
}

// ── Chat ──────────────────────────────────────────────────────────────────
function getMessagesArea() {
    return document.getElementById('chatMessages');
}

async function sendQuery() {
    const inputEl = document.getElementById('queryInput');
    let query = inputEl.value.trim();
    if (!query && !attachedFile) return;

    inputEl.value = '';
    autoResize(inputEl);

    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) welcomeMsg.style.display = 'none';

    // Show file indicator in user message if a file is attached
    const displayText = attachedFile
        ? (query ? `📎 ${attachedFile.name}\n${query}` : `📎 ${attachedFile.name}`)
        : query;
    appendMessage(displayText, 'user');
    chatHistory.push({ role: 'user', content: query || '(see attached file)' });

    // Capture and clear attachment state before async call
    const fileToSend = attachedFile;
    attachedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('attachmentPreview').style.display = 'none';
    document.getElementById('clipBtn').classList.remove('has-file');

    // Show loading indicator
    const loadingId = appendLoading();

    try {
        let res;

        if (fileToSend) {
            // Multipart form data with file
            const formData = new FormData();
            formData.append('file', fileToSend);
            formData.append('messages', JSON.stringify(chatHistory));
            formData.append('subject', currentSubject);
            formData.append('mode', currentMode);
            formData.append('query', query || '');

            res = await fetch('/api/query', {
                method: 'POST',
                body: formData
            });
        } else {
            // Standard JSON request (no file)
            res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: chatHistory,
                    subject: currentSubject,
                    mode: currentMode
                })
            });
        }

        if (!res.ok) {
            removeMessage(loadingId);
            let errorText = 'সার্ভার থেকে ত্রুটি এসেছে।';
            try {
                const data = await res.json();
                if (data.error) errorText = data.error;
            } catch (e) { }
            appendMessage(errorText, 'bot', true);
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullBotResponse = "";
        let buffer = "";

        let initializedMsg = false;
        let contentBox = null;
        let msgDivId = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);

                    if (parsed.status) {
                        const statusEl = document.getElementById(loadingId + '-status');
                        if (statusEl) {
                            const statusMap = {
                                'thinking': { en: 'Thinking...', bn: 'ভাবছি...' },
                                'retrieving': { en: 'Looking into your books...', bn: 'বই খুঁজছি...' },
                                'synthesizing': { en: 'Synthesizing...', bn: 'তথ্য সাজাচ্ছি...' },
                                'generating answer': { en: 'Generating answer...', bn: 'উত্তর তৈরি করছি...' },
                                'uploading file': { en: 'Uploading your file...', bn: 'ফাইল আপলোড হচ্ছে...' }
                            };
                            const lang = (typeof currentLang !== 'undefined') ? currentLang : 'bn';
                            statusEl.textContent = statusMap[parsed.status]?.[lang] || parsed.status;
                        }
                    }

                    if (parsed.chunk || parsed.sources) {
                        if (!initializedMsg) {
                            removeMessage(loadingId);
                            msgDivId = 'msg-' + Date.now();
                            appendMessage('', 'bot', false, [], msgDivId);
                            contentBox = document.getElementById(msgDivId).querySelector('.msg-content');
                            initializedMsg = true;
                        }
                    }

                    if (parsed.chunk) {
                        fullBotResponse += parsed.chunk;
                        contentBox.textContent = fullBotResponse;
                    }
                    if (parsed.sources && parsed.sources.length > 0) {
                        if (initializedMsg) appendSources(document.getElementById(msgDivId), parsed.sources);
                    }
                } catch (e) {
                    console.error("Stream parse error:", e, line);
                }
            }
            getMessagesArea().scrollTop = getMessagesArea().scrollHeight;
        }

        if (!initializedMsg) {
            removeMessage(loadingId);
        }

        if (fullBotResponse) {
            chatHistory.push({ role: 'assistant', content: fullBotResponse });
        }

    } catch (err) {
        console.error(err);
        removeMessage(loadingId);
        appendMessage('নেটওয়ার্ক সমস্যা। সার্ভারের সাথে সংযোগ হচ্ছে না।', 'bot', true);
    }
}

function appendMessage(text, sender, isError = false, sources = [], msgId = null) {
    const chatWindow = getMessagesArea();

    const msgDiv = document.createElement('div');
    if (msgId) msgDiv.id = msgId;
    msgDiv.classList.add('msg', sender);

    const avatar = document.createElement('div');
    avatar.classList.add('msg-avatar');
    if (sender === 'user') {
        avatar.textContent = (typeof SERVER_USER !== 'undefined' && SERVER_USER && SERVER_USER.name)
            ? SERVER_USER.name.charAt(0).toUpperCase() : '?';
    } else {
        avatar.textContent = '⬡';
    }

    const bubble = document.createElement('div');
    bubble.classList.add('msg-bubble');

    const content = document.createElement('div');
    content.classList.add('msg-content');
    content.textContent = text;
    if (isError) content.style.color = 'var(--red)';

    bubble.appendChild(content);

    // Audio Output Play Button (Browser Speech Synthesis)
    if (sender === 'bot' && !isError) {
        const speechBtn = document.createElement('button');
        speechBtn.classList.add('speech-btn');
        speechBtn.innerHTML = '🔊';
        speechBtn.title = "Play audio";
        speechBtn.style.marginTop = '8px';
        speechBtn.style.marginRight = '8px';
        speechBtn.style.background = 'rgba(255,255,255,0.1)';
        speechBtn.style.border = 'none';
        speechBtn.style.padding = '4px 8px';
        speechBtn.style.borderRadius = '5px';
        speechBtn.style.cursor = 'pointer';
        speechBtn.style.color = 'var(--text-dim, #ccc)';
        speechBtn.onclick = () => playBotAudio(content, speechBtn);
        bubble.appendChild(speechBtn);
    }

    if (sources && sources.length > 0) {
        appendSources(bubble, sources);
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function appendSources(bubbleElement, sources) {
    const bubble = bubbleElement.classList.contains('msg-bubble') ? bubbleElement : bubbleElement.querySelector('.msg-bubble');
    if (!bubble) return;

    const sourcesBtn = document.createElement('button');
    sourcesBtn.classList.add('sources-btn');
    sourcesBtn.innerHTML = 'Sources &#9660;';
    sourcesBtn.style.marginTop = '10px';
    sourcesBtn.style.padding = '4px 8px';
    sourcesBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    sourcesBtn.style.border = 'none';
    sourcesBtn.style.borderRadius = '5px';
    sourcesBtn.style.color = 'var(--text-dim, #ccc)';
    sourcesBtn.style.cursor = 'pointer';
    sourcesBtn.style.fontSize = '0.85em';

    sourcesBtn.onclick = () => {
        const sourcesDiv = sourcesBtn.nextElementSibling;
        if (sourcesDiv.style.display === 'none') {
            sourcesDiv.style.display = 'block';
            sourcesBtn.innerHTML = 'Sources &#9650;';
        } else {
            sourcesDiv.style.display = 'none';
            sourcesBtn.innerHTML = 'Sources &#9660;';
        }
    };

    const sourcesDiv = document.createElement('div');
    sourcesDiv.classList.add('msg-sources');
    sourcesDiv.style.display = 'none';
    sourcesDiv.style.marginTop = '10px';
    sourcesDiv.style.paddingTop = '10px';
    sourcesDiv.style.borderTop = '1px solid rgba(255,255,255,0.1)';
    sourcesDiv.style.fontSize = '0.9em';
    sourcesDiv.style.color = 'var(--text-dim)';

    sources.forEach(src => {
        const p = document.createElement('div');
        p.textContent = `• ${src}`;
        p.style.marginBottom = '4px';
        sourcesDiv.appendChild(p);
    });

    bubble.appendChild(sourcesBtn);
    bubble.appendChild(sourcesDiv);
}

function appendLoading() {
    const id = 'loading-' + Date.now();
    const chatWindow = getMessagesArea();

    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.classList.add('msg', 'bot');

    const avatar = document.createElement('div');
    avatar.classList.add('msg-avatar');
    avatar.textContent = '⬡';

    const bubble = document.createElement('div');
    bubble.classList.add('msg-bubble');
    bubble.innerHTML = `
        <div class="typing-indicator" style="display: flex; align-items: center; gap: 10px;">
            <div class="typing-dots"><span></span><span></span><span></span></div>
            <div id="${id}-status" class="status-text" style="font-size: 13.5px; color: var(--text-dim); font-style: italic;">Thinking...</div>
        </div>
    `;

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ── Browser Speech Recognition (STT) ─────────────────────────────────────
let recognition = null;
let isRecording = false;

async function toggleRecording() {
    const micBtn = document.getElementById('micBtn');

    // Stop if already recording
    if (isRecording && recognition) {
        recognition.stop();
        isRecording = false;
        micBtn.classList.remove('recording');
        return;
    }

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
        return;
    }

    // Request microphone permission first
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately — we just needed permission
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
        return;
    }

    // Create and configure recognition
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Set language based on current UI language
    const langToUse = (typeof currentLang !== 'undefined' && currentLang === 'bn') ? 'bn-BD' : 'en-US';
    recognition.lang = langToUse;

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
    };

    recognition.onresult = (event) => {
        const inputEl = document.getElementById('queryInput');
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            }
        }

        if (finalTranscript) {
            inputEl.value = (inputEl.value + ' ' + finalTranscript).trim();
            autoResize(inputEl);
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isRecording = false;
        micBtn.classList.remove('recording');

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            alert('Microphone access denied. Please allow microphone permissions.');
        } else if (event.error === 'network') {
            alert('Speech recognition network error. This often happens if you are using a VPN, proxy, strict firewall, or if your browser cannot reach Google’s speech servers. Please check your connection or try a different browser.');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
            alert('Speech recognition error: ' + event.error);
        }
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
    };

    try {
        recognition.start();
    } catch (err) {
        console.error('Failed to start speech recognition:', err);
        alert('Could not start speech recognition: ' + err.message);
        isRecording = false;
        micBtn.classList.remove('recording');
    }
}

// ── Profile Modal — Curriculum → Class Dropdown ──────────────────────────
const PROFILE_CLASS_OPTIONS = {
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

const PROFILE_LOCAL_CURRICULA = ['NCTB (Bangla)', 'NCTB (English)', 'Madrasah'];

function populateProfileClassDropdown(curriculumValue, preSelectClass) {
    const classSelect = document.getElementById('updateClass');
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'bn';

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

    const isLocal = PROFILE_LOCAL_CURRICULA.includes(curriculumValue);
    const options = isLocal ? PROFILE_CLASS_OPTIONS.local : PROFILE_CLASS_OPTIONS.international;

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label[lang] || opt.label.en;
        classSelect.appendChild(option);
    });

    classSelect.disabled = false;

    // Pre-select class if provided
    if (preSelectClass) {
        classSelect.value = preSelectClass;
    }
}

function openProfileModal() {
    document.getElementById('updateName').value = SERVER_USER.name || '';
    document.getElementById('profileError').textContent = '';

    // Set curriculum and populate class dropdown with pre-selection
    const curriculumSelect = document.getElementById('updateCurriculum');
    curriculumSelect.value = SERVER_USER.curriculum || '';
    populateProfileClassDropdown(SERVER_USER.curriculum || '', SERVER_USER.class || '');

    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

window.addEventListener('click', (e) => {
    const modal = document.getElementById('profileModal');
    if (e.target === modal) closeProfileModal();
});

async function saveProfile() {
    const newName = document.getElementById('updateName').value.trim();
    const newCurriculum = document.getElementById('updateCurriculum').value;
    const newClass = document.getElementById('updateClass').value;
    const errorEl = document.getElementById('profileError');

    if (!newName || !newClass || !newCurriculum) {
        errorEl.textContent = 'সব তথ্য পূরণ করো।';
        return;
    }

    try {
        const res = await fetch('/api/update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, class: newClass, curriculum: newCurriculum })
        });
        const data = await res.json();

        if (res.ok) {
            SERVER_USER = data.user;
            initUserInfo();
            closeProfileModal();
        } else {
            errorEl.textContent = data.error || 'আপডেট করা যায়নি।';
        }
    } catch (e) {
        errorEl.textContent = 'সার্ভার সমস্যা।';
    }
}

// ── Audio Output (TTS via Browser Speech Synthesis) ──────────────────────
let currentUtterance = null;

function playBotAudio(textDiv, btnElement) {
    const text = textDiv.textContent.trim();
    if (!text) return;

    if (!('speechSynthesis' in window)) {
        alert('Speech synthesis is not supported in this browser.');
        return;
    }

    if (currentUtterance) {
        window.speechSynthesis.cancel();
        currentUtterance = null;
        document.querySelectorAll('.speech-btn').forEach(btn => btn.innerHTML = '🔊');
        if (btnElement.dataset.playing === "true") {
            btnElement.dataset.playing = "false";
            return; // Acted as a stop button
        }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const langToUse = (typeof currentLang !== 'undefined' && currentLang === 'bn') ? 'bn-BD' : 'en-US';
    utterance.lang = langToUse;

    utterance.onend = () => {
        btnElement.innerHTML = '🔊';
        btnElement.dataset.playing = "false";
    };

    utterance.onerror = () => {
        btnElement.innerHTML = '🔊';
        btnElement.dataset.playing = "false";
    };

    currentUtterance = utterance;
    btnElement.innerHTML = '⏸️';
    btnElement.dataset.playing = "true";
    window.speechSynthesis.speak(utterance);
}
