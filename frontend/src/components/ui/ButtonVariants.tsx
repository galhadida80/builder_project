import { Box, Grid, Typography, SxProps, Theme } from '@mui/material'
import { Button, ButtonProps } from './Button'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

interface ButtonVariant {
  variant: ButtonProps['variant']
  label: string
}

interface ButtonSize {
  size: ButtonProps['size']
  label: string
}

const VARIANTS: ButtonVariant[] = [
  { variant: 'primary', label: 'Primary' },
  { variant: 'secondary', label: 'Secondary' },
  { variant: 'danger', label: 'Danger' },
  { variant: 'success', label: 'Success' },
]

const SIZES: ButtonSize[] = [
  { size: 'small', label: 'Small' },
  { size: 'medium', label: 'Medium' },
  { size: 'large', label: 'Large' },
]

const STATES = [
  { label: 'Normal', props: {} },
  { label: 'Disabled', props: { disabled: true } },
  { label: 'Loading', props: { loading: true } },
]

interface ButtonVariantsProps {
  sx?: SxProps<Theme>
}

export function ButtonVariants({ sx }: ButtonVariantsProps) {
  return (
    <Box sx={sx}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Button Variants
        </Typography>
        <Grid container spacing={2}>
          {VARIANTS.map((variant) => (
            <Grid item xs={12} sm={6} md={3} key={variant.variant}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  {variant.label}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant={variant.variant}>
                    {variant.label}
                  </Button>
                  <Button variant={variant.variant} disabled>
                    Disabled
                  </Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Button Sizes
        </Typography>
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {SIZES.map((size) => (
              <Button key={size.size} size={size.size}>
                {size.label}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Button States
        </Typography>
        <Grid container spacing={2}>
          {STATES.map((state) => (
            <Grid item xs={12} sm={6} md={4} key={state.label}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  {state.label}
                </Typography>
                <Button {...state.props}>
                  {state.label}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          With Icons
        </Typography>
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button icon={<HelpOutlineIcon />} iconPosition="start">
              Start Icon
            </Button>
            <Button icon={<HelpOutlineIcon />} iconPosition="end">
              End Icon
            </Button>
            <Button variant="success" icon={<HelpOutlineIcon />} iconPosition="start">
              Success Icon
            </Button>
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Full Width
        </Typography>
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Button fullWidth>
            Full Width Button
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
