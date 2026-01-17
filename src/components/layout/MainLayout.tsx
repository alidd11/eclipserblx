import { ReactNode, forwardRef } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  function MainLayout({ children }, ref) {
    return (
      <div ref={ref} className="min-h-[100dvh] flex flex-col bg-background overflow-x-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden">{children}</main>
        <Footer />
      </div>
    );
  }
);
