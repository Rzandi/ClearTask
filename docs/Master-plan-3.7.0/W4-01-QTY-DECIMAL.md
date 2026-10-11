# W4-01: Qty Desimal untuk Timbangan

**Status**: ✅ Implemented  
**Priority**: High  
**Effort**: L (4 orang-hari)  
**Tanggal**: 5 Oktober 2026

## Latar Belakang

Toko retail frozen food menjual barang timbangan (buah, sayur, daging) yang membutuhkan qty desimal. Sebelumnya sistem hanya support qty integer (1, 2, 3, ...), tidak bisa input 0,5 kg atau 1,25 liter.

## Requirements

- ✅ Input qty support desimal dengan format Indonesia (koma sebagai separator)
- ✅ Display qty dengan format yang benar (hilangkan trailing zeros)
- ✅ Validasi qty > 0 (termasuk desimal seperti 0,001)
- ✅ Pembulatan harga total ke rupiah terdekat
- ✅ Backward compatible dengan qty integer

## Implementation

### 1. Utilities (`src/utils/qtyUtils.ts`) ✅

Fungsi-fungsi utility untuk qty desimal:

- **`formatQty(qty, maxDecimals = 3)`**: Format qty untuk display
  - Integer: `"5"`
  - Desimal: `"0,5"`, `"1,25"`
  - Hapus trailing zeros: `1.0` → `"1"`
  
- **`isValidQty(qty)`**: Validasi qty > 0 (support desimal)

- **`parseQty(input)`**: Parse dari string Indonesia
  - `"0,5"` → `0.5`
  - `"1,25"` → `1.25`
  - `"12.500,5"` → `12500.5`

- **`roundQty(qty, precision = 3)`**: Round ke precision tertentu

- **`needsDecimalQty(satuan, kategori)`**: Deteksi barang timbangan
  - Return `true` untuk: kg, gram, liter, ml, meter
  - Return `false` untuk: Pcs, box, pack, unit

- **`getQtyStep(satuan, kategori)`**: Get step value untuk input
  - `0.001` untuk timbangan
  - `1` untuk piece units

- **`formatQtyWithUnit(qty, satuan)`**: Format lengkap dengan satuan
  - `"5 Pcs"`
  - `"0,5 kg"`
  - `"1,25 liter"`

### 2. Cart Utils Update (`src/utils/cartUtils.ts`) ✅

**`hitungTotalItem(qty, hargaSatuan)`**:
```typescript
// Sebelum: Math.round(qty * hargaSatuan)
// Sesudah: Support desimal, pembulatan tetap ke rupiah terdekat
const total = qty * hargaSatuan;
return Math.round(total);

// Contoh:
// 0.5 kg × Rp 20.000 = Rp 10.000 ✅
// 1.25 kg × Rp 15.000 = Rp 18.750 ✅
// 0.333 kg × Rp 30.000 = Rp 9.990 ✅ (tidak dibulatkan ke 10.000)
```

**`validasiItem(item)`**:
- Update validasi qty untuk accept desimal
- Error message: `"Qty harus lebih dari 0 (support desimal, misal 0,5)"`

### 3. Form Components Update ✅

**`ManualItemForm.tsx`**:
```typescript
// Import qty utils
import { parseQty, isValidQty, getQtyStep } from '../../utils/qtyUtils';

// Parsing qty
const q = parseQty(form.qty);  // Support desimal

// Validasi
if (!isValidQty(q)) err.qty = 'Qty harus > 0 (support desimal, misal 0,5)';

// Input field
<Input
  type="text"
  inputMode="decimal"
  value={form.qty}
  placeholder="1 atau 0,5"
/>
<span className="text-[10px] text-text-muted">
  Desimal: gunakan koma (,)
</span>
```

**`CartItemList.tsx`**:
```typescript
// Display qty dengan format
import { formatQty } from '../../utils/qtyUtils';

<span className="text-sm font-semibold">
  {formatQty(item.qty)}
</span>
```

### 4. Tests ✅

**Test Coverage**:
- ✅ `qtyUtils.test.ts` - 40+ test cases untuk semua fungsi utility
- ✅ `cartUtils.decimal.test.ts` - Test cart calculation dengan decimal qty

**Scenario Coverage**:
- Format integer dan desimal
- Parse Indonesian format (koma, titik ribuan)
- Validasi qty > 0
- Round dengan precision
- Detect timbangan units
- Real-world scenarios: buah, sayur, frozen food

## Examples

### Input & Display

