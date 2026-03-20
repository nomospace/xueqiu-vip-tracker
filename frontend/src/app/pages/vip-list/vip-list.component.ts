import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface VIPUser {
  id: number;
  xueqiu_id: string;
  nickname: string;
  avatar: string | null;
  followers: number;
  description: string | null;
  created_at?: string;
}

@Component({
  selector: 'app-vip-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 pb-16">
      <!-- ========== 固定顶部导航栏 ========== -->
      <header class="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <!-- 品牌 Logo -->
            <div class="flex items-center gap-2">
              <a routerLink="/" class="flex items-center gap-2">
                <img src="assets/favicon.svg" alt="脱水雪球" class="w-8 h-8 rounded-lg">
                <span class="font-bold text-lg">脱水雪球</span>
              </a>
            </div>
            
            <!-- 添加大V按钮 -->
            <button 
              (click)="showAddModal = true"
              class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition">
              <span>+</span>
              <span>添加</span>
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
               class="flex-shrink-0 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-t-lg transition">
              ⭐ 自选变更
            </a>
            <a routerLink="/vip" 
               class="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition bg-white/20">
              👥 大V管理
            </a>
          </nav>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <!-- ========== 统计卡片 ========== -->
        <section class="grid grid-cols-2 gap-3">
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <div class="text-2xl mb-1">👥</div>
            <div class="text-2xl font-bold text-blue-600">{{ vips.length }}</div>
            <div class="text-xs text-slate-500">已关注大V</div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <div class="text-2xl mb-1">🆕</div>
            <div class="text-2xl font-bold text-green-600">{{ todayNew }}</div>
            <div class="text-xs text-slate-500">今日新增</div>
          </div>
        </section>

        <!-- ========== 搜索框 ========== -->
        <section class="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
          <div class="relative">
            <input 
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              placeholder="搜索用户名或 UID..."
              class="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
        </section>

        <!-- ========== 大V列表 ========== -->
        @if (loading) {
          <div class="p-8 text-center">
            <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-slate-400 text-sm">加载中...</p>
          </div>
        } @else if (filteredVips.length === 0) {
          <!-- 空状态 -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div class="text-5xl mb-3">📭</div>
            <div class="text-slate-500 mb-2">暂无关注的大V</div>
            <div class="text-slate-400 text-sm mb-4">添加一些大V开始脱水之旅</div>
            <button 
              (click)="showAddModal = true"
              class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
              + 添加大V
            </button>
          </div>
        } @else {
          <!-- 大V卡片列表 -->
          <section class="space-y-3">
            @for (vip of filteredVips; track vip.id) {
              <article class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-4">
                  <!-- 头部：头像 + 昵称 -->
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                      @if (vip.avatar) {
                        <img [src]="vip.avatar" [alt]="vip.nickname" class="w-full h-full object-cover">
                      } @else {
                        <span>👤</span>
                      }
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-slate-800 truncate">{{ vip.nickname || '未知用户' }}</div>
                      <div class="text-xs text-slate-400">UID: {{ vip.xueqiu_id }}</div>
                    </div>
                  </div>
                  
                  <!-- 操作按钮 -->
                  <div class="flex gap-2">
                    <button 
                      (click)="openInXueqiu(vip.xueqiu_id)"
                      class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                      <span>🔗</span>
                      <span>雪球主页</span>
                    </button>
                    <button 
                      (click)="editVipName(vip)"
                      class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                      <span>✏️</span>
                      <span>编辑昵称</span>
                    </button>
                    <button 
                      (click)="unfollowVip(vip)"
                      class="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition">
                      <span>✕</span>
                    </button>
                  </div>
                </div>
              </article>
            }
          </section>
        }
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
          <a routerLink="/watchlist" class="flex flex-col items-center py-1 px-3 text-slate-500">
            <span class="text-xl">⭐</span>
            <span class="text-xs mt-0.5">自选</span>
          </a>
          <a routerLink="/vip" class="flex flex-col items-center py-1 px-3 text-blue-600">
            <span class="text-xl">👥</span>
            <span class="text-xs mt-0.5">大V</span>
          </a>
        </div>
      </nav>

      <!-- ========== 添加大V弹窗 ========== -->
      @if (showAddModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="showAddModal = false">
          <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">添加大V</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">雪球用户 ID 或主页链接</label>
                <input 
                  type="text"
                  [(ngModel)]="addInput"
                  placeholder="例如: 6876843497 或 https://xueqiu.com/u/6876843497"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <p class="text-xs text-slate-400 mt-2">可从雪球个人主页地址栏获取用户ID</p>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button 
                (click)="showAddModal = false"
                class="px-4 py-2 text-slate-600 hover:text-slate-800 transition text-sm">
                取消
              </button>
              <button 
                (click)="addVip()"
                [disabled]="adding || !addInput.trim()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50">
                {{ adding ? '添加中...' : '添加' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ========== 编辑昵称弹窗 ========== -->
      @if (showEditModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="showEditModal = false">
          <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">修改昵称</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">用户昵称</label>
                <input 
                  type="text"
                  [(ngModel)]="editNickname"
                  placeholder="输入新的昵称"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button 
                (click)="showEditModal = false"
                class="px-4 py-2 text-slate-600 hover:text-slate-800 transition text-sm">
                取消
              </button>
              <button 
                (click)="saveEditNickname()"
                [disabled]="savingEdit || !editNickname.trim()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50">
                {{ savingEdit ? '保存中...' : '保存' }}
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
export class VipListComponent implements OnInit {
  vips: VIPUser[] = [];
  filteredVips: VIPUser[] = [];
  loading = true;
  adding = false;
  
  // 搜索
  searchQuery = '';
  
  // 统计
  todayNew = 0;
  
  // 弹窗
  showAddModal = false;
  addInput = '';
  
  // 编辑昵称
  showEditModal = false;
  editVipId: number | null = null;
  editNickname = '';
  savingEdit = false;
  
  // Toast
  toastMessage = '';
  toastType = 'success';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadVips();
  }

  loadVips() {
    this.loading = true;
    this.http.get<VIPUser[]>('/api/vip').subscribe({
      next: (vips) => {
        this.vips = vips;
        this.filteredVips = vips;
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('加载失败', err);
        this.loading = false;
        this.showToast('加载失败，请重试', 'error');
      }
    });
  }

  calculateStats() {
    const today = new Date().toDateString();
    this.todayNew = this.vips.filter(v => {
      if (!v.created_at) return false;
      return new Date(v.created_at).toDateString() === today;
    }).length;
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredVips = this.vips;
      return;
    }
    
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredVips = this.vips.filter(v => 
      v.nickname?.toLowerCase().includes(query) || 
      v.xueqiu_id?.includes(query)
    );
  }

  editVipName(vip: VIPUser) {
    this.editVipId = vip.id;
    this.editNickname = vip.nickname || '';
    this.showEditModal = true;
  }

  saveEditNickname() {
    if (!this.editNickname.trim() || !this.editVipId) return;
    
    this.savingEdit = true;
    this.http.patch(`/api/vip/${this.editVipId}`, { nickname: this.editNickname.trim() }).subscribe({
      next: () => {
        this.savingEdit = false;
        this.showEditModal = false;
        this.showToast('昵称已更新');
        this.loadVips();
      },
      error: (err) => {
        this.savingEdit = false;
        this.showToast(err.error?.detail || '更新失败', 'error');
      }
    });
  }

  addVip() {
    if (!this.addInput.trim()) return;
    
    // 从输入中提取用户ID
    let userId = this.addInput.trim();
    const match = userId.match(/xueqiu\.com\/u\/(\d+)/);
    if (match) {
      userId = match[1];
    }
    
    this.adding = true;
    this.http.post('/api/vip', { xueqiu_id: userId }).subscribe({
      next: () => {
        this.adding = false;
        this.showAddModal = false;
        this.addInput = '';
        this.showToast('添加成功');
        this.loadVips();
      },
      error: (err) => {
        this.adding = false;
        this.showToast(err.error?.detail || '添加失败', 'error');
      }
    });
  }

  unfollowVip(vip: VIPUser) {
    if (!confirm(`确定取关 ${vip.nickname}？`)) return;
    
    this.http.delete(`/api/vip/${vip.id}`).subscribe({
      next: () => {
        this.showToast('已取关');
        this.loadVips();
      },
      error: () => {
        this.showToast('操作失败', 'error');
      }
    });
  }

  openInXueqiu(xueqiu_id: string) {
    window.open(`https://xueqiu.com/u/${xueqiu_id}`, '_blank');
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => this.toastMessage = '', 3000);
  }
}