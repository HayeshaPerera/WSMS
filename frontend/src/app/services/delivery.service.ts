import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Delivery, ApiResponse, DeliveryStatus } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {
  private apiUrl = `${environment.apiBase}/deliveries`;

  constructor(private http: HttpClient) { }

  getAllDeliveries(): Observable<Delivery[]> {
    return this.http.get<Delivery[]>(this.apiUrl);
  }

  getDeliveryById(id: number): Observable<Delivery> {
    return this.http.get<Delivery>(`${this.apiUrl}/${id}`);
  }

  getDeliveryByTracking(trackingNumber: string): Observable<Delivery> {
    return this.http.get<Delivery>(`${this.apiUrl}/tracking/${trackingNumber}`);
  }

  getDeliveriesByWarehouse(warehouseId: number): Observable<Delivery[]> {
    return this.http.get<Delivery[]>(`${this.apiUrl}/warehouse/${warehouseId}`);
  }

  getDeliveriesBySupermarket(supermarketId: number): Observable<Delivery[]> {
    return this.http.get<Delivery[]>(`${this.apiUrl}/supermarket/${supermarketId}`);
  }

  getActiveDeliveries(): Observable<Delivery[]> {
    return this.http.get<Delivery[]>(`${this.apiUrl}/active`);
  }

  createDelivery(delivery: Delivery): Observable<ApiResponse> {
    // Legacy generic create; prefer server-side create from request when possible
    return this.http.post<ApiResponse>(this.apiUrl, delivery);
  }

  createDeliveryFromRequest(stockRequestId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/from-request/${stockRequestId}`, {});
  }

  dispatchDelivery(id: number, driverName: string, vehicleNumber: string): Observable<ApiResponse> {
    // Controller expects POST on /{id}/dispatch
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/dispatch`, {
      driverName,
      vehicleNumber
    });
  }

  updateDeliveryStatus(id: number, status: DeliveryStatus | string, location?: string): Observable<ApiResponse> {
    // Controller uses PATCH for status updates
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}/status`, {
      status: String(status),
      currentLocation: location
    });
  }

  receiveDelivery(id: number, receivedById: number): Observable<ApiResponse> {
    // Controller expects POST /{id}/receive
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/receive`, {
      receivedById
    });
  }

  forceReceiveDelivery(id: number, receivedById: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/receive/force`, {
      receivedById
    });
  }

  failDelivery(id: number, reason: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/fail`, {
      reason
    });
  }

  deleteDelivery(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  countActiveDeliveries(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count/active`);
  }
}
