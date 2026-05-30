// ── State ─────────────────────────────────────────────────────────────────
let currentSubject = 'ICT';
let currentMode = 'normal';
let currentQuality = 'fast';

let chatHistory = [];

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof SERVER_USER !== 'undefined' && SERVER_USER !== null) {
        initUserInfo();
    }
    updateChips();
    markActive('.subject-item', 'data-subject', currentSubject);
    markActive('.quality-item', 'data-quality', currentQuality);
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

function setQuality(quality) {
    currentQuality = quality;
    markActive('.quality-item', 'data-quality', quality);
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

    const qualityLabels = {
        'fast': { en: 'Fast', bn: 'দ্রুত' },
        'enhanced': { en: 'Enhanced', bn: 'বিস্তারিত' }
    };

    const subChip = document.getElementById('chipSubject');
    const modeChip = document.getElementById('chipMode');
    const qualChip = document.getElementById('chipQuality');

    if (subChip) subChip.textContent = subjectLabels[currentSubject]?.[lang] ?? currentSubject;
    if (modeChip) modeChip.textContent = modeLabels[currentMode]?.[lang] ?? currentMode;
    if (qualChip) qualChip.textContent = qualityLabels[currentQuality]?.[lang] ?? currentQuality;
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

// ── Chat ──────────────────────────────────────────────────────────────────
let attachedFile = null;

function toggleAttachmentMenu(e) {
    const menu = document.getElementById('attachmentMenu');
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'flex';
        // Close menu if clicking outside
        document.addEventListener('click', closeAttachmentMenuOutside);
    } else {
        menu.style.display = 'none';
        document.removeEventListener('click', closeAttachmentMenuOutside);
    }
}

function closeAttachmentMenuOutside(e) {
    const menu = document.getElementById('attachmentMenu');
    const clipBtn = document.getElementById('clipBtn');
    if (!menu.contains(e.target) && !clipBtn.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeAttachmentMenuOutside);
    }
}

function triggerFileInput(acceptType) {
    const fileInput = document.getElementById('fileInput');
    fileInput.accept = acceptType;
    fileInput.click();
    document.getElementById('attachmentMenu').style.display = 'none';
    document.removeEventListener('click', closeAttachmentMenuOutside);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        attachedFile = file;
        document.getElementById('attachmentName').textContent = file.name;
        document.getElementById('attachmentArea').style.display = 'flex';
    }
}

function removeAttachment() {
    attachedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('attachmentArea').style.display = 'none';
    document.getElementById('attachmentName').textContent = '';
}

function getMessagesArea() {
    return document.getElementById('chatMessages');
}

async function sendQuery() {
    const inputEl = document.getElementById('queryInput');
    let originalQuery = inputEl.value.trim();
    let query = originalQuery;
    if (!query && !attachedFile) return;

    inputEl.value = '';
    autoResize(inputEl);

    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) welcomeMsg.style.display = 'none';

    let extractedText = "";
    if (attachedFile) {
        // Show loading info for text extraction specifically if needed, 
        // but simple enough is to just append a spinner.
        const extLoadingId = appendLoading();

        const formData = new FormData();
        formData.append("file", attachedFile);
        try {
            const extRes = await fetch('/api/extract_file', {
                method: 'POST',
                body: formData
            });
            if (extRes.ok) {
                const extData = await extRes.json();
                extractedText = extData.text || "";
            } else {
                removeMessage(extLoadingId);
                alert("Failed to extract text from file.");
                return;
            }
        } catch (e) {
            removeMessage(extLoadingId);
            alert("Network error while extracting file.");
        }

        const uiQuery = originalQuery ? `${originalQuery}\n(Attached File: ${attachedFile.name})` : `(Attached File: ${attachedFile.name})`;
        appendMessage(uiQuery, 'user');

        removeAttachment(); // clear it
    } else {
        appendMessage(query, 'user');
    }

    chatHistory.push({ role: 'user', content: query });

    // Show loading here to indicate generation
    const loadingId = appendLoading();

    try {
        const res = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: chatHistory,
                subject: currentSubject,
                mode: currentMode,
                response_quality: currentQuality
            })
        });

        removeMessage(loadingId);

        if (!res.ok) {
            let errorText = 'সার্ভার থেকে ত্রুটি এসেছে।';
            try {
                const data = await res.json();
                if (data.error) errorText = data.error;
            } catch (e) { }
            appendMessage(errorText, 'bot', true);
            return;
        }

        // Initialize empty message box for bot
        const msgDivId = 'msg-' + Date.now();
        appendMessage('', 'bot', false, [], msgDivId);

        const contentBox = document.getElementById(msgDivId).querySelector('.msg-content');

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullBotResponse = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last partial line in the buffer
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.chunk) {
                        fullBotResponse += parsed.chunk;
                        contentBox.textContent = fullBotResponse;
                    }
                    if (parsed.sources && parsed.sources.length > 0) {
                        // Create sources button dynamically
                        appendSources(document.getElementById(msgDivId), parsed.sources);
                    }
                } catch (e) {
                    console.error("Stream parse error:", e, line);
                }
            }
            getMessagesArea().scrollTop = getMessagesArea().scrollHeight;
        }

        chatHistory.push({ role: 'assistant', content: fullBotResponse });

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

    // Audio Output Play Button
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
    // If msgDiv is passed, we actually need its .msg-bubble child. Let's handle both
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
    bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

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

