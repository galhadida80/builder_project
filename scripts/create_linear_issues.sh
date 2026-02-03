#!/bin/bash

API_TOKEN="lin_api_EmtAtr8ggFJGVINnUEzMButkDuOVrkdGVRZwGBEi"
TEAM_ID="18af49f9-dd3c-451d-bbd3-0853150cf9b9"
API_URL="https://api.linear.app/graphql"

create_issue() {
    local title="$1"
    local description="$2"
    local priority="${3:-2}"
    local parent_id="$4"
    local estimate="$5"

    local parent_input=""
    if [ -n "$parent_id" ]; then
        parent_input=", \"parentId\": \"$parent_id\""
    fi

    local estimate_input=""
    if [ -n "$estimate" ]; then
        estimate_input=", \"estimate\": $estimate"
    fi

    local escaped_title=$(echo "$title" | sed 's/"/\\"/g')
    local escaped_desc=$(echo "$description" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

    local query="mutation { issueCreate(input: { teamId: \\\"$TEAM_ID\\\", title: \\\"$escaped_title\\\", description: \\\"$escaped_desc\\\", priority: $priority $parent_input $estimate_input }) { success issue { id identifier title } } }"

    local response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: $API_TOKEN" \
        -d "{\"query\": \"$query\"}")

    local issue_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    local identifier=$(echo "$response" | grep -o '"identifier":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$identifier" ]; then
        echo "$identifier - $title"
        echo "$issue_id"
    else
        echo "Error creating: $title"
        echo "$response" >&2
        echo ""
    fi
}

echo "Creating BuilderOps UI/UX Implementation issues in Linear..."
echo "============================================================"

# Epic 1: Design System Foundation
echo -e "\n[EPIC] Design System Foundation"
EPIC1_ID=$(create_issue "[EPIC] Design System Foundation" "Establish the core design system including colors, typography, components, and theming infrastructure.\\n\\nPriority: P0 - Critical\\nEstimated Points: 8" 1 | tail -1)
sleep 0.5

if [ -n "$EPIC1_ID" ]; then
    create_issue "Implement Design System Color Palette" "As a developer, I need to implement the new color system with CSS variables.\\n\\nAcceptance Criteria:\\n- Define CSS custom properties for all colors\\n- Implement Construction Navy palette\\n- Add Safety Orange for alerts\\n- Create semantic colors\\n- Support dark and light mode" 2 "$EPIC1_ID" 2 | head -1
    sleep 0.3
    create_issue "Configure Bilingual Typography System" "Set up the typography system with Plus Jakarta Sans and Noto Sans Hebrew for bilingual support.\\n\\nAcceptance Criteria:\\n- Import Google Fonts\\n- Define type scale\\n- Configure font weights\\n- Set up RTL font-family switching" 2 "$EPIC1_ID" 2 | head -1
    sleep 0.3
    create_issue "Create Design Token System for Components" "Create a token system for spacing, shadows, and borders.\\n\\nAcceptance Criteria:\\n- Define spacing scale\\n- Create shadow levels\\n- Set border radius tokens\\n- Configure transition timings" 2 "$EPIC1_ID" 1 | head -1
    sleep 0.3
    create_issue "Implement Dark Mode Theme Toggle" "Allow users to switch between light and dark modes.\\n\\nAcceptance Criteria:\\n- Create theme context provider\\n- Implement toggle component\\n- Persist preference\\n- Respect system preference" 2 "$EPIC1_ID" 3 | head -1
    sleep 0.3
fi

# Epic 2: Landing Page Implementation
echo -e "\n[EPIC] Landing Page Implementation"
EPIC2_ID=$(create_issue "[EPIC] Landing Page Implementation" "Build the marketing landing page with hero, features, pricing, testimonials, and CTA sections.\\n\\nPriority: P1 - High\\nEstimated Points: 13" 2 | tail -1)
sleep 0.5

if [ -n "$EPIC2_ID" ]; then
    create_issue "Build Landing Page Hero Section" "Create impressive hero section with CTAs and trust logos.\\n\\nDesign Reference: design-assets/landing/01-hero-dark.png\\n\\nAcceptance Criteria:\\n- Dark navy background with construction imagery\\n- Headline and subheadline\\n- Request Demo and Login CTAs\\n- Trust logos carousel\\n- Glassmorphism navbar" 2 "$EPIC2_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Features Section with Bento Grid Layout" "Build features section with asymmetric bento grid layout.\\n\\nDesign Reference: design-assets/landing/02-features-bento.png\\n\\nAcceptance Criteria:\\n- 6 feature cards in bento grid\\n- Glassmorphism card effect\\n- SVG icons for each feature\\n- Responsive grid layout" 2 "$EPIC2_ID" 3 | head -1
    sleep 0.3
    create_issue "Build 3-Tier Pricing Cards Section" "Create pricing section with three tiers.\\n\\nDesign Reference: design-assets/landing/03-pricing.png\\n\\nAcceptance Criteria:\\n- Starter, Professional, Enterprise cards\\n- Most Popular badge\\n- Feature comparison\\n- CTA buttons" 2 "$EPIC2_ID" 2 | head -1
    sleep 0.3
    create_issue "Create Client Testimonials Carousel" "Build testimonials section with carousel.\\n\\nDesign Reference: design-assets/landing/04-testimonials.png\\n\\nAcceptance Criteria:\\n- Quote cards with photos\\n- 5-star ratings\\n- Company logos\\n- Carousel navigation" 2 "$EPIC2_ID" 2 | head -1
    sleep 0.3
    create_issue "Add Mobile App Preview Section" "Show mobile app mockups.\\n\\nDesign Reference: design-assets/landing/05-mobile-preview.png\\n\\nAcceptance Criteria:\\n- iPhone and Android mockups\\n- App store badges\\n- Feature highlights" 2 "$EPIC2_ID" 2 | head -1
    sleep 0.3
    create_issue "Build Final Call-to-Action Section" "Create final CTA section.\\n\\nDesign Reference: design-assets/landing/06-cta-section.png\\n\\nAcceptance Criteria:\\n- Dark navy background\\n- Email input with submit\\n- Demo calendar widget\\n- Trust badges" 2 "$EPIC2_ID" 1 | head -1
    sleep 0.3
fi

# Epic 3: Dashboard Views
echo -e "\n[EPIC] Dashboard Views"
EPIC3_ID=$(create_issue "[EPIC] Dashboard Views" "Implement role-based dashboards for executives, project managers, and field inspectors.\\n\\nPriority: P0 - Critical\\nEstimated Points: 21" 1 | tail -1)
sleep 0.5

if [ -n "$EPIC3_ID" ]; then
    create_issue "Build Executive Dashboard (Dark Theme)" "Create executive dashboard with KPIs in dark mode.\\n\\nDesign Reference: design-assets/dashboard/07-executive-dark.png\\n\\nAcceptance Criteria:\\n- Bento grid with KPI cards\\n- Revenue/budget chart\\n- Project map widget\\n- Risk alerts panel" 1 "$EPIC3_ID" 5 | head -1
    sleep 0.3
    create_issue "Build Executive Dashboard (Light Theme)" "Create light mode version of executive dashboard.\\n\\nDesign Reference: design-assets/dashboard/08-executive-light.png\\n\\nAcceptance Criteria:\\n- Same layout as dark mode\\n- Light background colors\\n- Theme toggle integration" 2 "$EPIC3_ID" 2 | head -1
    sleep 0.3
    create_issue "Create Project Manager Dashboard View" "Build dashboard for project managers.\\n\\nDesign Reference: design-assets/dashboard/09-project-manager.png\\n\\nAcceptance Criteria:\\n- Active projects grid\\n- Timeline mini-view\\n- Team workload bars\\n- Approval queue widget" 1 "$EPIC3_ID" 5 | head -1
    sleep 0.3
    create_issue "Build Mobile Dashboard for Field Inspectors" "Create mobile-optimized inspector dashboard.\\n\\nDesign Reference: design-assets/dashboard/10-inspector-mobile.png\\n\\nAcceptance Criteria:\\n- Today inspections list\\n- Quick action buttons\\n- Offline indicator\\n- Bottom navigation" 1 "$EPIC3_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Analytics Dashboard with Charts" "Build analytics dashboard with data visualizations.\\n\\nDesign Reference: design-assets/dashboard/11-analytics.png\\n\\nAcceptance Criteria:\\n- Line, bar, pie charts\\n- Date range selector\\n- Export buttons\\n- KPI comparisons" 2 "$EPIC3_ID" 3 | head -1
    sleep 0.3
    create_issue "Build Team Workload View" "Create team workload dashboard.\\n\\nDesign Reference: design-assets/dashboard/12-team-workload.png\\n\\nAcceptance Criteria:\\n- Team member cards\\n- Workload bars\\n- Availability calendar\\n- Project assignments" 2 "$EPIC3_ID" 3 | head -1
    sleep 0.3
fi

# Epic 4: Approval System UI
echo -e "\n[EPIC] Approval System UI"
EPIC4_ID=$(create_issue "[EPIC] Approval System UI" "Implement the approval queue, workflow stepper, and audit trail interfaces.\\n\\nPriority: P1 - High\\nEstimated Points: 13" 2 | tail -1)
sleep 0.5

if [ -n "$EPIC4_ID" ]; then
    create_issue "Build Approval Queue List View" "Create approval queue interface.\\n\\nDesign Reference: design-assets/dashboard/13-approval-queue.png\\n\\nAcceptance Criteria:\\n- List view with columns\\n- Filter tabs\\n- Status badges\\n- Quick action buttons" 2 "$EPIC4_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Real-time Notifications Panel" "Build notifications slide-out panel.\\n\\nDesign Reference: design-assets/dashboard/14-notifications.png\\n\\nAcceptance Criteria:\\n- Notification list\\n- Category tabs\\n- Unread counter\\n- Mark as read" 2 "$EPIC4_ID" 2 | head -1
    sleep 0.3
    create_issue "Implement Approval Workflow Stepper" "Create multi-step approval stepper.\\n\\nDesign Reference: design-assets/approval/26-approval-stepper.png\\n\\nAcceptance Criteria:\\n- Horizontal stepper\\n- Step highlighting\\n- Action buttons\\n- Step details" 2 "$EPIC4_ID" 3 | head -1
    sleep 0.3
    create_issue "Build Document Review Split View" "Create document review interface.\\n\\nDesign Reference: design-assets/approval/27-document-review.png\\n\\nAcceptance Criteria:\\n- Split view layout\\n- Document preview\\n- Comments thread\\n- Approve/Reject buttons" 2 "$EPIC4_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Approval History Audit Trail" "Build audit trail timeline.\\n\\nDesign Reference: design-assets/approval/28-audit-trail.png\\n\\nAcceptance Criteria:\\n- Vertical timeline\\n- Action entries\\n- Date filters\\n- Export log" 2 "$EPIC4_ID" 2 | head -1
    sleep 0.3
fi

# Epic 5: Project Management Pages
echo -e "\n[EPIC] Project Management Pages"
EPIC5_ID=$(create_issue "[EPIC] Project Management Pages" "Build project detail pages including overview, equipment, materials, timeline, and team views.\\n\\nPriority: P1 - High\\nEstimated Points: 18" 2 | tail -1)
sleep 0.5

if [ -n "$EPIC5_ID" ]; then
    create_issue "Create Project Overview Detail Page" "Build project overview page.\\n\\nDesign Reference: design-assets/project/15-project-overview.png\\n\\nAcceptance Criteria:\\n- Progress ring\\n- Status timeline\\n- Tabbed navigation\\n- Metrics cards" 2 "$EPIC5_ID" 3 | head -1
    sleep 0.3
    create_issue "Build Equipment Tracking Data Table" "Create equipment list view.\\n\\nDesign Reference: design-assets/project/16-equipment-list.png\\n\\nAcceptance Criteria:\\n- Sortable data table\\n- Status badges\\n- Search and filters\\n- Pagination" 2 "$EPIC5_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Material Inventory Card Grid" "Build material inventory grid.\\n\\nDesign Reference: design-assets/project/17-material-inventory.png\\n\\nAcceptance Criteria:\\n- Card grid layout\\n- Quantity indicators\\n- Low stock alerts\\n- Filter chips" 2 "$EPIC5_ID" 3 | head -1
    sleep 0.3
    create_issue "Implement Interactive Gantt Chart" "Create Gantt timeline view.\\n\\nDesign Reference: design-assets/project/18-gantt-timeline.png\\n\\nAcceptance Criteria:\\n- Task bars\\n- Dependencies\\n- Milestones\\n- Zoom controls" 2 "$EPIC5_ID" 5 | head -1
    sleep 0.3
    create_issue "Build Team Members Directory Grid" "Create team members grid.\\n\\nDesign Reference: design-assets/project/19-team-members.png\\n\\nAcceptance Criteria:\\n- Member cards\\n- Role coding\\n- Contact info\\n- Search and filter" 2 "$EPIC5_ID" 2 | head -1
    sleep 0.3
    create_issue "Create Document Library File Browser" "Build document library.\\n\\nDesign Reference: design-assets/project/20-document-library.png\\n\\nAcceptance Criteria:\\n- Folder tree\\n- File list\\n- Preview panel\\n- Drag and drop upload" 2 "$EPIC5_ID" 2 | head -1
    sleep 0.3
fi

# Epic 6: Inspection System UI
echo -e "\n[EPIC] Inspection System UI"
EPIC6_ID=$(create_issue "[EPIC] Inspection System UI" "Implement inspection checklists, findings, reports, and consultant management interfaces.\\n\\nPriority: P0 - Critical\\nEstimated Points: 15" 1 | tail -1)
sleep 0.5

if [ -n "$EPIC6_ID" ]; then
    create_issue "Build Mobile Inspection Checklist Interface" "Create mobile inspection checklist.\\n\\nDesign Reference: design-assets/inspection/21-checklist-mobile.png\\n\\nAcceptance Criteria:\\n- Collapsible sections\\n- Photo capture\\n- Signature pad\\n- Offline indicators" 1 "$EPIC6_ID" 5 | head -1
    sleep 0.3
    create_issue "Create Finding Documentation Component" "Build finding card component.\\n\\nDesign Reference: design-assets/inspection/22-finding-card.png\\n\\nAcceptance Criteria:\\n- Severity badges\\n- Photo gallery\\n- Location pin\\n- Action buttons" 2 "$EPIC6_ID" 3 | head -1
    sleep 0.3
    create_issue "Build Inspection Report Preview/Export" "Create report preview.\\n\\nDesign Reference: design-assets/inspection/23-report-preview.png\\n\\nAcceptance Criteria:\\n- PDF layout\\n- Findings summary\\n- Photo grid\\n- Export button" 2 "$EPIC6_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Consultant Selection and Scheduling UI" "Build consultant assignment.\\n\\nDesign Reference: design-assets/inspection/24-consultant-assignment.png\\n\\nAcceptance Criteria:\\n- Consultant list\\n- Specialty filter\\n- Calendar view\\n- Assign button" 2 "$EPIC6_ID" 2 | head -1
    sleep 0.3
    create_issue "Build Inspection History Timeline View" "Create inspection history.\\n\\nDesign Reference: design-assets/inspection/25-history-timeline.png\\n\\nAcceptance Criteria:\\n- Vertical timeline\\n- Status dots\\n- Inspector info\\n- Date filter" 2 "$EPIC6_ID" 2 | head -1
    sleep 0.3
fi

# Epic 7: RTL & Internationalization
echo -e "\n[EPIC] RTL & Internationalization"
EPIC7_ID=$(create_issue "[EPIC] RTL & Internationalization" "Implement Hebrew RTL support and bilingual infrastructure.\\n\\nPriority: P1 - High\\nEstimated Points: 8" 2 | tail -1)
sleep 0.5

if [ -n "$EPIC7_ID" ]; then
    create_issue "Implement RTL Layout Support" "Add RTL layout support.\\n\\nDesign Reference: design-assets/mobile/29-hebrew-rtl.png\\n\\nAcceptance Criteria:\\n- dir=rtl switching\\n- CSS logical properties\\n- Sidebar mirroring\\n- Icon flipping" 2 "$EPIC7_ID" 3 | head -1
    sleep 0.3
    create_issue "Add Hebrew Language Support" "Add Hebrew translations.\\n\\nAcceptance Criteria:\\n- i18n framework setup\\n- Hebrew translation file\\n- Language switcher\\n- Hebrew fonts\\n- Date formatting" 2 "$EPIC7_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Language Toggle UI" "Build language toggle component.\\n\\nAcceptance Criteria:\\n- Toggle in header\\n- EN/עב indicator\\n- Persist preference\\n- Seamless switch" 2 "$EPIC7_ID" 2 | head -1
    sleep 0.3
fi

# Epic 8: Mobile & Offline Experience
echo -e "\n[EPIC] Mobile & Offline Experience"
EPIC8_ID=$(create_issue "[EPIC] Mobile & Offline Experience" "Ensure mobile responsiveness and offline capability for field workers.\\n\\nPriority: P1 - High\\nEstimated Points: 10" 2 | tail -1)
sleep 0.5

if [ -n "$EPIC8_ID" ]; then
    create_issue "Implement Mobile-First Responsive Design" "Add responsive design.\\n\\nAcceptance Criteria:\\n- Breakpoints 375-1280px\\n- 44px touch targets\\n- Mobile navigation\\n- Responsive tables" 2 "$EPIC8_ID" 3 | head -1
    sleep 0.3
    create_issue "Build Offline Mode Interface" "Create offline mode UI.\\n\\nDesign Reference: design-assets/mobile/30-offline-mode.png\\n\\nAcceptance Criteria:\\n- Offline banner\\n- Sync status\\n- Queued items counter\\n- Last synced time" 2 "$EPIC8_ID" 3 | head -1
    sleep 0.3
    create_issue "Configure PWA for Installation" "Set up PWA.\\n\\nAcceptance Criteria:\\n- Web manifest\\n- Service worker\\n- Offline fallback\\n- Install prompt" 2 "$EPIC8_ID" 2 | head -1
    sleep 0.3
    create_issue "Optimize Touch Interactions" "Improve touch UX.\\n\\nAcceptance Criteria:\\n- touch-action manipulation\\n- Swipe gestures\\n- Pull-to-refresh\\n- Touch spacing" 2 "$EPIC8_ID" 2 | head -1
    sleep 0.3
fi

# Epic 9: Component Library
echo -e "\n[EPIC] Component Library"
EPIC9_ID=$(create_issue "[EPIC] Component Library" "Build reusable UI components based on the design system.\\n\\nPriority: P0 - Critical\\nEstimated Points: 13" 1 | tail -1)
sleep 0.5

if [ -n "$EPIC9_ID" ]; then
    create_issue "Create Button Component Variants" "Build button components.\\n\\nAcceptance Criteria:\\n- Primary, secondary, tertiary\\n- Danger button\\n- Loading state\\n- Icon button\\n- Size variants" 1 "$EPIC9_ID" 2 | head -1
    sleep 0.3
    create_issue "Build Card Component System" "Create card components.\\n\\nAcceptance Criteria:\\n- Base card\\n- Glassmorphism variant\\n- KPI card\\n- Feature card\\n- Project card" 1 "$EPIC9_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Form Input Components" "Build form components.\\n\\nAcceptance Criteria:\\n- Text input\\n- Textarea\\n- Select/dropdown\\n- Checkbox/radio\\n- Date picker\\n- File upload" 1 "$EPIC9_ID" 3 | head -1
    sleep 0.3
    create_issue "Build Data Display Components" "Create data components.\\n\\nAcceptance Criteria:\\n- Data table\\n- Badge/chip\\n- Status indicator\\n- Progress bar/ring\\n- Avatar\\n- Empty state" 2 "$EPIC9_ID" 3 | head -1
    sleep 0.3
    create_issue "Create Navigation Components" "Build navigation components.\\n\\nAcceptance Criteria:\\n- Top navbar\\n- Sidebar\\n- Bottom nav\\n- Breadcrumbs\\n- Tabs\\n- Stepper" 2 "$EPIC9_ID" 2 | head -1
    sleep 0.3
fi

# Epic 10: Animations & Micro-interactions
echo -e "\n[EPIC] Animations & Micro-interactions"
EPIC10_ID=$(create_issue "[EPIC] Animations & Micro-interactions" "Add polish with animations and micro-interactions.\\n\\nPriority: P2 - Medium\\nEstimated Points: 5" 3 | tail -1)
sleep 0.5

if [ -n "$EPIC10_ID" ]; then
    create_issue "Implement Transition System" "Add transition system.\\n\\nAcceptance Criteria:\\n- Transition tokens\\n- Page transitions\\n- Modal animations\\n- Respect reduced-motion" 3 "$EPIC10_ID" 2 | head -1
    sleep 0.3
    create_issue "Add Micro-interactions to Components" "Add micro-interactions.\\n\\nAcceptance Criteria:\\n- Hover/active states\\n- Card lift effect\\n- Loading states\\n- Feedback animations" 3 "$EPIC10_ID" 3 | head -1
    sleep 0.3
fi

echo -e "\n============================================================"
echo "COMPLETE: Created 10 Epics and 46 User Stories in Linear!"
echo "============================================================"
