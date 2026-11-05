export type Atributo = 'FOR' | 'AGI' | 'VIT' | 'INT' | 'PER';
export type Unidade = 'MINUTOS' | 'HORAS' | 'DIAS' | 'SEMANAS';
export type TipoMeta = 'CHECK' | 'TEMPO' | 'DISTANCIA' | 'VOLUME' | 'QUANTIDADE';
export type Periodicidade = 'DIARIA' | 'SEMANAL';
export type OrigemProgresso = 'MANUAL' | 'POMODORO';

export const ATRIBUTOS: { sigla: Atributo; nome: string }[] = [
  { sigla: 'FOR', nome: 'Força' },
  { sigla: 'AGI', nome: 'Agilidade' },
  { sigla: 'VIT', nome: 'Vitalidade' },
  { sigla: 'INT', nome: 'Inteligência' },
  { sigla: 'PER', nome: 'Percepção' },
];
export const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const UNIDADES: { valor: Unidade; nome: string }[] = [
  { valor: 'MINUTOS', nome: 'minutos' },
  { valor: 'HORAS', nome: 'horas' },
  { valor: 'DIAS', nome: 'dias' },
  { valor: 'SEMANAS', nome: 'semanas' },
];

/** Tipos de meta. TEMPO é sempre em minutos. */
export const TIPOS_META: { valor: TipoMeta; nome: string; unidade: string; passo: number; exemplo: string }[] = [
  { valor: 'CHECK', nome: 'Só check (clicou, concluiu)', unidade: '', passo: 1, exemplo: '' },
  { valor: 'TEMPO', nome: 'Tempo', unidade: 'min', passo: 5, exemplo: 'Ex.: 60' },
  { valor: 'DISTANCIA', nome: 'Distância', unidade: 'km', passo: 0.5, exemplo: 'Ex.: 5' },
  { valor: 'VOLUME', nome: 'Volume', unidade: 'L', passo: 0.25, exemplo: 'Ex.: 2' },
  { valor: 'QUANTIDADE', nome: 'Quantidade', unidade: 'x', passo: 1, exemplo: 'Ex.: 100' },
];

export const XP_MAXIMO_DIA = 300;
export const XP_MAXIMO_MISSAO = 50;

export interface Me {
  id: string; nome: string; email: string; fotoUrl: string | null;
  nivel: number; xpNoNivel: number; xpPorNivel: number; xpTotal: number;
  tesouroGanhoCentavos: number; pendenteDepositoCentavos: number; saldoCaixinhaCentavos: number;
  tesouroLiberado: boolean; nivelLiberaTesouro: number; centavosPorXp: number;
  atributos: Record<Atributo, number>; sequencia: number; penalidadesAtivas: number;
}

export interface Categoria { id: string; nome: string; ordem: number; }

export interface Missao {
  id: string; nome: string; meta: string | null; atributo: Atributo; xp: number;
  dias: number[]; punicaoId: string | null; punicaoNome: string | null; dataUnica: string | null;
  categoriaId: string; categoriaNome: string;
  tipoMeta: TipoMeta; alvo: number | null; periodicidade: Periodicidade; alvoSemanal: number | null;
}
export interface MissaoRequest {
  nome: string; meta: string | null; atributo: Atributo; xp: number; dias: number[];
  punicaoId: string | null; dataUnica: string | null;
  categoriaId: string | null; tipoMeta: TipoMeta; alvo: number | null;
  periodicidade: Periodicidade; alvoSemanal: number | null;
}
export interface MissaoDoDia { missao: Missao; feita: boolean; progressoHoje: number; progressoSemana: number; }
export interface Hoje { data: string; missoes: MissaoDoDia[]; diaPerfeito: boolean; semanais: MissaoDoDia[]; }

export interface Punicao { id: string; nome: string; duracaoValor: number; duracaoUnidade: Unidade; }
export interface PunicaoRequest { nome: string; duracaoValor: number; duracaoUnidade: Unidade; }
export interface Penalidade {
  id: string; nome: string; missaoNome: string; dataFalha: string; inicio: string; fim: string; status: 'ATIVA' | 'CUMPRIDA';
}

export interface Recompensa { id: string; nome: string; nivelRequerido: number; liberada: boolean; resgatadaEm: string | null; }
export interface RecompensaRequest { nome: string; nivelRequerido: number; }

export interface Movimento { id: number; tipo: 'DEPOSITO' | 'COMPRA'; valorCentavos: number; descricao: string; criadoEm: string; }
export interface Tesouro {
  ganhoCentavos: number; pendenteCentavos: number; saldoCaixinhaCentavos: number; gastoCentavos: number;
  centavosPorXp: number; liberado: boolean; nivelLibera: number; movimentos: Movimento[];
}

export interface HistoricoItem { quando: string; tipo: string; xp: number; valorCentavos: number; descricao: string | null; }

export type StatusDia = 'PERFEITO' | 'PARCIAL' | 'FALHOU' | 'SEM_MISSAO' | 'SEM_REGISTRO' | 'HOJE' | 'FUTURO';
export interface DiaResumo { data: string; previstas: number; cumpridas: number; status: StatusDia; penalidade: boolean; }
export interface EventoDoDia { quando: string; tipo: string; xp: number; valorCentavos: number; descricao: string | null; }
export interface DiaDetalhe {
  data: string; tipo: 'PASSADO' | 'HOJE' | 'FUTURO'; missoes: MissaoDoDia[];
  cumpridas: number; previstas: number; penalidades: Penalidade[]; eventos: EventoDoDia[];
}

export interface RankingItem {
  posicao: number; nome: string; fotoUrl: string | null;
  nivel: number; xpTotal: number; voce: boolean;
}

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function rank(nivel: number): string {
  if (nivel >= 75) return 'S';
  if (nivel >= 50) return 'A';
  if (nivel >= 35) return 'B';
  if (nivel >= 20) return 'C';
  if (nivel >= 10) return 'D';
  return 'E';
}

export const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const diasTexto = (dias: number[]) =>
  dias.length === 7 ? 'Todo dia' : dias.map(d => DIAS[d]).join(' · ');

/** Date -> 'YYYY-MM-DD' no horário local */
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' -> Date ao meio-dia (evita erro de fuso) */
export const dataDe = (iso: string) => new Date(iso + 'T12:00:00');

/** "Todo dia", "Seg · Qua", "Só em 05/11" ou "Meta da semana" */
export function quandoTexto(m: Missao): string {
  if (m.periodicidade === 'SEMANAL') return 'Meta da semana';
  if (m.dataUnica) {
    return 'Só em ' + dataDe(m.dataUnica).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  return diasTexto(m.dias);
}

export const unidadeDe = (t: TipoMeta) => TIPOS_META.find(x => x.valor === t)?.unidade ?? '';
export const passoDe = (t: TipoMeta) => TIPOS_META.find(x => x.valor === t)?.passo ?? 1;

/** Formata uma quantidade conforme o tipo: 80 (TEMPO) -> "1h20"; 1.5 (VOLUME) -> "1,5 L". */
export function formatarQtd(tipo: TipoMeta, valor: number | null | undefined): string {
  const v = Number(valor ?? 0);
  if (tipo === 'TEMPO') {
    const h = Math.floor(v / 60);
    const m = Math.round(v % 60);
    if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
    if (h) return `${h}h`;
    return `${m} min`;
  }
  const n = v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (tipo === 'DISTANCIA') return `${n} km`;
  if (tipo === 'VOLUME') return `${n} L`;
  return n;
}