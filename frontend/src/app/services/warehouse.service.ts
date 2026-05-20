import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Warehouse, ApiResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private apiUrl = `${environment.apiBase}/warehouses`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Warehouse[]> { 
    return this.http.get<ApiResponse>(this.apiUrl).pipe(
      map(res => (res.data || []) as Warehouse[])
    ); 
  }
  getById(id: number): Observable<Warehouse> { 
    return this.http.get<ApiResponse>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data as Warehouse)
    ); 
  }
  create(w: Warehouse): Observable<Warehouse> { 
    return this.http.post<ApiResponse>(this.apiUrl, w).pipe(
      map(res => res.data as Warehouse)
    ); 
  }
  update(id: number, w: Warehouse): Observable<Warehouse> { 
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, w).pipe(
      map(res => res.data as Warehouse)
    ); 
  }
  delete(id: number): Observable<ApiResponse> { return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`); }
}
