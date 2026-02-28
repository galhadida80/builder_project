# AI Narrative Quality Validation Guide

## Purpose
This guide helps validate the quality of AI-generated report narratives to ensure they meet production standards for coherence, accuracy, data relevance, and language correctness.

## Test Scope
This manual test validates:
- **Coherent narrative**: Logical flow, professional tone, proper structure
- **Accurate data**: Numbers match source data, correct calculations
- **Relevant photos**: AI-selected photos are contextually appropriate
- **Proper charts**: Visualizations are correct and meaningful
- **Correct language**: Hebrew and English translations are accurate and natural

## Prerequisites
1. Backend server running (`uvicorn app.main:app --reload`)
2. Database with test project data (equipment, inspections, approvals, RFIs)
3. Valid `GOOGLE_AI_API_KEY` in environment
4. Test user with project access

## Test Reports

### 1. Weekly Progress Report (AI)
**Endpoint**: `POST /api/v1/projects/{project_id}/reports/generate-weekly`

**Test Cases**:
- [ ] **TC-WP-001**: Generate English weekly report
- [ ] **TC-WP-002**: Generate Hebrew weekly report
- [ ] **TC-WP-003**: Generate report with date range (1 week)
- [ ] **TC-WP-004**: Generate report with date range (1 month)

**Quality Validation Checklist**:
- [ ] Executive summary is concise (2-3 sentences) and captures key points
- [ ] Accomplishments list is accurate and relevant
- [ ] Concerns/issues are properly identified
- [ ] Narrative flows logically with proper paragraphs (3-5)
- [ ] Numbers match actual project data (inspections, approvals, etc.)
- [ ] Charts are embedded correctly (progress, inspection stats)
- [ ] Photos are contextually relevant to the time period
- [ ] Language is professional and natural (not translated word-for-word)
- [ ] Hebrew text uses proper RTL formatting
- [ ] PDF renders without errors

### 2. Inspection Summary Report (AI)
**Endpoint**: `POST /api/v1/projects/{project_id}/reports/generate-inspection-summary`

**Test Cases**:
- [ ] **TC-IS-001**: Generate English inspection summary
- [ ] **TC-IS-002**: Generate Hebrew inspection summary
- [ ] **TC-IS-003**: Generate summary with multiple inspections
- [ ] **TC-IS-004**: Generate summary with findings and photos

**Quality Validation Checklist**:
- [ ] Executive summary accurately reflects inspection scope
- [ ] Key findings are extracted correctly from inspection data
- [ ] Detailed analysis is coherent and actionable
- [ ] Recommendations are practical and relevant
- [ ] Severity counts match actual inspection findings
- [ ] Charts display correct inspection statistics
- [ ] Photos are relevant to findings (not random)
- [ ] Photo captions describe the actual content
- [ ] Language is technically accurate for construction domain
- [ ] PDF layout is professional and readable

### 3. Executive Summary Report (AI)
**Endpoint**: Manual generation via service layer

**Test Cases**:
- [ ] **TC-ES-001**: Generate English executive summary
- [ ] **TC-ES-002**: Generate Hebrew executive summary
- [ ] **TC-ES-003**: Generate summary for large project
- [ ] **TC-ES-004**: Generate summary for project with issues

**Quality Validation Checklist**:
- [ ] Project health indicator matches actual status
- [ ] Key metrics are accurate (activity count, inspections, etc.)
- [ ] Critical items are properly prioritized
- [ ] Accomplishments reflect actual progress
- [ ] Concerns & risks are identified appropriately
- [ ] Activity breakdown percentages are correct
- [ ] Upcoming milestones are relevant and timely
- [ ] AI-generated summary is digestible for executives
- [ ] Language is high-level (not overly technical)

## Validation Procedure

### Step 1: Generate Test Reports
Run the validation script to generate sample reports:
```bash
cd backend
python tests/manual/validate_ai_narrative_quality.py --project-id <uuid>
```

This will create:
- `test_weekly_report_en.pdf`
- `test_weekly_report_he.pdf`
- `test_inspection_summary_en.pdf`
- `test_inspection_summary_he.pdf`

### Step 2: Review Narrative Coherence
Open each PDF and read the narrative sections:
- Is the text grammatically correct?
- Does it flow logically from one section to the next?
- Are sentences complete and well-structured?
- Is the tone professional and appropriate?
- Are there any awkward phrasings or repetitions?

### Step 3: Verify Data Accuracy
Compare narrative claims with actual project data:
- Count inspections, approvals, RFIs in the database
- Check dates mentioned in the narrative
- Verify percentages and statistics
- Confirm milestone references
- Validate severity distributions

### Step 4: Check Photo Relevance
Review AI-selected photos:
- Do photos relate to the narrative content?
- Are photos from the correct time period?
- Do captions accurately describe the images?
- Is photo quality acceptable for reports?
- Are privacy/sensitive areas properly handled?

### Step 5: Validate Charts
Inspect embedded charts:
- Do chart values match data tables?
- Are axes labeled correctly?
- Is color coding meaningful?
- Are charts readable at PDF size?
- Do RTL charts display correctly in Hebrew reports?

### Step 6: Language Quality Assessment
For both Hebrew and English versions:
- Is vocabulary appropriate for construction domain?
- Are translations natural (not literal)?
- Is terminology consistent throughout?
- Are names/titles transliterated correctly?
- Does Hebrew text render with proper RTL formatting?

## Known Issues & Limitations

### Current Limitations
1. **Photo Selection**: AI relies on metadata; photos without good descriptions may not be selected optimally
2. **Context Window**: Very large projects may exceed Gemini API context limits
3. **Hallucination Risk**: AI may occasionally infer details not explicitly in data
4. **Translation Quality**: Hebrew technical terms may vary from industry standards

### Acceptable Quality Thresholds
- **Narrative Coherence**: 90%+ sentences should be grammatically correct and logical
- **Data Accuracy**: 100% of numbers must match source data exactly
- **Photo Relevance**: 80%+ photos should be contextually appropriate
- **Chart Accuracy**: 100% of chart values must be correct
- **Language Quality**: 85%+ natural-sounding, professional language

## Reporting Issues

If quality issues are found, document:
1. **Test Case ID** (e.g., TC-WP-001)
2. **Issue Type** (coherence, accuracy, relevance, chart, language)
3. **Description**: What's wrong and what was expected
4. **Severity**: Critical (blocks release) / Major (degraded quality) / Minor (cosmetic)
5. **Screenshot/Excerpt**: Evidence of the issue
6. **Reproduction Steps**: How to recreate the issue

Submit issues to: `.auto-claude/specs/228-ai-automated-report-generation/qa-issues.md`

## Sign-Off Criteria

To pass AI narrative quality validation:
- [ ] All test cases executed successfully
- [ ] All quality checklists reviewed
- [ ] No critical issues found
- [ ] Major issues documented and tracked
- [ ] Accuracy thresholds met (100% data accuracy, 90%+ coherence)
- [ ] Both Hebrew and English reports validated
- [ ] Reports reviewed by at least one native Hebrew speaker
- [ ] Reports reviewed by at least one construction domain expert

**Validator Name**: _________________
**Date**: _________________
**Sign-off**: ☐ PASS ☐ FAIL ☐ CONDITIONAL PASS (with tracked issues)
