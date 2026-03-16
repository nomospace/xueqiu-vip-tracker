import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface VIPUser {
  id: number;
  xueqiu_id: string;
  nickname: string;
  avatar: string | null;
  followers: number;
  description: string | null;
}

// 预设热门大V
const PRESET_VIPS = [
  { xueqiu_id: '1247347543', nickname: '方三文', followers: 1200000 },
  { xueqiu_id: '1178668715', nickname: '不明真相的群众', followers: 850000 },
  { xueqiu_id: '2292705444', nickname: '省心省力啊', followers: 150000 },
  { xueqiu_id: '1233631554', nickname: '价值at风险', followers: 280000 },
  { xueqiu_id: '6876843497', nickname: '省心省力啊', followers: 120000 },
];

@Component({
  selector: 'app-vip-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部标题栏 -->
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-800">👥 大V管理</h1>
          <button 
            (click)="showAddModal = true"
            class="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
            + 添加大V
          </button>
        </div>
      </header>

      <div class="max-w-7xl mx-auto p-4">
        <!-- 已关注大V -->
        <div class="bg-white rounded-lg shadow-sm mb-6">
          <div class="p-4 border-b border-gray-100">
            <h2 class="font-medium text-gray-700">已关注 ({{ myVips.length }})</h2>
          </div>
          
          @if (loading) {
            <div class="p-8 text-center text-gray-400">加载中...</div>
          } @else if (myVips.length === 0) {
            <div class="p-8 text-center text-gray-400">
              <p>暂无关注的大V</p>
              <p class="text-sm mt-2">从下方热门大V库添加，或手动输入雪球ID</p>
            </div>
          } @else {
            <div class="divide-y divide-gray-50">
              @for (vip of myVips; track vip.id) {
                <div class="p-4 hover:bg-gray-50 transition">
                  <div class="flex items-center justify-between">
                    <a [routerLink]="['/vip', vip.id]" class="flex items-center gap-3 flex-1">
                      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                        👤
                      </div>
                      <div>
                        <div class="font-medium text-gray-800">{{ vip.nickname }}</div>
                        <div class="text-sm text-gray-500">{{ vip.followers | number }} 粉丝</div>
                      </div>
                    </a>
                    <button 
                      (click)="removeVip(vip.id)"
                      class="text-sm text-red-500 hover:text-red-600">
                      取消关注
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- 热门大V库 -->
        <div class="bg-white rounded-lg shadow-sm">
          <div class="p-4 border-b border-gray-100">
            <h2 class="font-medium text-gray-700">🔥 热门大V库</h2>
            <p class="text-xs text-gray-400 mt-1">一键添加雪球热门投资者</p>
          </div>
          
          <div class="divide-y divide-gray-50">
            @for (vip of presetVips; track vip.xueqiu_id) {
              <div class="p-4 hover:bg-gray-50 transition">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                      👤
                    </div>
                    <div>
                      <div class="font-medium text-gray-800">{{ vip.nickname }}</div>
                      <div class="text-sm text-gray-500">
                        {{ vip.followers | number }} 粉丝
                      </div>
                    </div>
                  </div>
                  <button 
                    (click)="addPresetVip(vip)"
                    [disabled]="isAdded(vip.xueqiu_id)"
                    [class]="isAdded(vip.xueqiu_id) ? 'text-sm text-gray-400' : 'text-sm text-blue-500 hover:text-blue-600'">
                    {{ isAdded(vip.xueqiu_id) ? '已关注' : '+ 关注' }}
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- 添加大V弹窗 -->
    @if (showAddModal) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" (click)="showAddModal = false">
        <div class="bg-white rounded-lg p-6 w-full max-w-md" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">添加大V</h3>
            <button (click)="showAddModal = false" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-600 mb-1">雪球用户ID</label>
              <input 
                type="text" 
                [(ngModel)]="newVipId"
                placeholder="例如: 1247347543"
                class="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <p class="text-xs text-gray-400 mt-1">可在雪球用户主页URL中找到</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-600 mb-1">昵称（可选）</label>
              <input 
                type="text" 
                [(ngModel)]="newVipName"
                placeholder="留空将自动获取"
                class="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
            </div>
            
            <button 
              (click)="addVip()"
              [disabled]="adding || !newVipId.trim()"
              class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {{ adding ? '添加中...' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class VipListComponent implements OnInit {
  myVips: VIPUser[] = [];
  presetVips = PRESET_VIPS;
  loading = false;
  
  showAddModal = false;
  newVipId = '';
  newVipName = '';
  adding = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadMyVips();
  }

  loadMyVips() {
    this.loading = true;
    this.http.get<VIPUser[]>('/api/vip').subscribe({
      next: (vips) => {
        this.myVips = vips;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  isAdded(xueqiuId: string): boolean {
    return this.myVips.some(v => v.xueqiu_id === xueqiuId);
  }

  addPresetVip(vip: typeof PRESET_VIPS[0]) {
    if (this.isAdded(vip.xueqiu_id)) return;
    
    const cookie = localStorage.getItem('xueqiu_cookie') || '';
    
    this.http.post<VIPUser>('/api/vip', {
      xueqiu_id: vip.xueqiu_id,
      nickname: vip.nickname,
      followers: vip.followers,
      cookie: cookie
    }).subscribe({
      next: (newVip) => {
        this.myVips.push(newVip);
      },
      error: (err) => {
        alert('添加失败: ' + (err.error?.detail || err.message));
      }
    });
  }

  addVip() {
    if (!this.newVipId.trim()) return;
    
    this.adding = true;
    const cookie = localStorage.getItem('xueqiu_cookie') || '';
    
    this.http.post<VIPUser>('/api/vip', {
      xueqiu_id: this.newVipId.trim(),
      nickname: this.newVipName.trim() || null,
      cookie: cookie
    }).subscribe({
      next: (vip) => {
        this.myVips.push(vip);
        this.showAddModal = false;
        this.newVipId = '';
        this.newVipName = '';
        this.adding = false;
      },
      error: (err) => {
        this.adding = false;
        alert('添加失败: ' + (err.error?.detail || err.message));
      }
    });
  }

  removeVip(vipId: number) {
    if (!confirm('确定要取消关注吗？')) return;
    
    this.http.delete(`/api/vip/${vipId}`).subscribe({
      next: () => {
        this.myVips = this.myVips.filter(v => v.id !== vipId);
      },
      error: () => {
        alert('操作失败');
      }
    });
  }
}