# Comprehensive Guide to User Restrictions in AuctionGate

This document provides a detailed, technical breakdown of every restriction, limitation, and control mechanism imposed on users by the AuctionGate extension. It covers technological locks, account-based limits, content masking, and aggressive enforcement strategies.

---

## 1. Technological & Security Restrictions

These mechanisms are designed to protect the extension's code and prevent unauthorized tampering or analysis.

### 1.1. Anti-Debugging (DevTools Blocking)
The extension actively fights against attempts to inspect its code or the auction pages it controls.
*   **Keyboard Blocking:** The content script `js/devTools.js` intercepts and voids the following key events:
    *   `F12` (Open DevTools)
    *   `Ctrl+Shift+I` (Open DevTools)
    *   `Ctrl+U` (View Source)
*   **Active Monitoring:** The `js/background/background.js` script runs a continuous loop (every 1 second) calling `checkTabsForDevTools()`.
    *   It uses the `chrome.debugger` API to see if a debugger is attached to any Copart/IAAI tab. If found, the **tab is closed instantly**.
    *   It checks if a debugger is attached to the extension's own background worker. If found, it **disables the extension entirely** (`chrome.management.setEnabled(id, false)`).

### 1.2. Extension Conflict Resolution
The extension demands an exclusive environment.
*   **Mechanism:** `checkExtensions()` in `background.js` scans all installed extensions.
*   **Target:** It looks for specific extensions (by ID or name like "Proxy Extension") or permissions (e.g., `webRequestBlocking`, `proxy`).
*   **Action:** If a "harmful" extension is detected, the user is effectively locked out (`issetPotentiallyHarmfulExtensions` flag is set), forcing a logout and showing an error icon/popup.

### 1.3. Extension Availability Check (Manheim)
*   **Mechanism:** `manheimControlExtentionAvailability.js` runs a 1-second interval ping to the background script.
*   **Action:** If the extension stops responding (e.g., disabled or crashed), the script **wipes all cookies** and redirects the user to the Manheim logout URL immediately.

---

## 2. Account Status & Tariff Limitations

The server creates a profile for each user, which dictates local behavior.

### 2.1. "Base" Tariff Limits
Users on the default or "Base" plan face functional handicaps:
*   **No Auto-Login:** `getPermissionAuctionLogin()` returns `false`, preventing the extension from automating the login process for Copart/IAAI.
*   **No Bid Logging:** `getPermissionBidLog()` returns `false`, so bids placed are not recorded in the extension's history.
*   **Prebid Restrictions:** On IAAI, if the user is on "Base", `checkControlPrebid` returns `false`, triggers scripts that **hide** significant portions of the account UI (see Section 3).

### 2.2. Zero Balance Lockout
*   **Mechanism:** `guestLoginControl.js` tracks the `owner_balance`.
*   **Action:** If the balance is ≤ 0, any attempt to access auction dashboards (Copart, IAAI, or Manheim) results in an immediate redirect to the main homepage, effectively blocking access to account management tools.

### 2.3. Outdated Version Lockout
*   **Mechanism:** `checkIsVersionOutdated.js` compares the running version against a `minimal_extension_version` sent by the server.
*   **Action:** If the extension is too old, login attempts fail (`logIn` function returns `"outdated"`), and users are blocked from using the service until they update.

### 2.4. Unauthorized Bid Penalty
*   **Mechanism:** `processingUnathorizedBid.js`.
*   **Action:** If a bid request is detected but the user isn't properly authenticated within the extension's internal logic (even if logged into the site), the extension can force a logout to resynchronize state.

---

## 3. Content Hiding & UI Manipulation

The extension aggressively modifies the DOM to hide financial and account information, likely to prevent users from seeing payment options or bypassing the extension's payment flows.

### 3.1. Copart Restrictions (`copartHidePages.js`, `copartHidePayData.js`)
*   **Restricted Pages:**
    *   **Always Hidden:** `/bidders` (The list of bidders).
    *   **Settings Based:** If `purchased_lots_setting` is "hide", the following sections are removed/navigated away from:
        *   Account Information, Settings, Message Settings.
        *   **Funds & Payments:** Deposit, Payment Options, Funds, Member Payments.
        *   **Lot Lists:** Lots Won, Lots Lost, My Lots.
*   **Unpaid Invoices Page:** If accessed, the extension removes:
    *   "Pay Now" buttons (`.balance-due-button`).
    *   Payment summary tables (`.payment-summary`).
    *   Payment method selection options (`copart-default-payment-selection`).
    *   Checkbox columns to prevent bulk actions.
*   **Bid Menu Removal:** Hides bid menus in "Current Bids", "Open Items", and "Watchlist" if configured.

### 3.2. IAAI Restrictions (`iaaiHidePages.js`, `iaaiHidePayData.js`)
*   **Restricted Pages:**
    *   **Always Hidden:** `/user` (User Profile).
    *   **Settings Based ("hide"):** `/lostvehicles`, `/payment`, `/tobepickedup`, `/purchasehistory`, `/titleinstructions`.
*   **Dashboard Cleaning:**
    *   Removes `#myDashboardContainer` (The main dashboard overview).
    *   Removes `#PaymentContainer` (Payment center).
    *   Removes `#editContactPanel` and `#dvLostVehiclesContent`.
*   **Modal Blocking:** Automatically removes `#transactionalModal`, which is often used for confirmations or critical alerts.

### 3.3. Manheim Restrictions (`manheimSiteContentControl.js`)
*   **Identity Masking:** The extension rewrites the user's name on the site (e.g., `userFirstInitial`, `userLastNameInitial`) to match the `user_name` stored in the extension settings, effectively masking the true account holder's identity from the UI.
*   **Information Hiding:** It removes specific panels:
    *   `[data-testid="uhf-panel-details-your-manheim-account"]` (Account Details)
    *   `#viewAccountid` (Account ID display)
    *   `[data-testid="uhf-panel-sell"]` (Selling panel)
    *   `.transportation-box`, `.bid-offer-input-container`.

---

## 4. Quantitative Limits (Bidding Rules)

The extension enforces server-side logic locally limits:
*   **Single Bid Limit:** Users cannot place a single bid higher than `summ_one_bet`.
*   **Total Exposure:** The sum of all active bids cannot exceed `active_bids_sum_limit`.
*   **Bid Count:** The number of active bids cannot exceed `active_bids_limit`.
*   **Payment Limit:** The number of payments/invoices is capped by `pay_limit`.

## Summary
The AuctionGate extension is not just a tool for convenience; it is a **control system**. It ensures:
1.  Users cannot inspect the code.
2.  Users cannot run competing tools.
3.  Users cannot see the true auction account details (financials, true owner identity).
4.  Users cannot make payments directly (bypassing the extension's funnel).
5.  Users strictly adhere to bid and balance limits set by the administrator.
