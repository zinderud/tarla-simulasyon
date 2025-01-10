export interface GridCell {
  value: number;  // 0: boş, 1: biçilmeyecek alan, 2: traktör
  x: number;
  y: number;
}

export interface Tractor {
  id: number;
  x: number;
  y: number;
  angle: number;
  phase: number;  // Kuramoto denklemi için
  frequency: number;  // Doğal frekans
} 