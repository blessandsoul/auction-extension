# User Restrictions & Limitations Analysis

This document outlines the restrictions, limitations, and control mechanisms imposed on users by the AuctionGate extension.

## 1. Technological Restrictions

### 1.1. Developer Tools Blocking
**Target:** Prevention of code analysis and debugging.
**Mechanism:**
*   **Keyboard Shortcuts:** Blocks `F12`, `Ctrl+Shift+I`, and `Ctrl+U` events on auction pages (`js/devTools.js`).
*   **Active Detection:** The background script continuously polls (`chrome.debugger.getTargets`) to see if DevTools are attached to any auction tab or the extension itself.
*   **Consequence:** If detected, the auction tab is immediately closed. If detected on the extension worker, the extension **disables itself** via `chrome.management.setEnabled`.

### 1.2. Conflicting Extension Blocking
**Target:** Competing tools or ad blockers.
**Mechanism:**
*   Checks `chrome.management.getAll` for specific Extension IDs or permissions (e.g., `webRequestBlocking`, `proxy`).
*   **Consequence:** If "harmful" extensions are found, the user is forced to log out, and the extension popup shows an error/warning state (`setErrorIcon`).

---

## 2. Account & Tariff Restrictions

### 2.1. "Base" Package Limitations
Users on the "Base" tariff (`package_slug` is "base") face significant restrictions:
*   **No Auto-Login:** The automated login feature for Copart/IAAI is disabled (`getPermissionAuctionLogin` returns false).
*   **No Bid Logging:** Bids placed are not logged to the server (`getPermissionBidLog` returns false).
*   **Content Hiding:** "Base" users trigger the `checkControlPrebid` flag which activates page hiding scripts on IAAI.

### 2.2. Zero Balance Lockout
**Target:** Users with expired or unpaid subscriptions/balances.
**Mechanism:** `guestLoginControl.js` (and `background.js` listeners) checks `owner_balance`.
**Consequence:** If `owner_balance <= 0`, any attempt to navigate to auction control panels (e.g., `/auctiongateway`, `/auctiondashboard`) results in an immediate redirect to the site's homepage.

### 2.3. Bid & Purchase Limits
The extension enforces strict limits downloaded from the server:
*   **Bid Cap:** Maximum amount for a single bid (`summ_one_bet`).
*   **Total Volume:** Maximum total value of active bids (`active_bids_sum_limit`).
*   **Quantity:** Maximum number of active bids (`active_bids_limit` / `count`).
*   **Manheim:** Specific status `manheim_type` can restrict a user to "Browsing only", preventing bid placement.

---

## 3. UI & Content Hiding Strategies

The extension injects content scripts (`copartHidePages.js`, `iaaiHidePages.js`, etc.) to modify the DOM and hide specific financial or account management elements.

### 3.1. Copart Hiding
*   **Always Hidden:** The `/bidders` page is inaccessible.
*   **If `purchased_lots_setting` = "hide":**
    *   Hides sensitive account sections: "Account Info", "Settings", "Deposit", "Funds", "Lots Won/Lost", "My Lots", "Member Payments".
    *   On "Unpaid Invoices" page: Removes "Pay Now" buttons, balance summaries, payment selection options, and checkboxes to prevent payment execution.
*   **If `lots_event_setting` != "show":**
    *   Hides "My Bids" and "Dashboard" links/pages.

### 3.2. IAAI Hiding
*   **Always Hidden:** The `/user` profile page.
*   **If `purchased_lots_setting` = "hide":**
    *   Hides pages: `/lostvehicles`, `/payment`, `/tobepickedup`, `/purchasehistory`, `/titleinstructions`.
    *   Hides Dashboard containers and Payment containers on the main page.
*   **Modal Removal:** Automatically removes `#transactionalModal`.

---

## 4. Feature Limitations

*   **Report Buying:** Users are hard-capped on the number of Carfax/AutoCheck reports they can purchase daily (`limitPurchasedReportsPerDay`).
*   **Export Blocking:** The "Export" functionality (e.g., for documents or vehicle data) is conditional based on `show_document_types_extension`.
*   **Calculator:** The fee calculator widget is hidden unless `show_calculator_extension` is enabled.
