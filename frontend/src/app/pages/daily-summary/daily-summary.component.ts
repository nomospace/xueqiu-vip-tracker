import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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

interface DailySummary {
  date: string;
  collect_time: string;
  total_vips: number;
  total_posts: number;
  summaries: VipSummary[];
}

interface VipSummary {
  vip_id: number;
  vip_nickname: string;
  xueqiu_id: string;
  post_count: number;
  emotion_change: string;
  attitude_distribution: { [key: string]: number };
  emotion_trajectory: EmotionPoint[];
  key_findings: string[];
  related_stocks: any[];
  core_insight: string;
}

interface EmotionPoint {
  time: string;
  content: string;
  attitude: string;
  viewpoint: string;
}

@Component({
  selector: 'app-daily-summary',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RichTextPipe],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部导航 -->
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/" class="text-gray-400 hover:text-gray-600 text-sm">← 返回首页</a>
            <span class="text-gray-300">|</span>
            <h1 class="text-xl font-bold text-gray-800">📊 执行摘要</h1>
          </div>
          <div class="flex items-center gap-3">
            <input 
              type="date" 
              [ngModel]="selectedDate"
              (ngModelChange)="loadSummary($event)"
              class="border rounded px-3 py-2 text-sm">
            <button 
              (click)="refreshSummary()"
              [disabled]="refreshing"
              class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50">
              {{ refreshing ? '刷新中...' : '🔄 刷新数据' }}
            </button>
            @if (refreshMessage) {
              <span class="text-sm text-green-600">{{ refreshMessage }}</span>
            }
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto p-4">
        <!-- 总览卡片 -->
        @if (summary) {
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-lg shadow p-4">
              <div class="text-gray-500 text-sm">📅 日期</div>
              <div class="text-2xl font-bold text-gray-800">{{ summary.date }}</div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
              <div class="text-gray-500 text-sm">📊 采集时间</div>
              <div class="text-2xl font-bold text-gray-800">{{ summary.collect_time }}</div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
              <div class="text-gray-500 text-sm">📝 新帖子数量</div>
              <div class="text-2xl font-bold text-blue-600">{{ summary.total_posts }} 篇</div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
              <div class="text-gray-500 text-sm">👤 活跃大V</div>
              <div class="text-2xl font-bold text-purple-600">{{ summary.total_vips }} 位</div>
            </div>
          </div>
        }

        <!-- 加载状态 -->
        @if (loading) {
          <div class="text-center py-12">
            <div class="text-gray-400 text-lg">加载中...</div>
          </div>
        }

        <!-- 空状态 -->
        @if (!loading && (!summary || summary.summaries.length === 0)) {
          <div class="text-center py-12">
            <div class="text-6xl mb-4">📭</div>
            <div class="text-gray-500 text-lg">暂无数据</div>
            <div class="text-gray-400 text-sm mt-2">当天没有分析记录</div>
          </div>
        }

        <!-- 大V摘要列表 -->
        @if (summary && summary.summaries.length > 0) {
          <div class="space-y-6">
            @for (s of summary.summaries; track s.vip_id) {
              <div class="bg-white rounded-lg shadow overflow-hidden">
                <!-- 头部 -->
                <div class="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
                  <div class="flex items-center justify-between">
                    <div class="text-white">
                      <h2 class="text-xl font-bold">{{ s.vip_nickname }}</h2>
                      <div class="text-blue-100 text-sm mt-1">ID: {{ s.xueqiu_id }}</div>
                    </div>
                    <div class="text-right text-white">
                      <div class="text-3xl font-bold">{{ s.post_count }}</div>
                      <div class="text-blue-100 text-sm">篇帖子</div>
                    </div>
                  </div>
                </div>

                <!-- 统计表格 -->
                <div class="p-6">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="bg-gray-50">
                        <th class="text-left py-2 px-4 font-medium text-gray-600">项目</th>
                        <th class="text-left py-2 px-4 font-medium text-gray-600">内容</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="border-b">
                        <td class="py-3 px-4 text-gray-500">采集时间</td>
                        <td class="py-3 px-4">{{ summary.date }}</td>
                      </tr>
                      <tr class="border-b">
                        <td class="py-3 px-4 text-gray-500">新帖子数量</td>
                        <td class="py-3 px-4">
                          <span class="font-bold text-blue-600">{{ s.post_count }}</span> 篇
                        </td>
                      </tr>
                      <tr class="border-b">
                        <td class="py-3 px-4 text-gray-500">情绪转变</td>
                        <td class="py-3 px-4">
                          <span [class]="getEmotionClass(s.emotion_change)" class="font-medium">
                            {{ s.emotion_change || '稳定' }}
                          </span>
                        </td>
                      </tr>
                      @if (s.key_findings && s.key_findings.length > 0) {
                        <tr class="border-b">
                          <td class="py-3 px-4 text-gray-500 align-top">关键发现</td>
                          <td class="py-3 px-4">
                            @for (finding of s.key_findings; track $index) {
                              <div class="flex items-start gap-2 mb-1">
                                <span class="text-green-500">•</span>
                                <span>{{ finding }}</span>
                              </div>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>

                  <!-- 情绪轨迹 -->
                  @if (s.emotion_trajectory && s.emotion_trajectory.length > 0) {
                    <div class="mt-6">
                      <h3 class="font-medium text-gray-700 mb-3">📈 情绪轨迹</h3>
                      <div class="relative pl-8 border-l-2 border-gray-200 space-y-4">
                        @for (point of s.emotion_trajectory; track $index) {
                          <div class="relative">
                            <div class="absolute -left-10 w-4 h-4 rounded-full" 
                                 [class]="getTimelineDotClass(point.attitude)"></div>
                            <div class="text-sm">
                              <span class="font-medium text-gray-600">{{ point.time }}</span>
                              <span class="mx-2 text-gray-300">→</span>
                              <span class="text-gray-700 rich-text" [innerHTML]="point.content | richText"></span>
                              <span class="ml-2 text-xs px-2 py-0.5 rounded" 
                                    [class]="getAttitudeBadgeClass(point.attitude)">
                                {{ point.attitude }}
                              </span>
                            </div>
                            @if (point.viewpoint) {
                              <div class="text-xs text-gray-500 mt-1 ml-16">
                                💡 {{ point.viewpoint }}
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- 核心洞察 -->
                  @if (s.core_insight) {
                    <div class="mt-6 bg-blue-50 p-4 rounded-lg">
                      <h3 class="font-medium text-blue-700 mb-2">🎯 核心洞察</h3>
                      <p class="text-blue-800">{{ s.core_insight }}</p>
                    </div>
                  }

                  <!-- 相关股票 -->
                  @if (s.related_stocks && s.related_stocks.length > 0) {
                    <div class="mt-4">
                      <h3 class="font-medium text-gray-700 mb-2">📊 提及股票</h3>
                      <div class="flex flex-wrap gap-2">
                        @for (stock of s.related_stocks; track stock.code) {
                          <span class="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {{ stock.name }} ({{ stock.attitude }})
                          </span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep .rich-text {
      word-break: break-word;
    }
    :host ::ng-deep .rich-text p {
      margin: 0.25rem 0;
      display: inline;
    }
    :host ::ng-deep .rich-text a {
      color: #3b82f6;
      text-decoration: underline;
    }
    :host ::ng-deep .rich-text img {
      max-width: 100px;
      max-height: 60px;
      border-radius: 0.25rem;
      vertical-align: middle;
      margin: 0 0.25rem;
    }
  `]
})
export class DailySummaryComponent implements OnInit {
  summary: DailySummary | null = null;
  loading = true;
  refreshing = false;
  refreshMessage = '';
  selectedDate: string = '';

  constructor(private http: HttpClient) {
    // 默认今天
    this.selectedDate = new Date().toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadSummary(this.selectedDate);
  }

  loadSummary(date: string) {
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }
    this.selectedDate = date;
    this.loading = true;
    this.refreshMessage = '';
    
    this.http.get<DailySummary>(`/api/vip/daily-summary?date=${date}`).subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('加载摘要失败', err);
        this.loading = false;
      }
    });
  }

  refreshSummary() {
    this.refreshing = true;
    this.refreshMessage = '';
    
    this.http.post<any>(`/api/vip/refresh-summary?date=${this.selectedDate}`, {}).subscribe({
      next: (result) => {
        this.refreshing = false;
        if (result.data) {
          this.summary = result.data;
          if (result.cached) {
            this.refreshMessage = '✅ 使用缓存数据（半小时内有效）';
          } else {
            this.refreshMessage = result.message || '✅ 刷新成功';
          }
          // 3秒后清除消息
          setTimeout(() => this.refreshMessage = '', 5000);
        } else if (result.error) {
          this.refreshMessage = '❌ ' + result.error;
        }
      },
      error: (err) => {
        this.refreshing = false;
        this.refreshMessage = '❌ 刷新失败: ' + (err.error?.detail || err.message);
      }
    });
  }

  getEmotionClass(emotion: string): string {
    if (emotion.includes('看多')) return 'text-green-600';
    if (emotion.includes('看空')) return 'text-red-600';
    return 'text-gray-600';
  }

  getTimelineDotClass(attitude: string): string {
    switch (attitude) {
      case '看多':
      case '整体看多':
        return 'bg-green-500';
      case '看空':
      case '整体看空':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  }

  getAttitudeBadgeClass(attitude: string): string {
    switch (attitude) {
      case '看多':
      case '整体看多':
        return 'bg-green-100 text-green-700';
      case '看空':
      case '整体看空':
        return 'bg-red-100 text-red-700';
      case '观望':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}