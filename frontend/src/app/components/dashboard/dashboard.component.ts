import { Component } from '@angular/core';
import { slideInAnimation } from '../../animations/route-animations';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  animations: [slideInAnimation]
})
export class DashboardComponent {
  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.isActivated ? outlet.activatedRoute.snapshot.url.join('') : '';
  }
}
