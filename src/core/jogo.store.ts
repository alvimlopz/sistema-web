import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import {
  Categoria, DiaDetalhe, DiaResumo, HistoricoItem, Hoje, Me, Missao, MissaoRequest, OrigemProgresso,
  Penalidade, Punicao, PunicaoRequest, RankingItem, Recompensa, RecompensaRequest, Tesouro, brl,
} from './models';

@Injectable({ providedIn: 'root' })
export class JogoStore {
  private api = inject(ApiService);

  me = signal<Me | null>(null);
  hoje = signal<Hoje | null>(null);
  missoes = signal<Missao[]>([]);
  categorias = signal<Categoria[]>([]);
  punicoes = signal<Punicao[]>([]);
  penalidades = signal<Penalidade[]>([]);
  recompensas = signal<Recompensa[]>([]);
  tesouro = signal<Tesouro | null>(null);
  historico = signal<HistoricoItem[]>([]);
  ranking = signal<RankingItem[]>([]);
  toast = signal<{ texto: string; grande: boolean } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  diaSelecionado = signal<string | null>(null);
  mesVisivel = signal<string>('');
  calendario = signal<DiaResumo[]>([]);
  detalheDia = signal<DiaDetalhe | null>(null);
  dataHoje = computed(() => this.hoje()?.data ?? null);
  diaAtual = computed(() => this.diaSelecionado() ?? this.dataHoje());
  ehHoje = computed(() => this.diaAtual() === this.dataHoje());

  async carregarTudo(): Promise<void> {
    this.me.set(await this.api.me()); // primeiro: fecha os dias pendentes e aplica penalidades
    const [hoje, missoes, categorias, punicoes, penalidades, recompensas, tesouro, historico] = await Promise.all([
      this.api.hoje(), this.api.missoes(), this.api.categorias(), this.api.punicoes(),
      this.api.penalidades(), this.api.recompensas(), this.api.tesouro(), this.api.historico(),
    ]);
    this.hoje.set(hoje);
    this.missoes.set(missoes);
    this.categorias.set(categorias);
    this.punicoes.set(punicoes);
    this.penalidades.set(penalidades);
    this.recompensas.set(recompensas);
    this.tesouro.set(tesouro);
    this.historico.set(historico);
    this.ranking.set(await this.api.ranking());
    this.diaSelecionado.set(hoje.data);
    await this.irParaMes(hoje.data.slice(0, 7));
  }

  // ---------- calendário ----------
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

  // ---------- missões de check ----------
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

  // ---------- missões medidas (progresso) ----------
  lancarProgresso(id: string, quantidade: number, origem: OrigemProgresso = 'MANUAL') {
    return this.rodar(async () => {
      const diaAntes = this.hoje()?.diaPerfeito ?? false;
      const feitaAntes = this.missaoFeita(id);
      const hoje = await this.api.progresso(id, quantidade, origem);
      this.hoje.set(hoje);
      await this.depoisDeXp();
      if (hoje.diaPerfeito && !diaAntes) this.avisar('MISSÃO DIÁRIA COMPLETA · bônus de XP');
      else if (!feitaAntes && this.missaoFeita(id)) this.avisar('Meta concluída! ✓');
    });
  }

  desfazerProgresso(id: string) {
    return this.rodar(async () => {
      this.hoje.set(await this.api.desfazerProgresso(id));
      await this.depoisDeXp();
    }, 'Último lançamento desfeito');
  }

  // ---------- cadastro de missões ----------
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

  // ---------- categorias ----------
  async criarCategoria(nome: string): Promise<Categoria | null> {
    try {
      const c = await this.api.criarCategoria(nome);
      this.categorias.set(await this.api.categorias());
      this.avisar(`Categoria "${c.nome}" criada`);
      return c;
    } catch (e: any) {
      this.avisar(e?.error?.detail ?? 'Não foi possível criar a categoria');
      return null;
    }
  }

  renomearCategoria(id: string, nome: string) {
    return this.rodar(async () => {
      await this.api.editarCategoria(id, nome);
      this.categorias.set(await this.api.categorias());
      await this.recarregarMissoes();
    }, 'Categoria atualizada');
  }

  excluirCategoria(id: string) {
    return this.rodar(async () => {
      await this.api.excluirCategoria(id);
      this.categorias.set(await this.api.categorias());
    }, 'Categoria removida');
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

  private missaoFeita(id: string): boolean {
    const h = this.hoje();
    return !!h && [...h.missoes, ...h.semanais].some(md => md.missao.id === id && md.feita);
  }

  private async depoisDeXp(): Promise<void> {
    const nivelAntes = this.me()?.nivel ?? 0;
    const [me, recompensas, historico, ranking] = await Promise.all([
      this.api.me(), this.api.recompensas(), this.api.historico(), this.api.ranking(),
    ]);
    this.me.set(me);
    this.recompensas.set(recompensas);
    this.historico.set(historico);
    this.ranking.set(ranking);
    if (nivelAntes && me.nivel > nivelAntes) this.avisar(`LEVEL UP · NÍVEL ${me.nivel}`, true);
    await this.atualizarCalendario();
  }

  private async recarregarMissoes(): Promise<void> {
    const [missoes, hoje] = await Promise.all([this.api.missoes(), this.api.hoje()]);
    this.missoes.set(missoes);
    this.hoje.set(hoje);
    await this.atualizarCalendario();
  }

  private async atualizarCalendario() {
    const mes = this.mesVisivel();
    if (mes) this.calendario.set(await this.api.calendario(mes));
    const d = this.diaSelecionado();
    if (d && d !== this.dataHoje()) this.detalheDia.set(await this.api.dia(d));
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