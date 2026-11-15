export interface ParsedGroceryItem {
  name: string;
  quantity: number;
  unit: string;
}

const standardUnits: Record<string, string> = {
  kg: "kg",
  kgs: "kg",
  g: "g",
  gram: "g",
  grams: "g",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  oz: "oz",
  l: "L",
  liter: "L",
  liters: "L",
  ml: "ml",
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  pack: "pack",
  packs: "pack",
  package: "pack",
  packages: "pack",
  box: "box",
  boxes: "box",
  can: "can",
  cans: "can",
  bottle: "bottle",
  bottles: "bottle",
  bunch: "bunch",
  bunches: "bunch",
  bag: "bag",
  bags: "bag",
  dozen: "dozen",
  doz: "dozen",
};

/**
 * Parses a single line or comma token into an item with quantity, unit, and name.
 * Examples:
 * - "2 kg Apples" -> { quantity: 2, unit: "kg", name: "Apples" }
 * - "3 packs Cookies" -> { quantity: 3, unit: "pack", name: "Cookies" }
 * - "6 Eggs" -> { quantity: 6, unit: "pcs", name: "Eggs" }
 * - "Organic Whole Milk" -> { quantity: 1, unit: "pcs", name: "Organic Whole Milk" }
 */
export function parseGroceryItemLine(input: string): ParsedGroceryItem {
  const clean = input.trim();
  if (!clean) return { name: "", quantity: 1, unit: "pcs" };

  // Match optional leading quantity e.g. "2", "1.5", "1/2"
  const match = clean.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s*(.*)$/);
  if (!match) {
    return { name: clean, quantity: 1, unit: "pcs" };
  }

  const qty = parseFloat(match[1]);
  const possibleUnit = (match[2] || "").toLowerCase();
  const rest = (match[3] || "").trim();

  // If match[2] is a recognized measurement unit and rest is non-empty
  if (possibleUnit && standardUnits[possibleUnit] && rest) {
    return {
      name: rest,
      quantity: qty > 0 ? qty : 1,
      unit: standardUnits[possibleUnit],
    };
  }

  // If match[2] is not a recognized unit (e.g. "6 Eggs" where match[2]="Eggs", rest=""),
  // then possibleUnit is actually part of the item name!
  const name = [match[2], rest].filter(Boolean).join(" ").trim();
  return {
    name: name || clean,
    quantity: qty > 0 ? qty : 1,
    unit: "pcs",
  };
}

/**
 * Parses raw text containing multiple grocery items separated by newlines or commas.
 */
export function parseMultiGroceryInput(raw: string): ParsedGroceryItem[] {
  if (!raw || !raw.trim()) return [];

  // Split by newlines, bullets, or commas
  const rawLines = raw
    .split(/[\n,]+/)
    .map((line) => line.trim().replace(/^[-*•]\s*|^\d+[\).]\s+/, "").trim())
    .filter((line) => line.length > 0);

  return rawLines.map(parseGroceryItemLine).filter((item) => item.name.length > 0);
}
