import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { SharedDataService } from '../../services/shared-data.service';
import { NotificationService } from '../../services/notification.service';
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
    perishable: false
  };

  constructor(
    private service: ProductService,
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
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.products = data;
          this.sharedData.setProducts(data);
        } else {
          this.addHardcodedProducts();
        }
        this.loading = false;
      },
      error: () => {
        this.addHardcodedProducts();
        this.loading = false;
      }
    });
  }

  addHardcodedProducts(): void {
    const now = new Date();
    this.products = [
      { id: 1, sku: 'PROD001', name: 'Organic Whole Milk', category: 'Dairy', unitPrice: 899.00, reorderLevel: 50, minStockLevel: 30, perishable: true, active: true, createdAt: now, updatedAt: now },
      { id: 2, sku: 'PROD002', name: 'White Bread Loaf', category: 'Bakery', unitPrice: 449.00, reorderLevel: 40, minStockLevel: 20, perishable: true, active: true, createdAt: now, updatedAt: now },
      { id: 3, sku: 'PROD003', name: 'Premium Ground Coffee', category: 'Beverages', unitPrice: 2499.00, reorderLevel: 30, minStockLevel: 10, perishable: false, active: true, createdAt: now, updatedAt: now },
      { id: 4, sku: 'PROD004', name: 'Cheddar Cheese Block', category: 'Dairy', unitPrice: 1199.00, reorderLevel: 25, minStockLevel: 8, perishable: true, active: true, createdAt: now, updatedAt: now },
      { id: 5, sku: 'PROD005', name: 'Chicken Breast (1kg)', category: 'Meat', unitPrice: 1599.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: now, updatedAt: now },
      { id: 6, sku: 'PROD006', name: 'Eggs (Dozen)', category: 'Dairy', unitPrice: 599.00, reorderLevel: 45, minStockLevel: 20, perishable: true, active: true, createdAt: now, updatedAt: now },
      { id: 7, sku: 'PROD007', name: 'Olive Oil 500ml', category: 'Cooking', unitPrice: 1899.00, reorderLevel: 20, minStockLevel: 8, perishable: false, active: true, createdAt: now, updatedAt: now },
      { id: 8, sku: 'PROD008', name: 'Brown Rice 2kg', category: 'Grains', unitPrice: 749.00, reorderLevel: 30, minStockLevel: 12, perishable: false, active: true, createdAt: now, updatedAt: now },
      { id: 9, sku: 'PROD009', name: 'Fresh Orange Juice 1L', category: 'Beverages', unitPrice: 649.00, reorderLevel: 50, minStockLevel: 20, perishable: true, active: true, createdAt: now, updatedAt: now },
      { id: 10, sku: 'PROD010', name: 'Pasta 500g', category: 'Grains', unitPrice: 399.00, reorderLevel: 60, minStockLevel: 25, perishable: false, active: true, createdAt: now, updatedAt: now },
      { id: 11, sku: 'PROD011', name: 'Tomato Sauce 400g', category: 'Canned Goods', unitPrice: 299.00, reorderLevel: 40, minStockLevel: 18, perishable: false, active: true, createdAt: now, updatedAt: now },
      { id: 12, sku: 'PROD012', name: 'Greek Yogurt 500g', category: 'Dairy', unitPrice: 749.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: now, updatedAt: now },
      { id: 13, sku: 'PROD013', name: 'Honey 350g', category: 'Spreads', unitPrice: 1299.00, reorderLevel: 25, minStockLevel: 10, perishable: false, active: true, createdAt: now, updatedAt: now },
      { id: 14, sku: 'PROD014', name: 'Strawberries 250g', category: 'Produce', unitPrice: 899.00, reorderLevel: 30, minStockLevel: 12, perishable: true, active: true, createdAt: now, updatedAt: now },
      { id: 15, sku: 'PROD015', name: 'Butter 200g', category: 'Dairy', unitPrice: 549.00, reorderLevel: 35, minStockLevel: 15, perishable: true, active: true, createdAt: now, updatedAt: now }
    ] as Product[];
    this.sharedData.setProducts(this.products);
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
      // Update existing
      const updated: Product = {
        ...this.editingProduct,
        ...this.newProduct,
        updatedAt: new Date()
      };

      const idx = this.products.findIndex(p => p.id === updated.id);
      if (idx !== -1) this.products[idx] = updated;

      this.sharedData.updateProduct(updated.id, updated);
      this.notifications.success(`✅ Product "${updated.name}" updated successfully`);

      this.service.update(updated.id, updated).subscribe({
        next: () => console.log('Update synced with backend'),
        error: () => console.log('Update sync failed')
      });
    } else {
      // Create new
      const newId = Math.max(...this.products.map(p => p.id), 0) + 1;
      const product: Product = {
        id: newId,
        sku: this.newProduct.sku,
        name: this.newProduct.name,
        category: this.newProduct.category,
        unitPrice: this.newProduct.unitPrice,
        description: this.newProduct.description,
        reorderLevel: this.newProduct.reorderLevel,
        minStockLevel: this.newProduct.minStockLevel,
        perishable: this.newProduct.perishable,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.products.unshift(product);
      this.sharedData.addProduct(product);
      this.notifications.success(`✅ Product "${product.name}" added successfully`);

      this.service.create(product).subscribe({
        next: () => console.log('Product synced with backend'),
        error: () => console.log('Backend sync failed, using local data')
      });
    }

    this.resetForm();
    this.showAddForm = false;
    this.editingProduct = null;
  }

  deleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      this.products = this.products.filter(p => p.id !== product.id);
      this.sharedData.deleteProduct(product.id);
      this.notifications.success(`Product "${product.name}" deleted`);

      this.service.delete(product.id).subscribe({
        next: () => console.log('Delete synced with backend'),
        error: () => console.log('Backend sync failed')
      });
    }
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
      perishable: false
    };
  }
}
