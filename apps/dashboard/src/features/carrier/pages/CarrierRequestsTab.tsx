import { Check, Xmark } from "@gravity-ui/icons";
import {
  Button,
  Chip,
  Label,
  Modal,
  SearchField,
  Spinner,
  Table,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import type React from "react";
import { useState } from "react";
import PageControls from "@/components/PageControls";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useServerTable } from "@/hooks/useServerTable";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import {
  approveCarrierRequest,
  listCarrierRequests,
  rejectCarrierRequest,
} from "../api/carrierRequestApi";
import { useCarrierRequestColumns } from "../components/useCarrierRequestColumns";
import type { CarrierRequest } from "../types/carrierRequest";
import { deriveInsuranceStatus } from "../utils/insuranceStatus";

const statusColor: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const CarrierRequestsTab: React.FC = () => {
  const { permissions } = useCurrentUser();
  const canReview = Boolean(permissions.carriers_requests?.edit);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [selectedRecord, setSelectedRecord] = useState<CarrierRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const table = useServerTable<CarrierRequest>({
    queryKey: ["carrier-requests", debouncedSearch],
    fetcher: async ({ page, pageSize }) => {
      const result = await listCarrierRequests({
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: result.requests, total: result.total };
    },
    initialPageSize: 10,
  });

  const approveMutation = useApiMutation((id: string) => approveCarrierRequest(id), {
    onSuccess: () => {
      toast.success("Request approved; carrier is now active");
      setDrawerOpen(false);
      void table.refetch();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const rejectMutation = useApiMutation(
    ({ id, reason }: { id: string; reason?: string }) =>
      rejectCarrierRequest(id, { rejectionReason: reason }),
    {
      onSuccess: () => {
        toast.success("Request rejected");
        setDrawerOpen(false);
        setShowRejectInput(false);
        setRejectReason("");
        void table.refetch();
      },
      onError: (err: unknown) => toast.danger(getErrorMessage(err)),
    },
  );

  const openDrawer = (record: CarrierRequest) => {
    setSelectedRecord(record);
    setDrawerOpen(true);
    setShowRejectInput(false);
    setRejectReason("");
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedRecord(null);
    setShowRejectInput(false);
    setRejectReason("");
  };

  const { columns, renderCell } = useCarrierRequestColumns({ onView: openDrawer });

  const rec = selectedRecord;

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Carrier Requests ({table.total})</h2>
        <SearchField name="carrier-requests-search" value={search} onChange={setSearch}>
          <Label className="sr-only">Search requests</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-65" placeholder="Search requests..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {table.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Carrier requests" className="min-w-full">
              <Table.Header columns={columns}>
                {(col) => <Table.Column isRowHeader={col.isRowHeader}>{col.label}</Table.Column>}
              </Table.Header>
              <Table.Body items={table.items}>
                {(req) => (
                  <Table.Row id={req.id}>
                    <Table.Collection items={columns}>
                      {(col) => <Table.Cell>{renderCell(req, col.id)}</Table.Cell>}
                    </Table.Collection>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {table.total > table.pageSize && (
            <Table.Footer>
              <div className="flex justify-end pt-3">
                <PageControls
                  totalPages={Math.ceil(table.total / table.pageSize)}
                  page={table.page}
                  onPageChange={table.setPage}
                />
              </div>
            </Table.Footer>
          )}
        </Table>
      )}

      <Modal
        isOpen={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
      >
        <Modal.Header>
          {rec ? `${rec.carrierName} — ${rec.mcDotNumber}` : "Carrier Request"}
        </Modal.Header>
        <Modal.Body className="p-2">
          {rec && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-default-600">Kind:</span>{" "}
                  <span className="capitalize">{rec.kind}</span>
                </div>
                <div>
                  <span className="font-medium text-default-600">Status:</span>{" "}
                  <Chip color={statusColor[rec.status] ?? "default"} size="sm" variant="soft">
                    {rec.status}
                  </Chip>
                </div>
                <div>
                  <span className="font-medium text-default-600">Equipment:</span>{" "}
                  {rec.equipmentType ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-default-600">Insurance:</span>{" "}
                  {rec.insuranceExpiry ? deriveInsuranceStatus(rec.insuranceExpiry).label : "—"}
                </div>
                <div>
                  <span className="font-medium text-default-600">Phone:</span> {rec.phone ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-default-600">Email:</span> {rec.email ?? "—"}
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-default-600">Notes:</span> {rec.notes ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-default-600">Submitted:</span>{" "}
                  {new Date(rec.createdAt).toLocaleString()}
                  {rec.submittedByName && ` by ${rec.submittedByName}`}
                </div>
              </div>

              {(rec.status === "approved" || rec.status === "rejected") && rec.reviewedAt && (
                <div className="rounded-lg bg-default-100 p-3 text-sm">
                  <p className="font-medium">
                    {rec.status === "approved" ? "Approved" : "Rejected"}
                    {rec.reviewedByName && ` by ${rec.reviewedByName}`}
                  </p>
                  <p className="text-default-500">{new Date(rec.reviewedAt).toLocaleString()}</p>
                  {rec.status === "rejected" && rec.rejectionReason && (
                    <p className="mt-2">Reason: {rec.rejectionReason}</p>
                  )}
                </div>
              )}

              {canReview && rec.status === "pending" && (
                <div className="border-t border-default-200 pt-3">
                  {showRejectInput ? (
                    <div className="flex flex-col gap-2">
                      <TextField value={rejectReason} onChange={setRejectReason} fullWidth>
                        <Label>Rejection reason</Label>
                        <TextArea rows={3} placeholder="Optional reason" />
                      </TextField>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onPress={() => setShowRejectInput(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          isDisabled={rejectMutation.isPending}
                          onPress={() =>
                            rejectMutation.mutate({
                              id: rec.id,
                              reason: rejectReason || undefined,
                            })
                          }
                        >
                          {rejectMutation.isPending ? <Spinner size="sm" /> : "Confirm Reject"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button variant="danger-soft" onPress={() => setShowRejectInput(true)}>
                        <Xmark className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        isDisabled={approveMutation.isPending}
                        onPress={() => approveMutation.mutate(rec.id)}
                      >
                        {approveMutation.isPending ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onPress={closeDrawer}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CarrierRequestsTab;
