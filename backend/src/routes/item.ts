// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../middleware/authMiddleware';

// [IMPORT] CSV Parser
import multer from 'multer';
import { parse } from "csv-parse/sync";
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });

const router = Router();

// ? [INTERFACE]
interface CsvProductRow {
  Name?: string;
  SKU?: string;
  "Selling Price": string;
  Cost: string;
  Quantity: string;
  Category?: string;
  Subcategory?: string;
  Unit?: string;
}
// * [POST] Import Items via CSV
// ? /api/items/import-items
router.post(
  "/import-items",
  verifyRole(['ADMIN']),
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return res.status(400).json(errorResponse("CSV file is required"));

      const fileContent = fs.readFileSync(req.file.path, "utf-8");
      info(`[CSV IMPORT] File read successfully`);

      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ","
      }) as CsvProductRow[];

      info(`[CSV IMPORT] Parsed ${records.length} records`);

      let createdCount = 0;

      // * Preload existing categories and subcategories
      const categoryMap = new Map<string, number>();
      const subcategoryMap = new Map<string, number>(); // key: `${categoryId}_${subName}`

      const categories = await prisma.category.findMany();
      categories.forEach(c => categoryMap.set(c.name, c.id));

      const subcategories = await prisma.subcategory.findMany();
      subcategories.forEach(s => subcategoryMap.set(`${s.categoryId}_${s.name}`, s.id));

      // * Process each row
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        info(`[CSV IMPORT] Processing row ${i + 1}`);

        try {
          const name = row.Name?.trim();
          const sku = row.SKU?.trim();
          const price = parseFloat(row["Selling Price"]);
          const cost = parseFloat(row.Cost);
          const quantity = parseInt(row.Quantity) || 0;
          const categoryName = row.Category?.trim();
          const subcategoryName = row.Subcategory?.trim();
          const unit = row.Unit?.trim() || "";

          // Parse Department enum safely, default to CAFE
          const departmentEnum: "CAFE" | "RESTOBAR" =
            (row.Department?.trim().toUpperCase() as "CAFE" | "RESTOBAR") || "CAFE";

          // Skip invalid rows
          if (!name || !sku || isNaN(price) || !categoryName || !subcategoryName) {
            info(`[CSV IMPORT] Skipping row ${i + 1}: missing required fields`);
            continue;
          }

          // Skip existing SKU
          if (await prisma.item.findUnique({ where: { sku } })) {
            info(`[CSV IMPORT] Skipping row ${i + 1}: SKU ${sku} already exists`);
            continue;
          }

          // Category
          let categoryId = categoryMap.get(categoryName);
          if (!categoryId) {
            const cat = await prisma.category.create({ data: { name: categoryName } });
            categoryId = cat.id;
            categoryMap.set(categoryName, categoryId);
            info(`[CSV IMPORT] Created category: ${categoryName}`);
          }

          // Subcategory
          const subKey = `${categoryId}_${subcategoryName}`;
          let subcategoryId = subcategoryMap.get(subKey);
          if (!subcategoryId) {
            const sub = await prisma.subcategory.create({
              data: { name: subcategoryName, categoryId }
            });
            subcategoryId = sub.id;
            subcategoryMap.set(subKey, subcategoryId);
            info(`[CSV IMPORT] Created subcategory: ${subcategoryName}`);
          }

          // Create item
          await prisma.item.create({
            data: {
              name,
              sku,
              price,
              cost,
              quantity,
              unit,
              categoryId,
              subcategoryId,
              department: departmentEnum, // assign enum directly
              isActive: true,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              createdById: (req as any).user.userId
            }
          });

          createdCount++;
        } catch (rowErr) {
          info(`[CSV IMPORT] Error processing row ${i + 1}: ${(rowErr as Error).message}`);
          continue;
        }
      }

      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      info(`[CSV IMPORT] Deleted uploaded file`);
      info(`[CSV IMPORT] Successfully imported ${createdCount} items`);

      res.json(successResponse(`Successfully imported ${createdCount} items`, { createdCount }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error importing items";
      error(`[CSV IMPORT ERROR] ${errorMessage}`);
      res.status(500).json(errorResponse(errorMessage));
      next(err);
    }
  }
);

