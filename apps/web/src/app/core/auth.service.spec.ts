import { TestBed } from '@angular/core/testing'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideRouter } from '@angular/router'
import { Router } from '@angular/router'
import { AuthService, User } from './auth.service'

const mockUser: User = { id: 'u1', name: 'Иван', email: 'ivan@test.com', role: 'EMPLOYEE' }
const mockAdmin: User = { id: 'u2', name: 'Админ', email: 'admin@test.com', role: 'ADMIN' }
const mockTokens = { access_token: 'access-jwt', refresh_token: 'refresh-jwt' }

describe('AuthService', () => {
  let service: AuthService
  let http: HttpTestingController
  let router: Router

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    })
    service = TestBed.inject(AuthService)
    http = TestBed.inject(HttpTestingController)
    router = TestBed.inject(Router)
    localStorage.clear()
  })

  afterEach(() => {
    http.verify()
    localStorage.clear()
  })

  describe('login', () => {
    it('сохраняет токены и загружает пользователя', () => {
      service.login('ivan@test.com', 'pass').subscribe()

      http.expectOne('/api/auth/signin').flush(mockTokens)
      http.expectOne('/api/auth/me').flush(mockUser)

      expect(localStorage.getItem('access_token')).toBe('access-jwt')
      expect(localStorage.getItem('refresh_token')).toBe('refresh-jwt')
      expect(service.user()).toEqual(mockUser)
      expect(service.isLoggedIn()).toBe(true)
    })

    it('устанавливает isAdmin=true для роли ADMIN', () => {
      service.login('admin@test.com', 'pass').subscribe()

      http.expectOne('/api/auth/signin').flush(mockTokens)
      http.expectOne('/api/auth/me').flush(mockAdmin)

      expect(service.isAdmin()).toBe(true)
    })

    it('isAdmin=false для роли EMPLOYEE', () => {
      service.login('ivan@test.com', 'pass').subscribe()

      http.expectOne('/api/auth/signin').flush(mockTokens)
      http.expectOne('/api/auth/me').flush(mockUser)

      expect(service.isAdmin()).toBe(false)
    })
  })

  describe('logout', () => {
    it('очищает токены, сбрасывает пользователя и редиректит на /login', () => {
      localStorage.setItem('access_token', 'access-jwt')
      localStorage.setItem('refresh_token', 'refresh-jwt')
      service['_user'].set(mockUser)

      const spy = vi.spyOn(router, 'navigate')
      service.logout()

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
      expect(service.user()).toBeNull()
      expect(service.isLoggedIn()).toBe(false)
      expect(spy).toHaveBeenCalledWith(['/login'])
    })
  })

  describe('refresh', () => {
    it('обновляет токены из refresh_token в localStorage', () => {
      localStorage.setItem('refresh_token', 'old-refresh')
      const newTokens = { access_token: 'new-access', refresh_token: 'new-refresh' }

      service.refresh().subscribe()

      const req = http.expectOne('/api/auth/refresh')
      expect(req.request.body).toEqual({ refresh_token: 'old-refresh' })
      req.flush(newTokens)

      expect(localStorage.getItem('access_token')).toBe('new-access')
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh')
    })
  })

  describe('loadMe', () => {
    it('устанавливает пользователя в сигнал', () => {
      service.loadMe().subscribe()
      http.expectOne('/api/auth/me').flush(mockUser)
      expect(service.user()).toEqual(mockUser)
    })
  })

  describe('getAccessToken', () => {
    it('возвращает null если токена нет', () => {
      expect(service.getAccessToken()).toBeNull()
    })

    it('возвращает токен из localStorage', () => {
      localStorage.setItem('access_token', 'my-token')
      expect(service.getAccessToken()).toBe('my-token')
    })
  })

  describe('computed signals', () => {
    it('isLoggedIn=false по умолчанию', () => {
      expect(service.isLoggedIn()).toBe(false)
    })

    it('isAdmin=false по умолчанию', () => {
      expect(service.isAdmin()).toBe(false)
    })
  })
})
