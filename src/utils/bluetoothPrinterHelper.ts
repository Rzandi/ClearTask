/**
 * Helper for printing receipts to standard 58mm Bluetooth Thermal Printers
 * using the browser's Web Bluetooth API (GATT).
 */

export interface ReceiptItem {
  namaBarang: string;
  qty: number;
  hargaSatuan: number;
  total: number;
}

export interface ReceiptOrder {
  transactionId: string;
  tanggal: string;
  createdAt?: string;
  items: ReceiptItem[];
  total: number;
  metode: string;
  uangDiterima: number;
  kembalian: number;
  kasir: string;
  catatan?: string;
}

// 58mm printer column count (typically 32 characters)
const COLS = 32;

/**
 * Format string as center-aligned
 */
function centerAlign(text: string): string {
  if (text.length >= COLS) return text.substring(0, COLS);
  const leftPadding = Math.floor((COLS - text.length) / 2);
  return ' '.repeat(leftPadding) + text;
}

/**
 * Format two columns (left aligned and right aligned)
 */
function formatTwoColumns(left: string, right: string): string {
  const spaceNeeded = COLS - left.length - right.length;
  if (spaceNeeded <= 0) {
    // If it doesn't fit, truncate or place right on new line
    return left.substring(0, COLS - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(spaceNeeded) + right;
}

/**
 * Format currency numbers with dots
 */
function formatNumber(num: number): string {
  return num.toLocaleString('id-ID');
}

/**
 * Generate ESC/POS commands for the transaction
 */
export function generateEscPosBytes(order: ReceiptOrder): Uint8Array {
  const encoder = new TextEncoder();
  const bytesList: number[] = [];

  // ESC/POS Command Constants
  const ESC = 0x1B;
  const GS = 0x1D;

  // 1. Initialize printer: ESC @
  bytesList.push(ESC, 0x40);

  // Helper to add text + new line
  const addLine = (text: string) => {
    const encoded = encoder.encode(text + '\n');
    bytesList.push(...Array.from(encoded));
  };

  // Helper to add raw command bytes
  const addCommand = (cmds: number[]) => {
    bytesList.push(...cmds);
  };

  // --- HEADER SECTION (Centered, Bold Store Name) ---
  addCommand([ESC, 0x61, 0x01]); // Align Center
  addCommand([ESC, 0x45, 0x01]); // Bold ON
  addCommand([GS, 0x21, 0x11]);  // Double width & double height
  addLine("ClearTask POS");
  
  addCommand([GS, 0x21, 0x00]);  // Normal font size
  addCommand([ESC, 0x45, 0x00]); // Bold OFF
  addLine("Jl. Contoh Alamat No. 123");
  addLine("Telp: 0812-3456-7890");
  
  // Divider
  addCommand([ESC, 0x61, 0x00]); // Align Left
  addLine('-'.repeat(COLS));

  // --- METADATA SECTION ---
  const timeStr = (order.createdAt ? new Date(order.createdAt) : new Date()).toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  addLine(formatTwoColumns("Waktu:", timeStr));
  addLine(formatTwoColumns("Kasir:", order.kasir || "Admin"));
  addLine(formatTwoColumns("No. TRX:", order.transactionId || "-"));
  
  // Divider
  addLine('-'.repeat(COLS));

  // --- ITEMS SECTION ---
  order.items.forEach((item) => {
    // Print item name on its own line (bold)
    addCommand([ESC, 0x45, 0x01]);
    addLine(item.namaBarang.substring(0, COLS));
    addCommand([ESC, 0x45, 0x00]);
    
    // Print qty x price and total item cost
    const qtyPriceStr = `  ${item.qty} x ${formatNumber(item.hargaSatuan)}`;
    const totalItemStr = formatNumber(item.total);
    addLine(formatTwoColumns(qtyPriceStr, totalItemStr));
  });

  // Divider
  addLine('-'.repeat(COLS));

  // --- TOTALS SECTION ---
  addCommand([ESC, 0x45, 0x01]); // Bold ON
  addLine(formatTwoColumns("TOTAL:", formatNumber(order.total)));
  addCommand([ESC, 0x45, 0x00]); // Bold OFF
  
  addLine(formatTwoColumns("Metode:", order.metode));
  if (order.metode === "Tunai") {
    addLine(formatTwoColumns("Tunai:", formatNumber(order.uangDiterima)));
    addLine(formatTwoColumns("Kembali:", formatNumber(order.kembalian)));
  }

  if (order.catatan && order.catatan.trim()) {
    addLine('-'.repeat(COLS));
    addLine(`Catatan: ${order.catatan}`);
  }

  addLine('='.repeat(COLS));

  // --- FOOTER SECTION (Centered) ---
  addCommand([ESC, 0x61, 0x01]); // Align Center
  addLine("Terima Kasih");
  addLine("Atas Kunjungan Anda");
  addLine("Barang yang sudah dibeli");
  addLine("tidak dapat ditukar/dikembalikan");
  
  // Paper feed & Cut (some printers feed automatically but we do it manually to be safe)
  addLine("\n\n\n\n");
  addCommand([GS, 0x56, 0x42, 0x00]); // GS V B 0 (Feed paper and cut)

  return new Uint8Array(bytesList);
}

/**
 * Connect to bluetooth printer and send ESC/POS bytes
 */
export async function printBluetoothReceipt(
  order: ReceiptOrder,
  onStatusChange: (status: string) => void
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    onStatusChange("Bluetooth tidak didukung oleh browser/perangkat ini.");
    return false;
  }

  try {
    onStatusChange("Mencari printer bluetooth...");
    
    // Request any bluetooth device.
    // Standard custom printer service UUIDs are included.
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // standard printer service
        '0000e7e1-0000-1000-8000-00805f9b34fb', // alternative raw bluetooth print
        '49535343-fe7d-4158-b696-be7fae940248', // microchip ISSC SPP
        '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
      ]
    });

    onStatusChange(`Menghubungkan ke ${device.name || "Printer"}...`);
    
    if (!device.gatt) {
      throw new Error("GATT server tidak tersedia di perangkat bluetooth.");
    }
    
    const server = await device.gatt.connect();
    onStatusChange("Mengirim data print...");

    let printerChar: BluetoothRemoteGATTCharacteristic | null = null;
    const serviceUUIDs = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '0000e7e1-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4158-b696-be7fae940248',
      '00001101-0000-1000-8000-00805f9b34fb',
    ];

    // Try known service UUIDs first
    for (const sUuid of serviceUUIDs) {
      try {
        const service = await server.getPrimaryService(sUuid);
        const characteristics = await service.getCharacteristics();
        const writeChar = characteristics.find(
          c => c.properties.write || c.properties.writeWithoutResponse
        );
        if (writeChar) {
          printerChar = writeChar;
          break;
        }
      } catch (err) {
        // Continue to try other service UUIDs
      }
    }

    // Dynamic fallback: scan all services if none of the above matched
    if (!printerChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          const writeChar = characteristics.find(
            c => c.properties.write || c.properties.writeWithoutResponse
          );
          if (writeChar) {
            printerChar = writeChar;
            break;
          }
        }
      } catch (e) {
        console.warn("Dynamic service query failed", e);
      }
    }

    if (!printerChar) {
      throw new Error("Karakteristik write printer tidak ditemukan.");
    }

    const dataBytes = generateEscPosBytes(order);
    
    // Chunk size of 20 bytes is safest for Bluetooth LE SPP converters
    const CHUNK_SIZE = 20;
    for (let i = 0; i < dataBytes.length; i += CHUNK_SIZE) {
      const chunk = dataBytes.slice(i, i + CHUNK_SIZE);
      await printerChar.writeValue(chunk);
      // Wait 15ms between chunks to prevent hardware buffer overflow
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    // Try disconnecting to clear resource cleanly
    try {
      device.gatt.disconnect();
    } catch (_) {}

    onStatusChange("Print sukses!");
    return true;
  } catch (error: any) {
    console.error("Bluetooth print error:", error);
    if (error.name === 'NotFoundError' || error.message?.includes('cancelled')) {
      onStatusChange("Pencarian printer dibatalkan.");
    } else {
      onStatusChange(`Gagal print: ${error.message || error}`);
    }
    return false;
  }
}
