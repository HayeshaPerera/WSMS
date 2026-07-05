import { Component, OnInit } from '@angular/core'; // Import core Angular decorators
import { DeliveryService } from '../../services/delivery.service'; // Service for delivery API calls
import { NotificationService } from '../../services/notification.service'; // Service for toast popups
import { SharedDataService } from '../../services/shared-data.service'; // Service for global state syncing
import { AuditLogService } from '../../services/audit-log.service'; // Service for tracking user actions
import { PdfReportService } from '../../services/pdf-report.service'; // Service for PDF exports
import { Delivery, DeliveryStatus } from '../../models/models'; // Strict TypeScript interfaces
import { AuthService } from '../../services/auth.service'; // Service to get current user details

@Component({
  selector: 'app-deliveries', // HTML tag used to inject this component
  templateUrl: './deliveries.component.html', // Path to the HTML template
  styleUrls: ['./deliveries.component.css'] // Path to the CSS styles
})
export class DeliveriesComponent implements OnInit {
  deliveries: Delivery[] = []; // Master list of all deliveries
  filteredDeliveries: Delivery[] = []; // List of deliveries currently visible after filters are applied
  loading = true; // Boolean to control the loading spinner
  statuses = DeliveryStatus; // Expose the DeliveryStatus enum to the HTML template
  
  // Getter: count how many deliveries are currently in transit or dispatched
  get inTransitCount(): number {
    return this.filteredDeliveries.filter(d => d.status === DeliveryStatus.IN_TRANSIT || d.status === DeliveryStatus.DISPATCHED).length;
  }

  // Getter: count how many deliveries are out for delivery
  get outForDeliveryCount(): number {
    return this.filteredDeliveries.filter(d => d.status === DeliveryStatus.OUT_FOR_DELIVERY).length;
  }

  // Filter properties bound to the HTML via [(ngModel)]
  searchTerm = ''; // User's typed search text
  selectedStatus = ''; // Selected status from dropdown
  selectedWarehouse = ''; // Selected warehouse from dropdown
  selectedSupermarket = ''; // Selected supermarket from dropdown

  warehouses: any[] = []; // List of warehouses to populate the filter dropdown
  supermarkets: any[] = []; // List of supermarkets to populate the filter dropdown

  // Custom modal state for "Force Receive" (when backend rejects a normal receive due to status conflicts)
  showForceReceiveModal = false;
  forceReceiveDeliveryItem: Delivery | null = null;
  forceReceiveSnapshot: any = null; // Snapshot of the item before changes to allow rollback on error

  // Custom modal state for "Failure to Receive" (when a supermarket rejects a delivery)
  showFailureModal = false;
  failureDeliveryItem: Delivery | null = null;
  failureSnapshot: any = null; // Snapshot for rollback
  failureReason = ''; // Text area input for why it failed

  constructor(
    private service: DeliveryService,
    private notifications: NotificationService,
    private sharedData: SharedDataService,
    private auditLog: AuditLogService,
    private pdfReport: PdfReportService,
    public auth: AuthService // Public so HTML can use auth.isSupermarketManager()
  ) { }

  ngOnInit(): void {
    this.sharedData.initializeDefaultData(); // Ensure base global data is ready
    
    // Always load hardcoded mock data first to ensure instant UI rendering
    this.addHardcodedDeliveries();
    this.loading = false;

    // Then try to load real data from API in the background
    this.loadFromAPI();

    // Subscribe to shared global data for real-time updates (e.g., if a stock request approval created a new delivery)
    this.sharedData.deliveries$.subscribe(deliveries => {
      if (Array.isArray(deliveries)) {
        const products = this.sharedData.getProducts(); // Get global product list
        // "Enrich" the raw backend DTOs by linking nested objects
        const enriched = deliveries.map((d: any) => this.enrichDelivery(d, products));
        this.deliveries = enriched;
        this.applyFilters(); // Re-filter the new list
      }
    });

    // Load static lists for the filter dropdowns
    this.warehouses = this.sharedData.getWarehouses();
    this.supermarkets = this.sharedData.getSupermarkets();
    
    // Subscribe to keep dropdowns updated if new warehouses/supermarkets are added elsewhere
    this.sharedData.warehouses$.subscribe(w => this.warehouses = w);
    this.sharedData.supermarkets$.subscribe(s => this.supermarkets = s);
  }

