# Project Management MVP - Detailed Implementation Plan

## Part 1: Plan & Discovery ✓

### Substeps:

1. ✓ Review existing frontend demo and document code structure in frontend/AGENTS.md
   - Success: Frontend code documented with components, types, and architecture described
   - Test: Team confirms the documentation matches current implementation

2. ✓ Create enriched project plan with detailed substeps for each part
   - Success: PLAN.md contains 5-10 substeps per part with clear success criteria
   - Test: Each substep is actionable and unambiguous

3. ✓ Define the data models for users, boards, and cards
   - Success: TypeScript types defined that will support all features through Part 10
   - Test: Types can model example scenarios (multi-user, multiple boards per user, card updates)

4. ✓ Plan the Docker setup: base image, volume structure, port mapping
   - Success: Docker architecture documented with clear entry points for dev/prod
   - Test: Plan includes all dependencies (Python 3.11+, Node for build, uv, FastAPI)

5. ✓ Plan the FastAPI backend structure: routes, middleware, error handling
   - Success: API endpoint list documented with request/response signatures
   - Test: Can map each Part 2-10 requirement to an API endpoint

6. ✓ Plan authentication flow (hardcoded in MVP)
   - Success: Login/logout flow documented, including JWT handling
   - Test: Flow diagram shows state transitions

7. ✓ Plan the OpenRouter AI integration and structured output format
   - Success: Prompt templates and JSON schema for AI responses drafted
   - Test: Schema can represent card create/edit/move operations

8. ✓ Get user sign-off on plan, data models, and architecture
   - Success: User reviews and approves all design decisions
   - Test: No blocking questions remain

---

## Part 2: Scaffolding (Docker + Basic Backend) ✓

### Substeps:

1. ✓ Create Dockerfile with Python, uv, Node (for frontend build)
   - Success: Dockerfile follows best practices (multi-stage, minimal layers)
   - Test: Docker build completes without errors

2. ✓ Create docker-compose.yml for local development
   - Success: Compose file specifies volumes, ports, env vars
   - Test: `docker-compose up` starts successfully

3. ✓ Set up FastAPI project structure in backend/
   - Success: backend/app/main.py with basic FastAPI app
   - Test: `/docs` endpoint shows Swagger UI

4. ✓ Create start/stop scripts for Mac, Linux, Windows in scripts/
   - Success: Scripts handle Docker setup and startup cleanly
   - Test: Running script starts app, visiting localhost:8000 works, Ctrl+C stops cleanly

5. ✓ Add example API endpoint: `GET /api/hello` returning `{"message": "hello world"}`
   - Success: Endpoint returns expected JSON
   - Test: `curl localhost:8000/api/hello` returns correct response

6. ✓ Set up static file serving from backend (for frontend build)
   - Success: Backend serves index.html at `/` as fallback
   - Test: Visiting localhost:8000/ returns HTML page

7. ✓ Create minimal CI/build logic to compile frontend during Docker build
   - Success: `npm run build` runs during Docker image creation
   - Test: Docker build includes frontend build step, no errors

8. ✓ Add basic error handling and logging to FastAPI
   - Success: All exceptions caught, logged, returned with appropriate status codes
   - Test: Manual API requests show clean error responses

9. ✓ Document backend setup in docs/BACKEND.md
   - Success: Setup instructions clear, someone can start from scratch
   - Test: Another person can follow docs to run locally

---

## Part 3: Integrate Frontend

### Substeps:

1. ✓ Create production build config for frontend (next.config.ts)
   - Success: Frontend builds to static HTML/CSS/JS
   - Test: `npm run build` completes, creates .next/ folder

2. ✓ Update FastAPI to serve static frontend files from .next/
   - Success: Backend serves frontend assets (JS, CSS, images)
   - Test: Browser loads styles, scripts, and images without 404s

3. ✓ Create index route redirect so `/` loads the frontend Kanban
   - Success: Visiting localhost:8000/ shows the Kanban board demo
   - Test: Kanban board is interactive (can drag, rename columns, edit cards)

