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
- [ ] Define CSS custom properties for all colors (primary, secondary, accent, semantic)
- [ ] Implement Construction Navy palette (#0F172A, #334155, #0369A1)
- [ ] Add Safety Orange for alerts (#F97316)
- [ ] Create semantic colors (success, warning, error, info)
- [ ] Support both light and dark mode variables
**Estimate:** 2 points
**Labels:** design-system, frontend

#### US-1.2: Typography System Setup
**Title:** Configure Bilingual Typography System
**Description:**
As a developer, I need to set up the typography system with Plus Jakarta Sans (English) and Noto Sans Hebrew (RTL) so that the app supports bilingual content.

**Acceptance Criteria:**
- [ ] Import Google Fonts (Plus Jakarta Sans, Noto Sans Hebrew)
- [ ] Define type scale (Display, H1-H4, Body, Small, Tiny)
- [ ] Configure font weights and line heights
- [ ] Set up RTL font-family switching
- [ ] Create typography utility classes
**Estimate:** 2 points
**Labels:** design-system, typography, i18n

#### US-1.3: Component Token System
**Title:** Create Design Token System for Components
**Description:**
As a developer, I need a token system for spacing, shadows, and borders so that components maintain visual consistency.

**Acceptance Criteria:**
- [ ] Define spacing scale (xs through 3xl)
- [ ] Create shadow depth levels (sm, md, lg, xl)
- [ ] Set border radius tokens (sm, md, lg, xl)
- [ ] Configure transition timing tokens
- [ ] Document all tokens in design system
**Estimate:** 1 point
**Labels:** design-system, tokens

#### US-1.4: Dark Mode Infrastructure
**Title:** Implement Dark Mode Theme Toggle
**Description:**
As a user, I want to switch between light and dark modes so that I can use the app comfortably in different lighting conditions.

**Acceptance Criteria:**
- [ ] Create theme context provider
- [ ] Implement theme toggle component
- [ ] Persist theme preference in localStorage
- [ ] Apply dark mode colors throughout app
- [ ] Respect system preference (prefers-color-scheme)
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
- [ ] Dark navy background with construction imagery overlay
- [ ] Headline: "Build Smarter. Inspect Faster. Deliver Excellence."
- [ ] Two CTAs: "Request Demo" (primary) and "Login" (secondary)
- [ ] Trust logos carousel at bottom
- [ ] Glassmorphism navigation bar
- [ ] Responsive for mobile/tablet/desktop
**Estimate:** 3 points
**Labels:** landing-page, marketing
**Design Reference:** `design-assets/landing/01-hero-dark.png`

#### US-2.2: Features Bento Grid
**Title:** Create Features Section with Bento Grid Layout
**Description:**
As a visitor, I want to see the key features in an engaging layout so that I understand what the platform offers.

**Acceptance Criteria:**
- [ ] Asymmetric bento grid layout (2 large, 4 medium cards)
- [ ] 6 features: Project Management, Equipment Tracking, Inspection System, Approval Workflows, Team Collaboration, Analytics
- [ ] Glassmorphism card effect with hover states
- [ ] SVG icons for each feature (Lucide/Heroicons)
- [ ] Responsive grid (3-col desktop, 2-col tablet, 1-col mobile)
**Estimate:** 3 points
**Labels:** landing-page, components
**Design Reference:** `design-assets/landing/02-features-bento.png`

#### US-2.3: Pricing Section
**Title:** Build 3-Tier Pricing Cards Section
**Description:**
As a visitor, I want to see pricing options so that I can choose the right plan for my needs.

**Acceptance Criteria:**
- [ ] Three pricing cards: Starter, Professional, Enterprise
- [ ] "Most Popular" badge on Professional tier
- [ ] Feature list with checkmarks for each tier
- [ ] CTA buttons on each card
- [ ] Professional card elevated with emphasis styling
- [ ] Responsive layout
**Estimate:** 2 points
**Labels:** landing-page, pricing
**Design Reference:** `design-assets/landing/03-pricing.png`

#### US-2.4: Testimonials Section
**Title:** Create Client Testimonials Carousel
**Description:**
As a visitor, I want to see testimonials from real clients so that I can trust the platform.

**Acceptance Criteria:**
- [ ] Testimonial cards with quote, photo, name, title
- [ ] 5-star rating display
- [ ] Company logos
- [ ] Carousel/slider navigation
- [ ] Auto-play with pause on hover
**Estimate:** 2 points
**Labels:** landing-page, social-proof
**Design Reference:** `design-assets/landing/04-testimonials.png`

#### US-2.5: Mobile App Preview
**Title:** Add Mobile App Preview Section
**Description:**
As a visitor, I want to see the mobile app so that I know I can use it in the field.

**Acceptance Criteria:**
- [ ] iPhone and Android device mockups
- [ ] Floating phone display at angle
- [ ] App store badges (iOS/Android)
- [ ] Feature highlights for mobile
- [ ] Light gradient background
**Estimate:** 2 points
**Labels:** landing-page, mobile
**Design Reference:** `design-assets/landing/05-mobile-preview.png`

#### US-2.6: CTA Section
**Title:** Build Final Call-to-Action Section
**Description:**
As a visitor, I want a clear final CTA so that I can request a demo easily.

**Acceptance Criteria:**
- [ ] Dark navy background
- [ ] "Ready to Transform Your Construction Operations?" headline
- [ ] Email input field with submit button
- [ ] Demo calendar widget preview
- [ ] Trust badges and security icons
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
- [ ] Bento grid layout with KPI cards
- [ ] Active Projects count widget
- [ ] Pending Approvals counter
- [ ] Completion Rate percentage ring
- [ ] Revenue/budget line chart
- [ ] Project location map widget
- [ ] Risk alerts panel with severity indicators
- [ ] Dark navy theme (#0F172A background)
**Estimate:** 5 points
**Labels:** dashboard, executive, dark-mode
**Design Reference:** `design-assets/dashboard/07-executive-dark.png`

#### US-3.2: Executive Dashboard - Light Mode
**Title:** Build Executive Dashboard (Light Theme)
**Description:**
As an executive, I want a light mode option so that I can use the dashboard in bright environments.

**Acceptance Criteria:**
- [ ] Same layout as dark mode
- [ ] Light background (#F8FAFC)
- [ ] Adjusted colors for light theme contrast
- [ ] Theme toggle integration
**Estimate:** 2 points
**Labels:** dashboard, executive, light-mode
**Design Reference:** `design-assets/dashboard/08-executive-light.png`

#### US-3.3: Project Manager Dashboard
**Title:** Create Project Manager Dashboard View
**Description:**
As a project manager, I want a dashboard focused on active projects so that I can manage my workload effectively.

**Acceptance Criteria:**
- [ ] Active projects card grid
- [ ] Project cards with progress bars and status badges
- [ ] Timeline mini-view (simplified Gantt)
- [ ] Team workload distribution bars
- [ ] Approval queue widget
- [ ] Quick filters bar
**Estimate:** 5 points
**Labels:** dashboard, project-manager
**Design Reference:** `design-assets/dashboard/09-project-manager.png`

#### US-3.4: Field Inspector Mobile Dashboard
**Title:** Build Mobile Dashboard for Field Inspectors
**Description:**
As a field inspector, I want a mobile-optimized dashboard so that I can quickly access today's inspections on-site.

**Acceptance Criteria:**
- [ ] Mobile-first responsive design
- [ ] Today's inspections list with times/locations
- [ ] Large touch-friendly action buttons (44px min)
- [ ] Quick actions: Start Inspection, Take Photo, Report Issue
- [ ] Offline mode indicator
- [ ] Bottom navigation bar
**Estimate:** 3 points
**Labels:** dashboard, mobile, inspector
**Design Reference:** `design-assets/dashboard/10-inspector-mobile.png`

#### US-3.5: Analytics Dashboard
**Title:** Create Analytics Dashboard with Charts
**Description:**
As a user, I want an analytics dashboard so that I can visualize project data and trends.

**Acceptance Criteria:**
- [ ] Line chart for progress over time
- [ ] Bar chart for budget comparison
- [ ] Pie chart for task distribution
- [ ] KPI comparison cards with trends
- [ ] Date range selector
- [ ] Export buttons (CSV, PDF)
**Estimate:** 3 points
**Labels:** dashboard, analytics, charts
**Design Reference:** `design-assets/dashboard/11-analytics.png`

#### US-3.6: Team Workload Dashboard
**Title:** Build Team Workload View
**Description:**
As a manager, I want to see team workload so that I can balance assignments appropriately.

**Acceptance Criteria:**
- [ ] Team member cards with avatars
- [ ] Workload distribution bars
- [ ] Availability calendar grid
- [ ] Project assignment tags
- [ ] Filter by department/role
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
- [ ] List/table view of pending approvals
- [ ] Columns: type, project, submitter, date, priority
- [ ] Filter tabs: All, Equipment, Materials, Documents
- [ ] Status badges (Pending, Urgent)
- [ ] Quick action buttons (Approve, Reject, Review)
- [ ] Search and filter bar
- [ ] Pagination
**Estimate:** 3 points
**Labels:** approvals, list-view
**Design Reference:** `design-assets/dashboard/13-approval-queue.png`

#### US-4.2: Notifications Panel
**Title:** Create Real-time Notifications Panel
**Description:**
As a user, I want to see notifications so that I stay informed about important updates.

**Acceptance Criteria:**
- [ ] Slide-out panel from header
- [ ] Notification list with icons, titles, timestamps
- [ ] Category tabs: All, Approvals, Inspections, Updates
- [ ] Unread counter badge
- [ ] Mark all as read functionality
- [ ] Click to navigate to relevant item
**Estimate:** 2 points
**Labels:** notifications, real-time
**Design Reference:** `design-assets/dashboard/14-notifications.png`

#### US-4.3: Multi-step Approval Stepper
**Title:** Implement Approval Workflow Stepper
**Description:**
As a user, I want to see the approval progress so that I know where my request stands.

**Acceptance Criteria:**
- [ ] Horizontal stepper component
- [ ] Steps: Draft → Submitted → Under Review → Approved
- [ ] Current step highlighted
- [ ] Completed steps with checkmarks
- [ ] Step details on expansion
- [ ] Action buttons for current step
**Estimate:** 3 points
**Labels:** approvals, workflow
**Design Reference:** `design-assets/approval/26-approval-stepper.png`

#### US-4.4: Document Review Interface
**Title:** Build Document Review Split View
**Description:**
As a reviewer, I want to view documents and add comments so that I can make informed approval decisions.

**Acceptance Criteria:**
- [ ] Split view layout
- [ ] Left panel: document/PDF preview with zoom
- [ ] Right panel: comments thread
- [ ] Comment with user avatars and timestamps
- [ ] Reply to comments
- [ ] Action bar: Approve, Reject, Request Changes
**Estimate:** 3 points
**Labels:** approvals, documents
**Design Reference:** `design-assets/approval/27-document-review.png`

#### US-4.5: Approval Audit Trail
**Title:** Create Approval History Audit Trail
**Description:**
As an admin, I want to see the complete approval history so that I can audit decisions and ensure compliance.

**Acceptance Criteria:**
- [ ] Vertical timeline of actions
- [ ] Entry: user avatar, action, timestamp, status
- [ ] Action types: Submitted, Approved, Rejected, Commented
- [ ] Filter by date range and action type
- [ ] Export audit log button
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
- [ ] Hero section with project photo
- [ ] Progress ring showing percentage complete
- [ ] Project name, address, dates
- [ ] Status timeline with milestones
- [ ] Tabbed navigation: Overview, Equipment, Inspections, Team
- [ ] Key metrics cards: Budget, Timeline, Team Size
**Estimate:** 3 points
**Labels:** project, overview
**Design Reference:** `design-assets/project/15-project-overview.png`

#### US-5.2: Equipment Tracking List
**Title:** Build Equipment Tracking Data Table
**Description:**
As a user, I want to view and manage equipment so that I can track assets across projects.

**Acceptance Criteria:**
- [ ] Data table with sortable columns
- [ ] Columns: name, model, serial, location, status
- [ ] Status badges: Approved, Pending, Rejected
- [ ] Search and filter dropdowns
- [ ] Add Equipment button
- [ ] Row actions: View, Edit, Delete
- [ ] Pagination
**Estimate:** 3 points
**Labels:** project, equipment
**Design Reference:** `design-assets/project/16-equipment-list.png`

#### US-5.3: Material Inventory Grid
**Title:** Create Material Inventory Card Grid
**Description:**
As a user, I want to view materials in a visual grid so that I can quickly assess inventory status.

**Acceptance Criteria:**
- [ ] Card grid layout
- [ ] Material photo, name, quantity
- [ ] Progress bar for quantity level
- [ ] Storage location indicator
- [ ] Low stock alert badge (orange)
- [ ] Filter chips: All, Concrete, Steel, Lumber, etc.
- [ ] Add Material button
**Estimate:** 3 points
**Labels:** project, materials
**Design Reference:** `design-assets/project/17-material-inventory.png`

#### US-5.4: Gantt Timeline View
**Title:** Implement Interactive Gantt Chart
**Description:**
As a project manager, I want to see a Gantt chart so that I can visualize project timeline and dependencies.

**Acceptance Criteria:**
- [ ] Horizontal timeline with task bars
- [ ] Task groups (collapsible)
- [ ] Dependencies shown with arrows
- [ ] Milestone markers (diamonds)
- [ ] Today line indicator
- [ ] Zoom controls (day/week/month)
- [ ] Task list sidebar
**Estimate:** 5 points
**Labels:** project, timeline, gantt
**Design Reference:** `design-assets/project/18-gantt-timeline.png`

#### US-5.5: Team Members Grid
**Title:** Build Team Members Directory Grid
**Description:**
As a user, I want to see all team members so that I can contact and assign tasks to them.

**Acceptance Criteria:**
- [ ] Card grid of team members
- [ ] Avatar, name, role, contact info
- [ ] Role color coding
- [ ] Project assignment tags
- [ ] Search by name
- [ ] Filter by role
- [ ] Invite Team Member button
**Estimate:** 2 points
**Labels:** project, team
**Design Reference:** `design-assets/project/19-team-members.png`

#### US-5.6: Document Library
**Title:** Create Document Library File Browser
**Description:**
As a user, I want to manage project documents so that I can store and find files easily.

**Acceptance Criteria:**
- [ ] Split view: folder tree + file list + preview
- [ ] Folder structure: Contracts, Blueprints, Permits, Reports
- [ ] File list with name, type, size, date, uploader
- [ ] Preview panel for selected file
- [ ] Drag and drop upload area
- [ ] Search and filter by type
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
- [ ] Mobile-optimized layout
- [ ] Collapsible sections: Structural, Electrical, Plumbing
- [ ] Checklist items with toggle switches
- [ ] Photo capture button with camera integration
- [ ] Notes text area per item
- [ ] Digital signature capture at bottom
- [ ] Progress bar showing completion
- [ ] Offline capability indicators
**Estimate:** 5 points
**Labels:** inspection, mobile, checklist
**Design Reference:** `design-assets/inspection/21-checklist-mobile.png`

#### US-6.2: Finding Documentation Card
**Title:** Create Finding Documentation Component
**Description:**
As an inspector, I want to document findings with details so that issues are properly tracked.

**Acceptance Criteria:**
- [ ] Finding card component
- [ ] Severity badge: Critical (red), High (orange), Medium (yellow), Low (gray)
- [ ] Photo gallery with add photo
- [ ] Location pin with floor/area
- [ ] Description text area
- [ ] Inspector info and timestamp
- [ ] Actions: Assign, Resolve, Add Photo
**Estimate:** 3 points
**Labels:** inspection, findings
**Design Reference:** `design-assets/inspection/22-finding-card.png`

#### US-6.3: Inspection Report Preview
**Title:** Build Inspection Report Preview/Export
**Description:**
As a user, I want to preview and export inspection reports so that I can share them with stakeholders.

**Acceptance Criteria:**
- [ ] PDF-style report layout
- [ ] Company logo header
- [ ] Inspection summary section
- [ ] Findings table with severity counts
- [ ] Photo grid section
- [ ] Digital signature display
- [ ] Export to PDF button
- [ ] Print functionality
**Estimate:** 3 points
**Labels:** inspection, reports
**Design Reference:** `design-assets/inspection/23-report-preview.png`

#### US-6.4: Consultant Assignment Interface
**Title:** Create Consultant Selection and Scheduling UI
**Description:**
As a manager, I want to assign consultants to inspections so that the right experts are scheduled.

**Acceptance Criteria:**
- [ ] Consultant list with avatar, name, specialty
- [ ] Filter by specialty dropdown
- [ ] Availability status indicators
- [ ] Weekly calendar view for scheduling
- [ ] Time slot selection
- [ ] Assign button
**Estimate:** 2 points
**Labels:** inspection, scheduling
**Design Reference:** `design-assets/inspection/24-consultant-assignment.png`

#### US-6.5: Inspection History Timeline
**Title:** Build Inspection History Timeline View
**Description:**
As a user, I want to see inspection history so that I can track all inspections for a project.

**Acceptance Criteria:**
- [ ] Vertical timeline component
- [ ] Date markers
- [ ] Inspection nodes with status dots (green/red/yellow)
- [ ] Inspector avatar and name
- [ ] Inspection type label
- [ ] Click to view details
- [ ] Filter by date range
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
- [ ] HTML dir="rtl" attribute switching
- [ ] CSS logical properties (margin-inline-start, etc.)
- [ ] Sidebar on right side for RTL
- [ ] Navigation mirrored appropriately
- [ ] Icons that indicate direction should flip
- [ ] Numbers and phone numbers remain LTR
**Estimate:** 3 points
**Labels:** i18n, rtl
**Design Reference:** `design-assets/mobile/29-hebrew-rtl.png`

#### US-7.2: Hebrew Translation Integration
**Title:** Add Hebrew Language Support
**Description:**
As a Hebrew user, I want all UI text in Hebrew so that I can use the app in my native language.

**Acceptance Criteria:**
- [ ] i18n framework setup (react-intl or i18next)
- [ ] Hebrew translation file with all UI strings
- [ ] Language switcher in settings
- [ ] Proper Hebrew font rendering (Noto Sans Hebrew)
- [ ] Date/time formatting for Hebrew locale
**Estimate:** 3 points
**Labels:** i18n, translation

#### US-7.3: Language Toggle Component
**Title:** Create Language Toggle UI
**Description:**
As a user, I want to switch between English and Hebrew so that I can use my preferred language.

**Acceptance Criteria:**
- [ ] Language toggle in header/settings
- [ ] Flag or text indicator (EN/עב)
- [ ] Persist preference in user settings
- [ ] Seamless switch without page reload
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
- [ ] Breakpoints: 375px, 640px, 768px, 1024px, 1280px
- [ ] Touch targets minimum 44x44px
- [ ] Mobile navigation (hamburger menu or bottom nav)
- [ ] Responsive tables (card view on mobile)
- [ ] No horizontal scroll issues
**Estimate:** 3 points
**Labels:** mobile, responsive

#### US-8.2: Offline Mode UI
**Title:** Build Offline Mode Interface
**Description:**
As a field worker, I want visual feedback when offline so that I know my data is being saved locally.

**Acceptance Criteria:**
- [ ] Offline banner/indicator
- [ ] Sync status icon in header
- [ ] Queued items counter
- [ ] Last synced timestamp
- [ ] Sync Now button (disabled when offline)
- [ ] Visual distinction for locally-saved items
**Estimate:** 3 points
**Labels:** mobile, offline
**Design Reference:** `design-assets/mobile/30-offline-mode.png`

#### US-8.3: Progressive Web App Setup
**Title:** Configure PWA for Installation
**Description:**
As a user, I want to install the app on my device so that I can access it like a native app.

**Acceptance Criteria:**
- [ ] Web app manifest configured
- [ ] Service worker for caching
- [ ] Offline page fallback
- [ ] Install prompt handling
- [ ] App icons for all sizes
**Estimate:** 2 points
**Labels:** mobile, pwa

#### US-8.4: Touch Optimizations
**Title:** Optimize Touch Interactions
**Description:**
As a mobile user, I want smooth touch interactions so that the app feels responsive.

**Acceptance Criteria:**
- [ ] touch-action: manipulation for tap delay
- [ ] Swipe gestures where appropriate
- [ ] Pull-to-refresh on list views
- [ ] 8px minimum gap between touch targets
- [ ] Haptic feedback on key actions (if supported)
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
- [ ] Primary button (filled blue)
- [ ] Secondary button (outlined)
- [ ] Tertiary button (text only)
- [ ] Danger button (red)
- [ ] Loading state with spinner
- [ ] Disabled state
- [ ] Icon button variant
- [ ] Size variants (sm, md, lg)
**Estimate:** 2 points
**Labels:** components, buttons

#### US-9.2: Card Components
**Title:** Build Card Component System
**Description:**
As a developer, I need card components so that content containers are consistent.

**Acceptance Criteria:**
- [ ] Base card with variants
- [ ] Glassmorphism card option
- [ ] KPI card (metric, label, trend)
- [ ] Feature card (icon, title, description)
- [ ] Project card (image, title, progress, status)
- [ ] Hover states with lift effect
**Estimate:** 3 points
**Labels:** components, cards

#### US-9.3: Form Components
**Title:** Create Form Input Components
**Description:**
As a developer, I need form components so that data entry is consistent and accessible.

**Acceptance Criteria:**
- [ ] Text input with label
- [ ] Textarea
- [ ] Select/dropdown
- [ ] Checkbox and radio
- [ ] Date picker
- [ ] File upload
- [ ] Error states and validation messages
- [ ] Focus states for accessibility
**Estimate:** 3 points
**Labels:** components, forms

#### US-9.4: Data Display Components
**Title:** Build Data Display Components
**Description:**
As a developer, I need data components so that information is displayed consistently.

**Acceptance Criteria:**
- [ ] Data table with sorting and pagination
- [ ] Badge/chip component
- [ ] Status indicator
- [ ] Progress bar and ring
- [ ] Avatar component
- [ ] Empty state component
**Estimate:** 3 points
**Labels:** components, data

#### US-9.5: Navigation Components
**Title:** Create Navigation Components
**Description:**
As a developer, I need navigation components so that app navigation is consistent.

**Acceptance Criteria:**
- [ ] Top navbar with glassmorphism option
- [ ] Sidebar navigation (collapsible)
- [ ] Bottom navigation (mobile)
- [ ] Breadcrumbs
- [ ] Tabs component
- [ ] Stepper/wizard component
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
- [ ] Define transition tokens (fast: 150ms, normal: 200ms, slow: 300ms)
- [ ] Page transitions (fade, slide)
- [ ] Modal open/close animations
- [ ] Accordion expand/collapse
- [ ] Respect prefers-reduced-motion
**Estimate:** 2 points
**Labels:** animation, transitions

#### US-10.2: Micro-interactions
**Title:** Add Micro-interactions to Components
**Description:**
As a user, I want feedback on my interactions so that the app feels responsive.

**Acceptance Criteria:**
- [ ] Button hover/active states
- [ ] Card hover lift effect
- [ ] Loading states (skeletons, spinners)
- [ ] Success/error feedback
- [ ] Number count-up animations
- [ ] Chart animations on load
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
- [ ] Create `RFI` model with: id, project_id, rfi_number, email_thread_id, email_message_id, subject, question, category, priority, to_email, to_name, cc_emails, status, due_date, attachments
- [ ] Create `RFIResponse` model with: id, rfi_id, email_message_id, response_text, from_email, from_name, is_internal, source
- [ ] Create `RFIEmailLog` model for audit trail
- [ ] Create Alembic migration
**Estimate:** 3 points
**Labels:** backend, database, rfi

#### US-11.2: Pydantic Schemas (BUI-95)
**Title:** Create RFI Pydantic Schemas
**Description:**
As a developer, I need Pydantic schemas for RFI validation.

**Acceptance Criteria:**
- [ ] Create RFIBase, RFICreate, RFIUpdate schemas
- [ ] Create RFIResponse schema with nested responses
- [ ] Add validation for email addresses and RFI number format
**Estimate:** 2 points
**Labels:** backend, schemas, rfi

#### US-11.3: Gmail API Service (BUI-96)
**Title:** Implement Gmail API Service
**Description:**
As a developer, I need a Gmail API service to send and receive RFI emails.

**Acceptance Criteria:**
- [ ] Create GmailService class with service account auth
- [ ] Implement send_rfi_email() with threading headers
- [ ] Implement get_message(), get_thread(), setup_watch()
- [ ] Add X-RFI-Number custom header
**Estimate:** 5 points
**Labels:** backend, email, gmail-api, rfi

#### US-11.4: Email Parser Service (BUI-97)
**Title:** Implement RFI Email Parser Service
**Description:**
As a developer, I need an email parser to process incoming emails.

**Acceptance Criteria:**
- [ ] Create RFIEmailParser class
- [ ] Parse headers, body, attachments from Gmail messages
- [ ] Extract RFI number from subject or X-RFI-Number header
- [ ] Distinguish new emails vs replies
**Estimate:** 3 points
**Labels:** backend, parser, email, rfi

#### US-11.5: RFI Business Logic Service (BUI-98)
**Title:** Create RFI Service with Email Integration
**Description:**
As a developer, I need an RFI service for business logic.

**Acceptance Criteria:**
- [ ] Implement generate_rfi_number() - format: RFI-YYYY-NNNNN
- [ ] Implement create_and_send_rfi()
- [ ] Implement process_incoming_email()
- [ ] Handle status transitions
**Estimate:** 5 points
**Labels:** backend, service, rfi

#### US-11.6: Gmail Webhook Endpoint (BUI-99)
**Title:** Create Gmail Pub/Sub Webhook Endpoint
**Description:**
As a developer, I need a webhook to receive Gmail notifications.

**Acceptance Criteria:**
- [ ] Create POST /api/v1/webhooks/gmail/push endpoint
- [ ] Parse Pub/Sub message format
- [ ] Process emails in background task
- [ ] Return 200 OK quickly for Pub/Sub
**Estimate:** 3 points
**Labels:** backend, webhook, pubsub, rfi

#### US-11.7: RFI CRUD API (BUI-100)
**Title:** Create RFI CRUD API Endpoints
**Description:**
As a developer, I need REST API endpoints for RFI management.

**Acceptance Criteria:**
- [ ] GET/POST /projects/{project_id}/rfis
- [ ] GET/PATCH /rfis/{rfi_id}
- [ ] POST /rfis/{rfi_id}/send
- [ ] POST /rfis/{rfi_id}/responses
- [ ] GET /rfis/{rfi_id}/email-log
**Estimate:** 3 points
**Labels:** backend, api, rfi

#### US-11.8: Notification Service (BUI-101)
**Title:** Implement RFI Notification Service
**Description:**
As a user, I want notifications when RFI responses arrive.

**Acceptance Criteria:**
- [ ] Implement notify_rfi_response()
- [ ] Implement notify_rfi_due_soon()
- [ ] Implement notify_rfi_overdue()
**Estimate:** 3 points
**Labels:** backend, notifications, rfi

#### US-11.9: GCP Infrastructure (BUI-102)
**Title:** Set Up GCP Email Infrastructure
**Description:**
As a DevOps engineer, I need to configure GCP services.

**Acceptance Criteria:**
- [ ] Create GCP project, enable APIs
- [ ] Create service account with domain-wide delegation
- [ ] Create Pub/Sub topic and subscription
- [ ] Document configuration steps
**Estimate:** 3 points
**Labels:** devops, gcp, infrastructure, rfi

#### US-11.10: Frontend RFI List (BUI-103)
**Title:** Create Frontend RFI List Page
**Description:**
As a user, I want to view all RFIs for a project.

**Acceptance Criteria:**
- [ ] Create /projects/{projectId}/rfis route
- [ ] Data table with RFI Number, Subject, To, Status, Priority, Due Date
- [ ] Status badges, filters, search, pagination
- [ ] "New RFI" button
**Estimate:** 3 points
**Labels:** frontend, page, rfi

#### US-11.11: Frontend RFI Detail (BUI-104)
**Title:** Create RFI Detail Page with Thread View
**Description:**
As a user, I want to view RFI details and conversation thread.

**Acceptance Criteria:**
- [ ] Header with RFI info and action buttons
- [ ] Original question section with attachments
- [ ] Chronological conversation thread
- [ ] Reply input with rich text editor
**Estimate:** 5 points
**Labels:** frontend, page, rfi

#### US-11.12: RFI Form Dialog (BUI-105)
**Title:** Create RFI Form Dialog Component
**Description:**
As a user, I want to create new RFIs through a form.

**Acceptance Criteria:**
- [ ] Form fields: to_email, subject, category, priority, due_date, question, attachments
- [ ] Form validation
- [ ] Save as Draft and Send Now buttons
**Estimate:** 3 points
**Labels:** frontend, component, rfi

#### US-11.13: Frontend API Client (BUI-106)
**Title:** Create Frontend RFI API Client
**Description:**
As a developer, I need a frontend API client for RFI operations.

**Acceptance Criteria:**
- [ ] Create frontend/src/api/rfi.ts
- [ ] Implement all CRUD functions with TypeScript types
**Estimate:** 2 points
**Labels:** frontend, api, rfi

#### US-11.14: Dashboard Widget (BUI-107)
**Title:** Add RFI Dashboard Widget
**Description:**
As a user, I want to see RFI statistics on my dashboard.

**Acceptance Criteria:**
- [ ] Display counts: Open, Overdue, Answered Today, Closed This Month
- [ ] Click to navigate to filtered RFI list
**Estimate:** 2 points
**Labels:** frontend, dashboard, rfi

#### US-11.15: Navigation Integration (BUI-108)
**Title:** Add RFI to Project Navigation
**Description:**
As a user, I want to access RFIs from project navigation.

**Acceptance Criteria:**
- [ ] Add "RFIs" tab to project detail page
- [ ] Show pending count badge
- [ ] Update router
**Estimate:** 1 point
**Labels:** frontend, navigation, rfi

#### US-11.16: Integration Tests (BUI-109)
**Title:** Write RFI System Integration Tests
**Description:**
As a developer, I need integration tests for the RFI system.

**Acceptance Criteria:**
- [ ] Test CRUD, email sending, webhook processing
- [ ] Test email parsing and RFI matching logic
- [ ] Test status transitions and notifications
**Estimate:** 3 points
**Labels:** backend, testing, rfi

---

## Summary

| Epic | Stories | Total Points |
|------|---------|--------------|
| 1. Design System Foundation | 4 | 8 |
| 2. Landing Page Implementation | 6 | 13 |
| 3. Dashboard Views | 6 | 21 |
| 4. Approval System UI | 5 | 13 |
| 5. Project Management Pages | 6 | 18 |
| 6. Inspection System UI | 5 | 15 |
| 7. RTL & Internationalization | 3 | 8 |
| 8. Mobile & Offline Experience | 4 | 10 |
| 9. Component Library | 5 | 13 |
| 10. Animations & Micro-interactions | 2 | 5 |
| 11. RFI System (Email Integration) | 16 | 46 |
| **TOTAL** | **62 stories** | **170 points** |

---

## Priority Order (Recommended)

1. **Sprint 1:** Epic 1 (Design System) + Epic 9 (Components) - Foundation
2. **Sprint 2:** Epic 3 (Dashboards) - Core functionality
3. **Sprint 3:** Epic 6 (Inspections) + Epic 4 (Approvals) - Key features
4. **Sprint 4:** Epic 5 (Project Pages) - Project management
5. **Sprint 5:** Epic 7 (RTL) + Epic 8 (Mobile) - Internationalization
6. **Sprint 6:** Epic 2 (Landing) + Epic 10 (Animations) - Polish
7. **Sprint 7:** Epic 11 (RFI System) - Email-integrated RFI workflow
