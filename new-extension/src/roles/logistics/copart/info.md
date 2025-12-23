# Copart Hidden Elements - Logistics Role

## Overview
This module hides UI elements on Copart.com for users with the **logistics** role.

## Hidden Pages (Redirect to /notfound-error)

| Page | URL Pattern | Reason |
|------|-------------|--------|
| Bidders | `/bidders` | No access to bidder management |
| Account Information | `accountinformation` | Financial data hidden |
| Account Settings | `accountsetting` | Settings restricted |
| Message Settings | `messagesettings` | Communication restricted |
| Preferred Locations | `preferred-locations` | Location settings restricted |
| Deposit | `deposit` | Financial access restricted |
| Payment Options | `payment-options` | Payment access restricted |
| Funds | `funds` | Financial access restricted |
| Lots Won | `lotswon` | Purchase data hidden |
| Lots Lost | `lotslost` | Bidding history hidden |
| My Lots | `mylots` | Lot management hidden |
| Transactions | `viewtype=transaction` | Transaction data hidden |
| My Bids | `mybids` | Bidding activity hidden |
| Dashboard | `/dashboard` | Dashboard hidden |
| Member Payments | `member-payments` | Payment page hidden |

## Hidden DOM Elements

| Element | Selector | Reason |
|---------|----------|--------|
| Similar Vehicle Alert | `[pref-code="...showSimilarVehicleAlert"]` | Feature disabled |
| Current Bids Menu | `#currentBids .bid_menu` | Bidding controls hidden |
| Open Items Menu | `#openItems .bid_menu` | Item controls hidden |
| Watchlist Menu | `#watchlist .bid_menu` | Watch controls hidden |
| Payments Due Menu | `#paymentsDue .bid_menu` | Payment controls hidden |
| Payment Summary | `.payment-summary` | Financial data hidden |
| Balance Due Button | `.balance-due-button` | Payment action hidden |
| Payment Selection | `copart-default-payment-selection` | Payment selection hidden |
| Price Buttons | `.price button` | Price actions hidden |
| Checkboxes | `table .p-checkbox-box` | Selection controls hidden |

## Backend Integration Notes

When migrating to server-driven configuration:
1. Fetch role config from `/api/roles/{role}/ui-config`
2. Config should include `hidePages` array and `elementsToRemove` array
3. Support dynamic updates via WebSocket for real-time changes
