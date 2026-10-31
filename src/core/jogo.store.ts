import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import {
    DiaDetalhe,
    DiaResumo,
  HistoricoItem, Hoje, Me, Missao, MissaoRequest, Penalidade, Punicao, PunicaoRequest,
  RankingItem,
  Recompensa, RecompensaRequest, Tesouro, brl,
} from './models';

@Injectable({ providedIn: 'root' })
export class JogoStore {
  private api = inject(ApiService);

  me = signal<Me | null>(null);
  hoje = signal<Hoje | null>(null);
  missoes = signal<Missao[]>([]);
  punicoes = signal<Punicao[]>([]);
  penalidades = signal<Penalidade[]>([]);
  recompensas = signal<Recompensa[]>([]);
  tesouro = signal<Tesouro | null>(null);
  historico = signal<HistoricoItem[]>([]);

  ranking = signal<RankingItem[]>([]);

  diaSelecionado = signal<string | null>(null);
  mesVisivel = signal<string>('');
  calendario = signal<DiaResumo[]>([]);
  detalheDia = signal<DiaDetalhe | null>(null);
  dataHoje = computed(() => this.hoje()?.data ?? null);
  diaAtual = computed(() => this.diaSelecionado() ?? this.dataHoje());
  ehHoje = computed(() => this.diaAtual() === this.dataHoje());

  toast = signal<{ texto: string; grande: boolean } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  async carregarTudo(): Promise<void> {
    this.me.set(await this.api.me()); // primeiro: fecha os dias pendentes e aplica penalidades
    const [hoje, missoes, punicoes, penalidades, recompensas, tesouro, historico] = await Promise.all([
      this.api.hoje(), this.api.missoes(), this.api.punicoes(), this.api.penalidades(),
      this.api.recompensas(), this.api.tesouro(), this.api.historico(),
    ]);
    this.hoje.set(hoje);
    this.missoes.set(missoes);
    this.punicoes.set(punicoes);
    this.penalidades.set(penalidades);
    this.recompensas.set(recompensas);
    this.tesouro.set(tesouro);
    this.historico.set(historico);
    this.diaSelecionado.set(hoje.data);
    this.ranking.set(await this.api.ranking());
    await this.irParaMes(hoje.data.slice(0, 7));
  }

  async irParaMes(mes: string) {
  this.mesVisivel.set(mes);
  try {
    this.calendario.set(await this.api.calendario(mes));
  } catch {
    this.avisar('Não foi possível carregar o calendário');
  }
}

async selecionarDia(data: string) {
  this.diaSelecionado.set(data);
  if (data.slice(0, 7) !== this.mesVisivel()) await this.irParaMes(data.slice(0, 7));
  this.detalheDia.set(null);
  if (data === this.dataHoje()) return;
  try {
    this.detalheDia.set(await this.api.dia(data));
  } catch {
    this.avisar('Não foi possível carregar o dia');
  }
}

private async atualizarCalendario() {
  const mes = this.mesVisivel();
  if (mes) this.calendario.set(await this.api.calendario(mes));
  const d = this.diaSelecionado();
  if (d && d !== this.dataHoje()) this.detalheDia.set(await this.api.dia(d));
}

  // ---------- missões ----------
  concluir(id: string) {
    return this.rodar(async () => {
      const antes = this.hoje()?.diaPerfeito ?? false;
      const hoje = await this.api.concluir(id);
      this.hoje.set(hoje);
      await this.depoisDeXp();
      if (hoje.diaPerfeito && !antes) this.avisar('MISSÃO DIÁRIA COMPLETA · bônus de XP');
    });
  }

  desfazer(id: string) {
    return this.rodar(async () => {
      this.hoje.set(await this.api.desfazer(id));
      await this.depoisDeXp();
    });
  }

  salvarMissao(id: string | null, r: MissaoRequest) {
    return this.rodar(async () => {
      id ? await this.api.editarMissao(id, r) : await this.api.criarMissao(r);
      await this.recarregarMissoes();
    }, id ? 'Missão atualizada' : 'Nova missão registrada');
  }

