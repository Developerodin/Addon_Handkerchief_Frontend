/** Minimal stub — WHMS module not included in handkerchief; productService falls back to legacy lookup. */
export const whmsWarehouseOrders = {
  async getCatalogueAttrs(_styleCodeIds: string[]): Promise<
    Record<string, { colour?: string; pattern?: string }>
  > {
    return {};
  },
};
