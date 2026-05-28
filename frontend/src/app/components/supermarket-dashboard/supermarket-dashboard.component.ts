import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
import { StockRequestService } from '../../services/stock-request.service';
import { DeliveryService } from '../../services/delivery.service';
import { NotificationService } from '../../services/notification.service';
import { SharedDataService } from '../../services/shared-data.service';
import { Inventory, Product } from '../../models/models';
import { ApiResponse } from '../../models/models';

@Component({
  selector: 'app-supermarket-dashboard',
  templateUrl: './supermarket-dashboard.component.html',
  styleUrls: ['./supermarket-dashboard.component.css']
})
export class SupermarketDashboardComponent implements OnInit {
  availableWarehouseQuantity: number | null = null;
  supermarketId?: number;
  inventory: Inventory[] = [];
  products: Product[] = [];
  myRequests: any[] = [];
  myDeliveries: any[] = [];

  // ── Computed getters (no arrow fns in templates) ────────
  get lowStockCount():          number { return this.inventory.filter(i => i.lowStockAlert).length; }
  get pendingRequestsCount():   number { return this.myRequests.filter(r => r.status === 'PENDING').length; }
  get activeDeliveriesCount():  number { return this.myDeliveries.filter(d => d.status !== 'DELIVERED').length; }


  // Demo KPIs and panels to enrich dashboard
  kpis = [
    { label: 'Sales Today', value: 'LKR 385k' },
    { label: 'Low Stock SKUs', value: '7' },
    { label: 'Open Requests', value: '3' },
    { label: 'Incoming Deliveries', value: '2' }
  ];

  promoHighlights = [
    { title: 'Milk & Bread Bundle', impact: '+14% units', note: 'Weekend offer' },
    { title: 'Dairy Loyalty', impact: '+9% repeat', note: 'Members only' }
  ];

  buyingTrends = [
    { category: 'Dairy', trend: '+12%' },
    { category: 'Bakery', trend: '+8%' },
    { category: 'Produce', trend: '+5%' }
  ];

  activityFeed = [
    { time: '10:52', text: 'Stock request REQ-209 approved', type: 'success' },
    { time: '10:15', text: 'Delivery TRK-002 received', type: 'info' },
    { time: '09:48', text: 'Low stock alert: Milk 1L', type: 'warn' }
  ];
  
  showRequestForm = false;
  requestForm = {
    productId: '',
    quantity: ''
  };

  onProductSelect(productId: string): void {
    if (!productId) {
      this.availableWarehouseQuantity = null;
      return;
    }
    this.inventoryService.getWarehouseProductQuantity(parseInt(productId), 1).subscribe({
      next: (qty) => this.availableWarehouseQuantity = qty,
      error: _ => this.availableWarehouseQuantity = null
    });
  }

  constructor(
    private auth: AuthService,
    private inventoryService: InventoryService,
    private productService: ProductService,
    private requestService: StockRequestService,
    private deliveryService: DeliveryService,
    private notifications: NotificationService,
    private sharedData: SharedDataService
  ) {}

  ngOnInit(): void {
    // Ensure arrays are initialized before rendering
    this.products     = [];
    this.inventory    = [];
    this.myRequests   = [];
    this.myDeliveries = [];

    this.supermarketId = this.auth.getCurrentUser()?.supermarketId || 1;
    this.sharedData.initializeDefaultData();
    this.loadData();

    // Subscribe to shared data updates (single subscription each)
    this.sharedData.stockRequests$.subscribe((requests: any[] | ApiResponse) => {
      const arr: any[] = Array.isArray(requests)
        ? requests
        : (requests && typeof requests === 'object' && 'data' in requests ? (requests as ApiResponse).data ?? [] : []);
      this.myRequests = arr
        .map(r => this.enrichStockRequest(r))
        .filter((r: any) => (r.supermarket?.id || r.supermarketId) === this.supermarketId);
    });

    this.sharedData.deliveries$.subscribe((deliveries: any[] | ApiResponse) => {
      const arr: any[] = Array.isArray(deliveries)
        ? deliveries
        : (deliveries && typeof deliveries === 'object' && 'data' in deliveries ? (deliveries as ApiResponse).data ?? [] : []);
      this.myDeliveries = arr.filter((d: any) => d.supermarket?.id === this.supermarketId);
    });

    // Load products for stock request dropdown (demo fallback first)
    this.addHardcodedProducts();
    this.products = this.sharedData.getProducts ? this.sharedData.getProducts() : [];
    this.productService.getAvailableInWarehouses().subscribe({
      next: (products: any[] | ApiResponse) => {
        const arr = Array.isArray(products)
          ? products
          : (products && typeof products === 'object' && 'data' in products ? (products as ApiResponse).data ?? [] : []);
        if (arr && arr.length > 0) { this.products = arr; }
      },
      error: () => { /* keep demo products */ }
    });
  }

