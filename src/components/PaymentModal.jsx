import React, { useState, useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────
   Inline SVG icon primitives (no lucide-react)
───────────────────────────────────────────── */
const ShieldSVG = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
);
const CloseSVG = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);
const ArrowSVG = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
);
const CheckSVG = () => (
    <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);
const SpinnerSVG = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="spin-anim">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
);
const CardSVG = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
);
const PhoneSVG = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1"/>
    </svg>
);
const QrSVG = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <line x1="14" y1="14" x2="14" y2="14"/><line x1="14" y1="18" x2="14" y2="18"/>
        <line x1="18" y1="14" x2="18" y2="14"/><line x1="18" y1="18" x2="21" y2="21"/>
        <line x1="14" y1="21" x2="17" y2="21"/>
    </svg>
);
const WarnSVG = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
);
const InfoSVG = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
);
const ErrorSVG = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
);

/* ─────────────────────────────────────────────
   UPI App configuration
───────────────────────────────────────────── */
const UPI_APPS = [
    {
        id: 'gpay',
        label: 'Google Pay',
        upiHandle: '@okicici',
        color: '#4285F4',
        gradient: 'linear-gradient(135deg, #4285F4, #34A853)',
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
        )
    },
    {
        id: 'phonepe',
        label: 'PhonePe',
        upiHandle: '@ybl',
        color: '#5F259F',
        gradient: 'linear-gradient(135deg, #5F259F, #8a2be2)',
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#5F259F"/>
                <path d="M7.5 6.5h4.5a3.5 3.5 0 0 1 0 7H10v4H7.5V6.5z" fill="white"/>
                <circle cx="14.5" cy="16.5" r="2" fill="white"/>
            </svg>
        )
    },
    {
        id: 'paytm',
        label: 'Paytm',
        upiHandle: '@paytm',
        color: '#00BAF2',
        gradient: 'linear-gradient(135deg, #00BAF2, #0066cc)',
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="4" fill="#00BAF2"/>
                <text x="3" y="17" fontFamily="Arial" fontWeight="900" fontSize="10" fill="white">PAY</text>
                <text x="3" y="22" fontFamily="Arial" fontWeight="900" fontSize="7" fill="#002970">tm</text>
            </svg>
        )
    }
];

/* ─────────────────────────────────────────────
   Razorpay Script Loader
───────────────────────────────────────────── */
const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

/* ─────────────────────────────────────────────
   Platform Fee Calculation
   DareVerse takes 10% as platform fee
   Winner receives 90% of pot (minus Razorpay 2%)
───────────────────────────────────────────── */
const PLATFORM_FEE_PERCENT = 10;   // DareVerse earns 10%
const RAZORPAY_FEE_PERCENT  = 2;   // Razorpay charges ~2%

function calcFees(amount) {
    const amt = parseFloat(amount) || 0;
    const razorpayFee = +(amt * RAZORPAY_FEE_PERCENT / 100).toFixed(2);
    const platformFee = +(amt * PLATFORM_FEE_PERCENT / 100).toFixed(2);
    const winnerGets  = +(amt - platformFee - razorpayFee).toFixed(2);
    return { razorpayFee, platformFee, winnerGets };
}

