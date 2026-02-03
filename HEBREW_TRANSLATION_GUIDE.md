# Hebrew Translation & RTL Support Guide

## ✅ What Has Been Implemented

1. **i18next Configuration** - Full bilingual support (English/Hebrew)
2. **Hebrew Translation Files** - Complete translations for all pages
3. **RTL Layout Support** - Automatic right-to-left layout for Hebrew
4. **Language Toggle Component** - Switch between languages in header
5. **Google Fonts Integration** - Noto Sans Hebrew font already loaded

## 🎯 How to Use Translations in Your Components

### Basic Usage with useTranslation Hook

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.save')}</h1>        {/* Shows: "Save" or "שמור" */}
      <p>{t('dashboard.welcome')}</p>     {/* Shows: "Welcome" or "ברוכים הבאים" */}
      <button>{t('common.submit')}</button>
    </div>
  );
}
```

### Example: Update DashboardPage with Translations

```tsx
import { useTranslation } from 'react-i18next';
import { Typography, Button } from '@mui/material';

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div>
      <Typography variant="h1">{t('dashboard.title')}</Typography>
      <Typography variant="body1">{t('dashboard.overview')}</Typography>
      <Button variant="contained">{t('common.add')}</Button>
    </div>
  );
}
```

### RTL-Aware Styling

The system automatically handles RTL. Use the `useLanguage` hook for custom RTL logic:

```tsx
import { useLanguage } from '../hooks/useLanguage';

function MyComponent() {
  const { isRTL, currentLanguage } = useLanguage();

  return (
    <div style={{
      padding: isRTL ? '0 20px 0 0' : '0 0 0 20px'
    }}>
      Content
    </div>
  );
}
```

## 📝 Translation Keys Reference

### Common Actions
- `common.save`, `common.cancel`, `common.delete`, `common.edit`, `common.add`
- `common.search`, `common.filter`, `common.export`, `common.submit`

### Navigation
- `nav.dashboard`, `nav.projects`, `nav.equipment`, `nav.materials`
- `nav.meetings`, `nav.approvals`, `nav.areas`, `nav.contacts`
- `nav.inspections`, `nav.rfis`, `nav.auditLog`

### Dashboard
- `dashboard.title`, `dashboard.welcome`, `dashboard.overview`
- `dashboard.activeProjects`, `dashboard.pendingApprovals`

### Projects
- `projects.title`, `projects.createProject`, `projects.projectName`
- `projects.startDate`, `projects.endDate`, `projects.budget`

### Equipment
- `equipment.title`, `equipment.addEquipment`, `equipment.manufacturer`

### Materials
- `materials.title`, `materials.addMaterial`, `materials.supplier`

### Meetings
- `meetings.title`, `meetings.scheduleMeeting`, `meetings.agenda`

### Approvals
- `approvals.title`, `approvals.pending`, `approvals.approve`

### RFIs
- `rfis.title`, `rfis.createRFI`, `rfis.question`, `rfis.response`

## 🎨 Language Toggle

The language toggle is already added to the header. Users can click the globe icon (🌐) to switch between:
- 🇺🇸 English
- 🇮🇱 עברית (Hebrew)

The selection is persisted in localStorage.

## 🔧 Adding New Translations

To add new translation keys:

1. Add to `frontend/src/i18n/locales/en.json`:
```json
{
  "mySection": {
    "newKey": "New English Text"
  }
}
```

2. Add to `frontend/src/i18n/locales/he.json`:
```json
{
  "mySection": {
    "newKey": "טקסט חדש בעברית"
  }
}
```

3. Use in component:
```tsx
const { t } = useTranslation();
<div>{t('mySection.newKey')}</div>
```

## 🚀 Next Steps

To fully implement Hebrew support across your app:

1. **Update Each Page** - Replace hardcoded strings with `t()` function calls
2. **Update Components** - Replace button labels, form labels, etc.
3. **Test RTL Layout** - Check that all UI elements look correct in Hebrew
4. **Add More Translations** - Expand translation files as needed

## ✨ Features Included

- ✅ Automatic RTL direction switching
- ✅ Hebrew font (Noto Sans Hebrew)
- ✅ Language persistence (localStorage)
- ✅ MUI theme RTL support
- ✅ Bidirectional layout (Sidebar, Header, Content)
- ✅ Language toggle in header
- ✅ Comprehensive translation keys for all pages
