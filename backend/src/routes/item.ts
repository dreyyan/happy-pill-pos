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
router.post("/import-items", verifyRole(['ADMIN']), upload.single("file"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ! [ERROR] No .csv file uploaded
    if (!req.file) return res.status(400).json(errorResponse("CSV file is required"));

    // [1] Read file content
    const fileContent = fs.readFileSync(req.file.path, "utf-8");
    info(`[CSV IMPORT] File read successfully:\n${fileContent}`);

    // [2] Parse CSV synchronously with tab delimiter
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ","
    }) as CsvProductRow[];
    info(`[CSV IMPORT] Parsed ${records.length} records`);

    let createdCount = 0;

    // [3] Process each record
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      info(`[CSV IMPORT] Processing row ${i + 1}: ${row}`);

      const name = row["Name"]?.trim();
      const sku = row["SKU"]?.trim();
      const price = parseFloat(row["Selling Price"]);
      const cost = parseFloat(row["Cost"]);
      const quantity = parseInt(row["Quantity"]) || 0;
      const categoryName = row["Category"]?.trim();
      const subcategoryName = row["Subcategory"]?.trim();
      const unit = row["Unit"]?.trim();

      // ! [ERROR] Missing required fields: name, SKU, price, category, subcategory
      if (!name || !sku || isNaN(price) || !categoryName || !subcategoryName) {
        info(`[CSV IMPORT] Skipping row ${i + 1}: missing required fields`);
        continue;
      }

      // [4] Check if item SKU already exists
      const existing = await prisma.item.findUnique({ where: { sku } });
      if (existing) {
        info(`[CSV IMPORT] Skipping row ${i + 1}: SKU ${sku} already exists`);
        continue;
      }

      // [5] Fetch category
      let category = await prisma.category.findUnique({ where: { name: categoryName } });
      if (!category) {
        category = await prisma.category.create({ data: { name: categoryName } });
        info(`[CSV IMPORT] Created new category: ${categoryName}`);
      }

      // [6] Fetch subcategory
      let subcategory = await prisma.subcategory.findUnique({
        where: { name_categoryId: { name: subcategoryName, categoryId: category.id } }
      });
      
      // [7] Create subcategory if non-existing
      if (!subcategory) {
        subcategory = await prisma.subcategory.create({
          data: { name: subcategoryName, categoryId: category.id }
        });
        info(`[CSV IMPORT] Created new subcategory: ${subcategoryName}`);
      }

      // [7] Create item
      await prisma.item.create({
        data: {
          name,
          sku,
          price,
          cost,
          quantity,
          unit,
          categoryId: category.id,
          subcategoryId: subcategory.id,
          isActive: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createdById: (req as any).user.userId
        }
      });

      createdCount++;
    }

    // [8] Delete uploaded file
    fs.unlinkSync(req.file.path);
    info(`[CSV IMPORT] Deleted uploaded file`);

    // * [SUCCESS] Items imported
    info(`[INFO] Imported ${createdCount} items from CSV`);
    res.json(successResponse(`Successfully imported ${createdCount} items`, { createdCount }));
  } catch (err: unknown) {
    let errorMessage = "Error importing items";
    if (err instanceof Error) errorMessage = err.message;
    error(`[CSV IMPORT ERROR] ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

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
        { sku:  { contains: String(search), mode: "insensitive" } },
        { barcode: { contains: String(search), mode: "insensitive" } },
    ];
    }

    // [2] Filter by categoryId (not category object)
    if (category) filters.categoryId = Number(category);

    // [3] Filter by active status
    if (isActive !== undefined) filters.isActive = isActive === "true";

    // [4] Fetch items
    const items = await prisma.item.findMany({
    where: filters,
    include: {
        category: true,
        subcategory: true,
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        updatedBy: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { name: "asc" },
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