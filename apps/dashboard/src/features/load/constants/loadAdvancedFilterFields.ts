import type { FieldConfig } from "@/components/AdvancedFilter";

export const LOAD_FILTER_FIELDS: FieldConfig[] = [
  { key: "referenceNumber", label: "Reference #", type: "text" },
  { key: "customer", label: "Customer", type: "text" },
  { key: "contactName", label: "Contact Name", type: "text" },
  { key: "carrier", label: "Carrier", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "enum",
    options: [
      { label: "Pending", value: "Pending" },
      { label: "Approved", value: "Approved" },
      { label: "Approved Paid", value: "ApprovedPaid" },
      { label: "Denied", value: "Denied" },
      { label: "Hold", value: "Hold" },
    ],
  },
  { key: "paymentMethod", label: "Payment Method", type: "text" },
  { key: "paymentTerms", label: "Payment Terms", type: "text" },
  { key: "loadType", label: "Load Type", type: "text" },
  { key: "serviceType", label: "Service Type", type: "text" },
  { key: "commodity", label: "Commodity", type: "text" },
  { key: "carrierRate", label: "Carrier Rate", type: "number" },
  { key: "customerRate", label: "Customer Rate", type: "number" },
];
