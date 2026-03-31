# Tarla Simülasyonu - Bilimsel Denetim Raporu

## Genel Değerlendirme

Bu rapor, tarla simülasyonu uygulamasındaki servislerin bilimsel doğruluğunu, tespit edilen hataları ve eksiklikleri belgelemektedir. Her servis ayrı ayrı analiz edilmiş, bulunan sorunlar ve uygulanan düzeltmeler detaylandırılmıştır.

---

## 1. KuramotoService (`kuramoto.service.ts`)

### 1.1 Faz Sarmalama Hatası (KRİTİK)
- **Sorun**: `updatePhases` metodunda faz açısı `(phase + change) % (2π)` ile sarmalanıyor. JavaScript'te `%` operatörü negatif sayılarda işareti korur. Örneğin `(-0.5) % (2π) = -0.5` olur ve faz açısı negatif değer alır, bu da Kuramoto modelinin matematiksel tutarlılığını bozar.
- **Düzeltme**: `((phase + change) % (2π) + 2π) % (2π)` formülü kullanılarak faz her zaman [0, 2π) aralığında tutulur.

### 1.2 Negatif Hız Problemi (KRİTİK)
- **Sorun**: `calculateSpeedFromPhase` metodu `1 + 0.5 * sin(phase) * frequency` formülü ile hız hesaplıyor. `sin(phase)` negatif olduğunda ve `frequency > 2` ise hız negatif olabilir. Gerçek bir traktör geriye gidemez.
- **Düzeltme**: `Math.max(0.1, ...)` ile minimum hız sınırı eklenerek negatif hız önlenir.

### 1.3 Yol İnterpolasyonu (İYİLEŞTİRME)
- **Sorun**: `interpolatePoints` metodunda `/4` faktörü keyfi seçilmiş, standart bir interpolasyon yöntemi değil. Standart Catmull-Rom spline'da bu değer `/2` olmalıdır.
- **Düzeltme**: Catmull-Rom spline formülasyonuna uygun olarak `/2` kullanılması ve `tau` (tension) parametresi eklenmesi.

### 1.4 Senkronizasyon Derecesi Ölçümü (EKSİK)
- **Sorun**: Kuramoto modelinde senkronizasyon derecesi `r(t) = |1/N ∑ e^(iθⱼ)|` ile ölçülür. Bu metrik mevcut değil.
- **Düzeltme**: `calculateOrderParameter` metodu eklenerek senkronizasyon seviyesi ölçülebilir hale getirildi.

### 1.5 Simülasyonla Entegrasyon Eksikliği (KRİTİK)
- **Sorun**: KuramotoService tanımlanmış ancak SimulationService tarafından hiç kullanılmıyor. Traktörler A* ile hesaplanan yolları izliyor ancak Kuramoto senkronizasyonu devrede değil.
- **Düzeltme**: SimulationService'e Kuramoto entegrasyonu eklenerek traktörler arası senkronizasyon sağlandı.

---

## 2. PathFinderService (`path-finder.service.ts`)

### 2.1 f-Değeri Başlatma Hatası (KRİTİK)
- **Sorun**: Başlangıç düğümü `f: 0` ile oluşturuluyor ancak A* algoritmasında `f = g + h` olmalıdır. Başlangıçta `g = 0` olduğundan `f = h` olmalıdır. Bu hata, algoritmanın başlangıç düğümünü diğer düğümlerden önce işleme almasına neden olur ve genellikle doğru sonuç verse de, bazı durumlarda suboptimal yol seçimine yol açabilir.
- **Düzeltme**: `f: this.heuristic(start, end)` olarak düzeltildi.

### 2.2 Sadece 4 Yönlü Hareket (İYİLEŞTİRME)
- **Sorun**: Yalnızca yukarı/aşağı/sağ/sol yönlerde hareket destekleniyor. Çapraz hareket yoktur. Tarımsal araçlar çapraz hareket yapabilir ve bu, daha doğal ve verimli yollar sağlar.
- **Düzeltme**: 8 yönlü hareket eklendi. Çapraz hareketler için `√2` maliyet kullanılıyor.

