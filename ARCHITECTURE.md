# Auction Auth Service - Complete Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Chrome Extension (Client)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────┐              │
│  │  Side Panel UI  │────────▶│  Background.js   │              │
│  │  (sidepanel.js) │         │  (Service Worker)│              │
│  └─────────────────┘         └────────┬─────────┘              │
│                                        │                         │
│                              ┌─────────▼─────────┐              │
│                              │    Services       │              │
│                              ├───────────────────┤              │
│                              │ • ApiService      │              │
│                              │ • StorageService  │              │
│                              │ • CookieService   │              │
│                              │ • UIRestrictions  │              │
│                              └─────────┬─────────┘              │
│                                        │                         │
│                              ┌─────────▼─────────┐              │
│                              │    Handlers       │              │
│                              ├───────────────────┤              │
│                              │ • CopartHandler   │              │
│                              │ • IAAIHandler     │              │
│                              └───────────────────┘              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Content Scripts (content.js)                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Components:                                             │   │
│  │  • OverlayUI          - Auth loading screen             │   │
│  │  • CopartAutoLogin    - Form autofill                   │   │
│  │  • UIRestrictions     - DOM manipulation                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    Node.js Backend Server                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐         ┌──────────────────┐                  │
│  │  server.js  │────────▶│     Routes       │                  │
│  │  (Fastify)  │         ├──────────────────┤                  │
│  └─────────────┘         │ • /auth/*        │                  │
│                          │ • /credentials/* │                  │
│                          │ • /config/*      │                  │
│                          └────────┬─────────┘                  │
│                                   │                             │
│                         ┌─────────▼─────────┐                  │
│                         │   Controllers     │                  │
│                         ├───────────────────┤                  │
│                         │ • AuthController  │                  │
│                         │ • CredController  │                  │
│                         │ • ConfigController│                  │
│                         └────────┬──────────┘                  │
│                                  │                              │
│                         ┌────────▼──────────┐                  │
│                         │    Services       │                  │
│                         ├───────────────────┤                  │
│                         │ • OTPService      │                  │
│                         │ • UserService     │                  │
│                         │ • CredService     │                  │
│                         │ • ConfigService   │                  │
│                         │ • TelegramService │                  │
│                         └────────┬──────────┘                  │
│                                  │                              │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   MySQL Database  │
                         ├───────────────────┤
                         │ • users           │
                         │ • credentials     │
                         │ • ui_restrictions │
                         └───────────────────┘
```

## Data Flow

### 1. Authentication Flow
```
User → Side Panel → Background → API Service → Server → Database
                                                    ↓
                                              Telegram Bot
                                                    ↓
User receives OTP → Enters code → Verification → Session Created
```

### 2. Login Flow (Copart)
```
User clicks "Open Copart" → Background → CopartHandler
                                              ↓
                                    Fetch credentials from Server
                                              ↓
                                    Open new tab with login URL
                                              ↓
                                    Content Script detects page
                                              ↓
                                    CopartAutoLogin component
                                              ↓
                                    Auto-fill & submit form
                                              ↓
                                    Redirect to dashboard
```

### 3. UI Restrictions Flow
```
Page loads → Background detects Copart → Check user role
                                              ↓
                                    Fetch CSS from Server (cached)
                                              ↓
                                    Inject CSS via scripting API
                                              ↓
                                    Content Script applies DOM changes
```

## Module Dependencies

### Extension
```
background.js
  ├── config/constants.js
  ├── services/
  │   ├── api.service.js
  │   ├── storage.service.js
  │   ├── cookie.service.js
  │   └── ui-restrictions.service.js
  ├── handlers/
  │   ├── copart-login.handler.js
  │   └── iaai-login.handler.js
  └── utils/
      └── user-info.js

content.js
  ├── content/components/
  │   ├── overlay.component.js
  │   ├── copart-autofill.component.js
  │   └── ui-restrictions.component.js
  └── utils/
      └── dom.js
```

### Server
```
server.js
  ├── config/
  │   ├── database.js
  │   └── constants.js
  ├── routes/
  │   ├── auth.routes.js
  │   ├── credentials.routes.js
  │   └── config.routes.js
  ├── controllers/
  │   ├── auth.controller.js
  │   ├── credentials.controller.js
  │   └── config.controller.js
  ├── services/
  │   ├── otp.service.js
  │   ├── user.service.js
  │   ├── credentials.service.js
  │   ├── config.service.js
  │   └── telegram.service.js
  └── utils/
      └── otp.js
```
