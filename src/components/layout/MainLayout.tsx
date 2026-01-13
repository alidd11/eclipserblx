import { ReactNode, forwardRef } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  function MainLayout({ children }, ref) {
    return (
      <div ref={ref} className="min-h-[100dvh] flex flex-col bg-background overscroll-contain overflow-x-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">{children}</main>
        <Footer />
      </div>
    );
  }
);
