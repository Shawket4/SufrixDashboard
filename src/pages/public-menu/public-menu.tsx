// src/pages/public-menu/public-menu.tsx
import { useParams } from "react-router-dom";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronRight,
  Coffee,
  Cookie,
  Droplet,
  GlassWater,
  IceCream,
  Leaf,
  Minus,
  Plus,
  Sandwich,
  Search,
  ShoppingBag,
  Snowflake,
  Trash2,
  X,
  type LucideProps,
} from "lucide-react";

import { usePublicMenu } from "@/entities/menu/queries";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { fmtMoney } from "@/shared/lib/format";

import type {
  PublicAddonItem,
  PublicAddonSlot,
  PublicItemSize,
  PublicMenuItem,
} from "@/shared/types";

import { createPortal } from "react-dom";

/* Lazy-load Lottie — only fetched when Show-to-Barista opens */
const DotLottie = lazy(() =>
  import("@lottiefiles/dotlottie-react").then((m) => ({ default: m.DotLottieReact }))
);
/* ===========================================================================
 *  Types
 * ========================================================================= */

type ID = string;

type CartLine = {
  lineId: string;
  signature: string;
  itemId: ID;
  itemName: string;
  imageUrl?: string | null;
  size?: { id: ID; name: string };
  addons: Array<{
    slotId: ID;
    slotName: string;
    addonId: ID;
    addonName: string;
    price: number;
  }>;
  unitPrice: number;
  quantity: number;
};

type ThumbVariant = "thumb" | "card" | "hero";

type CatStyle = {
  icon: ComponentType<LucideProps>;
  bgTop: string;
  bgBottom: string;
  iconColor: string;
  accent: string;
};

type FlyToCartFn = (sourceEl: HTMLElement | null) => void;

/* ===========================================================================
 *  Constants
 * ========================================================================= */

const STORAGE_KEY = (orgId: string) => `rue:public-cart:${orgId}`;
const REFETCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FLIGHT_MS = 720;
const PRICE_ROLL_MS = 360;

/* ===========================================================================
 *  Utilities
 * ========================================================================= */

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");

const getSizePrice = (basePrice: number, size?: PublicItemSize) => {
  if (!size) return basePrice;
  // nullish fallback — earlier version returned 0 if price_override was 0/null/undefined
  return size.price_override ?? basePrice;
};

const getAddonPrice = (a: PublicAddonItem) => a.default_price ?? 0;

const lineSignature = (
  itemId: ID,
  sizeId: ID | undefined,
  addonIds: ID[]
): string => `${itemId}|${sizeId ?? "-"}|${[...addonIds].sort().join(",")}`;



/* Subtle haptic feedback. No-op on iOS Safari and desktop. */
const haptic = (intensity: "light" | "medium" | "heavy" = "light") => {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const map = { light: 8, medium: 14, heavy: 22 };
  try {
    navigator.vibrate(map[intensity]);
  } catch {
    /* noop */
  }
};

const getMonogram = (name: string): string => {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return "·";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0];
  return w.substring(0, Math.min(w.length, 2)).toUpperCase();
};

const hexAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getCatStyle = (name: string): CatStyle => {
  const n = (name ?? "").toLowerCase();

  if (n.includes("matcha"))
    return { icon: Leaf, bgTop: "#E8F5E9", bgBottom: "#C8E6C9", iconColor: "#2E7D32", accent: "#388E3C" };

  if (
    n.includes("latte") || n.includes("espresso") || n.includes("americano") ||
    n.includes("cappuc") || n.includes("flat") || n.includes("cortado") ||
    n.includes("coffee") || n.includes("v60") || n.includes("blended") ||
    n.includes("cold brew")
  )
    return { icon: Coffee, bgTop: "#F5EEE6", bgBottom: "#EDD9C0", iconColor: "#5D4037", accent: "#795548" };

  if (n.includes("chocolate") || n.includes("mocha"))
    return { icon: Coffee, bgTop: "#F3E5E5", bgBottom: "#E8CECE", iconColor: "#6D4C41", accent: "#8D3A3A" };

  if (
    n.includes("croissant") || n.includes("brownie") || n.includes("cookie") ||
    n.includes("pastry") || n.includes("pastries") || n.includes("cake") ||
    n.includes("waffle")
  )
    return { icon: Cookie, bgTop: "#FFF8E8", bgBottom: "#FFF0C8", iconColor: "#E65100", accent: "#F57C00" };

  if (n.includes("sandwich") || n.includes("chicken") || n.includes("turkey") || n.includes("food"))
    return { icon: Sandwich, bgTop: "#FFF3E0", bgBottom: "#FFE0B2", iconColor: "#E64A19", accent: "#EF6C00" };

  if (n.includes("affogato") || n.includes("ice cream"))
    return { icon: IceCream, bgTop: "#F3E5F5", bgBottom: "#E1BEE7", iconColor: "#7B1FA2", accent: "#9C27B0" };

  if (n.includes("lemon") || n.includes("lemonade") || n.includes("refresher") || n.includes("juice"))
    return { icon: GlassWater, bgTop: "#FFFDE7", bgBottom: "#FFF9C4", iconColor: "#F57F17", accent: "#FBC02D" };

  if (n.includes("tea") || n.includes("chai"))
    return { icon: Leaf, bgTop: "#E8F5E9", bgBottom: "#C8E6C9", iconColor: "#388E3C", accent: "#43A047" };

  if (n.includes("water") || n.includes("sparkling"))
    return { icon: Droplet, bgTop: "#E3F2FD", bgBottom: "#BBDEFB", iconColor: "#1565C0", accent: "#1976D2" };

  if (n.includes("iced"))
    return { icon: Snowflake, bgTop: "#E3F2FD", bgBottom: "#BBDEFB", iconColor: "#0277BD", accent: "#0288D1" };

  return { icon: Coffee, bgTop: "#F5EEE6", bgBottom: "#EDD9C0", iconColor: "#795548", accent: "#8D6E63" };
};

