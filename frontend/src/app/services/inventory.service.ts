import { Injectable } from '@angular/core';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Inventory, ApiResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
    /**
     * Get available quantity for a product in a warehouse (assume warehouseId=1 for single warehouse setup)
     */
    getWarehouseProductQuantity(productId: number, warehouseId: number = 1): Observable<number> {
      return this.http.get<number>(`${this.apiUrl}/warehouse/${warehouseId}/product/${productId}/quantity`);
    }
  private apiUrl = `${environment.apiBase}/inventory`;

  constructor(private http: HttpClient) { }

  getAllInventory(): Observable<Inventory[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => {
        // Handle various response formats
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        if (res && Array.isArray(res.content)) return res.content;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  getInventoryById(id: number): Observable<Inventory> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => res.data || res)
    );
  }

  getWarehouseInventory(warehouseId: number): Observable<Inventory[]> {
    return this.http.get<any>(`${this.apiUrl}/warehouse/${warehouseId}`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  getSupermarketInventory(supermarketId: number): Observable<Inventory[]> {
    return this.http.get<any>(`${this.apiUrl}/supermarket/${supermarketId}`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  getLowStockItems(): Observable<Inventory[]> {
    return this.http.get<any>(`${this.apiUrl}/low-stock`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  getLowStockInWarehouse(warehouseId: number): Observable<Inventory[]> {
    return this.http.get<any>(`${this.apiUrl}/low-stock/warehouse/${warehouseId}`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  getLowStockInSupermarket(supermarketId: number): Observable<Inventory[]> {
    return this.http.get<any>(`${this.apiUrl}/low-stock/supermarket/${supermarketId}`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  createInventory(inventory: Inventory): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, inventory);
  }

  updateInventory(id: number, inventory: Inventory): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, inventory);
  }

  deleteInventory(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  adjustQuantity(id: number, adjustment: number): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/adjust?adjustment=${adjustment}`, {});
  }
}
