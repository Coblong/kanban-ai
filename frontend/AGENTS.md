# Frontend - Project Management MVP

## Architecture Overview

The frontend is a **Next.js 16** application with **React 19** that implements a drag-and-drop Kanban board UI. It uses **Tailwind CSS** for styling and **@dnd-kit** for drag-and-drop functionality. Currently, the app is a pure frontend demo with hardcoded data; it will be enhanced to connect to a FastAPI backend in later phases.

### Tech Stack

- **Framework**: Next.js 16.1.6
- **React**: 19.2.3
- **Styling**: Tailwind CSS 4 (with PostCSS)
- **Drag-Drop**: @dnd-kit (core, sortable, utilities)
- **Testing**: Vitest + Playwright + React Testing Library
- **Dev Tools**: TypeScript 5, ESLint 9, Prettier

## Directory Structure

```
src/
├── app/
│   ├── globals.css          # Global styles, CSS variables for color scheme
│   ├── layout.tsx           # Root layout with fonts (Space Grotesk, Manrope)
│   └── page.tsx             # Home page - renders KanbanBoard component
├── components/
│   ├── KanbanBoard.tsx       # Main board container (client component)
│   ├── KanbanColumn.tsx      # Column with droppable zone
│   ├── KanbanCard.tsx        # Individual card (sortable)
│   ├── KanbanCardPreview.tsx # Card preview during drag overlay
│   ├── NewCardForm.tsx       # Form to add new cards to a column
│   ├── KanbanBoard.test.tsx  # Tests for KanbanBoard
│   └── KanbanCard.test.tsx   # Tests for KanbanCard (if exists)
├── lib/
│   ├── kanban.ts            # Business logic for board operations
│   └── kanban.test.ts       # Tests for kanban utility functions
└── test/
    ├── setup.ts             # Vitest setup (DOM environment, etc.)
    └── vitest.d.ts          # TypeScript definitions for Vitest

tests/
└── kanban.spec.ts           # E2E tests with Playwright

public/
├── favicon.ico
└── other assets
```

## Components

### KanbanBoard

**File**: [src/components/KanbanBoard.tsx](src/components/KanbanBoard.tsx)

- **Type**: Client component (`"use client"`)
- **Purpose**: Main board container managing all state and drag-drop interactions
- **Key Props**: None (self-contained)
- **State**:
  - `board`: BoardData object containing columns and cards
  - `activeCardId`: ID of card currently being dragged
- **Handlers**:
  - `handleDragStart`: Sets active card for drag preview
  - `handleDragEnd`: Updates board state when card is dropped
  - `handleRenameColumn`: Updates column title
  - `handleAddCard`: Creates new card in a column
  - `handleDeleteCard`: Removes card from board
- **Dependencies**: @dnd-kit (DndContext, DragOverlay, sensors), child components

### KanbanColumn

**File**: [src/components/KanbanColumn.tsx](src/components/KanbanColumn.tsx)

- **Type**: Client component (via SortableContext)
- **Purpose**: Renders a single column with droppable zone for cards
- **Props**:
  - `column: Column` - Column data (id, title, cardIds)
  - `cards: Card[]` - Array of cards in this column
  - `onRename`, `onAddCard`, `onDeleteCard` - Callbacks to parent
- **Features**:
  - Editable column title (inline input)
  - Visual feedback on hover/over (yellow ring)
  - "Drop a card here" placeholder when empty
  - Embedded NewCardForm
- **Dependencies**: @dnd-kit/sortable, KanbanCard, NewCardForm

### KanbanCard

**File**: [src/components/KanbanCard.tsx](src/components/KanbanCard.tsx)

- **Type**: Client component (sortable item)
- **Purpose**: Individual card UI with title, details, and delete button
- **Props**:
  - `card: Card` - Card data (id, title, details)
  - `onDelete: (cardId: string) => void` - Delete callback
- **Features**: Draggable, styled with yellow accent, delete button
- **Dependencies**: @dnd-kit/sortable

### KanbanCardPreview

**File**: [src/components/KanbanCardPreview.tsx](src/components/KanbanCardPreview.tsx)

- **Type**: Presentational component
- **Purpose**: Renders card preview during drag-over (DragOverlay)
- **Props**:
  - `card: Card | null` - Card being dragged
