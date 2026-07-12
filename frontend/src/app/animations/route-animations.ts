import {
  trigger,
  transition,
  style,
  query,
  animate,
  group
} from '@angular/animations';

export const slideInAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    // Initial state of new route
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        opacity: 0
      })
    ], { optional: true }),
    
    // Set enter route off-screen
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(20px)' })
    ], { optional: true }),
    
    group([
      // Animate leave route out
      query(':leave', [
        animate('300ms ease-in-out', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ], { optional: true }),
      
      // Animate enter route in
      query(':enter', [
        animate('300ms 150ms ease-in-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ], { optional: true })
    ])
  ])
]);
