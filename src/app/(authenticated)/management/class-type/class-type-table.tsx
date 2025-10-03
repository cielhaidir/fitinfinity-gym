"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassType {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ClassTypeTableProps {
  data: ClassType[];
  isLoading: boolean;
  onEdit: (classType: ClassType) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const ClassTypeTable: React.FC<ClassTypeTableProps> = ({
  data,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter((classType) =>
    classType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classType.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classType.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Class Types ({data.length})</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search class types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {searchTerm ? "No class types found matching your search." : "No class types found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((classType) => (
                  <TableRow key={classType.id}>
                    <TableCell>
                      <div className="flex items-center justify-center w-8 h-8 bg-[#C9D953] rounded">
                        <i className={`${classType.icon} text-white text-sm`}></i>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {classType.name.charAt(0).toUpperCase() + classType.name.slice(1)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={classType.description}>
                        {classType.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getLevelBadgeColor(classType.level)}>
                        {classType.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={classType.isActive ? "default" : "secondary"}>
                        {classType.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(classType.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(classType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(classType.id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {data.length} class types
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};