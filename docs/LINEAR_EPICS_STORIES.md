# BuilderOps UI/UX Implementation - Epics & User Stories

## Overview
Complete UI/UX overhaul for BuilderOps Construction Operations Platform based on market research of 30+ websites and revolutionary design system.

---

## EPIC 1: Design System Foundation
**Description:** Establish the core design system including colors, typography, components, and theming infrastructure.
**Priority:** P0 - Critical
**Estimate:** 5 points

### User Stories:

#### US-1.1: Implement Color System
**Title:** Implement Design System Color Palette
**Description:**
As a developer, I need to implement the new color system with CSS variables so that all components use consistent colors across the application.

**Acceptance Criteria:**
- [x] Define CSS custom properties for all colors (primary, secondary, accent, semantic)
- [x] Implement Construction Navy palette (#0F172A, #334155, #0369A1)
- [x] Add Safety Orange for alerts (#F97316)
- [x] Create semantic colors (success, warning, error, info)
- [x] Support both light and dark mode variables
**Estimate:** 2 points
**Labels:** design-system, frontend

#### US-1.2: Typography System Setup
**Title:** Configure Bilingual Typography System
**Description:**
As a developer, I need to set up the typography system with Plus Jakarta Sans (English) and Noto Sans Hebrew (RTL) so that the app supports bilingual content.

**Acceptance Criteria:**
- [x] Import Google Fonts (Plus Jakarta Sans, Noto Sans Hebrew)
- [x] Define type scale (Display, H1-H4, Body, Small, Tiny)
- [x] Configure font weights and line heights
- [x] Set up RTL font-family switching
- [x] Create typography utility classes
**Estimate:** 2 points
**Labels:** design-system, typography, i18n

#### US-1.3: Component Token System
**Title:** Create Design Token System for Components
**Description:**
As a developer, I need a token system for spacing, shadows, and borders so that components maintain visual consistency.

**Acceptance Criteria:**
- [x] Define spacing scale (xs through 3xl)
- [x] Create shadow depth levels (sm, md, lg, xl)
- [x] Set border radius tokens (sm, md, lg, xl)
- [x] Configure transition timing tokens
- [x] Document all tokens in design system
**Estimate:** 1 point
**Labels:** design-system, tokens

#### US-1.4: Dark Mode Infrastructure
**Title:** Implement Dark Mode Theme Toggle
**Description:**
As a user, I want to switch between light and dark modes so that I can use the app comfortably in different lighting conditions.

**Acceptance Criteria:**
- [x] Create theme context provider
- [x] Implement theme toggle component
- [x] Persist theme preference in localStorage
- [x] Apply dark mode colors throughout app
- [x] Respect system preference (prefers-color-scheme)
**Estimate:** 3 points
**Labels:** design-system, theming, accessibility

---

## EPIC 2: Landing Page Implementation
**Description:** Build the marketing landing page with hero, features, pricing, testimonials, and CTA sections.
**Priority:** P1 - High
**Estimate:** 13 points

### User Stories:

#### US-2.1: Hero Section
**Title:** Build Landing Page Hero Section
**Description:**
As a visitor, I want to see an impressive hero section so that I immediately understand the product value proposition.

**Acceptance Criteria:**
- [x] Dark navy background with construction imagery overlay
- [x] Headline: "Build Smarter. Inspect Faster. Deliver Excellence."
- [x] Two CTAs: "Request Demo" (primary) and "Login" (secondary)
- [x] Trust logos carousel at bottom
- [x] Glassmorphism navigation bar
- [x] Responsive for mobile/tablet/desktop
**Estimate:** 3 points
**Labels:** landing-page, marketing
**Design Reference:** `design-assets/landing/01-hero-dark.png`

#### US-2.2: Features Bento Grid
**Title:** Create Features Section with Bento Grid Layout
**Description:**
As a visitor, I want to see the key features in an engaging layout so that I understand what the platform offers.

**Acceptance Criteria:**
- [x] Asymmetric bento grid layout (2 large, 4 medium cards)
- [x] 6 features: Project Management, Equipment Tracking, Inspection System, Approval Workflows, Team Collaboration, Analytics
- [x] Glassmorphism card effect with hover states
- [x] SVG icons for each feature (Lucide/Heroicons)
- [x] Responsive grid (3-col desktop, 2-col tablet, 1-col mobile)
**Estimate:** 3 points
**Labels:** landing-page, components
**Design Reference:** `design-assets/landing/02-features-bento.png`

#### US-2.3: Pricing Section
**Title:** Build 3-Tier Pricing Cards Section
**Description:**
As a visitor, I want to see pricing options so that I can choose the right plan for my needs.

**Acceptance Criteria:**
- [x] Three pricing cards: Starter, Professional, Enterprise
- [x] "Most Popular" badge on Professional tier
- [x] Feature list with checkmarks for each tier
- [x] CTA buttons on each card
- [x] Professional card elevated with emphasis styling
- [x] Responsive layout
**Estimate:** 2 points
**Labels:** landing-page, pricing
**Design Reference:** `design-assets/landing/03-pricing.png`

#### US-2.4: Testimonials Section
**Title:** Create Client Testimonials Carousel
**Description:**
As a visitor, I want to see testimonials from real clients so that I can trust the platform.

**Acceptance Criteria:**
- [x] Testimonial cards with quote, photo, name, title
- [x] 5-star rating display
- [x] Company logos
- [x] Carousel/slider navigation
- [x] Auto-play with pause on hover
**Estimate:** 2 points
**Labels:** landing-page, social-proof
**Design Reference:** `design-assets/landing/04-testimonials.png`

#### US-2.5: Mobile App Preview
**Title:** Add Mobile App Preview Section
**Description:**
As a visitor, I want to see the mobile app so that I know I can use it in the field.

**Acceptance Criteria:**
- [x] iPhone and Android device mockups
- [x] Floating phone display at angle
- [x] App store badges (iOS/Android)
- [x] Feature highlights for mobile
- [x] Light gradient background
**Estimate:** 2 points
**Labels:** landing-page, mobile
**Design Reference:** `design-assets/landing/05-mobile-preview.png`

#### US-2.6: CTA Section
**Title:** Build Final Call-to-Action Section
**Description:**
As a visitor, I want a clear final CTA so that I can request a demo easily.

**Acceptance Criteria:**
- [x] Dark navy background
- [x] "Ready to Transform Your Construction Operations?" headline
- [x] Email input field with submit button
- [x] Demo calendar widget preview
- [x] Trust badges and security icons
**Estimate:** 1 point
**Labels:** landing-page, conversion
**Design Reference:** `design-assets/landing/06-cta-section.png`

---

## EPIC 3: Dashboard Views
**Description:** Implement role-based dashboards for executives, project managers, and field inspectors.
**Priority:** P0 - Critical
**Estimate:** 21 points

### User Stories:

#### US-3.1: Executive Dashboard - Dark Mode
**Title:** Build Executive Dashboard (Dark Theme)
**Description:**
As an executive, I want a dark mode dashboard so that I can view KPIs and project status at a glance.

**Acceptance Criteria:**
- [x] Bento grid layout with KPI cards
- [x] Active Projects count widget
- [x] Pending Approvals counter
- [x] Completion Rate percentage ring
- [x] Revenue/budget line chart
- [x] Project location map widget
- [x] Risk alerts panel with severity indicators
- [x] Dark navy theme (#0F172A background)
**Estimate:** 5 points
**Labels:** dashboard, executive, dark-mode
**Design Reference:** `design-assets/dashboard/07-executive-dark.png`

#### US-3.2: Executive Dashboard - Light Mode
**Title:** Build Executive Dashboard (Light Theme)
**Description:**
As an executive, I want a light mode option so that I can use the dashboard in bright environments.

**Acceptance Criteria:**
- [x] Same layout as dark mode
- [x] Light background (#F8FAFC)
- [x] Adjusted colors for light theme contrast
- [x] Theme toggle integration
**Estimate:** 2 points
**Labels:** dashboard, executive, light-mode
**Design Reference:** `design-assets/dashboard/08-executive-light.png`

#### US-3.3: Project Manager Dashboard
**Title:** Create Project Manager Dashboard View
**Description:**
As a project manager, I want a dashboard focused on active projects so that I can manage my workload effectively.

**Acceptance Criteria:**
- [x] Active projects card grid
- [x] Project cards with progress bars and status badges
- [x] Timeline mini-view (simplified Gantt)
- [x] Team workload distribution bars
- [x] Approval queue widget
- [x] Quick filters bar
**Estimate:** 5 points
**Labels:** dashboard, project-manager
**Design Reference:** `design-assets/dashboard/09-project-manager.png`

#### US-3.4: Field Inspector Mobile Dashboard
**Title:** Build Mobile Dashboard for Field Inspectors
**Description:**
As a field inspector, I want a mobile-optimized dashboard so that I can quickly access today's inspections on-site.

**Acceptance Criteria:**
- [x] Mobile-first responsive design
- [x] Today's inspections list with times/locations
- [x] Large touch-friendly action buttons (44px min)
- [x] Quick actions: Start Inspection, Take Photo, Report Issue
- [x] Offline mode indicator
- [x] Bottom navigation bar
**Estimate:** 3 points
**Labels:** dashboard, mobile, inspector
**Design Reference:** `design-assets/dashboard/10-inspector-mobile.png`

#### US-3.5: Analytics Dashboard
**Title:** Create Analytics Dashboard with Charts
**Description:**
As a user, I want an analytics dashboard so that I can visualize project data and trends.

**Acceptance Criteria:**
- [x] Line chart for progress over time
- [x] Bar chart for budget comparison
- [x] Pie chart for task distribution
- [x] KPI comparison cards with trends
- [x] Date range selector
- [x] Export buttons (CSV, PDF)
**Estimate:** 3 points
**Labels:** dashboard, analytics, charts
**Design Reference:** `design-assets/dashboard/11-analytics.png`

#### US-3.6: Team Workload Dashboard
**Title:** Build Team Workload View
**Description:**
As a manager, I want to see team workload so that I can balance assignments appropriately.

**Acceptance Criteria:**
- [x] Team member cards with avatars
- [x] Workload distribution bars
- [x] Availability calendar grid
- [x] Project assignment tags
- [x] Filter by department/role
**Estimate:** 3 points
**Labels:** dashboard, team, workload
**Design Reference:** `design-assets/dashboard/12-team-workload.png`

---

## EPIC 4: Approval System UI
**Description:** Implement the approval queue, workflow stepper, and audit trail interfaces.
**Priority:** P1 - High
**Estimate:** 13 points

### User Stories:

#### US-4.1: Approval Queue Interface
**Title:** Build Approval Queue List View
**Description:**
As an approver, I want to see all pending approvals so that I can process them efficiently.

**Acceptance Criteria:**
- [x] List/table view of pending approvals
- [x] Columns: type, project, submitter, date, priority
- [x] Filter tabs: All, Equipment, Materials, Documents
- [x] Status badges (Pending, Urgent)
- [x] Quick action buttons (Approve, Reject, Review)
- [x] Search and filter bar
- [x] Pagination
**Estimate:** 3 points
**Labels:** approvals, list-view
**Design Reference:** `design-assets/dashboard/13-approval-queue.png`

#### US-4.2: Notifications Panel
**Title:** Create Real-time Notifications Panel
**Description:**
As a user, I want to see notifications so that I stay informed about important updates.

**Acceptance Criteria:**
- [x] Slide-out panel from header
- [x] Notification list with icons, titles, timestamps
- [x] Category tabs: All, Approvals, Inspections, Updates
- [x] Unread counter badge
- [x] Mark all as read functionality
- [x] Click to navigate to relevant item
**Estimate:** 2 points
**Labels:** notifications, real-time
**Design Reference:** `design-assets/dashboard/14-notifications.png`

#### US-4.3: Multi-step Approval Stepper
**Title:** Implement Approval Workflow Stepper
**Description:**
As a user, I want to see the approval progress so that I know where my request stands.

**Acceptance Criteria:**
- [x] Horizontal stepper component
- [x] Steps: Draft → Submitted → Under Review → Approved
- [x] Current step highlighted
- [x] Completed steps with checkmarks
- [x] Step details on expansion
- [x] Action buttons for current step
**Estimate:** 3 points
**Labels:** approvals, workflow
**Design Reference:** `design-assets/approval/26-approval-stepper.png`

#### US-4.4: Document Review Interface
**Title:** Build Document Review Split View
**Description:**
As a reviewer, I want to view documents and add comments so that I can make informed approval decisions.

**Acceptance Criteria:**
- [x] Split view layout
- [x] Left panel: document/PDF preview with zoom
- [x] Right panel: comments thread
- [x] Comment with user avatars and timestamps
- [x] Reply to comments
- [x] Action bar: Approve, Reject, Request Changes
**Estimate:** 3 points
**Labels:** approvals, documents
**Design Reference:** `design-assets/approval/27-document-review.png`

#### US-4.5: Approval Audit Trail
**Title:** Create Approval History Audit Trail
**Description:**
As an admin, I want to see the complete approval history so that I can audit decisions and ensure compliance.

**Acceptance Criteria:**
- [x] Vertical timeline of actions
- [x] Entry: user avatar, action, timestamp, status
- [x] Action types: Submitted, Approved, Rejected, Commented
- [x] Filter by date range and action type
- [x] Export audit log button
**Estimate:** 2 points
**Labels:** approvals, audit
**Design Reference:** `design-assets/approval/28-audit-trail.png`

---

## EPIC 5: Project Management Pages
**Description:** Build project detail pages including overview, equipment, materials, timeline, and team views.
**Priority:** P1 - High
**Estimate:** 18 points

### User Stories:

#### US-5.1: Project Overview Page
**Title:** Create Project Overview Detail Page
**Description:**
As a user, I want to see a project overview so that I can quickly understand project status.

**Acceptance Criteria:**
- [x] Hero section with project photo
- [x] Progress ring showing percentage complete
- [x] Project name, address, dates
- [x] Status timeline with milestones
- [x] Tabbed navigation: Overview, Equipment, Inspections, Team
- [x] Key metrics cards: Budget, Timeline, Team Size
**Estimate:** 3 points
**Labels:** project, overview
**Design Reference:** `design-assets/project/15-project-overview.png`

#### US-5.2: Equipment Tracking List
**Title:** Build Equipment Tracking Data Table
**Description:**
As a user, I want to view and manage equipment so that I can track assets across projects.

**Acceptance Criteria:**
- [x] Data table with sortable columns
- [x] Columns: name, model, serial, location, status
- [x] Status badges: Approved, Pending, Rejected
- [x] Search and filter dropdowns
- [x] Add Equipment button
- [x] Row actions: View, Edit, Delete
- [x] Pagination
**Estimate:** 3 points
**Labels:** project, equipment
**Design Reference:** `design-assets/project/16-equipment-list.png`

#### US-5.3: Material Inventory Grid
**Title:** Create Material Inventory Card Grid
**Description:**
As a user, I want to view materials in a visual grid so that I can quickly assess inventory status.

**Acceptance Criteria:**
- [x] Card grid layout
- [x] Material photo, name, quantity
- [x] Progress bar for quantity level
- [x] Storage location indicator
- [x] Low stock alert badge (orange)
- [x] Filter chips: All, Concrete, Steel, Lumber, etc.
- [x] Add Material button
**Estimate:** 3 points
**Labels:** project, materials
**Design Reference:** `design-assets/project/17-material-inventory.png`

#### US-5.4: Gantt Timeline View
**Title:** Implement Interactive Gantt Chart
**Description:**
As a project manager, I want to see a Gantt chart so that I can visualize project timeline and dependencies.

**Acceptance Criteria:**
- [x] Horizontal timeline with task bars
- [x] Task groups (collapsible)
- [x] Dependencies shown with arrows
- [x] Milestone markers (diamonds)
- [x] Today line indicator
- [x] Zoom controls (day/week/month)
- [x] Task list sidebar
**Estimate:** 5 points
**Labels:** project, timeline, gantt
**Design Reference:** `design-assets/project/18-gantt-timeline.png`

#### US-5.5: Team Members Grid
**Title:** Build Team Members Directory Grid
**Description:**
As a user, I want to see all team members so that I can contact and assign tasks to them.

**Acceptance Criteria:**
- [x] Card grid of team members
- [x] Avatar, name, role, contact info
- [x] Role color coding
- [x] Project assignment tags
- [x] Search by name
- [x] Filter by role
- [x] Invite Team Member button
**Estimate:** 2 points
**Labels:** project, team
**Design Reference:** `design-assets/project/19-team-members.png`

#### US-5.6: Document Library
**Title:** Create Document Library File Browser
**Description:**
As a user, I want to manage project documents so that I can store and find files easily.

**Acceptance Criteria:**
- [x] Split view: folder tree + file list + preview
- [x] Folder structure: Contracts, Blueprints, Permits, Reports
- [x] File list with name, type, size, date, uploader
- [x] Preview panel for selected file
- [x] Drag and drop upload area
- [x] Search and filter by type
**Estimate:** 2 points
**Labels:** project, documents
**Design Reference:** `design-assets/project/20-document-library.png`

---

## EPIC 6: Inspection System UI
**Description:** Implement inspection checklists, findings, reports, and consultant management interfaces.
**Priority:** P0 - Critical
**Estimate:** 15 points

### User Stories:

#### US-6.1: Mobile Inspection Checklist
**Title:** Build Mobile Inspection Checklist Interface
**Description:**
As an inspector, I want to complete checklists on my mobile device so that I can work efficiently on-site.

**Acceptance Criteria:**
- [x] Mobile-optimized layout
- [x] Collapsible sections: Structural, Electrical, Plumbing
- [x] Checklist items with toggle switches
- [x] Photo capture button with camera integration
- [x] Notes text area per item
- [x] Digital signature capture at bottom
- [x] Progress bar showing completion
- [x] Offline capability indicators
**Estimate:** 5 points
**Labels:** inspection, mobile, checklist
**Design Reference:** `design-assets/inspection/21-checklist-mobile.png`

#### US-6.2: Finding Documentation Card
**Title:** Create Finding Documentation Component
**Description:**
As an inspector, I want to document findings with details so that issues are properly tracked.

**Acceptance Criteria:**
- [x] Finding card component
- [x] Severity badge: Critical (red), High (orange), Medium (yellow), Low (gray)
- [x] Photo gallery with add photo
- [x] Location pin with floor/area
- [x] Description text area
- [x] Inspector info and timestamp
- [x] Actions: Assign, Resolve, Add Photo
**Estimate:** 3 points
**Labels:** inspection, findings
**Design Reference:** `design-assets/inspection/22-finding-card.png`

#### US-6.3: Inspection Report Preview
**Title:** Build Inspection Report Preview/Export
**Description:**
As a user, I want to preview and export inspection reports so that I can share them with stakeholders.

**Acceptance Criteria:**
- [x] PDF-style report layout
- [x] Company logo header
- [x] Inspection summary section
- [x] Findings table with severity counts
- [x] Photo grid section
- [x] Digital signature display
- [x] Export to PDF button
- [x] Print functionality
**Estimate:** 3 points
**Labels:** inspection, reports
**Design Reference:** `design-assets/inspection/23-report-preview.png`

#### US-6.4: Consultant Assignment Interface
**Title:** Create Consultant Selection and Scheduling UI
**Description:**
As a manager, I want to assign consultants to inspections so that the right experts are scheduled.

**Acceptance Criteria:**
- [x] Consultant list with avatar, name, specialty
- [x] Filter by specialty dropdown
- [x] Availability status indicators
- [x] Weekly calendar view for scheduling
- [x] Time slot selection
- [x] Assign button
**Estimate:** 2 points
**Labels:** inspection, scheduling
**Design Reference:** `design-assets/inspection/24-consultant-assignment.png`

#### US-6.5: Inspection History Timeline
**Title:** Build Inspection History Timeline View
**Description:**
As a user, I want to see inspection history so that I can track all inspections for a project.

**Acceptance Criteria:**
- [x] Vertical timeline component
- [x] Date markers
- [x] Inspection nodes with status dots (green/red/yellow)
- [x] Inspector avatar and name
- [x] Inspection type label
- [x] Click to view details
- [x] Filter by date range
**Estimate:** 2 points
**Labels:** inspection, history
**Design Reference:** `design-assets/inspection/25-history-timeline.png`

---

## EPIC 7: RTL & Internationalization
**Description:** Implement Hebrew RTL support and bilingual infrastructure.
**Priority:** P1 - High
**Estimate:** 8 points

### User Stories:

#### US-7.1: RTL Layout Infrastructure
**Title:** Implement RTL Layout Support
**Description:**
As a Hebrew-speaking user, I want the interface to display correctly in RTL so that I can use the app naturally.

**Acceptance Criteria:**
- [x] HTML dir="rtl" attribute switching
- [x] CSS logical properties (margin-inline-start, etc.)
- [x] Sidebar on right side for RTL
- [x] Navigation mirrored appropriately
- [x] Icons that indicate direction should flip
- [x] Numbers and phone numbers remain LTR
**Estimate:** 3 points
**Labels:** i18n, rtl
**Design Reference:** `design-assets/mobile/29-hebrew-rtl.png`

#### US-7.2: Hebrew Translation Integration
**Title:** Add Hebrew Language Support
**Description:**
As a Hebrew user, I want all UI text in Hebrew so that I can use the app in my native language.

**Acceptance Criteria:**
- [x] i18n framework setup (react-intl or i18next)
- [x] Hebrew translation file with all UI strings
- [x] Language switcher in settings
- [x] Proper Hebrew font rendering (Noto Sans Hebrew)
- [x] Date/time formatting for Hebrew locale
**Estimate:** 3 points
**Labels:** i18n, translation

#### US-7.3: Language Toggle Component
**Title:** Create Language Toggle UI
**Description:**
As a user, I want to switch between English and Hebrew so that I can use my preferred language.

**Acceptance Criteria:**
- [x] Language toggle in header/settings
- [x] Flag or text indicator (EN/עב)
- [x] Persist preference in user settings
- [x] Seamless switch without page reload
**Estimate:** 2 points
**Labels:** i18n, component

---

## EPIC 8: Mobile & Offline Experience
**Description:** Ensure mobile responsiveness and offline capability for field workers.
**Priority:** P1 - High
**Estimate:** 10 points

### User Stories:

#### US-8.1: Mobile Responsive Framework
**Title:** Implement Mobile-First Responsive Design
**Description:**
As a mobile user, I want the app to work well on my phone so that I can use it on construction sites.

**Acceptance Criteria:**
- [x] Breakpoints: 375px, 640px, 768px, 1024px, 1280px
- [x] Touch targets minimum 44x44px
- [x] Mobile navigation (hamburger menu or bottom nav)
- [x] Responsive tables (card view on mobile)
- [x] No horizontal scroll issues
**Estimate:** 3 points
**Labels:** mobile, responsive

#### US-8.2: Offline Mode UI
**Title:** Build Offline Mode Interface
**Description:**
As a field worker, I want visual feedback when offline so that I know my data is being saved locally.

**Acceptance Criteria:**
- [x] Offline banner/indicator
- [x] Sync status icon in header
- [x] Queued items counter
- [x] Last synced timestamp
- [x] Sync Now button (disabled when offline)
- [x] Visual distinction for locally-saved items
**Estimate:** 3 points
**Labels:** mobile, offline
**Design Reference:** `design-assets/mobile/30-offline-mode.png`

#### US-8.3: Progressive Web App Setup
**Title:** Configure PWA for Installation
**Description:**
As a user, I want to install the app on my device so that I can access it like a native app.

**Acceptance Criteria:**
- [x] Web app manifest configured
- [x] Service worker for caching
- [x] Offline page fallback
- [x] Install prompt handling
- [x] App icons for all sizes
**Estimate:** 2 points
**Labels:** mobile, pwa

#### US-8.4: Touch Optimizations
**Title:** Optimize Touch Interactions
**Description:**
As a mobile user, I want smooth touch interactions so that the app feels responsive.

**Acceptance Criteria:**
- [x] touch-action: manipulation for tap delay
- [x] Swipe gestures where appropriate
- [x] Pull-to-refresh on list views
- [x] 8px minimum gap between touch targets
- [x] Haptic feedback on key actions (if supported)
**Estimate:** 2 points
**Labels:** mobile, touch

---

## EPIC 9: Component Library
**Description:** Build reusable UI components based on the design system.
**Priority:** P0 - Critical
**Estimate:** 13 points

### User Stories:

#### US-9.1: Button Components
**Title:** Create Button Component Variants
**Description:**
As a developer, I need button components so that CTAs are consistent across the app.

**Acceptance Criteria:**
- [x] Primary button (filled blue)
- [x] Secondary button (outlined)
- [x] Tertiary button (text only)
- [x] Danger button (red)
- [x] Loading state with spinner
- [x] Disabled state
- [x] Icon button variant
- [x] Size variants (sm, md, lg)
**Estimate:** 2 points
**Labels:** components, buttons

#### US-9.2: Card Components
**Title:** Build Card Component System
**Description:**
As a developer, I need card components so that content containers are consistent.

**Acceptance Criteria:**
- [x] Base card with variants
- [x] Glassmorphism card option
- [x] KPI card (metric, label, trend)
- [x] Feature card (icon, title, description)
- [x] Project card (image, title, progress, status)
- [x] Hover states with lift effect
**Estimate:** 3 points
**Labels:** components, cards

#### US-9.3: Form Components
**Title:** Create Form Input Components
**Description:**
As a developer, I need form components so that data entry is consistent and accessible.

**Acceptance Criteria:**
- [x] Text input with label
- [x] Textarea
- [x] Select/dropdown
- [x] Checkbox and radio
- [x] Date picker
- [x] File upload
- [x] Error states and validation messages
- [x] Focus states for accessibility
**Estimate:** 3 points
**Labels:** components, forms

#### US-9.4: Data Display Components
**Title:** Build Data Display Components
**Description:**
As a developer, I need data components so that information is displayed consistently.

**Acceptance Criteria:**
- [x] Data table with sorting and pagination
- [x] Badge/chip component
- [x] Status indicator
- [x] Progress bar and ring
- [x] Avatar component
- [x] Empty state component
**Estimate:** 3 points
**Labels:** components, data

#### US-9.5: Navigation Components
**Title:** Create Navigation Components
**Description:**
As a developer, I need navigation components so that app navigation is consistent.

**Acceptance Criteria:**
- [x] Top navbar with glassmorphism option
- [x] Sidebar navigation (collapsible)
- [x] Bottom navigation (mobile)
- [x] Breadcrumbs
- [x] Tabs component
- [x] Stepper/wizard component
**Estimate:** 2 points
**Labels:** components, navigation

---

## EPIC 10: Animations & Micro-interactions
**Description:** Add polish with animations and micro-interactions following the design system guidelines.
**Priority:** P2 - Medium
**Estimate:** 5 points

### User Stories:

#### US-10.1: Transition System
**Title:** Implement Transition System
**Description:**
As a user, I want smooth transitions so that the app feels polished and professional.

**Acceptance Criteria:**
- [x] Define transition tokens (fast: 150ms, normal: 200ms, slow: 300ms)
- [x] Page transitions (fade, slide)
- [x] Modal open/close animations
- [x] Accordion expand/collapse
- [x] Respect prefers-reduced-motion
**Estimate:** 2 points
**Labels:** animation, transitions

#### US-10.2: Micro-interactions
**Title:** Add Micro-interactions to Components
**Description:**
As a user, I want feedback on my interactions so that the app feels responsive.

**Acceptance Criteria:**
- [x] Button hover/active states
- [x] Card hover lift effect
- [x] Loading states (skeletons, spinners)
- [x] Success/error feedback
- [x] Number count-up animations
- [x] Chart animations on load
**Estimate:** 3 points
**Labels:** animation, micro-interactions

---

## EPIC 11: RFI System - Email-Integrated Request for Information
**Description:** Implement a complete RFI (Request for Information) system with email integration via Gmail API and Google Cloud Pub/Sub. The system allows creating, sending, tracking, and responding to RFIs through an official email address integrated with the CRM.
**Priority:** P0 - Critical
**Estimate:** 46 points
**Linear Epic:** BUI-93

### Architecture Overview
```
OUTBOUND: CRM → FastAPI → Gmail API → Recipient
INBOUND:  Reply → Gmail → Pub/Sub → Webhook → FastAPI → Database → Notifications
```

### GCP Services Required
- Google Workspace email (rfi@yourdomain.com)
- Gmail API (send/receive emails)
- Cloud Pub/Sub (real-time notifications)
- Service Account with domain-wide delegation

### User Stories:

#### US-11.1: Database Models (BUI-94)
**Title:** Create RFI Database Models and Migration
**Description:**
As a developer, I need database models for RFIs so that I can store and track all RFI data.

**Acceptance Criteria:**
- [x] Create `RFI` model with: id, project_id, rfi_number, email_thread_id, email_message_id, subject, question, category, priority, to_email, to_name, cc_emails, status, due_date, attachments
- [x] Create `RFIResponse` model with: id, rfi_id, email_message_id, response_text, from_email, from_name, is_internal, source
- [x] Create `RFIEmailLog` model for audit trail
- [x] Create Alembic migration
**Estimate:** 3 points
**Labels:** backend, database, rfi

#### US-11.2: Pydantic Schemas (BUI-95)
**Title:** Create RFI Pydantic Schemas
**Description:**
As a developer, I need Pydantic schemas for RFI validation.

**Acceptance Criteria:**
- [x] Create RFIBase, RFICreate, RFIUpdate schemas
- [x] Create RFIResponse schema with nested responses
- [x] Add validation for email addresses and RFI number format
**Estimate:** 2 points
**Labels:** backend, schemas, rfi

#### US-11.3: Gmail API Service (BUI-96)
**Title:** Implement Gmail API Service
**Description:**
As a developer, I need a Gmail API service to send and receive RFI emails.

**Acceptance Criteria:**
- [x] Create GmailService class with service account auth
- [x] Implement send_rfi_email() with threading headers
- [x] Implement get_message(), get_thread(), setup_watch()
- [x] Add X-RFI-Number custom header
**Estimate:** 5 points
**Labels:** backend, email, gmail-api, rfi

#### US-11.4: Email Parser Service (BUI-97)
**Title:** Implement RFI Email Parser Service
**Description:**
As a developer, I need an email parser to process incoming emails.

**Acceptance Criteria:**
- [x] Create RFIEmailParser class
- [x] Parse headers, body, attachments from Gmail messages
- [x] Extract RFI number from subject or X-RFI-Number header
- [x] Distinguish new emails vs replies
**Estimate:** 3 points
**Labels:** backend, parser, email, rfi

#### US-11.5: RFI Business Logic Service (BUI-98)
**Title:** Create RFI Service with Email Integration
**Description:**
As a developer, I need an RFI service for business logic.

**Acceptance Criteria:**
- [x] Implement generate_rfi_number() - format: RFI-YYYY-NNNNN
- [x] Implement create_and_send_rfi()
- [x] Implement process_incoming_email()
- [x] Handle status transitions
**Estimate:** 5 points
**Labels:** backend, service, rfi

#### US-11.6: Gmail Webhook Endpoint (BUI-99)
**Title:** Create Gmail Pub/Sub Webhook Endpoint
**Description:**
As a developer, I need a webhook to receive Gmail notifications.

**Acceptance Criteria:**
- [x] Create POST /api/v1/webhooks/gmail/push endpoint
- [x] Parse Pub/Sub message format
- [x] Process emails in background task
- [x] Return 200 OK quickly for Pub/Sub
**Estimate:** 3 points
**Labels:** backend, webhook, pubsub, rfi

#### US-11.7: RFI CRUD API (BUI-100)
**Title:** Create RFI CRUD API Endpoints
**Description:**
As a developer, I need REST API endpoints for RFI management.

**Acceptance Criteria:**
- [x] GET/POST /projects/{project_id}/rfis
- [x] GET/PATCH /rfis/{rfi_id}
- [x] POST /rfis/{rfi_id}/send
- [x] POST /rfis/{rfi_id}/responses
- [x] GET /rfis/{rfi_id}/email-log
**Estimate:** 3 points
**Labels:** backend, api, rfi

#### US-11.8: Notification Service (BUI-101)
**Title:** Implement RFI Notification Service
**Description:**
As a user, I want notifications when RFI responses arrive.

**Acceptance Criteria:**
- [x] Implement notify_rfi_response()
- [x] Implement notify_rfi_due_soon()
- [x] Implement notify_rfi_overdue()
**Estimate:** 3 points
**Labels:** backend, notifications, rfi

#### US-11.9: GCP Infrastructure (BUI-102)
**Title:** Set Up GCP Email Infrastructure
**Description:**
As a DevOps engineer, I need to configure GCP services.

**Acceptance Criteria:**
- [x] Create GCP project, enable APIs
- [x] Create service account with domain-wide delegation
- [x] Create Pub/Sub topic and subscription
- [x] Document configuration steps
**Estimate:** 3 points
**Labels:** devops, gcp, infrastructure, rfi

#### US-11.10: Frontend RFI List (BUI-103)
**Title:** Create Frontend RFI List Page
**Description:**
As a user, I want to view all RFIs for a project.

**Acceptance Criteria:**
- [x] Create /projects/{projectId}/rfis route
- [x] Data table with RFI Number, Subject, To, Status, Priority, Due Date
- [x] Status badges, filters, search, pagination
- [x] "New RFI" button
**Estimate:** 3 points
**Labels:** frontend, page, rfi

#### US-11.11: Frontend RFI Detail (BUI-104)
**Title:** Create RFI Detail Page with Thread View
**Description:**
As a user, I want to view RFI details and conversation thread.

**Acceptance Criteria:**
- [x] Header with RFI info and action buttons
- [x] Original question section with attachments
- [x] Chronological conversation thread
- [x] Reply input with rich text editor
**Estimate:** 5 points
**Labels:** frontend, page, rfi

#### US-11.12: RFI Form Dialog (BUI-105)
**Title:** Create RFI Form Dialog Component
**Description:**
As a user, I want to create new RFIs through a form.

**Acceptance Criteria:**
- [x] Form fields: to_email, subject, category, priority, due_date, question, attachments
- [x] Form validation
- [x] Save as Draft and Send Now buttons
**Estimate:** 3 points
**Labels:** frontend, component, rfi

#### US-11.13: Frontend API Client (BUI-106)
**Title:** Create Frontend RFI API Client
**Description:**
As a developer, I need a frontend API client for RFI operations.

**Acceptance Criteria:**
- [x] Create frontend/src/api/rfi.ts
- [x] Implement all CRUD functions with TypeScript types
**Estimate:** 2 points
**Labels:** frontend, api, rfi

#### US-11.14: Dashboard Widget (BUI-107)
**Title:** Add RFI Dashboard Widget
**Description:**
As a user, I want to see RFI statistics on my dashboard.

**Acceptance Criteria:**
- [x] Display counts: Open, Overdue, Answered Today, Closed This Month
- [x] Click to navigate to filtered RFI list
**Estimate:** 2 points
**Labels:** frontend, dashboard, rfi

#### US-11.15: Navigation Integration (BUI-108)
**Title:** Add RFI to Project Navigation
**Description:**
As a user, I want to access RFIs from project navigation.

**Acceptance Criteria:**
- [x] Add "RFIs" tab to project detail page
- [x] Show pending count badge
- [x] Update router
**Estimate:** 1 point
**Labels:** frontend, navigation, rfi

#### US-11.16: Integration Tests (BUI-109)
**Title:** Write RFI System Integration Tests
**Description:**
As a developer, I need integration tests for the RFI system.

**Acceptance Criteria:**
- [x] Test CRUD, email sending, webhook processing
- [x] Test email parsing and RFI matching logic
- [x] Test status transitions and notifications
**Estimate:** 3 points
**Labels:** backend, testing, rfi

---

## EPIC 12: AI Chat with Project Data
**Description:** AI-powered chat interface that allows users to query their project data using natural language. Uses Pydantic AI with Gemini function calling to execute safe, parameterized queries against structured project data.
**Priority:** P1 - High
**Estimate:** 18 points
**Status:** Complete (except WhatsApp Phase 2)

### User Stories:

#### US-12.1: Backend Chat Models & Database Schema
**Title:** Create Chat Database Models and Migration
**Description:**
As a developer, I need database tables for chat conversations and messages so that chat history is persisted per project/user.

**Acceptance Criteria:**
- [x] ChatConversation model with project_id, user_id, title, timestamps
- [x] ChatMessage model with conversation_id, role, content, tool_calls JSONB, tool_results JSONB
- [x] Alembic migration 010 creates both tables with proper indexes and foreign keys
**Estimate:** 3 points
**Labels:** backend, database, ai-chat

#### US-12.2: Chat Query Tools (13 tools)
**Title:** Implement Chat Query Functions
**Description:**
As a developer, I need 13 async query tools that retrieve project data securely for the AI agent.

**Acceptance Criteria:**
- [x] 13 tools: project summary, equipment, materials, RFIs, inspections, meetings, approvals, areas, contacts, documents
- [x] All tools execute parameterized SQL queries (no raw SQL)
- [x] project_id always injected server-side, never from LLM
- [x] Results limited to max 50 items to prevent token overflow
**Estimate:** 3 points
**Labels:** backend, ai-chat, tools

#### US-12.3: Pydantic AI Chat Service (Gemini Orchestrator)
**Title:** Implement AI Agent with Gemini Function Calling
**Description:**
As a developer, I need a Pydantic AI agent that orchestrates tool calls and generates natural language responses.

**Acceptance Criteria:**
- [x] Agent uses google-gla provider with Gemini 2.0 Flash
- [x] 13 tools registered with descriptive docstrings for LLM
- [x] Conversation history serialization/deserialization with ModelMessagesTypeAdapter
- [x] System prompt instructs multi-language responses and tool-first behavior
**Estimate:** 5 points
**Labels:** backend, ai-chat, pydantic-ai

#### US-12.4: Chat API Endpoints
**Title:** Create Chat REST API Endpoints
**Description:**
As a developer, I need API endpoints for sending messages and managing conversations.

**Acceptance Criteria:**
- [x] POST /projects/{project_id}/chat sends message and returns user+assistant messages
- [x] GET /projects/{project_id}/chat/conversations lists conversations
- [x] GET /projects/{project_id}/chat/conversations/{id} returns full history
- [x] DELETE /projects/{project_id}/chat/conversations/{id} deletes conversation
**Estimate:** 2 points
**Labels:** backend, api, ai-chat

#### US-12.5: Frontend Chat UI Components
**Title:** Build Chat Drawer with FAB Trigger
**Description:**
As a user, I want a chat interface to ask questions about my project data in natural language.

**Acceptance Criteria:**
- [x] FAB button (bottom-right) visible when a project is selected
- [x] Right-side drawer (420px) with chat interface
- [x] User/assistant message bubbles with AI icon
- [x] Quick suggestion chips for common queries
- [x] Conversation history list with load/delete
- [x] i18n translations for EN, HE, ES
**Estimate:** 3 points
**Labels:** frontend, ai-chat, ui

#### US-12.6: Propose-Confirm Action System
**Title:** Implement AI Propose-Confirm for Write Operations
**Description:**
As a user, I want the AI to propose actions (status changes, approvals) that I can approve or reject before execution.

**Acceptance Criteria:**
- [x] ChatAction model in chat_actions table with FK to conversations & messages
- [x] 11 propose_* tools create ChatAction records (status=proposed)
- [x] Executor with 10 handlers (update statuses, create entities, approve submissions)
- [x] API: POST .../chat/actions/{id}/execute and .../reject
- [x] Frontend: ChatActionCard with Approve/Reject buttons
**Estimate:** 5 points
**Labels:** backend, frontend, ai-chat

#### US-12.7: WhatsApp Integration (Phase 2 - Future)
**Title:** Add WhatsApp Channel for AI Chat
**Description:**
As a field user, I want to chat with project data via WhatsApp.

**Acceptance Criteria:**
- [ ] WhatsApp webhook endpoint receives messages
- [ ] User identified by phone number mapping
- [ ] Reuses same chat_service orchestrator
**Estimate:** 5 points
**Labels:** backend, ai-chat, whatsapp, future
**Status:** Planned

---

## EPIC 13: Daily Work Summary Email
**Description:** Automated daily email summarizing all activity/progress across projects. Cloud Scheduler triggers at 6 PM Israel time (Sun-Thu). Skips projects with no activity.
**Priority:** P2 - Medium
**Estimate:** 10 points
**Status:** Complete

### User Stories:

#### US-13.1: Database Migration
**Title:** Add daily_summary_enabled Column
**Description:**
As an admin, I need a per-project toggle for daily summary emails.

**Acceptance Criteria:**
- [x] Migration 020 adds daily_summary_enabled Boolean to projects (default=true)
- [x] Project model updated with new field
- [x] ProjectResponse and ProjectUpdate schemas updated
**Estimate:** 1 point
**Labels:** backend, database, daily-summary

#### US-13.2: Daily Summary Data Collection Service
**Title:** Collect Project Activity for Summary Email
**Description:**
As the system, I need to query all relevant project activity for a given date.

**Acceptance Criteria:**
- [x] Audit log entries grouped by (entity_type, action)
- [x] Equipment/Materials: created/approved/rejected counts for the day
- [x] Inspections: completed count and new findings count
- [x] RFIs: opened/answered/closed today + overdue count
- [x] Pending approvals: equipment + material submission counts
- [x] Upcoming meetings: next 7 days
- [x] Overall progress: avg ConstructionArea.current_progress
- [x] has_activity flag to skip empty days
**Estimate:** 3 points
**Labels:** backend, service, daily-summary

#### US-13.3: HTML Email Renderer with i18n
**Title:** Render Localized Daily Summary Email
**Description:**
As a project admin, I want a professional HTML email summarizing daily activity in my preferred language.

**Acceptance Criteria:**
- [x] Inline CSS for email client compatibility (600px max-width)
- [x] RTL support for Hebrew (dir="rtl")
- [x] Localized strings for en and he
- [x] Sections: Activity Overview, Equipment & Materials, Inspections, RFIs, Pending Approvals, Upcoming Meetings, Progress bar
- [x] Empty sections hidden
- [x] "View in BuilderOps" CTA link
**Estimate:** 3 points
**Labels:** backend, email, daily-summary, i18n

#### US-13.4: Trigger API Endpoint
**Title:** Create POST /tasks/daily-summary Endpoint
**Description:**
As Cloud Scheduler, I need an HTTP endpoint to trigger the daily summary job.

**Acceptance Criteria:**
- [x] POST /api/v1/tasks/daily-summary secured by X-Scheduler-Secret header
- [x] 403 for invalid secret
- [x] Optional ?summary_date query param
- [x] Iterates active projects with daily_summary_enabled=True
- [x] Skips projects with no activity
- [x] Sends email per project_admin in their user.language
- [x] Returns JSON results array
**Estimate:** 2 points
**Labels:** backend, api, daily-summary

#### US-13.5: Config & CD Pipeline
**Title:** Add Scheduler Secret and Deploy Configuration
**Description:**
As a DevOps engineer, I need the scheduler secret configured in settings and CD pipeline.

**Acceptance Criteria:**
- [x] scheduler_secret in Settings with dev default
- [x] SCHEDULER_SECRET env var added to cd.yml
- [x] Router registers daily_summary at /tasks prefix
**Estimate:** 1 point
**Labels:** backend, devops, daily-summary

#### US-13.6: Cloud Scheduler Setup (Manual)
**Title:** Configure GCP Cloud Scheduler Job
**Description:**
As a DevOps engineer, I need to create the Cloud Scheduler job to trigger daily summaries.

**Acceptance Criteria:**
- [x] Cloud Scheduler job in europe-west1 region
- [x] Schedule: 0 18 * * 0-4 (6 PM Sun-Thu Israeli work week)
- [x] Timezone: Asia/Jerusalem
- [x] HTTP POST with X-Scheduler-Secret header
- [x] Attempt deadline: 300s
**Estimate:** 1 point
**Labels:** devops, gcp, daily-summary
**Status:** Done

---

## EPIC 14: Autodesk Revit/BIM Integration
**Description:** Import BIM model data from Autodesk Revit files (.rvt) into BuilderOps. Users upload Revit files, view 3D models in-browser, and extract structured data (rooms→areas, assets→equipment, types→materials). Includes two-way RFI sync with Autodesk Construction Cloud (ACC). Uses Autodesk Platform Services (APS) APIs: Model Derivative, AEC Data Model (GraphQL), Viewer SDK v7, and ACC RFI v3.
**Priority:** P1 - High
**Estimate:** 44 points
**Status:** Planned

### Architecture Overview
```
Upload: .rvt file → GCS bucket → APS Model Derivative → SVF2 translation
View:   SVF2 → Forge Viewer SDK (React) → interactive 3D in browser
Extract: Model Derivative metadata → rooms/assets/materials → import wizard → DB
RFI Sync: BuilderOps RFI ↔ ACC RFI v3 API (bidirectional)
Auth:   2-legged OAuth (server) + 3-legged OAuth (user ACC access)
```

### External Dependencies
- Autodesk Platform Services (APS) app registration
- APS Client ID + Client Secret
- ACC project access (for RFI sync)
- Python: `aps-toolkit` or direct REST calls
- Frontend: `@autodesk/viewer` SDK v7

### User Stories:

#### US-14.1: APS Authentication & Service Foundation
**Title:** Implement Autodesk Platform Services OAuth and Base Service
**Description:**
As a developer, I need an APS authentication service so that the backend can communicate with Autodesk APIs securely.

**Acceptance Criteria:**
- [ ] Create `backend/app/services/autodesk_service.py` with 2-legged OAuth token management
- [ ] Implement token caching with expiry (tokens last 1 hour)
- [ ] Add APS config to Settings: `aps_client_id`, `aps_client_secret`
- [ ] Create 3-legged OAuth flow for user ACC access (authorize URL, callback, token exchange)
- [ ] Store user APS tokens in `autodesk_connections` table (user_id, access_token, refresh_token, expires_at)
- [ ] Alembic migration for `autodesk_connections` table
**Estimate:** 5 points
**Labels:** backend, autodesk, auth

#### US-14.2: Revit File Upload & Storage
**Title:** Upload Revit Files to Cloud Storage and Register with APS
**Description:**
As a user, I want to upload .rvt files so that they can be translated and viewed in 3D.

**Acceptance Criteria:**
- [ ] POST /projects/{project_id}/bim/upload accepts .rvt files (max 500MB)
- [ ] Upload file to GCS bucket (`builderops-bim-models/{project_id}/`)
- [ ] Create `bim_models` DB table: id, project_id, filename, file_size, gcs_path, urn, translation_status, uploaded_by, created_at
- [ ] Register file with APS using Data Management API (get URN)
- [ ] Return BIM model record with status "uploaded"
- [ ] Alembic migration for `bim_models` table
**Estimate:** 5 points
**Labels:** backend, autodesk, upload

#### US-14.3: Model Translation (Model Derivative API)
**Title:** Translate Revit Models to Viewable Format
**Description:**
As a developer, I need to translate uploaded .rvt files to SVF2 format so the 3D viewer can display them.

**Acceptance Criteria:**
- [ ] POST /projects/{project_id}/bim/{model_id}/translate triggers Model Derivative API
- [ ] Set `generateMasterViews: true` to include rooms/spaces in output
- [ ] Poll translation status and update `bim_models.translation_status` (pending→processing→complete→failed)
- [ ] GET /projects/{project_id}/bim/{model_id}/status returns current status with progress percentage
- [ ] Extract and store model metadata (categories, element counts) in `bim_models.metadata` JSONB column
- [ ] Handle translation errors with user-friendly messages
**Estimate:** 5 points
**Labels:** backend, autodesk, model-derivative

#### US-14.4: 3D Viewer Embedding
**Title:** Embed Autodesk Forge Viewer in React Frontend
**Description:**
As a user, I want to view my Revit model in 3D in the browser so that I can explore the building design interactively.

**Acceptance Criteria:**
- [ ] Create `frontend/src/components/bim/ForgeViewer.tsx` component
- [ ] Load Autodesk Viewer SDK v7 dynamically
- [ ] Initialize viewer with SVF2 URN from backend
- [ ] Toolbar: orbit, pan, zoom, section plane, isolate, explode
- [ ] Click element → show properties panel (name, category, parameters)
- [ ] Selection events emit selected element data to parent component
- [ ] Responsive layout (full-width in BIM page, resizable split view)
- [ ] Loading skeleton while model loads
**Estimate:** 5 points
**Labels:** frontend, autodesk, viewer, bim

#### US-14.5: BIM Page & Model Management UI
**Title:** Create BIM Models Page with Upload and Viewer
**Description:**
As a user, I want a dedicated BIM page in my project to upload, manage, and view Revit models.

**Acceptance Criteria:**
- [ ] Create /projects/{projectId}/bim route
- [ ] Model list: cards with filename, upload date, status badge, file size
- [ ] Upload button with drag-and-drop zone (.rvt only)
- [ ] Click model → opens viewer in split/full-screen view
- [ ] Translation progress indicator (spinner + percentage)
- [ ] Delete model action with confirmation
- [ ] Add "BIM" tab to project sidebar navigation
- [ ] i18n translations for EN, HE, ES
**Estimate:** 3 points
**Labels:** frontend, page, bim

#### US-14.6: BIM Data Extraction - Rooms to Areas
**Title:** Extract Rooms/Spaces from Revit Model and Map to Construction Areas
**Description:**
As a user, I want to extract rooms from my Revit model and import them as construction areas so I don't have to enter area data manually.

**Acceptance Criteria:**
- [ ] GET /projects/{project_id}/bim/{model_id}/extract/rooms queries Model Derivative metadata
- [ ] Filter elements by Revit category "Rooms" or "Spaces"
- [ ] Extract: room name→area_name, room number→area_code, level→floor_number, area→square meters
- [ ] Return preview list of extracted rooms with mapped BuilderOps fields
- [ ] POST /projects/{project_id}/bim/{model_id}/import/areas accepts confirmed room selections
- [ ] Bulk-create ConstructionArea records, skip duplicates by area_code
- [ ] Track import history: source_model_id on created areas
**Estimate:** 5 points
**Labels:** backend, autodesk, extraction, areas

#### US-14.7: BIM Data Extraction - Assets to Equipment
**Title:** Extract Mechanical/Electrical Assets from Revit and Map to Equipment
**Description:**
As a user, I want to extract equipment assets from my Revit model (HVAC, electrical panels, plumbing fixtures) so they appear in my equipment tracking page.

**Acceptance Criteria:**
- [ ] GET /projects/{project_id}/bim/{model_id}/extract/equipment queries Model Derivative metadata
- [ ] Filter by Revit categories: Mechanical Equipment, Electrical Equipment, Plumbing Fixtures, Fire Protection
- [ ] Extract: family name→equipment_type, type name→model_number, instance params→specifications
- [ ] Match against existing equipment templates by name similarity (fuzzy match)
- [ ] Return preview with auto-mapped fields and confidence scores
- [ ] POST /projects/{project_id}/bim/{model_id}/import/equipment creates Equipment records
- [ ] Link to matched equipment template when confidence > 80%
**Estimate:** 5 points
**Labels:** backend, autodesk, extraction, equipment

#### US-14.8: BIM Data Extraction - Types to Materials
**Title:** Extract Material Types from Revit Model and Map to Materials
**Description:**
As a user, I want to extract material information from my Revit model (concrete types, steel grades, finishes) so they appear in my materials inventory.

**Acceptance Criteria:**
- [ ] GET /projects/{project_id}/bim/{model_id}/extract/materials queries Model Derivative metadata
- [ ] Filter by Revit categories: Materials, Structural Foundations, Walls, Floors, Ceilings
- [ ] Extract: material name, material class, quantities from schedules
- [ ] Match against existing material templates by name similarity
- [ ] Return preview with auto-mapped fields
- [ ] POST /projects/{project_id}/bim/{model_id}/import/materials creates Material records
**Estimate:** 3 points
**Labels:** backend, autodesk, extraction, materials

#### US-14.9: Import Wizard UI
**Title:** Create BIM Import Wizard for Areas, Equipment, and Materials
**Description:**
As a user, I want a step-by-step import wizard so I can review, map, and confirm extracted BIM data before it's imported.

**Acceptance Criteria:**
- [ ] Multi-step wizard dialog: Select Model → Choose Data Type → Review & Map → Confirm
- [ ] Step 1: Select which BIM model to extract from
- [ ] Step 2: Choose extraction type (Areas / Equipment / Materials)
- [ ] Step 3: Table showing extracted items with editable field mappings, checkboxes to include/exclude
- [ ] Highlight items that match existing records (duplicate detection)
- [ ] Auto-mapped fields shown in green, manual fields in yellow, unmapped in red
- [ ] Step 4: Summary count + "Import N items" confirmation
- [ ] Progress bar during import with success/error counts
- [ ] 3D viewer sidebar: clicking row highlights element in viewer
**Estimate:** 5 points
**Labels:** frontend, autodesk, wizard, bim

#### US-14.10: ACC RFI Sync - Outbound
**Title:** Sync BuilderOps RFIs to Autodesk Construction Cloud
**Description:**
As a user, I want to push my BuilderOps RFIs to ACC so that external contractors using ACC can see and respond to them.

**Acceptance Criteria:**
- [ ] POST /projects/{project_id}/bim/rfi-sync/push syncs open RFIs to ACC
- [ ] Requires user 3-legged OAuth connection to ACC (from US-14.1)
- [ ] Map BuilderOps RFI fields to ACC RFI v3 schema (subject, question, status, priority, assignee)
- [ ] Store ACC RFI ID in `rfis.acc_rfi_id` column (new migration)
- [ ] Update existing ACC RFIs when BuilderOps RFI changes
- [ ] Skip already-synced RFIs that haven't changed
- [ ] Return sync report: created N, updated N, failed N
**Estimate:** 3 points
**Labels:** backend, autodesk, rfi-sync

#### US-14.11: ACC RFI Sync - Inbound
**Title:** Import RFIs from Autodesk Construction Cloud into BuilderOps
**Description:**
As a user, I want to pull RFIs from ACC into BuilderOps so all project communication is in one place.

**Acceptance Criteria:**
- [ ] POST /projects/{project_id}/bim/rfi-sync/pull fetches RFIs from ACC
- [ ] Uses ACC RFI v3 API: POST /construction/rfis/v3/projects/{acc_project_id}/search:rfis
- [ ] Map ACC RFI fields to BuilderOps RFI schema
- [ ] Detect duplicates by acc_rfi_id to avoid double-import
- [ ] Import responses/answers as RFIResponse records
- [ ] Return import report: imported N new, updated N, skipped N duplicates
- [ ] Settings page: link BuilderOps project to ACC project ID
**Estimate:** 3 points
**Labels:** backend, autodesk, rfi-sync

---

## EPIC 15: BI Dashboard & Reporting
**Description:** Add visual charts and analytics to the main project dashboard so managers get at-a-glance project health via donut charts, bar charts, line trends, and a progress gauge.
**Priority:** P1 - High
**Estimate:** 8 points

### User Stories:

#### US-15.1: Dashboard Stats Backend Endpoint
**Title:** Create Project Dashboard Stats API Endpoint
**Description:**
As a backend developer, I need a single project-scoped endpoint (`GET /analytics/projects/{project_id}/dashboard-stats`) returning equipment/material/RFI distributions, findings severity, weekly activity trend, area progress by floor, and overall progress so the frontend can render charts in one call.

**Acceptance Criteria:**
- [x] Equipment status distribution (GROUP BY status)
- [x] Material status distribution (GROUP BY status)
- [x] RFI status distribution (GROUP BY status)
- [x] Findings severity distribution (JOIN inspection for project scope)
- [x] 14-day activity trend from audit_logs grouped by day
- [x] Area progress grouped by floor_number with AVG(current_progress)
- [x] Overall progress as AVG of all area current_progress
- [x] Project membership check (403 for non-members)
**Estimate:** 3 points
**Labels:** backend, analytics, api

#### US-15.2: Dashboard Charts (MUI X Charts)
**Title:** Add BI Charts to Dashboard Page
**Description:**
As a project manager, I want to see visual charts on the dashboard including activity trend line, progress gauge, status donut charts, area progress bars, and findings severity bars so I can assess project health at a glance.

**Acceptance Criteria:**
- [x] Activity trend line chart (14-day, 4 series)
- [x] Overall progress circular gauge
- [x] Equipment/Material/RFI status donut charts (3 across)
- [x] Area progress by floor bar chart
- [x] Findings severity bar chart
- [x] Charts only render when a project is selected
- [x] Loading skeletons while data fetches
- [x] Responsive grid layout (mobile to desktop)
**Estimate:** 3 points
**Labels:** frontend, dashboard, charts

#### US-15.3: i18n for Dashboard Charts
**Title:** Add Translations for Dashboard Chart Labels
**Description:**
As a user, I want dashboard chart titles and labels translated in English, Hebrew, and Spanish so the charts are localized.

**Acceptance Criteria:**
- [x] English translations under `dashboard.charts.*`
- [x] Hebrew translations with correct RTL support
- [x] Spanish translations
- [x] Keys: activityTrend, equipmentStatus, materialStatus, rfiStatus, areaProgress, findingsSeverity, overallProgress, noData, floor, avgProgress, findings, floorsTracked
**Estimate:** 2 points
**Labels:** frontend, i18n

---

## Summary

| Epic | Stories | Total Points | Status |
|------|---------|--------------|--------|
| 1. Design System Foundation | 4 | 8 | Done |
| 2. Landing Page Implementation | 6 | 13 | Done |
| 3. Dashboard Views | 6 | 21 | Done |
| 4. Approval System UI | 5 | 13 | Done |
| 5. Project Management Pages | 6 | 18 | Done |
| 6. Inspection System UI | 5 | 15 | Done |
| 7. RTL & Internationalization | 3 | 8 | Done |
| 8. Mobile & Offline Experience | 4 | 10 | Done |
| 9. Component Library | 5 | 13 | Done |
| 10. Animations & Micro-interactions | 2 | 5 | Done |
| 11. RFI System (Email Integration) | 16 | 46 | Done |
| 12. AI Chat with Project Data | 7 | 26 | Done (Phase 1) |
| 13. Daily Work Summary Email | 6 | 11 | Done |
| 14. Autodesk Revit/BIM Integration | 11 | 47 | Planned |
| 15. BI Dashboard & Reporting | 3 | 8 | Done |
| **TOTAL** | **89 stories** | **262 points** | |

---

## Priority Order (Recommended)

1. **Sprint 1:** Epic 1 (Design System) + Epic 9 (Components) - Foundation
2. **Sprint 2:** Epic 3 (Dashboards) - Core functionality
3. **Sprint 3:** Epic 6 (Inspections) + Epic 4 (Approvals) - Key features
4. **Sprint 4:** Epic 5 (Project Pages) - Project management
5. **Sprint 5:** Epic 7 (RTL) + Epic 8 (Mobile) - Internationalization
6. **Sprint 6:** Epic 2 (Landing) + Epic 10 (Animations) - Polish
7. **Sprint 7:** Epic 11 (RFI System) - Email-integrated RFI workflow
8. **Sprint 8:** Epic 12 (AI Chat) - Project data chat with Gemini
9. **Sprint 9:** Epic 13 (Daily Summary) - Automated daily email reports
10. **Sprint 10:** Epic 14 (BIM Integration) Phase 1 - Auth + Upload + Viewer (US-14.1 to 14.5)
11. **Sprint 11:** Epic 14 (BIM Integration) Phase 2 - Data Extraction + Import Wizard (US-14.6 to 14.9)
12. **Sprint 12:** Epic 14 (BIM Integration) Phase 3 - ACC RFI Sync (US-14.10 to 14.11)
13. **Sprint 13:** Epic 15 (BI Dashboard) - Dashboard charts and analytics
