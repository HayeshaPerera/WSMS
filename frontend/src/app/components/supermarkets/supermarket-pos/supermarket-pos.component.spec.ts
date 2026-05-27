import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupermarketPosComponent } from './supermarket-pos.component';

describe('SupermarketPosComponent', () => {
  let component: SupermarketPosComponent;
  let fixture: ComponentFixture<SupermarketPosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupermarketPosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SupermarketPosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
