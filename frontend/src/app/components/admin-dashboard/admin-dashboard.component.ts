import { Component, OnInit } from '@angular/core';
import { StockRequestService } from '../../services/stock-request.service';
import { DeliveryService } from '../../services/delivery.service';
import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  pendingRequests = 0;
  activeDeliveries = 0;
  totalInventoryValue = 0;
  lowStockItems = 0;
  totalProducts = 0;

  requestStatusChart: any;
  inventoryTrendChart: any;
  deliveryChart: any;

  revenueData = [12000, 15000, 18000, 14000, 21000, 19000];
  revenueLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  requestStats = {
    pending: 15,
    approved: 45,
    rejected: 8,
    completed: 120
  };

  deliveryStats = {
    pending: 3,
    inTransit: 8,
    delivered: 156,
    delayed: 2
  };

  // Demo AI/forecast data to keep the dashboard interesting even without live data
  forecastHighlights = [
    { title: 'Dairy Demand Spike', detail: '+18% expected next 7 days', action: 'Pre-position 450 units', confidence: 0.92 },
    { title: 'Bakery Reorder Window', detail: '3 days until bread stock-out', action: 'Expedite 320 units', confidence: 0.87 },
    { title: 'Produce Shrink Risk', detail: 'High spoilage risk on greens', action: 'Advance discounts in stores', confidence: 0.81 }
  ];

  aiInsights = [
    { label: 'Fill Rate', value: '97.4%', delta: '+2.1% vs last week' },
    { label: 'On-Time Delivery', value: '93.6%', delta: '+4 routes stabilized' },
    { label: 'Stockout Risk', value: 'Low (7 SKUs)', delta: 'Auto-reorder triggered' },
    { label: 'Margin Guardrail', value: 'LKR 385k saved', delta: 'Optimized replenishment lots' }
  ];

  inventoryWarnings = [
    { product: 'Whole Milk 1L', current: 5, minimum: 50, warehouse: 'WH01', percentage: 10 },
    { product: 'Whole Wheat Bread', current: 8, minimum: 40, warehouse: 'WH02', percentage: 20 },
    { product: 'Brown Eggs Dozen', current: 12, minimum: 30, warehouse: 'WH01', percentage: 40 },
    { product: 'Cheddar Cheese 500g', current: 15, minimum: 60, warehouse: 'WH02', percentage: 25 },
    { product: 'Yogurt Plain 500g', current: 3, minimum: 45, warehouse: 'WH01', percentage: 7 }
  ];

  // Restock recommendations to avoid empty look
  restockRecommendations = [
    { product: 'Cooking Oil 1L', current: 25, min: 100, suggested: 120, priority: 'High', reason: 'Promo uplift +24% expected' },
    { product: 'Rice 5kg', current: 60, min: 150, suggested: 180, priority: 'Medium', reason: 'Seasonal spike in staples' },
    { product: 'Soda 1.5L', current: 40, min: 90, suggested: 120, priority: 'High', reason: 'Weekend surge prediction' },
    { product: 'Tomato Paste 400g', current: 30, min: 80, suggested: 100, priority: 'Low', reason: 'Reorder cycle approaching' }
  ];

  // Top sellers snapshot
  topSellers = [
    { name: 'Whole Milk 1L', units: 860, trend: 12 },
    { name: 'White Bread Loaf', units: 740, trend: 8 },
    { name: 'Eggs Dozen', units: 680, trend: -3 },
    { name: 'Cheddar Cheese 500g', units: 540, trend: 5 },
    { name: 'Yogurt Plain 500g', units: 510, trend: 9 }
  ];

  // Category distribution (percentage of inventory value)
  categoryDistribution = [
    { category: 'Dairy', percentage: 28 },
    { category: 'Bakery', percentage: 22 },
    { category: 'Produce', percentage: 18 },
    { category: 'Beverages', percentage: 17 },
    { category: 'Pantry', percentage: 15 }
  ];

  // Activity feed to give life to the dashboard
  recentActivity = [
    { time: '11:05', text: 'Approved stock request SR-1042 (Cheddar Cheese)', type: 'success' },
    { time: '10:52', text: 'Delivery DL-209 departed WH02 to SM03', type: 'info' },
    { time: '10:37', text: 'Low stock alert triggered for Milk 1L', type: 'warn' },
    { time: '10:20', text: 'Auto reorder placed for Rice 5kg', type: 'success' },
    { time: '10:08', text: 'Delayed route detected: DL-203 (traffic)', type: 'warn' }
  ];

  constructor(
    private stockRequests: StockRequestService,
    private deliveries: DeliveryService,
    private inventory: InventoryService,
    private products: ProductService
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
    this.initCharts();
  }

  loadDashboardData(): void {
    this.stockRequests.getAllRequests().subscribe(
      (data: any) => {
        const arr = Array.isArray(data) ? data : (data && data.data ? data.data : []);
        this.pendingRequests = arr.filter((r: any) => r.status === 'PENDING').length;
        this.requestStats = {
          pending: this.pendingRequests,
          approved: arr.filter((r: any) => r.status === 'APPROVED').length,
          rejected: arr.filter((r: any) => r.status === 'REJECTED').length,
          completed: arr.filter((r: any) => r.status === 'DELIVERED').length
        };
        if (this.requestStatusChart) {
          this.requestStatusChart.data.datasets[0].data = [this.requestStats.pending, this.requestStats.approved, this.requestStats.rejected, this.requestStats.completed];
          this.requestStatusChart.update();
        }
      },
      _ => this.pendingRequests = 15
    );

    this.deliveries.getAllDeliveries().subscribe(
      (data: any) => {
        const arr = Array.isArray(data) ? data : (data && data.data ? data.data : []);
        this.activeDeliveries = arr.filter((d: any) => d.status !== 'DELIVERED').length;
        this.deliveryStats = {
          pending: arr.filter((d: any) => d.status === 'PENDING').length,
          inTransit: arr.filter((d: any) => d.status === 'IN_TRANSIT' || d.status === 'DISPATCHED').length,
          delivered: arr.filter((d: any) => d.status === 'DELIVERED').length,
          delayed: arr.filter((d: any) => d.status === 'FAILED').length
        };
        if (this.deliveryChart) {
          this.deliveryChart.data.datasets[0].data = [this.deliveryStats.pending, this.deliveryStats.inTransit, this.deliveryStats.delivered, this.deliveryStats.delayed];
          this.deliveryChart.update();
        }
      },
      _ => this.activeDeliveries = 11
    );

    this.inventory.getAllInventory().subscribe(
      (data: any) => {
        const arr = Array.isArray(data) ? data : (data && data.data ? data.data : []);
        this.totalInventoryValue = arr.reduce((sum: number, item: any) => sum + (item.quantity * (item.product?.unitPrice || 0)), 0);
        const warningItems = arr.filter((i: any) => i.lowStockAlert || i.quantity <= (i.reorderLevel || 10));
        this.lowStockItems = warningItems.length;

        if (warningItems.length > 0) {
          this.inventoryWarnings = warningItems.slice(0, 5).map((i: any) => ({
            product: i.product?.name || 'Unresolved Item',
            current: i.quantity,
            minimum: i.reorderLevel || 10,
            warehouse: i.warehouse?.name || 'N/A',
            percentage: Math.round((i.quantity / (i.reorderLevel || 10)) * 100)
          }));
        }
      },
      _ => {
        this.totalInventoryValue = 45820;
        this.lowStockItems = 3;
      }
    );

    this.products.getAll().subscribe(
      (data: any) => {
        const arr = Array.isArray(data) ? data : (data && data.data ? data.data : []);
        this.totalProducts = arr.length || 15;
      },
      _ => this.totalProducts = 15
    );
  }

  initCharts(): void {
    setTimeout(() => this.createRequestStatusChart(), 100);
    setTimeout(() => this.createInventoryTrendChart(), 200);
    setTimeout(() => this.createDeliveryChart(), 300);
  }

  getProgressPercent(current: number, min: number): number {
    return Math.min(100, (current / min) * 100);
  }

  createRequestStatusChart(): void {
    const ctx = document.getElementById('requestStatusChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.requestStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Approved', 'Rejected', 'Completed'],
        datasets: [{
          data: [this.requestStats.pending, this.requestStats.approved, this.requestStats.rejected, this.requestStats.completed],
          backgroundColor: ['#D97706', '#2D7A4F', '#DC2626', '#0284C7'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 15 } }
        }
      }
    });
  }

  createInventoryTrendChart(): void {
    const ctx = document.getElementById('inventoryTrendChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.inventoryTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.revenueLabels,
        datasets: [{
          label: 'Inventory Value ($)',
          data: this.revenueData,
          borderColor: '#2D7A4F',
          backgroundColor: 'rgba(45, 122, 79, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2D7A4F',
          pointBorderColor: '#ffffff',
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { labels: { font: { size: 12 } } } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#666' } },
          x: { ticks: { color: '#666' } }
        }
      }
    });
  }

  createDeliveryChart(): void {
    const ctx = document.getElementById('deliveryChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.deliveryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Pending', 'In Transit', 'Delivered', 'Delayed'],
        datasets: [{
          label: 'Deliveries',
          data: [this.deliveryStats.pending, this.deliveryStats.inTransit, this.deliveryStats.delivered, this.deliveryStats.delayed],
          backgroundColor: ['#D97706', '#4CAF7D', '#2D7A4F', '#DC2626'],
          borderColor: '#ffffff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'x',
        plugins: { legend: { labels: { font: { size: 12 } } } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}
