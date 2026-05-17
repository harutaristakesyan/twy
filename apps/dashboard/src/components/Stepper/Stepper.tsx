import type { ReactNode } from "react";

export type StepperStepState = "completed" | "current" | "pending";

export interface StepperStep {
  key: string;
  label?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  state?: StepperStepState;
  icon?: ReactNode;
}

export interface StepperMarker {
  /** Fraction 0..1 along the full horizontal track (across every connector). Ignored when vertical. */
  position: number;
  content: ReactNode;
}

export type StepperColor = "primary" | "default" | "success" | "warning";
export type StepperSize = "sm" | "md" | "lg";
export type StepperOrientation = "vertical" | "horizontal";
export type StepperPendingStyle = "solid" | "outline";

export interface StepperProps {
  steps: StepperStep[];
  /** Steps before this index are completed; the step at this index is current. Per-step `state` wins. */
  activeIndex?: number;
  orientation?: StepperOrientation;
  size?: StepperSize;
  color?: StepperColor;
  /** Pending dot style: filled-dark (default) or bordered/outlined. */
  pendingStyle?: StepperPendingStyle;
  /** Render only dots + connectors (no labels). Useful as a compact rail. */
  compact?: boolean;
  /** Floating marker that rides on a horizontal track. Ignored when vertical. */
  marker?: StepperMarker;
  className?: string;
}

interface Dim {
  dot: string;
  connectorMin: string;
  connectorThickness: string;
  horizConnectorThickness: string;
  gap: string;
  font: string;
  metaFont: string;
  pad: string;
  dotTop: string;
}

const SIZES: Record<StepperSize, Dim> = {
  sm: {
    dot: "h-2.5 w-2.5",
    connectorMin: "min-h-3",
    connectorThickness: "w-0.5",
    horizConnectorThickness: "h-0.5",
    gap: "gap-2",
    font: "text-xs",
    metaFont: "text-[10px]",
    pad: "pb-3",
    dotTop: "mt-1",
  },
  md: {
    dot: "h-3 w-3",
    connectorMin: "min-h-5",
    connectorThickness: "w-0.5",
    horizConnectorThickness: "h-0.5",
    gap: "gap-3",
    font: "text-sm",
    metaFont: "text-xs",
    pad: "pb-5",
    dotTop: "mt-1.5",
  },
  lg: {
    dot: "h-4 w-4",
    connectorMin: "min-h-7",
    connectorThickness: "w-0.5",
    horizConnectorThickness: "h-0.5",
    gap: "gap-4",
    font: "text-base",
    metaFont: "text-sm",
    pad: "pb-6",
    dotTop: "mt-2",
  },
};

const FILL: Record<StepperColor, string> = {
  primary: "bg-blue-500",
  default: "bg-gray-900",
  success: "bg-success",
  warning: "bg-warning",
};

const deriveState = (index: number, activeIndex: number): StepperStepState => {
  if (index < activeIndex) return "completed";
  if (index === activeIndex) return "current";
  return "pending";
};

const dotClass = (
  state: StepperStepState,
  color: StepperColor,
  pendingStyle: StepperPendingStyle,
  dot: string,
): string => {
  const base = `${dot} shrink-0 rounded-full flex items-center justify-center`;
  if (state !== "pending") return `${base} ${FILL[color]} text-white`;
  if (pendingStyle === "outline") {
    return `${base} border border-gray-300 bg-white text-gray-500`;
  }
  return `${base} bg-gray-900 text-white`;
};

const verticalConnector = (
  filled: boolean,
  color: StepperColor,
  thickness: string,
  min: string,
): string =>
  filled
    ? `${thickness} ${min} flex-1 ${FILL[color]}`
    : `${min} flex-1 border-l-2 border-dashed border-gray-300`;

const horizontalConnectorFlex = (
  filled: boolean,
  color: StepperColor,
  thickness: string,
): string =>
  filled
    ? `${thickness} flex-1 ${FILL[color]}`
    : "h-0 flex-1 border-t-2 border-dashed border-gray-300";

const horizontalConnectorBlock = (
  filled: boolean,
  color: StepperColor,
  thickness: string,
): string =>
  filled
    ? `${thickness} w-full ${FILL[color]}`
    : "h-0 w-full border-t-2 border-dashed border-gray-300";

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

interface MarkerPlacement {
  segmentIndex: number;
  localPosition: number;
}

