# Agent Rules

## Stack Constraints

- **Styling**: Tailwind CSS only. No inline styles, no CSS modules, no styled-components.
- **Components**: Use shadcn/ui components wherever available. Do not reimplement what shadcn/ui already provides (e.g. Button, Dialog, Sheet, Table, Form, Select, Tabs, Toast, etc.).
- **Framework**: Next.js (App Router). Read `node_modules/next/dist/docs/` before writing any Next.js code — APIs and conventions may differ from training data.

---

## shadcn/ui Usage

- Always check shadcn/ui's component library before writing a component from scratch.
- Import from `@/components/ui/*` (the local copy installed by shadcn).
- Extend shadcn components via `className` (Tailwind) or the `variants` API — never fork the component source unless absolutely necessary.
- Use `cn()` from `@/lib/utils` to merge class names.


---

## React Patterns

### Components

- One component per file. File name matches the component name in kebab-case.
- Prefer named exports over default exports.
- Keep components small and focused. Extract if a component exceeds ~100 lines.

### State

- Co-locate state as close to where it's used as possible.
- Lift state only when two siblings genuinely need to share it.
- Use `useReducer` over multiple related `useState` calls.
- For server state (fetching, caching, mutations) use a data-fetching library (SWR or React Query) — do not hand-roll fetch + useEffect chains.

### Server vs Client Components (Next.js App Router)

- Default to **Server Components**. Add `"use client"` only when the component needs interactivity, browser APIs, or React hooks.
- Never put `"use client"` on a layout or page just because a child needs it — push the boundary down to the smallest possible leaf component.
- Do not fetch data in Client Components when a Server Component can do it.


### Data Fetching

- Fetch in Server Components using `async/await` directly.
- Use `loading.tsx` and `error.tsx` for route-level loading and error states.
- Wrap independent fetches in `Promise.all` to avoid sequential waterfalls.

### Forms

- Use shadcn/ui `<Form>` (built on react-hook-form + zod) for all forms.
- Define schemas with zod. Infer TypeScript types from the schema — never duplicate types.

```ts
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})
type FormValues = z.infer<typeof schema>
```

### Composition over Configuration

- Prefer composable, slot-based APIs over large prop interfaces.
- Use `children` and named slots (`header`, `footer`, etc.) to keep components flexible without a prop explosion.

---

## TypeScript

- Strict mode on. No `any`.
- Type props explicitly. Do not rely on inference for component prop interfaces.
- Colocate types with the code that uses them; only move to a shared `types/` file if used in 3+ places.

---