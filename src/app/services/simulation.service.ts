import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GridCell } from '../models/grid-cell';
import { PathFinderService } from './path-finder.service';
import { KuramotoService, TractorPhase } from './kuramoto.service';

interface Tractor {
  id: number;
  x: number;
  y: number;
  isActive: boolean;
  currentPath: GridCell[];
  color: string;
  harvestedColor: string;
  phase: number;      // Kuramoto faz açısı
  frequency: number;  // Doğal frekans
}

interface SimulationState {
  iteration: number;
  tractorStates: {
    id: number;
    position: GridCell;
    remainingPath: number;
  }[];
  completionPercentage: number;
}

interface SimulationStatus {
  currentTest: number;
  bestCoverage: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  // Grid boyutu ve matris
  private readonly GRID_SIZE = 20;
  private readonly WORKING_WIDTH = 1; // Traktör çalışma genişliği (bitişik hücreler)
  private matrix: number[][] = [];
  private harvestedColors: string[][] = [];

  // Traktörler
  private tractors: Tractor[] = [];
  private readonly TRACTOR_COLORS = [
    { tractor: '#FF0000', harvested: '#FFE6E6' }, // Kırmızı
    { tractor: '#00FF00', harvested: '#E6FFE6' }, // Yeşil
    { tractor: '#0000FF', harvested: '#E6E6FF' }, // Mavi
    { tractor: '#FF00FF', harvested: '#FFE6FF' }, // Mor
    { tractor: '#00FFFF', harvested: '#E6FFFF' }  // Turkuaz
  ];

  // Observable'lar
  private gridSubject = new BehaviorSubject<GridCell[][]>([]);
  private tractorsSubject = new BehaviorSubject<Tractor[]>([]);
  private iterationSubject = new BehaviorSubject<number>(0);
  private simulationStateSubject = new BehaviorSubject<SimulationState | null>(null);
  private simulationStatusSubject = new BehaviorSubject<SimulationStatus>({
    currentTest: 0,
    bestCoverage: 0,
    status: 'Hazır'
  });

  // Public Observable'lar
  grid$ = this.gridSubject.asObservable();
  tractors$ = this.tractorsSubject.asObservable();
  iterations$ = this.iterationSubject.asObservable();
  simulationState$ = this.simulationStateSubject.asObservable();
  simulationStatus$ = this.simulationStatusSubject.asObservable();

  // Simülasyon durumu
  private isRunning = false;
  private simulationCompleted = false;
  private bestRoutes: Map<number, GridCell[]> | null = null;

  constructor(
    private pathFinder: PathFinderService,
    private kuramotoService: KuramotoService
  ) {
    this.initializeGrid();
    this.initializeHarvestedColors();
  }

  // Grid başlatma
  private initializeGrid() {
    // Tüm grid'i tarla (0) olarak başlat
    this.matrix = Array(this.GRID_SIZE).fill(0)
      .map(() => Array(this.GRID_SIZE).fill(0));
    
    // Tüm kenarları sınır (3) olarak işaretle
    for (let i = 0; i < this.GRID_SIZE; i++) {
      // Üst ve alt kenar
      this.matrix[0][i] = 3;
      this.matrix[this.GRID_SIZE - 1][i] = 3;
      // Sol ve sağ kenar
      this.matrix[i][0] = 3;
      this.matrix[i][this.GRID_SIZE - 1] = 3;
    }
    
    const grid = this.matrix.map((row, y) => 
      row.map((value, x) => ({ x, y, value }))
    );
    
    this.gridSubject.next(grid);
  }

  private initializeHarvestedColors() {
    this.harvestedColors = Array(this.GRID_SIZE).fill('')
      .map(() => Array(this.GRID_SIZE).fill(''));
  }

  // Hücre güncelleme metodları
  addBoundary(x: number, y: number) {
    if (this.isValidPosition(x, y)) {
      this.matrix[y][x] = 3; // 3: Sınır
      this.updateGrid();
    }
  }

  addObstacle(x: number, y: number) {
    if (this.isValidPosition(x, y)) {
      this.matrix[y][x] = 1; // 1: Engel
      this.updateGrid();
    }
  }

