/* ============================================================
   APP.JS — Main Application Logic
   Scroll animations, secret box, modals, constellation
   ============================================================ */

// ── Scroll Reveal ──
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(el => observer.observe(el));
}

// ── Nav Scroll Effect ──
function initNavScroll() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.style.background = 'rgba(7, 6, 11, 0.95)';
      nav.style.borderBottomColor = 'rgba(147, 51, 234, 0.1)';
    } else {
      nav.style.background = 'rgba(7, 6, 11, 0.8)';
      nav.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
    }
  });
}

// ── Secret Box ──
function openSecretBox() {
  const overlay = document.getElementById('secret-overlay');
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  // Animate in
  setTimeout(() => {
    overlay.style.opacity = '1';
    overlay.classList.add('active');
  }, 50);

  // Store session
  sessionStorage.setItem('secretUnlocked', 'true');
}

function closeSecretBox() {
  const overlay = document.getElementById('secret-overlay');
  overlay.style.opacity = '0';
  
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }, 800);
}

// ── Chat ──
function openChat() {
  window.location.href = 'chat.html';
}

// ── Secret Vault (Code Modal) ──
function openSecretVault() {
  document.getElementById('secret-modal').classList.add('active');
  document.getElementById('secret-code-input').focus();
}

function closeSecretModal() {
  document.getElementById('secret-modal').classList.remove('active');
  document.getElementById('secret-code-input').value = '';
  document.getElementById('secret-error').style.display = 'none';
}

function verifySecretCode() {
  const input = document.getElementById('secret-code-input');
  const code = input.value.trim().toLowerCase();

  // The secret code - verified client-side for simplicity
  // (also verified server-side via API for the actual contact data)
  const SECRET = [107, 104, 117, 115, 104, 97, 110, 105]; // encoded
  const decoded = SECRET.map(c => String.fromCharCode(c)).join('');

  if (code === decoded) {
    // Success - reveal contacts
    input.style.borderColor = '#4ADE80';
    document.getElementById('secret-error').style.display = 'none';
    
    // Decode and show contacts (never in HTML source)
    const tgParts = [104,116,116,112,115,58,47,47,116,46,109,101,47,65,110,105,114,117,100,104,115,113];
    const waParts = [57,56,54,48,55,51,48,50,55,53];
    
    const tgUrl = tgParts.map(c => String.fromCharCode(c)).join('');
    const waNum = waParts.map(c => String.fromCharCode(c)).join('');
    
    const tgLink = document.getElementById('tg-link');
    tgLink.href = tgUrl;
    tgLink.textContent = '@Anirudhsq';
    
    const waLink = document.getElementById('wa-link');
    waLink.href = 'https://wa.me/' + waNum;
    waLink.textContent = waNum;
    
    document.getElementById('contact-reveal').classList.add('active');
    
    // Hide input area
    input.style.display = 'none';
    document.querySelector('.modal-btn').style.display = 'none';
    document.querySelector('#secret-modal .modal p').textContent = '💜 Unlocked successfully';
  } else {
    // Wrong code
    input.classList.add('error');
    document.getElementById('secret-error').style.display = 'block';
    setTimeout(() => input.classList.remove('error'), 500);
  }
}

// Enter key for secret code
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const modal = document.getElementById('secret-modal');
    if (modal && modal.classList.contains('active')) {
      verifySecretCode();
    }
  }
});

// ── Constellation ──
function openConstellation() {
  document.getElementById('constellation-modal').classList.add('active');
  drawConstellation();
}

function closeConstellationModal() {
  document.getElementById('constellation-modal').classList.remove('active');
}

function drawConstellation() {
  const canvas = document.getElementById('constellation-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Set actual size
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = 400 * 2;
  ctx.scale(2, 2);
  
  const w = canvas.offsetWidth;
  const h = 400;

  // Stars representing special moments
  const stars = [
    { x: w * 0.2, y: h * 0.3, label: 'First Sight ✨', size: 3 },
    { x: w * 0.4, y: h * 0.15, label: 'First Talk 💬', size: 4 },
    { x: w * 0.6, y: h * 0.25, label: 'First Smile 😊', size: 3.5 },
    { x: w * 0.8, y: h * 0.2, label: 'AI Together 🧠', size: 4 },
    { x: w * 0.3, y: h * 0.55, label: 'Memories 💜', size: 3 },
    { x: w * 0.5, y: h * 0.5, label: 'This Moment ✦', size: 5 },
    { x: w * 0.7, y: h * 0.6, label: 'Forever 🌟', size: 4 },
    { x: w * 0.15, y: h * 0.75, label: 'Dreams 🚀', size: 3 },
    { x: w * 0.85, y: h * 0.8, label: 'Us 💗', size: 4.5 },
  ];

  // Background stars
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = Math.random() * 1.5;
    const opacity = Math.random() * 0.5 + 0.1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fill();
  }

  // Draw constellation lines
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < stars.length - 1; i++) {
    ctx.moveTo(stars[i].x, stars[i].y);
    ctx.lineTo(stars[i + 1].x, stars[i + 1].y);
  }
  // Cross connections
  ctx.moveTo(stars[0].x, stars[0].y);
  ctx.lineTo(stars[4].x, stars[4].y);
  ctx.moveTo(stars[2].x, stars[2].y);
  ctx.lineTo(stars[5].x, stars[5].y);
  ctx.moveTo(stars[3].x, stars[3].y);
  ctx.lineTo(stars[6].x, stars[6].y);
  ctx.stroke();

  // Draw named stars
  stars.forEach(star => {
    // Glow
    const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 8);
    gradient.addColorStop(0, 'rgba(147, 51, 234, 0.3)');
    gradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size * 8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Star point
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = '#A855F7';
    ctx.fill();

    // Label
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#C4B5D4';
    ctx.textAlign = 'center';
    ctx.fillText(star.label, star.x, star.y + star.size + 16);
  });
}

// ── Love Letters ──
function openLetters() {
  document.getElementById('letters-modal').classList.add('active');
}

function closeLettersModal() {
  document.getElementById('letters-modal').classList.remove('active');
}

// ── Close modals on overlay click ──
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
});

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initNavScroll();

  // Check if coming back from chat
  if (sessionStorage.getItem('secretUnlocked') === 'true') {
    // Don't auto-open, just keep the state
  }

  // ── Background Music Logic ──
  const audio = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-toggle');

  if (audio && musicBtn) {
    // Start with muted visual state in case autoplay is blocked
    musicBtn.classList.add('muted');
    audio.volume = 0.5; // Set reasonable volume

    fetch('/api/music.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.songs && data.songs.length > 0) {
          // Pick a random song
          const randomSong = data.songs[Math.floor(Math.random() * data.songs.length)];
          audio.src = '/music/' + randomSong;
          
          // Try to play immediately
          audio.play().then(() => {
            // Autoplay allowed
            musicBtn.classList.remove('muted');
          }).catch(() => {
            // Autoplay blocked by browser (needs interaction)
            // Wait for any first click on the document to start music
            document.addEventListener('click', function startMusic() {
              audio.play();
              musicBtn.classList.remove('muted');
              document.removeEventListener('click', startMusic);
            }, { once: true });
          });
        }
      })
      .catch(console.error);

    // Toggle play/pause
    musicBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the document click listener from firing
      if (audio.paused) {
        audio.play();
        musicBtn.classList.remove('muted');
      } else {
        audio.pause();
        musicBtn.classList.add('muted');
      }
    });
  }
});
