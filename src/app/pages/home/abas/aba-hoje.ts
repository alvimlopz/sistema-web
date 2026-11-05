import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JogoStore } from '../../../../core/jogo.store';
import {
  ATRIBUTOS, Categoria, DIAS, MESES, Missao, MissaoDoDia, MissaoRequest, TIPOS_META, TipoMeta,
  XP_MAXIMO_DIA, brl, dataDe, formatarQtd, isoLocal, passoDe, quandoTexto, unidadeDe,
} from '../../../../core/models';

const CHAVE_CONCLUIDAS = 'sistema.mostrarConcluidas';

interface Grupo { categoria: Categoria; itens: MissaoDoDia[]; feitas: number; total: number; xp: number; }
interface DiaFuturo { iso: string; titulo: string; data: string; missoes: Missao[]; xp: number; }

@Component({
  selector: 'app-aba-hoje',
  imports: [FormsModule, NgTemplateOutlet],
  template: `
    <!-- ===== Cabeçalho do dia ===== -->
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

    <div class="orcamento" [class.cheio]="orcamento().restante === 0">
      <div>
        <div class="tag gold">XP do dia</div>
        <div class="grande">{{ orcamento().restante }} <small>XP livres</small></div>
      </div>
      <div class="direita">
        <span class="num">{{ orcamento().usado }} de {{ orcamento().total }} XP distribuídos</span>
        <div class="barra"><i [style.width.%]="(orcamento().usado / orcamento().total) * 100"></i></div>
        <span class="dica">Você tem 300 XP por dia pra distribuir · máximo de 50 XP por missão</span>
      </div>
    </div>

    <!-- ===== Filtro por categoria ===== -->
    <div class="filtros">
      <button class="chip" [class.on]="filtro() === null" (click)="filtro.set(null)">Todas</button>
      @for (c of store.categorias(); track c.id) {
        <button class="chip" [class.on]="filtro() === c.id" (click)="filtro.set(c.id)">{{ c.nome }}</button>
      }
    </div>

    @if (store.ehHoje()) {
      <div class="sec-head">
        <div class="tag">Missões do dia</div>
        <div class="topo-acoes">
          <label class="switch">
            <input type="checkbox" [checked]="mostrarConcluidas()" (change)="alternarConcluidas()" />
            <span class="trilho"></span>
            Tarefas concluídas
          </label>
          <button class="btn" (click)="abrir()">+ Nova missão</button>
        </div>
      </div>

      <!-- ===== Missões do dia agrupadas por categoria ===== -->
      @for (g of grupos(); track g.categoria.id) {
        <div class="bloco">
          <div class="bloco-cab">
            <button class="bloco-btn" (click)="alternarCategoria(g.categoria.id)" [attr.aria-expanded]="!fechadas().has(g.categoria.id)">
              <span class="seta">{{ fechadas().has(g.categoria.id) ? '▸' : '▾' }}</span>
              <span class="bloco-titulo">{{ g.categoria.nome }}</span>
              <span class="bloco-info num">{{ g.feitas }}/{{ g.total }} · {{ g.xp }} XP</span>
            </button>
            <button class="btn small" (click)="abrirCategoria(g.categoria)" title="Editar categoria">✎</button>
          </div>
          @if (!fechadas().has(g.categoria.id)) {
            <div class="list">
              @for (md of g.itens; track md.missao.id) {
                <ng-container [ngTemplateOutlet]="itemTpl" [ngTemplateOutletContext]="{ $implicit: md, semanal: false }" />
              }
            </div>
          }
        </div>
      } @empty {
        @if (concluidasOcultas() > 0) {
          <div class="empty">Todas as missões de hoje concluídas. ✓</div>
        } @else {
          <div class="empty">Nenhuma missão pra hoje. Crie a primeira em "+ Nova missão".</div>
        }
      }
      @if (concluidasOcultas() > 0) {
        <p class="mute nota">{{ concluidasOcultas() }} {{ concluidasOcultas() === 1 ? 'concluída oculta' : 'concluídas ocultas' }}.</p>
      }

      <!-- ===== Metas da semana ===== -->
      @if (semanais().length) {
        <div class="sec-head"><div class="tag gold">Metas da semana</div><span class="mute nota">segunda a domingo</span></div>
        <div class="list">
          @for (md of semanais(); track md.missao.id) {
            <ng-container [ngTemplateOutlet]="itemTpl" [ngTemplateOutletContext]="{ $implicit: md, semanal: true }" />
          }
        </div>
      }

           <!-- ===== Próximos dias ===== -->
      @if (proximosDias().length) {
        <div class="bloco proximos">
          <div class="bloco-cab">
            <button class="bloco-btn" (click)="proximosAberto.set(!proximosAberto())" [attr.aria-expanded]="proximosAberto()">
              <span class="seta">{{ proximosAberto() ? '▾' : '▸' }}</span>
              <span class="bloco-titulo">Próximos dias</span>
              <span class="bloco-info num">{{ proximosDias().length }} {{ proximosDias().length === 1 ? 'dia' : 'dias' }} com missões</span>
            </button>
          </div>
          @if (proximosAberto()) {
            <div class="interno">
              @for (dia of proximosDias(); track dia.iso; let i = $index) {
                <div class="bloco">
                  <div class="bloco-cab">
                    <button class="bloco-btn" (click)="alternarDia(dia.iso)" [attr.aria-expanded]="diaAberto(dia.iso, i)">
                      <span class="seta">{{ diaAberto(dia.iso, i) ? '▾' : '▸' }}</span>
                      <span class="bloco-titulo">{{ dia.titulo }}</span>
                      <span class="mute">· {{ dia.data }}</span>
                      <span class="bloco-info num">{{ dia.missoes.length }} {{ dia.missoes.length === 1 ? 'missão' : 'missões' }} · {{ dia.xp }} XP</span>
                    </button>
                  </div>
                  @if (diaAberto(dia.iso, i)) {
                    <div class="list">
                      @for (m of dia.missoes; track m.id) {
                        <div class="item">
                          <span class="num mute ico">·</span>
                          <div class="corpo">
                            <div class="t">{{ m.nome }} <span class="mute meta">· {{ m.categoriaNome }}</span></div>
                            <div class="s">{{ quandoTexto(m) }} · {{ textoAlvo(m) }} · {{ m.atributo }}</div>
                          </div>
                          <div class="acoes">
                            <span class="xp">+{{ m.xp }} XP</span>
                            <button class="btn small" (click)="abrir(m)">Editar</button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <p class="mute nota">
        Missão de check não cumprida até a meia-noite ativa a penalidade. Meta medida com algum progresso ganha o XP
        proporcional e não sofre penalidade. Completar todas as missões do dia dá XP bônus.
      </p>
    } @else if (store.detalheDia(); as d) {
      <!-- ===== Outro dia (passado ou futuro) ===== -->
      <div class="sec-head">
        @if (d.tipo === 'FUTURO') {
          <div class="tag">Previsto para este dia</div>
          <button class="btn" (click)="abrirAvulsa(d.data)">+ Missão de um dia</button>
        } @else {
          <div class="tag">Registro do dia</div>
          <span class="mute nota">Dia encerrado · somente leitura</span>
        }
      </div>

      <div class="list">
        @for (md of d.missoes; track md.missao.id) {
          @if (filtro() === null || md.missao.categoriaId === filtro()) {
            <div class="item" [class.done]="md.feita" [class.pen]="d.tipo === 'PASSADO' && !md.feita && !md.progressoHoje">
              <span class="num ico marca">
                @if (md.feita) { ✓ } @else if (d.tipo === 'PASSADO') { {{ md.progressoHoje ? pct(md, false) + '%' : '✗' }} } @else { · }
              </span>
              <div class="corpo">
                <div class="t">{{ md.missao.nome }} <span class="mute meta">· {{ md.missao.categoriaNome }}</span></div>
                <div class="s">
                  {{ quandoTexto(md.missao) }} · {{ md.missao.atributo }}
                  @if (md.missao.tipoMeta !== 'CHECK') { · {{ fmt(md.missao.tipoMeta, md.progressoHoje) }} de {{ fmt(md.missao.tipoMeta, md.missao.alvo) }} }
                  @if (d.tipo === 'PASSADO' && md.missao.tipoMeta === 'CHECK') { · {{ md.feita ? 'cumprida' : 'perdida' }} }
                </div>
              </div>
              <div class="acoes">
                <span class="xp">+{{ md.missao.xp }} XP</span>
                @if (d.tipo === 'FUTURO') { <button class="btn small" (click)="abrir(md.missao)">Editar</button> }
              </div>
            </div>
          }
        } @empty {
          <div class="empty">
            {{ d.tipo === 'FUTURO' ? 'Nada previsto. Adicione uma missão de um dia.' : 'Nenhuma missão neste dia.' }}
          </div>
        }
      </div>

      @if (d.penalidades.length) {
        <div class="sec-head"><div class="tag red">Penalidades aplicadas</div></div>
        <div class="list">
          @for (p of d.penalidades; track p.id) {
            <div class="item pen">
              <span class="num ico marca">!</span>
              <div class="corpo">
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

    <!-- ===== Modelo de item (check ou medida) ===== -->
    <ng-template #itemTpl let-md let-semanal="semanal">
      <div class="item" [class.done]="md.feita">
        @if (md.missao.tipoMeta === 'CHECK') {
          <button class="chk" [disabled]="ocupado()" (click)="alternar(md)"
                  [attr.aria-label]="(md.feita ? 'Desmarcar ' : 'Concluir ') + md.missao.nome">
            {{ md.feita ? '✓' : '' }}
          </button>
        } @else {
          <span class="ico pct" [class.ok]="md.feita">{{ md.feita ? '✓' : pct(md, semanal) + '%' }}</span>
        }
        <div class="corpo">
          <div class="t">{{ md.missao.nome }} @if (md.missao.meta && md.missao.tipoMeta === 'CHECK') { <span class="mute meta">· {{ md.missao.meta }}</span> }</div>
          <div class="s">{{ quandoTexto(md.missao) }} · {{ md.missao.atributo }} · Penalidade: {{ md.missao.punicaoNome ?? 'nenhuma' }}</div>

          @if (md.missao.tipoMeta !== 'CHECK') {
            <div class="prog">
              <div class="pbar" [class.semana]="semanal"><i [style.width.%]="pct(md, semanal)"></i></div>
              <span class="num">{{ fmt(md.missao.tipoMeta, valor(md, semanal)) }} de {{ fmt(md.missao.tipoMeta, md.missao.alvo) }}</span>
            </div>
            @if (excedente(md, semanal) > 0) {
              <div class="extra">+{{ fmt(md.missao.tipoMeta, excedente(md, semanal)) }} acima da meta 🔥</div>
            }
            @if (!semanal && md.missao.alvoSemanal) {
              <div class="prog">
                <div class="pbar semana"><i [style.width.%]="pctSemana(md)"></i></div>
                <span class="num mute">Semana: {{ fmt(md.missao.tipoMeta, md.progressoSemana) }} de {{ fmt(md.missao.tipoMeta, md.missao.alvoSemanal) }}</span>
              </div>
            }
            <div class="lancar">
              <input #q type="number" min="0" [step]="passo(md.missao.tipoMeta)"
                     [placeholder]="'+ ' + unidade(md.missao.tipoMeta)" (keydown.enter)="lancar(md, q)"
                     [attr.aria-label]="'Quanto você fez em ' + md.missao.nome" />
              <button class="btn small" (click)="lancar(md, q)" [disabled]="ocupado()">+ Lançar</button>
              <button class="btn small" (click)="desfazerProgresso(md)" [disabled]="ocupado() || !md.progressoHoje"
                      title="Desfazer o último lançamento de hoje">↶</button>
            </div>
          }
        </div>
        <div class="acoes">
          <span class="xp">+{{ md.missao.xp }} XP</span>
          <button class="btn small" (click)="abrir(md.missao)">Editar</button>
        </div>
      </div>
    </ng-template>

    <!-- ===== Formulário de missão ===== -->
    <dialog #dlg>
      <form (ngSubmit)="salvar()">
        <h2>{{ editandoId() ? 'Editar missão' : 'Nova missão' }}</h2>

        <label>Missão
          <input name="nome" [(ngModel)]="form.nome" required maxlength="120" placeholder="Ex.: Beber água, Ler, Correr" />
        </label>

        <div class="campo">
          <span class="lbl">Categoria</span>
          <div class="linha-cat">
            <select name="categoria" [(ngModel)]="form.categoriaId">
              @for (c of store.categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nome }}</option> }
            </select>
            <button type="button" class="btn small" (click)="criandoCategoria.set(!criandoCategoria())">+ Nova</button>
          </div>
          @if (criandoCategoria()) {
            <div class="linha-cat">
              <input name="novaCategoria" [(ngModel)]="novaCategoria" maxlength="60" placeholder="Ex.: Saúde, Estudos, Treino" />
              <button type="button" class="btn small solid" (click)="criarCategoria()">Criar</button>
            </div>
          }
        </div>

        <div class="two">
          <label>Tipo de meta
            <select name="tipoMeta" [(ngModel)]="form.tipoMeta" (ngModelChange)="aoMudarTipo($event)">
              @for (t of tipos; track t.valor) { <option [ngValue]="t.valor">{{ t.nome }}</option> }
            </select>
          </label>
          @if (form.tipoMeta !== 'CHECK') {
            <label>Meta ({{ unidade(form.tipoMeta) }})
              <input name="alvo" type="number" min="0" [step]="passo(form.tipoMeta)" [(ngModel)]="form.alvo"
                     [placeholder]="exemplo(form.tipoMeta)" />
            </label>
          } @else {
            <label>Descrição <input name="meta" [(ngModel)]="form.meta" maxlength="60" placeholder="opcional" /></label>
          }
        </div>

        @if (form.tipoMeta !== 'CHECK') {
          <div class="campo">
            <span class="lbl">Período da meta</span>
            <div class="dias">
              <button type="button" [class.on]="form.periodicidade === 'DIARIA'" (click)="form.periodicidade = 'DIARIA'">Por dia</button>
              <button type="button" [class.on]="form.periodicidade === 'SEMANAL'" (click)="form.periodicidade = 'SEMANAL'">Por semana</button>
            </div>
            @if (form.periodicidade === 'SEMANAL') {
              <p class="mute dica">Acumula de segunda a domingo (ex.: 30 km na semana). Não entra nos 300 XP do dia.</p>
            }
          </div>
        }

        <div class="two">
          <label>XP (máx. 50) <input name="xp" type="number" min="1" max="50" step="5" [(ngModel)]="form.xp" /></label>
          <label>Atributo
            <select name="atributo" [(ngModel)]="form.atributo">
              @for (a of atributos; track a.sigla) { <option [ngValue]="a.sigla">{{ a.nome }}</option> }
            </select>
          </label>
        </div>

        <label>Penalidade
          <select name="punicao" [(ngModel)]="form.punicaoId">
            <option [ngValue]="null">Nenhuma</option>
            @for (p of store.punicoes(); track p.id) { <option [ngValue]="p.id">{{ p.nome }}</option> }
          </select>
        </label>

        @if (form.periodicidade === 'DIARIA') {
          <div class="campo">
            <span class="lbl">Repetição</span>
            <div class="dias">
              <button type="button" [class.on]="avulsa()" (click)="avulsa.set(true)">Só num dia</button>
              <button type="button" [class.on]="!avulsa()" (click)="avulsa.set(false)">Toda semana</button>
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
                  <button type="button" [class.on]="form.dias.includes($index)" (click)="alternarDiaForm($index)">{{ d }}</button>
                }
              </div>
              @if (form.dias.length === 1) {
                <p class="aviso">
                  ⚠ Isso vai repetir <b>toda {{ dias[form.dias[0]] }}</b>. Era pra ser só uma vez?
                  <button type="button" class="btn small" (click)="soUmaVez()">Mudar pra só num dia</button>
                </p>
              }
            </div>
          }

          @if (form.tipoMeta !== 'CHECK') {
            <label>Alvo da semana ({{ unidade(form.tipoMeta) }}, opcional)
              <input name="alvoSemanal" type="number" min="0" [step]="passo(form.tipoMeta)" [(ngModel)]="form.alvoSemanal"
                     placeholder="Ex.: 420 min = 7h na semana" />
            </label>
          }
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

    <!-- ===== Editar categoria ===== -->
    <dialog #dlgCat>
      <form (ngSubmit)="salvarCategoria()">
        <h2>Editar categoria</h2>
        <label>Nome <input name="catNome" [(ngModel)]="catNome" required maxlength="60" /></label>
        <div class="form-acoes">
          <button type="button" class="btn red" (click)="excluirCategoria()">
            {{ confirmarExclusaoCat() ? 'Confirmar exclusão' : 'Excluir' }}
          </button>
          <div>
            <button type="button" class="btn" (click)="fecharCategoria()">Cancelar</button>
            <button type="submit" class="btn solid">Salvar</button>
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

    .orcamento { margin-top: 16px; display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center;
                 padding: 14px; border: 1px solid rgba(255,198,92,.45); background: rgba(255,198,92,.05); }
    .orcamento .grande { font-family: var(--f-display); font-weight: 800; font-size: 34px; color: var(--gold);
                         line-height: 1.1; font-variant-numeric: tabular-nums; }
    .orcamento .grande small { font-size: 13px; font-weight: 600; color: var(--mute); }
    .orcamento .direita { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .orcamento .barra { height: 6px; background: #2a2210; }
    .orcamento .barra i { display: block; height: 100%; background: var(--gold); transition: width .4s; }
    .orcamento .dica { font-size: 11.5px; color: var(--mute); }
    .orcamento.cheio .grande { color: var(--red); }

    .filtros { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 16px; }
    .chip { font-family: var(--f-body); font-size: 12.5px; padding: 5px 12px; border-radius: 999px; cursor: pointer;
            border: 1px solid var(--line); background: transparent; color: var(--mute); }
    .chip.on { border-color: var(--glow); color: var(--ink); background: var(--glow-soft); }
    .chip:focus-visible { outline: 2px solid var(--glow); outline-offset: 2px; }

    .topo-acoes { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .switch { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; text-transform: none;
              letter-spacing: 0; font-family: var(--f-body); font-size: 13px; color: var(--ink); }
    .switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
    .trilho { position: relative; width: 34px; height: 18px; border-radius: 9px; background: var(--line); transition: background .2s; flex: none; }
    .trilho::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
                     background: var(--ink); transition: transform .2s; }
    .switch input:checked + .trilho { background: var(--glow); }
    .switch input:checked + .trilho::after { transform: translateX(16px); background: var(--void); }
    .switch input:focus-visible + .trilho { outline: 2px solid var(--glow); outline-offset: 2px; }

    .bloco { margin-top: 10px; border: 1px solid var(--line); background: rgba(5,8,15,.25); }
    .bloco-cab { display: flex; align-items: center; gap: 6px; padding-right: 8px; }
    .bloco-btn { all: unset; box-sizing: border-box; cursor: pointer; flex: 1; min-width: 0; display: flex; align-items: baseline;
                 gap: 8px; padding: 12px 14px; flex-wrap: wrap; }
    .bloco-btn:hover { background: var(--glow-soft); }
    .bloco-btn:focus-visible { outline: 2px solid var(--glow); }
    .seta { color: var(--glow); width: 12px; }
    .bloco-titulo { font-family: var(--f-display); font-weight: 600; text-transform: capitalize; }
    .bloco-info { margin-left: auto; color: var(--mute); }
    .bloco .list { margin: 0; padding: 0 10px 10px; }

    .ico { width: 34px; text-align: center; font-family: var(--f-mono); font-size: 12px; }
    .ico.pct { color: var(--glow); }
    .ico.ok { color: var(--ok); font-size: 16px; }
    .corpo { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .meta { font-weight: 400; }
    .prog { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; margin-top: 2px; }
    .pbar { height: 8px; background: #0b2340; overflow: hidden; }
    .pbar i { display: block; height: 100%; background: var(--glow); transition: width .4s; }
    .pbar.semana i { background: var(--gold); }
    .done .pbar i { background: var(--ok); }
    .extra { color: var(--gold); font-size: 12.5px; }
    .lancar { display: flex; gap: 6px; align-items: center; margin-top: 2px; }
    .lancar input { width: 110px; padding: 5px 8px; font-size: 13px; }

    .item.done .marca { color: var(--ok); }
    .item.pen .marca { color: var(--red); }
    .nota { font-size: 12.5px; margin: 14px 0 0; }
    .campo { display: flex; flex-direction: column; gap: 6px; }
    .lbl { font-size: 12px; font-family: var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--mute); }
    .linha-cat { display: flex; gap: 6px; align-items: center; }
    .linha-cat select, .linha-cat input { flex: 1; }
    .dica { font-size: 12px; margin: 0; }
    .aviso { margin: 4px 0 0; font-size: 12.5px; color: var(--gold); display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .log { font-family: var(--f-mono); font-size: 12px; display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
    .linha { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; }
    .pos { color: var(--ok); } .neg { color: var(--red); }

    @media (max-width: 480px) {
      .orcamento { grid-template-columns: 1fr; }
      .lancar input { width: 90px; }
    }
  `,
})
export class AbaHoje {
  store = inject(JogoStore);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private dlgCat = viewChild.required<ElementRef<HTMLDialogElement>>('dlgCat');

