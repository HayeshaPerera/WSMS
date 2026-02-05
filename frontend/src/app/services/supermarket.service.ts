import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Supermarket, ApiResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupermarketService {
  private apiUrl = `${environment.apiBase}/api/supermarkets`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Supermarket[]> { return this.http.get<Supermarket[]>(this.apiUrl); }
  getById(id: number): Observable<Supermarket> { return this.http.get<Supermarket>(`${this.apiUrl}/${id}`); }
  create(s: Supermarket): Observable<ApiResponse> { return this.http.post<ApiResponse>(this.apiUrl, s); }
  update(id: number, s: Supermarket): Observable<ApiResponse> { return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, s); }
  delete(id: number): Observable<ApiResponse> { return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`); }
}
