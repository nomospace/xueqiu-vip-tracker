import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-gray-800">📊 仪表盘</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">监听大V</div>
          <div class="text-3xl font-bold text-blue-600">12</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">今日动态</div>
          <div class="text-3xl font-bold text-green-600">48</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">持仓变动</div>
          <div class="text-3xl font-bold text-orange-600">5</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="text-gray-500 text-sm">最新更新</div>
          <div class="text-lg font-bold text-gray-600">10分钟前</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-bold mb-4">📢 最新动态</h2>
          <div class="space-y-3">
            <div class="p-3 bg-gray-50 rounded">
              <div class="font-medium">投资大V：今天市场表现强劲...</div>
              <div class="text-sm text-gray-500">3分钟前</div>
            </div>
            <div class="p-3 bg-gray-50 rounded">
              <div class="font-medium">价值投资者：关注消费板块机会</div>
              <div class="text-sm text-gray-500">15分钟前</div>
            </div>
            <div class="p-3 bg-gray-50 rounded">
              <div class="font-medium">技术派：创业板突破关键阻力</div>
              <div class="text-sm text-gray-500">30分钟前</div>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-bold mb-4">📈 持仓变动</h2>
          <div class="space-y-3">
            <div class="p-3 bg-green-50 rounded border-l-4 border-green-500">
              <div class="font-medium">贵州茅台 +5.5%</div>
              <div class="text-sm text-gray-500">投资大V 加仓</div>
            </div>
            <div class="p-3 bg-red-50 rounded border-l-4 border-red-500">
              <div class="font-medium">宁德时代 -3.2%</div>
              <div class="text-sm text-gray-500">价值投资者 减仓</div>
            </div>
            <div class="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
              <div class="font-medium">比亚迪 新增</div>
              <div class="text-sm text-gray-500">技术派 建仓</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {}