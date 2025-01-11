import { Injectable } from '@angular/core';
import { GridCell } from '../models/grid-cell';

export interface PerformanceMetrics {
  harvestedArea: number;
  totalArea: number;
  completionRate: number;
  timeElapsed: number;
  efficiency: number;
  collisions: number;
  averageSpeed: number;
  pathOptimality: number;
}

export interface RoutePerformance {
  routeId: string;
  metrics: PerformanceMetrics;
  path: GridCell[];
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private routes: Map<string, RoutePerformance> = new Map();
  private startTime: number = 0;

  startMeasurement() {
    this.startTime = Date.now();
  }

  measurePerformance(
    harvestedCells: GridCell[],
    totalCells: number,
    path: GridCell[],
    collisions: number
  ): PerformanceMetrics {
    const timeElapsed = (Date.now() - this.startTime) / 1000; // saniye
    const harvestedArea = harvestedCells.length;
    const completionRate = (harvestedArea / totalCells) * 100;
    
    // Yol optimallığını hesapla
    const pathOptimality = this.calculatePathOptimality(path);
    
    // Ortalama hızı hesapla (birim/saniye)
    const averageSpeed = harvestedArea / timeElapsed;
    
    // Verimliliği hesapla
    const efficiency = (completionRate * pathOptimality) / 
                      (timeElapsed * (collisions + 1));

    return {
      harvestedArea,
      totalArea: totalCells,
      completionRate,
      timeElapsed,
      efficiency,
      collisions,
      averageSpeed,
      pathOptimality
    };
  }

  private calculatePathOptimality(path: GridCell[]): number {
    if (path.length < 2) return 1;

    let optimalDistance = 0;
    let actualDistance = 0;

    // Optimal mesafe: Başlangıç ve bitiş noktaları arası direkt mesafe
    const start = path[0];
    const end = path[path.length - 1];
    optimalDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + 
      Math.pow(end.y - start.y, 2)
    );

    // Gerçek mesafe: Yol boyunca toplam mesafe
    for (let i = 1; i < path.length; i++) {
      const curr = path[i];
      const prev = path[i - 1];
      actualDistance += Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + 
        Math.pow(curr.y - prev.y, 2)
      );
    }

    // Optimallık oranı (0-1 arası)
    return optimalDistance / actualDistance;
  }

  saveRoutePerformance(routeId: string, metrics: PerformanceMetrics, path: GridCell[]) {
    this.routes.set(routeId, { routeId, metrics, path });
  }

  getBestRoute(): RoutePerformance | null {
    if (this.routes.size === 0) return null;

    return Array.from(this.routes.values()).reduce((best, current) => {
      return current.metrics.efficiency > best.metrics.efficiency ? current : best;
    });
  }

  getPerformanceReport(): string {
    const bestRoute = this.getBestRoute();
    if (!bestRoute) return 'Henüz rota verisi yok.';

    const m = bestRoute.metrics;
    return `
Performans Raporu:
-----------------
Rota ID: ${bestRoute.routeId}
Tamamlanma Oranı: ${m.completionRate.toFixed(2)}%
Geçen Süre: ${m.timeElapsed.toFixed(2)} saniye
Verimlilik: ${m.efficiency.toFixed(2)}
Çarpışma Sayısı: ${m.collisions}
Ortalama Hız: ${m.averageSpeed.toFixed(2)} birim/saniye
Yol Optimallığı: ${(m.pathOptimality * 100).toFixed(2)}%
    `;
  }
} 