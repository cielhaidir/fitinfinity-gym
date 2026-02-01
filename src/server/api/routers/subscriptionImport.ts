import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";
import { format, parse } from "date-fns";
import { logApiMutationAsync, extractIpAddress, extractUserAgent } from "@/server/utils/mutationLogger";

// Error codes enum
export const ImportErrorCode = {
  E_REQUIRED: "E_REQUIRED",
  E_INVALID_PACKAGE: "E_INVALID_PACKAGE",
  E_INVALID_TRAINER: "E_INVALID_TRAINER",
  E_INVALID_FC: "E_INVALID_FC",
  E_DATE_FORMAT: "E_DATE_FORMAT",
  E_MISSING_ANCHOR_NOMINAL: "E_MISSING_ANCHOR_NOMINAL",
  E_CONFLICT_NOMINAL: "E_CONFLICT_NOMINAL",
  E_DUP_NOMINAL_IGNORED: "E_DUP_NOMINAL_IGNORED",
  E_NET_MISMATCH: "E_NET_MISMATCH",
  E_NEGATIVE_ALLOCATION: "E_NEGATIVE_ALLOCATION",
  E_DUPLICATE_SUBSCRIPTION: "E_DUPLICATE_SUBSCRIPTION",
  E_INVALID_PAYMENT_METHOD: "E_INVALID_PAYMENT_METHOD",
} as const;

type ImportError = {
  code: string;
  message: string;
  rowNumber?: number;
};

type ImportWarning = ImportError;

// Type definitions
type ParsedRow = {
  rowNumber: number;
  tanggal: string;
  nama: string;
  membership: string;
  start?: string;
  disc?: number;
  nominal?: number;
  ptSession?: string;
  payment: string;
  fc: string;
  id?: string;
};

type ValidatedRow = {
  rowNumber: number;
  nama: string;
  packageLabel: string;
  packageId?: string;
  packageType?: "GYM_MEMBERSHIP" | "PERSONAL_TRAINER";
  trainerToken?: string;
  trainerId?: string;
  fcName: string;
  fcId?: string;
  balanceAccountId?: number;
  startDate?: Date;
  allocation?: number;
  point?: number;
  errors: string[];
  warnings: string[];
};

type Batch = {
  batchId: string;
  memberName: string;
  anchorRow: number;
  discountPercent: number;
  baseSum: number;
  netTotal: number;
  recomputedNet: number;
  rows: ValidatedRow[];
  errors: string[];
  warnings: string[];
  userId?: string;
  isPlaceholder: boolean;
};

// Mapping types
type PackageMapping = {
  id: string;
  name: string;
  type: "GYM_MEMBERSHIP" | "PERSONAL_TRAINER";
  sessions?: number;
  day?: number;
  price: number;
  point: number;
};

type TrainerMapping = Record<string, string>;
type FcMapping = Record<string, string>;
type BalanceAccountMapping = Record<string, number>;

// Helper: Parse currency string to number
function parseCurrency(value: any): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  
  // Remove "Rp", spaces, commas, dots (thousands separator)
  const cleaned = value.replace(/Rp|\.|\s/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}
function parseDate(value: any): Date | null {
  if (!value) return null;

  // Jika sudah Date, langsung kembalikan
  if (value instanceof Date) return value;

  // Jika value numerik (Excel serial date)
  if (!isNaN(value) && Number(value) > 10000 && Number(value) < 60000) {
    // Excel epoch: 1 Jan 1900 = 1
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (Number(value) - 2) * 86400000);
    // (minus 2 karena Excel bug tahun kabisat 1900)
    return date;
  }

  const str = String(value).trim();

  // Format teks biasa
  for (const fmt of [
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "d/M/yyyy",
    "dd-MMM",
    "d/M/yy",
    "dd/M/yy",
  ]) {
    try {
      const date = parse(str, fmt, new Date());
      if (!isNaN(date.getTime())) return date;
    } catch {}
  }

  return null;
}


// Helper: Generate slug for email
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^\w.-]/g, "")
    .substring(0, 50);
}

