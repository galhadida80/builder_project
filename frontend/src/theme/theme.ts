import { colors, spacing, shadows, borderRadius, typography, transitions, zIndex } from './tokens'
import { createTheme } from '@/mui'
import type { ThemeOptions } from '@/mui'

const baseThemeOptions: ThemeOptions = {
  spacing: spacing.sm,
  typography: {
    fontFamily: typography.fontFamily.english,
    h1: {
      fontSize: typography.responsiveFontSize.h1.xs,
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: '-0.02em',
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.h1.sm,
      },
      '@media (min-width:900px)': {
        fontSize: typography.responsiveFontSize.h1.md,
      },
    },
    h2: {
      fontSize: typography.responsiveFontSize.h2.xs,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: '-0.01em',
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.h2.sm,
      },
      '@media (min-width:900px)': {
        fontSize: typography.responsiveFontSize.h2.md,
      },
    },
    h3: {
      fontSize: typography.responsiveFontSize.h3.xs,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: 1.3,
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.h3.sm,
      },
      '@media (min-width:900px)': {
        fontSize: typography.responsiveFontSize.h3.md,
      },
    },
    h4: {
      fontSize: typography.responsiveFontSize.h4.xs,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.4,
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.h4.sm,
      },
      '@media (min-width:900px)': {
        fontSize: typography.responsiveFontSize.h4.md,
      },
    },
    h5: {
      fontSize: typography.responsiveFontSize.body.xs,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.4,
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.body.sm,
      },
    },
    h6: {
      fontSize: typography.responsiveFontSize.small.xs,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.4,
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.small.sm,
      },
    },
    body1: {
      fontSize: typography.responsiveFontSize.body.xs,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.relaxed,
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.body.sm,
      },
    },
    body2: {
      fontSize: typography.responsiveFontSize.small.xs,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.normal,
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.small.sm,
      },
    },
    caption: {
      fontSize: typography.fontSize.tiny,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.4,
    },
    button: {
      fontSize: typography.responsiveFontSize.small.xs,
      fontWeight: typography.fontWeight.semibold,
      textTransform: 'none' as const,
      letterSpacing: '0.01em',
      '@media (min-width:600px)': {
        fontSize: typography.responsiveFontSize.small.sm,
      },
    },
  },
  shape: {
    borderRadius: borderRadius.md,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  zIndex: {
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: zIndex.drawer,
    modal: zIndex.modal,
    snackbar: zIndex.snackbar,
    tooltip: zIndex.tooltip,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          scrollBehavior: 'smooth',
          height: '100%',
        },
        body: {
          fontFamily: typography.fontFamily.english,
          overflowX: 'hidden',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          minHeight: '100%',
        },
        '[dir="rtl"] body': {
          fontFamily: typography.fontFamily.hebrew,
        },
        'h1, h2, h3, h4, h5, h6': {
          overflowWrap: 'break-word',
          wordWrap: 'break-word',
          hyphens: 'auto',
        },
        'p, span': {
          overflowWrap: 'break-word',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: '0.01ms !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: borderRadius.md,
          fontWeight: typography.fontWeight.semibold,
          padding: '8px 16px',
          minHeight: 36,
          transition: `background-color ${transitions.normal}, box-shadow ${transitions.normal}, border-color ${transitions.normal}`,
          '&.Mui-disabled': {
            cursor: 'not-allowed',
            opacity: 0.5,
          },
        },
        containedPrimary: {
          backgroundColor: colors.accent.primary,
          boxShadow: shadows.primaryGlow,
          '&:hover': {
            backgroundColor: colors.accent.hover,
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        contained: {
          '&.Mui-disabled': {
            opacity: 0.6,
            backgroundColor: colors.primary[300],
            color: colors.primary[500],
          },
        },
        outlined: {
          '&.Mui-disabled': {
            opacity: 0.5,
            borderColor: colors.primary[300],
            color: colors.primary[400],
          },
        },
        text: {
          '&.Mui-disabled': {
            opacity: 0.5,
            color: colors.primary[400],
          },
        },
        sizeSmall: {
          padding: '4px 10px',
          fontSize: typography.fontSize.tiny,
          minHeight: 32,
        },
        sizeLarge: {
          padding: '10px 24px',
          fontSize: typography.fontSize.body,
          minHeight: 44,
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiIconButton: {
      styleOverrides: {
        sizeSmall: {
          padding: 6,
        },
        sizeLarge: {
          padding: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          boxShadow: shadows.card,
          transition: `box-shadow ${transitions.normal}`,
          '&:hover': {
            boxShadow: shadows.cardHover,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: borderRadius.lg,
        },
        elevation1: {
          boxShadow: shadows.sm,
        },
        elevation2: {
          boxShadow: shadows.md,
        },
        elevation3: {
          boxShadow: shadows.lg,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius.md,
            transition: `border-color ${transitions.normal}`,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          '& input': {
            padding: '12px 16px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          fontWeight: typography.fontWeight.medium,
        },
        sizeSmall: {
          height: 24,
          fontSize: typography.fontSize.tiny,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        sizeMedium: {
          minHeight: 48,
          minWidth: 48,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: borderRadius.sm,
          fontSize: typography.fontSize.tiny,
          fontWeight: typography.fontWeight.medium,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.xl,
          boxShadow: shadows.xl,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: shadows.lg,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: shadows.sm,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: typography.fontWeight.medium,
          minHeight: 40,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.small,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid',
          padding: '12px 16px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
        },
        standardSuccess: {
          backgroundColor: colors.success.bg,
        },
        standardWarning: {
          backgroundColor: colors.warning.bg,
        },
        standardError: {
          backgroundColor: colors.error.bg,
        },
        standardInfo: {
          backgroundColor: colors.info.bg,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: typography.fontWeight.semibold,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.full,
          height: 6,
        },
        bar: {
          borderRadius: borderRadius.full,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        rounded: {
          borderRadius: borderRadius.md,
        },
      },
    },
  },
}

export function createLightTheme() {
  return createTheme({
    ...baseThemeOptions,
    palette: {
      mode: 'light',
      primary: {
        main: colors.accent.primary,
        light: colors.accent.light,
        dark: colors.accent.dark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: colors.teal[600],
        light: colors.teal[400],
        dark: colors.teal[600],
        contrastText: '#FFFFFF',
      },
      success: {
        main: colors.success.main,
        light: colors.success.light,
        dark: colors.success.dark,
      },
      warning: {
        main: colors.warning.main,
        light: colors.warning.light,
        dark: colors.warning.dark,
      },
      error: {
        main: colors.error.main,
        light: colors.error.light,
        dark: colors.error.dark,
      },
      info: {
        main: colors.info.main,
        light: colors.info.light,
        dark: colors.info.dark,
      },
      background: {
        default: colors.surface.light.default,
        paper: colors.surface.light.paper,
      },
      text: {
        primary: colors.primary[900],
        secondary: colors.primary[600],
        disabled: colors.primary[400],
      },
      divider: colors.primary[200],
      action: {
        hover: 'rgba(15, 23, 42, 0.04)',
        selected: 'rgba(200, 149, 106, 0.08)',
        focus: 'rgba(200, 149, 106, 0.12)',
      },
    },
    components: {
      ...baseThemeOptions.components,
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: colors.primary[200],
          },
        },
      },
    },
  })
}

export function createDarkTheme() {
  return createTheme({
    ...baseThemeOptions,
    palette: {
      mode: 'dark',
      primary: {
        main: colors.accent.hover,
        light: colors.accent.light,
        dark: colors.accent.primary,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: colors.teal[400],
        light: colors.teal[300],
        dark: colors.teal[500],
        contrastText: colors.primary[900],
      },
      success: {
        main: colors.success.main,
        light: colors.success.light,
        dark: colors.success.dark,
      },
      warning: {
        main: colors.warning.main,
        light: colors.warning.light,
        dark: colors.warning.dark,
      },
      error: {
        main: colors.error.main,
        light: colors.error.light,
        dark: colors.error.dark,
      },
      info: {
        main: colors.info.main,
        light: colors.info.light,
        dark: colors.info.dark,
      },
      background: {
        default: colors.surface.dark.default,
        paper: colors.surface.dark.paper,
      },
      text: {
        primary: colors.primary[50],
        secondary: colors.primary[300],
        disabled: colors.primary[500],
      },
      divider: colors.primary[700],
      action: {
        hover: 'rgba(248, 250, 252, 0.08)',
        selected: 'rgba(200, 149, 106, 0.16)',
        focus: 'rgba(200, 149, 106, 0.24)',
      },
    },
    components: {
      ...baseThemeOptions.components,
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          elevation1: {
            backgroundColor: colors.surface.dark.paper,
          },
          elevation2: {
            backgroundColor: colors.surface.dark.elevated,
          },
          elevation3: {
            backgroundColor: colors.surface.dark.elevated,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface.dark.paper,
            borderRadius: borderRadius.lg,
            border: '1px solid rgba(200, 149, 106, 0.1)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.surface.dark.elevated,
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.surface.dark.default,
            borderRight: `1px solid ${colors.warmDark.border}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(26, 22, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${colors.warmDark.headerBorder}`,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: colors.primary[700],
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: colors.surface.dark.elevated,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.warmDark.border,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary[500],
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            fontWeight: typography.fontWeight.medium,
          },
          filled: {
            backgroundColor: colors.warmDark.border,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: colors.primary[700],
            border: `1px solid ${colors.primary[600]}`,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.surface.dark.elevated,
            border: `1px solid ${colors.primary[700]}`,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
          },
          standardError: {
            backgroundColor: colors.error.darkBg,
            color: colors.error.light,
            '& .MuiAlert-icon': { color: colors.error.light },
            '& .MuiAlert-action': { color: colors.error.light },
          },
          standardWarning: {
            backgroundColor: colors.warning.darkBg,
            color: colors.warning.light,
            '& .MuiAlert-icon': { color: colors.warning.light },
            '& .MuiAlert-action': { color: colors.warning.light },
          },
          standardSuccess: {
            backgroundColor: colors.success.darkBg,
            color: colors.success.light,
            '& .MuiAlert-icon': { color: colors.success.light },
            '& .MuiAlert-action': { color: colors.success.light },
          },
          standardInfo: {
            backgroundColor: colors.info.darkBg,
            color: colors.info.light,
            '& .MuiAlert-icon': { color: colors.info.light },
            '& .MuiAlert-action': { color: colors.info.light },
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: colors.primary[700],
          },
        },
      },
    },
  })
}

export { colors, spacing, shadows, borderRadius, typography, transitions, zIndex }
