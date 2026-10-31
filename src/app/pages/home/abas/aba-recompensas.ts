import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JogoStore } from '../../../../core/jogo.store';
import { Recompensa, RecompensaRequest } from '../../../../core/models';


@Component({
  selector: 'app-aba-recompensas',
  imports: [FormsModule],
  template: `
    <div class="sec-head">
      <div class="tag gold">Recompensas por nível</div>
      <button class="btn" (click)="abrir()">+ Nova recompensa</button>
    </div>
    <div class="list">
      @for (r of store.recompensas(); track r.id) {
        <div class="item" [class.locked]="!r.liberada">
          <span class="num icone" [class.ouro]="r.liberada">{{ r.liberada ? '★' : '🔒' }}</span>
          <div>
            <div class="t" [class.ouro]="r.liberada && !r.resgatadaEm">{{ r.nome }}</div>
            <div class="s">
              Nível {{ r.nivelRequerido }} ·
              @if (r.resgatadaEm) { resgatada }
              @else if (r.liberada) { liberada }
              @else { faltam {{ r.nivelRequerido - nivel() }} níveis }
            </div>
          </div>
          <div class="acoes linha">
            @if (r.liberada && !r.resgatadaEm) {
              <button class="btn small gold solid" (click)="store.resgatar(r.id)">Resgatar</button>
            }
            <button class="btn small" (click)="abrir(r)">Editar</button>
          </div>
        </div>
      } @empty {
        <div class="empty">Adicione recompensas para cada nível que quer alcançar.</div>
      }
    </div>

    <dialog #dlg>
      <form (ngSubmit)="salvar()">
        <h2>{{ editandoId() ? 'Editar recompensa' : 'Nova recompensa' }}</h2>
        <label>Recompensa
          <input name="nome" [(ngModel)]="form.nome" required maxlength="120" placeholder="Ex.: Jantar fora" />
        </label>
        <label>Liberada no nível
          <input name="nivel" type="number" min="1" [(ngModel)]="form.nivelRequerido" />
        </label>
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
  styles: `
    .icone { width: 26px; text-align: center; color: var(--mute); }
    .ouro { color: var(--gold); }
    .linha { flex-direction: row !important; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
  `,
})
export class AbaRecompensas {
  store = inject(JogoStore);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  nivel = computed(() => this.store.me()?.nivel ?? 1);
  editandoId = signal<string | null>(null);
  confirmarExclusao = signal(false);
  form: RecompensaRequest = { nome: '', nivelRequerido: 2 };

  abrir(r?: Recompensa) {
    this.editandoId.set(r?.id ?? null);
    this.confirmarExclusao.set(false);
    this.form = r
      ? { nome: r.nome, nivelRequerido: r.nivelRequerido }
      : { nome: '', nivelRequerido: this.nivel() + 1 };
    this.dlg().nativeElement.showModal();
  }

  fechar() {
    this.dlg().nativeElement.close();
  }

  async salvar() {
    if (!this.form.nome.trim()) {
      this.store.avisar('Dê um nome para a recompensa');
      return;
    }
    const ok = await this.store.salvarRecompensa(this.editandoId(), {
      nome: this.form.nome,
      nivelRequerido: Math.max(1, Number(this.form.nivelRequerido) || 1),
    });
    if (ok) this.fechar();
  }

  async excluir() {
    if (!this.confirmarExclusao()) {
      this.confirmarExclusao.set(true);
      return;
    }
    const ok = await this.store.excluirRecompensa(this.editandoId()!);
    if (ok) this.fechar();
  }
}