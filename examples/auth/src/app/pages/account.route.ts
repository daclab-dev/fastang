import { inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RedirectCommand, Router, type ResolveFn } from '@angular/router';
import { catchError, of, throwError } from 'rxjs';

const session: ResolveFn<{ user: { name: string } }> = () => {
  const router = inject(Router);
  return inject(HttpClient).get<{ user: { name: string } }>('/api/auth/session', { transferCache: false }).pipe(
    catchError((error: HttpErrorResponse) => error.status === 401
      ? of(new RedirectCommand(router.parseUrl('/login')))
      : throwError(() => error)),
  );
};
export default { title: 'Account · FastAng', resolve: { session } };
