import { Component, OnInit } from '@angular/core';
import { AnalyticsService, Alert, ReorderRecommendation, CostAnalysis } from '../../services/analytics.service';
import { AuditLogService, AuditLog } from '../../services/audit-log.service';
import { SharedDataService } from '../../services/shared-data.service';
import { InventoryService } from '../../services/inventory.service';
import { DeliveryService } from '../../services/delivery.service';
import { StockRequestService } from '../../services/stock-request.service';
import { AuthService } from '../../services/auth.service';
import { PdfReportService } from '../../services/pdf-report.service';
import { NotificationService } from '../../services/notification.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.css']
})
export class AnalyticsDashboardComponent implements OnInit {
    public demoInventory: any[] = [
      { id: 1, product: { id: 1, sku: 'PROD001', name: 'Milk 1L', category: 'Dairy', unitPrice: 2.99, reorderLevel: 50, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }, quantity: 100, reorderLevel: 50, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, product: { id: 2, sku: 'PROD002', name: 'Bread Loaf', category: 'Bakery', unitPrice: 1.99, reorderLevel: 40, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }, quantity: 50, reorderLevel: 40, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() }
    ];
    public demoDeliveries: any[] = [
      { id: 1, trackingNumber: 'TRK-001', product: null, quantity: 100, status: 'DELIVERED', estimatedDelivery: new Date(), actualDelivery: new Date(), createdAt: new Date(), updatedAt: new Date() },
      { id: 2, trackingNumber: 'TRK-002', product: null, quantity: 50, status: 'IN_TRANSIT', estimatedDelivery: new Date(), createdAt: new Date(), updatedAt: new Date() }
    ];
    public demoRequests: any[] = [
      { id: 1, product: null, requestedQuantity: 100, status: 'APPROVED', requestDate: new Date(), approvalDate: new Date() },
      { id: 2, product: null, requestedQuantity: 50, status: 'PENDING', requestDate: new Date(), approvalDate: null }
    ];
  alerts: Alert[] = [];
  criticalAlerts: Alert[] = [];
  reorderRecommendations: ReorderRecommendation[] = [];
  costAnalysis: CostAnalysis | null = null;
  recentAuditLogs: AuditLog[] = [];
  
  selectedTab: 'alerts' | 'reorder' | 'costs' | 'audit' = 'alerts';
  
  alertStats = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  constructor(
    private analytics: AnalyticsService,
    private auditLog: AuditLogService,
    private sharedData: SharedDataService,
    private pdfReport: PdfReportService,
    private inventoryService: InventoryService,
    private deliveryService: DeliveryService,
    private stockRequestService: StockRequestService,
    private notifications: NotificationService,
    public auth: AuthService
  ) {}


  ngOnInit(): void {
    this.initializeHardcodedData();
    
    // Load real analytics from backend data
    this.loadAnalytics();
    
    // Subscribe to alerts
    this.analytics.alerts$.subscribe(alerts => {
      this.alerts = alerts;
      this.calculateAlertStats();
    });
    
    this.analytics.reorderRecommendations$.subscribe(recs => {
      this.reorderRecommendations = recs;
    });
    
    // Load audit logs
    this.recentAuditLogs = this.auditLog.getRecentLogs(20);
  }