  atributos = ATRIBUTOS;
  dias = DIAS;
  tipos = TIPOS_META;
  quandoTexto = quandoTexto;
  brl = brl;

  // formulário de missão
  editandoId = signal<string | null>(null);
  confirmarExclusao = signal(false);
  ocupado = signal(false);
  avulsa = signal(true);
  criandoCategoria = signal(false);
  novaCategoria = '';
  form: MissaoRequest = this.vazio();

  // edição de categoria
  catEditando = signal<Categoria | null>(null);
  confirmarExclusaoCat = signal(false);
  catNome = '';

  // filtros e estado da tela
  filtro = signal<string | null>(null);
  mostrarConcluidas = signal(this.lerPreferencia());

      fechadas = signal<Set<string>>(new Set());
  proximosAberto = signal(false);
  private diasAlternados = signal<Set<string>>(new Set());

  // ---------- cabeçalho ----------
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

  orcamento = computed(() => {
    const lista = this.store.ehHoje()
      ? (this.store.hoje()?.missoes ?? [])
      : (this.store.detalheDia()?.missoes ?? []);
    const usado = lista.reduce((soma, m) => soma + m.missao.xp, 0);
    return { usado, total: XP_MAXIMO_DIA, restante: Math.max(0, XP_MAXIMO_DIA - usado) };
  });

