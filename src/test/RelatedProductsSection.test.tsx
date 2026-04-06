import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelatedProductsSection } from '@/components/product/RelatedProductsSection';
import { BrowserRouter } from 'react-router-dom';
import { CurrencyProvider } from '@/hooks/useCurrency';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockProducts = [
  { id: '1', name: 'Test Product', price: 9.99, images: ['https://example.com/img.jpg'], product_number: 101 },
  { id: '2', name: 'Another Product', price: 19.99, images: null, product_number: 102 },
];

const qc = new QueryClient();

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={qc}>
      <CurrencyProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}

describe('RelatedProductsSection', () => {
  it('renders nothing when products array is empty', () => {
    const { container } = renderWithProviders(<RelatedProductsSection products={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders products when provided', () => {
    renderWithProviders(<RelatedProductsSection products={mockProducts} />);
    expect(screen.getByText('Related Products')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Another Product')).toBeInTheDocument();
  });

  it('renders fallback initial when no image', () => {
    renderWithProviders(<RelatedProductsSection products={[mockProducts[1]]} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
