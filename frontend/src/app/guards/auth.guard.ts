import { Injectable } from '@angular/core';
import { Router, CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.evaluate(route, state);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.evaluate(route, state);
  }

  private evaluate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Role-based gate: if route declares required roles, verify the user has one
    const requiredRoles = route.data?.['roles'] as string[] | undefined;
    if (requiredRoles && !requiredRoles.some(role => this.authService.hasRole(role))) {
      this.router.navigate([this.authService.getRoleHome()]);
      return false;
    }

    // Root redirect — send user to their role dashboard
    if (state.url === '/' || state.url === '/home') {
      this.router.navigate([this.authService.getRoleHome()]);
      return false;
    }

    return true;
  }
}
