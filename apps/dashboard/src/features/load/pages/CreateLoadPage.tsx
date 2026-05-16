import { ArrowLeft } from "@gravity-ui/icons";
import { Button, Spinner, toast } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useRef, useState } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormCheckbox, FormNumberInput, FormTextField } from "@/components/form";
import CarrierAutocomplete from "@/features/carrier/components/CarrierAutocomplete";
import type { FileUploaderHandle, FileUploaderValueItem } from "@/features/files";
import { FileUploader, MAX_FILES_DEFAULT } from "@/features/files";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadStopsFormList } from "@/features/load/components/LoadStopsFormList";
import type { CreateLoadDto, Location } from "@/features/load/types/load";
import BrokerAutocomplete from "@/features/outside-broker/components/BrokerAutocomplete";
import { useZodForm } from "@/libs/form";
import { useApiMutation } from "@/libs/query";
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
});

const schema = z.object({
  brokerId: z.string().uuid("Broker is required"),
  customerRate: z
    .number({ invalid_type_error: "Customer rate is required" })
    .positive("Customer rate must be greater than 0")
    .nullable()
    .refine((v): v is number => v !== null, "Customer rate is required"),
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
  0: ["brokerId", "customerRate", "carrierId", "carrierRate"],
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

const CreateLoadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepVisited, setMaxStepVisited] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [uploaderItems, setUploaderItems] = useState<FileUploaderValueItem[]>([]);
  const uploaderRef = useRef<FileUploaderHandle>(null);
  const isBusy = uploaderItems.some((i) => i.status === "uploading");

  const { control, handleSubmit, trigger } = useZodForm<FormValues>(schema, {
    brokerId: "",
    customerRate: null,
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
    const next = currentStep + 1;
    setMaxStepVisited((p) => Math.max(p, next));
    setCurrentStep(next);
  };

  const mutation = useApiMutation(async (payload: CreateLoadDto) => loadApi.create(payload), {
    onSuccess: async (result) => {
      uploaderRef.current?.commit();
      toast.success(`Load ${result.referenceNumber} created`);
      await queryClient.invalidateQueries({ queryKey: ["loads"] });
      navigate("/loads");
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

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
      brokerId: values.brokerId,
      customerRate: values.customerRate,
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
      })),
      dropoffs: values.dropoffs.map((d) => ({
        cityZipCode: toNull(d.cityZipCode),
        phone: toNull(d.phone),
        address: d.address,
      })),
      files: filesPayload.length ? filesPayload : undefined,
    });
  });

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-600 border-b pb-1">Broker</p>
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
                name="customerRate"
                label="Customer Rate *"
                min="0"
                step="0.01"
              />
            </div>
            <p className="text-sm font-semibold text-gray-600 border-b pb-1 mt-2">Carrier</p>
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create New Load</h1>
        <Button variant="ghost" onPress={() => navigate("/loads")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Loads
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-6">
        <div className="flex gap-1">
          {STEPS.map((step, i) => (
            <Button
              key={step.title}
              variant="ghost"
              className={`flex-1 text-xs py-2 px-1 border-b-2 rounded-none transition-colors ${
                i === currentStep
                  ? "border-primary text-primary font-medium"
                  : i < currentStep
                    ? "border-green-500 text-green-600"
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              onPress={() => {
                if (i <= maxStepVisited) setCurrentStep(i);
              }}
              isDisabled={i > maxStepVisited}
            >
              <div>
                {i + 1}. {step.title}
              </div>
              <div className="text-xs text-gray-400 hidden sm:block">{step.description}</div>
            </Button>
          ))}
        </div>

        {stepErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            {stepErrors.map((e) => (
              <p key={e} className="text-red-600 text-xs">
                {e}
              </p>
            ))}
          </div>
        )}

        <form id="create-load-form" onSubmit={onSubmit}>
          {renderStep()}
        </form>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onPress={() => navigate("/loads")}>
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
                form="create-load-form"
                isDisabled={mutation.isPending || isBusy}
              >
                {mutation.isPending ? <Spinner size="sm" /> : "Create Load"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateLoadPage;
