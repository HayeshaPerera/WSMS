import { Injectable, signal, computed } from '@angular/core'; // Import Angular core decorators and reactivity primitives (signal, computed)
import { HttpClient } from '@angular/common/http'; // Import HttpClient for making HTTP requests to the backend API
import { Observable, throwError } from 'rxjs'; // Import RxJS Observables for handling asynchronous data streams and error throwing
import { tap, catchError } from 'rxjs/operators'; // Import RxJS operators for side-effects (tap) and error handling (catchError)
import { LoginRequest, JwtResponse } from '../models/models'; // Import TypeScript interfaces for type safety
import { Router } from '@angular/router'; // Import Router for programmatically navigating between pages
import { environment } from '../../environments/environment'; // Import environment variables (e.g., API base URL)

@Injectable({ providedIn: 'root' }) // Tells Angular this service should be created once (singleton) and available globally
export class AuthService {
  private apiUrl = `${environment.apiBase}/auth`; // Construct the base URL for authentication endpoints

  // Create a reactive signal to hold the current user's JWT response data (starts as null)
  private currentUserSignal = signal<JwtResponse | null>(null);
  
  // Create a computed signal that exposes the current user data (read-only for components)
  public currentUser = computed(() => this.currentUserSignal());
  
  // Create a computed boolean signal that returns true if a user is currently logged in
  public isLoggedIn$ = computed(() => !!this.currentUserSignal());

  constructor(private http: HttpClient, private router: Router) {
    // When the service is first initialized (e.g., on page reload), check local storage for saved user data
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try { 
        // Try to parse the stored JSON string back into an object and update the signal
        this.currentUserSignal.set(JSON.parse(stored)); 
      } catch { 
        // If the stored data is corrupted or invalid JSON, clear local storage
        this.clearStorage(); 
      }
    }
  }

  // ── Login ────────────────────────────────────────────────
  
  // Sends the user's username and password to the backend to authenticate
  login(credentials: LoginRequest): Observable<any> {
    // Make an HTTP POST request to /api/v1/auth/login
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      // 'tap' lets us do something with the response without changing what the observable returns to the component
      tap(response => {
        // Extract the JWT data from the response wrapper (handles both raw and wrapped 'data' formats)
        const jwt: JwtResponse = response?.data ?? response;
        if (jwt?.accessToken || jwt?.token) { // Ensure we actually got a token back
          // Normalize the token field name (some backends use 'token', others use 'accessToken')
          const normalized: JwtResponse = {
            ...jwt,
            accessToken: jwt.accessToken ?? jwt.token!,
          };
          // Save the normalized token and user data to local storage and update the signal
          this.storeUser(normalized);
        }
      })
    );
  }

  // ── Token helpers ─────────────────────────────────────────
  
  // Returns the current access token string (used by the AuthInterceptor to attach to headers)
  getToken(): string | null {
    const u = this.currentUserSignal();
    return u?.accessToken ?? u?.token ?? null;
  }

  // Returns the current refresh token string (used to get a new access token when it expires)
  getRefreshToken(): string | null {
    return this.currentUserSignal()?.refreshToken ?? null;
  }

  /** Called automatically by the AuthInterceptor when an API request fails with 401 Unauthorized (token expired) */
  refreshAccessToken(): Observable<any> {
    const refreshToken = this.getRefreshToken(); // Get the saved refresh token
    if (!refreshToken) return throwError(() => new Error('No refresh token')); // If we don't have one, throw an error immediately

    // Make an HTTP POST request to exchange the refresh token for a brand new access token
    return this.http.post<any>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        const jwt: JwtResponse = response?.data ?? response;
        if (jwt?.accessToken || jwt?.token) {
          const current = this.currentUserSignal()!;
          // Update the current user data with the NEW access token, keeping everything else the same
          this.storeUser({ ...current, accessToken: jwt.accessToken ?? jwt.token! });
        }
      }),
      catchError(err => {
        // If the refresh request ALSO fails (e.g., refresh token is expired or revoked), force the user to log out
        this.logout();
        return throwError(() => err);
      })
    );
  }

  // ── Logout ───────────────────────────────────────────────
  
  // Logs the user out of the application
  logout(): void {
    const token = this.getToken();
    if (token) {
      // Tell the backend to invalidate the refresh token (fire-and-forget, we don't care if it fails locally)
      this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => {} });
    }
    // Clear all tokens and user data from local storage and signals
    this.clearStorage();
    // Redirect the user back to the login page
    this.router.navigate(['/login']);
  }

  // ── Role helpers ─────────────────────────────────────────
  
  // Returns the raw user data object
  getCurrentUser(): JwtResponse | null { return this.currentUserSignal(); }
  
  // Returns true if the user has an access token
  isLoggedIn(): boolean { return !!this.getToken(); }

  // Checks if the logged-in user has a specific role (e.g., 'ROLE_ADMIN')
  hasRole(role: string): boolean {
    const u = this.currentUserSignal();
    if (!u || !Array.isArray(u.roles)) return false;
    return u.roles.some(r => r === role || `ROLE_${r}` === role || r === `ROLE_${role}`);
  }

  // Convenience methods for checking specific core roles
  isAdmin():              boolean { return this.hasRole('ROLE_ADMIN'); }
  isWarehouseStaff():     boolean { return this.hasRole('ROLE_WAREHOUSE_STAFF'); }
  isSupermarketManager(): boolean {
    return this.hasRole('ROLE_SUPERMARKET_MANAGER')
        || this.hasRole('SUPERMARKET_MANAGER'); // Handle edge case where 'ROLE_' prefix is missing
  }

  // Determines which dashboard URL the user should be sent to based on their highest role
  getRoleHome(): string {
    if (this.isAdmin())              return '/admin';
    if (this.isWarehouseStaff())     return '/warehouse';
    if (this.isSupermarketManager()) return '/supermarket';
    return '/'; // Fallback root route
  }

  // Immediately navigates the user to their role-specific dashboard
  redirectToDashboard(): void { this.router.navigate([this.getRoleHome()]); }

  // ── Private ──────────────────────────────────────────────
  
  // Helper to save user data into local storage and update the reactive signal
  private storeUser(jwt: JwtResponse): void {
    localStorage.setItem('token', jwt.accessToken ?? jwt.token ?? '');
    if (jwt.refreshToken) localStorage.setItem('refreshToken', jwt.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(jwt));
    this.currentUserSignal.set(jwt);
  }

  // Helper to wipe all user data from local storage and clear the reactive signal
  private clearStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.currentUserSignal.set(null);
  }
}
