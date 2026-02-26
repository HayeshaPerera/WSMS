// Import Angular Component decorator and OnInit lifecycle hook
import { Component, OnInit } from '@angular/core';
// Import SalesService and SaleRecord interface for sales API communication
import { SalesService, SaleRecord } from '../../services/sales.service';
// Import ForecastService for fetching AI demand forecast predictions
import { ForecastService } from '../../services/forecast.service';
// Import ProductService for loading the products dropdown list
import { ProductService } from '../../services/product.service';
// Import SupermarketService for loading the supermarkets/stores dropdown list
import { SupermarketService } from '../../services/supermarket.service';
// Import NotificationService for showing toast notifications on success/error
import { NotificationService } from '../../services/notification.service';
// Import AuthService for role-based access control in the template
import { AuthService } from '../../services/auth.service';
// Import DemandForecast model for typing forecast data
import { DemandForecast } from '../../models/models';
// Import Chart.js library and register all chart types globally
import { Chart, registerables } from 'chart.js';
// Import forkJoin for running multiple observables in parallel (available for future use)
import { forkJoin } from 'rxjs';

// Register all Chart.js components (bar, line, doughnut, scales, tooltips, etc.)
Chart.register(...registerables);

/**
 * SalesForecastingComponent provides a combined Sales Analytics and AI Demand Forecasting dashboard.
 *
 * Features:
 * - Sales table with real-time data from backend
 * - KPI summary cards (total revenue, units sold, avg order value, top product)
 * - Revenue over time line chart, top products bar chart, by-store doughnut chart
 * - Record new sale form
 * - AI Demand Forecast tab showing predicted demand, confidence, and recommendations
 * - Filters by product, supermarket, date range, and free-text search
 */
@Component({
    selector: 'app-sales-forecasting',           // HTML tag name: <app-sales-forecasting>
    templateUrl: './sales-forecasting.component.html',  // Path to the HTML template
    styleUrls: ['./sales-forecasting.component.css']    // Path to component-specific CSS
})
export class SalesForecastingComponent implements OnInit {

    // ========== Sales Data Properties ==========

    sales: SaleRecord[] = [];            // Full list of sales records from the backend
    filteredSales: SaleRecord[] = [];    // Sales records after applying filters (displayed in table)
    loading = true;                      // Whether sales data is currently being loaded

    // ========== Forecasting Data Properties ==========

    forecasts: DemandForecast[] = [];    // AI demand forecast data from the backend
    forecastLoading = true;              // Whether forecast data is currently being loaded

    // ========== Filter Properties ==========

    searchTerm = '';                     // Free-text search input value
    selectedProduct = '';                // Currently selected product filter (product ID as string)
    selectedSupermarket = '';            // Currently selected supermarket filter (supermarket ID as string)
    startDate = '';                      // Start date filter value (YYYY-MM-DD format)
    endDate = '';                        // End date filter value (YYYY-MM-DD format)

    // ========== Dropdown Data ==========

    products: any[] = [];                // List of all products for the dropdown filter
    supermarkets: any[] = [];            // List of all supermarkets for the dropdown filter

    // ========== KPI (Key Performance Indicator) Values ==========

    totalRevenue = 0;                    // Sum of all filtered sale amounts
    totalUnitsSold = 0;                  // Sum of all filtered quantities sold
    avgOrderValue = 0;                   // Average sale amount (totalRevenue / number of sales)
    topProduct = '';                     // Name of the product with highest revenue

    // ========== Chart.js Chart Instances ==========

    revenueChart: any;                   // Chart.js instance for the revenue over time line chart
    topProductsChart: any;               // Chart.js instance for the top products bar chart
    bySupermarketChart: any;             // Chart.js instance for the by-store doughnut chart

    // ========== Record Sale Form Properties ==========

