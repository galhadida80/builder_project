import { useRef, useCallback } from 'react'
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api'
import { TextField } from '../ui/TextField'
import { CircularProgress, InputAdornment } from '@/mui'
import { LocationOnIcon } from '@/icons'

const LIBRARIES: ('places')[] = ['places']

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, lat: number | null, lng: number | null) => void
  label: string
  error?: boolean
  helperText?: string
  placeholder?: string
}

export default function AddressAutocomplete({ value, onChange, label, error, helperText, placeholder }: AddressAutocompleteProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
    libraries: LIBRARIES,
  })

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const handleLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete
  }, [])

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry?.location) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    const address = place.formatted_address || place.name || ''
    onChange(address, lat, lng)
  }, [onChange])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, null, null)
  }, [onChange])

  if (!isLoaded) {
    return (
      <TextField
        fullWidth
        label={label}
        value={value}
        onChange={handleInputChange}
        error={error}
        helperText={helperText}
        placeholder={placeholder}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <CircularProgress size={18} />
            </InputAdornment>
          ),
        }}
      />
    )
  }

  return (
    <Autocomplete
      onLoad={handleLoad}
      onPlaceChanged={handlePlaceChanged}
      options={{ componentRestrictions: { country: 'il' }, types: ['address'] }}
    >
      <TextField
        fullWidth
        label={label}
        value={value}
        onChange={handleInputChange}
        error={error}
        helperText={helperText}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LocationOnIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />
    </Autocomplete>
  )
}
