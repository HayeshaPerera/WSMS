import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { InventoryService } from '../../services/inventory.service';
import { ForecastService } from '../../services/forecast.service';
import { StockRequestService } from '../../services/stock-request.service';
import { NotificationService } from '../../services/notification.service';
import { SharedDataService } from '../../services/shared-data.service';
import { Inventory, DemandForecast, Product } from '../../models/models';

@Component({
  selector: 'app-stock-monitor',
  templateUrl: './stock-monitor.component.html',
  styleUrls: ['./stock-monitor.component.css']
})
export class StockMonitorComponent implements OnInit {
  supermarketId?: number;
  supermarketName = 'My Supermarket';
  inventory: Inventory[] = [];
  forecasts: DemandForecast[] = [];
  loading = true;
  generatingForecast = false;
  searchTerm = '';
  selectedStatus = '';
  
  // Quick request modal/form state
  showRequestModal = false;
  selectedProductForRequest: any = null;
  requestQuantity: number = 0;
  requestPriority: string = 'MEDIUM';
  requestNotes: string = '';
  availableWarehouseQuantity: number | null = null;

  constructor(
    private auth: AuthService,
    private inventoryService: InventoryService,
    private forecastService: ForecastService,
    private requestService: StockRequestService,
    private notifications: NotificationService,
    private sharedData: SharedDataService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.supermarketId = user?.supermarketId || 1;
    this.supermarketName = `Supermarket #${this.supermarketId}`;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    if (!this.supermarketId) {
      this.loading = false;
      return;
    }

    // Load supermarket inventory
    this.inventoryService.getSupermarketInventory(this.supermarketId).subscribe({
      next: (inv: any) => {
        try {
          const arr = Array.isArray(inv) ? inv : (inv && inv.data ? inv.data : []);
          this.inventory = this.enrichInventoryWithProducts(arr);
        } catch (e) {
          console.error('Error enriching inventory with products:', e);
          this.inventory = [];
        }
        
        // Load AI demand forecasts
        this.forecastService.getSupermarketForecasts(this.supermarketId!).subscribe({
          next: (fcs) => {
            this.forecasts = fcs || [];
            this.loading = false;
          },
          error: (err) => {
            console.error('Error loading forecasts:', err);
            this.forecasts = [];
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading supermarket inventory:', err);
        this.loading = false;
        this.notifications.error('Failed to load inventory data');
      }
    });
  }

  private enrichInventoryWithProducts(items: any[]): any[] {
    if (!Array.isArray(items)) return [];
    try {
      this.sharedData.initializeDefaultData();
      const products = this.sharedData.getProducts() || [];
      return items.map(it => {
        if (!it) return it;
        if (!it.product) {
          const found = products.find((p: any) => p && p.id === (it.productId || it.product?.id));
          it.product = found || { id: it.productId || null, name: 'Unresolved Item', sku: 'PENDING', unitPrice: 0 };
        }
        return it;
      });
    } catch (e) {
      console.error('Failed in enrichInventoryWithProducts:', e);
      return items;
    }
  }

  getFilteredInventory(): any[] {
    return this.inventory.map(item => {
      // Find corresponding forecast
      const forecast = this.forecasts.find(f => f.productId === item.product?.id);
      const weeklyDemand = forecast?.predictedWeeklyDemand || Math.round(item.reorderLevel * 1.5);
      const trend = forecast?.trend || 'stable';
      const confidence = forecast?.confidence || 0.85;
      const forecastMethod = forecast?.forecastMethod || 'Historical Average';
      const recommendedOrder = Math.max(0, Math.round(weeklyDemand * 1.3 - item.quantity));

      let stockStatus = 'adequate';
      if (item.quantity === 0) stockStatus = 'out-of-stock';
      else if (item.quantity < item.reorderLevel * 0.5) stockStatus = 'critical';
      else if (item.quantity < item.reorderLevel) stockStatus = 'low';

      return {
        ...item,
        weeklyDemand,
        trend,
        confidence,
        forecastMethod,
        recommendedOrder,
        stockStatus
      };
    }).filter(item => {
      const nameMatch = !this.searchTerm || 
        item.product?.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const statusMatch = !this.selectedStatus || item.stockStatus === this.selectedStatus;
      
      return nameMatch && statusMatch;
    });
  }

  // Count metrics for KPI cards
  get totalItemsCount(): number {
    return this.inventory.length;
  }

  get lowStockItemsCount(): number {
    return this.inventory.filter(i => i.quantity < i.reorderLevel).length;
  }

  get criticalItemsCount(): number {
    return this.inventory.filter(i => i.quantity < i.reorderLevel * 0.5).length;
  }

  get aiForecastedCount(): number {
    return this.forecasts.length;
  }

  getTrendIcon(trend: string): string {
    const t = trend.toLowerCase();
    if (t === 'increasing') return 'trending_up';
    if (t === 'decreasing') return 'trending_down';
    return 'trending_flat';
  }

  getTrendClass(trend: string): string {
    const t = trend.toLowerCase();
    if (t === 'increasing') return 'trend-up';
    if (t === 'decreasing') return 'trend-down';
    return 'trend-flat';
  }

  // Action: Open Restock Modal
  openRestockModal(item: any): void {
    this.selectedProductForRequest = item.product;
    this.requestQuantity = item.recommendedOrder > 0 ? item.recommendedOrder : Math.round(item.reorderLevel * 1.5);
    this.requestPriority = item.stockStatus === 'critical' ? 'URGENT' : (item.stockStatus === 'low' ? 'HIGH' : 'MEDIUM');
    this.requestNotes = `Auto-replenishment recommendation of ${this.requestQuantity} units based on ${item.forecastMethod}.`;
    this.showRequestModal = true;
    
    // Check warehouse availability
    this.availableWarehouseQuantity = null;
    this.inventoryService.getWarehouseProductQuantity(item.product.id, 1).subscribe({
      next: (qty) => {
        this.availableWarehouseQuantity = qty;
      },
      error: () => {
        this.availableWarehouseQuantity = null;
      }
    });
  }

  closeModal(): void {
    this.showRequestModal = false;
    this.selectedProductForRequest = null;
  }

  // Action: Submit Quick Restock Request
  submitRestockRequest(): void {
    if (!this.selectedProductForRequest || this.requestQuantity <= 0) {
      this.notifications.error('Please specify a valid replenishment quantity');
      return;
    }

    const newRequest = {
      supermarketId: this.supermarketId,
      warehouseId: 1, // Central Warehouse
      productId: this.selectedProductForRequest.id,
      requestedQuantity: this.requestQuantity,
      status: 'PENDING',
      priority: this.requestPriority,
      notes: this.requestNotes,
      requestedAt: new Date()
    };

    this.requestService.createRequest(newRequest as any).subscribe({
      next: (res) => {
        this.notifications.success(`Stock request submitted for ${this.selectedProductForRequest.name}`);
        const created = res && (res as any).data ? (res as any).data : null;
        const enriched = {
          id: created?.id || Date.now(),
          requestNumber: created?.requestNumber || `REQ-${Date.now()}`,
          supermarket: { id: this.supermarketId, name: this.supermarketName },
          warehouse: { id: 1, name: 'Central Warehouse' },
          product: this.selectedProductForRequest,
          requestedQuantity: this.requestQuantity,
          status: 'PENDING',
          priority: this.requestPriority,
          requestedBy: null,
          requestedAt: new Date()
        };
        this.sharedData.addStockRequest(enriched);
        this.closeModal();
        this.loadData();
      },
      error: () => {
        this.notifications.error('Failed to submit restock request');
      }
    });
  }

  // Action: Generate Prophet forecasts end-to-end
  generateAIForecasts(): void {
    if (!this.supermarketId) return;
    this.generatingForecast = true;
    this.notifications.info('Calling Prophet AI forecasting engine. This may take a moment...');

    this.forecastService.generateForecasts(this.supermarketId, 7).subscribe({
      next: () => {
        this.notifications.success('AI forecasts generated and updated successfully!');
        this.generatingForecast = false;
        this.loadData();
      },
      error: (err) => {
        this.generatingForecast = false;
        this.notifications.error('AI forecasting service is currently offline. Graceful average fallback applied.');
        this.loadData();
      }
    });
  }
}
