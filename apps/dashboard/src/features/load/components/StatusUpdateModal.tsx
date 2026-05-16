import {
  Button,
  Label,
  ListBox,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Spinner,
  toast,
} from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { FormCheckbox, FormNumberInput, FormTextArea } from "@/components/form";
import type { FileUploaderHandle, FileUploaderValueItem } from "@/features/files";
import { FileUploader, MAX_FILES_DEFAULT } from "@/features/files";
import { loadApi } from "@/features/load/api/loadApi";
import type { LoadStatus } from "@/features/load/types/load";
import { getAllowedTransitions } from "@/features/load/utils/statusMachine";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useZodForm } from "@/libs/form";
import { useApiMutation, useApiQuery } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";

const statusBadge: Record<LoadStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Delivered: "bg-blue-100 text-blue-800",
  Declined: "bg-red-100 text-red-800",
  Hold: "bg-orange-100 text-orange-800",
};

const commentLabel = (status: LoadStatus | undefined, chargable: boolean): string | null => {
  if (status === "Hold") return "Hold Reason";
  if (status === "Declined") return "Decline Reason";
  if (status === "Delivered" && chargable) return "Charge Reason";
  return null;
};

// Cross-field validation (chargeAmount, chargeSide, comment) is handled imperatively in
// handleSubmit because effectiveStatus is derived from the loaded record, not stored in the form.
const schema = z.object({
  selectedStatus: z.string().nullable(),
  isChargable: z.boolean(),
  chargeAmount: z.number().nullable(),
  chargeSide: z.enum(["broker", "carrier"]).nullable(),
  comment: z.string(),
});

type FormValues = z.infer<typeof schema>;

