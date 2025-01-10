import { Component, OnInit } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';
import { GridCell } from '../../models/grid-cell';

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss']
})
export class GridComponent implements OnInit {
  grid$ = this.simulationService.grid$;

  constructor(private simulationService: SimulationService) {}

  ngOnInit(): void {}

  onCellClick(x: number, y: number) {
    this.simulationService.addObstacle(x, y);
  }

  onRightClick(event: MouseEvent, x: number, y: number) {
    event.preventDefault();
    this.simulationService.addTractor(x, y);
  }
} 