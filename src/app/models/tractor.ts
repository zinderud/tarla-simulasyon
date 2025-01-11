import { GridCell } from './grid-cell';

/**
 * Traktör nesnesini temsil eden arayüz
 * Traktörün tüm özelliklerini ve durumunu içerir
 */
export interface Tractor {
    /** Traktörü benzersiz şekilde tanımlayan kimlik numarası */
    id: number;
    /** Traktörün x koordinatı (yatay konum) */
    x: number;
    /** Traktörün y koordinatı (dikey konum) */
    y: number;
    /** Traktörün aktif/çalışır durumda olup olmadığı */
    isActive: boolean;
    /** Traktörün şu anki izlediği yol hücreleri */
    currentPath: GridCell[];
    /** Traktörün hareket yönü vektörü */
    direction: { x: number; y: number };
    /** Traktörün hareket hızı */
    speed: number;
    /** Traktörün arkasında bıraktığı iz hücreleri */
    trail: GridCell[];
    /** Traktörün bıraktığı izin maksimum uzunluğu */
    trailLength: number;
    /** Traktörün hafıza bilgileri */
    memory: {
      /** Traktörün geçmiş yol geçmişi */
      pathHistory: GridCell[];
      /** Şu anki adım sayısı */
      currentStep: number;
      /** Hedef noktalar listesi */
      targetPoints: GridCell[];
    };
    /** Traktörün görsel rengi */
    color: string;
    /** Hasat edilmiş alanın rengi */
    harvestedColor: string;
  }