4. ✓ Add meaningful integration tests: frontend + backend API calls
   - Success: Tests verify API integration works (not just mocks)
   - Test: Integration tests pass, focus on critical user flows

5. ✓ Add E2E tests with Playwright for key Kanban interactions
   - Success: Tests verify drag-drop, rename, add/delete cards work end-to-end
   - Test: E2E tests pass for core functionality

6. ✓ Create GitHub Actions CI to run tests on each commit
   - Success: CI workflow runs unit, integration, and E2E tests
   - Test: Pushing a commit triggers CI, results appear in GitHub

7. ✓ Update docs/FRONTEND.md with testing instructions
   - Success: Instructions clear for running tests locally
   - Test: Another developer can run all tests from docs

8. ✓ Verify test coverage meets quality standards (not rigid 80% target)
   - Success: Tests cover critical paths and edge cases that matter
   - Test: Coverage adequate for confidence in releases

---

## Part 4: User Authentication (Dummy Credentials) ✓

### Substeps:

1. ✓ Create LoginPage component with email/password form
   - Success: Form renders, validates input, submits
   - Test: Page displays at /login, form accepts "user"/"password"

2. ✓ Add login state to frontend (Context API or Zustand)
   - Success: Login state persists during page reload (localStorage or session)
   - Test: Manual test shows isLoggedIn flag toggles on login

3. ✓ Create auth middleware/guard to redirect to /login if not authenticated
   - Success: Unauthenticated users see login page, authenticated users see Kanban
   - Test: Visiting / while logged out redirects to /login

4. ✓ Add logout button to Kanban board
   - Success: Button appears and clicking logs out user
   - Test: After logout, redirected to /login; localStorage is cleared

5. ✓ Create FastAPI `/api/auth/login` endpoint with hardcoded credentials
   - Success: POST request with correct credentials returns success token
   - Test: `curl -X POST localhost:8000/api/auth/login -d '{"email":"user","password":"password"}'` returns token

6. ✓ Create FastAPI `/api/auth/logout` endpoint
   - Success: Endpoint clears session/token
   - Test: After logout, subsequent authenticated requests fail

7. ✓ Add unit tests for LoginPage component
   - Success: Tests verify form validation, submission, error handling
   - Test: Coverage for LoginPage >80%

8. ✓ Add unit tests for auth context/state management
   - Success: Tests verify login/logout state transitions
   - Test: Coverage for auth state >80%

9. ✓ Add E2E tests for full login/logout flow
   - Success: Playwright tests verify clicking login button, entering creds, seeing Kanban
   - Test: E2E tests pass

10. ✓ Document auth flow in docs/
    - Success: Docs explain dummy credentials, how to change in future
    - Test: Clear enough for new developer to understand

---

## Part 5: Database Schema & Design ✓

### Substeps:

1. ✓ Design SQLite schema for users, kanban boards, columns, and cards
   - Success: Schema supports multi-user, multi-board architecture (for future)
   - Test: Schema can be represented as SQL DDL statements

2. ✓ Define JSON schema for Kanban state (for AI Structured Outputs)
   - Success: JSON schema can represent current board state with all cards/columns
   - Test: Example JSON validates against schema

3. ✓ Create database initialization script (alembic or raw SQL)
   - Success: Script creates tables if they don't exist, idempotent
   - Test: Running script twice doesn't error

4. ✓ Document schema rationale in docs/DATABASE.md
   - Success: Docs explain table structure, relationships, normalization choices
   - Test: Someone can understand design decisions from docs

5. ✓ Define Python dataclass/Pydantic models matching schema
   - Success: Models align with database tables and API responses
   - Test: Models can be serialized/deserialized to/from JSON

6. ✓ Create example data JSON file showing board structure
   - Success: JSON file is valid and complete example
   - Test: JSON passes schema validation

7. ✓ Get user sign-off on schema design
   - Success: User reviews and approves database approach
   - Test: No blocking feedback

---

## Part 6: Backend API Routes & Persistence ✓

### Substeps:

1. ✓ Create database connection pool and session management in FastAPI
   - Success: FastAPI can read/write to SQLite without errors
   - Test: Health check endpoint queries database successfully

