// Import Angular Component decorator and OnInit lifecycle hook
import { Component, OnInit } from '@angular/core';
// Import ForecastService for fetching AI demand forecast data from the backend
import { ForecastService } from '../../services/forecast.service';
// Import SharedDataService for accessing shared data streams (inventory, etc.)
import { SharedDataService } from '../../services/shared-data.service';
// Import DemandForecast model interface for typing forecast data
import { DemandForecast } from '../../models/models';
// Import Chart.js library: Chart class, ChartConfiguration type, and all registerable plugins
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register all Chart.js components globally (bar, line, doughnut, scales, tooltips, etc.)
Chart.register(...registerables);

/**
 * ForecastingComponent displays AI-powered demand forecasting for products.
 *
 * Features:
 * - Summary cards showing count of products with increasing, stable, and decreasing trends
 * - Product forecast cards with demand predictions, stock status, and confidence levels
 * - Detailed view with demand projection bar chart and historical trend line chart
 * - Falls back to hardcoded sample data if the backend API is unavailable
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
  // Currently selected forecast for detailed chart view (null = none selected)
  selectedForecast: any = null;
  // Chart.js instance for the demand projection bar chart
  demandChart: any;
  // Chart.js instance for the historical sales trend line chart
  trendChart: any;

  /**
   * Computed getter: count of products with increasing demand trend.
   * Normalizes trend to lowercase for case-insensitive comparison
   * (API returns 'INCREASING', hardcoded uses 'increasing').
   */
  get increasingCount(): number {
    return this.forecasts.filter(f => (f.trend || '').toLowerCase() === 'increasing').length;
  }

  /**
   * Computed getter: count of products with stable demand trend.
   * Uses lowercase normalization for case-insensitive matching.
   */
  get stableCount(): number {
    return this.forecasts.filter(f => (f.trend || '').toLowerCase() === 'stable').length;
  }

  /**
   * Computed getter: count of products with decreasing demand trend.
   * Uses lowercase normalization for case-insensitive matching.
   */
  get decreasingCount(): number {
    return this.forecasts.filter(f => (f.trend || '').toLowerCase() === 'decreasing').length;
  }

  /**
   * Constructor: inject required services
   * @param service - ForecastService for backend API communication
   * @param sharedData - SharedDataService for accessing shared inventory data
   */
  constructor(
    private service: ForecastService,
    private sharedData: SharedDataService
  ) { }

  /**
   * Lifecycle hook: fetches forecast data from the backend on component init.
   * If the API returns data, uses it directly.
   * If the API returns empty or fails, falls back to hardcoded sample data.
   */
  ngOnInit(): void {
    // Call the ForecastService to get all forecast predictions
    this.service.getAllForecasts().subscribe({
      next: data => {
        // Check if the API returned a non-empty array
        if (Array.isArray(data) && data.length > 0) {
          this.forecasts = data;           // Use real API data
        } else {
          this.addHardcodedForecasts();     // Fallback to sample data
        }
        this.loading = false;              // Hide loading spinner
      },
      error: _ => {
        // On API error, use hardcoded sample data as fallback
        this.addHardcodedForecasts();
        this.loading = false;              // Hide loading spinner
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
   * Returns an emoji icon based on the demand trend direction.
   * Uses toUpperCase() for case-insensitive matching to handle both
   * API responses ('INCREASING') and hardcoded data ('increasing').
   * @param trend - The trend direction string
   * @returns Emoji string representing the trend
   */
  getTrendIcon(trend: string): string {
    const t = (trend || '').toUpperCase(); // Normalize to uppercase
    if (t === 'INCREASING') return '📈';   // Chart going up emoji
    if (t === 'DECREASING') return '📉';   // Chart going down emoji
    return '➡️';                           // Right arrow for stable
  }

  /**
   * Returns a hex color code for the trend direction.
   * Used for chart colors and text highlighting.
   * @param trend - The trend direction string
   * @returns Hex color string
   */
  getTrendColor(trend: string): string {
    const t = (trend || '').toUpperCase(); // Normalize to uppercase
    if (t === 'INCREASING') return '#4CAF50'; // Green for growth
    if (t === 'DECREASING') return '#F44336'; // Red for decline
    return '#FFB347';                          // Orange for stable
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
          borderColor: '#FFD700',                     // Gold border for premium feel
          borderWidth: 2                              // Border thickness
        }]
      },
      options: {
        responsive: true,                             // Resize with container
        maintainAspectRatio: true,                    // Keep aspect ratio
        plugins: {
          legend: { labels: { font: { size: 12 }, color: '#fff' } } // White legend text
        },
        scales: {
          y: {
            beginAtZero: true,                        // Y-axis starts at 0
            ticks: { color: '#aaa' },                 // Gray tick labels
            title: { display: true, text: 'Units', color: '#aaa' } // Y-axis title
          },
          x: {
            ticks: { color: '#aaa' }                  // Gray tick labels
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
          borderColor: '#4FC3F7',                     // Light blue line color
          backgroundColor: 'rgba(79, 195, 247, 0.1)', // Semi-transparent blue fill
          fill: true,                                 // Fill area under the line
          tension: 0.4                                // Curve smoothing
        }, {
          label: 'Average',                           // Second dataset: historical average line
          // Create an array of the same average value for each week
          data: Array(this.selectedForecast.salesHistory.length).fill(this.selectedForecast.historicalAverage),
          borderColor: '#FFB347',                     // Orange line color
          borderDash: [5, 5],                         // Dashed line style
          fill: false                                 // No fill under the average line
        }]
      },
      options: {
        responsive: true,                             // Resize with container
        maintainAspectRatio: true,                    // Keep aspect ratio
        plugins: {
          legend: { labels: { color: '#fff' } }       // White legend text
        },
        scales: {
          y: {
            beginAtZero: false,                       // Y-axis does NOT start at 0 (shows actual range)
            ticks: { color: '#aaa' },                 // Gray tick labels
            title: { display: true, text: 'Units Sold', color: '#aaa' } // Y-axis title
          },
          x: {
            ticks: { color: '#aaa' }                  // Gray tick labels
          }
        }
      }
    });
  }
}
