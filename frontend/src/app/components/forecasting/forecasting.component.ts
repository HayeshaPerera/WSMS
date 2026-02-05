import { Component, OnInit } from '@angular/core';
import { ForecastService } from '../../services/forecast.service';
import { SharedDataService } from '../../services/shared-data.service';
import { DemandForecast } from '../../models/models';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-forecasting',
  templateUrl: './forecasting.component.html',
  styleUrls: ['./forecasting.component.css']
})
export class ForecastingComponent implements OnInit {
  forecasts: any[] = [];
  loading = true;
  selectedForecast: any = null;
  demandChart: any;
  trendChart: any;

  // Computed getters for template use (Angular templates cannot use arrow functions)
  get increasingCount(): number {
    return this.forecasts.filter(f => f.trend === 'increasing').length;
  }

  get stableCount(): number {
    return this.forecasts.filter(f => f.trend === 'stable').length;
  }

  get decreasingCount(): number {
    return this.forecasts.filter(f => f.trend === 'decreasing').length;
  }

  constructor(
    private service: ForecastService,
    private sharedData: SharedDataService
  ) {}

  ngOnInit(): void {
    this.service.getAllForecasts().subscribe({
      next: data => { 
        if (Array.isArray(data) && data.length > 0) {
          this.forecasts = data;
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

  addHardcodedForecasts(): void {
    this.forecasts = [
      { 
        id: 1,
        productId: 1, 
        productName: 'Organic Whole Milk', 
        productSku: 'PROD001',
        category: 'Dairy',
        unitPrice: 899.00,
        currentStock: 150,
        predictedWeeklyDemand: 180, 
        predictedMonthlyDemand: 720, 
        historicalAverage: 165,
        recommendedOrder: 200,
        trend: 'increasing', 
        accuracy: 92.5, 
        confidence: 0.92,
        forecastMethod: 'Moving Average + Seasonality',
        lastUpdated: new Date(),
        salesHistory: [145, 158, 172, 180, 165, 190, 175, 185]
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
        trend: 'stable', 
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
        trend: 'increasing', 
        accuracy: 95.1, 
        confidence: 0.95,
        forecastMethod: 'ARIMA',
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
        currentStock: 18,
        predictedWeeklyDemand: 75, 
        predictedMonthlyDemand: 300, 
        historicalAverage: 80,
        recommendedOrder: 100,
        trend: 'decreasing', 
        accuracy: 85.7, 
        confidence: 0.86,
        forecastMethod: 'Linear Regression',
        lastUpdated: new Date(),
        salesHistory: [88, 85, 82, 78, 75, 72, 70, 68]
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
        forecastMethod: 'Neural Network',
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
        currentStock: 12,
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

  selectForecast(forecast: any): void {
    this.selectedForecast = forecast;
    setTimeout(() => {
      this.createDemandChart();
      this.createTrendChart();
    }, 100);
  }

  getTrendIcon(trend: string): string {
    if (trend === 'increasing') return '📈';
    if (trend === 'decreasing') return '📉';
    return '➡️';
  }

  getTrendColor(trend: string): string {
    if (trend === 'increasing') return '#4CAF50';
    if (trend === 'decreasing') return '#F44336';
    return '#FFB347';
  }

  getStockStatus(forecast: any): string {
    if (forecast.currentStock < forecast.predictedWeeklyDemand * 0.5) return 'critical';
    if (forecast.currentStock < forecast.predictedWeeklyDemand) return 'low';
    return 'good';
  }

  getStockStatusText(forecast: any): string {
    const status = this.getStockStatus(forecast);
    if (status === 'critical') return '🔴 Critical - Order Now';
    if (status === 'low') return '🟡 Low - Order Soon';
    return '🟢 Adequate Stock';
  }

  createDemandChart(): void {
    if (!this.selectedForecast) return;
    
    const ctx = document.getElementById('demandChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.demandChart) {
      this.demandChart.destroy();
    }

    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const baseWeekly = this.selectedForecast.predictedWeeklyDemand;
    const weeklyDemand = this.selectedForecast.trend === 'increasing' 
      ? [baseWeekly * 0.85, baseWeekly * 0.95, baseWeekly * 1.05, baseWeekly * 1.15]
      : this.selectedForecast.trend === 'decreasing'
      ? [baseWeekly * 1.15, baseWeekly * 1.05, baseWeekly * 0.95, baseWeekly * 0.85]
      : [baseWeekly * 0.98, baseWeekly * 1.02, baseWeekly * 0.99, baseWeekly * 1.01];

    this.demandChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeks,
        datasets: [{
          label: `${this.selectedForecast.productName} Projected Demand`,
          data: weeklyDemand,
          backgroundColor: this.getTrendColor(this.selectedForecast.trend),
          borderColor: '#FFD700',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { font: { size: 12 }, color: '#fff' } }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: { color: '#aaa' },
            title: { display: true, text: 'Units', color: '#aaa' }
          },
          x: { 
            ticks: { color: '#aaa' }
          }
        }
      }
    });
  }

  createTrendChart(): void {
    if (!this.selectedForecast || !this.selectedForecast.salesHistory) return;
    
    const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    const weeks = this.selectedForecast.salesHistory.map((_: any, i: number) => `Week ${i + 1}`);

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeks,
        datasets: [{
          label: 'Historical Sales',
          data: this.selectedForecast.salesHistory,
          borderColor: '#4FC3F7',
          backgroundColor: 'rgba(79, 195, 247, 0.1)',
          fill: true,
          tension: 0.4
        }, {
          label: 'Average',
          data: Array(this.selectedForecast.salesHistory.length).fill(this.selectedForecast.historicalAverage),
          borderColor: '#FFB347',
          borderDash: [5, 5],
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: '#fff' } }
        },
        scales: {
          y: { 
            beginAtZero: false,
            ticks: { color: '#aaa' },
            title: { display: true, text: 'Units Sold', color: '#aaa' }
          },
          x: { 
            ticks: { color: '#aaa' }
          }
        }
      }
    });
  }
}
