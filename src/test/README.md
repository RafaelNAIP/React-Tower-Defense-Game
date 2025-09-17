# Testing Setup for Tower Defense Game

This directory contains the testing infrastructure for the tower defense game.

## Files Overview

- `setup.ts` - Test environment setup and global mocks
- `utils.tsx` - Test utilities and helper functions
- `README.md` - This file

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests once (for CI)
npm run test:run
```

## Test Coverage

The test suite covers:

### UI Components
- `BuildBar.test.tsx` - Tower selection and building interface
- `AccessibilitySettings.test.tsx` - Accessibility controls and settings

### Game Engine
- `definitions.test.ts` - Tower/mob stats and game configuration
- `grid.test.ts` - Grid utilities and path calculations

### State Management
- `store.test.ts` - Zustand game store functionality

## Writing Tests

### Component Tests
Use React Testing Library for component testing:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'

test('renders correctly', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

### Engine Tests
Test pure functions directly:

```typescript
import { calculateTowerStats } from '../engine/definitions'

test('calculates tower stats correctly', () => {
  const stats = calculateTowerStats('arrow', 1)
  expect(stats.damage).toBe(15)
})
```

### Store Tests
Use renderHook for testing Zustand store:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useGameStore } from '../state/store'

test('can select tower type', () => {
  const { result } = renderHook(() => useGameStore())

  act(() => {
    result.current.setSelectedTowerType('arrow')
  })

  expect(result.current.selectedTowerType).toBe('arrow')
})
```

## Test Utilities

The `utils.tsx` file provides helpful utilities:

- `createMockGameState()` - Mock game state for testing
- `createMockStore()` - Mock Zustand store
- `simulateKeyPress()` - Simulate keyboard events
- `simulateCanvasClick()` - Simulate canvas interactions
- `expectCanvasDrawing()` - Assert canvas drawing calls

## Mocked APIs

The test setup automatically mocks:

- Canvas 2D context and all drawing methods
- localStorage
- requestAnimationFrame/cancelAnimationFrame
- ResizeObserver/IntersectionObserver
- window.matchMedia
- Console methods (to reduce test noise)

## Best Practices

1. **Arrange, Act, Assert** - Structure tests clearly
2. **Test behavior, not implementation** - Focus on what the user sees/does
3. **Use descriptive test names** - Make failures easy to understand
4. **Mock external dependencies** - Keep tests isolated
5. **Test accessibility** - Ensure ARIA attributes and keyboard navigation work
6. **Test error cases** - Don't just test the happy path

## Accessibility Testing

The test suite includes accessibility-focused tests:

- ARIA attributes are present and correct
- Keyboard navigation works
- Screen reader announcements are made
- Focus management is correct

## Performance Testing

For performance-critical game engine functions, consider:

- Testing with large datasets
- Measuring execution time
- Testing memory usage patterns

## CI/CD Integration

The test suite is designed to work in CI environments:

- Uses jsdom for browser environment simulation
- Mocks all browser APIs
- Provides text-based output for logs
- Generates coverage reports