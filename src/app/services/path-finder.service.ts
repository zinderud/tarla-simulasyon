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
    { x: 0, y: -1 }, // yukarı
    { x: 1, y: 0 },  // sağ
    { x: 0, y: 1 },  // aşağı
    { x: -1, y: 0 }, // sol
  ];

  findPath(start: GridCell, end: GridCell, matrix: number[][]): GridCell[] {
    const openSet: Node[] = [];
    const closedSet = new Set<string>();
    const gridSize = matrix.length;

    // Başlangıç nodunu ekle
    openSet.push({
      x: start.x,
      y: start.y,
      f: 0,
      g: 0,
      h: this.heuristic({ x: start.x, y: start.y }, { x: end.x, y: end.y })
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
        if (neighborX < 0 || neighborX >= gridSize || 
            neighborY < 0 || neighborY >= gridSize) {
          continue;
        }

        // Engel var mı?
        if (matrix[neighborY][neighborX] === 1 || 
            matrix[neighborY][neighborX] === 3) { // 1: engel, 3: sınır
          continue;
        }

        // Zaten kontrol edildi mi?
        if (closedSet.has(`${neighborX},${neighborY}`)) {
          continue;
        }

        const g = current.g + 1;
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

  private heuristic(a: { x: number, y: number }, b: { x: number, y: number }): number {
    // Manhattan mesafesi
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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