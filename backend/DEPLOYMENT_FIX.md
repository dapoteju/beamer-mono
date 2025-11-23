# Deployment Port Configuration - Fixed

## Issue
Deployment failed with the following error:
```
The application is listening on port 3000, but the deployment is configured to forward port 5000 to external port 80
The first port in .replit with localPort (3000) should be the one the application listens on, but externalPort 80 is mapped to localPort 5000
Autoscale deployments require the application to serve traffic on the first configured localPort (3000), not on port 5000
```

## Root Cause
The `.replit` configuration had two port entries:
1. Port 3000 (first, but with externalPort 3000)
2. Port 5000 (second, with externalPort 80)

Replit's autoscale deployment system expected the application to listen on the first configured port (3000), but the port configuration suggested external traffic should route to port 5000.

## Solution Applied

### 1. Updated Application Code
Modified `src/index.ts` to:
- Use the `PORT` environment variable (Replit sets this automatically)
- Bind to `0.0.0.0` to accept connections from all interfaces (required for deployment)
- Default to port 3000 if PORT is not set

**Before:**
```typescript
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Beamer API listening on port ${port}`);
});
```

**After:**
```typescript
const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`Beamer API listening on port ${port}`);
});
```

### 2. Updated Deployment Configuration
Used `deploy_config_tool` to set the correct deployment configuration:
- **Deployment Target**: `autoscale` (for backend APIs)
- **Build Command**: `npm run build` (compiles TypeScript to JavaScript)
- **Run Command**: `node dist/index.js` (runs compiled code in production)

This ensures Replit knows:
- This is an autoscale deployment (stateless API)
- TypeScript needs to be compiled before running
- Production uses the compiled `dist/index.js` file

### 3. Port Strategy
- **Development**: Runs on port 3000 (via `npm run dev`)
- **Production**: Runs on whatever port Replit assigns via the `PORT` environment variable
- **Binding**: Always binds to `0.0.0.0` (not `localhost`) for external accessibility

## Why Port 5000 Doesn't Work for APIs

On Replit:
- **Port 5000** is reserved for `webview` output type (frontend web applications)
- **Port 3000** (and other ports) work with `console` output type (backend APIs, CLI tools)

Since this is a backend API (not a frontend), we use:
- Port 3000 in development
- `console` output type in workflow configuration
- Environment variable `PORT` for deployment flexibility

## Deployment Checklist

Before deploying, ensure:
- ✅ Application uses `process.env.PORT` environment variable
- ✅ Server binds to `0.0.0.0` (not `localhost`)
- ✅ TypeScript is compiled (`npm run build`)
- ✅ Deployment config specifies the build and run commands
- ✅ Deployment target is `autoscale` for stateless APIs

## Next Steps

Your deployment should now work correctly. The application will:
1. Build TypeScript → JavaScript during deployment
2. Listen on the port Replit assigns via `PORT` environment variable
3. Bind to `0.0.0.0` to accept external connections
4. Scale automatically based on incoming requests (autoscale mode)

You can now deploy (publish) your API successfully!
