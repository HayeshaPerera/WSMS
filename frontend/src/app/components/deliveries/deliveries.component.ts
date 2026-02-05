import { Component, OnInit } from '@angular/core';
import { DeliveryService } from '../../services/delivery.service';
import { NotificationService } from '../../services/notification.service';
import { SharedDataService } from '../../services/shared-data.service';
import { AuditLogService } from '../../services/audit-log.service';
import { PdfReportService } from '../../services/pdf-report.service';
import { Delivery, DeliveryStatus } from '../../models/models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-deliveries',
  templateUrl: './deliveries.component.html',
  styleUrls: ['./deliveries.component.css']
})
export class DeliveriesComponent implements OnInit {
  deliveries: Delivery[] = [];
  loading = true;
  statuses = DeliveryStatus;

  constructor(
    private service: DeliveryService,
    private notifications: NotificationService,
    private sharedData: SharedDataService,
    private auditLog: AuditLogService,
    private pdfReport: PdfReportService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.sharedData.initializeDefaultData();
    // Always load hardcoded data first to ensure visibility
    this.addHardcodedDeliveries();
    this.loading = false;
    
    // Then try to load from API
    this.loadFromAPI();
    
    // Subscribe to shared data for real-time updates
    this.sharedData.deliveries$.subscribe(deliveries => {
      if (Array.isArray(deliveries)) {
        const products = this.sharedData.getProducts();
        const enriched = deliveries.map((d: any) => {
          if (!d.product && (d.productId || d.product_id)) {
            const pid = d.productId || d.product_id;
            // attempt robust match with loose equality and string/number coercion
            const matched = products.find((p: any) => p && (p.id == pid || String(p.id) === String(pid)));
            if (matched) {
              d.product = matched;
            } else {
              console.debug('Deliveries: product not found for pid', pid, 'productsCount', products.length, 'delivery', d);
              d.product = { id: pid, name: 'Unknown Product', sku: 'N/A' };
            }
          }
          if (!d.warehouse && (d.warehouseId || d.warehouse_id)) {
            const wid = d.warehouseId || d.warehouse_id;
            if (wid) d.warehouse = { id: wid, code: `WH${wid}`, name: `Warehouse ${wid}` };
          }
          // Enrich supermarket if server returned flat id or name fields
          if (!d.supermarket && (d.supermarketId || d.supermarket_id || d.supermarketName || d.supermarket_name)) {
            const sid = d.supermarketId || d.supermarket_id;
            const sname = d.supermarketName || d.supermarket_name;
            if (sid) {
              d.supermarket = { id: sid, code: `SM${sid}`, name: `Supermarket ${sid}` };
            } else if (sname) {
              d.supermarket = { id: null, code: sname.replace(/\s+/g, '_'), name: sname };
            } else {
              d.supermarket = { id: null, code: 'SM-UNK', name: 'Unknown Supermarket' };
            }
          }
          // If product still missing, try to use productName flat field
          if (!d.product && (d.productName || d.product_name)) {
            d.product = { id: null, name: d.productName || d.product_name, sku: 'N/A' };
          }
          return d as Delivery;
        });
        this.deliveries = enriched;
      }
    });
  }

  loadFromAPI(): void {
    this.service.getAllDeliveries().subscribe({
      next: (data: any) => {
        let deliveryData: Delivery[] = [];
        if (Array.isArray(data)) {
          deliveryData = data;
        } else if (data && data.data) {
          deliveryData = data.data;
        }
        
        // Accept server data even if it contains flat DTOs (productId/warehouseId)
        if (deliveryData && deliveryData.length >= 0) {
          const products = this.sharedData.getProducts();
          const enriched = deliveryData.map((d: any) => {
            if (!d.product && (d.productId || d.product_id)) {
              const pid = d.productId || d.product_id;
              d.product = products.find((p: any) => p.id === pid) || { id: pid, name: 'Unknown Product', sku: 'N/A' };
            }
            if (!d.warehouse && (d.warehouseId || d.warehouse_id)) {
              const wid = d.warehouseId || d.warehouse_id;
              if (wid) d.warehouse = { id: wid, code: `WH${wid}`, name: `Warehouse ${wid}` };
            }
            // Enrich supermarket if missing
            if (!d.supermarket && (d.supermarketId || d.supermarket_id || d.supermarketName || d.supermarket_name)) {
              const sid = d.supermarketId || d.supermarket_id;
              const sname = d.supermarketName || d.supermarket_name;
              if (sid) {
                d.supermarket = { id: sid, code: `SM${sid}`, name: `Supermarket ${sid}` };
              } else if (sname) {
                d.supermarket = { id: null, code: sname.replace(/\s+/g, '_'), name: sname };
              } else {
                d.supermarket = { id: null, code: 'SM-UNK', name: 'Unknown Supermarket' };
              }
            }
            if (!d.product && (d.productName || d.product_name)) {
              d.product = { id: null, name: d.productName || d.product_name, sku: 'N/A' };
            }
            return d as Delivery;
          });
          this.deliveries = enriched;
          this.sharedData.setDeliveries(deliveryData);
        }
      },
      error: () => {
        console.log('Using hardcoded deliveries');
      }
    });
  }

