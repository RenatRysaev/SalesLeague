import { Injectable, signal, computed, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { tap } from 'rxjs/operators'

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'EMPLOYEE'
}

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient)
  private router = inject(Router)

  private _user = signal<User | null>(null)
  readonly user = this._user.asReadonly()
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN')
  readonly isLoggedIn = computed(() => !!this._user())

  getAccessToken() {
    return localStorage.getItem(ACCESS_KEY)
  }

  login(email: string, password: string) {
    return this.http.post<{ access_token: string; refresh_token: string }>(
      '/api/auth/signin',
      { email, password },
    ).pipe(
      tap((tokens) => this.saveTokens(tokens)),
      tap(() => this.loadMe()),
    )
  }

  refresh() {
    const refresh_token = localStorage.getItem(REFRESH_KEY)
    return this.http.post<{ access_token: string; refresh_token: string }>(
      '/api/auth/refresh',
      { refresh_token },
    ).pipe(tap((tokens) => this.saveTokens(tokens)))
  }

  loadMe() {
    return this.http.get<User>('/api/auth/me').pipe(
      tap((user) => this._user.set(user)),
    )
  }

  logout() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    this._user.set(null)
    this.router.navigate(['/login'])
  }

  private saveTokens(tokens: { access_token: string; refresh_token: string }) {
    localStorage.setItem(ACCESS_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  }
}
