

## Admin Exclusion from Published Builds

### The Goal
Keep admin code in the codebase (GitHub) but exclude it from published builds, so:
- User-facing app publishes are fast and lightweight
- Admin stays accessible at its own URL via the separate project you created
- No code deletion needed - everything stays in version control

---

### How This Works

```text
┌─────────────────────────────────────────────────────────────┐
│                    THIS PROJECT                             │
│  ┌─────────────────┐      ┌─────────────────────────────┐   │
│  │  User Pages     │      │  Admin Code                 │   │
│  │  (Published)    │      │  (Kept in repo, NOT built)  │   │
│  └─────────────────┘      └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│              ADMIN PROJECT (Separate)                       │
│  Uses same backend - copies admin code from this repo       │
│  Published at: admin.yourapp.com                            │
└─────────────────────────────────────────────────────────────┘
```

---

### Implementation Steps

#### Step 1: Environment-Based Route Exclusion
Add an environment variable to conditionally exclude admin routes from the build:

**File: `src/App.tsx`**
- Wrap admin route imports and `<Route>` definitions in a build-time check
- When `VITE_INCLUDE_ADMIN=false` (or not set), admin routes are not included in the bundle

#### Step 2: Update Vite Config (Optional Optimization)
Configure Vite to completely tree-shake admin code when the flag is off, ensuring zero admin code in the published bundle.

#### Step 3: Keep Code in Repository
- All admin files remain in `src/pages/admin/*` and `src/components/admin/*`
- Git history preserved
- Developers can still run admin locally with `VITE_INCLUDE_ADMIN=true`

#### Step 4: Use Separate Admin Project
The admin project you created (https://lovable.dev/projects/43017512-61d9-41ac-b3cb-cc001bc413e4):
- Copy admin pages/components there
- Connect to same backend
- Publish independently at its own URL

---

### Technical Details

**Changes to `src/App.tsx`:**
```typescript
// Conditional admin imports
const INCLUDE_ADMIN = import.meta.env.VITE_INCLUDE_ADMIN === 'true';

// Lazy load admin only if enabled
const Admin = INCLUDE_ADMIN 
  ? lazy(() => import("./pages/Admin"))
  : null;
// ... other admin pages similarly

// In Routes:
{INCLUDE_ADMIN && (
  <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>}>
    {/* admin sub-routes */}
  </Route>
)}
```

**For local development with admin:**
Set `VITE_INCLUDE_ADMIN=true` in your local environment.

**For published builds:**
Leave it unset or `false` - admin code won't be included.

---

### Result
- **This project**: Publishes only user-facing pages (fast builds)
- **Admin project**: Publishes admin separately (at different URL)
- **Same backend**: Both share database, users, content
- **No code loss**: Admin code stays in this repo's git history

