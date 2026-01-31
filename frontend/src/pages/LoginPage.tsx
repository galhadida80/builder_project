import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import ConstructionIcon from '@mui/icons-material/Construction'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import IconButton from '@mui/material/IconButton'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { SegmentedTabs } from '../components/ui/Tabs'
import { authApi } from '../api/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setConfirmPassword('')
    setError(null)
    setSuccess(null)
  }

  const handleTabChange = (value: string) => {
    setTab(value)
    resetForm()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await authApi.login(email, password)
      localStorage.setItem('authToken', response.access_token)
      localStorage.setItem('userId', response.user.id)
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      await authApi.register(email, password, fullName)
      setSuccess('Account created successfully! Please sign in.')
      setTab('signin')
      setPassword('')
      setConfirmPassword('')
      setFullName('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          p: 6,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
              : 'linear-gradient(135deg, #0369A1 0%, #0F172A 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            insetInlineStart: 0,
            insetInlineEnd: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ConstructionIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                BuilderOps
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Construction Operations Platform
              </Typography>
            </Box>
          </Box>

          <Typography variant="h3" fontWeight={700} sx={{ mb: 3, lineHeight: 1.2 }}>
            Build Smarter.<br />
            Inspect Faster.<br />
            Deliver Excellence.
          </Typography>

          <Typography variant="body1" sx={{ mb: 4, opacity: 0.9, lineHeight: 1.7 }}>
            The complete platform for managing construction projects, equipment tracking,
            inspection workflows, and team collaboration.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              'Real-time project tracking & analytics',
              'Equipment & material management',
              'Senior supervision inspection system',
              'Multi-step approval workflows',
            ].map((feature, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleIcon sx={{ fontSize: 20, color: '#22C55E' }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {feature}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: { xs: 1, md: '0 0 520px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <ConstructionIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                BuilderOps
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 4, textAlign: { xs: 'center', md: 'start' } }}>
            <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
              {tab === 'signin' ? 'Welcome back' : 'Create account'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tab === 'signin'
                ? 'Enter your credentials to access your account'
                : 'Fill in your details to get started'}
            </Typography>
          </Box>

          <SegmentedTabs
            items={[
              { label: 'Sign In', value: 'signin' },
              { label: 'Sign Up', value: 'signup' },
            ]}
            value={tab}
            onChange={handleTabChange}
          />

          <Box sx={{ mt: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                {success}
              </Alert>
            )}

            {tab === 'signin' ? (
              <form onSubmit={handleLogin}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    startIcon={<EmailIcon sx={{ color: 'text.secondary' }} />}
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    startIcon={<LockIcon sx={{ color: 'text.secondary' }} />}
                    endIcon={
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    }
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link href="#" underline="hover" sx={{ fontSize: '0.875rem' }}>
                      Forgot password?
                    </Link>
                  </Box>

                  <Button
                    fullWidth
                    type="submit"
                    variant="primary"
                    loading={loading}
                    sx={{ py: 1.5, mt: 1 }}
                  >
                    Sign In
                  </Button>
                </Box>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    startIcon={<PersonIcon sx={{ color: 'text.secondary' }} />}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    startIcon={<EmailIcon sx={{ color: 'text.secondary' }} />}
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    helperText="At least 8 characters"
                    startIcon={<LockIcon sx={{ color: 'text.secondary' }} />}
                    endIcon={
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    }
                  />
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    startIcon={<LockIcon sx={{ color: 'text.secondary' }} />}
                  />

                  <Button
                    fullWidth
                    type="submit"
                    variant="primary"
                    loading={loading}
                    sx={{ py: 1.5, mt: 1 }}
                  >
                    Create Account
                  </Button>
                </Box>
              </form>
            )}

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.secondary">
                OR
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Link
                  component="button"
                  type="button"
                  onClick={() => handleTabChange(tab === 'signin' ? 'signup' : 'signin')}
                  underline="hover"
                  sx={{ fontWeight: 600 }}
                >
                  {tab === 'signin' ? 'Sign up' : 'Sign in'}
                </Link>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
