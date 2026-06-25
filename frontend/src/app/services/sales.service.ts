// Import Angular Injectable decorator for dependency injection
import { Injectable } from '@angular/core';
// Import HttpClient for making HTTP API requests, HttpParams for query string parameters
import { HttpClient, HttpParams } from '@angular/common/http';
// Import Observable for async data streams, 'of' to create an observable from a value
import { Observable, of } from 'rxjs';
// Import 'map' to transform data, 'catchError' to handle errors gracefully
import { map, catchError } from 'rxjs/operators';
// Import the ApiResponse interface from the shared models
import { ApiResponse } from '../models/models';
// Import the environment config to get the base API URL
import { environment } from '../../environments/environment';

/**
 * Interface representing a single sale record.
 * Used for both displaying sale data and recording new sales.
 */
export interface SaleRecord {
    id?: number;                // Unique sale record ID (optional for new sales)
    productId: number;          // ID of the product sold
    productName?: string;       // Display name of the product (from backend)
    productSku?: string;        // Product SKU code (from backend)
    supermarketId: number;      // ID of the supermarket where the sale occurred
    supermarketName?: string;   // Display name of the supermarket (from backend)
    saleDate: string;           // Date of the sale in ISO format (YYYY-MM-DD)
    quantitySold: number;       // Number of units sold in this transaction
    unitPrice: number;          // Price per unit at the time of sale
    totalAmount?: number;       // Total revenue = unitPrice * quantitySold (calculated by backend)
    notes?: string;             // Optional notes about the sale
}

/**
 * SalesService handles all HTTP communication with the backend /api/sales endpoints.
 * It provides methods for fetching, filtering, and recording sales data.
 * Registered as a singleton service via 'providedIn: root'.
 */
@Injectable({
    providedIn: 'root' // Makes this service available app-wide without explicit provider registration
})
export class SalesService {
    // Base URL for sales API endpoints, constructed from environment configuration
    private apiUrl = `${environment.apiBase}/sales`;

    // Inject HttpClient for making HTTP requests
    constructor(private http: HttpClient) { }

    /**
     * Fetches all sales records from the backend.
     * Handles both array responses and wrapped {data: [...]} responses.
     * Returns an empty array on error for graceful degradation.
     */
    getAllSales(): Observable<SaleRecord[]> {
        // Make GET request to /api/sales
        return this.http.get<any>(this.apiUrl).pipe(
            // Transform the response to extract the array of sales
            map((res: any) => {
                // If the response is directly an array, use it
                if (Array.isArray(res)) return res;
                // If the response is wrapped in a {data: [...]} structure, extract the data
                if (res && Array.isArray(res.data)) return res.data;
                // Fallback: return empty array if response format is unexpected
                return [];
            }),
            // If the HTTP request fails, return an empty array instead of throwing an error
            catchError(() => of([]))
        );
    }

    /**
     * Fetches sales records filtered by a specific product ID.
     * @param productId - The ID of the product to filter by
     */
    getSalesByProduct(productId: number): Observable<SaleRecord[]> {
        // Make GET request to /api/sales/product/{productId}
        return this.http.get<any>(`${this.apiUrl}/product/${productId}`).pipe(
            // Transform the response - handle both array and wrapped formats
            map((res: any) => {
                if (Array.isArray(res)) return res;           // Direct array response
                if (res && Array.isArray(res.data)) return res.data; // Wrapped response
                return [];                                     // Fallback empty array
            }),
            // Return empty array on error
            catchError(() => of([]))
        );
    }

    /**
     * Fetches sales records filtered by a specific supermarket ID.
     * @param supermarketId - The ID of the supermarket to filter by
     */
    getSalesBySupermarket(supermarketId: number): Observable<SaleRecord[]> {
        // Make GET request to /api/sales/supermarket/{supermarketId}
        return this.http.get<any>(`${this.apiUrl}/supermarket/${supermarketId}`).pipe(
            // Transform the response - handle both array and wrapped formats
            map((res: any) => {
                if (Array.isArray(res)) return res;           // Direct array response
                if (res && Array.isArray(res.data)) return res.data; // Wrapped response
                return [];                                     // Fallback empty array
            }),
            // Return empty array on error
            catchError(() => of([]))
        );
    }

    /**
     * Fetches sales records within a specific date range.
     * @param startDate - Start date in ISO format (YYYY-MM-DD)
     * @param endDate - End date in ISO format (YYYY-MM-DD)
     */
    getSalesByDateRange(startDate: string, endDate: string): Observable<SaleRecord[]> {
        // Build query parameters for the date range filter
        const params = new HttpParams()
            .set('startDate', startDate)   // Add startDate query parameter
            .set('endDate', endDate);      // Add endDate query parameter

        // Make GET request to /api/sales/date-range?startDate=...&endDate=...
        return this.http.get<any>(`${this.apiUrl}/date-range`, { params }).pipe(
            // Transform the response - handle both array and wrapped formats
            map((res: any) => {
                if (Array.isArray(res)) return res;           // Direct array response
                if (res && Array.isArray(res.data)) return res.data; // Wrapped response
                return [];                                     // Fallback empty array
            }),
            // Return empty array on error
            catchError(() => of([]))
        );
    }

    /**
     * Records a new sale in the system by sending a POST request.
     * @param sale - The sale record data to submit to the backend
     * @returns Observable with the API response containing the saved sale
     */
    recordSale(sale: SaleRecord): Observable<ApiResponse> {
        // Make POST request to /api/sales with the sale data in the request body
        return this.http.post<ApiResponse>(this.apiUrl, sale);
    }

    /**
     * Records multiple sales in the system by sending a POST request to /api/sales/bulk.
     */
    recordSalesBulk(sales: SaleRecord[]): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.apiUrl}/bulk`, sales);
    }

    /**
     * Generates simulated demo sales data for testing and forecasting visualization.
     */
    generateDemoSales(days: number, supermarketId?: number, clearExisting: boolean = true): Observable<ApiResponse> {
        let params = new HttpParams().set('days', days.toString()).set('clearExisting', clearExisting.toString());
        if (supermarketId) {
            params = params.set('supermarketId', supermarketId.toString());
        }
        return this.http.post<ApiResponse>(`${this.apiUrl}/generate-demo`, null, { params });
    }
}
