// Import NgModule decorator for defining Angular modules
import { NgModule } from '@angular/core';
// Import Angular Router utilities: RouterModule for route config, Routes type for route definitions
import { RouterModule, Routes } from '@angular/router';
// Import AuthGuard to protect routes from unauthenticated access
import { AuthGuard } from './guards/auth.guard';

// ========================
// Component Imports for Route Definitions
// ========================

// Login page: handles user authentication
import { LoginComponent } from './components/login/login.component';
// Dashboard: main layout wrapper with sidebar + router outlet
import { DashboardComponent } from './components/dashboard/dashboard.component';
// Admin dashboard: overview cards and system-wide statistics
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
// Warehouse dashboard: inventory and shipment stats for warehouse staff
import { WarehouseDashboardComponent } from './components/warehouse-dashboard/warehouse-dashboard.component';
// Supermarket dashboard: store-specific metrics for supermarket managers
import { SupermarketDashboardComponent } from './components/supermarket-dashboard/supermarket-dashboard.component';
// Inventory management: search, filter, and manage stock items
import { InventoryComponent } from './components/inventory/inventory.component';
// Stock request management: create, approve, reject, manage orders
import { StockRequestsComponent } from './components/stock-requests/stock-requests.component';
// Delivery management: track and update shipment statuses
import { DeliveriesComponent } from './components/deliveries/deliveries.component';
// Forecasting: AI demand prediction charts and analysis
import { ForecastingComponent } from './components/forecasting/forecasting.component';
// Products management: CRUD operations for product catalog
import { ProductsComponent } from './components/products/products.component';
// Warehouse management: CRUD operations for warehouse locations
import { WarehousesComponent } from './components/warehouses/warehouses.component';
// Supermarket management: CRUD operations for store locations
import { SupermarketsComponent } from './components/supermarkets/supermarkets.component';
// User/Staff management: manage users and assign roles
import { UsersComponent } from './components/users/users.component';
// Role landing: redirects user to their role-specific dashboard
import { RoleLandingComponent } from './components/role-landing/role-landing.component';
// Analytics dashboard: advanced charts and analytics visualizations
import { AnalyticsDashboardComponent } from './components/analytics-dashboard/analytics-dashboard.component';
// Sales & AI Forecasting: combined sales analytics and demand prediction
import { SalesForecastingComponent } from './components/sales-forecasting/sales-forecasting.component';
// GRN management: Goods Received Notes for warehouse supplier intake
import { GrnComponent } from './components/grn/grn.component';
// System audit logs: admin ledger
import { AuditLogsComponent } from './components/audit-logs/audit-logs.component';
// Supermarket stock monitor: AI replenishment
import { StockMonitorComponent } from './components/stock-monitor/stock-monitor.component';
// Reconciliation: admin stock reconciliation
import { ReconciliationComponent } from './components/reconciliation/reconciliation.component';
// Reports: system-wide reporting
import { ReportsComponent } from './components/reports/reports.component';
// Supermarket POS: processing retail sales
import { SupermarketPosComponent } from './components/supermarkets/supermarket-pos/supermarket-pos.component';

/**
 * Application route definitions.
 *
 * Structure:
 * - /login             → LoginComponent (public, no guard)
 * - / (root)           → DashboardComponent (protected layout with child routes)
 *   - /                → RoleLandingComponent (redirects to role-specific dashboard)
 *   - /admin           → AdminDashboardComponent (ROLE_ADMIN only)
 *   - /warehouse       → WarehouseDashboardComponent (ROLE_WAREHOUSE_STAFF, ROLE_ADMIN)
 *   - /supermarket     → SupermarketDashboardComponent (ROLE_SUPERMARKET_MANAGER, ROLE_ADMIN)
 *   - /inventory       → InventoryComponent (all authenticated users)
 *   - /stock-requests  → StockRequestsComponent (admin, warehouse, supermarket)
 *   - /deliveries      → DeliveriesComponent (admin, warehouse, supermarket)
 *   - /analytics       → AnalyticsDashboardComponent (admin, warehouse)
 *   - /forecasting     → ForecastingComponent (admin, warehouse)
 *   - /products        → ProductsComponent (admin only)
 *   - /warehouses      → WarehousesComponent (admin only)
 *   - /supermarkets    → SupermarketsComponent (admin only)
 *   - /users           → UsersComponent (admin only)
 *   - /sales           → SalesForecastingComponent (admin, supermarket manager)
 * - /** (wildcard)     → Redirect to root
 */
