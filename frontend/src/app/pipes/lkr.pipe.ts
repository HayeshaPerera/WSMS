import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'lkr'
})
export class LkrPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value === null || value === undefined || isNaN(value)) {
      return 'LKR 0.00';
    }
    
    return 'LKR ' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
