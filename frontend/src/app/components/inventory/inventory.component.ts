import { Component, OnInit } from '@angular/core'; // Core Angular dependencies
import { InventoryService } from '../../services/inventory.service'; // API service for Inventory endpoints
import { ProductService } from '../../services/product.service'; // API service for Product endpoints
import { WarehouseService } from '../../services/warehouse.service'; // API service for Warehouse endpoints
import { SupermarketService } from '../../services/supermarket.service'; // API service for Supermarket endpoints
import { NotificationService } from '../../services/notification.service'; // Toast notifications
import { SharedDataService } from '../../services/shared-data.service'; // Global state management (BehaviorSubjects)
import { PdfReportService } from '../../services/pdf-report.service'; // PDF Export utility
import { Inventory, Product } from '../../models/models'; // Strict TypeScript interfaces
import { AuthService } from '../../services/auth.service'; // Authentication state (roles/permissions)

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
  items: Inventory[] = []; // Master list of all inventory records fetched from API
  filteredItems: Inventory[] = []; // The list currently visible in the UI after filters/search
  availableProducts: Product[] = []; // Dropdown options for adding new stock
  loading = true; // Controls the loading spinner state
  showAddForm = false; // Toggles the "Add/Edit Stock" side panel
  editingInventory: Inventory | null = null; // Holds the specific item being edited, if any
  showConfirmModal = false; // Toggles the "Are you sure you want to delete?" popup
  confirmInventory?: Inventory; // Holds the item targeted for deletion

  // --- Dynamic KPI Getters ---

  // Returns the total number of unique SKUs currently visible in the table
  get totalSkus(): number {
    return this.filteredItems.length;
  }

  // Returns how many visible items have fallen below their reorder threshold
  get lowStockCount(): number {
    return this.filteredItems.filter(i => i.lowStockAlert).length; // Relies on backend setting 'lowStockAlert' boolean
  }

  // Calculates the total financial value (Quantity * Unit Price) of all visible items
  get totalValuation(): number {
    return this.filteredItems.reduce((acc, item) => acc + (item.quantity * (item.product?.unitPrice || 0)), 0);
  }

  // --- Filter State Variables (bound to HTML via ngModel) ---
  searchTerm = '';
  selectedCategory = '';
  selectedWarehouse = '';
  selectedSupermarket = '';
  showLowStockOnly = false;
  sortBy = 'latest'; // Default sort order (latest, oldest, nameAsc, nameDesc)

  // --- Pagination State ---
  page = 1;
  pageSize = 10;
  
  // Dynamically calculate total pages based on current filtered array length
  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.pageSize);
  }
  
  // This getter handles BOTH sorting AND pagination before rendering the table rows
  get paginatedItems(): Inventory[] {
    let sorted = [...this.filteredItems]; // Clone array to avoid mutating original
    
    // Apply selected sorting logic
    if (this.sortBy === 'latest') {
      sorted.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    } else if (this.sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime());
    } else if (this.sortBy === 'nameAsc') {
      sorted.sort((a, b) => (a.product?.name || '').localeCompare(b.product?.name || ''));
    } else if (this.sortBy === 'nameDesc') {
      sorted.sort((a, b) => (b.product?.name || '').localeCompare(a.product?.name || ''));
    }

    // Apply pagination slice (e.g., Page 2 with Size 10 slices from index 10 to 20)
    const start = (this.page - 1) * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  // Static list of categories for the Add Product dropdown
  categories = ['Dairy', 'Bakery', 'Beverages', 'Meat', 'Produce', 'Grains', 'Canned Goods', 'Spreads', 'Cooking', 'Snacks', 'Frozen'];
  warehouses: any[] = []; // Loaded from API for filters/dropdowns
  supermarkets: any[] = []; // Loaded from API for filters/dropdowns

  // --- Form State Variables ---
  selectedProduct: Product | null = null; // Currently selected product when adding stock
  isNewProduct = false; // Toggles whether we are adding stock for an existing product OR creating a brand new product
  isNewCategory = false; // Toggles custom category input field
  selectedCategoryOption = ''; // Holds selected category in dropdown
  
  // Model for adding/editing a stock record
  newInventory = {
    productId: null as number | null,
    warehouseId: 1, // Default to Warehouse 1
    quantity: 0,
    reorderLevel: 0
  };
  
  // Model for creating a brand new product (if isNewProduct is true)
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
    public auth: AuthService // Injected public so HTML can check roles
  ) { }

  ngOnInit(): void {
    // 1. Trigger API fetch for warehouses
    this.loadWarehousesFromAPI();

    // 2. Subscribe to global inventory state. 
    // This allows the table to update instantly if a stock request is approved on another page!
    this.sharedData.inventory$.subscribe(inv => {
      if (Array.isArray(inv)) {
        this.items = inv;
        this.applyFilters();
        this.loading = false; // Turn off spinner once data flows in
      }
    });

    // 3. Subscribe to global products state (needed to populate the "Select Product" dropdown)
    this.sharedData.products$.subscribe(products => {
      if (Array.isArray(products) && products.length > 0) {
        this.availableProducts = products;
      }
    });

    // 4. Subscribe to global warehouse state (needed for the filter dropdown)
    this.sharedData.warehouses$.subscribe(whs => {
      if (Array.isArray(whs) && whs.length > 0) {
        this.warehouses = whs;
      }
    });

    this.sharedData.supermarkets$.subscribe(sms => {
      if (Array.isArray(sms) && sms.length > 0) {
        this.supermarkets = sms;
      }
    });

    // 5. Kick off the primary data fetch. 
    // We load Products first, and once products finish, it automatically calls loadInventoryFromAPI().
    this.loadProductsFromAPI();
    this.loadSupermarketsFromAPI();
  }

  // Fetches warehouses and pushes them to global state
  loadWarehousesFromAPI(): void {
    this.warehouseService.getAll().subscribe({
      next: (data: any) => {
        let whs: any[] = [];
        if (Array.isArray(data)) whs = data;
        else if (data && Array.isArray(data.data)) whs = data.data; // Handle wrapper object { data: [] }

        if (whs.length > 0) {
          this.warehouses = whs;
          this.sharedData.setWarehouses(whs); // Push to global subject
        } else {
          this.warehouses = [{ id: 1, name: 'SL Warehouse', code: 'WH01' }];
        }
      },
      error: () => {
        this.warehouses = [{ id: 1, name: 'SL Warehouse', code: 'WH01' }];
      }
    });
  }

  loadSupermarketsFromAPI(): void {
    this.supermarketService.getAll().subscribe({
      next: (data: any) => {
        let sms: any[] = [];
        if (Array.isArray(data)) sms = data;
        else if (data && Array.isArray(data.data)) sms = data.data;

        if (sms.length > 0) {
          this.supermarkets = sms;
          this.sharedData.setSupermarkets(sms);
        } else {
          this.supermarkets = [{ id: 1, name: 'SL Supermarket', code: 'SM01' }, { id: 2, name: 'Eastside Grocery', code: 'SM02' }];
        }
      },
      error: () => {
        this.supermarkets = [{ id: 1, name: 'SL Supermarket', code: 'SM01' }, { id: 2, name: 'Eastside Grocery', code: 'SM02' }];
      }
    });
  }

  // Backup method: If inventory loads before products, the nested 'product' object might be empty.
  // This method forces a re-mapping of IDs to Full Objects once products are ready.
  private reEnrichInventory(): void {
    try {
      const products = this.sharedData.getProducts();
      if (!Array.isArray(this.items) || this.items.length === 0) return;
      let changed = false;
      
      this.items = this.items.map(it => {
        // If the item doesn't have a fully populated product...
        if (!it.product || !it.product.name || it.product.name === 'Unknown Product' || it.product.name === 'Unresolved Item') {
          const pid = it.product?.id;
          const pname = it.product?.name;
          let found = null;
          
          // Try to match by ID
          if (pid != null) {
            found = products.find((p: any) => p && (p.id == pid || String(p.id) === String(pid)));
          }
          // Fallback: try to match by name
          if (!found && pname) {
            found = products.find((p: any) => p && ((p.name || '').toLowerCase() === String(pname).toLowerCase()));
          }
          
          if (found) {
            changed = true;
            it.product = { ...found }; // Inject the full product object
          }
        }
        return it;
      });
      
      // If we fixed anything, update the lists and global state
      if (changed) {
        this.filteredItems = [...this.items];
        this.sharedData.setInventory(this.items);
        console.log('Inventory re-enriched with products, items updated');
      }
    } catch (err) {
      console.debug('reEnrichInventory error', err);
    }
  }

  // Fetches Inventory data based on WHO the user is
  loadInventoryFromAPI(): void {
    const user = this.auth.getCurrentUser();
    let inventory$;
    
    // Determine which API endpoint to call
    if (user && (this.auth.isSupermarketManager() || user.supermarketId)) {
      // Store managers only see their own store's stock
      const sid = user.supermarketId || (user as any).supermarketId;
      inventory$ = this.inventoryService.getSupermarketInventory(sid);
    } else if (user && (this.auth.isWarehouseStaff() || user.warehouseId)) {
      // Warehouse staff only see their own warehouse's stock
      const wid = user.warehouseId || (user as any).warehouseId;
      inventory$ = this.inventoryService.getWarehouseInventory(wid);
    } else {
      // Admins see EVERYTHING
      inventory$ = this.inventoryService.getAllInventory();
    }

    inventory$.subscribe({
      next: (data: any) => {
        let inventoryData: Inventory[] = [];
        // Handle variations in how Spring Boot might wrap the JSON
        if (Array.isArray(data)) {
          inventoryData = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          inventoryData = data.data;
        } else if (data && typeof data === 'object' && Array.isArray(data.content)) {
          inventoryData = data.content; // 'content' is often used by Spring Data JPA Pageable responses
        }

        // Process the raw data to stitch relationships together
        const enriched = this.enrichInventoryWithProducts(inventoryData);
        if (enriched) {
          this.items = enriched;
          this.filteredItems = [...this.items]; // Reset filters
          this.sharedData.setInventory(this.items); // Update global state
        }
      },
      error: () => {
        console.error('Failed to load inventory');
      }
    });
  }

  // Maps flat DTOs (Data Transfer Objects) from the backend into nested objects for the frontend UI
  private enrichInventoryWithProducts(items: any[]): any[] {
    if (!Array.isArray(items)) return items;
    const products = this.sharedData.getProducts(); // Need the product catalog to do the mapping
    
    return items.map(itOrig => {
      const it: any = itOrig; 

      // 1. Fix partial product objects
      if (it.product && (!it.product.name || !it.product.sku)) {
        const pid = it.product.id || it.product.productId || it.product.product_id || null;
        const matched = products.find((p: any) => p && (p.id == pid || String(p.id) === String(pid)));
        if (matched) it.product = { ...matched };
      }

      // 2. If NO product object exists at all, build one from flat fields
      if (!it.product) {
        // Backend DTO might use camelCase or snake_case
        const pid = it.productId || it.product_id || it['product']?.id || it['productId'] || null;
        const pname = it.productName || it.product_name || it['productName'] || it['product']?.name || it.name || null;
        const psku = it.productSku || it.product_sku || it.sku || null;

        let found: any = null;
        if (pid != null) {
          found = products.find((p: any) => p && (p.id == pid || String(p.id) === String(pid))); // Match by ID
        }
        if (!found && pname) {
          found = products.find((p: any) => p && ((p.name || '').toLowerCase() === String(pname).toLowerCase() || (p.sku || '').toLowerCase() === String(pname).toLowerCase())); // Match by Name
        }
        if (!found && psku) {
          found = products.find((p: any) => p && ((p.sku || '').toLowerCase() === String(psku).toLowerCase())); // Match by SKU
        }

        if (found) {
          it.product = { ...found };
        } else {
          // Absolute fallback if product is deleted from catalog but still exists in inventory
          console.debug('Inventory: product enrichment failed for item', it.id || '(no id)', 'pid', pid, 'pname', pname, 'psku', psku, 'productsCount', products.length);
          it.product = { id: pid || null, name: pname || 'Standard Local Supply', sku: psku || 'LOC-SUPPLY', unitPrice: 500 };
        }
      }

      // 3. Map flat warehouse/supermarket IDs back to nested objects so the HTML can do {{ it.warehouse.name }}
      if (!it.warehouse && (it.warehouseId || (it as any).warehouse_id)) {
        const wid = it.warehouseId || (it as any).warehouse_id;
        const foundWh = this.warehouses.find(w => w.id == wid);
        it.warehouse = foundWh ? { ...foundWh } : { id: wid, name: it.warehouseName || `Warehouse ${wid}` };
      }
      if (!it.supermarket && (it.supermarketId || (it as any).supermarket_id)) {
        const sid = it.supermarketId || (it as any).supermarket_id;
        const foundSm = this.supermarkets.find(s => s.id == sid);
        it.supermarket = foundSm ? { ...foundSm } : { id: sid, name: it.supermarketName || `Supermarket ${sid}` };
      }

      return it as Inventory;
    });
  }

  // Fetches the product catalog
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
        
        // CRITICAL: We only load inventory AFTER products are ready, so enrichment works properly.
        this.loadInventoryFromAPI();
      },
      error: () => {
        console.error('Failed to load products');
        // Still attempt to load inventory even if products fail, it will just use fallbacks
        this.loadInventoryFromAPI();
      }
    });
  }

  // Toggles the right-side slide-out panel for Adding/Editing stock
  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm(); // Clear inputs if closing
    }
  }

  // Triggered when clicking the "Edit" (pencil) button on a row
  editInventory(item: Inventory): void {
    this.editingInventory = item;
    this.isNewProduct = false;
    this.selectedProduct = item.product || null;
    
    // Pre-fill the form with existing data
    this.newInventory = {
      productId: item.product?.id || null,
      warehouseId: item.warehouse?.id || 1,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel
    };
    
    this.showAddForm = true; // Open panel
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up so they see it
  }

  // Opens the delete confirmation modal
  requestDeleteInventory(item: Inventory): void {
    this.confirmInventory = item;
    this.showConfirmModal = true;
  }

  // Closes the delete confirmation modal
  cancelDeleteInventory(): void {
    this.showConfirmModal = false;
    this.confirmInventory = undefined;
  }

  // Actually sends the DELETE request to the API
  confirmDeleteInventory(): void {
    const item = this.confirmInventory;
    if (!item) return;
    
    this.inventoryService.deleteInventory(item.id).subscribe({
      next: () => {
        this.notifications.success(`Deleted stock record for ${item.product?.name}`);
        this.loadInventoryFromAPI(); // Refresh table
        this.cancelDeleteInventory(); // Close modal
      },
      error: () => {
        this.notifications.error('Failed to delete inventory record');
        this.cancelDeleteInventory();
      }
    });
  }

  // Export current table to PDF
  exportToPdf(): void {
    this.pdfReport.generateInventoryReport(this.filteredItems);
  }

  // Core filter logic triggered on keystrokes/dropdown changes
  applyFilters(): void {
    let filtered = [...this.items];
    
    // Text search (Name or SKU)
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.product?.name || '').toLowerCase().includes(term) ||
        (item.product?.sku || '').toLowerCase().includes(term)
      );
    }
    
    // Category dropdown
    if (this.selectedCategory) {
      filtered = filtered.filter(item => item.product?.category === this.selectedCategory);
    }
    
    // Warehouse dropdown
    if (this.selectedWarehouse) {
      filtered = filtered.filter(item =>
        item.warehouse?.name === this.selectedWarehouse ||
        String(item.warehouse?.id) === String(this.selectedWarehouse) ||
        String((item as any).warehouseId) === String(this.selectedWarehouse) ||
        String((item as any).warehouse_id) === String(this.selectedWarehouse)
      );
    }

    // Supermarket dropdown
    if (this.selectedSupermarket) {
      filtered = filtered.filter(item =>
        item.supermarket?.name === this.selectedSupermarket ||
        String(item.supermarket?.id) === String(this.selectedSupermarket) ||
        String((item as any).supermarketId) === String(this.selectedSupermarket) ||
        String((item as any).supermarket_id) === String(this.selectedSupermarket)
      );
    }
    
    // Toggle switch for "Only show items below reorder level"
    if (this.showLowStockOnly) {
      filtered = filtered.filter(item => item.quantity <= item.reorderLevel);
    }
    
    this.filteredItems = filtered;
    this.page = 1; // Always reset to page 1 when filtering changes!
  }

  onWarehouseFilterChange(): void {
    if (this.selectedWarehouse) {
      this.selectedSupermarket = '';
    }
    this.applyFilters();
  }

  onSupermarketFilterChange(): void {
    if (this.selectedSupermarket) {
      this.selectedWarehouse = '';
    }
    this.applyFilters();
  }

  // Clears all inputs and resets filters
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedWarehouse = '';
    this.selectedSupermarket = '';
    this.showLowStockOnly = false;
    this.filteredItems = [...this.items];
    this.page = 1;
  }

  // Triggers when clicking the "Show Low Stock" toggle button
  toggleLowStockFilter(): void {
    this.showLowStockOnly = !this.showLowStockOnly;
    this.applyFilters();
  }

  // Pagination: Next/Prev page
  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
    }
  }

  // Pagination: Change rows per page (e.g. from 10 to 25)
  changePageSize(event: any): void {
    this.pageSize = parseInt(event.target.value, 10);
    this.page = 1; // Reset to first page
  }

  // Triggered by the Sort By dropdown
  changeSort(event: any): void {
    this.sortBy = event.target.value;
    this.page = 1; // Reset to first page
  }

  // Triggered when a user selects an option in the "Product" dropdown inside the Add Form
  onProductSelect(event: any): void {
    const productId = event.target.value;

    if (productId === 'new') {
      // User selected "--- Create New Product ---"
      this.isNewProduct = true;
      this.selectedProduct = null;
    } else if (productId) {
      // User selected an existing product
      this.isNewProduct = false;
      this.selectedProduct = this.availableProducts.find(p => p.id == productId) || null;
      this.newInventory.productId = parseInt(productId);
    } else {
      // User selected the default blank option
      this.isNewProduct = false;
      this.selectedProduct = null;
      this.newInventory.productId = null;
    }
  }

  // Triggered when a user selects an option in the "Category" dropdown inside the Add Form
  onCategorySelect(event: any): void {
    const val = event.target.value;
    if (val === 'NEW_CATEGORY') {
      this.isNewCategory = true;
      this.newProduct.category = '';
    } else {
      this.isNewCategory = false;
      this.newProduct.category = val;
    }
  }

  // The main "Save" button handler for the Add/Edit form
  addInventoryItem(): void {
    // 1. Validation
    if (this.newInventory.quantity < 0) {
      this.notifications.error('Please enter a valid quantity');
      return;
    }

    // 2. If EDITING an existing record (PUT request)
    if (this.editingInventory) {
      const payload = {
        productId: this.newInventory.productId,
        warehouseId: this.newInventory.warehouseId,
        quantity: this.newInventory.quantity,
        reorderLevel: this.newInventory.reorderLevel
      };
      
      this.inventoryService.updateInventory(this.editingInventory.id, payload as any).subscribe({
        next: () => {
          this.notifications.success(`Stock updated successfully`);
          this.loadInventoryFromAPI(); // Refresh list
          this.resetForm();
          this.showAddForm = false; // Close panel
          this.editingInventory = null;
        },
        error: () => this.notifications.error('Failed to update stock')
      });
      return;
    }

    // 3. If creating a BRAND NEW PRODUCT AND adding stock for it
    if (this.isNewProduct) {
      // Validate the new product fields
      if (!this.newProduct.sku || !this.newProduct.name || !this.newProduct.category || this.newProduct.unitPrice <= 0) {
        this.notifications.error('Please fill in all product details (SKU, Name, Category, and Price)');
        return;
      }

      // Mock an ID for immediate UI update before backend responds
      const newProductId = Math.max(...this.availableProducts.map(p => p.id), 0) + 1;
      
      // Build the Product object
      const createdProduct: Product = {
        id: newProductId,
        sku: this.newProduct.sku,
        name: this.newProduct.name,
        category: this.newProduct.category,
        unitPrice: this.newProduct.unitPrice,
        description: this.newProduct.description || `${this.newProduct.name} - ${this.newProduct.category}`,
        reorderLevel: this.newInventory.reorderLevel || 20,
        minStockLevel: Math.floor((this.newInventory.reorderLevel || 20) * 0.5),
        perishable: ['Dairy', 'Meat', 'Produce', 'Bakery'].includes(this.newProduct.category), // Auto-detect perishable based on category
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save Product to backend FIRST
      this.productService.create(createdProduct).subscribe({
        next: (res: any) => {
          const backendProduct = res.data || res;
          // Merge backend ID with our local object
          const productWithId: Product = {
            ...createdProduct,
            id: backendProduct.id || newProductId
          };
          // Add to local UI lists instantly
          this.availableProducts.unshift(productWithId);
          this.sharedData.addProduct(productWithId);
          
          // NOW, create the inventory record for this new product
          this.createInventoryEntry(productWithId, true);
        },
        error: () => {
          // If backend fails, fallback to local only (useful for demo resilience)
          this.availableProducts.unshift(createdProduct);
          this.sharedData.addProduct(createdProduct);
          this.createInventoryEntry(createdProduct, false);
        }
      });
      
    } else {
      // 4. If adding stock for an EXISTING product
      if (!this.selectedProduct) {
        this.notifications.error('Please select a product');
        return;
      }
      this.newInventory.productId = this.selectedProduct.id;
      this.createInventoryEntry(this.selectedProduct);
    }
  }

  // Helper method to actually send the create/update API request for Inventory
  createInventoryEntry(product: Product, persistToBackend: boolean = true): void {
    const warehouseId = this.newInventory.warehouseId || 1;
    
    // Check if this product already exists in this specific warehouse
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
      // If it exists, UPDATE the quantity instead of creating a duplicate row (Add current + new)
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
      // If it doesn't exist, CREATE a new row (POST request)
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

  // Wipes the Add/Edit form clean
  resetForm(): void {
    this.selectedProduct = null;
    this.isNewProduct = false;
    this.isNewCategory = false;
    this.selectedCategoryOption = '';
    this.editingInventory = null;
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

  // Utility calculation used by HTML templates occasionally
  getTotalValue(): number {
    return this.filteredItems.reduce((sum, item) => sum + (item.quantity * (item.product?.unitPrice || 0)), 0);
  }

  // Utility calculation
  getLowStockCount(): number {
    return this.items.filter(item => item.quantity <= item.reorderLevel).length;
  }
}
