import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
    
    // 已经是HTML格式，直接返回
    // 雪球的text已经是HTML格式，包含 <p>, <a>, <br/> 等标签
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
  data_type?: 'timeline' | 'post' | 'comment'; // 时间线/发言/评论
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

interface Analysis {
  coreViewpoint?: string;
  relatedStocks?: { name: string; code: string; attitude: string; reason: string }[];
  positionSignals?: { operation: string; stock: string; basis: string }[];
  keyLogic?: string[];
  riskWarnings?: string[];
  overallAttitude?: string;
  summary?: string;
  rawAnalysis?: string;
  error?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, RichTextPipe],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部标题栏 -->
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-800">脱水雪球 - 雪球大V信息聚合平台</h1>
          <div class="flex items-center gap-4 text-xs text-gray-400">
            <span>Cookie: {{ cookieStatus ? '✓ 正常' : '⚠ 未配置' }}</span>
            <span>|</span>
            <span>数据库: ✓ 正常</span>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto flex gap-4 p-4">
        <!-- 左侧筛选区 -->
        <aside class="w-56 flex-shrink-0 space-y-4">
          <!-- 大V筛选 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-medium text-gray-700 mb-3">👤 大V筛选</h3>
            <select 
              [(ngModel)]="selectedVipId" 
              (change)="onFilterChange()"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option value="all">全部大V</option>
              @for (vip of myVips; track vip.id) {
                <option [value]="vip.id">{{ vip.nickname }}</option>
              }
            </select>
          </div>

          <!-- 时间筛选 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-medium text-gray-700 mb-3">⏰ 时间范围</h3>
            <select 
              [(ngModel)]="timeRange"
              (change)="onFilterChange()"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option value="today">今日</option>
              <option value="3d">近3天</option>
              <option value="7d">近7天</option>
              <option value="30d">近30天</option>
            </select>
          </div>

          <!-- 快速操作 -->
          <div class="bg-white rounded-lg shadow-sm p-4 space-y-2">
            <a 
              routerLink="/vip" 
              class="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition text-sm">
              + 添加大V
            </a>
            <a 
              routerLink="/summary" 
              class="block w-full bg-orange-500 text-white text-center py-2 rounded-lg hover:bg-orange-600 transition text-sm">
              📊 执行摘要
            </a>
          </div>

          <!-- Cookie设置 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-medium text-gray-700 mb-3">🔐 Cookie</h3>
            <button 
              (click)="showCookieModal = true"
              class="w-full border border-gray-200 text-gray-600 text-center py-2 rounded-lg hover:bg-gray-50 transition text-sm">
              {{ cookieStatus ? '更新Cookie' : '配置Cookie' }}
            </button>
          </div>
        </aside>

        <!-- 右侧核心展示区 -->
        <main class="flex-1 space-y-4">
          <!-- Tab 标签 -->
          <div class="bg-white rounded-lg shadow-sm">
            <div class="flex border-b border-gray-200">
              <button 
                (click)="switchTab('timeline')"
                [class]="activeTab === 'timeline' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                📅 时间线（含脱水解读）
              </button>
              <button 
                (click)="switchTab('holdings')"
                [class]="activeTab === 'holdings' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                📈 持仓变更
              </button>
              @if (activeTab === 'timeline') {
                <div class="ml-auto flex items-center gap-2 px-4">
                  @if (cacheTime) {
                    <span class="text-xs text-gray-400">{{ cacheTime }} 缓存</span>
                  }
                  <button 
                    (click)="refreshTimeline()"
                    [disabled]="loading"
                    class="text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50">
                    {{ loading ? '刷新中...' : '🔄 刷新' }}
                  </button>
                </div>
              }
            </div>

            <!-- 内容区域 -->
            <div class="p-4 min-h-[400px]">
              @if (loading) {
                <div class="text-center py-12 text-gray-400">
                  <div class="animate-pulse">加载中...</div>
                </div>
              } @else if (activeTab === 'holdings') {
                <!-- 持仓变更 -->
                @if (holdings.length === 0) {
                  <div class="text-center py-12 text-gray-400">
                    <p>暂无持仓变更数据</p>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (item of holdings; track item.stock_code + item.created_at) {
                      <div class="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                              [class]="item.operation === '新增' || item.operation === '加仓' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'">
                              {{ item.operation === '新增' ? '+' : item.operation === '清仓' ? '-' : item.operation === '加仓' ? '↑' : '↓' }}
                            </div>
                            <div>
                              <div class="font-medium">{{ item.stock_name }} <span class="text-xs text-gray-400">{{ item.stock_code }}</span></div>
                              <div class="text-sm text-gray-500">
                                <span class="text-blue-500">{{ item.vip_nickname }}</span>
                                <span class="mx-1">·</span>
                                <span [class]="item.operation === '新增' || item.operation === '加仓' ? 'text-green-600' : 'text-red-600'">{{ item.operation }}</span>
                              </div>
                            </div>
                          </div>
                          <div class="text-xs text-gray-400">{{ formatTime(item.created_at) }}</div>
                        </div>
                      </div>
                    }
                  </div>
                }
              } @else if (timeline.length === 0) {
                <div class="text-center py-12 text-gray-400">
                  <p class="text-lg">暂无数据</p>
                  <p class="text-sm mt-2">关注一些大V后，这里会显示他们的最新动态</p>
                  <a routerLink="/vip" class="text-blue-500 hover:underline mt-4 inline-block">→ 添加大V</a>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (item of timeline; track item.id) {
                    <div class="border border-gray-100 rounded-lg p-4 hover:border-gray-200 hover:shadow-sm transition bg-white">
                      <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                          👤
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-gray-800">{{ item.vip_nickname || '大V' }}</div>
                          <div class="text-xs text-gray-400">{{ formatTime(item.created_at) }}</div>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-gray-400">
                          @if (item.like_count > 0) {
                            <span>👍 {{ item.like_count }}</span>
                          }
                          @if (item.reply_count > 0) {
                            <span>💬 {{ item.reply_count }}</span>
                          }
                        </div>
                      </div>
                      
                      <!-- 富文本内容渲染 -->
                      <div class="text-gray-700 text-sm leading-relaxed rich-text" [innerHTML]="item.text | richText"></div>
                      
                      <!-- 脱水解读（服务端自动分析） -->
                      @if (item.analysis) {
                        <div class="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                          <div class="flex items-center gap-2 mb-3">
                            <span class="text-lg">🧠</span>
                            <span class="font-medium text-gray-800">脱水解读</span>
                            @if (item.analysis._cached) {
                              <span class="text-xs text-gray-400 ml-1">📦缓存</span>
                            }
                            @if (item.analysis.overallAttitude) {
                              <span class="ml-auto text-xs px-2 py-1 rounded-full"
                                [class]="item.analysis.overallAttitude.includes('看多') ? 'bg-green-100 text-green-700' : 
                                        item.analysis.overallAttitude.includes('看空') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'">
                                {{ item.analysis.overallAttitude }}
                              </span>
                            }
                          </div>
                          
                          @if (item.analysis.error) {
                            <div class="text-red-500 text-sm">{{ item.analysis.error }}</div>
                          } @else {
                            @if (item.analysis.coreViewpoint) {
                              <div class="mb-3">
                                <div class="text-xs text-gray-500 mb-1">💡 核心观点</div>
                                <div class="text-gray-800 font-medium">{{ item.analysis.coreViewpoint }}</div>
                              </div>
                            }
                            
                            @if (item.analysis.relatedStocks?.length) {
                              <div class="mb-3">
                                <div class="text-xs text-gray-500 mb-1">📊 相关股票</div>
                                <div class="flex flex-wrap gap-2">
                                  @for (stock of item.analysis.relatedStocks; track stock.code) {
                                    <span class="text-xs px-2 py-1 rounded bg-white border"
                                      [class]="stock.attitude.includes('看多') ? 'border-green-300 text-green-700' : 
                                              stock.attitude.includes('看空') ? 'border-red-300 text-red-700' : 'border-gray-300 text-gray-600'">
                                      {{ stock.name }} <span class="opacity-60">{{ stock.attitude }}</span>
                                    </span>
                                  }
                                </div>
                              </div>
                            }
                            
                            @if (item.analysis.positionSignals?.length) {
                              <div class="mb-3">
                                <div class="text-xs text-gray-500 mb-1">📡 持仓信号</div>
                                <div class="space-y-1">
                                  @for (signal of item.analysis.positionSignals; track signal.stock) {
                                    <div class="text-sm flex items-center gap-2">
                                      <span class="px-1.5 py-0.5 rounded text-xs"
                                        [class]="signal.operation === '新增' || signal.operation === '加仓' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                                        {{ signal.operation }}
                                      </span>
                                      <span>{{ signal.stock }}</span>
                                      @if (signal.basis) {
                                        <span class="text-gray-400 text-xs">- {{ signal.basis }}</span>
                                      }
                                    </div>
                                  }
                                </div>
                              </div>
                            }
                            
                            @if (item.analysis.keyLogic?.length) {
                              <div class="mb-3">
                                <div class="text-xs text-gray-500 mb-1">🔗 逻辑链条</div>
                                <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  @for (logic of item.analysis.keyLogic; track $index) {
                                    <li>{{ logic }}</li>
                                  }
                                </ul>
                              </div>
                            }
                            
                            @if (item.analysis.riskWarnings?.length) {
                              <div class="mb-3 bg-red-50 p-2 rounded">
                                <div class="text-xs font-medium text-red-700 mb-1">⚠️ 风险提示</div>
                                <ul class="list-disc list-inside text-xs text-red-600 space-y-1">
                                  @for (risk of item.analysis.riskWarnings; track $index) {
                                    <li>{{ risk }}</li>
                                  }
                                </ul>
                              </div>
                            }
                            
                            @if (item.analysis.summary) {
                              <div class="mt-3 pt-3 border-t border-blue-100">
                                <div class="text-xs text-gray-500 mb-1">📝 脱水总结</div>
                                <div class="text-gray-700 text-sm">{{ item.analysis.summary }}</div>
                              </div>
                            }
                          }
                        </div>
                      }
                      
                      <div class="mt-3 flex justify-end">
                        <a [href]="item.link" target="_blank" class="text-xs text-blue-500 hover:underline">
                          查看原文 →
                        </a>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- 最后更新时间 -->
          <div class="text-center text-xs text-gray-400 py-2">
            最后更新: {{ lastUpdate }} | 数据来源于雪球，仅供参考
          </div>
          <div class="text-center text-xs text-gray-300 py-1">
            Build: {{ buildTime }}
          </div>
        </main>
      </div>
    </div>

    <!-- Cookie配置弹窗 -->
    @if (showCookieModal) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" (click)="showCookieModal = false">
        <div class="bg-white rounded-lg p-6 w-full max-w-lg" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">配置雪球 Cookie</h3>
            <button (click)="showCookieModal = false" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-600 mb-1">Cookie 内容</label>
              <textarea 
                [(ngModel)]="cookieInput"
                rows="5"
                placeholder="粘贴从浏览器获取的雪球 Cookie..."
                class="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
            </div>
            
            <div class="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p class="font-medium mb-1">获取方法：</p>
              <ol class="list-decimal list-inside space-y-1">
                <li>登录雪球网页 (xueqiu.com)</li>
                <li>按 F12 打开开发者工具</li>
                <li>切换到 Network 标签</li>
                <li>刷新页面，找任意请求</li>
                <li>复制请求头中的 Cookie 值</li>
              </ol>
            </div>
            
            <button 
              (click)="saveCookie()"
              [disabled]="!cookieInput.trim()"
              class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              保存到浏览器
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host ::ng-deep .rich-text {
      word-break: break-word;
    }
    :host ::ng-deep .rich-text p {
      margin: 0.5rem 0;
    }
    :host ::ng-deep .rich-text a {
      color: #3b82f6;
      text-decoration: underline;
    }
    :host ::ng-deep .rich-text a:hover {
      color: #2563eb;
    }
    :host ::ng-deep .rich-text br {
      display: block;
      content: "";
      margin-top: 0.5rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  myVips: VIPUser[] = [];
  
  // 构建时间戳
  buildTime = '2026-03-16 23:40';
  
  // 筛选状态
  selectedVipId: string | number = 'all';
  timeRange = '7d';
  activeTab = 'timeline';
  
  // 数据
  timeline: Status[] = [];
  holdings: HoldingChange[] = [];
  loading = false;
  lastUpdate = '--';
  cacheTime = '';
  
  // Cookie
  cookieStatus = false;
  showCookieModal = false;
  cookieInput = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCookieFromBrowser();
    this.loadMyVips();
  }

  loadCookieFromBrowser() {
    const savedCookie = localStorage.getItem('xueqiu_cookie');
    this.cookieStatus = !!savedCookie;
  }

  saveCookie() {
    if (!this.cookieInput.trim()) return;
    
    localStorage.setItem('xueqiu_cookie', this.cookieInput.trim());
    this.cookieStatus = true;
    this.showCookieModal = false;
    this.cookieInput = '';
    
    this.loadData();
  }

  loadMyVips() {
    this.http.get<VIPUser[]>('/api/vip').subscribe({
      next: (vips) => {
        this.myVips = vips;
        this.loadData();
      },
      error: () => {}
    });
  }

  loadData() {
    switch (this.activeTab) {
      case 'timeline':
        this.loadTimeline();
        break;
      case 'holdings':
        this.loadHoldings();
        break;
    }
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.timeline = [];
    this.loadData();
  }

  onFilterChange() {
    this.loadData();
  }

  loadTimeline(forceRefresh: boolean = false) {
    if (this.myVips.length === 0) {
      this.timeline = [];
      return;
    }

    this.loading = true;
    this.timeline = [];
    this.cacheTime = '';
    
    const cookie = localStorage.getItem('xueqiu_cookie') || '';
    
    // 确定要加载的大V
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

    // 调用聚合接口（超时60秒）
    this.http.post<any>('/api/vip/fetch-all-timeline', {
      vip_ids: vipIds,
      count: 10,
      cookie: cookie,
      force_refresh: forceRefresh
    }).pipe(
      timeout(60000), // 60秒超时
      catchError(err => {
        console.error('请求超时或失败', err);
        return of({ statuses: [], total: 0 });
      })
    ).subscribe({
      next: (result) => {
        this.timeline = this.filterByTime(result.statuses || []);
        this.cacheTime = result._cache_time || '';
        this.loading = false;
        this.updateLastTime();
      },
      error: (err) => {
        console.error('加载时间线失败', err);
        this.loading = false;
        this.timeline = [];
      }
    });
  }

  refreshTimeline() {
    this.loadTimeline(true); // 强制刷新
  }

  finishTimelineLoading(statuses: Status[], loaded: number, total: number) {
    if (loaded === total) {
      statuses.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      });
      
      this.timeline = this.filterByTime(statuses);
      this.loading = false;
      this.updateLastTime();
    }
  }

  loadHoldings() {
    this.loading = true;
    this.holdings = [];
    
    const cookie = localStorage.getItem('xueqiu_cookie') || '';
    
    this.http.post<HoldingChange[]>('/api/vip/fetch-holdings', {
      cookie: cookie
    }).subscribe({
      next: (holdings) => {
        this.holdings = holdings;
        this.loading = false;
        this.updateLastTime();
      },
      error: () => {
        this.loading = false;
        // 如果API失败，显示空数据
        this.holdings = [];
      }
    });
  }

  filterByTime(statuses: Status[]): Status[] {
    const now = new Date();
    const ranges: { [key: string]: number } = {
      'today': 1,
      '3d': 3,
      '7d': 7,
      '30d': 30
    };
    
    const days = ranges[this.timeRange] || 7;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return statuses.filter(s => new Date(s.created_at) >= cutoff);
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

  updateLastTime() {
    this.lastUpdate = new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}