# Design Document: Smart Worship Navigation

## Overview

Fitur **Smart Worship Navigation** menambahkan lapisan kecerdasan kontekstual di atas sistem navigasi slide yang sudah ada di SION Media Desktop. Sistem saat ini bersifat linear murni — setiap klik Next/Previous hanya berpindah satu slide ke depan atau belakang. Fitur ini memperkenalkan **Navigation Flow Engine** yang memahami struktur section lagu (verse, chorus, bridge, dll) dan secara otomatis menentukan slide tujuan berikutnya berdasarkan pola worship yang kontekstual.

### Prinsip Desain

1. **Non-destructive**: Tidak merombak arsitektur projection runtime yang sudah stabil. Semua perubahan bersifat additive.
2. **Graceful degradation**: Ketika lagu tidak memiliki chorus, sistem otomatis fallback ke Linear_Mode yang identik dengan perilaku saat ini.
3. **Pure function core**: Navigation Flow Engine adalah pure function stateless — mudah diuji, deterministik, dan tidak memiliki side effects.
4. **Store-first state**: Semua state navigasi dikelola di `useProjectionStore` mengikuti pola Zustand yang sudah ada.

### Alur Navigasi Smart (Contoh)

Untuk lagu dengan struktur `[INTRO] [VERSE 1] [CHORUS] [VERSE 2] [CHORUS] [BRIDGE] [VERSE 3] [CHORUS] [ENDING]`:

```
Navigation_Flow: I → V1 → C → V2 → C → B → V3 → C → E
```

Operator hanya perlu menekan Next secara berurutan — sistem akan melompat antar section secara otomatis mengikuti pola worship yang benar.

---

## Architecture

### Gambaran Komponen

```
┌─────────────────────────────────────────────────────────────────┐
│                    useProjectionStore (Zustand)                  │
│                                                                   │
│  State Baru:                                                      │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ navigationFlow  │  │ flowPosition │  │ isSmartMode      │   │
│  │ NavigationFlow  │  │ number       │  │ boolean          │   │
│  └─────────────────┘  └──────────────┘  └──────────────────┘   │
│                                                                   │
│  Actions Dimodifikasi:                                            │
│  nextSlide() ──────────────────────────────────────────────────► │
│  prevSlide() ──────────────────────────────────────────────────► │
│  computeNextState() ───────────────────────────────────────────► │
│  setSlides() ──────────────────────────────────────────────────► │
│  takeCue() ────────────────────────────────────────────────────► │
│  goToLiveSlide() ──────────────────────────────────────────────► │
│  hotSwapSlides() ──────────────────────────────────────────────► │
└─────────────────────────────────────────────────────────────────┘
           │                              ▲
           │ memanggil                    │ membaca
           ▼                              │
┌──────────────────────────────────────────────────────────────────┐
│              navigationFlowEngine.ts (Pure Functions)             │
│                                                                    │
│  classifySectionLabel(label: string): SectionType                 │
│  extractSectionBoundaries(slides: SlideData[]): SectionBoundary[] │
│  resolveNavigationFlow(slides: SlideData[]): NavigationFlow       │
│  resolveFlowPosition(slides, slideIndex, flow): number            │
│  computeSmartNext(slides, slideIndex, flow, pos): number | null   │
│  computeSmartPrev(slides, slideIndex, flow, pos): number | null   │
│  computeSmartNextSlideData(slides, slideIndex, flow, pos):        │
│    SlideData | null                                               │
└──────────────────────────────────────────────────────────────────┘
                                                │
                                                │ digunakan oleh
                                                ▼
┌──────────────────────────────────────────────────────────────────┐
│           WorshipFlowIndicator.tsx (React Component)              │
│                                                                    │
│  Props: navigationFlow, flowPosition, isSmartMode,                │
│         projectionState, onBadgeClick                             │
│                                                                    │
│  Render: Badge strip horizontal dengan highlight posisi aktif     │
└──────────────────────────────────────────────────────────────────┘
```

### Alur Data

```
lyrics_raw
    │
    ▼ generateSlidesForSong() [sudah ada]
SlideData[] (dengan sectionLabel)
    │
    ▼ setSlides() [dimodifikasi]
    ├── buildSectionIndexMap() [sudah ada] → sectionMap
    └── resolveNavigationFlow() [baru] → navigationFlow + isSmartMode
                                              │
                                              ▼
                                    useProjectionStore.state
                                    { navigationFlow, isSmartMode, flowPosition }
                                              │
                                              ▼
                                    nextSlide() / prevSlide() [dimodifikasi]
                                    computeSmartNext() / computeSmartPrev()
                                              │
                                              ▼
                                    programSlideIndex + flowPosition (diperbarui)
                                              │
                                              ▼
                                    computeNextState() [dimodifikasi]
                                    computeSmartNextSlideData()
                                              │
                                              ▼
                                    nextSlideData (akurat untuk Smart_Mode)
```

---

## Components and Interfaces

### 1. Type Definitions (tambahan ke `types.ts`)

```typescript
/**
 * Tipe section yang dikenali oleh Navigation Flow Engine.
 * 'other' adalah fallback untuk section yang tidak dikenali.
 */
export type SectionType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'ending' | 'other'

/**
 * Satu langkah dalam Navigation Flow.
 * Merepresentasikan satu section yang akan ditampilkan dalam urutan navigasi.
 */
export interface NavigationFlowStep {
  /** Tipe section yang diklasifikasikan */
  sectionType: SectionType
  /** Label asli dari sectionLabel (verbatim dari SlideData) */
  sectionLabel: string
  /** Indeks slide pertama dari section ini dalam programSlides */
  firstSlideIndex: number
  /** Indeks slide terakhir dari section ini dalam programSlides */
  lastSlideIndex: number
  /** Label singkat untuk ditampilkan di badge UI (V1, V2, C, B, I, E, atau custom) */
  badgeLabel: string
}

/**
 * Urutan navigasi yang dihitung untuk satu lagu.
 * Dalam Smart_Mode: mengikuti pola V1→C→V2→C→...
 * Dalam Linear_Mode: mengikuti urutan section asli.
 */
export interface NavigationFlow {
  /** Array langkah navigasi dalam urutan yang akan diikuti */
  steps: NavigationFlowStep[]
  /** Apakah flow ini menggunakan Smart_Mode (ada chorus) */
  isSmartMode: boolean
}

/**
 * Mode navigasi aktif.
 * SMART: Navigasi kontekstual berdasarkan struktur worship.
 * LINEAR: Navigasi linear slide-by-slide (perilaku saat ini).
 */
export type NavigationMode = 'SMART' | 'LINEAR'

/**
 * Batas section — hasil ekstraksi dari SlideData[].
 * Digunakan secara internal oleh Navigation Flow Engine.
 */
export interface SectionBoundary {
  sectionLabel: string
  sectionType: SectionType
  firstSlideIndex: number
  lastSlideIndex: number
}
```

