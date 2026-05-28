import { Component, OnInit } from '@angular/core';
import { InventoryService } from '../../../services/inventory.service';
import { SalesService } from '../../../services/sales.service';
import { StockRequestService } from '../../../services/stock-request.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { SharedDataService } from '../../../services/shared-data.service';

@Component({
  selector: 'app-supermarket-pos',
  templateUrl: './supermarket-pos.component.html',
  styleUrls: ['./supermarket-pos.component.css']
})
export class SupermarketPosComponent implements OnInit {
  searchTerm: string = '';
  inventoryItems: any[] = [];
  filteredItems: any[] = [];
  selectedItem: any = null;
  quantity: number = 1;
  isProcessing: boolean = false;
  supermarketId: number = 1;

  constructor(
    private inventoryService: InventoryService,
    private salesService: SalesService,
    private stockRequestService: StockRequestService,
    private notifications: NotificationService,
    private auth: AuthService,
    private sharedData: SharedDataService
  ) {}

  ngOnInit(): void {
    this.supermarketId = 1; // Default for demo
    this.sharedData.initializeDefaultData(); // Ensure products are loaded
    this.loadInventory();
  }

  loadInventory(): void {
    this.inventoryService.getSupermarketInventory(this.supermarketId).subscribe({
      next: (res: any) => {
        let items = res || [];
        if (!Array.isArray(items) && items.data) items = items.data;

        // Enrich with product metadata
        const products = this.sharedData.getProducts();
        this.inventoryItems = items.map((i: any) => {
          const pid = i.productId || i.product_id;
          if (!i.product && pid) {
             const found = products.find((p: any) => p.id === pid);
             if (found) {
                i.product = found;
             } else {
                i.product = { id: pid, name: i.productName || 'Unknown Product', sku: i.productSku || 'N/A', unitPrice: 0 };
             }
          } else if (!i.product) {
             i.product = { id: 1, name: i.productName || 'Unknown Product', sku: i.productSku || 'N/A', unitPrice: 0 };
          }
          if (i.product && i.product.unitPrice > 0 && i.product.unitPrice < 50) {
             i.product.unitPrice = Math.round(i.product.unitPrice * 350);
          } else if (i.product && i.product.unitPrice === 0) {
             i.product.unitPrice = 1500; // Provide a realistic default price if 0
          }
          return i;
        });
        this.filterItems();
      },
      error: () => {
        this.notifications.error('Failed to load inventory for POS');
      }
    });
  }

  filterItems(): void {
    if (!this.searchTerm) {
      this.filteredItems = this.inventoryItems;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredItems = this.inventoryItems.filter(i =>
        (i.product?.name || '').toLowerCase().includes(term) ||
        (i.product?.sku || '').toLowerCase().includes(term)
      );
    }
  }

  selectItem(item: any): void {
    this.selectedItem = item;
    this.quantity = 1;
  }

  get totalAmount(): number {
    if (!this.selectedItem || !this.selectedItem.product) return 0;
    return (this.selectedItem.product.unitPrice || 0) * this.quantity;
  }

  completeSale(): void {
    if (!this.selectedItem) {
      this.notifications.error('Please select an item first.');
      return;
    }
    if (this.quantity < 1 || this.quantity > this.selectedItem.quantity) {
      this.notifications.error('Invalid quantity. Check available stock.');
      return;
    }

    this.isProcessing = true;
    
    const pId = this.selectedItem.product?.id || this.selectedItem.productId || this.selectedItem.product_id;
    const uPrice = this.selectedItem.product?.unitPrice || 0;

    // 1. Record Sale
    const saleDTO = {
      productId: pId,
      supermarketId: this.supermarketId,
      quantitySold: this.quantity,
      unitPrice: uPrice > 0 ? uPrice : 100, // Fallback price to prevent backend validation errors
      saleDate: new Date().toISOString().split('T')[0],
      notes: 'POS Sale'
    };

    console.log('Completing sale payload:', saleDTO);

    this.salesService.recordSale(saleDTO).subscribe({
      next: () => {
        // 2. Adjust Inventory
        this.inventoryService.adjustQuantity(this.selectedItem.id, -this.quantity).subscribe({
          next: () => {
             this.notifications.success(`Sale completed! Deducted ${this.quantity} units.`);
             const updatedQty = this.selectedItem.quantity - this.quantity;

             // 3. Auto-Reorder Check
             if (updatedQty <= (this.selectedItem.reorderLevel || 10)) {
                this.notifications.warning(`Stock is low. Auto-dispatching stock request!`);
                this.dispatchStockRequest(this.selectedItem, updatedQty);
             }

             this.isProcessing = false;
             this.selectedItem = null;
             this.quantity = 1;
             this.loadInventory(); // Refresh
          },
          error: (err) => {
             console.error('Inventory adjust error:', err);
             this.notifications.error('Sale recorded but failed to adjust inventory.');
             this.isProcessing = false;
          }
        });
      },
      error: (err) => {
        console.error('Sale record error:', err);
        this.notifications.error('Failed to record sale. Check console for details.');
        this.isProcessing = false;
      }
    });
  }

  dispatchStockRequest(item: any, currentQty: number): void {
    const requestedQuantity = (item.reorderLevel || 10) * 3;
    const pId = item.product?.id || item.productId || item.product_id;
    
    const request = {
      productId: pId,
      supermarketId: this.supermarketId,
      warehouseId: 1,
      requestedQuantity: requestedQuantity,
      priority: 'HIGH'
    } as any;

    this.stockRequestService.createRequest(request).subscribe({
      next: () => {
        this.notifications.success(`Stock Request for ${requestedQuantity} units sent to Colombo Warehouse.`);
      },
      error: () => {
        this.notifications.error('Failed to dispatch auto stock request.');
      }
    });
  }
}
