"use client";

import React, { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from "lucide-react";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";

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

type PreviewData = {
  batches: Batch[];
  stats: {
    totalRows: number;
    totalBatches: number;
    errorRows: number;
    warningRows: number;
  };
};

export default function SubscriptionImportPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);

  const previewMutation = api.subscriptionImport.preview.useMutation({
    onSuccess: (data) => {
      setPreviewData(data as PreviewData);
      // Auto-select batches without errors
      const validBatchIds = data.batches
        .filter((b: Batch) => b.errors.length === 0)
        .map((b: Batch) => b.batchId);
      setSelectedBatchIds(validBatchIds);
    },
    onError: (error) => {
      console.error("Preview error:", error);
      alert(`Preview failed: ${error.message}`);
    },
  });

  const commitMutation = api.subscriptionImport.commit.useMutation({
    onSuccess: (result) => {
      setCommitResult(result);
      setShowSummaryModal(true);
      // Reset state
      setFile(null);
      setFileBase64(null);
      setPreviewData(null);
      setSelectedBatchIds([]);
    },
    onError: (error) => {
      console.error("Commit error:", error);
      alert(`Import failed: ${error.message}`);
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setFileBase64(base64 || null);
    };
    reader.readAsDataURL(uploadedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const handlePreview = () => {
    if (!fileBase64) return;
    previewMutation.mutate({ fileBase64 });
  };

  const handleCommit = () => {
    if (!previewData || selectedBatchIds.length === 0) return;

    const selectedBatches = previewData.batches.filter((b) =>
      selectedBatchIds.includes(b.batchId)
    );

    commitMutation.mutate({
      batchIds: selectedBatchIds,
      batches: selectedBatches,
    });
  };

  const toggleBatchSelection = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId]
    );
  };

  const toggleAllBatches = () => {
    if (!previewData) return;
    
    const validBatchIds = previewData.batches
      .filter((b) => b.errors.length === 0)
      .map((b) => b.batchId);

    if (selectedBatchIds.length === validBatchIds.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(validBatchIds);
    }
  };

  const getErrorMessage = (code: string): string => {
    const messages: Record<string, string> = {
      E_REQUIRED: "Required field missing",
      E_INVALID_PACKAGE: "Invalid package name",
      E_INVALID_TRAINER: "Invalid trainer token",
      E_INVALID_FC: "Invalid FC name",
      E_DATE_FORMAT: "Invalid date format",
      E_MISSING_ANCHOR_NOMINAL: "Missing NOMINAL value",
      E_CONFLICT_NOMINAL: "Conflicting NOMINAL values",
      E_DUP_NOMINAL_IGNORED: "Duplicate NOMINAL ignored",
      E_NET_MISMATCH: "Net total mismatch (warning)",
      E_NEGATIVE_ALLOCATION: "Negative allocation amount",
      E_DUPLICATE_SUBSCRIPTION: "Duplicate subscription",
      E_INVALID_PAYMENT_METHOD: "Invalid payment method",
    };
    return messages[code] || code;
  };

  const downloadErrorCSV = () => {
    if (!commitResult) return;

    const csvRows: string[] = [];
    csvRows.push("Type,Code,Message,Row");

    commitResult.errors.forEach((err: any) => {
      csvRows.push(`Error,${err.code},"${err.message}",${err.rowNumber || ""}`);
    });

    commitResult.warnings.forEach((warn: any) => {
      csvRows.push(`Warning,${warn.code},"${warn.message}",${warn.rowNumber || ""}`);
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute requiredPermissions={["create:subscription"]}>
      <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Import Subscriptions
            </h2>
            <p className="text-muted-foreground">
              Upload Excel file to import subscription history
            </p>
          </div>
        </div>

        {/* File Upload Section */}
        {!previewData && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upload Excel File</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                {file ? (
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 font-medium">
                      Drop Excel file here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setFileBase64(null);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Preview Import
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview Section */}
        {previewData && (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Batches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {previewData.stats.totalBatches}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Rows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {previewData.stats.totalRows}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-destructive">
                    Error Rows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {previewData.stats.errorRows}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-600">
                    Warning Rows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {previewData.stats.warningRows}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={toggleAllBatches}>
                {selectedBatchIds.length ===
                previewData.batches.filter((b) => b.errors.length === 0).length
                  ? "Deselect All"
                  : "Select All Valid"}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewData(null);
                    setSelectedBatchIds([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCommit}
                  disabled={
                    selectedBatchIds.length === 0 || commitMutation.isPending
                  }
                >
                  {commitMutation.isPending ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Import Selected ({selectedBatchIds.length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Batch List */}
            <div className="space-y-4">
              {previewData.batches.map((batch) => (
                <Card
                  key={batch.batchId}
                  className={`${
                    selectedBatchIds.includes(batch.batchId)
                      ? "border-primary"
                      : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedBatchIds.includes(batch.batchId)}
                          onChange={() => toggleBatchSelection(batch.batchId)}
                          disabled={batch.errors.length > 0}
                          className="mt-1 h-4 w-4"
                        />
                        <div>
                          <CardTitle className="text-lg">
                            {batch.memberName}
                            {batch.isPlaceholder && (
                              <Badge variant="secondary" className="ml-2">
                                New User
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {batch.rows.length} subscription(s) • Discount:{" "}
                            {batch.discountPercent}% • Total: Rp{" "}
                            {batch.netTotal.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {batch.errors.length > 0 && (
                          <Badge variant="destructive">
                            {batch.errors.length} Error(s)
                          </Badge>
                        )}
                        {batch.warnings.length > 0 && (
                          <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                            {batch.warnings.length} Warning(s)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {batch.rows.map((row) => (
                        <div
                          key={row.rowNumber}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {row.packageLabel}
                              </span>
                              {row.trainerToken && (
                                <Badge variant="outline" className="text-xs">
                                  Trainer: {row.trainerToken}
                                </Badge>
                              )}
                              {row.fcName && (
                                <Badge variant="outline" className="text-xs">
                                  FC: {row.fcName}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Row {row.rowNumber} • Allocation: Rp{" "}
                              {row.allocation?.toLocaleString("id-ID") || 0} •
                              Points: {row.point || 0}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {row.errors.map((error, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {getErrorMessage(error)}
                              </Badge>
                            ))}
                            {row.warnings.map((warning, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="border-yellow-600 text-xs text-yellow-600"
                              >
                                {getErrorMessage(warning)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {(batch.errors.length > 0 || batch.warnings.length > 0) && (
                      <Alert className="mt-4" variant={batch.errors.length > 0 ? "destructive" : "default"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>
                          {batch.errors.length > 0 ? "Batch Errors" : "Batch Warnings"}
                        </AlertTitle>
                        <AlertDescription>
                          <ul className="ml-4 list-disc">
                            {[...new Set([...batch.errors, ...batch.warnings])].map(
                              (code, idx) => (
                                <li key={idx}>{getErrorMessage(code)}</li>
                              )
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Summary Modal */}
        <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Complete</DialogTitle>
              <DialogDescription>
                Summary of subscription import results
              </DialogDescription>
            </DialogHeader>
            
            {commitResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Users Created</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {commitResult.summary.usersCreated}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Subscriptions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {commitResult.summary.subscriptionsCreated}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Points Awarded</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {commitResult.summary.pointsAwarded}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-destructive">
                        Failures
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {commitResult.summary.failures}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {(commitResult.errors.length > 0 ||
                  commitResult.warnings.length > 0) && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Issues Encountered</AlertTitle>
                    <AlertDescription>
                      {commitResult.errors.length} error(s) and{" "}
                      {commitResult.warnings.length} warning(s) occurred during
                      import.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <DialogFooter>
              {commitResult &&
                (commitResult.errors.length > 0 ||
                  commitResult.warnings.length > 0) && (
                  <Button variant="outline" onClick={downloadErrorCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                )}
              <Button onClick={() => setShowSummaryModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}