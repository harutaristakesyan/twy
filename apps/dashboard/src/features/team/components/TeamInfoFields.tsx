import type { Control, FieldValues, Path } from "react-hook-form";
import { FormTextArea, FormTextField } from "@/components/form";

interface TeamInfoFieldsProps<T extends FieldValues> {
  control: Control<T>;
  nameField: Path<T>;
  descriptionField: Path<T>;
}

const TeamInfoFields = <T extends FieldValues>({
  control,
  nameField,
  descriptionField,
}: TeamInfoFieldsProps<T>) => (
  <>
    <FormTextField control={control} name={nameField} label="Name" placeholder="Team name" />
    <FormTextArea
      control={control}
      name={descriptionField}
      label="Description"
      placeholder="Optional description"
      rows={2}
    />
  </>
);

export default TeamInfoFields;
