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
    const [status,     setStatus]     = useState('idle');  // 'idle' | 'processing' | 'success'
    const [progress,   setProgress]   = useState(0);
    const [alert,      setAlert]      = useState(null);    // { type, title, message }
    const overlayRef = useRef(null);

    /* Reset on open */
    useEffect(() => {
        if (isOpen) {
            setStatus('idle'); setProgress(0);
            setAlert(null);
        }
    }, [isOpen]);

    /* Close on overlay click */
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current && status !== 'processing') onClose();
    };

    if (!isOpen) return null;
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
    };

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

                            <form onSubmit={handlePaySubmit}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <AlertBox
                                        type="info"
                                        message={isSubscription 
                                            ? "Payment goes securely to DareVerse. Razorpay will automatically show all payment options (UPI, Cards, Netbanking) on the next screen."
                                            : "Your payment goes to DareVerse. After the challenge, the winner receives their payout minus platform fee."}
                                    />
                                </div>

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
