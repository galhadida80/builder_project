# Quick Start Guide: Manual Testing for Task 026

## 🚀 Quick Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

Server should start at: **http://localhost:3000**

## 🎯 Quick Test Checklist

Open the Areas page: `http://localhost:3000/projects/:projectId/areas`

Click "Add Area" button to open the form dialog.

### ✅ 10 Required Tests

| # | Action | Expected Result | ✓ |
|---|--------|----------------|---|
| 1 | Leave "Area Name" empty, tab away | ❌ Error: "Area Name is required" | ☐ |
| 2 | Enter "!@#$" in "Area Code", tab away | ❌ Error about format | ☐ |
| 3 | Enter existing area code (case-insensitive) | ❌ Error: "Area Code already exists" | ☐ |
| 4 | Enter "3.5" in "Floor Number", tab away | ❌ Error: "must be a whole number" | ☐ |
| 5 | Enter "0" in "Total Units", tab away | ❌ Error: "must be greater than zero" | ☐ |
| 6 | Enter "-5" in "Total Units", tab away | ❌ Error: "must be greater than zero" | ☐ |
| 7 | Fill all fields correctly, submit | ✅ Success! Area created | ☐ |
| 8 | Make error, then correct it | ✅ Error message clears | ☐ |
| 9 | Try to submit with errors present | ❌ Button disabled/grayed out | ☐ |
| 10 | Open browser console (F12) | ✅ No console errors | ☐ |

## 📋 Valid Test Data Example

Use these values for Test #7 (successful submission):

```
Area Name:     Test Apartment 101
Area Code:     TEST-APT-101
Area Type:     Apartment (select from dropdown)
Parent Area:   None (Top Level)
Floor Number:  5
Total Units:   12
```

## 🔍 What to Look For

### Error Display ❌
- Red text below the input field
- Input field gets red outline
- Submit button becomes disabled (grayed out)

### Success State ✅
- No red text or red outlines
- Submit button is enabled (blue/clickable)
- Form submits and dialog closes
- New area appears in the list

### Error Clearing 🔄
- Enter invalid data → see error
- Fix the data → error disappears immediately (on blur)

## 🐛 Common Issues

**Issue:** Frontend won't start
- **Fix:** Run `npm install` first
- **Check:** Node.js version (should be 18+)

**Issue:** Can't test uniqueness (Test #3)
- **Fix:** Create at least one area first
- **Then:** Try to create another with same area code

**Issue:** Backend not running
- **Fix:** Start backend server (check main project README)
- **Expected:** Backend at `http://localhost:8000`

## 📝 How to Report Results

After testing, update the manual-testing-verification.md file:

1. Mark each test as PASS or FAIL
2. Document any issues found
3. Add your name and date in the Sign-off section

## ⚡ Speed Testing (5 minutes)

If you're short on time, run these critical tests:

1. **Test 4** (decimal floor) → Should reject "3.5"
2. **Test 5** (zero units) → Should reject "0"
3. **Test 7** (valid data) → Should succeed
4. **Test 10** (console) → Should be clean

These 4 tests cover the core new functionality.

## ✨ Bonus Tests (Optional)

- Enter only spaces in Area Name → should show "required" error
- Enter 300-character name → should show "max length" error
- Cancel dialog with errors → should reset form on reopen

## 📞 Need Help?

- Full test documentation: `manual-testing-verification.md`
- Implementation details: `build-progress.txt`
- Spec: `spec.md`

---

**Estimated Time:** 15-20 minutes for all 10 tests
**Critical Tests:** 4, 5, 7, 10 (core new features)

Happy Testing! 🎉
