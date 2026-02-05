import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Components
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
import { NavbarComponent } from './components/navbar/navbar.component';
import { RoleLandingComponent } from './components/role-landing/role-landing.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { AnalyticsDashboardComponent } from './components/analytics-dashboard/analytics-dashboard.component';
import { LkrPipe } from './pipes/lkr.pipe';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    AdminDashboardComponent,
    WarehouseDashboardComponent,
    SupermarketDashboardComponent,
    InventoryComponent,
    StockRequestsComponent,
    DeliveriesComponent,
    ForecastingComponent,
    ProductsComponent,
    WarehousesComponent,
    SupermarketsComponent,
    UsersComponent,
    NavbarComponent,
    RoleLandingComponent,
    NotificationsComponent,
    AnalyticsDashboardComponent,
    LkrPipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