  addTractor(x: number, y: number) {
    if (this.isValidPosition(x, y) && this.matrix[y][x] === 0) {
      const colorIndex = this.tractors.length % this.TRACTOR_COLORS.length;
      const tractor: Tractor = {
        id: this.tractors.length + 1,
        x, y,
        isActive: true,
        currentPath: [],
        color: this.TRACTOR_COLORS[colorIndex].tractor,
        harvestedColor: this.TRACTOR_COLORS[colorIndex].harvested,
        phase: Math.random() * 2 * Math.PI,  // Rastgele başlangıç fazı
        frequency: 0.8 + Math.random() * 0.4  // Doğal frekans [0.8, 1.2]
      };
      
      this.tractors.push(tractor);
      this.matrix[y][x] = 2; // 2: Traktör
      this.updateGrid();
      this.tractorsSubject.next(this.tractors);
    }
  }

  // Simülasyon kontrol metodları
  async startSimulation(): Promise<void> {
    if (this.tractors.length === 0) {
      throw new Error('Lütfen önce traktör ekleyin!');
    }

    try {
      this.updateSimulationStatus(0, 0, 'Simülasyon başlatılıyor...');
      const harvestableAreas = this.findHarvestableAreas();
      
      if (harvestableAreas.length === 0) {
        throw new Error('Biçilebilir alan bulunamadı!');
      }

      // Alanları coğrafi yakınlığa göre traktörlere ata
      this.bestRoutes = new Map();
      const activeTractors = this.tractors.filter(t => t.isActive);
      const areaAssignments = this.assignAreasByProximity(harvestableAreas, activeTractors);
      
      activeTractors.forEach((tractor) => {
        const tractorAreas = areaAssignments.get(tractor.id) ?? [];
        
        if (tractorAreas.length > 0) {
          const path = this.calculateOptimalPath(tractor, tractorAreas);
          if (path.length > 0) {
            this.bestRoutes?.set(tractor.id, path);
            tractor.currentPath = [...path];
          }
        }
      });

      this.updateSimulationStatus(1, 100, 'Rotalar hazır!');
      return Promise.resolve();
    } catch (error) {
      this.updateSimulationStatus(0, 0, 'Hata: ' + (error as Error).message);
      return Promise.reject(error);
    }
  }

  startMovement() {
    if (!this.bestRoutes || this.bestRoutes.size === 0) {
      console.warn('Hareket başlatılamıyor: Rotalar hazır değil');
      return;
    }

    // Traktörlerin yollarını yeniden yükle
    this.tractors.forEach(tractor => {
      if (tractor.isActive) {
        const savedPath = this.bestRoutes?.get(tractor.id);
        if (savedPath) {
          tractor.currentPath = [...savedPath];
        }
      }
    });

    this.isRunning = true;
    this.simulationCompleted = false;
    this.iterationSubject.next(0);
    this.moveAllTractors();
  }

  private moveAllTractors() {
    if (!this.isRunning || this.simulationCompleted) return;

    // Kuramoto faz güncellemesi: traktörler arası senkronizasyon
    this.updateTractorPhases();

    let activeTractorExists = false;

    this.tractors.forEach(tractor => {
      if (tractor.isActive && tractor.currentPath.length > 0) {
        this.moveTractor(tractor);
        activeTractorExists = true;
      }
    });

    this.updateGrid();
    this.tractorsSubject.next([...this.tractors]);
    
    const currentIteration = this.iterationSubject.getValue();
    this.iterationSubject.next(currentIteration + 1);

    if (activeTractorExists) {
      setTimeout(() => this.moveAllTractors(), 100);
    } else {
      this.completeSimulation();
    }
  }

  /**
   * Kuramoto modeli ile traktör fazlarını güncelle.
   * Bu, traktörler arasında senkronizasyon sağlar.
   */
  private updateTractorPhases() {
    const activeTractors = this.tractors.filter(t => t.isActive);
    if (activeTractors.length < 2) return;

    const tractorPhases: TractorPhase[] = activeTractors.map(t => ({
      id: t.id,
      phase: t.phase,
      frequency: t.frequency,
      position: { x: t.x, y: t.y, value: 2 }
    }));

    const updatedPhases = this.kuramotoService.updatePhases(tractorPhases);

    // Güncellenmiş fazları traktörlere uygula
    for (const updated of updatedPhases) {
      const tractor = this.tractors.find(t => t.id === updated.id);
      if (tractor) {
        tractor.phase = updated.phase;
      }
    }
  }