/* Normalise text for accent-insensitive search (handles café → cafe, etc) */
const normalize = (s: string): string =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/* ===========================================================================
 *  Hooks
 * ========================================================================= */

function useInView<T extends Element>(
  options?: IntersectionObserverInit
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      options ?? { rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  // options object identity intentionally ignored — pass primitive deps if needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView];
}

/* Cart persistence to sessionStorage, keyed per org. */
function usePersistentCart(orgId: string | null) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const hydratedRef = useRef(false);

  // Hydrate
  useEffect(() => {
    if (!orgId) return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY(orgId));
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setCart(parsed as CartLine[]);
      }
    } catch {
      /* corrupted storage — ignore */
    }
    hydratedRef.current = true;
  }, [orgId]);

  // Persist (skip first render to avoid clobbering with empty state)
  useEffect(() => {
    if (!orgId || !hydratedRef.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY(orgId), JSON.stringify(cart));
    } catch {
      /* quota or private mode — ignore */
    }
  }, [cart, orgId]);

  return [cart, setCart] as const;
}

/* Pre-warm image cache for the next 1-2 visible categories. */
function useImagePreload(
  menu: { categories: Array<{ id: ID; items: PublicMenuItem[] }> } | undefined,
  activeCat: string | null
) {
  useEffect(() => {
    if (!menu || !activeCat) return;
    const idx = menu.categories.findIndex((c) => String(c.id) === activeCat);
    if (idx < 0) return;
    const urls: string[] = [];
    for (let i = idx; i <= idx + 1 && i < menu.categories.length; i++) {
      for (const item of menu.categories[i].items.slice(0, 6)) {
        if (item.image_url) urls.push(item.image_url);
      }
    }
    // Discard the Image() instances — they live long enough to populate the cache
    urls.forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }, [menu, activeCat]);
}

