import { Box, Chip } from '@/mui'

interface FilterChip {
  label: string
  value: string
  count?: number
}

interface FilterChipsProps {
  items: FilterChip[]
  value: string
  onChange: (value: string) => void
}

export default function FilterChips({ items, value, onChange }: FilterChipsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        pb: 0.5,
        '&::-webkit-scrollbar': { display: 'none' },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <Chip
            key={item.value}
            label={item.count !== undefined ? `${item.label} (${item.count})` : item.label}
            onClick={() => onChange(item.value)}
            sx={{
              borderRadius: '999px',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.8rem',
              height: 34,
              px: 0.5,
              flexShrink: 0,
              bgcolor: isActive ? 'primary.main' : 'background.paper',
              color: isActive ? 'primary.contrastText' : 'text.secondary',
              border: '1px solid',
              borderColor: isActive ? 'primary.main' : 'divider',
              '&:hover': {
                bgcolor: isActive ? 'primary.dark' : 'action.hover',
              },
            }}
          />
        )
      })}
    </Box>
  )
}
