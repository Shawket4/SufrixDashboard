// src/pages/public-menu/public-menu.tsx
import { useParams } from "react-router-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent,
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
  ImageOff,
  Leaf,
  Minus,
  Plus,
  Sandwich,
  ShoppingBag,
  Snowflake,
  Trash2,
  X,
  type LucideProps,
} from "lucide-react";

import { usePublicMenu } from "@/entities/menu/queries";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/ui/dialog";
import { fmtMoney } from "@/shared/lib/format";

import type {
  PublicAddonItem,
  PublicAddonSlot,
  PublicItemSize,
  PublicMenuItem,
} from "@/shared/types";

/* ---------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

type ID = string;

type CartLine = {
  lineId: string;
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

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

const getSizePrice = (basePrice: number, size?: PublicItemSize) => {
  if (!size) return basePrice;
  return size.price_override;
};

const getAddonPrice = (a: PublicAddonItem) => a.default_price;

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");

/** Build an elegant monogram from the item name (first 2 word-initials, or first 2 chars). */
const getMonogram = (name: string): string => {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return "·";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0];
  return w.substring(0, Math.min(w.length, 2)).toUpperCase();
};

/** Apply an alpha to a 6-digit hex colour, returning an rgba() string. */
const hexAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Mirrors the Flutter `CatStyle.of(name)` map exactly — same keyword order,
 * same palettes — so web and Flutter mockups stay visually identical.
 */
const getCatStyle = (name: string): CatStyle => {
  const n = (name ?? "").toLowerCase();

  if (n.includes("matcha"))
    return {
      icon: Leaf,
      bgTop: "#E8F5E9",
      bgBottom: "#C8E6C9",
      iconColor: "#2E7D32",
      accent: "#388E3C",
    };

  if (
    n.includes("latte") ||
    n.includes("espresso") ||
    n.includes("americano") ||
    n.includes("cappuc") ||
    n.includes("flat") ||
    n.includes("cortado") ||
    n.includes("coffee") ||
    n.includes("v60") ||
    n.includes("blended") ||
    n.includes("cold brew")
  )
    return {
      icon: Coffee,
      bgTop: "#F5EEE6",
      bgBottom: "#EDD9C0",
      iconColor: "#5D4037",
      accent: "#795548",
    };

  if (n.includes("chocolate") || n.includes("mocha"))
    return {
      icon: Coffee,
      bgTop: "#F3E5E5",
      bgBottom: "#E8CECE",
      iconColor: "#6D4C41",
      accent: "#8D3A3A",
    };

  if (
    n.includes("croissant") ||
    n.includes("brownie") ||
    n.includes("cookie") ||
    n.includes("pastry") ||
    n.includes("pastries") ||
    n.includes("cake") ||
    n.includes("waffle")
  )
    return {
      icon: Cookie,
      bgTop: "#FFF8E8",
      bgBottom: "#FFF0C8",
      iconColor: "#E65100",
      accent: "#F57C00",
    };

  if (
    n.includes("sandwich") ||
    n.includes("chicken") ||
    n.includes("turkey") ||
    n.includes("food")
  )
    return {
      icon: Sandwich,
      bgTop: "#FFF3E0",
      bgBottom: "#FFE0B2",
      iconColor: "#E64A19",
      accent: "#EF6C00",
    };

  if (n.includes("affogato") || n.includes("ice cream"))
    return {
      icon: IceCream,
      bgTop: "#F3E5F5",
      bgBottom: "#E1BEE7",
      iconColor: "#7B1FA2",
      accent: "#9C27B0",
    };

  if (
    n.includes("lemon") ||
    n.includes("lemonade") ||
    n.includes("refresher") ||
    n.includes("juice")
  )
    return {
      icon: GlassWater,
      bgTop: "#FFFDE7",
      bgBottom: "#FFF9C4",
      iconColor: "#F57F17",
      accent: "#FBC02D",
    };

  if (n.includes("tea") || n.includes("chai"))
    return {
      icon: Leaf,
      bgTop: "#E8F5E9",
      bgBottom: "#C8E6C9",
      iconColor: "#388E3C",
      accent: "#43A047",
    };

  if (n.includes("water") || n.includes("sparkling"))
    return {
      icon: Droplet,
      bgTop: "#E3F2FD",
      bgBottom: "#BBDEFB",
      iconColor: "#1565C0",
      accent: "#1976D2",
    };

  if (n.includes("iced"))
    return {
      icon: Snowflake,
      bgTop: "#E3F2FD",
      bgBottom: "#BBDEFB",
      iconColor: "#0277BD",
      accent: "#0288D1",
    };

  return {
    icon: Coffee,
    bgTop: "#F5EEE6",
    bgBottom: "#EDD9C0",
    iconColor: "#795548",
    accent: "#8D6E63",
  };
};

