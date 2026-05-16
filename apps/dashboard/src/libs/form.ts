import { zodResolver } from "@hookform/resolvers/zod";
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { ZodType } from "zod";

export function useZodForm<TSchema extends FieldValues>(
  schema: ZodType<TSchema>,
  defaults?: DefaultValues<TSchema>,
): UseFormReturn<TSchema> {
  return useForm<TSchema>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
}
