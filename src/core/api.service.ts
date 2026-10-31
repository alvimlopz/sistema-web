import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
    DiaDetalhe,
    DiaResumo,
  HistoricoItem, Hoje, Me, Missao, MissaoRequest, Penalidade, Punicao, PunicaoRequest,
  RankingItem,
  Recompensa, RecompensaRequest, Tesouro,
} from './models';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = environment.apiUrl;

  private get<T>(p: string) { return firstValueFrom(this.http.get<T>(this.url + p)); }
  private post<T>(p: string, body: unknown = {}) { return firstValueFrom(this.http.post<T>(this.url + p, body)); }
  private put<T>(p: string, body: unknown) { return firstValueFrom(this.http.put<T>(this.url + p, body)); }
  private del<T = void>(p: string) { return firstValueFrom(this.http.delete<T>(this.url + p)); }

  me() { return this.get<Me>('/me'); }
  historico() { return this.get<HistoricoItem[]>('/me/historico'); }

  missoes() { return this.get<Missao[]>('/missoes'); }
  hoje() { return this.get<Hoje>('/missoes/hoje'); }
  criarMissao(r: MissaoRequest) { return this.post<Missao>('/missoes', r); }
  editarMissao(id: string, r: MissaoRequest) { return this.put<Missao>(`/missoes/${id}`, r); }
  arquivarMissao(id: string) { return this.del(`/missoes/${id}`); }
  concluir(id: string) { return this.post<Hoje>(`/missoes/${id}/concluir`); }
  desfazer(id: string) { return this.del<Hoje>(`/missoes/${id}/concluir`); }

  calendario(mes: string) { return this.get<DiaResumo[]>(`/calendario?mes=${mes}`); }
  dia(data: string) { return this.get<DiaDetalhe>(`/calendario/dia/${data}`); }

  ranking() { return this.get<RankingItem[]>('/ranking'); }

  punicoes() { return this.get<Punicao[]>('/punicoes'); }
  criarPunicao(r: PunicaoRequest) { return this.post<Punicao>('/punicoes', r); }
  editarPunicao(id: string, r: PunicaoRequest) { return this.put<Punicao>(`/punicoes/${id}`, r); }
  arquivarPunicao(id: string) { return this.del(`/punicoes/${id}`); }
  penalidades() { return this.get<Penalidade[]>('/penalidades'); }
  cumprirPenalidade(id: string) { return this.post<void>(`/penalidades/${id}/cumprir`); }

  recompensas() { return this.get<Recompensa[]>('/recompensas'); }
  criarRecompensa(r: RecompensaRequest) { return this.post<Recompensa>('/recompensas', r); }
  editarRecompensa(id: string, r: RecompensaRequest) { return this.put<Recompensa>(`/recompensas/${id}`, r); }
  excluirRecompensa(id: string) { return this.del(`/recompensas/${id}`); }
  resgatar(id: string) { return this.post<Recompensa>(`/recompensas/${id}/resgatar`); }

  tesouro() { return this.get<Tesouro>('/tesouro'); }
  depositar() { return this.post<Tesouro>('/tesouro/depositar'); }
  comprar(descricao: string, valorCentavos: number) { return this.post<Tesouro>('/tesouro/compras', { descricao, valorCentavos }); }
  configurarTesouro(centavosPorXp: number) { return this.put<Tesouro>('/tesouro/config', { centavosPorXp }); }
}