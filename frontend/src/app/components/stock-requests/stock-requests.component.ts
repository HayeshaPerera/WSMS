import { Component, OnInit } from '@angular/core';
import { StockRequestService } from '../../services/stock-request.service';
import { DeliveryService } from '../../services/delivery.service';
import { NotificationService } from '../../services/notification.service';
import { AuditLogService } from '../../services/audit-log.service';
import { PdfReportService } from '../../services/pdf-report.service';
import { SharedDataService } from '../../services/shared-data.service';
import { StockRequest, RequestStatus, DeliveryStatus } from '../../models/models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-stock-requests',
  templateUrl: './stock-requests.component.html',
  styleUrls: ['./stock-requests.component.css']
})
export class StockRequestsComponent implements OnInit {
  requests: StockRequest[] = [];
  loading = true;

  constructor(
    private service: StockRequestService,
    private deliveryService: DeliveryService,
    private notifications: NotificationService,
    private auditLog: AuditLogService,
    private pdfReport: PdfReportService,
    private sharedData: SharedDataService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.sharedData.initializeDefaultData();
    // Always load hardcoded data first to ensure visibility
    this.addHardcodedRequests();
    this.loading = false;
    
    // Then try to load from API
    this.loadFromAPI();
    
    // Subscribe to shared data for real-time updates
    this.sharedData.stockRequests$.subscribe(requests => {
      if (Array.isArray(requests) && requests.length > 0) {
        // Enrich each request with product/supermarket fallback so UI can render immediately
        const products = this.sharedData.getProducts();
        this.requests = requests.map((r: any) => {
          if (!r.product && (r.productId || r.product_id)) {
            const pid = r.productId || r.product_id;
            r.product = products.find((p: any) => p.id === pid) || { id: pid, name: 'Unknown Product', sku: 'N/A', unitPrice: 0 };
          }
          if (!r.supermarket && (r.supermarketId || r.supermarket_id || r.supermarket)) {
            const sid = r.supermarket?.id || r.supermarketId || r.supermarket_id;
            if (sid) r.supermarket = { id: sid, code: `SM${sid}`, name: `Supermarket ${sid}` };
          }
          return r as StockRequest;
        });
      }
    });
  }

  loadFromAPI(): void {
    this.service.getAllRequests().subscribe({
      next: (data: any) => {
        let requestData: StockRequest[] = [];
        if (Array.isArray(data)) {
          requestData = data;
        } else if (data && data.data) {
          requestData = data.data;
        }
        // Accept server data even if it contains flat DTOs (productId/supermarketId)
        if (requestData && requestData.length >= 0) {
          // Enrich items with nested objects where possible using shared products
          const products = this.sharedData.getProducts();
          const enriched = requestData.map((r: any) => {
            if (!r.product && (r.productId || r.product_id)) {
              const pid = r.productId || r.product_id;
              r.product = products.find((p: any) => p.id === pid) || { id: pid, name: 'Unknown Product', sku: 'N/A', unitPrice: 0 };
            }
            if (!r.supermarket && (r.supermarketId || r.supermarket_id || r.supermarket)) {
              const sid = r.supermarket?.id || r.supermarketId || r.supermarket_id;
              if (sid) r.supermarket = { id: sid, code: `SM${sid}`, name: `Supermarket ${sid}` };
            }
            return r as StockRequest;
          });
          this.requests = enriched;
          this.sharedData.setStockRequests(requestData);
        }
      },
      error: () => {
        console.log('Using hardcoded stock requests');
      }
    });
  }

  refreshRequests(): void {
    this.addHardcodedRequests();
    this.loadFromAPI();
  }

