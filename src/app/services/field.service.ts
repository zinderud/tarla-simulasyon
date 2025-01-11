import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FieldService {
  private gridSubject = new BehaviorSubject<number[][]>([]);
  grid$ = this.gridSubject.asObservable();

  createGrid(size: number): number[][] {
    const grid = Array(size).fill(0).map(() => Array(size).fill(0));
    this.gridSubject.next(grid);
    return grid;
  }

  toggleCell(row: number, col: number) {
    const currentGrid = this.gridSubject.value;
    const newGrid = [...currentGrid];
    newGrid[row][col] = (newGrid[row][col] + 1) % 3;
    this.gridSubject.next(newGrid);
  }
} 