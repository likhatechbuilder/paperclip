import { api } from "./client.js";

export const adminApi = {
  resetInstance: async (passkey: string): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>("admin/reset", { passkey });
    return response;
  },
};
