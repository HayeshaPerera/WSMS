import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
import { NotificationService } from '../../services/notification.service';
import { Inventory, Product } from '../../models/models';
import { SharedDataService } from '../../services/shared-data.service';
import { StockRequestService } from '../../services/stock-request.service';

@Component({
  selector: 'app-warehouse-dashboard',
  templateUrl: './warehouse-dashboard.component.html',
  styleUrls: ['./warehouse-dashboard.component.css']
})
export class WarehouseDashboardComponent implements OnInit {
  pendingRequests: any[] = [];
  warehouseId?: number;
  inventory: Inventory[] = [];
  products: Product[] = [];
  showForm = false;
  editingId?: number;
  loading = true;
  confirmDeleteId?: number;  // tracks which item is pending delete confirmation

  get lowStockCount(): number { return this.inventory.filter(i => i.lowStockAlert).length; }


  // KPI & demo data to keep dashboard rich before live feeds
  kpis = [
    { label: 'Storage Utilization', value: '74%', accent: 'info' },
    { label: 'Active SKUs', value: '148', accent: 'success' },
    { label: 'Pending Receipts', value: '6', accent: 'warning' },
    { label: 'Dispatches Today', value: '12', accent: 'primary' }
  ];

  utilization = {
    capacity: 15000,
    current: 11100,
    free: 3900
  };

  receivingSchedule = [
    { eta: '11:30', supplier: 'DairyCo', sku: 'MILK-1L', qty: 500 },
    { eta: '13:10', supplier: 'BakeHouse', sku: 'BREAD-LOAF', qty: 350 },
    { eta: '15:25', supplier: 'GreenFarm', sku: 'LETTUCE', qty: 200 }
  ];

  topSkus = [
    { sku: 'EGG-12', name: 'Eggs Dozen', turnover: 920 },
    { sku: 'CHDR-500', name: 'Cheddar Cheese 500g', turnover: 780 },
    { sku: 'MILK-1L', name: 'Whole Milk 1L', turnover: 1120 }
  ];

