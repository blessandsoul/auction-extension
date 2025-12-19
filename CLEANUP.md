# Cleanup Guide

## Files to Delete (Old Structure)

After verifying the new structure works, you can safely delete these files from the root directory:

### Extension Files (Now in `extension/`)
```
❌ background.js
❌ content.js
❌ sidepanel.html
❌ sidepanel.js
❌ sidepanel.css
❌ early-overlay.js
❌ manifest.json
❌ ico.png
❌ /src/ (entire directory)
❌ /icons/ (entire directory)
```

### Documentation Files (Old/Unused)
```
❌ AUTH_FIX_GUIDE.md
❌ auction_auth_simulation_master.md
❌ definitive_restrictions_guide.md
❌ extension_limitations_analysis.md
❌ extension_restrictions.md
❌ extension_user_profiles_guide.md
```

### Server Files (Old)
```
❌ server/server.js (root of server folder - use server/src/server.js instead)
```

## Files to Keep

### Root Directory
```
✅ .gitignore
✅ README.md
✅ ARCHITECTURE.md
✅ REFACTORING.md
✅ CLEANUP.md (this file)
```

### Extension Directory
```
✅ extension/ (entire directory)
```

### Server Directory
```
✅ server/ (entire directory)
```

### Hidden Folders
```
✅ .git/
✅ .agent/
```

## Cleanup Commands

### PowerShell (Windows)
```powershell
# Navigate to project root
cd C:\Users\seed\Documents\GitHub\auction-extension

# Delete old extension files
Remove-Item background.js
Remove-Item content.js
Remove-Item sidepanel.html
Remove-Item sidepanel.js
Remove-Item sidepanel.css
Remove-Item early-overlay.js
Remove-Item manifest.json
Remove-Item ico.png
Remove-Item -Recurse -Force src
Remove-Item -Recurse -Force icons

# Delete old documentation
Remove-Item AUTH_FIX_GUIDE.md
Remove-Item auction_auth_simulation_master.md
Remove-Item definitive_restrictions_guide.md
Remove-Item extension_limitations_analysis.md
Remove-Item extension_restrictions.md
Remove-Item extension_user_profiles_guide.md

# Delete old server file
Remove-Item server\server.js
```

### Bash (Linux/Mac)
```bash
# Navigate to project root
cd ~/path/to/auction-extension

# Delete old extension files
rm background.js content.js sidepanel.* early-overlay.js manifest.json ico.png
rm -rf src icons

# Delete old documentation
rm AUTH_FIX_GUIDE.md auction_auth_simulation_master.md
rm definitive_restrictions_guide.md extension_limitations_analysis.md
rm extension_restrictions.md extension_user_profiles_guide.md

# Delete old server file
rm server/server.js
```

## Verification Steps

Before deleting, verify the new structure works:

1. **Test Extension**
   ```
   - Load extension from `extension/` folder
   - Test login flow
   - Test Copart/IAAI auto-login
   - Verify UI restrictions work
   ```

2. **Test Server**
   ```bash
   cd server
   npm start
   # Should start without errors
   ```

3. **Check File Structure**
   ```
   auction-extension/
   ├── extension/     ✅ All extension files here
   ├── server/        ✅ All server files here
   ├── .gitignore     ✅
   ├── README.md      ✅
   ├── ARCHITECTURE.md ✅
   └── REFACTORING.md ✅
   ```

## After Cleanup

Your final structure should look like this:

```
auction-extension/
├── .git/
├── .agent/
├── .gitignore
├── README.md
├── ARCHITECTURE.md
├── REFACTORING.md
├── CLEANUP.md
│
├── extension/              # Chrome Extension
│   ├── src/
│   ├── manifest.json
│   ├── sidepanel.*
│   ├── early-overlay.js
│   ├── ico.png
│   ├── icons/
│   ├── .gitignore
│   └── README.md
│
└── server/                 # Node.js Backend
    ├── src/
    ├── node_modules/
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── package.json
    ├── package-lock.json
    ├── schema.sql
    └── README.md
```

## Rollback (If Needed)

If something goes wrong, you can restore files from git:

```bash
git checkout -- background.js content.js sidepanel.* manifest.json
git checkout -- src/
```

Or simply don't delete the old files until you're 100% confident the new structure works!
