import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrnService, GrnDTO, GrnItemDTO } from '../../services/grn.service';
import { WarehouseService } from '../../services/warehouse.service';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { InventoryService } from '../../services/inventory.service';
import { SharedDataService } from '../../services/shared-data.service';

@Component({
  selector: 'app-grn',
  standalone: false,
  templateUrl: './grn.component.html',
  styleUrls: ['./grn.component.css']
})
export class GrnComponent implements OnInit {
  grns: GrnDTO[] = [];
  warehouses: any[] = [];
  products: any[] = [];
  searchTerm = '';
  showCreateModal = false;
  selectedGrn: GrnDTO | null = null;
  confirmGrnId?: number;  // tracks which GRN is pending confirmation
  submitting = false;

  showNewProductModal = false;
  pendingItemIndex: number = -1;
  newProduct = {
    sku: '',
    name: '',
    category: '',
    unitPrice: 0,
    description: '',
    isActive: true
  };

  newGrn: GrnDTO = {
    warehouseId: 0,
    receivedById: 0,
    supplierName: '',
    notes: '',
    items: []
  };

  constructor(
    private grnService: GrnService,
    private warehouseService: WarehouseService,
    private productService: ProductService,
    public authService: AuthService,
    private inventoryService: InventoryService,
    private sharedData: SharedDataService
  ) {}

  ngOnInit(): void {
    this.loadGrns();
    this.loadWarehouses();
    this.loadProducts();
  }

  loadGrns(): void {
    this.grnService.getAllGrns().subscribe({
      next: (data) => this.grns = data,
      error: (err) => console.error('Failed to load GRNs', err)
    });
  }

  loadWarehouses(): void {
    this.warehouseService.getAll().subscribe({
      next: (response: any) => {
        const data = response.data || response;
        this.warehouses = (Array.isArray(data) && data.length > 0) ? data : this.getDemoWarehouses();
        const user = this.authService.getCurrentUser();
        const userWhId = user?.warehouseId || (user as any)?.warehouseId;
        if (userWhId) {
          this.newGrn.warehouseId = userWhId;
        } else if (this.warehouses.length > 0) {
          this.newGrn.warehouseId = this.warehouses[0].id;
        }
      },
      error: () => {
        this.warehouses = this.getDemoWarehouses();
        if (this.warehouses.length > 0) this.newGrn.warehouseId = this.warehouses[0].id;
      }
    });
  }

