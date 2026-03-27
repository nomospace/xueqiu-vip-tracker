import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'timeline',
    loadComponent: () => import('./pages/timeline/timeline.component').then(m => m.TimelineComponent)
  },
  {
    path: 'my-posts',
    loadComponent: () => import('./pages/my-posts/my-posts.component').then(m => m.MyPostsComponent)
  },
  {
    path: 'vip',
    loadComponent: () => import('./pages/vip-list/vip-list.component').then(m => m.VipListComponent)
  },
  {
    path: 'holdings',
    loadComponent: () => import('./pages/holding-list/holding-list.component').then(m => m.HoldingListComponent)
  },
  {
    path: 'watchlist',
    loadComponent: () => import('./pages/watchlist-changes/watchlist-changes.component').then(m => m.WatchlistChangesComponent)
  },
  {
    path: 'summary',
    loadComponent: () => import('./pages/daily-summary/daily-summary.component').then(m => m.DailySummaryComponent)
  }
];