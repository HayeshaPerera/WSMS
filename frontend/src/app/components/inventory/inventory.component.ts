import { Component, OnInit } from '@angular/core';
import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
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
  
  // Filter properties
  searchTerm = '';
  selectedCategory = '';
  selectedWarehouse = '';
  showLowStockOnly = false;
  
  categories = ['Dairy', 'Bakery', 'Beverages', 'Meat', 'Produce', 'Grains', 'Canned Goods', 'Spreads', 'Cooking', 'Snacks', 'Frozen'];
  warehouses = ['Central Warehouse', 'North Distribution Center', 'South Logistics Hub'];
  
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
    private notifications: NotificationService,
    private sharedData: SharedDataService,
    private pdfReport: PdfReportService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    // Always load hardcoded data first to ensure visibility
    this.addHardcodedInventory();
    this.addHardcodedProducts();
    this.filteredItems = [...this.items];
    this.loading = false;
    
    // Then try to load from API (will merge/update if successful)
    this.loadInventoryFromAPI();
    this.loadProductsFromAPI();

    // Re-enrich inventory whenever products are loaded/updated (handles async arrival)
    this.sharedData.products$.subscribe(products => {
      if (Array.isArray(products) && products.length > 0) {
        this.reEnrichInventory();
      }
    });
  }

  private reEnrichInventory(): void {
    try {
      const products = this.sharedData.getProducts();
      if (!Array.isArray(this.items) || this.items.length === 0) return;
      let changed = false;
      this.items = this.items.map(it => {
        if (!it.product || !it.product.name || it.product.name === 'Unknown Product') {
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
    this.inventoryService.getAllInventory().subscribe({
      next: (data: any) => {
        let inventoryData: Inventory[] = [];
        if (Array.isArray(data)) {
          inventoryData = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          inventoryData = data.data;
        } else if (data && typeof data === 'object' && Array.isArray(data.content)) {
          inventoryData = data.content;
        }
        
        // Only use API data if it has valid product information
        const hasValidProducts = inventoryData.length > 0 && 
          inventoryData.every(item => item.product && item.product.name && item.product.sku && item.product.unitPrice);
        
        if (hasValidProducts) {
          this.items = inventoryData;
          this.filteredItems = [...this.items];
          this.sharedData.setInventory(this.items);
        } else {
          // If API data lacks nested product objects, try to enrich from shared products
          const enriched = this.enrichInventoryWithProducts(inventoryData);
          if (enriched && enriched.length > 0) {
            this.items = enriched;
            this.filteredItems = [...this.items];
            this.sharedData.setInventory(this.items);
          }
        }
        // Otherwise keep the hardcoded data
      },
      error: () => {
        // Keep hardcoded data on error
        console.log('Using hardcoded inventory data');
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
          it.product = { id: pid || null, name: pname || 'Unknown Product', sku: psku || 'N/A', unitPrice: 0 };
        }
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
        
        // Only use API data if it has valid product information
        const hasValidProducts = productData.length > 0 && 
          productData.every(p => p.name && p.sku && p.unitPrice);
        
        if (hasValidProducts) {
          this.availableProducts = productData;
          this.sharedData.setProducts(this.availableProducts);
        }
        // Otherwise keep the hardcoded data
      },
      error: () => {
        // Keep hardcoded data on error
        console.log('Using hardcoded products data');
      }
    });
  }

  addHardcodedInventory(): void {
    this.items = [
      {
        id: 1,
        product: {
          id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy',
          unitPrice: 899.00, description: 'Fresh organic whole milk 1L',
          reorderLevel: 50, minStockLevel: 30, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 150,
        reorderLevel: 50,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        product: {
          id: 2, sku: 'PROD002', name: 'White Bread Loaf', category: 'Bakery',
          unitPrice: 449.00, description: 'Freshly baked white bread loaf',
          reorderLevel: 40, minStockLevel: 20, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 200,
        reorderLevel: 40,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        product: {
          id: 3, sku: 'PROD003', name: 'Premium Ground Coffee', category: 'Beverages',
          unitPrice: 2499.00, description: 'Premium arabica ground coffee 500g',
          reorderLevel: 30, minStockLevel: 10, perishable: false, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 85,
        reorderLevel: 30,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        product: {
          id: 4, sku: 'PROD004', name: 'Cheddar Cheese Block', category: 'Dairy',
          unitPrice: 1199.00, description: 'Aged cheddar cheese 500g block',
          reorderLevel: 25, minStockLevel: 8, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
    
        warehouse: { id: 2, code: 'WH02', name: 'North Distribution Center', location: 'Kandy', capacity: 8000, currentStock: 3500, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 18,
        reorderLevel: 25,
        lastUpdated: new Date(),
        lowStockAlert: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        product: {
          id: 5, sku: 'PROD005', name: 'Chicken Breast (1kg)', category: 'Meat',
          unitPrice: 1599.00, description: 'Fresh boneless chicken breast 1kg',
          reorderLevel: 35, minStockLevel: 15, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 65,
        reorderLevel: 35,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 6,
        product: {
          id: 6, sku: 'PROD006', name: 'Eggs (Dozen)', category: 'Dairy',
          unitPrice: 599.00, description: 'Farm fresh eggs, dozen pack',
          reorderLevel: 45, minStockLevel: 20, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 320,
        reorderLevel: 45,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 7,
        product: {
          id: 7, sku: 'PROD007', name: 'Olive Oil 500ml', category: 'Cooking',
          unitPrice: 1899.00, description: 'Extra virgin olive oil 500ml',
          reorderLevel: 20, minStockLevel: 8, perishable: false, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 2, code: 'WH02', name: 'North Distribution Center', location: 'Kandy', capacity: 8000, currentStock: 3500, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 12,
        reorderLevel: 20,
        lastUpdated: new Date(),
        lowStockAlert: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 8,
        product: {
          id: 8, sku: 'PROD008', name: 'Brown Rice 2kg', category: 'Grains',
          unitPrice: 749.00, description: 'Organic brown rice 2kg pack',
          reorderLevel: 30, minStockLevel: 12, perishable: false, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 3, code: 'WH03', name: 'South Logistics Hub', location: 'Galle', capacity: 6000, currentStock: 2800, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 95,
        reorderLevel: 30,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 9,
        product: {
          id: 9, sku: 'PROD009', name: 'Fresh Orange Juice 1L', category: 'Beverages',
          unitPrice: 649.00, description: 'Freshly squeezed orange juice 1L',
          reorderLevel: 50, minStockLevel: 20, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 42,
        reorderLevel: 50,
        lastUpdated: new Date(),
        lowStockAlert: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 10,
        product: {
          id: 10, sku: 'PROD010', name: 'Pasta 500g', category: 'Grains',
          unitPrice: 399.00, description: 'Italian spaghetti pasta 500g',
          reorderLevel: 60, minStockLevel: 25, perishable: false, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 180,
        reorderLevel: 60,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 11,
        product: {
          id: 11, sku: 'PROD011', name: 'Tomato Sauce 400g', category: 'Canned Goods',
          unitPrice: 299.00, description: 'Premium tomato pasta sauce 400g',
          reorderLevel: 40, minStockLevel: 18, perishable: false, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 2, code: 'WH02', name: 'North Distribution Center', location: 'Kandy', capacity: 8000, currentStock: 3500, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 25,
        reorderLevel: 40,
        lastUpdated: new Date(),
        lowStockAlert: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 12,
        product: {
          id: 12, sku: 'PROD012', name: 'Greek Yogurt 500g', category: 'Dairy',
          unitPrice: 749.00, description: 'Creamy Greek yogurt 500g',
          reorderLevel: 35, minStockLevel: 15, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 88,
        reorderLevel: 35,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 13,
        product: {
          id: 13, sku: 'PROD013', name: 'Honey 350g', category: 'Spreads',
          unitPrice: 1299.00, description: 'Pure natural honey 350g',
          reorderLevel: 25, minStockLevel: 10, perishable: false, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 3, code: 'WH03', name: 'South Logistics Hub', location: 'Galle', capacity: 6000, currentStock: 2800, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 55,
        reorderLevel: 25,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 14,
        product: {
          id: 14, sku: 'PROD014', name: 'Strawberries 250g', category: 'Produce',
          unitPrice: 899.00, description: 'Fresh strawberries 250g pack',
          reorderLevel: 30, minStockLevel: 12, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 8,
        reorderLevel: 30,
        lastUpdated: new Date(),
        lowStockAlert: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 15,
        product: {
          id: 15, sku: 'PROD015', name: 'Butter 200g', category: 'Dairy',
          unitPrice: 549.00, description: 'Salted butter 200g pack',
          reorderLevel: 35, minStockLevel: 15, perishable: true, active: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        warehouse: { id: 2, code: 'WH02', name: 'North Distribution Center', location: 'Kandy', capacity: 8000, currentStock: 3500, active: true, createdAt: new Date(), updatedAt: new Date() },
        quantity: 120,
        reorderLevel: 35,
        lastUpdated: new Date(),
        lowStockAlert: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ] as Inventory[];
    
    this.sharedData.setInventory(this.items);
  }

  addHardcodedProducts(): void {
    this.availableProducts = [
      { id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy', unitPrice: 899.00, reorderLevel: 50, minStockLevel: 30, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, sku: 'PROD002', name: 'White Bread Loaf', category: 'Bakery', unitPrice: 449.00, reorderLevel: 40, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, sku: 'PROD003', name: 'Premium Ground Coffee', category: 'Beverages', unitPrice: 2499.00, reorderLevel: 30, minStockLevel: 10, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 4, sku: 'PROD004', name: 'Cheddar Cheese Block', category: 'Dairy', unitPrice: 1199.00, reorderLevel: 25, minStockLevel: 8, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 5, sku: 'PROD005', name: 'Chicken Breast (1kg)', category: 'Meat', unitPrice: 1599.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 6, sku: 'PROD006', name: 'Eggs (Dozen)', category: 'Dairy', unitPrice: 599.00, reorderLevel: 45, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 7, sku: 'PROD007', name: 'Olive Oil 500ml', category: 'Cooking', unitPrice: 1899.00, reorderLevel: 20, minStockLevel: 8, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 8, sku: 'PROD008', name: 'Brown Rice 2kg', category: 'Grains', unitPrice: 749.00, reorderLevel: 30, minStockLevel: 12, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 9, sku: 'PROD009', name: 'Fresh Orange Juice 1L', category: 'Beverages', unitPrice: 649.00, reorderLevel: 50, minStockLevel: 20, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 10, sku: 'PROD010', name: 'Pasta 500g', category: 'Grains', unitPrice: 399.00, reorderLevel: 60, minStockLevel: 25, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 11, sku: 'PROD011', name: 'Tomato Sauce 400g', category: 'Canned Goods', unitPrice: 299.00, reorderLevel: 40, minStockLevel: 18, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 12, sku: 'PROD012', name: 'Greek Yogurt 500g', category: 'Dairy', unitPrice: 749.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 13, sku: 'PROD013', name: 'Honey 350g', category: 'Spreads', unitPrice: 1299.00, reorderLevel: 25, minStockLevel: 10, perishable: false, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 14, sku: 'PROD014', name: 'Strawberries 250g', category: 'Produce', unitPrice: 899.00, reorderLevel: 30, minStockLevel: 12, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 15, sku: 'PROD015', name: 'Butter 200g', category: 'Dairy', unitPrice: 549.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: new Date(), updatedAt: new Date() }
    ] as Product[];
    
    this.sharedData.setProducts(this.availableProducts);
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  exportToPdf(): void {
    this.pdfReport.generateInventoryReport();
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
      filtered = filtered.filter(item => item.warehouse?.name === this.selectedWarehouse);
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
    // Validate product has an ID when persisting to backend
    if (persistToBackend && (!product || !product.id)) {
      console.error('Invalid product - no ID for backend sync:', product);
      this.notifications.error('Product must have a valid backend ID to sync');
      // Add local item only, do not attempt backend sync
      return;
    }
    
    const warehouseMap: {[key: number]: any} = {
      1: { id: 1, code: 'WH01', name: 'Central Warehouse', location: 'Colombo', capacity: 10000, currentStock: 5000, active: true, createdAt: new Date(), updatedAt: new Date() },
      2: { id: 2, code: 'WH02', name: 'North Distribution Center', location: 'Kandy', capacity: 8000, currentStock: 3500, active: true, createdAt: new Date(), updatedAt: new Date() },
      3: { id: 3, code: 'WH03', name: 'South Logistics Hub', location: 'Galle', capacity: 6000, currentStock: 2800, active: true, createdAt: new Date(), updatedAt: new Date() }
    };
    
    const newId = Math.max(...this.items.map(i => i.id), 0) + 1;
    const warehouseId = this.newInventory.warehouseId || 1;
    const selectedWarehouse = warehouseMap[warehouseId] || warehouseMap[1];
    
    const newInventoryItem: Inventory = {
      id: newId,
      product: product,
      warehouse: selectedWarehouse,
      quantity: this.newInventory.quantity,
      reorderLevel: this.newInventory.reorderLevel || product.reorderLevel || 20,
      lastUpdated: new Date(),
      lowStockAlert: this.newInventory.quantity <= (this.newInventory.reorderLevel || 20),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to local state immediately for UI update
    this.items.unshift(newInventoryItem);
    this.filteredItems = [...this.items];
    this.sharedData.addInventoryItem(newInventoryItem);
    
    this.notifications.success(`✅ Inventory added: ${product.name} - ${this.newInventory.quantity} units at ${selectedWarehouse.name}`);
    
    // Sync with backend only if requested (product has backend id)
    if (persistToBackend) {
      const payload = {
        productId: product.id,
        warehouseId: warehouseId,
        quantity: this.newInventory.quantity,
        reorderLevel: this.newInventory.reorderLevel || product.reorderLevel || 20
      };
      console.log('Sending inventory payload:', JSON.stringify(payload));
      this.inventoryService.createInventory(payload as any).subscribe({
        next: (res) => {
          console.log('Inventory synced with backend:', res);
          const created = res?.data || res;
          // Ensure created object has nested product for UI
          if (created && !created.product) {
            created.product = product;
          }
          // Update shared data with created inventory (replace local placeholder if needed)
          this.sharedData.addInventoryItem(created);
        },
        error: (err) => {
          console.log('Backend sync info:', err?.error?.message || 'Using local storage');
          // Keep local data - already added above, this is fine for demo
        }
      });
    } else {
      console.log('Skipping backend sync for inventory — product not persisted on backend');
    }
    
    this.resetForm();
    this.showAddForm = false;
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