  arquivarMissao(id: string) {
    return this.rodar(async () => {
      await this.api.arquivarMissao(id);
      await this.recarregarMissoes();
    }, 'Missão removida');
  }

  // ---------- punições e penalidades ----------
  salvarPunicao(id: string | null, r: PunicaoRequest) {
    return this.rodar(async () => {
      id ? await this.api.editarPunicao(id, r) : await this.api.criarPunicao(r);
      this.punicoes.set(await this.api.punicoes());
      await this.recarregarMissoes();
    }, 'Punição salva');
  }

  arquivarPunicao(id: string) {
    return this.rodar(async () => {
      await this.api.arquivarPunicao(id);
      this.punicoes.set(await this.api.punicoes());
      await this.recarregarMissoes();
    }, 'Punição removida');
  }

  cumprirPenalidade(id: string) {
    return this.rodar(async () => {
      await this.api.cumprirPenalidade(id);
      this.penalidades.set(await this.api.penalidades());
      this.me.set(await this.api.me());
    }, 'Penalidade cumprida. O Sistema reconhece.');
  }

  // ---------- recompensas ----------
  salvarRecompensa(id: string | null, r: RecompensaRequest) {
    return this.rodar(async () => {
      id ? await this.api.editarRecompensa(id, r) : await this.api.criarRecompensa(r);
      this.recompensas.set(await this.api.recompensas());
    }, 'Recompensa salva');
  }

  excluirRecompensa(id: string) {
    return this.rodar(async () => {
      await this.api.excluirRecompensa(id);
      this.recompensas.set(await this.api.recompensas());
    }, 'Recompensa removida');
  }

  resgatar(id: string) {
    return this.rodar(async () => {
      const r = await this.api.resgatar(id);
      this.recompensas.set(await this.api.recompensas());
      this.avisar(`Recompensa resgatada: ${r.nome}`);
    });
  }

  // ---------- tesouro ----------
  depositar() {
    return this.rodar(async () => {
      const valor = this.me()?.pendenteDepositoCentavos ?? 0;
      this.tesouro.set(await this.api.depositar());
      this.me.set(await this.api.me());
      this.avisar(`Depósito registrado: ${brl(valor)}`);
    });
  }

  comprar(descricao: string, valorCentavos: number) {
    return this.rodar(async () => {
      this.tesouro.set(await this.api.comprar(descricao, valorCentavos));
      this.me.set(await this.api.me());
    }, 'Compra registrada. Você mereceu.');
  }

  configurarTesouro(centavosPorXp: number) {
    return this.rodar(async () => {
      this.tesouro.set(await this.api.configurarTesouro(centavosPorXp));
      this.me.set(await this.api.me());
    }, `Novo valor: 1 XP = ${brl(centavosPorXp)}`);
  }

  // ---------- apoio ----------
  avisar(texto: string, grande = false): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ texto, grande });
    this.toastTimer = setTimeout(() => this.toast.set(null), grande ? 3500 : 2400);
  }

  private async depoisDeXp(): Promise<void> {
    const nivelAntes = this.me()?.nivel ?? 0;
    const [me, recompensas, historico] = await Promise.all([
      this.api.me(), this.api.recompensas(), this.api.historico(),
    ]);
    this.me.set(me);
    this.recompensas.set(recompensas);
    this.historico.set(historico);
    if (nivelAntes && me.nivel > nivelAntes) this.avisar(`LEVEL UP · NÍVEL ${me.nivel}`, true);

    this.ranking.set(await this.api.ranking());
    await this.atualizarCalendario();
  }

  private async recarregarMissoes(): Promise<void> {
    const [missoes, hoje] = await Promise.all([this.api.missoes(), this.api.hoje()]);
    this.missoes.set(missoes);
    this.hoje.set(hoje);

    await this.atualizarCalendario();
  }

  /** Executa a ação; mostra a mensagem de sucesso ou o erro que a API devolveu. */
  private async rodar(acao: () => Promise<unknown>, sucesso?: string): Promise<boolean> {
    try {
      await acao();
      if (sucesso) this.avisar(sucesso);
      return true;
    } catch (e: any) {
      this.avisar(e?.error?.detail ?? 'Algo deu errado. Tente de novo.');
      return false;
    }
  }
}