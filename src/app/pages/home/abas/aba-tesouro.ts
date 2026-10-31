import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JogoStore } from '../../../../core/jogo.store';
import { ApiService } from '../../../../core/api.service';
import { brl } from '../../../../core/models';


@Component({
  selector: 'app-aba-tesouro',
  imports: [FormsModule],
  template: `
    @if (store.me(); as me) {
      <div class="resumo">
        <div><small>Ganho total</small><b class="ouro">{{ brl(me.tesouroGanhoCentavos) }}</b></div>
        <div><small>Na caixinha</small><b>{{ brl(me.saldoCaixinhaCentavos) }}</b></div>
        <div><small>Falta depositar</small><b>{{ brl(me.pendenteDepositoCentavos) }}</b></div>
      </div>

      <div class="sec-head">
        <span class="mute txt">
          @if (me.tesouroLiberado) { Tesouro liberado. Pode usar o que está na caixinha. }
          @else { 🔒 O tesouro só pode ser usado a partir do nível {{ me.nivelLiberaTesouro }}. }
        </span>
        <div class="botoes">
          @if (me.pendenteDepositoCentavos > 0) {
            <button class="btn gold solid" (click)="store.depositar()">Depositei {{ brl(me.pendenteDepositoCentavos) }}</button>
          }
          @if (me.tesouroLiberado) {
            <button class="btn gold" (click)="abrirCompra()">Usar tesouro</button>
          }
        </div>
      </div>

      <div class="sec-head">
        <div>
          <div class="tag gold">Valor do XP</div>
          <span class="mute txt">Quanto cada XP vale daqui pra frente. O que já foi ganho não muda.</span>
        </div>
        <div class="botoes">
          <span class="mute">R$</span>
          <input class="valor" type="number" min="0" step="0.05" [(ngModel)]="valorXp" aria-label="Reais por XP" />
          <button class="btn small gold" (click)="salvarValor()">Salvar</button>
        </div>
      </div>
    }

    <div class="sec-head"><div class="tag">Movimentos da caixinha</div></div>
    <div class="list">
      @for (m of store.tesouro()?.movimentos ?? []; track m.id) {
        <div class="item">
          <span class="num" [class.ouro]="m.tipo === 'DEPOSITO'">{{ m.tipo === 'DEPOSITO' ? '+' : '−' }}</span>
          <div>
            <div class="t">{{ m.descricao }}</div>
            <div class="s">{{ quando(m.criadoEm) }}</div>
          </div>
          <span class="num" [class.ouro]="m.tipo === 'DEPOSITO'">{{ brl(m.valorCentavos) }}</span>
        </div>
      } @empty {
        <div class="empty">Nenhum depósito ainda.</div>
      }
    </div>

    <dialog #dlg>
      <form (ngSubmit)="comprar()">
        <h2>Usar tesouro</h2>
        <p class="mute txt">Disponível na caixinha: {{ brl(store.me()?.saldoCaixinhaCentavos ?? 0) }}</p>
        <label>O que vai comprar <input name="desc" [(ngModel)]="compraDescricao" required maxlength="200" placeholder="Ex.: Tênis de corrida" /></label>
        <label>Valor (R$) <input name="valor" type="number" min="0.01" step="0.01" [(ngModel)]="compraValor" required /></label>
        <div class="form-acoes">
          <span></span>
          <div>
            <button type="button" class="btn" (click)="dlg.close()">Cancelar</button>
            <button type="submit" class="btn solid">Registrar compra</button>
          </div>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
    .resumo div { border: 1px solid var(--line); padding: 10px; background: rgba(5,8,15,.4); }
    .resumo small { display: block; font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--mute); }
    .resumo b { font-family: var(--f-display); font-size: 18px; font-variant-numeric: tabular-nums; }
    .ouro { color: var(--gold); }
    .txt { font-size: 12.5px; }
    .botoes { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .valor { width: 90px; }
    @media (max-width: 480px) { .resumo { grid-template-columns: 1fr; } }
  `,
})
export class AbaTesouro implements OnInit {
  store = inject(JogoStore);
  private api = inject(ApiService);
  dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  brl = brl;
  valorXp = (this.store.me()?.centavosPorXp ?? 50) / 100;
  compraDescricao = '';
  compraValor: number | null = null;

  async ngOnInit() {
    try {
      this.store.tesouro.set(await this.api.tesouro());
    } catch {
      /* a lista só fica desatualizada */
    }
  }

  quando(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  abrirCompra() {
    this.compraDescricao = '';
    this.compraValor = null;
    this.dlg().nativeElement.showModal();
  }

  async comprar() {
    const centavos = Math.round(Number(this.compraValor) * 100);
    if (!this.compraDescricao.trim() || !(centavos > 0)) {
      this.store.avisar('Preencha o que vai comprar e o valor');
      return;
    }
    const ok = await this.store.comprar(this.compraDescricao.trim(), centavos);
    if (ok) this.dlg().nativeElement.close();
  }

  salvarValor() {
    const centavos = Math.round(Number(this.valorXp) * 100);
    if (centavos >= 0) this.store.configurarTesouro(centavos);
  }
}