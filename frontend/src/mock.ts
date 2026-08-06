export interface ConsignmentItem {
  id: string;
  penitip: string;
  itemName: string;
  hargaPokok: number; // Harga Pokok (Cost Price)
  hargaJual: number;  // Harga Jual (Selling Price)
  titip: number;      // Jumlah Dititipkan
  sisa: number;       // Sisa barang (formerly terjual)
  updatedAt: string;
}

export const INITIAL_CONSIGNMENT_ITEMS: ConsignmentItem[] = [
  {
    id: "item-1",
    penitip: "Bu Siti",
    itemName: "Keripik Singkong Pedas",
    hargaPokok: 1000,
    hargaJual: 1500,
    titip: 3,
    sisa: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-2",
    penitip: "Bu Siti",
    itemName: "Kue Akar Kelapa",
    hargaPokok: 5000,
    hargaJual: 7000,
    titip: 10,
    sisa: 4,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-3",
    penitip: "Pak Joko",
    itemName: "Basreng Extra Hot",
    hargaPokok: 2000,
    hargaJual: 3500,
    titip: 15,
    sisa: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-4",
    penitip: "Kak Rina",
    itemName: "Peyek Kacang Special",
    hargaPokok: 8000,
    hargaJual: 11000,
    titip: 8,
    sisa: 2,
    updatedAt: new Date().toISOString(),
  },
];

// Helper to calculate Setor based on formula: (Titip - Sisa) * Harga Pokok
export function calculateSetor(item: { titip: number; sisa: number; hargaPokok: number }): number {
  const terjual = Math.max(0, item.titip - item.sisa);
  return terjual * item.hargaPokok;
}

// Helper to calculate Terjual quantity
export function calculateTerjual(titip: number, sisa: number): number {
  return Math.max(0, titip - sisa);
}
