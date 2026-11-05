"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const BUTTON_STEP = 1.25;
/**
 * Wheel `deltaY` per e-fold of zoom. A trackpad pinch sends many small deltas
 * and zooms smoothly; a mouse wheel tick (`deltaY` around 100) would jump, so
 * each event is capped at one button step.
 */
const WHEEL_SCALE = 100;
/** Mouse travel before a press becomes a drag, so clicks on links still work. */
const DRAG_THRESHOLD = 4;

type Props = {
  /** Size of the map at zoom 1, in CSS pixels. */
  width: number;
  height: number;
  /** The server-rendered map SVG. */
  children: ReactNode;
};

/**
 * Scroll and zoom around the server-rendered map. It gets the SVG as
 * `children` and two numbers, never the graph: every prop of a client
 * component is repeated in the static export's RSC payload.
 *
 * Panning is native scrolling (touch, wheel, scrollbars, keyboard once
 * focused); a mouse drag scrolls too. Zoom changes only the size of the box
 * the SVG fills: `ctrl` + wheel (a trackpad pinch) around the pointer, or the
 * buttons around the centre. Without JavaScript the map is a scrollable 1:1
 * SVG with working links.
 */
export function MapViewport({ width, height, children }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  /** The map point that must stay under the viewport point after a zoom. */
  const anchor = useRef<{ x: number; y: number; vx: number; vy: number }>(null);
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  const zoomTo = useCallback((next: number, vx?: number, vy?: number) => {
    const el = scroller.current;
    if (!el) return;
    const current = zoomRef.current;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (clamped === current) return;
    const px = vx ?? el.clientWidth / 2;
    const py = vy ?? el.clientHeight / 2;
    // A pinch can fire again before the last zoom is laid out; the scroll
    // position is then stale, so derive the point from the pending anchor.
    const pending = anchor.current;
    anchor.current = pending
      ? {
          x: pending.x + (px - pending.vx) / current,
          y: pending.y + (py - pending.vy) / current,
          vx: px,
          vy: py,
        }
      : {
          x: (el.scrollLeft + px) / current,
          y: (el.scrollTop + py) / current,
          vx: px,
          vy: py,
        };
    zoomRef.current = clamped;
    setZoom(clamped);
  }, []);

  // Keep the anchored point in place once the new size is laid out.
  useLayoutEffect(() => {
    const el = scroller.current;
    const point = anchor.current;
    if (!el || !point) return;
    el.scrollLeft = point.x * zoom - point.vx;
    el.scrollTop = point.y * zoom - point.vy;
    anchor.current = null;
  }, [zoom]);

  // React registers `wheel` as passive, so `preventDefault` (needed to stop
  // the browser zooming the whole page on a pinch) only works on a listener
  // added by hand.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const box = el.getBoundingClientRect();
      const factor = Math.min(
        BUTTON_STEP,
        Math.max(1 / BUTTON_STEP, Math.exp(-event.deltaY / WHEEL_SCALE)),
      );
      zoomTo(
        zoomRef.current * factor,
        event.clientX - box.left,
        event.clientY - box.top,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  }>(null);
  /** A drag ends with a click on whatever is under the mouse; swallow it. */
  const swallowClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <div
        role="toolbar"
        aria-label="Map zoom"
        className="mb-2 flex items-center gap-2 text-sm"
      >
        <ZoomButton
          label="Zoom out"
          disabled={!hydrated || zoom <= MIN_ZOOM}
          onClick={() => zoomTo(zoom / BUTTON_STEP)}
        >
          −
        </ZoomButton>
        <ZoomButton
          label="Zoom in"
          disabled={!hydrated || zoom >= MAX_ZOOM}
          onClick={() => zoomTo(zoom * BUTTON_STEP)}
        >
          +
        </ZoomButton>
        <ZoomButton
          // The visible percentage must be part of the accessible name.
          label={`${Math.round(zoom * 100)}%, reset zoom`}
          disabled={!hydrated || zoom === 1}
          onClick={() => zoomTo(1)}
        >
          {Math.round(zoom * 100)}%
        </ZoomButton>
      </div>
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Concept map, scrollable"
        className={`mx-[calc(50%-50vw)] max-h-[85vh] w-screen overflow-auto border-y border-border select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={(event) => {
          swallowClick.current = false;
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          const el = event.currentTarget;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: el.scrollLeft,
            top: el.scrollTop,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const state = drag.current;
          if (!state) return;
          // Released outside the box before the drag began: no pointerup came.
          if (event.buttons === 0) {
            drag.current = null;
            return;
          }
          const dx = event.clientX - state.x;
          const dy = event.clientY - state.y;
          const el = event.currentTarget;
          if (!state.moved) {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            state.moved = true;
            setDragging(true);
            el.setPointerCapture(event.pointerId);
          }
          el.scrollLeft = state.left - dx;
          el.scrollTop = state.top - dy;
        }}
        onPointerUp={(event) => endDrag(event.currentTarget, event.pointerId)}
        onPointerCancel={(event) =>
          endDrag(event.currentTarget, event.pointerId)
        }
        onClickCapture={(event) => {
          if (!swallowClick.current) return;
          swallowClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        // A press on a link would otherwise start the browser's link drag.
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          style={{ width: width * zoom, height: height * zoom }}
          className="[&>svg]:h-full [&>svg]:w-full"
        >
          {children}
        </div>
      </div>
    </div>
  );

  function endDrag(el: HTMLDivElement, pointerId: number) {
    if (drag.current?.moved) {
      // The click, if any, follows in the same task; a later one is real.
      swallowClick.current = true;
      setTimeout(() => {
        swallowClick.current = false;
      });
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      setDragging(false);
    }
    drag.current = null;
  }
}

function noSubscription() {
  return () => {};
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="min-w-9 rounded-md border border-border px-2 py-1 tabular-nums disabled:opacity-40"
    >
      {children}
    </button>
  );
}
