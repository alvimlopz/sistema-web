import { Component, inject } from '@angular/core';
import { JogoStore } from '../../../../core/jogo.store';
import { brl } from '../../../../core/models';


@Component({
  selector: 'app-aba-registro',
  template: `
    <div class="sec-head">
      <div class="tag">Registro do Sistema</div>
      <span class="num mute">XP total: {{ store.me()?.xpTotal ?? 0 }}</span>
    </div>
    <div class="log">
      @for (h of store.historico(); track $index) {
        <div class="linha">
          <span class="mute">{{ quando(h.quando) }}</span>
          <span class="desc">{{ h.descricao ?? h.tipo }}</span>
          <span [class.pos]="h.xp > 0" [class.neg]="h.xp < 0">{{ h.xp > 0 ? '+' : '' }}{{ h.xp }} XP</span>
          <span class="mute">{{ brl(h.valorCentavos) }}</span>
        </div>
      } @empty {
        <div class="empty">Nada registrado ainda. Complete uma missão.</div>
      }
    </div>
  `,
  styles: `
    .log { font-family: var(--f-mono); font-size: 12px; display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
    .linha { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: baseline; }
    .desc { min-width: 0; overflow-wrap: anywhere; }
    .pos { color: var(--ok); }
    .neg { color: var(--red); }
  `,
})
export class AbaRegistro {
  store = inject(JogoStore);
  brl = brl;

  quando(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}