  loadData(): void {
    this.loadInventory();
    this.loadProductsFromAPI();
    this.loadMyRequests();
    this.loadMyDeliveries();
  }

  loadInventory(): void {
    this.inventoryService.getSupermarketInventory(this.supermarketId!).subscribe(
      (res: any[] | ApiResponse) => {
        const arr = Array.isArray(res)
          ? res
          : (res && typeof res === 'object' && 'data' in res ? (res as ApiResponse).data ?? [] : []);
        this.inventory = this.enrichInventoryWithProducts(arr);
        // Ensure shared data is updated for other components (navbar low-stock, etc.)
        if (Array.isArray(this.inventory) && this.inventory.length > 0) {
          this.sharedData.setInventory(this.inventory);
        }
      },
      _ => this.addHardcodedInventory()
    );
  }

  // If backend returns inventory items without nested `product`, try to attach product objects
  private enrichInventoryWithProducts(items: any[]): any[] {
    if (!Array.isArray(items)) return items;
    const products = this.sharedData.getProducts();
    return items.map(it => {
      if (!it.product) {
        const found = products.find((p: any) => p.id === (it.productId || it.product?.id));
        it.product = found || { id: it.productId || null, name: 'Unresolved Item', sku: 'PENDING', unitPrice: 0 };
      }
      return it;
    });
  }

  loadProductsFromAPI(): void {
    this.productService.getAll().subscribe({
      next: (res: any[] | ApiResponse) => {
        const products = Array.isArray(res)
          ? res
          : (res && typeof res === 'object' && 'data' in res ? (res as ApiResponse).data ?? [] : []);
        if (products && products.length > 0) {
          this.sharedData.setProducts(products);
        } else {
          this.addHardcodedProducts();
        }
      },
      error: _ => {
        this.addHardcodedProducts();
      }
    });
  }

  loadMyRequests(): void {
    if (!this.supermarketId) return;
    this.requestService.getRequestsBySupermarket(this.supermarketId).subscribe(
      (requests: any[]) => {
        this.myRequests = Array.isArray(requests) ? requests : [];
      },
      _ => this.addHardcodedRequests()
    );
  }

  loadMyDeliveries(): void {
    this.deliveryService.getAllDeliveries().subscribe(
      (res: any[] | ApiResponse) => {
        const deliveries = Array.isArray(res)
          ? res
          : (res && typeof res === 'object' && 'data' in res ? (res as ApiResponse).data ?? [] : []);
        this.myDeliveries = deliveries.filter((d: any) => d.supermarket?.id === this.supermarketId);
      },
      _ => this.addHardcodedDeliveries()
    );
  }

  toggleRequestForm(): void {
    this.showRequestForm = !this.showRequestForm;
    if (!this.showRequestForm) {
      this.requestForm = { productId: '', quantity: '' };
      this.availableWarehouseQuantity = null;
    }
  }

