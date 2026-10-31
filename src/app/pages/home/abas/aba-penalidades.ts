import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JogoStore } from '../../../../core/jogo.store';
import { Punicao, PunicaoRequest, UNIDADES } from '../../../../core/models';


@Component({
  selector: 'app-aba-penalidades',
  imports: [FormsModule],
  template: `
    <div class="sec-head"><div class="tag red">Penalidades ativas</div></div>
    <div class="list">
      @for (p of store.penalidades(); track p.id) {
        <div class="item pen">
          <span class="num exc">!</span>
          <div>
            <div class="t">{{ p.nome }}</div>
            <div class="s">Por não cumprir "{{ p.missaoNome }}" em {{ dataCurta(p.dataFalha) }} · {{ restante(p.fim) }}</div>
          </div>
          <button class="btn small red" (click)="store.cumprirPenalidade(p.id)">Cumprida</button>
        </div>
      } @empty {
        <div class="empty">Nenhuma penalidade ativa. Continue assim.</div>
      }
    </div>

    <div class="sec-head">
      <div class="tag">Lista de punições</div>
      <button class="btn" (click)="abrir()">+ Nova punição</button>
    </div>
    <div class="list">
      @for (p of store.punicoes(); track p.id) {
        <div class="item">
          <span class="num mute">×</span>
          <div>
            <div class="t">{{ p.nome }}</div>
            <div class="s">{{ p.duracaoValor }} {{ unidadeNome(p.duracaoUnidade) }}</div>
          </div>
          <button class="btn small" (click)="abrir(p)">Editar</button>
        </div>
      } @empty {
        <div class="empty">Crie punições e ligue cada uma a uma missão.</div>
      }
    </div>

    <dialog #dlg>
      <form (ngSubmit)="salvar()">
        <h2>{{ editandoId() ? 'Editar punição' : 'Nova punição' }}</h2>
        <label>Punição
          <input name="nome" [(ngModel)]="form.nome" required maxlength="120" placeholder="Ex.: Final de semana sem álcool" />
        </label>
        <div class="two">
          <label>Duração <input name="valor" type="number" min="1" [(ngModel)]="form.duracaoValor" /></label>
          <label>Unidade
            <select name="unidade" [(ngModel)]="form.duracaoUnidade">
              @for (u of unidades; track u.valor) { <option [ngValue]="u.valor">{{ u.nome }}</option> }
            </select>
          </label>
        </div>
        <div class="form-acoes">
          @if (editandoId()) {
            <button type="button" class="btn red" (click)="excluir()">
              {{ confirmarExclusao() ? 'Confirmar exclusão' : 'Excluir' }}
            </button>
          } @else { <span></span> }
          <div>
            <button type="button" class="btn" (click)="fechar()">Cancelar</button>
            <button type="submit" class="btn solid">Salvar</button>
          </div>
        </div>
      </form>
    </dialog>
  `,
  styles: `.exc { color: var(--red); width: 26px; text-align: center; }`,
})
export class AbaPenalidades {
  store = inject(JogoStore);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  unidades = UNIDADES;
  agora = signal(Date.now());
  editandoId = signal<string | null>(null);
  confirmarExclusao = signal(false);
  form: PunicaoRequest = this.vazio();

  constructor() {
    const t = setInterval(() => this.agora.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }

  restante(fim: string): string {
    const ms = new Date(fim).getTime() - this.agora();
    if (ms <= 0) return 'tempo cumprido, marque como cumprida';
    const min = Math.ceil(ms / 60_000);
    if (min < 60) return `${min} min restantes`;
    const h = Math.ceil(min / 60);
    if (h < 48) return `${h} h restantes`;
    return `${Math.ceil(h / 24)} dias restantes`;
  }

  dataCurta(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  unidadeNome(u: string, valor = 2) {
  const nome = UNIDADES.find(x => x.valor === u)?.nome ?? u;
  return valor === 1 ? nome.replace(/s$/, '').replace('mese', 'mês') : nome;
  }

  abrir(p?: Punicao) {
    this.editandoId.set(p?.id ?? null);
    this.confirmarExclusao.set(false);
    this.form = p ? { nome: p.nome, duracaoValor: p.duracaoValor, duracaoUnidade: p.duracaoUnidade } : this.vazio();
    this.dlg().nativeElement.showModal();
  }

  fechar() {
    this.dlg().nativeElement.close();
  }

  async salvar() {
    if (!this.form.nome.trim()) {
      this.store.avisar('Dê um nome para a punição');
      return;
    }
    const ok = await this.store.salvarPunicao(this.editandoId(), {
      ...this.form,
      duracaoValor: Math.max(1, Number(this.form.duracaoValor) || 1),
    });
    if (ok) this.fechar();
  }

  async excluir() {
    if (!this.confirmarExclusao()) {
      this.confirmarExclusao.set(true);
      return;
    }
    const ok = await this.store.arquivarPunicao(this.editandoId()!);
    if (ok) this.fechar();
  }

  private vazio(): PunicaoRequest {
    return { nome: '', duracaoValor: 1, duracaoUnidade: 'DIAS' };
  }
}