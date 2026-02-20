# Tranzit

## Stack
- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript
- Tailwind CSS v4 (no tailwind.config — uses CSS-based config in globals.css)
- Base UI (`@base-ui/react`) for primitives (Dialog, Tooltip, etc.) — NOT shadcn primitives
- Hugeicons (`@hugeicons/core-free-icons` + `@hugeicons/react`) for icons
- bun as package manager and runner

## Commands
- `bun run dev` — dev server (Turbopack, port 34000)
- `bun run build` — production build (always verify before committing)
- `bun run lint` — ESLint
- `npx tsc --noEmit` — type check (no emit)

## Conventions
- User communicates in French
- CSS utility helper: `cn()` from `lib/utils.ts` (clsx + tailwind-merge)
- Custom sidebar component at `components/sidebar.tsx` with context in `hooks/use-sidebar.ts`
- Accessibility: always add `motion-reduce:` variants on animations/transitions
- Mobile: use `overscroll-behavior: contain` on modals, `env(safe-area-inset-bottom)` on bottom drawers
- Use `next/link` Link component (not `<a>`) for internal navigation
- `optimizePackageImports` configured in next.config.ts for @hugeicons barrel imports

## Component Patterns
- Compound components: Context provider + sub-components with `data-slot` attributes (see `sidebar.tsx`, `panel-layout.tsx`)
- Each compound component has a companion `.md` doc file and a dedicated hook in `hooks/`
- localStorage hydration: use `useState(default)` + `useEffect` post-mount — NOT lazy initializer (causes hydration mismatch)
- Media queries: use `useSyncExternalStore` with `matchMedia` (avoids `set-state-in-effect` lint error)

## GitHub
- Repo: kkzakaria/tranzit
- Main branch protected — all changes via PRs
- Commit style: imperative, concise subject line describing the "why"
