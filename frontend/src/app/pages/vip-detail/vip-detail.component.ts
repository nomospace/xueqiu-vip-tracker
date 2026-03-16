import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vip-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex items-center gap-6">
          <div class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-4xl">
            👤
          </div>
          <div class="flex-1">
            <h1 class="text-2xl font-bold">投资大V</h1>
            <div class="text-gray-500 mt-1">10万+ 粉丝 · 价值投资专家</div>
            <div class="mt-3 text-gray-600">专注价值投资，长期跟踪优质企业，分享投资心得与市场分析。</div>
          </div>
          <button class="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200">
            取消监听
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-bold mb-4">📈 当前持仓</h2>
          <div class="space-y-3">
            @for (holding of holdings; track holding.code) {
              <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div class="font-medium">{{ holding.name }}</div>
                  <div class="text-sm text-gray-500">{{ holding.code }}</div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-blue-600">{{ holding.position }}%</div>
                  <div class="text-sm text-green-600" *ngIf="holding.change > 0">+{{ holding.change }}%</div>
                  <div class="text-sm text-red-600" *ngIf="holding.change < 0">{{ holding.change }}%</div>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-bold mb-4">📝 最新动态</h2>
          <div class="space-y-3">
            @for (post of posts; track post.id) {
              <div class="p-3 bg-gray-50 rounded">
                <div class="text-sm text-gray-500">{{ post.time }}</div>
                <div class="mt-1">{{ post.content }}</div>
                <div class="mt-2 text-sm text-gray-400">
                  👍 {{ post.likes }} · 💬 {{ post.comments }}
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class VipDetailComponent {
  holdings = [
    { code: '600519', name: '贵州茅台', position: 15.5, change: 5.5 },
    { code: '000858', name: '五粮液', position: 12.3, change: 2.1 },
    { code: '601318', name: '中国平安', position: 10.8, change: 0 },
    { code: '600036', name: '招商银行', position: 8.5, change: -1.2 },
    { code: '000333', name: '美的集团', position: 7.2, change: 0 },
  ];

  posts = [
    { id: 1, content: '今天市场表现强劲，消费板块领涨，茅台再创新高', time: '10分钟前', likes: 234, comments: 45 },
    { id: 2, content: '价值投资的核心是找到好公司，然后耐心持有', time: '2小时前', likes: 567, comments: 89 },
    { id: 3, content: '关注白酒板块的长期投资机会', time: '昨天', likes: 345, comments: 67 },
  ];
}