  private moveTractor(tractor: Tractor) {
    if (!tractor.currentPath.length) return;

    // Önceki konumu biçilmiş alan olarak işaretle
    this.harvestCell(tractor.y, tractor.x, tractor.harvestedColor);

    // Çalışma genişliğine göre bitişik hücreleri de biç
    if (this.WORKING_WIDTH > 0) {
      for (let dy = -this.WORKING_WIDTH; dy <= this.WORKING_WIDTH; dy++) {
        for (let dx = -this.WORKING_WIDTH; dx <= this.WORKING_WIDTH; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = tractor.x + dx;
          const ny = tractor.y + dy;
          if (this.isValidPosition(nx, ny) && this.matrix[ny][nx] === 0) {
            this.harvestCell(ny, nx, tractor.harvestedColor);
          }
        }
      }
    }

    // Yeni konuma hareket
    const nextPosition = tractor.currentPath[0];
    tractor.x = nextPosition.x;
    tractor.y = nextPosition.y;
    
    // Yeni konumu işaretle
    this.matrix[tractor.y][tractor.x] = 2;
    tractor.currentPath.shift();
  }

  private harvestCell(y: number, x: number, color: string) {
    if (this.matrix[y][x] !== 3 && this.matrix[y][x] !== 1) { // Sınır ve engel hariç
      this.matrix[y][x] = 4;
      this.harvestedColors[y][x] = color;
    }
  }

