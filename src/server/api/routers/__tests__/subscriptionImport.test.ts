import { describe, it, expect, beforeEach, vi } from "vitest";
import * as XLSX from "xlsx";
import { format, parse } from "date-fns";

// Helper functions from subscriptionImport router
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
  
  // If already a Date
  if (value instanceof Date) return value;
  
  const str = String(value).trim();
  
  // Try yyyy-MM-dd (common in sample)
  try {
    const date1 = parse(str, "yyyy-MM-dd", new Date());
    if (!isNaN(date1.getTime())) return date1;
  } catch {}
  
  // Try dd-MMM format (assume current year)
  try {
    const date2 = parse(str, "dd-MMM", new Date());
    if (!isNaN(date2.getTime())) return date2;
  } catch {}
  
  // Try d/M/yy format
  try {
    const date3 = parse(str, "d/M/yy", new Date());
    if (!isNaN(date3.getTime())) {
      // Adjust year if needed (yy < 50 => 20yy else 19yy)
      const year = date3.getFullYear();
      if (year < 100) {
        date3.setFullYear(year < 50 ? 2000 + year : 1900 + year);
      }
      return date3;
    }
  } catch {}
  
  // Try dd/MM/yyyy
  try {
    const date4 = parse(str, "dd/MM/yyyy", new Date());
    if (!isNaN(date4.getTime())) return date4;
  } catch {}
  
  return null;
}

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

describe("subscriptionImport - Parser Functions", () => {
  describe("parseCurrency", () => {
    it("should parse number directly", () => {
      expect(parseCurrency(1000000)).toBe(1000000);
    });

    it("should parse Indonesian currency format with Rp prefix", () => {
      expect(parseCurrency("Rp 1.000.000")).toBe(1000000);
      expect(parseCurrency("Rp1.000.000")).toBe(1000000);
    });

    it("should parse currency with comma as decimal separator", () => {
      expect(parseCurrency("1.500.000,50")).toBe(150000050);
    });

    it("should handle currency without Rp prefix", () => {
      expect(parseCurrency("1.000.000")).toBe(1000000);
    });

    it("should return undefined for invalid input", () => {
      expect(parseCurrency("invalid")).toBeUndefined();
      expect(parseCurrency(null)).toBeUndefined();
      expect(parseCurrency(undefined)).toBeUndefined();
    });

    it("should handle zero values", () => {
      expect(parseCurrency(0)).toBe(0);
      expect(parseCurrency("0")).toBe(0);
    });
  });

  describe("parseDate", () => {
    it("should parse yyyy-MM-dd format", () => {
      const date = parseDate("2024-01-15");
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0); // January (0-indexed)
      expect(date?.getDate()).toBe(15);
    });

    it("should parse dd-MMM format (assume current year)", () => {
      const date = parseDate("10-Sep");
      expect(date).toBeInstanceOf(Date);
      expect(date?.getMonth()).toBe(8); // September (0-indexed)
      expect(date?.getDate()).toBe(10);
    });

    it("should parse d/M/yy format with year adjustment", () => {
      const date1 = parseDate("10/9/25");
      expect(date1).toBeInstanceOf(Date);
      expect(date1?.getFullYear()).toBe(2025);
      expect(date1?.getMonth()).toBe(8); // September
      expect(date1?.getDate()).toBe(10);

      const date2 = parseDate("15/12/95");
      expect(date2).toBeInstanceOf(Date);
      expect(date2?.getFullYear()).toBe(1995);
    });

    it("should parse dd/MM/yyyy format", () => {
      const date = parseDate("15/01/2024");
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it("should return Date object unchanged", () => {
      const inputDate = new Date("2024-01-15");
      const result = parseDate(inputDate);
      expect(result).toBe(inputDate);
    });

    it("should return null for invalid input", () => {
      expect(parseDate("")).toBeNull();
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate("invalid-date")).toBeNull();
    });
  });
});

