import { render, screen, waitFor, queryClient } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import Dashboard from '../dashboard'
import { env } from '@/shared/config/env'
import * as useCurrentContextMock from '@/shared/hooks/use-current-context'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    useNavigate: () => mockNavigate,
  }
})

// Mock permissions
vi.mock('@/shared/hooks/use-permissions', () => ({
  usePermissions: () => ({ can: () => true }),
}))

const API_URL = env.VITE_API_URL

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    
    vi.spyOn(useCurrentContextMock, 'useCurrentContext').mockReturnValue({
      user: { id: 'u1', name: 'Admin User', email: 'admin@sufrix.com', role: 'super_admin' },
      role: 'super_admin',
      orgId: 'org1',
      branchId: 'b1',
      isSuperAdmin: true,
      hasPermission: () => true,
    } as any)

    // Setup default successful MSW handlers
    server.use(
      http.get(`${API_URL}/orgs`, () => {
        return HttpResponse.json([{ id: 'org1', name: 'Org 1' }])
      }),
      http.get(`${API_URL}/branches`, () => {
        return HttpResponse.json([{ id: 'b1', name: 'Branch 1', org_id: 'org1' }])
      }),
      http.get(`${API_URL}/users`, () => {
        return HttpResponse.json([{ id: 'u1', name: 'Admin User' }])
      }),
      http.get(`${API_URL}/shifts/branches/b1/current`, () => {
        return HttpResponse.json({
          has_open_shift: true,
          open_shift: { id: 's1', branch_id: 'b1', teller_name: 'John Doe', opened_at: new Date().toISOString() }
        })
      }),
      http.get(`${API_URL}/reports/branches/b1/sales`, () => {
        return HttpResponse.json({ total_revenue: 1500, total_orders: 15 })
      }),
      http.get(`${API_URL}/inventory/branches/b1/stock`, () => {
        return HttpResponse.json([
          { id: 'i1', ingredient_name: 'Coffee Beans', current_stock: 5, reorder_threshold: 10, unit: 'kg', below_reorder: true }
        ])
      }),
      http.get(`${API_URL}/reports/branches/b1/stock`, () => {
        return HttpResponse.json({ items: [] })
      }),
      http.get(`${API_URL}/orders`, () => {
        return HttpResponse.json({
          data: [
            { id: 'o1', order_number: 'ORD-001', customer_name: 'Alice', total_amount: 100, created_at: new Date().toISOString(), payment_method: 'cash' }
          ],
          total: 1
        })
      })
    )
  })

  it('renders loading states and then success dashboard data', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Branch 1')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('nav.orgs')).toBeInTheDocument()
      expect(screen.getByText('dashboard.activeShifts')).toBeInTheDocument()
      expect(screen.getByText('#ORD-001')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Coffee Beans')).toBeInTheDocument()
    })
  })

  it('handles empty states when there is no data', async () => {
    server.use(
      http.get(`${API_URL}/orders`, () => {
        return HttpResponse.json({ data: [], total: 0 })
      }),
      http.get(`${API_URL}/inventory/branches/b1/stock`, () => {
        return HttpResponse.json([]) 
      }),
      http.get(`${API_URL}/reports/branches/b1/stock`, () => {
        return HttpResponse.json({ items: [] })
      })
    )

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('dashboard.noOrdersYet')).toBeInTheDocument()
      expect(screen.getByText('dashboard.allStockOk')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    server.use(
      http.get(`${API_URL}/branches`, () => {
        return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 })
      })
    )

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('common.noResults')).toBeInTheDocument()
    })
  })

  it('navigates when clicking on quick action buttons', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nav.orders/i })).toBeInTheDocument()
    })

    const ordersBtn = screen.getByRole('button', { name: /nav.orders/i })
    await user.click(ordersBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/orders')
  })

  it('is responsive: checks mobile classes', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 1023px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    
    const { container } = render(<Dashboard />)
    
    const smGrid = container.querySelector('.sm\\:grid-cols-2')
    expect(smGrid).toBeInTheDocument()
    
    const lgGrid = container.querySelector('.lg\\:grid-cols-2')
    expect(lgGrid).toBeInTheDocument()
  })
})