const computeMarkerPlacement = (position: number, segmentCount: number): MarkerPlacement => {
  if (segmentCount <= 0) return { segmentIndex: 0, localPosition: 0 };
  const scaled = clamp01(position) * segmentCount;
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaled));
  return { segmentIndex, localPosition: scaled - segmentIndex };
};

export const Stepper = ({
  steps,
  activeIndex = 0,
  orientation = "vertical",
  size = "md",
  color = "primary",
  pendingStyle = "solid",
  compact = false,
  marker,
  className,
}: StepperProps) => {
  const dim = SIZES[size];
  const states = steps.map((step, i) => step.state ?? deriveState(i, activeIndex));
  const markerPlacement = marker ? computeMarkerPlacement(marker.position, steps.length - 1) : null;

  if (orientation === "horizontal") {
    const hasLabels = !compact && steps.some((s) => s.label || s.description || s.meta);

    if (!hasLabels) {
      return (
        <ol
          className={`relative m-0 flex w-full list-none items-center p-0 ${className ?? ""}`.trim()}
        >
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const filled = states[idx] === "completed";
            return (
              <li
                key={step.key}
                className={isLast ? "flex items-center" : "flex flex-1 items-center"}
                aria-current={states[idx] === "current" ? "step" : undefined}
              >
                <span className={dotClass(states[idx], color, pendingStyle, dim.dot)} aria-hidden>
                  {step.icon}
                </span>
                {!isLast && (
                  <span className="relative flex flex-1 items-center">
                    <span
                      className={horizontalConnectorFlex(
                        filled,
                        color,
                        dim.horizConnectorThickness,
                      )}
                    />
                    {marker && markerPlacement?.segmentIndex === idx && (
                      <span
                        className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2"
                        style={{ left: `${markerPlacement.localPosition * 100}%` }}
                      >
                        {marker.content}
                      </span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      );
    }

    return (
      <ol className={`m-0 flex w-full list-none items-start p-0 ${className ?? ""}`.trim()}>
        {steps.map((step, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === steps.length - 1;
          const leftFilled = !isFirst && states[idx - 1] === "completed";
          const rightFilled = !isLast && states[idx] === "completed";
          return (
            <li
              key={step.key}
              className="flex flex-1 flex-col items-center"
              aria-current={states[idx] === "current" ? "step" : undefined}
            >
              <div className="flex w-full items-center">
                <div className="flex flex-1 items-center">
                  {!isFirst && (
                    <span
                      className={horizontalConnectorBlock(
                        leftFilled,
                        color,
                        dim.horizConnectorThickness,
                      )}
                    />
                  )}
                </div>
                <span className={dotClass(states[idx], color, pendingStyle, dim.dot)} aria-hidden>
                  {step.icon}
                </span>
                <div className="flex flex-1 items-center">
                  {!isLast && (
                    <span
                      className={horizontalConnectorBlock(
                        rightFilled,
                        color,
                        dim.horizConnectorThickness,
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="mt-2 px-1 text-center">
                {step.label && (
                  <p className={`${dim.font} font-semibold leading-tight`}>{step.label}</p>
                )}
                {step.description && (
                  <p className={`${dim.font} mt-0.5 text-gray-700 leading-snug`}>
                    {step.description}
                  </p>
                )}
                {step.meta && (
                  <p className={`${dim.metaFont} mt-0.5 text-gray-500 leading-tight`}>
                    {step.meta}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={`flex flex-col ${className ?? ""}`.trim()}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const filled = states[idx] === "completed";
        return (
          <li
            key={step.key}
            className={`flex ${dim.gap}`}
            aria-current={states[idx] === "current" ? "step" : undefined}
          >
            <div className="flex flex-col items-center">
              <span
                className={`${dotClass(states[idx], color, pendingStyle, dim.dot)} ${dim.dotTop}`}
                aria-hidden
              >
                {step.icon}
              </span>
              {!isLast && (
                <span
                  className={verticalConnector(
                    filled,
                    color,
                    dim.connectorThickness,
                    dim.connectorMin,
                  )}
                />
              )}
            </div>
            {!compact && (
              <div className={`flex-1 ${isLast ? "" : dim.pad}`}>
                {step.label && (
                  <p className={`${dim.font} font-semibold leading-tight`}>{step.label}</p>
                )}
                {step.description && (
                  <p className={`${dim.font} mt-0.5 text-gray-700 leading-snug`}>
                    {step.description}
                  </p>
                )}
                {step.meta && (
                  <p className={`${dim.metaFont} mt-1 text-gray-500 leading-tight`}>{step.meta}</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
};