### 2. Navigation Flow Engine (`navigationFlowEngine.ts`)

File baru: `src/renderer/src/core/projection/navigationFlowEngine.ts`

```typescript
// Semua fungsi adalah pure functions — tidak ada side effects, tidak ada state eksternal.

export function classifySectionLabel(label: string): SectionType
export function extractSectionBoundaries(slides: SlideData[]): SectionBoundary[]
export function resolveNavigationFlow(slides: SlideData[]): NavigationFlow
export function resolveFlowPosition(
  slides: SlideData[],
  slideIndex: number,
  flow: NavigationFlow
): number
export function computeSmartNext(
  slides: SlideData[],
  currentSlideIndex: number,
  flow: NavigationFlow,
  flowPosition: number
): number | null
export function computeSmartPrev(
  slides: SlideData[],
  currentSlideIndex: number,
  flow: NavigationFlow,
  flowPosition: number
): number | null
export function computeSmartNextSlideData(
  slides: SlideData[],
  currentSlideIndex: number,
  flow: NavigationFlow,
  flowPosition: number
): SlideData | null
export function generateBadgeLabel(
  sectionType: SectionType,
  sectionLabel: string,
  verseOccurrence: number
): string
```

### 3. Worship Flow Indicator (`WorshipFlowIndicator.tsx`)

File baru: `src/renderer/src/components/projection/WorshipFlowIndicator.tsx`

```typescript
interface WorshipFlowIndicatorProps {
  navigationFlow: NavigationFlow | null
  flowPosition: number
  isSmartMode: boolean
  projectionState: ProjectionState
  onBadgeClick: (step: NavigationFlowStep, stepIndex: number) => void
}

export function WorshipFlowIndicator(props: WorshipFlowIndicatorProps): React.JSX.Element
```

### 4. Modifikasi `useProjectionStore`

State baru yang ditambahkan:

```typescript
// State baru
navigationFlow: NavigationFlow | null
flowPosition: number          // Indeks dalam navigationFlow.steps, -1 jika tidak ada
isSmartMode: boolean          // Shortcut dari navigationFlow.isSmartMode

// Actions yang dimodifikasi (signature tidak berubah, perilaku berubah)
setSlides: (slides, meta?) => void      // + resolveNavigationFlow
takeCue: () => void                     // + inisialisasi flowPosition
nextSlide: () => void                   // + Smart Navigation logic
prevSlide: () => void                   // + Smart Navigation logic
computeNextState: () => void            // + computeSmartNextSlideData
goToLiveSlide: (index) => void          // + resolveFlowPosition
goToLiveSection: (section) => void      // + resolveFlowPosition
goToLiveAddress: (address) => void      // + resolveFlowPosition
hotSwapSlides: (songId, newSlides) => void // + re-resolveNavigationFlow
clearScreen: () => void                 // + reset flowPosition ke -1
```

---

## Data Models

### NavigationFlow untuk Lagu Tipikal

Contoh lagu: `[INTRO] [VERSE 1] [CHORUS] [VERSE 2] [CHORUS] [BRIDGE] [VERSE 3] [CHORUS] [ENDING]`

```
NavigationFlow {
  isSmartMode: true,
  steps: [
    { sectionType: 'intro',   sectionLabel: 'INTRO',   firstSlideIndex: 0,  lastSlideIndex: 0,  badgeLabel: 'I'  },
    { sectionType: 'verse',   sectionLabel: 'VERSE 1', firstSlideIndex: 1,  lastSlideIndex: 3,  badgeLabel: 'V1' },
    { sectionType: 'chorus',  sectionLabel: 'CHORUS',  firstSlideIndex: 4,  lastSlideIndex: 5,  badgeLabel: 'C'  },
    { sectionType: 'verse',   sectionLabel: 'VERSE 2', firstSlideIndex: 6,  lastSlideIndex: 8,  badgeLabel: 'V2' },
    { sectionType: 'chorus',  sectionLabel: 'CHORUS',  firstSlideIndex: 4,  lastSlideIndex: 5,  badgeLabel: 'C'  },
    { sectionType: 'bridge',  sectionLabel: 'BRIDGE',  firstSlideIndex: 9,  lastSlideIndex: 10, badgeLabel: 'B'  },
    { sectionType: 'verse',   sectionLabel: 'VERSE 3', firstSlideIndex: 11, lastSlideIndex: 13, badgeLabel: 'V3' },
    { sectionType: 'chorus',  sectionLabel: 'CHORUS',  firstSlideIndex: 4,  lastSlideIndex: 5,  badgeLabel: 'C'  },
    { sectionType: 'ending',  sectionLabel: 'ENDING',  firstSlideIndex: 14, lastSlideIndex: 14, badgeLabel: 'E'  },
  ]
}
```

> **Catatan penting**: Dalam Smart_Mode, chorus yang sama (firstSlideIndex/lastSlideIndex identik) dapat muncul beberapa kali dalam `steps`. Ini adalah desain yang disengaja — flow merepresentasikan urutan navigasi, bukan urutan slide unik.

### State Baru di `useProjectionStore`

```typescript
// Initial values
navigationFlow: null,
flowPosition: -1,
isSmartMode: false,
```

### Relasi `flowPosition` ↔ `programSlideIndex`

`flowPosition` adalah indeks dalam `navigationFlow.steps[]`, bukan indeks slide. Relasi keduanya:

```
flowPosition = 2  →  steps[2] = { sectionType: 'chorus', firstSlideIndex: 4, lastSlideIndex: 5 }
programSlideIndex = 4 atau 5  →  berada dalam section chorus di flowPosition 2
```

Fungsi `resolveFlowPosition(slides, slideIndex, flow)` menghitung flowPosition dari slideIndex dengan mencari step yang `firstSlideIndex <= slideIndex <= lastSlideIndex`.

---

## Section Classification Algorithm

### Algoritma `classifySectionLabel(label: string): SectionType`

Algoritma menggunakan prioritas keyword matching dengan case-insensitive comparison:

