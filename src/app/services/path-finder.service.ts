import { Injectable } from '@angular/core';
import { GridCell } from '../models/grid-cell';

interface Node {
  x: number;
  y: number;
  f: number;
  g: number;
  h: number;
  parent?: Node;
}

@Injectable({
  providedIn: 'root'
})
export class PathFinderService {
  private readonly directions = [
    { x: 0, y: -1, cost: 1 },  // yukarı
    { x: 1, y: 0, cost: 1 },   // sağ
    { x: 0, y: 1, cost: 1 },   // aşağı
    { x: -1, y: 0, cost: 1 },  // sol
    { x: 1, y: -1, cost: Math.SQRT2 },  // sağ üst çapraz
    { x: 1, y: 1, cost: Math.SQRT2 },   // sağ alt çapraz
    { x: -1, y: 1, cost: Math.SQRT2 },  // sol alt çapraz
    { x: -1, y: -1, cost: Math.SQRT2 }, // sol üst çapraz
  ];

  findPath(start: GridCell, end: GridCell, matrix: number[][]): GridCell[] {
    const openSet: Node[] = [];
    const closedSet = new Set<string>();
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;

    const startH = this.heuristic({ x: start.x, y: start.y }, { x: end.x, y: end.y });

    // Başlangıç nodunu ekle (f = g + h, g = 0 olduğundan f = h)
    openSet.push({
      x: start.x,
      y: start.y,
      f: startH,
      g: 0,
      h: startH
    });

    while (openSet.length > 0) {
      // En düşük f değerine sahip nodu bul
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }
      const current = openSet[currentIndex];

      // Hedefe ulaştık mı?
      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(current);
      }

      // Current nodu openSet'ten çıkar ve closedSet'e ekle
      openSet.splice(currentIndex, 1);
      closedSet.add(`${current.x},${current.y}`);

      // Komşuları kontrol et
      for (const dir of this.directions) {
        const neighborX = current.x + dir.x;
        const neighborY = current.y + dir.y;

        // Grid sınırları içinde mi?
        if (neighborX < 0 || neighborX >= cols || 
            neighborY < 0 || neighborY >= rows) {
          continue;
        }

        const cellValue = matrix[neighborY][neighborX];

        // Engel var mı?
        if (cellValue === 1 || cellValue === 3) { // 1: engel, 3: sınır
          continue;
        }

        // Çapraz hareket için köşe engel kontrolü (diagonal cutting prevention)
        if (dir.x !== 0 && dir.y !== 0) {
          const adj1 = matrix[current.y + dir.y]?.[current.x];
          const adj2 = matrix[current.y]?.[current.x + dir.x];
          if ((adj1 === 1 || adj1 === 3) && (adj2 === 1 || adj2 === 3)) {
            continue; // İki engel arasından çapraz geçişe izin verme
          }
        }

        // Zaten kontrol edildi mi?
        if (closedSet.has(`${neighborX},${neighborY}`)) {
          continue;
        }

        // Arazi maliyeti çarpanı: biçilmiş alan (4) biraz daha düşük maliyet,
        // normal tarla (0) standart maliyet
        const terrainCost = this.getTerrainCost(cellValue);
        const g = current.g + dir.cost * terrainCost;
        const h = this.heuristic(
          { x: neighborX, y: neighborY }, 
          { x: end.x, y: end.y }
        );
        const f = g + h;

        // Komşu nodu openSet'te bul
        const neighborNode = openSet.find(
          node => node.x === neighborX && node.y === neighborY
        );

        if (!neighborNode) {
          // Yeni komşu ekle
          openSet.push({
            x: neighborX,
            y: neighborY,
            f,
            g,
            h,
            parent: current
          });
        } else if (g < neighborNode.g) {
          // Daha iyi bir yol bulduk
          neighborNode.f = f;
          neighborNode.g = g;
          neighborNode.parent = current;
        }
      }
    }

    // Yol bulunamadı
    return [];
  }

  /**
   * Hücre değerine göre arazi geçiş maliyeti.
   * Tarımsal simülasyonda farklı zemin tipleri farklı maliyetlere sahiptir.
   */
  private getTerrainCost(cellValue: number): number {
    switch (cellValue) {
      case 0: return 1.0;  // Normal tarla
      case 4: return 0.8;  // Biçilmiş alan (daha kolay geçiş)
      case 2: return 1.5;  // Traktör pozisyonu (engel gibi davranır ama geçilebilir)
      default: return 1.0;
    }
  }

  private heuristic(a: { x: number, y: number }, b: { x: number, y: number }): number {
    // Octile mesafesi: 8 yönlü hareket için en uygun buluşsal (heuristic)
    // Manhattan'dan daha doğru ve admissible bir tahmin sağlar
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  }

  private reconstructPath(endNode: Node): GridCell[] {
    const path: GridCell[] = [];
    let current: Node | undefined = endNode;

    while (current) {
      path.unshift({ x: current.x, y: current.y, value: 0 });
      current = current.parent;
    }

    return path;
  }
} 