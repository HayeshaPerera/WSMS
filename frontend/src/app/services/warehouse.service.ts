import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Warehouse, ApiResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private apiUrl = `${environment.apiBase}/api/warehouses`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Warehouse[]> { return this.http.get<Warehouse[]>(this.apiUrl); }
  getById(id: number): Observable<Warehouse> { return this.http.get<Warehouse>(`${this.apiUrl}/${id}`); }
  create(w: Warehouse): Observable<ApiResponse> { return this.http.post<ApiResponse>(this.apiUrl, w); }
  update(id: number, w: Warehouse): Observable<ApiResponse> { return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, w); }
  delete(id: number): Observable<ApiResponse> { return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`); }
}
