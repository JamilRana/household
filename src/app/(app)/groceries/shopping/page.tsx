import { getAllHouseholdGroceryItems } from "@/lib/actions/groceries";
import { ShoppingMode } from "@/components/groceries/ShoppingMode";

export default async function GroceryShoppingPage() {
  const items = await getAllHouseholdGroceryItems();

  return <ShoppingMode initialItems={items} />;
}
