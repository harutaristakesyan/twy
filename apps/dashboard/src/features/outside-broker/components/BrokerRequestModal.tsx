import { Check, Xmark } from "@gravity-ui/icons";
import { Button, Chip, Label, Modal, Spinner, TextArea, TextField, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { approveBrokerRequest, rejectBrokerRequest } from "../api/brokerRequestApi";
import type { BrokerRequest } from "../types/brokerRequest";

const statusColor: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const BrokerRequestModal = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = () => navigate("..");

  const canReview = usePermission("brokers_requests", "edit");

  // Find the request in any cached broker-requests list (useServerTable stores { items, total }).
  const cached = queryClient.getQueriesData<{ items: BrokerRequest[]; total: number }>({
    queryKey: ["broker-requests"],
  });
  const rec: BrokerRequest | undefined = cached
    .flatMap(([, data]) => data?.items ?? [])
    .find((r) => r.id === requestId);

  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const refreshLists = async () => {
    await queryClient.invalidateQueries({ queryKey: ["broker-requests"] });
    await queryClient.invalidateQueries({ queryKey: ["outside-brokers"] });
  };

  const approveMutation = useApiMutation((id: string) => approveBrokerRequest(id), {
    onSuccess: async () => {
      toast.success("Request approved; broker is now active");
      await refreshLists();
      close();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const rejectMutation = useApiMutation(
    ({ id, reason }: { id: string; reason?: string }) =>
      rejectBrokerRequest(id, { rejectionReason: reason }),
    {
      onSuccess: async () => {
        toast.success("Request rejected");
        await refreshLists();
        close();
      },
      onError: (err: unknown) => toast.danger(getErrorMessage(err)),
    },
  );

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {rec ? `${rec.brokerName} — ${rec.mcNumber}` : "Broker Request"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              {!rec ? (
                <p className="py-4 text-center text-sm text-default-500">
                  Request not found. Open it from the list to view details.
                </p>
              ) : (
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
                      <span className="font-medium text-default-600">Phone:</span>{" "}
                      {rec.phone ?? "—"}
                    </div>
                    <div>
                      <span className="font-medium text-default-600">Email:</span>{" "}
                      {rec.email ?? "—"}
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
                      <p className="text-default-500">
                        {new Date(rec.reviewedAt).toLocaleString()}
                      </p>
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
              <Button variant="ghost" onPress={close}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default BrokerRequestModal;
