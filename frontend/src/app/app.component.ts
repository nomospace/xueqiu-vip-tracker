import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav class="bg-blue-600 text-white p-4 shadow-lg">
      <div class="container mx-auto flex items-center justify-between">
        <a routerLink="/" class="text-xl font-bold flex items-center gap-2">
          📊 脱水雪球
        </a>
        <div class="flex gap-6">
          <a routerLink="/timeline" class="hover:text-blue-200 transition">📅 时间线</a>
          <a routerLink="/my-posts" class="hover:text-blue-200 transition">📝 我的</a>
          <a routerLink="/vip" class="hover:text-blue-200 transition">👥 大V</a>
          <a routerLink="/holdings" class="hover:text-blue-200 transition">📈 持仓</a>
        </div>
      </div>
    </nav>
    <main class="container mx-auto p-4">
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {}