import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="brand-side">
          <div class="brand-logo">WSSCMS</div>
          <div class="brand-tag">Warehouse & Supermarket<br/>Supply Chain Management</div>
          <div class="brand-illustration" aria-hidden="true">📦🚚🏬</div>
        </div>

        <div class="form-side">
          <div class="login-header">
            <h2>Welcome back</h2>
            <p class="muted">Sign in to continue to your dashboard</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <label for="username">Username</label>
              <div class="input-with-icon">
                <input type="text" id="username" formControlName="username" placeholder="Enter username" [class.error]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched" />
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.9 1.7-9.9 5v1.5h19.8V19.4c0-3.3-6.6-5-9.9-5z"/></svg>
              </div>
            </div>

            <div class="form-row">
              <label for="password">Password</label>
              <div class="input-with-icon">
                <input type="password" id="password" formControlName="password" placeholder="Enter password" [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" />
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-7h-1V7a5 5 0 0 0-10 0v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM9 7a3 3 0 0 1 6 0v3H9V7z"/></svg>
              </div>
            </div>

            <div class="form-actions">
              <label class="remember"><input type="checkbox" /> Remember me</label>
              <a class="forgot" href="#">Forgot?</a>
            </div>

            <div class="error-message" *ngIf="errorMessage">{{ errorMessage }}</div>

            <button type="submit" class="btn-primary btn-full" [disabled]="loginForm.invalid || loading">
              <span *ngIf="!loading">Sign in</span>
              <span *ngIf="loading">Signing in...</span>
            </button>
          </form>

          <div class="demo-credentials">
            <h4>Demo</h4>
            <div class="creds"><strong>Admin:</strong> admin / Admin&#64;123</div>
            <div class="creds"><strong>Warehouse:</strong> warehouse1 / Password&#64;123</div>
            <div class="creds"><strong>Supermarket:</strong> supermarket1 / Password&#64;123</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container{
      --secondary-yellow: #f2c94c;
      --accent-white: #ffffff;
      min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(180deg,#0b0b0d 0%, #141414 100%);
    }
    .login-card{display:flex;flex-direction:row;max-width:920px;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(2,6,23,0.6);border:1px solid rgba(255,214,79,0.08)}
    .brand-side{flex:1.2;padding:40px 30px;background:linear-gradient(135deg,rgba(255,214,79,0.06),transparent);display:flex;flex-direction:column;align-items:flex-start;justify-content:center}
    .brand-logo{font-weight:800;color:var(--secondary-yellow);font-size:28px;letter-spacing:1px}
    .brand-tag{color:var(--accent-white);opacity:0.85;margin-top:8px;font-size:14px}
    .brand-illustration{margin-top:18px;font-size:40px}
    .form-side{flex:1;padding:40px;background:linear-gradient(180deg,#0f0f10,#0b0b0b)}
    .login-header h2{color:var(--accent-white);margin:0;font-size:22px}
    .muted{color:rgba(255,255,255,0.6);font-size:13px;margin-top:6px}
    form{margin-top:18px}
    .form-row{margin-bottom:14px}
    label{display:block;color:rgba(255,255,255,0.75);font-size:13px;margin-bottom:6px}
    .input-with-icon{position:relative}
    input{width:100%;padding:12px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);color:var(--accent-white);outline:none;transition:all .15s}
    input:focus{box-shadow:0 6px 18px rgba(2,6,23,0.5);border-color:rgba(255,214,79,0.25)}
    .input-with-icon .icon{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:18px;height:18px;opacity:0.6;color:rgba(255,255,255,0.6)}
    .form-actions{display:flex;justify-content:space-between;align-items:center;margin:6px 0 14px}
    .remember{color:rgba(255,255,255,0.7);font-size:13px}
    .forgot{color:var(--secondary-yellow);text-decoration:none;font-size:13px}
    .btn-primary{background:linear-gradient(90deg,var(--secondary-yellow),#f2c94c);color:#0b0b0b;border:none;padding:12px 16px;border-radius:10px;font-weight:700;cursor:pointer;transition:transform .08s}
    .btn-primary:disabled{opacity:0.6;cursor:not-allowed}
    .btn-primary:active{transform:translateY(1px)}
    .btn-full{width:100%}
    .error-message{color:#ffb4b4;background:rgba(220,53,69,0.08);padding:10px;border-radius:8px;margin:10px 0}
    .demo-credentials{margin-top:18px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.8);font-size:13px}
    .demo-credentials h4{color:var(--secondary-yellow);margin:0 0 8px 0}
    .creds{margin:4px 0}
    input.error{border-color:#ff6b6b}
    @media(max-width:800px){.login-card{flex-direction:column}.brand-side{display:none}.form-side{padding:28px}}
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: (response: any) => {
          // Unwrap ApiResponse if present
          const apiResponse = response && response.success !== undefined && response.data !== undefined ? response : null;
          const jwt = apiResponse ? apiResponse.data : response;
          if (apiResponse ? apiResponse.success : jwt && jwt.token) {
            // Store token and user manually if needed
            localStorage.setItem('token', jwt.token);
            localStorage.setItem('currentUser', JSON.stringify(jwt));
            this.authService['currentUserSubject'].next(jwt);
            this.authService.redirectToDashboard();
          } else {
            this.errorMessage = 'Invalid username or password. Please try again.';
          }
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = 'Invalid username or password. Please try again.';
        },
        complete: () => {
          this.loading = false;
        }
      });
    }
  }
}
