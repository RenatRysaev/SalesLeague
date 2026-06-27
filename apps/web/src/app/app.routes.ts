import { Routes } from '@angular/router'
import { authGuard, adminGuard } from './core/auth.guard'

export const routes: Routes = [
  { path: '', redirectTo: '/board', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'board',
    loadComponent: () => import('./pages/board/board').then((m) => m.BoardPage),
    canActivate: [authGuard],
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard/leaderboard').then((m) => m.LeaderboardPage),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then((m) => m.AdminPage),
    canActivate: [authGuard, adminGuard],
  },
  { path: '**', redirectTo: '/board' },
]
