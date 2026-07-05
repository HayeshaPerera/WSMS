import { Component, OnInit } from '@angular/core'; // Import Angular core tools: Component for UI, OnInit for lifecycle hook
import { StockRequestService } from '../../services/stock-request.service'; // Import service that talks to backend stock request endpoints
import { DeliveryService } from '../../services/delivery.service'; // Import service that manages deliveries (used after approval)
import { NotificationService } from '../../services/notification.service'; // Import service to show success/error toast popups
import { AuditLogService } from '../../services/audit-log.service'; // Import service to log approval/rejection actions for admins
import { PdfReportService } from '../../services/pdf-report.service'; // Import service to generate PDF exports of tables
import { SharedDataService } from '../../services/shared-data.service'; // Import service for global state (e.g. keeping requests in sync across pages)
import { StockRequest, RequestStatus, DeliveryStatus } from '../../models/models'; // Import TypeScript interfaces for strict typing
import { AuthService } from '../../services/auth.service'; // Import Auth service to get current user ID/Role

@Component({
  selector: 'app-stock-requests', // HTML tag to use this component
  templateUrl: './stock-requests.component.html', // Link to HTML file
  styleUrls: ['./stock-requests.component.css'] // Link to CSS file
})
export class StockRequestsComponent implements OnInit {
  requests: StockRequest[] = []; // Array holding ALL stock requests (raw data)
  filteredRequests: StockRequest[] = []; // Array holding the currently visible requests (after search/filter is applied)
  loading = true; // Boolean to show a loading spinner while API fetches data

  // Dynamic getter: counts how many filtered requests are currently "PENDING"
  get pendingCount(): number {
    return this.filteredRequests.filter(r => r.status === 'PENDING').length;
  }

  // Dynamic getter: counts how many filtered requests are currently "APPROVED"
  get approvedCount(): number {
    return this.filteredRequests.filter(r => r.status === 'APPROVED').length;
  }

  // Dynamic getter: calculates the percentage of rejected requests out of the current filtered list
  get rejectRate(): number {
    if (this.filteredRequests.length === 0) return 0; // Prevent divide by zero error
    const rejected = this.filteredRequests.filter(r => r.status === 'REJECTED').length;
    return Math.round((rejected / this.filteredRequests.length) * 100);
  }

  // Variables bound to the HTML search/filter inputs via [(ngModel)]
  searchTerm = ''; // Text typed into the search bar
  selectedStatus = ''; // Dropdown value for status filter
  selectedSupermarket = ''; // Dropdown value for supermarket filter
  supermarkets: any[] = []; // Array to populate the supermarket filter dropdown options

  // Variables for the "Reject" confirmation modal popup
  showRejectModal = false; // Controls if the modal is visible on screen
  rejectingRequest: StockRequest | null = null; // Holds the specific request currently being rejected
  rejectionReason = ''; // Text bound to the rejection reason textarea

  constructor(
    private service: StockRequestService, // Inject API service for requests
    private deliveryService: DeliveryService, // Inject API service for deliveries
    private notifications: NotificationService, // Inject toast notifications
    private auditLog: AuditLogService, // Inject audit logger
    private pdfReport: PdfReportService, // Inject PDF exporter
    private sharedData: SharedDataService, // Inject global state
    public auth: AuthService // Inject auth (public so HTML can check roles like auth.isAdmin())
  ) { }

  // Runs automatically as soon as the component loads
  ngOnInit(): void {
    this.sharedData.initializeDefaultData(); // Ensure default products/supermarkets exist in global state
    this.addHardcodedRequests(); // Temporarily load mock data so the UI doesn't look empty immediately
    this.loading = false; // Turn off initial loading spinner
    this.loadFromAPI(); // Fetch real data from the Spring Boot backend

    // Subscribe to the global 'stockRequests$' state. If it changes somewhere else, update this page automatically.
    this.sharedData.stockRequests$.subscribe(requests => {
      if (Array.isArray(requests) && requests.length > 0) {
        const products = this.sharedData.getProducts(); // Get global product catalog
        // "Enrich" the raw data by linking product IDs to full product objects (name, sku, etc.)
        this.requests = requests.map((r: any) => this.enrichRequest(r, products));
        this.applyFilters(); // Re-apply the current search/filters to the newly enriched data
      }
    });

    // Populate the supermarket dropdown list from global state
    this.supermarkets = this.sharedData.getSupermarkets();
    // Keep it updated if a new supermarket is added globally
    this.sharedData.supermarkets$.subscribe(s => this.supermarkets = s);
  }

