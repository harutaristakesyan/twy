import { Button, Modal, Spinner, toast } from "@heroui/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormCheckbox, FormNumberInput, FormTextField } from "@/components/form";
import CarrierAutocomplete from "@/features/carrier/components/CarrierAutocomplete";
import type { FileUploaderHandle, FileUploaderValueItem } from "@/features/files";
import { FileUploader, MAX_FILES_DEFAULT } from "@/features/files";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadStopsFormList } from "@/features/load/components/LoadStopsFormList";
import type { CreateLoadDto, Load, Location, UpdateLoadDto } from "@/features/load/types/load";
import BrokerAutocomplete from "@/features/outside-broker/components/BrokerAutocomplete";
import { useZodForm } from "@/libs/form";
import { queryKeys, useApiMutation, useApiQuery, useQueryActions } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";

const STEPS = [
  { title: "Customer & carrier", description: "Who pays and who hauls" },
  { title: "Service & booking", description: "How the load is classified" },
  { title: "Pick-up", description: "Origin stops" },
  { title: "Drop-off", description: "Destination stops" },
  { title: "Files", description: "Optional documents" },
];
const LAST_STEP = STEPS.length - 1;

const locationSchema = z.object({
  cityZipCode: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().min(1, "Address is required"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  placeId: z.string().nullable().optional(),
});

const schema = z.object({
  brokerId: z.string().uuid("Broker is required"),
  brokerRate: z
    .number({ invalid_type_error: "Broker rate is required" })
    .positive("Broker rate must be greater than 0")
    .nullable()
    .refine((v): v is number => v !== null, "Broker rate is required"),
  carrierId: z.string().uuid().nullable().optional(),
  carrierRate: z
    .number({ invalid_type_error: "Carrier rate is required" })
    .positive("Carrier rate must be greater than 0")
    .nullable()
    .refine((v): v is number => v !== null, "Carrier rate is required"),
  chargeServiceFeeToOffice: z.boolean(),
  loadType: z.string().min(1, "Load type is required"),
  serviceType: z.string().min(1, "Service type is required"),
  serviceGivenAs: z.string().min(1, "Service given as is required"),
  commodity: z.string().min(1, "Commodity is required"),
  bookedAs: z.string().min(1, "Booked as is required"),
  soldAs: z.string().min(1, "Sold as is required"),
  weight: z.string().min(1, "Weight is required"),
  temperature: z.string().nullable().optional(),
  pickups: z.array(locationSchema),
  dropoffs: z.array(locationSchema),
});

type FormValues = z.infer<typeof schema>;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["brokerId", "brokerRate", "carrierId", "carrierRate"],
  1: [
    "chargeServiceFeeToOffice",
    "loadType",
    "serviceType",
    "serviceGivenAs",
    "commodity",
    "bookedAs",
    "soldAs",
    "weight",
    "temperature",
  ],
  2: ["pickups"],
  3: ["dropoffs"],
};

const emptyStop = (): Location => ({
  cityZipCode: null,
  phone: null,
  address: "",
});

const toNull = (v: string | null | undefined): string | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return v.trim().length ? v.trim() : null;
};

const toFormValues = (load: Load): FormValues => ({
  brokerId: load.broker.id,
  brokerRate: load.brokerRate ?? null,
  carrierId: load.carrier?.id ?? null,
  carrierRate: load.carrierRate ?? null,
  chargeServiceFeeToOffice: load.chargeServiceFeeToOffice,
  loadType: load.loadType,
  serviceType: load.serviceType,
  serviceGivenAs: load.serviceGivenAs,
  commodity: load.commodity,
  bookedAs: load.bookedAs,
  soldAs: load.soldAs,
  weight: load.weight,
  temperature: load.temperature ?? "",
  pickups: load.pickups.length > 0 ? load.pickups : [emptyStop()],
  dropoffs: load.dropoffs.length > 0 ? load.dropoffs : [emptyStop()],
});

export type LoadFormModalProps = { mode: "create" | "edit"; loadId?: string };

