# 🎯 Steps 6-15: Frontend Updates - Quick Reference

**Status**: Ready to begin  
**Approach**: Update existing HTML files with new sections and JavaScript functionality  
**Constraint**: All changes integrate into existing files - no new files created

---

## Step 6: Dashboard HTML Enhancement

**File**: `/Netology/docs/dashboard.html`

**Add to each major section:**
```html
<!-- Add data-tour attributes for onboarding spotlight -->
<section data-tour="dashboard-header">...</section>
<section data-tour="courses-section">...</section>
<section data-tour="progress-widget">...</section>
<section data-tour="achievements-section">...</section>
<section data-tour="challenges-section">...</section>
<a data-tour="sandbox-link">...</a>
<button data-tour="first-lesson-btn">...</button>
```

**Load dynamic content:**
- Challenges from `/api/user/challenges?type=daily`
- Achievements from `/api/user/achievements`
- Progress stats from `/api/user/progress/stats`

---

## Step 7: Progress Page Complete Redesign

**File**: `/Netology/docs/progress.html`

**Replace with tabbed interface:**
```
Tabs: All | In Progress | Completed | Achievements | Activity Heatmap
```

**Tab 1 - All Courses:**
- List from `/api/user/progress`
- Show progress bar for each

**Tab 2 - In Progress:**
- Filter courses with `completed=false`

**Tab 3 - Completed:**
- Filter courses with `completed=true`
- Show completion date

**Tab 4 - Achievements:**
- Get unlocked from `/api/user/achievements`
- Display with icons and descriptions

**Tab 5 - Activity Heatmap:**
- Get activity from `/api/user/activity?range=365`
- Render GitHub-style heatmap
- Show streaks from `/api/user/streaks`

---

## Step 8: Courses Slide-Based Redesign

**File**: `/Netology/docs/courses.html`

**Convert to carousel:**
- Use Bootstrap carousel or similar
- 9 course "slides" (one per course)
- Each slide shows:
  - Course title
  - Difficulty badge (Novice/Intermediate/Advanced)
  - Progress bar
  - XP reward
  - Estimated time
  - "Start Course" button

**Add filtering:**
- By difficulty level
- By category
- By completion status

---

## Step 9: Account/Settings Redesign

**File**: `/Netology/docs/account.html`

**New sections:**
1. **Profile Info**
   - Display name, email, level, XP
   - Edit button (optional)

2. **Theme Settings**
   ```javascript
   fetch('/api/user/preferences')
   .then(r => r.json())
   .then(data => {
     document.body.classList.toggle('dark-mode', data.theme === 'dark');
   })
   ```

3. **Font Preferences**
   - Standard font
   - Dyslexia-friendly font (OpenDyslexic)
   - Toggle & save to `/api/user/preferences`

4. **Notification Settings**
   - Toggle notifications
   - POST to `/api/user/preferences`

5. **Learning Preferences**
   - Reduced motion toggle
   - Save to database

6. **Account Actions**
   - Change password
   - Logout
   - Delete account (optional)

---

## Step 10: Lesson Slide Viewer

**File**: `/Netology/docs/lesson.html`

**Add slide navigation:**
```javascript
// Fetch slides for lesson
fetch(`/api/lessons/${lessonId}/slides`)
.then(r => r.json())
.then(data => {
  // Create slide viewer with:
  // - Previous/Next buttons
  // - Slide number indicator
  // - Progress bar
  // - Complete button
  // - Bookmark button
  // - Notes section
})
```

**Slide viewer features:**
- Display slide content (text, code, images, videos)
- Mark slide complete (POST `/api/lessons/{id}/slides/{id}/complete`)
- Save notes (POST `/api/slides/{id}/notes`)
- Toggle bookmarks (POST `/api/slides/{id}/bookmark`)
- View bookmarks (GET `/api/user/bookmarks`)

---

## Step 11: Sandbox Console

**File**: `/Netology/docs/sandbox.html`

