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
    // Derin kopya oluştur (iç diziler de kopyalanmalı)
    const newGrid = currentGrid.map(r => [...r]);
    // Uygulama genelindeki hücre durumlarıyla uyumlu döngü:
    // 0: boş tarla, 1: engel, 2: traktör, 3: sınır, 4: biçilmiş
    newGrid[row][col] = (newGrid[row][col] + 1) % 5;
    this.gridSubject.next(newGrid);
  }
} 