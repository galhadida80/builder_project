export const colors = {
  primary: {
    900: '#0F172A',
    800: '#1E293B',
    700: '#334155',
    600: '#475569',
    500: '#64748B',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
    50: '#F8FAFC',
  },
  accent: {
    primary: '#0369A1',
    hover: '#0284C7',
    light: '#E0F2FE',
    dark: '#075985',
  },
  orange: {
    500: '#F97316',
    600: '#EA580C',
    400: '#FB923C',
    100: '#FFEDD5',
    50: '#FFF7ED',
  },
  success: {
    main: '#22C55E',
    light: '#86EFAC',
    dark: '#16A34A',
    bg: '#F0FDF4',
  },
  warning: {
    main: '#EAB308',
    light: '#FDE047',
    dark: '#CA8A04',
    bg: '#FEFCE8',
  },
  error: {
    main: '#EF4444',
    light: '#FCA5A5',
    dark: '#DC2626',
    bg: '#FEF2F2',
  },
  info: {
    main: '#3B82F6',
    light: '#93C5FD',
    dark: '#2563EB',
    bg: '#EFF6FF',
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
}

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
  card: '0 2px 8px rgba(0, 0, 0, 0.08)',
  cardHover: '0 8px 16px rgba(0, 0, 0, 0.12)',
}

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
}

export const transitions = {
  fast: '150ms ease-out',
  normal: '200ms ease-out',
  slow: '300ms ease-out',
}

export const animations = {
  duration: {
    instant: 0,
    fast: 150,      // Quick hover states
    normal: 250,    // Standard transitions
    slow: 400,      // Complex animations
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',  // Material Design standard
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)', // Entrance animations
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',   // Exit animations
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',      // Quick feedback
  },
  transforms: {
    hoverLift: 'translateY(-2px)',
    hoverScale: 'scale(1.02)',
    activePress: 'scale(0.98)',
  },
}

export const typography = {
  fontFamily: {
    english: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    hebrew: '"Noto Sans Hebrew", "Plus Jakarta Sans", system-ui, sans-serif',
    mono: '"Fira Code", "JetBrains Mono", monospace',
  },
  fontSize: {
    display: '3rem',
    h1: '2.25rem',
    h2: '1.75rem',
    h3: '1.375rem',
    h4: '1.125rem',
    body: '1rem',
    small: '0.875rem',
    tiny: '0.75rem',
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
}

export const zIndex = {
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
}
