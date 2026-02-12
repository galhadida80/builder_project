# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-30
**QA Session**: 1
**Iteration**: 1 / 50

---

## Summary

The implementation is **95% complete** and almost ready for production. However, **1 critical UX bug** was found that must be fixed before sign-off.

**Issue**: The meeting creation form collects an "End Time" from users but never uses it, creating false expectations.

---

## Critical Issues to Fix

### 1. Remove Unused "End Time" Field from Meeting Form

**Severity**: CRITICAL (blocks sign-off)
**File**: `frontend/src/pages/MeetingsPage.tsx`
**Lines to Modify**: 54-55, 85, 262-271

#### Problem Statement

The meeting form has an "End Time" input field that:
- Collects user input (marked as "required")
- Never sends the value to the API
- Creates false expectations that end time will be saved
- Backend has NO support for end times (no `end_time` field in database)

#### Context from Spec

From `spec.md`:
- Line 27: "Out of Scope: Adding end time storage to backend"
- Line 66: "No `endTime` field exists in backend"
- Line 156: Edge case requirement - "Where end time was shown, decide how to handle (e.g., show 'scheduled for HH:MM' instead of 'HH:MM - HH:MM')"

The spec explicitly states that end time functionality should be REMOVED, not just ignored.

#### Required Changes

**Change 1**: Remove `endTime` from form state initialization (Lines 54-55)

**Current code:**
```typescript
const [formData, setFormData] = useState({
  title: '',
  meetingType: '',
  description: '',
  location: '',
  date: '',
  startTime: '',
  endTime: ''  // ← REMOVE THIS LINE
})
```

**Fixed code:**
```typescript
const [formData, setFormData] = useState({
  title: '',
  meetingType: '',
  description: '',
  location: '',
  date: '',
  startTime: ''
  // endTime removed
})
```

---

**Change 2**: Remove `endTime` from form reset (Line 85)

**Current code:**
```typescript
setFormData({ title: '', meetingType: '', description: '', location: '', date: '', startTime: '', endTime: '' })
```

**Fixed code:**
```typescript
setFormData({ title: '', meetingType: '', description: '', location: '', date: '', startTime: '' })
```

---

**Change 3**: Remove the "End Time" TextField component (Lines 262-271)

**Current code:**
```tsx
<Box sx={{ display: 'flex', gap: 2 }}>
  <TextField
    fullWidth
    label="Date"
    type="date"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    required
    value={formData.date}
    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
  />
  <TextField
    fullWidth
    label="Start Time"
    type="time"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    required
    value={formData.startTime}
    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
  />
  <TextField
    fullWidth
    label="End Time"  // ← REMOVE THIS ENTIRE TextField
    type="time"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    required
    value={formData.endTime}
    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
  />
</Box>
```

**Fixed code:**
```tsx
<Box sx={{ display: 'flex', gap: 2 }}>
  <TextField
    fullWidth
    label="Date"
    type="date"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    required
    value={formData.date}
    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
  />
  <TextField
    fullWidth
    label="Start Time"
    type="time"
    margin="normal"
    InputLabelProps={{ shrink: true }}
    required
    value={formData.startTime}
    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
  />
  {/* End Time TextField removed - backend doesn't support end times */}
</Box>
```

#### Implementation Steps

1. **Read the file**: `frontend/src/pages/MeetingsPage.tsx`

2. **Make the 3 changes above** using the Edit tool

3. **Verify the fix**:
   ```bash
   grep -n 'endTime' frontend/src/pages/MeetingsPage.tsx
   ```
   Expected: No matches found (or only in comments)

4. **Commit the changes**:
   ```bash
   git add frontend/src/pages/MeetingsPage.tsx
   git commit -m "fix: remove unused end time field from meeting form (qa-requested)"
   ```

#### Verification Criteria

After the fix, QA will verify:
- [ ] No `endTime` in form state object
- [ ] No "End Time" TextField in the form
- [ ] Form only collects: title, meetingType, description, location, date, startTime
- [ ] Grep search for `endTime` in MeetingsPage.tsx returns no results (except possibly comments)
- [ ] Meeting creation still works (sends scheduledDate to API)

---

## What's Already Correct (Don't Change)

✅ **DO NOT** modify these - they are already correct:
- `frontend/src/types/index.ts` - Meeting interface is correct
- `frontend/src/pages/DashboardPage.tsx` - Dashboard display is correct
- `frontend/src/mocks/data.ts` - Mock data is correct
- `frontend/src/api/meetings.ts` - API interface is correct
- Lines 82, 169, 173, 303, 307 in MeetingsPage.tsx - These correctly use scheduledDate

✅ **Keep** the `startTime` form field - it's used to create the `scheduledDate` ISO string (line 82)

---

## Expected Outcome

After this fix:
1. Meeting form will only show Date and Start Time inputs
2. Users won't be misled about end time functionality
3. Form will match backend capabilities (no end time storage)
4. Spec requirement will be fulfilled (end time UI removed)
5. QA will re-run and approve

---

## After Fixes

Once you complete the fix:

1. ✅ Commit with message: `fix: remove unused end time field from meeting form (qa-requested)`
2. ✅ Update subtask status if needed
3. ✅ QA Agent will automatically re-run validation
4. ✅ If fix is correct, QA will approve and sign-off

---

## Questions?

If anything is unclear about this fix request:
1. Re-read the spec.md (lines 27, 66, 156)
2. Check the backend schema (backend/app/models/meeting.py line 26-27)
3. Review the QA report (qa_report.md) for full context

The fix is straightforward - remove 3 references to `endTime` from the meeting form.

---

**Ready to fix!** 🔧
