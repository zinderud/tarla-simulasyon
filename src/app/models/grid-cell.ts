export interface GridCell {
  x: number;
  y: number;
  value: number; // 0: boş, 1: engel, 2: traktör
}

export interface Tractor {
  id: number;
  x: number;
  y: number;
  angle: number;
  phase: number;  // Kuramoto denklemi için
  frequency: number;  // Doğal frekans
} 