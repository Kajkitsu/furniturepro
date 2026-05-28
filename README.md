# FurniturePro v2.0 — Profesjonalne Planowanie Mebli

## 🎯 Opis projektu

FurniturePro to kompletna aplikacja webowa CAD-like do projektowania mebli mieszkaniowych z pełnym procesem produkcyjnym. Umożliwia projektowanie wielu mebli jednocześnie, edycję szczegółową każdego elementu, wizualizację 3D z interaktywnym zaznaczaniem, oraz generowanie listy formatek do zamówienia w eksporcie CSV zgodnym z formatem PRO100.

**Nie jest to wizualizator** — to realne narzędzie do przygotowania danych produkcyjnych.

---

## ✨ Zaimplementowane funkcjonalności

### Projektowanie mebli
- ✅ **Wiele mebli jednocześnie** — karty jak w przeglądarce, przełączanie bez utraty zmian
- ✅ **4 typy mebli**: szafka z półkami, półka naścienna, komoda z szufladami, pojedyncza płyta
- ✅ **Duplikowanie mebla** jednym kliknięciem
- ✅ **Blokowanie mebla** przed przypadkową edycją
- ✅ **Grupowanie w projekty** z nazwą projektu i pomieszczenia
- ✅ **Automatyczny generator bryły** na podstawie parametrów bazowych

### Generator bryły
- ✅ Parametryzowalne: nazwa, wymiary, typ, materiał, kolor, obrzeża
- ✅ Konfigurowalna liczba półek i sekcji
- ✅ Opcjonalne plecy (HDF 3mm lub płyta 18mm)
- ✅ Opcjonalna maskownica dolna z konfiguracją wysokości
- ✅ Odsunięcie elementów od tyłu mebla
- ✅ Automatyczne numerowanie elementów

### Edycja szczegółowa
- ✅ Edycja każdego elementu osobno (wymiary, pozycja, materiał, kolor)
- ✅ Obrzeża na poszczególnych krawędziach (przód, tył, lewo, prawo)
- ✅ Grubość i kod obrzeża per krawędź
- ✅ Dodawanie / usuwanie półek
- ✅ Usuwanie wybranych elementów
- ✅ Zmiana materiału i koloru pojedynczego elementu
- ✅ Włączanie / wyłączanie pleców
- ✅ Zmiana materiału pleców
- ✅ Przebudowa mebla po zmianie parametrów strukturalnych
- ✅ Usłojenie (wzdłuż / brak)
- ✅ Notatki technologiczne per element

### Wizualizacja 3D
- ✅ **Three.js** z pełnym widokiem 3D
- ✅ **OrbitControls** — orbitowanie kamerą, zoom, pan
- ✅ **Zaznaczanie elementu kliknięciem** w 3D (raycasting)
- ✅ Podświetlanie zaznaczonego elementu (outline)
- ✅ Panel właściwości zaznaczonego elementu
- ✅ Preset widoków: perspektywa, przód, góra, bok
- ✅ **Exploded view** — rozstrzelony widok mebla
- ✅ Ukrywanie / pokazywanie elementów
- ✅ Ukrywanie / pokazywanie pleców
- ✅ Siatka pomocnicza (toggle)
- ✅ Numerowanie elementów (toggle etykiet)
- ✅ Dopasowanie kamery (fit view)
- ✅ Cienie i oświetlenie studyjne
- ✅ Krawędzie elementów w widoku 3D
- ✅ Kolory płyt widoczne na elementach

### Lista formatek
- ✅ Generowanie listy dla jednego mebla lub wszystkich
- ✅ Agregacja identycznych elementów
- ✅ Widok bez agregacji
- ✅ Pełna tabela z wszystkimi danymi produkcyjnymi
- ✅ Podsumowanie materiałów (powierzchnia płyt w m²)
- ✅ Podsumowanie obrzeży (długość w metrach)
- ✅ Szacowanie kosztu materiału

### Eksport CSV PRO100
- ✅ Format zgodny z PRO100 (separator `;`)
- ✅ 22 kolumny wg specyfikacji
- ✅ BOM UTF-8 dla polskich znaków
- ✅ Obrzeża: istnienie, grubość, kod per krawędź
- ✅ Kod materiału, usłojenie, info 1/2
- ✅ Eksport jednego mebla lub całego projektu

