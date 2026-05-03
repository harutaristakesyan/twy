import { z } from "zod";

export const AuthContext = z.object({
  authUser: z.object({ userId: z.uuid() }),
});
