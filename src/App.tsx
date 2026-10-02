/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
} from 'motion/react';
import {
  Smartphone,
  Palette,
  Usb,
  ShieldCheck,
  Star,
  Check,
  ChevronDown,
  ArrowRight,
  Plug,
  Sparkles,
  Truck,
  RotateCcw,
  Send,
  CheckCircle2,
  Loader2,
  Sliders,
  Search,
  Package,
  ShoppingBag,
  Minus,
  Plus,
  Tag,
  Lock,
  ExternalLink,
  Menu,
  X,
  Globe,
} from 'lucide-react';
import { LumoraLogo } from './components/LumoraLogo';
import { CheckoutModal, getComboPricing } from './components/CheckoutModal';
import { CurrencySelector } from './components/CurrencySelector';
import { LumoraChatWidget } from './components/LumoraChatWidget';
import { useCurrency } from './context/CurrencyContext';

// High-Resolution Product & Lifestyle Visual Assets (YCX-010 Accurate Hardware)
const HERO_IMAGE =
  '/images/lumora_hero_living_room_1790814490818.jpg';
const YCX_STUDIO_HERO =
  '/images/lumora_ycx010_studio_hero_1790894525684.jpg';
const YCX_GOLDEN_SILHOUETTE =
  '/images/lumora_ycx010_golden_silhouette_1790894545824.jpg';
const YCX_AURORA_CYAN =
  '/images/lumora_ycx010_aurora_cyan_purple_1790894537185.jpg';
const YCX_MODULAR_PARTS =
  '/images/lumora_ycx010_modular_components_1790894555027.jpg';
const UGC_FLORAL_VANITY =
  '/images/lumora_ugc_floral_vanity_1790814529123.jpg';
const UGC_READING_CORNER =
  '/images/lumora_ugc_reading_corner_1790814538988.jpg';

async function safeParseApiJson<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      'Unable to connect to the checkout server. Please verify your API deployment and environment variables.'
    );
  }
}

interface MoodPreset {
  id: string;
  name: string;
  kelvin: string;
  hex: string;
  overlayGradient: string;
  description: string;
}

const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    kelvin: '2200K Sunset Core',
    hex: '#FFA500',
    overlayGradient:
      'radial-gradient(circle at 65% 45%, rgba(255, 165, 0, 0.28), rgba(255, 94, 0, 0.14) 45%, transparent 75%)',
    description: 'Warm California dusk glow for effortless evening relaxation.',
  },
  {
    id: 'crimson-dusk',
    name: 'Crimson Dusk',
    kelvin: '1800K Deep Horizon',
    hex: '#FF4D2D',
    overlayGradient:
      'radial-gradient(circle at 65% 45%, rgba(255, 77, 45, 0.34), rgba(180, 25, 65, 0.18) 45%, transparent 75%)',
    description: 'Rich amber-red projection designed for intimate late-night vibes.',
  },
  {
    id: 'aurora-cyan',
    name: 'Aurora Halo',
    kelvin: 'Cyan-Violet Spectrum',
    hex: '#06B6D4',
    overlayGradient:
      'radial-gradient(circle at 65% 45%, rgba(168, 85, 247, 0.32), rgba(6, 182, 212, 0.24) 45%, transparent 75%)',
    description: 'Electric turquoise rim with a deep ultraviolet-purple core.',
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    kelvin: '2700K Warm Sanctuary',
    hex: '#F59E0B',
    overlayGradient:
      'radial-gradient(circle at 65% 45%, rgba(245, 158, 11, 0.30), rgba(217, 119, 6, 0.12) 45%, transparent 75%)',
    description: 'Soft architectural warmth that replaces harsh overhead bulbs.',
  },
];

const PRODUCT_GALLERY = [
  {
    src: YCX_STUDIO_HERO,
    label: 'Lumora YCX-010 Cast-Aluminum & Iron Base',
    alt: 'Lumora sunset projection lamp with conical matte-black iron base, chrome swivel joint, and convex crystal dome lens',
  },
  {
    src: YCX_GOLDEN_SILHOUETTE,
    label: 'Multi-Color Sunset Halo Projection',
    alt: 'Silhouette of Lumora lamp with conical base and silver chrome neck joint casting a vivid golden-orange sunset circle',
  },
  {
    src: YCX_AURORA_CYAN,
    label: 'Cyan & Ultraviolet Aurora Mode',
    alt: 'Lumora lamp projecting an electric turquoise outer ring and deep violet center halo onto wall',
  },
  {
    src: YCX_MODULAR_PARTS,
    label: 'Modular Assembly & 24-Key RGB Remote',
    alt: 'Flat-lay of cast-aluminum lamp head, straight metal rod, weighted iron base, and 24-key RGB remote control',
  },
  {
    src: HERO_IMAGE,
    label: 'Living Room Dusk Immersion',
    alt: 'Lumora sunset lamp beside living room sofa and sheer curtains projecting a warm sunset halo',
  },
];

const UGC_REVIEWS = [
  {
    image: YCX_GOLDEN_SILHOUETTE,
    room: 'Living Room Lounge · Los Angeles, CA',
    quote:
      'The vibe change is insane. That crisp golden-orange halo turns our blank living room wall into a sunset horizon in 2 seconds.',
    author: 'Sarah M.',
    role: 'Interior Stylist',
    rating: '5.0',
  },
  {
    image: YCX_AURORA_CYAN,
    room: 'Creative Studio · Brooklyn, NY',
    quote:
      'Switching from warm golden hour to the turquoise-violet aurora halo completely transforms my studio for late-night sessions.',
    author: 'Marcus T.',
    role: 'Visual Director',
    rating: '5.0',
  },
  {
    image: UGC_READING_CORNER,
    room: 'Evening Reading Nook · Austin, TX',
    quote:
      'I turn off all overhead bulbs and read under the Lumora sunset glow every night. Zero harsh glare and so calming before sleep.',
    author: 'Elena R.',
    role: 'Wellness Instructor',
    rating: '5.0',
  },
  {
    image: UGC_FLORAL_VANITY,
    room: 'Bedroom Dresser · Seattle, WA',
    quote:
      'The heavy iron base and cast-aluminum head feel super solid, and having both the phone app and the physical RGB remote is so convenient.',
    author: 'Maya L.',
    role: 'Interior Creator',
    rating: '5.0',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Does it need Wi-Fi?',
    answer:
      'No Wi-Fi is required. Lumora pairs directly with your smartphone via Bluetooth in seconds, and also comes with a physical 24-key RGB remote control right in the box so you can switch between 16 colors and 4 dynamic fade modes anytime.',
  },
  {
    question: 'How do I control it?',
    answer:
      'You get dual control right out of the box: use the companion mobile app (iOS & Android) for custom color wheels, dimming, and schedules, or use the included 24-key RGB remote control to switch colors, adjust brightness, and cycle gradient modes from across the room.',
  },
  {
    question: "What's the shipping time?",
    answer:
      'Orders are processed within 1–3 business days and delivered in 4–7 business days via tracked express shipping. You can track your order status anytime in the Order Tracking section in our footer.',
  },
  {
    question: 'Is it bright enough?',
    answer:
      'Yes. Engineered with a high-efficiency LED optical core and a thick crystal dome lens housed in cast aluminum, a single lamp projects a crisp, vibrant circular sunset halo across an entire wall or ceiling while remaining cool to the touch (rated for over 30,000 hours).',
  },
];

