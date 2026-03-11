import { createContext, useContext } from 'react';

/**
 * When a page is rendered inside a hub (tabbed container that already provides AdminLayout),
 * it should skip its own AdminLayout wrapper to avoid nesting.
 */
const AdminHubContext = createContext(false);

export const AdminHubProvider = ({ children }: { children: React.ReactNode }) => (
  <AdminHubContext.Provider value={true}>{children}</AdminHubContext.Provider>
);

export const useIsInsideHub = () => useContext(AdminHubContext);
