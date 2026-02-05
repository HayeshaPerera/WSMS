import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StockRequest, ApiResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StockRequestService {
  private apiUrl = `${environment.apiBase}/api/stock-requests`;

  constructor(private http: HttpClient) { }

  getAllRequests(): Observable<StockRequest[]> {
    return this.http.get<ApiResponse>(this.apiUrl).pipe(
      map((res: ApiResponse) => res.data as StockRequest[]),
      catchError(() => of([]))
    );
  }

  getRequestById(id: number): Observable<StockRequest> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/${id}`).pipe(
      map((res: ApiResponse) => res.data as StockRequest)
    );
  }

  getRequestsBySupermarket(supermarketId: number): Observable<StockRequest[]> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/supermarket/${supermarketId}`).pipe(
      map((res: ApiResponse) => res.data as StockRequest[]),
      catchError(() => of([]))
    );
  }

  getRequestsByWarehouse(warehouseId: number): Observable<StockRequest[]> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/warehouse/${warehouseId}`).pipe(
      map((res: ApiResponse) => res.data as StockRequest[]),
      catchError(() => of([]))
    );
  }

  getPendingRequests(): Observable<StockRequest[]> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/pending`).pipe(
      map((res: ApiResponse) => res.data as StockRequest[]),
      catchError(() => of([]))
    );
  }

  createRequest(request: StockRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, request);
  }

  approveRequest(id: number, approvedQuantity: number, approvedById: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/approve`, {
      approvedQuantity
    });
  }

  rejectRequest(id: number, reason: string, rejectedById: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/reject`, {
      reason
    });
  }

  updateRequest(id: number, request: StockRequest): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/status`, request);
  }

  deleteRequest(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  countPendingRequests(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count/pending`).pipe(
      catchError(() => of(0))
    );
  }
}