interface TrackedOrderInfo {
  stripe_session_id: string;
  customer_name: string;
  quantity: number;
  amount_total: number;
  payment_status: string;
  cj_fulfillment_status?: string;
  shipping_address?: {
    line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  created_at?: string;
}

declare global {
  interface Window {
    Tally?: {
      loadEmbeds: () => void;
    };
  }
}

export default function App() {
  const {
    currency,
    formatPrice,
    currencyToast,
    dismissCurrencyToast,
  } = useCurrency();

  const prefersReducedMotion = useReducedMotion();
  const [isMobileScreen, setIsMobileScreen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Reduce Framer Motion stagger values and animation complexity on mobile screens
  // for smoother 60fps scrolling performance on low-end mobile devices
  const useLightMotion = Boolean(isMobileScreen || prefersReducedMotion);
  const fadeUpY = useLightMotion ? 6 : 20;
  const baseDuration = useLightMotion ? 0.2 : 0.42;
  const getStaggerDelay = (idx: number, desktopStep = 0.08) =>
    useLightMotion ? Math.min(idx * 0.02, 0.06) : idx * desktopStep;

  // Fluid Hero Background Parallax on Scroll
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroSectionRef,
    offset: ['start start', 'end start'],
  });
  const smoothHeroScroll = useSpring(heroScrollProgress, {
    stiffness: useLightMotion ? 140 : 85,
    damping: useLightMotion ? 30 : 24,
    mass: 0.35,
    restDelta: 0.001,
  });
  const heroBgY = useTransform(
    smoothHeroScroll,
    [0, 1],
    prefersReducedMotion
      ? ['0%', '0%']
      : isMobileScreen
      ? ['0%', '10%']
      : ['0%', '24%']
  );
  const heroBgScale = useTransform(
    smoothHeroScroll,
    [0, 1],
    prefersReducedMotion
      ? [1, 1]
      : isMobileScreen
      ? [1.03, 1.08]
      : [1.05, 1.18]
  );
  const heroAuraOpacity = useTransform(
    smoothHeroScroll,
    [0, 0.65, 1],
    [1, 0.88, 0.5]
  );
  const heroForegroundY = useTransform(
    smoothHeroScroll,
    [0, 1],
    prefersReducedMotion || isMobileScreen ? [0, 0] : [0, -28]
  );

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMood, setActiveMood] = useState<MoodPreset>(MOOD_PRESETS[0]);
  const [roomComparison, setRoomComparison] = useState<'sterile' | 'lumora'>(
    'lumora'
  );
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [cartQuantity, setCartQuantity] = useState(1);
  const [cartAddedNotice, setCartAddedNotice] = useState(false);
  const [cartStripeUrl, setCartStripeUrl] = useState<string | null>(null);
  const [isSyncingCartStripe, setIsSyncingCartStripe] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedPricing = getComboPricing(selectedQuantity);
  const cartPricing = getComboPricing(cartQuantity);

  // Checkout Drawer State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [returnedSessionId, setReturnedSessionId] = useState<string | null>(
    null
  );

  // Contact Section Mode ('tally' embed vs 'quick' form)
  const [contactTab, setContactTab] = useState<'tally' | 'quick'>('tally');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  // Footer Order Tracking State (Connected to Supabase 'orders' table)
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrderInfo | null>(
    null
  );
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 36);
    };
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    handleScroll();
    handleResize();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize Tally Embed Widget
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.Tally) {
        window.Tally.loadEmbeds();
      } else {
        const iframes = document.querySelectorAll<HTMLIFrameElement>(
          'iframe[data-tally-src]:not([src])'
        );
        iframes.forEach((el) => {
          if (el.dataset.tallySrc) {
            el.src = el.dataset.tallySrc;
          }
        });
      }
    }
  }, [contactTab]);

  // Check if returning from Stripe Checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    const sessionId = params.get('session_id');
    if (checkoutState === 'success' && sessionId) {
      setReturnedSessionId(sessionId);
      setIsCheckoutOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleOpenCheckout = (qty = selectedQuantity) => {
    setSelectedQuantity(qty);
    setCartQuantity(qty);
    setIsMobileMenuOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleAddToCart = (qtyToAdd = selectedQuantity) => {
    setCartQuantity(qtyToAdd);
    setCartAddedNotice(true);
    setTimeout(() => setCartAddedNotice(false), 2500);
  };

  // Dynamically update Stripe Checkout session whenever cartQuantity changes
  // Actual Stripe checkout stays in CAD ($69.99 CAD base)
  useEffect(() => {
    let cancelled = false;
    async function syncStripeSession() {
      setIsSyncingCartStripe(true);
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: cartPricing.quantity,
            origin: window.location.origin,
          }),
        });
        const data = await safeParseApiJson<{ url?: string }>(res);
        if (!cancelled && res.ok && data.url) {
          setCartStripeUrl(data.url);
        }
      } catch {
        // Handled in CheckoutModal if clicked
      } finally {
        if (!cancelled) {
          setIsSyncingCartStripe(false);
        }
      }
    }
    syncStripeSession();
    return () => {
      cancelled = true;
    };
  }, [cartPricing.quantity]);

  // Contact Form Handler (Validated & Sanitized on Backend)
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim())
      return;

    setIsSubmittingContact(true);
    setContactError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          message: contactMessage.trim(),
        }),
      });
      const data = await safeParseApiJson<{ error?: string }>(res);

      if (res.ok) {
        setContactSuccess(true);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      } else {
        setContactError(
          data.error || 'Could not send message. Please try again.'
        );
      }
    } catch {
      setContactError('Unable to send your message right now.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Newsletter Form Handler (Validated & Sanitized on Backend)
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) return;

    setIsSubmittingNewsletter(true);
    setNewsletterError(null);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      const data = await safeParseApiJson<{ error?: string }>(res);

      if (res.ok) {
        setNewsletterSuccess(true);
        setNewsletterEmail('');
      } else {
        setNewsletterError(data.error || 'Unable to subscribe.');
      }
    } catch {
      setNewsletterError('Unable to subscribe right now.');
    } finally {
      setIsSubmittingNewsletter(false);
    }
  };

  // Order Tracking Lookup Handler (Queries Backend -> Supabase 'orders' table with PII masking)
  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = trackingOrderId.trim();
    if (!cleanId) return;

    setIsTrackingLoading(true);
    setTrackingError(null);
    setTrackedOrder(null);

    try {
      const res = await fetch(
        `/api/orders/track?orderId=${encodeURIComponent(cleanId)}`
      );
      const data = await safeParseApiJson<{
        order?: TrackedOrderInfo;
        error?: string;
      }>(res);

      if (res.ok && data.order) {
        setTrackedOrder(data.order);
      } else {
        setTrackingError(
          data.error ||
            'Order not found. Please check your Order ID and try again.'
        );
      }
    } catch {
      setTrackingError('Unable to retrieve order status right now.');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1A2A3A] flex flex-col overflow-x-hidden">
      {/* Subtle Currency Switcher Toast Notification */}
      <AnimatePresence>
        {currencyToast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            role="status"
            aria-live="polite"
            onClick={dismissCurrencyToast}
            className="fixed top-20 right-4 sm:right-6 z-50 inline-flex items-center gap-2 rounded-xl bg-[#1A2A3A] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xl border border-[#FFA500]/60 cursor-pointer"
          >
            <Globe className="h-4 w-4 text-[#FFA500] shrink-0" />
            <span>{currencyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          1. STICKY HEADER (Mobile-First Compact Bar + Currency Switcher)
      ===================================================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
          isScrolled || isMobileMenuOpen
            ? 'bg-[#1A2A3A]/95 backdrop-blur-md shadow-lg py-3 border-b border-white/10'
            : 'bg-[#1A2A3A]/75 backdrop-blur-md py-3.5 border-b border-white/10'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-2">
          {/* Zone 1: Brand Wordmark & Horizon Sunset Icon */}
          <a
            href="#home"
            aria-label="Lumora Home"
            className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFA500]"
          >
            <LumoraLogo layout="horizontal" variant="light" />
          </a>

          {/* Zone 2: Minimalist Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-200">
            <a
              href="#home"
              className="hover:text-[#FFA500] transition-colors whitespace-nowrap"
            >
              Home
            </a>
            <a
              href="#shop"
              className="hover:text-[#FFA500] transition-colors whitespace-nowrap"
            >
              Shop
            </a>
            <a
              href="#specs"
              className="hover:text-[#FFA500] transition-colors whitespace-nowrap"
            >
              Specifications
            </a>
            <a
              href="#about"
              className="hover:text-[#FFA500] transition-colors whitespace-nowrap"
            >
              About
            </a>
            <a
              href="#contact"
              className="hover:text-[#FFA500] transition-colors whitespace-nowrap"
            >
              Contact
            </a>
          </nav>

          {/* Zone 3: Currency Switcher, Cart, Primary Action CTA & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <CurrencySelector variant="header" />

            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              aria-label="Open shopping cart"
              className="inline-flex min-h-[40px] items-center gap-1.5 sm:gap-2 rounded-full border border-white/25 bg-white/10 px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white backdrop-blur-xs transition-colors hover:border-[#FFA500] hover:bg-white/15 whitespace-nowrap cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4 text-[#FFA500] shrink-0" />
              <span className="tabular-nums">
                Cart ({cartPricing.quantity})
              </span>
              <span className="hidden md:inline tabular-nums">
                · {formatPrice(cartPricing.total)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCheckout(selectedQuantity)}
              className="hidden sm:inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#FFA500] px-4 sm:px-5 py-2 text-xs sm:text-sm font-extrabold text-[#1A2A3A] shadow-md transition-transform duration-150 hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer"
            >
              Buy Now — {formatPrice(selectedPricing.total)}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={
                isMobileMenuOpen
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
              }
              aria-expanded={isMobileMenuOpen}
              className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:border-[#FFA500] transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-[#FFA500]" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Slide-Down Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="lg:hidden border-t border-white/10 bg-[#1A2A3A] px-4 pt-4 pb-6 shadow-2xl space-y-4"
            >
              <nav className="flex flex-col space-y-1 text-base font-semibold text-slate-100">
                {[
                  { label: 'Home', href: '#home' },
                  { label: 'Shop Lumora Lamp', href: '#shop' },
                  { label: 'Shopping Cart & Combos', href: '#cart' },
                  { label: 'Technical Specifications', href: '#specs' },
                  { label: 'About & Mood Comparison', href: '#about' },
                  { label: 'FAQ', href: '#faq' },
                  { label: 'Contact Us', href: '#contact' },
                  { label: 'Track Your Order', href: '#track-order' },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center rounded-xl px-3 py-2 hover:bg-white/10 hover:text-[#FFA500] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="pt-3 border-t border-white/10">
                <CurrencySelector variant="mobile-menu" />
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenCheckout(selectedQuantity)}
                  className="flex w-full min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#FFA500] px-6 py-3.5 text-base font-extrabold text-[#1A2A3A] shadow-md cursor-pointer"
                >
                  <span>Buy Now — {formatPrice(selectedPricing.total)}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        {/* ===================================================================
            2. HERO SECTION (Fluid Scroll Parallax Background, Mobile-First Layout)
        =================================================================== */}
        <section
          ref={heroSectionRef}
          id="home"
          className="relative w-full overflow-hidden bg-[#1A2A3A] pt-24 pb-14 sm:pt-28 sm:pb-20 lg:min-h-[88vh] lg:flex lg:items-center"
        >
          {/* Full-Bleed Responsive Hero Background Image with Fluid Scroll Parallax */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-br from-[#1A2A3A] via-[#2A1F2D] to-[#FFA500]/30">
            <motion.div
              style={{
                y: heroBgY,
                scale: heroBgScale,
              }}
              className="absolute -inset-y-10 inset-x-0 will-change-transform origin-center"
            >
              <img
                src={HERO_IMAGE}
                alt="Modern luxury living room at dusk illuminated by the Lumora smart sunset projection lamp"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center opacity-85 sm:opacity-90"
              />
              <motion.div
                className="pointer-events-none absolute inset-0 transition-colors duration-300"
                style={{
                  background: activeMood.overlayGradient,
                  opacity: heroAuraOpacity,
                }}
              />
            </motion.div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-[#1A2A3A]/95 via-[#1A2A3A]/80 to-[#1A2A3A]/45" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1A2A3A] via-transparent to-[#1A2A3A]/50" />
          </div>

          <motion.div
            style={{ y: heroForegroundY }}
            className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 will-change-transform"
          >
            <div className="max-w-2xl space-y-6">
              <motion.p
                initial={{ opacity: 0, y: fadeUpY }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: baseDuration }}
                className="text-xs sm:text-sm font-semibold tracking-wider text-[#FFA500]"
              >
                Lumora Flagship Edition · App + 24-Key RGB Remote · Crystal Glass Optics
              </motion.p>

              {/* Responsive H1: 36px (text-4xl) on mobile -> 48px (text-5xl) on tablet -> 56px on desktop */}
              <motion.h1
                initial={{ opacity: 0, y: fadeUpY }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: baseDuration,
                  delay: getStaggerDelay(1, 0.06),
                }}
                className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight text-white leading-[1.12] text-balance"
              >
                Transform Your Space.{' '}
                <span className="text-[#FFA500]">Elevate Your Vibe.</span>
              </motion.h1>

              {/* Body Copy: 16px (text-base) on mobile, 18px on tablet/desktop */}
              <motion.p
                initial={{ opacity: 0, y: fadeUpY }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: baseDuration,
                  delay: getStaggerDelay(2, 0.06),
                }}
                className="text-base sm:text-[18px] text-slate-200 leading-relaxed max-w-xl"
              >
                The app-controlled sunset lamp that turns any room into a
                golden-hour paradise. 16 million colors. Endless moods.
              </motion.p>

              {/* Stacked Full-Width Button Group on Mobile (flex-col sm:flex-row) */}
              <motion.div
                initial={{ opacity: 0, y: fadeUpY }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: baseDuration,
                  delay: getStaggerDelay(3, 0.06),
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2"
              >
                <motion.button
                  type="button"
                  whileHover={useLightMotion ? undefined : { scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenCheckout(1)}
                  className="w-full sm:w-auto min-h-[52px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#FFA500] px-8 py-4 text-base font-extrabold text-[#1A2A3A] shadow-[0_0_30px_rgba(255,165,0,0.45)] transition-shadow hover:shadow-[0_0_42px_rgba(255,165,0,0.7)] whitespace-nowrap cursor-pointer"
                >
                  <span>Buy Now - {formatPrice(69.99)}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </motion.button>

                <motion.a
                  href="#shop"
                  whileHover={useLightMotion ? undefined : { scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto min-h-[52px] inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/10 px-7 py-4 text-base font-bold text-white backdrop-blur-xs transition-colors hover:border-white hover:bg-white/15 whitespace-nowrap text-center"
                >
                  See It In Action
                </motion.a>
              </motion.div>

              {/* Interactive Mood Switcher (2x2 Grid on Mobile, 4 Columns on Tablet/Desktop) */}
              <motion.div
                initial={{ opacity: 0, y: fadeUpY }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: baseDuration,
                  delay: getStaggerDelay(4, 0.06),
                }}
                className="pt-6 border-t border-white/15 max-w-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm text-slate-300 mb-3">
                  <span className="font-semibold text-white">
                    Preview Live Room Projection Aura:
                  </span>
                  <span className="text-[#FFA500] font-medium">
                    {activeMood.name} · {activeMood.kelvin}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-black/40 p-2 backdrop-blur-xs border border-white/10">
                  {MOOD_PRESETS.map((preset) => {
                    const isSelected = activeMood.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setActiveMood(preset)}
                        className={`min-h-[44px] flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-white text-[#1A2A3A] shadow-xs'
                            : 'text-slate-200 hover:text-white bg-white/5 sm:bg-transparent'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ===================================================================
            3. TRUST BADGES (1 Col Mobile -> 2 Col Tablet -> 4 Col Desktop)
        =================================================================== */}
        <section
          aria-label="Product guarantees and features"
          className="border-b border-slate-200 bg-[#F8FAFC] px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 sm:gap-6">
              {[
                {
                  icon: Smartphone,
                  title: 'App + Remote Control',
                  detail: 'Bluetooth App & 24-Key Remote',
                },
                {
                  icon: Palette,
                  title: '16M Colors',
                  detail: 'Multi-Color Halo & 4 Fade Modes',
                },
                {
                  icon: Usb,
                  title: 'USB Powered',
                  detail: '5V Universal Plug & Play Cable',
                },
                {
                  icon: ShieldCheck,
                  title: '1-Year Warranty',
                  detail: '30,000+ Hour LED Lifespan',
                },
              ].map((badge) => {
                const IconComponent = badge.icon;
                return (
                  <div
                    key={badge.title}
                    className="group flex items-center gap-4 rounded-xl bg-white p-4 sm:p-5 border border-slate-200/80 transition-shadow hover:shadow-[0_0_25px_rgba(255,165,0,0.18)]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1A2A3A] text-[#FFA500]">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-[#1A2A3A]">
                        {badge.title}
                      </p>
                      <p className="text-sm text-slate-600">{badge.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            4. PROBLEM & SOLUTION STORY (Single-Column Stack on Mobile/Tablet)
        =================================================================== */}
        <section
          id="about"
          className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24 overflow-hidden"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 lg:items-center">
              <motion.div
                initial={{ opacity: 0, y: fadeUpY }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: baseDuration }}
                className="lg:col-span-6 space-y-5 sm:space-y-6"
              >
                <div className="inline-flex items-center gap-4 pb-1">
                  <LumoraLogo layout="stacked" variant="dark" size="md" />
                </div>
                <p className="text-xs sm:text-sm font-bold tracking-wider text-[#FFA500]">
                  01. The Atmosphere Shift
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A2A3A] leading-tight text-balance">
                  Boring lighting kills the mood.
                </h2>
                <p className="text-base sm:text-[18px] text-slate-600 leading-relaxed">
                  Standard bulbs flood a room with harsh, sterile light. Lumora
                  changes that in seconds. Choose a color, set a vibe, and
                  instantly change how your room feels.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl bg-[#F8FAFC] p-5 border border-slate-200/80">
                    <p className="text-xs font-bold text-slate-500 mb-1">
                      Before Lumora
                    </p>
                    <p className="text-base font-bold text-[#1A2A3A] mb-1">
                      6000K Overhead Bulbs
                    </p>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                      Flat, clinical glare that washes out textures and keeps
                      your mind on high alert at night.
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#1A2A3A] p-5 text-white">
                    <p className="text-xs font-bold text-[#FFA500] mb-1">
                      With Lumora
                    </p>
                    <p className="text-base font-bold text-white mb-1">
                      Multi-Color Halo Projection
                    </p>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      Expansive sunset and aurora rings that turn blank walls
                      into living architectural art.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: fadeUpY }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: baseDuration }}
                className="lg:col-span-6"
              >
                {/* Clean Stacked Image + Non-Overlapping Comparison Controls */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#1A2A3A] shadow-xl">
                  <div className="relative w-full overflow-hidden">
                    <img
                      src={YCX_GOLDEN_SILHOUETTE}
                      alt="Lumora sunset lamp casting a golden-orange circular sunset halo on wall"
                      referrerPolicy="no-referrer"
                      className={`w-full h-auto aspect-[4/3] object-cover transition-all duration-300 ${
                        roomComparison === 'sterile'
                          ? 'grayscale-[88%] brightness-110 contrast-75'
                          : 'saturate-110 contrast-105'
                      }`}
                    />
                    {roomComparison === 'sterile' ? (
                      <div className="pointer-events-none absolute inset-0 bg-sky-100/25 mix-blend-overlay" />
                    ) : (
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#1A2A3A]/25 via-transparent to-[#FFA500]/15" />
                    )}
                  </div>

                  {/* Responsive Control Bar Below Image (Never Collides on Mobile) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1A2A3A] p-4 sm:px-5 sm:py-4 text-white border-t border-white/10">
                    <div>
                      <p className="text-sm font-bold text-[#FFA500]">
                        {roomComparison === 'lumora'
                          ? 'Lumora Sunset Halo Active'
                          : 'Standard Overhead Ceiling Bulb'}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-300">
                        {roomComparison === 'lumora'
                          ? 'Golden-Hour Halo · Dimmable LED'
                          : '6000K Fluorescent White · Harsh Glare'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-1.5 rounded-xl bg-black/40 p-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setRoomComparison('sterile')}
                        className={`min-h-[42px] rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          roomComparison === 'sterile'
                            ? 'bg-white text-[#1A2A3A]'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Standard Bulb
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomComparison('lumora')}
                        className={`min-h-[42px] rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          roomComparison === 'lumora'
                            ? 'bg-[#FFA500] text-[#1A2A3A]'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Lumora Vibe
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            5. PRODUCT DETAILS & CART SECTION (Mobile-First Purchase Module)
        =================================================================== */}
        <section
          id="shop"
          className="bg-[#F8FAFC] border-y border-slate-200 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-12 lg:items-start">
              {/* Left: Product Gallery */}
              <motion.div
                initial={{ opacity: 0, y: fadeUpY }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: baseDuration }}
                className="lg:col-span-7 space-y-3 sm:space-y-4"
              >
                <div className="overflow-hidden rounded-2xl bg-[#1A2A3A] border border-slate-200 shadow-lg">
                  <img
                    src={PRODUCT_GALLERY[selectedGalleryIdx].src}
                    alt={PRODUCT_GALLERY[selectedGalleryIdx].alt}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                  <div className="bg-[#1A2A3A] px-4 py-3 text-xs sm:text-sm font-medium text-slate-200 border-t border-white/10">
                    {PRODUCT_GALLERY[selectedGalleryIdx].label}
                  </div>
                </div>

                {/* Gallery Thumbnails */}
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {PRODUCT_GALLERY.map((item, idx) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setSelectedGalleryIdx(idx)}
                      aria-label={`View ${item.label}`}
                      className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                        selectedGalleryIdx === idx
                          ? 'border-[#FFA500] shadow-sm'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={item.src}
                        alt={item.alt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Right: Contiguous Purchase Module */}
              <motion.div
                initial={{ opacity: 0, y: fadeUpY }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: baseDuration,
                  delay: getStaggerDelay(1, 0.06),
                }}
                className="lg:col-span-5 rounded-2xl bg-white p-5 sm:p-8 border border-slate-200/90 shadow-sm space-y-6"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm font-medium text-slate-600">
                    <div
                      className="flex items-center text-[#FFA500]"
                      aria-label="5 out of 5 stars"
                    >
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-[#FFA500] text-[#FFA500]"
                        />
                      ))}
                    </div>
                    <span className="font-bold text-[#1A2A3A] tabular-nums">
                      4.9
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>1,284 Verified Reviews</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-semibold">
                      In Stock
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A2A3A]">
                    Lumora Smart Sunset Lamp
                  </h2>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 pb-5">
                  <span className="text-3xl font-extrabold text-[#1A2A3A] tabular-nums">
                    {formatPrice(69.99)}
                  </span>
                  <span className="text-lg text-slate-400 line-through tabular-nums">
                    {formatPrice(99.0, false)}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#FFA500]">
                    · Limited Time Offer (Save {formatPrice(29.01, false)})
                  </span>
                </div>

                <p className="text-base text-slate-600 leading-relaxed">
                  Crafted with a precision cast-aluminum UFO optical head,
                  polished chrome 180° swivel neck, and a weighted conical iron
                  base. Includes both Bluetooth app control and a 24-key RGB
                  remote control.
                </p>

                <ul className="space-y-3 text-base text-slate-700">
                  {[
                    'Dual control via smartphone app and included 24-key RGB wireless remote.',
                    '16 vivid static colors + 4 dynamic rainbow & sunset transition modes.',
                    'Thick convex crystal optical dome lens casts a huge, sharp halo ring.',
                    'Cast-aluminum head + heavy conical iron base (270 × 100 mm, 923g stability).',
                    'Dimmable 5V USB LED optical core rated for ≥ 30,000 hours of operation.',
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[#FFA500] shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                {/* Combo Deals & Quantity Selector (1, 2, 3, etc.) */}
                <div className="pt-2 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#1A2A3A]">
                      Select Quantity &amp; Combo Deal:
                    </p>
                    {selectedPricing.discount > 0 && (
                      <span className="text-xs sm:text-sm font-bold text-emerald-700">
                        Combo Savings: -{formatPrice(selectedPricing.discount)} Off
                      </span>
                    )}
                  </div>

                  {/* 3 Featured Combo Deal Tiers (Single Column on Mobile -> 3 Columns on sm+) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        qty: 1,
                        title: 'Buy 1',
                        price: formatPrice(69.99),
                        original: null,
                        badge: 'Standard Price',
                      },
                      {
                        qty: 2,
                        title: 'Buy 2 Combo',
                        price: formatPrice(134.98),
                        original: formatPrice(139.98, false),
                        badge: `Save ${formatPrice(5.0, false)}`,
                      },
                      {
                        qty: 3,
                        title: 'Buy 3 Combo',
                        price: formatPrice(199.97),
                        original: formatPrice(209.97, false),
                        badge: `Save ${formatPrice(10.0, false)}`,
                      },
                    ].map((pack) => {
                      const isSelected = selectedQuantity === pack.qty;
                      return (
                        <button
                          key={pack.qty}
                          type="button"
                          onClick={() => {
                            setSelectedQuantity(pack.qty);
                            setCartQuantity(pack.qty);
                          }}
                          className={`min-h-[56px] rounded-xl border-2 p-3.5 text-left transition-all cursor-pointer flex sm:block items-center justify-between ${
                            isSelected
                              ? 'border-[#FFA500] bg-[#FFA500]/10 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm sm:text-xs font-extrabold text-[#1A2A3A]">
                                {pack.title}
                              </span>
                              {isSelected && (
                                <Check className="h-4 w-4 text-[#FFA500] hidden sm:inline" />
                              )}
                            </div>
                            <p
                              className={`text-xs font-bold mt-0.5 sm:mt-1 ${
                                pack.original
                                  ? 'text-emerald-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {pack.badge}
                            </p>
                          </div>

                          <div className="sm:mt-1 flex items-baseline gap-1.5">
                            <span className="text-base sm:text-xs font-extrabold text-[#1A2A3A] tabular-nums">
                              {pack.price}
                            </span>
                            {pack.original && (
                              <span className="text-xs text-slate-400 line-through tabular-nums">
                                {pack.original}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Quantity Stepper (1, 2, 3, 4+) */}
                  <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F8FAFC] p-4 border border-slate-200">
                    <div>
                      <p className="text-sm font-bold text-[#1A2A3A]">
                        Custom Quantity
                      </p>
                      <p className="text-xs text-slate-600">
                        Save {formatPrice(5.0)} on every additional lamp
                      </p>
                    </div>
                    <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(1, selectedQuantity - 1);
                          setSelectedQuantity(next);
                          setCartQuantity(next);
                        }}
                        aria-label="Decrease quantity"
                        className="flex h-11 w-11 items-center justify-center text-slate-600 hover:text-[#1A2A3A] cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-4 text-base font-extrabold text-[#1A2A3A] tabular-nums">
                        {selectedQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(10, selectedQuantity + 1);
                          setSelectedQuantity(next);
                          setCartQuantity(next);
                        }}
                        aria-label="Increase quantity"
                        className="flex h-11 w-11 items-center justify-center text-slate-600 hover:text-[#1A2A3A] cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Full-Width Stacked Button Group on Mobile (flex-col sm:flex-row) */}
                <div className="space-y-3.5 pt-2">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      type="button"
                      whileHover={useLightMotion ? undefined : { scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpenCheckout(selectedQuantity)}
                      className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-[#FFA500] py-4 px-6 text-base font-extrabold text-[#1A2A3A] shadow-md transition-shadow hover:shadow-lg whitespace-nowrap cursor-pointer"
                    >
                      <span>
                        Buy Now — {formatPrice(selectedPricing.total)}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={useLightMotion ? undefined : { scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAddToCart(selectedQuantity)}
                      className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl border-2 border-[#1A2A3A] bg-white py-4 px-5 text-base font-extrabold text-[#1A2A3A] transition-colors hover:bg-[#1A2A3A] hover:text-white whitespace-nowrap cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4 shrink-0" />
                      <span>
                        {cartAddedNotice
                          ? 'Updated Cart!'
                          : `Update Cart (${selectedQuantity})`}
                      </span>
                    </motion.button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-[#1A2A3A] shrink-0" />
                      Free Tracked Shipping
                    </span>
                    <span aria-hidden="true" className="hidden sm:inline">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <RotateCcw className="h-4 w-4 text-[#1A2A3A] shrink-0" />
                      30-Day Money-Back Guarantee
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ===============================================================
                DEDICATED CART SECTION ON PRODUCT PAGE (#cart)
            =============================================================== */}
            <motion.div
              id="cart"
              initial={{ opacity: 0, y: fadeUpY }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: baseDuration }}
              className="mt-10 sm:mt-14 rounded-2xl bg-[#1A2A3A] p-5 sm:p-8 text-white shadow-xl border border-white/10"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                {/* Left: Cart Item & Quantity Controls */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="h-5 w-5 text-[#FFA500] shrink-0" />
                      <h3 className="text-lg sm:text-xl font-extrabold text-white">
                        Your Shopping Cart ({cartPricing.quantity}{' '}
                        {cartPricing.quantity === 1 ? 'Item' : 'Items'})
                      </h3>
                    </div>
                    {cartPricing.discount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#FFA500]">
                        <Tag className="h-4 w-4 shrink-0" />
                        <span>
                          Combo Deal Active (-{formatPrice(cartPricing.discount)})
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white/5 p-4 sm:p-5 border border-white/10">
                    <div className="flex items-start sm:items-center gap-4">
                      <img
                        src={YCX_STUDIO_HERO}
                        alt="Lumora Smart Sunset Lamp in cart"
                        referrerPolicy="no-referrer"
                        className="h-20 w-20 rounded-xl object-cover border border-white/15 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-white text-base sm:text-lg">
                          Lumora Smart Sunset Lamp (YCX-010)
                        </p>
                        <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                          Cast-Aluminum Head · Weighted Iron Base · App + 24-Key
                          RGB Remote
                        </p>
                        <p className="text-xs sm:text-sm text-[#FFA500] font-semibold mt-1.5 tabular-nums">
                          {formatPrice(69.99)} each{' '}
                          {cartPricing.discount > 0
                            ? `· Combo Discount: -${formatPrice(
                                cartPricing.discount
                              )}`
                            : `· Buy 2 for ${formatPrice(134.98)} (${formatPrice(
                                5,
                                false
                              )} off) · Buy 3 for ${formatPrice(
                                199.97
                              )} (${formatPrice(10, false)} off)`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t border-white/10 sm:border-0">
                      <span className="text-xs font-semibold text-slate-300 sm:hidden">
                        Quantity:
                      </span>
                      <div className="inline-flex items-center rounded-xl border border-white/20 bg-black/30">
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.max(1, cartQuantity - 1);
                            setCartQuantity(next);
                            setSelectedQuantity(next);
                          }}
                          aria-label="Decrease cart quantity"
                          className="flex h-11 w-11 items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 text-base font-extrabold text-white tabular-nums">
                          {cartPricing.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.min(10, cartQuantity + 1);
                            setCartQuantity(next);
                            setSelectedQuantity(next);
                          }}
                          aria-label="Increase cart quantity"
                          className="flex h-11 w-11 items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Cart Breakdown & Dynamic Stripe Checkout CTA */}
                <div className="lg:col-span-5 rounded-xl bg-white/5 p-5 sm:p-6 border border-white/10 space-y-4">
                  <div className="space-y-2.5 text-base">
                    <div className="flex justify-between gap-2 text-slate-300">
                      <span>
                        Regular Price ({cartPricing.quantity} ×{' '}
                        {formatPrice(69.99, false)})
                      </span>
                      <span className="tabular-nums font-medium text-white">
                        {formatPrice(cartPricing.subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-2 text-emerald-400 font-semibold">
                      <span>Combo Deal Savings</span>
                      <span className="tabular-nums text-right">
                        {cartPricing.discount > 0
                          ? `-${formatPrice(cartPricing.discount)}`
                          : `${formatPrice(0)} (Add 1 more for ${formatPrice(
                              5,
                              false
                            )} off)`}
                      </span>
                    </div>

                    <div className="flex justify-between gap-2 text-slate-300">
                      <span>Tracked Express Shipping</span>
                      <span className="font-bold text-emerald-400">FREE</span>
                    </div>

                    <div className="flex justify-between border-t border-white/15 pt-3 text-lg sm:text-xl font-extrabold text-white">
                      <span>Cart Total</span>
                      <span className="text-[#FFA500] tabular-nums">
                        {formatPrice(cartPricing.total)}
                      </span>
                    </div>
                    {currency !== 'CAD' && (
                      <p className="text-xs text-slate-300">
                        Shown in {currency}. Final Stripe settlement is in CAD ($
                        {cartPricing.total.toFixed(2)} CAD).
                      </p>
                    )}
                  </div>

                  {/* Single Full-Width Secure Checkout with Stripe Button */}
                  <div className="pt-1">
                    {cartStripeUrl && !isSyncingCartStripe ? (
                      <a
                        href={cartStripeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          try {
                            if (window.top && window.top !== window) {
                              window.top.location.href = cartStripeUrl;
                              e.preventDefault();
                            }
                          } catch {
                            // Allow default target=_blank navigation inside sandboxed iframe
                          }
                        }}
                        className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-[#FFA500] py-4 px-5 text-base font-extrabold text-[#1A2A3A] shadow-md transition-transform hover:scale-[1.01] whitespace-nowrap cursor-pointer"
                      >
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>Secure Checkout with Stripe</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCheckout(cartPricing.quantity)}
                        className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl bg-[#FFA500] py-4 px-5 text-base font-extrabold text-[#1A2A3A] shadow-md transition-transform hover:scale-[1.01] whitespace-nowrap cursor-pointer"
                      >
                        {isSyncingCartStripe ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Syncing Stripe...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 shrink-0" />
                            <span>Secure Checkout with Stripe</span>
                            <ExternalLink className="h-4 w-4 shrink-0" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===================================================================
            5B. PRODUCT DESCRIPTION & TECHNICAL SPECIFICATIONS SECTION
        =================================================================== */}
        <section
          id="specs"
          className="bg-white border-b border-slate-200 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 lg:items-center">
              {/* Left: Technical Specifications Table */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-2.5">
                  <p className="text-xs sm:text-sm font-bold tracking-wider text-[#FFA500]">
                    Hardware Architecture &amp; Specs
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A2A3A] text-balance">
                    Engineered for pure optical immersion.
                  </h2>
                  <p className="text-base sm:text-[18px] text-slate-600 leading-relaxed">
                    Unlike lightweight plastic imitations, the Lumora YCX-010
                    combines a heat-dissipating cast-aluminum UFO lamp head with
                    a heavy conical iron base and precision optical crystal
                    glass.
                  </p>
                </div>

                <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-[#F8FAFC] text-base">
                  {[
                    {
                      label: 'Model & Type',
                      value: 'Lumora YCX-010 · UFO Colorful Sunset Projection Lamp',
                    },
                    {
                      label: 'Body Materials',
                      value: 'Cast-Aluminum Lamp Head + Weighted Iron Base (923g)',
                    },
                    {
                      label: 'Dimensions',
                      value: '270 × 100 mm (10.6 × 3.9 in) · 180° Chrome Neck Joint',
                    },
                    {
                      label: 'Power & Voltage',
                      value: '6W / 12W High-Lumen LED · 5V Universal USB Input',
                    },
                    {
                      label: 'Color & Dimming',
                      value:
                        'Full Dimmable RGB (16 Colors + 4 Gradient Modes) via App & Remote',
                    },
                    {
                      label: 'Rated Lifespan',
                      value: '≥ 30,000 Hours Continuous Optical Performance',
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-3.5 sm:px-5 sm:py-4"
                    >
                      <span className="font-bold text-[#1A2A3A]">
                        {row.label}
                      </span>
                      <span className="sm:col-span-2 text-slate-600 tabular-nums">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Modular 4-Step Assembly Visual (1 Col Mobile -> 2 Col Tablet) */}
              <div className="lg:col-span-6 space-y-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#1A2A3A] shadow-md">
                  <img
                    src={YCX_MODULAR_PARTS}
                    alt="Lumora modular components: cast-aluminum head, straight metal rod, weighted iron base, and RGB remote"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-sm sm:text-base">
                  {[
                    {
                      num: '01.',
                      title: 'Unbox Components',
                      desc: 'Lamp head, metal rod, iron base & 24-key RGB remote.',
                    },
                    {
                      num: '02.',
                      title: 'Attach Base',
                      desc: 'Thread the straight metal rod into the weighted iron base.',
                    },
                    {
                      num: '03.',
                      title: 'Mount Lamp Head',
                      desc: 'Screw the chrome swivel neck onto the top rod.',
                    },
                    {
                      num: '04.',
                      title: 'Plug & Project',
                      desc: 'Connect 5V USB and choose your sunset halo.',
                    },
                  ].map((s) => (
                    <div
                      key={s.num}
                      className="rounded-xl bg-[#F8FAFC] p-4 border border-slate-200/80"
                    >
                      <p className="font-extrabold text-[#FFA500] mb-1">
                        {s.num} {s.title}
                      </p>
                      <p className="text-slate-600 leading-snug">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            6. HOW IT WORKS (Single-Column Mobile -> 3-Step Timeline on Desktop)
        =================================================================== */}
        <section
          id="how-it-works"
          className="bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
              <p className="text-xs sm:text-sm font-bold tracking-wider text-[#FFA500]">
                02. Effortless Operation
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A2A3A] text-balance">
                Golden hour in under 30 seconds.
              </h2>
              <p className="text-base sm:text-[18px] text-slate-600">
                No hubs, no complicated Wi-Fi bridges, and no tools required.
              </p>
            </div>

            <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
              <div
                aria-hidden="true"
                className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-[#FFA500]/30 via-[#FFA500] to-[#FFA500]/30"
              />

              {[
                {
                  step: '01. Plug In',
                  icon: Plug,
                  description:
                    'Connect the 5V USB power cable to any standard wall adapter, desktop port, or portable power bank.',
                },
                {
                  step: '02. Pair App or Remote',
                  icon: Sliders,
                  description:
                    'Use the included 24-key RGB remote control immediately or pair with the Bluetooth companion app.',
                },
                {
                  step: '03. Transform',
                  icon: Sparkles,
                  description:
                    'Project expansive sunset, aurora, and golden-hour halos across any wall or ceiling in your home.',
                },
              ].map((item, idx) => {
                const StepIcon = item.icon;
                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: fadeUpY }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: baseDuration,
                      delay: getStaggerDelay(idx, 0.08),
                    }}
                    className="relative flex flex-col items-center text-center rounded-2xl md:rounded-none bg-[#F8FAFC] md:bg-white p-6 border border-slate-200/70 md:border-0"
                  >
                    <div className="relative z-10 mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1A2A3A] text-[#FFA500] shadow-[0_0_25px_rgba(255,165,0,0.25)] border border-[#FFA500]/40">
                      <StepIcon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1A2A3A] mb-2">
                      {item.step}
                    </h3>
                    <p className="text-base text-slate-600 leading-relaxed max-w-xs">
                      {item.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            7. SOCIAL PROOF & "UGC" GALLERY (1 Col Mobile -> 2 Col Tablet -> 4 Col Desktop)
        =================================================================== */}
        <section
          id="reviews"
          className="bg-[#F8FAFC] border-t border-slate-200 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-14 gap-4 sm:gap-6">
              <div className="space-y-3 max-w-xl">
                <p className="text-xs sm:text-sm font-bold tracking-wider text-[#FFA500]">
                  03. In The Wild
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A2A3A] text-balance">
                  Over 14,000 spaces transformed.
                </h2>
                <p className="text-base sm:text-[18px] text-slate-600">
                  See how creators, designers, and homeowners use Lumora to
                  reshape their evening rituals.
                </p>
              </div>
              <div className="text-base text-slate-600">
                <span className="font-extrabold text-[#1A2A3A] tabular-nums">
                  4.9 / 5.0 Average Rating
                </span>{' '}
                · Based on 1,284 verified buyers
              </div>
            </div>

            {/* 1 Column Mobile (<768px) -> 2 Columns Tablet (768px-1024px) -> 4 Columns Desktop (1024px+) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 sm:gap-8">
              {UGC_REVIEWS.map((item, idx) => (
                <motion.article
                  key={item.author}
                  initial={{ opacity: 0, y: fadeUpY }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: baseDuration,
                    delay: getStaggerDelay(idx, 0.06),
                  }}
                  className="flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-xs"
                >
                  <div className="w-full overflow-hidden bg-[#1A2A3A]">
                    <img
                      src={item.image}
                      alt={item.room}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto aspect-square object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5 sm:p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-1 text-[#FFA500]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-[#FFA500] text-[#FFA500]"
                          />
                        ))}
                        <span className="ml-1 text-xs sm:text-sm font-bold text-[#1A2A3A] tabular-nums">
                          {item.rating}
                        </span>
                      </div>
                      <p className="text-base text-slate-700 leading-relaxed">
                        “{item.quote}”
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-3 text-xs sm:text-sm text-slate-500">
                      <p className="font-bold text-[#1A2A3A]">
                        {item.author} · {item.role}
                      </p>
                      <p className="mt-0.5">{item.room}</p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            8. VALUE STACKING & OFFERS (What's Included + The Lumora Promise)
        =================================================================== */}
        <section className="bg-white border-t border-slate-200 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: fadeUpY }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: baseDuration }}
                className="rounded-2xl bg-[#F8FAFC] p-6 sm:p-8 lg:p-10 border border-slate-200/90 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm font-bold tracking-wider text-[#FFA500]">
                    Complete Box Contents
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1A2A3A]">
                    What&apos;s Included
                  </h3>
                  <p className="text-base text-slate-600">
                    Everything you need to unbox and project your first sunset
                    within seconds.
                  </p>

                  <ul className="space-y-4 pt-2">
                    {[
                      {
                        item: 'Lumora YCX-010 Sunset Lamp',
                        spec: 'Cast-Aluminum UFO Head, Extension Rod & Conical Iron Base',
                      },
                      {
                        item: '24-Key RGB Wireless Remote Control',
                        spec: 'Instant Access to 16 Colors, Dimming & 4 Fade Modes',
                      },
                      {
                        item: '5V USB Power Cable',
                        spec: 'Integrated Inline Power Switch & Universal USB Connector',
                      },
                      {
                        item: 'Lumora Companion App & User Guide',
                        spec: 'Full iOS & Android Bluetooth Control — Zero Subscriptions',
                      },
                    ].map((entry) => (
                      <li
                        key={entry.item}
                        className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 border-b border-slate-200/70 pb-4 last:border-none"
                      >
                        <div className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-[#FFA500] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-base font-bold text-[#1A2A3A]">
                              {entry.item}
                            </p>
                            <p className="text-sm text-slate-600">
                              {entry.spec}
                            </p>
                          </div>
                        </div>
                        <span className="pl-8 sm:pl-0 text-xs sm:text-sm font-semibold text-emerald-700 whitespace-nowrap">
                          Included
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: fadeUpY }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: baseDuration,
                  delay: getStaggerDelay(1, 0.06),
                }}
                className="rounded-2xl bg-[#1A2A3A] p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-between space-y-8"
              >
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs sm:text-sm font-bold tracking-wider text-[#FFA500]">
                        30-Day Risk-Free Trial
                      </p>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                        The Lumora Promise
                      </h3>
                    </div>
                    <LumoraLogo
                      layout="badge"
                      size="sm"
                      className="sm:w-28 sm:h-28"
                    />
                  </div>
                  <blockquote className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed border-l-2 border-[#FFA500] pl-4 sm:pl-5">
                    “If you don&apos;t absolutely love how it transforms your
                    space, return it within 30 days for a full refund. No
                    questions asked.”
                  </blockquote>
                  <p className="text-base text-slate-300 leading-relaxed">
                    We believe lighting should be experienced in your own room
                    at dusk. Test Lumora with your furniture, wall textures, and
                    evening routine for a full month—backed by our 1-Year
                    Hardware Replacement Warranty.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout(1)}
                    className="w-full sm:w-auto min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFA500] px-7 py-4 text-base font-extrabold text-[#1A2A3A] transition-transform hover:scale-105 whitespace-nowrap cursor-pointer"
                  >
                    <span>Try Lumora Risk-Free — {formatPrice(69.99)}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            9. FAQ SECTION (Accordion Style, Touch-Friendly Hitboxes)
        =================================================================== */}
        <section
          id="faq"
          className="bg-[#F8FAFC] border-t border-slate-200 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-3xl">
            <div className="text-center space-y-3 mb-10 sm:mb-12">
              <p className="text-xs sm:text-sm font-bold tracking-wider text-[#FFA500]">
                04. Questions &amp; Answers
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A2A3A] text-balance">
                Frequently Asked Questions
              </h2>
              <p className="text-base sm:text-[18px] text-slate-600">
                Everything you need to know about the Lumora Smart Sunset Lamp.
              </p>
            </div>

            <div className="space-y-3.5">
              {FAQ_ITEMS.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-xl bg-white border border-slate-200/90"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="flex w-full min-h-[56px] items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 text-left text-base sm:text-lg font-bold text-[#1A2A3A] hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-slate-500 transition-transform duration-200 shrink-0 ${
                          isOpen ? 'rotate-180 text-[#FFA500]' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="px-5 pb-5 sm:px-6 sm:pb-6 text-base text-slate-600 leading-relaxed border-t border-slate-100 pt-4"
                        >
                          {faq.answer}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            10. CONTACT SECTION (Embedded Tally Form vGov04 + Clean Message Form)
        =================================================================== */}
        <section
          id="contact"
          className="bg-white border-t border-slate-200 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24"
        >
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl bg-[#F8FAFC] p-5 sm:p-8 lg:p-12 border border-slate-200/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-bold tracking-wider text-[#FFA500]">
                    05. Customer Care
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A2A3A]">
                    Get in Touch with Lumora
                  </h2>
                  <p className="text-base text-slate-600">
                    Have a question about your order or lighting setup? Send us
                    a note below.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-200/70 p-1.5 w-full sm:w-auto self-start">
                  <button
                    type="button"
                    onClick={() => setContactTab('tally')}
                    className={`min-h-[42px] rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      contactTab === 'tally'
                        ? 'bg-white text-[#1A2A3A] shadow-xs'
                        : 'text-slate-600 hover:text-[#1A2A3A]'
                    }`}
                  >
                    Interactive Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactTab('quick')}
                    className={`min-h-[42px] rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      contactTab === 'quick'
                        ? 'bg-white text-[#1A2A3A] shadow-xs'
                        : 'text-slate-600 hover:text-[#1A2A3A]'
                    }`}
                  >
                    Quick Message
                  </button>
                </div>
              </div>

              {contactTab === 'tally' ? (
                <div className="w-full overflow-hidden rounded-xl bg-white p-3 sm:p-6 border border-slate-200/80">
                  <iframe
                    data-tally-src="https://tally.so/embed/vGov04?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
                    src="https://tally.so/embed/vGov04?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
                    loading="lazy"
                    width="100%"
                    height="620"
                    frameBorder={0}
                    marginHeight={0}
                    marginWidth={0}
                    title="Get in Touch with Lumora"
                    className="w-full border-0"
                  />
                </div>
              ) : contactSuccess ? (
                <div className="rounded-xl bg-white p-6 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-base">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>Message Sent!</span>
                  </div>
                  <p className="text-base text-slate-600">
                    Thanks for reaching out! We&apos;ve received your message and
                    our support team will get back to you shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactSuccess(false)}
                    className="min-h-[44px] text-sm font-bold text-[#1A2A3A] underline underline-offset-4 hover:text-[#FFA500] cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  {contactError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      {contactError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-sm font-bold text-[#1A2A3A] mb-1.5"
                      >
                        Your Name *
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Jordan Taylor"
                        className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-[#1A2A3A] focus:border-[#FFA500] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-sm font-bold text-[#1A2A3A] mb-1.5"
                      >
                        Email Address *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="jordan@example.com"
                        className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-[#1A2A3A] focus:border-[#FFA500] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-sm font-bold text-[#1A2A3A] mb-1.5"
                    >
                      Message *
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="How can we help transform your space?"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-[#1A2A3A] focus:border-[#FFA500] focus:outline-none"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isSubmittingContact}
                    whileHover={useLightMotion ? undefined : { scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full sm:w-auto min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A2A3A] px-7 py-4 text-base font-bold text-white transition-colors hover:bg-[#1A2A3A]/90 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {isSubmittingContact ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 text-[#FFA500]" />
                        <span>Send Message</span>
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          11. THE EPIC FOOTER + ORDER TRACKING SECTION (1 Col Mobile -> 2 Col Tablet -> 4 Col Desktop)
      ===================================================================== */}
      <footer className="bg-[#1A2A3A] text-white border-t border-white/10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-12 sm:space-y-14">
          {/* ORDER TRACKING BAR IN FOOTER */}
          <div
            id="track-order"
            className="rounded-2xl bg-white/5 p-5 sm:p-8 border border-white/10"
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#FFA500]">
                  <Package className="h-4 w-4 shrink-0" />
                  <span>Live Order Tracking</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Track Your Lumora Order
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Enter your Order ID from your confirmation receipt (e.g.,{' '}
                  <button
                    type="button"
                    onClick={() => setTrackingOrderId('LUM-1042')}
                    className="text-[#FFA500] underline underline-offset-2 font-mono cursor-pointer"
                  >
                    LUM-1042
                  </button>
                  ) to check real-time delivery status.
                </p>
              </div>

              <div className="lg:col-span-7">
                <form
                  onSubmit={handleTrackOrder}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={trackingOrderId}
                      onChange={(e) => setTrackingOrderId(e.target.value)}
                      placeholder="Enter your Order ID (e.g. LUM-1042)"
                      aria-label="Order ID"
                      className="w-full min-h-[50px] rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 py-3.5 text-base text-white placeholder:text-slate-400 focus:border-[#FFA500] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isTrackingLoading}
                    className="w-full sm:w-auto min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFA500] px-7 py-3.5 text-base font-extrabold text-[#1A2A3A] transition-transform hover:scale-105 disabled:opacity-60 whitespace-nowrap cursor-pointer"
                  >
                    {isTrackingLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <span>Track Order</span>
                    )}
                  </button>
                </form>

                {trackingError && (
                  <p className="mt-3 text-sm text-red-300">{trackingError}</p>
                )}

                {trackedOrder && (
                  <div className="mt-4 rounded-xl bg-[#0F1B29] p-4 sm:p-5 border border-white/15 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-xs sm:text-sm text-slate-400">
                          Order ID:{' '}
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#FFA500] break-all">
                          {trackedOrder.stripe_session_id}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-emerald-400">
                        {trackedOrder.payment_status === 'paid'
                          ? 'Payment Verified · Express Shipment Active'
                          : 'Order Confirmed'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">Customer</p>
                        <p className="font-bold text-white mt-0.5">
                          {trackedOrder.customer_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Items</p>
                        <p className="font-bold text-white mt-0.5 tabular-nums">
                          Lumora Lamp × {trackedOrder.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Total</p>
                        <p className="font-bold text-white mt-0.5 tabular-nums">
                          {formatPrice(Number(trackedOrder.amount_total))}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Destination</p>
                        <p className="font-bold text-white mt-0.5">
                          {trackedOrder.shipping_address?.city || 'Express'},{' '}
                          {trackedOrder.shipping_address?.country || 'US'}
                        </p>
                      </div>
                    </div>

                    {/* Progress Steps (2 Cols on Mobile -> 4 Cols on Tablet/Desktop) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
                      {[
                        { label: 'Order Confirmed', active: true },
                        { label: 'Quality Checked', active: true },
                        {
                          label: 'In Transit (4–7d)',
                          active:
                            trackedOrder.cj_fulfillment_status === 'in_transit',
                        },
                        { label: 'Delivered', active: false },
                      ].map((stage) => (
                        <div key={stage.label} className="space-y-1.5">
                          <div
                            className={`h-1.5 w-full rounded-full ${
                              stage.active ? 'bg-[#FFA500]' : 'bg-white/15'
                            }`}
                          />
                          <p
                            className={
                              stage.active
                                ? 'font-bold text-white'
                                : 'text-slate-400'
                            }
                          >
                            {stage.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-COLUMN FOOTER (1 Col Mobile -> 2 Col Tablet -> 4 Col Desktop) */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
            {/* Column 1: Quick Links & Brand */}
            <div className="lg:col-span-3 space-y-4">
              <LumoraLogo layout="badge" size="md" />
              <p className="text-base text-slate-300 leading-relaxed">
                Transform Your Space. Elevate Your Vibe. Architectural smart
                sunset projection lighting engineered for modern interiors.
              </p>
              <div className="pt-2">
                <p className="text-sm font-bold text-[#FFA500] mb-2.5">
                  Quick Links
                </p>
                <ul className="space-y-2.5 text-base text-slate-300">
                  <li>
                    <a
                      href="#home"
                      className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                    >
                      Home
                    </a>
                  </li>
                  <li>
                    <a
                      href="#shop"
                      className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                    >
                      Shop Lumora Lamp
                    </a>
                  </li>
                  <li>
                    <a
                      href="#specs"
                      className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                    >
                      Specifications
                    </a>
                  </li>
                  <li>
                    <a
                      href="#contact"
                      className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                    >
                      Contact Us
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Column 2: Support */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-base font-bold text-white">Support</h3>
              <ul className="space-y-2.5 text-base text-slate-300">
                <li>
                  <a
                    href="#track-order"
                    className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                  >
                    Track Your Order
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                  >
                    Shipping &amp; Delivery
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                  >
                    30-Day Returns
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                  >
                    1-Year Warranty
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Connect */}
            <div className="lg:col-span-3 space-y-3">
              <h3 className="text-base font-bold text-white">Connect</h3>
              <p className="text-base text-slate-300">
                Tag{' '}
                <span className="text-[#FFA500] font-semibold">@lumoraglow</span>{' '}
                to be featured in our community gallery.
              </p>
              <ul className="space-y-2.5 text-base text-slate-300 pt-1">
                <li>
                  <a
                    href="#reviews"
                    className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                  >
                    TikTok · @lumoraglow
                  </a>
                </li>
                <li>
                  <a
                    href="#reviews"
                    className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                  >
                    Instagram · @lumoraglow
                  </a>
                </li>
                <li>
                  <a
                    href="#reviews"
                    className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                  >
                    Pinterest · Lumora Interiors
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:getlumora.shop@gmail.com"
                    className="inline-block py-0.5 hover:text-[#FFA500] transition-colors"
                  >
                    getlumora.shop@gmail.com
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Newsletter Signup */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-base font-bold text-white leading-snug">
                Join the Lumora list and use code LUMORA10 for 10% off your
                first order.
              </h3>
              <p className="text-base text-slate-300 leading-relaxed">
                Join the Lumora Interior Club for curated lighting recipes,
                early access drops, and exclusive member perks.
              </p>

              {newsletterSuccess ? (
                <div className="rounded-xl bg-white/10 p-4 border border-[#FFA500]/40 space-y-1.5">
                  <p className="text-sm font-bold text-[#FFA500]">
                    Welcome to Lumora!
                  </p>
                  <p className="text-sm text-slate-200">
                    Thanks for subscribing! Use code{' '}
                    <code className="font-mono font-bold text-white bg-black/30 px-1.5 py-0.5 rounded">
                      LUMORA10
                    </code>{' '}
                    at checkout for 10% off.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email"
                      aria-label="Email address for newsletter"
                      className="min-w-0 flex-1 min-h-[48px] rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-400 focus:border-[#FFA500] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingNewsletter}
                      className="w-full sm:w-auto min-h-[48px] rounded-xl bg-[#FFA500] px-6 py-3 text-sm sm:text-base font-extrabold text-[#1A2A3A] transition-transform hover:scale-105 disabled:opacity-60 whitespace-nowrap cursor-pointer"
                    >
                      {isSubmittingNewsletter ? 'Joining...' : 'Unlock 10%'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Use code LUMORA10 at checkout.
                  </p>
                  {newsletterError && (
                    <p className="text-sm text-red-300">{newsletterError}</p>
                  )}
                </form>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400 text-center sm:text-left">
            <p>© 2027 Lumora Lighting Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <a href="#about" className="hover:text-white transition-colors">
                Our Story
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Multi-Turn Gemini Lighting Concierge Chatbot */}
      <LumoraChatWidget />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        quantity={cartQuantity}
        onQuantityChange={(newQty) => {
          setCartQuantity(newQty);
          setSelectedQuantity(newQty);
        }}
        productImage={YCX_STUDIO_HERO}
        initialSessionId={returnedSessionId}
      />
    </div>
  );
}
