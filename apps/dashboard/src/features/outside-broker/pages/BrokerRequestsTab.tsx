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
import { canEditBrokerRequests, canViewBrokerRequests } from "@/utils/permissions";
import {
  approveBrokerRequest,
  listBrokerRequests,
  rejectBrokerRequest,
} from "../api/brokerRequestApi";
import { useBrokerRequestColumns } from "../components/useBrokerRequestColumns";
import type { BrokerRequest } from "../types/brokerRequest";

const statusColor: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const BrokerRequestsTab: React.FC = () => {
  const { permissions } = useCurrentUser();
  const canView = canViewBrokerRequests(permissions);
  const canReview = canEditBrokerRequests(permissions);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [selectedRecord, setSelectedRecord] = useState<BrokerRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const table = useServerTable<BrokerRequest>({
    queryKey: ["broker-requests", debouncedSearch],
    fetcher: async ({ page, pageSize }) => {
      const result = await listBrokerRequests({
        page: page - 1,
        limit: pageSize,
        query: debouncedSearch || undefined,
      });
      return { items: result.requests, total: result.total };
    },
    initialPageSize: 10,
  });

  const approveMutation = useApiMutation((id: string) => approveBrokerRequest(id), {
    onSuccess: () => {
      toast.success("Request approved; broker is now active");
      setDrawerOpen(false);
      void table.refetch();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const rejectMutation = useApiMutation(
    ({ id, reason }: { id: string; reason?: string }) =>
      rejectBrokerRequest(id, { rejectionReason: reason }),
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

  const openDrawer = (record: BrokerRequest) => {
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

  const { columns, renderCell } = useBrokerRequestColumns({ onView: openDrawer });

  const rec = selectedRecord;

  if (!canView) {
    return (
      <div className="py-8 text-center text-default-500">
        You don&apos;t have permission to view broker requests.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Broker Requests ({table.total})</h2>
        <SearchField name="broker-requests-search" value={search} onChange={setSearch}>
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
            <Table.Content aria-label="Broker requests" className="min-w-full">
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
          {rec ? `${rec.brokerName} — ${rec.mcNumber}` : "Broker Request"}
        </Modal.Header>
        <Modal.Body className="p-2">
          {rec && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-default-600">Status:</span>{" "}
                  <Chip color={statusColor[rec.status] ?? "default"} size="sm" variant="soft">
                    {rec.status}
                  </Chip>
                </div>
                <div>
                  <span className="font-medium text-default-600">Contact:</span>{" "}
                  {rec.contactName ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-default-600">Phone:</span> {rec.phone ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-default-600">Email:</span> {rec.email ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-default-600">Credit Limit:</span>{" "}
                  {rec.creditLimitUnlimited
                    ? "Unlimited"
                    : rec.creditLimit != null
                      ? `€${rec.creditLimit.toFixed(2)}`
                      : "—"}
                </div>
                <div>
                  <span className="font-medium text-default-600">Submitted:</span>{" "}
                  {new Date(rec.createdAt).toLocaleString()}
                  {rec.submittedByName && ` by ${rec.submittedByName}`}
                </div>
                {rec.address && (
                  <div className="col-span-2">
                    <span className="font-medium text-default-600">Address:</span> {rec.address}
                  </div>
                )}
                {rec.notes && (
                  <div className="col-span-2">
                    <span className="font-medium text-default-600">Notes:</span> {rec.notes}
                  </div>
                )}
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

export default BrokerRequestsTab;
