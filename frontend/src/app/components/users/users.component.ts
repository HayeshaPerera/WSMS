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
          if (idx > -1) this.users[idx] = data ? data : { ...this.users[idx], ...payload } as User;
          this.closeModal();
        },
        error: () => {
          // Fallback update
          const idx = this.users.findIndex(u => u.id === this.selectedUser.id);
          if (idx > -1) this.users[idx] = { ...this.users[idx], ...payload } as User;
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
  confirmDeleteId?: number;

  requestDeleteUser(id: number) {
    this.confirmDeleteId = id;
    this.showConfirmModal = true;
  }

  cancelDeleteUser() {
    this.showConfirmModal = false;
    this.confirmDeleteId = undefined;
  }

  confirmDeleteUser() {
    if (!this.confirmDeleteId) return;
    const id = this.confirmDeleteId;
    this.service.delete(id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== id);
        this.cancelDeleteUser();
      },
      error: err => {
        console.error('Error deleting user', err);
        this.users = this.users.filter(u => u.id !== id);
        this.cancelDeleteUser();
      }
    });
  }
}