### 2.3 Arazi Maliyeti Eksikliği (İYİLEŞTİRME)
- **Sorun**: Tüm hücreler aynı geçiş maliyetine sahip (1). Gerçek tarım arazilerinde farklı zemin tipleri (yumuşak toprak, sert zemin, çamur) farklı geçiş maliyetlerine sahiptir.
- **Düzeltme**: Hücre değerine göre arazi maliyeti çarpanı eklendi.

---

## 3. PerformanceService (`performance.service.ts`)

### 3.1 Yol Optimallığı Metriği Hatalı (KRİTİK)
- **Sorun**: `calculatePathOptimality` metodu başlangıç-bitiş arası kuş uçuşu mesafeyi gerçek yol uzunluğuna bölerek hesaplıyor. Ancak hasat yolu alanı taramak için tasarlanmıştır ve doğası gereği uzun olmalıdır. Bu metrik, hasat verimliliğini ölçmek için uygun değildir.
- **Düzeltme**: Yol optimallığı, "yolun kapsadığı benzersiz hücre sayısı / toplam yol uzunluğu" olarak yeniden tanımlandı. Bu, gereksiz tekrarları ve geri dönüşleri cezalandırır.

### 3.2 Verimlilik Formülü (İYİLEŞTİRME)
- **Sorun**: `efficiency = (completionRate * pathOptimality) / (timeElapsed * (collisions + 1))` formülü standart bir metrik değildir ve birimleri tutarsızdır (yüzde × oran / (saniye × sayı)).
- **Düzeltme**: Verimlilik = (hasat edilen alan / toplam alan) × yol optimallığı × (1 / (1 + çarpışma oranı)) olarak düzenlendi. Birimler normalize edildi.

### 3.3 Ortalama Hız Hesabı (HATA)
- **Sorun**: `averageSpeed = harvestedArea / timeElapsed` formülü "hasat oranı"dır (alan/zaman), "hız" değil (mesafe/zaman).
- **Düzeltme**: Ortalama hız, "toplam yol mesafesi / geçen süre" olarak düzeltildi. Hasat oranı ayrı bir metrik olarak eklendi.

### 3.4 Sıfıra Bölme Riski (HATA)
- **Sorun**: `timeElapsed` sıfır olduğunda `averageSpeed` ve `efficiency` sonsuz olur.
- **Düzeltme**: Minimum süre kontrolü eklendi.

---

## 4. SimulationService (`simulation.service.ts`)

### 4.1 Coğrafi Alan Bölümleme Eksikliği (KRİTİK)
- **Sorun**: Hasat alanları dizi sırasına göre (satır satır) bölünüyor, coğrafi yakınlığa göre değil. Bu, bir traktörün kendi alanına ulaşmak için tüm tarlayı geçmesi gerekebileceği anlamına gelir.
- **Düzeltme**: K-means benzeri coğrafi bölümleme algoritması eklendi. Her traktöre kendisine en yakın alanlar atanır.

### 4.2 Yol Duplikasyonu (HATA)
- **Sorun**: `calculateOptimalPath` metodunda `pathFinder.findPath` segmentleri birleştirilirken, her segmentin başlangıç noktası bir önceki segmentin bitiş noktasıyla aynıdır. Bu duplikasyon, traktörün ara noktalarda "duraksama" yapmasına neden olur.
- **Düzeltme**: Segmentleri birleştirirken ilk segment hariç her segmentin ilk elemanı atlanır.

### 4.3 Sıfırlamada Grid Temizlenmiyor (HATA)
- **Sorun**: `resetSimulation` metodu yalnızca durum değişkenlerini sıfırlıyor, grid ve traktör konumlarını temizlemiyor.
- **Düzeltme**: Tam sıfırlama işlevi eklendi - grid, traktörler ve renk matrisi sıfırlanıyor.

### 4.4 Kuramoto Senkronizasyonu Entegrasyonu (EKSİK)
- **Sorun**: KuramotoService mevcut ancak SimulationService tarafından kullanılmıyor.
- **Düzeltme**: Traktör hareketi sırasında Kuramoto faz güncellemesi entegre edildi.

