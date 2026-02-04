import createTheme from '@mui/material/styles/createTheme'
import type { ThemeOptions } from '@mui/material/styles'
import { colors, shadows, borderRadius, typography, transitions, animations } from './tokens'

const baseThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: typography.fontFamily.english,
    h1: {
      fontSize: typography.fontSize.h1,
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: typography.fontSize.h2,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: typography.fontSize.h3,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: typography.fontSize.h4,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: typography.fontSize.body,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: typography.fontSize.small,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: typography.fontSize.body,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.relaxed,
    },
    body2: {
      fontSize: typography.fontSize.small,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.normal,
    },
    caption: {
      fontSize: typography.fontSize.tiny,
      fontWeight: typography.fontWeight.medium,
      lineHeight: 1.4,
    },
    button: {
      fontSize: typography.fontSize.small,
      fontWeight: typography.fontWeight.semibold,
      textTransform: 'none' as const,
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: borderRadius.md,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          fontFamily: typography.fontFamily.english,
        },
        '[dir="rtl"] body': {
          fontFamily: typography.fontFamily.hebrew,
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
          padding: '10px 20px',
          minHeight: 44,
          touchAction: 'manipulation',
          transition: `all ${transitions.normal}`,
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
          '@media (hover: none) and (pointer: coarse)': {
            '&:active': {
              opacity: 0.85,
            },
          },
        },
        containedPrimary: {
          backgroundColor: colors.accent.primary,
          '&:hover': {
            backgroundColor: colors.accent.hover,
          },
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: typography.fontSize.tiny,
          minHeight: 36,
        },
        sizeLarge: {
          padding: '14px 28px',
          fontSize: typography.fontSize.body,
          minHeight: 52,
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
          touchAction: 'manipulation',
          transition: `all ${transitions.normal}`,
          '@media (hover: none) and (pointer: coarse)': {
            '&:active': {
              opacity: 0.85,
            },
          },
        },
        sizeSmall: {
          minWidth: 36,
          minHeight: 36,
        },
        sizeLarge: {
          minWidth: 52,
          minHeight: 52,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          boxShadow: shadows.card,
          transition: `all ${transitions.normal}`,
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
            transition: `all ${transitions.normal}`,
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
          minHeight: 48,
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
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          touchAction: 'manipulation',
          transition: `all ${transitions.normal}`,
          '@media (hover: none) and (pointer: coarse)': {
            '&:active': {
              opacity: 0.85,
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 48,
          touchAction: 'manipulation',
          '@media (hover: none) and (pointer: coarse)': {
            '&:active': {
              opacity: 0.85,
            },
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          touchAction: 'manipulation',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          minWidth: 56,
          minHeight: 56,
          touchAction: 'manipulation',
          '@media (hover: none) and (pointer: coarse)': {
            '&:active': {
              opacity: 0.9,
            },
          },
        },
        sizeSmall: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
  },
}

export function createLightTheme(direction: 'ltr' | 'rtl' = 'ltr') {
  return createTheme({
    ...baseThemeOptions,
    direction,
    palette: {
      mode: 'light',
      primary: {
        main: colors.accent.primary,
        light: colors.accent.light,
        dark: colors.accent.dark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: colors.orange[500],
        light: colors.orange[400],
        dark: colors.orange[600],
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
        default: colors.primary[50],
        paper: '#FFFFFF',
      },
      text: {
        primary: colors.primary[900],
        secondary: colors.primary[600],
        disabled: colors.primary[400],
      },
      divider: colors.primary[200],
      action: {
        hover: 'rgba(15, 23, 42, 0.04)',
        selected: 'rgba(3, 105, 161, 0.08)',
        focus: 'rgba(3, 105, 161, 0.12)',
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

export function createDarkTheme(direction: 'ltr' | 'rtl' = 'ltr') {
  return createTheme({
    ...baseThemeOptions,
    direction,
    palette: {
      mode: 'dark',
      primary: {
        main: colors.accent.hover,
        light: colors.accent.light,
        dark: colors.accent.primary,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: colors.orange[400],
        light: colors.orange[100],
        dark: colors.orange[500],
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
        default: colors.primary[900],
        paper: colors.primary[800],
      },
      text: {
        primary: colors.primary[50],
        secondary: colors.primary[300],
        disabled: colors.primary[500],
      },
      divider: colors.primary[700],
      action: {
        hover: 'rgba(248, 250, 252, 0.08)',
        selected: 'rgba(2, 132, 199, 0.16)',
        focus: 'rgba(2, 132, 199, 0.24)',
      },
    },
    components: {
      ...baseThemeOptions.components,
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: colors.primary[800],
            borderRadius: borderRadius.lg,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.primary[900],
            borderRight: `1px solid ${colors.primary[700]}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.primary[900],
            borderBottom: `1px solid ${colors.primary[700]}`,
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
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary[600],
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary[500],
            },
          },
        },
      },
    },
  })
}

export { colors, shadows, borderRadius, typography, transitions, animations }
