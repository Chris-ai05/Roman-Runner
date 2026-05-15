// Schmaler Wrapper um die HUD- und Overlay-Elemente.
// So bleibt der Spielcode frei von DOM-Geknüppel.

export class UI {
  private distanceEl = document.getElementById('distance') as HTMLElement;
  private coinsEl = document.getElementById('coins') as HTMLElement;
  private overlay = document.getElementById('overlay') as HTMLElement;
  private startBtn = document.getElementById('start-btn') as HTMLButtonElement;
  private gameOverInfo = document.getElementById('game-over-info') as HTMLElement;
  private finalDistance = document.getElementById('final-distance') as HTMLElement;
  private finalCoins = document.getElementById('final-coins') as HTMLElement;
  private highscoreEl = document.getElementById('highscore') as HTMLElement;
  private mountEl = document.getElementById('mount-timer') as HTMLElement | null;

  onStart(cb: () => void) {
    this.startBtn.addEventListener('click', cb);
  }

  setDistance(d: number) {
    this.distanceEl.textContent = Math.floor(d).toString();
  }

  setCoins(c: number) {
    this.coinsEl.textContent = c.toString();
  }

  /** Anzeige des Reit-Timers. seconds=0 versteckt die Anzeige. */
  setMount(seconds: number) {
    if (!this.mountEl) return;
    if (seconds > 0) {
      this.mountEl.style.display = 'block';
      this.mountEl.textContent = `🐎 ${Math.ceil(seconds)}s`;
    } else {
      this.mountEl.style.display = 'none';
    }
  }

  showStart() {
    this.overlay.classList.remove('hidden');
    this.gameOverInfo.style.display = 'none';
    this.startBtn.textContent = 'Incipe';
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  showGameOver(distance: number, coins: number, highscore: number) {
    this.overlay.classList.remove('hidden');
    this.gameOverInfo.style.display = 'block';
    this.finalDistance.textContent = Math.floor(distance).toString();
    this.finalCoins.textContent = coins.toString();
    this.highscoreEl.textContent = Math.floor(highscore).toString();
    this.startBtn.textContent = 'Iterum';
  }
}
