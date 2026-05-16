import { Avatar, Button } from "@heroui/react";
import type React from "react";
import type { LoadBrokerSummary } from "@/features/load/types/load";

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const EnvelopeGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="m3 8 9 6 9-6" />
  </svg>
);

const PhoneGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 4h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);

export const LoadCustomerRow: React.FC<{ broker: LoadBrokerSummary }> = ({ broker }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="sm">
        <Avatar.Fallback>{initialsOf(broker.brokerName)}</Avatar.Fallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{broker.brokerName}</p>
        <p className="text-xs text-default-500">Customer</p>
      </div>
    </div>
    <div className="flex shrink-0 gap-1">
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label="Email customer"
        isDisabled={!broker.email}
        onPress={() => {
          if (broker.email) window.location.href = `mailto:${broker.email}`;
        }}
      >
        <EnvelopeGlyph className="h-4 w-4" />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label="Call customer"
        isDisabled={!broker.phone}
        onPress={() => {
          if (broker.phone) window.location.href = `tel:${broker.phone}`;
        }}
      >
        <PhoneGlyph className="h-4 w-4" />
      </Button>
    </div>
  </div>
);
