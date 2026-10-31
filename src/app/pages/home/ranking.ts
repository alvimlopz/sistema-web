import { Component, computed, inject } from '@angular/core';
import { JogoStore } from '../../../core/jogo.store';
import { RankingItem, rank } from '../../../core/models';

@Component({
  selector: 'app-ranking',
  template: `
    <div class="cab">
      <h2>Ranking</h2>
      <span class="tag">Caçadores</span>
    </div>

    <ol class="lista">
      @for (r of visiveis(); track r.posicao) {
        @if (r.voce && r.posicao > TOP) {
          <li class="sep">···</li>
        }
        <li [class.voce]="r.voce">
          <span class="pos" [class.p1]="r.posicao === 1" [class.p2]="r.posicao === 2" [class.p3]="r.posicao === 3">
            {{ r.posicao }}
          </span>
          @if (r.fotoUrl) {
            <img [src]="r.fotoUrl" alt="" referrerpolicy="no-referrer" />
          } @else {
            <span class="ini">{{ iniciais(r.nome) }}</span>
          }
          <div class="quem">
            <div class="nome" [title]="r.nome">{{ r.nome }}</div>
            <div class="sub">Nível {{ r.nivel }} · Caçador Rank {{ rank(r.nivel) }}</div>
          </div>
          <span class="rank">{{ rank(r.nivel) }}</span>
        </li>
        @if (r.voce && r.posicao > 1) {
          <li class="falta">Faltam {{ faltaPara(r) }} XP pro {{ r.posicao - 1 }}º lugar</li>
        }
      } @empty {
        <li class="vazio">Nenhum caçador ainda.</li>
      }
    </ol>
  `,
  styles: `
    :host { display: block; }
    .cab { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
    h2 { font-size: 20px; letter-spacing: .02em; text-transform: none; }
    .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    li { display: grid; grid-template-columns: 22px 32px minmax(0, 1fr) auto; gap: 10px; align-items: center;
         padding: 8px; border: 1px solid transparent; }
    li.voce { border-color: var(--line); background: var(--glow-soft); }
    .pos { font-family: var(--f-mono); font-size: 12px; color: var(--mute); text-align: center; }
    .pos.p1 { color: var(--gold); font-weight: 600; }
    .pos.p2 { color: #c9d6e3; font-weight: 600; }
    .pos.p3 { color: #d9a066; font-weight: 600; }
    img, .ini { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--line); }
    .ini { display: grid; place-items: center; font-family: var(--f-display); font-size: 12px; color: var(--mute); background: var(--void); }
    .quem { min-width: 0; }
    .nome { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { font-size: 11.5px; color: var(--mute); }
    .rank { font-family: var(--f-display); font-weight: 800; font-size: 12px; color: var(--void); background: var(--glow);
            padding: 1px 8px; border-radius: 2px; letter-spacing: .08em; }
    .sep { display: block; text-align: center; color: var(--mute); padding: 0; letter-spacing: .3em; }
    .falta { display: block; font-family: var(--f-mono); font-size: 11px; color: var(--gold); padding: 0 8px 4px; }
    .vazio { color: var(--mute); font-size: 13px; display: block; }
  `,
})
export class Ranking {
  store = inject(JogoStore);
  rank = rank;
  readonly TOP = 3;

  /** Top 3 + você (se estiver fora do top 3) */
  visiveis = computed(() => {
    const todos = this.store.ranking();
    const top = todos.slice(0, this.TOP);
    const eu = todos.find(r => r.voce);
    return eu && eu.posicao > this.TOP ? [...top, eu] : top;
  });

  faltaPara(eu: RankingItem) {
    const acima = this.store.ranking().find(r => r.posicao === eu.posicao - 1);
    return acima ? acima.xpTotal - eu.xpTotal + 1 : 0;
  }

  iniciais(nome: string) {
    return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }
}