import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from './auth.service'
import { map, catchError, of } from 'rxjs'

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (auth.isLoggedIn()) return true

  const token = auth.getAccessToken()
  if (!token) {
    router.navigate(['/login'])
    return false
  }

  return auth.loadMe().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login'])
      return of(false)
    }),
  )
}

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (!auth.isAdmin()) {
    router.navigate(['/board'])
    return false
  }
  return true
}
