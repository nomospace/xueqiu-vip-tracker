import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VipService, VIPUser } from '../../services/vip.service';

@Component({
  selector: 'app-vip-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  providers: [],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-800">👤 大V列表</h1>
        <button 
          (click)="showAddModal = true" 
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + 添加大V
        </button>
      </div>

      <!-- 空状态 -->
      @if (vips.length === 0 && !loading) {
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <div class="text-gray-400 text-6xl mb-4">👤</div>
          <p class="text-gray-500 text-lg">暂无大V，点击右上角添加</p>
        </div>
      }

      <!-- 加载状态 -->
      @if (loading) {
        <div class="text-center py-12">
          <div class="text-gray-400 text-lg">加载中...</div>
        </div>
      }

      <!-- 大V列表 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        @for (vip of vips; track vip.id) {
          <a [routerLink]="['/vip', vip.id]" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer block relative group">
            <button 
              (click)="deleteVip($event, vip.id)" 
              class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1">
              ✕
            </button>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl overflow-hidden">
                @if (vip.avatar) {
                  <img [src]="vip.avatar" [alt]="vip.nickname" class="w-full h-full object-cover">
                } @else {
                  👤
                }
              </div>
              <div class="flex-1">
                <div class="font-bold text-lg">{{ vip.nickname }}</div>
                <div class="text-gray-500 text-sm">{{ formatFollowers(vip.followers) }} 粉丝</div>
              </div>
            </div>
            <div class="mt-4 text-gray-600 text-sm line-clamp-2">{{ vip.description || '暂无简介' }}</div>
          </a>
        }
      </div>

      <!-- 添加大V弹窗 -->
      @if (showAddModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="showAddModal = false">
          <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4" (click)="$event.stopPropagation()">
            <h2 class="text-xl font-bold mb-4">添加大V</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">雪球用户ID <span class="text-red-500">*</span></label>
                <input 
                  type="text" 
                  [(ngModel)]="newXueqiuId"
                  placeholder="输入雪球用户ID，如: 1234567890"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                <p class="text-xs text-gray-500 mt-1">可在雪球用户主页URL中找到ID</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                <input 
                  type="text" 
                  [(ngModel)]="newNickname"
                  placeholder="输入大V昵称（可选）"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">粉丝数</label>
                <input 
                  type="number" 
                  [(ngModel)]="newFollowers"
                  placeholder="输入粉丝数（可选）"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
              
              @if (addError) {
                <p class="text-red-500 text-sm">{{ addError }}</p>
              }
              
              <div class="flex gap-3 justify-end">
                <button 
                  (click)="showAddModal = false"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800 transition">
                  取消
                </button>
                <button 
                  (click)="addVip()"
                  [disabled]="adding || !newXueqiuId.trim()"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {{ adding ? '添加中...' : '添加' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class VipListComponent implements OnInit {
  vips: VIPUser[] = [];
  loading = false;
  showAddModal = false;
  newXueqiuId = '';
  newNickname = '';
  newFollowers: number | null = null;
  adding = false;
  addError = '';

  constructor(private vipService: VipService) {}

  ngOnInit() {
    this.loadVips();
  }

  loadVips() {
    this.loading = true;
    this.vipService.getVipList().subscribe({
      next: (data) => {
        this.vips = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('加载大V列表失败', err);
        this.loading = false;
      }
    });
  }

  addVip() {
    if (!this.newXueqiuId.trim()) return;
    
    this.adding = true;
    this.addError = '';
    
    this.vipService.addVip(
      this.newXueqiuId.trim(), 
      this.newNickname.trim() || undefined,
      this.newFollowers || undefined
    ).subscribe({
      next: (vip) => {
        this.vips.unshift(vip);
        this.showAddModal = false;
        this.newXueqiuId = '';
        this.newNickname = '';
        this.newFollowers = null;
        this.adding = false;
      },
      error: (err) => {
        this.addError = err.error?.detail || '添加失败，请检查用户ID';
        this.adding = false;
      }
    });
  }

  deleteVip(event: Event, id: number) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!confirm('确定要删除这个大V吗？')) return;
    
    this.vipService.deleteVip(id).subscribe({
      next: () => {
        this.vips = this.vips.filter(v => v.id !== id);
      },
      error: (err) => {
        console.error('删除失败', err);
        alert('删除失败');
      }
    });
  }

  formatFollowers(count: number): string {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    }
    return count.toString();
  }
}