### Zarządzanie projektem
- ✅ **Zapis do JSON** — pełny eksport projektu
- ✅ **Import z JSON** — przywracanie projektu
- ✅ **Autosave** do localStorage
- ✅ **Undo / Redo** (do 80 kroków)
- ✅ Skróty klawiaturowe (Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+N, Delete, Escape, F)
- ✅ Wersjonowanie mebla (auto-inkrementacja przy zmianach)

### Presety materiałów i obrzeży
- ✅ 12 predefiniowanych materiałów (laminaty, HDF, płyta wiórowa)
- ✅ 11 predefiniowanych obrzeży (różne grubości i kolory)
- ✅ Ceny za m² i za metr bieżący
- ✅ Szybki wybór z dropdowna

### Walidacje
- ✅ Blokowanie niemożliwych wymiarów (min/max)
- ✅ Ostrzeganie przy kolizjach półek
- ✅ Ostrzeganie gdy półka nie mieści się w bryle
- ✅ Ostrzeganie przy zbyt niskim czole szuflady
- ✅ Ostrzeganie przy ekstremalnych wymiarach

---

## 🏗️ Architektura

### Struktura plików
```
FurniturePro/
├── index.html                 # Główny plik — shell aplikacji + modale
├── css/
│   └── app.css               # Design system (CSS custom properties)
├── js/
│   ├── store.js              # State management z undo/redo
│   ├── models.js             # Modele danych, generatory brył, walidacja
│   ├── viewport.js           # Silnik 3D (Three.js + OrbitControls)
│   ├── export.js             # System formatek, CSV PRO100, podsumowania
│   ├── ui.js                 # Renderowanie paneli UI
│   └── app.js                # Main entry point, binding, inicjalizacja
├── example_export.csv         # Przykładowy eksport CSV PRO100
└── README.md                  # Dokumentacja
```

### Model danych

#### Project
```
{ name, room, createdAt }
```

#### Furniture
```
{ id, name, type, width, height, depth, materialId, edgeBandId, thickness,
  hasBack, backMaterial, backOffset, hasBaseboard, baseboardHeight,
  shelfCount, drawerCount, elements[], brackets[], locked, version, createdAt }
```

#### Element
```
{ id, name, type, length, width, thickness, x, y, z,
  materialId, color, edges { front, back, left, right },
  grain, visible, deleted, locked, notes, elementNumber }
```

#### Edge (per krawędź)
```
{ has: boolean, bandId: string }
```

#### Material
```
{ id, name, thickness, color, code, type, priceM2 }
```

#### EdgeBand
```
{ id, name, thickness, color, code, priceM }
```

### Typy mebli
| Typ | Opis | Generator |
|-----|------|-----------|
| `cabinet` | Szafka z półkami | `Models.generateCabinet()` |
| `shelf` | Półka naścienna | `Models.generateShelf()` |
| `drawer_unit` | Komoda z szufladami | `Models.generateDrawerUnit()` |
| `panel` | Pojedyncza płyta | `Models.generatePanel()` |

---

## 📋 Ścieżki funkcjonalne (URI)

| Funkcja | Ścieżka | Opis |
|---------|---------|------|
| Aplikacja główna | `index.html` | Pełny interfejs CAD z 3D |
| Przykładowy CSV | `example_export.csv` | Wzorcowy eksport PRO100 |

---

## 🎮 Skróty klawiaturowe

| Skrót | Akcja |
|-------|-------|
| `Ctrl+Z` | Cofnij |
| `Ctrl+Y` | Ponów |
| `Ctrl+S` | Zapisz projekt JSON |
| `Ctrl+N` | Nowy mebel |
| `Delete` | Usuń zaznaczony element |
| `Escape` | Odznacz / zamknij modal |
| `F` | Dopasuj widok kamery |
| `Podwójne kliknięcie` | Dopasuj widok |

---

## 📊 Format CSV PRO100

### Kolumny
```
Typ pola; Nazwa elementu; Nazwa płyty; Długość; Szerokość; Ilość;
Okleina przód - czy istnieje; Okleina tył - czy istnieje;
Okleina lewo - czy istnieje; Okleina prawo - czy istnieje;
Okleina przód - grubość; Okleina tył - grubość;
Okleina lewo - grubość; Okleina prawo - grubość;
Okleina przód - Kod; Okleina tył - Kod;
Okleina lewo - Kod; Okleina prawo - Kod;
Kod materiału; Usłojenie; Info 1; Info 2
```