// * [GET] Get All Items
// ? /api/items/
router.get('/', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, isActive } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any = {};

    // [1] Search by name, sku, or barcode
    if (search) {
      filters.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { sku: { contains: String(search), mode: "insensitive" } },
        { barcode: { contains: String(search), mode: "insensitive" } },
      ];
    }

    // [2] Filter by categoryId
    if (category) filters.categoryId = Number(category);

    // [3] Filter by active status
    if (isActive !== undefined) filters.isActive = isActive === "true";

    // [4] Fetch items
    const items = await prisma.item.findMany({
      where: filters,
      include: {
        category: {
          include: {
            subcategories: {
              include: {
                items: {
                  select: {
                    id: true,
                    name: true,
                    department: true,
                  },
                },
              },
            },
          },
        },
        subcategory: true,
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        updatedBy: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { name: 'asc' },
    });

    // * [SUCCESS] Return items
    info(`Fetched ${items.length} items`);
    res.json(successResponse("Items fetched successfully", items));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while fetching items";
    if (err instanceof Error) {
      errorMessage = err.message;
      error(`Error fetching items: ${errorMessage}`);
    } else {
      error(`Error fetching items: ${JSON.stringify(err)}`);
    }
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [GET] Get Single Item
// ? /api/items/:id
router.get('/:id', verifyRole(['ADMIN', 'CASHIER']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    // [1] Fetch item with specific 'id'
    const item = await prisma.item.findUnique({
        where: { id: Number(id) },
        include: {
            createdBy: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                }
            },
            updatedBy: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                }
            },
            inventoryLogs: true
        }
    });

    // ! [ERROR] Non-existing item
    if (!item) {
        return res.status(404).json(errorResponse("Item not found"));
    }

    // * [SUCCESS] Return item
    info(`Fetched item with id ${id}`);
    res.json(successResponse("Item fetched successfully", item));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while fetching item";
    if (err instanceof Error) {
        errorMessage = err.message;
        error(`Error fetching item with id ${id}: ${errorMessage}`);
    } else {
        error(`Error fetching item with id ${id}: ${JSON.stringify(err)}`);
    }
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [POST] Create Item
// ? /api/items/
router.post('/', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  const {
      name,
      description = "",
      sku = "",
      barcode = "",
      price = 0,
      cost = 0,
      quantity = 0,
      categoryId,
      subcategoryId,
      unit = "",
      reorderLevel = 0,
      isActive = true
  } = req.body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdById = (req as any).user?.id || 1; // fallback to 1 if missing user id

  try {
    // [1] Create item
    const newItem = await prisma.item.create({
      data: {
        name,
        description,
        sku,
        barcode,
        price,
        cost,
        quantity,
        categoryId,
        subcategoryId,
        unit,
        reorderLevel,
        isActive,
        createdById,
        updatedById: createdById,
      },
      include: {
        category: true,
        subcategory: true,
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true }
        },
        updatedBy: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true }
        }
      }
    });

    // * [SUCCESS] Item created
    info(`Created new item: ${name}`);
    res.status(201).json(successResponse("Item created successfully", newItem));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while creating item";
    if (err instanceof Error) {
      errorMessage = err.message;
      error(`Error creating item ${name}: ${errorMessage}`);
    } else {
      error(`Error creating item ${name}: ${JSON.stringify(err)}`);
    }
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [PUT] Update Item
// ? /api/items/:id
router.put('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    // [1] Update item
    const updatedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: updateData
    });

    // * [SUCCESS] Item updated
    info(`Updated item with id ${id}`);
    res.json(successResponse("Item updated successfully", updatedItem));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while updating item";
    if (err instanceof Error) {
      errorMessage = err.message;
      error(`Error updating item with id ${id}: ${errorMessage}`);
    } else {
      error(`Error updating item with id ${id}: ${JSON.stringify(err)}`);
    }
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

// * [DELETE] Delete All Items (Hard)
// ? /api/items/hard-delete-all
router.delete('/hard-delete-all', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // [1] Delete all items
    const deletedItems = await prisma.item.deleteMany({});

    // * [SUCCESS] Items hard-deleted
    info(`Hard-deleted all items (${deletedItems.count} items)`);
    res.json(successResponse("All items permanently deleted successfully", { count: deletedItems.count }));
  } catch (err: unknown) {
    // ! [ERROR] Return error response
    let errorMessage = "An unexpected error occurred while hard-deleting all items";
    if (err instanceof Error) {
      errorMessage = err.message;
      error(`Error hard-deleting all items: ${errorMessage}`);
    } else {
      error(`Error hard-deleting all items: ${JSON.stringify(err)}`);
    }
    res.status(500).json(errorResponse(errorMessage));

    // ! [ERROR] Forward to global error handler
    next(err);
  }
});

// * [DELETE] Delete Item (Hard)
// ? /api/items/:id/hard
router.delete('/:id/hard', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    // [1] Delete item
    const deletedItem = await prisma.item.delete({
      where: { id: Number(id) }
    });

    // * [SUCCESS] Item hard-deleted
    info(`Hard-deleted item with id ${id}`);
    res.json(successResponse("Item permanently deleted successfully", deletedItem));
  } catch (err: unknown) {
    // ! [ERROR] Return error response
    let errorMessage = "An unexpected error occurred while hard-deleting item";
    if (err instanceof Error) {
      errorMessage = err.message;
      error(`Error hard-deleting item with id ${id}: ${errorMessage}`);
    } else {
      error(`Error hard-deleting item with id ${id}: ${JSON.stringify(err)}`);
    }
    res.status(500).json(errorResponse(errorMessage));

    // ! [ERROR] Forward to global error handler
    next(err);
  }
});

// * [DELETE] Delete Item (Soft Delete)
// ? /api/items/:id
router.delete('/:id', verifyRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  // ! [ERROR] Invalid item id
  if (!id || isNaN(Number(id))) {
    return res.status(400).json(errorResponse("Invalid item id"));
  }

  try {
    // [1] Soft-delete item
    const deletedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: { isActive: false }
    });

    // * [SUCCESS] Item soft-deleted
    info(`Soft-deleted item with id ${id}`);
    res.json(successResponse("Item deleted successfully", deletedItem));
  } catch (err: unknown) {
    let errorMessage = "An unexpected error occurred while deleting item";
    if (err instanceof Error) {
      errorMessage = err.message;
      error(`Error deleting item with id ${id}: ${errorMessage}`);
    } else {
      error(`Error deleting item with id ${id}: ${JSON.stringify(err)}`);
    }
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

export const itemRoutes = router;