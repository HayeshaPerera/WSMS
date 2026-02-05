import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoginRequest, JwtResponse } from '../models/models';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBase}/api/auth`;
  private currentUserSubject = new BehaviorSubject<JwtResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  login(credentials: LoginRequest): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response));
          this.currentUserSubject.next(response);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Redirects the user to their dashboard based on their role.
   */
  redirectToDashboard(): void {
    const user = this.currentUserSubject.value;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    if (user.roles.includes('ROLE_ADMIN')) {
      this.router.navigate(['/admin']);
    } else if (user.roles.includes('ROLE_SUPERMARKET_MANAGER')) {
      this.router.navigate(['/supermarket']);
    } else if (user.roles.includes('ROLE_WAREHOUSE_STAFF')) {
      this.router.navigate(['/warehouse']);
    } else {
      this.router.navigate(['/']);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): JwtResponse | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return !!user && Array.isArray(user.roles) && user.roles.includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  isWarehouseStaff(): boolean {
    return this.hasRole('ROLE_WAREHOUSE_STAFF');
  }

  isSupermarketManager(): boolean {
    // Accept multiple possible role name variants returned by backend
    return this.hasRole('ROLE_SUPERMARKET_MANAGER')
      || this.hasRole('SUPERMARKET_MANAGER')
      || this.hasRole('ROLE_SUPERMARKET')
      || this.hasRole('SUPERMARKET');
  }

  getRoleHome(): string {
    if (this.isAdmin()) {
      return '/admin';
    }
    if (this.isWarehouseStaff()) {
      return '/warehouse';
    }
    if (this.isSupermarketManager()) {
      return '/supermarket';
    }
    return '/inventory';
  }

  redirectToRoleHome(): void {
    this.router.navigate([this.getRoleHome()]);
  }
}
