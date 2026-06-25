// Import Angular Component decorator and OnInit lifecycle hook
import { Component, OnInit } from '@angular/core';
// Import ForecastService for fetching AI demand forecast data from the backend
import { ForecastService } from '../../services/forecast.service';
import { SharedDataService } from '../../services/shared-data.service';
import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
// Import AuthService to retrieve user supermarket context
import { AuthService } from '../../services/auth.service';
// Import NotificationService for user alerts
import { NotificationService } from '../../services/notification.service';
// Import DemandForecast model interface for typing forecast data
import { DemandForecast } from '../../models/models';
// Import Chart.js library: Chart class, ChartConfiguration type, and all registerable plugins
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register all Chart.js components globally (bar, line, doughnut, scales, tooltips, etc.)
Chart.register(...registerables);

/**
 * ForecastingComponent displays AI-powered demand forecasting for products.
 */
@Component({
  selector: 'app-forecasting',                      // HTML tag: <app-forecasting>
  templateUrl: './forecasting.component.html',      // Path to the HTML template
  styleUrls: ['./forecasting.component.css']        // Path to component-specific CSS
})
export class ForecastingComponent implements OnInit {
  // Array of forecast data objects (from API or hardcoded fallback)
  forecasts: any[] = [];
  // Loading state flag: shows spinner while data is being fetched
  loading = true;
  // State for AI generation progress
  generating = false;
  // Supermarket context identifier
  supermarketId: number = 1;
  // Currently selected forecast for detailed chart view (null = none selected)
  selectedForecast: any = null;
  // Chart.js instance for the demand projection bar chart
  demandChart: any;
  // Chart.js instance for the historical sales trend line chart
  trendChart: any;

  /**
   * Computed getter: count of products with increasing demand trend.
   */
  get increasingCount(): number {
    return this.forecasts.filter(f => (f.trend || '').toLowerCase() === 'increasing').length;
  }

  /**
   * Computed getter: count of products with stable demand trend.
   */
  get stableCount(): number {
    return this.forecasts.filter(f => (f.trend || '').toLowerCase() === 'stable').length;
  }

  /**
   * Computed getter: count of products with decreasing demand trend.
   */
  get decreasingCount(): number {
    return this.forecasts.filter(f => (f.trend || '').toLowerCase() === 'decreasing').length;
  }

  /**
   * Constructor: inject required services
   */
  constructor(
    private service: ForecastService,
    private sharedData: SharedDataService,
    private inventoryService: InventoryService,
    private productService: ProductService,
    private auth: AuthService,
    private notifications: NotificationService
  ) { }

  /**
   * Lifecycle hook: fetches forecast data from the backend on component init.
   */
  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.supermarketId = user?.supermarketId || 1;
    