```
Input: sectionLabel (string)
Output: SectionType

1. Normalisasi: label_lower = label.toLowerCase()
2. Cek prioritas berurutan:
   a. Jika label_lower mengandung 'verse'                          → return 'verse'
   b. Jika label_lower mengandung 'chorus' ATAU 'reff' ATAU 'refrain' → return 'chorus'
   c. Jika label_lower mengandung 'bridge'                         → return 'bridge'
   d. Jika label_lower mengandung 'intro'                          → return 'intro'
   e. Jika label_lower mengandung 'ending' ATAU 'outro' ATAU 'tag' → return 'ending'
   f. Default                                                       → return 'other'
```

**Contoh klasifikasi:**

| sectionLabel | Hasil    |
| ------------ | -------- |
| `VERSE 1`    | `verse`  |
| `Verse`      | `verse`  |
| `CHORUS`     | `chorus` |
| `Reff`       | `chorus` |
| `REFRAIN`    | `chorus` |
| `Bridge`     | `bridge` |
| `INTRO`      | `intro`  |
| `ENDING`     | `ending` |
| `Outro`      | `ending` |
| `TAG`        | `ending` |
| `Pre-Chorus` | `other`  |
| `Interlude`  | `other`  |
| `` (empty)   | `other`  |

**Kasus prioritas (label mengandung beberapa kata kunci):**

| sectionLabel    | Hasil    | Alasan                                                 |
| --------------- | -------- | ------------------------------------------------------ |
| `verse chorus`  | `verse`  | `verse` memiliki prioritas lebih tinggi                |
| `chorus bridge` | `chorus` | `chorus` memiliki prioritas lebih tinggi dari `bridge` |

### Algoritma `extractSectionBoundaries(slides: SlideData[]): SectionBoundary[]`

```
Input: slides: SlideData[]
Output: SectionBoundary[]

1. Jika slides kosong → return []
2. Iterasi slides, deteksi perubahan sectionLabel:
   - Saat sectionLabel berubah dari slide sebelumnya → tutup boundary lama, buka boundary baru
   - Catat firstSlideIndex dan lastSlideIndex untuk setiap boundary
3. Klasifikasikan setiap boundary dengan classifySectionLabel()
4. Return array SectionBoundary[]
```

**Contoh:**

```
slides = [
  { slideIndex: 0, sectionLabel: 'INTRO' },
  { slideIndex: 1, sectionLabel: 'VERSE 1' },
  { slideIndex: 2, sectionLabel: 'VERSE 1' },
  { slideIndex: 3, sectionLabel: 'CHORUS' },
  { slideIndex: 4, sectionLabel: 'CHORUS' },
]

→ boundaries = [
  { sectionLabel: 'INTRO',   sectionType: 'intro',  firstSlideIndex: 0, lastSlideIndex: 0 },
  { sectionLabel: 'VERSE 1', sectionType: 'verse',  firstSlideIndex: 1, lastSlideIndex: 2 },
  { sectionLabel: 'CHORUS',  sectionType: 'chorus', firstSlideIndex: 3, lastSlideIndex: 4 },
]
```

---

## Flow Resolution Algorithm

### Algoritma `resolveNavigationFlow(slides: SlideData[]): NavigationFlow`

```
Input: slides: SlideData[]
Output: NavigationFlow

1. Guard: Jika slides kosong/null → return { steps: [], isSmartMode: false }
2. boundaries = extractSectionBoundaries(slides)
3. hasChorus = boundaries.some(b => b.sectionType === 'chorus')
4. Jika !hasChorus → return resolveLinearFlow(boundaries)
5. Jika hasChorus → return resolveSmartFlow(boundaries)
```

### `resolveLinearFlow(boundaries: SectionBoundary[]): NavigationFlow`

```
Linear_Mode: urutan section identik dengan urutan asli dari slides.

steps = boundaries.map(b => toNavigationFlowStep(b, verseCounter))
return { steps, isSmartMode: false }
```

### `resolveSmartFlow(boundaries: SectionBoundary[]): NavigationFlow`

```
Smart_Mode: pola V1→C→V2→C→...→Bridge→Vn→C→Ending

1. Pisahkan boundaries berdasarkan tipe:
   - intro: boundaries dengan sectionType === 'intro'
   - verses: boundaries dengan sectionType === 'verse' (dalam urutan asli)
   - choruses: boundaries dengan sectionType === 'chorus' (ambil yang pertama sebagai canonical chorus)
   - bridge: boundary pertama dengan sectionType === 'bridge'
   - ending: boundary pertama dengan sectionType === 'ending'
   - others: boundaries dengan sectionType === 'other'

2. canonicalChorus = choruses[0]  // Chorus yang sama digunakan berulang dalam flow

3. Bangun steps:
   a. Jika ada intro → tambahkan intro sebagai step pertama
   b. Untuk setiap verse (kecuali verse terakhir):
      - Tambahkan verse sebagai step
      - Tambahkan canonicalChorus sebagai step
   c. Jika ada bridge:
      - Tambahkan bridge sebagai step
   d. Tambahkan verse terakhir sebagai step
   e. Tambahkan canonicalChorus sebagai step (setelah verse terakhir)
   f. Jika ada ending → tambahkan ending sebagai step terakhir

4. Tambahkan 'other' sections di posisi aslinya (berdasarkan firstSlideIndex relatif)

5. return { steps, isSmartMode: true }
```

**Contoh resolusi Smart_Mode:**

```
Input boundaries:
  INTRO (intro, 0-0), VERSE 1 (verse, 1-3), CHORUS (chorus, 4-5),
  VERSE 2 (verse, 6-8), CHORUS (chorus, 4-5), BRIDGE (bridge, 9-10),
  VERSE 3 (verse, 11-13), CHORUS (chorus, 4-5), ENDING (ending, 14-14)

Output steps:
  I(0-0) → V1(1-3) → C(4-5) → V2(6-8) → C(4-5) → B(9-10) → V3(11-13) → C(4-5) → E(14-14)
```

### Algoritma `resolveFlowPosition`

```
Input: slides, slideIndex, flow
Output: number (indeks dalam flow.steps, atau -1 jika tidak ditemukan)

1. Jika flow.steps kosong atau slideIndex < 0 → return -1
2. Cari step terakhir dalam flow.steps di mana:
   step.firstSlideIndex <= slideIndex <= step.lastSlideIndex
3. Jika ditemukan → return indeks step tersebut
4. Jika tidak ditemukan → return 0 (fallback ke step pertama)
```

