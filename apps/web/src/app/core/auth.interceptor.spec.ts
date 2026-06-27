import { TestBed } from '@angular/core/testing'
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { authInterceptor } from './auth.interceptor'
import { AuthService } from './auth.service'

const mockTokens = { access_token: 'new-access', refresh_token: 'new-refresh' }

describe('authInterceptor', () => {
  let http: HttpClient
  let httpMock: HttpTestingController
  let authService: any

  beforeEach(() => {
    authService = {
      getAccessToken: vi.fn().mockReturnValue('valid-token'),
      refresh: vi.fn().mockReturnValue(of(mockTokens)),
      logout: vi.fn(),
    }

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    })

    http = TestBed.inject(HttpClient)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('добавляет Authorization header если есть токен', () => {
    http.get('/api/seasons').subscribe()
    const req = httpMock.expectOne('/api/seasons')
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-token')
    req.flush([])
  })

  it('не добавляет header если токена нет', () => {
    authService.getAccessToken.mockReturnValue(null)
    http.get('/api/seasons').subscribe()
    const req = httpMock.expectOne('/api/seasons')
    expect(req.request.headers.has('Authorization')).toBe(false)
    req.flush([])
  })

  it('при 401 вызывает refresh и повторяет запрос', () => {
    authService.getAccessToken
      .mockReturnValueOnce('old-token')
      .mockReturnValueOnce('new-access')

    http.get('/api/seasons').subscribe()

    const req = httpMock.expectOne('/api/seasons')
    req.flush(null, { status: 401, statusText: 'Unauthorized' })

    const retry = httpMock.expectOne('/api/seasons')
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access')
    retry.flush([])

    expect(authService.refresh).toHaveBeenCalled()
  })

  it('при 401 на auth-роутах НЕ делает refresh', () => {
    http.get('/api/auth/me').subscribe({ error: () => {} })
    const req = httpMock.expectOne('/api/auth/me')
    req.flush(null, { status: 401, statusText: 'Unauthorized' })

    expect(authService.refresh).not.toHaveBeenCalled()
  })

  it('вызывает logout если refresh упал', () => {
    authService.refresh.mockReturnValue(throwError(() => new Error('refresh failed')))

    http.get('/api/seasons').subscribe({ error: () => {} })

    const req = httpMock.expectOne('/api/seasons')
    req.flush(null, { status: 401, statusText: 'Unauthorized' })

    expect(authService.logout).toHaveBeenCalled()
  })
})