  // ---------- listas ----------
  grupos = computed<Grupo[]>(() => {
    const lista = (this.store.hoje()?.missoes ?? []).filter(md => this.passaFiltro(md.missao));
    const visiveis = this.mostrarConcluidas() ? lista : lista.filter(md => !md.feita);
    return this.store.categorias()
      .map(c => {
        const daCategoria = lista.filter(md => md.missao.categoriaId === c.id);
        return {
          categoria: c,
          itens: visiveis.filter(md => md.missao.categoriaId === c.id),
          feitas: daCategoria.filter(md => md.feita).length,
          total: daCategoria.length,
          xp: daCategoria.reduce((s, md) => s + md.missao.xp, 0),
        };
      })
      .filter(g => g.itens.length > 0);
  });

  concluidasOcultas = computed(() =>
    this.mostrarConcluidas() ? 0
      : (this.store.hoje()?.missoes ?? []).filter(md => md.feita && this.passaFiltro(md.missao)).length
  );

  semanais = computed(() =>
    (this.store.hoje()?.semanais ?? [])
      .filter(md => this.passaFiltro(md.missao))
      .filter(md => this.mostrarConcluidas() || !md.feita)
  );

  proximosDias = computed<DiaFuturo[]>(() => {
    const hoje = this.store.dataHoje();
    if (!hoje) return [];
    const missoes = this.store.missoes().filter(m => m.periodicidade === 'DIARIA' && this.passaFiltro(m));
    const dias: DiaFuturo[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = dataDe(hoje);
      d.setDate(d.getDate() + i);
      const iso = isoLocal(d);
      const dow = d.getDay();
      const lista = missoes.filter(m => (m.dataUnica ? m.dataUnica === iso : m.dias.includes(dow)));
      if (!lista.length) continue;
      dias.push({
        iso,
        titulo: i === 1 ? 'Amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'long' }),
        data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        missoes: lista,
        xp: lista.reduce((s, m) => s + m.xp, 0),
      });
    }
    return dias;
  });

