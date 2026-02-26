import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { User, ApiResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${environment.apiBase}/api/users`;
  constructor(private http: HttpClient) { }
  getAll(): Observable<User[]> {
    return this.http.get<ApiResponse>(this.apiUrl).pipe(
      map(res => (res.data || []) as User[])
    );
  }
  getById(id: number): Observable<User> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data as User)
    );
  }
  delete(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/${id}`); }
}
