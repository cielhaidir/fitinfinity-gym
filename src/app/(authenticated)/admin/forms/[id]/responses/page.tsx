"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/_components/ui/select";
import { Badge } from "@/app/_components/ui/badge";
import { ArrowLeft, Search, Download, Eye, Trash2, Calendar, Filter } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/_components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/_components/ui/dialog";

export default function FormResponsesPage({ params }: { params: { id: string } }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  // Fetch form details
  const { data: form, isLoading: isFormLoading } = api.publicForm.getById.useQuery({ id: params.id });

  // Fetch responses
  const { data: responsesData, isLoading: isResponsesLoading, refetch } = api.publicForm.getResponses.useQuery({
    formId: params.id,
    page,
    pageSize: 10,
    search: search || undefined
  });

  // Delete response mutation
  const deleteResponseMutation = api.publicForm.deleteResponse.useMutation({
    onSuccess: () => {
      toast.success("Response deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleDeleteResponse = (responseId: string) => {
    deleteResponseMutation.mutate({ id: responseId });
  };

  const exportResponses = () => {
    if (!responsesData?.responses || responsesData.responses.length === 0) {
      toast.error("No responses to export");
      return;
    }

    // Create CSV content
    const headers = form?.fields?.map(field => field.label) || [];
    const csvHeaders = ["Submitted At", "IP Address", ...headers].join(",");
    
    const csvRows = responsesData.responses.map(response => {
      const fieldValues = form?.fields?.map(field => {
        const fieldResponse = response.fieldResponses.find(fr => fr.fieldId === field.id);
        return fieldResponse ? `"${fieldResponse.value.replace(/"/g, '""')}"` : '""';
      }) || [];
      
      return [
        `"${new Date(response.submittedAt).toLocaleString()}"`,
        `"${response.ipAddress || 'N/A'}"`,
        ...fieldValues
      ].join(",");
    });

    const csvContent = [csvHeaders, ...csvRows].join("\n");
    
    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${form?.title || 'form'}-responses.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Responses exported successfully");
  };

  const formatFieldValue = (field: any, value: string) => {
    if (field.type === 'checkbox') {
      try {
        const values = JSON.parse(value);
        return Array.isArray(values) ? values.join(', ') : value;
      } catch {
        return value;
      }
    }
    return value;
  };

  if (isFormLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Form not found</h3>
            <p className="text-gray-500 mb-4">
              The form you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/admin/forms">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Forms
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/forms">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{form.title} - Responses</h1>
          <p className="text-muted-foreground">
            View and manage form responses
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportResponses} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {form.status === "PUBLISHED" && (
            <Link href={`/forms/${form.slug}`} target="_blank">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Form
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Form Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{responsesData?.total || 0}</div>
              <div className="text-sm text-gray-500">Total Responses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{form._count?.fields || 0}</div>
              <div className="text-sm text-gray-500">Form Fields</div>
            </div>
            <div className="text-center">
              <Badge className={form.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                {form.status.toLowerCase()}
              </Badge>
              <div className="text-sm text-gray-500 mt-1">Status</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">{new Date(form.createdAt).toLocaleDateString()}</div>
              <div className="text-sm text-gray-500">Created</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search responses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses List */}
      {isResponsesLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : responsesData?.responses?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Calendar className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium mb-2">No responses yet</h3>
            <p className="text-gray-500 mb-4">
              This form hasn't received any responses yet.
            </p>
            {form.status === "PUBLISHED" && (
              <Link href={`/forms/${form.slug}`} target="_blank">
                <Button>
                  <Eye className="h-4 w-4 mr-2" />
                  View Form
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {responsesData?.responses?.map((response) => (
            <Card key={response.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm text-gray-500">
                      Submitted: {new Date(response.submittedAt).toLocaleString()}
                    </div>
                    {response.ipAddress && (
                      <div className="text-xs text-gray-400">
                        IP: {response.ipAddress}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedResponse(response)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Response Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="text-sm text-gray-500">
                            Submitted: {new Date(response.submittedAt).toLocaleString()}
                            {response.ipAddress && ` • IP: ${response.ipAddress}`}
                          </div>
                          <div className="space-y-4">
                            {form.fields?.map((field) => {
                              const fieldResponse = response.fieldResponses.find(fr => fr.fieldId === field.id);
                              return (
                                <div key={field.id} className="border-b pb-3">
                                  <div className="font-medium text-sm mb-1">{field.label}</div>
                                  <div className="text-gray-700">
                                    {fieldResponse ? formatFieldValue(field, fieldResponse.value) : <em>No response</em>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Response</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this response? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteResponse(response.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Preview of response data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {form.fields?.slice(0, 4).map((field) => {
                    const fieldResponse = response.fieldResponses.find(fr => fr.fieldId === field.id);
                    return (
                      <div key={field.id} className="text-sm">
                        <div className="font-medium text-gray-600">{field.label}:</div>
                        <div className="text-gray-800 truncate">
                          {fieldResponse ? formatFieldValue(field, fieldResponse.value) : <em>No response</em>}
                        </div>
                      </div>
                    );
                  })}
                  {form.fields && form.fields.length > 4 && (
                    <div className="text-sm text-gray-500 italic">
                      +{form.fields.length - 4} more fields...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {responsesData && responsesData.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-3">
            Page {page} of {responsesData.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === responsesData.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}