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
  exportStartDate: string = '';
  exportEndDate: string = '';
  allSales: any[] = [];
  filteredExportSales: any[] = [];
  
  tableSearchTerm: string = '';
  rowsPerPage: number = 10;
  currentPage: number = 1;

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
    this.loadAllSales();
  }

  loadAllSales(): void {
    this.salesService.getAllSales().subscribe({
      next: (res: any) => {
        const sales = Array.isArray(res) ? res : ((res as any)?.data || (res as any)?.content || []);
        // Sort newest first (date descending) so TODAY'S data is always at the top on Page 1
        sales.sort((a: any, b: any) => {
          const dateA = new Date(b.saleDate || '1970-01-01').getTime();
          const dateB = new Date(a.saleDate || '1970-01-01').getTime();
          return dateA - dateB;
        });
        this.allSales = sales;
        this.updateFilteredExportSales();
      }
    });
  }

  updateFilteredExportSales(): void {
    let sales = [...this.allSales];
    if (this.exportStartDate) {
       const start = this.exportStartDate.substring(0, 10);
       sales = sales.filter(s => (s.saleDate || '').substring(0, 10) >= start);
    }
    if (this.exportEndDate) {
       const end = this.exportEndDate.substring(0, 10);
       sales = sales.filter(s => (s.saleDate || '').substring(0, 10) <= end);
    }
    this.filteredExportSales = sales;
    this.currentPage = 1; // reset page on new date filter
  }

  clearDateFilter(): void {
    this.exportStartDate = '';
    this.exportEndDate = '';
    this.updateFilteredExportSales();
  }

  get filteredSalesForTable(): any[] {
    let sales = this.filteredExportSales;
    if (this.tableSearchTerm) {
      const term = this.tableSearchTerm.toLowerCase();
      sales = sales.filter(s => 
        (s.productName || '').toLowerCase().includes(term) ||
        (s.productSku || '').toLowerCase().includes(term)
      );
    }
    return sales;
  }

  get paginatedSales(): any[] {
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    return this.filteredSalesForTable.slice(startIndex, startIndex + this.rowsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredSalesForTable.length / this.rowsPerPage) || 1;
  }

  get showingStartIndex(): number {
    return this.filteredSalesForTable.length === 0 ? 0 : (this.currentPage - 1) * this.rowsPerPage + 1;
  }

  get showingEndIndex(): number {
    return Math.min(this.currentPage * this.rowsPerPage, this.filteredSalesForTable.length);
  }

  changePage(delta: number): void {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageInput(val: any): void {
    const p = parseInt(val, 10);
    if (!isNaN(p) && p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
    }
  }

  onTableFilterChange(): void {
    this.currentPage = 1;
  }

  generateDemoSales(): void {
    let daysToGenerate = 100; // Default to 100 days (~3.5 months) back if no From Date is selected
    if (this.exportStartDate) {
      const from = new Date(this.exportStartDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && !isNaN(diffDays)) {
        daysToGenerate = Math.max(diffDays + 5, 30); // Add a 5-day cushion to cover the entire date range
      }
    }
    this.notifications.info(`Generating ${daysToGenerate} days of sales history data up to today...`);
    this.salesService.generateDemoSales(daysToGenerate, this.supermarketId || 1, true).subscribe({
      next: () => {
        this.notifications.success(`✅ ${daysToGenerate} days of sales history generated successfully!`);
        this.loadAllSales();
        this.loadInventory();
      },
      error: () => {
        this.notifications.error('Failed to generate sales data.');
      }
    });
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
        this.sharedData.setInventory(this.inventoryItems);
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
             this.loadAllSales(); // Refresh sales history
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
        this.notifications.success(`Stock Request for ${requestedQuantity} units sent to SL Warehouse.`);
      },
      error: () => {
        this.notifications.error('Failed to dispatch auto stock request.');
      }
    });
  }

  exportSalesToCsv(): void {
    this.notifications.info('Fetching sales data for export...');
    this.salesService.getAllSales().subscribe({
      next: (sales: any[]) => {
        let exportSales = sales;
        if (this.exportStartDate) {
           exportSales = exportSales.filter(s => (s.saleDate || '') >= this.exportStartDate);
        }
        if (this.exportEndDate) {
           exportSales = exportSales.filter(s => (s.saleDate || '') <= this.exportEndDate);
        }

        if (!exportSales || exportSales.length === 0) {
          this.notifications.warning('No sales data available to export for the selected period.');
          return;
        }

        const headers = ['Sale Date', 'Product Name', 'Product SKU', 'Store Name', 'Quantity Sold', 'Unit Price (LKR)', 'Total Amount (LKR)', 'Notes'];
        const rows = exportSales.map((s: any) => [
            s.saleDate || '',
            `"${(s.productName || '').replace(/"/g, '""')}"`,
            `"${(s.productSku || '').replace(/"/g, '""')}"`,
            `"${(s.supermarketName || '').replace(/"/g, '""')}"`,
            s.quantitySold || 0,
            s.unitPrice || 0,
            s.totalAmount || (s.unitPrice * s.quantitySold) || 0,
            `"${(s.notes || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `pos_sales_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        this.notifications.success('Sales data exported successfully!');
      },
      error: () => {
        this.notifications.error('Failed to fetch sales data for export.');
      }
    });
  }
}

