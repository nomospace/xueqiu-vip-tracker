import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

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

          <!-- 数据类型 -->
          <div class="bg-white rounded-lg shadow-sm p-4">
            <h3 class="font-medium text-gray-700 mb-3">📊 数据类型</h3>
            <div class="space-y-1">
              <button 
                (click)="dataType = 'all'; onFilterChange()"
                [class]="dataType === 'all' ? 'w-full text-left px-3 py-2 rounded bg-blue-50 text-blue-600 text-sm' : 'w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-600 text-sm'">
                全部动态
              </button>
              <button 
                (click)="dataType = 'posts'; onFilterChange()"
                [class]="dataType === 'posts' ? 'w-full text-left px-3 py-2 rounded bg-blue-50 text-blue-600 text-sm' : 'w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-600 text-sm'">
                仅发言
              </button>
              <button 
                (click)="dataType = 'trades'; onFilterChange()"
                [class]="dataType === 'trades' ? 'w-full text-left px-3 py-2 rounded bg-blue-50 text-blue-600 text-sm' : 'w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-gray-600 text-sm'">
                仅交易
              </button>
            </div>
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
          <div class="bg-white rounded-lg shadow-sm p-4">
            <a 
              routerLink="/vip" 
              class="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition text-sm">
              + 添加大V
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
                📅 时间线
              </button>
              <button 
                (click)="switchTab('posts')"
                [class]="activeTab === 'posts' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                📝 发言
              </button>
              <button 
                (click)="switchTab('comments')"
                [class]="activeTab === 'comments' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                💬 评论回复
              </button>
              <button 
                (click)="switchTab('holdings')"
                [class]="activeTab === 'holdings' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
                📈 持仓变更
              </button>
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
                      
                      <!-- 脱水解读 -->
                      @if (getAnalysis(item.id)) {
                        <div class="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                          <div class="flex items-center gap-2 mb-3">
                            <span class="text-lg">🧠</span>
                            <span class="font-medium text-gray-800">脱水解读</span>
                            @if (getAnalysis(item.id)?.overallAttitude) {
                              <span class="ml-auto text-xs px-2 py-1 rounded-full"
                                [class]="getAnalysis(item.id)?.overallAttitude?.includes('看多') ? 'bg-green-100 text-green-700' : 
                                        getAnalysis(item.id)?.overallAttitude?.includes('看空') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'">
                                {{ getAnalysis(item.id)?.overallAttitude }}
                              </span>
                            }
                          </div>
                          
                          @if (getAnalysis(item.id)?.error) {
                            <div class="text-red-500 text-sm">{{ getAnalysis(item.id)?.error }}</div>
                          } @else {
                            @if (getAnalysis(item.id)?.coreViewpoint) {
                              <div class="mb-3">
                                <div class="text-xs text-gray-500 mb-1">核心观点</div>
                                <div class="text-gray-800 font-medium">{{ getAnalysis(item.id)?.coreViewpoint }}</div>
                              </div>
                            }
                            
                            @if (getAnalysis(item.id)?.relatedStocks?.length) {
                              <div class="mb-3">
                                <div class="text-xs text-gray-500 mb-1">相关股票</div>
                                <div class="flex flex-wrap gap-2">
                                  @for (stock of getAnalysis(item.id)?.relatedStocks; track stock.code) {
                                    <span class="text-xs px-2 py-1 rounded bg-white border"
                                      [class]="stock.attitude?.includes('看多') ? 'border-green-300 text-green-700' : 
                                              stock.attitude?.includes('看空') ? 'border-red-300 text-red-700' : 'border-gray-300 text-gray-600'">
                                      {{ stock.name }} <span class="opacity-60">{{ stock.attitude }}</span>
                                    </span>
                                  }
                                </div>
                              </div>
                            }
                            
                            @if (getAnalysis(item.id)?.positionSignals?.length) {
                              <div class="mb-3">
                                <div class="text-xs text-gray-500 mb-1">持仓信号</div>
                                <div class="space-y-1">
                                  @for (signal of getAnalysis(item.id)?.positionSignals; track signal.stock) {
                                    <div class="text-sm flex items-center gap-2">
                                      <span class="px-1.5 py-0.5 rounded text-xs"
                                        [class]="signal.operation === '新增' || signal.operation === '加仓' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                                        {{ signal.operation }}
                                      </span>
                                      <span>{{ signal.stock }}</span>
                                    </div>
                                  }
                                </div>
                              </div>
                            }
                            
                            @if (getAnalysis(item.id)?.summary) {
                              <div class="mt-3 pt-3 border-t border-blue-100">
                                <div class="text-xs text-gray-500 mb-1">脱水总结</div>
                                <div class="text-gray-700 text-sm">{{ getAnalysis(item.id)?.summary }}</div>
                              </div>
                            }
                          }
                        </div>
                      }
                      
                      <div class="mt-3 flex items-center justify-between">
                        <button 
                          (click)="analyzeStatus(item)"
                          [disabled]="analyzingId === item.id"
                          class="text-xs text-purple-500 hover:text-purple-600 disabled:opacity-50">
                          {{ analyzingId === item.id ? '🧠 分析中...' : getAnalysis(item.id) ? '🔄 重新解读' : '🧠 脱水解读' }}
                        </button>
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
  buildTime = '2026-03-16 22:24';
  
  // 筛选状态
  selectedVipId: string | number = 'all';
  dataType = 'all';
  timeRange = '7d';
  activeTab = 'timeline';
  
  // 数据
  timeline: Status[] = [];
  holdings: HoldingChange[] = [];
  loading = false;
  lastUpdate = '--';
  
  // AI分析
  analyzingId: string | null = null;
  analyses: Map<string, Analysis> = new Map();
  
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
      case 'posts':
        this.loadTimeline(0);
        break;
      case 'comments':
        this.loadComments();
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

  loadTimeline(statusType: number = 0) {
    if (this.myVips.length === 0) {
      this.timeline = [];
      return;
    }

    this.loading = true;
    this.timeline = [];
    
    const vipsToLoad = this.selectedVipId === 'all' 
      ? this.myVips 
      : this.myVips.filter(v => v.id === Number(this.selectedVipId));

    if (vipsToLoad.length === 0) {
      this.loading = false;
      return;
    }

    // 根据数据类型确定 status_type
    if (this.dataType === 'trades') {
      statusType = 11;
    }

    const allStatuses: Status[] = [];
    let loaded = 0;
    const cookie = localStorage.getItem('xueqiu_cookie') || '';
    
    for (const vip of vipsToLoad) {
      this.http.post<Status[]>('/api/vip/fetch-statuses', {
        user_id: vip.xueqiu_id,
        status_type: statusType,
        count: 10,
        cookie: cookie
      }).subscribe({
        next: (statuses) => {
          for (const s of statuses) {
            s.vip_nickname = vip.nickname;
            s.vip_id = vip.id;
            allStatuses.push(s);
          }
          loaded++;
          this.finishTimelineLoading(allStatuses, loaded, vipsToLoad.length);
        },
        error: () => {
          loaded++;
          this.finishTimelineLoading(allStatuses, loaded, vipsToLoad.length);
        }
      });
    }
  }

  loadComments() {
    if (this.myVips.length === 0) {
      this.timeline = [];
      return;
    }

    this.loading = true;
    this.timeline = [];
    
    const vipsToLoad = this.selectedVipId === 'all' 
      ? this.myVips 
      : this.myVips.filter(v => v.id === Number(this.selectedVipId));

    if (vipsToLoad.length === 0) {
      this.loading = false;
      return;
    }

    const allComments: Status[] = [];
    let loaded = 0;
    const cookie = localStorage.getItem('xueqiu_cookie') || '';
    
    for (const vip of vipsToLoad) {
      this.http.post<Status[]>('/api/vip/fetch-comments', {
        user_id: vip.xueqiu_id,
        count: 10,
        cookie: cookie
      }).subscribe({
        next: (comments) => {
          for (const c of comments) {
            c.vip_nickname = vip.nickname;
            c.vip_id = vip.id;
            allComments.push(c);
          }
          loaded++;
          this.finishTimelineLoading(allComments, loaded, vipsToLoad.length);
        },
        error: () => {
          loaded++;
          this.finishTimelineLoading(allComments, loaded, vipsToLoad.length);
        }
      });
    }
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

  // AI分析发言内容
  analyzeStatus(status: Status) {
    if (this.analyzingId === status.id) return;
    
    this.analyzingId = status.id;
    
    this.http.post<Analysis>('/api/vip/analyze', {
      text: status.text,
      title: status.title
    }).subscribe({
      next: (result) => {
        this.analyses.set(status.id, result);
        this.analyzingId = null;
      },
      error: () => {
        this.analyses.set(status.id, { error: '分析失败' });
        this.analyzingId = null;
      }
    });
  }

  getAnalysis(statusId: string): Analysis | undefined {
    return this.analyses.get(statusId);
  }
}