// ── Audio Recording ───────────────────────────────────────────────────────
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const micBtn = document.getElementById('micBtn');
    if (!isRecording) {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Microphone access is blocked. This usually happens when accessing via HTTP instead of HTTPS or localhost.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioChunks = [];

                // Upload audio to transcribe endpoint
                const formData = new FormData();
                formData.append('audio', audioBlob, 'voice.wav');

                const langToUse = (typeof currentLang !== 'undefined') ? currentLang : 'bn';
                formData.append('lang', langToUse);

                micBtn.classList.remove('recording');
                const loadingId = appendLoading(); // Show typing indicator

                try {
                    const res = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData
                    });

                    removeMessage(loadingId);

                    if (res.ok) {
                        const data = await res.json();
                        if (data.text) {
                            const inputEl = document.getElementById('queryInput');
                            inputEl.value = (inputEl.value + " " + data.text).trim();
                            autoResize(inputEl);
                        } else if (data.error) {
                            alert("Transcription error: " + data.error);
                        }
                    } else {
                        alert("Error contacting the audio endpoint.");
                    }
                } catch (e) {
                    removeMessage(loadingId);
                    alert("Network error: " + e.message);
                }
            };

            mediaRecorder.start();
            isRecording = true;
            micBtn.classList.add('recording');

        } catch (err) {
            alert('Could not access microphone: ' + err.message);
        }
    } else {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        micBtn.classList.remove('recording');
    }
}

// ── Profile Modal ─────────────────────────────────────────────────────────
function openProfileModal() {
    document.getElementById('updateName').value = SERVER_USER.name || '';
    document.getElementById('updateClass').value = SERVER_USER.class || '';
    document.getElementById('updateCurriculum').value = SERVER_USER.curriculum || '';
    document.getElementById('profileError').textContent = '';
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
    const newClass = document.getElementById('updateClass').value.trim();
    const newCurriculum = document.getElementById('updateCurriculum').value.trim();
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
            SERVER_USER.name = newName;
            SERVER_USER.class = newClass;
            SERVER_USER.curriculum = newCurriculum;
            initUserInfo();
            closeProfileModal();
        } else {
            errorEl.textContent = data.error || 'আপডেট করা যায়নি।';
        }
    } catch (e) {
        errorEl.textContent = 'সার্ভার সমস্যা।';
    }
}

// ── Audio Output (TTS) ───────────────────────────────────────────────────
let currentTTSAudio = null;

async function playBotAudio(textDiv, btnElement) {
    const text = textDiv.textContent.trim();
    if (!text) return;

    // Check if something is playing right now
    if (currentTTSAudio) {
        currentTTSAudio.pause();
        currentTTSAudio.currentTime = 0;
        currentTTSAudio = null;
        document.querySelectorAll('.speech-btn').forEach(btn => btn.innerHTML = '🔊');
        if (btnElement.dataset.playing === "true") {
            btnElement.dataset.playing = "false";
            return; // Acted as a stop button
        }
    }

    // Change icon to loading
    btnElement.innerHTML = '⏳';
    btnElement.dataset.playing = "true";

    try {
        const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (!res.ok) {
            alert('Failed to generate audio. Maybe the TTS model is missing.');
            btnElement.innerHTML = '🔊';
            btnElement.dataset.playing = "false";
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        currentTTSAudio = new Audio(url);
        currentTTSAudio.onended = () => {
            btnElement.innerHTML = '🔊';
            btnElement.dataset.playing = "false";
        };
        currentTTSAudio.play();

        btnElement.innerHTML = '⏸️'; // Change icon to pause while playing

    } catch (e) {
        console.error(e);
        btnElement.innerHTML = '🔊';
        btnElement.dataset.playing = "false";
    }
}

