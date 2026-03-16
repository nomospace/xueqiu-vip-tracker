import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VipService, VIPUser } from '../../services/vip.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-800">📊 脱水雪球</h1>
        <button 
          (click)="refresh()"
          class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm">
          🔄 刷新
        </button>
      </div>
      
      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">关注大V</div>
          <div class="text-3xl font-bold text-blue-600">{{ vips.length }}</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">Cookie 状态</div>
          <div class="text-lg font-bold" [class]="cookieStatus ? 'text-green-600' : 'text-yellow-600'">
            {{ cookieStatus ? '✓ 已配置' : '⚠️ 未配置' }}
          </div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">数据库</div>
          <div class="text-lg font-bold text-green-600">✓ 正常</div>
        </div>
      </div>

      <!-- Cookie 配置 -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-bold mb-4">🔐 Cookie 配置</h2>
        <div class="flex gap-3">
          <input 
            type="text" 
            [(ngModel)]="cookieInput"
            placeholder="粘贴雪球 Cookie..."
            class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <button 
            (click)="saveCookie()"
            class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            保存
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-2">
          💡 获取方式：登录雪球网页 → F12 打开开发者工具 → Network → 找任意请求 → 复制 Cookie 值
        </p>
      </div>

      <!-- 快速操作 -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-bold mb-4">⚡ 快速操作</h2>
        <div class="flex flex-wrap gap-3">
          <a routerLink="/vip" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + 添加大V
          </a>
          <button 
            (click)="crawlAll()"
            [disabled]="crawling"
            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
            {{ crawling ? '🔄 爬取中...' : '🔄 爬取全部' }}
          </button>
        </div>
      </div>

      <!-- 大V列表 -->
      <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">👤 关注的大V</h2>
          <a routerLink="/vip" class="text-blue-500 text-sm hover:underline">查看全部 →</a>
        </div>
        
        @if (loading) {
          <div class="text-center py-8 text-gray-400">加载中...</div>
        } @else if (vips.length === 0) {
          <div class="text-center py-8 text-gray-400">
            <p>暂无大V</p>
            <a routerLink="/vip" class="text-blue-500 hover:underline mt-2 inline-block">添加大V →</a>
          </div>
        } @else {
          <div class="space-y-3">
            @for (vip of vips.slice(0, 5); track vip.id) {
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                <a [routerLink]="['/vip', vip.id]" class="flex items-center gap-3 flex-1">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg overflow-hidden">
                    @if (vip.avatar) {
                      <img [src]="vip.avatar" [alt]="vip.nickname" class="w-full h-full object-cover">
                    } @else {
                      👤
                    }
                  </div>
                  <div>
                    <div class="font-medium">{{ vip.nickname }}</div>
                    <div class="text-sm text-gray-500">{{ vip.followers | number }} 粉丝</div>
                  </div>
                </a>
                <button 
                  (click)="crawlVip(vip.id)"
                  [disabled]="crawlingVipId === vip.id"
                  class="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition disabled:opacity-50">
                  {{ crawlingVipId === vip.id ? '爬取中...' : '爬取' }}
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  vips: VIPUser[] = [];
  loading = true;
  crawling = false;
  crawlingVipId: number | null = null;
  cookieStatus = false;
  cookieInput = '';

  constructor(
    private vipService: VipService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    
    this.vipService.getVipList().subscribe({
      next: (vips) => {
        this.vips = vips;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    this.checkCookie();
  }

  checkCookie() {
    this.http.get<{ has_cookie: boolean }>('/api/vip/check-cookie').subscribe({
      next: (res) => this.cookieStatus = res.has_cookie,
      error: () => this.cookieStatus = false
    });
  }

  saveCookie() {
    if (!this.cookieInput.trim()) {
      alert('请输入 Cookie');
      return;
    }
    
    this.http.post('/api/vip/cookie', { cookie: this.cookieInput }).subscribe({
      next: () => {
        this.cookieStatus = true;
        this.cookieInput = '';
        alert('Cookie 保存成功！');
      },
      error: (err) => {
        alert('保存失败: ' + (err.error?.detail || err.message));
      }
    });
  }

  refresh() {
    this.loadData();
  }

  crawlAll() {
    if (!this.cookieStatus) {
      alert('请先配置 Cookie');
      return;
    }
    
    this.crawling = true;
    
    Promise.all(this.vips.map(vip => 
      this.http.post(`/api/tasks/crawl/${vip.id}`, {}).toPromise()
    )).then(() => {
      this.crawling = false;
      this.loadData();
      alert('爬取完成！');
    }).catch(() => {
      this.crawling = false;
      alert('爬取失败，请检查 Cookie 是否有效');
    });
  }

  crawlVip(vipId: number) {
    if (!this.cookieStatus) {
      alert('请先配置 Cookie');
      return;
    }
    
    this.crawlingVipId = vipId;
    
    this.http.post(`/api/tasks/crawl/${vipId}`, {}).subscribe({
      next: () => {
        this.crawlingVipId = null;
        this.loadData();
      },
      error: () => {
        this.crawlingVipId = null;
        alert('爬取失败，请检查 Cookie 是否有效');
      }
    });
  }
}