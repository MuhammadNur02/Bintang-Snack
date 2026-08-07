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

export const INITIAL_CONSIGNMENT_GROUPS: ConsignmentGroup[] = [];

export function calculateSetor(item: { titip: number; sisa: number; hargaPokok: number }): number {
  const terjual = Math.max(0, item.titip - item.sisa);
  return terjual * item.hargaPokok;
}

export function calculateTerjual(titip: number, sisa: number): number {
  return Math.max(0, titip - sisa);
}