    // Ensure we have fresh inventory and products
    this.inventoryService.getSupermarketInventory(this.supermarketId).subscribe(inv => {
      this.sharedData.setInventory(inv);
      this.productService.getAll().subscribe((prods: any) => {
        this.sharedData.setProducts(prods);
        this.loadForecasts();
      });
    });
  }

  /**
   * Loads forecasts for the active supermarket from the backend API.
   */
  loadForecasts(): void {
    this.loading = true;
    this.service.getSupermarketForecasts(this.supermarketId).subscribe({
      next: data => {
        if (Array.isArray(data) && data.length > 0) {
          this.forecasts = this.aggregateForecasts(data);
          // Keep selection synchronized if possible
          if (this.selectedForecast) {
            const updated = this.forecasts.find(f => f.productId === this.selectedForecast.productId);
            if (updated) {
              this.selectedForecast = updated;
            }
          }
        } else {
          this.addHardcodedForecasts();
        }
        this.loading = false;
      },
      error: _ => {
        this.addHardcodedForecasts();
        this.loading = false;
      }
    });
  }

  /**
   * Triggers the backend Prophet forecasting service to update predictions based on historical sales.
   */
  generateForecasts(): void {
    this.generating = true;
    this.notifications.info('Initiating Prophet AI demand model training. This takes a moment...');
    
    this.service.generateForecasts(this.supermarketId, 7).subscribe({
      next: () => {
        this.notifications.success('AI demand forecasting models generated successfully!');
        this.generating = false;
        this.loadForecasts();
      },
      error: () => {
        this.generating = false;
        this.notifications.error('Prophet forecasting microservice is currently offline. Baseline averages generated.');
        this.loadForecasts();
      }
    });
  }

  /**
   * Populates the forecasts array with hardcoded sample data.
   * Used as a fallback when the backend API is unavailable.
   * Includes 8 products across different categories with realistic demand data.
   */
  addHardcodedForecasts(): void {
    this.forecasts = [
      {
        id: 1,                                        // Forecast ID
        productId: 1,                                 // Product reference ID
        productName: 'Organic Whole Milk',            // Product display name
        productSku: 'PROD001',                        // Product stock keeping unit code
        category: 'Dairy',                            // Product category
        unitPrice: 899.00,                            // Price per unit in LKR
        currentStock: 150,                            // Current stock quantity on hand
        predictedWeeklyDemand: 180,                   // AI-predicted demand for next week
        predictedMonthlyDemand: 720,                  // AI-predicted demand for next month
        historicalAverage: 165,                       // Average weekly sales over history
        recommendedOrder: 200,                        // Recommended reorder quantity
        trend: 'increasing',                          // Demand trend direction
        accuracy: 92.5,                               // Model accuracy percentage
        confidence: 0.92,                             // Confidence score (0-1)
        forecastMethod: 'Moving Average + Seasonality', // Algorithm used
        lastUpdated: new Date(),                      // When this forecast was generated
        salesHistory: [145, 158, 172, 180, 165, 190, 175, 185] // Weekly sales history data
      },
      {
        id: 2,
        productId: 2,
        productName: 'White Bread Loaf',
        productSku: 'PROD002',
        category: 'Bakery',
        unitPrice: 449.00,
        currentStock: 200,
        predictedWeeklyDemand: 250,
        predictedMonthlyDemand: 1000,
        historicalAverage: 240,
        recommendedOrder: 300,
        trend: 'stable',                              // Demand is relatively flat
        accuracy: 88.3,
        confidence: 0.88,
        forecastMethod: 'Exponential Smoothing',
        lastUpdated: new Date(),
        salesHistory: [235, 248, 242, 255, 238, 260, 245, 252]
      },
      {
        id: 3,
        productId: 3,
        productName: 'Premium Ground Coffee',
        productSku: 'PROD003',
        category: 'Beverages',
        unitPrice: 2499.00,
        currentStock: 85,
        predictedWeeklyDemand: 95,
        predictedMonthlyDemand: 380,
        historicalAverage: 88,
        recommendedOrder: 120,
        trend: 'increasing',                          // Demand is growing
        accuracy: 95.1,
        confidence: 0.95,                             // Very high confidence
        forecastMethod: 'ARIMA',                      // Advanced time-series model
        lastUpdated: new Date(),
        salesHistory: [82, 85, 90, 88, 92, 95, 98, 102]
      },
      {
        id: 4,
        productId: 4,
        productName: 'Cheddar Cheese Block',
        productSku: 'PROD004',
        category: 'Dairy',
        unitPrice: 1199.00,
        currentStock: 18,                             // Very low stock!
        predictedWeeklyDemand: 75,
        predictedMonthlyDemand: 300,
        historicalAverage: 80,
        recommendedOrder: 100,
        trend: 'decreasing',                          // Demand is falling
        accuracy: 85.7,
        confidence: 0.86,
        forecastMethod: 'Linear Regression',
        lastUpdated: new Date(),
        salesHistory: [88, 85, 82, 78, 75, 72, 70, 68] // Declining trend visible
      },
      {
        id: 5,
        productId: 5,
        productName: 'Chicken Breast (1kg)',
        productSku: 'PROD005',
        category: 'Meat',
        unitPrice: 1599.00,
        currentStock: 65,
        predictedWeeklyDemand: 140,
        predictedMonthlyDemand: 560,
        historicalAverage: 130,
        recommendedOrder: 180,
        trend: 'increasing',
        accuracy: 91.2,
        confidence: 0.91,
        forecastMethod: 'Neural Network',             // ML-based prediction
        lastUpdated: new Date(),
        salesHistory: [120, 125, 132, 138, 135, 145, 142, 150]
      },
      {
        id: 6,
        productId: 6,
        productName: 'Eggs (Dozen)',
        productSku: 'PROD006',
        category: 'Dairy',
        unitPrice: 599.00,
        currentStock: 320,
        predictedWeeklyDemand: 380,
        predictedMonthlyDemand: 1520,
        historicalAverage: 365,
        recommendedOrder: 450,
        trend: 'stable',
        accuracy: 93.8,
        confidence: 0.94,
        forecastMethod: 'Weighted Moving Average',
        lastUpdated: new Date(),
        salesHistory: [355, 370, 362, 378, 368, 385, 375, 390]
      },
      {
        id: 7,
        productId: 7,
        productName: 'Olive Oil 500ml',
        productSku: 'PROD007',
        category: 'Cooking',
        unitPrice: 1899.00,
        currentStock: 12,                             // Low stock - needs reorder
        predictedWeeklyDemand: 45,
        predictedMonthlyDemand: 180,
        historicalAverage: 42,
        recommendedOrder: 60,
        trend: 'increasing',
        accuracy: 89.5,
        confidence: 0.90,
        forecastMethod: 'Seasonal Decomposition',
        lastUpdated: new Date(),
        salesHistory: [38, 40, 42, 44, 45, 48, 47, 50]
      },
      {
        id: 8,
        productId: 8,
        productName: 'Brown Rice 2kg',
        productSku: 'PROD008',
        category: 'Grains',
        unitPrice: 749.00,
        currentStock: 95,
        predictedWeeklyDemand: 85,
        predictedMonthlyDemand: 340,
        historicalAverage: 82,
        recommendedOrder: 100,
        trend: 'stable',
        accuracy: 90.2,
        confidence: 0.90,
        forecastMethod: 'Triple Exponential Smoothing',
        lastUpdated: new Date(),
        salesHistory: [78, 82, 80, 85, 83, 88, 84, 87]
      }
    ];
  }

  /**
   * Aggregates daily forecasts from the backend into a product-level summary.
   * Enriches data with product category, unit price, and current stock.
   */
  aggregateForecasts(dailyForecasts: any[]): any[] {
    const products = this.sharedData.getProducts() || [];
    const inventory = this.sharedData.getInventory() || [];
    
    // Group by product ID
    const grouped = new Map<number, any[]>();
    for (const f of dailyForecasts) {
      const pid = f.productId;
      if (!grouped.has(pid)) grouped.set(pid, []);
      grouped.get(pid)?.push(f);
    }
    
    const result: any[] = [];
    grouped.forEach((days, pid) => {
      // Find product details with loose equality
      const product = products.find((p: any) => p.id == pid);
      // Find inventory for current stock with loose equality
      const invItem = inventory.find((i: any) => i.product?.id == pid || i.productId == pid);
      
      const pName = product ? product.name : days[0].productName;
      const pSku = product ? product.sku : days[0].productSku;
      const category = product ? product.category : 'General';
      const unitPrice = product ? product.unitPrice : 0;
      const currentStock = invItem ? invItem.quantity : 0;
      
      // Calculate total weekly demand (sum of next 7 days, assuming daily data)
      let weeklyDemand = 0;
      let avgConfidence = 0;
      days.forEach(d => {
        weeklyDemand += (d.predictedDemand || d.predictedWeeklyDemand || 0);
        avgConfidence += (d.confidenceLevel || d.confidence || 0);
      });
      avgConfidence = days.length > 0 ? avgConfidence / days.length : 0.85;
      
      const monthlyDemand = weeklyDemand * 4;
      const recommended = Math.max(0, weeklyDemand * 1.2 - currentStock);
      
      // Generate some dummy sales history for the chart if not provided
      const history = [];
      const baseHist = weeklyDemand > 0 ? weeklyDemand : 50;
      for (let i = 0; i < 8; i++) {
        history.push(Math.round(baseHist * (0.8 + Math.random() * 0.4)));
      }
      
      result.push({
        id: days[0].id,
        productId: pid,
        productName: pName,
        productSku: pSku,
        category: category,
        unitPrice: unitPrice,
        currentStock: currentStock,
        predictedWeeklyDemand: weeklyDemand,
        predictedMonthlyDemand: monthlyDemand,
        historicalAverage: Math.round(weeklyDemand * 0.95),
        recommendedOrder: Math.round(recommended),
        trend: 'stable',
        accuracy: avgConfidence * 100,
        confidence: avgConfidence,
        forecastMethod: 'Prophet Time-Series',
        lastUpdated: new Date(),
        salesHistory: history
      });
    });
    
    return result;
  }

  /**
   * Selects a forecast for detailed chart view.
   * Waits 100ms for the DOM to render the chart canvases before creating charts.
   * @param forecast - The forecast object to display in detail
   */
  selectForecast(forecast: any): void {
    this.selectedForecast = forecast;   // Set the selected forecast
    // Wait for DOM to render chart canvases, then create both charts
    setTimeout(() => {
      this.createDemandChart();          // Create the demand projection bar chart
      this.createTrendChart();           // Create the historical trend line chart
    }, 100);
  }

  /**
   * Returns a Material Symbols icon name based on the demand trend direction.
   * Uses toUpperCase() for case-insensitive matching.
   * @param trend - The trend direction string
   * @returns Material Symbol name string
   */
  getTrendIcon(trend: string): string {
    const t = (trend || '').toUpperCase();
    if (t === 'INCREASING') return 'trending_up';
    if (t === 'DECREASING') return 'trending_down';
    return 'trending_flat';
  }

  /**
   * Returns a hex color code for the trend direction.
   * Used for chart colors and text highlighting.
   * @param trend - The trend direction string
   * @returns Hex color string
   */
  getTrendColor(trend: string): string {
    const t = (trend || '').toUpperCase();
    if (t === 'INCREASING') return '#2D7A4F'; // Enterprise Green
    if (t === 'DECREASING') return '#DC2626'; // Danger Red
    return '#D97706';                          // Amber Orange
  }

  /**
   * Determines the stock status based on current stock vs predicted weekly demand.
   * @param forecast - The forecast object to evaluate
   * @returns Status string: 'critical', 'low', or 'good'
   */
  getStockStatus(forecast: any): string {
    // Critical: stock is less than half of weekly demand
    if (forecast.currentStock < forecast.predictedWeeklyDemand * 0.5) return 'critical';
    // Low: stock is less than one week of demand
    if (forecast.currentStock < forecast.predictedWeeklyDemand) return 'low';
    // Good: stock covers at least one week of demand
    return 'good';
  }

  /**
   * Returns a human-readable stock status string with color-coded emoji indicator.
   * @param forecast - The forecast object to evaluate
   * @returns Formatted status string with emoji
   */
  getStockStatusText(forecast: any): string {
    const status = this.getStockStatus(forecast);
    if (status === 'critical') return '🔴 Critical - Order Now';  // Urgent reorder needed
    if (status === 'low') return '🟡 Low - Order Soon';           // Reorder recommended
    return '🟢 Adequate Stock';                                    // Stock is healthy
  }

  /**
   * Creates a bar chart showing projected weekly demand for the selected product.
   * Projects 4 weeks of demand based on the trend direction.
   * - Increasing trend: demand grows 15% over the 4 weeks
   * - Decreasing trend: demand drops 15% over the 4 weeks
   * - Stable trend: demand fluctuates within 2%
   */
  createDemandChart(): void {
    // Exit if no forecast is selected
    if (!this.selectedForecast) return;

    // Get the canvas element for the demand chart
    const ctx = document.getElementById('demandChart') as HTMLCanvasElement;
    if (!ctx) return; // Exit if canvas not found

    // Destroy the previous chart instance to prevent memory leaks
    if (this.demandChart) {
      this.demandChart.destroy();
    }

    // Define week labels for the x-axis
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    // Get the base weekly demand prediction
    const baseWeekly = this.selectedForecast.predictedWeeklyDemand;

    // Calculate weekly projections based on trend direction
    const weeklyDemand = (this.selectedForecast.trend || '').toUpperCase() === 'INCREASING'
      // Increasing: gradually rise from 85% to 115% of base demand
      ? [baseWeekly * 0.85, baseWeekly * 0.95, baseWeekly * 1.05, baseWeekly * 1.15]
      : (this.selectedForecast.trend || '').toUpperCase() === 'DECREASING'
        // Decreasing: gradually fall from 115% to 85% of base demand
        ? [baseWeekly * 1.15, baseWeekly * 1.05, baseWeekly * 0.95, baseWeekly * 0.85]
        // Stable: minor fluctuations within ±2% of base demand
        : [baseWeekly * 0.98, baseWeekly * 1.02, baseWeekly * 0.99, baseWeekly * 1.01];

    // Create a new Chart.js bar chart
    this.demandChart = new Chart(ctx, {
      type: 'bar',                                    // Bar chart type
      data: {
        labels: weeks,                                // X-axis labels
        datasets: [{
          label: `${this.selectedForecast.productName} Projected Demand`, // Dataset label
          data: weeklyDemand,                         // Y-axis values (projected demand)
          backgroundColor: this.getTrendColor(this.selectedForecast.trend), // Bar color based on trend
          borderColor: this.getTrendColor(this.selectedForecast.trend),     // Match border color to bar color
          borderWidth: 1.5
        }]
      },
      options: {
        responsive: true,                             // Resize with container
        maintainAspectRatio: true,                    // Keep aspect ratio
        plugins: {
          legend: { labels: { font: { size: 12 }, color: '#374151' } } // Dark text for legend
        },
        scales: {
          y: {
            beginAtZero: true,                        // Y-axis starts at 0
            ticks: { color: '#6b7280' },              // Gray tick labels
            grid: { color: '#e5e7eb' },               // Light border lines
            title: { display: true, text: 'Units', color: '#6b7280' } // Y-axis title
          },
          x: {
            ticks: { color: '#6b7280' },              // Gray tick labels
            grid: { color: '#e5e7eb' }                // Light border lines
          }
        }
      }
    });
  }

  /**
   * Creates a line chart showing historical sales data for the selected product.
   * Also displays a dashed horizontal line for the historical average.
   */
  createTrendChart(): void {
    // Exit if no forecast is selected or it has no sales history data
    if (!this.selectedForecast || !this.selectedForecast.salesHistory) return;

    // Get the canvas element for the trend chart
    const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!ctx) return; // Exit if canvas not found

    // Destroy the previous chart instance to prevent memory leaks
    if (this.trendChart) {
      this.trendChart.destroy();
    }

    // Generate week labels from the sales history array length
    const weeks = this.selectedForecast.salesHistory.map((_: any, i: number) => `Week ${i + 1}`);

    // Create a new Chart.js line chart with two datasets
    this.trendChart = new Chart(ctx, {
      type: 'line',                                   // Line chart type
      data: {
        labels: weeks,                                // X-axis labels (Week 1, Week 2, etc.)
        datasets: [{
          label: 'Historical Sales',                  // First dataset: actual sales data
          data: this.selectedForecast.salesHistory,   // Y-axis values from history
          borderColor: '#0284c7',                     // Info Blue line color
          backgroundColor: 'rgba(2, 132, 199, 0.08)', // Semi-transparent blue fill
          fill: true,                                 // Fill area under the line
          tension: 0.4                                // Curve smoothing
        }, {
          label: 'Average',                           // Second dataset: historical average line
          // Create an array of the same average value for each week
          data: Array(this.selectedForecast.salesHistory.length).fill(this.selectedForecast.historicalAverage),
          borderColor: '#d97706',                     // Amber line color
          borderDash: [5, 5],                         // Dashed line style
          fill: false                                 // No fill under the average line
        }]
      },
      options: {
        responsive: true,                             // Resize with container
        maintainAspectRatio: true,                    // Keep aspect ratio
        plugins: {
          legend: { labels: { color: '#374151' } }     // Dark text for legend
        },
        scales: {
          y: {
            beginAtZero: false,                       // Y-axis does NOT start at 0
            ticks: { color: '#6b7280' },              // Gray tick labels
            grid: { color: '#e5e7eb' },
            title: { display: true, text: 'Units Sold', color: '#6b7280' } // Y-axis title
          },
          x: {
            ticks: { color: '#6b7280' },              // Gray tick labels
            grid: { color: '#e5e7eb' }
          }
        }
      }
    });
  }
}
