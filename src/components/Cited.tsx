"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useIsLight } from "@/lib/theme";
import { SOURCES, type Source } from "@/data/sources";

const OPEN_DELAY = 55;
const CLOSE_DELAY = 30;
const CARD_WIDTH = 440; // wide enough that the longest source name clears the date
const MARK_SIZE = 16;

/** The source's logo, or its initial on a faint plate. */
function Mark({ name, logo }: { name: string; logo?: string }) {
  if (logo) return <Image src={logo} alt="" width={MARK_SIZE} height={MARK_SIZE} unoptimized className="shrink-0 rounded-[4px]" />;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[4px]"
      style={{
        width: MARK_SIZE,
        height: MARK_SIZE,
        background: "color-mix(in srgb, var(--foreground) 12%, transparent)",
      }}
    >
      <span className="opacity-60" style={{ fontSize: Math.round(MARK_SIZE * 0.64), lineHeight: 1 }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

function CardHeader({ source }: { source: Source }) {
  return (
    <span className="flex items-center gap-[8px] text-[12px] leading-none">
      <Mark name={source.name} logo={source.logo} />
      <span className="truncate opacity-60">{source.name}</span>
      {source.dates && <span className="ml-auto shrink-0 pl-2 tabular-nums opacity-40">{source.dates}</span>}
    </span>
  );
}

/**
 * An elevated surface: a solid step up from the page, a hairline border, a faint top highlight, and a layered shadow
 * instead of glass.
 */
export const cardSurface = (isLight: boolean) => ({
  background: isLight
    ? "color-mix(in srgb, var(--background) 45%, #ffffff)"
    : "color-mix(in srgb, var(--background) 93%, var(--foreground))",
  border: `1px solid color-mix(in srgb, var(--foreground) ${isLight ? 11 : 9}%, transparent)`,
  boxShadow: isLight
    ? "inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 1px 2px rgba(14, 19, 28, 0.06), 0 12px 32px -12px rgba(14, 19, 28, 0.18)"
    : "inset 0 1px 0 color-mix(in srgb, var(--foreground) 6%, transparent), 0 1px 2px rgba(0, 0, 0, 0.3), 0 16px 40px -12px rgba(0, 0, 0, 0.6)",
});

/** A photo at full size over a dimmed page; a click anywhere or Escape closes it. */
function Lightbox({ photo, onClose }: { photo: NonNullable<Source["photo"]>; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portalled to the body: the hover card is transformed, which would pin a fixed overlay to the card instead.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      data-ocean-ignore
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <Image src={photo.src} alt={photo.alt} sizes="90vw" className="max-h-full w-auto rounded-[8px] object-contain" />
    </motion.div>,
    document.body,
  );
}

/** An underlined mention whose hover card reads source / role / one line. */
export function Cited({ source, children }: { source: string; children: ReactNode }) {
  const isLight = useIsLight();
  const src = SOURCES[source];
  const [shown, setShown] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const closeZoom = useCallback(() => setZoomed(false), []);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback(() => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setShown(true), OPEN_DELAY);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setShown(false), CLOSE_DELAY);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShown(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown]);

  const members = src.group;

  return (
    <span
      className="relative inline-block"
      // Drives the prose dim in globals.css; :hover alone is lost once the cursor moves onto the open card.
      data-cited-open={shown ? "true" : undefined}
      data-ocean-lure
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        onFocus={show}
        onBlur={hide}
        aria-label={`${src.name}, ${src.role}`}
        className={`inline cursor-default align-baseline underline decoration-1 underline-offset-[5px] outline-none transition-[text-decoration-color] duration-150 focus-visible:decoration-2 ${
          shown
            ? "text-foreground decoration-foreground"
            : "decoration-[color-mix(in_srgb,var(--foreground)_35%,transparent)] hover:text-foreground hover:decoration-foreground focus-visible:text-foreground focus-visible:decoration-foreground"
        }`}
      >
        {children}
      </button>

      <AnimatePresence>
        {shown && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.99, transition: { duration: 0.08, ease: "easeIn" } }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            data-ocean-ignore
            className="absolute bottom-full left-0 z-50 mb-[10px] flex origin-bottom-left flex-col overflow-hidden rounded-[8px] font-mono text-foreground"
            style={{ width: CARD_WIDTH, ...cardSurface(isLight) }}
          >
            {members ? (
              <span className="flex flex-col p-[6px]">
                {members.map((m) => (
                  <span key={m.key} className="flex flex-col gap-[6px] p-[8px]">
                    <CardHeader source={m} />
                    <span className="text-[12px] leading-[18px]">{m.role}</span>
                  </span>
                ))}
              </span>
            ) : (
              <span className="flex flex-col gap-[6px] px-[14px] py-[12px]">
                <CardHeader source={src} />
                <span className="mt-[4px] text-[13px] leading-[18px]">{src.role}</span>
                {src.summary && <span className="line-clamp-3 text-[12px] leading-[18px] opacity-60">{src.summary}</span>}
                {src.photo && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomed(true);
                    }}
                    aria-label={`Enlarge photo: ${src.photo.alt}`}
                    className="mt-[6px] cursor-zoom-in overflow-hidden rounded-[6px] outline-none"
                  >
                    <Image src={src.photo.src} alt="" placeholder="blur" sizes={`${CARD_WIDTH}px`} className="block aspect-[16/9] h-auto w-full object-cover" />
                  </button>
                )}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>{zoomed && src.photo && <Lightbox photo={src.photo} onClose={closeZoom} />}</AnimatePresence>
    </span>
  );
}
