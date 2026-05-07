import { createContext, useContext } from 'react';

type AuthContextValue = {
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  refreshProfile: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}
