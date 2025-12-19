# Auction Auth Service (AAS)

Secure authentication service for auction sites (Copart & IAAI). This project consists of a Chrome Extension (client) and a Node.js backend server.

## 📁 Project Structure

```
auction-extension/
├── extension/              # Chrome Extension (Client)
│   ├── src/                # Extension source code
│   ├── manifest.json       # Extension manifest
│   └── README.md           # Extension documentation
│
├── server/                 # Node.js Backend (Server)
│   ├── src/                # Server source code
│   ├── schema.sql          # Database schema
│   └── README.md           # Server documentation
│
├── .gitignore              # Git ignore rules
├── README.md               # This file
├── ARCHITECTURE.md         # System architecture
└── REFACTORING.md          # Refactoring documentation
```

## 🚀 Quick Start

### 1. Setup Server
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
mysql -u root -p < schema.sql
npm start
```

### 2. Load Extension
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

### 3. Use the Extension
1. Click extension icon
2. Login with username
3. Get OTP from Telegram
4. Authenticate and use!

## 📚 Documentation

- **[Extension README](extension/README.md)** - Extension setup & usage
- **[Server README](server/README.md)** - Server setup & API docs
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System diagrams & data flows
- **[REFACTORING.md](REFACTORING.md)** - Refactoring summary

## 🏗️ Architecture

### Extension (Client)
```
extension/src/
├── config/           # Configuration
├── services/         # Reusable services (API, Storage, Cookies)
├── handlers/         # Business logic (Copart, IAAI)
├── content/          # Content script components
├── utils/            # Utility functions
├── background.js     # Service worker
└── content.js        # Content script
```

### Server (Backend)
```
server/src/
├── config/           # Configuration (DB, Constants)
├── routes/           # API routes
├── controllers/      # Request handlers
├── services/         # Business logic (OTP, User, Credentials)
├── utils/            # Utility functions
└── server.js         # Main entry point
```

## 🔧 Technology Stack

### Extension
- **Runtime**: Chrome Extension Manifest V3
- **Language**: JavaScript (ES6 Modules)
- **Storage**: Chrome Storage API
- **UI**: HTML/CSS/Vanilla JS

### Server
- **Runtime**: Node.js
- **Framework**: Fastify
- **Database**: MySQL
- **ORM**: mysql2
- **Notifications**: Telegram Bot API

## 🔐 Security Features

- ✅ No hardcoded credentials
- ✅ Server-side credential storage
- ✅ OTP authentication via Telegram
- ✅ Session-based access control
- ✅ Role-based UI restrictions
- ✅ Secure cookie management

## 🎯 Features

### Authentication
- Username-based login
- OTP verification via Telegram
- 4-hour session duration
- Automatic session management

### Auto-Login
- Copart (2 accounts, incognito support)
- IAAI (background login)
- Automatic form filling
- Smart redirect after login

### UI Restrictions
- Role-based UI hiding
- CSS injection for logistics role
- DOM manipulation for dynamic content
- Pagination auto-set to 500 rows

## 🛠️ Development

### Extension Development
```bash
cd extension
# Make changes to src/
# Reload extension in Chrome
```

### Server Development
```bash
cd server
npm run dev  # Auto-reload on changes
```

## 📦 Deployment

### Extension
1. Build production version (if needed)
2. Package as `.crx` or publish to Chrome Web Store

### Server
1. Set `NODE_ENV=production` in `.env`
2. Use process manager (PM2, systemd)
3. Set up reverse proxy (nginx)
4. Configure SSL/TLS

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

ISC

## 👥 Support

For issues or questions, check the documentation in each folder's README.