// Helper: Allocate discount proportionally
function allocateDiscount(
  netTotal: number,
  prices: number[]
): { allocations: number[]; remainder: number } {
  const baseSum = prices.reduce((sum, p) => sum + p, 0);
  if (baseSum === 0) {
    return { allocations: prices.map(() => 0), remainder: 0 };
  }
  
  const allocations: number[] = [];
  let runningSum = 0;
  
  for (let i = 0; i < prices.length - 1; i++) {
    const alloc = Math.round((netTotal * (prices[i] ?? 0)) / baseSum);
    allocations.push(alloc);
    runningSum += alloc;
  }
  
  // Last allocation gets the remainder
  const lastAlloc = netTotal - runningSum;
  allocations.push(lastAlloc);
  
  return { allocations, remainder: netTotal - allocations.reduce((s, a) => s + a, 0) };
}

export const subscriptionImportRouter = createTRPCRouter({
  preview: permissionProtectedProcedure(["list:subscription"])
    .input(
      z.object({
        fileBase64: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        // Decode base64
        const buffer = Buffer.from(input.fileBase64, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No sheets found in Excel file",
          });
        }
        
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Worksheet not found",
          });
        }
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });
        
        // Hardcoded PT trainer mappings (token -> personalTrainer.id)
        const trainerByToken: TrainerMapping = {
          "ADI": "cmc9v0x0y000klqj3gm6jquk2",
          "MIAN": "cmc2pi2hf000mfciwv0654ypp",
          "ARDI": "cmh4awpfu02cuh0rbqvv5dvgn",
          "EGI": "cmewvlhq500d4fh6g9l6te6uk",
          "SRI": "cmewvlyrb00d9fh6ghbreee7d",
        };
        
        // Hardcoded FC mappings (name -> fc.id)
        // Note: PT trainers can also act as FCs, so we include them here
        const fcByName: FcMapping = {
          "EVI": "cmc2pijjq000qfciwqh69gz28",
          "EVE": "cmc2pijjq000qfciwqh69gz28", // Typo variation
          "RAHMAN": "cmc9xd0010015lqj3qub4qbip",
          "RAHMNA": "cmc9xd0010015lqj3qub4qbip", // Typo variation
          "AYU": "cmh03tjq90003jbllttdy1d3h",
          "INDAR": "cmh03tsg00007jbll1jgsxrj8",
          "HARNI": "cmh4dbok102f0h0rbmu5rv8bk",
          "LIA": "cmh9wwsds01mgjy8gxujwpiaz",
          // PT trainers can also be FCs (using their personalTrainer.id as fcId)
          "ADI": "cmc9v0x0y000klqj3gm6jquk2",
          "MIAN": "cmc2pi2hf000mfciwv0654ypp",
          "ARDI": "cmh4awpfu02cuh0rbqvv5dvgn",
          "EGI": "cmewvlhq500d4fh6g9l6te6uk",
          "SRI": "cmewvlyrb00d9fh6ghbreee7d",
        };
        
        // Hardcoded mappings from package.md and payment.md
        const packages = [
          { id: "cmh4b2enn02cvh0rbfcny686o", name: "MEMBERSHIP 1 BULAN", price: 500000, type: "GYM_MEMBERSHIP", sessions: null, day: 30, point: 50 },
          { id: "cmdwiw0ai017zmeo0k4h6wedh", name: "MEMBERSHIP 3 BULAN", price: 1450000, type: "GYM_MEMBERSHIP", sessions: null, day: 90, point: 140 },
          { id: "cmdwj0iph0180meo0m5npzizj", name: "MEMBERSHIP 6 BULAN", price: 2400000, type: "GYM_MEMBERSHIP", sessions: null, day: 180, point: 240 },
          { id: "cmdwj2rn40185meo0lx7jmuup", name: "MEMBERSHIP 12 BULAN", price: 4200000, type: "GYM_MEMBERSHIP", sessions: null, day: 365, point: 420 },
          { id: "cmdwj6btz0186meo0ywup8p9j", name: "PT 8 SESI", price: 2000000, type: "PERSONAL_TRAINER", sessions: 8, day: 35, point: 200 },
          { id: "cmdwjjvw9018emeo0tq73xfh3", name: "PT 16 SESI", price: 3500000, type: "PERSONAL_TRAINER", sessions: 16, day: 70, point: 350 },
          { id: "cmdwjkqs2018fmeo0m1c8y7bl", name: "PT 24 SESI", price: 4900000, type: "PERSONAL_TRAINER", sessions: 24, day: 105, point: 490 },
          { id: "cmdwjoshf018gmeo0ucskzdjj", name: "PT 36 SESI", price: 6700000, type: "PERSONAL_TRAINER", sessions: 36, day: 140, point: 670 },
          { id: "cmdwjpqan018hmeo0fw2zkify", name: "PT 48 SESI", price: 8550000, type: "PERSONAL_TRAINER", sessions: 48, day: 175, point: 850 },
          { id: "cmh06onhq001sh0rbct4pxkps", name: "PT 75 SESI", price: 13125000, type: "PERSONAL_TRAINER", sessions: 75, day: 365, point: 130 },
        ];
        
        const balanceAccounts = [
          { id: 1, name: "Cash" },
          { id: 2, name: "BRI" },
          { id: 3, name: "BNI" },
          { id: 4, name: "MANDIRI" },
          { id: 5, name: "BCA" },
          { id: 6, name: "CIMB" },
        ];
        
        // Build mapping dictionaries
        const packageByLabel: Record<string, PackageMapping> = {};
        packages.forEach((pkg) => {
          const normalizedName = pkg.name.toUpperCase().trim();
          packageByLabel[normalizedName] = {
            id: pkg.id,
            name: pkg.name,
            type: pkg.type as "GYM_MEMBERSHIP" | "PERSONAL_TRAINER",
            sessions: pkg.sessions || undefined,
            day: pkg.day || undefined,
            price: pkg.price,
            point: pkg.point,
          };
          
          // Add variations for common naming patterns
          // For "1 BULAN" also accept "MEMBERSHIP 1 BULAN"
          if (normalizedName.includes("BULAN") && !normalizedName.includes("MEMBERSHIP")) {
            packageByLabel[`MEMBERSHIP ${normalizedName}`] = packageByLabel[normalizedName]!;
          }
          
          // For "PT 4" also accept "PT 4 SESI"
          if (normalizedName.startsWith("PT ") && !normalizedName.includes("SESI")) {
            packageByLabel[`${normalizedName} SESI`] = packageByLabel[normalizedName]!;
          }
        });
        
        const balanceAccountByMethod: BalanceAccountMapping = {};
        balanceAccounts.forEach((ba) => {
          balanceAccountByMethod[ba.name.toUpperCase().trim()] = ba.id;
        });
        
        // Parse rows
        const parsedRows: ParsedRow[] = rawData.map((row, idx) => {
          // Normalize column names by trimming spaces and creating aliases
          const normalizedRow: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            const trimmedKey = String(key).trim();
            normalizedRow[trimmedKey] = value;
            normalizedRow[key] = value; // Keep original key as well
          }
          
          const nominal = parseCurrency(normalizedRow["NOMINAL"] || normalizedRow["nominal"]);
          console.log(`Row ${idx + 2}: ${normalizedRow["NAMA"]}, NOMINAL raw: ${normalizedRow["NOMINAL"]}, parsed: ${nominal}`);
          return {
            rowNumber: idx + 2, // Excel row number (header is row 1)
            tanggal: String(normalizedRow["TANGGAL"] || normalizedRow["tanggal"] || ""),
            nama: String(normalizedRow["NAMA"] || normalizedRow["nama"] || ""),
            membership: String(normalizedRow["MEMBERSHIP (START)"] || normalizedRow["MEMBERSHIP"] || normalizedRow["membership"] || ""),
            start: normalizedRow["START"] || normalizedRow["start"] ? String(normalizedRow["START"] || normalizedRow["start"]) : undefined,
            disc: normalizedRow["Disc"] || normalizedRow["disc"] ? Number(normalizedRow["Disc"] || normalizedRow["disc"]) : undefined,
            nominal,
            ptSession: normalizedRow["PT SESSION"] || normalizedRow["pt session"] ? String(normalizedRow["PT SESSION"] || normalizedRow["pt session"]) : undefined,
            payment: String(normalizedRow["PAYMENT"] || normalizedRow["payment"] || ""),
            fc: String(normalizedRow["FC"] || normalizedRow["fc"] || ""),
            id: normalizedRow["ID"] || normalizedRow["id"] ? String(normalizedRow["ID"] || normalizedRow["id"]) : undefined,
          };
        });
        
        // Group into batches
        const batches: Batch[] = [];
        let currentBatch: Batch | null = null;
        
        for (const row of parsedRows) {
          // Skip empty rows
          if (!row.nama && !row.membership) continue;
          
          // Check if this is an anchor row (has NOMINAL)
          if (row.nominal !== undefined && row.nominal > 0) {
            // Save previous batch if exists
            if (currentBatch) {
              batches.push(currentBatch);
            }
            
            // Start new batch
            currentBatch = {
              batchId: `batch-${batches.length + 1}`,
              memberName: row.nama,
              anchorRow: row.rowNumber,
              discountPercent: row.disc || 0,
              baseSum: 0,
              netTotal: row.nominal,
              recomputedNet: 0,
              rows: [],
              errors: [],
              warnings: [],
              isPlaceholder: !row.id,
              userId: row.id,
            };
          } else if (currentBatch && row.nama === currentBatch.memberName) {
            // Attach to current batch
            // Check for duplicate NOMINAL
            if (row.nominal && row.nominal === currentBatch.netTotal) {
              currentBatch.warnings.push(ImportErrorCode.E_DUP_NOMINAL_IGNORED);
            } else if (row.nominal && row.nominal !== currentBatch.netTotal) {
              currentBatch.errors.push(ImportErrorCode.E_CONFLICT_NOMINAL);
            }
          } else {
            // New member without NOMINAL - error
            if (currentBatch) {
              batches.push(currentBatch);
            }
            currentBatch = null;
            continue;
          }
          
          if (!currentBatch) continue;
          
          // Validate and transform row
          const validatedRow: ValidatedRow = {
            rowNumber: row.rowNumber,
            nama: row.nama,
            packageLabel: row.membership.trim(),
            errors: [],
            warnings: [],
            fcName: row.fc.trim(),
            point: 0,
          };
          
          // Validate package
          const pkgKey = row.membership.toUpperCase().trim();
          const pkg = packageByLabel[pkgKey];
          if (!pkg) {
            validatedRow.errors.push(ImportErrorCode.E_INVALID_PACKAGE);
          } else {
            validatedRow.packageId = pkg.id;
            validatedRow.packageType = pkg.type;
            validatedRow.point = pkg.point;
            currentBatch.baseSum += pkg.price;
          }
          
          // Parse date
          const startDate = parseDate(row.start) || parseDate(row.tanggal);
          if (!startDate) {
            validatedRow.errors.push(ImportErrorCode.E_DATE_FORMAT);
          } else {
            validatedRow.startDate = startDate;
          }
          
          // Validate trainer for PT packages
          if (pkg?.type === "PERSONAL_TRAINER" && row.ptSession) {
            const trainerToken = row.ptSession.toUpperCase().trim();
            const trainerId = trainerByToken[trainerToken];
            if (!trainerId) {
              validatedRow.errors.push(ImportErrorCode.E_INVALID_TRAINER);
            } else {
              validatedRow.trainerId = trainerId;
              validatedRow.trainerToken = trainerToken;
            }
          }
          
          // Validate FC
          const fcKey = row.fc.toUpperCase().trim();
          const fcId = fcByName[fcKey];
          if (fcKey && fcKey !== "-" && !fcId) {
            validatedRow.warnings.push(ImportErrorCode.E_INVALID_FC);
          } else if (fcId) {
            validatedRow.fcId = fcId;
          }
          
          // Validate payment method
          const paymentKey = row.payment.toUpperCase().trim();
          const balanceId = balanceAccountByMethod[paymentKey];
          if (!balanceId) {
            validatedRow.warnings.push(ImportErrorCode.E_INVALID_PAYMENT_METHOD);
          } else {
            validatedRow.balanceAccountId = balanceId;
          }
          
          currentBatch.rows.push(validatedRow);
        }
        
        // Push last batch
        if (currentBatch) {
          batches.push(currentBatch);
        }
        
        // Post-process batches: compute allocations
        for (const batch of batches) {
          // Compute recomputed net
          batch.recomputedNet = Math.round(
            batch.baseSum * (1 - batch.discountPercent / 100)
          );
          
          // Check mismatch
          if (Math.abs(batch.recomputedNet - batch.netTotal) > 100) {
            batch.warnings.push(ImportErrorCode.E_NET_MISMATCH);
          }
          
          // Allocate discount
          const prices = batch.rows.map((r) => {
            const pkg = packageByLabel[r.packageLabel.toUpperCase().trim()];
            return pkg?.price || 0;
          });
          
          const { allocations } = allocateDiscount(batch.netTotal, prices);
          
          batch.rows.forEach((row, idx) => {
            row.allocation = allocations[idx];
            if (row.allocation && row.allocation <= 0) {
              row.errors.push(ImportErrorCode.E_NEGATIVE_ALLOCATION);
            }
          });
          
          // Aggregate batch errors
          batch.rows.forEach((row) => {
            batch.errors.push(...row.errors);
            batch.warnings.push(...row.warnings);
          });
          
          // Deduplicate
          batch.errors = [...new Set(batch.errors)];
          batch.warnings = [...new Set(batch.warnings)];
        }
        
        // Compute stats
        const stats = {
          totalRows: parsedRows.length,
          totalBatches: batches.length,
          errorRows: batches.reduce(
            (sum, b) => sum + b.rows.filter((r) => r.errors.length > 0).length,
            0
          ),
          warningRows: batches.reduce(
            (sum, b) => sum + b.rows.filter((r) => r.warnings.length > 0).length,
            0
          ),
        };
        
        result = {
          batches,
          stats,
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        console.error("Import preview error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to parse file",
        });
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscriptionImport.importMembers",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: { fileSize: input.fileBase64.length },
          responseData: success ? { batchCount: result?.batches?.length, stats: result?.stats } : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),
    
  commit: permissionProtectedProcedure(["create:subscription"])
    .input(
      z.object({
        batchIds: z.array(z.string()),
        batches: z.array(z.any()), // Full batch data from preview
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      let success = false;
      let result: any = null;
      let error: Error | null = null;

      try {
        const summary = {
        usersCreated: 0,
        membershipsCreated: 0,
        subscriptionsCreated: 0,
        paymentsCreated: 0,
        paymentValidationsCreated: 0,
        pointsAwarded: 0,
        batchesProcessed: 0,
        failures: 0,
      };
      
      const errors: ImportError[] = [];
      const warnings: ImportWarning[] = [];
      
      // Process each batch in transaction
      for (const batchData of input.batches) {
        if (!input.batchIds.includes(batchData.batchId)) continue;
        
        try {
          await ctx.db.$transaction(async (tx) => {
            let userId: string;
            let membershipId: string;
            
            // 1. Create or find user
            if (batchData.isPlaceholder) {
              // Create placeholder user
              const userName = batchData.memberName + " BARU";
              const userEmail = slugify(batchData.memberName) + "dummy@fitinfinity.id";
              
              // Check if user exists
              let user = await tx.user.findFirst({
                where: {
                  OR: [
                    { email: userEmail },
                    { name: userName },
                  ],
                },
              });
              
              if (!user) {
                user = await tx.user.create({
                  data: {
                    name: userName,
                    email: userEmail,
                    createdBy: ctx.session.user.id,
                  },
                });
                summary.usersCreated++;
              }
              
              userId = user.id;
            } else {
              // Use existing user ID
              userId = batchData.userId!;
              
              // Verify user exists
              const user = await tx.user.findUnique({
                where: { id: userId },
              });
              
              if (!user) {
                throw new Error(`User with ID ${userId} not found`);
              }
            }
            
            // 2. Create or find membership
            let membership = await tx.membership.findFirst({
              where: { userId },
            });
            
            if (!membership) {
              // Use first row's start date for membership registration
              const firstRow = batchData.rows[0];
              membership = await tx.membership.create({
                data: {
                  userId,
                  registerDate: firstRow.startDate,
                  isActive: false, // Will be activated on successful payment
                  createdBy: ctx.session.user.id,
                  fcId: firstRow.fcId || null,
                },
              });
              summary.membershipsCreated++;
            }
            
            membershipId = membership.id;
            
            // 3. Process each row in batch
            const batchSeq = format(new Date(), "yyyyMMdd");
            
            for (let rowIdx = 0; rowIdx < batchData.rows.length; rowIdx++) {
              const row = batchData.rows[rowIdx];
              
              // Skip rows with errors
              if (row.errors && row.errors.length > 0) {
                warnings.push({
                  code: "E_ROW_SKIPPED",
                  message: `Row ${row.rowNumber} skipped due to errors`,
                  rowNumber: row.rowNumber,
                });
                continue;
              }
              
              // Check for duplicate subscription
              const existing = await tx.subscription.findFirst({
                where: {
                  memberId: membershipId,
                  packageId: row.packageId,
                  startDate: row.startDate,
                },
              });
              
              if (existing) {
                warnings.push({
                  code: ImportErrorCode.E_DUPLICATE_SUBSCRIPTION,
                  message: `Subscription already exists for row ${row.rowNumber}`,
                  rowNumber: row.rowNumber,
                });
                continue;
              }
              
              // Get package details
              const packageData = await tx.package.findUnique({
                where: { id: row.packageId },
              });
              
              if (!packageData) {
                throw new Error(`Package ${row.packageId} not found`);
              }
              
              // Determine subsType and duration
              const subsType = packageData.type === "GYM_MEMBERSHIP" ? "gym" : "trainer";
              const duration = packageData.type === "GYM_MEMBERSHIP" 
                ? (packageData.day || 30) 
                : (packageData.sessions || 8);
              
              // Generate order reference
              const orderReference = `IMPORT-${batchSeq}-${batchData.batchId}-${rowIdx + 1}`;
              
              // Check if order reference already exists
              const existingPayment = await tx.payment.findFirst({
                where: { orderReference },
              });
              
              if (existingPayment) {
                warnings.push({
                  code: "E_ORDER_EXISTS",
                  message: `Order reference ${orderReference} already exists`,
                  rowNumber: row.rowNumber,
                });
                continue;
              }
              
              // Create subscription
              const subscription = await tx.subscription.create({
                data: {
                  memberId: membershipId,
                  packageId: row.packageId,
                  startDate: row.startDate,
                  trainerId: row.trainerId || null,
                  salesId: row.fcId || null,
                  salesType: row.fcId ? "FC" : null,
                  ...(subsType === "gym"
                    ? {
                        endDate: new Date(
                          new Date(row.startDate).setDate(
                            new Date(row.startDate).getDate() + duration
                          )
                        ),
                      }
                    : {
                        remainingSessions: duration,
                        endDate: new Date(
                          new Date(row.startDate).setDate(
                            new Date(row.startDate).getDate() + 30
                          )
                        ),
                      }),
                },
              });
              
              summary.subscriptionsCreated++;
              
              // Create payment
              await tx.payment.create({
                data: {
                  subscriptionId: subscription.id,
                  status: "SUCCESS",
                  method: row.packageLabel, // Use package label as method for now
                  totalPayment: row.allocation || packageData.price,
                  orderReference,
                },
              });
              
              summary.paymentsCreated++;
              
              // Create payment validation
              await tx.paymentValidation.create({
                data: {
                  memberId: membershipId,
                  packageId: row.packageId,
                  trainerId: row.trainerId || null,
                  fcId: row.fcId || null,
                  subsType,
                  duration,
                  sessions: subsType === "trainer" ? duration : null,
                  totalPayment: row.allocation || packageData.price,
                  paymentMethod: "direct_payment",
                  paymentStatus: "ACCEPTED",
                  startDate: row.startDate,
                  balanceId: row.balanceAccountId || null,
                  salesId: row.fcId || null,
                  salesType: row.fcId ? "FC" : null,
                },
              });
              
              summary.paymentValidationsCreated++;
              
              // Award points
              if (packageData.point > 0) {
                await tx.user.update({
                  where: { id: userId },
                  data: {
                    point: { increment: packageData.point },
                  },
                });
                summary.pointsAwarded += packageData.point;
              }
            }
            
            // Activate membership if any subscriptions were created
            if (summary.subscriptionsCreated > 0) {
              await tx.membership.update({
                where: { id: membershipId },
                data: { isActive: true },
              });
            }
            
            summary.batchesProcessed++;
          });
        } catch (error) {
          console.error(`Batch ${batchData.batchId} failed:`, error);
          summary.failures++;
          errors.push({
            code: "E_BATCH_FAILED",
            message: error instanceof Error ? error.message : "Batch processing failed",
          });
        }
        }
        
        result = {
          summary,
          errors,
          warnings,
        };
        success = true;
        return result;
      } catch (err) {
        error = err as Error;
        success = false;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to process import",
        });
      } finally {
        logApiMutationAsync({
          db: ctx.db,
          endpoint: "subscriptionImport.processImport",
          method: "POST",
          userId: ctx.session?.user?.id,
          requestData: { batchCount: input.batchIds.length },
          responseData: success ? result : null,
          ipAddress: extractIpAddress(ctx.headers),
          userAgent: extractUserAgent(ctx.headers),
          success,
          errorMessage: error?.message,
          duration: Date.now() - startTime,
        });
      }
    }),
});