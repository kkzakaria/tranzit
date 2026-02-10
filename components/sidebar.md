# Sidebar

Sidebar réutilisable inspirée de Supabase avec trois modes de fonctionnement :

- **Réduit** (48px) : icônes seulement, tooltips au survol
- **Élargi au hover** (~208px) : position absolue, survole le contenu sans le pousser
- **Épinglé** (~208px) : dans le flux, pousse le contenu principal

L'état "pinned" est persisté dans `localStorage`.

---

## Installation

Le composant dépend de :

- `@base-ui/react` (Tooltip)
- `@hugeicons/core-free-icons` + `@hugeicons/react` (icônes)
- `@/hooks/use-sidebar` (context)
- `@/lib/utils` (cn)
- `@/components/ui/separator` (shadcn)

---

## Composants

| Composant | Élément | Description |
|---|---|---|
| `SidebarProvider` | `<div>` | Fournit le context. Gère l'état pinned/hovered/expanded. |
| `Sidebar` | `<div>` + `<aside>` | Conteneur racine. Le wrapper gère la largeur du spacer, l'aside contient la navigation. |
| `SidebarHeader` | `<div>` | Zone haute optionnelle (logo, nom projet). |
| `SidebarContent` | `<div>` | Zone scrollable centrale pour les groupes. |
| `SidebarGroup` | `<div>` | Groupe de navigation. |
| `SidebarGroupLabel` | `<div>` | Label du groupe. Masqué automatiquement en mode réduit. |
| `SidebarGroupContent` | `<ul>` | Liste d'items du groupe. |
| `SidebarItem` | `<li>` + `<a>`/`<button>` | Item de navigation avec icône et label. Tooltip quand réduit. |
| `SidebarSeparator` | `<Separator>` | Séparateur visuel entre groupes. |
| `SidebarFooter` | `<div>` | Zone basse (pin toggle, user info, etc.). |
| `SidebarPinToggle` | `<button>` | Bouton pour épingler/désépingler la sidebar. |
| `SidebarInset` | `<main>` | Zone de contenu principal, `flex-1 overflow-auto`. |
| `SidebarTrigger` | `<button>` | Bouton hamburger pour ouvrir le drawer mobile. Masqué sur desktop (`md:hidden`). |

---

## Props

### SidebarProvider

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `defaultPinned` | `boolean` | `false` | État initial de l'épinglage. |
| `mobileMode` | `"drawer" \| "sheet-left" \| "sheet-right"` | `"drawer"` | Mode d'affichage mobile. |

### Sidebar

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `collapsedWidth` | `number` | `48` | Largeur en mode réduit (px). |
| `expandedWidth` | `number` | `208` | Largeur en mode élargi (px). |

### SidebarItem

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `icon` | `IconSvgElement` | requis | Icône Hugeicons à afficher. |
| `active` | `boolean` | `false` | Marque l'item comme actif. Ajoute `data-active` et `aria-current="page"`. |
| `href` | `string` | — | Si fourni, rend un `<a>`. Sinon, rend un `<button>`. |
| `children` | `ReactNode` | requis | Label textuel de l'item. |

---

## Hook : useSidebar

```tsx
import { useSidebar } from "@/hooks/use-sidebar"

const { pinned, hovered, expanded, mobileOpen, setPinned, togglePinned, setHovered, setMobileOpen } = useSidebar()
```

| Valeur | Type | Description |
|---|---|---|
| `pinned` | `boolean` | Sidebar épinglée ou non. |
| `hovered` | `boolean` | Sidebar survolée ou non. |
| `expanded` | `boolean` | Dérivé : `pinned \|\| hovered`. |
| `mobileOpen` | `boolean` | Drawer mobile ouvert ou non. |
| `mobileMode` | `MobileMode` | Mode mobile actuel (`"drawer"`, `"sheet-left"`, `"sheet-right"`). |
| `setPinned` | `(v: boolean) => void` | Définit l'état pinned. |
| `togglePinned` | `() => void` | Bascule l'état pinned. |
| `setHovered` | `(v: boolean) => void` | Définit l'état hovered. |
| `setMobileOpen` | `(v: boolean) => void` | Ouvre/ferme le drawer mobile. |

---

## Data Attributes

| Attribut | Élément | Valeurs | Description |
|---|---|---|---|
| `data-state` | `aside` | `"expanded"` / `"collapsed"` | État actuel de la sidebar. |
| `data-pinned` | `aside` | présent / absent | Indique si la sidebar est épinglée. |
| `data-active` | lien dans `SidebarItem` | présent / absent | Indique l'item actif. |
| `data-slot` | tous | nom du composant | Identifiant pour le ciblage CSS. |

### Ciblage CSS via groupe

La sidebar utilise `group/sidebar` pour cascader l'état aux descendants :

```
group-data-[state=collapsed]/sidebar:…
group-data-[state=expanded]/sidebar:…
```

---

## Exemples

### Utilisation basique

```tsx
import { Home01Icon, Settings01Icon } from "@hugeicons/core-free-icons"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarInset, SidebarItem,
  SidebarPinToggle, SidebarProvider,
} from "@/components/sidebar"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarItem href="/" icon={Home01Icon} active>
                Home
              </SidebarItem>
              <SidebarItem href="/settings" icon={Settings01Icon}>
                Settings
              </SidebarItem>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarPinToggle />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
```

### Avec groupes et labels

