# AppBar

Barre de navigation fixe en haut de page avec logo, actions et avatar utilisateur. Inclut un systeme de theme (light/dark) persiste dans `localStorage` avec fallback sur la preference systeme (`prefers-color-scheme`).

---

## Installation

Le composant depend de :

- `@hugeicons/core-free-icons` + `@hugeicons/react` (icones)
- `@/hooks/use-theme` (context)
- `@/lib/utils` (cn)
- `@/components/ui/button` (Button)
- `@/components/ui/dropdown-menu` (DropdownMenu)
- `next/link` (Link)

---

## Composants

| Composant | Element | `data-slot` | Description |
|---|---|---|---|
| `ThemeProvider` | `<ThemeContext>` | — | Fournit le context theme (light/dark). Hydrate depuis `localStorage` puis preference systeme. |
| `AppBar` | `<header>` | `app-bar` | Barre fixe en haut, `h-12`, `z-50`, bordure basse. |
| `AppBarLogo` | `<div>` + `<Link>` | `app-bar-logo` | Logo avec icone et texte. Le texte est masque sur mobile (`hidden md:inline`). |
| `AppBarActions` | `<div>` | `app-bar-actions` | Conteneur flex aligne a droite pour les boutons d'action. |
| `ThemeToggle` | `<Button>` | `theme-toggle` | Bouton ghost avec icone soleil/lune. Bascule le theme au clic. |
| `NotificationButton` | `<Button>` | `notification-button` | Bouton ghost avec icone cloche et badge compteur optionnel. |
| `AppBarAvatar` | `<div>` + `<DropdownMenu>` | `app-bar-avatar` | Avatar circulaire avec menu dropdown (Profile, Settings, Sign out). |

---

## Props

### AppBar

| Prop | Type | Defaut | Description |
|---|---|---|---|
| `className` | `string` | — | Classes CSS supplementaires. |
| `children` | `ReactNode` | — | Contenu de la barre (logo, actions, etc.). |
| `...props` | `ComponentProps<"header">` | — | Toutes les props standard de `<header>`. |

### AppBarLogo

| Prop | Type | Defaut | Description |
|---|---|---|---|
| `className` | `string` | — | Classes CSS supplementaires. |
| `...props` | `ComponentProps<"div">` | — | Toutes les props standard de `<div>`. |

### AppBarActions

| Prop | Type | Defaut | Description |
|---|---|---|---|
| `className` | `string` | — | Classes CSS supplementaires. |
| `...props` | `ComponentProps<"div">` | — | Toutes les props standard de `<div>`. |

### ThemeToggle

| Prop | Type | Defaut | Description |
|---|---|---|---|
| `className` | `string` | — | Classes CSS supplementaires. |
| `...props` | `ComponentProps<typeof Button>` | — | Toutes les props de `Button`. |

### NotificationButton

| Prop | Type | Defaut | Description |
|---|---|---|---|
| `count` | `number` | — | Nombre de notifications non lues. Si > 99, affiche "99+". Si absent ou 0, le badge est masque. |
| `className` | `string` | — | Classes CSS supplementaires. |
| `...props` | `ComponentProps<typeof Button>` | — | Toutes les props de `Button`. |

### AppBarAvatar

| Prop | Type | Defaut | Description |
|---|---|---|---|
| `src` | `string` | — | URL de l'image avatar. Si absent, affiche les initiales. |
| `name` | `string` | — | Nom de l'utilisateur. Utilise pour generer les initiales et afficher dans le dropdown. |
| `email` | `string` | — | Email de l'utilisateur. Affiche dans le dropdown sous le nom. |
| `className` | `string` | — | Classes CSS supplementaires. |
| `...props` | `ComponentProps<"div">` | — | Toutes les props standard de `<div>`. |

---

## Hook : useTheme

```tsx
import { useTheme } from "@/hooks/use-theme"

const { theme, toggleTheme } = useTheme()
```

| Valeur | Type | Description |
|---|---|---|
| `theme` | `"light" \| "dark"` | Theme actuel. |
| `toggleTheme` | `() => void` | Bascule entre light et dark. Met a jour `localStorage` et la classe `dark` sur `<html>`. |

> **Note :** `useTheme` doit etre utilise dans un composant descendant de `ThemeProvider`. Sinon, une erreur est levee.

---

## Data Attributes

