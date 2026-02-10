import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button, IconButton } from '../Button'
import { hapticFeedback } from '../../../utils/hapticFeedback'

// Mock the hapticFeedback module
jest.mock('../../../utils/hapticFeedback')

describe('Button Haptic Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Button component haptic feedback', () => {
    it('should trigger haptic feedback on button click', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(hapticFeedback).toHaveBeenCalledTimes(1)
    })

    it('should not trigger haptic feedback when button is disabled', () => {
      render(<Button disabled>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(hapticFeedback).not.toHaveBeenCalled()
    })

    it('should not trigger haptic feedback when button is loading', () => {
      render(<Button loading>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(hapticFeedback).not.toHaveBeenCalled()
    })

    it('should still call onClick handler after haptic feedback', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should call onClick handler even if haptic feedback is not supported', () => {
      (hapticFeedback as jest.Mock).mockImplementation(() => {
        throw new Error('Haptic not supported')
      })

      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should work with different button variants', () => {
      const variants = ['primary', 'secondary', 'tertiary', 'danger', 'success'] as const

      variants.forEach((variant) => {
        jest.clearAllMocks()
        const { unmount } = render(
          <Button variant={variant}>Click me</Button>
        )
        const button = screen.getByRole('button', { name: /click me/i })

        fireEvent.click(button)

        expect(hapticFeedback).toHaveBeenCalledWith('light')
        unmount()
      })
    })

    it('should not trigger haptic when both disabled and loading', () => {
      render(
        <Button disabled loading>
          Click me
        </Button>
      )
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(hapticFeedback).not.toHaveBeenCalled()
    })

    it('should trigger haptic on multiple clicks', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledTimes(3)
      expect(hapticFeedback).toHaveBeenCalledWith('light')
    })

    it('should pass correct event to onClick handler', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledWith(expect.any(Object))
      const event = handleClick.mock.calls[0][0]
      expect(event).toHaveProperty('type', 'click')
    })
  })

  describe('IconButton component haptic feedback', () => {
    it('should trigger haptic feedback on icon button click', () => {
      render(<IconButton>🎉</IconButton>)
      const button = screen.getByRole('button')

      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(hapticFeedback).toHaveBeenCalledTimes(1)
    })

    it('should not trigger haptic feedback when icon button is disabled', () => {
      render(<IconButton disabled>🎉</IconButton>)
      const button = screen.getByRole('button')

      fireEvent.click(button)

      expect(hapticFeedback).not.toHaveBeenCalled()
    })

    it('should not trigger haptic feedback when icon button is loading', () => {
      render(<IconButton loading>🎉</IconButton>)
      const button = screen.getByRole('button')

      fireEvent.click(button)

      expect(hapticFeedback).not.toHaveBeenCalled()
    })

    it('should still call onClick handler after haptic feedback on icon button', () => {
      const handleClick = jest.fn()
      render(<IconButton onClick={handleClick}>🎉</IconButton>)
      const button = screen.getByRole('button')

      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Haptic feedback timing', () => {
    it('should trigger haptic feedback before calling onClick handler', () => {
      const callOrder: string[] = []
      ;(hapticFeedback as jest.Mock).mockImplementation(() => {
        callOrder.push('haptic')
      })

      const handleClick = jest.fn(() => {
        callOrder.push('onClick')
      })

      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(callOrder).toEqual(['haptic', 'onClick'])
    })
  })

  describe('Edge cases', () => {
    it('should handle button without onClick handler', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      expect(() => fireEvent.click(button)).not.toThrow()
      expect(hapticFeedback).toHaveBeenCalledWith('light')
    })

    it('should handle rapid successive clicks', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      for (let i = 0; i < 5; i++) {
        fireEvent.click(button)
      }

      expect(hapticFeedback).toHaveBeenCalledTimes(5)
    })

    it('should work with button with children nodes', () => {
      render(
        <Button>
          Click <span>me</span>
        </Button>
      )
      const button = screen.getByRole('button')

      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledWith('light')
    })

    it('should handle state transitions from disabled to enabled', () => {
      const { rerender } = render(<Button disabled>Click me</Button>)
      let button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)
      expect(hapticFeedback).not.toHaveBeenCalled()

      rerender(<Button>Click me</Button>)
      button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)
      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(hapticFeedback).toHaveBeenCalledTimes(1)
    })

    it('should handle state transitions from loading to not loading', () => {
      const { rerender } = render(<Button loading>Click me</Button>)
      let button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)
      expect(hapticFeedback).not.toHaveBeenCalled()

      rerender(<Button>Click me</Button>)
      button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)
      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(hapticFeedback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Integration with custom onClick behavior', () => {
    it('should maintain onClick behavior while triggering haptic feedback', () => {
      const handleClick = jest.fn((event: React.MouseEvent) => {
        expect(event.type).toBe('click')
      })

      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(handleClick).toHaveBeenCalled()
    })

    it('should allow onClick handler to prevent default behavior', () => {
      const handleClick = jest.fn((event: React.MouseEvent) => {
        event.preventDefault()
      })

      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(handleClick).toHaveBeenCalled()
    })

    it('should allow onClick handler to stop propagation', () => {
      const handleClick = jest.fn((event: React.MouseEvent) => {
        event.stopPropagation()
      })

      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })

      fireEvent.click(button)

      expect(hapticFeedback).toHaveBeenCalledWith('light')
      expect(handleClick).toHaveBeenCalled()
    })
  })
})
