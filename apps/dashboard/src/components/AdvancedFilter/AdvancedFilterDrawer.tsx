import { AdvancedFilterModal } from "./AdvancedFilterModal.js";
import type { AdvancedFilter, FieldConfig } from "./types.js";

/** Backward-compatibility shim wrapping the new AdvancedFilterModal.
 *  Existing consumers keep working unchanged; migrate to AdvancedFilterModal + quickFields for full UX. */
interface Props {
  open: boolean;
  title?: string;
  fields: FieldConfig[];
  initialFilter?: AdvancedFilter;
  onApply: (filter: AdvancedFilter) => void;
  onClose: () => void;
}

export function AdvancedFilterDrawer({ fields, onApply, ...rest }: Props) {
  return (
    <AdvancedFilterModal
      {...rest}
      quickFields={[]}
      ruleFields={fields}
      onApply={(f) => onApply(f ?? { matchMode: "all", rules: [] })}
    />
  );
}
