import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import InvoiceUploadDrawer from "../components/InvoiceUploadDrawer.tsx";
import MarkPaidModal from "../components/MarkPaidModal.tsx";
import type { BillingInvoiceSummary, InvoiceType } from "../types/index.ts";

interface AccountingModalContextType {
  openInvoiceDrawer: (loadId: string, defaultType: InvoiceType, onSuccess?: () => void) => void;
  openPaymentModal: (invoice: BillingInvoiceSummary, onSuccess?: () => void) => void;
}

const AccountingModalContext = createContext<AccountingModalContextType | null>(null);

export const useAccountingModal = (): AccountingModalContextType => {
  const ctx = useContext(AccountingModalContext);
  if (ctx === null) {
    throw new Error("useAccountingModal must be used within AccountingModalProvider");
  }
  return ctx;
};

export const AccountingModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invoiceDrawer, setInvoiceDrawer] = useState<{
    open: boolean;
    loadId: string | null;
    defaultType: InvoiceType;
  }>({
    open: false,
    loadId: null,
    defaultType: "carrier",
  });
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    invoice: BillingInvoiceSummary | null;
  }>({ open: false, invoice: null });

  const invoiceSuccessRef = useRef<(() => void) | undefined>(undefined);
  const paymentSuccessRef = useRef<(() => void) | undefined>(undefined);

  const openInvoiceDrawer = useCallback(
    (loadId: string, defaultType: InvoiceType, onSuccess?: () => void) => {
      invoiceSuccessRef.current = onSuccess;
      setInvoiceDrawer({ open: true, loadId, defaultType });
    },
    [],
  );

  const openPaymentModal = useCallback((invoice: BillingInvoiceSummary, onSuccess?: () => void) => {
    paymentSuccessRef.current = onSuccess;
    setPaymentModal({ open: true, invoice });
  }, []);

  const ctx = useMemo(
    () => ({ openInvoiceDrawer, openPaymentModal }),
    [openInvoiceDrawer, openPaymentModal],
  );

  return (
    <AccountingModalContext.Provider value={ctx}>
      {children}

      <InvoiceUploadDrawer
        open={invoiceDrawer.open}
        loadId={invoiceDrawer.loadId}
        defaultType={invoiceDrawer.defaultType}
        onClose={() => setInvoiceDrawer((prev) => ({ ...prev, open: false }))}
        onSuccess={() => {
          setInvoiceDrawer((prev) => ({ ...prev, open: false }));
          invoiceSuccessRef.current?.();
        }}
      />

      {paymentModal.invoice !== null && (
        <MarkPaidModal
          open={paymentModal.open}
          invoice={paymentModal.invoice}
          onClose={() => setPaymentModal((prev) => ({ ...prev, open: false }))}
          onSuccess={() => {
            setPaymentModal((prev) => ({ ...prev, open: false }));
            paymentSuccessRef.current?.();
          }}
        />
      )}
    </AccountingModalContext.Provider>
  );
};
