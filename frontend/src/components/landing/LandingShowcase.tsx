import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInView } from '@/hooks/useInView'
import {
  SettingsIcon,
  DashboardIcon,
  BarChartIcon,
  AssignmentIcon,
  CheckCircleIcon,
  ConstructionIcon,
  ReportProblemIcon,
  TaskAltIcon,
  TrendingUpIcon,
} from '@/icons'
import { Box, Container, Typography } from '@/mui'

export default function LandingShowcase() {
  const { t } = useTranslation()
  const { ref: stepsRef, isVisible: stepsVisible } = useInView(0.1)
  const { ref: demoRef, isVisible: demoVisible } = useInView(0.1)
  const [activeScreen, setActiveScreen] = useState(0)

  const STEPS = [
    { num: '01', icon: <SettingsIcon sx={{ fontSize: 28 }} />, titleKey: 'step1Title', descKey: 'step1Desc', color: '#C75B20' },
    { num: '02', icon: <DashboardIcon sx={{ fontSize: 28 }} />, titleKey: 'step2Title', descKey: 'step2Desc', color: '#2563eb' },
    { num: '03', icon: <BarChartIcon sx={{ fontSize: 28 }} />, titleKey: 'step3Title', descKey: 'step3Desc', color: '#16a34a' },
  ]

  const SCREENS = [
    {
      labelKey: 'landing.demo.screens.dashboard',
      icon: <DashboardIcon sx={{ fontSize: 18 }} />,
      color: '#C75B20',
      content: <DashboardScreen />,
    },
    {
      labelKey: 'landing.demo.screens.inspections',
      icon: <AssignmentIcon sx={{ fontSize: 18 }} />,
      color: '#2563eb',
      content: <InspectionsScreen />,
    },
    {
      labelKey: 'landing.demo.screens.analytics',
      icon: <BarChartIcon sx={{ fontSize: 18 }} />,
      color: '#16a34a',
      content: <AnalyticsScreen />,
    },
  ]

  return (
    <>
      {/* How It Works */}
      <Box
        id="how-it-works"
        ref={stepsRef}
        sx={{
          py: { xs: 8, md: 12 },
          px: { xs: 2, md: 6 },
          bgcolor: (th) => th.palette.mode === 'dark' ? 'background.default' : '#faf8f6',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 } }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'primary.main', mb: 1.5 }}>
              {t('landing.howItWorks.label')}
            </Typography>
            <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              {t('landing.howItWorks.title')}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 3, md: 4 }, position: 'relative' }}>
            <Box
              sx={{
                display: { xs: 'none', md: 'block' },
                position: 'absolute',
                top: 52,
                left: '20%',
                right: '20%',
                height: 2,
                bgcolor: 'divider',
                zIndex: 0,
              }}
            />
            {STEPS.map((step, index) => (
              <Box
                key={step.num}
                sx={{
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1,
                  opacity: stepsVisible ? 1 : 0,
                  transform: stepsVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: 'all 500ms ease',
                  transitionDelay: `${index * 150}ms`,
                }}
              >
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    bgcolor: `${step.color}12`,
                    border: `2px solid ${step.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                    color: step.color,
                    position: 'relative',
                  }}
                >
                  {step.icon}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: step.color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                    }}
                  >
                    {step.num}
                  </Box>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary', mb: 1 }}>
                  {t(`landing.howItWorks.${step.titleKey}`)}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', lineHeight: 1.7, maxWidth: 280, mx: 'auto' }}>
                  {t(`landing.howItWorks.${step.descKey}`)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Interactive Demo Section */}
      <Box
        id="demo"
        ref={demoRef}
        sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, md: 6 } }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
            <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'text.primary', mb: 2 }}>
              {t('landing.demo.title')}
            </Typography>
            <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.7, maxWidth: 520, mx: 'auto' }}>
              {t('landing.demo.subtitle')}
            </Typography>
          </Box>

          {/* Screen tabs */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {SCREENS.map((screen, i) => (
              <Box
                key={i}
                onClick={() => setActiveScreen(i)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2.5,
                  py: 1.25,
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 200ms ease',
                  bgcolor: activeScreen === i ? `${screen.color}15` : 'transparent',
                  color: activeScreen === i ? screen.color : 'text.secondary',
                  border: '1px solid',
                  borderColor: activeScreen === i ? `${screen.color}40` : 'divider',
                  '&:hover': {
                    bgcolor: `${screen.color}10`,
                    borderColor: `${screen.color}30`,
                  },
                }}
              >
                {screen.icon}
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {t(screen.labelKey)}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Interactive mockup */}
          <Box
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              opacity: demoVisible ? 1 : 0,
              transform: demoVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
              transition: 'all 600ms ease',
            }}
          >
            {/* Browser chrome */}
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#1e293b', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f57' }} />
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28ca42' }} />
              <Box sx={{ flex: 1, bgcolor: '#0f172a', borderRadius: 1, px: 1.5, py: 0.5, mx: 1 }}>
                <Typography sx={{ fontSize: '0.6rem', color: '#64748b' }}>app.builderops.dev</Typography>
              </Box>
            </Box>
            {/* Screen content */}
            <Box sx={{ bgcolor: '#0f172a', p: { xs: 2, md: 3 }, minHeight: { xs: 280, md: 380 } }}>
              {SCREENS[activeScreen].content}
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  )
}

function DashboardScreen() {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <ConstructionIcon sx={{ fontSize: 16, color: '#C75B20' }} />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>
          BuilderOps
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '0.6rem', color: '#64748b' }}>
          פרויקט מגדלי הים
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        {[
          { label: 'ציוד פעיל', value: '248', color: '#C75B20', change: '+12' },
          { label: 'בדיקות השבוע', value: '36', color: '#22c55e', change: '+8' },
          { label: 'משימות פתוחות', value: '67', color: '#3b82f6', change: '-5' },
          { label: 'אישורים ממתינים', value: '14', color: '#f59e0b', change: '+3' },
        ].map((kpi) => (
          <Box key={kpi.label} sx={{ p: 1.5, borderRadius: 2, bgcolor: `${kpi.color}10`, border: `1px solid ${kpi.color}25` }}>
            <Typography sx={{ fontSize: '0.55rem', color: '#94a3b8', mb: 0.5 }}>{kpi.label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</Typography>
              <Typography sx={{ fontSize: '0.5rem', color: kpi.change.startsWith('+') ? '#22c55e' : '#ef4444' }}>{kpi.change}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Chart + Activity */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 1.5 }}>
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#1e293b' }}>
          <Typography sx={{ fontSize: '0.6rem', color: '#94a3b8', mb: 1.5 }}>התקדמות חודשית</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 60 }}>
            {[40, 55, 35, 70, 50, 80, 65, 75, 85, 60, 90, 72].map((h, i) => (
              <Box key={i} sx={{ flex: 1, height: `${h}%`, bgcolor: i === 10 ? '#C75B20' : '#C75B2060', borderRadius: '3px 3px 0 0', transition: 'height 300ms ease' }} />
            ))}
          </Box>
        </Box>
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#1e293b' }}>
          <Typography sx={{ fontSize: '0.6rem', color: '#94a3b8', mb: 1.5 }}>פעילות אחרונה</Typography>
          {[
            { text: 'בדיקה #127 אושרה', icon: <CheckCircleIcon sx={{ fontSize: 10, color: '#22c55e' }} /> },
            { text: 'ציוד חדש נוסף', icon: <ConstructionIcon sx={{ fontSize: 10, color: '#C75B20' }} /> },
            { text: 'ליקוי דווח - קומה 5', icon: <ReportProblemIcon sx={{ fontSize: 10, color: '#f59e0b' }} /> },
            { text: 'משימה הושלמה', icon: <TaskAltIcon sx={{ fontSize: 10, color: '#3b82f6' }} /> },
          ].map((item, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 1 }}>
              {item.icon}
              <Typography sx={{ fontSize: '0.55rem', color: '#cbd5e1' }}>{item.text}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function InspectionsScreen() {
  const inspections = [
    { num: '#127', area: 'קומה 3 - אגף מזרח', type: 'בדיקת חשמל', status: 'אושר', statusColor: '#22c55e', date: '08/03/2026' },
    { num: '#126', area: 'קומה 5 - לובי', type: 'בדיקת אינסטלציה', status: 'בביצוע', statusColor: '#f59e0b', date: '07/03/2026' },
    { num: '#125', area: 'קומה 2 - דירה 4', type: 'בדיקת בטיחות', status: 'ממתין', statusColor: '#94a3b8', date: '06/03/2026' },
    { num: '#124', area: 'חניון -1', type: 'בדיקה מבנית', status: 'אושר', statusColor: '#22c55e', date: '05/03/2026' },
    { num: '#123', area: 'גג - מערכות', type: 'בדיקת איטום', status: 'נדחה', statusColor: '#ef4444', date: '04/03/2026' },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <AssignmentIcon sx={{ fontSize: 16, color: '#2563eb' }} />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>ניהול בדיקות</Typography>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: '#2563eb20', border: '1px solid #2563eb40' }}>
          <Typography sx={{ fontSize: '0.55rem', color: '#60a5fa', fontWeight: 600 }}>+ בדיקה חדשה</Typography>
        </Box>
      </Box>

      {/* Table header */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '0.8fr 2fr 1.5fr 1fr 0.8fr', gap: 1, px: 1.5, mb: 1 }}>
        {['מספר', 'אזור', 'סוג', 'סטטוס', 'תאריך'].map((h) => (
          <Typography key={h} sx={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 600 }}>{h}</Typography>
        ))}
      </Box>

      {/* Table rows */}
      {inspections.map((insp) => (
        <Box
          key={insp.num}
          sx={{
            display: 'grid',
            gridTemplateColumns: '0.8fr 2fr 1.5fr 1fr 0.8fr',
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            mb: 0.5,
            bgcolor: '#1e293b',
            '&:hover': { bgcolor: '#253348' },
            transition: 'background 150ms',
          }}
        >
          <Typography sx={{ fontSize: '0.6rem', color: '#60a5fa', fontWeight: 600 }}>{insp.num}</Typography>
          <Typography sx={{ fontSize: '0.6rem', color: '#e2e8f0' }}>{insp.area}</Typography>
          <Typography sx={{ fontSize: '0.6rem', color: '#cbd5e1' }}>{insp.type}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: insp.statusColor }} />
            <Typography sx={{ fontSize: '0.55rem', color: insp.statusColor, fontWeight: 600 }}>{insp.status}</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.55rem', color: '#94a3b8' }}>{insp.date}</Typography>
        </Box>
      ))}
    </Box>
  )
}

function AnalyticsScreen() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <TrendingUpIcon sx={{ fontSize: 16, color: '#16a34a' }} />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>אנליטיקה ודוחות</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        {/* Completion donut */}
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#1e293b', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.55rem', color: '#94a3b8', mb: 1.5 }}>השלמת פרויקט</Typography>
          <Box sx={{ position: 'relative', width: 80, height: 80, mx: 'auto', mb: 1 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#16a34a" strokeWidth="3" strokeDasharray="73 27" strokeLinecap="round" />
            </svg>
            <Typography sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.9rem', fontWeight: 800, color: '#16a34a' }}>73%</Typography>
          </Box>
        </Box>

        {/* Status breakdown */}
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#1e293b' }}>
          <Typography sx={{ fontSize: '0.55rem', color: '#94a3b8', mb: 1.5 }}>סטטוס ליקויים</Typography>
          {[
            { label: 'סגורים', pct: 68, color: '#22c55e' },
            { label: 'בטיפול', pct: 22, color: '#f59e0b' },
            { label: 'פתוחים', pct: 10, color: '#ef4444' },
          ].map((item) => (
            <Box key={item.label} sx={{ mb: 1.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.55rem', color: '#cbd5e1' }}>{item.label}</Typography>
                <Typography sx={{ fontSize: '0.55rem', color: item.color, fontWeight: 700 }}>{item.pct}%</Typography>
              </Box>
              <Box sx={{ height: 4, bgcolor: '#334155', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${item.pct}%`, bgcolor: item.color, borderRadius: 2, transition: 'width 600ms ease' }} />
              </Box>
            </Box>
          ))}
        </Box>

        {/* Weekly summary */}
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#1e293b' }}>
          <Typography sx={{ fontSize: '0.55rem', color: '#94a3b8', mb: 1.5 }}>סיכום שבועי</Typography>
          {[
            { label: 'בדיקות שבוצעו', value: '36', icon: <AssignmentIcon sx={{ fontSize: 10, color: '#2563eb' }} /> },
            { label: 'אישורים שניתנו', value: '28', icon: <CheckCircleIcon sx={{ fontSize: 10, color: '#22c55e' }} /> },
            { label: 'ליקויים שנסגרו', value: '19', icon: <TaskAltIcon sx={{ fontSize: 10, color: '#C75B20' }} /> },
            { label: 'משימות שהושלמו', value: '42', icon: <TaskAltIcon sx={{ fontSize: 10, color: '#a855f7' }} /> },
          ].map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
              {item.icon}
              <Typography sx={{ flex: 1, fontSize: '0.55rem', color: '#cbd5e1' }}>{item.label}</Typography>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#e2e8f0' }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
