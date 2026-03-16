import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VipService, VIPUser, Status, Portfolio, Rebalancing } from '../../services/vip.service';

@Component({
  selector: 'app-vip-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- 加载状态 -->
      @if (loading) {
        <div class="text-center py-12">
          <div class="text-gray-400 text-lg">加载中...</div>
        </div>
      }

      <!-- 用户信息 -->
      @if (vip) {
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex items-center gap-6">
            <div class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-4xl overflow-hidden">
              @if (vip.avatar) {
                <img [src]="vip.avatar" [alt]="vip.nickname" class="w-full h-full object-cover">
              } @else {
                👤
              }
            </div>
            <div class="flex-1">
              <h1 class="text-2xl font-bold">{{ vip.nickname }}</h1>
              <div class="text-gray-500 mt-1">{{ vip.followers | number }} 粉丝 · ID: {{ vip.xueqiu_id }}</div>
              <div class="mt-3 text-gray-600">{{ vip.description || '暂无简介' }}</div>
            </div>
            <button 
              (click)="deleteVip()" 
              class="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200 transition">
              取消监听
            </button>
          </div>
        </div>

        <!-- Tab 切换 -->
        <div class="bg-white rounded-lg shadow">
          <div class="flex border-b">
            <button 
              (click)="activeTab = 'posts'" 
              [class]="activeTab === 'posts' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
              📝 动态
            </button>
            <button 
              (click)="activeTab = 'trades'; loadTrades()" 
              [class]="activeTab === 'trades' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
              💰 交易
            </button>
            <button 
              (click)="activeTab = 'portfolio'; loadPortfolios()" 
              [class]="activeTab === 'portfolio' ? 'px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600' : 'px-6 py-3 text-gray-500 hover:text-gray-700'">
              📊 组合
            </button>
          </div>

          <div class="p-6">
            <!-- 动态列表 -->
            @if (activeTab === 'posts') {
              @if (loadingStatuses) {
                <div class="text-center py-8 text-gray-400">加载中...</div>
              } @else if (statuses.length === 0) {
                <div class="text-center py-8 text-gray-400">暂无动态</div>
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
                        @if (status.link) {
                          <a [href]="status.link" target="_blank" class="text-blue-500 hover:underline">查看原文</a>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            }

            <!-- 交易动态 -->
            @if (activeTab === 'trades') {
              @if (loadingTrades) {
                <div class="text-center py-8 text-gray-400">加载中...</div>
              } @else if (tradeStatuses.length === 0) {
                <div class="text-center py-8 text-gray-400">暂无交易记录</div>
              } @else {
                <div class="space-y-4">
                  @for (status of tradeStatuses; track status.id) {
                    <div class="p-4 bg-gray-50 rounded-lg">
                      <div class="text-gray-700">{{ status.text }}</div>
                      <div class="mt-2 text-sm text-gray-500">{{ formatTime(status.created_at) }}</div>
                    </div>
                  }
                </div>
              }
            }

            <!-- 组合信息 -->
            @if (activeTab === 'portfolio') {
              @if (loadingPortfolios) {
                <div class="text-center py-8 text-gray-400">加载中...</div>
              } @else if (portfolios.length === 0) {
                <div class="text-center py-8 text-gray-400">暂无组合信息</div>
              } @else {
                <div class="grid gap-4">
                  @for (portfolio of portfolios; track portfolio.cube_id) {
                    <div class="p-4 bg-gray-50 rounded-lg">
                      <div class="flex justify-between items-center">
                        <div>
                          <div class="font-bold text-lg">{{ portfolio.name }}</div>
                          <div class="text-sm text-gray-500">{{ portfolio.symbol }}</div>
                        </div>
                        <div class="text-right">
                          <div class="text-sm text-gray-500">累计收益</div>
                          <div [class]="portfolio.total_gain >= 0 ? 'text-lg font-bold text-green-600' : 'text-lg font-bold text-red-600'">
                            {{ portfolio.total_gain >= 0 ? '+' : '' }}{{ portfolio.total_gain.toFixed(2) }}%
                          </div>
                        </div>
                      </div>
                      <button 
                        (click)="loadRebalancing(portfolio.symbol)"
                        class="mt-3 text-blue-500 text-sm hover:underline">
                        查看调仓历史 →
                      </button>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>

        <!-- 调仓历史弹窗 -->
        @if (showRebalancing) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" (click)="showRebalancing = false">
            <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto" (click)="$event.stopPropagation()">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold">调仓历史</h2>
                <button (click)="showRebalancing = false" class="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              @if (loadingRebalancing) {
                <div class="text-center py-8 text-gray-400">加载中...</div>
              } @else if (rebalancings.length === 0) {
                <div class="text-center py-8 text-gray-400">暂无调仓记录</div>
              } @else {
                <div class="space-y-4">
                  @for (rebalancing of rebalancings; track rebalancing.rebalancing_id) {
                    <div class="border rounded-lg p-4">
                      <div class="text-sm text-gray-500 mb-2">{{ formatTime(rebalancing.created_at) }}</div>
                      <div class="space-y-2">
                        @for (holding of rebalancing.holdings; track holding.stock_code) {
                          <div class="flex justify-between items-center text-sm">
                            <div>
                              <span class="font-medium">{{ holding.stock_name }}</span>
                              <span class="text-gray-400 ml-2">{{ holding.stock_code }}</span>
                            </div>
                            <div [class]="getChangeClass(holding)">
                              {{ formatChange(holding) }}
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
        }
      }
    </div>
  `
})
export class VipDetailComponent implements OnInit {
  vip: VIPUser | null = null;
  loading = true;
  activeTab = 'posts';

  // 动态
  statuses: Status[] = [];
  loadingStatuses = false;

  // 交易
  tradeStatuses: Status[] = [];
  loadingTrades = false;

  // 组合
  portfolios: Portfolio[] = [];
  loadingPortfolios = false;

  // 调仓
  showRebalancing = false;
  rebalancings: Rebalancing[] = [];
  loadingRebalancing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vipService: VipService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadVip(id);
    }
  }

  loadVip(id: number) {
    this.loading = true;
    this.vipService.getVipDetail(id).subscribe({
      next: (vip) => {
        this.vip = vip;
        this.loading = false;
        this.loadStatuses();
      },
      error: (err) => {
        console.error('加载大V详情失败', err);
        this.loading = false;
      }
    });
  }

  loadStatuses() {
    if (!this.vip) return;
    this.loadingStatuses = true;
    this.vipService.getVipStatuses(this.vip.id, 0, 10).subscribe({
      next: (statuses) => {
        this.statuses = statuses;
        this.loadingStatuses = false;
      },
      error: (err) => {
        console.error('加载动态失败', err);
        this.loadingStatuses = false;
      }
    });
  }

  loadTrades() {
    if (!this.vip || this.tradeStatuses.length > 0) return;
    this.loadingTrades = true;
    this.vipService.getVipStatuses(this.vip.id, 11, 10).subscribe({
      next: (statuses) => {
        this.tradeStatuses = statuses;
        this.loadingTrades = false;
      },
      error: (err) => {
        console.error('加载交易记录失败', err);
        this.loadingTrades = false;
      }
    });
  }

  loadPortfolios() {
    if (!this.vip || this.portfolios.length > 0) return;
    this.loadingPortfolios = true;
    this.vipService.getVipPortfolios(this.vip.id).subscribe({
      next: (portfolios) => {
        this.portfolios = portfolios;
        this.loadingPortfolios = false;
      },
      error: (err) => {
        console.error('加载组合失败', err);
        this.loadingPortfolios = false;
      }
    });
  }

  loadRebalancing(cubeSymbol: string) {
    if (!this.vip) return;
    this.showRebalancing = true;
    this.loadingRebalancing = true;
    this.rebalancings = [];

    this.vipService.getPortfolioRebalancing(this.vip.id, cubeSymbol, 10).subscribe({
      next: (rebalancings) => {
        this.rebalancings = rebalancings;
        this.loadingRebalancing = false;
      },
      error: (err) => {
        console.error('加载调仓记录失败', err);
        this.loadingRebalancing = false;
      }
    });
  }

  deleteVip() {
    if (!this.vip) return;
    if (!confirm(`确定要取消监听 ${this.vip.nickname} 吗？`)) return;

    this.vipService.deleteVip(this.vip.id).subscribe({
      next: () => {
        this.router.navigate(['/vip']);
      },
      error: (err) => {
        console.error('删除失败', err);
        alert('删除失败');
      }
    });
  }

  formatTime(timestamp: number | string): string {
    return this.vipService.formatTime(timestamp);
  }

  formatChange(holding: any): string {
    const change = (holding.weight || 0) - (holding.prev_weight || 0);
    if (change > 0) return `+${change.toFixed(2)}%`;
    if (change < 0) return `${change.toFixed(2)}%`;
    if (holding.weight > 0 && holding.prev_weight === 0) return '新增';
    if (holding.weight === 0 && holding.prev_weight > 0) return '清仓';
    return '-';
  }

  getChangeClass(holding: any): string {
    const change = (holding.weight || 0) - (holding.prev_weight || 0);
    if (change > 0 || (holding.weight > 0 && holding.prev_weight === 0)) return 'text-green-600 font-medium';
    if (change < 0 || (holding.weight === 0 && holding.prev_weight > 0)) return 'text-red-600 font-medium';
    return 'text-gray-400';
  }
}