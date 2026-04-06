import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelatedProductsSection } from '@/components/product/RelatedProductsSection';
import { BrowserRouter } from 'react-router-dom';

const mockProducts = [
  { id: '1', name: 'Test Product', price: 9.99, images: ['https://example.com/img.jpg'], product_number: 101 },
  { id: '2', name: 'Another Product', price: 19.99, images: null, product_number: 102 },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('RelatedProductsSection', () => {
  it('renders nothing when products array is empty', () => {
    const { container } = renderWithRouter(<RelatedProductsSection products={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders products when provided', () => {
    renderWithRouter(<RelatedProductsSection products={mockProducts} />);
    expect(screen.getByText('Related Products')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Another Product')).toBeInTheDocument();
  });

  it('renders fallback initial when no image', () => {
    renderWithRouter(<RelatedProductsSection products={[mockProducts[1]]} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
