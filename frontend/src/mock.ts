export interface ConsignmentProduct {
  id: string;
  itemName: string;
  hargaPokok: number;
  hargaJual: number;
  titip: number;
  sisa: number;
  photoSebelum?: string; // Foto barang saat setor (sebelum dijual)
  photoSisa?: string;    // Foto barang sisa
}

export interface ConsignmentGroup {
  id: string;
  penitip: string;
  whatsapp: string;
  products: ConsignmentProduct[];
  updatedAt: string;
}

export const INITIAL_CONSIGNMENT_GROUPS: ConsignmentGroup[] = [
  {
    id: "group-1",
    penitip: "Bu Siti",
    whatsapp: "6281234567890",
    updatedAt: new Date().toISOString(),
    products: [
      {
        id: "prod-1",
        itemName: "Keripik Singkong Pedas",
        hargaPokok: 1000,
        hargaJual: 1500,
        titip: 3,
        sisa: 1,
      },
      {
        id: "prod-2",
        itemName: "Kue Akar Kelapa",
        hargaPokok: 5000,
        hargaJual: 7000,
        titip: 10,
        sisa: 4,
      },
    ],
  },
  {
    id: "group-2",
    penitip: "Pak Joko",
    whatsapp: "6289876543210",
    updatedAt: new Date().toISOString(),
    products: [
      {
        id: "prod-4",
        itemName: "Basreng Extra Hot",
        hargaPokok: 2000,
        hargaJual: 3500,
        titip: 15,
        sisa: 5,
      },
    ],
  },
];

export function calculateSetor(item: { titip: number; sisa: number; hargaPokok: number }): number {
  const terjual = Math.max(0, item.titip - item.sisa);
  return terjual * item.hargaPokok;
}

export function calculateTerjual(titip: number, sisa: number): number {
  return Math.max(0, titip - sisa);
}
