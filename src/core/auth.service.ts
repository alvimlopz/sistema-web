import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  fotoUrl: string | null;
}

interface LoginResponse {
  token: string;
  expiraEm: string;
  novoJogador: boolean;
  usuario: Usuario;
}

const CHAVE = 'sistema.sessao';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private sessao = signal<LoginResponse | null>(this.carregar());

  usuario = computed(() => this.sessao()?.usuario ?? null);
  logado = computed(() => {
    const s = this.sessao();
    return !!s && new Date(s.expiraEm).getTime() > Date.now();
  });

  token(): string | null {
    return this.logado() ? this.sessao()!.token : null;
  }

  async entrarComGoogle(credential: string): Promise<LoginResponse> {
    const resp = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/google`, { credential })
    );
    localStorage.setItem(CHAVE, JSON.stringify(resp));
    this.sessao.set(resp);
    return resp;
  }

  sair(): void {
    localStorage.removeItem(CHAVE);
    this.sessao.set(null);
    this.router.navigateByUrl('/login');
  }

  private carregar(): LoginResponse | null {
    try {
      const raw = localStorage.getItem(CHAVE);
      return raw ? (JSON.parse(raw) as LoginResponse) : null;
    } catch {
      return null;
    }
  }
}