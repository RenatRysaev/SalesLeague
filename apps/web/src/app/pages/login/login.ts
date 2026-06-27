import { Component, signal, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AuthService } from '../../core/auth.service'

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="login-wrap">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>🚢 Морской бой</mat-card-title>
          <mat-card-subtitle>Мотивация через игру</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email" required />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Пароль</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required />
            </mat-form-field>

            @if (error()) {
              <p class="error-msg">{{ error() }}</p>
            }

            <button mat-flat-button type="submit" class="full-width" [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                Войти
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
    }
    .login-card { width: 380px; padding: 16px; }
    mat-card-title { font-size: 22px; }
    form { display: flex; flex-direction: column; gap: 4px; margin-top: 20px; }
    .full-width { width: 100%; }
    .error-msg { color: var(--mat-sys-error); font-size: 13px; margin-bottom: 8px; }
  `],
})
export class LoginPage {
  private auth = inject(AuthService)
  private router = inject(Router)

  email = ''
  password = ''
  loading = signal(false)
  error = signal('')

  submit() {
    this.loading.set(true)
    this.error.set('')

    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/board']),
      error: (err) => {
        this.error.set(err.error?.message ?? 'Неверный email или пароль')
        this.loading.set(false)
      },
    })
  }
}