> **Mengapa "step terakhir"?** Karena chorus yang sama bisa muncul beberapa kali dalam flow. Saat operator berada di slide chorus, kita ingin flowPosition menunjuk ke kemunculan chorus yang paling relevan (terakhir yang cocok dalam urutan flow).

### Algoritma `computeSmartNext`

```
Input: slides, currentSlideIndex, flow, flowPosition
Output: number | null (target slideIndex, atau null jika tidak ada)

1. Jika !flow.isSmartMode → return currentSlideIndex + 1 (linear)
2. currentStep = flow.steps[flowPosition]
3. Jika currentSlideIndex < currentStep.lastSlideIndex:
   → return currentSlideIndex + 1  (masih dalam section yang sama)
4. Jika currentSlideIndex === currentStep.lastSlideIndex:
   → nextFlowPos = flowPosition + 1
   → Jika nextFlowPos >= flow.steps.length → return null (akhir lagu)
   → return flow.steps[nextFlowPos].firstSlideIndex
```

### Algoritma `computeSmartPrev`

```
Input: slides, currentSlideIndex, flow, flowPosition
Output: number | null (target slideIndex, atau null jika tidak ada)

1. Jika !flow.isSmartMode → return currentSlideIndex - 1 (linear)
2. currentStep = flow.steps[flowPosition]
3. Jika currentSlideIndex > currentStep.firstSlideIndex:
   → return currentSlideIndex - 1  (masih dalam section yang sama)
4. Jika currentSlideIndex === currentStep.firstSlideIndex:
   → prevFlowPos = flowPosition - 1
   → Jika prevFlowPos < 0 → return null (awal lagu)
   → return flow.steps[prevFlowPos].firstSlideIndex
```

---

## Store State Additions

### State Baru di `useProjectionStore`

```typescript
// Tambahan ke interface ProjectionStore
navigationFlow: NavigationFlow | null
flowPosition: number // -1 = tidak ada posisi valid
isSmartMode: boolean // shortcut dari navigationFlow?.isSmartMode ?? false
```

### Modifikasi `setSlides`

```typescript
setSlides: (slides, meta) => {
  const sectionMap = buildSectionIndexMap(slides)
  const navigationFlow = resolveNavigationFlow(slides)  // BARU
  set({
    slides,
    currentSlideIndex: 0,
    cuedSongMeta: ...,
    cuedSongBackgroundConfig: ...,
    sectionMap,
    navigationFlow,                          // BARU
    isSmartMode: navigationFlow.isSmartMode, // BARU
    // flowPosition tidak di-reset di sini — hanya di-reset saat takeCue
  })
  setTimeout(() => get().computeNextState(), 0)
}
```

### Modifikasi `takeCue`

```typescript
takeCue: () => {
  // ... kode existing ...
  const slideIndex = Math.max(0, Math.min(currentSlideIndex, slides.length - 1))

  // BARU: Hitung flowPosition untuk slide yang di-commit
  const { navigationFlow } = get()
  const newFlowPosition = navigationFlow
    ? resolveFlowPosition(slides, slideIndex, navigationFlow)
    : -1

  set({
    // ... state existing ...
    programSlides: slides,
    programSlideIndex: slideIndex,
    programSlide: slide,
    flowPosition: newFlowPosition // BARU
    // navigationFlow tidak berubah — sudah dihitung saat setSlides
  })
  // ... IPC broadcast existing ...
}
```

### Modifikasi `nextSlide`

```typescript
nextSlide: () => {
  const {
    programSlides,
    programSlideIndex,
    projectionState,
    navigationFlow,
    flowPosition,
    isSmartMode
  } = get()
  if (programSlides.length === 0) return

  const shouldAdvance = projectionState === 'LIVE' || projectionState === 'FREEZE'
  if (!shouldAdvance) return

  let nextIndex: number | null
  let newFlowPosition = flowPosition

  if (isSmartMode && navigationFlow) {
    // Smart Navigation
    nextIndex = computeSmartNext(programSlides, programSlideIndex, navigationFlow, flowPosition)
    if (nextIndex === null) return // Sudah di akhir lagu
    if (nextIndex !== programSlideIndex) {
      newFlowPosition = resolveFlowPosition(programSlides, nextIndex, navigationFlow)
    }
  } else {
    // Linear Navigation (perilaku existing)
    nextIndex = Math.min(programSlideIndex + 1, programSlides.length - 1)
    if (nextIndex === programSlideIndex) return
  }

  const slide = {
    ...programSlides[nextIndex],
    nextSlideText: programSlides[nextIndex + 1]?.text || ''
  }

  set({
    projectionState: 'LIVE',
    programSlideIndex: nextIndex,
    programSlide: slide,
    flowPosition: newFlowPosition // BARU
  })

  window.api.projection.slideUpdate(slide)
  get().computeNextState()
}
```

### Modifikasi `prevSlide`

```typescript
prevSlide: () => {
  const {
    programSlides,
    programSlideIndex,
    projectionState,
    navigationFlow,
    flowPosition,
    isSmartMode
  } = get()
  if (programSlides.length === 0) return

  const shouldNavigateLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  if (!shouldNavigateLive) return

  let prevIndex: number | null
  let newFlowPosition = flowPosition

  if (isSmartMode && navigationFlow) {
    // Smart Navigation
    prevIndex = computeSmartPrev(programSlides, programSlideIndex, navigationFlow, flowPosition)
    if (prevIndex === null) return // Sudah di awal lagu
    if (prevIndex !== programSlideIndex) {
      newFlowPosition = resolveFlowPosition(programSlides, prevIndex, navigationFlow)
    }
  } else {
    // Linear Navigation (perilaku existing)
    prevIndex = Math.max(programSlideIndex - 1, 0)
    if (prevIndex === programSlideIndex) return
  }

  const slide = {
    ...programSlides[prevIndex],
    nextSlideText: programSlides[prevIndex + 1]?.text || ''
  }

  set({
    projectionState: 'LIVE',
    programSlideIndex: prevIndex,
    programSlide: slide,
    flowPosition: newFlowPosition // BARU
  })

  window.api.projection.slideUpdate(slide)
  get().computeNextState()
}
```

### Modifikasi `computeNextState`

