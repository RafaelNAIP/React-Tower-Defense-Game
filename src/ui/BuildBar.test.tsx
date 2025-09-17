import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BuildBar } from './BuildBar'
import { useGameStore } from '../state/store'

// Mock the game store
vi.mock('../state/store', () => ({
  useGameStore: vi.fn(),
}))

const mockUseGameStore = vi.mocked(useGameStore)

describe('BuildBar', () => {
  const mockSetSelectedTowerType = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation
    mockUseGameStore.mockReturnValue({
      money: 100,
      selectedTowerType: null,
      setSelectedTowerType: mockSetSelectedTowerType,
    })
  })

  it('renders all tower types', () => {
    render(<BuildBar />)

    expect(screen.getByText('Arrow Tower')).toBeInTheDocument()
    expect(screen.getByText('Cannon Tower')).toBeInTheDocument()
    expect(screen.getByText('Frost Tower')).toBeInTheDocument()
  })

  it('shows tower costs', () => {
    render(<BuildBar />)

    expect(screen.getByText('$25')).toBeInTheDocument() // Arrow Tower cost
    expect(screen.getByText('$50')).toBeInTheDocument() // Cannon Tower cost
    expect(screen.getByText('$40')).toBeInTheDocument() // Frost Tower cost
  })

  it('shows keyboard shortcuts', () => {
    render(<BuildBar />)

    expect(screen.getByText('(Q)')).toBeInTheDocument() // Arrow Tower shortcut
    expect(screen.getByText('(W)')).toBeInTheDocument() // Cannon Tower shortcut
    expect(screen.getByText('(E)')).toBeInTheDocument() // Frost Tower shortcut
  })

  it('allows selecting a tower when affordable', () => {
    render(<BuildBar />)

    const arrowTowerButton = screen.getByRole('button', { name: /arrow tower/i })
    fireEvent.click(arrowTowerButton)

    expect(mockSetSelectedTowerType).toHaveBeenCalledWith('arrow')
  })

  it('disables towers when not affordable', () => {
    mockUseGameStore.mockReturnValue({
      money: 20, // Not enough for any tower
      selectedTowerType: null,
      setSelectedTowerType: mockSetSelectedTowerType,
    })

    render(<BuildBar />)

    const arrowTowerButton = screen.getByRole('button', { name: /arrow tower/i })
    const cannonTowerButton = screen.getByRole('button', { name: /cannon tower/i })
    const frostTowerButton = screen.getByRole('button', { name: /frost tower/i })

    expect(arrowTowerButton).toBeDisabled()
    expect(cannonTowerButton).toBeDisabled()
    expect(frostTowerButton).toBeDisabled()
  })

  it('shows selected state for active tower', () => {
    mockUseGameStore.mockReturnValue({
      money: 100,
      selectedTowerType: 'arrow',
      setSelectedTowerType: mockSetSelectedTowerType,
    })

    render(<BuildBar />)

    const arrowTowerButton = screen.getByRole('button', { name: /arrow tower/i })
    expect(arrowTowerButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('can deselect a tower by clicking again', () => {
    mockUseGameStore.mockReturnValue({
      money: 100,
      selectedTowerType: 'arrow',
      setSelectedTowerType: mockSetSelectedTowerType,
    })

    render(<BuildBar />)

    const arrowTowerButton = screen.getByRole('button', { name: /arrow tower/i })
    fireEvent.click(arrowTowerButton)

    expect(mockSetSelectedTowerType).toHaveBeenCalledWith(null)
  })

  it('shows selection status message when tower is selected', () => {
    mockUseGameStore.mockReturnValue({
      money: 100,
      selectedTowerType: 'arrow',
      setSelectedTowerType: mockSetSelectedTowerType,
    })

    render(<BuildBar />)

    expect(screen.getByText(/arrow tower selected/i)).toBeInTheDocument()
    expect(screen.getByText(/click on green tiles to build/i)).toBeInTheDocument()
  })

  it('does not show selection message when no tower is selected', () => {
    render(<BuildBar />)

    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<BuildBar />)

    const buildSection = screen.getByRole('group', { name: /available tower types/i })
    expect(buildSection).toBeInTheDocument()

    const arrowTowerButton = screen.getByRole('button', { name: /arrow tower/i })
    expect(arrowTowerButton).toHaveAttribute('aria-describedby')
    expect(arrowTowerButton).toHaveAttribute('title', 'Press Q to select')
  })
})