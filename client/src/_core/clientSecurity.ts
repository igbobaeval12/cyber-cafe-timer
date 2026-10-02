/**
 * Client-side security restrictions for kiosk/café mode
 * Prevents users from accessing system functions during an active session
 * 
 * Note: Full implementation requires:
 * - Running client as Electron app or Windows-specific executable
 * - Administrative privileges
 * - System-level hooks that cannot be disabled from browser
 * 
 * Browser-level restrictions implemented here
 */

// ============== KEYBOARD SHORTCUTS BLOCKING ==============

export function enableKeyboardRestrictions(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const isSessionActive = localStorage.getItem('sessionActive') === 'true';
    if (!isSessionActive) return;

    // Block Alt+Tab (Windows task switching)
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }

    // Block Alt+F4 (Close window)
    if (e.altKey && e.key === 'F4') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }

    // Block Windows key (Start menu)
    if (e.key === 'Meta' || e.key === 'OS') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }

    // Block Ctrl+Alt+Del (Task Manager)
    if (e.ctrlKey && e.altKey && e.key === 'Delete') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }

    // Block Ctrl+Shift+Esc (Task Manager direct)
    if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }

    // Block F12 (Developer Tools)
    if (e.key === 'F12') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }

    // Block Ctrl+Shift+I (Developer Tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }

    // Block Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }

    // Block Ctrl+Shift+K (Console alternative)
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      playSecurityAlert();
      return;
    }
  }, true);
}

export function disableKeyboardRestrictions(): void {
  // Remove by not listening for events after session ends
  localStorage.removeItem('sessionActive');
}

// ============== RIGHT-CLICK CONTEXT MENU BLOCKING ==============

export function disableContextMenu(): void {
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    const isSessionActive = localStorage.getItem('sessionActive') === 'true';
    if (isSessionActive) {
      e.preventDefault();
      playSecurityAlert();
    }
  }, true);
}

export function enableContextMenu(): void {
  // Re-enable by removing session active flag
  localStorage.removeItem('sessionActive');
}

// ============== FULL-SCREEN KIOSK MODE ==============

export async function enterFullscreenMode(): Promise<void> {
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
      localStorage.setItem('sessionActive', 'true');
    }
  } catch (error) {
    console.error('[Security] Fullscreen request failed:', error);
  }
}

export async function exitFullscreenMode(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    localStorage.removeItem('sessionActive');
  } catch (error) {
    console.error('[Security] Fullscreen exit failed:', error);
  }
}

// ============== BROWSER RESTRICTIONS ==============

export function disableDragDrop(): void {
  document.addEventListener('dragover', (e: DragEvent) => {
    const isSessionActive = localStorage.getItem('sessionActive') === 'true';
    if (isSessionActive) {
      e.preventDefault();
    }
  });

  document.addEventListener('drop', (e: DragEvent) => {
    const isSessionActive = localStorage.getItem('sessionActive') === 'true';
    if (isSessionActive) {
      e.preventDefault();
      playSecurityAlert();
    }
  });
}

export function disableBackButton(): void {
  window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
    const isSessionActive = localStorage.getItem('sessionActive') === 'true';
    if (isSessionActive) {
      e.preventDefault();
      e.returnValue = 'Session is still active';
      playSecurityAlert();
      return 'Session is still active';
    }
  });
}

export function disableNewTab(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const isSessionActive = localStorage.getItem('sessionActive') === 'true';
    if (!isSessionActive) return;

    // Block Ctrl+T (New tab)
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      playSecurityAlert();
    }

    // Block Ctrl+N (New window)
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      playSecurityAlert();
    }

    // Block Ctrl+W (Close tab)
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      playSecurityAlert();
    }
  }, true);
}

// ============== POINTER LOCK (MOUSE RESTRICTION - OPTIONAL) ==============

export async function lockMouse(): Promise<void> {
  try {
    await document.body.requestPointerLock();
  } catch (error) {
    console.warn('[Security] Pointer lock not supported:', error);
  }
}

export function unlockMouse(): void {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

// ============== SECURITY ALERT ==============

function playSecurityAlert(): void {
  // Play a visual and optional audio alert
  const alertContainer = document.getElementById('security-alert');
  if (alertContainer) {
    alertContainer.style.display = 'block';
    setTimeout(() => {
      alertContainer.style.display = 'none';
    }, 1000);
  }

  // Try to play sound (if available)
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.log('[Security] Audio alert not available');
  }
}

// ============== INITIALIZE ALL SECURITY MEASURES ==============

export function initializeSecurityRestrictions(): void {
  enableKeyboardRestrictions();
  disableContextMenu();
  disableDragDrop();
  disableBackButton();
  disableNewTab();
  console.log('[Security] Security restrictions initialized');
}

export function disableAllSecurityRestrictions(): void {
  disableKeyboardRestrictions();
  enableContextMenu();
  exitFullscreenMode();
  localStorage.removeItem('sessionActive');
  console.log('[Security] Security restrictions disabled');
}

// ============== MONITORING & LOGGING ==============

export interface SecurityEvent {
  type: 'block' | 'alert';
  action: string;
  timestamp: Date;
  details?: string;
}

const securityLog: SecurityEvent[] = [];

export function logSecurityEvent(action: string, details?: string): void {
  const event: SecurityEvent = {
    type: 'block',
    action,
    timestamp: new Date(),
    details,
  };
  securityLog.push(event);

  // Keep only last 100 events
  if (securityLog.length > 100) {
    securityLog.shift();
  }

  console.log('[Security Log]', event);
}

export function getSecurityLog(): SecurityEvent[] {
  return [...securityLog];
}

export function clearSecurityLog(): void {
  securityLog.length = 0;
}