  submitRequest(): void {
    if (!this.requestForm.productId || !this.requestForm.quantity) {
      this.notifications.error('Please fill all fields');
      return;
    }

    const product = this.products.find(p => p.id === parseInt(this.requestForm.productId));
    if (!product) {
      this.notifications.error('Invalid product selected');
      return;
    }

    const newRequest = {
      supermarketId: this.supermarketId,
      warehouseId: 1,
      productId: parseInt(this.requestForm.productId),
      requestedQuantity: parseInt(this.requestForm.quantity),
      status: 'PENDING',
      priority: 'MEDIUM'
    };

    this.requestService.createRequest(newRequest as any).subscribe({
      next: (res) => {
        this.notifications.success(`Stock request created for ${product.name} - ${this.requestForm.quantity} units`);
        // If backend returned created object, enrich and push to shared data so navbar and warehouse see it
        const created = res && (res as any).data ? (res as any).data : null;
        const enriched = {
          id: created?.id || Date.now(),
          requestNumber: created?.requestNumber || `REQ-${Date.now()}`,
          supermarket: { id: this.supermarketId, code: `SM${this.supermarketId}`, name: `Supermarket ${this.supermarketId}` },
          warehouse: { id: newRequest.warehouseId || 1, code: `WH${newRequest.warehouseId || 1}`, name: 'Colombo Warehouse' },
          product: created?.product || product,
          requestedQuantity: newRequest.requestedQuantity,
          status: created?.status || 'PENDING',
          priority: created?.priority || 'MEDIUM',
          requestedBy: created?.requestedBy || null,
          requestedAt: created?.requestedAt ? new Date(created.requestedAt) : new Date()
        };
        this.sharedData.addStockRequest(enriched);
        this.loadMyRequests();
        this.toggleRequestForm();
      },
      error: (err) => {
        this.notifications.error('Failed to create stock request');
      }
    });
  }

  getStatusBadge(status: string): string {
    const badges: any = {
      'PENDING':   'badge-pending',
      'APPROVED':  'badge-approved',
      'REJECTED':  'badge-rejected',
      'IN_TRANSIT': 'badge-in_transit',
      'DELIVERED': 'badge-delivered',
      'COMPLETED': 'badge-completed',
      'CANCELLED': 'badge-cancelled'
    };
    return badges[status] || 'badge-pending';
  }

  addHardcodedInventory(): void {
    this.inventory = [
      { id: 1, product: { id: 1, sku: 'PROD001', name: 'Milk 1L', category: 'Dairy', unitPrice: 1047, minStockLevel: 30, perishable: true, active: true, reorderLevel: 50, createdAt: new Date(), updatedAt: new Date() } as any, supermarket: { id: this.supermarketId, code: 'SM01', name: 'Colombo Supermarket' } as any, quantity: 45, reorderLevel: 50, lowStockAlert: true, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 2, product: { id: 3, sku: 'PROD003', name: 'Eggs Dozen', category: 'Dairy', unitPrice: 1222, minStockLevel: 25, perishable: true, active: true, reorderLevel: 30, createdAt: new Date(), updatedAt: new Date() } as any, supermarket: { id: this.supermarketId, code: 'SM01', name: 'Colombo Supermarket' } as any, quantity: 28, reorderLevel: 30, lowStockAlert: true, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 3, product: { id: 5, sku: 'PROD005', name: 'Butter 200g', category: 'Dairy', unitPrice: 1397, minStockLevel: 25, perishable: true, active: true, reorderLevel: 35, createdAt: new Date(), updatedAt: new Date() } as any, supermarket: { id: this.supermarketId, code: 'SM01', name: 'Colombo Supermarket' } as any, quantity: 60, reorderLevel: 35, lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() } as any
    ];
    // Update shared inventory so navbar shows demo supermarket inventory
    if (this.inventory && this.inventory.length > 0) {
      this.sharedData.setInventory(this.inventory);
    }
  }

