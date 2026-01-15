
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Download, Filter, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Batch, Student, AttendanceRecord } from "@/lib/types";
import { USER_ROLES } from "@/lib/constants";

export default function TeacherViewReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("attendance-batch");
  const [isLoading, setIsLoading] = useState(true);

  const [assignedBatches, setAssignedBatches] = useState<Batch[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      let teacherId: string | null = null;
      const storedUserJSON = localStorage.getItem("currentUser");
      if (storedUserJSON) {
        const user = JSON.parse(storedUserJSON);
        if (user && user.role === USER_ROLES.TEACHER) teacherId = user.id;
      }
      if (!teacherId) {
        toast({ title: "Error", description: "Could not identify teacher.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      try {
        const [batchesRes, studentsRes, attendanceRes] = await Promise.all([
          fetch('/api/batches'),
          fetch('/api/students?limit=99999'),
          fetch('/api/attendance'),
        ]);

        if (!batchesRes.ok || !studentsRes.ok || !attendanceRes.ok) {
          throw new Error('Failed to fetch all necessary report data.');
        }

        const allBatches: Batch[] = await batchesRes.json();
        const studentsApiResponse = await studentsRes.json();
        
        // Correctly filter batches assigned to the teacher
        const teacherBatches = allBatches.filter(b => b.teacherIds?.includes(teacherId!));
        
        setAssignedBatches(teacherBatches);
        setAllStudents(studentsApiResponse.students);
        setAllAttendanceRecords(await attendanceRes.json());
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const attendanceByBatchData = useMemo(() => {
    const batchMap = new Map<string, { present: number; absent: number; late: number; totalStudents: number, totalMarks: number }>();

    assignedBatches.forEach(batch => {
      // Correctly filter students who are in this batch
      const studentsInBatch = allStudents.filter(s => s.batchIds?.includes(batch.id));
      batchMap.set(batch.id, { present: 0, absent: 0, late: 0, totalStudents: studentsInBatch.length, totalMarks: 0 });
    });

    allAttendanceRecords.forEach(record => {
      const batchStats = batchMap.get(record.batchId);
      if (batchStats) {
        batchStats.totalMarks++;
        if (record.status === 'present') batchStats.present++;
        if (record.status === 'absent') batchStats.absent++;
        if (record.status === 'late') batchStats.late++;
      }
    });

    return Array.from(batchMap.entries())
      .map(([batchId, stats]) => {
        const batch = assignedBatches.find(b => b.id === batchId);
        return {
          batchId: batchId,
          batchName: batch?.name || 'Unknown Batch',
          ...stats,
        };
      });
  }, [assignedBatches, allStudents, allAttendanceRecords]);
  
  const filteredAttendanceData = useMemo(() => {
    if (selectedBatchFilter === "all") return attendanceByBatchData;
    return attendanceByBatchData.filter(d => d.batchId === selectedBatchFilter);
  }, [attendanceByBatchData, selectedBatchFilter]);

  const exportToExcel = (data: any[], fileName: string) => {
    if (data.length === 0) {
      toast({ title: "No Data", description: "There is no data to export for the selected filters.", variant: "destructive" });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ReportData");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    toast({ title: "Export Successful", description: `${fileName}.xlsx has been downloaded.` });
  };
  
  const handleDownloadReport = () => {
    if (reportType !== 'attendance-batch') {
        toast({ title: "Not Implemented", description: `Excel export for this report type is not yet available.`, variant: "default" });
        return;
    }
    const dataToExport = filteredAttendanceData.map(d => ({
        'Batch Name': d.batchName,
        'Total Students': d.totalStudents,
        'Present Sessions': d.present,
        'Absent Sessions': d.absent,
        'Late Sessions': d.late,
        'Total Marked Sessions': d.totalMarks,
        'Overall Present (%)': (d.totalMarks > 0 ? (d.present / d.totalMarks * 100) : 0).toFixed(1),
    }));
    exportToExcel(dataToExport, "Teacher_Batch_Attendance_Report");
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
        title="View Reports"
        description="Analyze attendance and performance data for your assigned batches."
        icon={BarChart3}
        actions={
          <Button onClick={handleDownloadReport} disabled={filteredAttendanceData.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download Report
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-end">
            <Select onValueChange={setReportType} value={reportType}>
              <SelectTrigger><SelectValue placeholder="Select Report Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance-batch">Batch-wise Attendance</SelectItem>
                <SelectItem value="performance-batch" disabled>Batch-wise Performance (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={setSelectedBatchFilter} value={selectedBatchFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by Batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All My Batches</SelectItem>
                {assignedBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
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
              <p className="text-muted-foreground text-center py-8">No attendance data available for the selected batch(es).</p>
            )}
          </CardContent>
        </Card>
      ) : (
         <Card className="shadow-lg">
          <CardHeader><CardTitle>Report Data (Coming Soon)</CardTitle></CardHeader>
          <CardContent>
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>This report type is currently under development. Please check back later.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
