export interface ConsignmentItem {
  id: string;
  penitip: string;
  whatsapp: string; // WhatsApp number for sharing rekap
  itemName: string;
  hargaPokok: number; // Harga Pokok (Cost Price)
  hargaJual: number;  // Harga Jual (Selling Price)
  titip: number;      // Jumlah Dititipkan (bisa > 1)
  sisa: number;       // Sisa barang
  imageUri?: string;  // Foto barang
  updatedAt: string;
}

export const INITIAL_CONSIGNMENT_ITEMS: ConsignmentItem[] = [
  {
    id: "item-1",
    penitip: "Bu Siti",
    whatsapp: "6281234567890",
    itemName: "Keripik Singkong Pedas",
    hargaPokok: 1000,
    hargaJual: 1500,
    titip: 3,
    sisa: 1,
    imageUri: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-2",
    penitip: "Bu Siti",
    whatsapp: "6281234567890",
    itemName: "Kue Akar Kelapa",
    hargaPokok: 5000,
    hargaJual: 7000,
    titip: 10,
    sisa: 4,
    imageUri: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&q=80",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "item-3",
    penitip: "Pak Joko",
    whatsapp: "6289876543210",
    itemName: "Basreng Extra Hot",
    hargaPokok: 2000,
    hargaJual: 3500,
    titip: 15,
    sisa: 5,
    imageUri: "https://images.unsplash.com/photo-1599487488170-d33190289053?w=400&q=80",
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

