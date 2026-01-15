
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Download, Filter, AlertCircle, Loader2 } from "lucide-react";
import { DEPARTMENTS } from "@/lib/constants";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Batch, Student, AttendanceRecord } from "@/lib/types";

interface BatchAttendanceSummary {
  batchId: string;
  batchName: string;
  department?: string;
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  totalMarks: number;
}

export default function AdminViewReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("attendance-batch");
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [summaryData, setSummaryData] = useState<BatchAttendanceSummary[]>([]);
  
  // Filters
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch batches for the filter dropdown
        const batchesRes = await fetch('/api/batches');
        if (!batchesRes.ok) throw new Error('Failed to fetch batches for filtering.');
        setAllBatches(await batchesRes.json());
        
        // Fetch the processed summary data from the new backend endpoint
        const summaryRes = await fetch('/api/reports/attendance-summary');
        if (!summaryRes.ok) throw new Error('Failed to fetch attendance summary report.');
        setSummaryData(await summaryRes.json());

      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const filteredAttendanceData = useMemo(() => {
    let data = summaryData;
    if (selectedBatchFilter !== "all") {
      data = data.filter(d => d.batchId === selectedBatchFilter);
    }
    const department = DEPARTMENTS.find(d => d.value === selectedDepartmentFilter);
    if (selectedDepartmentFilter !== "all" && department) {
        data = data.filter(d => d.department === department.value)
    }
    return data;
  }, [summaryData, selectedBatchFilter, selectedDepartmentFilter]);

  const handleDownloadReport = () => {
    toast({
        title: "Download Preparing",
        description: "Generating detailed reports for large datasets can take time. This feature is being optimized for scale.",
        variant: "default",
    });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="View Reports" description="Loading report data..." icon={BarChart3} />
        <Card className="shadow-lg"><CardContent className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin View Reports"
        description="Analyze system-wide attendance and performance data."
        icon={BarChart3}
        actions={
          <Button onClick={handleDownloadReport} disabled>
            <Download className="mr-2 h-4 w-4" /> Download Detailed Report (WIP)
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-end">
            <Select onValueChange={setReportType} value={reportType}>
              <SelectTrigger><SelectValue placeholder="Select Report Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance-batch">Batch-wise Attendance</SelectItem>
                <SelectItem value="attendance-department" disabled>Department-wise Attendance (Coming Soon)</SelectItem>
                <SelectItem value="performance-batch" disabled>Batch-wise Performance (Coming Soon)</SelectItem>
                <SelectItem value="performance-department" disabled>Department-wise Performance (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={setSelectedBatchFilter} value={selectedBatchFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by Batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {allBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedDepartmentFilter} value={selectedDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>
      
      {reportType === "attendance-batch" ? (
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Batch-wise Attendance Overview</CardTitle></CardHeader>
          <CardContent>
            {filteredAttendanceData.length > 0 ? (
              <>
                <div className="h-[300px] w-full text-muted-foreground flex items-center justify-center">Chart library removed, visualization unavailable.</div>
                <Table className="mt-4">
                  <TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Total Students</TableHead><TableHead>Present</TableHead><TableHead>Absent</TableHead><TableHead>Late</TableHead><TableHead>Present (%)</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredAttendanceData.map(d => (
                      <TableRow key={d.batchId}>
                        <TableCell>{d.batchName}</TableCell>
                        <TableCell>{d.totalStudents}</TableCell>
                        <TableCell>{d.present}</TableCell>
                        <TableCell>{d.absent}</TableCell>
                        <TableCell>{d.late}</TableCell>
                        <TableCell>{(d.totalMarks > 0 ? (d.present / d.totalMarks * 100) : 0).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">No attendance data available for the selected filters.</p>
            )}
          </CardContent>
        </Card>
      ) : (
         <Card className="shadow-lg">
          <CardHeader><CardTitle>Report Data (Coming Soon)</CardTitle></CardHeader>
          <CardContent>
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This report type is currently under development. Please check back later.
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
