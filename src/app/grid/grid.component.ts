import { Component, OnInit } from '@angular/core';
import { FieldService } from '../services/field.service';

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss']
})
export class GridComponent implements OnInit {
  grid: number[][] = [];
  
  constructor(private fieldService: FieldService) {}

  ngOnInit() {
    this.grid = this.fieldService.createGrid(20);
  }

  getCellClass(value: number): string {
    switch(value) {
      case 0: return 'empty';
      case 1: return 'obstacle';
      case 2: return 'tractor';
      default: return '';
    }
  }

  onCellClick(row: number, col: number) {
    this.fieldService.toggleCell(row, col);
  }
} 