import { Component, OnInit, Pipe, PipeTransform, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { timeout, catchError, of } from 'rxjs';

// 富文本处理 Pipe
@Pipe({
  name: 'richText',
  standalone: true
})
export class RichTextPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value;
  }
}

interface VIPUser {
  id: number;
  xueqiu_id: string;
  nickname: string;
  avatar: string | null;
  followers: number;
  description: string | null;
}

interface Status {
  id: string;
  user_id: string;
  text: string;
  title: string;
  link: string;
  created_at: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
  vip_nickname?: string;
  vip_id?: number;
  data_type?: 'timeline' | 'post' | 'comment';
  analysis?: Analysis;
}

interface Analysis {
  coreViewpoint?: string;
  relatedStocks?: { name: string; code: string; attitude: string; reason: string }[];
  positionSignals?: { operation: string; stock: string; basis: string }[];
  keyLogic?: string[];
  riskWarnings?: string[];
  overallAttitude?: string;
  summary?: string;
  error?: string;
  _cached?: boolean;
}

interface HoldingChange {
  stock_code: string;
  stock_name: string;
  operation: string;
  vip_nickname: string;
  vip_id: number;
  created_at: string;
  weight?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, RichTextPipe],
  template: `
    <div class="min-h-screen bg-slate-50 pb-16">
      <!-- ========== 固定顶部导航栏 ========== -->
      <header class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <!-- 品牌 Logo -->
            <div class="flex items-center gap-2">
              <img src="assets/favicon.svg" alt="脱水雪球" class="w-8 h-8 rounded-lg">
              <div>
                <h1 class="text-lg font-bold">脱水雪球</h1>
              </div>
            </div>
            
            <!-- 日期选择 + 刷新 -->
            <div class="flex items-center gap-2">
              <input 
                type="date" 
                [ngModel]="selectedDate"
                (ngModelChange)="onDateChange($event)"
                class="bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1 text-sm focus:outline-none w-32"
                [style.color]="'white'">
              <button 
                (click)="refreshTimeline()"
                [disabled]="loading"
                class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-lg text-sm transition disabled:opacity-50">
                <span [class.animate-spin]="loading">🔄</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <!-- 日期筛选提示 -->
        @if (selectedDate) {
          <div class="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
            <span class="text-sm text-blue-700">
              📅 正在查看 {{ selectedDate }} 的时间线
            </span>
            <button 
              (click)="clearDateFilter()"
              class="text-sm text-blue-600 hover:text-blue-800">
              查看全部
            </button>
          </div>
        }
        
        <!-- ========== 时间线内容 ========== -->
        <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <!-- 内容区域 -->
          <div class="divide-y divide-slate-100">
            @if (loading) {
              <div class="p-8 text-center">
                <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p class="text-slate-400 text-sm">加载中...</p>
              </div>
            } @else if (timeline.length === 0) {
              <div class="p-8 text-center">
                <div class="text-4xl mb-3">📭</div>
                @if (myVips.length === 0) {
                  <p class="text-slate-400">暂无关注的大V</p>
                  <p class="text-xs text-slate-300 mt-2">请先添加关注的大V</p>
                } @else if (selectedDate) {
                  <p class="text-slate-400">{{ selectedDate }} 暂无动态数据</p>
                  <p class="text-xs text-slate-300 mt-2">该日期没有大V发言，试试其他日期</p>
                } @else {
                  <p class="text-slate-400">暂无动态数据</p>
                  <p class="text-xs text-slate-300 mt-2">请稍后刷新重试</p>
                }
              </div>
            } @else {
              @for (item of filteredTimeline; track item.id) {
                <div class="p-4 hover:bg-slate-50 transition">
                  <!-- 头部：大V信息 + 时间 -->
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">👤</div>
                      <span class="font-medium text-slate-700 text-sm">{{ item.vip_nickname || '未知用户' }}</span>
                    </div>
                    <span class="text-xs text-slate-400">{{ formatTime(item.created_at) }}</span>
                  </div>
                  
                  <!-- 情绪标签 -->
                  @if (item.analysis?.overallAttitude) {
                    <div class="mb-2">
                      <span class="inline-block px-2 py-0.5 rounded text-xs font-medium"
                            [class]="getAttitudeClass(item.analysis!.overallAttitude!)">
                        {{ item.analysis!.overallAttitude! }}
                      </span>
                    </div>
                  }
                  
                  <!-- 原始内容 -->
                  @if (item.text) {
                    <div class="text-sm text-slate-600 mb-3 rich-text" [innerHTML]="item.text | richText"></div>
                  }
                  
                  <!-- 相关标的 -->
                  @if (item.analysis?.relatedStocks?.length) {
                    <div class="flex flex-wrap gap-1 mb-2">
                      @for (stock of item.analysis!.relatedStocks!.slice(0, 5); track stock.code) {
                        <span class="px-2 py-0.5 rounded text-xs border"
                              [class]="getStockClass(stock.attitude)">
                          {{ stock.name }}
                        </span>
                      }
                    </div>
                  }
                  
                  <!-- 原始内容区块 -->
                  <div class="original-content">
                    @if (item.analysis?.summary) {
                      <p class="mb-2 text-slate-700">{{ item.analysis!.summary }}</p>
                    }
                  </div>
                  
                  <!-- 分析详情区块（视觉区分） -->
                  @if (item.analysis; as analysis) {
                    @if (analysis.keyLogic?.length || analysis.riskWarnings?.length) {
                      <div class="analysis-detail">
                        @if (analysis.keyLogic?.length) {
                          <div class="mb-2">
                            <div class="logic-title">
                              <span>💡</span>
                              <span>关键逻辑</span>
                            </div>
                            <ul class="logic-list">
                              @for (logic of analysis.keyLogic!; track $index) {
                                <li>{{ logic }}</li>
                              }
                            </ul>
                          </div>
                        }
                        @if (analysis.riskWarnings?.length) {
                          <div class="risk-warning">
                            <span class="warning-title">⚠️ 风险提示：</span>
                            <span>{{ analysis.riskWarnings!.join('；') }}</span>
                          </div>
                        }
                      </div>
                    }
                  }
                </div>
              }
            }
          </div>
        </section>

        <!-- ========== Cookie 配置（折叠式） ========== -->
        <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            (click)="showCookieSection = !showCookieSection"
            class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
            <span class="font-semibold text-slate-700 text-sm">🔐 Cookie 配置</span>
            <span class="text-slate-400">{{ showCookieSection ? '▼' : '▶' }}</span>
          </button>
          
          @if (showCookieSection) {
            <div class="px-4 pb-4 border-t border-slate-100">
              <p class="text-xs text-slate-500 my-3">
                需要有效的雪球 Cookie 才能获取数据
              </p>
              <textarea 
                [(ngModel)]="cookieInput"
                placeholder="请粘贴雪球 Cookie..."
                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              </textarea>
              <button 
                (click)="saveCookie()"
                [disabled]="!cookieInput.trim()"
                class="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                保存配置
              </button>
              
              <!-- 获取教程 -->
              <details class="mt-3">
                <summary class="text-xs text-blue-500 cursor-pointer">如何获取 Cookie？</summary>
                <div class="mt-2 text-xs text-slate-500 space-y-2 bg-slate-50 p-3 rounded-lg">
                  <p><strong>PC端：</strong></p>
                  <ol class="list-decimal list-inside space-y-1">
                    <li>登录雪球网页版</li>
                    <li>按 F12 打开开发者工具</li>
                    <li>切换到 Network 标签</li>
                    <li>刷新页面，点击任意请求</li>
                    <li>在 Headers 中找到 Cookie</li>
                    <li>复制完整 Cookie 值</li>
                  </ol>
                </div>
              </details>
            </div>
          }
        </section>

        <!-- 底部信息 -->
        <div class="text-center text-xs text-slate-400 py-2">
          最后更新: {{ lastUpdate }} | Build: {{ buildTime }}
        </div>
      </main>

      <!-- ========== 底部 Tab 栏（始终显示） ========== -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div class="flex justify-around py-2">
          <a routerLink="/" class="flex flex-col items-center py-1 px-3 text-blue-600">
            <span class="text-xl">📅</span>
            <span class="text-xs mt-0.5">时间线</span>
          </a>
          <a routerLink="/summary" class="flex flex-col items-center py-1 px-3 text-slate-500">
            <span class="text-xl">📊</span>
            <span class="text-xs mt-0.5">摘要</span>
          </a>
          <a routerLink="/watchlist" class="flex flex-col items-center py-1 px-3 text-slate-500">
            <span class="text-xl">⭐</span>
            <span class="text-xs mt-0.5">自选</span>
          </a>
          <a routerLink="/vip" class="flex flex-col items-center py-1 px-3 text-slate-500">
            <span class="text-xl">👥</span>
            <span class="text-xs mt-0.5">大V</span>
          </a>
        </div>
      </nav>

      <!-- Toast 提示 -->
      @if (toastMessage) {
        <div class="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50"
             [class]="toastType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
          {{ toastMessage }}
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  myVips: VIPUser[] = [];
  
  // 筛选状态
  selectedVipId: string | number = 'all';
  timeRange = '7d';
  selectedDate: string = new Date().toISOString().split('T')[0];  // 默认今天
  
  // 数据
  timeline: Status[] = [];
  loading = false;
  lastUpdate = '--';
  cacheTime = '';
  buildTime = '2026-03-20 14:05';
  
  // Cookie
  cookieStatus = false;
  cookieInput = '';
  showCookieSection = false;
  
  // Toast
  toastMessage = '';
  toastType = 'success';

  // 按日期过滤后的时间线
  get filteredTimeline(): Status[] {
    if (!this.selectedDate) {
      return this.timeline;
    }
    
    return this.timeline.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      return itemDate === this.selectedDate;
    });
  }

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCookieFromBrowser();
    this.loadMyVips();
  }

  loadCookieFromBrowser() {
    const savedCookie = localStorage.getItem('xueqiu_cookie');
    this.cookieStatus = !!savedCookie;
  }

  loadMyVips() {
    this.http.get<VIPUser[]>('/api/vip').subscribe({
      next: (vips) => {
        this.myVips = vips;
        this.loadTimeline();
      },
      error: (err) => {
        console.error('加载大V列表失败', err);
      }
    });
  }

  loadTimeline(forceRefresh: boolean = true) {
    if (this.myVips.length === 0) {
      this.timeline = [];
      return;
    }

    this.loading = true;
    this.timeline = [];
    this.cacheTime = '';
    
    const cookie = localStorage.getItem('xueqiu_cookie') || '';
    
    let vipIds: number[] = [];
    if (this.selectedVipId === 'all') {
      vipIds = this.myVips.map(v => v.id);
    } else {
      vipIds = [Number(this.selectedVipId)];
    }

    if (vipIds.length === 0) {
      this.loading = false;
      return;
    }

    // 默认强制刷新，确保每次都获取最新数据并进行 AI 分析
    // 注意：雪球 API count 参数最大支持 20
    this.http.post<any>('/api/vip/fetch-all-timeline', {
      vip_ids: vipIds,
      count: 20,
      cookie: cookie,
      force_refresh: forceRefresh
    }).pipe(
      timeout(60000),
      catchError(err => {
        console.error('请求超时或失败', err);
        return of({ statuses: [], total: 0 });
      })
    ).subscribe({
      next: (result) => {
        // 保存原始数据，不过滤（让 filteredTimeline 处理日期过滤）
        this.timeline = result.statuses || [];
        this.cacheTime = result._cache_time || '';
        this.loading = false;
        this.updateLastTime();
        // 数据加载完成后滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.error('加载时间线失败', err);
        this.loading = false;
        this.timeline = [];
      }
    });
  }

  refreshTimeline() {
    this.loadTimeline(true);
  }

  onDateChange(date: string) {
    this.selectedDate = date;
    // 切换日期时重新加载数据
    if (date) {
      this.loadTimeline();
    }
  }

  clearDateFilter() {
    this.selectedDate = '';
    // 清除日期筛选后重新加载数据
    this.loadTimeline();
  }

  onFilterChange() {
    this.loadTimeline();
  }

  filterByTime(statuses: Status[]): Status[] {
    if (!statuses.length) return [];
    
    const now = new Date();
    let cutoff: Date;
    
    switch (this.timeRange) {
      case 'today':
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '3d':
        cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return statuses.filter(item => {
      if (!item.created_at) return false;
      const date = new Date(item.created_at);
      return date >= cutoff;
    });
  }

  getAttitudeClass(attitude: string): string {
    switch (attitude) {
      case '看多':
        return 'bg-red-100 text-red-700';
      case '看空':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getStockClass(attitude: string): string {
    switch (attitude) {
      case '看多':
        return 'border-red-200 text-red-600';
      case '看空':
        return 'border-green-200 text-green-600';
      default:
        return 'border-gray-200 text-gray-600';
    }
  }

  updateLastTime() {
    this.lastUpdate = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  saveCookie() {
    if (this.cookieInput.trim()) {
      localStorage.setItem('xueqiu_cookie', this.cookieInput.trim());
      this.cookieStatus = true;
      this.cookieInput = '';
      this.showToast('Cookie 配置成功');
      this.loadTimeline(true);
    }
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN');
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => this.toastMessage = '', 3000);
  }
}