  isSupermarketUserForDelivery(d: Delivery): boolean {
    // True if user is a supermarket manager or the supermarket name/code matches logged-in user
    if (this.auth.isSupermarketManager()) return true;
    const user = this.auth.getCurrentUser();
    if (!user) return false;
    const uname = (user.username || '').toLowerCase();
    const userSmId = (user as any).supermarketId || (user as any).supermarket_id || null;
    const smName = (d.supermarket?.name || '').toLowerCase();
    const smCode = (d.supermarket?.code || '').toLowerCase();
    // direct match
    if (uname && (smName === uname || smCode === uname)) return true;
    // match by supermarket id from token payload if available
    if (userSmId && d.supermarket && d.supermarket.id && Number(userSmId) === Number(d.supermarket.id)) return true;
    // partial contains (e.g., 'supermarket1' vs 'Supermarket 1')
    if (uname && (smName.includes(uname) || smCode.includes(uname))) return true;
    // demo fallback: if username starts with 'supermarket' consider them supermarket user for demo data
    if (uname.startsWith('supermarket')) return true;
    return false;
  }

  loadDeliveries(): void {
    this.addHardcodedDeliveries();
    this.loadFromAPI();
  }

  addHardcodedDeliveries(): void {
    this.deliveries = [
      { 
        id: 1, 
        trackingNumber: 'TRK-2026-001', 
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        supermarket: { id: 1, code: 'SM01', name: 'Downtown Market', location: 'Colombo Central', storageCapacity: 5000, currentStock: 2500, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        product: { id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy', unitPrice: 899.00, reorderLevel: 50, minStockLevel: 30, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        quantity: 100, 
        status: DeliveryStatus.DELIVERED, 
        driverName: 'Kamal Perera',
        vehicleNumber: 'WP-CAB-1234',
        estimatedDelivery: new Date('2026-02-03'), 
        dispatchedAt: new Date('2026-02-01'), 
        inTransitAt: new Date('2026-02-02'),
        deliveredAt: new Date('2026-02-03'), 
        createdAt: new Date('2026-02-01'), 
        updatedAt: new Date('2026-02-03') 
      },
      { 
        id: 2, 
        trackingNumber: 'TRK-2026-002', 
        warehouse: { id: 2, code: 'WH02', name: 'North Distribution Center', location: 'Kandy', capacity: 8000, currentStock: 3500, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        supermarket: { id: 2, code: 'SM02', name: 'Uptown Plaza', location: 'Kandy', storageCapacity: 4000, currentStock: 2000, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        product: { id: 3, sku: 'PROD003', name: 'Premium Ground Coffee', category: 'Beverages', unitPrice: 2499.00, reorderLevel: 30, minStockLevel: 10, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        quantity: 50, 
        status: DeliveryStatus.IN_TRANSIT, 
        driverName: 'Nimal Silva',
        vehicleNumber: 'CP-CAB-5678',
        currentLocation: 'Kadawatha Junction',
        estimatedDelivery: new Date('2026-02-06'), 
        dispatchedAt: new Date('2026-02-04'), 
        inTransitAt: new Date('2026-02-05'),
        createdAt: new Date('2026-02-04'), 
        updatedAt: new Date('2026-02-05') 
      },
      { 
        id: 3, 
        trackingNumber: 'TRK-2026-003', 
        warehouse: { id: 3, code: 'WH03', name: 'South Logistics Hub', location: 'Galle', capacity: 6000, currentStock: 2800, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        supermarket: { id: 3, code: 'SM03', name: 'Suburban Store', location: 'Galle', storageCapacity: 3000, currentStock: 1500, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        product: { id: 8, sku: 'PROD008', name: 'Brown Rice 2kg', category: 'Grains', unitPrice: 749.00, reorderLevel: 30, minStockLevel: 12, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        quantity: 120, 
        status: DeliveryStatus.DELIVERED, 
        driverName: 'Sunil Fernando',
        vehicleNumber: 'SP-CAB-9012',
        estimatedDelivery: new Date('2026-02-02'), 
        dispatchedAt: new Date('2026-01-31'), 
        inTransitAt: new Date('2026-02-01'),
        deliveredAt: new Date('2026-02-02'), 
        createdAt: new Date('2026-01-31'), 
        updatedAt: new Date('2026-02-02') 
      },
      { 
        id: 4, 
        trackingNumber: 'TRK-2026-004', 
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        supermarket: { id: 1, code: 'SM01', name: 'Downtown Market', location: 'Colombo Central', storageCapacity: 5000, currentStock: 2500, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        product: { id: 14, sku: 'PROD014', name: 'Strawberries 250g', category: 'Produce', unitPrice: 899.00, reorderLevel: 30, minStockLevel: 12, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        quantity: 40, 
        status: DeliveryStatus.DISPATCHED, 
        driverName: 'Ajith Kumar',
        vehicleNumber: 'WP-CAB-3456',
        estimatedDelivery: new Date('2026-02-07'), 
        dispatchedAt: new Date('2026-02-05'),
        createdAt: new Date('2026-02-05'), 
        updatedAt: new Date('2026-02-05') 
      },
      { 
        id: 5, 
        trackingNumber: 'TRK-2026-005', 
        warehouse: { id: 2, code: 'WH02', name: 'North Distribution Center', location: 'Kandy', capacity: 8000, currentStock: 3500, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        supermarket: { id: 4, code: 'SM04', name: 'East Side Market', location: 'Batticaloa', storageCapacity: 2500, currentStock: 1200, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        product: { id: 7, sku: 'PROD007', name: 'Olive Oil 500ml', category: 'Cooking', unitPrice: 1899.00, reorderLevel: 20, minStockLevel: 8, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        quantity: 85, 
        status: DeliveryStatus.OUT_FOR_DELIVERY, 
        driverName: 'Rohan Jayawardena',
        vehicleNumber: 'EP-CAB-7890',
        currentLocation: 'Near delivery location',
        estimatedDelivery: new Date('2026-02-05'), 
        dispatchedAt: new Date('2026-02-03'),
        inTransitAt: new Date('2026-02-04'),
        createdAt: new Date('2026-02-03'), 
        updatedAt: new Date('2026-02-05') 
      },
      { 
        id: 6, 
        trackingNumber: 'TRK-2026-006', 
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        supermarket: { id: 2, code: 'SM02', name: 'Uptown Plaza', location: 'Kandy', storageCapacity: 4000, currentStock: 2000, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        product: { id: 2, sku: 'PROD002', name: 'White Bread Loaf', category: 'Bakery', unitPrice: 449.00, reorderLevel: 40, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }, 
        quantity: 200, 
        status: DeliveryStatus.PENDING, 
        estimatedDelivery: new Date('2026-02-08'), 
        createdAt: new Date('2026-02-05'), 
        updatedAt: new Date('2026-02-05') 
      }
    ] as Delivery[];
    
    this.sharedData.setDeliveries(this.deliveries);
  }

  setStatus(d: Delivery, status: DeliveryStatus) {
    const oldStatus = d.status;
    const userId = this.auth.getCurrentUser()?.userId || 1;
    const userName = this.auth.getCurrentUser()?.username || 'user';

    // Prepare optimistic updates and keep a snapshot for rollback
    const updates: any = { status };
    if (status === DeliveryStatus.DISPATCHED) {
      updates.dispatchedAt = new Date();
      this.notifications.info(`🚛 Delivery ${d.trackingNumber} has been dispatched`);
    } else if (status === DeliveryStatus.IN_TRANSIT) {
      updates.inTransitAt = new Date();
      this.notifications.info(`🚚 Delivery ${d.trackingNumber} is now in transit`);
    } else if (status === DeliveryStatus.OUT_FOR_DELIVERY) {
      this.notifications.info(`📍 Delivery ${d.trackingNumber} is out for delivery`);
    } else if (status === DeliveryStatus.DELIVERED) {
      updates.deliveredAt = new Date();
      this.notifications.success(`✅ Delivery ${d.trackingNumber} has been delivered!`);
    }

    const snapshot = { ...d };
    // Apply optimistic update locally
    this.sharedData.updateDelivery(d.id, updates);
    Object.assign(d, updates);

    // Log locally
    this.auditLog.logDeliveryStatusChange(userId, userName, d.id, d.trackingNumber, oldStatus, status);

    // Sync with backend and rollback on failure
    this.service.updateDeliveryStatus(d.id, status, 'Updated via UI').subscribe({
      next: () => {
        console.log('Status update synced with backend');
      },
      error: (err) => {
        console.error('Failed to sync status update with backend:', err);
        // revert local change
        this.sharedData.updateDelivery(d.id, { ...snapshot });
        Object.assign(d, snapshot);
        this.notifications.error(`Failed to update delivery status on server: ${err?.error?.message || err.statusText || 'Unknown error'}`);
      }
    });
  }

  markReceived(d: Delivery, received: boolean) {
    const userId = this.auth.getCurrentUser()?.userId || 1;
    const userName = this.auth.getCurrentUser()?.username || 'user';

    // allow attempting receipt for all visible statuses (including PENDING)

    const snapshot = { ...d };

    if (received) {
      // Mark as delivered (optimistic)
      const updates = {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        receivedBy: userId
      };
      this.sharedData.updateDelivery(d.id, updates);
      Object.assign(d, updates);

      // Log locally
      this.auditLog.logDeliveryReceipt(userId, userName, d.id, d.trackingNumber, true);
      this.notifications.success(`✅ Delivery ${d.trackingNumber} successfully received and confirmed! Warehouse has been notified.`);

      // Sync with backend and rollback on failure
      this.service.receiveDelivery(d.id, userId).subscribe({
        next: (res: any) => {
          console.log('Delivery receipt synced', res);
          // If server returned the updated delivery, merge it into shared data
          const dto = res?.data ?? res;
          if (dto) {
            this.sharedData.updateDelivery(d.id, dto);
            Object.assign(d, dto);
          }
        },
        error: (err: any) => {
          // Authorization errors: rollback and inform
          if (err?.status === 403 || err?.status === 401) {
            console.error('Receive denied due to insufficient permissions:', err);
            this.sharedData.updateDelivery(d.id, { ...snapshot });
            Object.assign(d, snapshot);
            this.notifications.error('Failed to confirm receipt: Access denied. Please ensure your account has supermarket permissions.');
            return;
          }

          // Conflict (cannot receive in current status) -> offer force receive
          if (err?.status === 409) {
            const confirmed = confirm(`Server: ${err?.error?.message || 'Delivery cannot be received in current status'}. Force receive?`);
            if (confirmed) {
              this.service.forceReceiveDelivery(d.id, userId).subscribe({
                next: (res: any) => {
                  this.notifications.success(`✅ Delivery ${d.trackingNumber} force-received.`);
                  console.log('Force receive succeeded', res);
                  const dto = res?.data ?? res;
                  if (dto) {
                    this.sharedData.updateDelivery(d.id, dto);
                    Object.assign(d, dto);
                  }
                },
                error: (err2: any) => {
                  console.error('Force receive failed:', err2);
                  this.sharedData.updateDelivery(d.id, { ...snapshot });
                  Object.assign(d, snapshot);
                  this.notifications.error(`Failed to force-receive: ${err2?.error?.message || err2.statusText || 'Unknown error'}`);
                }
              });
            } else {
              // user cancelled force; rollback optimistic update
              this.sharedData.updateDelivery(d.id, { ...snapshot });
              Object.assign(d, snapshot);
            }
            return;
          }

          // Other errors: rollback and show message
          console.error('Failed to confirm delivery on server:', err);
          this.sharedData.updateDelivery(d.id, { ...snapshot });
          Object.assign(d, snapshot);
          this.notifications.error(`Failed to confirm receipt: ${err?.error?.message || err.statusText || 'Unknown error'}`);
        }
      });
    } else {
      // Mark as not received (optimistic)
      const reason = prompt('Please provide reason for not receiving:') || 'Delivery not received';
      const updates: any = {
        status: 'FAILED',
        failureReason: reason,
        failedAt: new Date()
      };
      this.sharedData.updateDelivery(d.id, updates);
      Object.assign(d, updates);

      // Log the rejection
      this.auditLog.logDeliveryReceipt(userId, userName, d.id, d.trackingNumber, false, reason);
      this.notifications.error(`❌ Delivery ${d.trackingNumber} marked as not received. Reason: ${reason}. Warehouse has been notified.`);

      // Sync with backend and rollback on failure
      this.service.failDelivery(d.id, reason).subscribe({
        next: (res: any) => {
          console.log('Delivery failure synced', res);
          const dto = res?.data ?? res;
          if (dto) {
            this.sharedData.updateDelivery(d.id, dto);
            Object.assign(d, dto);
          }
        },
        error: (err: any) => {
          console.error('Failed to mark delivery as failed on server:', err);
          this.sharedData.updateDelivery(d.id, { ...snapshot });
          Object.assign(d, snapshot);
          this.notifications.error(`Failed to send failure to server: ${err?.error?.message || err.statusText || 'Unknown error'}`);
        }
      });
    }
  }

  exportToPdf(): void {
    this.pdfReport.generateDeliveriesReport();
  }
}
