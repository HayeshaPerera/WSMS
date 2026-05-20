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
      // Default child route: role-based landing page (redirects to /admin, /warehouse, or /supermarket)
      { path: '', component: RoleLandingComponent },

      // Role-specific dashboard routes (with role-based access control via route data)
      { path: 'admin', component: AdminDashboardComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'warehouse', component: WarehouseDashboardComponent, data: { roles: ['ROLE_WAREHOUSE_STAFF', 'ROLE_ADMIN'] } },
      { path: 'supermarket', component: SupermarketDashboardComponent, data: { roles: ['ROLE_SUPERMARKET_MANAGER', 'ROLE_ADMIN'] } },

      // Shared feature routes (accessible to multiple roles)
      { path: 'inventory', component: InventoryComponent },
      { path: 'stock-requests', component: StockRequestsComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF', 'ROLE_SUPERMARKET_MANAGER'] } },
      { path: 'deliveries', component: DeliveriesComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF', 'ROLE_SUPERMARKET_MANAGER'] } },

      // Analytics and forecasting routes (admin and warehouse staff)
      { path: 'analytics', component: AnalyticsDashboardComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF'] } },
      { path: 'forecasting', component: ForecastingComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF'] } },

      // Admin-only management routes
      { path: 'products', component: ProductsComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'warehouses', component: WarehousesComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'supermarkets', component: SupermarketsComponent, data: { roles: ['ROLE_ADMIN'] } },
      { path: 'users', component: UsersComponent, data: { roles: ['ROLE_ADMIN'] } },

      // Sales & AI Forecasting route (admin and supermarket managers)
      { path: 'sales', component: SalesForecastingComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_SUPERMARKET_MANAGER'] } },

      // GRN route (warehouse staff and admin)
      { path: 'grns', component: GrnComponent, data: { roles: ['ROLE_ADMIN', 'ROLE_WAREHOUSE_STAFF'] } }
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
