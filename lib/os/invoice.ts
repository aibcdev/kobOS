export type ParsedInvoiceLine = {
  description_raw: string;
  product_id?: string;
  quantity: number;
  pack_count?: number;
  pack_size?: number;
  unit: string;
  total_base_quantity: number;
  unit_price: number;
  line_total: number;
};

const PACK = /(\d+)\s*[xX]\s*(\d+(?:\.\d+)?)\s*(kg|g|l|ml)?/i;

export function parseInvoiceLine(raw: string, quantity: number, lineTotal: number): ParsedInvoiceLine {
  const pack = raw.match(PACK);
  let pack_count: number | undefined;
  let pack_size: number | undefined;
  let unit = "unit";
  let total_base_quantity = quantity;
  if (pack) {
    pack_count = Number(pack[1]);
    pack_size = Number(pack[2]);
    unit = (pack[3] || "kg").toLowerCase();
    total_base_quantity = quantity * pack_count * pack_size;
  }
  const unit_price = total_base_quantity === 0 ? 0 : lineTotal / total_base_quantity;
  return {
    description_raw: raw,
    quantity,
    pack_count,
    pack_size,
    unit,
    total_base_quantity,
    unit_price,
    line_total: lineTotal,
  };
}
