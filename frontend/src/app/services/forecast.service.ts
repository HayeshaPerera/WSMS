import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemandForecast } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ForecastService {
  private apiUrl = `${environment.apiBase}/api/forecast`;

  constructor(private http: HttpClient) { }

  getAllForecasts(): Observable<DemandForecast[]> {
    return this.http.get<DemandForecast[]>(`${this.apiUrl}/all`);
  }

  getProductForecast(productId: number): Observable<DemandForecast> {
    return this.http.get<DemandForecast>(`${this.apiUrl}/product/${productId}`);
  }

  getSupermarketForecasts(supermarketId: number): Observable<DemandForecast[]> {
    return this.http.get<DemandForecast[]>(`${this.apiUrl}/supermarket/${supermarketId}`);
  }
}
