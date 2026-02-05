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

  constructor(private service: UserService) {}

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: data => { this.users = data; this.loading = false; },
      error: _ => { this.addHardcodedUsers(); this.loading = false; }
    });
  }

  addHardcodedUsers() {
    this.users = [
      { userId: 1, username: 'admin', email: 'admin@wsscms.com', roles: [{ id: 1, name: 'ROLE_ADMIN' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { userId: 2, username: 'warehouse1', email: 'warehouse1@wsscms.com', roles: [{ id: 2, name: 'ROLE_WAREHOUSE_STAFF' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { userId: 3, username: 'warehouse2', email: 'warehouse2@wsscms.com', roles: [{ id: 2, name: 'ROLE_WAREHOUSE_STAFF' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { userId: 4, username: 'supermarket1', email: 'supermarket1@wsscms.com', roles: [{ id: 3, name: 'ROLE_SUPERMARKET_MANAGER' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { userId: 5, username: 'supermarket2', email: 'supermarket2@wsscms.com', roles: [{ id: 3, name: 'ROLE_SUPERMARKET_MANAGER' }], createdAt: new Date(), updatedAt: new Date() } as any,
      { userId: 6, username: 'supermarket3', email: 'supermarket3@wsscms.com', roles: [{ id: 3, name: 'ROLE_SUPERMARKET_MANAGER' }], createdAt: new Date(), updatedAt: new Date() } as any
    ];
  }

  rolesLabel(user: User): string {
    return (user.roles || []).map(r => r.name).join(', ');
  }
}
