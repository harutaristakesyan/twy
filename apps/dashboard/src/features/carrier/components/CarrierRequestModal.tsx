import { Check, Xmark } from "@gravity-ui/icons";
import { Button, Chip, Label, Modal, Spinner, TextArea, TextField, toast } from "@heroui/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { queryKeys, useApiMutation, useApiQuery, useQueryActions } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import {
  approveCarrierRequest,
  getCarrierRequestById,
  rejectCarrierRequest,
} from "../api/carrierRequestApi";
import { deriveInsuranceStatus } from "../utils/insuranceStatus";

const statusColor: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const CarrierRequestModal = () => {
  const { requestId } = useParams() as { requestId: string };
  const navigate = useNavigate();
  const { invalidate } = useQueryActions();
  const close = () => navigate("..");

  const { permissions } = useCurrentUser();
  const canReview = Boolean(permissions.carriers_requests?.edit);

  const { data: rec } = useApiQuery(queryKeys.carrierRequests.detail(requestId), () =>
    getCarrierRequestById(requestId),
  );

  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const refreshLists = () => invalidate(queryKeys.carrierRequests.all, queryKeys.carriers.all);

  const approveMutation = useApiMutation((id: string) => approveCarrierRequest(id), {
    onSuccess: async () => {
      toast.success("Request approved; carrier is now active");
      await refreshLists();
      close();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const rejectMutation = useApiMutation(
    ({ id, reason }: { id: string; reason?: string }) =>
      rejectCarrierRequest(id, { rejectionReason: reason }),
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
                {rec ? `${rec.carrierName} — ${rec.mcDotNumber}` : "Carrier Request"}
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
                      <span className="font-medium text-default-600">Phone:</span>{" "}
                      {rec.phone ?? "—"}
                    </div>
                    <div>
                      <span className="font-medium text-default-600">Email:</span>{" "}
                      {rec.email ?? "—"}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-default-600">Notes:</span>{" "}
                      {rec.notes ?? "—"}
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

export default CarrierRequestModal;
