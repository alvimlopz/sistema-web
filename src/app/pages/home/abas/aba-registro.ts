import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { JogoStore } from '../../../../core/jogo.store';
import { DiaDetalhe, brl, dataDe, isoLocal } from '../../../../core/models';

@Component({
  selector: 'app-aba-registro',
  template: `
    <div class="sec-head">
      <div class="tag">Registro do Sistema</div>
      <span class="num mute">XP total: {{ store.me()?.xpTotal ?? 0 }}</span>
    </div>

    <div class="nav-dia">
      <button class="btn small" (click)="mover(-1)" aria-label="Dia anterior">◀</button>
      <div class="dia-atual">
        <b>{{ titulo() }}</b>
        <input type="date" [value]="data()" [max]="hoje()" aria-label="Escolher data"
               (change)="irPara($any($event.target).value)" />
      </div>
      <button class="btn small" (click)="mover(1)" [disabled]="data() >= hoje()" aria-label="Próximo dia">▶</button>
    </div>

    <div class="resumo-dia">
      <span>XP do dia <b [class.pos]="totalXp() > 0" [class.neg]="totalXp() < 0">{{ totalXp() > 0 ? '+' : '' }}{{ totalXp() }}</b></span>
      <span>Tesouro <b>{{ brl(totalCentavos()) }}</b></span>
      <span>Lançamentos <b>{{ eventos().length }}</b></span>
    </div>

    @if (carregando()) {
      <p class="mute">Carregando...</p>
    } @else {
      <div class="log">
        @for (e of eventos(); track $index) {
          <div class="linha">
            <span class="mute">{{ hora(e.quando) }}</span>
            <span class="desc">{{ e.descricao ?? e.tipo }}</span>
            <span [class.pos]="e.xp > 0" [class.neg]="e.xp < 0">{{ e.xp > 0 ? '+' : '' }}{{ e.xp }} XP</span>
            <span class="mute">{{ brl(e.valorCentavos) }}</span>
          </div>
        } @empty {
          <div class="empty">Nenhum lançamento neste dia.</div>
        }
      </div>
    }
  `,
  styles: `
    .nav-dia { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
    .dia-atual { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .dia-atual b { font-family: var(--f-display); font-size: 18px; text-transform: capitalize; }
    .dia-atual input { width: auto; padding: 4px 8px; font-size: 13px; }
    .resumo-dia { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 12px; padding: 10px 12px;
                  border: 1px solid var(--line); font-size: 12.5px; color: var(--mute); }
    .resumo-dia b { color: var(--ink); font-family: var(--f-mono); margin-left: 4px; }
    .log { font-family: var(--f-mono); font-size: 12px; display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
    .linha { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: baseline; }
    .desc { min-width: 0; overflow-wrap: anywhere; }
    .pos { color: var(--ok) !important; }
    .neg { color: var(--red) !important; }
  `,
})
export class AbaRegistro {
  store = inject(JogoStore);
  private api = inject(ApiService);
  brl = brl;

  hoje = computed(() => this.store.dataHoje() ?? isoLocal(new Date()));
  data = signal<string>(this.store.dataHoje() ?? isoLocal(new Date()));
  detalhe = signal<DiaDetalhe | null>(null);
  carregando = signal(false);

  /** Mais recente primeiro. */
  eventos = computed(() => [...(this.detalhe()?.eventos ?? [])].reverse());
  totalXp = computed(() => this.eventos().reduce((s, e) => s + e.xp, 0));
  totalCentavos = computed(() => this.eventos().reduce((s, e) => s + e.valorCentavos, 0));

  titulo = computed(() => {
    const d = this.data();
    const h = this.hoje();
    if (d === h) return 'Hoje';
    const ontem = dataDe(h);
    ontem.setDate(ontem.getDate() - 1);
    if (d === isoLocal(ontem)) return 'Ontem';
    return dataDe(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  });

  constructor() {
    // Carrega ao abrir e recarrega quando o XP muda (ex.: concluiu uma missão hoje).
    effect(() => {
      this.store.historico();
      untracked(() => this.carregar());
    });
  }

  mover(delta: number) {
    const d = dataDe(this.data());
    d.setDate(d.getDate() + delta);
    this.irPara(isoLocal(d));
  }

  irPara(iso: string) {
    if (!iso || iso > this.hoje()) return;
    this.data.set(iso);
    this.carregar();
  }

  hora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  private async carregar() {
    this.carregando.set(true);
    try {
      this.detalhe.set(await this.api.dia(this.data()));
    } catch {
      this.detalhe.set(null);
      this.store.avisar('Não foi possível carregar o registro desse dia');
    } finally {
      this.carregando.set(false);
    }
  }
}