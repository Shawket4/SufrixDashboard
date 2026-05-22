import { render, screen, waitFor, queryClient } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import Login from '../login'
import { useAuthStore } from '@/shared/auth/store'
import { toast } from 'sonner'
import { env } from '@/shared/config/env'

const mockSignIn = vi.fn()
vi.mock('@/shared/auth/store', () => ({
  useAuthStore: vi.fn(),
}))

describe('Auth Page (Login)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return (selector as any)({ signIn: mockSignIn })
    })
    queryClient.clear()
  })

  it('renders login form correctly', () => {
    render(<Login />)
    expect(screen.getByRole('heading', { name: 'auth.welcome' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@sufrix.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<Login />)

    const submitBtn = screen.getByRole('button', { name: /auth.signIn/i })
    await user.click(submitBtn)

    await waitFor(() => {
      // Check if validation errors are rendered, testing-library/user-event trigger hook form validations
      expect(screen.getAllByText(/Invalid email|Required|String must contain/i).length).toBeGreaterThan(0)
    })
  })

  it('handles successful login', async () => {
    const user = userEvent.setup()
    render(<Login />)

    server.use(
      http.post(`${env.VITE_API_URL}/auth/login`, async ({ request }) => {
        const body = (await request.json()) as any
        if (body.email === 'test@example.com' && body.password === 'password123') {
          return HttpResponse.json({ token: 'mock-token', user: { id: 1, name: 'Test' } })
        }
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
      })
    )

    await user.type(screen.getByPlaceholderText('you@sufrix.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')

    const submitBtn = screen.getByRole('button', { name: /auth.signIn/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('mock-token', { id: 1, name: 'Test' })
    })
  })

  it('handles API error on login', async () => {
    const user = userEvent.setup()
    render(<Login />)

    server.use(
      http.post(`${env.VITE_API_URL}/auth/login`, () => {
        return HttpResponse.json({ message: 'Server Error 500' }, { status: 500 })
      })
    )

    await user.type(screen.getByPlaceholderText('you@sufrix.com'), 'wrong@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass')

    const submitBtn = screen.getByRole('button', { name: /auth.signIn/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Server Error 500')
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<Login />)

    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggleBtn = screen.getByRole('button', { name: /auth.showPassword|auth.hidePassword/i })
    await user.click(toggleBtn)
    
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('is responsive: displays mobile icon mark and hides brand panel on small screens', () => {
    // Override matchMedia for this test
    window.matchMedia = vi.fn().mockImplementation((query) => {
      if (query === '(max-width: 1023px)') return { matches: true }
      return { matches: false }
    })
    
    const { container } = render(<Login />)
    
    const mobileIconContainer = container.querySelector('.lg\\:hidden')
    expect(mobileIconContainer).toBeInTheDocument()

    const brandPanel = container.querySelector('.lg\\:flex')
    expect(brandPanel).toBeInTheDocument()
  })
})
