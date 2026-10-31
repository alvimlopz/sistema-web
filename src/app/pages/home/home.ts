import { Component, OnInit, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import { JogoStore } from '../../../core/jogo.store';
import { ATRIBUTOS, brl, rank } from '../../../core/models';
import { AbaRecompensas } from './abas/aba-recompensas';
import { AbaHoje } from './abas/aba-hoje';
import { AbaPenalidades } from './abas/aba-penalidades';
import { AbaTesouro } from './abas/aba-tesouro';
import { AbaRegistro } from './abas/aba-registro';
import { Calendario } from './calendario';
import { Ranking } from './ranking';


type Aba = 'hoje' | 'pen' | 'rec' | 'tes' | 'reg';

@Component({
  selector: 'app-home',
  imports: [AbaHoje, AbaPenalidades, AbaRecompensas, AbaTesouro, AbaRegistro, Calendario, Ranking],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  auth = inject(AuthService);
  store = inject(JogoStore);

  aba = signal<Aba>('hoje');
  erro = signal<string | null>(null);

  atributos = ATRIBUTOS;
  brl = brl;
  rank = rank;
  abas: { id: Aba; nome: string }[] = [
    { id: 'hoje', nome: 'Missões do dia' },
    { id: 'pen', nome: 'Penalidades' },
    { id: 'rec', nome: 'Recompensas' },
    { id: 'tes', nome: 'Tesouro' },
    { id: 'reg', nome: 'Registro' },
  ];

  constructor() {
    // ao clicar num dia do calendário, volta para a aba de missões
    effect(() => {
      this.store.diaSelecionado();
      untracked(() => this.aba.set('hoje'));
    });
  }

  async ngOnInit() {
    try {
      await this.store.carregarTudo();
    } catch {
      this.erro.set('Não foi possível falar com a API. O Spring está rodando?');
    }
  }
}