  // Yardımcı metodlar
  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE;
  }

  private updateGrid() {
    const grid = this.matrix.map((row, y) => 
      row.map((value, x) => ({ x, y, value }))
    );
    this.gridSubject.next(grid);
  }

  private findHarvestableAreas(): GridCell[] {
    const areas: GridCell[] = [];
    for (let y = 1; y < this.GRID_SIZE - 1; y++) {
      for (let x = 1; x < this.GRID_SIZE - 1; x++) {
        // Sadece biçilmemiş (0) alanları ekle
        if (this.matrix[y][x] === 0) {
          areas.push({ x, y, value: 0 });
        }
      }
    }
    return areas;
  }

  private calculateOptimalPath(tractor: Tractor, areas: GridCell[]): GridCell[] {
    let fullPath: GridCell[] = [];
    let currentPosition = { x: tractor.x, y: tractor.y, value: 2 };
    let remainingAreas = [...areas];

    while (remainingAreas.length > 0) {
      // En yakın biçilmemiş alanı bul
      const nearestArea = this.findNearestArea(currentPosition, remainingAreas);
      if (!nearestArea) break;

      // O alana git
      const pathToArea = this.pathFinder.findPath(
        currentPosition,
        nearestArea,
        this.matrix
      );

      if (pathToArea.length > 0) {
        // Yol duplikasyonunu önle: ilk segment hariç her segmentin
        // ilk elemanını atla (önceki segmentin bitiş noktası ile aynı)
        if (fullPath.length > 0 && pathToArea.length > 1) {
          fullPath = fullPath.concat(pathToArea.slice(1));
        } else {
          fullPath = fullPath.concat(pathToArea);
        }
        currentPosition = nearestArea;
        
        // Gidilen alanı listeden çıkar
        remainingAreas = remainingAreas.filter(
          area => !(area.x === nearestArea.x && area.y === nearestArea.y)
        );
      } else {
        // Yol bulunamadıysa bu alanı atla
        remainingAreas = remainingAreas.filter(
          area => !(area.x === nearestArea.x && area.y === nearestArea.y)
        );
      }
    }

    return fullPath;
  }

  private findNearestArea(from: GridCell, areas: GridCell[]): GridCell | null {
    if (areas.length === 0) return null;

    let nearest = areas[0];
    let minDistance = this.calculateDistance(from, nearest);

    for (const area of areas) {
      const distance = this.calculateDistance(from, area);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = area;
      }
    }

    return nearest;
  }

  private calculateDistance(a: GridCell, b: GridCell): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan mesafesi
  }

  /**
   * Coğrafi yakınlığa göre alanları traktörlere ata.
   * Her alan, kendisine en yakın traktöre atanır (Voronoi benzeri bölümleme).
   */
  private assignAreasByProximity(
    areas: GridCell[],
    tractors: Tractor[]
  ): Map<number, GridCell[]> {
    const assignments = new Map<number, GridCell[]>();
    
    // Her traktör için boş alan listesi oluştur
    for (const tractor of tractors) {
      assignments.set(tractor.id, []);
    }

    // Her alanı en yakın traktöre ata
    for (const area of areas) {
      let minDistance = Infinity;
      let nearestTractorId = tractors[0].id;

      for (const tractor of tractors) {
        const distance = this.calculateDistance(
          area,
          { x: tractor.x, y: tractor.y, value: 2 }
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestTractorId = tractor.id;
        }
      }

      assignments.get(nearestTractorId)!.push(area);
    }

    return assignments;
  }

  private completeSimulation() {
    this.isRunning = false;
    this.simulationCompleted = true;
    
    const harvestedArea = this.calculateHarvestedArea();
    const totalArea = this.calculateTotalHarvestablArea();
    const completionRate = totalArea > 0 ? (harvestedArea / totalArea) * 100 : 0;

    this.simulationStateSubject.next({
      iteration: this.iterationSubject.getValue(),
      tractorStates: this.tractors.map(t => ({
        id: t.id,
        position: { x: t.x, y: t.y, value: 2 },
        remainingPath: t.currentPath.length
      })),
      completionPercentage: completionRate
    });
  }

  // Durum kontrol metodları
  hasRoutes(): boolean {
    return Boolean(this.bestRoutes) && 
           !this.isRunning && 
           !this.simulationCompleted && 
           this.tractors.some(t => t.isActive && t.currentPath.length > 0);
  }

  getTractorAt(x: number, y: number): Tractor | undefined {
    return this.tractors.find(t => t.x === x && t.y === y);
  }

  getHarvestedColorAt(x: number, y: number): string {
    return this.harvestedColors[y][x];
  }

  private calculateHarvestedArea(): number {
    return this.matrix.flat().filter(cell => cell === 4).length;
  }

  private calculateTotalHarvestablArea(): number {
    return this.matrix.flat().filter(cell => cell === 0 || cell === 4).length;
  }

  updateSimulationStatus(currentTest: number, bestCoverage: number, status: string) {
    this.simulationStatusSubject.next({ currentTest, bestCoverage, status });
  }

  resetSimulation() {
    this.bestRoutes = null;
    this.simulationCompleted = false;
    this.isRunning = false;
    this.tractors = [];
    this.iterationSubject.next(0);
    this.tractorsSubject.next([]);
    this.simulationStateSubject.next(null);
    this.initializeGrid();
    this.initializeHarvestedColors();
    this.updateSimulationStatus(0, 0, 'Hazır');
  }

  getBestRoute(): { path: GridCell[] } | null {
    if (!this.bestRoutes || this.bestRoutes.size === 0) return null;
    
    const firstRoute = this.bestRoutes.values().next().value;
    if (!firstRoute) return null;
    
    return { path: firstRoute };
  }

  markTractorAsBroken(tractorId: number) {
    const tractor = this.tractors.find(t => t.id === tractorId);
    if (tractor) {
      tractor.isActive = false;
      this.matrix[tractor.y][tractor.x] = 4; // Biçilmiş alan olarak işaretle
      this.updateGrid();
      this.tractorsSubject.next([...this.tractors]);

      // Traktör bozulduğunda kalan alanları yeniden dağıt
      this.redistributeRemainingAreas();
    }
  }

  private redistributeRemainingAreas() {
    // Biçilmemiş alanları bul
    const unharvestedAreas = this.findHarvestableAreas();
    
    if (unharvestedAreas.length === 0) return; // Biçilecek alan kalmadıysa çık

    // Aktif traktörleri bul
    const activeTractors = this.tractors.filter(t => t.isActive);
    if (activeTractors.length === 0) return; // Aktif traktör kalmadıysa çık

    // Alanları coğrafi yakınlığa göre aktif traktörlere ata
    const areaAssignments = this.assignAreasByProximity(unharvestedAreas, activeTractors);
    
    // Her traktör için yeni rotalar hesapla
    activeTractors.forEach((tractor) => {
      const tractorAreas = areaAssignments.get(tractor.id) ?? [];
      
      if (tractorAreas.length > 0) {
        // Traktörün mevcut konumundan başlayarak yeni rota hesapla
        const newPath = this.calculateOptimalPath(tractor, tractorAreas);
        if (newPath.length > 0) {
          this.bestRoutes?.set(tractor.id, newPath);
          tractor.currentPath = [...newPath];
        }
      }
    });

    // Simülasyonu güncelle
    if (this.isRunning) {
      this.updateSimulationStatus(
        this.simulationStatusSubject.getValue().currentTest,
        this.simulationStatusSubject.getValue().bestCoverage,
        'Rotalar yeniden hesaplandı'
      );
    }
  }
} 