  private getDemoWarehouses(): any[] {
    return [
      { id: 1, name: 'SL Warehouse', code: 'WH01' },
      { id: 2, name: 'SL Warehouse', code: 'WH02' },
      { id: 3, name: 'South Logistics Hub', code: 'WH03' }
    ];
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (response: any) => {
        let data = [];
        if (Array.isArray(response)) data = response;
        else if (response && Array.isArray(response.data)) data = response.data;
        else if (response && Array.isArray(response.content)) data = response.content;
        
        this.products = (data.length > 0) ? data : this.getDemoProducts();
      },
      error: () => {
        this.products = this.getDemoProducts();
      }
    });
  }

  private getDemoProducts(): any[] {
    return [
      { id: 1, name: 'White Bread Loaf', sku: 'BREAD-W', unitPrice: 525 },
      { id: 2, name: 'Whole Milk 1L', sku: 'MILK-1L', unitPrice: 1047 },
      { id: 3, name: 'Fresh Eggs (Dozen)', sku: 'EGGS-12', unitPrice: 1222 }
    ];
  }

  filteredGrns(): GrnDTO[] {
    if (!this.searchTerm) return this.grns;
    const q = this.searchTerm.toLowerCase();
    return this.grns.filter(g =>
      g.grnNumber?.toLowerCase().includes(q) ||
      g.supplierName?.toLowerCase().includes(q)
    );
  }

  getDraftCount(): number {
    return this.grns.filter(g => g.status === 'DRAFT').length;
  }

  getCompletedCount(): number {
    return this.grns.filter(g => g.status === 'COMPLETED').length;
  }

  openCreateModal(): void {
    const user = this.authService.getCurrentUser();
    const userWarehouseId = user?.warehouseId || (user as any)?.warehouseId;
    
    this.newGrn = {
      warehouseId: userWarehouseId || this.warehouses[0]?.id || 0,
      receivedById: user?.id || 0,
      supplierName: '',
      notes: '',
      items: []
    };
    this.showCreateModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
  }

  addItem(): void {
    this.newGrn.items.push({
      productId: this.products[0]?.id || 0,
      quantity: 1
    });
  }

  removeItem(index: number): void {
    this.newGrn.items.splice(index, 1);
  }

  onProductChange(event: any, index: number): void {
    const value = event;
    if (value === 'new') {
      this.pendingItemIndex = index;
      this.newProduct = { sku: '', name: '', category: '', unitPrice: 0, description: '', isActive: true };
      this.showNewProductModal = true;
      // Temporarily clear it so 'new' doesn't stay bound if they cancel
      setTimeout(() => this.newGrn.items[index].productId = 0, 0);
    } else {
      this.newGrn.items[index].productId = parseInt(value, 10);
    }
  }

  cancelNewProduct(): void {
    this.showNewProductModal = false;
    this.pendingItemIndex = -1;
  }

  saveNewProduct(): void {
    if (!this.newProduct.sku || !this.newProduct.name || !this.newProduct.category || this.newProduct.unitPrice <= 0) {
      window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type: 'warning', title: 'Validation', message: 'Please fill in all product details (SKU, Name, Category, Price).' } }));
      return;
    }

    const newProductId = Math.max(...this.products.map(p => p.id), 0) + 1;
    const createdProduct = {
      id: newProductId,
      sku: this.newProduct.sku,
      name: this.newProduct.name,
      category: this.newProduct.category,
      unitPrice: this.newProduct.unitPrice,
      description: this.newProduct.description,
      reorderLevel: 20,
      minStockLevel: 10,
      perishable: ['Dairy', 'Meat', 'Produce', 'Bakery'].includes(this.newProduct.category),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Try to create product in backend
    this.productService.create(createdProduct).subscribe({
      next: (res: any) => {
        const backendProduct = res.data || res;
        const productWithId = { ...createdProduct, id: backendProduct.id || newProductId };
        this.products.unshift(productWithId);
        this.sharedData.addProduct(productWithId);
        
        if (this.pendingItemIndex >= 0) {
          this.newGrn.items[this.pendingItemIndex].productId = productWithId.id;
        }
        this.showNewProductModal = false;
        this.pendingItemIndex = -1;
        window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type: 'success', title: 'Product Created', message: `${productWithId.name} added successfully.` } }));
      },
      error: () => {
        // Fallback: Use local product if backend fails
        this.products.unshift(createdProduct);
        this.sharedData.addProduct(createdProduct);
        if (this.pendingItemIndex >= 0) {
          this.newGrn.items[this.pendingItemIndex].productId = createdProduct.id;
        }
        this.showNewProductModal = false;
        this.pendingItemIndex = -1;
      }
    });
  }

  submitGrn(): void {
    if (this.newGrn.items.length === 0) {
      window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type: 'warning', title: 'Validation', message: 'Add at least one item to the GRN.' } }));
      return;
    }
    this.submitting = true;
    this.grnService.createGrn(this.newGrn).subscribe({
      next: () => {
        this.loadGrns();
        this.closeModal();
        this.submitting = false;
        window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type: 'success', title: 'GRN Created', message: 'Goods received note created successfully.' } }));
      },
      error: () => {
        this.submitting = false;
        window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type: 'error', title: 'Failed', message: 'Could not create GRN. Please try again.' } }));
      }
    });
  }

  viewGrn(grn: GrnDTO): void {
    this.grnService.getGrnById(grn.id!).subscribe({
      next: (data) => this.selectedGrn = data
    });
  }

  requestConfirmGrn(grn: GrnDTO): void {
    this.confirmGrnId = grn.id;
  }

  cancelConfirmGrn(): void {
    this.confirmGrnId = undefined;
  }

  confirmGrn(grn?: GrnDTO): void {
    const targetGrn = grn || this.grns.find(g => g.id === this.confirmGrnId);
    if (!targetGrn) return;
    this.grnService.confirmGrn(targetGrn.id!).subscribe({
      next: () => {
        this.loadGrns();
        this.selectedGrn = null;
        this.confirmGrnId = undefined;
        window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type: 'success', title: 'GRN Confirmed', message: `GRN ${targetGrn.grnNumber} confirmed — inventory updated.` } }));
        // Refresh inventory from backend
        this.inventoryService.getAllInventory().subscribe({
          next: (res: any) => {
            const data = Array.isArray(res) ? res : (res.data || res.content || []);
            this.sharedData.setInventory(data);
          }
        });
      },
      error: () => {
        this.confirmGrnId = undefined;
        window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type: 'error', title: 'Error', message: 'Failed to confirm GRN. Please try again.' } }));
      }
    });
  }
}
