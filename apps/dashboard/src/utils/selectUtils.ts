import type React from "react";

export const createPopupScrollHandler =
  (loadMore: () => void) => (e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    if (t.scrollTop + t.clientHeight >= t.scrollHeight - 10) loadMore();
  };
