import { Pencil, TrashBin, Xmark } from "@gravity-ui/icons";
import { Button, Tabs, toast } from "@heroui/react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadDetailDocsTab } from "@/features/load/components/LoadDetailDocsTab";
import { LoadDetailLoadInfoTab } from "@/features/load/components/LoadDetailLoadInfoTab";
import { LoadDetailTrackingTab } from "@/features/load/components/LoadDetailTrackingTab";
import type { Load } from "@/features/load/types/load";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useApiMutation } from "@/libs/query";

const CopyGlyph: React.FC<{ className?: string }> = ({ className }) => (
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
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

export const LoadDetailOverlayCard: React.FC<{ load: Load; onInvalidate: () => void }> = ({
  load,
  onInvalidate,
}) => {
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const canEdit = Boolean(permissions.loads?.edit);
  const canDelete = Boolean(permissions.loads?.delete);

  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const deleteMutation = useApiMutation((id: string) => loadApi.delete(id), {
    onSuccess: () => {
      toast.success("Load deleted");
      onInvalidate();
      navigate("/loads");
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(load.referenceNumber);
      toast.success("Reference copied");
    } catch {
      toast.danger("Failed to copy");
    }
  };

  const handleDelete = () =>
    confirm({
      title: "Delete this load?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      status: "danger",
      onConfirm: () => deleteMutation.mutate(load.id),
    });

  return (
    <div className="pointer-events-auto w-100 rounded-2xl border border-default-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">No: #{load.referenceNumber}</p>
        <div className="flex gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            onPress={handleCopy}
            aria-label="Copy reference number"
          >
            <CopyGlyph className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              onPress={() => navigate(`/loads/${load.id}/edit`)}
              aria-label="Edit load"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              onPress={handleDelete}
              aria-label="Delete load"
              isDisabled={deleteMutation.isPending}
            >
              <TrashBin className="h-4 w-4" />
            </Button>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            onPress={() => navigate("/loads")}
            aria-label="Close detail"
          >
            <Xmark className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs aria-label="Load detail tabs" defaultSelectedKey="info" className="mt-3">
        <Tabs.List>
          <Tabs.Tab id="info">
            Load info
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="tracking">
            Tracking
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="docs">
            Docs
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel id="info" className="max-h-[60vh] overflow-auto pt-3">
          <LoadDetailLoadInfoTab load={load} />
        </Tabs.Panel>
        <Tabs.Panel id="tracking" className="max-h-[60vh] overflow-auto pt-3">
          <LoadDetailTrackingTab load={load} />
        </Tabs.Panel>
        <Tabs.Panel id="docs" className="max-h-[60vh] overflow-auto pt-3">
          <LoadDetailDocsTab load={load} />
        </Tabs.Panel>
      </Tabs>
      {confirmDialog}
    </div>
  );
};
