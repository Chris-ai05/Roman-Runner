// Input-Handler: Wandelt rohe Tastatur-Events in semantische Aktionen um.
// Aktionen werden einmalig "konsumiert" - so verhindert man, dass eine
// gehaltene Taste mehrfach auslöst.

export type Action = 'left' | 'right' | 'jump' | 'duck';

export class Input {
  private pending = new Set<Action>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return; // gehaltene Taste ignorieren
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

  /** Holt die nächste anstehende Aktion und entfernt sie aus dem Puffer. */
  consume(): Action | null {
    const next = this.pending.values().next().value as Action | undefined;
    if (next) this.pending.delete(next);
    return next ?? null;
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
