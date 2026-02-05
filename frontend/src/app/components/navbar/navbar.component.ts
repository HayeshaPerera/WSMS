import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { SharedDataService } from '../../services/shared-data.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';
import { RequestStatus, DeliveryStatus } from '../../models/models';
import { Location } from '@angular/common';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  pendingStockRequests = 0;
  pendingDeliveries = 0;
  lowStockCount = 0;
  sidebarOpen = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    public auth: AuthService,
    private sharedData: SharedDataService,
    public theme: ThemeService,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Subscribe to stock requests
    this.subscriptions.push(
      this.sharedData.stockRequests$.subscribe(requests => {
        this.pendingStockRequests = requests.filter(
          (r: any) => r.status === RequestStatus.PENDING
        ).length;
      })
    );

    // Subscribe to deliveries
    this.subscriptions.push(
      this.sharedData.deliveries$.subscribe(deliveries => {
        this.pendingDeliveries = deliveries.filter(
          (d: any) => d.status === DeliveryStatus.PENDING || d.status === DeliveryStatus.IN_TRANSIT
        ).length;
      })
    );

    // Subscribe to inventory for low stock alerts
    this.subscriptions.push(
      this.sharedData.inventory$.subscribe(inventory => {
        this.lowStockCount = inventory.filter(
          (i: any) => i.quantity <= i.reorderLevel
        ).length;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  goBack(): void {
    this.location.back();
  }

  logout(): void {
    this.auth.logout();
  }
}
