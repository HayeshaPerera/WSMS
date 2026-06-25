import { Injectable } from '@angular/core';
import { ApiResponse } from '../models/models';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {
    approveStockRequest(requestId: number, approvedQuantity: number): void {
      const requests = [...this.stockRequestsSubject.value];
      const idx = requests.findIndex(r => r.id === requestId);
      if (idx !== -1) {
        requests[idx].status = 'APPROVED';
        requests[idx].approvedQuantity = approvedQuantity;
        requests[idx].approvedAt = new Date();
        this.stockRequestsSubject.next(requests);
        this.saveToStorage('stockRequests', requests);

        // Create delivery linked to this request
        const delivery = {
          id: Math.max(...this.deliveriesSubject.value.map(d => d.id), 0) + 1,
          trackingNumber: 'TRK' + Date.now(),
          warehouse: requests[idx].warehouse,
          supermarket: requests[idx].supermarket,
          product: requests[idx].product,
          quantity: approvedQuantity,
          status: 'IN_TRANSIT',
          createdAt: new Date(),
          dispatchedAt: new Date(),
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        };
        this.addDelivery(delivery);
      }
    }
  private stockRequestsSubject = new BehaviorSubject<any[]>([]);
  private deliveriesSubject = new BehaviorSubject<any[]>([]);
  private inventorySubject = new BehaviorSubject<any[]>([]);
  private productsSubject = new BehaviorSubject<any[]>([]);
  private warehousesSubject = new BehaviorSubject<any[]>([]);
  private supermarketsSubject = new BehaviorSubject<any[]>([]);

  public stockRequests$ = this.stockRequestsSubject.asObservable();
  public deliveries$ = this.deliveriesSubject.asObservable();
  public inventory$ = this.inventorySubject.asObservable();
  public products$ = this.productsSubject.asObservable();
  public warehouses$ = this.warehousesSubject.asObservable();
  public supermarkets$ = this.supermarketsSubject.asObservable();

  constructor() {
  }

  // Stock Requests Management
  addStockRequest(request: any): void {
    const requests = [...this.stockRequestsSubject.value];
    requests.unshift(request);
    this.stockRequestsSubject.next(requests);
    this.saveToStorage('stockRequests', requests);
    console.log('✅ Stock request added:', request.id, 'Total requests:', requests.length);
  }

  updateStockRequest(id: number, updates: Partial<any>): void {
    const requests = [...this.stockRequestsSubject.value];
    const index = requests.findIndex(r => r.id === id);
    if (index !== -1) {
      requests[index] = { ...requests[index], ...updates };
      this.stockRequestsSubject.next(requests);
      this.saveToStorage('stockRequests', requests);
      console.log('✅ Stock request updated:', id, 'Status:', updates['status']);
    }
  }

  getStockRequests(): any[] {
    return this.stockRequestsSubject.value;
  }

  // Deliveries Management
  addDelivery(delivery: any): void {
    const deliveries = [...this.deliveriesSubject.value];
    deliveries.unshift(delivery);
    this.deliveriesSubject.next(deliveries);
    this.saveToStorage('deliveries', deliveries);
    console.log('✅ Delivery added:', delivery.trackingNumber, 'Total deliveries:', deliveries.length);
  }

  updateDelivery(id: number, updates: Partial<any>): void {
    const deliveries = [...this.deliveriesSubject.value];
    // Match by id with loose string/number equality to avoid type-mismatch problems
    let index = deliveries.findIndex(d => String(d.id) === String(id));
    // Fallback: if not found by id, try matching by trackingNumber if provided in updates
    if (index === -1 && updates && updates['trackingNumber']) {
      index = deliveries.findIndex(d => d.trackingNumber === updates['trackingNumber']);
    }
    if (index !== -1) {
      deliveries[index] = { ...deliveries[index], ...updates };
      this.deliveriesSubject.next(deliveries);
      this.saveToStorage('deliveries', deliveries);
      console.log('✅ Delivery updated:', deliveries[index].id, 'Status:', updates['status']);
    } else {
      console.warn('Delivery to update not found in shared data:', id, updates);
    }
  }

  updateDeliveryByTracking(trackingNumber: string, updates: Partial<any>): void {
    const deliveries = [...this.deliveriesSubject.value];
    const index = deliveries.findIndex(d => d.trackingNumber === trackingNumber);
    if (index !== -1) {
      deliveries[index] = { ...deliveries[index], ...updates };
      this.deliveriesSubject.next(deliveries);
      this.saveToStorage('deliveries', deliveries);
    }
  }

  getDeliveries(): any[] {
    return this.deliveriesSubject.value;
  }

  // Inventory Management
  addInventoryItem(item: any): void {
    const inventory = [...this.inventorySubject.value];
    inventory.unshift(item);
    this.inventorySubject.next(inventory);
    this.saveToStorage('inventory', inventory);
  }

  updateInventoryItem(id: number, updates: Partial<any>): void {
    const inventory = [...this.inventorySubject.value];
    const index = inventory.findIndex(i => i.id === id);
    if (index !== -1) {
      inventory[index] = { ...inventory[index], ...updates };
      this.inventorySubject.next(inventory);
      this.saveToStorage('inventory', inventory);
    }
  }

  deleteInventoryItem(id: number): void {
    const inventory = this.inventorySubject.value.filter((i: any) => i.id !== id);
    this.inventorySubject.next(inventory);
    this.saveToStorage('inventory', inventory);
  }

  getInventory(): any[] {
    return this.inventorySubject.value;
  }

  // Products Management
  addProduct(product: any): void {
    const products = [...this.productsSubject.value];
    products.unshift(product);
    this.productsSubject.next(products);
    this.saveToStorage('products', products);
    console.log('✅ Product added:', product.name, 'Total products:', products.length);
  }

  updateProduct(id: number, updates: Partial<any>): void {
    const products = [...this.productsSubject.value];
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      this.productsSubject.next(products);
      this.saveToStorage('products', products);
      console.log('✅ Product updated:', id, products[index].name);
    }
  }

  deleteProduct(id: number): void {
    const products = this.productsSubject.value.filter(p => p.id !== id);
    this.productsSubject.next(products);
    this.saveToStorage('products', products);
    console.log('✅ Product deleted:', id, 'Remaining products:', products.length);
  }

  getProducts(): any[] {
    return this.productsSubject.value;
  }

  // Warehouses
  getWarehouses(): any[] {
    return this.warehousesSubject.value;
  }

  setWarehouses(warehouses: any[] | ApiResponse): void {
    const arr: any[] = Array.isArray(warehouses)
      ? warehouses
      : (warehouses && typeof warehouses === 'object' && 'data' in warehouses ? (warehouses as ApiResponse).data ?? [] : []);
    this.warehousesSubject.next(arr);
    this.saveToStorage('warehouses', arr);
    console.log('✅ Warehouses set:', arr.length);
  }

  // Supermarkets
  getSupermarkets(): any[] {
    return this.supermarketsSubject.value;
  }

  setSupermarkets(supermarkets: any[] | ApiResponse): void {
    const arr: any[] = Array.isArray(supermarkets)
      ? supermarkets
      : (supermarkets && typeof supermarkets === 'object' && 'data' in supermarkets ? (supermarkets as ApiResponse).data ?? [] : []);
    this.supermarketsSubject.next(arr);
    this.saveToStorage('supermarkets', arr);
    console.log('✅ Supermarkets set:', arr.length);
  }

  setProducts(products: any[] | ApiResponse): void {
    const arr: any[] = Array.isArray(products)
      ? products
      : (products && typeof products === 'object' && 'data' in products ? (products as ApiResponse).data ?? [] : []);
    // Normalize prices to realistic LKR values
    const normalized = arr.map((p: any) => {
      const item = { ...p };
      const price = item.unitPrice || item.currentUnitPrice || item.current_unit_price || 0;
      if (price > 0 && price < 50) {
        item.unitPrice = Math.round(price * 350);
      } else if (price === 0) {
        item.unitPrice = 1500;
      } else {
        item.unitPrice = price;
      }
      return item;
    });
    this.productsSubject.next(normalized);
    this.saveToStorage('products', normalized);
    console.log('✅ Products set:', normalized.length, 'products');
  }
  setStockRequests(requests: any[] | ApiResponse): void {
    const arr: any[] = Array.isArray(requests)
      ? requests
      : (requests && typeof requests === 'object' && 'data' in requests ? (requests as ApiResponse).data ?? [] : []);
    // Merge incoming server list with existing local requests to avoid overwriting local-only entries
    const current = this.stockRequestsSubject.value || [];
    const byId = new Map<number, any>();
    arr.forEach(r => { if (r && r.id != null) byId.set(r.id, r); });
    // keep any current requests not present in server arr
    current.forEach(r => { if (r && r.id != null && !byId.has(r.id)) byId.set(r.id, r); });
    const merged = Array.from(byId.values()).sort((a, b) => (b.requestedAt ? new Date(b.requestedAt).getTime() : 0) - (a.requestedAt ? new Date(a.requestedAt).getTime() : 0));
    this.stockRequestsSubject.next(merged);
    this.saveToStorage('stockRequests', merged);
    console.log('✅ Stock requests set (merged):', merged.length, 'requests');
  }

  setDeliveries(deliveries: any[] | ApiResponse): void {
    const arr: any[] = Array.isArray(deliveries)
      ? deliveries
      : (deliveries && typeof deliveries === 'object' && 'data' in deliveries ? (deliveries as ApiResponse).data ?? [] : []);
    this.deliveriesSubject.next(arr);
    this.saveToStorage('deliveries', arr);
    console.log('✅ Deliveries set:', arr.length, 'deliveries');
  }

  setInventory(inventory: any[] | ApiResponse): void {
    const arr: any[] = Array.isArray(inventory)
      ? inventory
      : (inventory && typeof inventory === 'object' && 'data' in inventory ? (inventory as ApiResponse).data ?? [] : []);
    // Normalize incoming inventory items to avoid "Unknown" displays
    const products = this.getProducts();
    const normalized = (arr || []).map((it: any) => {
      const item: any = { ...it };
      // ensure numeric quantity
      item.quantity = item.quantity != null ? Number(item.quantity) : 0;

      // normalize product object
      if (!item.product) {
        const pid = item.productId || item.product_id || (item.product && item.product.id) || null;
        const pname = item.productName || item.product_name || item.name || null;
        let found = null;
        if (pid != null) found = products.find(p => p && (p.id == pid || String(p.id) === String(pid)));
        if (!found && pname) found = products.find(p => p && ((p.name || '').toLowerCase() === String(pname).toLowerCase() || (p.sku || '').toLowerCase() === String(pname).toLowerCase()));
        if (found) {
          item.product = { ...found };
        } else {
          item.product = item.product || { id: pid || null, name: pname || 'Standard Local Supply', sku: item.productSku || item.sku || 'N/A', unitPrice: item.unitPrice || 0 };
        }
      }

      // normalize supermarket/warehouse references
      if (!item.supermarket && (item.supermarketId || item.supermarket_id)) {
        const sid = item.supermarket || item.supermarketId || item.supermarket_id;
        item.supermarket = { id: sid, code: `SM-${sid}`, name: `Supermarket ${sid}` };
      }
      if (!item.warehouse && (item.warehouseId || item.warehouse_id)) {
        const wid = item.warehouse || item.warehouseId || item.warehouse_id;
        item.warehouse = { id: wid, code: `WH-${wid}`, name: `Warehouse ${wid}` };
      }

      // low stock flag if missing
      if (item.lowStockAlert == null && item.reorderLevel != null) {
        item.lowStockAlert = item.quantity <= item.reorderLevel;
      }

      // Normalize product price to realistic LKR
      if (item.product) {
        const price = item.product.unitPrice || item.product.currentUnitPrice || item.product.current_unit_price || 0;
        if (price > 0 && price < 50) {
          item.product.unitPrice = Math.round(price * 350);
        } else if (price === 0) {
          item.product.unitPrice = 1500;
        }
      }

      return item;
    });

    this.inventorySubject.next(normalized);
    this.saveToStorage('inventory', normalized);
    console.log('✅ Inventory set (normalized):', normalized.length, 'items');
  }

  // Initialize with hardcoded data if empty
  initializeDefaultData(): void {
    if (this.stockRequestsSubject.value.length === 0) {
      const defaultRequests = [
        { 
          id: 1, 
          requestNumber: 'REQ-2024-001',
          supermarket: { id: 1, name: 'SL Supermarket', code: 'SM-001' },
          warehouse: { id: 1, name: 'SL Warehouse', code: 'WH-001' },
          product: { id: 1, name: 'Premium Coffee Beans', sku: 'PRD-001' },
          requestedQuantity: 100, 
          approvedQuantity: 0, 
          status: 'PENDING',
          priority: 'MEDIUM',
          requestedAt: new Date('2024-01-20'),
          createdAt: new Date(), 
          updatedAt: new Date() 
        },
        { 
          id: 2, 
          requestNumber: 'REQ-2024-002',
          supermarket: { id: 2, name: 'Eastside Grocery', code: 'SM-002' },
          warehouse: { id: 1, name: 'SL Warehouse', code: 'WH-001' },
          product: { id: 3, name: 'Organic Honey', sku: 'PRD-003' },
          requestedQuantity: 50, 
          approvedQuantity: 50, 
          status: 'APPROVED',
          priority: 'MEDIUM',
          requestedAt: new Date('2024-01-18'), 
          approvedAt: new Date('2024-01-18'), 
          createdAt: new Date(), 
          updatedAt: new Date() 
        },
        { 
          id: 3, 
          requestNumber: 'REQ-2024-003',
          supermarket: { id: 1, name: 'SL Supermarket', code: 'SM-001' },
          warehouse: { id: 1, name: 'SL Warehouse', code: 'WH-001' },
          product: { id: 5, name: 'Fresh Pasta', sku: 'PRD-005' },
          requestedQuantity: 75, 
          approvedQuantity: 0, 
          status: 'PENDING',
          priority: 'HIGH',
          requestedAt: new Date('2024-01-22'), 
          createdAt: new Date(), 
          updatedAt: new Date() 
        }
      ];
      this.stockRequestsSubject.next(defaultRequests);
      this.saveToStorage('stockRequests', defaultRequests);
    }

    if (this.deliveriesSubject.value.length === 0) {
      const defaultDeliveries = [
        { 
          id: 1, 
          trackingNumber: 'TRK1706001234567',
          warehouse: { id: 1, name: 'SL Warehouse', code: 'WH-001' },
          supermarket: { id: 2, name: 'Eastside Grocery', code: 'SM-002' },
          product: { id: 3, name: 'Organic Honey', sku: 'PRD-003' },
          quantity: 50, 
          status: 'IN_TRANSIT',
          createdAt: new Date('2024-01-18'), 
          dispatchedAt: new Date('2024-01-18'),
          inTransitAt: new Date('2024-01-19'), 
          estimatedDelivery: new Date('2024-01-25') 
        },
        { 
          id: 2, 
          trackingNumber: 'TRK1706001234789',
          warehouse: { id: 1, name: 'SL Warehouse', code: 'WH-001' },
          supermarket: { id: 3, name: 'Westside Store', code: 'SM-003' },
          product: { id: 4, name: 'Artisan Bread', sku: 'PRD-004' },
          quantity: 120, 
          status: 'DELIVERED',
          createdAt: new Date('2024-01-15'), 
          dispatchedAt: new Date('2024-01-16'), 
          inTransitAt: new Date('2024-01-17'), 
          deliveredAt: new Date('2024-01-18') 
        }
      ];
      this.deliveriesSubject.next(defaultDeliveries);
      this.saveToStorage('deliveries', defaultDeliveries);
    }
  }

  // Local Storage Helpers
  private saveToStorage(key: string, data: any): void {
    // Disabled for strict backend reliance
  }

  clearAll(): void {
    this.stockRequestsSubject.next([]);
    this.deliveriesSubject.next([]);
    this.inventorySubject.next([]);
    this.productsSubject.next([]);
  }
}
