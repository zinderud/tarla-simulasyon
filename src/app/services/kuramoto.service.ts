import { Injectable } from '@angular/core';
import { GridCell } from '../models/grid-cell';

export interface TractorPhase {
  id: number;
  phase: number;      // θ (faz açısı)
  frequency: number;  // ω (doğal frekans)
  position: GridCell;
}

@Injectable({
  providedIn: 'root'
})
export class KuramotoService {
  private readonly K = 0.8;  // Senkronizasyon katsayısı
  private readonly DT = 0.1; // Zaman adımı
  private readonly MIN_DISTANCE = 3; // Minimum güvenli mesafe
  private readonly TWO_PI = 2 * Math.PI;
  
  // Hız hesaplama sabitleri
  private readonly MIN_SPEED = 0.1;        // Minimum traktör hızı (durma eşiği)
  private readonly BASE_SPEED = 1.0;       // Temel hareket hızı
  private readonly SPEED_AMPLITUDE = 0.5;  // Faz etkisinin hız üzerindeki genliği
  private readonly MAX_FREQUENCY_EFFECT = 1.5; // Frekansın hız üzerindeki maksimum etkisi

  updatePhases(tractors: TractorPhase[]): TractorPhase[] {
    if (tractors.length === 0) return [];

    return tractors.map(tractor => {
      // Kuramoto denklemi: dθᵢ/dt = ωᵢ + (K/N)∑ⱼsin(θⱼ - θᵢ)
      const phaseChange = tractor.frequency + 
        (this.K / tractors.length) * 
        this.calculateCoupling(tractor, tractors);

      // Faz açısını [0, 2π) aralığında tutmak için düzgün sarmalama
      const newPhase = ((tractor.phase + phaseChange * this.DT) % this.TWO_PI + this.TWO_PI) % this.TWO_PI;

      return {
        ...tractor,
        phase: newPhase
      };
    });
  }

  /**
   * Kuramoto senkronizasyon derecesi (order parameter):
   * r(t) = |1/N ∑ e^(iθⱼ)| 
   * r=0: tamamen desenkronize, r=1: tamamen senkronize
   */
  calculateOrderParameter(tractors: TractorPhase[]): number {
    if (tractors.length === 0) return 0;

    let sumCos = 0;
    let sumSin = 0;

    for (const tractor of tractors) {
      sumCos += Math.cos(tractor.phase);
      sumSin += Math.sin(tractor.phase);
    }

    return Math.sqrt(sumCos * sumCos + sumSin * sumSin) / tractors.length;
  }

  private calculateCoupling(tractor: TractorPhase, allTractors: TractorPhase[]): number {
    return allTractors.reduce((sum, other) => {
      if (other.id === tractor.id) return sum;
      
      // Mesafeye bağlı etkileşim ağırlığı
      const distance = this.calculateDistance(tractor.position, other.position);
      const weight = 1 / (1 + distance);
      
      return sum + weight * Math.sin(other.phase - tractor.phase);
    }, 0);
  }