2. ✓ Implement `GET /api/board` - fetch current board for user
   - Success: Returns board with all columns and cards for logged-in user
   - Test: API returns correct board structure, matches schema

3. ✓ Implement `POST /api/card` - create new card
   - Success: Card is added to database and board
   - Test: POST request creates card, subsequent GET returns it

4. ✓ Implement `PUT /api/card/{id}` - update card details
   - Success: Card title/details are updated in database
   - Test: PUT request updates card, GET returns updated values

5. ✓ Implement `DELETE /api/card/{id}` - delete card
   - Success: Card is removed from database
   - Test: DELETE removes card, subsequent GET doesn't return it

6. ✓ Implement `PUT /api/card/{id}/move` - move card to different column
   - Success: Card's column is updated, order is maintained
   - Test: Move request changes card's column_id, column's card order updates

7. ✓ Implement `PUT /api/column/{id}` - rename column
   - Success: Column title is updated
   - Test: PUT updates column name, GET returns new name

8. ✓ Add comprehensive unit tests for each API endpoint
   - Success: Tests cover happy paths and error cases (not found, validation errors)
   - Test: All tests pass, >80% code coverage for API handlers

9. ✓ Add integration tests that test full flow: auth → get board → modify → verify
   - Success: Tests verify state persists across requests
   - Test: Integration tests pass

10. ☐ Add error handling for concurrent edits (basic optimistic locking)
    - Deferred: MVP has a single local user; concurrent edits are not a real scenario

---

## Part 7: Frontend + Backend Integration ✓

### Substeps:

1. ✓ Create API client library in frontend (fetch wrapper with auth headers)
   - Success: Library includes functions for all CRUD operations
   - Test: Client can make requests to backend, auth tokens are sent

2. ✓ Update KanbanBoard component to load board on mount via API
   - Success: Component fetches board instead of using hardcoded data
   - Test: Page loads, calls `/api/board`, displays cards from API

3. ✓ Update card drag-drop to call API on move
   - Success: Moving card triggers PUT `/api/card/{id}/move`
   - Test: Drag card, refresh page, card is in new column

4. ✓ Add card creation form that calls API
   - Success: Form submits to POST `/api/card`, new card appears
   - Test: Create new card, it appears in correct column

5. ✓ Add error handling and loading states to frontend
   - Success: User sees loading message during API calls, errors shown
   - Test: Disable backend, see error message in UI

6. ✓ Add optimistic updates to UI (show changes immediately, revert on error)
   - Success: Card moves/deletes immediately, synced to server; reverts on error
   - Test: Drag card, even if API slow, see local change; on error, revert

7. ✓ Create unit tests for API client
   - Success: KanbanBoard tests mock API responses, verify client behavior
   - Test: 4 tests passing

8. ✓ Create integration tests: frontend + real backend API
   - Success: Tests start backend, make requests, verify state
   - Test: Integration tests pass

9. ✓ Create E2E tests with real frontend + backend running
    - Success: Playwright tests full workflows (create, edit, move, persist)
    - Test: E2E tests pass

---

## Part 8: AI Connectivity Setup ✓

### Substeps:

1. ✓ Add OPENROUTER_API_KEY to .env file in project root
   - Success: .env file exists with valid key
   - Test: Key can be read by Python backend

2. ✓ Create OpenRouter client library in backend
   - Success: Library can make API calls to OpenRouter
   - Test: Client initializes without errors

3. ✓ Create test endpoint `GET /api/ai/test` that calls AI with "2+2"
   - Success: Endpoint calls OpenRouter, returns AI response
   - Test: `curl localhost:8000/api/ai/test` returns "4" or similar

4. ✓ Add basic error handling for AI API failures
   - Success: If OpenRouter is down, API returns clear error
   - Test: Mock a failure, see appropriate error response

5. ✓ Create unit tests for AI client
   - Success: Tests mock OpenRouter responses
   - Test: Tests pass, coverage >80%

6. ✓ Document AI setup in docs/AI.md
   - Success: Instructions explain how to get API key, test connectivity
   - Test: New developer can follow docs to set up

---

## Part 9: AI with Kanban Context & Structured Outputs

