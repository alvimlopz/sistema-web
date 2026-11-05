import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JogoStore } from '../../../../core/jogo.store';
import { PomodoroService } from '../../../../core/pomodoro.service';
import { MissaoDoDia, formatarQtd } from '../../../../core/models';

const RAIO = 90;
const CIRC = 2 * Math.PI * RAIO;

@Component({
  selector: 'app-aba-foco',
  imports: [FormsModule],
  template: `
    <div class="sec-head">
      <div class="tag">Área de foco</div>
      <span class="num mute">{{ pomo.sessoesHoje() }} {{ pomo.sessoesHoje() === 1 ? 'pomodoro' : 'pomodoros' }} nesta sessão</span>
    </div>

    @if (!opcoes().length) {
      <div class="empty">
        Crie uma missão do tipo <b>Tempo</b> (ex.: Ler · 60 min, categoria Estudos) pra usar o pomodoro.
      </div>
    } @else {
      <div class="escolha">
        <span class="lbl">Missão</span>
        <select [ngModel]="pomo.missaoId()" (ngModelChange)="pomo.missaoId.set($event)"
                [disabled]="pomo.fase() !== 'parado'">
          <option [ngValue]="null" disabled>Escolha uma missão de tempo</option>
          @for (o of opcoes(); track o.md.missao.id) {
            <option [ngValue]="o.md.missao.id">
              {{ o.md.missao.nome }} · {{ o.md.missao.categoriaNome }}{{ o.semanal ? ' · semana' : '' }}
            </option>
          }
        </select>
      </div>

      <div class="relogio" [class.descanso]="pomo.fase() === 'descanso'">
        <svg viewBox="0 0 220 220" role="img" [attr.aria-label]="'Tempo restante ' + tempo()">
          <circle class="fundo" cx="110" cy="110" [attr.r]="raio" />
          <circle class="anel" cx="110" cy="110" [attr.r]="raio"
                  [attr.stroke-dasharray]="circ" [attr.stroke-dashoffset]="offset()" />
        </svg>
        <div class="centro">
          <span class="fase">{{ rotuloFase() }}</span>
          <span class="tempo">{{ tempo() }}</span>
        </div>
      </div>

      <div class="controles">
        @switch (pomo.fase()) {
          @case ('parado') {
            <button class="btn solid grande" (click)="pomo.iniciarFoco()" [disabled]="!pomo.missaoId()">▶ Iniciar foco</button>
          }
          @case ('foco') {
            @if (pomo.pausado()) {
              <button class="btn solid" (click)="pomo.retomar()">▶ Retomar</button>
            } @else {
              <button class="btn" (click)="pomo.pausar()">❚❚ Pausar</button>
            }
            <button class="btn gold" (click)="pomo.encerrarFoco()">Encerrar e lançar</button>
            <button class="btn red" (click)="pomo.cancelar()">Cancelar</button>
          }
          @case ('descanso') {
            @if (pomo.pausado()) {
              <button class="btn solid" (click)="pomo.retomar()">▶ Retomar</button>
            } @else {
              <button class="btn" (click)="pomo.pausar()">❚❚ Pausar</button>
            }
            <button class="btn" (click)="pomo.pularDescanso()">Pular descanso</button>
          }
        }
      </div>

      @if (selecionada(); as s) {
        <div class="painel">
          <div class="linha-prog">
            <span class="lbl">{{ s.semanal ? 'Meta da semana' : 'Meta de hoje' }}</span>
            <span class="num">{{ fmt(feito(s)) }} de {{ fmt(alvo(s)) }}</span>
          </div>
          <div class="pbar"><i [style.width.%]="pct(feito(s), alvo(s))"></i></div>
          @if (feito(s) > alvo(s)) {
            <p class="extra">Você fez {{ fmt(feito(s)) }} · {{ fmt(feito(s) - alvo(s)) }} acima da meta 🔥</p>
          } @else if (feito(s) >= alvo(s) && alvo(s) > 0) {
            <p class="extra">Meta batida ✓</p>
          }

          @if (!s.semanal && s.md.missao.alvoSemanal) {
            <div class="linha-prog">
              <span class="lbl">Meta da semana</span>
              <span class="num">{{ fmt(s.md.progressoSemana) }} de {{ fmt(s.md.missao.alvoSemanal) }}</span>
            </div>
            <div class="pbar semana"><i [style.width.%]="pct(s.md.progressoSemana, s.md.missao.alvoSemanal)"></i></div>
          }
        </div>
      }

      <div class="config">
        <span class="lbl">Configuração</span>
        <div class="two">
          <label>Foco (min)
            <input type="number" min="1" max="180" [ngModel]="pomo.focoMin()" #foco
                   [disabled]="pomo.fase() !== 'parado'" (change)="pomo.salvarConfig(+foco.value, pomo.descansoMin())" />
          </label>
          <label>Descanso (min)
            <input type="number" min="1" max="60" [ngModel]="pomo.descansoMin()" #desc
                   [disabled]="pomo.fase() !== 'parado'" (change)="pomo.salvarConfig(pomo.focoMin(), +desc.value)" />
          </label>
        </div>
        <p class="mute dica">Ao fim de cada foco, os minutos entram sozinhos no progresso da missão. Você pode trocar de aba: o tempo continua contando.</p>
      </div>
    }
  `,
  styles: `
    .escolha, .config { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
    .lbl { font-size: 12px; font-family: var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--mute); }
    .relogio { position: relative; width: min(260px, 80vw); margin: 22px auto 8px; }
    .relogio svg { width: 100%; height: auto; display: block; transform: rotate(-90deg); }
    .fundo { fill: none; stroke: #0b2340; stroke-width: 10; }
    .anel { fill: none; stroke: var(--glow); stroke-width: 10; stroke-linecap: round;
            filter: drop-shadow(0 0 8px rgba(76,195,255,.6)); transition: stroke-dashoffset .25s linear; }
    .descanso .anel { stroke: var(--ok); filter: drop-shadow(0 0 8px rgba(92,240,176,.5)); }
    .centro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .fase { font-family: var(--f-mono); font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: var(--mute); }
    .tempo { font-family: var(--f-display); font-weight: 800; font-size: 48px; font-variant-numeric: tabular-nums; }
    .controles { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .grande { font-size: 14px; padding: 10px 20px; }
    .painel { margin-top: 18px; padding: 14px; border: 1px solid var(--line); background: rgba(5,8,15,.35);
              display: flex; flex-direction: column; gap: 6px; }
    .linha-prog { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
    .pbar { height: 8px; background: #0b2340; overflow: hidden; }
    .pbar i { display: block; height: 100%; background: var(--glow); transition: width .4s; }
    .pbar.semana i { background: var(--gold); }
    .extra { margin: 2px 0 6px; color: var(--gold); font-size: 13px; }
    .dica { font-size: 12px; margin: 4px 0 0; }
  `,
})
export class AbaFoco {
  store = inject(JogoStore);
  pomo = inject(PomodoroService);
  raio = RAIO;
  circ = CIRC;