  // Helper method: Connects raw IDs from the database to full objects needed by the UI
  private enrichDelivery(d: any, products: any[]): Delivery {
    // Handle nested items from backend DeliveryDTO (if it's a multi-item delivery, just grab the first for now)
    if (d.items && d.items.length > 0 && !d.product) {
      const firstItem = d.items[0];
      d.productId = firstItem.productId;
      d.productName = firstItem.productName;
      d.productSku = firstItem.productSku;
      d.quantity = firstItem.expectedQuantity || firstItem.actualQuantity || 0;
    }

    // Attach Product object
    if (!d.product && (d.productId || d.product_id)) {
      const pid = d.productId || d.product_id;
      // Handle potential type mismatches (string vs number) using double equals
      const matched = products.find((p: any) => p && (p.id == pid || String(p.id) === String(pid)));
      const fallbackName = d.productName || d.product_name || 'Unresolved Item';
      d.product = matched || { id: pid, name: fallbackName, sku: 'PENDING' };
    }
    
    // Attach Warehouse object
    if (!d.warehouse && (d.warehouseId || d.warehouse_id)) {
      const wid = d.warehouseId || d.warehouse_id;
      if (wid) d.warehouse = { id: wid, code: `WH${wid}`, name: `Warehouse ${wid}` };
    }
    
    // Attach Supermarket object
    if (!d.supermarket && (d.supermarketId || d.supermarket_id || d.supermarketName || d.supermarket_name)) {
      const sid = d.supermarketId || d.supermarket_id;
      const sname = d.supermarketName || d.supermarket_name;
      if (sid) d.supermarket = { id: sid, code: `SM${sid}`, name: `Supermarket ${sid}` };
      else if (sname) d.supermarket = { id: null, code: sname.replace(/\s+/g, '_'), name: sname };
      else d.supermarket = { id: null, code: 'SM-UNK', name: 'Unknown Supermarket' };
    }
    
    // Fallback if no product ID exists but a name was provided
    if (!d.product && (d.productName || d.product_name)) {
      d.product = { id: null, name: d.productName || d.product_name, sku: 'N/A' };
    }
    return d as Delivery; // Cast back to strict type
  }

