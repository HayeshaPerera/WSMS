import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * Auth + Auto-Refresh + Error Interceptor:
 * 1. Attaches JWT Bearer token to every outgoing request.
 * 2. On 401: attempts one silent refresh, replays the failed request.
 * 3. On second 401 (refresh also failed): logs out.
 * 4. Maps all HTTP errors to toast notifications.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing  = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip attaching token to auth endpoints
    if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
      return next.handle(req);
    }

    const token = this.authService.getToken();
    const authReq = token ? this.addToken(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this.handle401(authReq, next, error);
        }
        this.handleError(error, req);
        return throwError(() => error);
      })
    );
  }

  // ── Refresh flow ─────────────────────────────────────────
  private handle401(req: HttpRequest<any>, next: HttpHandler, originalError: HttpErrorResponse): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null);

      return this.authService.refreshAccessToken().pipe(
        switchMap(() => {
          this.isRefreshing = false;
          const newToken = this.authService.getToken()!;
          this.refreshSubject.next(newToken);
          return next.handle(this.addToken(req, newToken));
        }),
        catchError(err => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => err);
        })
      );
    }

    // Queue concurrent requests until refresh completes
    return this.refreshSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next.handle(this.addToken(req, token!)))
    );
  }

  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  // ── Centralised error handling ────────────────────────────
  private handleError(error: HttpErrorResponse, req: HttpRequest<any>): void {
    const message = error.error?.message ?? error.message ?? 'An error occurred';

    switch (error.status) {
      case 403:
        this.toast('error', 'Access Denied', 'You do not have permission for this action.');
        break;
      case 404:
        this.toast('warning', 'Not Found', message);
        break;
      case 422:
        this.toast('warning', 'Validation Error', message);
        break;
      case 429:
        this.toast('warning', 'Too Many Requests', 'Please slow down and try again shortly.');
        break;
      case 0:
      case 503:
        this.toast('error', 'Connection Error', 'Cannot reach the server. Check your network.');
        break;
      default:
        if (error.status >= 500) {
          this.toast('error', 'Server Error', 'An unexpected error occurred. Please try again.');
        }
    }
  }

  private toast(type: 'error' | 'warning' | 'info', title: string, message: string): void {
    window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type, title, message } }));
  }
}
