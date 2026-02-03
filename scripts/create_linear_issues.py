import requests
import json
import time

API_TOKEN = "lin_api_EmtAtr8ggFJGVINnUEzMButkDuOVrkdGVRZwGBEi"
TEAM_ID = "18af49f9-dd3c-451d-bbd3-0853150cf9b9"
API_URL = "https://api.linear.app/graphql"

headers = {
    "Content-Type": "application/json",
    "Authorization": API_TOKEN
}

def create_issue(title, description, labels=None, estimate=None, parent_id=None, priority=None):
    mutation = """
    mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
            success
            issue {
                id
                identifier
                title
            }
        }
    }
    """

    variables = {
        "input": {
            "teamId": TEAM_ID,
            "title": title,
            "description": description
        }
    }

    if estimate:
        variables["input"]["estimate"] = estimate
    if parent_id:
        variables["input"]["parentId"] = parent_id
    if priority:
        variables["input"]["priority"] = priority

    response = requests.post(API_URL, headers=headers, json={"query": mutation, "variables": variables})
    result = response.json()

    if "errors" in result:
        print(f"Error creating issue '{title}': {result['errors']}")
        return None

    issue = result["data"]["issueCreate"]["issue"]
    print(f"Created: {issue['identifier']} - {issue['title']}")
    return issue["id"]

def create_label(name, color):
    mutation = """
    mutation CreateLabel($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
            success
            issueLabel {
                id
                name
            }
        }
    }
    """

    variables = {
        "input": {
            "teamId": TEAM_ID,
            "name": name,
            "color": color
        }
    }

    response = requests.post(API_URL, headers=headers, json={"query": mutation, "variables": variables})
    result = response.json()

    if "errors" in result:
        print(f"Label '{name}' may already exist")
        return None

    return result["data"]["issueLabelCreate"]["issueLabel"]["id"]