| Attribut | Element | Valeurs | Description |
|---|---|---|---|
| `data-slot` | `AppBar` | `"app-bar"` | Identifiant pour le ciblage CSS. |
| `data-slot` | `AppBarLogo` | `"app-bar-logo"` | Identifiant pour le ciblage CSS. |
| `data-slot` | `AppBarActions` | `"app-bar-actions"` | Identifiant pour le ciblage CSS. |
| `data-slot` | `ThemeToggle` | `"theme-toggle"` | Identifiant pour le ciblage CSS. |
| `data-slot` | `NotificationButton` | `"notification-button"` | Identifiant pour le ciblage CSS. |
| `data-slot` | `AppBarAvatar` | `"app-bar-avatar"` | Identifiant pour le ciblage CSS. |

### Ciblage CSS

```css
/* Styler la barre */
[data-slot="app-bar"] {
  /* ... */
}

/* Masquer les actions sur certains breakpoints */
[data-slot="app-bar-actions"] {
  /* ... */
}
```

---

## Exemples

### Utilisation basique

```tsx
import {
  ThemeProvider,
  AppBar, AppBarLogo, AppBarActions,
  ThemeToggle, NotificationButton, AppBarAvatar,
} from "@/components/app-bar"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppBar>
        <AppBarLogo />
        <AppBarActions>
          <ThemeToggle />
          <NotificationButton />
          <AppBarAvatar name="Zakaria K." email="zakaria@example.com" />
        </AppBarActions>
      </AppBar>
      <main className="pt-12">{children}</main>
    </ThemeProvider>
  )
}
```

### Avatar avec image personnalisee

```tsx
<AppBarAvatar
  src="/avatars/zakaria.jpg"
  name="Zakaria K."
  email="zakaria@example.com"
/>
```

Si `src` est fourni, l'image est affichee. Sinon, les initiales du `name` sont generees automatiquement (ex. "Zakaria K." -> "ZK"). Si `name` est absent, un "?" est affiche.

### Notification avec compteur

```tsx
{/* Pas de badge */}
<NotificationButton />

{/* Badge avec nombre */}
<NotificationButton count={5} />

{/* Badge plafonne a 99+ */}
<NotificationButton count={142} />
```

Le badge s'affiche uniquement quand `count` est superieur a 0. Au-dela de 99, le texte affiche "99+".

### Acceder au theme depuis un composant enfant

```tsx
import { useTheme } from "@/hooks/use-theme"

function MyComponent() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div>
      <p>Theme actuel : {theme}</p>
      <button onClick={toggleTheme}>Basculer le theme</button>
    </div>
  )
}
```

### Composition avec Sidebar

```tsx
import { ThemeProvider, AppBar, AppBarLogo, AppBarActions, ThemeToggle } from "@/components/app-bar"
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/sidebar"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppBar>
        <AppBarLogo />
        <AppBarActions>
          <ThemeToggle />
        </AppBarActions>
      </AppBar>
      <div className="flex pt-12">
        <SidebarProvider>
          <Sidebar>{/* ... */}</Sidebar>
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </div>
    </ThemeProvider>
  )
}
```

---

## Persistence du theme

- Le theme est lu depuis `localStorage` (cle `"theme"`) au mount via `useEffect` (evite les erreurs d'hydration SSR).
- Si aucune valeur stockee, le fallback est `prefers-color-scheme: dark` du systeme.
- Chaque appel a `toggleTheme` ecrit dans `localStorage` et bascule la classe `dark` sur `<html>`.
- Lecture/ecriture entourees de `try/catch` (supporte incognito, quota depasse, etc.).

---

## Comportement responsive

### Desktop (>= 768px)

- Le texte du logo ("Tranzit") est visible a cote de l'icone.
- Tous les boutons d'action sont affiches.

### Mobile (< 768px)

- Le texte du logo est masque (`hidden md:inline`), seule l'icone reste visible.
- Les boutons d'action restent visibles (icones compactes, `gap-1`).

---

## Accessibilite

- `ThemeToggle` : `aria-label` dynamique ("Switch to dark mode" / "Switch to light mode")
- `NotificationButton` : `aria-label` dynamique (`"${count} unread notifications"` / `"Notifications"`)
- `AppBarAvatar` : `aria-label="User menu"` sur le trigger du dropdown
- Avatar image : `alt` dynamique (utilise `name` si fourni, sinon "User avatar")
- `motion-reduce:transition-none` sur `ThemeToggle` et `NotificationButton` (respecte `prefers-reduced-motion`)
- Navigation au clavier complete avec `focus-visible` ring sur l'avatar
- Menu dropdown : focus trap et navigation clavier gerees par `DropdownMenu`