```tsx
<SidebarContent>
  <SidebarGroup>
    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarItem href="/" icon={Home01Icon}>Home</SidebarItem>
      <SidebarItem href="/dashboard" icon={DashboardSquare01Icon}>Dashboard</SidebarItem>
    </SidebarGroupContent>
  </SidebarGroup>
  <SidebarSeparator />
  <SidebarGroup>
    <SidebarGroupLabel>Account</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarItem href="/profile" icon={UserIcon}>Profile</SidebarItem>
      <SidebarItem href="/settings" icon={Settings01Icon}>Settings</SidebarItem>
    </SidebarGroupContent>
  </SidebarGroup>
</SidebarContent>
```

### Avec header (logo)

```tsx
<Sidebar>
  <SidebarHeader>
    <img src="/logo.svg" alt="Logo" className="size-6" />
    <span className="truncate text-sm font-semibold
      group-data-[state=collapsed]/sidebar:hidden">
      Mon App
    </span>
  </SidebarHeader>
  <SidebarContent>
    {/* ... */}
  </SidebarContent>
</Sidebar>
```

### Style actif personnalisé

Le composant expose `data-active` sur l'item actif. Le style est à la charge du consommateur via `className` :

```tsx
const activeClass = "data-[active]:bg-primary/10 data-[active]:text-primary data-[active]:font-semibold"

<SidebarItem href="/" icon={Home01Icon} active className={activeClass}>
  Home
</SidebarItem>
```

### Sidebar épinglée par défaut

```tsx
<SidebarProvider defaultPinned={true}>
  <Sidebar>{/* ... */}</Sidebar>
  <SidebarInset>{children}</SidebarInset>
</SidebarProvider>
```

### Largeurs personnalisées

```tsx
<Sidebar collapsedWidth={56} expandedWidth={240}>
  {/* ... */}
</Sidebar>
```

### Accéder au context depuis un composant enfant

```tsx
import { useSidebar } from "@/hooks/use-sidebar"

function MyComponent() {
  const { expanded, pinned, togglePinned } = useSidebar()

  return (
    <div>
      <p>Sidebar is {expanded ? "expanded" : "collapsed"}</p>
      <p>Sidebar is {pinned ? "pinned" : "unpinned"}</p>
      <button onClick={togglePinned}>Toggle pin</button>
    </div>
  )
}
```

---

## Mode mobile

En dessous de `md` (768px), la sidebar desktop est automatiquement masquée et remplacée par un panneau mobile. Le mode est configurable via la prop `mobileMode` sur `SidebarProvider`.

### Modes disponibles

| Mode | Description | Animation | Sizing |
|---|---|---|---|
| `drawer` (défaut) | Slide depuis le bas | `slide-in-from-bottom` / `slide-out-to-bottom` | `max-h-[85vh] w-full rounded-t-2xl` |
| `sheet-left` | Slide depuis la gauche | `slide-in-from-left` / `slide-out-to-left` | `h-full w-[280px] max-w-[85vw]` |
| `sheet-right` | Slide depuis la droite | `slide-in-from-right` / `slide-out-to-right` | `h-full w-[280px] max-w-[85vw]` |

La barre de drag (trait horizontal) n'est affichée qu'en mode `drawer`. Le bouton close est toujours présent.

### Comportement

- **≥ 768px** : sidebar desktop classique (collapsed / hover / pinned)
- **< 768px** : sidebar masquée, bouton hamburger visible dans le contenu
- Clic sur le hamburger → panneau mobile avec backdrop
- Clic sur un item → panneau se ferme automatiquement
- Clic sur le backdrop, bouton close ou Escape → panneau se ferme
- Swipe vers le bas → ferme le drawer (mode `drawer` uniquement, seuil : 80px)
- Animations via `tw-animate-css` et data attributes de `@base-ui/react Dialog`

### Composants

| Composant | Description |
|---|---|
| `SidebarTrigger` | Bouton hamburger (`md:hidden`). Appelle `setMobileOpen(true)` au clic. |
| `SidebarMobile` | Panneau mobile interne (rendu automatiquement par `Sidebar`). Utilise `Dialog` de `@base-ui/react`. |

### Utilisation

Le composant `Sidebar` rend automatiquement les deux versions (desktop + mobile). Il suffit d'ajouter `SidebarTrigger` dans le contenu principal :

```tsx
import {
  Sidebar, SidebarContent, SidebarInset, SidebarTrigger, SidebarProvider,
} from "@/components/sidebar"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider mobileMode="sheet-left">
      <Sidebar>
        <SidebarContent>{/* ... */}</SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center px-4 py-3 md:hidden">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

### Ouvrir le panneau mobile depuis n'importe quel composant

```tsx
import { useSidebar } from "@/hooks/use-sidebar"

function MobileMenuButton() {
  const { setMobileOpen } = useSidebar()
  return <button onClick={() => setMobileOpen(true)}>Menu</button>
}
```

---

## Accessibilité

- `<aside role="navigation" aria-label="Main navigation">`
- `aria-current="page"` sur l'item actif
- Focus dans la sidebar déclenche l'expansion (même comportement que hover)
- `SidebarPinToggle` : `aria-label` dynamique ("Pin sidebar" / "Unpin sidebar")
- Navigation au clavier complète avec `focus-visible` ring
- `SidebarTrigger` : `aria-label="Open menu"`
- Drawer mobile : bouton close avec `aria-label="Close menu"`, focus trap géré par `@base-ui/react Dialog`
