// Input-Handler: Wandelt rohe Tastatur- und Touch-Events in semantische
// Aktionen um. Aktionen werden einmalig "konsumiert" - so verhindert man,
// dass eine gehaltene Taste oder ein Swipe mehrfach auslöst.

export type Action = 'left' | 'right' | 'jump' | 'duck';

/** Mindest-Distanz in Pixeln, ab der ein Touch-Move als Swipe zählt. */
const SWIPE_THRESHOLD = 30;

export class Input {
  private pending = new Set<Action>();

  // Touch-Tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private touchId: number | null = null;
  /** true, sobald für diesen Touch schon ein Swipe gefeuert wurde. */
  private swipeFired = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);

    // Touch-Events am window registrieren, damit ein Swipe auch funktioniert,
    // wenn er außerhalb des Canvas startet. passive: false, damit
    // preventDefault wirkt und der Browser nicht scrollt/zoomt.
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.pending.add('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.pending.add('right');
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        this.pending.add('jump');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.pending.add('duck');
        break;
    }
  };

  /**
   * Bei mehreren Fingern verfolgen wir nur den ersten - das hält die
   * Logik einfach und ist für ein 4-Aktionen-Spiel mehr als genug.
   */
  private onTouchStart = (e: TouchEvent) => {
    // Wenn der Finger auf einem Button landet (z.B. Start-Knopf im Overlay),
    // NICHT preventDefault rufen - sonst klickt er nicht.
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'BUTTON' || target.closest('button'))) {
      return;
    }

    e.preventDefault();
    if (this.touchId !== null) return; // schon ein Finger aktiv

    const t = e.changedTouches[0];
    this.touchId = t.identifier;
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.swipeFired = false;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.touchId === null) return;

    // Den passenden Finger aus changedTouches herausfischen
    let t: Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        t = e.changedTouches[i];
        break;
      }
    }
    if (!t) return;

    e.preventDefault();
    if (this.swipeFired) return; // pro Touch nur einmal feuern

    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Solange beide Distanzen unter dem Threshold sind, warten
    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) return;

    // Dominante Richtung bestimmt die Aktion
    if (absX > absY) {
      this.pending.add(dx > 0 ? 'right' : 'left');
    } else {
      this.pending.add(dy < 0 ? 'jump' : 'duck');
    }
    this.swipeFired = true;
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (this.touchId === null) return;

    // Prüfen, ob es unser verfolgter Finger ist
    let found = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        found = true;
        break;
      }
    }
    if (!found) return;

    this.touchId = null;
    this.swipeFired = false;
  };

  /** Holt die nächste anstehende Aktion und entfernt sie aus dem Puffer. */
  consume(): Action | null {
    const next = this.pending.values().next().value as Action | undefined;
    if (next) this.pending.delete(next);
    return next ?? null;
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('touchcancel', this.onTouchEnd);
  }
}
