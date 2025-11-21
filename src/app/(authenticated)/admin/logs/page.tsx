"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, FileText, Search, Trash2, Download, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function LogsPage() {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [logLevel, setLogLevel] = useState<"ALL" | "INFO" | "ERROR" | "WARN">("ALL");
  const [page, setPage] = useState(1);
  const [globalSearch, setGlobalSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Queries
  const { data: files, refetch: refetchFiles } = api.logs.listFiles.useQuery();
  const { data: stats } = api.logs.getStats.useQuery();
  const { data: logData, isLoading: isLoadingLogs } = api.logs.readLog.useQuery(
    {
      filename: selectedFile,
      page,
      limit: 20,
      search: searchTerm,
      level: logLevel,
      startDate,
      endDate,
    },
    {
      enabled: !!selectedFile,
    }
  );
  const { data: searchResults } = api.logs.searchAll.useQuery(
    {
      query: globalSearch,
      level: logLevel,
      limit: 100,
    },
    {
      enabled: globalSearch.length > 0,
    }
  );

  // Mutations
  const deleteLogMutation = api.logs.deleteLog.useMutation({
    onSuccess: () => {
      toast.success("Log file deleted successfully");
      refetchFiles();
      setSelectedFile("");
    },
    onError: (error) => {
      toast.error(`Failed to delete log: ${error.message}`);
    },
  });

  const handleDeleteLog = (filename: string) => {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
      deleteLogMutation.mutate({ filename });
    }
  };

  const handleDownloadLog = (filename: string) => {
    // Create a download link for the log file
    const logContent = logData?.lines.join('\n') || '';
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Log downloaded");
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getLogLevelColor = (line: string) => {
    if (line.includes('ERROR')) return 'text-red-600 dark:text-red-400';
    if (line.includes('WARN')) return 'text-yellow-600 dark:text-yellow-400';
    if (line.includes('INFO')) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getLogLevelBadge = (line: string) => {
    if (line.includes('ERROR')) return <Badge variant="destructive">ERROR</Badge>;
    if (line.includes('WARN')) return <Badge variant="outline" className="border-yellow-500 text-yellow-600">WARN</Badge>;
    if (line.includes('INFO')) return <Badge variant="outline" className="border-blue-500 text-blue-600">INFO</Badge>;
    return null;
  };

  const parseLogEntry = (line: string) => {
    // Try to extract JSON payload from "Input: {...}" pattern
    const inputMatch = line.match(/Input: (\{.*\})/);
    if (inputMatch) {
      try {
        const jsonData = JSON.parse(inputMatch[1]);
        return {
          type: 'input',
          timestamp: line.match(/\[(.*?)\]/)?.[1] || '',
          data: jsonData,
          rawLine: line
        };
      } catch (e) {
        return { type: 'text', line };
      }
    }

    // Parse regular log entries
    const match = line.match(/\[(.*?)\]\s+(\w+):\s+\[(\w+)\]\s+([\w.]+)\s+-\s+User:\s+(.*?)\s+\((.*?)\)/);
    if (match) {
      return {
        type: 'operation',
        timestamp: match[1],
        level: match[2],
        operation: match[3],
        path: match[4],
        user: match[5],
        userId: match[6],
        rawLine: line
      };
    }

    return { type: 'text', line };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">View and search application logs</p>
        </div>
        <Button onClick={() => refetchFiles()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Log Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFiles || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(stats?.totalSize || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Count</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {Object.values(stats?.logCounts || {}).reduce((sum, log) => sum + log.error, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">Log Files</TabsTrigger>
          <TabsTrigger value="search">Global Search</TabsTrigger>
        </TabsList>

        {/* Log Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* File List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Log Files</CardTitle>
                <CardDescription>Select a file to view its contents</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {files?.map((file) => (
                      <div
                        key={file.name}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFile === file.name
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedFile(file.name);
                          setPage(1);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(file.size)} • {formatDistanceToNow(new Date(file.modified), { addSuffix: true })}
                            </p>
                            {stats?.logCounts[file.name] && (
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {stats.logCounts[file.name].info}
                                </Badge>
                                {stats.logCounts[file.name].error > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {stats.logCounts[file.name].error}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(file.name);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Log Content */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedFile || "Select a log file"}</CardTitle>
                    <CardDescription>
                      {logData ? `Showing ${logData.lines.length} of ${logData.total} entries` : ""}
                    </CardDescription>
                  </div>
                  {selectedFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadLog(selectedFile)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
                {selectedFile && (
                  <div className="space-y-2 mt-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Search in this file..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                          }}
                          className="w-full"
                        />
                      </div>
                      <Select
                        value={logLevel}
                        onValueChange={(value: any) => {
                          setLogLevel(value);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Levels</SelectItem>
                          <SelectItem value="INFO">Info</SelectItem>
                          <SelectItem value="ERROR">Error</SelectItem>
                          <SelectItem value="WARN">Warning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={startDate ? startDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          setStartDate(e.target.value ? new Date(e.target.value) : undefined);
                          setPage(1);
                        }}
                        placeholder="From Date"
                        className="w-40"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={endDate ? endDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          setEndDate(e.target.value ? new Date(e.target.value) : undefined);
                          setPage(1);
                        }}
                        placeholder="To Date"
                        className="w-40"
                      />
                      {(startDate || endDate) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStartDate(undefined);
                            setEndDate(undefined);
                            setPage(1);
                          }}
                        >
                          Clear Dates
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedFile ? (
                  <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a log file to view its contents</p>
                    </div>
                  </div>
                ) : isLoadingLogs ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-2">
                        {logData?.lines.map((line, index) => {
                          const parsed = parseLogEntry(line);
                          
                          if (parsed.type === 'operation') {
                            return (
                              <div
                                key={index}
                                className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {getLogLevelBadge(line)}
                                  <Badge variant="secondary">{parsed.operation}</Badge>
                                  <span className="text-xs text-muted-foreground">{parsed.timestamp}</span>
                                </div>
                                <div className="text-sm space-y-1">
                                  <div className="flex gap-2">
                                    <span className="font-semibold text-muted-foreground">Path:</span>
                                    <span className="font-mono">{parsed.path}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="font-semibold text-muted-foreground">User:</span>
                                    <span>{parsed.user}</span>
                                    <span className="text-muted-foreground text-xs">({parsed.userId})</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          if (parsed.type === 'input') {
                            return (
                              <div
                                key={index}
                                className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                                    Payload
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{parsed.timestamp}</span>
                                </div>
                                <div className="bg-background rounded p-3 overflow-x-auto">
                                  <pre className="text-xs">
                                    {JSON.stringify(parsed.data, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div
                              key={index}
                              className={`p-2 rounded hover:bg-muted/50 ${getLogLevelColor(line)}`}
                            >
                              <div className="flex items-start gap-2">
                                {getLogLevelBadge(line)}
                                <span className="flex-1 whitespace-pre-wrap break-all font-mono text-sm">{line}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {logData && logData.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {page} of {logData.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(logData.totalPages, p + 1))}
                          disabled={page === logData.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Global Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search All Logs</CardTitle>
              <CardDescription>Search across all log files simultaneously</CardDescription>
              <div className="flex gap-2 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Enter search term..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select
                  value={logLevel}
                  onValueChange={(value: any) => setLogLevel(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Levels</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                    <SelectItem value="WARN">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!globalSearch ? (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  <div className="text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a search term to find matching log entries</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {searchResults?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No results found</p>
                    ) : (
                      searchResults?.map((result, index) => {
                        const parsed = parseLogEntry(result.line);
                        
                        return (
                          <div key={index} className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{result.file}</Badge>
                              <span className="text-xs text-muted-foreground">Line {result.lineNumber}</span>
                              {getLogLevelBadge(result.line)}
                            </div>
                            
                            {parsed.type === 'operation' ? (
                              <div className="text-sm space-y-1">
                                <div className="flex gap-2">
                                  <span className="font-semibold text-muted-foreground">Path:</span>
                                  <span className="font-mono">{parsed.path}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-semibold text-muted-foreground">User:</span>
                                  <span>{parsed.user}</span>
                                </div>
                              </div>
                            ) : parsed.type === 'input' ? (
                              <div className="bg-muted/50 rounded p-2 mt-2 overflow-x-auto">
                                <pre className="text-xs">
                                  {JSON.stringify(parsed.data, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <div className={`font-mono text-sm ${getLogLevelColor(result.line)}`}>
                                {result.line}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}