import { describe, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import InventoryModal from '../components/InventoryModal';

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    allCategories: ['Elektronik', 'Makanan'],
    subCategoriesFor: () => [],
  }),
}));

const arbItem = fc.record({
  namaBarang: fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
  kategori: fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
  subKategori: fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
  harga: fc.oneof(fc.integer(), fc.string(), fc.constant(undefined), fc.constant(null)),
  satuan: fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
  quantity: fc.oneof(fc.integer(), fc.string(), fc.constant(undefined), fc.constant(null)),
});

describe('InventoryModal — Fuzz Testing', () => {
  it.skip('does not crash when given extreme or missing editItem values', () => {
    fc.assert(
      fc.property(arbItem, (editItem) => {
        const { unmount, container } = render(
          <InventoryModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} editItem={editItem} />
        );

        const namaInput = container.querySelector('input[name="namaBarang"]');
        if (namaInput) {
          fireEvent.change(namaInput, { target: { value: 'Valid Name' } });
        }

        unmount();
      }),
      { numRuns: 50 }
    );
  });
});
