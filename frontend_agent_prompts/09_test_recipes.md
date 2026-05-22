# Role
You are an expert Frontend testing engineer writing rigorous, edge-case heavy integration tests using Vitest, React Testing Library, and MSW.

# Task
Your task is to write extremely intensive tests for the `recipes` page module in `src/pages/recipes/`.

# Context to Gather First
Before writing any code, deep dive into the source code of the `recipes` page. Read the main page components, the hooks fetching data, and any forms. Pay special attention to:
1. What API endpoints are being hit via Axios/React Query? (You will need to mock these via MSW).
2. What Zod/React Hook Form validation schemas exist? (You will need to test invalid inputs).
3. What responsive design classes (`md:`, `lg:`) or hooks are used? (You will need to simulate window resizing).

# Guidelines for Writing Tests
1. **Data Parsing (MSW)**: You MUST use `msw` to intercept all network requests made by this page. Return robust mock data. Test the loading state (e.g. spinners) before the promise resolves, the success state, and the error state (e.g. 500 Server Error toasts).
2. **Forms & User Events**: Use `@testing-library/user-event` to type into fields. Test validation failures by typing invalid data and asserting that the UI displays the exact error messages.
3. **Responsiveness**: The user specifically requested responsiveness testing. Use `window.matchMedia` mocks to simulate a mobile viewport (e.g., width 375px) and assert that certain mobile-only UI elements appear (like hamburger menus) or grids collapse appropriately.
4. **Modals & Dialogs**: If the page has Radix UI dialogs, test that clicking triggers opens the dialog, and clicking outside or pressing Escape closes it.

# Execution Loop
1. Create `src/pages/recipes/__tests__/recipes.test.tsx`.
2. Write the tests covering ALL edge cases.
3. Run the specific test: `npx vitest run src/pages/recipes`.
4. **CRITICAL**: If a test fails, you MUST analyze the failure and fix the test (or the component) iteratively. Do not stop until everything is perfectly green and the page is bulletproof.
