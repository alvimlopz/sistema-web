import { Injectable, inject, signal } from '@angular/core';
import { JogoStore } from './jogo.store';

export type FasePomodoro = 'parado' | 'foco' | 'descanso';

function ler(chave: string, padrao: number): number {
  try {
    const v = Number(localStorage.getItem('sistema.pomodoro.' + chave));
    return v > 0 ? v : padrao;
  } catch {
    return padrao;
  }
}

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private store = inject(JogoStore);

  focoMin = signal(ler('foco', 25));
  descansoMin = signal(ler('descanso', 5));
  fase = signal<FasePomodoro>('parado');
  pausado = signal(false);
  missaoId = signal<string | null>(null);
  restanteMs = signal(0);
  totalMs = signal(0);
  sessoesHoje = signal(0);

  private fimEm = 0;
  private timer?: ReturnType<typeof setInterval>;

  iniciarFoco() {
    if (!this.missaoId()) {
      this.store.avisar('Escolha uma missão de tempo antes de começar');
      return;
    }
    this.comecar('foco', this.focoMin() * 60_000);
  }

  pausar() {
    if (this.fase() === 'parado' || this.pausado()) return;
    clearInterval(this.timer);
    this.pausado.set(true);
  }

  retomar() {
    if (!this.pausado()) return;
    this.fimEm = Date.now() + this.restanteMs();
    this.pausado.set(false);
    this.ligar();
  }

  /** Encerra o foco antes do tempo e lança os minutos já feitos. */
  async encerrarFoco() {
    if (this.fase() !== 'foco') return;
    const feitos = Math.floor((this.totalMs() - this.restanteMs()) / 60_000);
    this.parar();
    if (feitos >= 1) {
      await this.lancar(feitos);
    } else {
      this.store.avisar('Menos de 1 minuto: nada foi lançado');
    }
  }

  /** Para sem lançar nada. */
  cancelar() {
    this.parar();
  }

  pularDescanso() {
    if (this.fase() === 'descanso') this.parar();
  }

  salvarConfig(foco: number, descanso: number) {
    const f = Math.min(180, Math.max(1, Math.round(foco)));
    const d = Math.min(60, Math.max(1, Math.round(descanso)));
    this.focoMin.set(f);
    this.descansoMin.set(d);
    try {
      localStorage.setItem('sistema.pomodoro.foco', String(f));
      localStorage.setItem('sistema.pomodoro.descanso', String(d));
    } catch { /* sem storage, só não lembra */ }
  }

  private comecar(fase: FasePomodoro, ms: number) {
    this.fase.set(fase);
    this.totalMs.set(ms);
    this.restanteMs.set(ms);
    this.pausado.set(false);
    this.fimEm = Date.now() + ms;
    this.ligar();
  }

  private ligar() {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 250);
  }

  private tick() {
    const r = Math.max(0, this.fimEm - Date.now());
    this.restanteMs.set(r);
    if (r === 0) this.terminou();
  }

  private async terminou() {
    clearInterval(this.timer);
    const fase = this.fase();
    this.bipe();
    if (fase === 'foco') {
      this.sessoesHoje.update(n => n + 1);
      await this.lancar(this.focoMin());
      this.comecar('descanso', this.descansoMin() * 60_000);
    } else {
      this.parar();
      this.store.avisar('Descanso encerrado. Bora pro próximo foco!');
    }
  }

  private parar() {
    clearInterval(this.timer);
    this.fase.set('parado');
    this.pausado.set(false);
    this.restanteMs.set(0);
    this.totalMs.set(0);
  }

  private lancar(minutos: number) {
    const id = this.missaoId();
    return id ? this.store.lancarProgresso(id, minutos, 'POMODORO') : Promise.resolve(false);
  }

  private bipe() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.frequency.value = 880;
      vol.gain.value = 0.15;
      osc.connect(vol).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch { /* sem áudio, sem bipe */ }
  }
}