    showRecordForm = false;              // Whether the record sale form is visible
    newSale: SaleRecord = {              // Object holding the new sale form data
        productId: 0,                      // Selected product ID (0 = not selected)
        supermarketId: 0,                  // Selected supermarket ID (0 = not selected)
        saleDate: new Date().toISOString().split('T')[0], // Default to today's date
        quantitySold: 1,                   // Default quantity is 1 unit
        unitPrice: 0                       // Unit price (populated when product is selected)
    };

    // ========== View Control ==========

    activeTab: 'sales' | 'forecast' = 'sales'; // Currently active tab: 'sales' or 'forecast'

    /**
     * Constructor: inject all required services
     */
    constructor(
        private salesService: SalesService,           // Service for sales CRUD operations
        private forecastService: ForecastService,     // Service for fetching AI demand forecasts
        private productService: ProductService,       // Service for fetching product data
        private supermarketService: SupermarketService, // Service for fetching supermarket data
        private notifications: NotificationService,   // Service for showing toast notifications
        public auth: AuthService                      // Auth service (public for template access to role checks)
    ) { }

    /**
     * Angular lifecycle hook: called once when the component initializes.
     * Loads all required data: dropdown options, sales records, and forecasts.
     */
    ngOnInit(): void {
        this.loadDropdowns();   // Load product and supermarket dropdown options
        this.loadSales();       // Load all sales records from the backend
        this.loadForecasts();   // Load AI demand forecast data
    }

    /**
     * Loads products and supermarkets for the filter and form dropdowns.
     * Handles both direct array and wrapped {data: [...]} response formats.
     */
    loadDropdowns(): void {
        // Fetch all products from the backend
        this.productService.getAll().subscribe((data: any) => {
            // Extract array from response (handle both formats)
            const arr = Array.isArray(data) ? data : (data && data.data ? data.data : []);
            this.products = arr; // Store the products list
        });

        // Fetch all supermarkets from the backend
        this.supermarketService.getAll().subscribe((data: any) => {
            // Extract array from response (handle both formats)
            const arr = Array.isArray(data) ? data : (data && data.data ? data.data : []);
            this.supermarkets = arr; // Store the supermarkets list
        });
    }

    /**
     * Loads all sales records from the backend API.
     * On success: stores data, applies filters, computes KPIs, and initializes charts.
     * On error: shows an error notification.
     */
    loadSales(): void {
        this.loading = true; // Show loading spinner
        // Fetch all sales from the SalesService
        this.salesService.getAllSales().subscribe({
            next: (data: SaleRecord[]) => {
                this.sales = data;           // Store the full sales list
                this.applyFilters();         // Apply any active filters to create filteredSales
                this.computeKPIs();          // Calculate KPI values from filtered data
                this.loading = false;        // Hide loading spinner
                // Wait 200ms for DOM to render before initializing charts
                setTimeout(() => this.initSalesCharts(), 200);
            },
            error: () => {
                this.loading = false;        // Hide loading spinner even on error
                this.notifications.error('Failed to load sales data'); // Show error toast
            }
        });
    }

    /**
     * Loads AI demand forecast data from the backend API.
     * On error: shows a warning that cached predictions are being used.
     */
    loadForecasts(): void {
        this.forecastLoading = true; // Show loading spinner for forecasts
        // Fetch all forecasts from the ForecastService
        this.forecastService.getAllForecasts().subscribe({
            next: (data: any) => {
                // Handle both direct array and wrapped response formats
                const arr = Array.isArray(data) ? data : (data && data.data ? data.data : []);
                this.forecasts = arr;         // Store the forecast data
                this.forecastLoading = false;  // Hide loading spinner
            },
            error: () => {
                this.forecastLoading = false;  // Hide loading spinner
                this.notifications.warning('Forecast data unavailable — using cached predictions');
            }
        });
    }

    /**
     * Applies all active filters to the sales data.
     * Filters by: search term, product, supermarket, start date, and end date.
     * Updates the filteredSales array which is displayed in the table.
     */
    applyFilters(): void {
        // Start with the full sales list
        let result = [...this.sales];

        // Filter by search term (matches product name, SKU, supermarket name, or notes)
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase(); // Normalize search term to lowercase
            result = result.filter((s: any) =>
                (s.productName || '').toLowerCase().includes(term) ||      // Match product name
                (s.productSku || '').toLowerCase().includes(term) ||       // Match product SKU
                (s.supermarketName || '').toLowerCase().includes(term) ||  // Match supermarket name
                (s.notes || '').toLowerCase().includes(term)               // Match notes
            );
        }

