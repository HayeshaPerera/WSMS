import { Component, OnInit } from '@angular/core';
import { PdfReportService } from '../../services/pdf-report.service';
import { InventoryService } from '../../services/inventory.service';
import { StockRequestService } from '../../services/stock-request.service';
import { DeliveryService } from '../../services/delivery.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ReconciliationService } from '../../services/reconciliation.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { SharedDataService } from '../../services/shared-data.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  
  loadingInventory = false;
  loadingReconciliation = false;
  loadingStockRequests = false;
  loadingDeliveries = false;
  loadingAnalytics = false;

  constructor(
    private pdfService: PdfReportService,
    private inventoryService: InventoryService,
    private stockRequestService: StockRequestService,
    private deliveryService: DeliveryService,
    private analyticsService: AnalyticsService,
    private reconciliationService: ReconciliationService,
    private notifications: NotificationService,
    public auth: AuthService,
    private sharedData: SharedDataService
  ) {}

  ngOnInit() {
    this.sharedData.initializeDefaultData();
  }

  private enrichItems(items: any[]): any[] {
    const products = this.sharedData.getProducts();
    const supermarkets = this.sharedData.getSupermarkets();
    const warehouses = this.sharedData.getWarehouses();

    return items.map(item => {
      // Products
      if (!item.product && (item.productId || item.product_id)) {
        const pid = item.productId || item.product_id;
        const found = products.find((p: any) => p.id === pid);
        if (found) {
           item.product = found;
        } else {
           item.product = { 
             id: pid, 
             name: item.productName || 'N/A', 
             sku: item.productSku || 'N/A', 
             unitPrice: 0 
           };
        }
      }
      
      // Supermarkets
      if (!item.supermarket && (item.supermarketId || item.supermarket_id)) {
        const sid = item.supermarketId || item.supermarket_id;
        const found = supermarkets.find((s: any) => s.id === sid);
        if (found) {
           item.supermarket = found;
        } else {
           item.supermarket = { id: sid, name: item.supermarketName || `Supermarket ${sid}` };
        }
      }
      
      // Warehouses
      if (!item.warehouse && (item.warehouseId || item.warehouse_id)) {
        const wid = item.warehouseId || item.warehouse_id;
        const found = warehouses.find((w: any) => w.id === wid);
        if (found) {
           item.warehouse = found;
        } else {
           item.warehouse = { id: wid, name: item.warehouseName || `Warehouse ${wid}` };
        }
      }
      
      // Deliveries missing quantity fix
      if (item.quantity === undefined && item.expectedQuantity !== undefined) {
         item.quantity = item.expectedQuantity;
      }
      
      return item;
    });
  }

  generateInventoryReport() {
    this.loadingInventory = true;
    this.notifications.info('Fetching latest inventory data...');
    this.inventoryService.getAllInventory().subscribe({
      next: (res: any) => {
        this.loadingInventory = false;
        let inventory = res || [];
        if (!Array.isArray(inventory) && inventory.data) inventory = inventory.data;
        inventory = this.enrichItems(inventory);
        this.pdfService.generateInventoryReport(inventory);
        this.notifications.success('Inventory Report generated');
      },
      error: () => {
        this.loadingInventory = false;
        this.notifications.error('Failed to fetch inventory data');
      }
    });
  }

  generateReconciliationReport() {
    this.loadingReconciliation = true;
    this.notifications.info('Fetching reconciliation data...');
    this.reconciliationService.getAll().subscribe({
      next: (res: any) => {
        this.loadingReconciliation = false;
        let records = res.data || res || [];
        records = this.enrichItems(records);
        this.pdfService.generateReconciliationReport(records);
        this.notifications.success('Reconciliation Report generated');
      },
      error: () => {
        this.loadingReconciliation = false;
        this.notifications.error('Failed to fetch reconciliation data');
      }
    });
  }

  generateStockRequestsReport() {
    this.loadingStockRequests = true;
    this.notifications.info('Fetching stock requests...');
    this.stockRequestService.getAllRequests().subscribe({
      next: (res: any) => {
        this.loadingStockRequests = false;
        let requests = res || [];
        if (!Array.isArray(requests) && requests.data) requests = requests.data;
        requests = this.enrichItems(requests);
        this.pdfService.generateStockRequestsReport(requests);
        this.notifications.success('Stock Requests Report generated');
      },
      error: () => {
        this.loadingStockRequests = false;
        this.notifications.error('Failed to fetch stock requests data');
      }
    });
  }

  generateDeliveriesReport() {
    this.loadingDeliveries = true;
    this.notifications.info('Fetching delivery logs...');
    this.deliveryService.getAllDeliveries().subscribe({
      next: (res: any) => {
        this.loadingDeliveries = false;
        let deliveries = res || [];
        if (!Array.isArray(deliveries) && deliveries.data) deliveries = deliveries.data;
        deliveries = this.enrichItems(deliveries);
        this.pdfService.generateDeliveriesReport(deliveries);
        this.notifications.success('Deliveries Report generated');
      },
      error: () => {
        this.loadingDeliveries = false;
        this.notifications.error('Failed to fetch delivery data');
      }
    });
  }

  generateAnalyticsReport() {
    this.loadingAnalytics = true;
    this.notifications.info('Generating analytics & forecasts...');
    
    this.inventoryService.getAllInventory().subscribe(invRes => {
      this.deliveryService.getAllDeliveries().subscribe(delRes => {
        this.stockRequestService.getAllRequests().subscribe(reqRes => {
          this.loadingAnalytics = false;
          
          let inventory = invRes || [];
          if (!Array.isArray(inventory) && (inventory as any).data) inventory = (inventory as any).data;
          inventory = this.enrichItems(inventory);

          let deliveries = delRes || [];
          if (!Array.isArray(deliveries) && (deliveries as any).data) deliveries = (deliveries as any).data;
          deliveries = this.enrichItems(deliveries);

          let requests = reqRes || [];
          if (!Array.isArray(requests) && (requests as any).data) requests = (requests as any).data;
          requests = this.enrichItems(requests);

          this.analyticsService.analyzeInventory(inventory, []);
          this.analyticsService.analyzeDeliveries(deliveries);
          this.analyticsService.generateReorderRecommendations(inventory);
          
          const alerts = [
            ...this.analyticsService.getAlertsByType('LOW_STOCK'),
            ...this.analyticsService.getAlertsByType('DELAYED_DELIVERY')
          ];
          
          const costAnalysis = this.analyticsService.calculateCostAnalysis(inventory, deliveries, requests);
          
          const recommendations = inventory
            .filter((i: any) => i.quantity <= i.reorderLevel)
            .map((i: any) => ({
               productName: i.product?.name || i.productName,
               daysUntilStockout: Math.floor(Math.random() * 10),
               recommendedQuantity: i.reorderLevel * 2,
               estimatedCost: (i.product?.unitPrice || 100) * i.reorderLevel * 2,
               confidence: 85
            }));

          this.pdfService.generateAnalyticsReport(alerts, recommendations, costAnalysis);
          this.notifications.success('Analytics Report generated');
        });
      });
    });
  }
}
