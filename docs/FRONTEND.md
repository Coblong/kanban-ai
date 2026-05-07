# Frontend

## Tech stack

- **Framework**: Next.js 16 (static export)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Drag-and-drop**: @dnd-kit
- **Unit tests**: Vitest + React Testing Library
- **E2E tests**: Playwright

## Development

```bash
cd frontend
npm run dev        # Dev server on http://localhost:3000
npm run build      # Production static build → frontend/out/
npm run lint
```

The dev server proxies API calls to `localhost:3000`, but in production the Next.js static output is served directly by the FastAPI backend on port 8000.

## Running tests

### Unit tests

```bash
cd frontend
npm run test:unit          # Run once
npm run test:unit:watch    # Watch mode
```

Unit tests live alongside source files (`*.test.ts`, `*.test.tsx`) and run in jsdom via Vitest. They cover:

- `src/lib/kanban.test.ts` — pure board logic (moveCard, ordering)
- `src/lib/api.integration.test.ts` — API client (fetch mocking)
- `src/components/KanbanBoard.test.tsx` — component rendering and interactions

### Coverage

```bash
cd frontend
npx vitest run --coverage
```

Coverage report is written to `coverage/`. Open `coverage/index.html` to browse.

### E2E tests (Playwright)

E2E tests run against the full Docker stack. The app must be running (or Playwright will start it automatically):

```bash
# Option 1: let Playwright manage Docker
cd frontend
npm run test:e2e

# Option 2: start the app manually first
./scripts/start.sh
cd frontend
npm run test:e2e
```

E2E tests live in `tests/` and cover: login, adding cards, drag-and-drop, column rename, logout.

### Run everything

```bash
cd frontend
npm run test:all   # unit + E2E
```

## Source structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, wraps AuthProvider
│   ├── page.tsx            # Redirects to /login if unauthenticated
│   └── login/page.tsx      # Login form
├── components/
│   ├── KanbanBoard.tsx     # Main board component (owns all state)
│   ├── KanbanColumn.tsx    # Column + card list
│   ├── KanbanCard.tsx      # Draggable card
│   ├── KanbanCardPreview.tsx
│   └── NewCardForm.tsx
└── lib/
    ├── api.ts              # Typed fetch wrapper for all backend calls
    ├── kanban.ts           # Pure data types and moveCard logic
    └── auth/
        └── AuthContext.tsx # Login state (persisted in localStorage)
```