  addHardcodedRequests(): void {
    this.requests = [
      {
        id: 1,
        requestNumber: 'REQ-2026-001',
        supermarket: { id: 1, code: 'SM01', name: 'Downtown Market', location: 'Colombo Central', storageCapacity: 5000, currentStock: 2500, active: true, createdAt: new Date(), updatedAt: new Date() },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        product: { id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy', unitPrice: 899.00, reorderLevel: 50, minStockLevel: 30, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
        requestedQuantity: 100,
        status: RequestStatus.PENDING,
        priority: 'MEDIUM' as any,
        requestedBy: { id: 2, username: 'supermarket1', email: 'sm1@wsms.com', fullName: 'Supermarket Manager', active: true, roles: [], createdAt: new Date(), updatedAt: new Date() },
        requestedAt: new Date('2026-02-03'),
        updatedAt: new Date()
      },
      {
        id: 2,
        requestNumber: 'REQ-2026-002',
        supermarket: { id: 2, code: 'SM02', name: 'Uptown Plaza', location: 'Kandy', storageCapacity: 4000, currentStock: 2000, active: true, createdAt: new Date(), updatedAt: new Date() },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        product: { id: 3, sku: 'PROD003', name: 'Premium Ground Coffee', category: 'Beverages', unitPrice: 2499.00, reorderLevel: 30, minStockLevel: 10, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
        requestedQuantity: 50,
        status: RequestStatus.PENDING,
        priority: 'HIGH' as any,
        requestedBy: { id: 3, username: 'supermarket2', email: 'sm2@wsms.com', fullName: 'Store Manager', active: true, roles: [], createdAt: new Date(), updatedAt: new Date() },
        requestedAt: new Date('2026-02-04'),
        updatedAt: new Date()
      },
      {
        id: 3,
        requestNumber: 'REQ-2026-003',
        supermarket: { id: 1, code: 'SM01', name: 'Downtown Market', location: 'Colombo Central', storageCapacity: 5000, currentStock: 2500, active: true, createdAt: new Date(), updatedAt: new Date() },
        warehouse: { id: 2, code: 'WH02', name: 'North Distribution Center', location: 'Kandy', capacity: 8000, currentStock: 3500, active: true, createdAt: new Date(), updatedAt: new Date() },
        product: { id: 6, sku: 'PROD006', name: 'Eggs (Dozen)', category: 'Dairy', unitPrice: 599.00, reorderLevel: 45, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
        requestedQuantity: 200,
        approvedQuantity: 200,
        status: RequestStatus.APPROVED,
        priority: 'MEDIUM' as any,
        requestedBy: { id: 2, username: 'supermarket1', email: 'sm1@wsms.com', fullName: 'Supermarket Manager', active: true, roles: [], createdAt: new Date(), updatedAt: new Date() },
        approvedBy: { id: 1, username: 'warehouse1', email: 'wh1@wsms.com', fullName: 'Warehouse Staff', active: true, roles: [], createdAt: new Date(), updatedAt: new Date() },
        requestedAt: new Date('2026-02-01'),
        approvedAt: new Date('2026-02-02'),
        updatedAt: new Date()
      },
      {
        id: 4,
        requestNumber: 'REQ-2026-004',
        supermarket: { id: 3, code: 'SM03', name: 'Suburban Store', location: 'Galle', storageCapacity: 3000, currentStock: 1500, active: true, createdAt: new Date(), updatedAt: new Date() },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        product: { id: 5, sku: 'PROD005', name: 'Chicken Breast (1kg)', category: 'Meat', unitPrice: 1599.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
        requestedQuantity: 75,
        status: RequestStatus.PENDING,
        priority: 'URGENT' as any,
        requestedBy: { id: 4, username: 'supermarket3', email: 'sm3@wsms.com', fullName: 'Branch Manager', active: true, roles: [], createdAt: new Date(), updatedAt: new Date() },
        requestedAt: new Date('2026-02-05'),
        updatedAt: new Date()
      }
    ] as StockRequest[];
    
    this.sharedData.setStockRequests(this.requests);
  }

  approve(sr: StockRequest): void {
    const approverId = this.auth.getCurrentUser()?.userId || 1;
    const approverName = this.auth.getCurrentUser()?.username || 'warehouse1';
    this.service.approveRequest(sr.id, sr.requestedQuantity, approverId).subscribe({
      next: () => {
        this.notifications.success(`✅ Request #${sr.id} approved!`);
        // Delivery creation is now a manual step handled separately by the warehouse team.
        this.refreshRequests();
        // Refresh deliveries list from server (delivery created server-side after approval)
        this.deliveryService.getAllDeliveries().subscribe({
          next: (d: any) => {
            this.sharedData.setDeliveries(d);
          },
          error: (err: any) => {
            console.warn('Failed to refresh deliveries after approval', err);
          }
        });
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.message || 'Unknown error';
        this.notifications.error('Backend approval failed: ' + msg);
        // If server reports conflict (already approved or invalid state), refresh from server to update UI
        if (err?.status === 409 || err?.status === 400) {
          this.loadFromAPI();
        }
        this.loading = false;
      }
    });
    this.auditLog.logStockRequestApproval(
      approverId,
      approverName,
      sr.id,
      sr.product?.name || 'Unknown Product',
      sr.requestedQuantity
    );
  }

  reject(sr: StockRequest): void {
    const approverId = this.auth.getCurrentUser()?.userId || 1;
    const approverName = this.auth.getCurrentUser()?.username || 'warehouse1';
    const reason = prompt('Enter rejection reason:') || 'Insufficient stock';
    this.service.rejectRequest(sr.id, reason, approverId).subscribe({
      next: () => {
        this.notifications.warning(`⚠️ Request #${sr.id} rejected: ${reason}`);
        this.refreshRequests();
      },
      error: (err: any) => {
        this.notifications.error('Backend rejection failed: ' + (err?.error?.message || 'Unknown error'));
        this.loading = false;
      }
    });
    this.auditLog.logStockRequestRejection(
      approverId,
      approverName,
      sr.id,
      sr.product?.name || 'Unknown Product',
      reason
    );
  }

  private createDelivery(sr: StockRequest): void {
    const trackingNumber = 'TRK' + Date.now() + Math.floor(Math.random() * 1000);
    const delivery = {
      trackingNumber,
      warehouse: sr.warehouse || { id: 1, name: 'Central Warehouse', code: 'WH-001' },
      supermarket: sr.supermarket || { id: 1, name: 'Unknown Supermarket', code: 'SM-000' },
      product: sr.product || { id: 1, name: 'Unknown Product', sku: 'UNKNOWN' },
      stockRequest: sr,
      quantity: sr.requestedQuantity,
      status: DeliveryStatus.PENDING,
      createdAt: new Date(),
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    };
    this.deliveryService.createDelivery(delivery as any).subscribe({
      next: (created: any) => {
        this.notifications.info(`📦 Delivery ${trackingNumber} created and ready for dispatch`);
      },
      error: (err: any) => {
        console.error('Delivery creation failed:', err);
      }
    });
  }

  exportToPdf(): void {
    this.pdfReport.generateStockRequestsReport();
  }
}
