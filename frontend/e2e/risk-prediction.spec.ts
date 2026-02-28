import { test, expect } from '@playwright/test';

/**
 * E2E Test: Risk Prediction & Defect Scoring Flow
 *
 * This test verifies the complete risk prediction workflow:
 * 1. Create historical defects in test project
 * 2. Trigger risk score calculation via API
 * 3. Verify risk scores stored in database
 * 4. Load risk prediction dashboard in browser
 * 5. Verify heatmap displays high-risk areas
 * 6. Open pre-inspection briefing
 * 7. Verify predicted defect types shown
 * 8. Check trend analysis charts render correctly
 */

test.describe('Risk Prediction Flow', () => {
  let authToken: string;
  let projectId: string;
  let areaIds: string[] = [];
  let inspectionId: string;

  test.beforeAll(async ({ request }) => {
    // Login and get auth token
    const loginResponse = await request.post('/api/v1/auth/login', {
      data: {
        email: 'test@builderops.com',
        password: 'testpassword123'
      }
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.accessToken;
  });

  test.beforeEach(async ({ request }) => {
    // Create test project
    const projectResponse = await request.post('/api/v1/projects', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        project_name: 'Risk Prediction Test Project',
        project_code: `RISK-${Date.now()}`,
        project_type: 'residential',
        status: 'active'
      }
    });
    expect(projectResponse.ok()).toBeTruthy();
    const projectData = await projectResponse.json();
    projectId = projectData.id;

    // Create multiple construction areas
    for (let floor = 1; floor <= 3; floor++) {
      const areaResponse = await request.post(`/api/v1/projects/${projectId}/areas`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          area_code: `FL${floor}`,
          floor_number: floor,
          total_units: 10
        }
      });
      expect(areaResponse.ok()).toBeTruthy();
      const areaData = await areaResponse.json();
      areaIds.push(areaData.id);
    }
  });

  test('Step 1-3: Create historical defects and trigger risk calculation', async ({ request }) => {
    // Create historical defects with varying severity in different areas
    const defectData = [
      // High-risk area: Floor 1 - multiple critical defects
      { areaId: areaIds[0], severity: 'critical', category: 'Structural', description: 'Foundation crack' },
      { areaId: areaIds[0], severity: 'critical', category: 'Waterproofing', description: 'Water intrusion' },
      { areaId: areaIds[0], severity: 'major', category: 'Structural', description: 'Column misalignment' },

      // Medium-risk area: Floor 2 - some major defects
      { areaId: areaIds[1], severity: 'major', category: 'Electrical', description: 'Wiring issue' },
      { areaId: areaIds[1], severity: 'minor', category: 'Finishing', description: 'Paint quality' },

      // Low-risk area: Floor 3 - minor defects only
      { areaId: areaIds[2], severity: 'minor', category: 'Finishing', description: 'Tile alignment' }
    ];

    for (const defect of defectData) {
      const defectResponse = await request.post(`/api/v1/projects/${projectId}/defects`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          area_id: defect.areaId,
          severity: defect.severity,
          category: defect.category,
          description: defect.description,
          status: 'open'
        }
      });
      expect(defectResponse.ok()).toBeTruthy();
    }

    // Trigger risk score calculation for all areas
    for (const areaId of areaIds) {
      const riskResponse = await request.post(`/api/v1/projects/${projectId}/risk-scores`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          area_id: areaId
        }
      });
      expect(riskResponse.ok()).toBeTruthy();
    }

    // Verify risk scores were created
    const riskScoresResponse = await request.get(`/api/v1/projects/${projectId}/risk-scores`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(riskScoresResponse.ok()).toBeTruthy();
    const riskScores = await riskScoresResponse.json();
    expect(riskScores).toHaveLength(3);

    // Verify risk levels are calculated correctly
    const floor1Score = riskScores.find((rs: any) => rs.areaId === areaIds[0]);
    const floor2Score = riskScores.find((rs: any) => rs.areaId === areaIds[1]);
    const floor3Score = riskScores.find((rs: any) => rs.areaId === areaIds[2]);

    expect(floor1Score.riskLevel).toBe('high');  // Should be high due to critical defects
    expect(floor2Score.riskLevel).toBe('medium');  // Should be medium
    expect(floor3Score.riskLevel).toBe('low');  // Should be low
    expect(floor1Score.riskScore).toBeGreaterThan(floor2Score.riskScore);
    expect(floor2Score.riskScore).toBeGreaterThan(floor3Score.riskScore);
  });

  test('Step 4-5: Load risk prediction dashboard and verify heatmap', async ({ page }) => {
    // Setup: Create some defects and risk scores
    await test.step('Create test data', async () => {
      const { request } = page;

      // Create defects
      await request.post(`/api/v1/projects/${projectId}/defects`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          area_id: areaIds[0],
          severity: 'critical',
          category: 'Structural',
          description: 'Test defect',
          status: 'open'
        }
      });

      // Create risk score
      await request.post(`/api/v1/projects/${projectId}/risk-scores`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { area_id: areaIds[0] }
      });
    });

    // Login to frontend
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@builderops.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to risk prediction dashboard
    await page.goto(`/risk-prediction?projectId=${projectId}`);
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h4, h5, h6').filter({ hasText: /risk.*prediction/i }).first()).toBeVisible();

    // Verify KPI cards are displayed
    const kpiCards = page.locator('[role="region"]').filter({ has: page.locator('text=/high.*risk/i, text=/total.*areas/i') });
    await expect(kpiCards.first()).toBeVisible();

    // Verify heatmap component renders
    const heatmap = page.locator('text=/risk.*heatmap/i, text=/floor.*plan/i').first();
    await expect(heatmap).toBeVisible();

    // Verify floor selector chips
    const floorChips = page.locator('[role="button"]').filter({ hasText: /floor/i });
    expect(await floorChips.count()).toBeGreaterThan(0);

    // Verify risk level color indicators
    const riskAreas = page.locator('[data-testid="risk-area-cell"], [class*="risk"]').filter({
      has: page.locator('[style*="background"], [style*="color"]')
    });
    expect(await riskAreas.count()).toBeGreaterThan(0);

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.waitForTimeout(1000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('Step 6-7: Open pre-inspection briefing and verify predicted defects', async ({ page, request }) => {
    // Setup: Create inspection with high-risk area
    await test.step('Create test data', async () => {
      // Create defects in area
      await request.post(`/api/v1/projects/${projectId}/defects`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          area_id: areaIds[0],
          severity: 'critical',
          category: 'Structural',
          description: 'Structural issue',
          status: 'open'
        }
      });

      // Create risk score
      await request.post(`/api/v1/projects/${projectId}/risk-scores`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { area_id: areaIds[0] }
      });

      // Get consultant type for inspection
      const consultantTypesResponse = await request.get('/api/v1/reference-data/consultant-types', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const consultantTypes = await consultantTypesResponse.json();
      const consultantTypeId = consultantTypes[0]?.id;

      // Create inspection
      const inspectionResponse = await request.post(`/api/v1/projects/${projectId}/inspections`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          consultant_type_id: consultantTypeId,
          scheduled_date: new Date().toISOString(),
          status: 'scheduled'
        }
      });
      const inspectionData = await inspectionResponse.json();
      inspectionId = inspectionData.id;
    });

    // Login to frontend
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@builderops.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to pre-inspection briefing
    await page.goto(`/inspections/${inspectionId}/briefing`);
    await page.waitForLoadState('networkidle');

    // Verify briefing header
    await expect(page.locator('text=/pre.*inspection.*briefing/i, text=/risk.*briefing/i').first()).toBeVisible();

    // Verify overall risk level is displayed
    const riskLevelBadge = page.locator('text=/overall.*risk/i, text=/risk.*level/i').first();
    await expect(riskLevelBadge).toBeVisible();

    // Verify high-risk areas section
    const highRiskSection = page.locator('text=/high.*risk.*area/i, text=/focus.*area/i').first();
    await expect(highRiskSection).toBeVisible();

    // Verify predicted defect types are shown as chips/tags
    const defectTypeChips = page.locator('[role="button"], .MuiChip-root').filter({ hasText: /structural|electrical|waterproofing|finishing/i });
    expect(await defectTypeChips.count()).toBeGreaterThan(0);

    // Verify historical defect count
    const defectCount = page.locator('text=/\\d+.*defect/i');
    await expect(defectCount.first()).toBeVisible();

    // Verify recommendations section
    const recommendations = page.locator('text=/recommendation/i, text=/focus.*on/i').first();
    await expect(recommendations).toBeVisible();
  });

  test('Step 8: Verify trend analysis charts render correctly', async ({ page }) => {
    // Setup: Create varied historical defects
    await test.step('Create test data', async () => {
      const { request } = page;

      // Create defects across different categories and floors
      const categories = ['Structural', 'Electrical', 'Waterproofing', 'Finishing'];
      const severities = ['critical', 'major', 'minor'];

      for (let i = 0; i < 10; i++) {
        await request.post(`/api/v1/projects/${projectId}/defects`, {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            area_id: areaIds[i % areaIds.length],
            severity: severities[i % severities.length],
            category: categories[i % categories.length],
            description: `Test defect ${i}`,
            status: 'open'
          }
        });
      }
    });

    // Login to frontend
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@builderops.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to risk prediction page (contains trend analysis)
    await page.goto(`/risk-prediction?projectId=${projectId}`);
    await page.waitForLoadState('networkidle');

    // Scroll to trend analysis section
    const trendSection = page.locator('text=/trend.*analysis/i, text=/defect.*pattern/i').first();
    await trendSection.scrollIntoViewIfNeeded();

    // Verify trend analysis tabs (by trade, floor, phase, season)
    const tabs = page.locator('[role="tab"]').filter({ hasText: /trade|floor|phase|season/i });
    expect(await tabs.count()).toBeGreaterThanOrEqual(4);

    // Test each tab
    for (const tabName of ['trade', 'floor', 'phase', 'season']) {
      await test.step(`Verify ${tabName} trend analysis`, async () => {
        const tab = page.locator(`[role="tab"]`).filter({ hasText: new RegExp(tabName, 'i') });
        if (await tab.isVisible()) {
          await tab.click();
          await page.waitForTimeout(500);

          // Verify chart renders (look for SVG elements from MUI X Charts)
          const charts = page.locator('svg[class*="MuiChart"], canvas, [class*="recharts"]');
          expect(await charts.count()).toBeGreaterThan(0);
        }
      });
    }

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.waitForTimeout(1000);
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('Mobile responsiveness check', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@builderops.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to risk prediction
    await page.goto(`/risk-prediction?projectId=${projectId}`);
    await page.waitForLoadState('networkidle');

    // Verify layout doesn't overflow
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(375);

    // Verify key components are visible on mobile
    await expect(page.locator('h4, h5, h6').first()).toBeVisible();

    // Heatmap should be responsive
    const heatmap = page.locator('text=/risk.*heatmap/i, text=/floor.*plan/i').first();
    const heatmapBox = await heatmap.boundingBox();
    if (heatmapBox) {
      expect(heatmapBox.width).toBeLessThanOrEqual(375);
    }
  });
});
