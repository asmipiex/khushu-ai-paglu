/* ============================================================
   CHAT.JS — Full Chat System
   Features: Messages, media, polling, 7-click delete, blush
   ============================================================ */

// ── State ──
let currentUser = null; // 'khushi' or 'anirudh'
let pendingFile = null;
let pendingFileType = null;
let pollInterval = null;
let lastMessageId = null;
let clickCounters = new Map(); // messageId -> { count, timer }

const API_BASE = 'api/chat.php';
const UPLOAD_BASE = 'api/upload.php';

// ── User Selection ──
function selectUser(user) {
  currentUser = user;
  sessionStorage.setItem('chatUser', user);

  // Hide selection, show chat
  document.getElementById('user-select-screen').style.display = 'none';
  document.getElementById('iphone-scene').style.display = 'flex';

  // Set partner info
  const partner = user === 'khushi' ? 'anirudh' : 'khushi';
  document.getElementById('chat-partner-name').textContent =
    partner === 'khushi' ? 'Khushi 💜' : 'Artist 🎨';
  document.getElementById('chat-partner-avatar').textContent =
    partner === 'khushi' ? '💜' : '🎨';

  // Update status bar time
  updateStatusTime();
  setInterval(updateStatusTime, 60000);

  // Load messages
  loadMessages();

  // Start polling for new messages
  pollInterval = setInterval(loadNewMessages, 2500);

  // Focus input
  document.getElementById('chat-input').focus();
}

function updateStatusTime() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  document.getElementById('status-time').textContent = `${h12}:${m} ${ampm}`;
}

function goBack() {
  window.location.href = 'index.html';
}

// ── Send Message ──
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();

  if (!text && !pendingFile) return;

  // Prepare message data
  const formData = new FormData();
  formData.append('action', 'send');
  formData.append('sender', currentUser);

  if (pendingFile) {
    formData.append('type', pendingFileType);
    formData.append('file', pendingFile);
    formData.append('content', text || ''); // Optional caption
  } else {
    formData.append('type', 'text');
    formData.append('content', text);
  }

  // Clear input immediately
  input.value = '';
  input.style.height = 'auto';
  removeFilePreview();

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (data.success) {
      appendMessage(data.message);
      scrollToBottom();
    }
  } catch (err) {
    // Offline mode - create local message
    const localMsg = {
      id: 'local_' + Date.now(),
      sender: currentUser,
      type: pendingFile ? pendingFileType : 'text',
      content: text,
      timestamp: new Date().toISOString(),
      media: null
    };
    appendMessage(localMsg);
    scrollToBottom();

    // Save to localStorage as fallback
    saveLocalMessage(localMsg);
  }
}

// ── Load Messages ──
async function loadMessages() {
  try {
    const response = await fetch(`${API_BASE}?action=fetch`);
    const data = await response.json();

    if (data.success && data.messages) {
      const container = document.getElementById('chat-messages');
      container.innerHTML = '';

      let lastDate = null;
      data.messages.forEach(msg => {
        if (msg.deleted) return;

        // Date separator
        const msgDate = new Date(msg.timestamp).toLocaleDateString();
        if (msgDate !== lastDate) {
          addDateSeparator(msgDate);
          lastDate = msgDate;
        }

        appendMessage(msg, false);
        lastMessageId = msg.id;
      });

      scrollToBottom(false);
    }
  } catch (err) {
    // Load from localStorage fallback
    loadLocalMessages();
  }
}

async function loadNewMessages() {
  try {
    const url = lastMessageId
      ? `${API_BASE}?action=fetch&after=${lastMessageId}`
      : `${API_BASE}?action=fetch`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.messages && data.messages.length > 0) {
      data.messages.forEach(msg => {
        if (msg.deleted) return;
        if (!document.querySelector(`[data-message-id="${msg.id}"]`)) {
          appendMessage(msg);
          lastMessageId = msg.id;
        }
      });
      scrollToBottom();
    }
  } catch (err) {
    // Silently fail polling
  }
}