export const LoadFormModal: React.FC<LoadFormModalProps> = ({ mode, loadId }) => {
  const navigate = useNavigate();
  const { invalidate } = useQueryActions();

  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepVisited, setMaxStepVisited] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [uploaderItems, setUploaderItems] = useState<FileUploaderValueItem[]>([]);
  const uploaderRef = useRef<FileUploaderHandle>(null);
  const isBusy = uploaderItems.some((i) => i.status === "uploading");

  const { data: existing } = useApiQuery(
    queryKeys.loads.detail(loadId),
    () => {
      if (!loadId) return Promise.reject(new Error("No loadId"));
      return loadApi.getById(loadId);
    },
    { enabled: mode === "edit" && !!loadId },
  );

  const { control, handleSubmit, reset, trigger } = useZodForm<FormValues>(schema, {
    brokerId: "",
    brokerRate: null,
    carrierId: null,
    carrierRate: null,
    chargeServiceFeeToOffice: false,
    loadType: "",
    serviceType: "",
    serviceGivenAs: "",
    commodity: "",
    bookedAs: "",
    soldAs: "",
    weight: "",
    temperature: "",
    pickups: [emptyStop()],
    dropoffs: [emptyStop()],
  });

  useEffect(() => {
    if (existing) reset(toFormValues(existing));
  }, [existing, reset]);

  const pickupsField = useFieldArray({ control, name: "pickups" });
  const dropoffsField = useFieldArray({ control, name: "dropoffs" });

  const handleClose = () => {
    navigate("..");
  };

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    const valid = fields ? await trigger(fields) : true;
    if (!valid) {
      setStepErrors(["Please fix the errors above before proceeding."]);
      return;
    }
    setStepErrors([]);
    const next = currentStep + 1;
    setMaxStepVisited((p) => Math.max(p, next));
    setCurrentStep(next);
  };

  const createMutation = useApiMutation(async (payload: CreateLoadDto) => loadApi.create(payload), {
    onSuccess: async (result) => {
      uploaderRef.current?.commit();
      toast.success(`Load ${result.referenceNumber} created`);
      await invalidate(queryKeys.loads.all);
      handleClose();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const updateMutation = useApiMutation(
    async (payload: UpdateLoadDto) => {
      if (!loadId) throw new Error("No loadId");
      return loadApi.update(loadId, payload);
    },
    {
      onSuccess: async () => {
        uploaderRef.current?.commit();
        toast.success("Load updated successfully");
        await invalidate(queryKeys.loads.all, queryKeys.loads.detail(loadId));
        handleClose();
      },
      onError: (err: unknown) => {
        const apiError = err as Error & { status?: number; data?: { code?: string } };
        if (apiError.status === 409 && apiError.data?.code === "LOAD_EDIT_BLOCKED_BY_STATUS") {
          toast.danger("This load can no longer be edited. Move it back to Hold first.");
          handleClose();
          return;
        }
        toast.danger(getErrorMessage(err));
      },
    },
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    if (isBusy) {
      toast.danger("Wait for files to finish uploading.");
      return;
    }
    const filesPayload = uploaderItems
      .filter((i) => i.status === "done" && i.fileId)
      .map((i) => ({
        id: i.fileId as string,
        fileName: i.name,
        documentCategory: null as string | null,
      }));
    const payload: CreateLoadDto = {
      brokerId: values.brokerId,
      brokerRate: values.brokerRate,
      carrierId: values.carrierId ?? null,
      carrierRate: values.carrierRate,
      chargeServiceFeeToOffice: values.chargeServiceFeeToOffice,
      loadType: values.loadType,
      serviceType: values.serviceType,
      serviceGivenAs: values.serviceGivenAs,
      commodity: values.commodity,
      bookedAs: values.bookedAs,
      soldAs: values.soldAs,
      weight: values.weight,
      temperature: toNull(values.temperature),
      pickups: values.pickups.map((p) => ({
        cityZipCode: toNull(p.cityZipCode),
        phone: toNull(p.phone),
        address: p.address,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        placeId: p.placeId ?? null,
      })),
      dropoffs: values.dropoffs.map((d) => ({
        cityZipCode: toNull(d.cityZipCode),
        phone: toNull(d.phone),
        address: d.address,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        placeId: d.placeId ?? null,
      })),
      files: filesPayload.length ? filesPayload : undefined,
    };
    if (mode === "create") createMutation.mutate(payload);
    else updateMutation.mutate(payload);
  });

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-4">
            <p className="border-b pb-1 text-sm font-semibold text-gray-600">Broker</p>
            <p className="text-xs text-gray-500">
              Contact name, payment method and terms are managed on the broker page.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Controller
                  name="brokerId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <BrokerAutocomplete
                      value={field.value || null}
                      onChange={(id) => field.onChange(id ?? "")}
                      placeholder="Select broker"
                      isInvalid={!!fieldState.error}
                    />
                  )}
                />
              </div>
              <FormNumberInput
                control={control}
                name="brokerRate"
                label="Broker Rate *"
                min="0"
                step="0.01"
              />
            </div>
            <p className="mt-2 border-b pb-1 text-sm font-semibold text-gray-600">Carrier</p>
            <p className="text-xs text-gray-500">
              Carrier payment method and terms are managed on the carrier page.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Controller
                  name="carrierId"
                  control={control}
                  render={({ field }) => (
                    <CarrierAutocomplete
                      value={field.value ?? null}
                      onChange={(id) => field.onChange(id ?? null)}
                      placeholder="Select carrier"
                    />
                  )}
                />
              </div>
              <FormNumberInput
                control={control}
                name="carrierRate"
                label="Carrier Rate *"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <p className="border-b pb-1 text-sm font-semibold text-gray-600">Service</p>
            <FormCheckbox
              control={control}
              name="chargeServiceFeeToOffice"
              label="Charge Service Fee to Office"
            />
            <div className="grid grid-cols-2 gap-4">
              <FormTextField control={control} name="loadType" label="Load Type *" />
              <FormTextField control={control} name="serviceType" label="Service Type *" />
              <FormTextField control={control} name="serviceGivenAs" label="Service Given As *" />
              <FormTextField control={control} name="commodity" label="Commodity *" />
            </div>
            <p className="mt-2 border-b pb-1 text-sm font-semibold text-gray-600">Booking</p>
            <div className="grid grid-cols-2 gap-4">
              <FormTextField control={control} name="bookedAs" label="Booked As *" />
              <FormTextField control={control} name="soldAs" label="Sold As *" />
              <FormTextField control={control} name="weight" label="Weight *" />
              <FormTextField control={control} name="temperature" label="Temperature" />
            </div>
          </div>
        );
      case 2:
        return (
          <LoadStopsFormList
            stops={pickupsField.fields as Location[]}
            onChange={(stops) => pickupsField.replace(stops)}
            legLabel="Pick-up"
          />
        );
      case 3:
        return (
          <LoadStopsFormList
            stops={dropoffsField.fields as Location[]}
            onChange={(stops) => dropoffsField.replace(stops)}
            legLabel="Drop-off"
          />
        );
      case 4:
        return (
          <FileUploader
            ref={uploaderRef}
            max={MAX_FILES_DEFAULT}
            buttonLabel="Select Files"
            onChange={setUploaderItems}
            helpText="Supporting documents related to this load — multiple files allowed."
          />
        );
      default:
        return null;
    }
  };

  const isLoadingExisting = mode === "edit" && !existing;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-2xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{mode === "create" ? "Add new load" : "Edit load"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 p-2">
              {isLoadingExisting ? (
                <div className="flex h-40 items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : (
                <>
                  <div className="flex gap-1">
                    {STEPS.map((step, i) => (
                      <Button
                        key={step.title}
                        variant="tertiary"
                        className={`flex-1 rounded-none border-b-2 px-1 py-2 text-xs transition-colors ${
                          i === currentStep
                            ? "border-primary text-primary"
                            : i < currentStep
                              ? "border-success text-success"
                              : "border-default-200 text-default-400"
                        }`}
                        onPress={() => {
                          if (i <= maxStepVisited) setCurrentStep(i);
                        }}
                        isDisabled={i > maxStepVisited}
                      >
                        {i + 1}. {step.title}
                      </Button>
                    ))}
                  </div>

                  {stepErrors.length > 0 && (
                    <div className="rounded-lg border border-danger-200 bg-danger-50 p-3">
                      {stepErrors.map((e) => (
                        <p key={e} className="text-xs text-danger-600">
                          {e}
                        </p>
                      ))}
                    </div>
                  )}

                  <form id="load-form-modal" onSubmit={onSubmit}>
                    {renderStep()}
                  </form>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={handleClose}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="secondary"
                    onPress={() => {
                      setCurrentStep((s) => s - 1);
                      setStepErrors([]);
                    }}
                  >
                    Previous
                  </Button>
                )}
                {currentStep < LAST_STEP && (
                  <Button variant="primary" onPress={handleNext}>
                    Next
                  </Button>
                )}
                {currentStep === LAST_STEP && (
                  <Button
                    variant="primary"
                    type="submit"
                    form="load-form-modal"
                    isDisabled={isSubmitting || isBusy}
                  >
                    {isSubmitting ? <Spinner size="sm" /> : mode === "create" ? "Create" : "Save"}
                  </Button>
                )}
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
