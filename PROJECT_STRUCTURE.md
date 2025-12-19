# Project Structure - Final Organization

## 📁 Complete Directory Tree

```
auction-extension/                    # Project root
│
├── 📄 .gitignore                     # Git ignore rules
├── 📄 README.md                      # Main project documentation
├── 📄 ARCHITECTURE.md                # System architecture & diagrams
├── 📄 REFACTORING.md                 # Refactoring summary
├── 📄 CLEANUP.md                     # Guide to remove old files
│
├── 📁 extension/                     # ✨ Chrome Extension (Client)
│   ├── 📁 src/                       # Extension source code
│   │   ├── 📁 config/
│   │   │   └── constants.js          # Server URL, site configs
│   │   │
│   │   ├── 📁 services/              # Reusable services
│   │   │   ├── api.service.js        # Server API calls
│   │   │   ├── storage.service.js    # Chrome storage wrapper
│   │   │   ├── cookie.service.js     # Cookie management
│   │   │   └── ui-restrictions.service.js
│   │   │
│   │   ├── 📁 handlers/              # Business logic
│   │   │   ├── copart-login.handler.js
│   │   │   └── iaai-login.handler.js
│   │   │
│   │   ├── 📁 content/               # Content script components
│   │   │   └── 📁 components/
│   │   │       ├── overlay.component.js
│   │   │       ├── copart-autofill.component.js
│   │   │       └── ui-restrictions.component.js
│   │   │
│   │   ├── 📁 utils/                 # Utilities
│   │   │   ├── dom.js
│   │   │   └── user-info.js
│   │   │
│   │   ├── background.js             # Service worker (250 lines)
│   │   └── content.js                # Content script (80 lines)
│   │
│   ├── 📁 icons/                     # Extension icons
│   ├── sidepanel.html                # Side panel UI
│   ├── sidepanel.js                  # Side panel logic
│   ├── sidepanel.css                 # Side panel styles
│   ├── early-overlay.js              # Early page overlay
│   ├── manifest.json                 # Extension manifest
│   ├── ico.png                       # Extension icon
│   ├── .gitignore                    # Extension-specific ignores
│   └── README.md                     # Extension documentation
│
└── 📁 server/                        # ✨ Node.js Backend (Server)
    ├── 📁 src/                       # Server source code
    │   ├── 📁 config/
    │   │   ├── database.js           # MySQL connection pool
    │   │   └── constants.js          # UI restrictions CSS
    │   │
    │   ├── 📁 controllers/           # Request handlers
    │   │   ├── auth.controller.js
    │   │   ├── credentials.controller.js
    │   │   └── config.controller.js
    │   │
    │   ├── 📁 routes/                # Route definitions
    │   │   ├── auth.routes.js
    │   │   ├── credentials.routes.js
    │   │   ├── config.routes.js
    │   │   └── health.routes.js
    │   │
    │   ├── 📁 services/              # Business logic (reusable)
    │   │   ├── otp.service.js
    │   │   ├── user.service.js
    │   │   ├── credentials.service.js
    │   │   ├── config.service.js
    │   │   └── telegram.service.js
    │   │
    │   ├── 📁 utils/                 # Utility functions
    │   │   └── otp.js
    │   │
    │   └── server.js                 # Main entry point (40 lines)
    │
    ├── 📁 node_modules/              # Dependencies (gitignored)
    ├── .env                          # Environment variables (gitignored)
    ├── .env.example                  # Environment template
    ├── .gitignore                    # Server-specific ignores
    ├── package.json                  # NPM configuration
    ├── package-lock.json             # Dependency lock file
    ├── schema.sql                    # Database schema
    └── README.md                     # Server documentation
```

## 🎯 Key Directories

### Extension (`extension/`)
**Purpose**: Chrome extension client code  
**Load in Chrome**: Point to this folder  
**Entry Points**:
- `manifest.json` - Extension configuration
- `src/background.js` - Service worker
- `src/content.js` - Content script
- `sidepanel.html` - User interface

### Server (`server/`)
**Purpose**: Node.js backend API  
**Start Command**: `npm start`  
**Entry Point**: `src/server.js`  
**API Endpoints**:
- `/auth/*` - Authentication
- `/credentials/*` - Credentials
- `/config/*` - Configuration

## 📊 File Count Summary

| Category | Count | Lines (avg) |
|----------|-------|-------------|
| **Extension** | 14 files | ~100 lines |
| **Server** | 15 files | ~80 lines |
| **Documentation** | 5 files | - |
| **Total** | 34 files | - |

## 🔄 Data Flow

```
User
  ↓
Extension (extension/)
  ↓
API Service (extension/src/services/api.service.js)
  ↓
HTTP Request
  ↓
Server (server/src/server.js)
  ↓
Routes (server/src/routes/)
  ↓
Controllers (server/src/controllers/)
  ↓
Services (server/src/services/)
  ↓
Database (MySQL)
```

## 🚀 Quick Start

### 1. Start Server
```bash
cd server
npm install
npm start
```

### 2. Load Extension
```
Chrome → Extensions → Load unpacked → Select "extension" folder
```

### 3. Test
```
Click extension icon → Login → Test features
```

## ✅ Benefits of This Structure

1. **Clear Separation**: Extension and Server are completely separate
2. **Easy to Navigate**: Know exactly where each file belongs
3. **Scalable**: Easy to add new features
4. **Testable**: Each module can be tested independently
5. **Professional**: Industry-standard organization
6. **Git-Friendly**: Clean repository structure
7. **Deployment-Ready**: Each part can be deployed separately

## 📝 Notes

- **Old files** in root directory can be deleted (see CLEANUP.md)
- **Documentation** files stay in root for easy access
- **Each folder** has its own README and .gitignore
- **ES6 Modules** used throughout for modern code