epics = [
    {
        "title": "[EPIC] Design System Foundation",
        "description": """## Overview
Establish the core design system including colors, typography, components, and theming infrastructure.

## Goals
- Implement Construction Navy color palette
- Set up bilingual typography (English + Hebrew)
- Create design tokens for spacing, shadows, borders
- Enable dark/light mode theming

## Priority
P0 - Critical (Foundation for all other work)

## Estimated Points: 8""",
        "priority": 1,
        "stories": [
            {
                "title": "Implement Design System Color Palette",
                "description": """## User Story
As a developer, I need to implement the new color system with CSS variables so that all components use consistent colors across the application.

## Acceptance Criteria
- [ ] Define CSS custom properties for all colors (primary, secondary, accent, semantic)
- [ ] Implement Construction Navy palette (#0F172A, #334155, #0369A1)
- [ ] Add Safety Orange for alerts (#F97316)
- [ ] Create semantic colors (success, warning, error, info)
- [ ] Support both light and dark mode variables

## Technical Notes
```css
:root {
  --primary-900: #0F172A;
  --primary-700: #334155;
  --accent-primary: #0369A1;
  --orange-500: #F97316;
}
```

## Labels
design-system, frontend""",
                "estimate": 2
            },
            {
                "title": "Configure Bilingual Typography System",
                "description": """## User Story
As a developer, I need to set up the typography system with Plus Jakarta Sans (English) and Noto Sans Hebrew (RTL) so that the app supports bilingual content.

## Acceptance Criteria
- [ ] Import Google Fonts (Plus Jakarta Sans, Noto Sans Hebrew)
- [ ] Define type scale (Display, H1-H4, Body, Small, Tiny)
- [ ] Configure font weights and line heights
- [ ] Set up RTL font-family switching
- [ ] Create typography utility classes

## Google Fonts Import
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Noto+Sans+Hebrew:wght@300;400;500;700&display=swap');
```

## Labels
design-system, typography, i18n""",
                "estimate": 2
            },
            {
                "title": "Create Design Token System for Components",
                "description": """## User Story
As a developer, I need a token system for spacing, shadows, and borders so that components maintain visual consistency.

## Acceptance Criteria
- [ ] Define spacing scale (xs: 4px through 3xl: 64px)
- [ ] Create shadow depth levels (sm, md, lg, xl)
- [ ] Set border radius tokens (sm: 4px, md: 8px, lg: 12px, xl: 16px)
- [ ] Configure transition timing tokens
- [ ] Document all tokens in design system

## Labels
design-system, tokens""",
                "estimate": 1
            },
            {
                "title": "Implement Dark Mode Theme Toggle",
                "description": """## User Story
As a user, I want to switch between light and dark modes so that I can use the app comfortably in different lighting conditions.

## Acceptance Criteria
- [ ] Create theme context provider
- [ ] Implement theme toggle component
- [ ] Persist theme preference in localStorage
- [ ] Apply dark mode colors throughout app
- [ ] Respect system preference (prefers-color-scheme)

## Labels
design-system, theming, accessibility""",
                "estimate": 3
            }
        ]
    },
    {
        "title": "[EPIC] Landing Page Implementation",
        "description": """## Overview
Build the marketing landing page with hero, features, pricing, testimonials, and CTA sections.

## Goals
- Create compelling hero section with CTAs
- Showcase features in Bento grid layout
- Display pricing tiers
- Add social proof with testimonials
- Mobile app preview section

## Design References
- `design-assets/landing/01-hero-dark.png`
- `design-assets/landing/02-features-bento.png`
- `design-assets/landing/03-pricing.png`

## Priority
P1 - High

## Estimated Points: 13""",
        "priority": 2,
        "stories": [
            {
                "title": "Build Landing Page Hero Section",
                "description": """## User Story
As a visitor, I want to see an impressive hero section so that I immediately understand the product value proposition.

## Acceptance Criteria
- [ ] Dark navy background (#0F172A) with construction imagery overlay
- [ ] Headline: "Build Smarter. Inspect Faster. Deliver Excellence."
- [ ] Two CTAs: "Request Demo" (primary blue) and "Login" (secondary outlined)
- [ ] Trust logos carousel at bottom (5-6 company logos)
- [ ] Glassmorphism navigation bar
- [ ] Responsive for mobile/tablet/desktop

## Design Reference
`design-assets/landing/01-hero-dark.png`

## Labels
landing-page, marketing""",
                "estimate": 3
            },
            {
                "title": "Create Features Section with Bento Grid Layout",
                "description": """## User Story
As a visitor, I want to see the key features in an engaging layout so that I understand what the platform offers.

## Acceptance Criteria
- [ ] Asymmetric bento grid layout (2 large, 4 medium cards)
- [ ] 6 features: Project Management, Equipment Tracking, Inspection System, Approval Workflows, Team Collaboration, Analytics
- [ ] Glassmorphism card effect with hover states
- [ ] SVG icons for each feature (Lucide/Heroicons)
- [ ] Responsive grid (3-col desktop, 2-col tablet, 1-col mobile)

## Design Reference
`design-assets/landing/02-features-bento.png`

## Labels
landing-page, components""",
                "estimate": 3
            },
            {
                "title": "Build 3-Tier Pricing Cards Section",
                "description": """## User Story
As a visitor, I want to see pricing options so that I can choose the right plan for my needs.

## Acceptance Criteria
- [ ] Three pricing cards: Starter, Professional (highlighted), Enterprise
- [ ] "Most Popular" badge on Professional tier
- [ ] Feature list with checkmarks for each tier
- [ ] CTA buttons on each card
- [ ] Professional card elevated with emphasis styling

## Design Reference
`design-assets/landing/03-pricing.png`

## Labels
landing-page, pricing""",
                "estimate": 2
            },
            {
                "title": "Create Client Testimonials Carousel",
                "description": """## User Story
As a visitor, I want to see testimonials from real clients so that I can trust the platform.

## Acceptance Criteria
- [ ] Testimonial cards with quote, photo, name, title
- [ ] 5-star rating display
- [ ] Company logos
- [ ] Carousel/slider navigation
- [ ] Auto-play with pause on hover

## Design Reference
`design-assets/landing/04-testimonials.png`

## Labels
landing-page, social-proof""",
                "estimate": 2
            },
            {
                "title": "Add Mobile App Preview Section",
                "description": """## User Story
As a visitor, I want to see the mobile app so that I know I can use it in the field.

## Acceptance Criteria
- [ ] iPhone and Android device mockups
- [ ] Floating phone display at angle
- [ ] App store badges (iOS/Android)
- [ ] Feature highlights for mobile

## Design Reference
`design-assets/landing/05-mobile-preview.png`

## Labels
landing-page, mobile""",
                "estimate": 2
            },
            {
                "title": "Build Final Call-to-Action Section",
                "description": """## User Story
As a visitor, I want a clear final CTA so that I can request a demo easily.

## Acceptance Criteria
- [ ] Dark navy background
- [ ] Headline: "Ready to Transform Your Construction Operations?"
- [ ] Email input field with submit button
- [ ] Demo calendar widget preview
- [ ] Trust badges and security icons

## Design Reference
`design-assets/landing/06-cta-section.png`

## Labels
landing-page, conversion""",
                "estimate": 1
            }
        ]
    },
    {
        "title": "[EPIC] Dashboard Views",
        "description": """## Overview
Implement role-based dashboards for executives, project managers, and field inspectors.

## Goals
- Executive dashboard with KPIs and analytics
- Project manager dashboard with project overview
- Field inspector mobile-optimized dashboard
- Analytics and team workload views

## Design References
- `design-assets/dashboard/07-executive-dark.png`
- `design-assets/dashboard/08-executive-light.png`
- `design-assets/dashboard/09-project-manager.png`
- `design-assets/dashboard/10-inspector-mobile.png`

## Priority
P0 - Critical

## Estimated Points: 21""",
        "priority": 1,
        "stories": [
            {
                "title": "Build Executive Dashboard (Dark Theme)",
                "description": """## User Story
As an executive, I want a dark mode dashboard so that I can view KPIs and project status at a glance.

## Acceptance Criteria
- [ ] Bento grid layout with KPI cards
- [ ] Active Projects count widget
- [ ] Pending Approvals counter
- [ ] Completion Rate percentage ring
- [ ] Revenue/budget line chart
- [ ] Project location map widget
- [ ] Risk alerts panel with severity indicators
- [ ] Dark navy theme (#0F172A background)

## Design Reference
`design-assets/dashboard/07-executive-dark.png`

## Labels
dashboard, executive, dark-mode""",
                "estimate": 5
            },
            {
                "title": "Build Executive Dashboard (Light Theme)",
                "description": """## User Story
As an executive, I want a light mode option so that I can use the dashboard in bright environments.

## Acceptance Criteria
- [ ] Same layout as dark mode
- [ ] Light background (#F8FAFC)
- [ ] Adjusted colors for light theme contrast
- [ ] Theme toggle integration

## Design Reference
`design-assets/dashboard/08-executive-light.png`

## Labels
dashboard, executive, light-mode""",
                "estimate": 2
            },
            {
                "title": "Create Project Manager Dashboard View",
                "description": """## User Story
As a project manager, I want a dashboard focused on active projects so that I can manage my workload effectively.

## Acceptance Criteria
- [ ] Active projects card grid
- [ ] Project cards with progress bars and status badges
- [ ] Timeline mini-view (simplified Gantt)
- [ ] Team workload distribution bars
- [ ] Approval queue widget
- [ ] Quick filters bar

## Design Reference
`design-assets/dashboard/09-project-manager.png`

## Labels
dashboard, project-manager""",
                "estimate": 5
            },
            {
                "title": "Build Mobile Dashboard for Field Inspectors",
                "description": """## User Story
As a field inspector, I want a mobile-optimized dashboard so that I can quickly access today's inspections on-site.

## Acceptance Criteria
- [ ] Mobile-first responsive design
- [ ] Today's inspections list with times/locations
- [ ] Large touch-friendly action buttons (44px min)
- [ ] Quick actions: Start Inspection, Take Photo, Report Issue
- [ ] Offline mode indicator
- [ ] Bottom navigation bar

## Design Reference
`design-assets/dashboard/10-inspector-mobile.png`

## Labels
dashboard, mobile, inspector""",
                "estimate": 3
            },
            {
                "title": "Create Analytics Dashboard with Charts",
                "description": """## User Story
As a user, I want an analytics dashboard so that I can visualize project data and trends.

## Acceptance Criteria
- [ ] Line chart for progress over time
- [ ] Bar chart for budget comparison
- [ ] Pie chart for task distribution
- [ ] KPI comparison cards with trends
- [ ] Date range selector
- [ ] Export buttons (CSV, PDF)

## Design Reference
`design-assets/dashboard/11-analytics.png`

## Labels
dashboard, analytics, charts""",
                "estimate": 3
            },
            {
                "title": "Build Team Workload View",
                "description": """## User Story
As a manager, I want to see team workload so that I can balance assignments appropriately.

## Acceptance Criteria
- [ ] Team member cards with avatars
- [ ] Workload distribution bars
- [ ] Availability calendar grid
- [ ] Project assignment tags
- [ ] Filter by department/role

## Design Reference
`design-assets/dashboard/12-team-workload.png`

## Labels
dashboard, team, workload""",
                "estimate": 3
            }
        ]
    },
    {
        "title": "[EPIC] Approval System UI",
        "description": """## Overview
Implement the approval queue, workflow stepper, and audit trail interfaces.

## Goals
- Approval queue list with filters
- Multi-step approval workflow visualization
- Document review interface
- Complete audit trail

## Design References
- `design-assets/dashboard/13-approval-queue.png`
- `design-assets/approval/26-approval-stepper.png`
- `design-assets/approval/27-document-review.png`

## Priority
P1 - High

## Estimated Points: 13""",
        "priority": 2,
        "stories": [
            {
                "title": "Build Approval Queue List View",
                "description": """## User Story
As an approver, I want to see all pending approvals so that I can process them efficiently.

## Acceptance Criteria
- [ ] List/table view of pending approvals
- [ ] Columns: type, project, submitter, date, priority
- [ ] Filter tabs: All, Equipment, Materials, Documents
- [ ] Status badges (Pending, Urgent)
- [ ] Quick action buttons (Approve, Reject, Review)
- [ ] Search and filter bar
- [ ] Pagination

## Design Reference
`design-assets/dashboard/13-approval-queue.png`

## Labels
approvals, list-view""",
                "estimate": 3
            },
            {
                "title": "Create Real-time Notifications Panel",
                "description": """## User Story
As a user, I want to see notifications so that I stay informed about important updates.

## Acceptance Criteria
- [ ] Slide-out panel from header
- [ ] Notification list with icons, titles, timestamps
- [ ] Category tabs: All, Approvals, Inspections, Updates
- [ ] Unread counter badge
- [ ] Mark all as read functionality
- [ ] Click to navigate to relevant item

## Design Reference
`design-assets/dashboard/14-notifications.png`

## Labels
notifications, real-time""",
                "estimate": 2
            },
            {
                "title": "Implement Approval Workflow Stepper",
                "description": """## User Story
As a user, I want to see the approval progress so that I know where my request stands.

## Acceptance Criteria
- [ ] Horizontal stepper component
- [ ] Steps: Draft → Submitted → Under Review → Approved
- [ ] Current step highlighted
- [ ] Completed steps with checkmarks
- [ ] Step details on expansion
- [ ] Action buttons for current step

## Design Reference
`design-assets/approval/26-approval-stepper.png`

## Labels
approvals, workflow""",
                "estimate": 3
            },
            {
                "title": "Build Document Review Split View",
                "description": """## User Story
As a reviewer, I want to view documents and add comments so that I can make informed approval decisions.

## Acceptance Criteria
- [ ] Split view layout
- [ ] Left panel: document/PDF preview with zoom
- [ ] Right panel: comments thread
- [ ] Comment with user avatars and timestamps
- [ ] Reply to comments
- [ ] Action bar: Approve, Reject, Request Changes

## Design Reference
`design-assets/approval/27-document-review.png`

## Labels
approvals, documents""",
                "estimate": 3
            },
            {
                "title": "Create Approval History Audit Trail",
                "description": """## User Story
As an admin, I want to see the complete approval history so that I can audit decisions and ensure compliance.

## Acceptance Criteria
- [ ] Vertical timeline of actions
- [ ] Entry: user avatar, action, timestamp, status
- [ ] Action types: Submitted, Approved, Rejected, Commented
- [ ] Filter by date range and action type
- [ ] Export audit log button

## Design Reference
`design-assets/approval/28-audit-trail.png`

## Labels
approvals, audit""",
                "estimate": 2
            }
        ]
    },
    {
        "title": "[EPIC] Project Management Pages",
        "description": """## Overview
Build project detail pages including overview, equipment, materials, timeline, and team views.

## Goals
- Project overview with progress visualization
- Equipment and material tracking
- Gantt timeline view
- Team directory
- Document library

## Design References
- `design-assets/project/15-project-overview.png`
- `design-assets/project/16-equipment-list.png`
- `design-assets/project/18-gantt-timeline.png`

## Priority
P1 - High

## Estimated Points: 18""",
        "priority": 2,
        "stories": [
            {
                "title": "Create Project Overview Detail Page",
                "description": """## User Story
As a user, I want to see a project overview so that I can quickly understand project status.

## Acceptance Criteria
- [ ] Hero section with project photo
- [ ] Progress ring showing percentage complete
- [ ] Project name, address, dates
- [ ] Status timeline with milestones
- [ ] Tabbed navigation: Overview, Equipment, Inspections, Team
- [ ] Key metrics cards: Budget, Timeline, Team Size

## Design Reference
`design-assets/project/15-project-overview.png`

## Labels
project, overview""",
                "estimate": 3
            },
            {
                "title": "Build Equipment Tracking Data Table",
                "description": """## User Story
As a user, I want to view and manage equipment so that I can track assets across projects.

## Acceptance Criteria
- [ ] Data table with sortable columns
- [ ] Columns: name, model, serial, location, status
- [ ] Status badges: Approved, Pending, Rejected
- [ ] Search and filter dropdowns
- [ ] Add Equipment button
- [ ] Row actions: View, Edit, Delete
- [ ] Pagination

## Design Reference
`design-assets/project/16-equipment-list.png`

## Labels
project, equipment""",
                "estimate": 3
            },
            {
                "title": "Create Material Inventory Card Grid",
                "description": """## User Story
As a user, I want to view materials in a visual grid so that I can quickly assess inventory status.

## Acceptance Criteria
- [ ] Card grid layout
- [ ] Material photo, name, quantity
- [ ] Progress bar for quantity level
- [ ] Storage location indicator
- [ ] Low stock alert badge (orange)
- [ ] Filter chips: All, Concrete, Steel, Lumber, etc.
- [ ] Add Material button

## Design Reference
`design-assets/project/17-material-inventory.png`

## Labels
project, materials""",
                "estimate": 3
            },
            {
                "title": "Implement Interactive Gantt Chart",
                "description": """## User Story
As a project manager, I want to see a Gantt chart so that I can visualize project timeline and dependencies.

## Acceptance Criteria
- [ ] Horizontal timeline with task bars
- [ ] Task groups (collapsible)
- [ ] Dependencies shown with arrows
- [ ] Milestone markers (diamonds)
- [ ] Today line indicator
- [ ] Zoom controls (day/week/month)
- [ ] Task list sidebar

## Design Reference
`design-assets/project/18-gantt-timeline.png`

## Labels
project, timeline, gantt""",
                "estimate": 5
            },
            {
                "title": "Build Team Members Directory Grid",
                "description": """## User Story
As a user, I want to see all team members so that I can contact and assign tasks to them.

## Acceptance Criteria
- [ ] Card grid of team members
- [ ] Avatar, name, role, contact info
- [ ] Role color coding
- [ ] Project assignment tags
- [ ] Search by name
- [ ] Filter by role
- [ ] Invite Team Member button

## Design Reference
`design-assets/project/19-team-members.png`

## Labels
project, team""",
                "estimate": 2
            },
            {
                "title": "Create Document Library File Browser",
                "description": """## User Story
As a user, I want to manage project documents so that I can store and find files easily.

## Acceptance Criteria
- [ ] Split view: folder tree + file list + preview
- [ ] Folder structure: Contracts, Blueprints, Permits, Reports
- [ ] File list with name, type, size, date, uploader
- [ ] Preview panel for selected file
- [ ] Drag and drop upload area
- [ ] Search and filter by type

## Design Reference
`design-assets/project/20-document-library.png`

## Labels
project, documents""",
                "estimate": 2
            }
        ]
    },
    {
        "title": "[EPIC] Inspection System UI",
        "description": """## Overview
Implement inspection checklists, findings, reports, and consultant management interfaces.

## Goals
- Mobile-first inspection checklist
- Finding documentation with photos
- Report generation and preview
- Consultant assignment scheduling
- Inspection history timeline

## Design References
- `design-assets/inspection/21-checklist-mobile.png`
- `design-assets/inspection/22-finding-card.png`
- `design-assets/inspection/23-report-preview.png`

## Priority
P0 - Critical

## Estimated Points: 15""",
        "priority": 1,
        "stories": [
            {
                "title": "Build Mobile Inspection Checklist Interface",
                "description": """## User Story
As an inspector, I want to complete checklists on my mobile device so that I can work efficiently on-site.

## Acceptance Criteria
- [ ] Mobile-optimized layout
- [ ] Collapsible sections: Structural, Electrical, Plumbing
- [ ] Checklist items with toggle switches
- [ ] Photo capture button with camera integration
- [ ] Notes text area per item
- [ ] Digital signature capture at bottom
- [ ] Progress bar showing completion
- [ ] Offline capability indicators

## Design Reference
`design-assets/inspection/21-checklist-mobile.png`

## Labels
inspection, mobile, checklist""",
                "estimate": 5
            },
            {
                "title": "Create Finding Documentation Component",
                "description": """## User Story
As an inspector, I want to document findings with details so that issues are properly tracked.

## Acceptance Criteria
- [ ] Finding card component
- [ ] Severity badge: Critical (red), High (orange), Medium (yellow), Low (gray)
- [ ] Photo gallery with add photo
- [ ] Location pin with floor/area
- [ ] Description text area
- [ ] Inspector info and timestamp
- [ ] Actions: Assign, Resolve, Add Photo

## Design Reference
`design-assets/inspection/22-finding-card.png`

## Labels
inspection, findings""",
                "estimate": 3
            },
            {
                "title": "Build Inspection Report Preview/Export",
                "description": """## User Story
As a user, I want to preview and export inspection reports so that I can share them with stakeholders.

## Acceptance Criteria
- [ ] PDF-style report layout
- [ ] Company logo header
- [ ] Inspection summary section
- [ ] Findings table with severity counts
- [ ] Photo grid section
- [ ] Digital signature display
- [ ] Export to PDF button
- [ ] Print functionality

## Design Reference
`design-assets/inspection/23-report-preview.png`

## Labels
inspection, reports""",
                "estimate": 3
            },
            {
                "title": "Create Consultant Selection and Scheduling UI",
                "description": """## User Story
As a manager, I want to assign consultants to inspections so that the right experts are scheduled.

## Acceptance Criteria
- [ ] Consultant list with avatar, name, specialty
- [ ] Filter by specialty dropdown
- [ ] Availability status indicators
- [ ] Weekly calendar view for scheduling
- [ ] Time slot selection
- [ ] Assign button

## Design Reference
`design-assets/inspection/24-consultant-assignment.png`

## Labels
inspection, scheduling""",
                "estimate": 2
            },
            {
                "title": "Build Inspection History Timeline View",
                "description": """## User Story
As a user, I want to see inspection history so that I can track all inspections for a project.

## Acceptance Criteria
- [ ] Vertical timeline component
- [ ] Date markers
- [ ] Inspection nodes with status dots (green/red/yellow)
- [ ] Inspector avatar and name
- [ ] Inspection type label
- [ ] Click to view details
- [ ] Filter by date range

## Design Reference
`design-assets/inspection/25-history-timeline.png`

## Labels
inspection, history""",
                "estimate": 2
            }
        ]
    },
    {
        "title": "[EPIC] RTL & Internationalization",
        "description": """## Overview
Implement Hebrew RTL support and bilingual infrastructure.

## Goals
- Full RTL layout support
- Hebrew translations
- Language toggle functionality
- Proper bidirectional text handling

## Design References
- `design-assets/mobile/29-hebrew-rtl.png`

## Priority
P1 - High

## Estimated Points: 8""",
        "priority": 2,
        "stories": [
            {
                "title": "Implement RTL Layout Support",
                "description": """## User Story
As a Hebrew-speaking user, I want the interface to display correctly in RTL so that I can use the app naturally.

## Acceptance Criteria
- [ ] HTML dir="rtl" attribute switching
- [ ] CSS logical properties (margin-inline-start, etc.)
- [ ] Sidebar on right side for RTL
- [ ] Navigation mirrored appropriately
- [ ] Icons that indicate direction should flip
- [ ] Numbers and phone numbers remain LTR

## Design Reference
`design-assets/mobile/29-hebrew-rtl.png`

## Labels
i18n, rtl""",
                "estimate": 3
            },
            {
                "title": "Add Hebrew Language Support",
                "description": """## User Story
As a Hebrew user, I want all UI text in Hebrew so that I can use the app in my native language.

## Acceptance Criteria
- [ ] i18n framework setup (react-intl or i18next)
- [ ] Hebrew translation file with all UI strings
- [ ] Language switcher in settings
- [ ] Proper Hebrew font rendering (Noto Sans Hebrew)
- [ ] Date/time formatting for Hebrew locale

## Labels
i18n, translation""",
                "estimate": 3
            },
            {
                "title": "Create Language Toggle UI",
                "description": """## User Story
As a user, I want to switch between English and Hebrew so that I can use my preferred language.

## Acceptance Criteria
- [ ] Language toggle in header/settings
- [ ] Flag or text indicator (EN/עב)
- [ ] Persist preference in user settings
- [ ] Seamless switch without page reload

## Labels
i18n, component""",
                "estimate": 2
            }
        ]
    },
    {
        "title": "[EPIC] Mobile & Offline Experience",
        "description": """## Overview
Ensure mobile responsiveness and offline capability for field workers.

## Goals
- Mobile-first responsive design
- Offline mode with sync indicators
- PWA installation support
- Touch-optimized interactions

## Design References
- `design-assets/mobile/30-offline-mode.png`

## Priority
P1 - High

## Estimated Points: 10""",
        "priority": 2,
        "stories": [
            {
                "title": "Implement Mobile-First Responsive Design",
                "description": """## User Story
As a mobile user, I want the app to work well on my phone so that I can use it on construction sites.

## Acceptance Criteria
- [ ] Breakpoints: 375px, 640px, 768px, 1024px, 1280px
- [ ] Touch targets minimum 44x44px
- [ ] Mobile navigation (hamburger menu or bottom nav)
- [ ] Responsive tables (card view on mobile)
- [ ] No horizontal scroll issues

## Labels
mobile, responsive""",
                "estimate": 3
            },
            {
                "title": "Build Offline Mode Interface",
                "description": """## User Story
As a field worker, I want visual feedback when offline so that I know my data is being saved locally.

## Acceptance Criteria
- [ ] Offline banner/indicator
- [ ] Sync status icon in header
- [ ] Queued items counter
- [ ] Last synced timestamp
- [ ] Sync Now button (disabled when offline)
- [ ] Visual distinction for locally-saved items

## Design Reference
`design-assets/mobile/30-offline-mode.png`

## Labels
mobile, offline""",
                "estimate": 3
            },
            {
                "title": "Configure PWA for Installation",
                "description": """## User Story
As a user, I want to install the app on my device so that I can access it like a native app.

## Acceptance Criteria
- [ ] Web app manifest configured
- [ ] Service worker for caching
- [ ] Offline page fallback
- [ ] Install prompt handling
- [ ] App icons for all sizes

## Labels
mobile, pwa""",
                "estimate": 2
            },
            {
                "title": "Optimize Touch Interactions",
                "description": """## User Story
As a mobile user, I want smooth touch interactions so that the app feels responsive.

## Acceptance Criteria
- [ ] touch-action: manipulation for tap delay
- [ ] Swipe gestures where appropriate
- [ ] Pull-to-refresh on list views
- [ ] 8px minimum gap between touch targets
- [ ] Haptic feedback on key actions (if supported)

## Labels
mobile, touch""",
                "estimate": 2
            }
        ]
    },
    {
        "title": "[EPIC] Component Library",
        "description": """## Overview
Build reusable UI components based on the design system.

## Goals
- Core button variants
- Card component system
- Form components
- Data display components
- Navigation components

## Priority
P0 - Critical

## Estimated Points: 13""",
        "priority": 1,
        "stories": [
            {
                "title": "Create Button Component Variants",
                "description": """## User Story
As a developer, I need button components so that CTAs are consistent across the app.

## Acceptance Criteria
- [ ] Primary button (filled blue #0369A1)
- [ ] Secondary button (outlined)
- [ ] Tertiary button (text only)
- [ ] Danger button (red)
- [ ] Loading state with spinner
- [ ] Disabled state
- [ ] Icon button variant
- [ ] Size variants (sm, md, lg)

## Labels
components, buttons""",
                "estimate": 2
            },
            {
                "title": "Build Card Component System",
                "description": """## User Story
As a developer, I need card components so that content containers are consistent.

## Acceptance Criteria
- [ ] Base card with variants
- [ ] Glassmorphism card option
- [ ] KPI card (metric, label, trend)
- [ ] Feature card (icon, title, description)
- [ ] Project card (image, title, progress, status)
- [ ] Hover states with lift effect

## Labels
components, cards""",
                "estimate": 3
            },
            {
                "title": "Create Form Input Components",
                "description": """## User Story
As a developer, I need form components so that data entry is consistent and accessible.

## Acceptance Criteria
- [ ] Text input with label
- [ ] Textarea
- [ ] Select/dropdown
- [ ] Checkbox and radio
- [ ] Date picker
- [ ] File upload
- [ ] Error states and validation messages
- [ ] Focus states for accessibility

## Labels
components, forms""",
                "estimate": 3
            },
            {
                "title": "Build Data Display Components",
                "description": """## User Story
As a developer, I need data components so that information is displayed consistently.

## Acceptance Criteria
- [ ] Data table with sorting and pagination
- [ ] Badge/chip component
- [ ] Status indicator
- [ ] Progress bar and ring
- [ ] Avatar component
- [ ] Empty state component

## Labels
components, data""",
                "estimate": 3
            },
            {
                "title": "Create Navigation Components",
                "description": """## User Story
As a developer, I need navigation components so that app navigation is consistent.

## Acceptance Criteria
- [ ] Top navbar with glassmorphism option
- [ ] Sidebar navigation (collapsible)
- [ ] Bottom navigation (mobile)
- [ ] Breadcrumbs
- [ ] Tabs component
- [ ] Stepper/wizard component

## Labels
components, navigation""",
                "estimate": 2
            }
        ]
    },
    {
        "title": "[EPIC] Animations & Micro-interactions",
        "description": """## Overview
Add polish with animations and micro-interactions following the design system guidelines.

## Goals
- Smooth page transitions
- Component animations
- Loading states
- Feedback animations

## Priority
P2 - Medium

## Estimated Points: 5""",
        "priority": 3,
        "stories": [
            {
                "title": "Implement Transition System",
                "description": """## User Story
As a user, I want smooth transitions so that the app feels polished and professional.

## Acceptance Criteria
- [ ] Define transition tokens (fast: 150ms, normal: 200ms, slow: 300ms)
- [ ] Page transitions (fade, slide)
- [ ] Modal open/close animations
- [ ] Accordion expand/collapse
- [ ] Respect prefers-reduced-motion

## Labels
animation, transitions""",
                "estimate": 2
            },
            {
                "title": "Add Micro-interactions to Components",
                "description": """## User Story
As a user, I want feedback on my interactions so that the app feels responsive.

## Acceptance Criteria
- [ ] Button hover/active states
- [ ] Card hover lift effect
- [ ] Loading states (skeletons, spinners)
- [ ] Success/error feedback animations
- [ ] Number count-up animations
- [ ] Chart animations on load

## Labels
animation, micro-interactions""",
                "estimate": 3
            }
        ]
    }
]

def main():
    print("Creating BuilderOps UI/UX Implementation issues in Linear...")
    print("=" * 60)

    total_stories = 0

    for epic in epics:
        print(f"\nCreating Epic: {epic['title']}")
        epic_id = create_issue(
            title=epic['title'],
            description=epic['description'],
            priority=epic.get('priority', 2)
        )

        if epic_id:
            time.sleep(0.5)

            for story in epic['stories']:
                story_id = create_issue(
                    title=story['title'],
                    description=story['description'],
                    estimate=story.get('estimate'),
                    parent_id=epic_id
                )
                total_stories += 1
                time.sleep(0.3)

    print("\n" + "=" * 60)
    print(f"COMPLETE: Created 10 Epics and {total_stories} User Stories")
    print("=" * 60)

if __name__ == "__main__":
    main()
