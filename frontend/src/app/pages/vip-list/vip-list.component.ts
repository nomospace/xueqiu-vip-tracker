import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-vip-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-800">👤 大V列表</h1>
        <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + 添加大V
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        @for (vip of vips; track vip.id) {
          <a [routerLink]="['/vip', vip.id]" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                👤
              </div>
              <div class="flex-1">
                <div class="font-bold text-lg">{{ vip.name }}</div>
                <div class="text-gray-500 text-sm">{{ vip.followers }} 粉丝</div>
              </div>
            </div>
            <div class="mt-4 text-gray-600 text-sm line-clamp-2">{{ vip.description }}</div>
            <div class="mt-4 flex justify-between text-sm">
              <span class="text-green-600">{{ vip.postCount }} 动态</span>
              <span class="text-blue-600">{{ vip.holdingCount }} 持仓</span>
            </div>
          </a>
        }
      </div>
    </div>
  `
})
export class VipListComponent {
  vips = [
    { id: 1, name: '投资大V', followers: '10万+', description: '专注价值投资，长期跟踪优质企业', postCount: 1234, holdingCount: 15 },
    { id: 2, name: '价值投资者', followers: '5万+', description: '深度研究行业趋势，寻找被低估的机会', postCount: 856, holdingCount: 12 },
    { id: 3, name: '技术派', followers: '8万+', description: '技术分析爱好者，短线操作为主', postCount: 2341, holdingCount: 20 },
    { id: 4, name: '成长猎手', followers: '3万+', description: '专注于高成长赛道投资', postCount: 432, holdingCount: 8 },
    { id: 5, name: '红利策略', followers: '2万+', description: '稳健分红投资，追求长期收益', postCount: 289, holdingCount: 25 },
    { id: 6, name: '周期研究者', followers: '1万+', description: '研究周期股，把握宏观经济脉搏', postCount: 567, holdingCount: 10 },
  ];
}