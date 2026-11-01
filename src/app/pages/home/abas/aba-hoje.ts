import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JogoStore } from '../../../../core/jogo.store';
import { ATRIBUTOS, brl, dataDe, DIAS, MESES, Missao, MissaoDoDia, MissaoRequest, quandoTexto } from '../../../../core/models';



@Component({
  selector: 'app-aba-hoje',
  imports: [FormsModule],
  template: `
    <div class="cab-dia">
      <div>
        <div class="tag">{{ semana() }} · {{ rotulo() }}</div>
        <h2 class="data-grande">{{ dataGrande().dia }} <em>{{ dataGrande().ano }}</em></h2>
      </div>
      <div class="placar">
        <b>{{ placar().feitas }}/{{ placar().total }}</b>
        <small>concluídas</small>
      </div>
    </div>
    <div class="progresso">
      <i [style.width.%]="placar().total ? (placar().feitas / placar().total) * 100 : 0"></i>
    </div>

    @if (store.ehHoje()) {
      <div class="sec-head">
        <div class="tag">Missão diária</div>
        <button class="btn" (click)="abrir()">+ Nova missão</button>
      </div>
      <div class="list">
        @for (md of store.hoje()?.missoes ?? []; track md.missao.id) {
          <div class="item" [class.done]="md.feita">
            <button class="chk" [disabled]="ocupado()" (click)="alternar(md)"
                    [attr.aria-label]="(md.feita ? 'Desmarcar ' : 'Concluir ') + md.missao.nome">
              {{ md.feita ? '✓' : '' }}
            </button>
            <div>
              <div class="t">{{ md.missao.nome }} @if (md.missao.meta) { <span class="mute meta">· {{ md.missao.meta }}</span> }</div>
              <div class="s">{{ quandoTexto(md.missao) }} · {{ md.missao.atributo }} · Penalidade: {{ md.missao.punicaoNome ?? 'nenhuma' }}</div>
            </div>
            <div class="acoes">
              <span class="xp">+{{ md.missao.xp }} XP</span>
              <button class="btn small" (click)="abrir(md.missao)">Editar</button>
            </div>
          </div>
        } @empty {
          <div class="empty">Nenhuma missão pra hoje. Crie a primeira em "+ Nova missão".</div>
        }
      </div>

      @if (outras().length) {
        <div class="sec-head"><div class="tag">Outros dias</div></div>
        <div class="list">
          @for (m of outras(); track m.id) {
            <div class="item">
              <span class="num mute traco">—</span>
              <div>
                <div class="t">{{ m.nome }} @if (m.meta) { <span class="mute meta">· {{ m.meta }}</span> }</div>
                <div class="s">{{ quandoTexto(m) }} · {{ m.atributo }} · Penalidade: {{ m.punicaoNome ?? 'nenhuma' }}</div>
              </div>
              <div class="acoes">
                <span class="xp">+{{ m.xp }} XP</span>
                <button class="btn small" (click)="abrir(m)">Editar</button>
              </div>
            </div>
          }
        </div>
      }
      <p class="mute nota">
        Missão do dia não cumprida até a meia-noite ativa a penalidade ligada a ela.
        Completar todas as missões do dia dá XP bônus.
      </p>
    } @else if (store.detalheDia(); as d) {
      <div class="sec-head">
        @if (d.tipo === 'FUTURO') {
          <div class="tag">Previsto para este dia</div>
          <button class="btn" (click)="abrirAvulsa(d.data)">+ Missão avulsa</button>
        } @else {
          <div class="tag">Registro do dia</div>
          <span class="mute nota">Dia encerrado · somente leitura</span>
        }
      </div>

      <div class="list">
        @for (md of d.missoes; track md.missao.id) {
          <div class="item" [class.done]="md.feita" [class.pen]="d.tipo === 'PASSADO' && !md.feita">
            <span class="num marca">
              @if (md.feita) { ✓ } @else if (d.tipo === 'PASSADO') { ✗ } @else { · }
            </span>
            <div>
              <div class="t">{{ md.missao.nome }} @if (md.missao.meta) { <span class="mute meta">· {{ md.missao.meta }}</span> }</div>
              <div class="s">
                {{ quandoTexto(md.missao) }} · {{ md.missao.atributo }}
                @if (d.tipo === 'PASSADO') { · {{ md.feita ? 'cumprida' : 'perdida' }} }
              </div>
            </div>
            <div class="acoes">
              <span class="xp">+{{ md.missao.xp }} XP</span>
              @if (d.tipo === 'FUTURO') { <button class="btn small" (click)="abrir(md.missao)">Editar</button> }
            </div>
          </div>
        } @empty {
          <div class="empty">
            {{ d.tipo === 'FUTURO' ? 'Nada previsto. Adicione uma missão avulsa.' : 'Nenhuma missão neste dia.' }}
          </div>
        }
      </div>

      @if (d.penalidades.length) {
        <div class="sec-head"><div class="tag red">Penalidades aplicadas</div></div>
        <div class="list">
          @for (p of d.penalidades; track p.id) {
            <div class="item pen">
              <span class="num marca">!</span>
              <div>
                <div class="t">{{ p.nome }}</div>
                <div class="s">Por "{{ p.missaoNome }}" · {{ p.status === 'ATIVA' ? 'ativa' : 'cumprida' }}</div>
              </div>
              <span></span>
            </div>
          }
        </div>
      }

      @if (d.eventos.length) {
        <div class="sec-head"><div class="tag">XP do dia</div></div>
        <div class="log">
          @for (e of d.eventos; track $index) {
            <div class="linha">
              <span class="mute">{{ hora(e.quando) }}</span>
              <span>{{ e.descricao ?? e.tipo }}</span>
              <span [class.pos]="e.xp > 0" [class.neg]="e.xp < 0">{{ e.xp > 0 ? '+' : '' }}{{ e.xp }} XP</span>
              <span class="mute">{{ brl(e.valorCentavos) }}</span>
            </div>
          }
        </div>
      }
    } @else {
      <p class="mute">Carregando o dia...</p>
    }

    <dialog #dlg>
      <form (ngSubmit)="salvar()">
        <h2>{{ editandoId() ? 'Editar missão' : avulsa() ? 'Missão avulsa' : 'Nova missão' }}</h2>
        <label>Missão
          <input name="nome" [(ngModel)]="form.nome" required maxlength="120" placeholder="Ex.: Correr 10 km" />
        </label>
        <div class="two">
          <label>Meta <input name="meta" [(ngModel)]="form.meta" maxlength="60" placeholder="10 km" /></label>
          <label>XP (máx. 50) <input name="xp" type="number" min="1" max="50" step="5" [(ngModel)]="form.xp" /></label>
        </div>
        <div class="two">
          <label>Atributo
            <select name="atributo" [(ngModel)]="form.atributo">
              @for (a of atributos; track a.sigla) { <option [ngValue]="a.sigla">{{ a.nome }}</option> }
            </select>
          </label>
          <label>Penalidade
            <select name="punicao" [(ngModel)]="form.punicaoId">
              <option [ngValue]="null">Nenhuma</option>
              @for (p of store.punicoes(); track p.id) { <option [ngValue]="p.id">{{ p.nome }}</option> }
            </select>
          </label>
        </div>

        <div class="campo">
          <span class="lbl">Repetição</span>
          <div class="dias">
            <button type="button" [class.on]="!avulsa()" (click)="avulsa.set(false)">Toda semana</button>
            <button type="button" [class.on]="avulsa()" (click)="avulsa.set(true)">Só num dia</button>
          </div>
        </div>

        @if (avulsa()) {
          <label>Dia
            <input name="dataUnica" type="date" [(ngModel)]="form.dataUnica" [min]="store.dataHoje() ?? ''" />
          </label>
        } @else {
          <div class="campo">
            <span class="lbl">Dias</span>
            <div class="dias">
              @for (d of dias; track $index) {
                <button type="button" [class.on]="form.dias.includes($index)" (click)="alternarDia($index)">{{ d }}</button>
              }
            </div>
          </div>
        }

        <div class="form-acoes">
          @if (editandoId()) {
            <button type="button" class="btn red" (click)="excluir()">
              {{ confirmarExclusao() ? 'Confirmar exclusão' : 'Excluir' }}
            </button>
          } @else { <span></span> }
          <div>
            <button type="button" class="btn" (click)="fechar()">Cancelar</button>
            <button type="submit" class="btn solid" [disabled]="ocupado()">Salvar</button>
          </div>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    .cab-dia { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-top: 16px; }
    .data-grande { font-size: clamp(26px, 5vw, 38px); font-weight: 600; letter-spacing: .01em; text-transform: none; margin-top: 4px; }
    .data-grande em { font-style: normal; color: var(--mute); font-weight: 400; }
    .placar { text-align: right; display: flex; flex-direction: column; }
    .placar b { font-family: var(--f-mono); font-size: 26px; font-variant-numeric: tabular-nums; }
    .placar small { font-size: 11px; color: var(--mute); }
    .progresso { height: 4px; background: #0b2340; margin-top: 12px; }
    .progresso i { display: block; height: 100%; background: var(--glow); box-shadow: 0 0 8px var(--glow); transition: width .4s; }
    .meta { font-weight: 400; }
    .traco, .marca { width: 26px; text-align: center; }
    .item.done .marca { color: var(--ok); }
    .item.pen .marca { color: var(--red); }
    .nota { font-size: 12.5px; margin: 14px 0 0; }
    .campo { display: flex; flex-direction: column; gap: 6px; }
    .lbl { font-size: 12px; font-family: var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--mute); }
    .log { font-family: var(--f-mono); font-size: 12px; display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
    .linha { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; }
    .pos { color: var(--ok); } .neg { color: var(--red); }
  `,
})
export class AbaHoje {
  store = inject(JogoStore);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  atributos = ATRIBUTOS;
  dias = DIAS;
  quandoTexto = quandoTexto;
  brl = brl;

