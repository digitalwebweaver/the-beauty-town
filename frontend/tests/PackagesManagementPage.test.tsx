import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PackagesManagementPage from '@/pages/admin/PackagesManagementPage';
import type { PackageDto } from '@/services/packages.api';

const mockPackage: PackageDto = {
  id: 'pkg-1',
  name: 'Groom Package',
  slug: 'groom-package',
  category: 'Grooming',
  gender: 'male',
  description: null,
  price_inr: '15000.00',
  worth_inr: '18000.00',
  validity_label: 'One-time',
  inclusions: ['Draping', 'Lenses'],
  image_url: null,
  is_active: true,
  display_order: 0,
  services: [],
  is_bookable: false,
};

const refetch = vi.fn();
let mockState: { data: PackageDto[] | undefined; isLoading: boolean; isError: boolean } = {
  data: [mockPackage],
  isLoading: false,
  isError: false,
};

// Mock at the react-query-hook boundary rather than mocking axios/network —
// this is a component smoke test (does the page render the right thing for
// a given data state?), not an integration test of the fetch itself.
vi.mock('@/services/packages.api', () => ({
  useAdminPackages: () => ({ ...mockState, refetch }),
  useCreatePackage: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdatePackage: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeletePackage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/services/services.api', () => ({
  useServices: () => ({ data: [] }),
}));

describe('PackagesManagementPage', () => {
  it('renders a package row with its price and booking-type badge', () => {
    mockState = { data: [mockPackage], isLoading: false, isError: false };
    render(<PackagesManagementPage />);

    expect(screen.getByText('Groom Package')).toBeInTheDocument();
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('Enquire')).toBeInTheDocument(); // is_bookable: false
  });

  it('shows a retryable error state instead of an empty table on fetch failure', async () => {
    mockState = { data: undefined, isLoading: false, isError: true };
    render(<PackagesManagementPage />);

    expect(screen.getByText("Couldn't load packages right now.")).toBeInTheDocument();
    expect(screen.queryByText('No packages yet.')).not.toBeInTheDocument();
  });
});
