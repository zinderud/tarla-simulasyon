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
    
    // 0 -> 1 -> 2 -> 0 şeklinde döngüsel değişim
    newGrid[row][col] = (newGrid[row][col] + 1) % 3;
    
    this.gridSubject.next(newGrid);
  }

  // Kuramoto denklemi için yardımcı fonksiyon
  calculateKuramoto(tractors: any[]) {
    // Kuramoto denklemi implementasyonu buraya gelecek
  }

  // A* algoritması için yardımcı fonksiyon
  findPath(start: [number, number], end: [number, number]) {
    // A* algoritması implementasyonu buraya gelecek
  }
} 