```typescript
computeNextState: () => {
  const {
    programSlides,
    programSlideIndex,
    nextSong,
    queuedSlides,
    navigationFlow,
    flowPosition,
    isSmartMode
  } = get()

  let nextSlideData: SlideData | null = null
  let nextIndex: number | null = null

  if (isSmartMode && navigationFlow && programSlides.length > 0) {
    // Smart Navigation: hitung next berdasarkan flow
    const smartNextIndex = computeSmartNext(
      programSlides,
      programSlideIndex,
      navigationFlow,
      flowPosition
    )
    if (smartNextIndex !== null && smartNextIndex !== programSlideIndex) {
      nextSlideData = programSlides[smartNextIndex] ?? null
      nextIndex = smartNextIndex
    }
  } else {
    // Linear Navigation (perilaku existing)
    const linearNextIndex = programSlideIndex + 1
    const hasNext = programSlides.length > 0 && linearNextIndex < programSlides.length
    nextSlideData = hasNext ? programSlides[linearNextIndex] : null
    nextIndex = hasNext ? linearNextIndex : null
  }

  const hasNextSlide = nextSlideData !== null
  // ... sisa logika existing (nextSong, readyState) ...
}
```

### Modifikasi `goToLiveSlide`

```typescript
goToLiveSlide: (index: number) => {
  // ... kode existing (executeProjectionTransition) ...
  // Setelah transisi berhasil, perbarui flowPosition:
  const { navigationFlow, programSlides } = get()
  if (navigationFlow) {
    const newFlowPosition = resolveFlowPosition(programSlides, index, navigationFlow)
    set({ flowPosition: newFlowPosition })
  }
  get().computeNextState()
}
```

### Modifikasi `hotSwapSlides`

```typescript
hotSwapSlides: (songId, newSlides) => {
  // ... kode existing ...
  // BARU: Hitung ulang navigationFlow untuk slides baru
  if (programSlide?.songId === songId) {
    const newNavigationFlow = resolveNavigationFlow(newSlides)
    const { programSlideIndex } = get()
    const newFlowPosition = resolveFlowPosition(
      newSlides,
      Math.min(programSlideIndex, newSlides.length - 1),
      newNavigationFlow
    )
    set({
      navigationFlow: newNavigationFlow,
      isSmartMode: newNavigationFlow.isSmartMode,
      flowPosition: newFlowPosition
    })
  }
}
```

### Modifikasi `clearScreen`

```typescript
clearScreen: () => {
  // ... kode existing ...
  set({
    // ... state existing ...
    flowPosition: -1 // BARU: reset flow position
  })
}
```

---

## Worship Flow Indicator Component

### Desain Visual

```
┌─────────────────────────────────────────────────────────────────┐
│  [I]  [V1] ●[C]● [V2]  [C]  [B]  [V3]  [C]  [E]              │
│        ↑ aktif  ↑ next                                          │
└─────────────────────────────────────────────────────────────────┘
```

- **Badge aktif** (flowPosition saat ini): background solid, teks terang, border highlight
- **Badge next** (flowPosition + 1): opacity lebih rendah, border subtle
- **Badge lainnya**: opacity rendah, tidak ada border

### Badge Label Generation

```typescript
function generateBadgeLabel(
  sectionType: SectionType,
  sectionLabel: string,
  verseOccurrence: number // 1-indexed, hanya untuk verse
): string {
  switch (sectionType) {
    case 'verse':
      return `V${verseOccurrence}`
    case 'chorus':
      return 'C'
    case 'bridge':
      return 'B'
    case 'intro':
      return 'I'
    case 'ending':
      return 'E'
    case 'other':
      // Gunakan 2 karakter pertama dari label asli, atau 'X' jika kosong
      return sectionLabel.slice(0, 2).toUpperCase() || 'X'
  }
}
```

### Warna Badge per Tipe Section

| SectionType | Warna Badge              | CSS Class            |
| ----------- | ------------------------ | -------------------- |
| `verse`     | Biru (accent-blue)       | `flow-badge--verse`  |
| `chorus`    | Ungu (accent-purple)     | `flow-badge--chorus` |
| `bridge`    | Amber (accent-amber)     | `flow-badge--bridge` |
| `intro`     | Hijau (accent-green)     | `flow-badge--intro`  |
| `ending`    | Merah muda (accent-rose) | `flow-badge--ending` |
| `other`     | Abu-abu (neutral)        | `flow-badge--other`  |

### Penempatan di `LivePreviewPanel.tsx`

`WorshipFlowIndicator` ditempatkan di dalam `scene-strip`, di antara Zone Left dan Zone Center, sebagai zone baru:

```tsx
{
  /* ── Zone Flow: Worship Flow Indicator ── */
}
;<div className="scene-strip__zone scene-strip__zone--flow">
  <WorshipFlowIndicator
    navigationFlow={navigationFlow}
    flowPosition={flowPosition}
    isSmartMode={isSmartMode}
    projectionState={projectionState}
    onBadgeClick={(step) => goToLiveSection(step.sectionLabel)}
  />
</div>
```

Penempatan ini:

- Tidak mengubah layout utama `ProjectionMode.tsx`
- Berada di area yang sudah ada (scene-strip)
- Dapat di-scroll horizontal jika badge melebihi lebar container
- Selalu terlihat oleh operator saat projection mode aktif

### Implementasi Scroll Horizontal

```tsx
<div className="worship-flow-indicator" role="navigation" aria-label="Alur navigasi lagu">
  <div className="worship-flow-indicator__scroll">
    {flow.steps.map((step, index) => (
      <button
        key={`${step.sectionLabel}-${index}`}
        className={[
          'flow-badge',
          `flow-badge--${step.sectionType}`,
          index === flowPosition ? 'flow-badge--active' : '',
          index === flowPosition + 1 ? 'flow-badge--next' : ''
        ].join(' ')}
        onClick={() => onBadgeClick(step, index)}
        title={`${step.sectionLabel} (Slide ${step.firstSlideIndex + 1})`}
        aria-current={index === flowPosition ? 'step' : undefined}
      >
        {step.badgeLabel}
      </button>
    ))}
  </div>
</div>
```

CSS:

