import { Select, Spin } from "antd";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { getTeams } from "../api/teamApi";
import type { Team } from "../types/team";

interface TeamSelectProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

const TeamSelect: React.FC<TeamSelectProps> = ({
  value,
  onChange,
  placeholder = "Search and select team",
  allowClear = true,
  disabled,
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchTeams = useCallback(async (nextPage: number, q: string, append = false) => {
    setLoading(true);
    try {
      const response = await getTeams({ page: nextPage, limit: 20, query: q || undefined });
      if (append) {
        setTeams((prev) => [...prev, ...response.teams]);
      } else {
        setTeams(response.teams);
      }
      setHasMore((nextPage + 1) * 20 < response.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDropdownOpen = (open: boolean) => {
    if (open) {
      setPage(0);
      setSearch("");
      setHasMore(true);
      fetchTeams(0, "");
    }
  };

  const handleSearch = (val: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(val);
      setPage(0);
      fetchTeams(0, val, false);
    }, 300);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10;
    if (isBottom && !loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTeams(nextPage, search, true);
    }
  };

  return (
    <Select
      value={value ?? undefined}
      onChange={(val) => onChange?.(val ?? null)}
      placeholder={placeholder}
      showSearch={{ filterOption: false, onSearch: handleSearch }}
      onPopupScroll={handleScroll}
      onOpenChange={handleDropdownOpen}
      loading={loading}
      allowClear={allowClear}
      disabled={disabled}
      notFoundContent={loading ? <Spin size="small" /> : "No teams found"}
      options={teams.map((t) => ({ value: t.id, label: t.name }))}
      popupRender={(menu) => (
        <>
          {menu}
          {loading && hasMore && (
            <div style={{ textAlign: "center", padding: "8px" }}>
              <Spin size="small" /> Loading more...
            </div>
          )}
        </>
      )}
    />
  );
};

export default TeamSelect;