// ── Render Message ──
function appendMessage(msg, animate = true) {
  const container = document.getElementById('chat-messages');
  const isSent = msg.sender === currentUser;

  const row = document.createElement('div');
  row.className = `message-row ${isSent ? 'sent' : 'received'}`;
  row.setAttribute('data-message-id', msg.id);
  if (animate) row.style.animationDelay = '0.05s';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  // Media content
  if (msg.media && (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio')) {
    const mediaDiv = document.createElement('div');
    mediaDiv.className = 'message-media';

    if (msg.type === 'image') {
      const img = document.createElement('img');
      img.src = msg.media;
      img.alt = 'Shared photo';
      img.loading = 'lazy';
      mediaDiv.appendChild(img);
    } else if (msg.type === 'video') {
      const video = document.createElement('video');
      video.src = msg.media;
      video.controls = true;
      video.preload = 'metadata';
      mediaDiv.appendChild(video);
    } else if (msg.type === 'audio') {
      const audio = document.createElement('audio');
      audio.src = msg.media;
      audio.controls = true;
      audio.preload = 'metadata';
      mediaDiv.appendChild(audio);
    }

    bubble.appendChild(mediaDiv);
  }

  // Text content
  if (msg.content) {
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = msg.content;
    bubble.appendChild(textDiv);
  }

  // Timestamp
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  const msgTime = new Date(msg.timestamp);
  const h = msgTime.getHours() % 12 || 12;
  const m = msgTime.getMinutes().toString().padStart(2, '0');
  const ampm = msgTime.getHours() >= 12 ? 'PM' : 'AM';
  timeDiv.textContent = `${h}:${m} ${ampm}`;
  bubble.appendChild(timeDiv);

  // Click handler - blush effect + secret 7-click delete
  bubble.addEventListener('click', (e) => {
    handleMessageClick(msg.id, row, bubble);
  });

  row.appendChild(bubble);
  container.appendChild(row);
}

// ── Message Click — Blush + 7-Click Delete ──
function handleMessageClick(msgId, row, bubble) {
  // Blush animation on every click
  bubble.classList.remove('blushing');
  void bubble.offsetWidth; // Force reflow
  bubble.classList.add('blushing');
  setTimeout(() => bubble.classList.remove('blushing'), 600);

  // 7-click delete logic (only for Anirudh)
  if (currentUser !== 'anirudh') return;

  if (!clickCounters.has(msgId)) {
    clickCounters.set(msgId, { count: 0, timer: null });
  }

  const counter = clickCounters.get(msgId);
  counter.count++;

  // Reset timer — user has 4 seconds to complete 7 clicks
  clearTimeout(counter.timer);
  counter.timer = setTimeout(() => {
    clickCounters.delete(msgId);
  }, 4000);

  if (counter.count >= 7) {
    // DELETE the message
    deleteMessage(msgId, row);
    clickCounters.delete(msgId);
  }
}

// ── Delete Message ──
async function deleteMessage(msgId, row) {
  // Animate out
  row.classList.add('deleting');

  setTimeout(async () => {
    row.remove();

    // Send delete to server
    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('id', msgId);
      formData.append('user', currentUser);

      await fetch(API_BASE, {
        method: 'POST',
        body: formData
      });
    } catch (err) {
      // Remove from local storage
      removeLocalMessage(msgId);
    }
  }, 500);
}

// ── Date Separator ──
function addDateSeparator(dateStr) {
  const container = document.getElementById('chat-messages');
  const sep = document.createElement('div');
  sep.className = 'date-separator';

  const today = new Date().toLocaleDateString();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

  let label = dateStr;
  if (dateStr === today) label = 'Today';
  else if (dateStr === yesterday) label = 'Yesterday';

  sep.innerHTML = `<span>${label}</span>`;
  container.appendChild(sep);
}

// ── File Upload ──
function triggerFileUpload(type) {
  document.getElementById(`file-input-${type}`).click();
}

function handleFileSelect(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  pendingFile = file;
  pendingFileType = type;

  // Show preview
  const preview = document.getElementById('file-preview');
  const thumb = document.getElementById('file-preview-thumb');
  const info = document.getElementById('file-preview-info');

  info.textContent = file.name;

  if (type === 'image') {
    thumb.src = URL.createObjectURL(file);
    thumb.style.display = 'block';
  } else {
    thumb.style.display = 'none';
  }

  preview.classList.add('active');

  // Clear file input
  event.target.value = '';
}

function removeFilePreview() {
  pendingFile = null;
  pendingFileType = null;
  document.getElementById('file-preview').classList.remove('active');
  document.getElementById('file-preview-thumb').src = '';
}

// ── Scroll to Bottom ──
function scrollToBottom(smooth = true) {
  const container = document.getElementById('chat-messages');
  if (smooth) {
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  } else {
    container.scrollTop = container.scrollHeight;
  }
}

// ── Auto-resize Input ──
const chatInput = document.getElementById('chat-input');
if (chatInput) {
  chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ── Local Storage Fallback ──
function getLocalMessages() {
  try {
    return JSON.parse(localStorage.getItem('kap_messages') || '[]');
  } catch {
    return [];
  }
}

function saveLocalMessage(msg) {
  const messages = getLocalMessages();
  messages.push(msg);
  localStorage.setItem('kap_messages', JSON.stringify(messages));
}

function removeLocalMessage(msgId) {
  let messages = getLocalMessages();
  messages = messages.filter(m => m.id !== msgId);
  localStorage.setItem('kap_messages', JSON.stringify(messages));
}

function loadLocalMessages() {
  const messages = getLocalMessages();
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';

  let lastDate = null;
  messages.forEach(msg => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString();
    if (msgDate !== lastDate) {
      addDateSeparator(msgDate);
      lastDate = msgDate;
    }
    appendMessage(msg, false);
  });
  scrollToBottom(false);
}

// ── Check Session ──
(function () {
  const savedUser = sessionStorage.getItem('chatUser');
  if (savedUser) {
    // Auto-login if session exists
    // But still show selection for fresh visits
  }
})();
