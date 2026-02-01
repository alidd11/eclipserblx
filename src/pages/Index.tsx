import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';

export default function Index() {
  const navigate = useNavigate();
  
  // Redirect to admin login if this PWA was installed from admin context
  usePWAAdminRedirect();

  // Redirect homepage to marketplace (marketplace-first platform)
  useEffect(() => {
    navigate('/marketplace', { replace: true });
  }, [navigate]);

  // Show nothing during redirect
  return null;
}
