// AAS - Auction Authorisation Service - Side Panel Logic

const screens = {
    loading: document.getElementById('loading-screen'),
    login: document.getElementById('login-screen'),
    verify: document.getElementById('verify-screen'),
    dashboard: document.getElementById('dashboard-screen')
};

const logoutBtn = document.getElementById('logout-btn');
let verifyTimer = null;
let sessionTimer = null;

// --- State Management ---

function showScreen(name) {
    Object.values(screens).forEach(s => {
        s.classList.remove('active');
    });

    setTimeout(() => {
        screens[name].classList.add('active');
    }, 50);

    if (name === 'dashboard') {
        logoutBtn.classList.remove('hidden');
    } else {
        logoutBtn.classList.add('hidden');
    }
}

// --- Session Logic ---

async function checkSession() {
    try {
        const res = await chrome.runtime.sendMessage({ action: 'GET_SESSION' });
        if (res && res.authenticated) {
            showScreen('dashboard');
            startSessionTimer(res.session.expiry);
        } else {
            showScreen('login');
        }
    } catch (e) {
        console.error("Session check failed:", e);
        showScreen('login');
    }
}

// --- Login Flow (Username only) ---

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        const loader = btn.querySelector('.btn-loader');
        const err = document.getElementById('login-error');

        err.classList.add('hidden');
        btn.disabled = true;
        loader.classList.remove('hidden');

        const username = document.getElementById('username').value.trim();

        try {
            const res = await chrome.runtime.sendMessage({
                action: 'AUTH_LOGIN',
                data: { username }
            });

            if (res && res.success) {
                showScreen('verify');
                startVerifyTimer();
                // Focus password input
                setTimeout(() => {
                    const pwdInput = document.getElementById('otp-password');
                    if (pwdInput) pwdInput.focus();
                }, 100);
            } else {
                err.textContent = res.message || 'Invalid username';
                err.classList.remove('hidden');
            }
        } catch (error) {
            err.textContent = 'Connection error. Try again.';
            err.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            loader.classList.add('hidden');
        }
    });
}

// --- Verification Flow (Password from Telegram) ---

// OTP Input boxes logic
const otpBoxes = document.querySelectorAll('.otp-box');

// Auto-submit when all boxes filled
async function tryAutoSubmit() {
    const otp = getOtpValue();
    if (otp.length === 8) {
        // Small delay to let user see all boxes filled
        setTimeout(() => {
            const form = document.getElementById('verify-form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }, 200);
    }
}

// Auto-advance to next input
otpBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val && index < otpBoxes.length - 1) {
            otpBoxes[index + 1].focus();
        }
        // Add filled class
        if (val) {
            box.classList.add('filled');
        } else {
            box.classList.remove('filled');
        }
        // Check if all filled - auto submit
        tryAutoSubmit();
    });

    // Handle backspace
    box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            otpBoxes[index - 1].focus();
        }
    });
});

// Get combined OTP value
function getOtpValue() {
    return Array.from(otpBoxes).map(b => b.value).join('');
}

// Clear all OTP boxes
function clearOtpBoxes() {
    otpBoxes.forEach(b => {
        b.value = '';
        b.classList.remove('filled');
    });
    if (otpBoxes[0]) otpBoxes[0].focus();
}

// Fill OTP boxes from string
function fillOtpBoxes(value) {
    const chars = value.replace(/\s/g, '').slice(0, 8).split('');
    otpBoxes.forEach((box, i) => {
        box.value = chars[i] || '';
        if (chars[i]) {
            box.classList.add('filled');
        }
    });
    // Focus last filled or first empty
    const lastIndex = Math.min(chars.length, 7);
    if (otpBoxes[lastIndex]) otpBoxes[lastIndex].focus();
    // Auto submit if all filled
    tryAutoSubmit();
}

const verifyForm = document.getElementById('verify-form');

if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = getOtpValue();

        if (!password || password.length < 8) {
            const err = document.getElementById('verify-error');
            err.textContent = 'Please enter all 8 characters';
            err.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('verify-btn');
        btn.textContent = 'Verifying...';
        btn.disabled = true;

        try {
            const res = await chrome.runtime.sendMessage({
                action: 'VERIFY_CODE',
                data: { code: password }
            });

            if (res && res.success) {
                stopVerifyTimer();
                checkSession();
            } else {
                const err = document.getElementById('verify-error');
                err.textContent = res.message || 'Invalid password';
                err.classList.remove('hidden');
                clearOtpBoxes();
            }
        } catch (error) {
            console.error(error);
        } finally {
            btn.textContent = 'Verify Access';
            btn.disabled = false;
        }
    });
}

document.getElementById('back-to-login')?.addEventListener('click', () => {
    stopVerifyTimer();
    showScreen('login');
});

// --- Paste Button ---
document.getElementById('paste-btn')?.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            fillOtpBoxes(text);
        }
    } catch (err) {
        console.error('Failed to read clipboard:', err);
        // Fallback: alert user to paste manually
        alert('Cannot access clipboard. Please paste manually with Ctrl+V');
    }
});

// --- Timers ---

function startVerifyTimer() {
    let left = 300; // 5 minutes
    const el = document.getElementById('timer-text');
    if (!el) return;

    stopVerifyTimer();

    verifyTimer = setInterval(() => {
        left--;
        const mins = Math.floor(left / 60);
        const secs = (left % 60).toString().padStart(2, '0');
        el.textContent = `Password expires in ${mins}:${secs}`;

        if (left <= 0) {
            stopVerifyTimer();
            el.textContent = 'Password expired';
        }
    }, 1000);
}

function stopVerifyTimer() {
    if (verifyTimer) {
        clearInterval(verifyTimer);
        verifyTimer = null;
    }
}

function startSessionTimer(expiry) {
    const el = document.getElementById('remaining-time');
    if (!el) return;

    if (sessionTimer) clearInterval(sessionTimer);

    const update = () => {
        const rem = expiry - Date.now();
        if (rem <= 0) {
            checkSession();
            return;
        }
        const h = Math.floor(rem / 3600000);
        const m = Math.floor((rem % 3600000) / 60000);
        el.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    update();
    sessionTimer = setInterval(update, 60000);
}

// --- Dashboard Actions ---

logoutBtn?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'LOGOUT' });
    showScreen('login');
});

function setupAccountBtn(id, accountName) {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', () => {
        openAccount(accountName);
    });
}

setupAccountBtn('copart1-btn', 'copart1');
setupAccountBtn('copart2-btn', 'copart2');

document.getElementById('iaai-btn')?.addEventListener('click', () => {
    showStatus('Opening IAAI I...');
    chrome.runtime.sendMessage({ action: 'OPEN_IAAI' });
});

function openAccount(acc) {
    const displayNames = {
        'copart1': 'COPART I',
        'copart2': 'COPART II'
    };
    showStatus('Opening ' + (displayNames[acc] || acc) + '...');
    chrome.runtime.sendMessage({ action: 'OPEN_COPART', data: { account: acc } });
}

function showStatus(msg) {
    const el = document.getElementById('status-message');
    if (!el) return;

    const span = el.querySelector('span');
    if (span) span.textContent = msg;

    el.classList.remove('hidden');
    setTimeout(() => {
        el.classList.add('hidden');
    }, 3000);
}

// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});
