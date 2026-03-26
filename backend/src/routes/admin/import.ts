// [IMPORT] Setup
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

// [IMPORT] Helpers
import { successResponse, errorResponse } from '../../utils/response';
import { hashPassword } from '../../utils/auth';
import { info } from '../../utils/logger';

// [IMPORT] Middleware
import { verifyRole } from '../../middleware/authMiddleware';

// [IMPORT] CSV Parser
import multer from 'multer';
import { parse } from "csv-parse/sync";
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });

const router = Router();

// ? [INTERFACE]
interface CsvUserRow {
  Name?: string;
  name?: string;
  Email?: string;
  email?: string;
  Role?: string;
  role?: string;
}

// * [POST] Import Users via CSV
// ? /api/admin/import-users
router.post('/', verifyRole(['ADMIN']), upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ! [ERROR] No .csv file uploaded
    if (!req.file) {
      console.error("[CSV IMPORT] No file uploaded");
      return res.status(400).json(errorResponse("CSV file is required"));
    }

    // [1] Read file content
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    console.log("[CSV IMPORT] File read successfully:\n", fileContent);

    // [2] Parse CSV synchronously with comma delimiter
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
    }) as CsvUserRow[];
    console.log(`[CSV IMPORT] Parsed ${records.length} records`);

    let createdCount = 0;

    // [2.1] Track duplicates inside CSV (case-insensitive)
    const seenEmails = new Set<string>();

    // [3] Process each record sequentially
    for (const [index, row] of records.entries()) {
      console.log(`[CSV IMPORT] Processing row ${index + 1}:`, row);

      const name = row['Name']?.trim() || row['name']?.trim();

      // [3.1] Normalize email (trim + lowercase + remove hidden spaces)
      const rawEmail = row['Email'] || row['email'] || "";
      const email = rawEmail.trim().toLowerCase();

      const roleRaw = row['Role']?.trim() || row['role']?.trim();

      // ! [ERROR] Missing required fields: name, role, email
      if (!name || !roleRaw || !email) {
        console.warn(`[CSV IMPORT] Skipping row ${index + 1}: missing required fields`);
        continue;
      }

      // ! [ERROR] Duplicate email inside CSV
      if (seenEmails.has(email)) {
        console.warn(`[CSV IMPORT] Skipping row ${index + 1}: duplicate email in CSV "${email}"`);
        continue;
      }
      seenEmails.add(email);

      // ! [ERROR] Invalid role
      const role = roleRaw.toUpperCase();
      if (role !== "ADMIN" && role !== "CASHIER") {
        console.warn(`[CSV IMPORT] Skipping row ${index + 1}: invalid role "${roleRaw}"`);
        continue;
      }

      const [firstName, ...lastParts] = name.split(" ");
      const lastName = lastParts.join(" ") || "";

      // ? [WARN] Skip import for already existing users in DB
      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        console.warn(`[CSV IMPORT] Skipping row ${index + 1}: email "${email}" already exists`);
        continue;
      }

      // [4] Use default password "password123"
      const defaultPassword = "password123";
      const hashedPassword = await hashPassword(defaultPassword, 10);

      // [5] Create user
      try {
        await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role,
            isActive: true,
            admin: role === "ADMIN" ? { create: {} } : undefined,
            cashier: role === "CASHIER" ? { create: {} } : undefined,
          },
        });

        // * [SUCCESS] User created
        console.log(`[CSV IMPORT] Created user: ${email} (${role})`);
        createdCount++;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (createErr: any) {

        // ! [ERROR] Handle unique constraint violation (race-condition safe)
        if (createErr?.code === "P2002") {
          console.warn(`[CSV IMPORT] Skipping row ${index + 1}: duplicate email "${email}" (DB constraint)`);
          continue;
        }

        console.error(`[CSV IMPORT] Failed to create user "${email}":`, createErr);
      }
    }

    // [6] Delete uploaded file
    fs.unlinkSync(req.file.path);
    console.log("[CSV IMPORT] Deleted uploaded file");

    // * [SUCCESS] Users imported
    info(`Imported ${createdCount} users from CSV`);
    res.json(successResponse(`Successfully imported ${createdCount} users`, { createdCount }));

  } catch (err: unknown) {
    let errorMessage = "Error importing users";
    if (err instanceof Error) errorMessage = err.message;

    console.error(`[CSV IMPORT] CSV import error: ${errorMessage}`);
    res.status(500).json(errorResponse(errorMessage));
    next(err);
  }
});

export const importRoutes = router;