**Add command execution console:**
```javascript
// Get allowed commands
fetch('/api/sandbox/allowed-commands')
.then(r => r.json())
.then(data => {
  // Show dropdown of: ping, ipconfig, traceroute, nslookup, whoami, hostname, netstat, arp
})

// Execute command
fetch('/api/sandbox/execute-command', {
  method: 'POST',
  body: JSON.stringify({
    command: 'ping',
    args: ['example.com']
  })
})
.then(r => r.json())
.then(data => {
  // Display output in console
  document.getElementById('console-output').textContent = data.output;
})
```

**Features:**
- Command selector dropdown
- Arguments input field
- Execute button
- Output display area
- Command history (optional)

---

## Step 12: Index Page Visual Refresh

**File**: `/Netology/docs/index.html`

**Updates:**
- Enhance hero section with better typography
- Add feature cards with icons
- Improve CTA (Call-to-Action) buttons
- Add statistics section:
  - "9 Courses Available"
  - "26 Database Tables"
  - "54 API Endpoints"
  - "26 Learning Path Tracks"

---

## Step 13 & 14: Login & Signup Visual Enhancement

**Files**: 
- `/Netology/docs/login.html`
- `/Netology/docs/signup.html`

**Updates:**
- Better spacing and typography
- Improved form validation messages
- Enhanced button styles
- Add loading states during authentication
- Better error handling and display

---

## Step 15: Config File Updates

**File**: `/Netology/docs/js/config.js`

**Add new API endpoints:**
```javascript
// Existing
window.API_BASE = "https://netology-fyp.onrender.com";

// Add new endpoints
const ENDPOINTS = {
  // Onboarding
  onboarding: {
    status: '/api/onboarding/status',
    steps: '/api/onboarding/steps',
    start: '/api/onboarding/start',
    complete: '/api/onboarding/complete',
    skip: '/api/onboarding/skip',
  },
  
  // Slides
  slides: {
    list: '/api/lessons/:lessonId/slides',
    view: '/api/lessons/:lessonId/slides/:slideId',
    complete: '/api/lessons/:lessonId/slides/:slideId/complete',
    bookmark: '/api/slides/:slideId/bookmark',
    notes: '/api/slides/:slideId/notes',
  },
  
  // Progress
  progress: {
    list: '/api/user/progress',
    stats: '/api/user/progress/stats',
  },
  
  // Challenges & Achievements
  challenges: '/api/user/challenges',
  achievements: '/api/user/achievements',
  
  // Preferences
  preferences: '/api/user/preferences',
  
  // Activity
  activity: '/api/user/activity',
  streaks: '/api/user/streaks',
  
  // Sandbox
  sandbox: {
    execute: '/api/sandbox/execute-command',
    allowed: '/api/sandbox/allowed-commands',
  }
};

// Export for use in other files
window.ENDPOINTS = ENDPOINTS;
```

---

## Implementation Checklist

```
Step 6:  Dashboard HTML - Add data-tour attributes      [ ]
Step 7:  Progress Page - Tabbed interface redesign      [ ]
Step 8:  Courses Page - Carousel with filters           [ ]
Step 9:  Account Page - Settings redesign               [ ]
Step 10: Lesson Page - Slide viewer implementation      [ ]
Step 11: Sandbox Page - Command console                 [ ]
Step 12: Index Page - Visual refresh                    [ ]
Step 13: Login Page - Visual enhancement                [ ]
Step 14: Signup Page - Visual enhancement               [ ]
Step 15: Config.js - New API endpoint mappings          [ ]
```

---

## Key Integration Points

**All pages should:**
1. Check login status via localStorage
2. Fetch user email from localStorage
3. Call appropriate API endpoints
4. Handle errors gracefully
5. Update UI based on response data
6. Use consistent styling (existing CSS classes)

**Onboarding trigger (in dashboard.html):**
```javascript
onReady(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (user.is_first_login && !user.onboarding_completed) {
    startOnboardingTour(user.email);
  }
});
```

---

**Ready to begin Steps 6-15?**  
Core infrastructure is complete. Frontend can now integrate with all backend features.
