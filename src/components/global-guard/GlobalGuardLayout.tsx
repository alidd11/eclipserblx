import { ReactNode } from 'react';
import { GlobalGuardSidebar } from './GlobalGuardSidebar';
import { useGlobalGuardManifest } from '@/hooks/useGlobalGuardManifest';
import { Shield } from 'lucide-react';

interface GlobalGuardLayoutProps {
  children: ReactNode;
}

export function GlobalGuardLayout({ children }: GlobalGuardLayoutProps) {
  useGlobalGuardManifest();

  return (
    <div className="min-h-screen bg-background flex">
      <GlobalGuardSidebar />
      <main className="flex-1 ml-64">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export function GlobalGuardHeader() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
        <Shield className="w-7 h-7 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Global Guard</h1>
        <p className="text-sm text-muted-foreground">Cross-Server Ban Management</p>
      </div>
    </div>
  );
}