  editandoId = signal<string | null>(null);
  confirmarExclusao = signal(false);
  ocupado = signal(false);
  avulsa = signal(false);
  form: MissaoRequest = this.vazio();

  semana = computed(() => {
    const d = this.store.diaAtual();
    return d ? dataDe(d).toLocaleDateString('pt-BR', { weekday: 'long' }) : '';
  });

  rotulo = computed(() => {
    const d = this.store.diaAtual();
    const h = this.store.dataHoje();
    if (!d || !h) return '';
    return d === h ? 'Hoje' : d < h ? 'Encerrado' : 'Previsto';
  });

  dataGrande = computed(() => {
    const d = this.store.diaAtual();
    if (!d) return { dia: '', ano: '' };
    const dt = dataDe(d);
    return { dia: `${dt.getDate()} de ${MESES[dt.getMonth()]}`, ano: String(dt.getFullYear()) };
  });

  placar = computed(() => {
    if (this.store.ehHoje()) {
      const lista = this.store.hoje()?.missoes ?? [];
      return { feitas: lista.filter(m => m.feita).length, total: lista.length };
    }
    const d = this.store.detalheDia();
    return { feitas: d?.cumpridas ?? 0, total: d?.previstas ?? 0 };
  });

  outras = computed(() => {
    const deHoje = new Set(this.store.hoje()?.missoes.map(m => m.missao.id) ?? []);
    return this.store.missoes().filter(m => !deHoje.has(m.id));
  });

