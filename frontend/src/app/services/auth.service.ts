import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoginRequest, JwtResponse } from '../models/models';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiBase}/auth`;

  private currentUserSignal = signal<JwtResponse | null>(null);
  public currentUser   = computed(() => this.currentUserSignal());
  public isLoggedIn$   = computed(() => !!this.currentUserSignal());

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try { this.currentUserSignal.set(JSON.parse(stored)); } catch { this.clearStorage(); }
    }
  }

  // ── Login ────────────────────────────────────────────────
  login(credentials: LoginRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        const jwt: JwtResponse = response?.data ?? response;
        if (jwt?.accessToken || jwt?.token) {
          const normalized: JwtResponse = {
            ...jwt,
            accessToken: jwt.accessToken ?? jwt.token!,
          };
          this.storeUser(normalized);
        }
      })
    );
  }

  // ── Token helpers ─────────────────────────────────────────
  getToken(): string | null {
    const u = this.currentUserSignal();
    return u?.accessToken ?? u?.token ?? null;
  }

  getRefreshToken(): string | null {
    return this.currentUserSignal()?.refreshToken ?? null;
  }

  /** Called by interceptor when access token expires */
  refreshAccessToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.http.post<any>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        const jwt: JwtResponse = response?.data ?? response;
        if (jwt?.accessToken || jwt?.token) {
          const current = this.currentUserSignal()!;
          this.storeUser({ ...current, accessToken: jwt.accessToken ?? jwt.token! });
        }
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  // ── Logout ───────────────────────────────────────────────
  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => {} });
    }
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  // ── Role helpers ─────────────────────────────────────────
  getCurrentUser(): JwtResponse | null { return this.currentUserSignal(); }
  isLoggedIn(): boolean { return !!this.getToken(); }

  hasRole(role: string): boolean {
    const u = this.currentUserSignal();
    return !!u && Array.isArray(u.roles) && u.roles.includes(role);
  }

  isAdmin():              boolean { return this.hasRole('ROLE_ADMIN'); }
  isWarehouseStaff():     boolean { return this.hasRole('ROLE_WAREHOUSE_STAFF'); }
  isSupermarketManager(): boolean {
    return this.hasRole('ROLE_SUPERMARKET_MANAGER')
        || this.hasRole('SUPERMARKET_MANAGER');
  }

  getRoleHome(): string {
    if (this.isAdmin())              return '/admin';
    if (this.isWarehouseStaff())     return '/warehouse';
    if (this.isSupermarketManager()) return '/supermarket';
    return '/';
  }

  redirectToDashboard(): void { this.router.navigate([this.getRoleHome()]); }

  // ── Private ──────────────────────────────────────────────
  private storeUser(jwt: JwtResponse): void {
    localStorage.setItem('token', jwt.accessToken ?? jwt.token ?? '');
    if (jwt.refreshToken) localStorage.setItem('refreshToken', jwt.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(jwt));
    this.currentUserSignal.set(jwt);
  }

  private clearStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.currentUserSignal.set(null);
  }
}
