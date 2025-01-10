import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GridCell, Tractor } from '../models/grid-cell';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private readonly GRID_SIZE = 100;
  private grid: GridCell[][] = [];
  private tractors: Tractor[] = [];
  
  private gridSubject = new BehaviorSubject<GridCell[][]>([]);
  private tractorsSubject = new BehaviorSubject<Tractor[]>([]);

  grid$ = this.gridSubject.asObservable();
  tractors$ = this.tractorsSubject.asObservable();

  constructor() {
    this.initializeGrid();
  }

  private initializeGrid() {
    this.grid = Array(this.GRID_SIZE).fill(null).map((_, i) =>
      Array(this.GRID_SIZE).fill(null).map((_, j) => ({
        value: 0,
        x: i,
        y: j
      }))
    );
    this.gridSubject.next(this.grid);
  }

  addObstacle(x: number, y: number) {
    if (this.isValidPosition(x, y)) {
      this.grid[x][y].value = 1;
      this.gridSubject.next(this.grid);
    }
  }

  addTractor(x: number, y: number) {
    if (this.isValidPosition(x, y) && this.grid[x][y].value === 0) {
      const tractor: Tractor = {
        id: this.tractors.length + 1,
        x,
        y,
        angle: 0,
        phase: Math.random() * 2 * Math.PI,
        frequency: Math.random()
      };
      this.tractors.push(tractor);
      this.grid[x][y].value = 2;
      this.gridSubject.next(this.grid);
      this.tractorsSubject.next(this.tractors);
    }
  }

  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE;
  }
} 