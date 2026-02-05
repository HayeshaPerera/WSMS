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

  addHardcodedSupermarkets() {
    this.supermarkets = [
      { id: 1, code: 'SM01', name: 'Downtown Market', location: '789 Main Street', storageCapacity: 5000, currentStock: 3800, contactPhone: '555-1001', contactEmail: 'sm01@wsscms.com', assignedWarehouseId: 1, isActive: true, managerId: 3, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 2, code: 'SM02', name: 'Mall Center Store', location: '321 Shopping Mall', storageCapacity: 4500, currentStock: 3200, contactPhone: '555-1002', contactEmail: 'sm02@wsscms.com', assignedWarehouseId: 2, isActive: true, managerId: 4, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 3, code: 'SM03', name: 'Riverside Supermarket', location: '654 River Road', storageCapacity: 6000, currentStock: 4500, contactPhone: '555-1003', contactEmail: 'sm03@wsscms.com', assignedWarehouseId: 3, isActive: true, managerId: 5, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 4, code: 'SM04', name: 'Airport Terminal Store', location: '999 Airport Drive', storageCapacity: 3000, currentStock: 2100, contactPhone: '555-1004', contactEmail: 'sm04@wsscms.com', assignedWarehouseId: 1, isActive: true, managerId: 6, createdAt: new Date(), updatedAt: new Date() } as any
    ];
  }
}