  // Runs whenever search or filters change to update the visible list
  applyFilters(): void {
    let filtered = [...this.deliveries]; // Create a fresh copy to filter down
    
    // 1. Text Search (checks Tracking #, Product Name, SKU)
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        (d.trackingNumber || '').toLowerCase().includes(term) ||
        (d.product?.name || '').toLowerCase().includes(term) ||
        (d.product?.sku || '').toLowerCase().includes(term)
      );
    }
    
    // 2. Status Dropdown
    if (this.selectedStatus) {
      filtered = filtered.filter(d => d.status === this.selectedStatus);
    }
    
    // 3. Warehouse Dropdown
    if (this.selectedWarehouse) {
      filtered = filtered.filter(d =>
        d.warehouse?.name === this.selectedWarehouse ||
        String(d.warehouse?.id) === String(this.selectedWarehouse)
      );
    }
    
    // 4. Supermarket Dropdown
    if (this.selectedSupermarket) {
      filtered = filtered.filter(d =>
        d.supermarket?.name === this.selectedSupermarket ||
        String(d.supermarket?.id) === String(this.selectedSupermarket)
      );
    }
    this.filteredDeliveries = filtered; // Apply the final list to the UI
  }

  // Resets all filters to show everything
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedWarehouse = '';
    this.selectedSupermarket = '';
    this.applyFilters();
  }

  // Fetches real data from the Spring Boot backend
  loadFromAPI(): void {
    this.service.getAllDeliveries().subscribe({
      next: (data: any) => {
        let deliveryData: Delivery[] = [];
        // Handle variations in backend response format
        if (Array.isArray(data)) {
          deliveryData = data;
        } else if (data && data.data) {
          deliveryData = data.data;
        }

        // Accept server data even if it contains flat DTOs
        if (deliveryData && deliveryData.length >= 0) {
          const products = this.sharedData.getProducts();
          // Loop through and enrich every delivery
          const enriched = deliveryData.map((d: any) => {
            // (Same enrichment logic as above, duplicated here for the initial fetch)
            if (d.items && d.items.length > 0 && !d.product) {
              const firstItem = d.items[0];
              d.productId = firstItem.productId;
              d.productName = firstItem.productName;
              d.productSku = firstItem.productSku;
              d.quantity = firstItem.expectedQuantity || firstItem.actualQuantity || 0;
            }
            if (!d.product && (d.productId || d.product_id)) {
              const pid = d.productId || d.product_id;
              const matched = products.find((p: any) => p.id === pid);
              const fallbackName = d.productName || d.product_name || 'Unresolved Item';
              d.product = matched || { id: pid, name: fallbackName, sku: 'PENDING' };
            }
            if (!d.warehouse && (d.warehouseId || d.warehouse_id)) {
              const wid = d.warehouseId || d.warehouse_id;
              if (wid) d.warehouse = { id: wid, code: `WH${wid}`, name: `Warehouse ${wid}` };
            }
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
          // Sync to global state, which will trigger the subject subscription and call applyFilters
          this.sharedData.setDeliveries(deliveryData);
        }
      },
      error: () => {
        // Fallback silently to hardcoded data on error
        console.log('Using hardcoded deliveries');
      }
    });
  }

  // Security Check: Decides if the logged-in user is allowed to "Receive" a specific delivery
  isSupermarketUserForDelivery(d: Delivery): boolean {
    if (this.auth.isSupermarketManager()) return true; // Store managers can receive anything for their store
    
    const user = this.auth.getCurrentUser();
    if (!user) return false;
    
    const uname = (user.username || '').toLowerCase();
    const userSmId = (user as any).supermarketId || (user as any).supermarket_id || null;
    const smName = (d.supermarket?.name || '').toLowerCase();
    const smCode = (d.supermarket?.code || '').toLowerCase();
    
    // 1. Direct match (e.g. username is "SM01" and store code is "SM01")
    if (uname && (smName === uname || smCode === uname)) return true;
    
    // 2. Match by supermarket ID embedded in the JWT token payload
    if (userSmId && d.supermarket && d.supermarket.id && Number(userSmId) === Number(d.supermarket.id)) return true;
    
    // 3. Partial contains match (e.g., 'supermarket1' vs 'SL Supermarket')
    if (uname && (smName.includes(uname) || smCode.includes(uname))) return true;
    
    // 4. Demo fallback: if username starts with 'supermarket' consider them a store user for demo data
    if (uname.startsWith('supermarket')) return true;
    
    return false; // Not allowed
  }

  // Manual refresh method
  loadDeliveries(): void {
    this.addHardcodedDeliveries();
    this.loadFromAPI();
  }

  // Fallback mock data loaded immediately before the API responds
  addHardcodedDeliveries(): void {
    this.deliveries = [
      {
        id: 1,
        trackingNumber: 'TRK-2026-001',
        warehouse: { id: 1, code: 'WH01', name: 'SL Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        supermarket: { id: 1, code: 'SM01', name: 'SL Supermarket', location: 'Colombo Central', storageCapacity: 5000, currentStock: 2500, active: true, createdAt: new Date(), updatedAt: new Date() },
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
      // ... more hardcoded items ...
    ] as Delivery[];

    this.sharedData.setDeliveries(this.deliveries); // Push mock data to global state
  }

  // Triggered when a Warehouse worker advances the status (e.g. Pending -> Dispatched)
  setStatus(d: Delivery, status: DeliveryStatus) {
    const oldStatus = d.status;
    const userId = this.auth.getCurrentUser()?.userId || 1;
    const userName = this.auth.getCurrentUser()?.username || 'user';

    // 1. Prepare optimistic updates (assume it works instantly so the UI feels fast)
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

    // Keep a snapshot in case the backend rejects our change
    const snapshot = { ...d };
    
    // Apply the update locally and sync to global state immediately
    this.sharedData.updateDelivery(d.id, updates);
    Object.assign(d, updates);

    // Log the change locally to the audit trail
    this.auditLog.logDeliveryStatusChange(userId, userName, d.id, d.trackingNumber || 'Unknown', oldStatus || 'UNKNOWN', status || 'UNKNOWN');

    // 2. Sync with backend
    let action$;
    if (status === DeliveryStatus.DISPATCHED) {
      action$ = this.service.dispatchDelivery(d.id, d.driverName || 'System Driver', d.vehicleNumber || 'System Vehicle');
    } else {
      action$ = this.service.updateDeliveryStatus(d.id, status, 'Updated via UI');
    }

    action$.subscribe({
      next: () => {
        console.log('Status update synced with backend'); // Success! Optimistic update holds.
      },
      error: (err) => {
        // ROLLBACK: The backend failed, so we undo our local optimistic changes using the snapshot
        console.error('Failed to sync status update with backend:', err);
        this.sharedData.updateDelivery(d.id, { ...snapshot });
        Object.assign(d, snapshot);
        this.notifications.error(`Failed to update delivery status on server: ${err?.error?.message || err.statusText || 'Unknown error'}`);
      }
    });
  }

  // --- Modal Helpers ---
  
  closeForceReceiveModal() {
    this.showForceReceiveModal = false;
    this.forceReceiveDeliveryItem = null;
    this.forceReceiveSnapshot = null;
  }

  // The backend might block receiving a delivery if it isn't marked as "OUT_FOR_DELIVERY". 
  // This allows an admin to force it through anyway.
  confirmForceReceive() {
    const d = this.forceReceiveDeliveryItem;
    const snapshot = this.forceReceiveSnapshot;
    if (!d) return;
    const userId = this.auth.getCurrentUser()?.userId || 1;
    
    this.service.forceReceiveDelivery(d.id, userId).subscribe({
      next: (res: any) => {
        this.notifications.success(`✅ Delivery ${d.trackingNumber} force-received.`);
        const dto = res?.data ?? res;
        if (dto) {
          this.sharedData.updateDelivery(d.id, dto); // Apply final server state
          Object.assign(d, dto);
        }
        this.closeForceReceiveModal();
      },
      error: (err2: any) => { // If force-receive ALSO fails, rollback
        this.sharedData.updateDelivery(d.id, { ...snapshot });
        Object.assign(d, snapshot);
        this.notifications.error(`Failed to force-receive: ${err2?.error?.message || err2.statusText || 'Unknown error'}`);
        this.closeForceReceiveModal();
      }
    });
  }

  // Rollback state if they cancel the force receive
  cancelForceReceive() {
    const d = this.forceReceiveDeliveryItem;
    const snapshot = this.forceReceiveSnapshot;
    if (d && snapshot) {
      this.sharedData.updateDelivery(d.id, { ...snapshot });
      Object.assign(d, snapshot);
    }
    this.closeForceReceiveModal();
  }

  openFailureModal(d: Delivery) {
    this.failureDeliveryItem = d;
    this.failureSnapshot = { ...d }; // Save state just in case
    this.failureReason = '';
    this.showFailureModal = true;
  }

  closeFailureModal() {
    this.showFailureModal = false;
    this.failureDeliveryItem = null;
    this.failureSnapshot = null;
    this.failureReason = '';
  }

  // Called when a supermarket rejects a delivery (e.g. goods damaged)
  confirmFailure() {
    const d = this.failureDeliveryItem;
    const snapshot = this.failureSnapshot;
    if (!d || !snapshot) return;
    
    const reason = this.failureReason.trim() || 'Delivery not received';
    const userId = this.auth.getCurrentUser()?.userId || 1;
    const userName = this.auth.getCurrentUser()?.username || 'user';

    // Optimistic UI Update
    const updates: any = {
      status: 'FAILED',
      failureReason: reason,
      failedAt: new Date()
    };
    this.sharedData.updateDelivery(d.id, updates);
    Object.assign(d, updates);

    // Log the rejection locally
    this.auditLog.logDeliveryReceipt(userId, userName, d.id, d.trackingNumber, false, reason);
    this.notifications.error(`❌ Delivery ${d.trackingNumber} marked as not received. Reason: ${reason}. Warehouse has been notified.`);

    // Sync with backend
    this.service.failDelivery(d.id, reason).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res;
        if (dto) {
          this.sharedData.updateDelivery(d.id, dto);
          Object.assign(d, dto);
        }
        this.closeFailureModal();
      },
      error: (err: any) => {
        // Rollback on failure
        this.sharedData.updateDelivery(d.id, { ...snapshot });
        Object.assign(d, snapshot);
        this.notifications.error(`Failed to send failure to server: ${err?.error?.message || err.statusText || 'Unknown error'}`);
        this.closeFailureModal();
      }
    });
  }

  // Triggered when a Store user clicks "Confirm Receipt"
  markReceived(d: Delivery, received: boolean) {
    const userId = this.auth.getCurrentUser()?.userId || 1;

    // If they clicked "Reject Delivery", divert to the failure modal
    if (!received) {
      this.openFailureModal(d);
      return;
    }

    const snapshot = { ...d };

    // 1. Optimistic Update: Mark as delivered instantly in the UI
    const updates = {
      status: DeliveryStatus.DELIVERED,
      deliveredAt: new Date(),
      receivedBy: userId
    };
    this.sharedData.updateDelivery(d.id, updates);
    Object.assign(d, updates);

    // 2. Log locally
    const userName = this.auth.getCurrentUser()?.username || 'user';
    this.auditLog.logDeliveryReceipt(userId, userName, d.id, d.trackingNumber, true);
    this.notifications.success(`✅ Delivery ${d.trackingNumber} successfully received and confirmed! Warehouse has been notified.`);

    // 3. Sync with backend (PUT /api/v1/deliveries/{id}/receive)
    this.service.receiveDelivery(d.id, userId).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res;
        if (dto) {
          this.sharedData.updateDelivery(d.id, dto); // Apply any backend overrides
          Object.assign(d, dto);
        }
      },
      error: (err: any) => {
        // If they lack permission (403), rollback and inform them
        if (err?.status === 403 || err?.status === 401) {
          this.sharedData.updateDelivery(d.id, { ...snapshot });
          Object.assign(d, snapshot);
          this.notifications.error('Failed to confirm receipt: Access denied. Please ensure your account has supermarket permissions.');
          return;
        }

        // If a state conflict occurs (409) — like trying to receive something that is only "PENDING"
        if (err?.status === 409) {
          // Open the force-receive modal to ask if they want to override the safety check
          this.forceReceiveDeliveryItem = d;
          this.forceReceiveSnapshot = snapshot;
          this.showForceReceiveModal = true;
          return;
        }

        // Catch-all: rollback and show generic error
        this.sharedData.updateDelivery(d.id, { ...snapshot });
        Object.assign(d, snapshot);
        this.notifications.error(`Failed to confirm receipt: ${err?.error?.message || err.statusText || 'Unknown error'}`);
      }
    });
  }

  // Generate a PDF of the current filtered table
  exportToPdf(): void {
    this.pdfReport.generateDeliveriesReport(this.filteredDeliveries);
  }
}