### Reguły
- Separator: `;` (średnik)
- Kodowanie: UTF-8 z BOM
- Grubość płyty w nazwie materiału: `Biały 18mm`, `HDF Biały 3mm`
- Kody materiałów: `LAM_BIALY_18`, `HDF_BIALY_3`
- Obrzeża: `1`/`0` dla istnienia, grubość w mm, kod
- Usłojenie: `R` (wzdłuż) lub `N` (brak)
- Info 1: nazwa mebla, Info 2: pomieszczenie

---

## 🔧 Predefiniowane materiały

### Płyty
| Nazwa | Grubość | Kod | Cena/m² |
|-------|---------|-----|---------|
| Biały 18mm | 18 | LAM_BIALY_18 | 45 zł |
| Dąb Craft 18mm | 18 | LAM_DAB_CRAFT_18 | 58 zł |
| Dąb Sonoma 18mm | 18 | LAM_DAB_SONOMA_18 | 55 zł |
| Orzech 18mm | 18 | LAM_ORZECH_18 | 62 zł |
| Czarny 18mm | 18 | LAM_CZARNY_18 | 52 zł |
| Antracyt 18mm | 18 | LAM_ANTRACYT_18 | 52 zł |
| Szary 18mm | 18 | LAM_SZARY_18 | 48 zł |
| HDF Biały 3mm | 3 | HDF_BIALY_3 | 12 zł |
| HDF Czarny 3mm | 3 | HDF_CZARNY_3 | 14 zł |

### Obrzeża
| Nazwa | Grubość | Kod | Cena/m |
|-------|---------|-----|--------|
| Biały 0.4mm | 0.4 | EDGE_BIALY_04 | 1.20 zł |
| Biały 2mm | 2 | EDGE_BIALY_2 | 3.50 zł |
| Dąb Craft 0.4mm | 0.4 | EDGE_DAB_CRAFT_04 | 1.50 zł |
| Dąb Craft 2mm | 2 | EDGE_DAB_CRAFT_2 | 4.00 zł |
| Czarny 2mm | 2 | EDGE_CZARNY_2 | 3.80 zł |

---

## 🚀 Uruchomienie

1. Otwórz `index.html` w nowoczesnej przeglądarce (Chrome, Firefox, Edge)
2. Kliknij "Nowy mebel" lub użyj przycisków szybkiego dodawania
3. Wypełnij formularz parametrów i kliknij "Utwórz mebel"
4. Klikaj elementy w 3D aby je edytować
5. Użyj "Formatki" aby zobaczyć listę formatek
6. Użyj "Eksport CSV" aby pobrać plik dla PRO100

---

## 📈 Planowane rozszerzenia

### W kolejnych iteracjach
- [ ] Biblioteka gotowych modułów meblowych
- [ ] Podgląd techniczny 2D (widoki płaskie)
- [ ] System mocowań z wizualizacją 3D
- [ ] Drag & drop elementów w 3D
- [ ] Optymalizacja rozkroju (nesting)
- [ ] Tryb pomieszczenia (rzut pomieszczeń z meblami)
- [ ] Import z pliku CSV PRO100
- [ ] Eksport do PDF z rysunkami technicznymi
- [ ] Obsługa drzwi i frontów
- [ ] System zawiasów i uchwytów
- [ ] Filtrowanie po typie, materiale, kolorze
- [ ] Wersjonowanie mebli z historią

### Architektura rozszerzalna
Dodawanie nowego typu mebla wymaga jedynie:
1. Nowego generatora w `js/models.js`
2. Opcji w formularzu w `index.html`
3. Wpisu w `js/app.js` → `createFurnitureFromForm()`

---

## 🛠️ Technologie

| Warstwa | Technologia |
|---------|-------------|
| 3D Engine | Three.js r150 + OrbitControls |
| UI | Vanilla JavaScript (no framework) |
| State | Custom store z undo/redo |
| Styling | CSS Custom Properties, Inter font |
| Ikony | Font Awesome 6.5 |
| Export | CSV PRO100, JSON |
| Persistence | localStorage (autosave) |

---

**Uwaga**: Projekt jest w pełni funkcjonalny i gotowy do użycia. Architektura modułowa umożliwia łatwą rozbudowę o nowe typy mebli, materiały i funkcjonalności.
