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
  harvestRate: number;
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
  
  // Verimlilik hesaplama sabitleri
  private readonly COLLISION_PENALTY_FACTOR = 0.1; // Her çarpışmanın verimlilik üzerindeki ceza ağırlığı

  startMeasurement() {
    this.startTime = Date.now();
  }

  measurePerformance(
    harvestedCells: GridCell[],
    totalCells: number,
    path: GridCell[],
    collisions: number
  ): PerformanceMetrics {
    const timeElapsed = Math.max(0.001, (Date.now() - this.startTime) / 1000); // saniye (sıfıra bölme koruması)
    const harvestedArea = harvestedCells.length;
    const completionRate = totalCells > 0 ? (harvestedArea / totalCells) * 100 : 0;
    
    // Yol optimallığını hesapla
    const pathOptimality = this.calculatePathOptimality(path);
    
    // Toplam yol mesafesini hesapla
    const totalPathDistance = this.calculateTotalPathDistance(path);
    
    // Ortalama hız: toplam yol mesafesi / geçen süre (birim/saniye)
    const averageSpeed = totalPathDistance / timeElapsed;
    
    // Hasat oranı: biçilen alan / geçen süre (alan/saniye)
    const harvestRate = harvestedArea / timeElapsed;
    
    // Verimlilik: normalize edilmiş metrik
    // (tamamlanma oranı × yol optimallığı × çarpışmasızlık oranı)
    const collisionPenalty = 1 / (1 + collisions * this.COLLISION_PENALTY_FACTOR);
    const efficiency = (completionRate / 100) * pathOptimality * collisionPenalty;

    return {
      harvestedArea,
      totalArea: totalCells,
      completionRate,
      timeElapsed,
      efficiency,
      collisions,
      averageSpeed,
      harvestRate,
      pathOptimality
    };
  }

  private calculateTotalPathDistance(path: GridCell[]): number {
    if (path.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
      const curr = path[i];
      const prev = path[i - 1];
      totalDistance += Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + 
        Math.pow(curr.y - prev.y, 2)
      );
    }
    return totalDistance;
  }

  private calculatePathOptimality(path: GridCell[]): number {
    if (path.length < 2) return 1;

    // Hasat yolu için optimallık: benzersiz hücre sayısı / toplam adım sayısı
    // Gereksiz tekrarları ve geri dönüşleri cezalandırır.
    // 1.0 = her adım yeni bir hücreyi ziyaret ediyor (ideal)
    // < 1.0 = bazı hücreler tekrar ziyaret ediliyor
    const uniqueCells = new Set<string>();
    for (const cell of path) {
      uniqueCells.add(`${cell.x},${cell.y}`);
    }

    return uniqueCells.size / path.length;
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
Verimlilik: ${(m.efficiency * 100).toFixed(2)}%
Çarpışma Sayısı: ${m.collisions}
Ortalama Hız: ${m.averageSpeed.toFixed(2)} birim/saniye
Hasat Oranı: ${m.harvestRate.toFixed(2)} alan/saniye
Yol Optimallığı: ${(m.pathOptimality * 100).toFixed(2)}%
    `;
  }
} 