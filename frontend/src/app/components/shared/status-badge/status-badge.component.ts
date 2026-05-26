import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css']
})
export class StatusBadgeComponent {
  @Input() status: string = '';

  getNormalizedStatus(): string {
    return (this.status || '').toUpperCase().trim();
  }

  getBadgeClass(): string {
    const s = this.getNormalizedStatus();
    switch (s) {
      case 'PENDING':
      case 'LOW':
        return 'badge-warning';
      case 'APPROVED':
      case 'IN_TRANSIT':
      case 'ACTIVE':
      case 'OK':
      case 'GOOD':
        return 'badge-info';
      case 'COMPLETED':
      case 'DELIVERED':
      case 'SUCCESS':
      case 'ADEQUATE STOCK':
        return 'badge-success';
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
      case 'CRITICAL':
      case 'HIGH':
      case 'URGENT':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getIcon(): string {
    const s = this.getNormalizedStatus();
    switch (s) {
      case 'PENDING':
        return 'schedule';
      case 'LOW':
        return 'warning';
      case 'APPROVED':
        return 'thumb_up';
      case 'IN_TRANSIT':
        return 'local_shipping';
      case 'ACTIVE':
        return 'verified';
      case 'OK':
      case 'GOOD':
      case 'ADEQUATE STOCK':
        return 'check_circle';
      case 'COMPLETED':
      case 'DELIVERED':
        return 'task_alt';
      case 'REJECTED':
      case 'FAILED':
      case 'CANCELLED':
        return 'cancel';
      case 'CRITICAL':
      case 'URGENT':
      case 'HIGH':
        return 'error';
      default:
        return 'info';
    }
  }
}