  /** Missões de TEMPO disponíveis hoje (diárias + semanais). */
  opcoes = computed(() => {
    const h = this.store.hoje();
    const diarias = (h?.missoes ?? []).filter(md => md.missao.tipoMeta === 'TEMPO')
      .map(md => ({ md, semanal: false }));
    const semanais = (h?.semanais ?? []).filter(md => md.missao.tipoMeta === 'TEMPO')
      .map(md => ({ md, semanal: true }));
    return [...diarias, ...semanais];
  });

  selecionada = computed(() => this.opcoes().find(o => o.md.missao.id === this.pomo.missaoId()) ?? null);

  tempo = computed(() => {
    const ms = this.pomo.fase() === 'parado' ? this.pomo.focoMin() * 60_000 : this.pomo.restanteMs();
    const s = Math.ceil(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });

  offset = computed(() => {
    const total = this.pomo.totalMs();
    if (!total) return 0;
    return CIRC * (1 - this.pomo.restanteMs() / total);
  });

  rotuloFase = computed(() => {
    if (this.pomo.pausado()) return 'Pausado';
    return { parado: 'Pronto', foco: 'Foco', descanso: 'Descanso' }[this.pomo.fase()];
  });

  feito(o: { md: MissaoDoDia; semanal: boolean }) {
    return Number(o.semanal ? o.md.progressoSemana : o.md.progressoHoje);
  }

  alvo(o: { md: MissaoDoDia; semanal: boolean }) {
    return Number(o.md.missao.alvo ?? 0);
  }

  pct(feito: number | null | undefined, alvo: number | null | undefined) {
    const a = Number(alvo ?? 0);
    return a > 0 ? Math.min(100, (Number(feito ?? 0) / a) * 100) : 0;
  }

  fmt(v: number | null | undefined) {
    return formatarQtd('TEMPO', v);
  }
}