        // Filter by selected product ID
        if (this.selectedProduct) {
            result = result.filter((s: any) => String(s.productId) === this.selectedProduct);
        }

        // Filter by selected supermarket ID
        if (this.selectedSupermarket) {
            result = result.filter((s: any) => String(s.supermarketId) === this.selectedSupermarket);
        }

        // Filter by start date (only include sales on or after this date)
        if (this.startDate) {
            result = result.filter((s: any) => s.saleDate >= this.startDate);
        }

        // Filter by end date (only include sales on or before this date)
        if (this.endDate) {
            result = result.filter((s: any) => s.saleDate <= this.endDate);
        }

        // Update the filtered list that the table displays
        this.filteredSales = result;
        // Recalculate KPIs based on the filtered data
        this.computeKPIs();
    }

    /**
     * Clears all filter inputs and resets to showing all sales.
     */
    clearFilters(): void {
        this.searchTerm = '';            // Clear search text
        this.selectedProduct = '';       // Clear product filter
        this.selectedSupermarket = '';   // Clear supermarket filter
        this.startDate = '';             // Clear start date
        this.endDate = '';               // Clear end date
        this.applyFilters();             // Re-apply (with no filters = show all)
    }

    /**
     * Computes Key Performance Indicators (KPIs) from the filtered sales data.
     * Calculates: total revenue, total units sold, average order value, and top product.
     */
    computeKPIs(): void {
        // Calculate total revenue: sum of all totalAmount values (or unitPrice * quantitySold)
        this.totalRevenue = this.filteredSales.reduce(
            (sum: number, s: any) => sum + (s.totalAmount || s.unitPrice * s.quantitySold || 0), 0
        );

        // Calculate total units sold: sum of all quantitySold values
        this.totalUnitsSold = this.filteredSales.reduce(
            (sum: number, s: any) => sum + (s.quantitySold || 0), 0
        );

        // Calculate average order value: total revenue divided by number of sales
        this.avgOrderValue = this.filteredSales.length ? this.totalRevenue / this.filteredSales.length : 0;

        // Find the top-selling product by total revenue
        const productMap = new Map<string, number>(); // Map: product name -> total revenue
        this.filteredSales.forEach((s: any) => {
            const name = s.productName || 'Unknown';  // Get product name (default 'Unknown')
            // Accumulate revenue for each product
            productMap.set(name, (productMap.get(name) || 0) + (s.totalAmount || 0));
        });

        // Find the product with the highest total revenue
        let maxVal = 0;
        productMap.forEach((val, key) => {
            if (val > maxVal) { maxVal = val; this.topProduct = key; } // Update top product
        });
    }

    /**
     * Toggles the visibility of the record sale form.
     */
    toggleRecordForm(): void {
        this.showRecordForm = !this.showRecordForm; // Toggle form visibility
    }

    /**
     * Handles product selection in the record sale form.
     * Auto-fills the unit price based on the selected product's price.
     * @param event - The HTML select change event
     */
    onProductSelectForSale(event: any): void {
        // Get the selected product ID from the event
        const productId = Number(event.target.value);
        // Find the product in the loaded products list
        const product = this.products.find((p: any) => p.id === productId);
        // If product found, auto-fill the unit price
        if (product) {
            this.newSale.unitPrice = product.unitPrice;
        }
    }

    /**
     * Submits the new sale record to the backend.
     * Validates required fields, shows success/error notifications.
     * On success: resets the form and reloads sales data.
     */
    recordSale(): void {
        // Validate that required fields are filled
        if (!this.newSale.productId || !this.newSale.supermarketId || !this.newSale.quantitySold) {
            this.notifications.warning('Please fill all required fields'); // Show validation warning
            return; // Stop execution
        }

        // Send the sale data to the backend via SalesService
        this.salesService.recordSale(this.newSale).subscribe({
            next: () => {
                this.notifications.success('Sale recorded successfully!'); // Show success toast
                this.showRecordForm = false; // Hide the form

                // Reset the form to default values for the next entry
                this.newSale = {
                    productId: 0,
                    supermarketId: 0,
                    saleDate: new Date().toISOString().split('T')[0], // Reset to today's date
                    quantitySold: 1,
                    unitPrice: 0
                };

                this.loadSales(); // Reload sales data to include the new record
            },
            error: (err: any) => {
                // Show error toast with the error message from the backend
                this.notifications.error('Failed to record sale: ' + (err.error?.message || err.message));
            }
        });
    }

    /**
     * Initializes all three sales charts (revenue, top products, by supermarket).
     * Called after sales data is loaded and DOM is ready.
     */
    initSalesCharts(): void {
        this.createRevenueChart();        // Create the revenue over time line chart
        this.createTopProductsChart();    // Create the top products horizontal bar chart
        this.createBySupermarketChart();  // Create the by-store doughnut chart
    }

    /**
     * Creates a line chart showing revenue trends over time.
     * Groups sales by date and plots total revenue for each date.
     */
    createRevenueChart(): void {
        // Get the canvas element by its ID
        const ctx = document.getElementById('revenueTimeChart') as HTMLCanvasElement;
        if (!ctx) return; // Exit if canvas not found (tab may not be active)

        // Destroy the previous chart instance if it exists to prevent memory leaks
        if (this.revenueChart) this.revenueChart.destroy();

        // Group sales revenue by date using a Map
        const dateMap = new Map<string, number>();
        this.filteredSales.forEach((s: any) => {
            const date = s.saleDate || 'Unknown'; // Get the sale date
            // Accumulate revenue for each date
            dateMap.set(date, (dateMap.get(date) || 0) + (s.totalAmount || 0));
        });

        // Sort dates chronologically
        const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        const labels = sorted.map(e => e[0]); // Extract date labels
        const data = sorted.map(e => e[1]);   // Extract revenue values

        // Create a new Chart.js line chart
        this.revenueChart = new Chart(ctx, {
            type: 'line',                       // Line chart type
            data: {
                labels,                           // X-axis: dates
                datasets: [{
                    label: 'Revenue (LKR)',         // Dataset label
                    data,                           // Y-axis: revenue values
                    borderColor: '#FFD700',         // Gold line color
                    backgroundColor: 'rgba(255, 215, 0, 0.1)', // Semi-transparent gold fill
                    borderWidth: 3,                 // Line thickness
                    fill: true,                     // Fill area under the line
                    tension: 0.4,                   // Curve smoothing (0 = straight, 1 = very curved)
                    pointBackgroundColor: '#FFD700', // Data point color
                    pointBorderColor: '#000',       // Data point border color
                    pointRadius: 4,                 // Data point size
                    pointHoverRadius: 6            // Data point size on hover
                }]
            },
            options: {
                responsive: true,                // Chart resizes with container
                maintainAspectRatio: false,       // Allow flexible height
                plugins: {
                    legend: { labels: { color: '#ccc', font: { size: 12 } } } // Light legend text
                },
                scales: {
                    y: {
                        beginAtZero: true,            // Y-axis starts at 0
                        ticks: { color: '#888' },     // Gray tick labels
                        grid: { color: 'rgba(255,255,255,0.05)' } // Very subtle grid lines
                    },
                    x: {
                        ticks: { color: '#888', maxTicksLimit: 10 }, // Limit x-axis labels to avoid clutter
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }

    /**
     * Creates a horizontal bar chart showing the top-selling products by units sold.
     * Limited to the top 8 products for readability.
     */
    createTopProductsChart(): void {
        // Get the canvas element
        const ctx = document.getElementById('topProductsChart') as HTMLCanvasElement;
        if (!ctx) return; // Exit if canvas not found

        // Destroy previous chart instance if it exists
        if (this.topProductsChart) this.topProductsChart.destroy();

        // Group sales quantity by product name
        const productMap = new Map<string, number>();
        this.filteredSales.forEach((s: any) => {
            const name = s.productName || 'Unknown';
            productMap.set(name, (productMap.get(name) || 0) + (s.quantitySold || 0));
        });

        // Sort by quantity descending and take top 8
        const sorted = [...productMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

        // Color palette for the bars
        const colors = ['#FFD700', '#FF6384', '#36A2EB', '#4BC0C0', '#FF9F40', '#9966FF', '#C9CBCF', '#FF6633'];

        // Create a horizontal bar chart
        this.topProductsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(e => e[0]),    // Product names
                datasets: [{
                    label: 'Units Sold',
                    data: sorted.map(e => e[1]),    // Quantities
                    backgroundColor: colors.slice(0, sorted.length), // Assign colors to bars
                    borderColor: '#000',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',                   // Horizontal bar chart (bars go left to right)
                plugins: { legend: { display: false } }, // Hide legend (only one dataset)
                scales: {
                    x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#ccc' }, grid: { display: false } } // No grid on product names
                }
            }
        });
    }

    /**
     * Creates a doughnut chart showing revenue distribution across supermarkets/stores.
     */
    createBySupermarketChart(): void {
        // Get the canvas element
        const ctx = document.getElementById('bySupermarketChart') as HTMLCanvasElement;
        if (!ctx) return; // Exit if canvas not found

        // Destroy previous chart instance if it exists
        if (this.bySupermarketChart) this.bySupermarketChart.destroy();

        // Group revenue by supermarket name
        const smMap = new Map<string, number>();
        this.filteredSales.forEach((s: any) => {
            const name = s.supermarketName || 'Unknown';
            smMap.set(name, (smMap.get(name) || 0) + (s.totalAmount || 0));
        });

        // Color palette for the doughnut segments
        const colors = ['#FFD700', '#FF6384', '#36A2EB', '#4BC0C0', '#FF9F40', '#9966FF'];

        // Create a doughnut chart
        this.bySupermarketChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [...smMap.keys()],        // Supermarket names
                datasets: [{
                    data: [...smMap.values()],      // Revenue values
                    backgroundColor: colors.slice(0, smMap.size), // Assign colors
                    borderColor: '#1a1a2e',         // Dark border between segments
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',           // Legend below the chart
                        labels: { color: '#ccc', font: { size: 11 }, padding: 12 }
                    }
                }
            }
        });
    }

    // ========== Forecast Helper Methods ==========

    /**
     * Returns the Font Awesome icon class for a demand trend direction.
     * @param trend - The trend direction string ('INCREASING', 'DECREASING', or 'STABLE')
     * @returns Font Awesome icon class name
     */
    getTrendIcon(trend: string): string {
        if (trend === 'INCREASING') return 'fa-arrow-up';    // Up arrow for increasing
        if (trend === 'DECREASING') return 'fa-arrow-down';  // Down arrow for decreasing
        return 'fa-minus';                                    // Horizontal line for stable
    }

    /**
     * Returns a CSS class for coloring the trend indicator.
     * @param trend - The trend direction string
     * @returns CSS class name for text color
     */
    getTrendColor(trend: string): string {
        if (trend === 'INCREASING') return 'text-success';   // Green for increasing
        if (trend === 'DECREASING') return 'text-danger';    // Red for decreasing
        return 'text-warning';                                // Yellow/orange for stable
    }

    /**
     * Returns a CSS badge class based on the AI confidence level.
     * @param confidence - Confidence value between 0 and 1
     * @returns CSS badge class name
     */
    getConfidenceBadge(confidence: number): string {
        if (confidence >= 0.8) return 'badge-success';       // Green for high confidence (80%+)
        if (confidence >= 0.6) return 'badge-warning';       // Orange for medium confidence (60-79%)
        return 'badge-danger';                                // Red for low confidence (below 60%)
    }
}
