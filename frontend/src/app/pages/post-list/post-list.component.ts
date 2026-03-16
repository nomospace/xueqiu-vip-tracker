import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-gray-800">📢 动态列表</h1>

      <div class="flex gap-4">
        <select class="px-4 py-2 border rounded-lg">
          <option>全部大V</option>
          <option>投资大V</option>
          <option>价值投资者</option>
          <option>技术派</option>
        </select>
        <select class="px-4 py-2 border rounded-lg">
          <option>全部类型</option>
          <option>发帖</option>
          <option>转发</option>
          <option>评论</option>
        </select>
      </div>

      <div class="space-y-4">
        @for (post of posts; track post.id) {
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <div class="font-bold">{{ post.author }}</div>
                <div class="text-sm text-gray-500">{{ post.time }}</div>
              </div>
              <span class="ml-auto px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-full">
                {{ post.type }}
              </span>
            </div>
            <div class="mt-4 text-gray-700">{{ post.content }}</div>
            <div class="mt-4 flex gap-6 text-sm text-gray-500">
              <span>👍 {{ post.likes }}</span>
              <span>💬 {{ post.comments }}</span>
              <span>🔗 分享</span>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class PostListComponent {
  posts = [
    { id: 1, author: '投资大V', type: '发帖', content: '今天市场表现强劲，消费板块领涨。从基本面看，白酒企业盈利能力依然强劲，估值合理，值得长期关注。', time: '10分钟前', likes: 234, comments: 45 },
    { id: 2, author: '价值投资者', type: '发帖', content: '价值投资的核心是找到好公司，然后耐心持有。不要被短期波动影响判断。', time: '30分钟前', likes: 567, comments: 89 },
    { id: 3, author: '技术派', type: '转发', content: '创业板突破关键阻力位，量价配合良好，后市值得关注。', time: '1小时前', likes: 123, comments: 23 },
    { id: 4, author: '成长猎手', type: '发帖', content: '新能源汽车渗透率持续提升，产业链龙头企业将受益。', time: '2小时前', likes: 345, comments: 67 },
  ];
}