  private passaFiltro(m: Missao) {
    const f = this.filtro();
    return f === null || m.categoriaId === f;
  }

  // ---------- abrir/fechar ----------
  alternarCategoria(id: string) {
    this.fechadas.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  /** Amanhã começa aberto; os outros dias, fechados. */
  diaAberto(iso: string, indice: number) {
    return (indice === 0) !== this.diasAlternados().has(iso);
  }

  alternarDia(iso: string) {
    this.diasAlternados.update(s => { const n = new Set(s); n.has(iso) ? n.delete(iso) : n.add(iso); return n; });
  }

  alternarConcluidas() {
    const valor = !this.mostrarConcluidas();
    this.mostrarConcluidas.set(valor);
    try { localStorage.setItem(CHAVE_CONCLUIDAS, String(valor)); } catch { /* sem storage */ }
  }

  private lerPreferencia(): boolean {
    try { return localStorage.getItem(CHAVE_CONCLUIDAS) === 'true'; } catch { return false; }
  }

  // ---------- progresso ----------
  valor(md: MissaoDoDia, semanal: boolean) {
    return Number(semanal ? md.progressoSemana : md.progressoHoje);
  }

  pct(md: MissaoDoDia, semanal: boolean) {
    const alvo = Number(md.missao.alvo ?? 0);
    return alvo > 0 ? Math.min(100, Math.round((this.valor(md, semanal) / alvo) * 100)) : 0;
  }

  pctSemana(md: MissaoDoDia) {
    const alvo = Number(md.missao.alvoSemanal ?? 0);
    return alvo > 0 ? Math.min(100, (Number(md.progressoSemana) / alvo) * 100) : 0;
  }

  excedente(md: MissaoDoDia, semanal: boolean) {
    return Math.max(0, this.valor(md, semanal) - Number(md.missao.alvo ?? 0));
  }

  fmt(tipo: TipoMeta, v: number | null | undefined) {
    return formatarQtd(tipo, v);
  }

  unidade(t: TipoMeta) { return unidadeDe(t); }
  passo(t: TipoMeta) { return passoDe(t); }
  exemplo(t: TipoMeta) { return TIPOS_META.find(x => x.valor === t)?.exemplo ?? ''; }

  textoAlvo(m: Missao) {
    return m.tipoMeta === 'CHECK' ? 'check' : formatarQtd(m.tipoMeta, m.alvo);
  }

  async lancar(md: MissaoDoDia, campo: HTMLInputElement) {
    const qtd = Number(String(campo.value).replace(',', '.'));
    if (!(qtd > 0)) {
      this.store.avisar('Digite quanto você fez');
      return;
    }
    this.ocupado.set(true);
    const ok = await this.store.lancarProgresso(md.missao.id, qtd);
    this.ocupado.set(false);
    if (ok) campo.value = '';
  }

  async desfazerProgresso(md: MissaoDoDia) {
    this.ocupado.set(true);
    await this.store.desfazerProgresso(md.missao.id);
    this.ocupado.set(false);
  }

  async alternar(md: MissaoDoDia) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    md.feita ? await this.store.desfazer(md.missao.id) : await this.store.concluir(md.missao.id);
    this.ocupado.set(false);
  }

