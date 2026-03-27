import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface HoldingChange {
  stock_code: string;
  stock_name: string;
  operation: '新增' | '减仓' | '加仓' | '清仓';
  vip_id: number;
  vip_nickname: string;
  created_at: string;
  weight?: number;
}

interface HotStock {
  stock_code: string;
  stock_name: string;
  buy_count: number;
  sell_count: number;
  vips: { nickname: string; operation: string }[];
}

@Component({
  selector: 'app-holding-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
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
            <h1 class="text-xl font-bold text-gray-800">📈 持仓变更 - 大V调仓追踪</h1>
          </div>
          <div class="flex items-center gap-4">
            <select 
              [(ngModel)]="timeRange"
              (change)="loadData()"
              class="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none">
              <option value="today">今日</option>
              <option value="7d">近7天</option>
              <option value="30d">近30天</option>
            </select>
            <button 
              (click)="loadData()"
              class="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
              刷新
            </button>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto p-4 space-y-6">
        <!-- Tab 切换 -->
        <div class="flex gap-2">
          <button 
            (click)="activeTab = 'hot'"
            [class]="activeTab === 'hot' ? 'px-4 py-2 rounded-lg bg-blue-600 text-white text-sm' : 'px-4 py-2 rounded-lg bg-white text-gray-600 text-sm hover:bg-gray-50'">
            🔥 持仓热点
          </button>
          <button 
            (click)="activeTab = 'changes'"
            [class]="activeTab === 'changes' ? 'px-4 py-2 rounded-lg bg-blue-600 text-white text-sm' : 'px-4 py-2 rounded-lg bg-white text-gray-600 text-sm hover:bg-gray-50'">
            📋 变更记录
          </button>
        </div>

        @if (loading) {
          <div class="text-center py-12 text-gray-400">加载中...</div>
        } @else {
          <!-- 持仓热点 -->
          @if (activeTab === 'hot') {
            <div class="bg-white rounded-lg shadow-sm">
              <div class="p-4 border-b border-gray-100">
                <h2 class="font-medium text-gray-700">全网大V持仓热点</h2>
                <p class="text-xs text-gray-400 mt-1">统计大V近期集中增减仓的股票</p>
              </div>
              
              @if (hotStocks.length === 0) {
                <div class="p-8 text-center text-gray-400">
                  暂无持仓热点数据
                </div>
              } @else {
                <div class="divide-y divide-gray-50">
                  @for (stock of hotStocks; track stock.stock_code) {
                    <div class="p-4 hover:bg-gray-50 transition">
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="flex items-center gap-3">
                            <span class="font-medium text-gray-800">{{ stock.stock_name }}</span>
                            <span class="text-xs text-gray-400">{{ stock.stock_code }}</span>
                          </div>
                          <div class="mt-2 flex items-center gap-4">
                            @if (stock.buy_count > 0) {
                              <span class="text-sm text-green-600">
                                📈 {{ stock.buy_count }}位大V增持
                              </span>
                            }
                            @if (stock.sell_count > 0) {
                              <span class="text-sm text-red-600">
                                📉 {{ stock.sell_count }}位大V减持
                              </span>
                            }
                          </div>
                          <!-- 参与大V -->
                          <div class="mt-2 flex flex-wrap gap-2">
                            @for (vip of stock.vips.slice(0, 5); track vip.nickname) {
                              <span 
                                class="text-xs px-2 py-0.5 rounded"
                                [class]="vip.operation === '新增' || vip.operation === '加仓' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
                                {{ vip.nickname }} {{ vip.operation }}
                              </span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- 变更记录 -->
          @if (activeTab === 'changes') {
            <div class="bg-white rounded-lg shadow-sm">
              <div class="p-4 border-b border-gray-100">
                <h2 class="font-medium text-gray-700">持仓变更记录</h2>
              </div>
              
              @if (changes.length === 0) {
                <div class="p-8 text-center text-gray-400">
                  暂无变更记录
                </div>
              } @else {
                <div class="divide-y divide-gray-50">
                  @for (change of changes; track change.stock_code + change.created_at) {
                    <div class="p-4 hover:bg-gray-50 transition">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div 
                            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                            [class]="getOperationClass(change.operation)">
                            {{ change.operation === '新增' ? '+' : change.operation === '清仓' ? '-' : change.operation === '加仓' ? '↑' : '↓' }}
                          </div>
                          <div>
                            <div class="flex items-center gap-2">
                              <span class="font-medium text-gray-800">{{ change.stock_name }}</span>
                              <span class="text-xs text-gray-400">{{ change.stock_code }}</span>
                            </div>
                            <div class="text-sm text-gray-500 mt-0.5">
                              <a [routerLink]="['/vip', change.vip_id]" class="text-blue-500 hover:underline">{{ change.vip_nickname }}</a>
                              <span class="mx-1">·</span>
                              <span [class]="getOperationTextClass(change.operation)">{{ change.operation }}</span>
                              @if (change.weight) {
                                <span class="mx-1">·</span>
                                <span>仓位 {{ change.weight.toFixed(2) }}%</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div class="text-xs text-gray-400">
                          {{ formatTime(change.created_at) }}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- 底部说明 -->
        <div class="text-center text-xs text-gray-400 py-4">
          数据来源于雪球大V公开持仓，仅供参考 · 最后更新: {{ lastUpdate }}
        </div>
      </div>
    </div>
  `
})
export class HoldingListComponent implements OnInit {
  activeTab = 'hot';
  timeRange = '7d';
  loading = false;
  
  hotStocks: HotStock[] = [];
  changes: HoldingChange[] = [];
  lastUpdate = '--';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.loadHotStocks();
    this.loadChanges();
    this.updateLastTime();
  }

  loadHotStocks() {
    // 模拟数据 - 实际应从后端API获取
    this.hotStocks = [
      { stock_code: '600519', stock_name: '贵州茅台', buy_count: 3, sell_count: 1, vips: [
        { nickname: '方三文', operation: '加仓' },
        { nickname: '省心省力', operation: '新增' },
        { nickname: '价值at风险', operation: '加仓' },
        { nickname: '不明真相的群众', operation: '减仓' }
      ]},
      { stock_code: '000858', stock_name: '五粮液', buy_count: 2, sell_count: 2, vips: [
        { nickname: '省心省力', operation: '新增' },
        { nickname: '价值at风险', operation: '加仓' },
        { nickname: '方三文', operation: '减仓' },
        { nickname: '不明真相的群众', operation: '清仓' }
      ]},
      { stock_code: '300750', stock_name: '宁德时代', buy_count: 1, sell_count: 3, vips: [
        { nickname: '方三文', operation: '加仓' },
        { nickname: '省心省力', operation: '减仓' },
        { nickname: '价值at风险', operation: '清仓' }
      ]},
    ];
    this.loading = false;
  }

  loadChanges() {
    // 模拟数据
    this.changes = [
      { stock_code: '600519', stock_name: '贵州茅台', operation: '加仓', vip_id: 2, vip_nickname: '方三文', created_at: new Date().toISOString(), weight: 8.5 },
      { stock_code: '000858', stock_name: '五粮液', operation: '新增', vip_id: 4, vip_nickname: '省心省力啊', created_at: new Date(Date.now() - 3600000).toISOString(), weight: 5.2 },
      { stock_code: '300750', stock_name: '宁德时代', operation: '清仓', vip_id: 3, vip_nickname: '省心省力啊', created_at: new Date(Date.now() - 7200000).toISOString() },
    ];
  }

  getOperationClass(operation: string): string {
    if (operation === '新增' || operation === '加仓') {
      return 'bg-green-100 text-green-600';
    }
    if (operation === '清仓' || operation === '减仓') {
      return 'bg-red-100 text-red-600';
    }
    return 'bg-gray-100 text-gray-600';
  }

  getOperationTextClass(operation: string): string {
    if (operation === '新增' || operation === '加仓') {
      return 'text-green-600 font-medium';
    }
    if (operation === '清仓' || operation === '减仓') {
      return 'text-red-600 font-medium';
    }
    return 'text-gray-600';
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
}