import { Button, Input, Label, Modal, Spinner, TextField, toast } from "@heroui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadApi } from "@/features/load/api/loadApi";
import type { Load } from "@/features/load/types/load";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { renderCurrency } from "@/utils/formatters";
import { paymentOrderApi } from "../api/paymentOrderApi";

const computeFinancials = (load: Load) => {
  const customerRate = load.customerRate ?? null;
  const carrierRate = load.carrierRate ?? null;
  const serviceFee = load.serviceFee ?? 30;
  const profit =
    customerRate != null && carrierRate != null ? customerRate - carrierRate + serviceFee : null;
  return { brokerReceivable: customerRate, carrierPayable: carrierRate, profit, serviceFee };
};

const CreateLoadPaymentOrderModal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selected, setSelected] = useState<Load | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchText(val);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    const timer = setTimeout(() => setDebouncedSearch(val), 300);
    debounceRef[1](timer);
  };

  const { data, isFetching } = useQuery({
    queryKey: ["loads-for-po-search", debouncedSearch],
    queryFn: () =>
      debouncedSearch.length >= 2
        ? loadApi.getAll({ limit: 20, query: debouncedSearch, excludeWithExistingPO: true })
        : Promise.resolve({ loads: [], total: 0 }),
    enabled: debouncedSearch.length >= 2,
  });

  const mutation = useApiMutation((loadId: string) => paymentOrderApi.create(loadId), {
    onSuccess: async () => {
      toast.success("Load payment order created");
      await queryClient.invalidateQueries({ queryKey: ["payment-orders"] });
      navigate("..");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      const status = e.response?.status;
      const apiMsg = e.response?.data?.message;
      if (status === 409) {
        toast.danger("A payment order already exists for this load");
      } else if (status === 422) {
        toast.danger(apiMsg ?? "Cannot create payment order — load is missing required fields");
      } else {
        toast.danger(apiMsg ?? getErrorMessage(err));
      }
    },
  });

  const handleClose = () => {
    setSearchText("");
    setDebouncedSearch("");
    setSelected(null);
    navigate("..");
  };

  const financials = selected ? computeFinancials(selected) : null;
  const loads = data?.loads ?? [];

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={true}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Create Load Payment Order</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-2">
              <div className="flex flex-col gap-4">
                <TextField fullWidth>
                  <Label>Load *</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search by load #, customer, carrier…"
                      value={searchText}
                      onChange={handleSearchChange}
                    />
                    {isFetching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Spinner size="sm" />
                      </div>
                    )}
                  </div>
                </TextField>
                {loads.length > 0 && !selected && (
                  <ul className="mt-1 border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {loads.map((l) => (
                      <li key={l.id}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start px-3 py-2 text-sm border-b border-gray-100 last:border-0 rounded-none"
                          onPress={() => {
                            setSelected(l);
                            setSearchText(
                              `#${l.referenceNumber} — ${l.customer}${l.carrier ? ` → ${l.carrier}` : ""}`,
                            );
                          }}
                        >
                          #{l.referenceNumber} — {l.customer}
                          {l.carrier ? ` → ${l.carrier}` : ""}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {selected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs text-gray-500"
                    onPress={() => {
                      setSelected(null);
                      setSearchText("");
                      setDebouncedSearch("");
                    }}
                  >
                    Clear selection
                  </Button>
                )}

                {selected && financials && (
                  <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-2">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Preview</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-gray-500">Load</span>
                      <span>
                        #{selected.referenceNumber} — {selected.customer}
                      </span>
                      <span className="text-gray-500">Branch</span>
                      <span>{selected.branchName}</span>
                      <span className="text-gray-500">Carrier</span>
                      <span>{selected.carrier ?? "—"}</span>
                      <span className="text-gray-500">Broker Receivable</span>
                      <span>{renderCurrency(financials.brokerReceivable)}</span>
                      <span className="text-gray-500">Carrier Payable</span>
                      <span>{renderCurrency(financials.carrierPayable)}</span>
                      <span className="text-gray-500">Status</span>
                      <span>Pending</span>
                    </div>
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={() => selected && mutation.mutate(selected.id)}
                isDisabled={!selected || mutation.isPending}
              >
                {mutation.isPending ? <Spinner size="sm" /> : "Create Load PO"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CreateLoadPaymentOrderModal;
