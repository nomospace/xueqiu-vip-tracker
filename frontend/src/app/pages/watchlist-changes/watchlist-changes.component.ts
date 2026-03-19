import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface WatchlistChange {
  id: number;
  vip_id: number;
  vip_nickname: string;
  stock_code: string;
  stock_name: string;
  market: string;
  change_type: 'add' | 'remove';
  detected_date: string;
  detected_at: string;
}

interface SyncResult {
  vip_id: number;
  vip_nickname: string;
  success: boolean;
  total_count?: number;
  added_count?: number;
  removed_count?: number;
  message?: string;
}

@Component({
  selector: 'app-watchlist-changes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 pb-16">
      <!-- ========== 固定顶部导航栏 ========== -->
      <header class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <!-- 品牌 -->
            <div class="flex items-center gap-2">
              <a routerLink="/" class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">📊</a>
              <span class="font-bold text-lg">脱水雪球</span>
            </div>
            
            <!-- 同步按钮 -->
            <button 
              (click)="showSyncModal = true"
              class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition">
              <span>🔄</span>
              <span>同步自选</span>
            </button>
          </div>
          
          <!-- 顶部导航 Tab（移动端隐藏，由底部 Tab 替代） -->
          <nav class="hidden sm:flex gap-1 mt-3 -mb-2 overflow-x-auto">
            <a routerLink="/" 
               class="flex-shrink-0 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-t-lg transition">
              📅 时间线
            </a>
            <a routerLink="/summary" 
               class="flex-shrink-0 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-t-lg transition">
              📊 今日摘要
            </a>
            <a routerLink="/watchlist" 
               class="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition bg-white/20">
              ⭐ 自选变更
            </a>
            <a routerLink="/vip" 
               class="flex-shrink-0 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-t-lg transition">
              👥 大V管理
            </a>
          </nav>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <!-- ========== 统计卡片 ========== -->
        <section class="grid grid-cols-3 gap-3">
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{{ addedCount }}</div>
            <div class="text-xs text-slate-500 mt-1">新增关注</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <div class="text-2xl font-bold text-red-600">{{ removedCount }}</div>
            <div class="text-xs text-slate-500 mt-1">取消关注</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <div class="text-2xl font-bold text-blue-600">{{ vipCount }}</div>
            <div class="text-xs text-slate-500 mt-1">变更大V</div>
          </div>
        </section>

        <!-- ========== 筛选栏 ========== -->
        <section class="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">筛选范围</span>
            <select 
              [(ngModel)]="days"
              (change)="loadChanges()"
              class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1">今日</option>
              <option value="7">近7天</option>
              <option value="30">近30天</option>
            </select>
          </div>
        </section>

        <!-- ========== 变更列表 ========== -->
        @if (loading) {
          <div class="p-8 text-center">
            <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-slate-400 text-sm">加载中...</p>
          </div>
        } @else if (changes.length === 0) {
          <!-- 空状态 -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div class="text-5xl mb-3">📭</div>
            <div class="text-slate-500 mb-2">暂无自选变更记录</div>
            <div class="text-slate-400 text-sm mb-4">同步大V自选股后将显示变更</div>
            <button 
              (click)="showSyncModal = true"
              class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
              🔄 同步自选股
            </button>
          </div>
        } @else {
          <!-- 变更卡片列表 -->
          <section class="space-y-3">
            @for (change of changes; track change.id) {
              <article class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-4">
                  <!-- 头部：变更类型 + 股票信息 -->
                  <div class="flex items-center gap-3 mb-3">
                    <div 
                      class="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                      [class]="change.change_type === 'add' ? 'bg-green-100' : 'bg-red-100'">
                      {{ change.change_type === 'add' ? '➕' : '➖' }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-slate-800">{{ change.stock_name }}</span>
                        <span class="text-xs text-slate-400">{{ change.stock_code }}</span>
                        @if (change.market) {
                          <span class="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                            {{ change.market }}
                          </span>
                        }
                      </div>
                      <div class="text-sm text-slate-500 mt-1">
                        <span [class]="change.change_type === 'add' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
                          {{ change.change_type === 'add' ? '新增关注' : '取消关注' }}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 底部：大V信息 + 时间 -->
                  <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">👤</div>
                      <a [routerLink]="['/vip', change.vip_id]" class="text-sm text-blue-600 hover:underline">
                        {{ change.vip_nickname || '未知大V' }}
                      </a>
                    </div>
                    <span class="text-xs text-slate-400">{{ change.detected_date }}</span>
                  </div>
                </div>
              </article>
            }
          </section>
        }

        <!-- 底部说明 -->
        <div class="text-center text-xs text-slate-400 py-2">
          数据来源于雪球大V自选股 · 仅追踪沪深股票
        </div>
      </main>

      <!-- ========== 底部 Tab 栏（移动端） ========== -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 sm:hidden">
        <div class="flex justify-around py-2">
          <a routerLink="/" class="flex flex-col items-center py-1 px-3 text-slate-500">
            <span class="text-xl">📅</span>
            <span class="text-xs mt-0.5">时间线</span>
          </a>
          <a routerLink="/summary" class="flex flex-col items-center py-1 px-3 text-slate-500">
            <span class="text-xl">📊</span>
            <span class="text-xs mt-0.5">摘要</span>
          </a>
          <a routerLink="/watchlist" class="flex flex-col items-center py-1 px-3 text-blue-600">
            <span class="text-xl">⭐</span>
            <span class="text-xs mt-0.5">自选</span>
          </a>
          <a routerLink="/vip" class="flex flex-col items-center py-1 px-3 text-slate-500">
            <span class="text-xl">👥</span>
            <span class="text-xs mt-0.5">大V</span>
          </a>
        </div>
      </nav>

      <!-- ========== 同步弹窗 ========== -->
      @if (showSyncModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="showSyncModal = false">
          <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">🔄 同步自选股</h3>
            
            <!-- 限制说明 -->
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div class="text-amber-800 text-sm font-medium mb-1">⚠️ 功能限制</div>
              <div class="text-amber-700 text-xs">
                雪球自选股是用户私有数据，API 无法直接获取他人自选股。
                需要使用<strong>大V自己的 Cookie</strong> 才能同步。
              </div>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">大V的雪球 Cookie</label>
                <textarea 
                  [(ngModel)]="cookieInput"
                  rows="4"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="需要大V登录后的 Cookie（包含 xq_a_token 和 u）"></textarea>
                <p class="text-xs text-slate-400 mt-2">
                  让大V从浏览器开发者工具复制 Cookie 给你
                </p>
              </div>
              
              @if (syncResults.length > 0) {
                <div class="bg-slate-50 rounded-lg p-3 max-h-48 overflow-auto">
                  <div class="text-sm font-medium text-slate-700 mb-2">同步结果：</div>
                  @for (result of syncResults; track result.vip_id) {
                    <div class="text-sm py-1.5 border-b border-slate-200 last:border-0 flex justify-between">
                      <span class="font-medium">{{ result.vip_nickname }}</span>
                      @if (result.success) {
                        <span class="text-green-600 text-xs">
                          {{ result.total_count }}只 
                          @if (result.added_count) { <span class="text-green-500">+{{ result.added_count }}</span> }
                          @if (result.removed_count) { <span class="text-red-500">-{{ result.removed_count }}</span> }
                        </span>
                      } @else {
                        <span class="text-red-500 text-xs">{{ result.message || '失败' }}</span>
                      }
                    </div>
                  }
                </div>
              }
              
              @if (syncing) {
                <div class="text-center py-3">
                  <div class="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  <span class="text-sm text-slate-500">同步中...</span>
                </div>
              }
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button 
                (click)="closeSyncModal()"
                class="px-4 py-2 text-slate-600 hover:text-slate-800 transition text-sm">
                关闭
              </button>
              <button 
                (click)="syncAll()"
                [disabled]="syncing || !cookieInput.trim()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50">
                {{ syncing ? '同步中...' : '开始同步' }}
              </button>
            </div>
          </div>
        </div>
      }

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
export class WatchlistChangesComponent implements OnInit {
  days = '7';
  loading = false;
  changes: WatchlistChange[] = [];
  addedCount = 0;
  removedCount = 0;
  vipCount = 0;

  showSyncModal = false;
  cookieInput = '';
  syncing = false;
  syncResults: SyncResult[] = [];
  
  // Toast
  toastMessage = '';
  toastType = 'success';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadChanges();
  }

  loadChanges() {
    this.loading = true;
    
    this.http.get<any>(`/api/vip/watchlist/changes?days=${this.days}`).subscribe({
      next: (data) => {
        this.changes = data.changes || [];
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('加载变更失败:', err);
        this.loading = false;
        this.showToast('加载失败，请重试', 'error');
      }
    });
  }

  calculateStats() {
    this.addedCount = this.changes.filter(c => c.change_type === 'add').length;
    this.removedCount = this.changes.filter(c => c.change_type === 'remove').length;
    const vips = new Set(this.changes.map(c => c.vip_id));
    this.vipCount = vips.size;
  }

  syncAll() {
    if (!this.cookieInput.trim()) return;
    
    this.syncing = true;
    this.syncResults = [];
    
    this.http.post<any>('/api/vip/watchlist/sync-all', {
      cookie: this.cookieInput,
      cn_only: true
    }).subscribe({
      next: (data) => {
        this.syncing = false;
        if (data.success) {
          this.syncResults = data.results || [];
          this.loadChanges();
          this.showToast(`同步完成，新增 ${data.total_added} 只，删除 ${data.total_removed} 只`);
        } else {
          this.showToast(data.message || '同步失败', 'error');
        }
      },
      error: (err) => {
        this.syncing = false;
        this.showToast(err.error?.message || '同步失败', 'error');
      }
    });
  }

  closeSyncModal() {
    this.showSyncModal = false;
    this.syncResults = [];
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => this.toastMessage = '', 3000);
  }
}