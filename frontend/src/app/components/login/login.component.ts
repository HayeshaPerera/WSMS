import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>⚡ WSMS</h1>
          <p>Warehouse & Supermarket Management System</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              type="text" 
              id="username" 
              formControlName="username"
              placeholder="Enter username"
              [class.error]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              formControlName="password"
              placeholder="Enter password"
              [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
            />
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary btn-full" [disabled]="loginForm.invalid || loading">
            <span *ngIf="!loading">Login</span>
            <span *ngIf="loading">Logging in...</span>
          </button>
        </form>

        <div class="demo-credentials">
          <h4>Demo Credentials:</h4>
          <p><strong>Admin:</strong> admin / Admin&#64;123</p>
          <p><strong>Warehouse:</strong> warehouse1 / Password&#64;123</p>
          <p><strong>Supermarket:</strong> supermarket1 / Password&#64;123</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0F0F0F 0%, #1a1a1a 100%);
      padding: 20px;
    }

    .login-card {
      background-color: var(--medium-gray);
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 450px;
      border: 2px solid var(--secondary-yellow);
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .login-header h1 {
      color: var(--secondary-yellow);
      font-size: 48px;
      margin-bottom: 10px;
    }

    .login-header p {
      color: var(--accent-white);
      font-size: 16px;
    }

    .btn-full {
      width: 100%;
      margin-top: 10px;
    }

    .error-message {
      color: #dc3545;
      background-color: rgba(220, 53, 69, 0.1);
      padding: 10px;
      border-radius: 5px;
      margin: 15px 0;
      text-align: center;
    }

    .demo-credentials {
      margin-top: 30px;
      padding: 20px;
      background-color: var(--dark-gray);
      border-radius: 10px;
      border-left: 4px solid var(--secondary-yellow);
    }

    .demo-credentials h4 {
      color: var(--secondary-yellow);
      margin-bottom: 10px;
    }

    .demo-credentials p {
      color: var(--accent-white);
      margin: 5px 0;
      font-size: 14px;
    }

    input.error {
      border-color: #dc3545;
    }
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