```css
.worship-flow-indicator__scroll {
  display: flex;
  flex-direction: row;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.worship-flow-indicator__scroll::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Setelah melakukan prework analysis terhadap semua acceptance criteria, berikut adalah property-property yang diidentifikasi. Fitur ini sangat cocok untuk property-based testing karena:

- `Navigation Flow Engine` adalah pure functions dengan input/output yang jelas
- Ada banyak variasi input yang bermakna (berbagai kombinasi section label, urutan section, posisi slide)
- Banyak invariant universal yang harus berlaku untuk semua input valid

**Property Reflection (eliminasi redundansi):**

- Kriteria 1.2–1.6 (klasifikasi per tipe) digabung menjadi satu property komprehensif (Property 1)
- Kriteria 1.9 (deterministic) dan 2.7 (idempotent) digabung menjadi Property 2
- Kriteria 2.1–2.2 (mode detection) digabung menjadi Property 3
- Kriteria 2.3–2.5 (struktur Smart_Mode flow) digabung menjadi Property 4
- Kriteria 3.1–3.4 dan 4.1–4.4 (navigasi next/prev) digabung menjadi Property 5
- Kriteria 3.8 dan 4.6 (guard state) digabung menjadi Property 6
- Kriteria 5.1, 5.2, 5.4, 9.1–9.4 (konsistensi flowPosition) digabung menjadi Property 7
- Kriteria 8.1, 8.3, 9.5 (immutability dan error handling) digabung menjadi Property 8
- Kriteria 10.4 (round-trip parsing) menjadi Property 9

---

### Property 1: Klasifikasi Section Komprehensif

_Untuk setiap_ string `sectionLabel`, fungsi `classifySectionLabel` SHALL menghasilkan tepat satu dari enam tipe yang valid (`verse`, `chorus`, `bridge`, `intro`, `ending`, `other`), dengan aturan:

- String yang mengandung `verse` (case-insensitive) → `verse`
- String yang mengandung `chorus`, `reff`, atau `refrain` (case-insensitive) tanpa `verse` → `chorus`
- String yang mengandung `bridge` (case-insensitive) tanpa `verse` atau `chorus` → `bridge`
- String yang mengandung `intro` (case-insensitive) tanpa `verse`, `chorus`, atau `bridge` → `intro`
- String yang mengandung `ending`, `outro`, atau `tag` (case-insensitive) tanpa kata kunci di atas → `ending`
- String lainnya → `other`
- Kapitalisasi tidak mempengaruhi hasil (`VERSE`, `Verse`, `verse` → semua `verse`)

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10**

---

### Property 2: Determinisme dan Idempotence Navigation Flow Engine

_Untuk setiap_ `SlideData[]` yang valid, memanggil `resolveNavigationFlow` dua kali atau lebih dengan input yang sama SHALL menghasilkan `NavigationFlow` yang identik (sama secara struktural, bukan referensi yang sama). Tidak ada state eksternal yang mempengaruhi hasil.

**Validates: Requirements 1.9, 2.7, 8.2, 8.7**

---

### Property 3: Deteksi Mode Berdasarkan Keberadaan Chorus

_Untuk setiap_ `SlideData[]`, `resolveNavigationFlow` SHALL menghasilkan `isSmartMode = true` jika dan hanya jika array tersebut mengandung setidaknya satu slide dengan `sectionLabel` yang diklasifikasikan sebagai `chorus`. Jika tidak ada chorus, `isSmartMode = false` dan flow identik dengan urutan section asli.

**Validates: Requirements 2.1, 2.2, 2.6**

---

### Property 4: Invariant Struktural Smart_Mode Flow

_Untuk setiap_ `SlideData[]` yang mengandung setidaknya satu verse dan satu chorus, `resolveNavigationFlow` dalam Smart_Mode SHALL menghasilkan `NavigationFlow` di mana:

- Setiap verse (kecuali verse terakhir) diikuti oleh tepat satu chorus dalam urutan steps
- Verse terakhir juga diikuti oleh chorus
- Jika ada intro, intro menjadi step pertama dalam flow
- Jika ada bridge, bridge muncul setelah chorus terakhir sebelum verse terakhir
- Jika ada ending, ending menjadi step terakhir dalam flow

**Validates: Requirements 2.3, 2.4, 2.5**

---

### Property 5: Konsistensi Navigasi Smart Next/Prev

_Untuk setiap_ `SlideData[]` dengan Smart_Mode aktif, posisi slide manapun dalam flow, dan operasi `nextSlide` atau `prevSlide`:

- Jika posisi saat ini bukan slide terakhir/pertama dalam section → berpindah ke slide berikutnya/sebelumnya dalam section yang sama
- Jika posisi saat ini adalah slide terakhir dari verse → `nextSlide` berpindah ke `firstSlideIndex` dari chorus berikutnya dalam flow
- Jika posisi saat ini adalah slide pertama dari verse (bukan verse pertama) → `prevSlide` berpindah ke `firstSlideIndex` dari chorus sebelumnya dalam flow
- Jika posisi saat ini adalah slide terakhir dari chorus → `nextSlide` berpindah ke `firstSlideIndex` dari step berikutnya dalam flow
- Jika posisi saat ini adalah slide pertama dari chorus → `prevSlide` berpindah ke `firstSlideIndex` dari step sebelumnya dalam flow
- `programSlideIndex` yang dihasilkan selalu dalam rentang `[0, programSlides.length - 1]`

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 7.1, 7.2, 7.3, 8.4**

---

### Property 6: Guard State — Navigasi Diabaikan di Luar LIVE/FREEZE

_Untuk setiap_ `projectionState` yang bukan `LIVE` atau `FREEZE`, memanggil `nextSlide` atau `prevSlide` SHALL tidak mengubah `programSlideIndex`, `flowPosition`, atau `programSlide` — state tetap identik sebelum dan sesudah pemanggilan.

**Validates: Requirements 3.8, 4.6**

---

### Property 7: Konsistensi `flowPosition` Setelah Setiap Operasi Navigasi

_Untuk setiap_ operasi yang mengubah `programSlideIndex` (`takeCue`, `nextSlide`, `prevSlide`, `goToLiveSlide`, `goToLiveSection`, `goToLiveAddress`), `flowPosition` yang dihasilkan SHALL selalu valid:

- `flowPosition` berada dalam rentang `[-1, navigationFlow.steps.length - 1]`
- Jika `navigationFlow` tidak null dan `programSlideIndex >= 0`, maka `flow.steps[flowPosition].firstSlideIndex <= programSlideIndex <= flow.steps[flowPosition].lastSlideIndex`
- Navigasi manual tidak mengubah `navigationFlow` — hanya `flowPosition` yang berubah

**Validates: Requirements 5.2, 5.3, 5.4, 5.6, 9.1, 9.2, 9.3, 9.4, 9.5**

---

### Property 8: Immutability dan Robustness Navigation Flow Engine

_Untuk setiap_ input ke `resolveNavigationFlow` (termasuk `null`, `undefined`, array kosong, array dengan `sectionLabel` kosong):

- Fungsi tidak pernah melempar exception
- Fungsi tidak memodifikasi array input (immutable)
- Untuk input tidak valid → mengembalikan `{ steps: [], isSmartMode: false }`
- Memanggil fungsi dengan input yang sama tidak pernah menghasilkan efek samping pada state eksternal

**Validates: Requirements 2.9, 8.1, 8.2, 8.3, 10.6**

---

### Property 9: Round-Trip Parsing Section Labels

_Untuk setiap_ `lyrics_raw` yang valid yang mengandung section markers dalam format `[SECTION_NAME]`, proses parsing `lyrics_raw → SlideData[] → ekstrak unique sectionLabels` SHALL menghasilkan set section labels yang ekuivalen dengan set marker names dalam `lyrics_raw`. Setiap slide yang berasal dari section bermarker memiliki `sectionLabel` yang sama dengan nama marker-nya.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

---

## Error Handling

### Navigation Flow Engine

| Kondisi Error                                                                | Penanganan                                               |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `slides` adalah `null` atau `undefined`                                      | Return `{ steps: [], isSmartMode: false }` secara silent |
| `slides` adalah array kosong `[]`                                            | Return `{ steps: [], isSmartMode: false }` secara silent |
| `slides` mengandung elemen dengan `sectionLabel` kosong                      | Diklasifikasikan sebagai `other`, diproses normal        |
| `slideIndex` di luar rentang `[0, slides.length-1]` di `resolveFlowPosition` | Return `-1` (tidak ada posisi valid)                     |
| `flowPosition` di luar rentang di `computeSmartNext/Prev`                    | Fallback ke linear navigation                            |

### Store Actions

| Kondisi Error                                              | Penanganan                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `nextSlide` dipanggil saat `programSlides` kosong          | Return early, tidak ada perubahan state                                       |
| `nextSlide` dipanggil saat sudah di akhir flow             | Return early, tidak ada perubahan state (tidak melewati batas)                |
| `prevSlide` dipanggil saat sudah di awal flow              | Return early, tidak ada perubahan state (tidak melewati batas)                |
| `resolveNavigationFlow` gagal (exception tidak terduga)    | Catch error, log warning, fallback ke `{ steps: [], isSmartMode: false }`     |
| `hotSwapSlides` dengan slides kosong saat Smart_Mode aktif | Reset `navigationFlow` ke empty, `isSmartMode` ke false, `flowPosition` ke -1 |

### Worship Flow Indicator

| Kondisi Error                                         | Penanganan                                      |
| ----------------------------------------------------- | ----------------------------------------------- |
| `navigationFlow` adalah `null`                        | Render state kosong (tidak ada badge)           |
| `flowPosition` di luar rentang `steps`                | Tidak ada badge yang di-highlight sebagai aktif |
| `projectionState` adalah `CLEAR` atau `LOGO`          | Render state kosong                             |
| `onBadgeClick` dipanggil dengan step yang tidak valid | Guard check sebelum memanggil `goToLiveSection` |

---

## Testing Strategy

### Pendekatan Dual Testing

Fitur ini menggunakan dua lapisan pengujian yang saling melengkapi:

1. **Property-based tests**: Memverifikasi invariant universal di `navigationFlowEngine.ts` (pure functions)
2. **Unit tests**: Memverifikasi perilaku spesifik di store actions dan komponen UI

### Library Property-Based Testing

Gunakan **[fast-check](https://fast-check.dev/)** — library PBT untuk TypeScript/JavaScript yang sudah tersedia di ekosistem Node.js.

```bash
npm install --save-dev fast-check
```

### Konfigurasi Property Tests

- Minimum **100 iterasi** per property test (default fast-check: 100)
- Setiap property test harus memiliki komentar referensi ke property dalam design document
- Format tag: `// Feature: smart-worship-navigation, Property N: <deskripsi singkat>`

