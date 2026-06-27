import { Component, signal, inject, OnInit } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatTableModule } from '@angular/material/table'
import { MatChipsModule } from '@angular/material/chips'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { AuthService } from '../../core/auth.service'

interface Season { id: string; name: string; isActive: boolean; amountPerShot: number }
interface User { id: string; name: string; email: string; role: string }

@Component({
  selector: 'app-admin',
  imports: [
    FormsModule, RouterLink,
    MatToolbarModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTableModule, MatChipsModule, MatSnackBarModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <span>⚡ SalesLeague — Админ</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/board">Поле</a>
      <a mat-button routerLink="/leaderboard">Рейтинг</a>
      <button mat-icon-button (click)="auth.logout()">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <div class="page">
      <mat-tab-group>

        <!-- СЕЗОНЫ -->
        <mat-tab label="Сезоны">
          <div class="tab-content">
            <mat-card>
              <mat-card-header><mat-card-title>Создать сезон</mat-card-title></mat-card-header>
              <mat-card-content>
                <form class="row-form" (ngSubmit)="createSeason()">
                  <mat-form-field appearance="outline">
                    <mat-label>Название</mat-label>
                    <input matInput [(ngModel)]="newSeason.name" name="name" required />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Сумма за выстрел (₽)</mat-label>
                    <input matInput type="number" [(ngModel)]="newSeason.amountPerShot" name="amount" required />
                  </mat-form-field>
                  <button mat-flat-button type="submit">Создать</button>
                </form>
              </mat-card-content>
            </mat-card>

            <table mat-table [dataSource]="seasons()" class="mat-elevation-z2 seasons-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Название</th>
                <td mat-cell *matCellDef="let s">{{ s.name }}</td>
              </ng-container>
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Сумма / выстрел</th>
                <td mat-cell *matCellDef="let s">{{ s.amountPerShot }} ₽</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Статус</th>
                <td mat-cell *matCellDef="let s">
                  @if (s.isActive) {
                    <mat-chip color="primary" highlighted>Активен</mat-chip>
                  } @else {
                    <mat-chip>Неактивен</mat-chip>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let s">
                  @if (!s.isActive) {
                    <button mat-stroked-button (click)="activateSeason(s.id)">Активировать</button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="seasonCols"></tr>
              <tr mat-row *matRowDef="let row; columns: seasonCols;"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- ПРОДАЖИ -->
        <mat-tab label="Продажи">
          <div class="tab-content">
            <mat-card>
              <mat-card-header><mat-card-title>Начислить продажи</mat-card-title></mat-card-header>
              <mat-card-content>
                <form class="row-form" (ngSubmit)="addSales()">
                  <mat-form-field appearance="outline">
                    <mat-label>Сотрудник</mat-label>
                    <mat-select [(ngModel)]="salesForm.userId" name="userId" required>
                      @for (u of users(); track u.id) {
                        <mat-option [value]="u.id">{{ u.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Сумма продаж (₽)</mat-label>
                    <input matInput type="number" [(ngModel)]="salesForm.amount" name="amount" required />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Комментарий</mat-label>
                    <input matInput [(ngModel)]="salesForm.note" name="note" />
                  </mat-form-field>
                  <button mat-flat-button type="submit">Начислить</button>
                </form>
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-header><mat-card-title>Начислить выстрелы вручную</mat-card-title></mat-card-header>
              <mat-card-content>
                <form class="row-form" (ngSubmit)="addShots()">
                  <mat-form-field appearance="outline">
                    <mat-label>Сотрудник</mat-label>
                    <mat-select [(ngModel)]="shotsForm.userId" name="userId" required>
                      @for (u of users(); track u.id) {
                        <mat-option [value]="u.id">{{ u.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Количество выстрелов</mat-label>
                    <input matInput type="number" [(ngModel)]="shotsForm.amount" name="amount" required />
                  </mat-form-field>
                  <button mat-flat-button type="submit">Начислить</button>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ПОЛЬЗОВАТЕЛИ -->
        <mat-tab label="Пользователи">
          <div class="tab-content">
            <mat-card>
              <mat-card-header><mat-card-title>Добавить пользователя</mat-card-title></mat-card-header>
              <mat-card-content>
                <form class="row-form" (ngSubmit)="createUser()">
                  <mat-form-field appearance="outline">
                    <mat-label>Имя</mat-label>
                    <input matInput [(ngModel)]="userForm.name" name="name" required />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" [(ngModel)]="userForm.email" name="email" required />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Пароль</mat-label>
                    <input matInput type="password" [(ngModel)]="userForm.password" name="password" required />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Роль</mat-label>
                    <mat-select [(ngModel)]="userForm.role" name="role">
                      <mat-option value="EMPLOYEE">Сотрудник</mat-option>
                      <mat-option value="ADMIN">Администратор</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button mat-flat-button type="submit">Создать</button>
                </form>
              </mat-card-content>
            </mat-card>

            <table mat-table [dataSource]="users()" class="mat-elevation-z2 seasons-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Имя</th>
                <td mat-cell *matCellDef="let u">{{ u.name }}</td>
              </ng-container>
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let u">{{ u.email }}</td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Роль</th>
                <td mat-cell *matCellDef="let u">
                  @if (u.role === 'ADMIN') {
                    <mat-chip color="accent" highlighted>Админ</mat-chip>
                  } @else {
                    <mat-chip>Сотрудник</mat-chip>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="userCols"></tr>
              <tr mat-row *matRowDef="let row; columns: userCols;"></tr>
            </table>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    mat-toolbar { gap: 4px; }
    .spacer { flex: 1; }

    .page { padding: 32px; max-width: 860px; margin: 0 auto; }
    .tab-content { padding-top: 24px; display: flex; flex-direction: column; gap: 24px; }

    .row-form { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; padding-top: 12px; }
    .row-form mat-form-field { min-width: 200px; }
    .row-form button { margin-top: 4px; height: 56px; }

    .seasons-table { width: 100%; background: transparent; }
  `],
})
export class AdminPage implements OnInit {
  auth = inject(AuthService)
  private http = inject(HttpClient)
  private snack = inject(MatSnackBar)

  seasonCols = ['name', 'amount', 'status', 'actions']
  userCols = ['name', 'email', 'role']
  seasons = signal<Season[]>([])
  users = signal<User[]>([])

  newSeason = { name: '', amountPerShot: 10000 }
  salesForm = { userId: '', amount: 0, note: '' }
  shotsForm = { userId: '', amount: 1 }
  userForm = { name: '', email: '', password: '', role: 'EMPLOYEE' }

  private activeSeasonId = signal<string | null>(null)

  ngOnInit() {
    this.loadSeasons()
    this.loadUsers()
  }

  loadSeasons() {
    this.http.get<Season[]>('/api/seasons').subscribe((data) => {
      this.seasons.set(data)
      const active = data.find((s) => s.isActive)
      if (active) this.activeSeasonId.set(active.id)
    })
  }

  loadUsers() {
    this.http.get<User[]>('/api/users').subscribe((data) => this.users.set(data))
  }

  createSeason() {
    this.http.post<Season>('/api/seasons', this.newSeason).subscribe(() => {
      this.newSeason = { name: '', amountPerShot: 10000 }
      this.loadSeasons()
      this.snack.open('Сезон создан', '', { duration: 2000 })
    })
  }

  activateSeason(id: string) {
    this.http.patch(`/api/seasons/${id}/activate`, {}).subscribe(() => {
      this.loadSeasons()
      this.snack.open('Сезон активирован', '', { duration: 2000 })
    })
  }

  addSales() {
    const id = this.activeSeasonId()
    if (!id) { this.snack.open('Нет активного сезона', '', { duration: 3000 }); return }
    this.http.post<any>(`/api/seasons/${id}/sales`, this.salesForm).subscribe({
      next: (res) => {
        this.snack.open(`Начислено ${res.entry.shots} выстрелов`, 'OK', { duration: 3000 })
        this.salesForm = { userId: '', amount: 0, note: '' }
      },
    })
  }

  createUser() {
    this.http.post('/api/users', this.userForm).subscribe({
      next: () => {
        this.snack.open(`Пользователь ${this.userForm.name} создан`, 'OK', { duration: 3000 })
        this.userForm = { name: '', email: '', password: '', role: 'EMPLOYEE' }
        this.loadUsers()
      },
      error: (err) => {
        this.snack.open(err.error?.message ?? 'Ошибка при создании', 'OK', { duration: 4000 })
      },
    })
  }

  addShots() {
    const id = this.activeSeasonId()
    if (!id) { this.snack.open('Нет активного сезона', '', { duration: 3000 }); return }
    this.http.post(`/api/seasons/${id}/balance/add`, this.shotsForm).subscribe({
      next: () => {
        this.snack.open(`Начислено ${this.shotsForm.amount} выстрелов`, 'OK', { duration: 3000 })
        this.shotsForm = { userId: '', amount: 1 }
      },
    })
  }
}