  hora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  async alternar(md: MissaoDoDia) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    md.feita ? await this.store.desfazer(md.missao.id) : await this.store.concluir(md.missao.id);
    this.ocupado.set(false);
  }

  abrir(m?: Missao) {
    this.editandoId.set(m?.id ?? null);
    this.confirmarExclusao.set(false);
    this.avulsa.set(!!m?.dataUnica);
    this.form = m
      ? { nome: m.nome, meta: m.meta ?? '', atributo: m.atributo, xp: m.xp, dias: [...m.dias],
          punicaoId: m.punicaoId, dataUnica: m.dataUnica }
      : this.vazio();
    this.dlg().nativeElement.showModal();
  }

  abrirAvulsa(data: string) {
    this.editandoId.set(null);
    this.confirmarExclusao.set(false);
    this.avulsa.set(true);
    this.form = { ...this.vazio(), dataUnica: data };
    this.dlg().nativeElement.showModal();
  }

  fechar() {
    this.dlg().nativeElement.close();
  }

  alternarDia(d: number) {
    this.form.dias = this.form.dias.includes(d)
      ? this.form.dias.filter(x => x !== d)
      : [...this.form.dias, d].sort();
  }

    async salvar() {
    if (!this.form.nome.trim()) {
      this.store.avisar('Dê um nome para a missão');
      return;
    }
    const xp = Number(this.form.xp);
    if (!(xp >= 1 && xp <= 50)) {
    this.store.avisar('Cada missão vale de 1 a 50 XP');
    return;
    }
    let req: MissaoRequest;
    if (this.avulsa()) {
      if (!this.form.dataUnica) {
        this.store.avisar('Escolha o dia da missão avulsa');
        return;
      }
      req = { ...this.form, dataUnica: this.form.dataUnica, dias: [dataDe(this.form.dataUnica).getDay()] };
    } else {
      if (!this.form.dias.length) {
        this.store.avisar('Escolha pelo menos um dia da semana');
        return;
      }
      req = { ...this.form, dataUnica: null };
    }
    this.ocupado.set(true);
    const ok = await this.store.salvarMissao(this.editandoId(), {
      ...req,
      meta: req.meta?.trim() || null,
      xp: Number(req.xp),
    });
    this.ocupado.set(false);
    if (ok) this.fechar();
  }

  async excluir() {
    if (!this.confirmarExclusao()) {
      this.confirmarExclusao.set(true);
      return;
    }
    const ok = await this.store.arquivarMissao(this.editandoId()!);
    if (ok) this.fechar();
  }

  private vazio(): MissaoRequest {
    return { nome: '', meta: '', atributo: 'FOR', xp: 30, dias: [1, 2, 3, 4, 5], punicaoId: null, dataUnica: null };
  }
}