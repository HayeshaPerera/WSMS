import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-role-landing',
  templateUrl: './role-landing.component.html',
  styleUrls: ['./role-landing.component.css']
})
export class RoleLandingComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate([this.auth.getRoleHome()]);
  }
}
