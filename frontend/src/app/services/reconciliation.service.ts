import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReconciliationService {
  private apiUrl = `${environment.apiBase}/reconciliations`;

  constructor(private http: HttpClient) { }

  getAll(warehouseId?: number, supermarketId?: number): Observable<any> {
    let url = this.apiUrl;
    if (warehouseId) url += `?warehouseId=${warehouseId}`;
    else if (supermarketId) url += `?supermarketId=${supermarketId}`;
    return this.http.get(url);
  }

  createDraft(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/draft`, dto);
  }

  completeReconciliation(id: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/complete?userId=${userId}`, {});
  }
}