  initializeHardcodedData(): void {
    // Comprehensive demo inventory with LKR prices
    this.demoInventory = [
      { id: 1, product: { id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy', unitPrice: 899.00, reorderLevel: 50, minStockLevel: 30, perishable: true, active: true }, quantity: 150, reorderLevel: 50, lowStockAlert: false },
      { id: 2, product: { id: 2, sku: 'PROD002', name: 'White Bread Loaf', category: 'Bakery', unitPrice: 449.00, reorderLevel: 40, minStockLevel: 20, perishable: true, active: true }, quantity: 200, reorderLevel: 40, lowStockAlert: false },
      { id: 3, product: { id: 3, sku: 'PROD003', name: 'Premium Ground Coffee', category: 'Beverages', unitPrice: 2499.00, reorderLevel: 30, minStockLevel: 10, perishable: false, active: true }, quantity: 85, reorderLevel: 30, lowStockAlert: false },
      { id: 4, product: { id: 4, sku: 'PROD004', name: 'Cheddar Cheese Block', category: 'Dairy', unitPrice: 1199.00, reorderLevel: 25, minStockLevel: 8, perishable: true, active: true }, quantity: 18, reorderLevel: 25, lowStockAlert: true },
      { id: 5, product: { id: 5, sku: 'PROD005', name: 'Chicken Breast (1kg)', category: 'Meat', unitPrice: 1599.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true }, quantity: 65, reorderLevel: 35, lowStockAlert: false },
      { id: 6, product: { id: 6, sku: 'PROD006', name: 'Eggs (Dozen)', category: 'Dairy', unitPrice: 599.00, reorderLevel: 45, minStockLevel: 20, perishable: true, active: true }, quantity: 320, reorderLevel: 45, lowStockAlert: false },
      { id: 7, product: { id: 7, sku: 'PROD007', name: 'Olive Oil 500ml', category: 'Cooking', unitPrice: 1899.00, reorderLevel: 20, minStockLevel: 8, perishable: false, active: true }, quantity: 12, reorderLevel: 20, lowStockAlert: true },
      { id: 8, product: { id: 8, sku: 'PROD008', name: 'Brown Rice 2kg', category: 'Grains', unitPrice: 749.00, reorderLevel: 30, minStockLevel: 12, perishable: false, active: true }, quantity: 95, reorderLevel: 30, lowStockAlert: false }
    ];
    
    this.demoDeliveries = [
      { id: 1, trackingNumber: 'TRK-2026-001', product: this.demoInventory[0].product, quantity: 100, status: 'DELIVERED', estimatedDelivery: new Date('2026-02-03'), deliveredAt: new Date('2026-02-03') },
      { id: 2, trackingNumber: 'TRK-2026-002', product: this.demoInventory[2].product, quantity: 50, status: 'IN_TRANSIT', estimatedDelivery: new Date('2026-02-06') },
      { id: 3, trackingNumber: 'TRK-2026-003', product: this.demoInventory[7].product, quantity: 120, status: 'DELIVERED', estimatedDelivery: new Date('2026-02-02'), deliveredAt: new Date('2026-02-02') },
      { id: 4, trackingNumber: 'TRK-2026-004', product: this.demoInventory[5].product, quantity: 200, status: 'DISPATCHED', estimatedDelivery: new Date('2026-02-07') }
    ];
    
    this.demoRequests = [
      { id: 1, product: this.demoInventory[0].product, requestedQuantity: 100, status: 'APPROVED', requestDate: new Date('2026-02-01'), approvalDate: new Date('2026-02-02') },
      { id: 2, product: this.demoInventory[2].product, requestedQuantity: 50, status: 'PENDING', requestDate: new Date('2026-02-04') },
      { id: 3, product: this.demoInventory[4].product, requestedQuantity: 75, status: 'PENDING', requestDate: new Date('2026-02-05') }
    ];
  }

  runAnalytics(): void {
    this.analytics.analyzeInventory(this.demoInventory, []);
    this.analytics.analyzeDeliveries(this.demoDeliveries);
    this.analytics.generateReorderRecommendations(this.demoInventory);
    this.costAnalysis = this.analytics.calculateCostAnalysis(this.demoInventory, this.demoDeliveries, this.demoRequests);
  }

  // Expose Math for template use
  Math = Math;

  loadAnalytics(): void {
    // Fetch real data from backend and feed analytics
    forkJoin({
      inventory: this.inventoryService.getAllInventory(),
      deliveries: this.deliveryService.getAllDeliveries(),
      requests: this.stockRequestService.getAllRequests()
    }).subscribe({
      next: ({ inventory, deliveries, requests }) => {
        const extractArray = (res: any) => {
          if (Array.isArray(res)) return res;
          if (res && typeof res === 'object' && Array.isArray(res.data)) return res.data;
          if (res && typeof res === 'object' && Array.isArray(res.content)) return res.content;
          return [];
        };

        let invArray = extractArray(inventory);
        let delArray = extractArray(deliveries);
        let reqArray = extractArray(requests);

        // Fallback to demo data if API returns empty (for demonstration purposes)
        if (invArray.length === 0) invArray = this.demoInventory;
        if (delArray.length === 0) delArray = this.demoDeliveries;
        if (reqArray.length === 0) reqArray = this.demoRequests;

        this.analytics.analyzeInventory(invArray, []);
        this.analytics.analyzeDeliveries(delArray);
        this.analytics.generateReorderRecommendations(invArray);

        this.costAnalysis = this.analytics.calculateCostAnalysis(invArray, delArray, reqArray);
      },
      error: err => {
        console.error('Failed to load analytics data, falling back to local demo data', err);
        this.runAnalytics();
      }
    });
  }

  get unacknowledgedAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  acknowledgeAlert(alertId: number): void {
    this.analytics.acknowledgeAlert(alertId);
  }

  clearAcknowledged(): void {
    this.analytics.clearAcknowledgedAlerts();
  }

  createStockRequest(rec: ReorderRecommendation): void {
    const user = this.auth.getCurrentUser();
    const supermarketId = user?.supermarketId || 1;

    const newRequest = {
      supermarketId: supermarketId,
      warehouseId: 1, // Central Warehouse
      productId: rec.productId,
      requestedQuantity: rec.recommendedQuantity,
      status: 'PENDING',
      priority: 'MEDIUM',
      notes: `Automated restock request based on AI reorder recommendation: ${rec.reasoning}`,
      requestedAt: new Date()
    };

    this.stockRequestService.createRequest(newRequest as any).subscribe({
      next: (res) => {
        this.notifications.success(`Stock request submitted for ${rec.productName}`);
        
        // Add to shared data to keep UI synced
        const created = res && (res as any).data ? (res as any).data : null;
        const enriched = {
          id: created?.id || Date.now(),
          requestNumber: created?.requestNumber || `REQ-${Date.now()}`,
          supermarket: { id: supermarketId, name: `Supermarket #${supermarketId}` },
          warehouse: { id: 1, name: 'Central Warehouse' },
          product: { id: rec.productId, name: rec.productName },
          requestedQuantity: rec.recommendedQuantity,
          status: 'PENDING',
          priority: 'MEDIUM',
          requestedBy: null,
          requestedAt: new Date()
        };
        this.sharedData.addStockRequest(enriched);
        
        // Refresh analytics data
        this.loadAnalytics();
      },
      error: (err) => {
        this.notifications.error('Failed to submit restock request');
        console.error(err);
      }
    });
  }

  getSeverityClass(severity: string): string {
    const classes: any = {
      'CRITICAL': 'severity-critical',
      'HIGH': 'severity-high',
      'MEDIUM': 'severity-medium',
      'LOW': 'severity-low'
    };
    return classes[severity] || '';
  }

  getAlertIcon(type: string): string {
    const icons: any = {
      'LOW_STOCK': '📉',
      'EXPIRING': '⏰',
      'DELAYED_DELIVERY': '🚨',
      'DEMAND_SPIKE': '📈',
      'COST_WARNING': '💰'
    };
    return icons[type] || '⚠️';
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 85) return 'confidence-high';
    if (confidence >= 70) return 'confidence-medium';
    return 'confidence-low';
  }

  formatCurrency(value: number): string {
    return '$' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  private calculateAlertStats(): void {
    this.alertStats = {
      critical: this.alerts.filter(a => a.severity === 'CRITICAL').length,
      high: this.alerts.filter(a => a.severity === 'HIGH').length,
      medium: this.alerts.filter(a => a.severity === 'MEDIUM').length,
      low: this.alerts.filter(a => a.severity === 'LOW').length
    };
  }

  searchAuditLogs(query: string): void {
    if (query.trim()) {
      this.recentAuditLogs = this.auditLog.searchLogs(query).slice(0, 20);
    } else {
      this.recentAuditLogs = this.auditLog.getRecentLogs(20);
    }
  }

  exportToPdf(): void {
    this.pdfReport.generateAnalyticsReport(
      this.alerts,
      this.reorderRecommendations,
      this.costAnalysis || {
        totalInventoryValue: 0,
        totalCostImpact: 0,
        excessInventoryCost: 0,
        stockoutCost: 0,
        deliveryDelayCost: 0,
        monthlyTrend: 0
      }
    );
  }
}
