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
  categories = ['Dairy', 'Bakery', 'Beverages', 'Meat', 'Produce', 'Grains', 'Canned Goods', 'Spreads', 'Cooking', 'Snacks', 'Frozen'];
  isNewCategory = false;
  selectedCategoryOption = '';

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
    const firstProduct = this.products[0];
    const firstProductId = firstProduct?.id || 0;
    this.newGrn.items.push({
      productId: firstProductId,
      quantity: 1,
      unitCost: firstProduct?.unitPrice || 100,
      parLevel: this.getSuggestedParLevel(firstProductId)
    });
  }

  getSuggestedParLevel(productId: number): number {
    if (!productId || productId <= 0) return 20;

    // 1. Check existing inventory in this warehouse for current par / reorder level
    const invList = this.sharedData.getInventory();
    if (invList && invList.length > 0) {
      const whId = Number(this.newGrn.warehouseId);
      const match = invList.find((i: any) => 
        (whId ? (i.warehouse?.id == whId || i.warehouseId == whId) : true) &&
        (i.product?.id == productId || i.productId == productId || (i.product && i.product.id == productId))
      );
      if (match && match.reorderLevel != null && Number(match.reorderLevel) > 0) {
        return Number(match.reorderLevel);
      }
    }

    // 2. Check product's default reorder level from product profile
    const p = this.products.find(item => item && (item.id == productId || item.id === Number(productId)));
    if (p && p.reorderLevel != null && Number(p.reorderLevel) > 0) {
      return Number(p.reorderLevel);
    }

    // 3. Default suggested par level
    return 20;
  }

  removeItem(index: number): void {
    this.newGrn.items.splice(index, 1);
  }

  onProductChange(event: any, index: number): void {
    const value = event;
    if (value === 'new') {
      this.pendingItemIndex = index;
      this.isNewCategory = false;
      this.selectedCategoryOption = '';
      this.newProduct = { sku: '', name: '', category: '', unitPrice: 0, description: '', isActive: true };
      this.showNewProductModal = true;
      // Temporarily clear it so 'new' doesn't stay bound if they cancel
      setTimeout(() => {
        if (this.newGrn.items[index]) {
          this.newGrn.items[index].productId = 0;
        }
      }, 0);
    } else {
      const pId = parseInt(value, 10);
      const prod = this.products.find(item => item.id == pId);
      this.newGrn.items[index].productId = pId;
      if (prod && prod.unitPrice != null) {
        this.newGrn.items[index].unitCost = prod.unitPrice;
      }
      this.newGrn.items[index].parLevel = this.getSuggestedParLevel(pId);
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
        
        if (this.pendingItemIndex >= 0 && this.newGrn.items[this.pendingItemIndex]) {
          this.newGrn.items[this.pendingItemIndex].productId = productWithId.id;
          this.newGrn.items[this.pendingItemIndex].unitCost = productWithId.unitPrice || 0;
          this.newGrn.items[this.pendingItemIndex].parLevel = productWithId.reorderLevel || 20;
        }
        this.showNewProductModal = false;
        this.pendingItemIndex = -1;
        window.dispatchEvent(new CustomEvent('wsms-toast', { detail: { type: 'success', title: 'Product Created', message: `${productWithId.name} added successfully.` } }));
      },
      error: () => {
        // Fallback: Use local product if backend fails
        this.products.unshift(createdProduct);
        this.sharedData.addProduct(createdProduct);
        if (this.pendingItemIndex >= 0 && this.newGrn.items[this.pendingItemIndex]) {
          this.newGrn.items[this.pendingItemIndex].productId = createdProduct.id;
          this.newGrn.items[this.pendingItemIndex].unitCost = createdProduct.unitPrice || 0;
          this.newGrn.items[this.pendingItemIndex].parLevel = createdProduct.reorderLevel || 20;
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