  private calculateDistance(pos1: GridCell, pos2: GridCell): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + 
      Math.pow(pos1.y - pos2.y, 2)
    );
  }

  adjustPaths(tractors: TractorPhase[], paths: Map<number, GridCell[]>): Map<number, GridCell[]> {
    const adjustedPaths = new Map(paths);
    
    // Çakışma kontrolü ve önleme
    for (let i = 0; i < tractors.length; i++) {
      for (let j = i + 1; j < tractors.length; j++) {
        const t1 = tractors[i];
        const t2 = tractors[j];
        
        // Traktörler arası mesafeyi kontrol et
        const distance = this.calculateDistance(t1.position, t2.position);
        
        if (distance < this.MIN_DISTANCE) {
          // Çakışma tespit edildi, rotaları ayarla
          this.resolveCollision(t1, t2, adjustedPaths);
        }
      }
    }

    // Faz farklarına göre hızları ayarla
    tractors.forEach(tractor => {
      const currentPath = adjustedPaths.get(tractor.id);
      if (!currentPath) return;

      // Faz açısına göre hız ve rota optimizasyonu
      const optimizedPath = this.optimizePathByPhase(
        currentPath,
        tractor.phase,
        tractor.frequency
      );
      
      adjustedPaths.set(tractor.id, optimizedPath);
    });

    return adjustedPaths;
  }

  private resolveCollision(t1: TractorPhase, t2: TractorPhase, paths: Map<number, GridCell[]>) {
    const path1 = paths.get(t1.id);
    const path2 = paths.get(t2.id);
    if (!path1 || !path2) return;

    // Faz farkına göre öncelik belirle
    const phaseDiff = Math.abs(t1.phase - t2.phase);
    
    if (phaseDiff > Math.PI) {
      // Birinci traktör beklesin
      const delayedPath1 = this.insertDelay(path1, 2);
      paths.set(t1.id, delayedPath1);
    } else {
      // İkinci traktör beklesin
      const delayedPath2 = this.insertDelay(path2, 2);
      paths.set(t2.id, delayedPath2);
    }
  }

  private insertDelay(path: GridCell[], steps: number): GridCell[] {
    // Yola bekleme noktaları ekle
    const newPath = [...path];
    const currentPos = path[0];
    
    for (let i = 0; i < steps; i++) {
      newPath.unshift({ ...currentPos });
    }
    
    return newPath;
  }

  private optimizePathByPhase(
    path: GridCell[],
    phase: number,
    frequency: number
  ): GridCell[] {
    // Faz ve frekansa göre yolu optimize et
    const speed = this.calculateSpeedFromPhase(phase, frequency);
    const smoothness = this.calculateSmoothnessFromPhase(phase);
    
    return this.smoothAndResamplePath(path, speed, smoothness);
  }

  private calculateSpeedFromPhase(phase: number, frequency: number): number {
    // Faz ve frekansa göre hız hesapla (minimum hız ile negatif hız önlenir)
    const frequencyEffect = Math.min(frequency, this.MAX_FREQUENCY_EFFECT);
    return Math.max(this.MIN_SPEED, this.BASE_SPEED + this.SPEED_AMPLITUDE * Math.sin(phase) * frequencyEffect);
  }

  private calculateSmoothnessFromPhase(phase: number): number {
    // Faza göre yol yumuşaklığını hesapla
    return 0.5 + 0.5 * Math.cos(phase);
  }

  private smoothAndResamplePath(
    path: GridCell[],
    speed: number,
    smoothness: number
  ): GridCell[] {
    if (path.length < 2) return path;

    const smoothedPath: GridCell[] = [];
    let accumDistance = 0;
    
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      
      // Yolu yumuşat
      if (i < path.length - 1) {
        const next = path[i + 1];
        const smoothed = this.interpolatePoints(prev, curr, next, smoothness);
        smoothedPath.push(smoothed);
      } else {
        smoothedPath.push(curr);
      }
      
      // Hıza göre yeniden örnekle
      const segmentDist = this.calculateDistance(prev, curr);
      accumDistance += segmentDist;
      
      if (accumDistance >= speed) {
        accumDistance = 0;
      }
    }

    return smoothedPath;
  }

  private interpolatePoints(
    prev: GridCell,
    curr: GridCell,
    next: GridCell,
    smoothness: number
  ): GridCell {
    // Catmull-Rom spline tabanlı üç nokta arası yumuşak geçiş
    // Standart formül: tangent = tau * (next - prev) / 2
    const tau = smoothness; // tension parametresi [0, 1]
    const x = curr.x + tau * (next.x - prev.x) / 2;
    const y = curr.y + tau * (next.y - prev.y) / 2;
    
    return {
      x: Math.round(x),
      y: Math.round(y),
      value: curr.value
    };
  }
} 