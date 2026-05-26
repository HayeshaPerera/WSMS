import { Component, OnInit } from '@angular/core';
import { AuditLogService, AuditLog } from '../../services/audit-log.service';

@Component({
  selector: 'app-audit-logs',
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.css']
})
export class AuditLogsComponent implements OnInit {
  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  loading = true;
  searchTerm = '';
  selectedEntityType = '';
  expandedLogId: number | null = null;

  entityTypes = ['STOCK_REQUEST', 'DELIVERY', 'INVENTORY', 'USER', 'PRODUCT'];

  constructor(private auditLogService: AuditLogService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.auditLogService.fetchBackendLogs().subscribe({
      next: (data) => {
        this.logs = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.auditLogService.logs$.subscribe(localLogs => {
          this.logs = localLogs;
          this.applyFilters();
          this.loading = false;
        });
      }
    });
  }

  applyFilters(): void {
    this.filteredLogs = this.logs.filter(log => {
      const matchesSearch = !this.searchTerm || 
        log.action.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        log.entityName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesType = !this.selectedEntityType || log.entityType === this.selectedEntityType;

      return matchesSearch && matchesType;
    });
  }

  toggleExpand(logId: number): void {
    if (this.expandedLogId === logId) {
      this.expandedLogId = null;
    } else {
      this.expandedLogId = logId;
    }
  }

  hasDetails(log: AuditLog): boolean {
    return !!log.oldValue || !!log.newValue;
  }

  formatJson(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return JSON.stringify(val, null, 2);
  }
}