  hora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------- formulário de missão ----------
  abrir(m?: Missao) {
    this.editandoId.set(m?.id ?? null);
    this.confirmarExclusao.set(false);
    this.criandoCategoria.set(false);
    this.avulsa.set(m ? !!m.dataUnica : true);
    this.form = m
      ? {
          nome: m.nome, meta: m.meta ?? '', atributo: m.atributo, xp: m.xp, dias: [...m.dias],
          punicaoId: m.punicaoId, dataUnica: m.dataUnica, categoriaId: m.categoriaId,
          tipoMeta: m.tipoMeta, alvo: m.alvo, periodicidade: m.periodicidade, alvoSemanal: m.alvoSemanal,
        }
      : { ...this.vazio(), dataUnica: this.store.dataHoje() };
    this.dlg().nativeElement.showModal();
  }

  abrirAvulsa(data: string) {
    this.editandoId.set(null);
    this.confirmarExclusao.set(false);
    this.criandoCategoria.set(false);
    this.avulsa.set(true);
    this.form = { ...this.vazio(), dataUnica: data };
    this.dlg().nativeElement.showModal();
  }

  fechar() {
    this.dlg().nativeElement.close();
  }

  aoMudarTipo(tipo: TipoMeta) {
    if (tipo === 'CHECK') {
      this.form.periodicidade = 'DIARIA';
      this.form.alvo = null;
      this.form.alvoSemanal = null;
    }
  }

