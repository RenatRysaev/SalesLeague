import { Component, signal, inject, OnInit } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { RouterLink } from '@angular/router'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatChipsModule } from '@angular/material/chips'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatIconModule } from '@angular/material/icon'
import { MatBadgeModule } from '@angular/material/badge'
import { AuthService } from '../../core/auth.service'

interface ShotResult {
  id: string
  row: number
  col: number
  isHit: boolean
  isSunk: boolean
  shipId?: string | null
  prize?: { name: string } | null
}

type CellState = 'empty' | 'miss' | 'hit' | 'sunk'

@Component({
  selector: 'app-board',
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatChipsModule, MatSnackBarModule, MatTooltipModule, MatIconModule, MatBadgeModule],
  template: `
    <mat-toolbar color="primary">
      <span>🚢 Морской бой</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/leaderboard">Рейтинг</a>
      @if (auth.isAdmin()) {
        <a mat-button routerLink="/admin">Админ</a>
      }
      <span class="balance-chip">
        <mat-icon>adjust</mat-icon>
        {{ balance() }}
      </span>
      <button mat-icon-button (click)="auth.logout()" matTooltip="Выйти">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <div class="page">
      <div class="board-header">
        <h2>Привет, {{ auth.user()?.name }}</h2>
        @if (balance() === 0) {
          <p class="hint">У вас нет выстрелов. Попросите менеджера начислить их после продажи.</p>
        }
      </div>

      <div class="board-wrap">
        <div class="grid-row">
          <div class="corner"></div>
          @for (c of cols; track c) {
            <div class="label">{{ c + 1 }}</div>
          }
        </div>

        @for (r of rows; track r) {
          <div class="grid-row">
            <div class="label">{{ rowLabel(r) }}</div>
            @for (c of cols; track c) {
              <button
                class="cell"
                [class]="'cell ' + cellClass(r, c)"
                [disabled]="!canShoot(r, c)"
                [matTooltip]="cellTooltip(r, c)"
                (click)="fire(r, c)"
              ></button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    mat-toolbar { gap: 4px; }
    .spacer { flex: 1; }
    .balance-chip {
      display: flex; align-items: center; gap: 4px;
      background: rgba(255,255,255,0.12); border-radius: 16px;
      padding: 4px 12px; font-size: 14px; font-weight: 600; margin: 0 8px;
    }

    .page { padding: 32px; display: flex; flex-direction: column; align-items: center; }
    .board-header { text-align: center; margin-bottom: 28px; }
    .board-header h2 { font-size: 20px; font-weight: 500; }
    .hint { color: var(--mat-sys-on-surface-variant); font-size: 14px; margin-top: 8px; }

    .grid-row { display: flex; }
    .corner, .label {
      width: 32px; height: 32px; display: flex;
      align-items: center; justify-content: center;
      font-size: 12px; color: var(--mat-sys-on-surface-variant);
    }

    .cell {
      width: 42px; height: 42px; margin: 2px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04); cursor: pointer;
      transition: all 0.15s; position: relative; font-size: 16px;
    }
    .cell:hover:not(:disabled) {
      background: rgba(255,255,255,0.12);
      border-color: var(--mat-sys-primary);
      transform: scale(1.05);
    }
    .cell:disabled { cursor: default; }

    .cell.miss { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.4); }
    .cell.miss::after { content: '·'; color: #60a5fa; font-size: 24px; line-height: 40px; position: absolute; top: 0; left: 0; right: 0; text-align: center; }

    .cell.hit { background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.4); }
    .cell.hit::after { content: '✕'; color: #4ade80; font-size: 15px; line-height: 40px; position: absolute; top: 0; left: 0; right: 0; text-align: center; }

    .cell.sunk { background: rgba(248,113,113,0.2); border-color: rgba(248,113,113,0.5); }
    .cell.sunk::after { content: '✕'; color: #f87171; font-size: 15px; line-height: 40px; position: absolute; top: 0; left: 0; right: 0; text-align: center; }
  `],
})
export class BoardPage implements OnInit {
  auth = inject(AuthService)
  private http = inject(HttpClient)
  private snack = inject(MatSnackBar)

  rows = Array.from({ length: 10 }, (_, i) => i)
  cols = Array.from({ length: 10 }, (_, i) => i)

  balance = signal(0)
  private shotMap = signal<Map<string, ShotResult>>(new Map())
  private sunkShipCells = signal<Set<string>>(new Set())
  private seasonId = signal<string | null>(null)
  private firing = signal(false)

  ngOnInit() {
    this.loadActiveSeason()
  }

  rowLabel(r: number) {
    return String.fromCharCode(65 + r)
  }

  cellClass(r: number, c: number): string {
    const key = `${r}-${c}`
    const shot = this.shotMap().get(key)
    if (!shot) return ''
    if (this.sunkShipCells().has(key)) return 'sunk'
    return shot.isHit ? 'hit' : 'miss'
  }

  cellTooltip(r: number, c: number): string {
    const key = `${r}-${c}`
    const shot = this.shotMap().get(key)
    if (!shot) return `${this.rowLabel(r)}${c + 1}`
    return shot.isHit ? 'Попадание' : 'Промах'
  }

  canShoot(r: number, c: number): boolean {
    const key = `${r}-${c}`
    return !!this.seasonId() && !this.shotMap().has(key) && this.balance() > 0 && !this.firing()
  }

  fire(row: number, col: number) {
    const id = this.seasonId()
    if (!id) return
    this.firing.set(true)

    this.http.post<ShotResult>(`/api/seasons/${id}/shots`, { row, col }).subscribe({
      next: (result) => {
        const key = `${row}-${col}`
        this.shotMap.update((m) => new Map(m).set(key, result))
        this.balance.update((b) => b - 1)
        this.firing.set(false)

        if (result.isSunk) {
          this.snack.open(`🏆 Корабль потоплен! Приз: ${result.prize?.name}`, 'OK', { duration: 5000 })
          if (result.shipId) this.markShipSunk(id, result.shipId)
        } else if (result.isHit) {
          this.snack.open('💥 Попадание!', '', { duration: 2000 })
        } else {
          this.snack.open('💦 Мимо!', '', { duration: 1500 })
        }
      },
      error: () => this.firing.set(false),
    })
  }

  private loadActiveSeason() {
    this.http.get<{ id: string }>('/api/seasons/active').subscribe({
      next: (season) => {
        this.seasonId.set(season.id)
        this.loadHistory(season.id)
        this.loadBalance(season.id)
      },
    })
  }

  private loadHistory(seasonId: string) {
    this.http.get<ShotResult[]>(`/api/seasons/${seasonId}/shots`).subscribe((shots) => {
      const map = new Map<string, ShotResult>()
      for (const s of shots) map.set(`${s.row}-${s.col}`, s)
      this.shotMap.set(map)
    })
  }

  private loadBalance(seasonId: string) {
    this.http.get<{ available: number }>(`/api/seasons/${seasonId}/balance`).subscribe((b) => {
      this.balance.set(b.available)
    })
  }

  private markShipSunk(seasonId: string, shipId: string) {
    this.http.get<any[]>(`/api/seasons/${seasonId}/ships`).subscribe((ships) => {
      const ship = ships.find((s) => s.id === shipId)
      if (!ship) return
      this.sunkShipCells.update((set) => {
        const next = new Set(set)
        for (const c of ship.cells) next.add(`${c.row}-${c.col}`)
        return next
      })
    })
  }
}
