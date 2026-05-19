import { Check, Xmark } from "@gravity-ui/icons";
import { Button, Chip, Label, Modal, Spinner, TextArea, TextField, toast } from "@heroui/react";
import { type ReactNode, useState } from "react";
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

const InfoField = ({ label, value, span }: { label: string; value: ReactNode; span?: 2 }) => (
  <div className={span === 2 ? "col-span-2" : undefined}>
    <p className="text-[11px] font-semibold uppercase tracking-widest text-default-400">{label}</p>
    <p className="mt-1 break-words text-sm text-default-900">
      {value ?? <span className="text-default-400">—</span>}
    </p>
  </div>
);

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-default-400">{children}</p>
);

const CarrierRequestModal = () => {
  const { requestId } = useParams() as { requestId: string };
  const navigate = useNavigate();
  const { invalidate } = useQueryActions();
  const close = () => navigate("..");

  const { permissions } = useCurrentUser();
  const canReview = Boolean(permissions.carriers_requests?.edit);

  const { data: rec, isLoading } = useApiQuery(queryKeys.carrierRequests.detail(requestId), () =>
    getCarrierRequestById(requestId),
  );

  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const refreshLists = () =>
    invalidate(
      queryKeys.carrierRequests.all,
      queryKeys.carrierRequests.detail(requestId),
      queryKeys.carriers.all,
    );

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

  const canAct = rec !== undefined && canReview && rec.status === "pending";

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
              <Modal.Heading>Carrier Request</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="px-4 py-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : !rec ? (
                <p className="py-4 text-center text-sm text-default-500">
                  Request not found. Open it from the list to view details.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Identity card */}
                  <div className="flex items-start justify-between rounded-xl border border-default-200 bg-default-50 px-4 py-3">
                    <div>
                      <p className="text-base font-semibold text-default-900">{rec.carrierName}</p>
                      <p className="mt-0.5 text-sm text-default-500">MC/DOT {rec.mcDotNumber}</p>
                    </div>
                    <Chip
                      color={statusColor[rec.status] ?? "default"}
                      variant="soft"
                      size="sm"
                      className="mt-0.5 capitalize"
                    >
                      {rec.status}
                    </Chip>
                  </div>

                  {/* Contact Information */}
                  <div className="flex flex-col gap-2">
                    <SectionHeading>Contact Information</SectionHeading>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-default-100 p-4">
                      <InfoField label="Phone" value={rec.phone} />
                      <InfoField label="Email" value={rec.email} />
                    </div>
                  </div>

                  {/* Carrier Details */}
                  <div className="flex flex-col gap-2">
                    <SectionHeading>Carrier Details</SectionHeading>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-default-100 p-4">
                      <InfoField
                        label="Kind"
                        value={<span className="capitalize">{rec.kind}</span>}
                      />
                      <InfoField label="Equipment Type" value={rec.equipmentType} />
                      <InfoField
                        label="Insurance Status"
                        value={
                          rec.insuranceExpiry
                            ? deriveInsuranceStatus(rec.insuranceExpiry).label
                            : null
                        }
                      />
                      <InfoField
                        label="Submitted"
                        value={new Date(rec.createdAt).toLocaleString()}
                      />
                      {rec.notes && <InfoField label="Notes" value={rec.notes} span={2} />}
                    </div>
                  </div>

                  {/* Submitted By */}
                  <div className="flex flex-col gap-2">
                    <SectionHeading>Submitted By</SectionHeading>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-default-100 p-4">
                      <InfoField label="Name" value={rec.submittedByName} />
                      <InfoField label="Phone" value={rec.submittedByPhone} />
                      <InfoField label="Email" value={rec.submittedByEmail} span={2} />
                    </div>
                  </div>

                  {/* Review history */}
                  {(rec.status === "approved" || rec.status === "rejected") && rec.reviewedAt && (
                    <div className="flex flex-col gap-2">
                      <SectionHeading>Review</SectionHeading>
                      <div
                        className={`rounded-xl border-l-4 p-4 ${
                          rec.status === "approved"
                            ? "border-success bg-success-50"
                            : "border-danger bg-danger-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-default-900">
                          {rec.status === "approved" ? "Approved" : "Rejected"}
                          {rec.reviewedByName && ` by ${rec.reviewedByName}`}
                        </p>
                        <p className="mt-0.5 text-xs text-default-500">
                          {new Date(rec.reviewedAt).toLocaleString()}
                        </p>
                        {rec.status === "rejected" && rec.rejectionReason && (
                          <p className="mt-2 text-sm text-default-700">
                            <span className="font-medium">Reason: </span>
                            {rec.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reject reason input */}
                  {canAct && showRejectInput && (
                    <TextField value={rejectReason} onChange={setRejectReason} fullWidth>
                      <Label>Rejection reason</Label>
                      <TextArea rows={3} placeholder="Optional reason" />
                    </TextField>
                  )}
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              <div className="flex w-full items-center justify-between">
                <Button variant="ghost" onPress={close}>
                  Close
                </Button>
                {canAct && rec && (
                  <div className="flex gap-2">
                    {showRejectInput ? (
                      <>
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
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CarrierRequestModal;