const StatusUpdateModal = () => {
  const { loadId } = useParams<{ loadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { permissions } = useCurrentUser();

  const close = () => navigate("..");

  const { data: load } = useApiQuery(
    ["load", loadId],
    () => {
      if (!loadId) return Promise.reject(new Error("No loadId"));
      return loadApi.getById(loadId);
    },
    { enabled: !!loadId },
  );

  const allowedStatuses = load
    ? getAllowedTransitions(load.status).filter((s) =>
        Boolean(
          (permissions as Record<string, Record<string, boolean>>).loads?.[`transition:${s}`],
        ),
      )
    : [];
  const isTerminal = load ? allowedStatuses.length === 0 : false;

  const uploaderRef = useRef<FileUploaderHandle>(null);
  const [uploaderItems, setUploaderItems] = useState<FileUploaderValueItem[]>([]);
  const isBusy = uploaderItems.some((i) => i.status === "uploading");

  const { control, handleSubmit, watch, setValue, reset } = useZodForm<FormValues>(schema, {
    selectedStatus: null,
    isChargable: false,
    chargeAmount: null,
    chargeSide: null,
    comment: "",
  });

  useEffect(() => {
    if (load) {
      reset({
        selectedStatus: null,
        isChargable: load.isChargable ?? false,
        chargeAmount: load.chargeAmount ?? null,
        chargeSide: load.chargeSide ?? null,
        comment: "",
      });
    }
  }, [load, reset]);

  const selectedStatus = watch("selectedStatus") as LoadStatus | null;
  const isChargable = watch("isChargable");
  const comment = watch("comment");

  const effectiveStatus: LoadStatus | undefined =
    selectedStatus ?? (load ? (allowedStatuses[0] ?? load.status) : undefined);
  const effectiveIsChargable: boolean = isChargable;

  const mutation = useApiMutation(
    async ({
      status,
      chargable,
      amount,
      side,
      fileIds,
      cmt,
    }: {
      status: LoadStatus;
      chargable: boolean;
      amount: number | null;
      side: "broker" | "carrier" | null;
      fileIds?: string[];
      cmt?: string;
    }) => {
      if (!loadId) return;
      await loadApi.changeStatus(loadId, {
        status,
        isChargable: chargable,
        chargeAmount: chargable ? amount : null,
        chargeSide: chargable ? side : null,
        fileIds,
        comment: cmt,
      });
    },
    {
      onSuccess: async () => {
        uploaderRef.current?.commit();
        toast.success("Load status updated successfully");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["loads"] }),
          queryClient.invalidateQueries({ queryKey: ["load", loadId] }),
        ]);
        close();
      },
      onError: (err: unknown) => toast.danger(getErrorMessage(err)),
    },
  );

  const cLabel = commentLabel(effectiveStatus, effectiveIsChargable);

  const onSubmit = handleSubmit((values) => {
    if (!effectiveStatus) return;
    const chargable = values.isChargable;
    if (chargable && !values.chargeSide) {
      toast.danger("Please select Broker Side or Carrier Side.");
      return;
    }
    if (chargable && isBusy) {
      toast.danger("Wait for files to finish uploading.");
      return;
    }
    const amt = chargable && values.chargeAmount ? values.chargeAmount : null;
    const side = chargable ? values.chargeSide : null;
    const fileIds = chargable
      ? uploaderItems.filter((i) => i.status === "done" && i.fileId).map((i) => i.fileId as string)
      : undefined;
    mutation.mutate({
      status: effectiveStatus,
      chargable,
      amount: amt,
      side,
      fileIds,
      cmt: values.comment.trim() || undefined,
    });
  });

  if (!load) {
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
                <Modal.Heading>Update Load Status</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="p-2">
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

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
              <Modal.Heading>Update Load Status</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <form id="status-update-form" onSubmit={onSubmit}>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Reference:</span>{" "}
                      {load.referenceNumber}
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Current Status:</span>{" "}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[load.status] ?? ""}`}
                      >
                        {load.status}
                      </span>
                    </div>
                  </div>

                  {isTerminal ? (
                    <p className="text-gray-500 text-sm">
                      This load is in a terminal state and cannot be transitioned further.
                    </p>
                  ) : (
                    <>
                      <Controller
                        name="selectedStatus"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? effectiveStatus}
                            onChange={(key) => {
                              const s = key as LoadStatus;
                              field.onChange(s);
                              if (s !== "Delivered") {
                                setValue("isChargable", false);
                                setValue("chargeAmount", null);
                                setValue("chargeSide", null);
                                setUploaderItems([]);
                              }
                              setValue("comment", "");
                            }}
                            fullWidth
                          >
                            <Label>New Status</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {allowedStatuses.map((s) => (
                                  <ListBox.Item key={s} id={s} textValue={s}>
                                    {s}
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        )}
                      />

                      {effectiveStatus === "Delivered" && (
                        <>
                          <FormCheckbox control={control} name="isChargable" label="Is Chargable" />

                          {effectiveIsChargable && (
                            <>
                              <Controller
                                name="chargeSide"
                                control={control}
                                render={({ field }) => (
                                  <RadioGroup
                                    value={field.value ?? null}
                                    onChange={(v) =>
                                      field.onChange(v as "broker" | "carrier" | null)
                                    }
                                  >
                                    <Label>Charge Side</Label>
                                    <div className="flex flex-col gap-2 mt-1">
                                      <Radio value="broker">
                                        <Radio.Control>
                                          <Radio.Indicator />
                                        </Radio.Control>
                                        <Radio.Content>
                                          <Label>Broker Side</Label>
                                        </Radio.Content>
                                      </Radio>
                                      <Radio value="carrier">
                                        <Radio.Control>
                                          <Radio.Indicator />
                                        </Radio.Control>
                                        <Radio.Content>
                                          <Label>Carrier Side</Label>
                                        </Radio.Content>
                                      </Radio>
                                    </div>
                                  </RadioGroup>
                                )}
                              />

                              <FormNumberInput
                                control={control}
                                name="chargeAmount"
                                label="Charge Amount"
                                placeholder="Enter charge amount"
                                min="0.01"
                                step="0.01"
                              />

                              <FileUploader
                                ref={uploaderRef}
                                max={MAX_FILES_DEFAULT}
                                buttonLabel="Upload"
                                value={uploaderItems}
                                onChange={setUploaderItems}
                                helpText="Optional charge-related documents."
                              />
                            </>
                          )}
                        </>
                      )}

                      {cLabel !== null && (
                        <div>
                          <FormTextArea
                            control={control}
                            name="comment"
                            label={cLabel}
                            rows={3}
                            placeholder={`Enter ${cLabel.toLowerCase()}…`}
                            maxLength={500}
                          />
                          <p className="text-xs text-gray-400 mt-1">{comment.length}/500</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
              {!isTerminal && (
                <Button
                  variant="primary"
                  type="submit"
                  form="status-update-form"
                  isDisabled={mutation.isPending || isBusy}
                >
                  {mutation.isPending ? <Spinner size="sm" /> : "Update Status"}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default StatusUpdateModal;