  alternarDiaForm(d: number) {
    this.form.dias = this.form.dias.includes(d)
      ? this.form.dias.filter(x => x !== d)
      : [...this.form.dias, d].sort();
  }

  /** Converte "toda semana com 1 dia" em "só num dia", na próxima data desse dia da semana. */
  soUmaVez() {
    const hoje = this.store.dataHoje();
    if (!hoje) return;
    const alvo = this.form.dias[0];
    const d = dataDe(hoje);
    d.setDate(d.getDate() + ((alvo - d.getDay() + 7) % 7));
    this.form.dataUnica = isoLocal(d);
    this.avulsa.set(true);
  }

  async criarCategoria() {
    const nome = this.novaCategoria.trim();
    if (!nome) {
      this.store.avisar('Dê um nome para a categoria');
      return;
    }
    const c = await this.store.criarCategoria(nome);
    if (c) {
      this.form.categoriaId = c.id;
      this.novaCategoria = '';
      this.criandoCategoria.set(false);
    }
  }

  async salvar() {
    const f = this.form;
    if (!f.nome.trim()) { this.store.avisar('Dê um nome para a missão'); return; }
    if (!f.categoriaId) { this.store.avisar('Escolha uma categoria'); return; }
    const xp = Number(f.xp);
    if (!(xp >= 1 && xp <= 50)) { this.store.avisar('Cada missão vale de 1 a 50 XP'); return; }

    const medida = f.tipoMeta !== 'CHECK';
    const alvo = medida ? Number(f.alvo) : null;
    if (medida && !(alvo! > 0)) { this.store.avisar('Informe o tamanho da meta'); return; }
    const alvoSemanal = medida && f.alvoSemanal ? Number(f.alvoSemanal) : null;

    let req: MissaoRequest;
    if (medida && f.periodicidade === 'SEMANAL') {
      req = { ...f, xp, alvo, alvoSemanal: null, dataUnica: null, dias: [0, 1, 2, 3, 4, 5, 6] };
    } else if (this.avulsa()) {
      if (!f.dataUnica) { this.store.avisar('Escolha o dia da missão'); return; }
      req = { ...f, xp, alvo, alvoSemanal, periodicidade: 'DIARIA', dias: [dataDe(f.dataUnica).getDay()] };
    } else {
      if (!f.dias.length) { this.store.avisar('Escolha pelo menos um dia da semana'); return; }
      req = { ...f, xp, alvo, alvoSemanal, periodicidade: 'DIARIA', dataUnica: null };
    }
    req.meta = medida ? null : (f.meta?.trim() || null);

    this.ocupado.set(true);
    const ok = await this.store.salvarMissao(this.editandoId(), req);
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

  // ---------- editar categoria ----------
  abrirCategoria(c: Categoria) {
    this.catEditando.set(c);
    this.catNome = c.nome;
    this.confirmarExclusaoCat.set(false);
    this.dlgCat().nativeElement.showModal();
  }

  fecharCategoria() {
    this.dlgCat().nativeElement.close();
  }

  async salvarCategoria() {
    const c = this.catEditando();
    if (!c || !this.catNome.trim()) return;
    const ok = await this.store.renomearCategoria(c.id, this.catNome.trim());
    if (ok) this.fecharCategoria();
  }

  async excluirCategoria() {
    const c = this.catEditando();
    if (!c) return;
    if (!this.confirmarExclusaoCat()) {
      this.confirmarExclusaoCat.set(true);
      return;
    }
    const ok = await this.store.excluirCategoria(c.id);
    if (ok) this.fecharCategoria();
  }

  private vazio(): MissaoRequest {
    return {
      nome: '', meta: '', atributo: 'FOR', xp: 30, dias: [1, 2, 3, 4, 5], punicaoId: null, dataUnica: null,
            categoriaId: this.filtro?.() ?? this.store.categorias()[0]?.id ?? null,
      tipoMeta: 'CHECK', alvo: null, periodicidade: 'DIARIA', alvoSemanal: null,
    };
  }
}