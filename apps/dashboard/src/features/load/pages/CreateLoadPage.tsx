import { ArrowLeft } from "@gravity-ui/icons";
import { Button, Spinner, toast } from "@heroui/react";
import type React from "react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CarrierAutocomplete from "@/features/carrier/components/CarrierAutocomplete";
import type { FileUploaderHandle, FileUploaderValueItem } from "@/features/files";
import { FileUploader, MAX_FILES_DEFAULT } from "@/features/files";
import { loadApi } from "@/features/load/api/loadApi";
import { LoadStopsFormList } from "@/features/load/components/LoadStopsFormList";
import type { CreateLoadDto, Location } from "@/features/load/types/load";
import BrokerAutocomplete from "@/features/outside-broker/components/BrokerAutocomplete";
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

const toNumberOrNull = (value?: string, fieldName?: string): number | null | undefined => {
  if (value === undefined) return undefined;
  if (fieldName === "customerRate" || fieldName === "carrierRate") {
    if (value === null || value === "")
      throw new Error(
        `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} is required`,
      );
  } else {
    if (value === null || value === "") return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    if (fieldName === "customerRate" || fieldName === "carrierRate")
      throw new Error(
        `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} must be a valid number`,
      );
    return null;
  }
  if ((fieldName === "customerRate" || fieldName === "carrierRate") && parsed <= 0)
    throw new Error(
      `${fieldName === "customerRate" ? "Customer Rate" : "Carrier Rate"} must be greater than 0`,
    );
  return parsed;
};

const toNullableString = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

type FormState = {
  customer: string;
  referenceNumber: string;
  customerRate: string;
  contactName: string;
  paymentMethod: string;
  paymentTerms: string;
  carrier: string;
  carrierPaymentMethod: string;
  carrierRate: string;
  chargeServiceFeeToOffice: boolean;
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature: string;
  pickups: Location[];
  dropoffs: Location[];
};

const emptyForm: FormState = {
  customer: "",
  referenceNumber: "",
  customerRate: "",
  contactName: "",
  paymentMethod: "",
  paymentTerms: "",
  carrier: "",
  carrierPaymentMethod: "",
  carrierRate: "",
  chargeServiceFeeToOffice: false,
  loadType: "",
  serviceType: "",
  serviceGivenAs: "",
  commodity: "",
  bookedAs: "",
  soldAs: "",
  weight: "",
  temperature: "",
  pickups: [{ cityZipCode: null, phone: null, carrier: "", name: "", address: "" }],
  dropoffs: [{ cityZipCode: null, phone: null, carrier: "", name: "", address: "" }],
};

const fieldClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const CreateLoadPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepVisited, setMaxStepVisited] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [uploaderItems, setUploaderItems] = useState<FileUploaderValueItem[]>([]);
  const uploaderRef = useRef<FileUploaderHandle>(null);
  const isBusy = uploaderItems.some((i) => i.status === "uploading");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (step: number): string[] => {
    const errs: string[] = [];
    if (step === 0) {
      if (!form.customer.trim()) errs.push("Customer is required");
      if (!form.referenceNumber.trim()) errs.push("Reference number is required");
      const cr = Number(form.customerRate);
      if (!form.customerRate.trim() || Number.isNaN(cr) || cr <= 0)
        errs.push("Customer rate must be greater than 0");
      if (!form.contactName.trim()) errs.push("Contact name is required");
      if (!form.paymentMethod.trim()) errs.push("Payment method is required");
      if (!form.paymentTerms.trim()) errs.push("Payment terms is required");
      const rr = Number(form.carrierRate);
      if (!form.carrierRate.trim() || Number.isNaN(rr) || rr <= 0)
        errs.push("Carrier rate must be greater than 0");
    } else if (step === 1) {
      if (!form.loadType.trim()) errs.push("Load type is required");
      if (!form.serviceType.trim()) errs.push("Service type is required");
      if (!form.serviceGivenAs.trim()) errs.push("Service given as is required");
      if (!form.commodity.trim()) errs.push("Commodity is required");
      if (!form.bookedAs.trim()) errs.push("Booked as is required");
      if (!form.soldAs.trim()) errs.push("Sold as is required");
      if (!form.weight.trim()) errs.push("Weight is required");
    } else if (step === 2) {
      form.pickups.forEach((p, i) => {
        if (!p.carrier.trim()) errs.push(`Pickup ${i + 1}: carrier is required`);
        if (!p.name.trim()) errs.push(`Pickup ${i + 1}: name is required`);
        if (!p.address.trim()) errs.push(`Pickup ${i + 1}: address is required`);
      });
    } else if (step === 3) {
      form.dropoffs.forEach((d, i) => {
        if (!d.carrier.trim()) errs.push(`Dropoff ${i + 1}: carrier is required`);
        if (!d.name.trim()) errs.push(`Dropoff ${i + 1}: name is required`);
        if (!d.address.trim()) errs.push(`Dropoff ${i + 1}: address is required`);
      });
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(currentStep);
    if (errs.length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors([]);
    const next = currentStep + 1;
    setMaxStepVisited((p) => Math.max(p, next));
    setCurrentStep(next);
  };

  const mutation = useApiMutation(async (payload: CreateLoadDto) => loadApi.create(payload), {
    onSuccess: () => {
      uploaderRef.current?.commit();
      toast.success("Load created successfully");
      navigate("/loads");
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const handleSubmit = () => {
    if (isBusy) {
      toast.danger("Wait for files to finish uploading.");
      return;
    }
    const errs = validateStep(currentStep);
    if (errs.length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors([]);
    const filesPayload = uploaderItems
      .filter((i) => i.status === "done" && i.fileId)
      .map((i) => ({
        id: i.fileId as string,
        fileName: i.name,
        documentCategory: null as string | null,
      }));
    mutation.mutate({
      customer: form.customer,
      referenceNumber: form.referenceNumber,
      customerRate: toNumberOrNull(form.customerRate, "customerRate"),
      contactName: form.contactName,
      paymentMethod: form.paymentMethod,
      paymentTerms: form.paymentTerms,
      carrier: toNullableString(form.carrier),
      carrierPaymentMethod: toNullableString(form.carrierPaymentMethod),
      carrierRate: toNumberOrNull(form.carrierRate, "carrierRate"),
      chargeServiceFeeToOffice: form.chargeServiceFeeToOffice,
      loadType: form.loadType,
      serviceType: form.serviceType,
      serviceGivenAs: form.serviceGivenAs,
      commodity: form.commodity,
      bookedAs: form.bookedAs,
      soldAs: form.soldAs,
      weight: form.weight,
      temperature: toNullableString(form.temperature),
      pickups: form.pickups.map((p) => ({
        cityZipCode: toNullableString(p.cityZipCode),
        phone: toNullableString(p.phone),
        carrier: p.carrier,
        name: p.name,
        address: p.address,
      })),
      dropoffs: form.dropoffs.map((d) => ({
        cityZipCode: toNullableString(d.cityZipCode),
        phone: toNullableString(d.phone),
        carrier: d.carrier,
        name: d.name,
        address: d.address,
      })),
      files: filesPayload.length ? filesPayload : undefined,
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-600 border-b pb-1">Customer</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={labelClass}>Customer *</span>
                <BrokerAutocomplete
                  value={form.customer}
                  onChange={(_, name) => set("customer", name)}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Reference Number *
                  <input
                    className={fieldClass}
                    value={form.referenceNumber}
                    onChange={(e) => set("referenceNumber", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Customer Rate *
                  <input
                    type="number"
                    className={fieldClass}
                    value={form.customerRate}
                    onChange={(e) => set("customerRate", e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Contact Name *
                  <input
                    className={fieldClass}
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Payment Method *
                  <input
                    className={fieldClass}
                    value={form.paymentMethod}
                    onChange={(e) => set("paymentMethod", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Payment Terms *
                  <input
                    className={fieldClass}
                    value={form.paymentTerms}
                    onChange={(e) => set("paymentTerms", e.target.value)}
                  />
                </label>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-600 border-b pb-1 mt-2">Carrier</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={labelClass}>Carrier</span>
                <CarrierAutocomplete
                  value={form.carrier}
                  onChange={(_, name) => set("carrier", name)}
                  placeholder="Enter carrier"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Carrier Payment Method
                  <input
                    className={fieldClass}
                    value={form.carrierPaymentMethod}
                    onChange={(e) => set("carrierPaymentMethod", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Carrier Rate *
                  <input
                    type="number"
                    className={fieldClass}
                    value={form.carrierRate}
                    onChange={(e) => set("carrierRate", e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </label>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-600 border-b pb-1">Service</p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chargeServiceFee"
                checked={form.chargeServiceFeeToOffice}
                onChange={(e) => set("chargeServiceFeeToOffice", e.target.checked)}
              />
              <label htmlFor="chargeServiceFee" className="text-sm">
                Charge Service Fee to Office
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Load Type *
                  <input
                    className={fieldClass}
                    value={form.loadType}
                    onChange={(e) => set("loadType", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Service Type *
                  <input
                    className={fieldClass}
                    value={form.serviceType}
                    onChange={(e) => set("serviceType", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Service Given As *
                  <input
                    className={fieldClass}
                    value={form.serviceGivenAs}
                    onChange={(e) => set("serviceGivenAs", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Commodity *
                  <input
                    className={fieldClass}
                    value={form.commodity}
                    onChange={(e) => set("commodity", e.target.value)}
                  />
                </label>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-600 border-b pb-1 mt-2">Booking</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Booked As *
                  <input
                    className={fieldClass}
                    value={form.bookedAs}
                    onChange={(e) => set("bookedAs", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Sold As *
                  <input
                    className={fieldClass}
                    value={form.soldAs}
                    onChange={(e) => set("soldAs", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Weight *
                  <input
                    className={fieldClass}
                    value={form.weight}
                    onChange={(e) => set("weight", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Temperature
                  <input
                    className={fieldClass}
                    value={form.temperature}
                    onChange={(e) => set("temperature", e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <LoadStopsFormList
            stops={form.pickups}
            onChange={(s) => set("pickups", s)}
            legLabel="Pick-up"
          />
        );
      case 3:
        return (
          <LoadStopsFormList
            stops={form.dropoffs}
            onChange={(s) => set("dropoffs", s)}
            legLabel="Drop-off"
          />
        );
      case 4:
        return (
          <div>
            <p className={labelClass}>Upload Files</p>
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
        {/* Step indicator */}
        <div className="flex gap-1">
          {STEPS.map((step, i) => (
            <button
              key={step.title}
              type="button"
              className={`flex-1 text-xs py-2 px-1 border-b-2 transition-colors ${
                i === currentStep
                  ? "border-primary text-primary font-medium"
                  : i < currentStep
                    ? "border-green-500 text-green-600"
                    : "border-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              onClick={() => {
                if (i <= maxStepVisited) setCurrentStep(i);
              }}
              disabled={i > maxStepVisited}
            >
              <div>
                {i + 1}. {step.title}
              </div>
              <div className="text-xs text-gray-400 hidden sm:block">{step.description}</div>
            </button>
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

        {renderStep()}

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
                onPress={handleSubmit}
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
