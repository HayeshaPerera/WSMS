import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { WarehouseDashboardComponent } from './components/warehouse-dashboard/warehouse-dashboard.component';
import { SupermarketDashboardComponent } from './components/supermarket-dashboard/supermarket-dashboard.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { StockRequestsComponent } from './components/stock-requests/stock-requests.component';
import { DeliveriesComponent } from './components/deliveries/deliveries.component';
import { ForecastingComponent } from './components/forecasting/forecasting.component';
import { ProductsComponent } from './components/products/products.component';
import { WarehousesComponent } from './components/warehouses/warehouses.component';
import { SupermarketsComponent } from './components/supermarkets/supermarkets.component';
import { UsersComponent } from './components/users/users.component';
import { RoleLandingComponent } from './components/role-landing/role-landing.component';
import { AnalyticsDashboardComponent } from './components/analytics-dashboard/analytics-dashboard.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: DashboardComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: '', component: RoleLandingComponent },
      { path: 'admin', component: AdminDashboardComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'warehouse', component: WarehouseDashboardComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },
      { path: 'supermarket', component: SupermarketDashboardComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_ADMIN'] } },
      { path: 'inventory', component: InventoryComponent },
      { path: 'stock-requests', component: StockRequestsComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF', 'ROLE_SUPERMARKET_MANAGER'] } },
      { path: 'deliveries', component: DeliveriesComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF', 'ROLE_SUPERMARKET_MANAGER'] } },
      { path: 'analytics', component: AnalyticsDashboardComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF'] } },
      { path: 'forecasting', component: ForecastingComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF'] } },
      { path: 'products', component: ProductsComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'warehouses', component: WarehousesComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'supermarkets', component: SupermarketsComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'users', component: UsersComponent, data: { roles: ['ROLE_ADMIN'] } }
    ]
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
