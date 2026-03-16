import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-holding-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-gray-800">📈 持仓变动</h1>

      <div class="flex gap-4">
        <select class="px-4 py-2 border rounded-lg">
          <option>全部大V</option>
          <option>投资大V</option>
          <option>价值投资者</option>
          <option>技术派</option>
        </select>
        <select class="px-4 py-2 border rounded-lg">
          <option>全部变动</option>
          <option>加仓</option>
          <option>减仓</option>
          <option>新增</option>
          <option>清仓</option>
        </select>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-500">大V</th>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-500">股票</th>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-500">变动</th>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-500">原仓位</th>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-500">新仓位</th>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-500">时间</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            @for (change of changes; track change.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">{{ change.vipName }}</td>
                <td class="px-6 py-4">
                  <div class="font-medium">{{ change.stockName }}</div>
                  <div class="text-sm text-gray-500">{{ change.stockCode }}</div>
                </td>
                <td class="px-6 py-4">
                  <span [class]="getChangeClass(change.type)">
                    {{ getChangeText(change.type) }}
                  </span>
                </td>
                <td class="px-6 py-4">{{ change.oldPosition }}%</td>
                <td class="px-6 py-4 font-bold">{{ change.newPosition }}%</td>
                <td class="px-6 py-4 text-gray-500">{{ change.time }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class HoldingListComponent {
  changes = [
    { id: 1, vipName: '投资大V', stockCode: '600519', stockName: '贵州茅台', type: 'increase', oldPosition: 10.0, newPosition: 15.5, time: '10分钟前' },
    { id: 2, vipName: '价值投资者', stockCode: '300750', stockName: '宁德时代', type: 'decrease', oldPosition: 8.5, newPosition: 5.3, time: '30分钟前' },
    { id: 3, vipName: '技术派', stockCode: '002594', stockName: '比亚迪', type: 'add', oldPosition: 0, newPosition: 6.8, time: '1小时前' },
    { id: 4, vipName: '成长猎手', stockCode: '000001', stockName: '平安银行', type: 'remove', oldPosition: 5.0, newPosition: 0, time: '2小时前' },
  ];

  getChangeClass(type: string): string {
    const classes: Record<string, string> = {
      'increase': 'px-2 py-1 bg-green-100 text-green-600 rounded text-sm',
      'decrease': 'px-2 py-1 bg-red-100 text-red-600 rounded text-sm',
      'add': 'px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm',
      'remove': 'px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm',
    };
    return classes[type] || '';
  }

  getChangeText(type: string): string {
    const texts: Record<string, string> = {
      'increase': '📈 加仓',
      'decrease': '📉 减仓',
      'add': '➕ 新增',
      'remove': '➖ 清仓',
    };
    return texts[type] || type;
  }
}