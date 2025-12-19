# 🚀 Quick Reference Card

## 📁 Project Structure

```
auction-extension/
├── extension/     ← Chrome Extension (Load this in Chrome!)
├── server/        ← Node.js Backend (Run npm start here!)
└── *.md          ← Documentation
```

---

## ⚡ Quick Commands

### Start Server
```bash
cd server
npm start
```

### Load Extension
```
Chrome → chrome://extensions/ → Load unpacked → Select "extension" folder
```

### Test Everything
```bash
# 1. Server running? ✓
curl http://localhost:3000

# 2. Extension loaded? ✓
Check chrome://extensions/

# 3. Login works? ✓
Click extension icon → Test login
```

---

## 📂 Where Is Everything?

| What | Where |
|------|-------|
| **Extension Code** | `extension/src/` |
| **Extension UI** | `extension/sidepanel.*` |
| **Extension Config** | `extension/manifest.json` |
| **Server Code** | `server/src/` |
| **Server Config** | `server/.env` |
| **Database Schema** | `server/schema.sql` |
| **Documentation** | Root `*.md` files |

---

## 🔧 Common Tasks

### Change Server URL
```javascript
// extension/src/config/constants.js
const CONFIG = {
  SERVER_URL: 'http://your-server:port'
};
```

### Add New Service
```javascript
// extension/src/services/my-new.service.js
class MyNewService {
  // Your code
}
export default MyNewService;
```

### Add New API Endpoint
```javascript
// server/src/routes/my.routes.js
async function myRoutes(fastify) {
  fastify.get('/my-endpoint', myController.myHandler);
}
```

---

## 🐛 Debugging

### Extension Background
```
chrome://extensions/ → Inspect views: service worker
```

### Extension Content Script
```
Right-click page → Inspect → Console
```

### Server
```
Check terminal where npm start is running
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `extension/README.md` | Extension guide |
| `server/README.md` | Server guide |
| `ARCHITECTURE.md` | System design |
| `PROJECT_STRUCTURE.md` | Directory tree |
| `CLEANUP.md` | Remove old files |
| `REFACTORING.md` | What changed |

---

## ✅ Checklist

Before deploying:
- [ ] Server starts without errors
- [ ] Extension loads in Chrome
- [ ] Login flow works
- [ ] Copart auto-login works
- [ ] IAAI auto-login works
- [ ] UI restrictions apply
- [ ] Database is set up
- [ ] Environment variables configured
- [ ] Old files cleaned up (optional)

---

## 🎯 Key Files

### Extension
- `extension/manifest.json` - Extension config
- `extension/src/background.js` - Service worker
- `extension/src/content.js` - Content script
- `extension/src/config/constants.js` - Settings

### Server
- `server/src/server.js` - Entry point
- `server/.env` - Environment config
- `server/schema.sql` - Database schema
- `server/package.json` - Dependencies

---

## 💡 Tips

1. **Always load from `extension/` folder** in Chrome
2. **Always run `npm start` from `server/` folder**
3. **Check documentation** in each folder's README
4. **Keep old files** until you verify new structure works
5. **Use ES6 modules** (`import`/`export`) in new code

---

## 🆘 Help

- Extension not loading? Check `extension/manifest.json`
- Server not starting? Check `server/.env`
- Login not working? Check server is running
- UI restrictions not applying? Check user role in database

---

## 🎉 Success!

Your project is now:
- ✅ Organized
- ✅ Modular
- ✅ Maintainable
- ✅ Scalable
- ✅ Production-ready

**Print this card and keep it handy! 📌**
