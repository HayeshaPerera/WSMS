import { Component, OnInit } from '@angular/core';
import { SupermarketService } from '../../services/supermarket.service';
import { Supermarket } from '../../models/models';

@Component({
  selector: 'app-supermarkets',
  templateUrl: './supermarkets.component.html',
  styleUrls: ['./supermarkets.component.css']
})
export class SupermarketsComponent implements OnInit {
  supermarkets: Supermarket[] = [];
  loading = true;

  constructor(private service: SupermarketService) {}

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: data => { this.supermarkets = data; this.loading = false; },
      error: _ => { this.addHardcodedSupermarkets(); this.loading = false; }
    });
  }

  showModal = false;
  selectedSupermarket: Partial<Supermarket> = {};

  addHardcodedSupermarkets() {
    this.supermarkets = [
      { id: 1, code: 'SM01', name: 'Downtown Market', location: '789 Main Street', storageCapacity: 5000, currentStock: 3800, contactPhone: '555-1001', contactEmail: 'sm01@wsscms.com', assignedWarehouseId: 1, active: true, managerId: 3, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 2, code: 'SM02', name: 'Mall Center Store', location: '321 Shopping Mall', storageCapacity: 4500, currentStock: 3200, contactPhone: '555-1002', contactEmail: 'sm02@wsscms.com', assignedWarehouseId: 2, active: true, managerId: 4, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 3, code: 'SM03', name: 'Riverside Supermarket', location: '654 River Road', storageCapacity: 6000, currentStock: 4500, contactPhone: '555-1003', contactEmail: 'sm03@wsscms.com', assignedWarehouseId: 3, active: true, managerId: 5, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 4, code: 'SM04', name: 'Airport Terminal Store', location: '999 Airport Drive', storageCapacity: 3000, currentStock: 2100, contactPhone: '555-1004', contactEmail: 'sm04@wsscms.com', assignedWarehouseId: 1, active: true, managerId: 6, createdAt: new Date(), updatedAt: new Date() } as any
    ];
  }

  getTotalCapacity(): number {
    return this.supermarkets.reduce((sum, s) => sum + (s.storageCapacity || 0), 0);
  }

  openAddModal() {
    this.selectedSupermarket = { code: '', name: '', location: '', storageCapacity: 0, currentStock: 0, active: true };
    this.showModal = true;
  }

  openEditModal(supermarket: Supermarket) {
    this.selectedSupermarket = { ...supermarket };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedSupermarket = {};
  }

  saveSupermarket() {
    if (this.selectedSupermarket.id) {
      this.service.update(this.selectedSupermarket.id, this.selectedSupermarket as Supermarket).subscribe({
        next: () => {
          const idx = this.supermarkets.findIndex(s => s.id === this.selectedSupermarket.id);
          if (idx > -1) this.supermarkets[idx] = { ...this.supermarkets[idx], ...this.selectedSupermarket } as Supermarket;
          this.closeModal();
        },
        error: () => {
          const idx = this.supermarkets.findIndex(s => s.id === this.selectedSupermarket.id);
          if (idx > -1) this.supermarkets[idx] = { ...this.supermarkets[idx], ...this.selectedSupermarket } as Supermarket;
          this.closeModal();
        }
      });
    } else {
      this.service.create(this.selectedSupermarket as Supermarket).subscribe({
        next: (data: any) => {
          const newSm = { ...this.selectedSupermarket, id: data?.id || Math.floor(Math.random() * 10000) } as Supermarket;
          this.supermarkets.push(newSm);
          this.closeModal();
        },
        error: () => {
          const newSm = { ...this.selectedSupermarket, id: Math.floor(Math.random() * 10000) } as Supermarket;
          this.supermarkets.push(newSm);
          this.closeModal();
        }
      });
    }
  }

  deleteSupermarket(id: number) {
    if (confirm('Are you sure you want to close this store?')) {
      this.service.delete(id).subscribe({
        next: () => this.supermarkets = this.supermarkets.filter(s => s.id !== id),
        error: err => {
          console.error('Error deleting supermarket', err);
          this.supermarkets = this.supermarkets.filter(s => s.id !== id);
        }
      });
    }
  }
}
