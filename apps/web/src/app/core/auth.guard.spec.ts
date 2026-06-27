import { TestBed } from '@angular/core/testing'
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { authGuard, adminGuard } from './auth.guard'
import { AuthService, User } from './auth.service'

const mockUser: User = { id: 'u1', name: 'Иван', email: 'ivan@test.com', role: 'EMPLOYEE' }
const mockAdmin: User = { id: 'u2', name: 'Админ', email: 'admin@test.com', role: 'ADMIN' }

function runGuard(guard: typeof authGuard | typeof adminGuard) {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  )
}

describe('authGuard', () => {
  let authService: any
  let router: Router

  beforeEach(() => {
    authService = {
      isLoggedIn: vi.fn().mockReturnValue(false),
      isAdmin: vi.fn().mockReturnValue(false),
      getAccessToken: vi.fn().mockReturnValue(null),
      loadMe: vi.fn(),
    }

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    })
    router = TestBed.inject(Router)
  })

  it('пропускает если пользователь уже в сигнале', () => {
    authService.isLoggedIn.mockReturnValue(true)
    const result = runGuard(authGuard)
    expect(result).toBe(true)
  })

  it('редиректит на /login если нет токена', () => {
    const spy = vi.spyOn(router, 'navigate')
    authService.getAccessToken.mockReturnValue(null)
    runGuard(authGuard)
    expect(spy).toHaveBeenCalledWith(['/login'])
  })

  it('загружает пользователя по токену и пропускает', async () => {
    authService.getAccessToken.mockReturnValue('some-token')
    authService.loadMe.mockReturnValue(of(mockUser))

    const result = await new Promise((resolve) => {
      const r = runGuard(authGuard) as any
      r.subscribe((v: boolean) => resolve(v))
    })
    expect(result).toBe(true)
  })

  it('редиректит на /login если loadMe упал', async () => {
    const spy = vi.spyOn(router, 'navigate')
    authService.getAccessToken.mockReturnValue('expired-token')
    authService.loadMe.mockReturnValue(throwError(() => new Error('401')))

    await new Promise((resolve) => {
      const r = runGuard(authGuard) as any
      r.subscribe((v: boolean) => resolve(v))
    })
    expect(spy).toHaveBeenCalledWith(['/login'])
  })
})

describe('adminGuard', () => {
  let authService: any
  let router: Router

  beforeEach(() => {
    authService = {
      isLoggedIn: vi.fn().mockReturnValue(true),
      isAdmin: vi.fn().mockReturnValue(false),
    }

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    })
    router = TestBed.inject(Router)
  })

  it('пропускает если пользователь — admin', () => {
    authService.isAdmin.mockReturnValue(true)
    const result = runGuard(adminGuard)
    expect(result).toBe(true)
  })

  it('редиректит на /board если не admin', () => {
    const spy = vi.spyOn(router, 'navigate')
    authService.isAdmin.mockReturnValue(false)
    runGuard(adminGuard)
    expect(spy).toHaveBeenCalledWith(['/board'])
  })
})
