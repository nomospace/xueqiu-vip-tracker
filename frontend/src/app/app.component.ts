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
          📊 雪球大V监听
        </a>
        <div class="flex gap-6">
          <a routerLink="/" class="hover:text-blue-200 transition">仪表盘</a>
          <a routerLink="/vip" class="hover:text-blue-200 transition">大V列表</a>
          <a routerLink="/posts" class="hover:text-blue-200 transition">动态</a>
          <a routerLink="/holdings" class="hover:text-blue-200 transition">持仓</a>
        </div>
      </div>
    </nav>
    <main class="container mx-auto p-4">
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {}