import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VipService, VIPUser, Status } from '../../services/vip.service';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部标题栏 -->
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/" class="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
              <span>←</span>
              <span>返回首页</span>
            </a>
            <span class="text-gray-300">|</span>
            <h1 class="text-2xl font-bold">📅 动态时间线</h1>
          </div>
          <button 
            (click)="refresh()"
            [disabled]="loading"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition">
            {{ loading ? '加载中...' : '刷新' }}
          </button>
        </div>
      </header>

      <div class="max-w-7xl mx-auto p-4">
        @if (loading) {
        <div class="text-center py-12">
          <div class="text-gray-400 text-lg">加载中...</div>
        </div>
      } @else if (timeline.length === 0) {
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <div class="text-gray-400 text-lg">暂无动态</div>
          <div class="text-gray-400 text-sm mt-2">关注一些大V后，这里会显示他们的最新动态</div>
        </div>
      } @else {
        <div class="space-y-4">
          @for (item of timeline; track item.status.id) {
            <div class="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg overflow-hidden">
                  @if (item.vip.avatar) {
                    <img [src]="item.vip.avatar" [alt]="item.vip.nickname" class="w-full h-full object-cover">
                  } @else {
                    👤
                  }
                </div>
                <div>
                  <div class="font-medium">{{ item.vip.nickname }}</div>
                  <div class="text-sm text-gray-400">{{ formatTime(item.status.created_at) }}</div>
                </div>
              </div>
              
              @if (item.status.title) {
                <div class="font-bold text-lg mb-2">{{ item.status.title }}</div>
              }
              <div class="text-gray-700 whitespace-pre-wrap">{{ item.status.text | slice:0:300 }}{{ item.status.text.length > 300 ? '...' : '' }}</div>
              
              <div class="mt-4 flex items-center gap-6 text-sm text-gray-500">
                @if (item.status.retweet_count > 0) {
                  <span>🔄 {{ item.status.retweet_count }}</span>
                }
                @if (item.status.reply_count > 0) {
                  <span>💬 {{ item.status.reply_count }}</span>
                }
                @if (item.status.like_count > 0) {
                  <span>👍 {{ item.status.like_count }}</span>
                }
                <a [href]="item.status.link" target="_blank" class="text-blue-500 hover:underline ml-auto">查看原文 →</a>
              </div>
            </div>
          }
        </div>
      }
      </div>
    </div>
  `
})
export class TimelineComponent implements OnInit {
  vips: VIPUser[] = [];
  timeline: { vip: VIPUser, status: Status }[] = [];
  loading = false;

  constructor(private vipService: VipService) {}

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.timeline = [];

    // 1. 获取所有关注的大V
    this.vipService.getVipList(0, 50).subscribe({
      next: (vips) => {
        this.vips = vips;
        if (vips.length === 0) {
          this.loading = false;
          return;
        }

        // 2. 并行获取每个大V的动态
        let loaded = 0;
        const allStatuses: { vip: VIPUser, status: Status }[] = [];

        for (const vip of vips) {
          this.vipService.getVipStatuses(vip.id, 0, 5).subscribe({
            next: (statuses) => {
              for (const status of statuses) {
                allStatuses.push({ vip, status });
              }
              loaded++;
              
              // 所有请求完成后，按时间排序
              if (loaded === vips.length) {
                allStatuses.sort((a, b) => {
                  const timeA = new Date(a.status.created_at).getTime();
                  const timeB = new Date(b.status.created_at).getTime();
                  return timeB - timeA; // 最新的在前
                });
                this.timeline = allStatuses.slice(0, 50); // 取最近 50 条
                this.loading = false;
              }
            },
            error: () => {
              loaded++;
              if (loaded === vips.length) {
                allStatuses.sort((a, b) => {
                  const timeA = new Date(a.status.created_at).getTime();
                  const timeB = new Date(b.status.created_at).getTime();
                  return timeB - timeA;
                });
                this.timeline = allStatuses.slice(0, 50);
                this.loading = false;
              }
            }
          });
        }
      },
      error: (err) => {
        console.error('加载大V列表失败', err);
        this.loading = false;
      }
    });
  }

  formatTime(timestamp: number | string): string {
    return this.vipService.formatTime(timestamp);
  }
}