import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface VIPUser {
  id: number;
  xueqiu_id: string;
  nickname: string;
  avatar: string | null;
  followers: number;
  description: string | null;
}

export interface Status {
  id: string;
  user_id: string;
  text: string;
  title: string;
  link: string;
  created_at: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
}

export interface Portfolio {
  cube_id: string;
  name: string;
  symbol: string;
  net_value: number;
  total_gain: number;
}

export interface Rebalancing {
  cube_id: string;
  rebalancing_id: string;
  created_at: number;
  holdings: HoldingItem[];
}

export interface HoldingItem {
  stock_code: string;
  stock_name: string;
  weight: number;
  prev_weight: number;
  price: number;
  target_weight?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VipService {
  private apiUrl = '/api/vip';

  constructor(private http: HttpClient) {}

  // ============ 大V管理 ============

  getVipList(skip: number = 0, limit: number = 20): Observable<VIPUser[]> {
    return this.http.get<VIPUser[]>(`${this.apiUrl}?skip=${skip}&limit=${limit}`);
  }

  addVip(xueqiuId: string, nickname?: string, followers?: number): Observable<VIPUser> {
    const body: any = { xueqiu_id: xueqiuId };
    if (nickname) body.nickname = nickname;
    if (followers) body.followers = followers;
    return this.http.post<VIPUser>(this.apiUrl, body);
  }

  getVipDetail(id: number): Observable<VIPUser> {
    return this.http.get<VIPUser>(`${this.apiUrl}/${id}`);
  }

  deleteVip(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // ============ 动态相关 ============

  /**
   * 获取大V动态
   * @param vipId 大V ID
   * @param type 动态类型: 0=原发布, 11=交易
   */
  getVipStatuses(vipId: number, type: number = 0, count: number = 10): Observable<Status[]> {
    return this.http.get<Status[]>(`${this.apiUrl}/${vipId}/statuses`, {
      params: { status_type: type.toString(), count: count.toString() }
    });
  }

  // ============ 组合相关 ============

  /**
   * 获取大V组合列表
   */
  getVipPortfolios(vipId: number): Observable<Portfolio[]> {
    return this.http.get<Portfolio[]>(`${this.apiUrl}/${vipId}/portfolios`);
  }

  /**
   * 获取组合调仓历史
   */
  getPortfolioRebalancing(vipId: number, cubeSymbol: string, count: number = 10): Observable<Rebalancing[]> {
    return this.http.get<Rebalancing[]>(`${this.apiUrl}/${vipId}/rebalancing/${cubeSymbol}`, {
      params: { count: count.toString() }
    });
  }

  // ============ 辅助方法 ============

  /**
   * 格式化粉丝数
   */
  formatFollowers(count: number): string {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    }
    return count.toString();
  }

  /**
   * 格式化时间
   */
  formatTime(timestamp: number | string): string {
    if (!timestamp) return '';
    
    let date: Date;
    if (typeof timestamp === 'number') {
      // 毫秒时间戳
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }
    
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

  /**
   * 格式化持仓变动
   */
  formatWeightChange(current: number, previous: number): { text: string; class: string } {
    const change = current - previous;
    
    if (change > 0) {
      return { text: `+${change.toFixed(2)}%`, class: 'text-green-600' };
    } else if (change < 0) {
      return { text: `${change.toFixed(2)}%`, class: 'text-red-600' };
    }
    return { text: '-', class: 'text-gray-400' };
  }
}