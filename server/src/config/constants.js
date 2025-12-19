const UI_RESTRICTIONS_CSS = `
    /* Notification Bell */
    button[aria-label="toggle notifications view"],
    .header-icon-unread-notification,
    
    /* User Dropdown */
    button[title="Sign In Dropdown"], 
    .user-dropdown-btn,
    .loggedInUserIcon,

    /* Financial Dashboard Cards */
    .payment-summary-mobile, 
    .p-d-flex.border.p-half-flex.p-p-3.p-desktopView-flex.p-flex-wrap,
    .payment-summary-details,
    
    /* "Default payment type" Dropdown Area */
    .pi-pencil.text-blue,
    .unpaid-invoices-header ~ .cprt-dropdown,
    .unpaid-invoices-header ~ .p-dropdown,
    
    /* Language Selector */
    button[data-uname="homepageLanguageselect"],
    .language_select,
    .btnlanguage,
    
    /* Generic fallbacks */
    [class*="payment-summary"],
    .unpaid-invoices-header + div,
    .unpaid-invoices-header ~ div.border,
    
    /* Specific Dropdowns */
    [aria-label="Wire transfer"],
    [aria-label="Invoice status"],
    [aria-label="USD"],
    
    /* Date Range Picker */
    .cprt-date-range,
    copart-date-range-fiter,
    
    /* Left Sidebar Navigation */
    mat-sidenav,
    #sidenav,
    .mat-sidenav,
    .payment-nav-icons,
    
    /* Navigation Items */
    a[data-uname="homePageDashboardTab"],
    a[data-uname="lotSummaryTab"],
    a[href*="dashboard"]:not([href*="member"]),
    a[href*="driverseat"],
    li[data-uname*="Inventory"],
    li[data-uname*="Auctions"],
    li[data-uname*="Bid"],
    a[data-uname*="Inventory"],
    a[data-uname*="Auctions"],
    a[data-uname*="Bid"],
    [data-uname="homePageInventoryTab"],
    [data-uname="homePageAuctionsTab"],
    [data-uname="homePageBidStatusTab"],
    a[href*="locations"],
    li[data-uname*="Location"],
    [data-uname="homePageLocationsTab"],
    a[href*="sell-your-car"],
    [data-uname*="SellYourCar"],
    .sell-your-car,
    a[href*="services-support"],
    a[href*="/deposits"],
    a[href*="/funds"],
    a[title="Deposits"],
    a[title="Funds"],
    li:has(a[href*="/deposits"]),
    li:has(a[href*="/funds"]),
    a[href*="help-center"],
    a[href*="helpcenter"],
    [data-uname*="HelpCenter"],
    
    /* Bid Info */
    .bid-information-section,
    bid-information,
    dashboard-prelim-bid,
    .lot-details-section,
    #bid-information-ldp6-section,
    
    /* Watchlist */
    #watchlistBtn,
    .watch-button,
    button.watch-button,
    a[href*="watchList"],
    
    /* Menu */
    .header-nav,
    #mobile-header-nav-links,
    .navbar-nav,
    nav.navbar,
    .mobile-nav
    { display: none !important; }
    
    .mat-sidenav-content,
    .mat-drawer-content,
    mat-sidenav-content {
        margin-left: 0 !important;
        width: 100% !important;
    }
    
    .mat-sidenav-container,
    mat-sidenav-container {
        width: 100% !important;
    }
    
    .unpaid-invoices-container,
    .member-payments-unpaid-invoices,
    [class*="unpaid-invoices"] {
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 20px !important;
        padding-right: 20px !important;
    }
`;

const IAAI_RESTRICTIONS_CSS = `
  /* Header Branding & Logo */
  .container-header-primary,
  .header__branding,
  .header__logo,
  
  /* Main Navigation */
  .header__primary-inner,
  .nav-desktop,
  .nav__item,
  .dropdown-menu--main-nav,
  
  /* Profile / User Dropdown */
  .profile,
  .header__user,
  .dropdown--profile,
  .header__avatar-name,
  
  /* Mobile buttons */
  .header__mobile-buttons,
  
  /* Flag icon */
  .flag,
  
  /* Tab Container */
  .tab-container,
  .nav-tabs-container,
  .nav-tabs,
  
  /* Cookie consent */
  #onetrust-consent-sdk,
  #onetrust-banner-sdk,
  
  /* Join Auction Button */
  .data-list__value--action,
  a.btn[href*="AuctionGateway"],
  
  /* Bid Information Section */
  .panel-bidder-eligibilty,
  .action-area__header:has(.data-title),
  .tile--data:has(.action-area),
  
  /* Watch List Button */
  .action-area__watch-btn,
  .btn--watch,
  #btnwatch,
  #btnstopwatch,
  
  /* Cost Calculator */
  .action-area__cost-calculator,
  
  /* Pre-bid Container & Buttons */
  .pre-bid-container,
  .action-btn-container,
  .btn--pre-bid,
  
  /* Bid Data */
  .action-area__bid-data,
  .action-area__content
  { display: none !important; }
  
  /* Stretch main content */
  .container-main {
    padding-top: 20px !important;
  }
`;

module.exports = { UI_RESTRICTIONS_CSS, IAAI_RESTRICTIONS_CSS };
