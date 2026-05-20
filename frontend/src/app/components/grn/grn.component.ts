import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrnService, GrnDTO, GrnItemDTO } from '../../services/grn.service';
import { WarehouseService } from '../../services/warehouse.service';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';

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
    public authService: AuthService
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
      { id: 1, name: 'Central Warehouse', code: 'WH01' },
      { id: 2, name: 'North Distribution Center', code: 'WH02' },
      { id: 3, name: 'South Logistics Hub', code: 'WH03' }
    ];
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (response: any) => {
        const data = response.data || response;
        this.products = (Array.isArray(data) && data.length > 0) ? data : this.getDemoProducts();
      },
      error: () => {
        this.products = this.getDemoProducts();
      }
    });
  }

  private getDemoProducts(): any[] {
    return [
      { id: 1, name: 'White Bread Loaf', sku: 'BREAD-W', unitPrice: 1.50 },
      { id: 2, name: 'Whole Milk 1L', sku: 'MILK-1L', unitPrice: 2.99 },
      { id: 3, name: 'Fresh Eggs (Dozen)', sku: 'EGGS-12', unitPrice: 3.49 }
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

  submitGrn(): void {
    this.grnService.createGrn(this.newGrn).subscribe({
      next: () => {
        this.loadGrns();
        this.closeModal();
      },
      error: (err) => console.error('Failed to create GRN', err)
    });
  }

  viewGrn(grn: GrnDTO): void {
    this.grnService.getGrnById(grn.id!).subscribe({
      next: (data) => this.selectedGrn = data
    });
  }

  confirmGrn(grn: GrnDTO): void {
    if (!confirm(`Confirm GRN ${grn.grnNumber}? This will update warehouse inventory.`)) return;
    this.grnService.confirmGrn(grn.id!).subscribe({
      next: () => {
        this.loadGrns();
        this.selectedGrn = null;
      },
      error: (err) => console.error('Failed to confirm GRN', err)
    });
  }
}
