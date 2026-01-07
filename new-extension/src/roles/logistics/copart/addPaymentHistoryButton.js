/**
 * Add Payment History Button to Copart Unpaid Invoices Page
 * 
 * This script adds a "Payment History" button to the toolbar on the unpaid invoices page
 * that navigates users to the payment history page.
 */

(function () {
    'use strict';

    // Only run on the unpaid invoices page
    if (!window.location.href.includes('/member-payments/unpaid-invoices')) {
        return;
    }

    console.log('[AAS] Adding Payment History button...');

    /**
     * Create the Payment History button with matching Copart styling
     */
    function createPaymentHistoryButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cprt-btn-white-blue-small-content payment-history-button p-d-flex p-ai-center';
        button.style.cssText = 'margin-left: 8px;';

        // Create icon span
        const iconSpan = document.createElement('span');
        iconSpan.className = 'payment-sprite-image';
        iconSpan.style.cssText = 'margin-right: 8px;';

        // Create text node
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Payment History';

        button.appendChild(iconSpan);
        button.appendChild(textSpan);

        // Add click handler
        button.addEventListener('click', function () {
            console.log('[AAS] Navigating to Payment History...');
            window.location.href = 'https://www.copart.com/member-payments/payment-history';
        });

        return button;
    }

    /**
     * Find the icons container and insert the button
     */
    function insertPaymentHistoryButton() {
        // Look for the icons container
        const iconsContainer = document.querySelector('.icons.p-d-flex.d-flex-wrap');

        if (!iconsContainer) {
            return false;
        }

        // Check if button already exists
        if (iconsContainer.querySelector('.payment-history-button')) {
            return true;
        }

        // Create and insert the button
        const button = createPaymentHistoryButton();
        iconsContainer.appendChild(button);

        console.log('[AAS] Payment History button added successfully');
        return true;
    }

    /**
     * Wait for the page to load and insert the button
     */
    function init() {
        // Try immediately
        if (insertPaymentHistoryButton()) {
            return;
        }

        // If not found, wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                setTimeout(insertPaymentHistoryButton, 500);
            });
        } else {
            setTimeout(insertPaymentHistoryButton, 500);
        }

        // Also set up a MutationObserver to catch dynamically loaded content
        const observer = new MutationObserver(function (mutations) {
            if (insertPaymentHistoryButton()) {
                // Button inserted successfully, but keep observing in case page reloads content
            }
        });

        // Start observing when body is available
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            // Wait for body
            const bodyObserver = new MutationObserver(function () {
                if (document.body) {
                    bodyObserver.disconnect();
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }
            });
            bodyObserver.observe(document.documentElement, { childList: true });
        }
    }

    // Initialize
    init();
})();