- **Features**: Matches KanbanCard styling for visual consistency during drag

### NewCardForm

**File**: [src/components/NewCardForm.tsx](src/components/NewCardForm.tsx)

- **Type**: Client component
- **Purpose**: Form to create a new card in a column
- **Props**:
  - `onAdd: (title: string, details: string) => void` - Callback on submit
- **Features**: Text inputs for title and details, submit button

## Data Types

**File**: [src/lib/kanban.ts](src/lib/kanban.ts)

```typescript
export type Card = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardData = {
  columns: Column[];
  cards: Record<string, Card>;
};
```

## Utilities

**File**: [src/lib/kanban.ts](src/lib/kanban.ts)

Key functions:

- `createId(prefix: string): string` - Generates unique IDs (e.g., "card-123")
- `initialData: BoardData` - Hardcoded demo data with 5 columns and 8 cards
- `moveCard(columns: Column[], cardId: string, targetId: string): Column[]` - Updates board when card is moved between columns
- `isColumnId()`, `findColumnId()` - Helper functions for card movement logic

## Styling

### Color Scheme (CSS Variables)

Defined in [src/app/globals.css](src/app/globals.css):

- `--accent-yellow`: #FFF021 (highlights, accents)
- `--blue-primary`: #1C276C (links, key sections)
- `--orange-secondary`: #FFB54F (buttons, actions)
- `--navy-dark`: #09090a (headings)
- `--gray-text`: #36454F (labels, supporting text)
- `--stroke`: Border color
- `--surface-strong`: Column background
- `--shadow`: Elevation shadow

### Fonts

- **Display**: Space Grotesk (headings)
- **Body**: Manrope (text)

## Testing

### Unit Tests

- **Framework**: Vitest
- **Files**: `*.test.tsx`, `*.test.ts`
- **Coverage Target**: 80%
- **Run**: `npm run test:unit`

Current tests:

- [src/components/KanbanBoard.test.tsx](src/components/KanbanBoard.test.tsx)
- [src/lib/kanban.test.ts](src/lib/kanban.test.ts)

### E2E Tests

- **Framework**: Playwright
- **File**: [tests/kanban.spec.ts](tests/kanban.spec.ts)
- **Run**: `npm run test:e2e`
- **Scope**: Full user workflows (drag, drop, rename, create, delete)

### Test Scripts

```bash
npm run test:unit          # Run unit tests once
npm run test:unit:watch    # Run unit tests in watch mode
npm run test:e2e           # Run Playwright tests
npm run test:all           # Run all tests
```

## Known Limitations (MVP)

1. **No Backend**: All data is hardcoded in state; no persistence
2. **No Authentication**: Anyone can use the board (will add in Part 4)
3. **No AI Chat**: Chat sidebar not yet implemented (Part 10)
4. **Single Board**: Only one board per app (will support multi-user in future)
5. **In-Memory State**: Board resets on page reload

## Development Workflow

1. **Start Dev Server**:

   ```bash
   npm run dev
   # App runs on http://localhost:3000
   ```

2. **Build for Production**:

   ```bash
   npm run build
   # Creates .next/ folder with optimized assets
   npm start  # Serves built app
   ```

3. **Linting**:

   ```bash
   npm run lint
   ```

4. **Running Tests**:
   ```bash
   npm run test:unit        # Unit tests
   npm run test:e2e         # E2E tests
   npm run test:all         # All tests
   ```

## Key Dependencies Explained

- **@dnd-kit/core**: Headless drag-and-drop library (no opinionated styles)
- **@dnd-kit/sortable**: Sortable list plugin for @dnd-kit
- **clsx**: Utility for conditional CSS class names
- **React Testing Library**: Testing utilities that query by accessibility attributes

## Integration Points (Future)

These will be added in later phases:

1. **Authentication** (Part 4): Replace hardcoded state with auth context
2. **API Client** (Part 7): Replace `useState` with API calls for CRUD operations
3. **Chat Sidebar** (Part 10): Add ChatSidebar component with AI integration
4. **Real-Time Sync** (Part 7): Handle optimistic updates and conflict resolution

## Next Steps

This frontend demo will remain mostly unchanged through Part 3. Starting in Part 4:

- Add login/logout UI and authentication state
- Create API client for backend communication
- Update components to use backend API instead of local state
