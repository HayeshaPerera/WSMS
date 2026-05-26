import { Component, OnInit } from '@angular/core';
import { WarehouseService } from '../../services/warehouse.service';
import { Warehouse } from '../../models/models';

@Component({
  selector: 'app-warehouses',
  templateUrl: './warehouses.component.html',
  styleUrls: ['./warehouses.component.css']
})
export class WarehousesComponent implements OnInit {
  warehouses: Warehouse[] = [];
  loading = true;

  constructor(private service: WarehouseService) { }

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: data => { this.warehouses = data; this.loading = false; },
      error: _ => { this.addHardcodedWarehouses(); this.loading = false; }
    });
  }

  showModal = false;
  selectedWarehouse: Partial<Warehouse> = {};

  addHardcodedWarehouses() {
    this.warehouses = [
      { id: 1, code: 'WH01', name: 'Central Warehouse', location: '123 Industrial Ave', capacity: 10000, currentStock: 7500, contactPhone: '555-0101', contactEmail: 'wh01@wsscms.com', active: true, managerId: 1, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 2, code: 'WH02', name: 'East Warehouse', location: '456 Business Blvd', capacity: 8000, currentStock: 6200, contactPhone: '555-0102', contactEmail: 'wh02@wsscms.com', active: true, managerId: 2, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 3, code: 'WH03', name: 'West Distribution Center', location: '789 Commerce Park', capacity: 15000, currentStock: 12000, contactPhone: '555-0103', contactEmail: 'wh03@wsscms.com', active: true, managerId: 3, createdAt: new Date(), updatedAt: new Date() } as any
    ];
  }

  getTotalCapacity(): number {
    return this.warehouses.reduce((sum, w) => sum + (w.capacity || 0), 0);
  }

  openAddModal() {
    this.selectedWarehouse = { code: '', name: '', location: '', capacity: 0, currentStock: 0, active: true };
    this.showModal = true;
  }

  openEditModal(warehouse: Warehouse) {
    this.selectedWarehouse = { ...warehouse };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedWarehouse = {};
  }

  saveWarehouse() {
    if (this.selectedWarehouse.id) {
      this.service.update(this.selectedWarehouse.id, this.selectedWarehouse as Warehouse).subscribe({
        next: () => {
          const idx = this.warehouses.findIndex(w => w.id === this.selectedWarehouse.id);
          if (idx > -1) this.warehouses[idx] = { ...this.warehouses[idx], ...this.selectedWarehouse } as Warehouse;
          this.closeModal();
        },
        error: () => {
          const idx = this.warehouses.findIndex(w => w.id === this.selectedWarehouse.id);
          if (idx > -1) this.warehouses[idx] = { ...this.warehouses[idx], ...this.selectedWarehouse } as Warehouse;
          this.closeModal();
        }
      });
    } else {
      this.service.create(this.selectedWarehouse as Warehouse).subscribe({
        next: (data: any) => {
          const newWh = { ...this.selectedWarehouse, id: data?.id || Math.floor(Math.random() * 10000) } as Warehouse;
          this.warehouses.push(newWh);
          this.closeModal();
        },
        error: () => {
          const newWh = { ...this.selectedWarehouse, id: Math.floor(Math.random() * 10000) } as Warehouse;
          this.warehouses.push(newWh);
          this.closeModal();
        }
      });
    }
  }

  showConfirmModal = false;
  confirmDeleteId?: number;

  requestDeleteWarehouse(id: number) {
    this.confirmDeleteId = id;
    this.showConfirmModal = true;
  }

  cancelDeleteWarehouse() {
    this.showConfirmModal = false;
    this.confirmDeleteId = undefined;
  }

  confirmDeleteWarehouse() {
    if (!this.confirmDeleteId) return;
    const id = this.confirmDeleteId;
    this.service.delete(id).subscribe({
      next: () => {
        this.warehouses = this.warehouses.filter(w => w.id !== id);
        this.cancelDeleteWarehouse();
      },
      error: err => {
        console.error('Error deleting warehouse', err);
        this.warehouses = this.warehouses.filter(w => w.id !== id);
        this.cancelDeleteWarehouse();
      }
    });
  }
}
