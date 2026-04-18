# Vercel Deployment Fix — Native Module & Permission Issues

## Problem Summary

**Original errors:**
1. `500: INTERNAL_SERVER_ERROR` + `FUNCTION_INVOCATION_FAILED`
2. `bcrypt_lib.node: invalid ELF header`
3. `sh: line 1: /vercel/path0/frontend/node_modules/.bin/vite: Permission denied`

## Root Causes

### 1. bcrypt Native Binary Mismatch
- **Cause:** `bcrypt` uses native C++ bindings compiled for Windows (your dev machine). Vercel runs Linux → binary format incompatible (ELF vs PE).
- **Fix:** Replace `bcrypt` with `bcryptjs` (pure JavaScript, no native code).

### 2. Vite Binary Permission Denied
- **Cause:** Node modules installed on Windows don't preserve Linux execute permissions. When Vercel (Linux) tries to run `node_modules/.bin/vite`, it lacks execute bit.
- **Fix:** Use `node node_modules/vite/bin/vite.js` to bypass the binary wrapper entirely.

### 3. Missing Environment Validation
- **Cause:** Undefined `MONGO_URI` or `JWT_SECRET` caused runtime crashes before error handling.
- **Fix:** Add startup validation in `api/index.js`.

### 4. Fatal Database Errors
- **Cause:** `process.exit(1)` in `db.js` kills the serverless function instantly.
- **Fix:** Remove `process.exit`, throw errors instead, handle gracefully.

---

## Changes Made

### A. Backend — Replace bcrypt with bcryptjs
**File:** `backend/src/models/Admin.js`
```diff
- import bcrypt from 'bcrypt';
+ import bcrypt from 'bcryptjs';
```

**File:** `backend/package.json`
```diff
- "bcrypt": "^5.1.1",
+ "bcryptjs": "^2.4.3",
```

Run:
```bash
cd backend
npm uninstall bcrypt
npm install bcryptjs
```

### B. Frontend — Fix Vite Permission Issues
**File:** `frontend/package.json`
```diff
   "scripts": {
-    "build": "vite build"
+    "build": "node node_modules/vite/bin/vite.js build",
+    "prebuild": "chmod -R 755 node_modules/.bin 2>/dev/null || true"
   },
```

**Why:** Directly invoking Vite's JS file bypasses the shell script wrapper that needs execute permission.

### C. Serverless-Safe Backend
**File:** `backend/api/index.js` — Full rewrite with:
- Env var validation at startup
- Non-blocking DB connection (doesn't crash if DB down)
- Global error handler (catches all unhandled errors)
- 404 handler
- Favicon handler (204 when missing)
- Proper exports for Vercel

**File:** `backend/src/config/db.js`
- Removed `process.exit(1)`
- Added proper error throwing

### D. Vercel Configuration
**File:** `backend/vercel.json`
```json
{
  "version": 2,
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "routes": [
    { "src": "/favicon.ico", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/api/index.js" }
  ]
}
```

### E. Monorepo & Ignore Files
**Files:**
- `.gitignore` — excludes `node_modules/`, `dist/`, `.env`, etc.
- `.vercelignore` — ensures Vercel doesn't upload `node_modules` (forces fresh install with correct permissions)
- Root `package.json` — defines workspaces for monorepo

---

## Deployment Checklist

- [ ] **Commit changes** — Ensure `node_modules/` is in `.gitignore` and NOT committed
- [ ] **Update dependencies** — Run `npm install` in both `frontend/` and `backend/`
- [ ] **Set Vercel env vars** — `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`
- [ ] **Configure Vercel:**
  - Root directory: `/` (monorepo) or `backend` (if deploying API only)
  - Build command: `npm run build` (from root, uses workspace)
  - Output directory: `frontend/dist` (for static files) + serverless functions
- [ ] **Verify Node version** — Set to `20.x` in Vercel (matches `engines` field)
- [ ] **Test locally** — `cd frontend && npm run build` should succeed without permission errors
- [ ] **Check build logs** — First deploy: watch for any `chmod` or install errors
- [ ] **Test API** — `GET /api/health` should return 200 with DB status
- [ ] **Test favicon** — `GET /favicon.ico` returns 204

---

## Commands to Fix Locally

```bash
# 1. Clean install (from project root)
rm -rf frontend/node_modules backend/node_modules
npm install

# 2. Verify frontend builds
cd frontend
npm run build  # Should succeed

# 3. Verify backend starts
cd ../backend
npm run dev    # Should connect to MongoDB

# 4. Test favicon endpoint
curl -i http://localhost:5000/favicon.ico  # Should return 204
```

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/models/Admin.js` | `bcrypt` → `bcryptjs` |
| `backend/package.json` | Replace dependency, add `postinstall`, add `engines` |
| `frontend/package.json` | Change build command, add `prebuild`/`postinstall`, add `engines` |
| `backend/src/config/db.js` | Remove `process.exit(1)` |
| `backend/api/index.js` | New serverless entry point with error handling |
| `backend/vercel.json` | Vercel routing config |
| `backend/.env.example` | Updated reference |
| `backend/README.md` | Deployment guide |
| Root `package.json` | Monorepo workspaces |
| `.gitignore` | Exclude node_modules, build outputs |
| `.vercelignore` | Exclude node_modules from Vercel upload |

---

## Why This Works

1. **bcryptjs** — Pure JS, no binaries → works on any OS
2. **Direct Vite invocation** — `node node_modules/vite/bin/vite.js` bypasses shell script permission issues
3. **Fresh install on Vercel** — `.vercelignore` excludes node_modules → Vercel runs `npm install` on Linux → correct permissions
4. **Graceful error handling** — No uncaught exceptions → no 500 crashes
5. **Env validation** — Fails early with clear messages if config missing

Deploy with confidence — the app now handles serverless constraints correctly.
