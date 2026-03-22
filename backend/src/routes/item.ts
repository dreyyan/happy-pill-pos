// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../utils/response';
import { error, info } from '../utils/logger';

const router = Router();

// * [GET] Get All Items
// ? /api/items/
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, category, isActive } = req.query;

        // [1] Build filters
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filters: any = {};
        if (search) {
            filters.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { sku: { contains: String(search), mode: 'insensitive' } },
                { barcode: { contains: String(search), mode: 'insensitive' } }
            ];
        }
        if (category) filters.category = String(category);
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        // [2] Fetch items with only necessary info
        const items = await prisma.item.findMany({
            where: filters,
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
                }
            },
            orderBy: { name: 'asc' }
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
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
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
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, sku, barcode, price, cost, quantity, category, unit, reorderLevel, isActive, createdById } = req.body;
    try {
        const newItem = await prisma.item.create({
            data: {
                name,
                description,
                sku,
                barcode,
                price,
                cost,
                quantity,
                category,
                unit,
                reorderLevel,
                isActive,
                createdById,
            }
        });

        info(`Created new item: ${name}`);
        res.status(201).json(successResponse("Item created successfully", newItem));
    } catch (err: unknown) {
        // ! [ERROR] Return error response
        let errorMessage = "An unexpected error occurred while creating item";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error creating item ${name}: ${errorMessage}`);
        } else {
            error(`Error creating item ${name}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [POST] Auto-Create Items
// ? /api/items/auto-create
router.post('/auto-create', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] List of all items to auto-create
        const itemsToCreate = [
            { name: "Ham Sandwich", sku: "FOO-DES-HSW", price: 129.00, cost: 62.80, quantity: 0, category: "Food", subcategory: "Desserts", unit: "1 serv." },
            { name: "Spaghetti w/ Garlic Bread", sku: "FOO-DES-SGB", price: 129.00, cost: 63.20, quantity: 0, category: "Food", subcategory: "Desserts", unit: "1 serv." },
            { name: "Tiramisu", sku: "FOO-DES-TRM", price: 129.00, cost: 70.40, quantity: 0, category: "Food", subcategory: "Desserts", unit: "1 serv." },
            { name: "Waffle w/ Toppings", sku: "FOO-DES-WWT", price: 69.00, cost: 34.60, quantity: 0, category: "Food", subcategory: "Desserts", unit: "1 serv." },
            { name: "Chicken Pop w/ Fries", sku: "FOO-DES-CPF", price: 229.00, cost: 82.30, quantity: 0, category: "Food", subcategory: "Desserts", unit: "1 serv." },
            { name: "Chicken Alfredo w/ Garlic Bread", sku: "FOO-DES-CAG", price: 159.00, cost: 85.38, quantity: 0, category: "Food", subcategory: "Desserts", unit: "1 serv." },
            { name: "Chicken Skin", sku: "FOO-APP-CKS", price: 229.00, cost: 114.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Street Food Platter", sku: "FOO-APP-SFP", price: 129.00, cost: 64.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Nachos", sku: "FOO-APP-NCH", price: 229.00, cost: 114.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Cheese Sticks", sku: "FOO-APP-CST", price: 129.00, cost: 64.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Lumpia Shanghai", sku: "FOO-APP-LSH", price: 129.00, cost: 64.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "French Fries", sku: "FOO-APP-FFR", price: 129.00, cost: 64.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Cheesy Fries", sku: "FOO-APP-CSF", price: 139.00, cost: 69.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Sour Cream Fries", sku: "FOO-APP-SCF", price: 139.00, cost: 69.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "BBQ Fries", sku: "FOO-APP-BBF", price: 139.00, cost: 69.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Mojos", sku: "FOO-APP-MOJ", price: 129.00, cost: 64.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Cheesy Mojos", sku: "FOO-APP-CMJ", price: 139.00, cost: 69.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Sour Cream Mojos", sku: "FOO-APP-SMJ", price: 139.00, cost: 69.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "BBQ Mojos", sku: "FOO-APP-BMJ", price: 139.00, cost: 69.50, quantity: 0, category: "Food", subcategory: "Appetizers", unit: "1 serv." },
            { name: "Hot Americano", sku: "DRK-HCF-HAM", price: 99.00, cost: 49.50, quantity: 0, category: "Drinks", subcategory: "Hot Coffee", unit: "8 oz." },
            { name: "Hot Latte", sku: "DRK-HCF-HLT", price: 119.00, cost: 59.50, quantity: 0, category: "Drinks", subcategory: "Hot Coffee", unit: "8 oz." },
            { name: "Hot Vanilla Latte", sku: "DRK-HCF-HVL", price: 129.00, cost: 64.50, quantity: 0, category: "Drinks", subcategory: "Hot Coffee", unit: "8 oz." },
            { name: "Hot Caramel Latte", sku: "DRK-HCF-HCL", price: 129.00, cost: 64.50, quantity: 0, category: "Drinks", subcategory: "Hot Coffee", unit: "8 oz." },
            { name: "Hot Mocha", sku: "DRK-HCF-HMC", price: 129.00, cost: 64.50, quantity: 0, category: "Drinks", subcategory: "Hot Coffee", unit: "8 oz." },
            { name: "Hot Chocolate", sku: "DRK-HCF-HCH", price: 109.00, cost: 54.50, quantity: 0, category: "Drinks", subcategory: "Hot Coffee", unit: "8 oz." },
            { name: "Hot Spanish Latte", sku: "DRK-HCF-HSL", price: 129.00, cost: 64.50, quantity: 0, category: "Drinks", subcategory: "Hot Coffee", unit: "12 oz." },
            { name: "Iced Americano", sku: "DRK-CCF-IAM", price: 109.00, cost: 54.50, quantity: 0, category: "Drinks", subcategory: "Cold Coffee", unit: "16 oz." },
            { name: "Iced Latte", sku: "DRK-CCF-ILA", price: 129.00, cost: 64.50, quantity: 0, category: "Drinks", subcategory: "Cold Coffee", unit: "16 oz." },
            { name: "Iced Caramel Latte", sku: "DRK-CCF-ICL", price: 149.00, cost: 74.50, quantity: 0, category: "Drinks", subcategory: "Cold Coffee", unit: "16 oz." },
            { name: "Iced Vanilla Latte", sku: "DRK-CCF-IVL", price: 149.00, cost: 74.50, quantity: 0, category: "Drinks", subcategory: "Cold Coffee", unit: "16 oz." },
            { name: "Iced Mocha", sku: "DRK-CCF-IMC", price: 149.00, cost: 74.50, quantity: 0, category: "Drinks", subcategory: "Cold Coffee", unit: "16 oz." },
            { name: "Iced Spanish Latte", sku: "DRK-CCF-ISL", price: 139.00, cost: 69.50, quantity: 0, category: "Drinks", subcategory: "Cold Coffee", unit: "16 oz." },
            { name: "Hazelnut Frappe", sku: "DRK-FRP-HZF", price: 169.00, cost: 84.50, quantity: 0, category: "Drinks", subcategory: "Frappe", unit: "16 oz." },
            { name: "Butterscotch Frappe", sku: "DRK-FRP-BSF", price: 149.00, cost: 74.50, quantity: 0, category: "Drinks", subcategory: "Frappe", unit: "16 oz." },
            { name: "Vanilla Frappe", sku: "DRK-FRP-VNF", price: 149.00, cost: 74.50, quantity: 0, category: "Drinks", subcategory: "Frappe", unit: "16 oz." },
            { name: "Mocha Frappe", sku: "DRK-FRP-MCF", price: 119.00, cost: 59.50, quantity: 0, category: "Drinks", subcategory: "Frappe", unit: "16 oz." },
            { name: "Biscoff Frappe", sku: "DRK-FRP-BCF", price: 189.00, cost: 94.50, quantity: 0, category: "Drinks", subcategory: "Frappe", unit: "16 oz." },
            { name: "Strawberry Frappe", sku: "DRK-FRP-SBF", price: 129.00, cost: 64.50, quantity: 0, category: "Drinks", subcategory: "Frappe", unit: "16 oz." },
            { name: "Cookies and Cream Frappe", sku: "DRK-FRP-CCF", price: 159.00, cost: 79.50, quantity: 0, category: "Drinks", subcategory: "Frappe", unit: "16 oz." },
            { name: "Matcha Frappe", sku: "DRK-FRP-MTF", price: 129.00, cost: 64.50, quantity: 0, category: "Drinks", subcategory: "Frappe", unit: "16 oz." },
            { name: "Coffee Cooler", sku: "DRK-COO-CCO", price: 149.00, cost: 74.50, quantity: 0, category: "Drinks", subcategory: "Cooler", unit: "16 oz." },
            { name: "Mocha Cooler", sku: "DRK-COO-MCO", price: 159.00, cost: 79.50, quantity: 0, category: "Drinks", subcategory: "Cooler", unit: "16 oz." },
            { name: "Snickers Mocha Cooler", sku: "DRK-COO-SMC", price: 179.00, cost: 89.50, quantity: 0, category: "Drinks", subcategory: "Cooler", unit: "16 oz." },
            { name: "Camper Mocha Cooler", sku: "DRK-COO-CMC", price: 179.00, cost: 89.50, quantity: 0, category: "Drinks", subcategory: "Cooler", unit: "16 oz." },
            { name: "Caramel Cooler", sku: "DRK-COO-CRC", price: 159.00, cost: 79.50, quantity: 0, category: "Drinks", subcategory: "Cooler", unit: "16 oz." },
            { name: "Vanilla Cooler", sku: "DRK-COO-VCO", price: 159.00, cost: 79.50, quantity: 0, category: "Drinks", subcategory: "Cooler", unit: "16 oz." },
            { name: "White Rabbit Cooler", sku: "DRK-COO-WRC", price: 149.00, cost: 74.50, quantity: 0, category: "Drinks", subcategory: "Cooler", unit: "16 oz." },
            { name: "Cucumber Shake", sku: "DRK-SHK-CSH", price: 119.00, cost: 59.50, quantity: 0, category: "Drinks", subcategory: "Shakes", unit: "16 oz." },
            { name: "Mango Shake", sku: "DRK-SHK-MSH", price: 119.00, cost: 59.50, quantity: 0, category: "Drinks", subcategory: "Shakes", unit: "16 oz." },
            { name: "Mango Graham Shake", sku: "DRK-SHK-MGS", price: 119.00, cost: 59.50, quantity: 0, category: "Drinks", subcategory: "Shakes", unit: "16 oz." },
            { name: "Strawberry Shake", sku: "DRK-SHK-SSH", price: 119.00, cost: 59.50, quantity: 0, category: "Drinks", subcategory: "Shakes", unit: "16 oz." },
            { name: "Cookies and Cream Shake", sku: "DRK-SHK-CCS", price: 119.00, cost: 59.50, quantity: 0, category: "Drinks", subcategory: "Shakes", unit: "16 oz." },
            { name: "Milo Lava", sku: "DRK-MLK-MLL", price: 159.00, cost: 81.00, quantity: 0, category: "Drinks", subcategory: "Milk", unit: "16 oz." },
            { name: "Traditional Coffee Milk", sku: "DRK-MLK-TCM", price: 149.00, cost: 76.00, quantity: 0, category: "Drinks", subcategory: "Milk", unit: "16 oz." },
            { name: "Iced Cookies and Cream Cocoa Milk", sku: "DRK-MLK-ICM", price: 139.00, cost: 71.00, quantity: 0, category: "Drinks", subcategory: "Milk", unit: "16 oz." },
            { name: "Iced Oreo Cocoa Milk", sku: "DRK-MLK-IOM", price: 139.00, cost: 71.00, quantity: 0, category: "Drinks", subcategory: "Milk", unit: "16 oz." },
            { name: "Royal Sakto", sku: "DRK-SFD-RSA", price: 29.00, cost: 14.50, quantity: 0, category: "Drinks", subcategory: "Soft Drinks", unit: "200 mL" },
            { name: "Sprite Sakto", sku: "DRK-SFD-SSA", price: 29.00, cost: 14.50, quantity: 0, category: "Drinks", subcategory: "Soft Drinks", unit: "200 mL" },
            { name: "Coke Sakto", sku: "DRK-SFD-CSA", price: 29.00, cost: 14.50, quantity: 0, category: "Drinks", subcategory: "Soft Drinks", unit: "200 mL" },
            { name: "Bottled Water", sku: "DRK-OTH-BW5", price: 34.00, cost: 17.00, quantity: 0, category: "Drinks", subcategory: "Others", unit: "500 mL" },
            { name: "Bottled Water", sku: "DRK-OTH-BW1", price: 29.00, cost: 14.50, quantity: 0, category: "Drinks", subcategory: "Others", unit: "1 L" },
        ];

        // [2] Insert all items into DB
        const createdItems = await prisma.item.createMany({
            data: itemsToCreate,
            skipDuplicates: true, // avoids creating items with duplicate SKUs
        });

        info(`Auto-created ${itemsToCreate.length} items`);
        res.status(201).json(successResponse("Items auto-created successfully", { count: createdItems.count }));
    } catch (err: unknown) {
        let errorMessage = "An unexpected error occurred while auto-creating items";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error auto-creating items: ${errorMessage}`);
        } else {
            error(`Error auto-creating items: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));
        next(err);
    }
});

