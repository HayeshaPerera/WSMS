import { map, tap, catchError } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Product, ApiResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = `${environment.apiBase}/api/products`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Product[]> {
    return this.http.get<{ data: Product[] }>(this.apiUrl).pipe(
      map((res: { data: Product[] }) => res.data)
    );
  }
  getById(id: number): Observable<Product> { return this.http.get<Product>(`${this.apiUrl}/${id}`); }
  create(p: Product): Observable<ApiResponse> {
    console.log('ProductService.create payload:', p);
    return this.http.post<ApiResponse>(this.apiUrl, p).pipe(
      tap(res => console.log('ProductService.create response:', res)),
      catchError(err => {
        console.error('ProductService.create error:', err);
        return throwError(() => err);
      })
    );
  }
  update(id: number, p: Product): Observable<ApiResponse> { return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, p); }
  delete(id: number): Observable<ApiResponse> { return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`); }

getAvailableInWarehouses(): Observable<Product[]> {
  return this.http.get<{ data: Product[] }>(`${this.apiUrl}/available-in-warehouses`).pipe(
    map((res: { data: Product[] }) => res.data)
  );
}}
