import { Component, computed, inject } from '@angular/core';
import { JogoStore } from '../../../core/jogo.store';
import { ATRIBUTOS } from '../../../core/models';

const CX = 130;
const CY = 125;
const R = 80;

function ponto(i: number, frac: number) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / ATRIBUTOS.length;
  return { x: CX + R * frac * Math.cos(a), y: CY + R * frac * Math.sin(a) };
}

@Component({
  selector: 'app-radar',
  template: `
    <div class="cab">
      <h2>Habilidades</h2>
      <span class="tag">Atributos</span>
    </div>

    @if (store.me()) {
      <svg viewBox="0 0 260 245" role="img" [attr.aria-label]="'Atributos: ' + resumo()">
        @for (anel of aneis; track $index) {
          <polygon class="anel" [attr.points]="anel" />
        }
        @for (e of eixos(); track e.sigla) {
          <line class="eixo" [attr.x1]="cx" [attr.y1]="cy" [attr.x2]="e.x" [attr.y2]="e.y" />
        }
        <polygon class="dados" [attr.points]="pontos()" />
        @for (p of vertices(); track p.sigla) {
          <circle class="ponto" [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" />
        }
        @for (e of eixos(); track e.sigla) {
          <text [attr.x]="e.lx" [attr.y]="e.ly" text-anchor="middle">
            <tspan class="sig">{{ e.sigla }}</tspan>
            <tspan class="val" [attr.x]="e.lx" dy="14">{{ e.valor }}</tspan>
          </text>
        }
      </svg>
      <p class="forte">{{ forte() }}</p>
    }
  `,
  styles: `
    :host { display: block; }
    .cab { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    h2 { font-size: 20px; letter-spacing: .02em; text-transform: none; }
    svg { width: 100%; height: auto; display: block; }
    .anel { fill: none; stroke: var(--line); stroke-width: 1; }
    .eixo { stroke: var(--line); stroke-width: 1; }
    .dados { fill: rgba(76, 195, 255, .22); stroke: var(--glow); stroke-width: 2; stroke-linejoin: round;
             filter: drop-shadow(0 0 6px rgba(76, 195, 255, .5)); transition: all .5s; }
    .ponto { fill: var(--glow); }
    .sig { fill: var(--mute); font-family: var(--f-mono); font-size: 11px; letter-spacing: .1em; }
    .val { fill: var(--ink); font-family: var(--f-display); font-weight: 700; font-size: 14px; }
    .forte { margin: 4px 0 0; font-size: 12.5px; color: var(--mute); text-align: center; }
    .forte b { color: var(--glow); }
  `,
})
export class Radar {
  store = inject(JogoStore);
  cx = CX;
  cy = CY;

  /** Anéis de fundo: 25%, 50%, 75% e 100% */
  aneis = [0.25, 0.5, 0.75, 1].map(f =>
    ATRIBUTOS.map((_, i) => { const p = ponto(i, f); return `${p.x},${p.y}`; }).join(' ')
  );

  private valor(sigla: string): number {
    return (this.store.me()?.atributos as Record<string, number> | undefined)?.[sigla] ?? 0;
  }

  /** Escala relativa: o atributo mais alto define a borda (múltiplos de 5) */
  escala = computed(() => {
    const max = Math.max(5, ...ATRIBUTOS.map(a => this.valor(a.sigla)));
    return Math.ceil(max / 5) * 5;
  });

  vertices = computed(() =>
    ATRIBUTOS.map((a, i) => ({ sigla: a.sigla, ...ponto(i, this.valor(a.sigla) / this.escala()) }))
  );

  pontos = computed(() => this.vertices().map(p => `${p.x},${p.y}`).join(' '));

  eixos = computed(() =>
    ATRIBUTOS.map((a, i) => {
      const fim = ponto(i, 1);
      const rot = ponto(i, 1.3);
      return { sigla: a.sigla, valor: this.valor(a.sigla), x: fim.x, y: fim.y, lx: rot.x, ly: rot.y - 5 };
    })
  );

  resumo = computed(() => ATRIBUTOS.map(a => `${a.nome} ${this.valor(a.sigla)}`).join(', '));

  forte = computed(() => {
    const ordenados = [...ATRIBUTOS].sort((a, b) => this.valor(b.sigla) - this.valor(a.sigla));
    return this.valor(ordenados[0].sigla) === 0
      ? 'Complete missões para revelar suas habilidades'
      : `Ponto forte: ${ordenados[0].nome}`;
  });
}