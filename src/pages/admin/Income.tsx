import { Navigate } from 'react-router-dom';

// Legacy route — redirect to RevenueHub
export default function AdminIncome() {
  return <Navigate to="/admin/revenue?tab=overview" replace />;
}