  recentActivity = [
    { time: '10:12', text: 'Dispatched DL-310 to SM03', type: 'info' },
    { time: '09:58', text: 'Received 450 units MILK-1L', type: 'success' },
    { time: '09:40', text: 'Low stock alert: RICE-5KG', type: 'warn' }
  ];
  // Demo data arrays for robust fallback
  demoProducts: any[] = [
    { id: 1, sku: 'PROD001', name: 'Whole Milk 1L', category: 'Dairy', unitPrice: 2.99, reorderLevel: 50, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, sku: 'PROD002', name: 'Bread Loaf', category: 'Bakery', unitPrice: 1.99, reorderLevel: 40, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, sku: 'PROD003', name: 'Eggs Dozen', category: 'Dairy', unitPrice: 3.49, reorderLevel: 30, minStockLevel: 10, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }
  ];
  demoInventory: any[] = [
    { id: 1, product: null, warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: '123 Industrial Ave', capacity: 10000, currentStock: 7500, active: true, createdAt: new Date(), updatedAt: new Date() }, quantity: 100, reorderLevel: 20, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, product: null, warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: '123 Industrial Ave', capacity: 10000, currentStock: 7500, active: true, createdAt: new Date(), updatedAt: new Date() }, quantity: 50, reorderLevel: 10, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, product: null, warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: '123 Industrial Ave', capacity: 10000, currentStock: 7500, active: true, createdAt: new Date(), updatedAt: new Date() }, quantity: 120, reorderLevel: 30, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() }
  ];
  
  form = {
    productId: '',
    quantity: '',
    reorderLevel: ''
  };

  isNewProduct = false;
  newProduct: any = {
    sku: '',
    name: '',
    category: '',
    unitPrice: 0,
    description: ''
  };

  constructor(
    private auth: AuthService,
    private inventoryService: InventoryService,
    private productService: ProductService,
    private notifications: NotificationService,
    private sharedData: SharedDataService,
    private stockRequestService: StockRequestService
  ) {}
  ngOnInit(): void {
    this.warehouseId = this.auth.getCurrentUser()?.warehouseId || 1;
    // Always use hardcoded data first
    this.addHardcodedData();
    this.loading = false;
    
    // Load pending requests from shared data
    this.loadPendingRequests();
    // Subscribe to updates so pendingRequests refresh in real-time
    this.sharedData.stockRequests$.subscribe((requests: any[]) => {
      this.pendingRequests = (requests || []).filter((r: any) => r.status === 'PENDING' && (r.supermarket?.id || r.supermarketId) && (r.product?.name || r.product?.id));
    });
    
    // Try to load from API (will replace if valid)
    this.loadInventoryFromAPI();
    this.loadProductsFromAPI();
  }

  addHardcodedData(): void {
    this.products = [
      { id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy', unitPrice: 899.00, reorderLevel: 50, minStockLevel: 30, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, sku: 'PROD002', name: 'White Bread Loaf', category: 'Bakery', unitPrice: 449.00, reorderLevel: 40, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, sku: 'PROD003', name: 'Premium Ground Coffee', category: 'Beverages', unitPrice: 2499.00, reorderLevel: 30, minStockLevel: 10, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 4, sku: 'PROD004', name: 'Cheddar Cheese Block', category: 'Dairy', unitPrice: 1199.00, reorderLevel: 25, minStockLevel: 8, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 5, sku: 'PROD005', name: 'Chicken Breast (1kg)', category: 'Meat', unitPrice: 1599.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 6, sku: 'PROD006', name: 'Eggs (Dozen)', category: 'Dairy', unitPrice: 599.00, reorderLevel: 45, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }
    ] as Product[];
    
    const warehouse = { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() };
    
    this.inventory = [
      { id: 1, product: this.products[0], warehouse, quantity: 150, reorderLevel: 50, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, product: this.products[1], warehouse, quantity: 200, reorderLevel: 40, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, product: this.products[2], warehouse, quantity: 85, reorderLevel: 30, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 4, product: this.products[3], warehouse, quantity: 18, reorderLevel: 25, lastUpdated: new Date(), lowStockAlert: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 5, product: this.products[4], warehouse, quantity: 65, reorderLevel: 35, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() },
      { id: 6, product: this.products[5], warehouse, quantity: 320, reorderLevel: 45, lastUpdated: new Date(), lowStockAlert: false, createdAt: new Date(), updatedAt: new Date() }
    ] as Inventory[];
    // Publish warehouse-scoped demo inventory so navbar shows relevant low-stock counts
    this.sharedData.setInventory(this.inventory);
  }

  loadPendingRequests(): void {
    this.pendingRequests = this.sharedData.getStockRequests().filter((r: any) => r.status === 'PENDING' && r.product && r.product.name);
  }

  approveRequest(requestId: number, approvedQuantity: number): void {
    const approverId = this.auth.getCurrentUser()?.userId || 1;
    const approverName = this.auth.getCurrentUser()?.username || 'warehouse1';
    this.stockRequestService.approveRequest(requestId, approvedQuantity, approverId).subscribe({
      next: (res: any) => {
        // Update local shared data with approved status
        this.sharedData.updateStockRequest(requestId, { status: 'APPROVED', approvedQuantity, approvedAt: new Date(), approvedBy: { id: approverId, username: approverName } });

        // If backend returned a delivery object, add it; otherwise create a local delivery
        const deliveryFromServer = res?.data?.delivery || res?.delivery;
        if (deliveryFromServer) {
          this.sharedData.addDelivery(deliveryFromServer);
        } else {
          const req = this.sharedData.getStockRequests().find((r: any) => r.id === requestId);
          if (req) {
            const delivery = {
              id: Math.max(...this.sharedData.getDeliveries().map((d: any) => d.id), 0) + 1,
              trackingNumber: 'TRK' + Date.now(),
              warehouse: req.warehouse,
              supermarket: req.supermarket,
              product: req.product,
              quantity: approvedQuantity,
              status: 'IN_TRANSIT',
              createdAt: new Date(),
              dispatchedAt: new Date(),
              estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            };
            this.sharedData.addDelivery(delivery);
          }
        }

        this.loadPendingRequests();
        this.notifications.success(`✅ Request #${requestId} approved and delivery created for ${approvedQuantity} units`);
      },
      error: (err) => {
        console.error('Approve request failed', err);
        this.notifications.error('Failed to approve stock request (server error)');
      }
    });
  }

  loadInventoryFromAPI(): void {
    if (this.warehouseId) {
      this.inventoryService.getWarehouseInventory(this.warehouseId).subscribe({
        next: (data: any) => {
          let invData: Inventory[] = Array.isArray(data) ? data : (data?.data || []);
          const hasValidData = invData.length > 0 && invData.every(i => i.product && i.product.name && i.product.sku);
            if (hasValidData) {
            this.inventory = invData;
            if (this.inventory && this.inventory.length > 0) this.sharedData.setInventory(this.inventory);
          } else {
            const enriched = this.enrichInventoryWithProducts(invData);
            if (enriched && enriched.length > 0) {
              this.inventory = enriched as Inventory[];
              this.sharedData.setInventory(this.inventory);
            }
          }
        },
        error: () => console.log('Using hardcoded warehouse inventory')
      });
    }
  }

  private enrichInventoryWithProducts(items: any[]): any[] {
    if (!Array.isArray(items)) return items;
    const products = this.sharedData.getProducts();
    return items.map(it => {
      if (!it.product) {
        const found = products.find((p: any) => p.id === (it.productId || it.product?.id));
        it.product = found || { id: it.productId || null, name: 'Unknown Product', sku: 'N/A', unitPrice: 0 };
      }
      return it;
    });
  }

  loadProductsFromAPI(): void {
    this.productService.getAll().subscribe({
      next: (data: any) => {
        let prodData: Product[] = Array.isArray(data) ? data : (data?.data || []);
        const hasValidData = prodData.length > 0 && prodData.every(p => p.name && p.sku && p.unitPrice);
        if (hasValidData) {
          this.products = prodData;
          this.sharedData.setProducts(this.products);
        }
      },
      error: () => console.log('Using hardcoded products')
    });
  }

  loadInventory(): void {
    this.loadInventoryFromAPI();
  }

  loadProducts(): void {
    this.loadProductsFromAPI();
  }


  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.form = { productId: '', quantity: '', reorderLevel: '' };
    this.editingId = undefined;
    this.isNewProduct = false;
    this.newProduct = { sku: '', name: '', category: '', unitPrice: 0, description: '' };
  }

  onProductSelect(event: any): void {
    const val = event.target ? event.target.value : event;
    if (val === 'new') {
      this.isNewProduct = true;
    } else {
      this.isNewProduct = false;
    }
  }

  onSubmit(): void {
    if (!this.form.productId || !this.form.quantity || !this.form.reorderLevel) {
      this.notifications.error('Please fill all required fields');
      return;
    }

    let selectedProduct = this.products.find(p => p.id === parseInt(this.form.productId));
    // If creating new product, validate fields and attempt backend create
    if (this.form.productId === 'new' || this.isNewProduct) {
      if (!this.newProduct.sku || !this.newProduct.name || !this.newProduct.category || !(this.newProduct.unitPrice > 0)) {
        this.notifications.error('Please fill all new product details');
        return;
      }
      // Create product on backend first
      const newProductLocalId = Math.max(...this.products.map(p => p.id), 0) + 1;
      const createdProductPayload: any = {
        id: newProductLocalId,
        sku: this.newProduct.sku,
        name: this.newProduct.name,
        category: this.newProduct.category,
        unitPrice: this.newProduct.unitPrice,
        description: this.newProduct.description || `${this.newProduct.name} - ${this.newProduct.category}`
      };

      console.log('Creating new product on backend:', createdProductPayload);
      this.productService.create(createdProductPayload).subscribe({
        next: (res: any) => {
          console.log('Create product response:', res);
          const backend = res?.data || res;
          selectedProduct = {
            ...createdProductPayload,
            id: backend?.id || createdProductPayload.id
          } as Product;
          this.products.unshift(selectedProduct);
          this.sharedData.addProduct(selectedProduct);
          // proceed to create inventory using backend product id
          this.createInventoryForSelectedProduct(selectedProduct);
        },
        error: (err) => {
          console.error('Product create failed:', err);
          // Backend create failed — add product locally and create local-only inventory entry
          this.products.unshift(createdProductPayload as Product);
          this.sharedData.addProduct(createdProductPayload);
          this.notifications.warning('Product created locally (backend unavailable). Inventory will be local only.');
          this.createLocalInventoryEntry(createdProductPayload as Product);
        }
      });
      return; // exit, follow-up handled in callbacks
    }

    const newItem: any = {
      id: Math.max(...this.inventory.map(i => i.id), 0) + 1,
      product: selectedProduct,
      warehouse: { id: this.warehouseId, code: 'WH01', name: 'Main Warehouse', location: 'Downtown', capacity: 10000, currentStock: 5000, isActive: true } as any,
      quantity: parseInt(this.form.quantity),
      reorderLevel: parseInt(this.form.reorderLevel),
      lowStockAlert: parseInt(this.form.quantity) < parseInt(this.form.reorderLevel),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.editingId) {
      // Update existing (local update)
      const idx = this.inventory.findIndex(i => i.id === this.editingId);
      if (idx >= 0) {
        this.inventory[idx] = { ...this.inventory[idx], ...newItem, id: this.editingId };
        this.notifications.success(`✅ ${selectedProduct?.name || 'Item'} updated successfully`);
      }
      this.toggleForm();
      return;
    }

    // If not creating new product, proceed to create inventory via backend
    this.createInventoryForSelectedProduct(selectedProduct);
  }

  private createInventoryForSelectedProduct(selectedProduct?: Product) {
    if (!selectedProduct) {
      this.notifications.error('No product selected to create inventory');
      return;
    }

    const payload: any = {
      productId: selectedProduct.id,
      warehouseId: this.warehouseId,
      quantity: parseInt(this.form.quantity),
      reorderLevel: parseInt(this.form.reorderLevel)
    };

    this.inventoryService.createInventory(payload).subscribe({
      next: (res: any) => {
        const created = res.data || res;
        // Ensure UI shows product name even if backend response doesn't include nested product
        if (!created.product) created.product = selectedProduct;
        this.inventory.unshift(created);
        // Also push to shared data so other components (navbar, supermarket) see updates
        this.sharedData.addInventoryItem(created);
        this.notifications.success(`✅ ${selectedProduct?.name || 'Item'} added to inventory`);
        this.toggleForm();
      },
      error: err => {
        console.error('Failed to create inventory', err);
        this.notifications.error('Failed to add inventory');
      }
    });
  }

  private createLocalInventoryEntry(product: Product) {
    const newItem: any = {
      id: Math.max(...this.inventory.map(i => i.id), 0) + 1,
      product: product,
      warehouse: { id: this.warehouseId, code: 'WH01', name: 'Main Warehouse', location: 'Downtown', capacity: 10000, currentStock: 5000, isActive: true } as any,
      quantity: parseInt(this.form.quantity),
      reorderLevel: parseInt(this.form.reorderLevel),
      lowStockAlert: parseInt(this.form.quantity) < parseInt(this.form.reorderLevel),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.inventory.unshift(newItem);
    this.sharedData.addInventoryItem(newItem);
    this.notifications.success(`✅ ${product.name} added to inventory (local)`);
    this.toggleForm();
  }

  edit(item: Inventory): void {
    this.editingId = item.id;
    this.form = {
      productId: (item.product?.id || 0).toString(),
      quantity: item.quantity.toString(),
      reorderLevel: item.reorderLevel.toString()
    };
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  requestDelete(id: number): void {
    this.confirmDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmDeleteId = undefined;
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId;
    if (!id) return;
    const item = this.inventory.find(i => i.id === id);
    if (item) {
      const idx = this.inventory.findIndex(i => i.id === id);
      if (idx >= 0) {
        this.inventory.splice(idx, 1);
        this.notifications.success(`${item.product?.name || 'Item'} removed from inventory`);
      }
    }
    this.confirmDeleteId = undefined;
  }
}
