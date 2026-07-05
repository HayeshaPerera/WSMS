import { Injectable } from '@angular/core'; // Import the Injectable decorator to allow this class to be injected as a service
import {
  HttpInterceptor, HttpRequest, HttpHandler,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http'; // Import all the necessary interfaces and classes for intercepting HTTP requests
import { Observable, throwError, BehaviorSubject } from 'rxjs'; // Import RxJS primitives for handling asynchronous streams and state
import { catchError, filter, switchMap, take } from 'rxjs/operators'; // Import RxJS operators used for manipulating the request streams
import { AuthService } from '../services/auth.service'; // Import our custom AuthService to get tokens and handle logout
import { Router } from '@angular/router'; // Import Router to navigate pages (though not directly used in this specific file, it is often kept for utility)

/**
 * Auth + Auto-Refresh + Error Interceptor:
 * This class sits between the Angular app and the Backend.
 * 1. It intercepts every outgoing HTTP request and attaches the JWT Bearer token.
 * 2. If a request fails with 401 (Unauthorized), it pauses the request and tries to get a new token silently.
 * 3. If getting a new token also fails (second 401), it logs the user out completely.
 * 4. It catches all other HTTP errors (403, 404, 500) and triggers a toast notification to the user.
 */
@Injectable() // Marks this class as an injectable dependency
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing  = false; // Boolean flag to track if we are currently in the middle of refreshing a token
  
  // BehaviorSubject acts as a "holding pen" for concurrent requests while the token is refreshing
  // It starts with 'null' and will emit the new token string once the refresh succeeds
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService, private router: Router) {} // Inject the AuthService and Router

  // The main intercept method that runs on EVERY HTTP request
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // Skip attaching the token if the request is trying to login or refresh (those endpoints don't need/want the old token)
    if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
      return next.handle(req); // Pass the request along unmodified
    }

    const token = this.authService.getToken(); // Get the current access token from localStorage/signals
    
    // If a token exists, clone the request and add the "Authorization: Bearer <token>" header
    const authReq = token ? this.addToken(req, token) : req;

    // Send the request on its way, but 'pipe' the response to catch any errors that come back
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // If the backend returns a 401 Unauthorized (meaning our token expired)
        if (error.status === 401) {
          return this.handle401(authReq, next, error); // Divert to the special auto-refresh logic
        }
        // For all other errors (404, 500, etc.), pass them to our central error handler
        this.handleError(error, req);
        // Re-throw the error so the component that made the request also knows it failed
        return throwError(() => error);
      })
    );
  }

  // ── Refresh flow ─────────────────────────────────────────
  
  // Handles the logic when a 401 error occurs
  private handle401(req: HttpRequest<any>, next: HttpHandler, originalError: HttpErrorResponse): Observable<HttpEvent<any>> {
    
    // If we are NOT already in the middle of refreshing the token
    if (!this.isRefreshing) {
      this.isRefreshing = true; // Lock the refresh process so other concurrent requests don't also try to refresh
      this.refreshSubject.next(null); // Reset the holding pen

      // Call the auth service to exchange the refresh token for a new access token
      return this.authService.refreshAccessToken().pipe(
        switchMap(() => { // switchMap waits for the refresh to finish, then switches to a new observable
          this.isRefreshing = false; // Unlock the refresh process
          const newToken = this.authService.getToken()!; // Grab the brand new token
          this.refreshSubject.next(newToken); // Put the new token into the holding pen to unblock any waiting requests
          
          // Replay the ORIGINAL request that failed, but this time with the NEW token
          return next.handle(this.addToken(req, newToken));
        }),
        catchError(err => { // If the refresh request ITSELF fails (e.g. refresh token is also expired)
          this.isRefreshing = false; // Unlock
          this.authService.logout(); // Nuke everything and force the user back to the login screen
          return throwError(() => err); // Re-throw the error
        })
      );
    }

    // If we ARE already refreshing (another request triggered it a millisecond ago):
    // Queue this request up. Wait for the refreshSubject to emit a non-null token.
    return this.refreshSubject.pipe(
      filter(token => token !== null), // Wait until the token is not null
      take(1), // Take exactly 1 emission (the new token) and then complete
      switchMap(token => next.handle(this.addToken(req, token!))) // Replay this request with the new token
    );
  }

  // Helper method to clone an HTTP request and inject the Authorization header
  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    // We MUST clone the request because HttpRequest objects in Angular are immutable
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  // ── Centralised error handling ────────────────────────────
  
  // Maps specific HTTP status codes to user-friendly toast notifications
  private handleError(error: HttpErrorResponse, req: HttpRequest<any>): void {
    // Try to get a specific message from the backend JSON, fallback to standard message
    const message = error.error?.message ?? error.message ?? 'An error occurred';

    switch (error.status) {
      case 403: // Forbidden: User is logged in but doesn't have the right role (e.g. Warehouse trying to see Admin page)
        this.toast('error', 'Access Denied', 'You do not have permission for this action.');
        break;
      case 404: // Not Found: The requested resource doesn't exist
        this.toast('warning', 'Not Found', message);
        break;
      case 422: // Unprocessable Entity: Validation failed on the backend
        this.toast('warning', 'Validation Error', message);
        break;
      case 429: // Too Many Requests: Rate limiting caught the user
        this.toast('warning', 'Too Many Requests', 'Please slow down and try again shortly.');
        break;
      case 0: // Status 0 usually means the backend is completely offline or a CORS issue blocked it
      case 503: // Service Unavailable
        this.toast('error', 'Connection Error', 'Cannot reach the server. Check your network.');
        break;
      default:
        // Any other 5xx errors (like 500 Internal Server Error)
        if (error.status >= 500) {
          this.toast('error', 'Server Error', 'An unexpected error occurred. Please try again.');
        }
    }
  }

  // Helper method that dispatches a custom browser event
  // The 'NotificationsComponent' listens for this event globally and draws a popup on the screen
  private toast(type: 'error' | 'warning' | 'info', title: string, message: string): void {
    window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type, title, message } }));
  }
}
