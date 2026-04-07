/* ============================================================
   3D CUBE — Interactive Password System
   Rotate RIGHT → top line | Rotate LEFT → bottom line
   Password: 4 top + 3 bottom = unlock
   ============================================================ */

(function () {
  const scene = document.getElementById('cube-scene');
  const cube = document.getElementById('cube-3d');
  const topBar = document.getElementById('top-bar');
  const bottomBar = document.getElementById('bottom-bar');

  if (!scene || !cube) return;

  // Password config
  const PASSWORD_TOP = 4;
  const PASSWORD_BOTTOM = 3;
  const MAX_LINES = 7;

  // State
  let topCount = 0;
  let bottomCount = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentRotationY = 30;
  let currentRotationX = -15;
  let dragStartY = 30;
  let dragStartX = -15;
  let isUnlocked = false;
  let autoRotate = true;

  const DRAG_THRESHOLD = 60; // pixels needed for a "step"
  let dragAccumulatedX = 0;

  // Stop auto rotation on first interaction
  function stopAutoRotate() {
    if (autoRotate) {
      autoRotate = false;
      cube.classList.remove('auto-rotate');
      // Get current computed rotation
      const computed = getComputedStyle(cube).transform;
      cube.style.transform = `rotateX(${currentRotationX}deg) rotateY(${currentRotationY}deg)`;
    }
  }

  // Update cube rotation
  function updateCube() {
    cube.style.transform = `rotateX(${currentRotationX}deg) rotateY(${currentRotationY}deg)`;
  }

  // Add a line to top bar
  function addTopLine() {
    if (topCount >= MAX_LINES) return;
    const lines = topBar.querySelectorAll('.line');
    if (lines[topCount]) {
      lines[topCount].classList.add('visible');
      topCount++;
      
      // Subtle haptic feedback effect
      scene.style.transform = 'scale(1.02)';
      setTimeout(() => { scene.style.transform = 'scale(1)'; }, 150);
      
      checkPassword();
    }
  }

  // Add a line to bottom bar
  function addBottomLine() {
    if (bottomCount >= MAX_LINES) return;
    const lines = bottomBar.querySelectorAll('.line');
    if (lines[bottomCount]) {
      lines[bottomCount].classList.add('visible');
      bottomCount++;
      
      scene.style.transform = 'scale(1.02)';
      setTimeout(() => { scene.style.transform = 'scale(1)'; }, 150);
      
      checkPassword();
    }
  }

  // Check password
  function checkPassword() {
    const totalLines = topCount + bottomCount;

    if (topCount === PASSWORD_TOP && bottomCount === PASSWORD_BOTTOM) {
      // SUCCESS!
      unlockCube();
      return;
    }

    // If total lines reach max without correct combo, reset
    if (totalLines >= MAX_LINES) {
      setTimeout(resetLines, 800);
    }
  }

  // Reset all lines
  function resetLines() {
    // Shake animation
    scene.style.animation = 'shake 0.5s ease';
    setTimeout(() => { scene.style.animation = ''; }, 500);

    topBar.querySelectorAll('.line').forEach(l => l.classList.remove('visible'));
    bottomBar.querySelectorAll('.line').forEach(l => l.classList.remove('visible'));
    topCount = 0;
    bottomCount = 0;
  }

  // Unlock the cube
  function unlockCube() {
    if (isUnlocked) return;
    isUnlocked = true;

    // Set current rotation for animation
    cube.style.setProperty('--current-y', currentRotationY + 'deg');

    // Dramatic unlock animation
    cube.classList.remove('auto-rotate');
    cube.classList.add('unlocking');

    // Flash effect
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed; inset: 0; z-index: 1999;
      background: radial-gradient(circle, rgba(147,51,234,0.3) 0%, transparent 70%);
      pointer-events: none;
      animation: fadeSlideDown 1.5s ease forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1500);

    // Show secret box after animation
    setTimeout(() => {
      openSecretBox();
    }, 2000);
  }

  // Mouse events
  scene.addEventListener('mousedown', (e) => {
    if (isUnlocked) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    dragAccumulatedX = 0;
    dragStartY = currentRotationY;
    dragStartX = currentRotationX;
    stopAutoRotate();
    scene.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || isUnlocked) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Rotate cube visually
    currentRotationY = dragStartY + deltaX * 0.5;
    currentRotationX = dragStartX - deltaY * 0.3;
    currentRotationX = Math.max(-60, Math.min(10, currentRotationX));
    updateCube();

    dragAccumulatedX += (e.movementX || 0);
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDragging || isUnlocked) return;
    isDragging = false;
    scene.style.cursor = 'grab';

    const totalDeltaX = e.clientX - startX;

    // Determine direction based on total drag distance
    if (Math.abs(totalDeltaX) >= DRAG_THRESHOLD) {
      if (totalDeltaX > 0) {
        // Dragged RIGHT → add top line
        addTopLine();
      } else {
        // Dragged LEFT → add bottom line
        addBottomLine();
      }
    }

    startX = 0;
    startY = 0;
  });

  // Touch events
  scene.addEventListener('touchstart', (e) => {
    if (isUnlocked) return;
    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragAccumulatedX = 0;
    dragStartY = currentRotationY;
    dragStartX = currentRotationX;
    stopAutoRotate();
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging || isUnlocked) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    currentRotationY = dragStartY + deltaX * 0.5;
    currentRotationX = dragStartX - deltaY * 0.3;
    currentRotationX = Math.max(-60, Math.min(10, currentRotationX));
    updateCube();
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!isDragging || isUnlocked) return;
    isDragging = false;

    const touch = e.changedTouches[0];
    const totalDeltaX = touch.clientX - startX;

    if (Math.abs(totalDeltaX) >= DRAG_THRESHOLD) {
      if (totalDeltaX > 0) {
        addTopLine();
      } else {
        addBottomLine();
      }
    }
  });
})();
