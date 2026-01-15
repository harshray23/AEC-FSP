
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Clock, User, Shield, Briefcase, GraduationCap, Loader2 } from "lucide-react";
import type { ActivityLog } from '@/lib/types';
import { format, subDays, eachDayOfInterval } from "date-fns";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <Shield className="h-4 w-4 text-red-500" />;
    case 'teacher': return <Briefcase className="h-4 w-4 text-green-500" />;
    case 'student': return <GraduationCap className="h-4 w-4 text-blue-500" />;
    case 'host': return <User className="h-4 w-4 text-orange-500" />;
    default: return <User className="h-4 w-4 text-gray-500" />;
  }
};

export default function ActivityMonitorPage() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/activity');
        if (!response.ok) {
          throw new Error('Failed to fetch activity logs.');
        }
        const data: ActivityLog[] = await response.json();
        setActivities(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivities();
  }, [toast]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Activity Monitor"
        description="View recent system activities and monitor usage patterns."
        icon={BarChart3}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Activity Overview (Last 30 Days)</CardTitle>
          <CardDescription>A chart showing the number of activities per day.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
             <div className="h-[300px] w-full text-muted-foreground flex items-center justify-center">Chart library removed, visualization unavailable.</div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Log</CardTitle>
          <CardDescription>A detailed list of the most recent system activities.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.length > 0 ? (
                    activities.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(log.timestamp), "dd MMM, hh:mm a")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(log.role)}
                            <div>
                              <p className="font-medium">{log.user}</p>
                              <Badge variant="outline" className="capitalize">{log.role === 'host' ? 'Management' : log.role}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="text-muted-foreground">{log.details}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No activity recorded yet.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