  // Helper method: Connects raw IDs from the database to nested objects needed by the UI
  private enrichRequest(r: any, products: any[]): StockRequest {
    // If the request only has a productId but no nested Product object...
    if (!r.product && (r.productId || r.product_id)) {
      const pid = r.productId || r.product_id;
      // Find the product in the global catalog, or create a fallback "Unresolved" object
      r.product = products.find((p: any) => p.id === pid) || { id: pid, name: 'Unresolved Item', sku: 'PENDING', unitPrice: 0 };
    }
    // If the request only has a supermarketId but no nested Supermarket object...
    if (!r.supermarket && (r.supermarketId || r.supermarket_id || r.supermarket)) {
      const sid = r.supermarket?.id || r.supermarketId || r.supermarket_id;
      // Create a basic Supermarket object with a formatted code (e.g., SM1)
      if (sid) r.supermarket = { id: sid, code: `SM${sid}`, name: `Supermarket ${sid}` };
    }
    return r as StockRequest; // Cast the final enriched object back to the strict TypeScript interface
  }

  // Runs whenever the user types in the search box or changes a filter dropdown
  applyFilters(): void {
    let filtered = [...this.requests]; // Create a fresh copy of the master array

    // 1. Apply Text Search (checks ID, Product Name, and SKU)
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        String(r.id).includes(term) || // Match ID
        (r.product?.name || '').toLowerCase().includes(term) || // Match Name
        (r.product?.sku || '').toLowerCase().includes(term) // Match SKU
      );
    }
    
    // 2. Apply Status Filter (e.g. only show 'PENDING')
    if (this.selectedStatus) {
      filtered = filtered.filter(r => r.status === this.selectedStatus);
    }
    
    // 3. Apply Supermarket Filter
    if (this.selectedSupermarket) {
      filtered = filtered.filter(r =>
        r.supermarket?.name === this.selectedSupermarket || // Match exact name
        String(r.supermarket?.id) === String(this.selectedSupermarket) // Or match ID
      );
    }
    
    this.filteredRequests = filtered; // Update the array that the HTML table actually loops over
  }

  // Clears all inputs and resets the table to show everything
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedSupermarket = '';
    this.applyFilters(); // Re-run the filter logic with empty values
  }

  // Fetches live data from the backend
  loadFromAPI(): void {
    this.service.getAllRequests().subscribe({ // Call the HTTP GET endpoint
      next: (data: any) => {
        let requestData: StockRequest[] = [];
        // Handle different backend response structures (raw array vs { data: [] } wrapper)
        if (Array.isArray(data)) {
          requestData = data;
        } else if (data && data.data) {
          requestData = data.data;
        }
        
        if (requestData && requestData.length >= 0) {
          const products = this.sharedData.getProducts(); // Grab product dictionary
          // Map over the backend data and enrich missing nested objects
          const enriched = requestData.map((r: any) => {
            if (!r.product && (r.productId || r.product_id)) {
              const pid = r.productId || r.product_id;
              r.product = products.find((p: any) => p.id === pid) || { id: pid, name: 'Unresolved Item', sku: 'PENDING', unitPrice: 0 };
            }
            if (!r.supermarket && (r.supermarketId || r.supermarket_id || r.supermarket)) {
              const sid = r.supermarket?.id || r.supermarketId || r.supermarket_id;
              if (sid) r.supermarket = { id: sid, code: `SM${sid}`, name: `Supermarket ${sid}` };
            }
            return r as StockRequest;
          });
          
          this.requests = enriched; // Update local component array
          this.sharedData.setStockRequests(requestData); // Update global state (which triggers the applyFilters via the subscription above)
        }
      },
      error: () => { /* If API fails, do nothing. Keep showing the hardcoded mock data so the UI doesn't break */ }
    });
  }

  // Triggered by a manual "Refresh" button on the UI
  refreshRequests(): void {
    this.addHardcodedRequests(); // Reset to base state
    this.loadFromAPI(); // Fetch fresh data
  }

  // Fallback mock data loaded immediately before the API responds (useful for demos and fast UI rendering)
  addHardcodedRequests(): void {
    this.requests = [
      {
        id: 1,
        requestNumber: 'REQ-2026-001',
        supermarket: { id: 1, code: 'SM01', name: 'SL Supermarket', location: 'Colombo Central', storageCapacity: 5000, currentStock: 2500, active: true, createdAt: new Date(), updatedAt: new Date() },
        warehouse: { id: 1, code: 'WH01', name: 'SL Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        product: { id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy', unitPrice: 899.00, reorderLevel: 50, minStockLevel: 30, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
        requestedQuantity: 100,
        status: RequestStatus.PENDING,
        priority: 'MEDIUM' as any,
        requestedBy: { id: 2, username: 'supermarket1', email: 'sm1@wsms.com', fullName: 'Supermarket Manager', active: true, roles: [], createdAt: new Date(), updatedAt: new Date() },
        requestedAt: new Date('2026-02-03'),
        updatedAt: new Date()
      },
      // ... more hardcoded items are typically here ...
    ] as StockRequest[];

    this.sharedData.setStockRequests(this.requests); // Sync mock data to global state
    this.applyFilters(); // Ensure the table updates
  }

  // Triggered when a Warehouse Staff or Admin clicks the "Approve" button
  approve(sr: StockRequest): void {
    // Get the ID and username of the person clicking the button
    const approverId = this.auth.getCurrentUser()?.userId || 1;
    const approverName = this.auth.getCurrentUser()?.username || 'warehouse1';
    
    // Call the backend API (PUT /api/v1/stock-requests/{id}/approve)
    this.service.approveRequest(sr.id, sr.requestedQuantity, approverId).subscribe({
      next: () => { // If backend returns HTTP 200 OK
        this.notifications.success(`✅ Request #${sr.id} approved!`); // Show green toast
        this.refreshRequests(); // Reload the table to show it as APPROVED
        
        // Approving a request automatically creates a Delivery. We need to refresh global delivery state so the Delivery page updates!
        this.deliveryService.getAllDeliveries().subscribe({
          next: (d: any) => { this.sharedData.setDeliveries(d); },
          error: (err: any) => { console.warn('Failed to refresh deliveries after approval', err); }
        });
      },
      error: (err: any) => { // If backend returns an error (e.g. 400 Bad Request if not enough stock)
        const msg = err?.error?.message || err?.message || 'Unknown error';
        this.notifications.error('Backend approval failed: ' + msg); // Show red toast
        
        // If it was a conflict (409) or bad request (400), someone else might have approved it. Refresh the data to be safe.
        if (err?.status === 409 || err?.status === 400) {
          this.loadFromAPI();
        }
        this.loading = false;
      }
    });
    // Regardless of API success/fail, log the ATTEMPT to the audit ledger
    this.auditLog.logStockRequestApproval(approverId, approverName, sr.id, sr.product?.name || 'Unresolved Item', sr.requestedQuantity);
  }

  // Triggered when the "Reject" button is clicked. Opens the modal instead of rejecting immediately.
  openRejectModal(sr: StockRequest): void {
    this.rejectingRequest = sr; // Save which request we are rejecting
    this.rejectionReason = ''; // Clear out any old text in the reason box
    this.showRejectModal = true; // Make the modal visible using *ngIf in HTML
  }

  // Closes the reject modal without doing anything
  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectingRequest = null;
    this.rejectionReason = '';
  }

  // Triggered when the user types a reason and clicks "Confirm Reject" INSIDE the modal
  confirmReject(): void {
    const sr = this.rejectingRequest; // Get the request we saved earlier
    if (!sr) return; // Safety check
    
    // Grab the text they typed, fallback to default text if they left it blank
    const reason = this.rejectionReason.trim() || 'Insufficient stock'; 
    const approverId = this.auth.getCurrentUser()?.userId || 1;
    const approverName = this.auth.getCurrentUser()?.username || 'warehouse1';
    
    // Call backend API (PUT /api/v1/stock-requests/{id}/reject)
    this.service.rejectRequest(sr.id, reason, approverId).subscribe({
      next: () => {
        this.notifications.warning(`Request #${sr.id} rejected`); // Show yellow/orange toast
        this.closeRejectModal(); // Hide the popup window
        this.refreshRequests(); // Refresh the table so it shows as REJECTED
      },
      error: (err: any) => {
        this.notifications.error('Backend rejection failed: ' + (err?.error?.message || 'Unknown error'));
        this.loading = false;
      }
    });
    
    // Log the rejection attempt to the audit ledger
    this.auditLog.logStockRequestRejection(approverId, approverName, sr.id, sr.product?.name || 'Unresolved Item', reason);
  }

  // Note: This createDelivery logic was moved to the backend inside StockRequestService.java, 
  // but this fallback method is kept here just in case the UI needs to mock a delivery manually during tests.
  private createDelivery(sr: StockRequest): void {
    const trackingNumber = 'TRK' + Date.now() + Math.floor(Math.random() * 1000); // Generate random tracking number
    const delivery = {
      trackingNumber,
      warehouse: sr.warehouse || { id: 1, name: 'SL Warehouse', code: 'WH-001' },
      supermarket: sr.supermarket || { id: 1, name: 'Unknown Supermarket', code: 'SM-000' },
      product: sr.product || { id: 1, name: 'Unresolved Item', sku: 'PENDING' },
      stockRequest: sr,
      quantity: sr.requestedQuantity,
      status: DeliveryStatus.PENDING,
      createdAt: new Date(),
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    };
    // Post to backend
    this.deliveryService.createDelivery(delivery as any).subscribe({
      next: (created: any) => {
        this.notifications.info(`📦 Delivery ${trackingNumber} created and ready for dispatch`);
      },
      error: (err: any) => {
        console.error('Delivery creation failed:', err);
      }
    });
  }

  // Triggered when user clicks the PDF icon button. Calls the shared pdfReport service.
  exportToPdf(): void {
    this.pdfReport.generateStockRequestsReport(this.filteredRequests);
  }
}
