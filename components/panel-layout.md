# PanelLayout

Layout master-detail à deux colonnes redimensionnables. La colonne gauche (liste) a une largeur ajustable via drag, la colonne droite (détails) occupe l'espace restant. Sur mobile, une seule colonne est visible avec une animation de slide horizontal.

La largeur du panneau gauche est persistée dans `localStorage`.

---

## Installation

Le composant dépend de :

- `@/hooks/use-panel-layout` (context)
- `@/lib/utils` (cn)

---

## Composants

| Composant | Element | Description |
|---|---|---|
| `PanelLayout` | `<div>` | Provider + wrapper flex. Gère l'état (largeur, resize, panneau actif, breakpoint). |
| `PanelLeft` | `<div>` | Colonne gauche, largeur contrôlée. Slide horizontal sur mobile. |
| `PanelRight` | `<div>` | Colonne droite, `flex-1`. Slide horizontal sur mobile. |
| `PanelResizer` | `<div>` | Handle de resize vertical par drag (masqué sur mobile). |

---

## Props

### PanelLayout

| Prop | Type | Defaut | Description |
|---|---|---|---|
| `defaultWidth` | `number` | `320` | Largeur initiale du panneau gauche (px). |
| `storageKey` | `string` | `"panel-layout-width"` | Clé localStorage pour persister la largeur. |

### PanelLeft, PanelRight, PanelResizer

Acceptent toutes les props standard de `<div>` (`className`, `children`, etc.).

---

## Constantes

| Constante | Valeur | Description |
|---|---|---|
| `MIN_WIDTH` | `320` | Largeur minimale du panneau gauche. |
| `MAX_WIDTH` | `480` | Largeur maximale du panneau gauche. |
| `DEFAULT_WIDTH` | `320` | Largeur par defaut. |
| `STORAGE_KEY` | `"panel-layout-width"` | Cle localStorage. |

---

## Hook : usePanelLayout

```tsx
import { usePanelLayout } from "@/hooks/use-panel-layout"

const {
  leftWidth, setLeftWidth,
  isResizing, setIsResizing,
  activePanel, setActivePanel,
  showDetail, showList,
  isMobile,
} = usePanelLayout()
```

| Valeur | Type | Description |
|---|---|---|
| `leftWidth` | `number` | Largeur actuelle du panneau gauche (320-480). |
| `setLeftWidth` | `(w: number) => void` | Definit la largeur (clamp automatique + persistence localStorage). |
| `isResizing` | `boolean` | `true` pendant un drag du resizer. |
| `setIsResizing` | `(v: boolean) => void` | Controle l'etat de resize. |
| `activePanel` | `"left" \| "right"` | Panneau visible sur mobile. |
| `setActivePanel` | `(p: "left" \| "right") => void` | Change le panneau actif. |
| `showDetail` | `() => void` | Raccourci pour `setActivePanel("right")`. |
| `showList` | `() => void` | Raccourci pour `setActivePanel("left")`. |
| `isMobile` | `boolean` | `true` si le viewport est < 768px. |

---

## Data Attributes

| Attribut | Element | Valeurs | Description |
|---|---|---|---|
| `data-slot` | tous | `"panel-layout"`, `"panel-left"`, `"panel-right"`, `"panel-resizer"` | Identifiant pour le ciblage CSS. |
| `data-active` | `PanelLeft`, `PanelRight` | present / absent | Panneau actuellement visible (mobile). |
| `data-resizing` | `PanelResizer` | present / absent | Indique un drag en cours. |

### Ciblage CSS

```css
/* Styler le resizer pendant un drag */
[data-slot="panel-resizer"][data-resizing] {
  /* ... */
}

/* Styler le panneau actif sur mobile */
[data-slot="panel-left"][data-active] {
  /* ... */
}
```

---

## Comportement

### Desktop (>= 768px)

- Les deux panneaux sont visibles cote a cote.
- `PanelLeft` a une largeur fixe controlee par `leftWidth`.
- `PanelRight` occupe l'espace restant (`flex-1 min-w-0`).
- `PanelResizer` permet de redimensionner par drag (pointer events).
- Pendant le drag : `user-select: none` et `cursor: col-resize` sur le body.
- La largeur est clampee entre `MIN_WIDTH` (320) et `MAX_WIDTH` (480).

### Mobile (< 768px)

- Un seul panneau visible a la fois, en plein ecran.
- Navigation par slide horizontal (`translateX`) avec transition 300ms ease-out.
- `showDetail()` slide vers le panneau droit, `showList()` revient a gauche.
- Le resizer est masque (`hidden md:flex`).
- `motion-reduce:transition-none` respecte `prefers-reduced-motion`.

### Persistence

- La largeur est lue depuis `localStorage` au mount via `useEffect` (evite les erreurs d'hydration SSR).
- Chaque appel a `setLeftWidth` ecrit dans `localStorage`.
- Lecture/ecriture entourees de `try/catch` (supporte incognito, quota depasse, etc.).

---

## Exemples

### Utilisation basique

```tsx
import {
  PanelLayout, PanelLeft, PanelResizer, PanelRight,
} from "@/components/panel-layout"

export function MyLayout() {
  return (
    <PanelLayout>
      <PanelLeft>
        <ListComponent />
      </PanelLeft>
      <PanelResizer />
      <PanelRight>
        <DetailComponent />
      </PanelRight>
    </PanelLayout>
  )
}
```

### Navigation mobile depuis un composant enfant

```tsx
import { usePanelLayout } from "@/hooks/use-panel-layout"

function ListItem({ item }: { item: Item }) {
  const { showDetail } = usePanelLayout()

  return (
    <button onClick={() => {
      selectItem(item)
      showDetail()
    }}>
      {item.title}
    </button>
  )
}

function DetailHeader() {
  const { showList, isMobile } = usePanelLayout()

  return (
    <div>
      {isMobile && (
        <button onClick={showList} aria-label="Retour">
          <ArrowLeftIcon />
        </button>
      )}
      <h2>Detail</h2>
    </div>
  )
}
```

### Largeur initiale personnalisee

```tsx
<PanelLayout defaultWidth={400}>
  {/* ... */}
</PanelLayout>
```

### Cle localStorage personnalisee

Utile si plusieurs instances coexistent :

```tsx
<PanelLayout storageKey="inbox-panel-width">
  {/* ... */}
</PanelLayout>
```

### Reagir a l'etat de resize

```tsx
function MyContent() {
  const { isResizing } = usePanelLayout()

  return (
    <div className={isResizing ? "pointer-events-none select-none" : ""}>
      {/* Desactiver les interactions pendant le resize (iframes, etc.) */}
    </div>
  )
}
```

---

## Pattern de contenu scrollable

Pour que chaque panneau scrolle independamment, structurez le contenu ainsi :

```tsx
<PanelLeft>
  <div className="flex h-full flex-col">
    {/* Header fixe */}
    <div className="shrink-0 border-b px-4 py-3">
      <h2>List</h2>
    </div>
    {/* Contenu scrollable */}
    <div className="flex-1 overflow-y-auto">
      {items.map(item => <ListItem key={item.id} item={item} />)}
    </div>
  </div>
</PanelLeft>
```

Le meme pattern s'applique a `PanelRight`. Les deux panneaux ayant `overflow-hidden`, le scroll est contenu dans chaque zone.

---

## Accessibilite

- `PanelResizer` : `role="separator"` + `aria-orientation="vertical"`
- `motion-reduce:transition-none` sur toutes les transitions (respecte `prefers-reduced-motion`)
- Le bouton retour mobile doit porter un `aria-label` ("Retour", "Back", etc.)
