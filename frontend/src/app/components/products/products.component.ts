import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { SharedDataService } from '../../services/shared-data.service';
import { NotificationService } from '../../services/notification.service';
import { InventoryService } from '../../services/inventory.service';
import { Product } from '../../models/models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  loading = true;
  showAddForm = false;
  editingProduct: Product | null = null;

  categories = ['Dairy', 'Bakery', 'Beverages', 'Meat', 'Produce', 'Grains', 'Canned Goods', 'Spreads', 'Cooking', 'Snacks', 'Frozen'];

  newProduct = {
    sku: '',
    name: '',
    category: '',
    unitPrice: 0,
    description: '',
    reorderLevel: 20,
    minStockLevel: 10,
    initialQuantity: 0,
    perishable: false
  };

  constructor(
    private service: ProductService,
    private inventoryService: InventoryService,
    private sharedData: SharedDataService,
    private notifications: NotificationService,
    public auth: AuthService
  ) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any) => {
        this.products = Array.isArray(data) ? data : (data.data || []);
        this.sharedData.setProducts(this.products);
        this.loading = false;
      },
      error: () => {
        console.error('Failed to load products');
        this.loading = false;
      }
    });
  }

  getAveragePrice(): number {
    if (!this.products || this.products.length === 0) return 0;
    const total = this.products.reduce((sum, p) => sum + (p.unitPrice || 0), 0);
    return total / this.products.length;
  }

  get activeCount(): number {
    return this.products.filter(p => p.active).length;
  }

  get perishableCount(): number {
    return this.products.filter(p => p.perishable).length;
  }

  // Pagination and sorting
  page = 1;
  pageSize = 10;
  sortBy = 'latest';

  get totalPages(): number {
    return Math.ceil(this.products.length / this.pageSize);
  }

  get paginatedProducts(): Product[] {
    let sorted = [...this.products];
    if (this.sortBy === 'latest') {
      sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (this.sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else if (this.sortBy === 'nameAsc') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (this.sortBy === 'nameDesc') {
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    const start = (this.page - 1) * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
    }
  }

  changePageSize(event: any): void {
    this.pageSize = parseInt(event.target.value, 10);
    this.page = 1;
  }

  changeSort(event: any): void {
    this.sortBy = event.target.value;
    this.page = 1;
  }



  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.editingProduct = null;
      this.resetForm();
    }
  }

  editProduct(product: Product): void {
    this.editingProduct = product;
    this.newProduct = {
      sku: product.sku,
      name: product.name,
      category: product.category,
      unitPrice: product.unitPrice,
      description: product.description || '',
      reorderLevel: product.reorderLevel,
      minStockLevel: product.minStockLevel,
      initialQuantity: 0,
      perishable: product.perishable
    };
    this.showAddForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveProduct(): void {
    if (!this.newProduct.sku || !this.newProduct.name || !this.newProduct.category || this.newProduct.unitPrice <= 0) {
      this.notifications.error('Please fill in all required fields');
      return;
    }

    if (this.editingProduct) {
      const updated: Product = {
        ...this.editingProduct,
        ...this.newProduct,
        updatedAt: new Date()
      };

      this.service.update(updated.id, updated).subscribe({
        next: () => {
          this.notifications.success(`✅ Product "${updated.name}" updated successfully`);
          this.loadProducts(); // Refresh from backend
        },
        error: () => this.notifications.error('Update sync failed')
      });
    } else {
      const product: any = {
        sku: this.newProduct.sku,
        name: this.newProduct.name,
        category: this.newProduct.category,
        unitPrice: this.newProduct.unitPrice,
        description: this.newProduct.description,
        reorderLevel: this.newProduct.reorderLevel,
        minStockLevel: this.newProduct.minStockLevel,
        initialQuantity: this.newProduct.initialQuantity, // Pass initial quantity to backend
        perishable: this.newProduct.perishable,
        active: true
      };

      this.service.create(product).subscribe({
        next: (res: any) => {
          this.notifications.success(`✅ Product "${product.name}" added successfully`);
          this.loadProducts(); // Refresh from backend
          
          // Trigger an inventory refresh if needed
          setTimeout(() => {
            this.inventoryService.getAllInventory().subscribe({
              next: (inventoryData: any) => {
                const inventory = Array.isArray(inventoryData) ? inventoryData : (inventoryData.data || []);
                this.sharedData.setInventory(inventory);
              }
            });
          }, 500);
        },
        error: () => {
          this.notifications.error('Failed to create product');
        }
      });
    }

    this.resetForm();
    this.showAddForm = false;
    this.editingProduct = null;
  }

  showConfirmModal = false;
  confirmProduct?: Product;

  requestDeleteProduct(product: Product) {
    this.confirmProduct = product;
    this.showConfirmModal = true;
  }

  cancelDeleteProduct() {
    this.showConfirmModal = false;
    this.confirmProduct = undefined;
  }

  confirmDeleteProduct() {
    const product = this.confirmProduct;
    if (!product) return;
    
    this.service.delete(product.id).subscribe({
      next: () => {
        this.notifications.success(`Product "${product.name}" deleted`);
        this.loadProducts(); // Refresh from backend
        
        // Refresh inventory to reflect deletion
        this.inventoryService.getAllInventory().subscribe({
          next: (inventoryData: any) => {
            const inventory = Array.isArray(inventoryData) ? inventoryData : (inventoryData.data || []);
            this.sharedData.setInventory(inventory);
          }
        });
      },
      error: () => this.notifications.error('Failed to delete product')
    });
    this.cancelDeleteProduct();
  }

  resetForm(): void {
    this.newProduct = {
      sku: '',
      name: '',
      category: '',
      unitPrice: 0,
      description: '',
      reorderLevel: 20,
      minStockLevel: 10,
      initialQuantity: 0,
      perishable: false
    };
  }
}
