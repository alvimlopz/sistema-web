import { AfterViewInit, Component, ElementRef, NgZone, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../core/auth.service';

declare const google: any;

@Component({
  selector: 'app-login',
  template: `
    <main class="tela">
      <section class="janela">
        <p class="tag">[ Sistema ] Despertar detectado</p>
        <h1>O Sistema</h1>
        <p class="sub">Você foi escolhido como Jogador. Aceita?</p>
        <div #botao class="botao"></div>
        @if (carregando()) { <p class="info">Conectando...</p> }
        @if (erro()) { <p class="erro">{{ erro() }}</p> }
      </section>
    </main>
  `,
  styles: `
    .tela { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    .janela { border: 1px solid #1d3a63; background: linear-gradient(180deg,#0e1b30,#0a1322);
      padding: 40px 32px; max-width: 420px; width: 100%; text-align: center;
      box-shadow: 0 0 40px rgba(76,195,255,.12); }
    .tag { font-family: monospace; font-size: 11px; letter-spacing: .18em; color: #4cc3ff; text-transform: uppercase; }
    h1 { font-size: 34px; letter-spacing: .06em; margin: 8px 0; color: #d9ecff; }
    .sub { color: #7f9bbd; margin-bottom: 28px; }
    .botao { display: flex; justify-content: center; min-height: 44px; }
    .info { color: #7f9bbd; margin-top: 16px; }
    .erro { color: #ff4d5e; margin-top: 16px; }
  `,
})
export class Login implements AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private zone = inject(NgZone);
  private botao = viewChild.required<ElementRef<HTMLDivElement>>('botao');

  carregando = signal(false);
  erro = signal<string | null>(null);

  ngAfterViewInit(): void {
    if (this.auth.logado()) {
      this.router.navigateByUrl('/');
      return;
    }
    this.iniciarGoogle();
  }

  private iniciarGoogle(tentativa = 0): void {
    if (typeof google === 'undefined') {
      if (tentativa < 50) setTimeout(() => this.iniciarGoogle(tentativa + 1), 100);
      else this.erro.set('Não foi possível carregar o login do Google.');
      return;
    }
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (r: { credential: string }) => this.zone.run(() => this.entrar(r.credential)),
    });
    google.accounts.id.renderButton(this.botao().nativeElement, {
      theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: 'pt-BR',
    });
  }

  private async entrar(credential: string): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      await this.auth.entrarComGoogle(credential);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.erro.set(
        e?.status === 403 ? 'Esta conta não tem acesso ao Sistema.'
        : e?.status === 0 ? 'A API não respondeu. O Spring está rodando?'
        : 'Falha no login. Tente de novo.'
      );
    } finally {
      this.carregando.set(false);
    }
  }
}