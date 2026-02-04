/**
 * Tests for ResponsiveText component
 *
 * Note: This test file is a stub for when a test framework (Vitest/Jest) is configured.
 * Currently, the project only has Playwright for E2E testing.
 *
 * To run these tests:
 * 1. Install a testing framework: npm install -D vitest @testing-library/react @testing-library/jest-dom
 * 2. Add test script to package.json: "test": "vitest"
 * 3. Run: npm run test -- ResponsiveText
 */

// import { render, screen } from '@testing-library/react'
// import { ThemeProvider } from '@mui/material/styles'
// import { createLightTheme } from '../../theme'
// import { ResponsiveText, DisplayText, Heading1, BodyText, SmallText } from './ResponsiveText'

// const wrapper = ({ children }: { children: React.ReactNode }) => (
//   <ThemeProvider theme={createLightTheme()}>{children}</ThemeProvider>
// )

// describe('ResponsiveText', () => {
//   it('should render with default variant (body)', () => {
//     render(
//       <ResponsiveText>Test text</ResponsiveText>,
//       { wrapper }
//     )
//     expect(screen.getByText('Test text')).toBeInTheDocument()
//   })

//   it('should render display variant', () => {
//     render(
//       <ResponsiveText variant="display">Display Text</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Display Text')
//     expect(element).toBeInTheDocument()
//     expect(element.tagName).toBe('H1')
//   })

//   it('should render h1 variant', () => {
//     render(
//       <ResponsiveText variant="h1">Heading 1</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Heading 1')
//     expect(element).toBeInTheDocument()
//     expect(element.tagName).toBe('H1')
//   })

//   it('should apply font weight', () => {
//     render(
//       <ResponsiveText weight="bold">Bold text</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Bold text')
//     expect(element).toHaveStyle({ fontWeight: 700 })
//   })

//   it('should apply line height', () => {
//     render(
//       <ResponsiveText lineHeight="relaxed">Relaxed text</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Relaxed text')
//     expect(element).toHaveStyle({ lineHeight: 1.6 })
//   })

//   it('should render with custom component', () => {
//     render(
//       <ResponsiveText component="span">Span text</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Span text')
//     expect(element.tagName).toBe('SPAN')
//   })

//   it('should apply color prop', () => {
//     render(
//       <ResponsiveText color="primary">Primary text</ResponsiveText>,
//       { wrapper }
//     )
//     expect(screen.getByText('Primary text')).toBeInTheDocument()
//   })

//   it('should apply align prop', () => {
//     render(
//       <ResponsiveText align="center">Centered text</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Centered text')
//     expect(element).toHaveStyle({ textAlign: 'center' })
//   })

//   it('should apply gutterBottom prop', () => {
//     render(
//       <ResponsiveText gutterBottom>Text with margin</ResponsiveText>,
//       { wrapper }
//     )
//     expect(screen.getByText('Text with margin')).toBeInTheDocument()
//   })

//   it('should truncate with noWrap prop', () => {
//     render(
//       <ResponsiveText noWrap>Very long text that should be truncated</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Very long text that should be truncated')
//     expect(element).toHaveStyle({ whiteSpace: 'nowrap' })
//   })
// })

// describe('Responsive Text Variants - Shorthand Components', () => {
//   it('should render DisplayText', () => {
//     render(
//       <DisplayText>Display</DisplayText>,
//       { wrapper }
//     )
//     expect(screen.getByText('Display')).toBeInTheDocument()
//   })

//   it('should render Heading1 with bold weight', () => {
//     render(
//       <Heading1>Heading 1</Heading1>,
//       { wrapper }
//     )
//     const element = screen.getByText('Heading 1')
//     expect(element).toHaveStyle({ fontWeight: 700 })
//   })

//   it('should render BodyText with relaxed line height', () => {
//     render(
//       <BodyText>Body text</BodyText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Body text')
//     expect(element).toHaveStyle({ lineHeight: 1.6 })
//   })

//   it('should render SmallText', () => {
//     render(
//       <SmallText>Small text</SmallText>,
//       { wrapper }
//     )
//     expect(screen.getByText('Small text')).toBeInTheDocument()
//   })
// })

// describe('Responsive font sizing', () => {
//   it('should have mobile-first font size for body text', () => {
//     render(
//       <ResponsiveText variant="body">Body text</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Body text')
//     // Mobile size: 0.938rem (15px)
//     const computedStyle = window.getComputedStyle(element)
//     expect(computedStyle.fontSize).toBe('0.938rem')
//   })

//   it('should have larger font size for display variant', () => {
//     render(
//       <ResponsiveText variant="display">Display</ResponsiveText>,
//       { wrapper }
//     )
//     const element = screen.getByText('Display')
//     // Mobile size: 2rem (32px)
//     const computedStyle = window.getComputedStyle(element)
//     expect(computedStyle.fontSize).toBe('2rem')
//   })
// })

export {}
