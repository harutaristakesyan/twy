import { Button, Modal, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { FormCheckbox, FormNumberInput, FormTextField } from "@/components/form";
import CarrierAutocomplete from "@/features/carrier/components/CarrierAutocomplete";
import type { FileUploaderHandle, FileUploaderValueItem } from "@/features/files";
import { FileUploader, MAX_FILES_DEFAULT } from "@/features/files";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadStopsFormList } from "@/features/load/components/LoadStopsFormList";
import type { Location, UpdateLoadDto } from "@/features/load/types/load";
import BrokerAutocomplete from "@/features/outside-broker/components/BrokerAutocomplete";
import { useZodForm } from "@/libs/form";
import { useApiMutation, useApiQuery } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";

const STEPS = [
  { title: "Customer & carrier" },
  { title: "Service & booking" },
  { title: "Pick-up" },
  { title: "Drop-off" },
  { title: "Files" },
];
const LAST_STEP = STEPS.length - 1;

const locationSchema = z.object({
  cityZipCode: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  carrier: z.string().min(1, "Carrier is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
});

const schema = z.object({
  customer: z.string().min(1, "Customer is required"),
  referenceNumber: z.string().min(1, "Reference number is required"),
  customerRate: z
    .number({ invalid_type_error: "Customer rate is required" })
    .positive("Customer rate must be greater than 0")
    .nullable()
    .refine((v): v is number => v !== null, "Customer rate is required"),
  contactName: z.string().min(1, "Contact name is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  paymentTerms: z.string().min(1, "Payment terms is required"),
  carrier: z.string().nullable().optional(),
  carrierPaymentMethod: z.string().nullable().optional(),
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
  0: [
    "customer",
    "referenceNumber",
    "customerRate",
    "contactName",
    "paymentMethod",
    "paymentTerms",
    "carrier",
    "carrierPaymentMethod",
    "carrierRate",
  ],
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
  carrier: "",
  name: "",
  address: "",
});

const LoadEditModal = () => {
  const { loadId } = useParams<{ loadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const close = () => navigate("..");

  const { data: load } = useApiQuery(
    ["load", loadId],
    () => {
      if (!loadId) return Promise.reject(new Error("No loadId"));
      return loadApi.getById(loadId);
    },
    { enabled: !!loadId },
  );

  const uploaderRef = useRef<FileUploaderHandle>(null);
  const [uploaderItems, setUploaderItems] = useState<FileUploaderValueItem[]>([]);
  const isBusy = uploaderItems.some((i) => i.status === "uploading");

  const [currentStep, setCurrentStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const { control, handleSubmit, reset, trigger } = useZodForm<FormValues>(schema, {
    customer: "",
    referenceNumber: "",
    customerRate: null,
    contactName: "",
    paymentMethod: "",
    paymentTerms: "",
    carrier: "",
    carrierPaymentMethod: "",
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
    if (load) {
      reset({
        customer: load.customer,
        referenceNumber: load.referenceNumber,
        customerRate: load.customerRate ?? null,
        contactName: load.contactName,
        paymentMethod: load.paymentMethod,
        paymentTerms: load.paymentTerms,
        carrier: load.carrier ?? "",
        carrierPaymentMethod: load.carrierPaymentMethod ?? "",
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
    }
  }, [load, reset]);

  const pickupsField = useFieldArray({ control, name: "pickups" });
  const dropoffsField = useFieldArray({ control, name: "dropoffs" });

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    const valid = fields ? await trigger(fields) : true;
    if (!valid) {
      setStepErrors(["Please fix the errors above before proceeding."]);
      return;
    }
    setStepErrors([]);
    setCurrentStep((s) => s + 1);
  };

  const mutation = useApiMutation(
    async (payload: UpdateLoadDto) => {
      if (!loadId) return;
      return loadApi.update(loadId, payload);
    },
    {
      onSuccess: async () => {
        uploaderRef.current?.commit();
        toast.success("Load updated successfully");
        await queryClient.invalidateQueries({ queryKey: ["loads"] });
        close();
      },
      onError: (err: unknown) => {
        const apiError = err as Error & { status?: number; data?: { code?: string } };
        if (apiError.status === 409 && apiError.data?.code === "LOAD_EDIT_BLOCKED_BY_STATUS") {
          toast.danger("This load can no longer be edited. Move it back to Hold first.");
          close();
          return;
        }
        toast.danger(getErrorMessage(err));
      },
    },
  );

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
    const toNull = (v: string | null | undefined): string | null | undefined => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      return v.trim().length ? v.trim() : null;
    };
    mutation.mutate({
      customer: values.customer,
      referenceNumber: values.referenceNumber,
      customerRate: values.customerRate,
      contactName: values.contactName,
      paymentMethod: values.paymentMethod,
      paymentTerms: values.paymentTerms,
      carrier: toNull(values.carrier),
      carrierPaymentMethod: toNull(values.carrierPaymentMethod),
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
        carrier: p.carrier,
        name: p.name,
        address: p.address,
      })),
      dropoffs: values.dropoffs.map((d) => ({
        cityZipCode: toNull(d.cityZipCode),
        phone: toNull(d.phone),
        carrier: d.carrier,
        name: d.name,
        address: d.address,
      })),
      files: filesPayload,
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
                <Modal.Heading>Edit Load</Modal.Heading>
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

  const initialUploaderItems: FileUploaderValueItem[] = (load.files ?? []).map((f) => ({
    uid: f.id,
    name: f.fileName,
    status: "done" as const,
    fileId: f.id,
  }));

  const activeUploaderItems = uploaderItems.length === 0 ? initialUploaderItems : uploaderItems;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-600 border-b pb-1">Customer</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Controller
                  name="customer"
                  control={control}
                  render={({ field }) => (
                    <BrokerAutocomplete
                      value={field.value}
                      onChange={(_, name) => field.onChange(name)}
                      placeholder="Enter customer name"
                    />
                  )}
                />
              </div>
              <FormTextField control={control} name="referenceNumber" label="Reference Number *" />
              <FormNumberInput
                control={control}
                name="customerRate"
                label="Customer Rate *"
                min="0"
                step="0.01"
              />
              <FormTextField control={control} name="contactName" label="Contact Name *" />
              <FormTextField control={control} name="paymentMethod" label="Payment Method *" />
              <FormTextField control={control} name="paymentTerms" label="Payment Terms *" />
            </div>
            <p className="text-sm font-semibold text-gray-600 border-b pb-1 mt-2">Carrier</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Controller
                  name="carrier"
                  control={control}
                  render={({ field }) => (
                    <CarrierAutocomplete
                      value={field.value ?? ""}
                      onChange={(_, name) => field.onChange(name)}
                      placeholder="Enter carrier"
                    />
                  )}
                />
              </div>
              <FormTextField
                control={control}
                name="carrierPaymentMethod"
                label="Carrier Payment Method"
              />
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
            <p className="text-sm font-semibold text-gray-600 border-b pb-1">Service</p>
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
            <p className="text-sm font-semibold text-gray-600 border-b pb-1 mt-2">Booking</p>
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
          <div>
            <FileUploader
              ref={uploaderRef}
              max={MAX_FILES_DEFAULT}
              buttonLabel="Select Files"
              value={activeUploaderItems}
              onChange={setUploaderItems}
              helpText="Supporting documents related to this load — multiple files allowed."
            />
          </div>
        );
      default:
        return null;
    }
  };

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
              <Modal.Heading>Edit Load</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <div className="flex gap-1 mb-6">
                {STEPS.map((step, i) => (
                  <Button
                    key={step.title}
                    variant="ghost"
                    className={`flex-1 text-xs py-1 border-b-2 rounded-none transition-colors ${
                      i === currentStep
                        ? "border-primary text-primary font-medium"
                        : i < currentStep
                          ? "border-green-500 text-green-600"
                          : "border-gray-200 text-gray-400"
                    }`}
                    onPress={() => {
                      if (i <= currentStep) setCurrentStep(i);
                    }}
                  >
                    {i + 1}. {step.title}
                  </Button>
                ))}
              </div>

              {stepErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  {stepErrors.map((e) => (
                    <p key={e} className="text-red-600 text-xs">
                      {e}
                    </p>
                  ))}
                </div>
              )}

              <form id="load-edit-form" onSubmit={onSubmit}>
                {renderStep()}
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
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
                  form="load-edit-form"
                  isDisabled={mutation.isPending || isBusy}
                >
                  {mutation.isPending ? <Spinner size="sm" /> : "Update Load"}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default LoadEditModal;
