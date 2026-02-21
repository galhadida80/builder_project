export const colors = {
  primary: {
    950: '#020617',
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
    primary: '#f28c26',
    hover: '#e07b1a',
    light: '#FFF3E0',
    dark: '#c96d10',
    darker: '#a85a0a',
  },
  teal: {
    600: '#0D9488',
    500: '#14B8A6',
    400: '#2DD4BF',
    300: '#5EEAD4',
    100: '#CCFBF1',
    50: '#F0FDFA',
  },
  orange: {
    600: '#EA580C',
    500: '#F97316',
    400: '#FB923C',
    300: '#FDBA74',
    100: '#FFEDD5',
    50: '#FFF7ED',
  },
  success: {
    main: '#22C55E',
    light: '#86EFAC',
    dark: '#16A34A',
    bg: '#F0FDF4',
    darkBg: 'rgba(34, 197, 94, 0.14)',
  },
  warning: {
    main: '#EAB308',
    light: '#FDE047',
    dark: '#CA8A04',
    bg: '#FEFCE8',
    darkBg: 'rgba(234, 179, 8, 0.14)',
  },
  error: {
    main: '#EF4444',
    light: '#FCA5A5',
    dark: '#DC2626',
    bg: '#FEF2F2',
    darkBg: 'rgba(239, 68, 68, 0.14)',
  },
  info: {
    main: '#3B82F6',
    light: '#93C5FD',
    dark: '#2563EB',
    bg: '#EFF6FF',
    darkBg: 'rgba(59, 130, 246, 0.14)',
  },
  surface: {
    light: {
      default: '#f8f7f5',
      paper: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(15, 23, 42, 0.5)',
    },
    dark: {
      default: '#1a1612',
      paper: '#2a221a',
      elevated: '#3d3126',
      overlay: 'rgba(0, 0, 0, 0.6)',
    },
  },
  warmDark: {
    border: '#3d342a',
    borderSubtle: '#2d2519',
    cardBg: 'rgba(242, 140, 38, 0.05)',
    cardBorder: 'rgba(242, 140, 38, 0.1)',
    inputBg: 'rgba(242, 140, 38, 0.08)',
    headerBorder: 'rgba(242, 140, 38, 0.15)',
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
  primaryGlow: '0 4px 14px rgba(242, 140, 38, 0.25)',
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
  // Convenience values (combined duration + easing)
  fast: '150ms ease-out',
  normal: '200ms ease-out',
  slow: '300ms ease-out',

  // Material-UI compatible durations (in milliseconds)
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },

  // Material-UI compatible easing curves
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
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
    english: '"Work Sans", system-ui, -apple-system, sans-serif',
    hebrew: '"Noto Sans Hebrew", "Work Sans", system-ui, sans-serif',
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
  // Responsive font sizes (mobile-first)
  responsiveFontSize: {
    display: {
      xs: '2rem',      // 32px on mobile
      sm: '2.5rem',    // 40px on small screens
      md: '3rem',      // 48px on medium+
    },
    h1: {
      xs: '1.75rem',   // 28px on mobile
      sm: '2rem',      // 32px on small screens
      md: '2.25rem',   // 36px on medium+
    },
    h2: {
      xs: '1.5rem',    // 24px on mobile
      sm: '1.625rem',  // 26px on small screens
      md: '1.75rem',   // 28px on medium+
    },
    h3: {
      xs: '1.25rem',   // 20px on mobile
      sm: '1.313rem',  // 21px on small screens
      md: '1.375rem',  // 22px on medium+
    },
    h4: {
      xs: '1.063rem',  // 17px on mobile
      sm: '1.094rem',  // 17.5px on small screens
      md: '1.125rem',  // 18px on medium+
    },
    body: {
      xs: '0.938rem',  // 15px on mobile (slightly larger for readability)
      sm: '1rem',      // 16px on small screens+
    },
    small: {
      xs: '0.813rem',  // 13px on mobile
      sm: '0.875rem',  // 14px on small screens+
    },
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
