import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// 富文本处理 Pipe
@Pipe({
  name: 'richText',
  standalone: true
})
export class RichTextPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    // 雪球的text已经是HTML格式，直接返回
    return value;
  }
}

interface Analysis {
  id: number;
  status_id: string;
  user_id: string;
  vip_nickname?: string;
  core_viewpoint: string;
  related_stocks: Array<{
    name: string;
    code: string;
    attitude: string;
    reason: string;
  }>;
  position_signals: Array<{
    operation: string;
    stock: string;
    basis: string;
  }>;
  key_logic: string[];
  risk_warnings: string[];
  overall_attitude: string;
  summary: string;
  raw_content: string;
  created_at: string;
}

@Component({
  selector: 'app-analysis-list',
  standalone: true,
  imports: [CommonModule, RouterModule, RichTextPipe],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部导航 -->
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/" class="text-gray-400 hover:text-gray-600 text-sm">← 返回首页</a>
            <span class="text-gray-300">|</span>
            <h1 class="text-xl font-bold text-gray-800">🧠 AI 解读</h1>
          </div>
          <button 
            (click)="refreshAnalysis()"
            [disabled]="refreshing"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">
            {{ refreshing ? '分析中...' : '🔄 刷新分析' }}
          </button>
          @if (refreshMessage) {
            <span class="text-sm text-green-600 ml-3">{{ refreshMessage }}</span>
          }
        </div>
      </header>

      <div class="max-w-7xl mx-auto p-4">
        <!-- 加载状态 -->
        @if (loading) {
          <div class="text-center py-12">
            <div class="text-gray-400 text-lg">加载中...</div>
          </div>
        }

        <!-- 空状态 -->
        @if (!loading && analyses.length === 0) {
          <div class="text-center py-12">
            <div class="text-6xl mb-4">📊</div>
            <div class="text-gray-500 text-lg">暂无分析数据</div>
            <div class="text-gray-400 text-sm mt-2">访问大V动态页面后会自动生成分析</div>
          </div>
        }

        <!-- 分析列表 -->
        @if (analyses.length > 0) {
          <div class="space-y-4">
            @for (analysis of analyses; track analysis.id) {
              <div class="bg-white rounded-lg shadow p-6">
                <!-- 头部 -->
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <span class="text-sm text-gray-500">{{ analysis.vip_nickname || '大V' }}</span>
                    <span class="text-sm text-gray-400 ml-2">{{ formatTime(analysis.created_at) }}</span>
                  </div>
                  <div [class]="getAttitudeClass(analysis.overall_attitude)" class="px-3 py-1 rounded-full text-sm font-medium">
                    {{ analysis.overall_attitude }}
                  </div>
                </div>

                <!-- 核心观点 -->
                <div class="mb-4">
                  <div class="text-lg font-bold text-gray-800">💡 {{ analysis.core_viewpoint }}</div>
                </div>

                <!-- 原文摘要 -->
                <div class="bg-gray-50 p-3 rounded mb-4 text-sm text-gray-600 max-h-40 overflow-hidden">
                  <div class="rich-text" [innerHTML]="analysis.raw_content | richText"></div>
                </div>

                <!-- 相关股票 -->
                @if (analysis.related_stocks && analysis.related_stocks.length > 0) {
                  <div class="mb-4">
                    <div class="text-sm font-medium text-gray-700 mb-2">📊 相关股票:</div>
                    <div class="flex flex-wrap gap-2">
                      @for (stock of analysis.related_stocks; track stock.code) {
                        <span [class]="getStockClass(stock.attitude)" class="px-2 py-1 rounded text-sm">
                          {{ stock.name }} ({{ stock.code }}) - {{ stock.attitude }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- 持仓信号 -->
                @if (analysis.position_signals && analysis.position_signals.length > 0) {
                  <div class="mb-4">
                    <div class="text-sm font-medium text-gray-700 mb-2">📡 持仓信号:</div>
                    <div class="space-y-1">
                      @for (signal of analysis.position_signals; track signal.stock) {
                        <div class="text-sm">
                          <span [class]="getSignalClass(signal.operation)">{{ signal.operation }}</span>
                          <span class="text-gray-700 ml-1">{{ signal.stock }}</span>
                          <span class="text-gray-400 ml-2">- {{ signal.basis }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- 逻辑链条 -->
                @if (analysis.key_logic && analysis.key_logic.length > 0) {
                  <div class="mb-4">
                    <div class="text-sm font-medium text-gray-700 mb-2">🔗 逻辑链条:</div>
                    <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                      @for (logic of analysis.key_logic; track $index) {
                        <li>{{ logic }}</li>
                      }
                    </ul>
                  </div>
                }

                <!-- 风险提示 -->
                @if (analysis.risk_warnings && analysis.risk_warnings.length > 0) {
                  <div class="mb-4 bg-red-50 p-3 rounded">
                    <div class="text-sm font-medium text-red-700 mb-2">⚠️ 风险提示:</div>
                    <ul class="list-disc list-inside text-sm text-red-600 space-y-1">
                      @for (risk of analysis.risk_warnings; track $index) {
                        <li>{{ risk }}</li>
                      }
                    </ul>
                  </div>
                }

                <!-- 总结 -->
                <div class="bg-blue-50 p-3 rounded">
                  <div class="text-sm text-blue-800">📝 {{ analysis.summary }}</div>
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
    :host ::ng-deep .rich-text img {
      max-width: 100%;
      border-radius: 0.5rem;
      margin: 0.5rem 0;
    }
  `]
})
export class AnalysisListComponent implements OnInit {
  analyses: Analysis[] = [];
  loading = true;
  refreshing = false;
  refreshMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadAnalyses();
  }

  loadAnalyses() {
    this.loading = true;
    this.http.get<Analysis[]>('/api/vip/analyses').subscribe({
      next: (data) => {
        this.analyses = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('加载分析失败', err);
        this.loading = false;
      }
    });
  }

  refreshAnalysis() {
    this.refreshing = true;
    this.refreshMessage = '';
    
    this.http.post<any>('/api/vip/analyze-all', {}).subscribe({
      next: (result) => {
        this.refreshing = false;
        if (result.cached) {
          this.refreshMessage = '✅ 使用缓存数据（10分钟内有效）';
        } else {
          this.refreshMessage = result.message || `✅ 成功分析 ${result.analyzed || 0} 条动态`;
        }
        this.loadAnalyses();
        // 5秒后清除消息
        setTimeout(() => this.refreshMessage = '', 5000);
      },
      error: (err) => {
        this.refreshing = false;
        this.refreshMessage = '❌ 分析失败: ' + (err.error?.detail || err.message);
      }
    });
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

  getAttitudeClass(attitude: string): string {
    switch (attitude) {
      case '看多':
      case '整体看多':
        return 'bg-green-100 text-green-800';
      case '看空':
      case '整体看空':
        return 'bg-red-100 text-red-800';
      case '中性':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }

  getStockClass(attitude: string): string {
    switch (attitude) {
      case '看多':
        return 'bg-green-100 text-green-700';
      case '看空':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getSignalClass(operation: string): string {
    switch (operation) {
      case '新增':
      case '加仓':
        return 'text-green-600 font-medium';
      case '清仓':
      case '减仓':
        return 'text-red-600 font-medium';
      default:
        return 'text-gray-600';
    }
  }
}