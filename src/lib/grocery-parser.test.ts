import { describe, it, expect } from "vitest";
import { parseGroceryItemLine, parseMultiGroceryInput } from "./grocery-parser";

describe("grocery-parser", () => {
  it("parses single item with default quantity", () => {
    const item = parseGroceryItemLine("Milk");
    expect(item).toEqual({ name: "Milk", quantity: 1, unit: "pcs" });
  });

  it("parses item with count and no unit", () => {
    const item = parseGroceryItemLine("6 Eggs");
    expect(item).toEqual({ name: "Eggs", quantity: 6, unit: "pcs" });
  });

  it("parses item with standard units", () => {
    const kg = parseGroceryItemLine("2.5 kg Tomatoes");
    expect(kg).toEqual({ name: "Tomatoes", quantity: 2.5, unit: "kg" });

    const packs = parseGroceryItemLine("3 packs Butter Cookies");
    expect(packs).toEqual({ name: "Butter Cookies", quantity: 3, unit: "pack" });

    const liters = parseGroceryItemLine("1 L Olive Oil");
    expect(liters).toEqual({ name: "Olive Oil", quantity: 1, unit: "L" });
  });

  it("parses multi-line and comma-separated inputs", () => {
    const raw = `
      Milk
      2 Bread
      - 500 g Coffee Beans
      1.5 kg Rice, 6 Bananas
    `;
    const items = parseMultiGroceryInput(raw);
    expect(items).toHaveLength(5);
    expect(items[0]).toEqual({ name: "Milk", quantity: 1, unit: "pcs" });
    expect(items[1]).toEqual({ name: "Bread", quantity: 2, unit: "pcs" });
    expect(items[2]).toEqual({ name: "Coffee Beans", quantity: 500, unit: "g" });
    expect(items[3]).toEqual({ name: "Rice", quantity: 1.5, unit: "kg" });
    expect(items[4]).toEqual({ name: "Bananas", quantity: 6, unit: "pcs" });
  });
});
