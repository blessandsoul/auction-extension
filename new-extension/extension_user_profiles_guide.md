# User Profiles & Restrictions Guide

This guide explains how the AuctionGate extension behavior changes based on the user's configuration profile. The extension is designed as a **Management & Control System**, meaning its restrictions are primarily applied to managed sub-accounts ("Run" package), while "Base" accounts often bypass these controls.

---

## 1. Profile: The Managed Sub-Bidder (Standard)
**Configuration:** `package_slug: "run"`, `owner_balance > 0`, `purchased_lots_setting: "hide"`

This is the standard profile for a client or employee using the extension to bid. They are subject to strict supervision and UI filtering.

*   **Authentication:**
    *   **Auto-Login:** Enabled. The extension automatically logs them into Copart/IAAI/Manheim using the Company's credentials.
    *   **Identity:** On Manheim, their name is masked and replaced with their extension username.
*   **Access Control:**
    *   **Financials Hidden:** They **cannot** see "Pay Now" buttons, deposit history, or invoice lists on Copart/IAAI.
    *   **Profile Hidden:** They **cannot** access account settings or profile pages (to prevent changing the password or email).
*   **Bidding:**
    *   **Live Auctions:** Can join live auctions, but bid buttons are governed by limits.
    *   **Bid Limits:** Strictly enforced. If `summ_one_bet` is $10,000, the "Bid" button disables for any amount > $10,000.
    *   **Pre-Bids:** Governed by `bet_limit`. If they exceed their daily/total limit, pre-bid buttons are replaced with a "Closed" message.

## 2. Profile: The Debtor (Zero Balance)
**Configuration:** `package_slug: "run"`, `owner_balance <= 0`

This profile applies when the user's company (or the user themselves) has run out of funds or has an expired subscription with the service provider.

*   **Dashboard Lockout:**
    *   **Action:** Attempting to visit `/auctiondashboard` (Copart) or `/auctiongateway` (IAAI) triggers an **immediate redirect** to the site's homepage.
    *   **Result:** They cannot access the bidding interface, watchlists, or won lots.
*   **Live Auction Lockout:**
    *   **Action:** The "Join Live Auction" buttons are disabled or removed from the DOM.
    *   **Result:** They cannot enter the G2 (Live) bidding console.
*   **Bidding:**
    *   **Action:** All bidding capabilities (Pre-bid and Live) are logically disabled in the background, even if the UI were accessible.

## 3. Profile: The "Base" User (Unmanaged/Trial)
**Configuration:** `package_slug: "base"`

This appears to be a fallback or "free tier" generic state where the extension acts mostly as a passthrough tool without the advanced management features.

*   **Exemptions (What they CAN do):**
    *   **No UI Hiding:** They **can** see "Pay Now" buttons, account settings, and financial data (scripts like `copartHidePages.js` exit early).
    *   **No Balance Block:** They are **not** redirected if `owner_balance` is zero.
    *   **No Live Link Block:** The "Join Auction" buttons remain active.
*   **Limitations (What they CAN'T do):**
    *   **No Auto-Login:** The extension will **not** inject credentials. They must type passwords manually (`getPermissionAuctionLogin` is false).
    *   **No History Logging:** Bids placed are **not** sent to the AuctionGate server for tracking.
    *   **No Automatic Pre-Bids:** The extension's internal pre-bid logic is bypassed.

## 4. Profile: The "Browsing Only" User
**Configuration:** `manheim_type: "Status"` (Manheim specific), or highly restrictive `bet_limit` (0).

*   **Manheim:**
    *   **Action:** The user is logged in, but the account state acts as "Status" only.
    *   **Result:** They can view inventory but likely cannot place bids (buttons disabled or hidden by `manheimButtonsControl.js`).
*   **All Auctions:**
    *   **Action:** If `active_bids_limit` (Count) is set to 0.
    *   **Result:** All "Bid" buttons remain disabled. The user can watch lots but cannot participate.

## 5. Profile: The Restricted State User
**Configuration:** `current_account_copart_states: ["TX"]` (Example)

*   **Live Auction (G2):**
    *   **Scenario:** User enters a live auction for a car located in **California (CA)**.
    *   **Action:** The extension detects the lot's state (CA) does not match the allowed list (TX).
    *   **Result:** The entire background flashes **Red**, and bid buttons are **disabled** for that specific car. When the next car (from TX) appears, buttons re-enable.

## Summary Table

| Feature | Managed User ("Run") | Debtor (Bal <= 0) | "Base" User |
| :--- | :--- | :--- | :--- |
| **Auto-Login** | ✅ Yes | ✅ Yes (but redirected) | ❌ No |
| **Hide Financials** | ✅ Yes (Default) | ✅ Yes | ❌ No |
| **Block Dashboard** | ❌ No | ✅ Yes | ❌ No |
| **Block Live Entry**| ❌ No | ✅ Yes | ❌ No |
| **Bid Limits** | ✅ Enforced | N/A (Blocked) | ❌ Bypassed* |
| **Bid Logging** | ✅ Yes | N/A | ❌ No |

*\*Note: "Base" users bypass the Extension's limit enforcement scripts because those scripts usually check for the "Run" package before executing.*