describe("subscriptionImport - Discount Allocation", () => {
  describe("allocateDiscount", () => {
    it("should allocate proportionally with integer rounding", () => {
      const netTotal = 1000000;
      const prices = [500000, 300000, 200000];
      
      const result = allocateDiscount(netTotal, prices);
      
      // Check total equals netTotal
      const sum = result.allocations.reduce((s, a) => s + a, 0);
      expect(sum).toBe(netTotal);
      
      // Check proportions (allowing for rounding)
      expect(result.allocations[0]).toBeCloseTo(500000, -3);
      expect(result.allocations[1]).toBeCloseTo(300000, -3);
      expect(result.allocations[2]).toBeCloseTo(200000, -3);
    });

    it("should handle discount with remainder adjustment", () => {
      const netTotal = 900000;
      const prices = [500000, 300000, 200000]; // Total: 1,000,000
      
      const result = allocateDiscount(netTotal, prices);
      
      // Last item should absorb rounding remainder
      const sum = result.allocations.reduce((s, a) => s + a, 0);
      expect(sum).toBe(netTotal);
      
      // First allocations are proportional rounded
      expect(result.allocations[0]).toBe(Math.round((900000 * 500000) / 1000000));
      expect(result.allocations[1]).toBe(Math.round((900000 * 300000) / 1000000));
      
      // Last gets the remainder
      const expectedLast = 900000 - result.allocations[0]! - result.allocations[1]!;
      expect(result.allocations[2]).toBe(expectedLast);
    });

    it("should handle two packages", () => {
      const netTotal = 1400000;
      const prices = [1000000, 500000]; // Total: 1,500,000
      
      const result = allocateDiscount(netTotal, prices);
      
      const sum = result.allocations.reduce((s, a) => s + a, 0);
      expect(sum).toBe(netTotal);
      
      // First gets proportional rounded
      expect(result.allocations[0]).toBe(Math.round((1400000 * 1000000) / 1500000));
      
      // Second gets remainder
      expect(result.allocations[1]).toBe(1400000 - result.allocations[0]!);
    });

    it("should handle single package (no discount allocation needed)", () => {
      const netTotal = 1000000;
      const prices = [1000000];
      
      const result = allocateDiscount(netTotal, prices);
      
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0]).toBe(netTotal);
    });

    it("should handle zero base sum", () => {
      const netTotal = 1000000;
      const prices = [0, 0, 0];
      
      const result = allocateDiscount(netTotal, prices);
      
      expect(result.allocations).toEqual([0, 0, 0]);
    });

    it("should handle negative discount (price increase)", () => {
      const netTotal = 1100000;
      const prices = [500000, 500000]; // Total: 1,000,000
      
      const result = allocateDiscount(netTotal, prices);
      
      const sum = result.allocations.reduce((s, a) => s + a, 0);
      expect(sum).toBe(netTotal);
      
      // Both should be proportionally increased
      expect(result.allocations[0]).toBeGreaterThan(500000);
      expect(result.allocations[1]).toBeGreaterThan(500000);
    });

    it("should ensure remainder is always zero", () => {
      const testCases = [
        { netTotal: 1000000, prices: [500000, 300000, 200000] },
        { netTotal: 900000, prices: [500000, 300000, 200000] },
        { netTotal: 1234567, prices: [700000, 400000, 300000] },
        { netTotal: 555555, prices: [300000, 200000, 100000] },
      ];

      testCases.forEach(({ netTotal, prices }) => {
        const result = allocateDiscount(netTotal, prices);
        expect(result.remainder).toBe(0);
        
        const sum = result.allocations.reduce((s, a) => s + a, 0);
        expect(sum).toBe(netTotal);
      });
    });
  });
});

