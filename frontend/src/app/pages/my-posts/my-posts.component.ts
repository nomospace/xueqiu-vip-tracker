import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { VipService } from '../../services/vip.service';

interface MyInfo {
  user_id: string;
  screen_name: string;
  avatar: string;
  followers_count: number;
  friends_count: number;
  description: string;
}

interface MyStatus {
  id: string;
  user_id: string;
  text: string;
  title: string;
  link: string;
  created_at: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
}

@Component({
  selector: 'app-my-posts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部标题栏 -->
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center gap-4">
          <a routerLink="/" class="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <span>←</span>
            <span>返回首页</span>
          </a>
          <span class="text-gray-300">|</span>
          <h1 class="text-xl font-bold text-gray-800">📝 我的帖子</h1>
        </div>
      </header>

      <div class="max-w-7xl mx-auto p-4 space-y-6">
      <!-- 用户信息 -->
      @if (myInfo) {
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl overflow-hidden">
              @if (myInfo.avatar) {
                <img [src]="myInfo.avatar" [alt]="myInfo.screen_name" class="w-full h-full object-cover">
              } @else {
                👤
              }
            </div>
            <div>
              <h1 class="text-xl font-bold">{{ myInfo.screen_name }}</h1>
              <div class="text-sm text-gray-500">
                {{ myInfo.followers_count | number }} 粉丝 · 
                {{ myInfo.friends_count | number }} 关注
              </div>
              @if (myInfo.description) {
                <div class="text-sm text-gray-600 mt-1">{{ myInfo.description }}</div>
              }
            </div>
          </div>
        </div>
      } @else if (notLoggedIn) {
        <div class="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div class="text-yellow-800">⚠️ 请先配置雪球 Cookie</div>
          <div class="text-yellow-600 text-sm mt-2">在设置页面添加 Cookie 后即可查看您的帖子</div>
        </div>
      }

      <!-- Tab 切换 -->
      <div class="bg-white rounded-lg shadow">
        <div class="flex border-b">
          <button 
            (click)="activeTab = 'posts'; loadStatuses(0)" 
            [class]="activeTab === 'posts' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
            📝 我的帖子
          </button>
          <button 
            (click)="activeTab = 'trades'; loadStatuses(11)" 
            [class]="activeTab === 'trades' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
            💰 我的交易
          </button>
        </div>

        <div class="p-6">
          @if (loading) {
            <div class="text-center py-8 text-gray-400">加载中...</div>
          } @else if (statuses.length === 0) {
            <div class="text-center py-8 text-gray-400">
              {{ activeTab === 'posts' ? '暂无帖子' : '暂无交易记录' }}
            </div>
          } @else {
            <div class="space-y-4">
              @for (status of statuses; track status.id) {
                <div class="p-4 bg-gray-50 rounded-lg">
                  @if (status.title) {
                    <div class="font-bold text-lg mb-2">{{ status.title }}</div>
                  }
                  <div class="text-gray-700 whitespace-pre-wrap">{{ status.text | slice:0:300 }}{{ status.text.length > 300 ? '...' : '' }}</div>
                  <div class="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <span>{{ formatTime(status.created_at) }}</span>
                    @if (status.retweet_count > 0) {
                      <span>🔄 {{ status.retweet_count }}</span>
                    }
                    @if (status.reply_count > 0) {
                      <span>💬 {{ status.reply_count }}</span>
                    }
                    @if (status.like_count > 0) {
                      <span>👍 {{ status.like_count }}</span>
                    }
                    <a [href]="status.link" target="_blank" class="text-blue-500 hover:underline ml-auto">查看原文 →</a>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class MyPostsComponent implements OnInit {
  myInfo: MyInfo | null = null;
  notLoggedIn = false;
  statuses: MyStatus[] = [];
  loading = false;
  activeTab = 'posts';

  constructor(
    private http: HttpClient,
    private vipService: VipService
  ) {}

  ngOnInit() {
    this.loadMyInfo();
  }

  loadMyInfo() {
    this.http.get<MyInfo>('/api/vip/me').subscribe({
      next: (info) => {
        this.myInfo = info;
        this.loadStatuses(0);
      },
      error: (err) => {
        if (err.status === 401) {
          this.notLoggedIn = true;
        }
      }
    });
  }

  loadStatuses(type: number) {
    this.loading = true;
    this.http.get<MyStatus[]>('/api/vip/me/statuses', {
      params: { status_type: type.toString(), count: '20' }
    }).subscribe({
      next: (statuses) => {
        this.statuses = statuses;
        this.loading = false;
      },
      error: (err) => {
        console.error('加载失败', err);
        this.loading = false;
      }
    });
  }

  formatTime(timestamp: number | string): string {
    return this.vipService.formatTime(timestamp);
  }
}