### 4.5 Çalışma Genişliği Eksikliği (EKSİK)
- **Sorun**: Gerçek hasat makinelerinin belirli bir çalışma genişliği vardır. Simülasyon bunu modellemez.
- **Düzeltme**: `WORKING_WIDTH` sabiti eklenerek traktörün bitişik hücreleri de biçmesi sağlandı.

---

## 5. FieldService (`field.service.ts`)

### 5.1 Sığ Kopya Hatası (KRİTİK)
- **Sorun**: `toggleCell` metodunda `const newGrid = [...currentGrid]` yüzeysel kopya oluşturur. İç diziler hala orijinal diziye referans verir. `newGrid[row][col]` değiştirildiğinde orijinal grid de değişir ve BehaviorSubject'in change detection mekanizması düzgün çalışmaz.
- **Düzeltme**: `currentGrid.map(row => [...row])` ile derin kopya oluşturulur.

### 5.2 Hücre Durumu Tutarsızlığı (HATA)
- **Sorun**: `toggleCell` hücre değerini 0-1-2 arasında döngüler. Ancak uygulama 0-4 arası değerler kullanır (0: boş, 1: engel, 2: traktör, 3: sınır, 4: biçilmiş).
- **Düzeltme**: Döngü aralığı uygulama genelindeki hücre durumlarıyla uyumlu hale getirildi.

---

## 6. Genel Eksiklikler

### 6.1 Model Tutarsızlıkları
- `grid-cell.ts` ve `tractor.ts` modelleri ile servislerdeki interface tanımları uyumsuz
- `SimulationService` içinde `Tractor` interface'i yerel olarak tanımlanmış, `tractor.ts` modeli kullanılmamış

### 6.2 Bilimsel Eksiklikler (Gelecek Geliştirmeler)
- Dönüş yarıçapı modeli (gerçek traktörler anında dönemez)
- Yakıt tüketimi modeli
- Arazi eğimi ve nem etkisi
- Baş dönüş yönetimi (headland management)
- Örtüşme yönetimi (overlap management)

---

## Uygulanan Değişiklikler Özeti

| Servis | Hata Türü | Açıklama | Durum |
|--------|-----------|----------|-------|
| KuramotoService | Kritik Bug | Faz sarmalama negatif değer | ✅ Düzeltildi |
| KuramotoService | Kritik Bug | Negatif hız hesabı | ✅ Düzeltildi |
| KuramotoService | İyileştirme | Interpolasyon formülü | ✅ Düzeltildi |
| KuramotoService | Eksik | Senkronizasyon derecesi ölçümü | ✅ Eklendi |
| PathFinderService | Kritik Bug | f-değeri başlatma | ✅ Düzeltildi |
| PathFinderService | İyileştirme | 8 yönlü hareket | ✅ Eklendi |
| PathFinderService | İyileştirme | Arazi maliyeti | ✅ Eklendi |
| PerformanceService | Kritik Bug | Yol optimallığı metriği | ✅ Düzeltildi |
| PerformanceService | Hata | Ortalama hız hesabı | ✅ Düzeltildi |
| PerformanceService | Hata | Sıfıra bölme riski | ✅ Düzeltildi |
| PerformanceService | İyileştirme | Verimlilik formülü | ✅ Düzeltildi |
| SimulationService | Kritik | Coğrafi alan bölümleme | ✅ Düzeltildi |
| SimulationService | Hata | Yol duplikasyonu | ✅ Düzeltildi |
| SimulationService | Hata | Grid sıfırlama | ✅ Düzeltildi |
| SimulationService | Eksik | Kuramoto entegrasyonu | ✅ Eklendi |
| SimulationService | Eksik | Çalışma genişliği | ✅ Eklendi |
| FieldService | Kritik Bug | Sığ kopya | ✅ Düzeltildi |
| FieldService | Hata | Hücre durumu tutarsızlığı | ✅ Düzeltildi |