```typescript
// User input: "0,5"
parseQty("0,5")           // → 0.5
formatQty(0.5)            // → "0,5"
formatQtyWithUnit(0.5, "kg")  // → "0,5 kg"

// User input: "1,25"
parseQty("1,25")          // → 1.25
formatQty(1.25)           // → "1,25"

// Integer (backward compatible)
parseQty("5")             // → 5
formatQty(5)              // → "5"
formatQty(5.0)            // → "5" (trailing zero removed)
```

### Calculations

```typescript
// Apel 0,75 kg @ Rp 25.000/kg
hitungTotalItem(0.75, 25000)  // → 18750

// Daging Sapi 1,25 kg @ Rp 120.000/kg
hitungTotalItem(1.25, 120000)  // → 150000

// Bayam 0,5 kg @ Rp 8.000/kg
hitungTotalItem(0.5, 8000)  // → 4000

// Edge case: 0,333 kg @ Rp 30.000/kg
hitungTotalItem(0.333, 30000)  // → 9990 (bukan 10000)
```

### Unit Detection

```typescript
needsDecimalQty('kg')      // → true
needsDecimalQty('gram')    // → true
needsDecimalQty('liter')   // → true
needsDecimalQty('Pcs')     // → false
needsDecimalQty('box')     // → false

getQtyStep('kg')           // → 0.001
getQtyStep('Pcs')          // → 1
```

## Validation Rules

1. **Qty harus > 0** (termasuk desimal kecil seperti 0,001)
2. **Format input**: 
   - Desimal pakai koma: `"0,5"` ✅
   - Desimal pakai titik: `"0.5"` ✅ (di-convert otomatis)
   - Ribuan pakai titik: `"12.500,5"` ✅
3. **Display format**:
   - Integer tanpa desimal: `"5"`
   - Desimal dengan koma: `"0,5"`, `"1,25"`
   - Trailing zeros dihapus: `"1,5"` bukan `"1,50"`
4. **Pembulatan**:
   - Harga total dibulatkan ke rupiah terdekat
   - Qty tidak dibulatkan otomatis (presisi disimpan)

## Database Impact

**Tidak ada perubahan skema** - field `qty: number` di `CartItem` dan `Transaction` sudah support desimal sejak awal. Ini hanya menambah dukungan UI dan validasi.

## Backward Compatibility

✅ **100% backward compatible**
- Qty integer tetap bekerja normal
- Data lama dengan qty integer tidak perlu migrasi
- Form masih accept integer tanpa koma
- Display integer tidak berubah

## Future Enhancements

Potensial improvement di luar scope W4-01:

1. **Auto-detect timbangan** - Jika user input nama barang yang mengandung "kg", "gram", auto-set qty step
2. **Satuan di cart** - Tampilkan "0,5 kg" bukan cuma "0,5"
3. **Quick decimal buttons** - Tombol +0.5, +0.1 di samping +1, +5
4. **Inventory minStock** - Support minStock desimal untuk stok menipis alert

## Related Items

- **Prerequisite**: W2-01 `parseIDNumber` (sudah ada) ✅
- **Uses**: W1-03 ledger stok (sudah support decimal delta) ✅
- **Blocks**: None
- **Blocked by**: None

## Files Changed

```
src/utils/qtyUtils.ts                        [NEW] ✅
src/__tests__/qtyUtils.test.ts               [NEW] ✅
src/__tests__/cartUtils.decimal.test.ts      [NEW] ✅
src/utils/cartUtils.ts                       [MODIFIED] ✅
src/components/pos/ManualItemForm.tsx        [MODIFIED] ✅
src/components/pos/CartItemList.tsx          [MODIFIED] ✅
docs/W4-01-QTY-DECIMAL.md                    [NEW] ✅
```

## Verification Checklist

- ✅ `qtyUtils.test.ts` - 40+ tests passing
- ✅ `cartUtils.decimal.test.ts` - Decimal calculation tests passing
- ✅ Manual test: Input "0,5" di form, hitung total benar
- ✅ Manual test: Display qty desimal di cart dengan format benar
- ✅ Manual test: Qty integer tetap bekerja normal
- ✅ Zero regression: Existing tests tetap passing

## Deployment Notes

1. **No migration needed** - Pure feature addition
2. **User training**: Kasir perlu tahu bisa input koma untuk desimal
3. **Documentation**: Update user manual dengan contoh timbangan
4. **Monitoring**: Monitor apakah ada error parsing qty dari user input

---

**Completion Criteria**: ✅ DONE
- [x] Utilities implemented and tested
- [x] Form components updated
- [x] Display components updated
- [x] Test coverage >= 90%
- [x] Documentation complete
- [x] Manual testing verified
- [x] Backward compatibility verified
