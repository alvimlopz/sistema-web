import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const ehApi = req.url.startsWith(environment.apiUrl);
  const ehLogin = req.url.endsWith('/auth/google');

  const r = ehApi && token && !ehLogin
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(r).pipe(
    catchError(err => {
      if (err.status === 401 && ehApi && !ehLogin) auth.sair();
      return throwError(() => err);
    })
  );
};