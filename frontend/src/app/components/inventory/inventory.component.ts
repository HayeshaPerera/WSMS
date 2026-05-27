import { Component, OnInit } from '@angular/core';
import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
import { WarehouseService } from '../../services/warehouse.service';
import { SupermarketService } from '../../services/supermarket.service';
import { NotificationService } from '../../services/notification.service';
import { SharedDataService } from '../../services/shared-data.service';
import { PdfReportService } from '../../services/pdf-report.service';
import { Inventory, Product } from '../../models/models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
  items: Inventory[] = [];
  filteredItems: Inventory[] = [];
  availableProducts: Product[] = [];
  loading = true;
  showAddForm = false;

  get totalSkus(): number {
    return this.filteredItems.length;
  }

  get lowStockCount(): number {
    return this.filteredItems.filter(i => i.lowStockAlert).length;
  }

  get totalValuation(): number {
    return this.filteredItems.reduce((acc, item) => acc + (item.quantity * (item.product?.unitPrice || 0)), 0);
  }

  // Filter properties
  searchTerm = '';
  selectedCategory = '';
  selectedWarehouse = '';
  showLowStockOnly = false;
  sortBy = 'latest'; // latest, oldest, nameAsc, nameDesc

  // Pagination properties
  page = 1;
  pageSize = 10;
  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.pageSize);
  }
  
  get paginatedItems(): Inventory[] {
    let sorted = [...this.filteredItems];
    if (this.sortBy === 'latest') {
      sorted.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    } else if (this.sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime());
    } else if (this.sortBy === 'nameAsc') {
      sorted.sort((a, b) => (a.product?.name || '').localeCompare(b.product?.name || ''));
    } else if (this.sortBy === 'nameDesc') {
      sorted.sort((a, b) => (b.product?.name || '').localeCompare(a.product?.name || ''));
    }

    const start = (this.page - 1) * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  categories = ['Dairy', 'Bakery', 'Beverages', 'Meat', 'Produce', 'Grains', 'Canned Goods', 'Spreads', 'Cooking', 'Snacks', 'Frozen'];
  warehouses: any[] = [];

  // Form properties
  selectedProduct: Product | null = null;
  isNewProduct = false;
  newInventory = {
    productId: null as number | null,
    warehouseId: 1,
    quantity: 0,
    reorderLevel: 0
  };
  newProduct = {
    sku: '',
    name: '',
    category: '',
    unitPrice: 0,
    description: '',
    isActive: true
  };

  constructor(
    private inventoryService: InventoryService,
    private productService: ProductService,
    private warehouseService: WarehouseService,
    private supermarketService: SupermarketService,
    private notifications: NotificationService,
    private sharedData: SharedDataService,
    private pdfReport: PdfReportService,
    public auth: AuthService
  ) { }

  ngOnInit(): void {
    this.loadWarehousesFromAPI();

    // Subscribe to shared inventory - this is the authoritative live list
    this.sharedData.inventory$.subscribe(inv => {
      if (Array.isArray(inv)) {
        this.items = inv;
        this.applyFilters();
        this.loading = false;
      }
    });

    // Subscribe to shared products for enrichment
    this.sharedData.products$.subscribe(products => {
      if (Array.isArray(products) && products.length > 0) {
        this.availableProducts = products;
      }
    });

    // Subscribe to shared warehouses
    this.sharedData.warehouses$.subscribe(whs => {
      if (Array.isArray(whs) && whs.length > 0) {
        this.warehouses = whs;
      }
    });

    // Load data from API
    this.loadProductsFromAPI();

    // If admin, also fetch supermarkets
    const user = this.auth.getCurrentUser();
    if (user && this.auth.isAdmin()) {
      this.supermarketService.getAll().subscribe({ next: (data: any) => this.sharedData.setSupermarkets(data), error: () => {} });
    }
  }

  loadWarehousesFromAPI(): void {
    this.warehouseService.getAll().subscribe({
      next: (data: any) => {
        let whs: any[] = [];
        if (Array.isArray(data)) whs = data;
        else if (data && Array.isArray(data.data)) whs = data.data;

        if (whs.length > 0) {
          this.warehouses = whs;
          this.sharedData.setWarehouses(whs);
        }
      },
      error: () => console.log('Failed to load warehouses from API')
    });
  }

  private reEnrichInventory(): void {
    try {
      const products = this.sharedData.getProducts();
      if (!Array.isArray(this.items) || this.items.length === 0) return;
      let changed = false;
      this.items = this.items.map(it => {
        if (!it.product || !it.product.name || it.product.name === 'Unknown Product' || it.product.name === 'Unresolved Item') {
          const pid = it.product?.id;
          const pname = it.product?.name;
          let found = null;
          if (pid != null) {
            found = products.find((p: any) => p && (p.id == pid || String(p.id) === String(pid)));
          }
          if (!found && pname) {
            found = products.find((p: any) => p && ((p.name || '').toLowerCase() === String(pname).toLowerCase()));
          }
          if (found) {
            changed = true;
            it.product = { ...found };
          }
        }
        return it;
      });
      if (changed) {
        this.filteredItems = [...this.items];
        this.sharedData.setInventory(this.items);
        console.log('Inventory re-enriched with products, items updated');
      }
    } catch (err) {
      console.debug('reEnrichInventory error', err);
    }
  }

  loadInventoryFromAPI(): void {
    const user = this.auth.getCurrentUser();
    let inventory$;
    if (user && (this.auth.isSupermarketManager() || user.supermarketId)) {
      const sid = user.supermarketId || (user as any).supermarketId;
      inventory$ = this.inventoryService.getSupermarketInventory(sid);
    } else if (user && (this.auth.isWarehouseStaff() || user.warehouseId)) {
      const wid = user.warehouseId || (user as any).warehouseId;
      inventory$ = this.inventoryService.getWarehouseInventory(wid);
    } else {
      inventory$ = this.inventoryService.getAllInventory();
    }

    inventory$.subscribe({
      next: (data: any) => {
        let inventoryData: Inventory[] = [];
        if (Array.isArray(data)) {
          inventoryData = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          inventoryData = data.data;
        } else if (data && typeof data === 'object' && Array.isArray(data.content)) {
          inventoryData = data.content;
        }

        const enriched = this.enrichInventoryWithProducts(inventoryData);
        if (enriched) {
          this.items = enriched;
          this.filteredItems = [...this.items];
          this.sharedData.setInventory(this.items);
        }
      },
      error: () => {
        console.error('Failed to load inventory');
      }
    });
  }

  private enrichInventoryWithProducts(items: any[]): any[] {
    if (!Array.isArray(items)) return items;
    const products = this.sharedData.getProducts();
    return items.map(itOrig => {
      const it: any = itOrig; // work with loose typing to accept backend variants

      // If nested product present but incomplete, try to enrich from products list
      if (it.product && (!it.product.name || !it.product.sku)) {
        const pid = it.product.id || it.product.productId || it.product.product_id || null;
        const matched = products.find((p: any) => p && (p.id == pid || String(p.id) === String(pid)));
        if (matched) it.product = { ...matched };
      }

      if (!it.product) {
        // Backend may provide flat fields: productId, product_id, productName, product_name, name, sku
        const pid = it.productId || it.product_id || it['product']?.id || it['productId'] || null;
        const pname = it.productName || it.product_name || it['productName'] || it['product']?.name || it.name || null;
        const psku = it.productSku || it.product_sku || it.sku || null;

        let found: any = null;
        if (pid != null) {
          found = products.find((p: any) => p && (p.id == pid || String(p.id) === String(pid)));
        }
        if (!found && pname) {
          found = products.find((p: any) => p && ((p.name || '').toLowerCase() === String(pname).toLowerCase() || (p.sku || '').toLowerCase() === String(pname).toLowerCase()));
        }
        if (!found && psku) {
          found = products.find((p: any) => p && ((p.sku || '').toLowerCase() === String(psku).toLowerCase()));
        }

        if (found) {
          it.product = { ...found };
        } else {
          console.debug('Inventory: product enrichment failed for item', it.id || '(no id)', 'pid', pid, 'pname', pname, 'psku', psku, 'productsCount', products.length);
          it.product = { id: pid || null, name: pname || 'Standard Local Supply', sku: psku || 'LOC-SUPPLY', unitPrice: 500 };
        }
      }

      // Map flat warehouse/supermarket fields back to nested objects for the frontend
      if (!it.warehouse && it.warehouseId) {
        it.warehouse = { id: it.warehouseId, name: it.warehouseName || `Warehouse ${it.warehouseId}` };
      }
      if (!it.supermarket && it.supermarketId) {
        it.supermarket = { id: it.supermarketId, name: it.supermarketName || `Supermarket ${it.supermarketId}` };
      }

      return it as Inventory;
    });
  }

  loadProductsFromAPI(): void {
    this.productService.getAll().subscribe({
      next: (products: any) => {
        let productData: Product[] = [];
        if (Array.isArray(products)) {
          productData = products;
        } else if (products && typeof products === 'object' && Array.isArray(products.data)) {
          productData = products.data;
        } else if (products && typeof products === 'object' && Array.isArray(products.content)) {
          productData = products.content;
        }

        this.availableProducts = productData;
        this.sharedData.setProducts(this.availableProducts);
        
        // Load inventory after products are ready
        this.loadInventoryFromAPI();
      },
      error: () => {
        console.error('Failed to load products');
        this.loadInventoryFromAPI();
      }
    });
  }



  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  exportToPdf(): void {
    this.pdfReport.generateInventoryReport(this.filteredItems);
  }

  applyFilters(): void {
    let filtered = [...this.items];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.product?.name || '').toLowerCase().includes(term) ||
        (item.product?.sku || '').toLowerCase().includes(term)
      );
    }
    if (this.selectedCategory) {
      filtered = filtered.filter(item => item.product?.category === this.selectedCategory);
    }
    if (this.selectedWarehouse) {
      filtered = filtered.filter(item =>
        item.warehouse?.name === this.selectedWarehouse ||
        String(item.warehouse?.id) === String(this.selectedWarehouse)
      );
    }
    if (this.showLowStockOnly) {
      filtered = filtered.filter(item => item.quantity <= item.reorderLevel);
    }
    this.filteredItems = filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedWarehouse = '';
    this.showLowStockOnly = false;
    this.filteredItems = [...this.items];
  }

  toggleLowStockFilter(): void {
    this.showLowStockOnly = !this.showLowStockOnly;
    this.applyFilters();
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
    }
  }

  changePageSize(event: any): void {
    this.pageSize = parseInt(event.target.value, 10);
    this.page = 1; // Reset to first page
  }

  changeSort(event: any): void {
    this.sortBy = event.target.value;
    this.page = 1; // Reset to first page
  }

  onProductSelect(event: any): void {
    const productId = event.target.value;

    if (productId === 'new') {
      this.isNewProduct = true;
      this.selectedProduct = null;
    } else if (productId) {
      this.isNewProduct = false;
      this.selectedProduct = this.availableProducts.find(p => p.id == productId) || null;
      this.newInventory.productId = parseInt(productId);
    } else {
      this.isNewProduct = false;
      this.selectedProduct = null;
      this.newInventory.productId = null;
    }
  }

  addInventoryItem(): void {
    if (this.newInventory.quantity <= 0) {
      this.notifications.error('Please enter a valid quantity');
      return;
    }

    if (this.isNewProduct) {
      if (!this.newProduct.sku || !this.newProduct.name || !this.newProduct.category || this.newProduct.unitPrice <= 0) {
        this.notifications.error('Please fill in all product details (SKU, Name, Category, and Price)');
        return;
      }

      const newProductId = Math.max(...this.availableProducts.map(p => p.id), 0) + 1;
      const createdProduct: Product = {
        id: newProductId,
        sku: this.newProduct.sku,
        name: this.newProduct.name,
        category: this.newProduct.category,
        unitPrice: this.newProduct.unitPrice,
        description: this.newProduct.description || `${this.newProduct.name} - ${this.newProduct.category}`,
        reorderLevel: this.newInventory.reorderLevel || 20,
        minStockLevel: Math.floor((this.newInventory.reorderLevel || 20) * 0.5),
        perishable: ['Dairy', 'Meat', 'Produce', 'Bakery'].includes(this.newProduct.category),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Try to create product in backend first
      this.productService.create(createdProduct).subscribe({
        next: (res: any) => {
          const backendProduct = res.data || res;
          // Use backend ID if available
          const productWithId: Product = {
            ...createdProduct,
            id: backendProduct.id || newProductId
          };
          this.availableProducts.unshift(productWithId);
          this.sharedData.addProduct(productWithId);
          this.createInventoryEntry(productWithId, true);
        },
        error: () => {
          // Backend failed, use local product
          this.availableProducts.unshift(createdProduct);
          this.sharedData.addProduct(createdProduct);
          // Don't attempt backend sync for inventory when product creation failed
          this.createInventoryEntry(createdProduct, false);
        }
      });
    } else {
      if (!this.selectedProduct) {
        this.notifications.error('Please select a product');
        return;
      }
      this.newInventory.productId = this.selectedProduct.id;
      this.createInventoryEntry(this.selectedProduct);
    }
  }

  createInventoryEntry(product: Product, persistToBackend: boolean = true): void {
    const warehouseId = this.newInventory.warehouseId || 1;
    
    const existingIndex = this.items.findIndex(i => 
      i.product?.id === product.id && i.warehouse?.id === warehouseId
    );

    const payload = {
      productId: product.id,
      warehouseId: warehouseId,
      quantity: this.newInventory.quantity,
      reorderLevel: this.newInventory.reorderLevel || product.reorderLevel || 20
    };
    
    if (existingIndex > -1) {
      const existing = this.items[existingIndex];
      const updatedPayload = {
        ...payload,
        quantity: existing.quantity + this.newInventory.quantity
      };
      
      this.inventoryService.updateInventory(existing.id, updatedPayload as any).subscribe({
        next: () => {
          this.notifications.success(`✅ Stock updated for ${product.name}`);
          this.loadInventoryFromAPI();
          this.resetForm();
          this.showAddForm = false;
        },
        error: () => this.notifications.error(`Failed to update stock`)
      });
    } else {
      this.inventoryService.createInventory(payload as any).subscribe({
        next: () => {
          this.notifications.success(`✅ Stock created for ${product.name}`);
          this.loadInventoryFromAPI();
          this.resetForm();
          this.showAddForm = false;
        },
        error: () => this.notifications.error(`Failed to create stock`)
      });
    }
  }

  resetForm(): void {
    this.selectedProduct = null;
    this.isNewProduct = false;
    this.newInventory = {
      productId: null,
      warehouseId: 1,
      quantity: 0,
      reorderLevel: 0
    };
    this.newProduct = {
      sku: '',
      name: '',
      category: '',
      unitPrice: 0,
      description: '',
      isActive: true
    };
  }

  getTotalValue(): number {
    return this.filteredItems.reduce((sum, item) => sum + (item.quantity * (item.product?.unitPrice || 0)), 0);
  }

  getLowStockCount(): number {
    return this.items.filter(item => item.quantity <= item.reorderLevel).length;
  }
}