### Substeps:

1. ☐ Define JSON schema for AI Structured Outputs
   - Success: Schema includes: response text, optional card operations (create/edit/move)
   - Test: Schema is valid, can represent example AI responses

2. ☐ Create prompt template that includes board state + user question
   - Success: Template formats Kanban JSON + user message clearly
   - Test: Generated prompt is readable and includes all context

3. ☐ Create `POST /api/ai/chat` endpoint accepting user message + conversation history
   - Success: Endpoint calls AI with board context, returns structured response
   - Test: POST request returns response with proper schema

4. ☐ Implement response parsing to extract AI message + card operations
   - Success: Parser extracts text and operations from AI response
   - Test: Can parse example AI response correctly

5. ☐ Implement card operation execution (create/edit/move)
   - Success: Operations from AI are applied to database
   - Test: AI says "create a card", it appears in database

6. ☐ Create unit tests for prompt generation
   - Success: Tests verify board state is included correctly
   - Test: Tests pass

7. ☐ Create unit tests for response parsing
   - Success: Tests verify structured output is parsed correctly
   - Test: Tests pass, coverage >80%

8. ☐ Create integration tests for full AI flow
   - Success: Test calls AI, verifies response format, checks board updates
   - Test: Integration tests pass

9. ☐ Add conversation history tracking
   - Success: Backend stores conversation history (in memory or database)
   - Test: Subsequent AI calls include prior messages

10. ☐ Document AI behavior and limitations in docs/
    - Success: Docs explain what AI can do, example prompts, known issues
    - Test: Clear enough for users to understand expectations

---

## Part 10: AI Chat Sidebar & Auto-Update

### Substeps:

1. ☐ Create ChatSidebar component with message list and input
   - Success: Component renders as sidebar on Kanban page
   - Test: Sidebar appears, messages display, input field works

2. ☐ Implement message sending logic
   - Success: User types message, clicks send, message appears in list
   - Test: Can send multiple messages, all appear in UI

3. ☐ Connect ChatSidebar to `/api/ai/chat` endpoint
   - Success: Sending message triggers API call, AI response appears
   - Test: Send message, see AI response appear

4. ☐ Implement auto-refresh of Kanban when AI makes changes
   - Success: If AI creates/edits/moves card, board updates automatically
   - Test: AI says "create a new card", board refreshes and shows it

5. ☐ Add loading state and error handling to chat
   - Success: User sees spinner while waiting for AI, errors shown
   - Test: Disable API, see error in chat

6. ☐ Add visual feedback for AI operations on cards
   - Success: Card that was created by AI highlights briefly
   - Test: AI creates card, card highlights and animates

7. ☐ Create unit tests for ChatSidebar component
   - Success: Tests verify rendering, message handling, API calls
   - Test: Coverage >80%

8. ☐ Create integration tests: ChatSidebar + KanbanBoard + API
   - Success: Tests verify AI response updates board correctly
   - Test: Integration tests pass

9. ☐ Create E2E tests for full chat + board workflow
   - Success: Playwright tests verify user can chat with AI and see board updates
   - Test: E2E tests pass

10. ☐ Polish UI/UX and document in docs/USER_GUIDE.md
    - Success: User guide explains AI capabilities, chat syntax, examples
    - Test: Users can understand how to use AI feature from docs

---

## Testing & Coverage Requirements

### Unit Tests (80% minimum coverage)

- All test files live alongside source code (`*.test.tsx`, `*.test.ts`)
- Framework: Vitest for frontend, pytest for backend
- Run: `npm run test:unit` (frontend) or `pytest` (backend)

### Integration Tests

- Frontend: Components + multiple layers (state, API client)
- Backend: API routes + database interactions
- Run: `npm run test:integration` (if separate) or included in main test

### E2E Tests (Solid Coverage)

- Framework: Playwright
- Scenarios: Login → create/edit/move cards → AI chat → verify persistence
- Run: `npm run test:e2e`

### Success Criteria for All Tests

- All tests pass locally and in CI
- No console errors or warnings
- Coverage reports generated and verified
- Tests are maintainable and document intended behavior