/* Animate a number value with rAF easing — used for total + unit price. */
function useAnimatedValue(value: number, duration = PRICE_ROLL_MS) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTargetRef = useRef(value);

  useEffect(() => {
    if (value === lastTargetRef.current) return;
    fromRef.current = display;
    lastTargetRef.current = value;
    startRef.current = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = fromRef.current + (value - fromRef.current) * e;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // intentionally not depending on `display` — that would loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}

/* ===========================================================================
 *  Sub-components: image + fallback mockup
 * ========================================================================= */

function MissingItemThumb({
  name,
  className,
  variant = "card",
}: {
  name: string;
  className?: string;
  variant?: ThumbVariant;
}) {
  const style = useMemo(() => getCatStyle(name), [name]);
  const monogram = useMemo(() => getMonogram(name), [name]);
  const Icon = style.icon;

  const monoSize =
    variant === "hero"
      ? "text-6xl sm:text-8xl"
      : variant === "card"
      ? "text-4xl sm:text-5xl"
      : "text-lg";

  return (
    <div
      className={cx("relative overflow-hidden", className)}
      style={{
        backgroundImage: `linear-gradient(135deg, ${style.bgTop} 0%, ${style.bgBottom} 100%)`,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.6) 1px, transparent 0)",
          backgroundSize: "3px 3px",
        }}
      />

      {variant !== "thumb" && (
        <div
          className={cx(
            "absolute rounded-full pointer-events-none",
            variant === "hero"
              ? "-right-16 -bottom-16 w-64 h-64 border-[4px]"
              : "-right-9 -bottom-9 w-32 h-32 border-[3px]"
          )}
          style={{ borderColor: hexAlpha(style.accent, 0.16) }}
        />
      )}

      {variant === "hero" && (
        <>
          <div
            className="absolute -left-24 -top-24 w-72 h-72 rounded-full border-2 pointer-events-none"
            style={{ borderColor: hexAlpha(style.accent, 0.1) }}
          />
          <div
            className="absolute bottom-6 left-6 right-6 h-px pointer-events-none"
            style={{
              background: `linear-gradient(to right, ${hexAlpha(
                style.accent,
                0.25
              )}, transparent)`,
            }}
          />
        </>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cx(
            "font-extralight leading-none select-none",
            monoSize,
            variant === "thumb" ? "tracking-wider" : "tracking-[0.15em]"
          )}
          style={{ color: hexAlpha(style.accent, 0.6) }}
        >
          {monogram}
        </span>
      </div>

      {variant !== "thumb" && (
        <div
          className={cx(
            "absolute rounded-full bg-white/85 flex items-center justify-center backdrop-blur-sm shadow-sm",
            variant === "hero"
              ? "top-4 left-4 h-10 w-10"
              : "top-2 left-2 h-6 w-6"
          )}
        >
          <Icon
            size={variant === "hero" ? 18 : 11}
            strokeWidth={1.8}
            style={{ color: hexAlpha(style.accent, 0.8) }}
          />
        </div>
      )}
    </div>
  );
}

function ItemImage({
  src,
  alt,
  className,
  fallbackName,
  fallbackVariant = "card",
  disableFade = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackName?: string;
  fallbackVariant?: ThumbVariant;
  iconSize?: number;
  disableFade?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (!src || failed) {
    if (fallbackName) {
      return (
        <MissingItemThumb
          name={fallbackName}
          variant={fallbackVariant}
          className={className}
        />
      );
    }
    return (
      <div className={cx("relative overflow-hidden", className)}>
        {!loaded && !disableFade && (
          <div className="absolute inset-0 bg-slate-100" />
        )}
        <img
          src={src || undefined}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cx(
            "h-full w-full object-cover",
            disableFade
              ? "opacity-100"
              : cx("transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")
          )}
        />
      </div>
    );
  }

  return (
    <div className={cx("relative overflow-hidden", className)}>
      {!loaded && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cx(
          "h-full w-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

/* ===========================================================================
 *  Animated money — wraps fmtMoney with rAF interpolation
 * ========================================================================= */

function AnimatedMoney({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const display = useAnimatedValue(value);
  return <span className={className}>{fmtMoney(display)}</span>;
}

/* ===========================================================================
 *  Search bar
 * ========================================================================= */

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        strokeWidth={2.2}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 ps-12 pe-12 rounded-2xl bg-white border border-slate-200 text-[15px] font-medium placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
      />
      {value && (
        <button
          onClick={() => {
            haptic("light");
            onChange("");
          }}
          aria-label="Clear search"
          className="absolute end-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition active:scale-90"
        >
          <X size={14} strokeWidth={3} className="text-slate-500" />
        </button>
      )}
    </div>
  );
}

/* ===========================================================================
 *  Main page
 * ========================================================================= */

export default function PublicMenuPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const { data: menu, isLoading, error, refetch } = usePublicMenu(orgId ?? null);

  /* ---------- lazy load cairo fonts ---------- */
  useEffect(() => {
    import("./cairo.css");
  }, []);

  /* ---------- silent refetch every 5 minutes (SWR) ---------- */
  useEffect(() => {
    if (!menu || typeof refetch !== "function") return;
    const id = window.setInterval(() => {
      refetch();
    }, REFETCH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [menu, refetch]);

  /* ---------- search ---------- */
  const [search, setSearch] = useState("");
  const trimmed = search.trim();
  const searchActive = trimmed.length > 0;
  const normalizedQuery = useMemo(() => normalize(trimmed), [trimmed]);

  const filteredCategories = useMemo(() => {
    if (!menu) return [];
    if (!searchActive) return menu.categories;
    return menu.categories
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (it) =>
            normalize(it.name).includes(normalizedQuery) ||
            normalize(it.description ?? "").includes(normalizedQuery)
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [menu, searchActive, normalizedQuery]);

  /* ---------- scroll spy ---------- */
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const pillRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const ignoreObserverRef = useRef(false);

  useEffect(() => {
    if (filteredCategories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (ignoreObserverRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveCat(visible[0].target.id.replace(/^cat-/, ""));
        }
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: 0 }
    );
    filteredCategories.forEach((cat) => {
      const el = sectionRefs.current[String(cat.id)];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [filteredCategories]);

  // Auto-center the active pill in the horizontal rail
  useEffect(() => {
    if (!activeCat) return;
    const pill = pillRefs.current[activeCat];
    pill?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCat]);

  // Preload images for upcoming categories
  useImagePreload(menu, activeCat);

  const handlePillClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, catId: string) => {
      e.preventDefault();
      const el = sectionRefs.current[catId];
      if (!el) return;
      haptic("light");
      ignoreObserverRef.current = true;
      setActiveCat(catId);
      el.scrollIntoView({ behavior: "smooth", block: "start" });

      let timeoutId: number;
      const release = () => {
        ignoreObserverRef.current = false;
        window.clearTimeout(timeoutId);
        window.removeEventListener("scrollend", release);
      };
      // Prefer scrollend when supported; fall back to timeout
      timeoutId = window.setTimeout(release, 1200);
      window.addEventListener("scrollend", release, { once: true });
    },
    []
  );

  /* ---------- hash anchoring on initial load (/menu/<id>#cat-3) ---------- */
  const hashHandledRef = useRef(false);
  useEffect(() => {
    if (!menu || hashHandledRef.current) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#cat-")) {
      hashHandledRef.current = true;
      return;
    }
    const catId = hash.slice(5);
    // Wait two frames for refs + layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = sectionRefs.current[catId];
        if (el) {
          ignoreObserverRef.current = true;
          setActiveCat(catId);
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          window.setTimeout(() => {
            ignoreObserverRef.current = false;
          }, 1200);
        }
        hashHandledRef.current = true;
      });
    });
  }, [menu]);

  /* ---------- cart ---------- */
  const [openItem, setOpenItem] = useState<PublicMenuItem | null>(null);
  const [cart, setCart] = usePersistentCart(orgId ?? null);
  const [cartOpen, setCartOpen] = useState(false);
  const [showToTellerOpen, setShowToTellerOpen] = useState(false);

  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [cart]
  );

  const addLine = useCallback(
    (line: CartLine) => {
      setCart((prev) => {
        const idx = prev.findIndex((l) => l.signature === line.signature);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + line.quantity,
          };
          return next;
        }
        return [...prev, line];
      });
    },
    [setCart]
  );

  const removeLine = useCallback(
    (lineId: string) => {
      haptic("light");
      setCart((prev) => prev.filter((l) => l.lineId !== lineId));
    },
    [setCart]
  );

  const updateQty = useCallback(
    (lineId: string, qty: number) => {
      setCart((prev) =>
        prev
          .map((l) => (l.lineId === lineId ? { ...l, quantity: qty } : l))
          .filter((l) => l.quantity > 0)
      );
    },
    [setCart]
  );

  /* ---------- fly-to-cart animation ---------- */
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);

  const flyToCart = useCallback<FlyToCartFn>((sourceEl) => {
    if (!sourceEl || !cartButtonRef.current) return;
    const sRect = sourceEl.getBoundingClientRect();
    const cRect = cartButtonRef.current.getBoundingClientRect();

    const clone = sourceEl.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, {
      position: "fixed",
      left: `${sRect.left}px`,
      top: `${sRect.top}px`,
      width: `${sRect.width}px`,
      height: `${sRect.height}px`,
      margin: "0",
      pointerEvents: "none",
      zIndex: "100",
      transition: `all ${FLIGHT_MS}ms cubic-bezier(0.55, 0, 0.55, 1)`,
      willChange: "transform, opacity, width, height, left, top, border-radius",
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(clone);

    // Double rAF — ensures browser paints initial frame before transitioning
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const tx = cRect.left + cRect.width / 2 - 14;
        const ty = cRect.top + cRect.height / 2 - 14;
        Object.assign(clone.style, {
          left: `${tx}px`,
          top: `${ty}px`,
          width: "28px",
          height: "28px",
          opacity: "0.45",
          borderRadius: "50%",
          transform: "rotate(40deg)",
        } as Partial<CSSStyleDeclaration>);
      });
    });

    window.setTimeout(() => {
      clone.remove();
      cartButtonRef.current?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.2)" },
          { transform: "scale(1)" },
        ],
        { duration: 380, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
      );
      haptic("medium");
    }, FLIGHT_MS);
  }, []);

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <div
        dir={i18n.dir()}
        className="public-menu-root max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in duration-500"
      >
        <div className="flex items-center gap-4 mt-6">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
          ))}
        </div>
        <div className="space-y-12">
          {[1, 2].map((group) => (
            <div key={group} className="space-y-4">
              <Skeleton className="h-8 w-40" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-[2rem]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- error ---------- */
  if (error || !menu) {
    return (
      <div
        dir={i18n.dir()}
        className="public-menu-root min-h-screen flex items-center justify-center p-4 bg-slate-50"
      >
        <div className="text-center space-y-6 max-w-sm animate-in fade-in zoom-in-95 duration-500">
          <div className="h-24 w-24 bg-white shadow-sm rounded-3xl flex items-center justify-center mx-auto text-slate-300 border border-slate-100">
            <Coffee size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              {t("menu.errors.title")}
            </h2>
            <p className="text-slate-500">{t("menu.errors.body")}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("menu.errors.refresh")}
          </Button>
        </div>
      </div>
    );
  }

  const showEmptyResults = searchActive && filteredCategories.length === 0;

  /* ---------- page ---------- */
  return (
    <div
      dir={i18n.dir()}
      className="public-menu-root light-theme min-h-screen bg-[#F8FAFC] selection:bg-primary/20 antialiased text-foreground"
    >
      {/* ====== Header ====== */}
      <header className="sticky top-0 z-30 bg-white/75 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {menu.logo_url ? (
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                <ItemImage
                  src={menu.logo_url}
                  alt=""
                  className="h-full w-full"
                  iconSize={20}
                />
              </div>
            ) : (
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 flex-shrink-0">
                <Coffee size={22} />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight truncate">
                {menu.org_name}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold leading-tight truncate">
                {t("menu.header.subtitle")}
              </p>
            </div>
          </div>

          <Button
            ref={cartButtonRef}
            variant="ghost"
            size="icon"
            className="rounded-2xl bg-slate-100/60 relative h-11 w-11 flex-shrink-0"
            onClick={() => {
              haptic("light");
              setCartOpen(true);
            }}
            aria-label={t("menu.bar.yourOrder")}
          >
            <ShoppingBag size={20} className="text-slate-600" />
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="absolute -top-1 -end-1 h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center animate-in zoom-in-50 duration-300 tabular-nums"
              >
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6 pb-40 space-y-6 sm:space-y-8">
        {/* ====== Search ====== */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("menu.search.placeholder")}
        />

        {/* ====== Category pills — hide when searching ====== */}
        {!searchActive && (
          <nav
            aria-label="Menu categories"
            className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide sticky top-16 sm:top-20 z-20 py-2 -mx-4 px-4 bg-[#F8FAFC]/90 backdrop-blur-md"
          >
            {filteredCategories.map((cat) => {
              const id = String(cat.id);
              const isActive = activeCat === id;
              return (
                <a
                  key={id}
                  href={`#cat-${id}`}
                  ref={(el) => {
                    pillRefs.current[id] = el;
                  }}
                  onClick={(e) => handlePillClick(e, id)}
                  className={cx(
                    "whitespace-nowrap px-5 sm:px-6 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 active:scale-95 flex items-center gap-2 border shadow-sm",
                    isActive
                      ? "bg-slate-900 border-slate-900 text-white shadow-slate-900/20"
                      : "bg-white border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary"
                  )}
                >
                  {cat.name}
                </a>
              );
            })}
          </nav>
        )}

        {/* ====== Empty results state ====== */}
        {showEmptyResults && (
          <div className="text-center py-16 sm:py-24 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="h-20 w-20 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center text-slate-300">
              <Search size={28} />
            </div>
            <p className="text-base font-bold text-slate-700 px-6">
              {t("menu.search.noResults", { query: trimmed })}
            </p>
            <p className="text-sm text-slate-400 px-6">
              {t("menu.search.noResultsHint")}
            </p>
          </div>
        )}

        {/* ====== Sections ====== */}
        <div className="space-y-14 sm:space-y-20">
          {filteredCategories.map((cat) => {
            const id = String(cat.id);
            return (
              <section
                key={id}
                id={`cat-${id}`}
                ref={(el) => {
                  sectionRefs.current[id] = el;
                }}
                className="scroll-mt-36 sm:scroll-mt-40 space-y-6 sm:space-y-8"
                aria-labelledby={`cat-heading-${id}`}
              >
                <div className="flex items-center gap-4">
                  <h2
                    id={`cat-heading-${id}`}
                    className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter"
                  >
                    {cat.name}
                  </h2>
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-200 to-transparent rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {cat.items.map((item) => (
                    <MenuItemCard
                      key={String(item.id)}
                      item={item}
                      onClick={() => setOpenItem(item)}
                      isRTL={isRTL}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* ====== Floating order bar ====== */}
      {cartCount > 0 && (
        <FloatingOrderBar
          cartCount={cartCount}
          total={cartTotal}
          onOpen={() => {
            haptic("light");
            setCartOpen(true);
          }}
        />
      )}

      {/* ====== Item detail dialog ====== */}
      <ItemDetailDialog
        item={openItem}
        onClose={() => setOpenItem(null)}
        onAdd={(line, sourceEl) => {
          flyToCart(sourceEl);
          addLine(line);
          // Hold the dialog open briefly so the user sees the flight start from where they tapped
          window.setTimeout(() => setOpenItem(null), 80);
        }}
      />

      {/* ====== Cart dialog ====== */}
      <CartDialog
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        total={cartTotal}
        onUpdateQty={updateQty}
        onRemove={removeLine}
        onShowToTeller={() => setShowToTellerOpen(true)}
      />

      {/* ====== Show-to-Barista dialog ====== */}
      <ShowToTellerDialog
        open={showToTellerOpen}
        onClose={() => setShowToTellerOpen(false)}
        cart={cart}
        total={cartTotal}
      />
    </div>
  );
}

/* ===========================================================================
 *  Floating order bar — bumps on cart-count increase
 * ========================================================================= */

function FloatingOrderBar({
  cartCount,
  total,
  onOpen,
}: {
  cartCount: number;
  total: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const lastCountRef = useRef(cartCount);
  const barRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (cartCount > lastCountRef.current && barRef.current) {
      barRef.current.animate(
        [
          { transform: "translateY(0) scale(1)" },
          { transform: "translateY(-4px) scale(1.02)" },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: 380, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
      );
    }
    lastCountRef.current = cartCount;
  }, [cartCount]);

  return (
    <div
      className="fixed start-4 end-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-8 fade-in duration-500"
      style={{ bottom: "max(env(safe-area-inset-bottom, 0px), 1rem)" }}
    >
      <button
        ref={barRef}
        onClick={onOpen}
        className="w-full h-[68px] sm:h-20 bg-slate-900 text-white rounded-[1.75rem] sm:rounded-[2rem] font-bold flex items-center justify-between ps-5 pe-2 sm:ps-7 sm:pe-3 shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition-all active:scale-[0.98] border border-white/10 overflow-hidden relative"
      >
        <div className="flex flex-col items-start relative z-10 min-w-0">
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
            {t("menu.bar.yourOrder")}
          </span>
          <span className="text-base sm:text-lg tracking-tight font-black">
            {t("menu.bar.items", { count: cartCount })}
          </span>
        </div>
        <div className="h-12 sm:h-14 px-4 sm:px-6 bg-primary rounded-2xl flex items-center gap-2 sm:gap-3 text-white font-black text-sm tracking-tight shadow-lg shadow-primary/30 relative z-10 flex-shrink-0">
          <span className="hidden sm:inline">{t("menu.bar.viewOrder")}</span>
          <span className="sm:hidden">{t("menu.bar.view")}</span>
          <span className="opacity-60">•</span>
          <AnimatedMoney value={total} className="tabular-nums" />
        </div>
      </button>
    </div>
  );
}

/* ===========================================================================
 *  Menu item card — with tilt on hover, entrance on scroll-into-view
 * ========================================================================= */

function MenuItemCard({
  item,
  onClick,
  isRTL,
}: {
  item: PublicMenuItem;
  onClick: () => void;
  isRTL: boolean;
}) {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLButtonElement>({
    rootMargin: "0px 0px -5% 0px",
  });
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const canTiltRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    canTiltRef.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!canTiltRef.current || !tiltRef.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    tiltRef.current.style.setProperty("--rx", `${-y * 5}deg`);
    tiltRef.current.style.setProperty("--ry", `${x * 5}deg`);
  };

  const handleMouseLeave = () => {
    if (!tiltRef.current) return;
    tiltRef.current.style.setProperty("--rx", "0deg");
    tiltRef.current.style.setProperty("--ry", "0deg");
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        haptic("light");
        onClick();
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cx(
        "group text-start bg-white rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-5 border border-slate-100 shadow-sm relative overflow-hidden flex gap-4 sm:gap-5 cursor-pointer",
        "hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.98]",
        "transition-[opacity,transform,box-shadow] duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="flex-1 flex flex-col justify-between py-0.5 sm:py-1 min-w-0">
        <div className="space-y-1.5 sm:space-y-2">
          <h3 className="font-bold text-lg sm:text-xl text-slate-900 group-hover:text-primary transition-colors line-clamp-1 tracking-tight">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-[13px] sm:text-sm text-slate-400 font-medium line-clamp-2 leading-relaxed min-h-[2.25rem] sm:min-h-[2.5rem]">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 sm:mt-4">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">
              {item.sizes && item.sizes.length > 1
                ? t("menu.card.startsAt")
                : t("menu.card.price")}
            </span>
            <span className="text-lg sm:text-xl font-black text-primary leading-none mt-0.5 tabular-nums">
              {fmtMoney(item.base_price)}
            </span>
          </div>
          <div
            className={cx(
              "h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20",
              isRTL && "rotate-180"
            )}
          >
            <ChevronRight size={20} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Tilt wrapper — only the image tilts, keeps text legible */}
      <div
        ref={tiltRef}
        className="relative flex-shrink-0 transition-transform duration-300 ease-out"
        style={{
          transform: "perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          transformStyle: "preserve-3d",
        }}
      >
        <ItemImage
          src={item.image_url}
          alt={item.name}
          fallbackName={item.name}
          fallbackVariant="card"
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[1.75rem] shadow-xl shadow-slate-200/60 bg-slate-50 group-hover:scale-[1.03] transition-transform duration-500"
        />
        {item.image_url && (
          <div className="absolute inset-0 rounded-[1.5rem] sm:rounded-[1.75rem] bg-gradient-to-tr from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </div>
    </button>
  );
}

/* ===========================================================================
 *  Item detail dialog — splits into shell + inner body keyed by item.id
 *  (the body remounts when the item changes, so we don't need a manual reset
 *  effect, and we get a clean state on every open.)
 * ========================================================================= */

/* ===========================================================================
 *  BottomSheet — inline replacement for the shadcn Dialog primitive
 *  Mobile: full-width sheet anchored to bottom, drag-to-dismiss
 *  Desktop: centered, max-w-2xl, anchored 1.5rem from bottom
 * ========================================================================= */

function BottomSheet({
  open,
  onClose,
  ariaLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [animate, setAnimate] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; offset: number } | null>(null);

  // Sync mounted and animate states to trigger entry/exit transitions cleanly
  useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      setAnimate(false);
      const t = window.setTimeout(() => setMounted(false), 300);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (mounted && open) {
      const id = window.setTimeout(() => setAnimate(true), 16);
      return () => window.clearTimeout(id);
    }
  }, [mounted, open]);

  // Lock body scroll while mounted
  useEffect(() => {
    if (!mounted) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mounted]);

  // ESC key to close
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mounted, onClose]);

  // Drag-to-dismiss (mobile only)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetRef.current) return;
    dragRef.current = { startY: e.clientY, offset: 0 };
    sheetRef.current.style.transition = "none";
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !sheetRef.current) return;
    const delta = Math.max(0, e.clientY - dragRef.current.startY);
    dragRef.current.offset = delta;
    const eased = delta < 40 ? delta : 40 + (delta - 40) * 0.85;
    sheetRef.current.style.transform = `translate3d(0, ${eased}px, 0)`;
  };

  const handlePointerUp = () => {
    if (!dragRef.current || !sheetRef.current) return;
    const height = sheetRef.current.getBoundingClientRect().height;
    const shouldClose = dragRef.current.offset > height * 0.22;
    sheetRef.current.style.transition = "";
    sheetRef.current.style.transform = "";
    dragRef.current = null;
    if (shouldClose) {
      haptic("light");
      onClose();
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 light-theme">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={cx(
          "absolute inset-0 bg-slate-900/50 backdrop-blur-sm",
          "transition-opacity duration-300 ease-out",
          animate ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cx(
          // Position: full width on mobile, centered max-w-2xl on desktop
          "fixed inset-x-0 bottom-0",
          "sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-6 sm:w-full sm:max-w-2xl",
          // Box
          "bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col",
          "max-h-[86vh] sm:max-h-[80vh]",
          // Animation — only transform-y animates; -translate-x-1/2 composes via Tailwind vars on sm
          "transform-gpu will-change-transform",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          animate
            ? "translate-y-0"
            : "translate-y-full sm:translate-y-[calc(100%+1.5rem)]"
        )}
      >
        {/* Drag handle (mobile only) */}
        <div
          className="sm:hidden flex justify-center pt-2.5 pb-1 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}


function ItemDetailDialog({
  item,
  onClose,
  onAdd,
}: {
  item: PublicMenuItem | null;
  onClose: () => void;
  onAdd: (line: CartLine, sourceEl: HTMLElement | null) => void;
}) {
  const [localItem, setLocalItem] = useState<PublicMenuItem | null>(null);

  useEffect(() => {
    if (item) {
      setLocalItem(item);
    }
  }, [item]);

  return (
    <BottomSheet open={!!item} onClose={onClose} ariaLabel={localItem?.name}>
      {localItem && (
        <ItemDetailBody
          key={String(localItem.id)}
          item={localItem}
          onClose={onClose}
          onAdd={onAdd}
        />
      )}
    </BottomSheet>
  );
}

function ItemDetailBody({
  item,
  onClose,
  onAdd,
}: {
  item: PublicMenuItem;
  onClose: () => void;
  onAdd: (line: CartLine, sourceEl: HTMLElement | null) => void;
}) {
  const { t } = useTranslation();
  const [sizeId, setSizeId] = useState<ID | undefined>(item.sizes?.[0]?.id);
  const [selected, setSelected] = useState<Map<ID, Set<ID>>>(new Map());
  const [qty, setQty] = useState(1);
  const imageRef = useRef<HTMLDivElement | null>(null);

  const size = useMemo(
    () => item.sizes?.find((s) => s.id === sizeId),
    [item.sizes, sizeId]
  );
  const sizePrice = useMemo(
    () => getSizePrice(item.base_price, size),
    [item.base_price, size]
  );

  const addonsCost = useMemo(() => {
    if (!item.addon_slots) return 0;
    let total = 0;
    for (const slot of item.addon_slots) {
      const picks = selected.get(slot.id);
      if (!picks) continue;
      for (const addonId of picks) {
        const a = slot.addon_items.find((x) => x.id === addonId);
        if (a) total += getAddonPrice(a);
      }
    }
    return total;
  }, [item.addon_slots, selected]);

  const unitPrice = sizePrice + addonsCost;
  const lineTotal = unitPrice * qty;

  const toggleAddon = (slot: PublicAddonSlot, addonId: ID) => {
    haptic("light");
    setSelected((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(slot.id) ?? []);
      const max = slot.max_selections ?? Infinity;
      const isRadio = max === 1;

      if (current.has(addonId)) {
        current.delete(addonId);
      } else if (isRadio) {
        current.clear();
        current.add(addonId);
      } else if (current.size < max) {
        current.add(addonId);
      } else {
        return prev;
      }
      next.set(slot.id, current);
      return next;
    });
  };

  const handleAdd = () => {
    const addonLines: CartLine["addons"] = [];
    const addonIds: ID[] = [];
    for (const slot of item.addon_slots ?? []) {
      for (const aid of selected.get(slot.id) ?? []) {
        const a = slot.addon_items.find((x) => x.id === aid);
        if (!a) continue;
        addonIds.push(a.id);
        addonLines.push({
          slotId: slot.id,
          slotName: slot.label ?? "",
          addonId: a.id,
          addonName: a.name,
          price: getAddonPrice(a),
        });
      }
    }

    const line: CartLine = {
      lineId: uid(),
      signature: lineSignature(item.id, size?.id, addonIds),
      itemId: item.id,
      itemName: item.name,
      imageUrl: item.image_url,
      size: size ? { id: size.id, name: size.label } : undefined,
      addons: addonLines,
      unitPrice,
      quantity: qty,
    };
    onAdd(line, imageRef.current);
  };

  return (
    <>
      {/* Hero — real image or typographic mockup */}
      <div className="relative" ref={imageRef}>
        <ItemImage
          src={item.image_url}
          alt={item.name}
          fallbackName={item.name}
          fallbackVariant="hero"
          className="w-full h-48 sm:h-64 bg-slate-100"
          iconSize={48}
        />
        {item.image_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/0 to-transparent pointer-events-none" />
        )}

        <button
          onClick={() => {
            haptic("light");
            onClose();
          }}
          aria-label={t("menu.detail.close")}
          className="absolute top-2 end-3 sm:top-4 sm:end-4 h-10 w-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md hover:bg-white active:scale-95 transition"
        >
          <X size={20} className="text-slate-800" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-3 pb-6 space-y-6 sm:space-y-7">
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {item.name}
          </h2>
          {item.description && (
            <p className="text-[13px] sm:text-sm text-slate-500 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Sizes */}
        {item.sizes && item.sizes.length > 0 && (
          <Section title={t("menu.detail.size")}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {item.sizes.map((s) => {
                const active = sizeId === s.id;
                const price = getSizePrice(item.base_price, s);
                return (
                  <button
                    key={String(s.id)}
                    type="button"
                    onClick={() => {
                      haptic("light");
                      setSizeId(s.id);
                    }}
                    className={cx(
                      "rounded-2xl border-2 px-4 py-3 text-start transition-all active:scale-[0.97] min-h-[60px]",
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {s.label}
                      </span>
                      {active && (
                        <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 animate-in zoom-in-50 duration-200">
                          <Check size={12} strokeWidth={4} />
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-500 mt-1 block tabular-nums">
                      {fmtMoney(price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Addon slots */}
        {item.addon_slots?.map((slot) => {
          const max = slot.max_selections ?? Infinity;
          const min = slot.min_selections ?? 0;
          const picks = selected.get(slot.id) ?? new Set();
          const isRadio = max === 1;
          const reachedMax = picks.size >= max;

          let subtitle: string;
          if (isRadio && min > 0) {
            subtitle = t("menu.detail.requiredChooseOne");
          } else if (min > 0 && Number.isFinite(max)) {
            subtitle =
              min === max
                ? t("menu.detail.requiredChooseExact", { count: min })
                : t("menu.detail.requiredChooseRange", { min, max });
          } else if (Number.isFinite(max)) {
            subtitle = t("menu.detail.chooseUpTo", { max });
          } else {
            subtitle = t("menu.detail.optional");
          }

          return (
            <Section
              key={String(slot.id)}
              title={slot.label ?? ""}
              subtitle={subtitle}
            >
              <div className="space-y-2">
                {slot.addon_items.map((a) => {
                  const checked = picks.has(a.id);
                  const disabled = !checked && reachedMax && !isRadio;
                  const price = getAddonPrice(a);
                  return (
                    <button
                      key={String(a.id)}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleAddon(slot, a.id)}
                      className={cx(
                        "w-full flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border-2 transition-all active:scale-[0.99] min-h-[56px]",
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white hover:border-slate-300",
                        disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cx(
                            "flex-shrink-0 flex items-center justify-center transition-all",
                            isRadio
                              ? "h-5 w-5 rounded-full border-2"
                              : "h-5 w-5 rounded-md border-2",
                            checked
                              ? "border-primary bg-primary text-white"
                              : "border-slate-300 bg-white"
                          )}
                        >
                          {checked &&
                            (isRadio ? (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            ) : (
                              <Check size={12} strokeWidth={4} />
                            ))}
                        </span>
                        <span className="font-semibold text-slate-900 text-sm text-start">
                          {a.name}
                        </span>
                      </div>
                      {price > 0 && (
                        <span className="text-xs font-black text-slate-500 tabular-nums">
                          +{fmtMoney(price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>
          );
        })}

        {/* Quantity */}
        <Section title={t("menu.detail.quantity")}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setQty((q) => Math.max(1, q - 1));
              }}
              className="h-12 w-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black transition active:scale-90 disabled:opacity-40"
              disabled={qty <= 1}
              aria-label={t("menu.detail.decrease")}
            >
              <Minus size={18} strokeWidth={3} />
            </button>
            <span className="text-2xl font-black w-10 text-center tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setQty((q) => Math.min(99, q + 1));
              }}
              className="h-12 w-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center font-black transition active:scale-90"
              aria-label={t("menu.detail.increase")}
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
        </Section>
      </div>

      {/* Sticky footer with animated price */}
      <div
        className="border-t border-slate-100 bg-white px-4 sm:px-5 py-3 sm:py-4"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)",
        }}
      >
        <button
          onClick={handleAdd}
          className="w-full h-14 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-between px-5 sm:px-6 font-black text-sm sm:text-base transition-all active:scale-[0.98] bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
        >
          <span className="tracking-tight">
            {t("menu.detail.addToOrder", { count: qty })}
          </span>
          <AnimatedMoney
            value={lineTotal}
            className="tracking-tight tabular-nums ms-3 flex-shrink-0"
          />
        </button>
      </div>
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
          {title}
        </h3>
        {subtitle && (
          <span className="text-[11px] text-slate-400 font-bold text-end">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ===========================================================================
 *  Cart dialog
 * ========================================================================= */

function CartDialog({
  open,
  onClose,
  cart,
  total,
  onUpdateQty,
  onRemove,
  onShowToTeller,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  total: number;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onShowToTeller: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="light-theme p-0 gap-0 sm:max-w-md max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border-0 flex flex-col bg-white transform-gpu"
        showClose={false}
      >
        <header className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {t("menu.cart.title")}
            </h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {t("menu.cart.lines", { count: cart.length })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("menu.detail.close")}
            className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition active:scale-90"
          >
            <X size={18} className="text-slate-700" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="h-16 w-16 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center text-slate-300">
                <ShoppingBag size={28} />
              </div>
              <p className="text-sm text-slate-500 font-bold px-6">
                {t("menu.cart.empty")}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map((line) => (
                <li
                  key={line.lineId}
                  className="bg-slate-50 rounded-2xl p-3 sm:p-4 flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  <ItemImage
                    src={line.imageUrl}
                    alt={line.itemName}
                    fallbackName={line.itemName}
                    fallbackVariant="thumb"
                    className="h-16 w-16 rounded-2xl flex-shrink-0 shadow-sm"
                    iconSize={20}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
                          {line.itemName}
                        </h4>
                        {line.size && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {line.size.name}
                          </p>
                        )}
                        {line.addons.length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                            {line.addons.map((a) => a.addonName).join(", ")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(line.lineId)}
                        className="text-slate-400 hover:text-red-500 transition p-1 -m-1"
                        aria-label={t("menu.cart.remove")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
                        <button
                          onClick={() => {
                            haptic("light");
                            onUpdateQty(line.lineId, line.quantity - 1);
                          }}
                          className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition active:scale-90"
                          aria-label={t("menu.detail.decrease")}
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        <span className="w-5 text-center text-sm font-black tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => {
                            haptic("light");
                            onUpdateQty(line.lineId, line.quantity + 1);
                          }}
                          className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition active:scale-90"
                          aria-label={t("menu.detail.increase")}
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
                      <span className="text-sm font-black text-slate-900 tabular-nums">
                        {fmtMoney(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <footer
            className="border-t border-slate-100 px-5 sm:px-6 pt-4 space-y-3"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                {t("menu.cart.total")}
              </span>
              <AnimatedMoney
                value={total}
                className="text-2xl font-black tracking-tight text-slate-900 tabular-nums"
              />
            </div>
            <button
              onClick={() => {
                haptic("medium");
                onClose();
                onShowToTeller();
              }}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black tracking-tight transition active:scale-[0.98] shadow-lg shadow-slate-900/20"
            >
              {t("menu.cart.showToBarista")}
            </button>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================================
 *  Show-to-Barista dialog — Lottie coffee cup + welcoming copy + order code
 * ========================================================================= */

function ShowToTellerDialog({
  open,
  onClose,
  cart,
  total,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  total: number;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="light-theme p-0 gap-0 sm:max-w-md max-h-[92vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border-0 flex flex-col bg-white transform-gpu"
        showClose={false}
      >
        <DialogTitle className="sr-only">{t("menu.teller.title")}</DialogTitle>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Hero — Lottie + welcome copy */}
          <div className="bg-slate-50 px-8 pt-8 pb-14 text-slate-900 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.03),transparent_60%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.02),transparent_55%)] pointer-events-none" />

            <div className="relative h-32 w-32 mx-auto mb-3 animate-in zoom-in-90 duration-500">
  <Suspense fallback={<LottieFallback />}>
    <DotLottieRender />
  </Suspense>
</div>

            <h2 className="text-2xl font-black tracking-tight mb-2 animate-in fade-in slide-in-from-bottom-1 duration-500">
              {t("menu.teller.title")}
            </h2>
            <p className="text-slate-500 font-medium text-[13px] sm:text-sm leading-relaxed max-w-[18rem] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
              {t("menu.teller.subtitle")}
            </p>
          </div>

          {/* Total card (overlapping the hero) */}
          <div className="px-5 sm:px-6 -mt-8 relative z-10">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-5 flex items-center justify-center animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t("menu.teller.total")}
                </p>
                <p className="text-2xl sm:text-3xl font-black tracking-tighter text-primary tabular-nums mt-1">
                  {fmtMoney(total)}
                </p>
              </div>
            </div>
          </div>

          {/* Order lines */}
          <div className="px-5 sm:px-6 pt-6 pb-2">
            <ul className="space-y-4">
              {cart.map((line, i) => (
                <li
                  key={line.lineId}
                  className="flex justify-between gap-4 animate-in fade-in slide-in-from-bottom-1 duration-500"
                  style={{
                    animationDelay: `${Math.min(i * 50, 300)}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg tabular-nums">
                        {line.quantity}×
                      </span>
                      <h4 className="font-bold text-slate-900 text-[15px] leading-tight truncate">
                        {line.itemName}
                      </h4>
                    </div>
                    <div className="mt-1.5 ms-10 space-y-0.5">
                      {line.size && (
                        <p className="text-xs text-slate-500 font-bold">
                          {line.size.name}
                        </p>
                      )}
                      {line.addons.length > 0 && (
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                          {line.addons.map((a) => a.addonName).join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-900 tabular-nums whitespace-nowrap">
                    {fmtMoney(line.unitPrice * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Friendly note */}
          <div className="px-5 sm:px-6 pt-6 pb-6">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-primary flex-shrink-0">
                <Coffee size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                  {t("menu.teller.noteTitle")}
                </p>
                <p className="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">
                  {t("menu.teller.noteBody")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="p-5 pt-0"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.25rem)",
          }}
        >
          <button
            onClick={() => {
              haptic("light");
              onClose();
            }}
            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black tracking-tight transition active:scale-[0.98]"
          >
            {t("menu.teller.done")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LottieFallback() {
  return (
    <div className="h-full w-full bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30 animate-pulse">
      <Coffee size={36} strokeWidth={2.5} />
    </div>
  );
}

function DotLottieRender() {
  const [failed, setFailed] = useState(false);

  if (failed) return <LottieFallback />;

  return (
    <DotLottie
      src="/ShowTellerCup.lottie"
      loop
      autoplay
      style={{ width: "100%", height: "100%" }}
      dotLottieRefCallback={(instance) => {
        if (!instance) return;
        instance.addEventListener("loadError", () => setFailed(true));
      }}
    />
  );
}