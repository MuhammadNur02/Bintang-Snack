export interface ConsignmentProduct {
  id: string;
  itemName: string;
  hargaPokok: number;
  hargaJual: number;
  titip: number;
  sisa: number;
  imageUri?: string;
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
        imageUri: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
      },
      {
        id: "prod-2",
        itemName: "Kue Akar Kelapa",
        hargaPokok: 5000,
        hargaJual: 7000,
        titip: 10,
        sisa: 4,
        imageUri: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&q=80",
      },
      {
        id: "prod-3",
        itemName: "Gorengan Aneka",
        hargaPokok: 1500,
        hargaJual: 2500,
        titip: 12,
        sisa: 2,
        imageUri: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&q=80",
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
        imageUri: "https://images.unsplash.com/photo-1599487488170-d33190289053?w=400&q=80",
      },
      {
        id: "prod-5",
        itemName: "Nasi Bakar Special",
        hargaPokok: 8000,
        hargaJual: 12000,
        titip: 5,
        sisa: 1,
        imageUri: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80",
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