const routes: Routes = [
// Public login route: no authentication required
  { path: 'login', component: LoginComponent },

  // Protected root route: requires authentication via AuthGuard
  {
    path: '',
    component: DashboardComponent,           // Main layout component
    canActivate: [AuthGuard],                // Guard: must be logged in to access
    canActivateChild: [AuthGuard],           // Guard: applies to all child routes too
    children: [
      // Default child route: role-based landing page (redirects to /admin/dashboard, /warehouse/dashboard, or /supermarket/dashboard)
      { path: '', component: RoleLandingComponent },

      // ── ADMIN ROUTES ────────────────────────────────────────
      { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
      { path: 'admin/dashboard', component: AdminDashboardComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/users', component: UsersComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/products', component: ProductsComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/warehouses', component: WarehousesComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/supermarkets', component: SupermarketsComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/inventory', component: InventoryComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/stock-requests', component: StockRequestsComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/deliveries', component: DeliveriesComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/sales', component: SalesForecastingComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/analytics', component: AnalyticsDashboardComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/audit-logs', component: AuditLogsComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/reconciliation', component: ReconciliationComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'admin/reports', component: ReportsComponent, data: { roles: ['ROLE_ADMIN'] } },

      // ── WAREHOUSE ROUTES ────────────────────────────────────
      { path: 'warehouse', redirectTo: 'warehouse/dashboard', pathMatch: 'full' },
      { path: 'warehouse/dashboard', component: WarehouseDashboardComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },
      { path: 'warehouse/inventory', component: InventoryComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },
      { path: 'warehouse/grns', component: GrnComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },
      { path: 'warehouse/stock-requests', component: StockRequestsComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },
      { path: 'warehouse/deliveries', component: DeliveriesComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },
      { path: 'warehouse/analytics', component: AnalyticsDashboardComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },
      { path: 'warehouse/reconciliation', component: ReconciliationComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },

      // ── SUPERMARKET ROUTES ──────────────────────────────────
      { path: 'supermarket', redirectTo: 'supermarket/dashboard', pathMatch: 'full' },
      { path: 'supermarket/dashboard', component: SupermarketDashboardComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_ADMIN'] } },
      { path: 'supermarket/stock-monitor', component: StockMonitorComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_ADMIN'] } },
      { path: 'supermarket/stock-requests', component: StockRequestsComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_ADMIN'] } },
      { path: 'supermarket/deliveries', component: DeliveriesComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_ADMIN'] } },
      { path: 'supermarket/sales', component: SalesForecastingComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_ADMIN'] } },
      { path: 'supermarket/pos', component: SupermarketPosComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_SUPERMARKET_STAFF', 'ROLE_ADMIN'] } },
      { path: 'supermarket/forecasting', component: ForecastingComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_ADMIN'] } },

      // Legacy fallback mapping redirects (redirect un-prefixed to default dashboards)
      { path: 'inventory', redirectTo: 'admin/inventory', pathMatch: 'full' },
      { path: 'stock-requests', redirectTo: 'admin/stock-requests', pathMatch: 'full' },
      { path: 'deliveries', redirectTo: 'admin/deliveries', pathMatch: 'full' },
      { path: 'analytics', redirectTo: 'admin/analytics', pathMatch: 'full' },
      { path: 'forecasting', redirectTo: 'supermarket/forecasting', pathMatch: 'full' },
      { path: 'products', redirectTo: 'admin/products', pathMatch: 'full' },
      { path: 'warehouses', redirectTo: 'admin/warehouses', pathMatch: 'full' },
      { path: 'supermarkets', redirectTo: 'admin/supermarkets', pathMatch: 'full' },
      { path: 'users', redirectTo: 'admin/users', pathMatch: 'full' },
      { path: 'sales', redirectTo: 'supermarket/sales', pathMatch: 'full' },
      { path: 'grns', redirectTo: 'warehouse/grns', pathMatch: 'full' }
    ]
  },

  // Wildcard route: redirect any unmatched URLs back to the root
  { path: '**', redirectTo: '' }
];

/**
 * AppRoutingModule configures the Angular Router with all application routes.
 * Uses RouterModule.forRoot() to register routes at the application root level.
 */
@NgModule({
  // Register routes using forRoot (only in the root module)
  imports: [RouterModule.forRoot(routes)],
  // Export RouterModule so it's available to the root AppModule
  exports: [RouterModule]
})
export class AppRoutingModule { }
