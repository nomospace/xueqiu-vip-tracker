import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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

interface GlobalInsight {
  market_sentiment: string;
  consensus_views: string[];
  divergence_views: string[];
  hot_stocks: { name: string; sentiment: string; mentions: number }[];
}

@Component({
  selector: 'app-daily-summary',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RichTextPipe],
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
            
            <!-- 日期选择 + 刷新 -->
            <div class="flex items-center gap-2">
              <input 
                type="date" 
                [ngModel]="selectedDate"
                (ngModelChange)="loadSummary($event)"
                class="bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1 text-sm focus:outline-none w-32">
              <button 
                (click)="refreshSummary()"
                [disabled]="refreshing"
                class="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-sm transition disabled:opacity-50">
                <span [class.animate-spin]="refreshing">🔄</span>
              </button>
            </div>
          </div>
          
          <!-- 顶部导航 Tab（移动端隐藏，由底部 Tab 替代） -->
          <nav class="hidden sm:flex gap-1 mt-3 -mb-2 overflow-x-auto">
            <a routerLink="/" 
               class="flex-shrink-0 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-t-lg transition">
              📅 时间线
            </a>
            <a routerLink="/summary" 
               class="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition bg-white/20">
              📊 今日摘要
            </a>
            <a routerLink="/watchlist" 
               class="flex-shrink-0 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-t-lg transition">
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
        @if (loading) {
          <div class="p-8 text-center">
            <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-slate-400 text-sm">加载中...</p>
          </div>
        } @else if (!summary) {
          <div class="p-8 text-center">
            <div class="text-4xl mb-3">📭</div>
            <p class="text-slate-400">暂无数据</p>
          </div>
        } @else {
          <!-- ========== 核心数据看板（横向滚动卡片） ========== -->
          <section class="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            <div class="flex-shrink-0 w-28 bg-white rounded-xl shadow-sm border border-slate-200 p-3 text-center">
              <div class="text-xl mb-1">📝</div>
              <div class="text-lg font-bold text-blue-600">{{ summary.total_posts }}</div>
              <div class="text-xs text-slate-500">今日新帖</div>
            </div>
            <div class="flex-shrink-0 w-28 bg-white rounded-xl shadow-sm border border-slate-200 p-3 text-center">
              <div class="text-xl mb-1">👥</div>
              <div class="text-lg font-bold text-indigo-600">{{ summary.total_vips }}</div>
              <div class="text-xs text-slate-500">活跃大V</div>
            </div>
            <div class="flex-shrink-0 w-28 bg-white rounded-xl shadow-sm border border-slate-200 p-3 text-center">
              <div class="text-xl mb-1">📈</div>
              <div class="text-lg font-bold text-red-600">{{ bullCount }}</div>
              <div class="text-xs text-slate-500">看多观点</div>
            </div>
            <div class="flex-shrink-0 w-28 bg-white rounded-xl shadow-sm border border-slate-200 p-3 text-center">
              <div class="text-xl mb-1">📉</div>
              <div class="text-lg font-bold text-green-600">{{ bearCount }}</div>
              <div class="text-xs text-slate-500">看空观点</div>
            </div>
            <div class="flex-shrink-0 w-28 bg-white rounded-xl shadow-sm border border-slate-200 p-3 text-center">
              <div class="text-xl mb-1">➖</div>
              <div class="text-lg font-bold text-gray-600">{{ neutralCount }}</div>
              <div class="text-xs text-slate-500">中性观点</div>
            </div>
          </section>

          <!-- ========== 情绪筛选 ========== -->
          <section class="flex gap-2 overflow-x-auto pb-1">
            <button 
              (click)="filterAttitude = 'all'"
              class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition"
              [class]="filterAttitude === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'">
              全部
            </button>
            <button 
              (click)="filterAttitude = '看多'"
              class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition"
              [class]="filterAttitude === '看多' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600'">
              看多
            </button>
            <button 
              (click)="filterAttitude = '看空'"
              class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition"
              [class]="filterAttitude === '看空' ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600'">
              看空
            </button>
            <button 
              (click)="filterAttitude = '中性'"
              class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition"
              [class]="filterAttitude === '中性' ? 'bg-gray-600 text-white' : 'bg-white border border-slate-200 text-slate-600'">
              中性
            </button>
          </section>

          <!-- ========== 大V观点卡片列表 ========== -->
          <section class="space-y-3">
            @for (vip of filteredSummaries; track vip.vip_id) {
              <article class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <!-- 大V头部 -->
                <div class="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">👤</div>
                    <div>
                      <div class="font-medium text-slate-800 text-sm">{{ vip.vip_nickname }}</div>
                      <div class="text-xs text-slate-400">今日 {{ vip.post_count }} 篇</div>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded text-xs font-medium"
                        [class]="getAttitudeClass(vip.emotion_change)">
                    {{ vip.emotion_change }}
                  </span>
                </div>
                
                <!-- 情绪轨迹 -->
                @if (vip.emotion_trajectory?.length) {
                  <div class="p-3 border-b border-slate-100">
                    <div class="text-xs text-slate-500 mb-2">📈 情绪轨迹</div>
                    <div class="space-y-2">
                      @for (point of getReversedTrajectory(vip.emotion_trajectory); track $index) {
                        <div class="flex items-start gap-2 text-sm">
                          <span class="text-xs text-slate-400 flex-shrink-0 w-12">{{ point.time }}</span>
                          <span class="px-1.5 py-0.5 rounded text-xs flex-shrink-0"
                                [class]="getAttitudeClass(point.attitude)">
                            {{ point.attitude }}
                          </span>
                          <span class="text-slate-600 line-clamp-1">{{ point.viewpoint || point.content }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
                
                <!-- 关键发现 -->
                @if (vip.key_findings?.length) {
                  <div class="p-3">
                    <div class="text-xs text-slate-500 mb-2">💡 关键发现</div>
                    <ul class="space-y-1">
                      @for (finding of vip.key_findings.slice(0, 2); track $index) {
                        <li class="text-sm text-slate-600 flex items-start gap-1">
                          <span class="text-blue-500">•</span>
                          <span class="line-clamp-2">{{ finding }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                }
                
                <!-- 相关标的 -->
                @if (vip.related_stocks?.length) {
                  <div class="px-3 pb-3">
                    <div class="flex flex-wrap gap-1">
                      @for (stock of vip.related_stocks.slice(0, 4); track stock.code || stock.name) {
                        <span class="px-2 py-0.5 rounded text-xs border"
                              [class]="getStockClass(stock.attitude || stock.sentiment)">
                          {{ stock.name }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </article>
            }
          </section>

          <!-- 底部信息 -->
          <div class="text-center text-xs text-slate-400 py-2">
            数据更新: {{ summary.collect_time || '--' }} | Build: {{ buildTime }}
          </div>
        }
      </main>

      <!-- ========== 底部 Tab 栏（移动端） ========== -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 sm:hidden">
        <div class="flex justify-around py-2">
          <a routerLink="/" class="flex flex-col items-center py-1 px-3 text-slate-500">
            <span class="text-xl">📅</span>
            <span class="text-xs mt-0.5">时间线</span>
          </a>
          <a routerLink="/summary" class="flex flex-col items-center py-1 px-3 text-blue-600">
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
    </div>
  `
})
export class DailySummaryComponent implements OnInit {
  selectedDate: string = new Date().toISOString().split('T')[0];
  summary: DailySummary | null = null;
  globalInsight: GlobalInsight | null = null;
  loading = false;
  refreshing = false;
  buildTime = '2026-03-17 22:55';
  
  // 筛选
  filterAttitude = 'all';
  
  // 统计
  bullCount = 0;
  bearCount = 0;
  neutralCount = 0;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadSummary(this.selectedDate);
  }

  get filteredSummaries(): VipSummary[] {
    if (!this.summary?.summaries) return [];
    if (this.filterAttitude === 'all') return this.summary.summaries;
    
    return this.summary.summaries.filter(vip => {
      const attitudes = vip.emotion_trajectory?.map(p => p.attitude) || [];
      return attitudes.includes(this.filterAttitude) || vip.emotion_change === this.filterAttitude;
    });
  }

  loadSummary(date: string) {
    this.loading = true;
    this.selectedDate = date;
    
    this.http.get<DailySummary>(`/api/vip/daily-summary?date=${date}`).subscribe({
      next: (data) => {
        this.summary = data;
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('加载摘要失败', err);
        this.loading = false;
      }
    });
  }

  calculateStats() {
    this.bullCount = 0;
    this.bearCount = 0;
    this.neutralCount = 0;
    
    if (!this.summary?.summaries) return;
    
    this.summary.summaries.forEach(vip => {
      if (vip.attitude_distribution) {
        this.bullCount += vip.attitude_distribution['看多'] || 0;
        this.bearCount += vip.attitude_distribution['看空'] || 0;
        this.neutralCount += vip.attitude_distribution['中性'] || 0;
      }
    });
  }

  refreshSummary() {
    this.refreshing = true;
    this.http.post('/api/vip/fetch-all-timeline', {}).subscribe({
      next: () => {
        this.loadSummary(this.selectedDate);
        this.refreshing = false;
      },
      error: () => {
        this.refreshing = false;
      }
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

  getReversedTrajectory(trajectory: EmotionPoint[] | undefined): EmotionPoint[] {
    if (!trajectory) return [];
    return [...trajectory].reverse().slice(0, 3);
  }
}