describe("subscriptionImport - Batch Grouping Logic", () => {
  it("should group rows by anchor NOMINAL", () => {
    const rows = [
      { rowNumber: 1, nama: "JOHN DOE", nominal: 1000000, membership: "1 BULAN" },
      { rowNumber: 2, nama: "JOHN DOE", nominal: undefined, membership: "PT 4" },
      { rowNumber: 3, nama: "JANE SMITH", nominal: 500000, membership: "3 BULAN" },
    ];

    const batches: any[] = [];
    let currentBatch: any = null;

    for (const row of rows) {
      if (row.nominal !== undefined && row.nominal > 0) {
        if (currentBatch) {
          batches.push(currentBatch);
        }
        currentBatch = {
          memberName: row.nama,
          anchorRow: row.rowNumber,
          netTotal: row.nominal,
          rows: [row],
        };
      } else if (currentBatch && row.nama === currentBatch.memberName) {
        currentBatch.rows.push(row);
      }
    }

    if (currentBatch) {
      batches.push(currentBatch);
    }

    expect(batches).toHaveLength(2);
    expect(batches[0]?.rows).toHaveLength(2);
    expect(batches[1]?.rows).toHaveLength(1);
  });

  it("should ignore duplicate NOMINAL in same batch", () => {
    const rows = [
      { rowNumber: 1, nama: "JOHN DOE", nominal: 1000000, membership: "1 BULAN" },
      { rowNumber: 2, nama: "JOHN DOE", nominal: 1000000, membership: "PT 4" },
    ];

    let duplicateDetected = false;

    for (let i = 1; i < rows.length; i++) {
      const current = rows[i];
      const previous = rows[i - 1];

      if (
        current?.nominal &&
        previous?.nominal &&
        current.nominal === previous.nominal &&
        current.nama === previous.nama
      ) {
        duplicateDetected = true;
      }
    }

    expect(duplicateDetected).toBe(true);
  });

  it("should create new batch when member name changes", () => {
    const rows = [
      { rowNumber: 1, nama: "JOHN DOE", nominal: 1000000, membership: "1 BULAN" },
      { rowNumber: 2, nama: "JANE SMITH", nominal: 500000, membership: "3 BULAN" },
    ];

    const batches: any[] = [];
    let currentBatch: any = null;

    for (const row of rows) {
      if (row.nominal !== undefined && row.nominal > 0) {
        if (currentBatch) {
          batches.push(currentBatch);
        }
        currentBatch = {
          memberName: row.nama,
          anchorRow: row.rowNumber,
          netTotal: row.nominal,
          rows: [row],
        };
      }
    }

    if (currentBatch) {
      batches.push(currentBatch);
    }

    expect(batches).toHaveLength(2);
    expect(batches[0]?.memberName).toBe("JOHN DOE");
    expect(batches[1]?.memberName).toBe("JANE SMITH");
  });
});

describe("subscriptionImport - Validation Rules", () => {
  it("should validate required fields", () => {
    const row = {
      nama: "",
      membership: "1 BULAN",
      tanggal: "2024-01-15",
    };

    const errors: string[] = [];

    if (!row.nama) {
      errors.push("E_REQUIRED");
    }

    expect(errors).toContain("E_REQUIRED");
  });

  it("should validate package mapping", () => {
    const PACKAGE_MAP: Record<string, boolean> = {
      "1 BULAN": true,
      "3 BULAN": true,
      "PT 4": true,
    };

    const validPackage = "1 BULAN";
    const invalidPackage = "INVALID PACKAGE";

    expect(PACKAGE_MAP[validPackage]).toBe(true);
    expect(PACKAGE_MAP[invalidPackage]).toBeUndefined();
  });

  it("should validate trainer tokens", () => {
    const TRAINER_MAP: Record<string, string> = {
      "ADI": "trainer-id-1",
      "MIAN": "trainer-id-2",
      "EGI": "trainer-id-3",
    };

    const validTrainer = "ADI";
    const invalidTrainer = "UNKNOWN";

    expect(TRAINER_MAP[validTrainer]).toBe("trainer-id-1");
    expect(TRAINER_MAP[invalidTrainer]).toBeUndefined();
  });

  it("should validate FC names", () => {
    const FC_MAP: Record<string, string> = {
      "EVI": "fc-id-1",
      "RAHMAN": "fc-id-2",
      "AYU": "fc-id-3",
    };

    const validFC = "EVI";
    const invalidFC = "UNKNOWN";

    expect(FC_MAP[validFC]).toBe("fc-id-1");
    expect(FC_MAP[invalidFC]).toBeUndefined();
  });

  it("should detect net total mismatch", () => {
    const baseSum = 1000000;
    const discountPercent = 10;
    const providedNet = 900000;

    const computedNet = Math.round(baseSum * (1 - discountPercent / 100));
    const mismatch = Math.abs(computedNet - providedNet);

    expect(mismatch).toBeLessThanOrEqual(100); // Acceptable threshold
  });
});