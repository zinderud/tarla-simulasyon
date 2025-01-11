import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';
import { GridCell } from '../../models/grid-cell';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class GridComponent {
  grid$: typeof this.simulationService.grid$;
  tractors$: typeof this.simulationService.tractors$;
  iterations$: typeof this.simulationService.iterations$;
  simulationState$: typeof this.simulationService.simulationState$;
  isDrawing = false;
  drawMode: 'obstacle' | 'tractor' = 'obstacle';
  selectedPath: GridCell[] = [];
  showPaths = false;
  isDrawingBoundary = false;
  boundaryPoints: GridCell[] = [];
  isSimulationStarted = false;
  isSimulating = false;
  isPaused = false;
  simulationStatus$;

  constructor(public simulationService: SimulationService) {
    this.grid$ = this.simulationService.grid$;
    this.tractors$ = this.simulationService.tractors$;
    this.iterations$ = this.simulationService.iterations$;
    this.simulationState$ = this.simulationService.simulationState$;
    this.simulationStatus$ = this.simulationService.simulationStatus$;
  }

  onMouseDown(event: MouseEvent, x: number, y: number) {
    if (event.button === 0) {
      this.updateCell(x, y);
    }
  }

  onMouseMove(x: number, y: number) {
    // Artık sadece engel ve traktör için kullanılacak
  }

  onMouseUp(event: MouseEvent) {
    // Sadece temel mouse up işlemi
  }

  updateCell(x: number, y: number) {
    switch (this.drawMode) {
      case 'obstacle':
        this.simulationService.addObstacle(x, y);
        break;
      case 'tractor':
        this.simulationService.addTractor(x, y);
        break;
    }
  }

  setDrawMode(mode: 'obstacle' | 'tractor') {
    this.drawMode = mode;
  }

  breakTractor(tractorId: number) {
    this.simulationService.markTractorAsBroken(tractorId);
  }

  startSimulation() {
    this.isSimulating = true;
    this.isPaused = false;
    this.simulationService.startSimulation()
      .then(() => {
        this.isSimulating = false;
        alert('Simülasyon tamamlandı! Rotalar hazır. Harekete başlayabilirsiniz.');
      })
      .catch(error => {
        this.isSimulating = false;
        this.isPaused = false;
        alert(error.message || 'Simülasyon sırasında bir hata oluştu!');
      });
  }

  showBestRoute() {
    const bestRoute = this.simulationService.getBestRoute();
    if (bestRoute) {
      this.selectedPath = bestRoute.path;
      this.showPaths = true;
    }
  }

  hidePaths() {
    this.showPaths = false;
    this.selectedPath = [];
  }

  getCellClass(cell: GridCell): any {
    return {
      'boundary': cell.value === 3,
      'obstacle': cell.value === 1,
      'tractor': cell.value === 2,
      'harvested': cell.value === 4,
      'path': this.showPaths && this.isPartOfPath(cell),
      'current-position': this.isCurrentTractorPosition(cell)
    };
  }

  isPartOfPath(cell: GridCell): boolean {
    return this.selectedPath.some(p => p.x === cell.x && p.y === cell.y);
  }

  private isCurrentTractorPosition(cell: GridCell): boolean {
    return cell.value === 2;
  }

  getCellColor(cell: GridCell): string {
    const tractor = this.simulationService.getTractorAt(cell.x, cell.y);
    if (tractor) {
      return tractor.color;
    }
    if (cell.value === 4) { // Biçilmiş alan
      return this.simulationService.getHarvestedColorAt(cell.x, cell.y);
    }
    return ''; // Varsayılan renk
  }

  startMovement() {
    if (!this.simulationService.hasRoutes()) {
      alert('Lütfen önce simülasyonu başlatın ve rotaları hesaplatın!');
      return;
    }

    this.isSimulationStarted = true;
    this.simulationService.startMovement();
  }

  resetSimulation() {
    this.isSimulationStarted = false;
    // Diğer reset işlemleri...
  }

  cancelSimulation() {
    if (this.isSimulating) {
      this.isSimulating = false;
      this.simulationService.updateSimulationStatus(0, 0, 'Simülasyon iptal edildi');
      this.simulationService.resetSimulation();
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.simulationService.simulationStatus$.pipe(first()).subscribe(status => {
      this.simulationService.updateSimulationStatus(
        status.currentTest,
        status.bestCoverage,
        this.isPaused ? 'Simülasyon duraklatıldı' : 'Simülasyon devam ediyor...'
      );
    });
  }
} 