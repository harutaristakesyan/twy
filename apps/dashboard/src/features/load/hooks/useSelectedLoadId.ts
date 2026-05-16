import { useMatch } from "react-router-dom";

export const useSelectedLoadId = (): string | null => {
  const match = useMatch("/loads/:loadId/*");
  const loadId = match?.params.loadId;
  if (!loadId || loadId === "create") return null;
  return loadId;
};
