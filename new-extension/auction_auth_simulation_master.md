# Master Guide: Auction Authorization Simulation Logic

This document provides a comprehensive technical breakdown of how the extension automates the login process for Copart and IAAI. It includes both the architectural explanation and the actual code logic used to bypass standard UI interactions.

---

## 1. Copart Authorization (Client-Side)

**Strategy:** Client-side API Injection.
**Context:** Content Script (`js/copart/copartMainScript.js`).
**Mechanism:** The script mimics the AJAX request that the Copart single-page application (SPA) sends when a user clicks "Login".

### 1.1. The CSRF Barrier
Copart uses a Cross-Site Request Forgery (CSRF) token embedded in the initial HTML load. This token must be present in the headers of any state-changing request (like Login).

**Code Implementation:**
```javascript
// Function: f() - Extracts the CSRF token from the <head>
function f() {
    let e = "";
    // Regex searches for 'csrfToken: "..."' inside the <head> tag's text content
    const t = $("head").text().match(/csrfToken:.*?"(?<token>.*?)"/s);
    if (t) {
        e = t.groups.token;
    }
    return e;
}
```

### 1.2. The Login Function
The core login logic `l(e)` bypasses the HTML form. It constructs a JSON payload and sends it to the internal API endpoint.

**Code Implementation:**
```javascript
// Function: l(e) - Performs the login request
async function l(e) {
    // 1. Show a loader to the user so they know something is happening
    y(); 

    // 2. Prepare the payload. 'accountType: 0' usually denotes a standard member.
    const a = JSON.stringify({
        accountType: 0,
        accountTypeValue: 0,
        username: e.auction.COPART.login,
        password: e.auction.COPART.password
    });

    // 3. Send the request
    // URL: https://www.copart.com/processLogin
    const response = await fetch("https://www.copart.com/processLogin", {
        headers: {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
            // CRITICAL: Tells the server this is an AJAX request
            "x-requested-with": "XMLHttpRequest",
            // CRITICAL: The token we extracted earlier
            "x-xsrf-token": f() 
        },
        body: a,
        method: "POST",
        credentials: "include" // Important: sends/saves cookies
    }).catch((() => false));

    // 4. Validate Response
    // Copart returns different URLs or JSON errors depending on the result.
    if (response?.url.includes("loginSuccess.html") && response.status === 200) {
        // SUCCESS: The server accepted credentials and set the session cookies.
        await g(); // Notify background script of success
        window.location.reload(); // Reload page to init app as logged-in user
        return true;
    } 
    
    // 5. Handle Errors (JSON parsing)
    try {
        const json = await response.json();
        const errorMsg = json?.data?.error;
        // Map internal error codes to human-readable messages
        // e.g., "BAD_CREDENTIALS" -> "Wrong login or password"
    } catch (err) {
        // XML/HTML response parsing failed
    }

    return false;
}
```

---

## 2. IAAI Authorization (Server-Side / Background)

**Strategy:** Server-Side Form Post (via Background).
**Context:** Background Service Worker.
**Mechanism:** The background script acts as the "Browser". It fetches the login page to initialize a session, scrapes the ASP.NET verification token, and then POSTs the form data. This shares the cookie jar with the actual browser window.

### 2.1. Initialization & Token Extraction
IAAI uses ASP.NET Identity, which relies on a hidden input field `__RequestVerificationToken` to prevent CSRF.

**Code Implementation:**
```javascript
// File: js/background/utils/getIaaiLoginDasboardData.js
// Step A: Fetch the raw HTML of the login page
async function getIaaiLoginDasboardData({URI}) {
    const url = "https://login.iaai.com/Identity/Account/Login";
    const response = await fetch(url);
    const text = await response.text();
    return { iaaiLoginDasboardHtml: text, authUrl: response.url };
}

// File: js/background/utils/getIaaiRequestToken.js
// Step B: Regex match the token from the HTML
async function getIaaiRequestToken({iaaiLoginDasboardHtml}) {
    // Looks for: name="__RequestVerificationToken" type="hidden" value="..."
    const regex = /name="__RequestVerificationToken" type="hidden" value="([^"]+)"/;
    const match = regex.exec(iaaiLoginDasboardHtml);
    return match ? match[1] : null;
}
```

### 2.2. The Login Request
Once we have the token, we construct a `FormData` object (simulating a real HTML form submission) and POST it.

**Code Implementation:**
```javascript
// File: js/background/iaai/logInIAAI.js
export async function logInIAAI({ appInfo, requestToken, authUrl }) {
    const { login, password } = appInfo.auction.IAAI;
    
    // 1. Construct standard ASP.NET Identity form data
    const formData = new FormData();
    formData.append("Input.Email", String(login));
    formData.append("Input.Password", String(password));
    formData.append("Input.RememberMe", "false");
    formData.append("__RequestVerificationToken", String(requestToken)); // The token we scraped
    
    let isSuccess = false;

    try {
        // 2. Submit the form
        // Note: fetch in background script shares cookies with the browser!
        const response = await fetch(authUrl, {
            method: "POST",
            body: formData
        });

        // 3. Verify Success via Cookies
        // The presence of this specific cookie indicates a valid session.
        const cookie = await chrome.cookies.get({
            url: "https://login.iaai.com/",
            name: ".AspNetCore.Identity.Application"
        });

        // If the cookie exists and we were redirected (standard OAuth/Identity flow), it worked.
        if (cookie && response.redirected) {
            isSuccess = true;
        }
    } catch (e) {
        console.error(e);
    }

    return isSuccess;
}
```

### 2.3. Handling the Redirect
After a successful background login, the cached tab (which is still on the login screen or blank) needs to be sent to the dashboard.

**Code Implementation:**
```javascript
// Helper to move the user to the correct page
async function updateActivePage({tabId, redirectUrl}) {
    // If the response URL has a 'redirect_uri' param, go there (OAuth flow).
    // Otherwise, just reload the page since the cookies are now set.
    chrome.tabs.update(tabId, { url: redirectUrl });
}
```

---

## Summary of Differences

| Feature | Copart | IAAI |
| :--- | :--- | :--- |
| **Execution Context** | Client-side (Content Script) | Server-side (Background Script) |
| **Method** | JSON API (XHR) | Form Data (POST) |
| **Security Token** | Custom header `x-xsrf-token` extracted from `<head>` | Form field `__RequestVerificationToken` extracted from `<body>` |
| **Success Check** | JSON Response / URL check | Session Cookie existence (`.AspNetCore...`) |
