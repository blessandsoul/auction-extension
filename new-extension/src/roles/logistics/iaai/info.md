# IAAI Hidden Elements - Logistics Role

## Overview
This module hides UI elements on IAAI.com for users with the **logistics** role.

## Hidden Pages (Redirect to /)

| Page | URL Pattern | Reason |
|------|-------------|--------|
| User Profile | `/user` | Account access restricted |
| Lost Vehicles | `/lostvehicles` | Vehicle data hidden |
| Payment | `/payment` | Financial access restricted |
| To Be Picked Up | `/tobepickedup` | Pickup info hidden |
| Purchase History | `/purchasehistory` | Transaction history hidden |
| Title Instructions | `/titleinstructions` | Title data hidden |

## Hidden DOM Elements

| Element | Selector | Reason |
|---------|----------|--------|
| Transactional Modal | `#transactionalModal` | Modal popups disabled |
| Dashboard Container | `#myDashboardContainer` | Dashboard hidden |
| Payment Container | `#PaymentContainer` | Payment UI hidden |
| Edit Contact Panel | `#editContactPanel` | Contact editing disabled |
| Lost Vehicles Content | `#dvLostVehiclesContent` | Vehicle data hidden |
| Segment Controls | `.segment-ctrl-container` | Tab controls hidden |
| TBP Total | `.tbp-total` | Total amounts hidden |
| Table Checkboxes | `.table-th.checkbox` | Selection controls hidden |
| Sidebar | `.sidebar` | Sidebar hidden |
| Container Footer | `.container-footer` | Footer actions hidden |

## Backend Integration Notes

When migrating to server-driven configuration:
1. Fetch role config from `/api/roles/{role}/ui-config`
2. Config should include `hidePages` array and `elementsToRemove` array
3. Consider adding locale-specific element handling for IAAI Canada