### File Test

```
src/renderer/src/core/projection/__tests__/
  navigationFlowEngine.property.test.ts   ← Property-based tests
  navigationFlowEngine.unit.test.ts       ← Unit tests untuk edge cases
  slideEngine.property.test.ts            ← Round-trip parsing test

src/renderer/src/store/__tests__/
  useProjectionStore.smart-nav.test.ts    ← Store integration tests
```

### Property Tests (`navigationFlowEngine.property.test.ts`)

```typescript
import fc from 'fast-check'
import {
  classifySectionLabel,
  resolveNavigationFlow,
  computeSmartNext,
  computeSmartPrev
} from '../navigationFlowEngine'

// Feature: smart-worship-navigation, Property 1: Klasifikasi Section Komprehensif
test('classifySectionLabel selalu menghasilkan tipe yang valid', () => {
  fc.assert(
    fc.property(fc.string(), (label) => {
      const result = classifySectionLabel(label)
      const validTypes = ['verse', 'chorus', 'bridge', 'intro', 'ending', 'other']
      expect(validTypes).toContain(result)
    }),
    { numRuns: 100 }
  )
})

// Feature: smart-worship-navigation, Property 1: Case-insensitivity
test('classifySectionLabel case-insensitive untuk semua kata kunci', () => {
  fc.assert(
    fc.property(fc.constantFrom('verse', 'VERSE', 'Verse', 'vErSe'), (label) => {
      expect(classifySectionLabel(label)).toBe('verse')
    }),
    { numRuns: 100 }
  )
})

// Feature: smart-worship-navigation, Property 2: Determinisme
test('resolveNavigationFlow deterministik untuk input yang sama', () => {
  fc.assert(
    fc.property(arbitrarySlideDataArray(), (slides) => {
      const flow1 = resolveNavigationFlow(slides)
      const flow2 = resolveNavigationFlow(slides)
      expect(flow1).toEqual(flow2)
    }),
    { numRuns: 100 }
  )
})

// Feature: smart-worship-navigation, Property 3: Deteksi Mode
test('isSmartMode true jika dan hanya jika ada chorus', () => {
  fc.assert(
    fc.property(arbitrarySlideDataArray(), (slides) => {
      const flow = resolveNavigationFlow(slides)
      const hasChorus = slides.some((s) => classifySectionLabel(s.sectionLabel) === 'chorus')
      expect(flow.isSmartMode).toBe(hasChorus)
    }),
    { numRuns: 100 }
  )
})

// Feature: smart-worship-navigation, Property 4: Invariant Struktural Smart_Mode
test('dalam Smart_Mode, setiap verse diikuti chorus dalam flow', () => {
  fc.assert(
    fc.property(arbitrarySlideDataArrayWithChorus(), (slides) => {
      const flow = resolveNavigationFlow(slides)
      if (!flow.isSmartMode) return // skip jika tidak smart mode
      for (let i = 0; i < flow.steps.length - 1; i++) {
        if (flow.steps[i].sectionType === 'verse') {
          expect(flow.steps[i + 1].sectionType).toBe('chorus')
        }
      }
    }),
    { numRuns: 100 }
  )
})

// Feature: smart-worship-navigation, Property 5: Konsistensi Navigasi
test('computeSmartNext menghasilkan index yang valid', () => {
  fc.assert(
    fc.property(arbitraryNavigationScenario(), ({ slides, flow, slideIndex, flowPosition }) => {
      const nextIndex = computeSmartNext(slides, slideIndex, flow, flowPosition)
      if (nextIndex !== null) {
        expect(nextIndex).toBeGreaterThanOrEqual(0)
        expect(nextIndex).toBeLessThan(slides.length)
      }
    }),
    { numRuns: 100 }
  )
})

// Feature: smart-worship-navigation, Property 8: Robustness
test('resolveNavigationFlow tidak melempar exception untuk input apapun', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          songId: fc.integer(),
          slideIndex: fc.integer({ min: 0 }),
          text: fc.string(),
          sectionLabel: fc.string()
        })
      ),
      (slides) => {
        expect(() => resolveNavigationFlow(slides as any)).not.toThrow()
      }
    ),
    { numRuns: 100 }
  )
})

// Feature: smart-worship-navigation, Property 9: Round-Trip Parsing
test('parsing lyrics_raw round-trip mempertahankan section labels', () => {
  fc.assert(
    fc.property(arbitraryLyricsWithMarkers(), ({ lyricsRaw, markerNames }) => {
      const slides = generateSlides(1, lyricsRaw)
      const parsedLabels = new Set(slides.map((s) => s.sectionLabel).filter(Boolean))
      const originalMarkers = new Set(markerNames)
      expect(parsedLabels).toEqual(originalMarkers)
    }),
    { numRuns: 100 }
  )
})
```

