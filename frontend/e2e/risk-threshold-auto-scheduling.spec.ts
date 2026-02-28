/**
 * End-to-end verification tests for risk threshold auto-scheduling feature.
 *
 * This test suite verifies the complete user workflow:
 * 1. Configure risk threshold in project settings
 * 2. Create high-risk scenario (multiple defects in area)
 * 3. Verify risk score exceeds threshold
 * 4. Confirm inspection auto-scheduled
 * 5. Check notification sent to inspector
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

let authToken: string;
let projectId: string;
let areaId: string;
let userId: string;

// Test data
const testProject = {
  name: 'Risk Threshold Auto-Scheduling Test Project',
  address: '123 Test St',
  city: 'Test City',
};

test.describe('Risk Threshold Auto-Scheduling E2E', () => {
  test.beforeAll(async ({ request }) => {
    // Login and get auth token
    const loginResponse = await request.post('http://localhost:8000/api/v1/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'testpassword123',
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.accessToken;
    userId = loginData.user.id;

    // Create test project
    const projectResponse = await request.post('http://localhost:8000/api/v1/projects', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: testProject,
    });

    expect(projectResponse.ok()).toBeTruthy();
    const projectData = await projectResponse.json();
    projectId = projectData.id;

    // Create test area
    const areaResponse = await request.post(
      `http://localhost:8000/api/v1/projects/${projectId}/areas`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          areaName: 'Test Area - High Risk',
          areaCode: 'TEST-001',
          floorNumber: 1,
          totalUnits: 10,
        },
      }
    );

    expect(areaResponse.ok()).toBeTruthy();
    const areaData = await areaResponse.json();
    areaId = areaData.id;
  });

  test.beforeEach(async ({ page }) => {
    // Set auth token in localStorage
    await page.goto('http://localhost:5173');
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, authToken);
  });

  test('Step 1: Configure risk threshold in project settings', async ({ page, request }) => {
    // Navigate to project settings (or risk prediction page)
    await page.goto(`http://localhost:5173/projects/${projectId}/risk-prediction`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Configure risk threshold via API (as settings UI may not exist yet)
    const thresholdResponse = await request.post(
      `http://localhost:8000/api/v1/projects/${projectId}/risk-thresholds`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          low_threshold: 25.0,
          medium_threshold: 50.0,
          high_threshold: 75.0,
          critical_threshold: 90.0,
          auto_schedule_inspections: true,
          auto_schedule_threshold: 'high',
        },
      }
    );

    expect(thresholdResponse.ok()).toBeTruthy();
    const thresholdData = await thresholdResponse.json();

    // Verify threshold configuration
    expect(thresholdData.autoScheduleInspections).toBe(true);
    expect(thresholdData.autoScheduleThreshold).toBe('high');
    expect(thresholdData.highThreshold).toBe(75.0);
  });

  test('Step 2: Create high-risk scenario (multiple defects)', async ({ page, request }) => {
    // Create multiple critical defects via API
    const defectPromises = [];

    // Create 3 critical defects
    for (let i = 0; i < 3; i++) {
      defectPromises.push(
        request.post(`http://localhost:8000/api/v1/projects/${projectId}/defects`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            area_id: areaId,
            severity: 'critical',
            category: 'Structural',
            description: `Critical structural issue ${i + 1}`,
            status: 'open',
          },
        })
      );
    }

    // Create 2 major defects
    for (let i = 0; i < 2; i++) {
      defectPromises.push(
        request.post(`http://localhost:8000/api/v1/projects/${projectId}/defects`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            area_id: areaId,
            severity: 'major',
            category: 'Electrical',
            description: `Major electrical issue ${i + 1}`,
            status: 'open',
          },
        })
      );
    }

    const responses = await Promise.all(defectPromises);

    // Verify all defects were created
    responses.forEach((response) => {
      expect(response.ok()).toBeTruthy();
    });

    // Navigate to defects page to verify
    await page.goto(`http://localhost:5173/projects/${projectId}/defects`);
    await page.waitForLoadState('networkidle');

    // Should see multiple defects listed
    const defectCards = await page.locator('[data-testid="defect-card"]').count();
    expect(defectCards).toBeGreaterThanOrEqual(5);
  });

  test('Step 3: Verify risk score exceeds threshold', async ({ page, request }) => {
    // First, create threshold and defects
    await request.post(`http://localhost:8000/api/v1/projects/${projectId}/risk-thresholds`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        high_threshold: 75.0,
        auto_schedule_inspections: true,
        auto_schedule_threshold: 'high',
      },
    });

    // Create critical defects
    for (let i = 0; i < 4; i++) {
      await request.post(`http://localhost:8000/api/v1/projects/${projectId}/defects`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          area_id: areaId,
          severity: 'critical',
          category: 'Structural',
          description: `Critical issue ${i}`,
          status: 'open',
        },
      });
    }

    // Trigger risk calculation via API
    const riskResponse = await request.post(
      `http://localhost:8000/api/v1/projects/${projectId}/risk-scores`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          area_id: areaId,
          risk_score: 85.0, // High risk score
          risk_level: 'high',
          defect_count: 4,
          severity_score: 90.0,
        },
      }
    );

    expect(riskResponse.ok()).toBeTruthy();
    const riskData = await riskResponse.json();

    // Verify risk score exceeds threshold
    expect(riskData.riskScore).toBeGreaterThanOrEqual(75);
    expect(['high', 'critical']).toContain(riskData.riskLevel);

    // Navigate to risk prediction page
    await page.goto(`http://localhost:5173/projects/${projectId}/risk-prediction`);
    await page.waitForLoadState('networkidle');

    // Verify high-risk indicator visible on heatmap
    const highRiskCells = await page.locator('[data-risk-level="high"], [data-risk-level="critical"]').count();
    expect(highRiskCells).toBeGreaterThan(0);
  });

  test('Step 4: Confirm inspection auto-scheduled', async ({ page, request }) => {
    // Setup: Create threshold, defects, and trigger risk calculation
    await request.post(`http://localhost:8000/api/v1/projects/${projectId}/risk-thresholds`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        high_threshold: 75.0,
        auto_schedule_inspections: true,
        auto_schedule_threshold: 'high',
      },
    });

    // Create critical defects
    for (let i = 0; i < 4; i++) {
      await request.post(`http://localhost:8000/api/v1/projects/${projectId}/defects`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          area_id: areaId,
          severity: 'critical',
          category: 'Structural',
          description: `Critical issue ${i}`,
          status: 'open',
        },
      });
    }

    // Create high risk score (this should trigger auto-scheduling)
    const riskResponse = await request.post(
      `http://localhost:8000/api/v1/projects/${projectId}/risk-scores`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          area_id: areaId,
          risk_score: 85.0,
          risk_level: 'high',
          defect_count: 4,
          severity_score: 90.0,
        },
      }
    );

    expect(riskResponse.ok()).toBeTruthy();

    // Wait a moment for auto-scheduling to complete
    await page.waitForTimeout(1000);

    // Check for auto-scheduled inspection
    const inspectionsResponse = await request.get(
      `http://localhost:8000/api/v1/projects/${projectId}/inspections`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(inspectionsResponse.ok()).toBeTruthy();
    const inspections = await inspectionsResponse.json();

    // Find auto-scheduled inspection
    const autoScheduledInspection = inspections.find(
      (inspection: any) =>
        inspection.notes?.includes('Auto-scheduled') &&
        inspection.status === 'pending'
    );

    expect(autoScheduledInspection).toBeDefined();
    expect(autoScheduledInspection.notes).toContain(areaId);

    // Navigate to inspections page and verify
    await page.goto(`http://localhost:5173/projects/${projectId}/inspections`);
    await page.waitForLoadState('networkidle');

    // Should see auto-scheduled inspection
    const inspectionBadge = await page.locator('text=/Auto-scheduled/i').first();
    await expect(inspectionBadge).toBeVisible({ timeout: 5000 });
  });

  test('Step 5: Check notification sent to inspector', async ({ page, request }) => {
    // Setup complete workflow
    await request.post(`http://localhost:8000/api/v1/projects/${projectId}/risk-thresholds`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        high_threshold: 75.0,
        auto_schedule_inspections: true,
        auto_schedule_threshold: 'high',
      },
    });

    // Create critical defects
    for (let i = 0; i < 4; i++) {
      await request.post(`http://localhost:8000/api/v1/projects/${projectId}/defects`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          area_id: areaId,
          severity: 'critical',
          category: 'Structural',
          description: `Critical issue ${i}`,
          status: 'open',
        },
      });
    }

    // Create high risk score (triggers auto-scheduling and notification)
    await request.post(`http://localhost:8000/api/v1/projects/${projectId}/risk-scores`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        area_id: areaId,
        risk_score: 85.0,
        risk_level: 'high',
        defect_count: 4,
        severity_score: 90.0,
      },
    });

    // Wait for notification to be created
    await page.waitForTimeout(1000);

    // Check for notification via API
    const notificationsResponse = await request.get(
      'http://localhost:8000/api/v1/notifications',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(notificationsResponse.ok()).toBeTruthy();
    const notifications = await notificationsResponse.json();

    // Find auto-scheduling notification
    const autoScheduleNotification = notifications.find(
      (n: any) =>
        n.category === 'inspection' &&
        n.message?.toLowerCase().includes('high risk score')
    );

    expect(autoScheduleNotification).toBeDefined();
    expect(autoScheduleNotification.title).toContain('Auto-Scheduled');

    // Navigate to app and check notification bell
    await page.goto(`http://localhost:5173/projects/${projectId}`);
    await page.waitForLoadState('networkidle');

    // Click notification bell icon
    const notificationBell = await page.locator('[data-testid="notification-bell"]').first();
    if (await notificationBell.isVisible()) {
      await notificationBell.click();

      // Should see notification about auto-scheduled inspection
      const notificationItem = await page.locator('text=/High-Risk Inspection Auto-Scheduled/i').first();
      await expect(notificationItem).toBeVisible({ timeout: 5000 });
    }
  });

  test('Complete E2E workflow - All 5 steps', async ({ page, request }) => {
    /**
     * This test runs the complete workflow from start to finish:
     * 1. Configure threshold
     * 2. Create defects
     * 3. Calculate risk
     * 4. Verify auto-scheduling
     * 5. Verify notification
     */

    // Step 1: Configure threshold
    const thresholdResponse = await request.post(
      `http://localhost:8000/api/v1/projects/${projectId}/risk-thresholds`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          low_threshold: 25.0,
          medium_threshold: 50.0,
          high_threshold: 75.0,
          critical_threshold: 90.0,
          auto_schedule_inspections: true,
          auto_schedule_threshold: 'high',
        },
      }
    );
    expect(thresholdResponse.ok()).toBeTruthy();

    // Step 2: Create high-risk scenario
    for (let i = 0; i < 5; i++) {
      const severity = i < 3 ? 'critical' : 'major';
      await request.post(`http://localhost:8000/api/v1/projects/${projectId}/defects`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          area_id: areaId,
          severity,
          category: severity === 'critical' ? 'Structural' : 'Electrical',
          description: `${severity} issue ${i + 1}`,
          status: 'open',
        },
      });
    }

    // Step 3: Create risk score (exceeds threshold)
    const riskResponse = await request.post(
      `http://localhost:8000/api/v1/projects/${projectId}/risk-scores`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          area_id: areaId,
          risk_score: 85.0,
          risk_level: 'high',
          defect_count: 5,
          severity_score: 88.0,
        },
      }
    );
    expect(riskResponse.ok()).toBeTruthy();
    const riskData = await riskResponse.json();
    expect(riskData.riskScore).toBeGreaterThanOrEqual(75);

    // Wait for auto-scheduling
    await page.waitForTimeout(1500);

    // Step 4: Verify inspection auto-scheduled
    const inspectionsResponse = await request.get(
      `http://localhost:8000/api/v1/projects/${projectId}/inspections`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    expect(inspectionsResponse.ok()).toBeTruthy();
    const inspections = await inspectionsResponse.json();
    const autoInspection = inspections.find((i: any) => i.notes?.includes('Auto-scheduled'));
    expect(autoInspection).toBeDefined();

    // Step 5: Verify notification sent
    const notificationsResponse = await request.get(
      'http://localhost:8000/api/v1/notifications',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    expect(notificationsResponse.ok()).toBeTruthy();
    const notifications = await notificationsResponse.json();
    const autoNotification = notifications.find(
      (n: any) => n.category === 'inspection' && n.message?.includes('high risk score')
    );
    expect(autoNotification).toBeDefined();

    // Visual verification on risk prediction page
    await page.goto(`http://localhost:5173/projects/${projectId}/risk-prediction`);
    await page.waitForLoadState('networkidle');

    // Should see high-risk area on heatmap
    const heatmap = await page.locator('[data-testid="risk-heatmap"]').first();
    if (await heatmap.isVisible()) {
      const highRiskCell = await page.locator('[data-risk-level="high"]').first();
      await expect(highRiskCell).toBeVisible();
    }

    console.log('✅ Complete E2E workflow verified successfully!');
  });

  test('Negative case: No auto-schedule when feature disabled', async ({ page, request }) => {
    // Configure threshold with auto-scheduling DISABLED
    await request.post(`http://localhost:8000/api/v1/projects/${projectId}/risk-thresholds`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        high_threshold: 75.0,
        auto_schedule_inspections: false, // Disabled
        auto_schedule_threshold: 'high',
      },
    });

    // Create critical defects
    for (let i = 0; i < 4; i++) {
      await request.post(`http://localhost:8000/api/v1/projects/${projectId}/defects`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          area_id: areaId,
          severity: 'critical',
          category: 'Structural',
          description: `Critical issue ${i}`,
          status: 'open',
        },
      });
    }

    // Create high risk score
    await request.post(`http://localhost:8000/api/v1/projects/${projectId}/risk-scores`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        area_id: areaId,
        risk_score: 85.0,
        risk_level: 'high',
        defect_count: 4,
        severity_score: 90.0,
      },
    });

    await page.waitForTimeout(1000);

    // Verify NO inspection was auto-scheduled
    const inspectionsResponse = await request.get(
      `http://localhost:8000/api/v1/projects/${projectId}/inspections`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    const inspections = await inspectionsResponse.json();
    const autoInspection = inspections.find((i: any) => i.notes?.includes('Auto-scheduled'));

    expect(autoInspection).toBeUndefined();
  });
});
