import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Supermarket, ApiResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupermarketService {
  private apiUrl = `${environment.apiBase}/supermarkets`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Supermarket[]> { 
    return this.http.get<ApiResponse>(this.apiUrl).pipe(
      map(res => (res.data || []) as Supermarket[])
    ); 
  }
  getById(id: number): Observable<Supermarket> { 
    return this.http.get<ApiResponse>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data as Supermarket)
    ); 
  }
  create(s: Supermarket): Observable<Supermarket> { 
    return this.http.post<ApiResponse>(this.apiUrl, s).pipe(
      map(res => res.data as Supermarket)
    ); 
  }
  update(id: number, s: Supermarket): Observable<Supermarket> { 
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, s).pipe(
      map(res => res.data as Supermarket)
    ); 
  }
  delete(id: number): Observable<ApiResponse> { return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`); }
}
