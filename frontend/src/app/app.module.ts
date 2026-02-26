// Import NgModule decorator for defining Angular modules
import { NgModule } from '@angular/core';
// Import BrowserModule: required for running in a browser (provides DOM rendering, pipes, etc.)
import { BrowserModule } from '@angular/platform-browser';
// Import HttpClientModule for making HTTP API requests, HTTP_INTERCEPTORS for registering interceptors
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
// Import FormsModule for template-driven forms (ngModel) and ReactiveFormsModule for reactive forms
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// Import BrowserAnimationsModule for Angular animation support (@angular/animations)
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Import the routing module that defines all application routes
import { AppRoutingModule } from './app-routing.module';
// Import the root application component
import { AppComponent } from './app.component';
// Import the JWT authentication interceptor that adds auth tokens to HTTP requests
import { AuthInterceptor } from './interceptors/auth.interceptor';

// ========================
// Component Imports
// ========================

// Login page component: handles user authentication
import { LoginComponent } from './components/login/login.component';
// Dashboard component: main layout wrapper with router outlet
import { DashboardComponent } from './components/dashboard/dashboard.component';
// Admin dashboard: overview cards and statistics for admin users
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
// Warehouse dashboard: inventory and shipment stats for warehouse staff
import { WarehouseDashboardComponent } from './components/warehouse-dashboard/warehouse-dashboard.component';
// Supermarket dashboard: store-specific metrics for supermarket managers
import { SupermarketDashboardComponent } from './components/supermarket-dashboard/supermarket-dashboard.component';
// Inventory management: list, search, and manage stock items
import { InventoryComponent } from './components/inventory/inventory.component';
// Stock requests: create, approve, and track stock orders
import { StockRequestsComponent } from './components/stock-requests/stock-requests.component';
// Deliveries: manage shipments and update delivery statuses
import { DeliveriesComponent } from './components/deliveries/deliveries.component';
// Forecasting: AI demand prediction charts and analysis
import { ForecastingComponent } from './components/forecasting/forecasting.component';
// Products: CRUD management for product catalog (admin only)
import { ProductsComponent } from './components/products/products.component';
// Warehouses: CRUD management for warehouse locations (admin only)
import { WarehousesComponent } from './components/warehouses/warehouses.component';
// Supermarkets: CRUD management for store locations (admin only)
import { SupermarketsComponent } from './components/supermarkets/supermarkets.component';
// Users: staff management and role assignment (admin only)
import { UsersComponent } from './components/users/users.component';
// Navbar: top navigation bar, sidebar menu, and notification bell
import { NavbarComponent } from './components/navbar/navbar.component';
// Role Landing: redirects users to their role-specific dashboard after login
import { RoleLandingComponent } from './components/role-landing/role-landing.component';
// Notifications: floating toast notification stack display
import { NotificationsComponent } from './components/notifications/notifications.component';
// Analytics Dashboard: advanced charts and analytics views
import { AnalyticsDashboardComponent } from './components/analytics-dashboard/analytics-dashboard.component';
// Sales Forecasting: sales analytics, KPIs, charts, and AI demand forecast
import { SalesForecastingComponent } from './components/sales-forecasting/sales-forecasting.component';
// LKR Pipe: custom pipe for formatting Sri Lankan Rupee currency values
import { LkrPipe } from './pipes/lkr.pipe';

/**
 * AppModule is the root module of the WSMS Angular application.
 * It declares all components, imports required Angular modules,
 * and configures the authentication interceptor.
 */
@NgModule({
  // Declare all components and pipes that belong to this module
  declarations: [
    AppComponent,                   // Root app component
    LoginComponent,                 // Login page
    DashboardComponent,            // Main dashboard layout
    AdminDashboardComponent,       // Admin-specific dashboard
    WarehouseDashboardComponent,   // Warehouse staff dashboard
    SupermarketDashboardComponent, // Store manager dashboard
    InventoryComponent,            // Inventory management
    StockRequestsComponent,        // Stock request management
    DeliveriesComponent,           // Delivery management
    ForecastingComponent,          // AI forecasting charts
    ProductsComponent,             // Product catalog management
    WarehousesComponent,           // Warehouse management
    SupermarketsComponent,         // Store management
    UsersComponent,                // Staff management
    NavbarComponent,               // Navigation bar + sidebar
    RoleLandingComponent,          // Role-based landing router
    NotificationsComponent,        // Toast notification display
    AnalyticsDashboardComponent,   // Analytics charts
    SalesForecastingComponent,     // Sales + AI forecast page
    LkrPipe                        // Currency formatting pipe
  ],
  // Import required Angular modules
  imports: [
    BrowserModule,                 // Core browser rendering engine
    AppRoutingModule,              // Application route definitions
    HttpClientModule,              // HTTP client for API requests
    FormsModule,                   // Template-driven forms (ngModel)
    ReactiveFormsModule,           // Reactive forms (FormGroup, FormControl)
    BrowserAnimationsModule        // Animation support (@angular/animations)
  ],
  // Configure application-wide service providers
  providers: [
    {
      provide: HTTP_INTERCEPTORS,    // Register as an HTTP interceptor
      useClass: AuthInterceptor,     // Use our custom AuthInterceptor class
      multi: true                    // Allow multiple interceptors (don't override existing ones)
    }
  ],
  // Define the root component that Angular bootstraps on application start
  bootstrap: [AppComponent]
})
export class AppModule { }
