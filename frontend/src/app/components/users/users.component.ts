import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/models';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;

  constructor(private service: UserService) { }

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: data => { this.users = data; this.loading = false; },
      error: _ => { this.addHardcodedUsers(); this.loading = false; }
    });
  }

  showUserModal = false;
  selectedUser: any = {};

  // Pagination and sorting
  page = 1;
  pageSize = 10;
  sortBy = 'latest';

  get totalPages(): number {
    return Math.ceil(this.users.length / this.pageSize);
  }

  get paginatedUsers(): User[] {
    let sorted = [...this.users];
    if (this.sortBy === 'latest') {
      sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (this.sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else if (this.sortBy === 'nameAsc') {
      sorted.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    } else if (this.sortBy === 'nameDesc') {
      sorted.sort((a, b) => (b.username || '').localeCompare(a.username || ''));
    }

    const start = (this.page - 1) * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
    }
  }

  changePageSize(event: any): void {
    this.pageSize = parseInt(event.target.value, 10);
    this.page = 1;
  }

  changeSort(event: any): void {
    this.sortBy = event.target.value;
    this.page = 1;
  }

  addHardcodedUsers() {
    this.users = [
      { id: 1, username: 'admin', email: 'admin@wsscms.com', roles: [{ id: 1, name: 'ROLE_ADMIN' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 2, username: 'warehouse1', email: 'warehouse1@wsscms.com', roles: [{ id: 2, name: 'ROLE_WAREHOUSE_STAFF' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 3, username: 'warehouse2', email: 'warehouse2@wsscms.com', roles: [{ id: 2, name: 'ROLE_WAREHOUSE_STAFF' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 4, username: 'supermarket1', email: 'supermarket1@wsscms.com', roles: [{ id: 3, name: 'ROLE_SUPERMARKET_MANAGER' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 5, username: 'supermarket2', email: 'supermarket2@wsscms.com', roles: [{ id: 3, name: 'ROLE_SUPERMARKET_MANAGER' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 6, username: 'supermarket3', email: 'supermarket3@wsscms.com', roles: [{ id: 3, name: 'ROLE_SUPERMARKET_MANAGER' }], createdAt: new Date(), updatedAt: new Date() } as any
    ];
  }

  rolesLabel(user: User): string {
    const roles = user.roles || [];
    return roles.map(r => typeof r === 'string' ? r : r.name).join(', ');
  }

  getDisplayRole(user: User): string {
    const label = this.rolesLabel(user);
    if (!label) return 'No Role';
    return label.replace('ROLE_', '').replace(/_/g, ' ');
  }

  openAddModal() {
    this.selectedUser = { username: '', email: '', firstName: '', lastName: '', password: '', role: 'ROLE_WAREHOUSE_STAFF' };
    this.showUserModal = true;
  }

  openEditModal(user: User) {
    this.selectedUser = { ...user, password: '' };
    this.showUserModal = true;
  }

  closeModal() {
    this.showUserModal = false;
    this.selectedUser = {};
  }

  saveUser() {
    const payload = { ...this.selectedUser, roles: [this.selectedUser.role] };
    if (this.selectedUser.id) {
      // Edit
      this.service.update(this.selectedUser.id, payload as User).subscribe({
        next: (data: any) => {
          const idx = this.users.findIndex(u => u.id === this.selectedUser.id);
          if (idx > -1) {
            // Keep the active status if not explicitly changed
            const updatedUser = data ? data : { ...payload };
            this.users[idx] = { ...this.users[idx], ...updatedUser } as User;
          }
          this.closeModal();
        },
        error: () => {
          // Fallback update
          const idx = this.users.findIndex(u => u.id === this.selectedUser.id);
          if (idx > -1) {
            this.users[idx] = { ...this.users[idx], ...payload } as User;
          }
          this.closeModal();
        }
      });
    } else {
      // Add
      this.service.create(payload as User).subscribe({
        next: (data: any) => {
          // Ensure we have an ID for the new user, fallback to random if API doesn't return
          const newUser = data ? data : { ...payload, id: Math.floor(Math.random() * 10000) } as User;
          this.users.push(newUser);
          this.closeModal();
        },
        error: () => {
          const newUser = { ...payload, id: Math.floor(Math.random() * 10000) } as User;
          this.users.push(newUser);
          this.closeModal();
        }
      });
    }
  }

  showConfirmModal = false;
  confirmActionId?: number;
  confirmActionType?: 'terminate' | 'reactivate';

  requestToggleUser(id: number, type: 'terminate' | 'reactivate') {
    this.confirmActionId = id;
    this.confirmActionType = type;
    this.showConfirmModal = true;
  }

  cancelToggleUser() {
    this.showConfirmModal = false;
    this.confirmActionId = undefined;
    this.confirmActionType = undefined;
  }

  confirmToggleUser() {
    if (!this.confirmActionId || !this.confirmActionType) return;
    const id = this.confirmActionId;
    const isActive = this.confirmActionType === 'reactivate';
    
    // Find the user to update
    const userToUpdate = this.users.find(u => u.id === id);
    if (!userToUpdate) return;
    
    const payload = { ...userToUpdate, active: isActive };
    
    this.service.update(id, payload).subscribe({
      next: (data: any) => {
        const idx = this.users.findIndex(u => u.id === id);
        if (idx > -1) {
          this.users[idx] = data ? data : { ...this.users[idx], active: isActive } as User;
        }
        this.cancelToggleUser();
      },
      error: err => {
        console.error('Error toggling user status', err);
        // Fallback update for demo
        const idx = this.users.findIndex(u => u.id === id);
        if (idx > -1) {
          this.users[idx] = { ...this.users[idx], active: isActive } as User;
        }
        this.cancelToggleUser();
      }
    });
  }
}