### Unit Tests untuk Edge Cases

```typescript
// navigationFlowEngine.unit.test.ts

describe('resolveNavigationFlow edge cases', () => {
  test('array kosong menghasilkan flow kosong', () => {
    expect(resolveNavigationFlow([])).toEqual({ steps: [], isSmartMode: false })
  })

  test('null input menghasilkan flow kosong tanpa exception', () => {
    expect(() => resolveNavigationFlow(null as any)).not.toThrow()
    expect(resolveNavigationFlow(null as any)).toEqual({ steps: [], isSmartMode: false })
  })

  test('lagu tanpa chorus menggunakan Linear_Mode', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'VERSE 2', 'VERSE 2'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(false)
    expect(flow.steps).toHaveLength(2) // 2 section unik
  })

  test('nextSlide di akhir flow tidak melewati batas', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    // Posisi di slide terakhir chorus (akhir flow)
    const lastSlideIndex = slides.length - 1
    const result = computeSmartNext(slides, lastSlideIndex, flow, flow.steps.length - 1)
    expect(result).toBeNull()
  })

  test('prevSlide di awal flow tidak melewati batas', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    const result = computeSmartPrev(slides, 0, flow, 0)
    expect(result).toBeNull()
  })
})
```

### Store Integration Tests

```typescript
// useProjectionStore.smart-nav.test.ts

describe('Smart Navigation Store Integration', () => {
  test('setSlides menghitung navigationFlow secara otomatis', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    const { navigationFlow, isSmartMode } = useProjectionStore.getState()
    expect(navigationFlow).not.toBeNull()
    expect(isSmartMode).toBe(true)
  })

  test('nextSlide dalam Smart_Mode melompat ke chorus setelah verse', () => {
    // Setup: lagu dengan VERSE 1 (2 slides) + CHORUS (2 slides)
    // Posisi: slide terakhir VERSE 1 (index 1)
    // Expected: berpindah ke slide pertama CHORUS (index 2)
    // ...
  })

  test('flowPosition selalu valid setelah goToLiveSlide', () => {
    // Generate random target index, verifikasi flowPosition konsisten
    // ...
  })

  test('navigasi manual tidak mengubah navigationFlow', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    const flowBefore = useProjectionStore.getState().navigationFlow
    useProjectionStore.getState().goToLiveSlide(2)
    const flowAfter = useProjectionStore.getState().navigationFlow
    expect(flowAfter).toEqual(flowBefore)
  })
})
```

### Unit Tests untuk Worship Flow Indicator

```typescript
// WorshipFlowIndicator.test.tsx

test('menampilkan badge untuk setiap step dalam flow', () => {
  const flow = makeFlow(['intro', 'verse', 'chorus', 'verse', 'chorus'])
  render(<WorshipFlowIndicator navigationFlow={flow} flowPosition={0} ... />)
  expect(screen.getAllByRole('button')).toHaveLength(5)
})

test('badge aktif memiliki aria-current="step"', () => {
  const flow = makeFlow(['verse', 'chorus'])
  render(<WorshipFlowIndicator navigationFlow={flow} flowPosition={1} ... />)
  const activeBadge = screen.getByRole('button', { name: /C/i })
  expect(activeBadge).toHaveAttribute('aria-current', 'step')
})

test('state kosong saat projectionState adalah CLEAR', () => {
  render(<WorshipFlowIndicator projectionState="CLEAR" navigationFlow={null} ... />)
  expect(screen.queryAllByRole('button')).toHaveLength(0)
})

test('klik badge memanggil onBadgeClick dengan step yang benar', () => {
  const onBadgeClick = jest.fn()
  const flow = makeFlow(['verse', 'chorus'])
  render(<WorshipFlowIndicator navigationFlow={flow} onBadgeClick={onBadgeClick} ... />)
  fireEvent.click(screen.getByRole('button', { name: /C/i }))
  expect(onBadgeClick).toHaveBeenCalledWith(flow.steps[1], 1)
})
```

### Keseimbangan Unit Test vs Property Test

- **Property tests** menangani: klasifikasi section, resolusi flow, navigasi smart, round-trip parsing
- **Unit tests** menangani: edge cases spesifik (null input, batas akhir/awal), integrasi store, rendering UI
- Hindari duplikasi: jika property test sudah mencakup suatu perilaku, tidak perlu unit test terpisah untuk kasus yang sama

---