/* ─────────────────────────────────────────────
   Custom Alert Box Component
───────────────────────────────────────────── */
function AlertBox({ type = 'info', title, message, onClose }) {
    const cfg = {
        info:    { icon: <InfoSVG />,  color: 'var(--neon)',   bg: 'rgba(0,240,255,0.08)',  border: 'rgba(0,240,255,0.3)'  },
        warn:    { icon: <WarnSVG />,  color: 'var(--gold)',   bg: 'rgba(255,214,0,0.08)',  border: 'rgba(255,214,0,0.3)'  },
        error:   { icon: <ErrorSVG />, color: 'var(--accent)', bg: 'rgba(255,0,85,0.1)',    border: 'rgba(255,0,85,0.35)'  },
        success: { icon: <CheckSVG style={{width:18,height:18}} />, color: 'var(--green)', bg: 'rgba(0,230,118,0.08)', border: 'rgba(0,230,118,0.3)' }
    }[type];

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.85rem 1rem', borderRadius: '10px',
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            color: cfg.color, marginBottom: '1rem',
            animation: 'slideInDown 0.25s var(--ease-out)',
            position: 'relative'
        }}>
            <span style={{ flexShrink: 0, marginTop: '1px' }}>{cfg.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                {title && <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.15rem', color: cfg.color }}>{title}</div>}
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>{message}</div>
            </div>
            {onClose && (
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                    <CloseSVG />
                </button>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Fee Breakdown Card
───────────────────────────────────────────── */
function FeeBreakdown({ amount, isSubscription }) {
    const { razorpayFee, platformFee, winnerGets } = calcFees(amount);
    const [expanded, setExpanded] = useState(false);

    // Subscriptions don't have platform fees or winners; money goes to owner.
    const ownerGets = +(parseFloat(amount) - razorpayFee).toFixed(2);

    return (
        <div style={{
            borderRadius: '10px', border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
            marginBottom: '1.25rem'
        }}>
            <button
                type="button"
                onClick={() => setExpanded(p => !p)}
                style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.7rem 1rem', background: 'none', border: 'none',
                    color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer'
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <InfoSVG /> Fee & Payout Breakdown
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                     style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>
            {expanded && (
                <div style={{ padding: '0 1rem 0.9rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {isSubscription ? (
                            // Subscription Breakdown (VIP/License)
                            [
                                { label: 'You Pay',          value: `₹${parseFloat(amount).toFixed(2)}`, color: 'var(--text)',   bold: true  },
                                { label: 'Razorpay Fee (~2%)', value: `−₹${razorpayFee}`,               color: 'var(--muted)'               },
                                { label: 'Platform Owner Receives', value: `₹${ownerGets}`, color: 'var(--green)', bold: true }
                            ].map(row => (
                                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{row.label}</span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: row.bold ? 700 : 500, color: row.color, fontFamily: 'var(--font-mono)' }}>{row.value}</span>
                                </div>
                            ))
                        ) : (
                            // Challenge Breakdown
                            [
                                { label: 'You Pay',          value: `₹${parseFloat(amount).toFixed(2)}`, color: 'var(--text)',   bold: true  },
                                { label: 'Razorpay Fee (~2%)', value: `−₹${razorpayFee}`,               color: 'var(--muted)'               },
                                { label: `DareVerse Platform Fee (${PLATFORM_FEE_PERCENT}%)`, value: `−₹${platformFee}`, color: 'var(--accent)' },
                                { label: 'Winner Receives',  value: `₹${winnerGets}`,                   color: 'var(--green)',  bold: true  },
                            ].map(row => (
                                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{row.label}</span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: row.bold ? 700 : 500, color: row.color, fontFamily: 'var(--font-mono)' }}>{row.value}</span>
                                </div>
                            ))
                        )}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.45rem', fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                            {isSubscription 
                                ? "💡 Subscription payments go directly to the DareVerse Platform."
                                : "💡 All payments go to DareVerse. Platform fee is retained; winner payout is processed within 2 working days."}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Main PaymentModal
───────────────────────────────────────────── */
export const PaymentModal = ({ isOpen, onClose, amount, title, onSuccess, me, isSubscription = false }) => {
    const [activeTab,  setActiveTab]  = useState('upi');   // 'upi' | 'card'
    const [selectedApp, setSelectedApp] = useState(null);   // 'gpay' | 'phonepe' | 'paytm' | null
    const [upiId,      setUpiId]      = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv,    setCardCvv]    = useState('');
    const [status,     setStatus]     = useState('idle');  // 'idle' | 'processing' | 'success'
    const [progress,   setProgress]   = useState(0);
    const [alert,      setAlert]      = useState(null);    // { type, title, message }
    const overlayRef = useRef(null);

    /* Reset on open */
    useEffect(() => {
        if (isOpen) {
            setStatus('idle'); setProgress(0);
            setUpiId(''); setCardNumber(''); setCardExpiry(''); setCardCvv('');
            setSelectedApp(null); setAlert(null); setActiveTab('upi');
        }
    }, [isOpen]);

    /* Close on overlay click */
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current && status !== 'processing') onClose();
    };

    if (!isOpen) return null;

    /* ── Select a UPI app ── */
    const handleSelectApp = (app) => {
        setSelectedApp(app.id);
        // Pre-fill the UPI ID field with the app's handle suffix hint
        if (!upiId || UPI_APPS.some(a => upiId === me?.phone + a.upiHandle)) {
            setUpiId((me?.phone || '') + app.upiHandle);
        }
        setAlert({ type: 'info', title: `${app.label} Selected`, message: `Enter your UPI ID ending in ${app.upiHandle} and click Pay Securely.` });
    };

    /* ── Submit payment ── */
    const handlePaySubmit = async (e) => {
        e.preventDefault();
        setAlert(null);
        setStatus('processing');
        setProgress(20);

        const loaded = await loadRazorpayScript();
        if (!loaded) {
            setAlert({ type: 'error', title: 'SDK Error', message: 'Could not load Razorpay. Check your internet connection.' });
            setStatus('idle'); return;
        }
        setProgress(50);

        const selectedAppCfg = UPI_APPS.find(a => a.id === selectedApp);

        const options = {
            key: 'rzp_test_T54lr8m1xSr0nA',
            amount: Math.round(parseFloat(amount) * 100),
            currency: 'INR',
            name: 'DareVerse',
            description: title,
            image: 'https://lh3.googleusercontent.com/d/1f-f_1v41zD3VExx1a21y_UvO_7f_H54l',
            handler: function (response) {
                setProgress(100);
                setStatus('success');
                setTimeout(() => {
                    onSuccess(response);
                    onClose();
                }, 2000);
            },
            prefill: {
                name:    me?.name    || 'Player',
                email:   me?.email   || 'abubakar3215a@gmail.com',
                contact: me?.phone   || '6309592888',
                method:  activeTab === 'upi' ? 'upi' : 'card',
                ...(activeTab === 'upi' && upiId ? { vpa: upiId } : {}),
            },
            theme: { color: '#FF0055' },
            modal: {
                ondismiss: () => setStatus('idle'),
                animation: true,
            }
            // We removed the custom 'config.display' blocks to allow Razorpay 
            // to natively show UPI, QR, and Cards for both desktop and mobile.
        };

        try {
            const rzp = new window.Razorpay(options);
            setProgress(80);
            rzp.on('payment.failed', (res) => {
                console.error('Payment failed:', res.error);
                setAlert({ type: 'error', title: 'Payment Failed', message: res.error?.description || 'Transaction was declined. Please try again.' });
                setStatus('idle');
            });
            rzp.open();
        } catch (err) {
            console.error('Razorpay init error:', err);
            setAlert({ type: 'error', title: 'Checkout Error', message: 'Failed to open payment checkout. Please refresh and try again.' });
            setStatus('idle');
        }
    };

    /* ── Card expiry auto-format ── */
    const handleExpiryChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
        setCardExpiry(val.slice(0, 5));
    };

    const tabs = [
        { id: 'upi',  label: 'UPI',  icon: <PhoneSVG /> },
        { id: 'card', label: 'Card', icon: <CardSVG /> }
    ];

    return (
        <>
            {/* Inline animation styles */}
            <style>{`
                @keyframes slideInDown {
                    from { opacity:0; transform:translateY(-8px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes modalPop {
                    from { opacity:0; transform:scale(0.94) translateY(12px); }
                    to   { opacity:1; transform:scale(1)    translateY(0); }
                }
                @keyframes checkBounce {
                    0%   { transform:scale(0); opacity:0; }
                    60%  { transform:scale(1.15); opacity:1; }
                    100% { transform:scale(1); }
                }
                .spin-anim { animation: spin 0.9s linear infinite; transform-origin:center; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .pm-tab-btn { transition: all 0.2s var(--ease-out); }
                .pm-tab-btn:hover { opacity:0.85; }
                .upi-app-btn { transition: all 0.22s var(--ease-out); border: 1.5px solid transparent; }
                .upi-app-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,0.4); }
                .upi-app-btn.active { transform:translateY(-2px); }
                .pm-pay-btn { transition: all 0.2s var(--ease-out); }
                .pm-pay-btn:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); box-shadow:0 8px 24px var(--accent-glow); }
                .pm-pay-btn:active { transform:translateY(0); }
            `}</style>

            {/* Overlay — scrollable on small screens */}
            <div
                ref={overlayRef}
                onClick={handleOverlayClick}
                style={{
                    position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    background: 'rgba(6,6,12,0.82)', backdropFilter: 'blur(8px)',
                    padding: '1rem',
                    overflowY: 'auto'
                }}
            >
                {/* Modal card */}
                <div style={{
                    maxWidth: '420px', width: '100%', position: 'relative',
                    borderRadius: '18px', overflow: 'visible',
                    background: 'rgba(12,12,22,0.97)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 40px rgba(255,0,85,0.08)',
                    animation: 'modalPop 0.3s var(--ease-out)',
                    padding: '2rem',
                    margin: 'auto'
                }}>
                    {/* Close button */}
                    {status !== 'success' && (
                        <button
                            onClick={onClose}
                            disabled={status === 'processing'}
                            style={{
                                position: 'absolute', top: '1.1rem', right: '1.1rem',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                borderRadius: '50%', width: '32px', height: '32px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--muted)', cursor: 'pointer',
                                transition: 'all 0.2s', opacity: status === 'processing' ? 0.3 : 1
                            }}
                        >
                            <CloseSVG />
                        </button>
                    )}

                    {/* ── IDLE STATE ── */}
                    {status === 'idle' && (
                        <>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    display: 'inline-flex', padding: '0.65rem',
                                    background: 'rgba(0,240,255,0.08)', borderRadius: '50%',
                                    color: 'var(--neon)', marginBottom: '0.6rem',
                                    boxShadow: '0 0 20px rgba(0,240,255,0.15)'
                                }}>
                                    <ShieldSVG />
                                </div>
                                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', margin: '0 0 0.2rem' }}>
                                    Secure Checkout
                                </h3>
                                <p style={{ color: 'var(--muted)', fontSize: '0.78rem', margin: '0 0 0.6rem' }}>{title}</p>
                                <div style={{
                                    fontSize: '2.2rem', fontWeight: 800, color: '#fff',
                                    fontFamily: 'var(--font-mono)',
                                    textShadow: '0 0 30px rgba(255,255,255,0.2)'
                                }}>
                                    ₹{parseFloat(amount).toFixed(2)}
                                </div>
                            </div>

                            {/* Alert box */}
                            {alert && <AlertBox {...alert} onClose={() => setAlert(null)} />}

                            {/* Tabs */}
                            <div style={{
                                display: 'flex', gap: '0.4rem',
                                background: 'rgba(255,255,255,0.02)', padding: '0.3rem',
                                borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.25rem'
                            }}>
                                {tabs.map(t => (
                                    <button
                                        key={t.id} type="button"
                                        onClick={() => setActiveTab(t.id)}
                                        className="pm-tab-btn"
                                        style={{
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            gap: '0.35rem', padding: '0.5rem',
                                            border: 'none', borderRadius: '7px', cursor: 'pointer',
                                            background: activeTab === t.id ? 'rgba(255,0,85,0.12)' : 'transparent',
                                            color: activeTab === t.id ? 'var(--accent)' : 'var(--muted)',
                                            fontWeight: 600, fontSize: '0.82rem',
                                            boxShadow: activeTab === t.id ? 'inset 0 0 0 1px rgba(255,0,85,0.3)' : 'none'
                                        }}
                                    >
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handlePaySubmit}>
                                {/* ── UPI TAB ── */}
                                {activeTab === 'upi' && (
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        {/* App picker */}
                                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            Quick Pay with App
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
                                            {UPI_APPS.map(app => (
                                                <button
                                                    key={app.id}
                                                    type="button"
                                                    onClick={() => handleSelectApp(app)}
                                                    className={`upi-app-btn ${selectedApp === app.id ? 'active' : ''}`}
                                                    style={{
                                                        flex: 1, display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', gap: '0.4rem', padding: '0.65rem 0.4rem',
                                                        borderRadius: '10px', cursor: 'pointer',
                                                        background: selectedApp === app.id
                                                            ? `linear-gradient(135deg, ${app.color}22, ${app.color}11)`
                                                            : 'rgba(255,255,255,0.03)',
                                                        borderColor: selectedApp === app.id ? app.color : 'rgba(255,255,255,0.08)',
                                                        boxShadow: selectedApp === app.id ? `0 0 18px ${app.color}33` : 'none'
                                                    }}
                                                >
                                                    {app.icon}
                                                    <span style={{ fontSize: '0.65rem', color: selectedApp === app.id ? '#fff' : 'var(--muted)', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                                                        {app.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* UPI ID field */}
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.72rem' }}>UPI ID / VPA</label>
                                            <input
                                                type="text"
                                                placeholder="yourname@okaxis"
                                                value={upiId}
                                                onChange={(e) => setUpiId(e.target.value)}
                                                required
                                                pattern="[a-zA-Z0-9.\-_+]+@[a-zA-Z0-9.\-]+"
                                                title="Enter a valid UPI address e.g. name@okaxis"
                                                style={{ marginBottom: '0.5rem' }}
                                            />
                                        </div>

                                        <AlertBox
                                            type="info"
                                            message={isSubscription 
                                                ? "Payment goes securely to DareVerse. Razorpay will automatically show a QR code or UPI app options on the next screen."
                                                : "Your payment goes to DareVerse. After the challenge, the winner receives their payout minus platform fee."}
                                        />
                                    </div>
                                )}

                                {/* ── CARD TAB ── */}
                                {activeTab === 'card' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.72rem' }}>Card Number</label>
                                            <input
                                                type="text" placeholder="4111 2222 3333 4444"
                                                value={cardNumber}
                                                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                                                required minLength={16} maxLength={16}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.85rem' }}>
                                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.72rem' }}>Expiry</label>
                                                <input
                                                    type="text" placeholder="MM/YY"
                                                    value={cardExpiry} onChange={handleExpiryChange}
                                                    required maxLength={5}
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.72rem' }}>CVV</label>
                                                <input
                                                    type="password" placeholder="•••"
                                                    value={cardCvv}
                                                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                                                    required minLength={3} maxLength={3}
                                                />
                                            </div>
                                        </div>
                                        <AlertBox
                                            type="warn"
                                            message="Card details are collected securely by Razorpay. DareVerse never stores your card information."
                                        />
                                    </div>
                                )}

                                {/* Fee breakdown */}
                                <FeeBreakdown amount={amount} isSubscription={isSubscription} />

                                {/* Pay button */}
                                <button
                                    type="submit"
                                    className="pm-pay-btn"
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        gap: '0.5rem', padding: '0.85rem 1.25rem',
                                        background: 'linear-gradient(135deg, var(--accent), #c0003a)',
                                        border: 'none', borderRadius: '10px', color: '#fff',
                                        fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                                        fontFamily: 'var(--font-heading)',
                                        boxShadow: '0 4px 18px var(--accent-glow)'
                                    }}
                                >
                                    <ShieldSVG /> Pay ₹{parseFloat(amount).toFixed(2)} Securely <ArrowSVG />
                                </button>

                                <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.75rem' }}>
                                    🔒 256-bit SSL secured · Powered by Razorpay
                                </p>
                            </form>
                        </>
                    )}

                    {/* ── PROCESSING STATE ── */}
                    {status === 'processing' && (
                        <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                            <div style={{ color: 'var(--neon)', margin: '0 auto 1.25rem', display: 'inline-block' }}>
                                <SpinnerSVG />
                            </div>
                            <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}>
                                Verifying Transaction
                            </h4>
                            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                                Please do not close or refresh this page.
                            </p>
                            {/* Progress bar */}
                            <div style={{
                                marginTop: '1.5rem', background: 'rgba(255,255,255,0.05)',
                                borderRadius: '20px', height: '6px', overflow: 'hidden',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{
                                    background: 'linear-gradient(90deg, var(--neon), var(--accent))',
                                    height: '100%', width: `${progress}%`,
                                    transition: 'width 0.4s linear',
                                    boxShadow: '0 0 8px var(--neon)'
                                }} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.5rem' }}>{progress}% complete</div>
                        </div>
                    )}

                    {/* ── SUCCESS STATE ── */}
                    {status === 'success' && (
                        <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                            <div style={{
                                color: 'var(--green)', margin: '0 auto 1.25rem',
                                display: 'inline-block',
                                animation: 'checkBounce 0.6s var(--ease-out)',
                                filter: 'drop-shadow(0 0 18px rgba(0,230,118,0.5))'
                            }}>
                                <CheckSVG />
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.35rem' }}>
                                Payment Successful! 🎉
                            </h3>
                            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                                Transaction completed. Your challenge entry is confirmed.
                            </p>
                            <AlertBox
                                type="success"
                                title="What happens next?"
                                message={isSubscription 
                                    ? "Your subscription is now active! Enjoy your new perks immediately."
                                    : `The prize pool is held by DareVerse. Once a winner is declared, they receive their payout (after ${PLATFORM_FEE_PERCENT}% platform fee) within 2 working days.`}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PaymentModal;