  addHardcodedProducts(): void {
    const hardcodedProducts = [
      { id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy', unitPrice: 1747, reorderLevel: 50, minStockLevel: 30, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, sku: 'PROD002', name: 'White Bread Loaf', category: 'Bakery', unitPrice: 872, reorderLevel: 40, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, sku: 'PROD003', name: 'Premium Ground Coffee', category: 'Beverages', unitPrice: 4547, reorderLevel: 30, minStockLevel: 10, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 4, sku: 'PROD004', name: 'Cheddar Cheese Block', category: 'Dairy', unitPrice: 2097, reorderLevel: 25, minStockLevel: 8, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 5, sku: 'PROD005', name: 'Chicken Breast (1kg)', category: 'Meat', unitPrice: 3147, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 6, sku: 'PROD006', name: 'Eggs (Dozen)', category: 'Dairy', unitPrice: 1222, reorderLevel: 45, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 7, sku: 'PROD007', name: 'Olive Oil 500ml', category: 'Cooking', unitPrice: 3497, reorderLevel: 20, minStockLevel: 8, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 8, sku: 'PROD008', name: 'Brown Rice 2kg', category: 'Grains', unitPrice: 2622, reorderLevel: 30, minStockLevel: 12, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 9, sku: 'PROD009', name: 'Fresh Orange Juice 1L', category: 'Beverages', unitPrice: 1922, reorderLevel: 50, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 10, sku: 'PROD010', name: 'Pasta 500g', category: 'Grains', unitPrice: 1047, reorderLevel: 60, minStockLevel: 25, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 11, sku: 'PROD011', name: 'Tomato Sauce 400g', category: 'Canned Goods', unitPrice: 697, reorderLevel: 40, minStockLevel: 18, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 12, sku: 'PROD012', name: 'Almond Butter 250g', category: 'Spreads', unitPrice: 4197, reorderLevel: 20, minStockLevel: 8, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 13, sku: 'PROD013', name: 'Greek Yogurt 500g', category: 'Dairy', unitPrice: 1572, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 14, sku: 'PROD014', name: 'Honey 350g', category: 'Spreads', unitPrice: 3147, reorderLevel: 25, minStockLevel: 10, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 15, sku: 'PROD015', name: 'Strawberries 250g', category: 'Produce', unitPrice: 2272, reorderLevel: 30, minStockLevel: 12, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }
    ] as any;
    this.sharedData.setProducts(hardcodedProducts);
  }

  private enrichStockRequest(r: any): any {
    if (!r) return r;
    // Attach product object if missing
    if (!r.product && (r.productId || r.product_id)) {
      const pid = r.productId || r.product_id;
      const prod = this.sharedData.getProducts().find((p: any) => p.id === pid);
      r.product = prod || { id: pid, name: 'Unresolved Item', sku: 'PENDING', unitPrice: 0 };
    }
    // Attach supermarket object if missing
    if (!r.supermarket && (r.supermarketId || r.supermarket_id || r.supermarket)) {
      const sid = r.supermarket?.id || r.supermarketId || r.supermarket_id;
      if (sid) {
        r.supermarket = { id: sid, code: `SM${sid}`, name: `Supermarket ${sid}` };
      }
    }
    return r;
  }

  addHardcodedRequests(): void {
    this.myRequests = [
      { id: 1, supermarketId: this.supermarketId, productId: 1, productName: 'Milk 1L', productSku: 'PROD001', requestedQuantity: 100, status: 'APPROVED', requestDate: new Date('2024-01-20'), approvalDate: new Date('2024-01-20') },
      { id: 2, supermarketId: this.supermarketId, productId: 3, productName: 'Eggs Dozen', productSku: 'PROD003', requestedQuantity: 50, status: 'PENDING', requestDate: new Date('2024-01-22'), approvalDate: null },
      { id: 3, supermarketId: this.supermarketId, productId: 5, productName: 'Butter 200g', productSku: 'PROD005', requestedQuantity: 75, status: 'REJECTED', requestDate: new Date('2024-01-19'), approvalDate: new Date('2024-01-19'), rejectionReason: 'Out of stock' }
    ];
  }

  addHardcodedDeliveries(): void {
    this.myDeliveries = [
      { id: 1, trackingNumber: 'TRK001', destinationSupermarketId: this.supermarketId, productName: 'Milk 1L', quantity: 100, status: 'IN_TRANSIT', estimatedDelivery: new Date('2024-01-24') },
      { id: 2, trackingNumber: 'TRK002', destinationSupermarketId: this.supermarketId, productName: 'Eggs Dozen', quantity: 50, status: 'DELIVERED', estimatedDelivery: new Date('2024-01-21'), actualDelivery: new Date('2024-01-21') }
    ];
  }
}
