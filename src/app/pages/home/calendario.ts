import { Component, computed, inject } from '@angular/core';
import { DiaResumo, isoLocal, MESES } from '../../../core/models';
import { JogoStore } from '../../../core/jogo.store';


interface Celula { data: string; dia: number; doMes: boolean; resumo?: DiaResumo; }

@Component({
  selector: 'app-calendario',
  template: `
    <div class="cab">
      <h2 class="mes">{{ titulo() }}</h2>
      <div class="nav">
        <button (click)="mover(-1)" aria-label="Mês anterior">‹</button>
        <button class="txt" (click)="irHoje()">Hoje</button>
        <button (click)="mover(1)" aria-label="Próximo mês">›</button>
      </div>
    </div>

    <div class="grade">
      @for (s of semana; track $index) { <span class="dow">{{ s }}</span> }
      @for (c of celulas(); track c.data) {
        <button class="dia"
                [class.fora]="!c.doMes"
                [class.sel]="c.data === store.diaAtual()"
                [class.hoje]="c.data === store.dataHoje()"
                [class.tem]="(c.resumo?.previstas ?? 0) > 0"
                [attr.data-status]="c.resumo?.status"
                [attr.aria-label]="c.data"
                (click)="store.selecionarDia(c.data)">
          <span class="n">{{ c.dia }}</span>
          <i class="marca"></i>
          @if (c.resumo?.penalidade) { <i class="pen" title="Penalidade aplicada"></i> }
        </button>
      }
    </div>

    <div class="legenda">
      <span><i class="l ok"></i>Perfeito</span>
      <span><i class="l parcial"></i>Parcial</span>
      <span><i class="l falhou"></i>Falhou</span>
      <span><i class="l dot"></i>Penalidade</span>
    </div>
  `,
  styles: `
    :host { display: block; }
    .cab { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 14px; }
    .mes { font-size: 20px; text-transform: capitalize; letter-spacing: .02em; }
    .nav { display: flex; gap: 2px; }
    .nav button { all: unset; cursor: pointer; color: var(--mute); padding: 4px 8px; font-size: 16px; }
    .nav button.txt { font-size: 13px; font-family: var(--f-display); letter-spacing: .06em; }
    .nav button:hover { color: var(--ink); }
    .nav button:focus-visible { outline: 1px solid var(--glow); }

    .grade { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .dow { text-align: center; font-family: var(--f-mono); font-size: 10px; color: var(--mute); padding-bottom: 6px; }

    .dia {
      all: unset; cursor: pointer; position: relative; aspect-ratio: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 4px; border: 1px solid transparent;
      font-family: var(--f-mono); font-size: 13px; color: var(--ink); font-variant-numeric: tabular-nums;
    }
    .dia:hover { border-color: var(--line); }
    .dia:focus-visible { outline: 1px solid var(--glow); }
    .dia.fora { color: #3a4e6b; }
    .dia.hoje .n { color: var(--glow); font-weight: 600; }
    .dia.sel { background: var(--glow); color: var(--void); }
    .dia.sel .n { color: var(--void); }

    .marca { width: 16px; height: 2px; background: transparent; }
    .dia[data-status='PERFEITO'] .marca { background: var(--ok); }
    .dia[data-status='PARCIAL'] .marca { background: var(--gold); }
    .dia[data-status='FALHOU'] .marca { background: var(--red); }
    .dia.tem[data-status='HOJE'] .marca { background: var(--glow); box-shadow: 0 0 6px var(--glow); }
    .dia.tem[data-status='FUTURO'] .marca { background: var(--line); }
    .dia.sel .marca { background: var(--void) !important; box-shadow: none !important; }
    .pen { position: absolute; top: 4px; right: 4px; width: 5px; height: 5px; border-radius: 50%; background: var(--red); }

    .legenda { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 14px; font-size: 11px; color: var(--mute); font-family: var(--f-mono); }
    .legenda span { display: flex; align-items: center; gap: 6px; }
    .l { display: inline-block; width: 12px; height: 2px; }
    .l.ok { background: var(--ok); } .l.parcial { background: var(--gold); } .l.falhou { background: var(--red); }
    .l.dot { width: 5px; height: 5px; border-radius: 50%; background: var(--red); }
  `,
})
export class Calendario {
  store = inject(JogoStore);
  semana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  titulo = computed(() => {
    const m = this.store.mesVisivel();
    if (!m) return '';
    const [ano, mes] = m.split('-').map(Number);
    return `${MESES[mes - 1]} ${ano}`;
  });

  celulas = computed<Celula[]>(() => {
    const m = this.store.mesVisivel();
    if (!m) return [];
    const [ano, mes] = m.split('-').map(Number);
    const primeiro = new Date(ano, mes - 1, 1);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const total = Math.ceil((primeiro.getDay() + diasNoMes) / 7) * 7;
    const mapa = new Map(this.store.calendario().map(d => [d.data, d] as const));

    return Array.from({ length: total }, (_, i) => {
      const d = new Date(ano, mes - 1, 1 - primeiro.getDay() + i);
      const iso = isoLocal(d);
      return { data: iso, dia: d.getDate(), doMes: d.getMonth() === mes - 1, resumo: mapa.get(iso) };
    });
  });

  mover(delta: number) {
    const [ano, mes] = this.store.mesVisivel().split('-').map(Number);
    this.store.irParaMes(isoLocal(new Date(ano, mes - 1 + delta, 1)).slice(0, 7));
  }

  irHoje() {
    const h = this.store.dataHoje();
    if (h) this.store.selecionarDia(h);
  }
}