// * [PUT] Update Item
// ? /api/items/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const updatedItem = await prisma.item.update({
            where: { id: Number(id) },
            data: updateData
        });

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

// * [DELETE] Delete Item (Soft Delete => isActive)
// ? /api/items/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const deletedItem = await prisma.item.update({
            where: { id: Number(id) },
            data: { isActive: false }
        });

        info(`Soft-deleted item with id ${id}`);
        res.json(successResponse("Item deleted successfully", deletedItem));
    } catch (err: unknown) {
        // ! [ERROR] Return error response
        let errorMessage = "An unexpected error occurred while deleting item";
        if (err instanceof Error) {
            errorMessage = err.message;
            error(`Error deleting item with id ${id}: ${errorMessage}`);
        } else {
            error(`Error deleting item with id ${id}: ${JSON.stringify(err)}`);
        }
        res.status(500).json(errorResponse(errorMessage));

        // ! [ERROR] Forward to global error handler
        next(err);
    }
});

// * [DELETE] Delete Item (Hard)
// ? /api/items/:id/hard
router.delete('/:id/hard', async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const deletedItem = await prisma.item.delete({
            where: { id: Number(id) }
        });

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

// * [DELETE] Delete All Items (Hard)
// ? /api/items/hard-delete-all
router.delete('/hard-delete-all', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // [1] Delete all items
        const deletedItems = await prisma.item.deleteMany({});

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

export const itemRoutes = router;