import { PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default categories...");

  const expenseCategories = [
    { name: "Housing", color: "#EF4444" },
    { name: "Transportation", color: "#F59E0B" },
    { name: "Food & Dining", color: "#10B981" },
    { name: "Utilities", color: "#3B82F6" },
    { name: "Health & Fitness", color: "#8B5CF6" },
    { name: "Personal Care", color: "#EC4899" },
    { name: "Entertainment", color: "#6366F1" },
    { name: "Shopping", color: "#14B8A6" },
    { name: "Education", color: "#F97316" },
    { name: "Gifts & Donations", color: "#06B6D4" },
    { name: "Travel", color: "#A855F7" },
    { name: "Insurance", color: "#64748B" },
    { name: "Taxes", color: "#475569" },
    { name: "Debt", color: "#1E293B" },
    { name: "Business", color: "#0F172A" },
    { name: "Other Expense", color: "#94A3B8" },
  ];

  const incomeCategories = [
    { name: "Salary", color: "#22C55E" },
    { name: "Freelance", color: "#34D399" },
    { name: "Investments", color: "#60A5FA" },
    { name: "Interest", color: "#818CF8" },
    { name: "Gifts", color: "#F472B6" },
    { name: "Refunds", color: "#FB923C" },
    { name: "Other Income", color: "#9CA3AF" },
  ];

  for (const cat of expenseCategories) {
    const existing = await prisma.category.findFirst({
      where: { userId: null, name: cat.name },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          color: cat.color,
          type: TransactionType.EXPENSE,
          isSystem: true,
        },
      });
    }
  }

  for (const cat of incomeCategories) {
    const existing = await prisma.category.findFirst({
      where: { userId: null, name: cat.name },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          color: cat.color,
          type: TransactionType.INCOME,
          isSystem: true,
        },
      });
    }
  }

  console.log("Seeding default pantry categories...");
  const defaultPantryCategories = [
    { name: "Produce", color: "#10B981" },
    { name: "Dairy", color: "#3B82F6" },
    { name: "Meat & Seafood", color: "#EF4444" },
    { name: "Bakery", color: "#F59E0B" },
    { name: "Frozen Foods", color: "#06B6D4" },
    { name: "Canned Goods", color: "#8B5CF6" },
    { name: "Dry Goods & Pasta", color: "#EC4899" },
    { name: "Snacks", color: "#14B8A6" },
    { name: "Beverages", color: "#6366F1" },
    { name: "Condiments & Sauces", color: "#F97316" },
    { name: "Spices & Baking", color: "#64748B" },
    { name: "Household & Cleaning", color: "#475569" },
    { name: "Other", color: "#94A3B8" }
  ];

  for (const cat of defaultPantryCategories) {
    const existing = await prisma.pantryCategory.findFirst({
      where: { userId: null, name: cat.name },
    });

    if (!existing) {
      await prisma.pantryCategory.create({
        data: {
          name: cat.name,
          color: cat.color,
          isSystem: true,
        },
      });
    }
  }

  console.log("Seeding default users with credentials...");
  const hashedPassword = await bcrypt.hash("Password123!", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@lifehub.local" },
    update: {
      password: hashedPassword,
      role: "SUPERADMIN",
      isActive: true,
    },
    create: {
      email: "admin@lifehub.local",
      name: "System Administrator",
      password: hashedPassword,
      role: "SUPERADMIN",
      isActive: true,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@lifehub.local" },
    update: {
      password: hashedPassword,
      role: "USER",
      isActive: true,
    },
    create: {
      email: "demo@lifehub.local",
      name: "Demo Household Member",
      password: hashedPassword,
      role: "USER",
      isActive: true,
    },
  });

  console.log("Seeded Admin User:", adminUser.email);
  console.log("Seeded Demo User:", demoUser.email);
  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
