# Auto-Login System Architecture & Troubleshooting

> **Last Updated:** 2025-12-18
> **Component:** Authentication Extension (`AUTH-EXTENSION`)
> **Context:** Copart & IAAI Auto-Login (Incognito & Regular)

## 1. Overview & Problem Definition

The extension automates the login process for Copart and IAAI. A critical requirement is supporting **Incognito Mode** for the secondary Copart account to allow simultaneous sessions.

### The Challenges
1.  **Incognito Restrictions:** Chrome's `background.js` often cannot read the `url` property of an Incognito tab in `sender.tab`, making it difficult to identify which account to log in.
2.  **Race Conditions:** The background script might initialize pending credentials *after* the content script has already loaded, or the content script might load *before* the background script is ready.
3.  **Unreliable Tab IDs:** Relying solely on Tab IDs is flaky; tabs can be replaced or their IDs can change during redirects.

## 2. Solution Architecture: "Pull-Based" Authentication

To solve these reliability issues, we moved from a "Push" model (Background pushes data to Tab) to a **"Pull" model** (Tab asks Background for data).

### Key Architectural Decisions
*   **Active Request:** The `content.js` actively solicits credentials from the `background.js` upon page load.
*   **URL-Based Matching:** We strictly match based on the **URL** passed explicitly by the content script. This bypasses the Incognito restriction because the content script always knows its own URL.
*   **Retry Mechanism:** The content script attempts active retrieval multiple times to handle initialization race conditions.

---

## 3. Implementation Details

### Content Script (`content.js`)
*Acts as the trigger.*

1.  **Safety Check:** Immediately verifies if `window.location.href` matches a known login URL (`copart.com/login` or `login.iaai.com`). If not, it halts.
2.  **Active Query:** Sends a `CHECK_AUTO_LOGIN` message to the background.
3.  **Payload:** Crucially, it includes `{ url: window.location.href }` in the message payload.
4.  **Resilience:** Implements a retry loop (3 attempts, 1000ms delay) to ensure the background service worker is awake and ready.

```javascript
// content.js
const currentUrl = window.location.href;
const response = await chrome.runtime.sendMessage({ 
    action: 'CHECK_AUTO_LOGIN',
    url: currentUrl // Explicitly passing URL handles Incognito constraints
});
```

### Background Script (`background.js`)
*Acts as the state provider.*

1.  **State Management:** Maintains a `pendingLogins` map of credentials waiting to be used.
2.  **Request Handling:** Listens for `CHECK_AUTO_LOGIN`.
3.  **Matching Logic:**
    *   Prioritizes `message.url` over `sender.tab.url`.
    *   Checks if the URL indicates a **Copart** login or an **IAAI** login.
    *   Finds a matching credential in `pendingLogins` by type (`COPART` or `IAAI`).

---

## 4. Verification & Troubleshooting

Use this checklist to verify the system is working correctly.

### Console Logs to Watch
Open the **Background Service Worker** console and the **Page Console** to trace the flow.

**1. Background Script Output:**
| Log Message | Meaning |
| :--- | :--- |
| `CHECK_AUTO_LOGIN from Tab: ..., URL: ...` | Request received from content script. |
| `Match found for COPART login` | Credentials found and returned. |
| `No matching pending login found` | No credentials queued (expected behavior for manual navigation). |

**2. Content Script Output:**
| Log Message | Meaning |
| :--- | :--- |
| `USA Logistics Auth content script loaded` | Script injected successfully. |
| `Auto-login data received (attempt X): COPART` | Credentials received, attempting login. |
| `Not a login page, skipping auto-login check` | Correctly identified non-login page. |

### Common Issues
*   **Looping Logins:** If the matching logic is too broad (e.g., matching `copart.com` instead of `copart.com/login`), the script might try to log in again after a successful redirect. **Fix:** Ensure URL matching is strict.
*   **Incognito Failure:** If `message.url` is not passed, `background.js` will see an empty URL for Incognito tabs. **Fix:** Ensure `content.js` always sends `url: window.location.href`.

---

## 5. Maintenance Guide

If the auto-login breaks in the future:

1.  **Check Permissions:** Ensure `manifest.json` preserves `incognito: "spanning"` or `"split"`.
2.  **Verify URLs:** Check if Copart or IAAI changed their login routes (e.g., `/login` to `/signin`).
3.  **Telegram/IP API:** Ensure `api.ipify.org` and `api.telegram.org` are still in `host_permissions` if 2FA handling fails.