/* ---------------------------------------------------------------------------
 * Missing-image mockup — typographic monogram on warm gradient, with a
 * category-coloured ring + tiny icon badge. Three variants for thumb / card /
 * hero sizes.
 * ------------------------------------------------------------------------- */

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
      {/* Soft grain — adds organic, food-photography-like texture */}
      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.6) 1px, transparent 0)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* Primary decorative ring, bottom-right */}
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

      {/* Secondary ring for hero only — adds depth */}
      {variant === "hero" && (
        <div
          className="absolute -left-24 -top-24 w-72 h-72 rounded-full border-2 pointer-events-none"
          style={{ borderColor: hexAlpha(style.accent, 0.1) }}
        />
      )}

      {/* Hairline accent line for hero — editorial detail */}
      {variant === "hero" && (
        <div
          className="absolute bottom-6 left-6 right-6 h-px pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${hexAlpha(
              style.accent,
              0.25
            )}, transparent)`,
          }}
        />
      )}

      {/* Monogram */}
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

      {/* Category icon badge */}
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

/* ---------------------------------------------------------------------------
 * Image with graceful fallback. When `fallbackName` is provided and the image
 * is missing or fails, we render the typographic mockup; otherwise the neutral
 * grey placeholder (used for brand logos etc.).
 * ------------------------------------------------------------------------- */

function ItemImage({
  src,
  alt,
  className,
  fallbackName,
  fallbackVariant = "card",
  iconSize = 28,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackName?: string;
  fallbackVariant?: ThumbVariant;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset state when src changes
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
      <div
        className={cx(
          "flex items-center justify-center bg-slate-100 text-slate-300",
          className
        )}
      >
        <ImageOff size={iconSize} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={cx("relative overflow-hidden", className)}>
      {!loaded && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse" />
      )}
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

/* ---------------------------------------------------------------------------
 * Main page
 * ------------------------------------------------------------------------- */

export default function PublicMenuPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { t } = useTranslation();
  const { data: menu, isLoading, error } = usePublicMenu(orgId ?? null);

  /* ---------- active category via IntersectionObserver ---------- */
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const pillRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const ignoreObserver = useRef(false);

  useEffect(() => {
    if (!menu) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (ignoreObserver.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveCat(visible[0].target.id.replace(/^cat-/, ""));
        }
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: 0 }
    );
    menu.categories.forEach((cat) => {
      const el = sectionRefs.current[String(cat.id)];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [menu]);

  // auto-center the active pill in the horizontal scroller
  useEffect(() => {
    if (!activeCat) return;
    const pill = pillRefs.current[activeCat];
    pill?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCat]);

  const handlePillClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, catId: string) => {
      e.preventDefault();
      const el = sectionRefs.current[catId];
      if (!el) return;
      ignoreObserver.current = true;
      setActiveCat(catId);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => (ignoreObserver.current = false), 700);
    },
    []
  );

  /* ---------- modals + cart ---------- */
  const [openItem, setOpenItem] = useState<PublicMenuItem | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const cartCount = useMemo(
    () => cart.reduce((s, l) => s + l.quantity, 0),
    [cart]
  );
  const cartTotal = useMemo(
    () => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [cart]
  );

  const addLine = useCallback((line: CartLine) => {
    setCart((prev) => [...prev, line]);
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const updateQty = useCallback((lineId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, quantity: qty } : l))
        .filter((l) => l.quantity > 0)
    );
  }, []);

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mt-6">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className="h-10 w-24 rounded-full flex-shrink-0"
            />
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="text-center space-y-6 max-w-sm animate-in fade-in zoom-in-95 duration-500">
          <div className="h-24 w-24 bg-white shadow-sm rounded-3xl flex items-center justify-center mx-auto text-slate-300 border border-slate-100">
            <Coffee size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              {t("errors.notFound")}
            </h2>
            <p className="text-slate-500">
              The menu you&apos;re looking for isn&apos;t available or the link
              has expired.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("common.refresh")}
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- page ---------- */
  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-primary/20 antialiased">
      {/* ====== Header ====== */}
      <header className="sticky top-0 z-30 bg-white/75 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {menu.logo_url ? (
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                <ItemImage
                  src={menu.logo_url}
                  alt={menu.org_name}
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
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-400 font-bold">
                Online Menu
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl bg-slate-100/60 relative h-11 w-11 flex-shrink-0"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingBag size={20} className="text-slate-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center animate-in zoom-in-50 duration-300">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6 pb-40 space-y-8 sm:space-y-12">
        {/* ====== Category pills ====== */}
        <nav
          aria-label="Menu categories"
          className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide sticky top-16 sm:top-20 z-20 py-2 -mx-4 px-4 bg-[#F8FAFC]/90 backdrop-blur-md"
        >
          {menu.categories.map((cat) => {
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

        {/* ====== Sections ====== */}
        <div className="space-y-14 sm:space-y-20">
          {menu.categories.map((cat) => {
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
                  {cat.items.map((item: PublicMenuItem, idx) => (
                    <MenuItemCard
                      key={String(item.id)}
                      item={item}
                      onClick={() => setOpenItem(item)}
                      delayMs={Math.min(idx * 40, 240)}
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
        <div
          className="fixed left-4 right-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-8 fade-in duration-500"
          style={{
            bottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
          }}
        >
          <button
            onClick={() => setCartOpen(true)}
            className="w-full h-[68px] sm:h-20 bg-slate-900 text-white rounded-[1.75rem] sm:rounded-[2rem] font-bold flex items-center justify-between pl-5 pr-2 sm:pl-7 sm:pr-3 shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition-all active:scale-[0.98] group overflow-hidden border border-white/10"
          >
            <div className="flex flex-col items-start relative z-10 min-w-0">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                Your Order
              </span>
              <span className="text-base sm:text-lg tracking-tight font-black">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="h-12 sm:h-14 px-4 sm:px-6 bg-primary rounded-2xl flex items-center gap-2 sm:gap-3 text-white font-black text-sm tracking-tight shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform relative z-10 flex-shrink-0">
              <span className="hidden sm:inline">View Order</span>
              <span className="sm:hidden">View</span>
              <span className="opacity-60">•</span>
              <span className="tabular-nums">{fmtMoney(cartTotal)}</span>
            </div>
            <div className="absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-0 group-hover:translate-x-[400%] transition-transform duration-1000 ease-out pointer-events-none" />
          </button>
        </div>
      )}

      {/* ====== Item detail dialog ====== */}
      <ItemDetailDialog
        item={openItem}
        onClose={() => setOpenItem(null)}
        onAdd={(line) => {
          addLine(line);
          setOpenItem(null);
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
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Item card — refined mobile layout, mockup fallback when no image.
 * ------------------------------------------------------------------------- */

function MenuItemCard({
  item,
  onClick,
  delayMs = 0,
}: {
  item: PublicMenuItem;
  onClick: () => void;
  delayMs?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delayMs}ms`, animationFillMode: "backwards" }}
      className="group text-left bg-white rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-500 cursor-pointer relative overflow-hidden flex gap-4 sm:gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
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
              {item.sizes && item.sizes.length > 1 ? "Starts at" : "Price"}
            </span>
            <span className="text-lg sm:text-xl font-black text-primary leading-none mt-0.5 tabular-nums">
              {fmtMoney(item.base_price)}
            </span>
          </div>
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
            <ChevronRight size={20} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Visual area — real image, or typographic mockup */}
      <div className="relative flex-shrink-0">
        <ItemImage
          src={item.image_url}
          alt={item.name}
          fallbackName={item.name}
          fallbackVariant="card"
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[1.75rem] shadow-xl shadow-slate-200/60 bg-slate-50 group-hover:rotate-2 group-hover:scale-[1.03] transition-transform duration-500"
        />
        {item.image_url && (
          <div className="absolute inset-0 rounded-[1.5rem] sm:rounded-[1.75rem] bg-gradient-to-tr from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * Item detail dialog — sizes + addon slots + qty stepper.
 * ------------------------------------------------------------------------- */

function ItemDetailDialog({
  item,
  onClose,
  onAdd,
}: {
  item: PublicMenuItem | null;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const open = !!item;

  // Selection state — reset whenever item changes
  const [sizeId, setSizeId] = useState<ID | undefined>(undefined);
  const [selected, setSelected] = useState<Map<ID, Set<ID>>>(new Map());
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!item) return;
    setSizeId(item.sizes?.[0]?.id);
    setSelected(new Map());
    setQty(1);
  }, [item?.id]);

  const size = useMemo(
    () => item?.sizes?.find((s) => s.id === sizeId),
    [item, sizeId]
  );

  const sizePrice = useMemo(
    () => (item ? getSizePrice(item.base_price, size) : 0),
    [item, size]
  );

  const addonsCost = useMemo(() => {
    if (!item?.addon_slots) return 0;
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
  }, [item, selected]);

  const unitPrice = sizePrice + addonsCost;

  const invalidSlots = useMemo(() => {
    if (!item?.addon_slots) return [] as PublicAddonSlot[];
    return item.addon_slots.filter((slot) => {
      const picked = selected.get(slot.id)?.size ?? 0;
      return picked < (slot.min_selections ?? 0);
    });
  }, [item, selected]);

  const canAdd = invalidSlots.length === 0 && qty > 0 && !!item;

  const toggleAddon = (slot: PublicAddonSlot, addonId: ID) => {
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
    if (!item || !canAdd) return;
    const addonLines: CartLine["addons"] = [];
    for (const slot of item.addon_slots ?? []) {
      for (const aid of selected.get(slot.id) ?? []) {
        const a = slot.addon_items.find((x) => x.id === aid);
        if (!a) continue;
        addonLines.push({
          slotId: slot.id,
          slotName: slot.label ?? "",
          addonId: a.id,
          addonName: a.name,
          price: getAddonPrice(a),
        });
      }
    }
    onAdd({
      lineId: uid(),
      itemId: item.id,
      itemName: item.name,
      imageUrl: item.image_url,
      size: size ? { id: size.id, name: size.label } : undefined,
      addons: addonLines,
      unitPrice,
      quantity: qty,
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 sm:max-w-2xl max-h-[94vh] sm:max-h-[92vh] overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] border-0 shadow-2xl flex flex-col"
        showClose={false}
      >
        <DialogTitle className="sr-only">{item.name}</DialogTitle>

        {/* Image header — real photo or typographic hero mockup */}
        <div className="relative">
          <ItemImage
            src={item.image_url}
            alt={item.name}
            fallbackName={item.name}
            fallbackVariant="hero"
            className="w-full h-48 sm:h-72 bg-slate-100"
            iconSize={48}
          />
          {item.image_url && (
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/0 to-transparent pointer-events-none" />
          )}

          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 h-10 w-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md hover:bg-white active:scale-95 transition"
          >
            <X size={20} className="text-slate-800" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-3 pb-6 space-y-6 sm:space-y-7">
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
            <Section title="Size" required>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {item.sizes.map((s) => {
                  const active = sizeId === s.id;
                  const price = getSizePrice(item.base_price, s);
                  return (
                    <button
                      key={String(s.id)}
                      type="button"
                      onClick={() => setSizeId(s.id)}
                      className={cx(
                        "rounded-2xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98] min-h-[60px]",
                        active
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          {s.label}
                        </span>
                        {active && (
                          <span className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
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
            const subtitle =
              isRadio && min > 0
                ? "Required • choose 1"
                : min > 0 && Number.isFinite(max)
                ? `Required • choose ${min === max ? min : `${min}–${max}`}`
                : Number.isFinite(max)
                ? `Choose up to ${max}`
                : "Optional";

            return (
              <Section
                key={String(slot.id)}
                title={slot.label ?? ""}
                required={min > 0}
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
                          <span className="font-semibold text-slate-900 text-sm">
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
          <Section title="Quantity">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-12 w-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black transition active:scale-95 disabled:opacity-40"
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={18} strokeWidth={3} />
              </button>
              <span className="text-2xl font-black w-10 text-center tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                className="h-12 w-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center font-black transition active:scale-95"
                aria-label="Increase quantity"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
          </Section>
        </div>

        {/* Sticky footer */}
        <div
          className="border-t border-slate-100 bg-white px-4 sm:px-5 py-3 sm:py-4"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)",
          }}
        >
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            className={cx(
              "w-full h-14 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-between px-5 sm:px-6 font-black text-sm sm:text-base transition-all active:scale-[0.98]",
              canAdd
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <span className="tracking-tight truncate">
              {canAdd
                ? `Add ${qty} to Order`
                : `Choose ${invalidSlots[0]?.label ?? "options"}`}
            </span>
            <span className="tracking-tight tabular-nums ml-3 flex-shrink-0">
              {fmtMoney(unitPrice * qty)}
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  subtitle,
  required,
  children,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
          {title}
          {required && (
            <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
              Required
            </span>
          )}
        </h3>
        {subtitle && (
          <span className="text-[11px] text-slate-400 font-bold">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Cart dialog
 * ------------------------------------------------------------------------- */

function CartDialog({
  open,
  onClose,
  cart,
  total,
  onUpdateQty,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  total: number;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 sm:max-w-md max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border-0 flex flex-col"
        showClose={false}
      >
        <DialogTitle className="sr-only">Your Order</DialogTitle>

        <header className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Your Order
            </h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {cart.length} {cart.length === 1 ? "line" : "lines"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition active:scale-95"
          >
            <X size={18} className="text-slate-700" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="h-16 w-16 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center text-slate-300">
                <ShoppingBag size={28} />
              </div>
              <p className="text-sm text-slate-400 font-bold">Cart is empty</p>
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
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
                        <button
                          onClick={() =>
                            onUpdateQty(line.lineId, line.quantity - 1)
                          }
                          className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition active:scale-95"
                          aria-label="Decrease"
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        <span className="w-5 text-center text-sm font-black tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQty(line.lineId, line.quantity + 1)
                          }
                          className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition active:scale-95"
                          aria-label="Increase"
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
                Total
              </span>
              <span className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
                {fmtMoney(total)}
              </span>
            </div>
            <button className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black tracking-tight transition active:scale-[0.98] shadow-lg shadow-slate-900/20">
              Checkout
            </button>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}