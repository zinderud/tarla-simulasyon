import { GridCell } from './grid-cell';

/**
 * Simülasyon durumunu temsil eden arayüz
 * Simülasyonun anlık durumunu ve traktörlerin durumlarını içerir
 */
export interface SimulationState {
  /** Simülasyonun kaçıncı iterasyonda olduğunu gösterir */
  iteration: number;

  /** Traktörlerin anlık durumlarını içeren dizi */
  tractorStates: {
    /** Traktör kimlik numarası */
    id: number;
    /** Traktörün anlık konumu */
    position: GridCell;
    /** Traktörün hareket fazı */
    phase: number;
    /** Traktörün kalan yol uzunluğu */
    remainingPath: number;
  }[];

  /** Tamamlanma yüzdesi (0-100 arası) */
  completionPercentage: number;
} 