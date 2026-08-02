import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GrnItemDTO {
  id?: number;
  productId: number;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: string;
  parLevel?: number;
}

export interface GrnDTO {
  id?: number;
  grnNumber?: string;
  warehouseId: number;
  warehouseName?: string;
  supplierName?: string;
  receivedById: number;
  receivedByName?: string;
  status?: string;
  notes?: string;
  receivedDate?: string;
  createdAt?: string;
  items: GrnItemDTO[];
}

@Injectable({ providedIn: 'root' })
export class GrnService {
  private apiUrl = `${environment.apiBase}/grns`;

  constructor(private http: HttpClient) {}

  getAllGrns(): Observable<GrnDTO[]> {
    return this.http.get<GrnDTO[]>(this.apiUrl);
  }

  getGrnsByWarehouse(warehouseId: number): Observable<GrnDTO[]> {
    return this.http.get<GrnDTO[]>(`${this.apiUrl}/warehouse/${warehouseId}`);
  }

  getGrnById(id: number): Observable<GrnDTO> {
    return this.http.get<GrnDTO>(`${this.apiUrl}/${id}`);
  }

  createGrn(grn: GrnDTO): Observable<GrnDTO> {
    return this.http.post<GrnDTO>(this.apiUrl, grn);
  }

  confirmGrn(id: number): Observable<GrnDTO> {
    return this.http.post<GrnDTO>(`${this.apiUrl}/${id}/confirm`, {});
  }
}
