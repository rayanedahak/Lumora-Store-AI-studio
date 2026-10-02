import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  ExternalLink,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Minus,
  Plus,
  Loader2,
  PackageCheck,
  Copy,
  Check,
  Tag,
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  quantity: number;
  onQuantityChange: (newQty: number) => void;
  productImage: string;
  initialSessionId?: string | null;
}

interface CompletedOrderDetails {
  id?: string;
  stripe_session_id: string;
  cj_order_id?: string;
  cj_fulfillment_status?: string;
  customer_name: string;
  customer_email: string;
  shipping_address: {
    line1: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
  quantity: number;
  amount_total: number;
}

/**
 * Calculates base CAD combo pricing:
 * Buy 1 = $69.99 CAD ($0 off)
 * Buy 2 = $134.98 CAD ($5 off)
 * Buy 3 = $199.97 CAD ($10 off)
 * Buy N = (N * $69.99) - ((N - 1) * $5.00) CAD
 */
export function getComboPricing(qty: number) {
  const cleanQty = Math.max(1, Math.min(10, Math.floor(qty || 1)));
  const unitPrice = 69.99;
  const subtotal = Number((cleanQty * unitPrice).toFixed(2));
  const discount = cleanQty > 1 ? (cleanQty - 1) * 5 : 0;
  const total = Number((subtotal - discount).toFixed(2));
  return { quantity: cleanQty, unitPrice, subtotal, discount, total };
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  quantity,
  onQuantityChange,
  productImage,
  initialSessionId = null,
}) => {
  const { currency, formatPrice } = useCurrency();

  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const [isVerifyingRedirectOrder, setIsVerifyingRedirectOrder] =
    useState(false);
  const [completedOrder, setCompletedOrder] =
    useState<CompletedOrderDetails | null>(null);

  const pricing = getComboPricing(quantity);

  // Only show Order Confirmed after returning from a paid Stripe Checkout redirect (success_url)
  useEffect(() => {
    if (!initialSessionId) {
      setCompletedOrder(null);
      return;
    }

    if (initialSessionId && isOpen) {
      setIsVerifyingRedirectOrder(true);
      setSessionError(null);
      fetch('/api/orders/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: initialSessionId }),
      })
        .then(async (r) => {
          const data = await r.json();
          if (r.ok && data?.order) {
            setCompletedOrder(data.order);
          } else {
            setCompletedOrder(null);
            setSessionError(
              data?.error || 'Could not verify completed Stripe payment.'
            );
          }
        })
        .catch(() => {
          setCompletedOrder(null);
        })
        .finally(() => setIsVerifyingRedirectOrder(false));
    }
  }, [initialSessionId, isOpen]);

  // Dynamically re-create the Stripe Checkout Session whenever quantity changes
  useEffect(() => {
    if (!isOpen || completedOrder) return;

    let cancelled = false;
    async function createStripeSession() {
      setIsCreatingSession(true);
      setSessionError(null);
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: pricing.quantity }),
        });
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && data.url) {
            setSessionUrl(data.url);
          } else {
            setSessionError(data.error || 'Could not initialize Stripe checkout');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSessionError(
            err instanceof Error ? err.message : 'Network error during checkout'
          );
        }
      } finally {
        if (!cancelled) {
          setIsCreatingSession(false);
        }
      }
    }

    createStripeSession();
    return () => {
      cancelled = true;
    };
  }, [isOpen, pricing.quantity, completedOrder]);

  const handleCopyOrderId = (idToCopy: string) => {
    navigator.clipboard?.writeText(idToCopy);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleRedirectToStripe = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (sessionUrl) {
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = sessionUrl;
          e.preventDefault();
        }
      } catch {
        // Let the anchor tag open Stripe Checkout normally if cross-origin top navigation is restricted
      }
      return;
    }

    e.preventDefault();
    setIsCreatingSession(true);
    setSessionError(null);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: pricing.quantity }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setSessionUrl(data.url);
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
            return;
          }
        } catch {
          // Fallback to window.location.assign
        }
        window.location.assign(data.url);
      } else {
        setSessionError(data.error || 'Could not initialize Stripe checkout');
      }
    } catch (err) {
      setSessionError(
        err instanceof Error ? err.message : 'Network error during checkout'
      );
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1A2A3A]/70 backdrop-blur-xs"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white text-[#1A2A3A] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#1A2A3A]">
                  {completedOrder
                    ? 'Order Confirmed'
                    : `Your Cart (${pricing.quantity} ${
                        pricing.quantity === 1 ? 'Item' : 'Items'
                      })`}
                </h2>
                <p className="text-xs text-slate-500">
                  Complimentary Tracked Shipping · Prices in {currency}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close checkout drawer"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#1A2A3A] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {isVerifyingRedirectOrder ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FFA500]" />
                  <p className="text-base font-bold text-[#1A2A3A]">
                    Verifying your Stripe payment...
                  </p>
                  <p className="text-sm text-slate-500">
                    Please wait a moment while we confirm your order details.
                  </p>
                </div>
              ) : completedOrder ? (
                <div className="space-y-6">
                  <div className="rounded-xl bg-[#F8FAFC] p-5 sm:p-6 border border-slate-200/80">
                    <div className="flex items-center gap-3 text-emerald-700 mb-3">
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                      <span className="text-base font-bold">
                        Thank you for your order, {completedOrder.customer_name}!
                      </span>
                    </div>
                    <p className="text-base text-slate-600 leading-relaxed">
                      Your Stripe payment has been verified and your order is now
                      being prepared for shipment.
                      {completedOrder.customer_email && (
                        <>
                          {' '}
                          We&apos;ve sent a confirmation receipt to{' '}
                          <span className="font-semibold text-[#1A2A3A] break-all">
                            {completedOrder.customer_email}
                          </span>
                          .
                        </>
                      )}
                    </p>
                  </div>

                  {/* Order Tracking Reference Box */}
                  <div className="rounded-xl bg-[#1A2A3A] p-5 text-white space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-300 font-medium">
                        Your Order ID (Save to track your shipment)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyOrderId(completedOrder.stripe_session_id)
                        }
                        className="inline-flex items-center gap-1.5 min-h-[36px] px-2 text-xs font-bold text-[#FFA500] hover:underline cursor-pointer shrink-0"
                      >
                        {copiedOrderId ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-base font-bold text-[#FFA500] tracking-wider break-all">
                      {completedOrder.stripe_session_id}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      You can enter this Order ID anytime in the Order Tracking
                      section in the footer for live delivery updates.
                    </p>
                  </div>

                  {/* Order Summary */}
                  <div className="space-y-4 border-t border-slate-200 pt-5 text-sm sm:text-base">
                    <h3 className="font-bold text-[#1A2A3A]">Order Summary</h3>
                    <div className="space-y-2.5 text-slate-600">
                      <div className="flex justify-between gap-4">
                        <span>Product</span>
                        <span className="font-semibold text-[#1A2A3A] text-right">
                          Lumora Smart Sunset Lamp × {completedOrder.quantity}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Total Paid</span>
                        <span className="font-bold text-[#1A2A3A] tabular-nums">
                          {formatPrice(Number(completedOrder.amount_total))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Status</span>
                        <span className="font-semibold text-emerald-700 text-right">
                          Paid · Preparing Shipment
                        </span>
                      </div>
                      {completedOrder.shipping_address?.line1 && (
                        <div className="flex justify-between gap-4">
                          <span>Shipping Address</span>
                          <span className="text-right text-xs sm:text-sm text-[#1A2A3A]">
                            {completedOrder.shipping_address.line1},{' '}
                            {completedOrder.shipping_address.city}{' '}
                            {completedOrder.shipping_address.postal_code} (
                            {completedOrder.shipping_address.country})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#F8FAFC] p-4 border border-slate-200/80 flex items-start gap-3">
                    <PackageCheck className="h-5 w-5 text-[#FFA500] shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                      Estimated delivery within{' '}
                      <strong className="text-[#1A2A3A]">4–7 business days</strong>.
                      Your tracking status updates automatically in our Order
                      Tracker.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCompletedOrder(null);
                      onClose();
                    }}
                    className="w-full min-h-[52px] rounded-xl bg-[#1A2A3A] py-4 text-base font-bold text-white transition-transform hover:scale-[1.01] cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Product Line Item */}
                  <div className="flex flex-col sm:flex-row gap-4 border-b border-slate-200 pb-6">
                    <div className="flex gap-4">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-[#F8FAFC] border border-slate-200">
                        <img
                          src={productImage}
                          alt="Lumora Smart Sunset Projection Lamp"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-bold text-[#1A2A3A]">
                              Lumora Smart Sunset Lamp
                            </h3>
                            <div className="text-right shrink-0">
                              <span className="text-base font-bold text-[#1A2A3A] tabular-nums">
                                {formatPrice(pricing.total)}
                              </span>
                              {pricing.discount > 0 && (
                                <p className="text-xs text-slate-400 line-through tabular-nums">
                                  {formatPrice(pricing.subtotal)}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Cast-Aluminum Head · Weighted Iron Base · App + RGB Remote
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-[#F8FAFC]">
                            <button
                              type="button"
                              onClick={() =>
                                onQuantityChange(Math.max(1, pricing.quantity - 1))
                              }
                              aria-label="Decrease quantity"
                              className="flex h-10 w-10 items-center justify-center text-slate-600 hover:text-[#1A2A3A] cursor-pointer"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-3 text-sm font-bold tabular-nums">
                              {pricing.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onQuantityChange(Math.min(10, pricing.quantity + 1))
                              }
                              aria-label="Increase quantity"
                              className="flex h-10 w-10 items-center justify-center text-slate-600 hover:text-[#1A2A3A] cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="text-xs text-emerald-700 font-semibold">
                            {pricing.discount > 0
                              ? `Combo Savings (-${formatPrice(pricing.discount)})`
                              : `Add 1 more for ${formatPrice(5)} off`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Combo Deal Switcher Inside Cart */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-[#1A2A3A]">
                      Combo Deal Tiers:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          qty: 1,
                          title: 'Buy 1',
                          price: formatPrice(69.99),
                          save: 'Standard',
                        },
                        {
                          qty: 2,
                          title: 'Buy 2',
                          price: formatPrice(134.98),
                          save: `Save ${formatPrice(5, false)}`,
                        },
                        {
                          qty: 3,
                          title: 'Buy 3',
                          price: formatPrice(199.97),
                          save: `Save ${formatPrice(10, false)}`,
                        },
                      ].map((tier) => (
                        <button
                          key={tier.qty}
                          type="button"
                          onClick={() => onQuantityChange(tier.qty)}
                          className={`flex sm:flex-col items-center justify-between sm:justify-center rounded-xl border p-3 text-left sm:text-center transition-all cursor-pointer min-h-[48px] ${
                            pricing.quantity === tier.qty
                              ? 'border-[#FFA500] bg-[#FFA500]/10'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs font-extrabold text-[#1A2A3A]">
                            {tier.title}
                          </span>
                          <div className="flex sm:flex-col items-baseline sm:items-center gap-2 sm:gap-0.5">
                            <span className="text-xs sm:text-sm font-bold text-[#1A2A3A] tabular-nums">
                              {tier.price}
                            </span>
                            <span className="text-xs font-semibold text-emerald-700">
                              {tier.save}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtotal & Combo Discount Breakdown */}
                  <div className="space-y-2.5 text-sm sm:text-base border-y border-slate-200 py-4">
                    <div className="flex justify-between text-slate-600">
                      <span>
                        Regular Price ({pricing.quantity} × {formatPrice(69.99)})
                      </span>
                      <span className="tabular-nums font-medium text-[#1A2A3A]">
                        {formatPrice(pricing.subtotal)}
                      </span>
                    </div>
                    {pricing.discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <Tag className="h-4 w-4" />
                          <span>Combo Deal Discount</span>
                        </span>
                        <span className="tabular-nums">
                          -{formatPrice(pricing.discount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Tracked Express Shipping</span>
                      <span className="font-semibold text-emerald-700">FREE</span>
                    </div>
                    <div className="flex justify-between pt-2 text-lg font-extrabold text-[#1A2A3A] border-t border-slate-100">
                      <span>Total</span>
                      <span className="tabular-nums">
                        {formatPrice(pricing.total)}
                      </span>
                    </div>
                    {currency !== 'CAD' && (
                      <p className="text-xs text-slate-500 pt-1">
                        Displayed in {currency} for your convenience. Checkout is
                        processed in CAD (${pricing.total.toFixed(2)} CAD).
                      </p>
                    )}
                  </div>

                  {sessionError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-700">
                      {sessionError}
                    </div>
                  )}

                  {/* Single Stripe Checkout Flow */}
                  <div className="space-y-4">
                    <div className="rounded-xl bg-[#F8FAFC] p-4 border border-slate-200/80 space-y-1.5">
                      <p className="text-sm font-bold text-[#1A2A3A]">
                        256-Bit Encrypted Stripe Checkout
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        Shipping address and payment details are securely
                        collected on Stripe Checkout. Have a promo code like{' '}
                        <code className="font-mono font-bold text-[#1A2A3A]">
                          LUMORA10
                        </code>
                        ? Enter it on the Stripe payment page.
                      </p>
                    </div>

                    {isCreatingSession ? (
                      <button
                        disabled
                        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#FFA500]/70 py-4 text-base font-bold text-[#1A2A3A]"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Preparing Secure Stripe Checkout...</span>
                      </button>
                    ) : (
                      <a
                        href={sessionUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleRedirectToStripe}
                        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#FFA500] py-4 px-5 text-sm sm:text-base font-extrabold text-[#1A2A3A] shadow-md transition-transform hover:scale-[1.01] text-center cursor-pointer"
                      >
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>Secure Checkout with Stripe</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    )}
                  </div>

                  {/* Trust Footnote */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[#FFA500] shrink-0" />
                      <span>Free Tracked Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#FFA500] shrink-0" />
                      <span>30-Day Money-Back Promise</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
