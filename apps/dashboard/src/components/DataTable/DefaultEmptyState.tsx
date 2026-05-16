import { Tray } from "@gravity-ui/icons";
import { EmptyState } from "@heroui/react";

const DefaultEmptyState = () => (
  <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
    <Tray className="size-6 text-muted" aria-hidden />
    <span className="text-sm text-muted">No results found</span>
  </EmptyState>
);

export default DefaultEmptyState;
