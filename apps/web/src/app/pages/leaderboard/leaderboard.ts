import { Component, signal, inject, OnInit } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { RouterLink } from '@angular/router'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatCardModule } from '@angular/material/card'
import { MatChipsModule } from '@angular/material/chips'
import { AuthService } from '../../core/auth.service'

interface LeaderboardEntry {
  userId: string
  name: string
  shotsFired: number
  hits: number
  balance: number
}

interface SeasonStats {
  totalShips: number
  sunkShips: number
  remainingShips: number
  totalShots: number
  totalHits: number
}

@Component({
  selector: 'app-leaderboard',
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatTableModule, MatCardModule, MatChipsModule],
  template: `
    <mat-toolbar color="primary">
      <span>🚢 Морской бой</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/board">Поле</a>
      @if (auth.isAdmin()) {
        <a mat-button routerLink="/admin">Админ</a>
      }
      <button mat-icon-button (click)="auth.logout()">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <div class="page">
      @if (noActiveSeason()) {
        <div class="no-season">
          <mat-icon>anchor</mat-icon>
          <p>Нет активного сезона.</p>
        </div>
      }
      @if (stats()) {
        <div class="stats-row">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-val">{{ stats()!.totalShips }}</div>
              <div class="stat-label">Кораблей</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-val red">{{ stats()!.sunkShips }}</div>
              <div class="stat-label">Потоплено</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-val green">{{ stats()!.remainingShips }}</div>
              <div class="stat-label">Осталось</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-val">{{ stats()!.totalShots }}</div>
              <div class="stat-label">Выстрелов</div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <h2>Рейтинг</h2>

      <table mat-table [dataSource]="entries()" class="leaderboard-table mat-elevation-z2">
        <ng-container matColumnDef="rank">
          <th mat-header-cell *matHeaderCellDef>#</th>
          <td mat-cell *matCellDef="let entry; let i = index">{{ i + 1 }}</td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Имя</th>
          <td mat-cell *matCellDef="let entry">
            {{ entry.name }}
            @if (entry.userId === auth.user()?.id) {
              <mat-chip class="me-chip">Я</mat-chip>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="hits">
          <th mat-header-cell *matHeaderCellDef>Попаданий</th>
          <td mat-cell *matCellDef="let entry" class="green">{{ entry.hits }}</td>
        </ng-container>

        <ng-container matColumnDef="shotsFired">
          <th mat-header-cell *matHeaderCellDef>Выстрелов</th>
          <td mat-cell *matCellDef="let entry">{{ entry.shotsFired }}</td>
        </ng-container>

        <ng-container matColumnDef="balance">
          <th mat-header-cell *matHeaderCellDef>Баланс</th>
          <td mat-cell *matCellDef="let entry" class="yellow">{{ entry.balance }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;" [class.my-row]="row.userId === auth.user()?.id"></tr>
      </table>
    </div>
  `,
  styles: [`
    mat-toolbar { gap: 4px; }
    .spacer { flex: 1; }

    .page { padding: 32px; max-width: 760px; margin: 0 auto; }
    h2 { font-size: 20px; font-weight: 500; margin-bottom: 16px; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
    .stat-card mat-card-content { text-align: center; padding: 16px; }
    .stat-val { font-size: 32px; font-weight: 700; }
    .stat-label { font-size: 12px; color: var(--mat-sys-on-surface-variant); margin-top: 4px; }

    .leaderboard-table { width: 100%; background: transparent; }
    .my-row { background: rgba(var(--mat-sys-primary-rgb, 33,150,243), 0.08); }
    .me-chip { font-size: 11px; height: 20px; margin-left: 8px; }

    .no-season {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      margin-top: 80px; color: var(--mat-sys-on-surface-variant);
    }
    .no-season mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .no-season p { font-size: 16px; }
    .green { color: #4ade80; }
    .red { color: #f87171; }
    .yellow { color: #fbbf24; }
  `],
})
export class LeaderboardPage implements OnInit {
  auth = inject(AuthService)
  private http = inject(HttpClient)

  columns = ['rank', 'name', 'hits', 'shotsFired', 'balance']
  entries = signal<LeaderboardEntry[]>([])
  stats = signal<SeasonStats | null>(null)
  noActiveSeason = signal(false)

  ngOnInit() {
    this.http.get<{ id: string }>('/api/seasons/active').subscribe({
      next: (season) => {
        this.http.get<LeaderboardEntry[]>(`/api/seasons/${season.id}/leaderboard`).subscribe((d) => this.entries.set(d))
        this.http.get<SeasonStats>(`/api/seasons/${season.id}/stats`).subscribe((d) => this.stats.set(d))
      },
      error: () => this.noActiveSeason.set(true),
    })
  }
}
