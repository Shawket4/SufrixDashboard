import os

pages = [
    "auth", "dashboard", "orgs", "branches", "users", "permissions",
    "menu", "inventory", "recipes", "bundles", "discounts", "orders",
    "shifts", "settings", "analytics", "public-menu", "menu-advisor"
]

os.makedirs("frontend_agent_prompts", exist_ok=True)

setup_template = """# Role
You are an expert Frontend testing engineer specializing in React, Vitest, React Testing Library (RTL), and MSW (Mock Service Worker).

# Task
Your task is to implement the core testing infrastructure for the `SufrixDashboard` React application. 

# Architecture to Build
1. **Dependencies**: Ensure `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `msw` are installed. Update `vite.config.ts` to support the `test` environment with `jsdom`.
2. **Setup File**: Create `src/test/setup.ts` to automatically import `@testing-library/jest-dom`. 
3. **Mocks**: Implement global mocks in `setup.ts` for:
   - `window.matchMedia` (Critical for testing responsive layouts).
   - `ResizeObserver` (Required by Radix UI components used in the app).
4. **Custom Render**: Create `src/test/utils.tsx` with a custom `render` function that wraps components in `QueryClientProvider`, `MemoryRouter`, and any i18n/theme providers so components can render in isolation without crashing.
5. **MSW Setup**: Create `src/test/mocks/server.ts` to initialize the MSW server for intercepting API calls.

# Execution Loop
- Implement these structural files.
- Ensure `npm run test` executes without crashing.
- Do not stop until the base testing infrastructure is perfectly solid.
"""

with open("frontend_agent_prompts/00_setup_infrastructure.md", "w") as f:
    f.write(setup_template)


feature_template = """# Role
You are an expert Frontend testing engineer writing rigorous, edge-case heavy integration tests using Vitest, React Testing Library, and MSW.

# Task
Your task is to write extremely intensive tests for the `{page_name}` page module in `src/pages/{page_name}/`.

# Context to Gather First
Before writing any code, deep dive into the source code of the `{page_name}` page. Read the main page components, the hooks fetching data, and any forms. Pay special attention to:
1. What API endpoints are being hit via Axios/React Query? (You will need to mock these via MSW).
2. What Zod/React Hook Form validation schemas exist? (You will need to test invalid inputs).
3. What responsive design classes (`md:`, `lg:`) or hooks are used? (You will need to simulate window resizing).

# Guidelines for Writing Tests
1. **Data Parsing (MSW)**: You MUST use `msw` to intercept all network requests made by this page. Return robust mock data. Test the loading state (e.g. spinners) before the promise resolves, the success state, and the error state (e.g. 500 Server Error toasts).
2. **Forms & User Events**: Use `@testing-library/user-event` to type into fields. Test validation failures by typing invalid data and asserting that the UI displays the exact error messages.
3. **Responsiveness**: The user specifically requested responsiveness testing. Use `window.matchMedia` mocks to simulate a mobile viewport (e.g., width 375px) and assert that certain mobile-only UI elements appear (like hamburger menus) or grids collapse appropriately.
4. **Modals & Dialogs**: If the page has Radix UI dialogs, test that clicking triggers opens the dialog, and clicking outside or pressing Escape closes it.

# Execution Loop
1. Create `src/pages/{page_name}/__tests__/{page_name}.test.tsx`.
2. Write the tests covering ALL edge cases.
3. Run the specific test: `npx vitest run src/pages/{page_name}`.
4. **CRITICAL**: If a test fails, you MUST analyze the failure and fix the test (or the component) iteratively. Do not stop until everything is perfectly green and the page is bulletproof.
"""

for i, page in enumerate(pages, start=1):
    idx = str(i).zfill(2)
    content = feature_template.format(page_name=page)
    with open(f"frontend_agent_prompts/{idx}_test_{page}.md", "w") as f:
        f.write(content)

print(f"Generated 1 setup prompt and {len(pages)} feature prompts in frontend_agent_prompts/")
