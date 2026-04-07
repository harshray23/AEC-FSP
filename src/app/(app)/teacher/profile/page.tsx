
"use client"; 

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Edit3, Mail, Phone, Building, ImagePlus, BadgePercent, Briefcase, Loader2, CheckCircle2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { USER_ROLES, DEPARTMENTS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import type { Teacher } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TeacherEditProfileForm, { type EditTeacherProfileFormValues } from "@/components/teacher/TeacherEditProfileForm";
import { ChangePasswordDialog } from "@/components/shared/ChangePasswordDialog";
import { Badge } from "@/components/ui/badge";

export default function TeacherProfilePage() {
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    let teacherIdFromStorage: string | null = null;
    const storedUserJSON = localStorage.getItem("currentUser");
    
    if (storedUserJSON) {
        const user = JSON.parse(storedUserJSON);
        if (user && user.role === USER_ROLES.TEACHER && user.id) {
            teacherIdFromStorage = user.id;
        }
    }

    if (!teacherIdFromStorage) {
        toast({
            title: "Authentication Error",
            description: "Could not identify teacher. Please log in again.",
            variant: "destructive",
        });
        router.push("/login?role=teacher");
        setIsLoading(false);
        return;
    }

    try {
      const res = await fetch(`/api/teachers/${teacherIdFromStorage}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Failed to fetch profile (${res.status})` }));
        throw new Error(errorData.message || `Error: ${res.status}`);
      }
      const data: Teacher = await res.json();
      setTeacherProfile(data);
    } catch (err: any) {
      setError(err.message || "Failed to load profile.");
      toast({
        title: "Failed to load profile",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [router, toast]); 

  const handleSaveProfile = async (values: EditTeacherProfileFormValues) => {
    if (!teacherProfile) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/teachers/${teacherProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update profile.'}));
        throw new Error(errorData.message);
      }
      const updatedTeacher = await response.json();
      setTeacherProfile(updatedTeacher.teacher); 
      localStorage.setItem("currentUser", JSON.stringify(updatedTeacher.teacher));

      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      setIsEditing(false);
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  

  const fallbackName = teacherProfile?.name || "Teacher";
  const avatarText = fallbackName.split(' ').map(n => n[0]).join('').toUpperCase() || 'T';
  const departmentLabel = DEPARTMENTS.find(d => d.value === teacherProfile?.department)?.label || teacherProfile?.department || "N/A";


  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Loading Profile..." icon={Loader2} />
        <Card className="shadow-lg max-w-3xl mx-auto">
          <CardHeader className="items-center text-center border-b pb-6">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => ( 
                <div key={i}><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-10 w-full" /></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
     return (
      <div className="space-y-8">
        <PageHeader title="Error" icon={UserCircle} />
        <Alert variant="destructive" className="max-w-3xl mx-auto">
          <AlertTitle>Could not load profile</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!teacherProfile) {
    return (
      <div className="space-y-8">
        <PageHeader title="Profile Not Found" icon={UserCircle} />
        <Alert variant="default" className="max-w-3xl mx-auto">
          <AlertTitle>Profile data is unavailable.</AlertTitle>
          <AlertDescription>Please try logging out and logging back in.</AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title={isEditing ? "Edit Profile" : "My Profile"}
        description={isEditing ? "Update your teacher information." : "View and manage your teacher information."}
        icon={UserCircle} 
        actions={
          !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )
        }
      />

      <Card className="shadow-lg max-w-3xl mx-auto">
        {isEditing ? (
          <TeacherEditProfileForm 
            teacherData={teacherProfile} 
            onSave={handleSaveProfile} 
            onCancel={() => setIsEditing(false)}
            isSaving={isSaving}
          />
        ) : (
          <>
            <CardHeader className="items-center text-center border-b pb-6">
              <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
                <AvatarImage src={(teacherProfile as any).avatarUrl || `https://placehold.co/150x150.png?text=${avatarText}`} alt={teacherProfile.name} data-ai-hint="teacher avatar"/>
                <AvatarFallback>{avatarText}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{teacherProfile.name || "N/A"}</CardTitle>
              <CardDescription>{teacherProfile.email || "N/A"}</CardDescription>
              <div className="mt-4 flex gap-2 justify-center">
                <Badge variant={teacherProfile.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  Status: {teacherProfile.status?.replace('_', ' ') || 'Active'}
                </Badge>
                {teacherProfile.status === 'active' && (
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active Account
                  </Badge>
                )}
              </div>
              {teacherProfile.username && (
                <CardDescription className="text-sm mt-1">Username: <span className="font-semibold text-primary">@{teacherProfile.username}</span></CardDescription>
              )}
              <Button variant="outline" className="mt-4" disabled>
                <ImagePlus className="mr-2 h-4 w-4" /> Change Photo (Not Implemented)
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="usernameDisplay" className="flex items-center text-muted-foreground"><BadgePercent className="mr-2 h-4 w-4" />Username</Label>
                  <Input id="usernameDisplay" value={teacherProfile.username || 'Not Assigned'} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center text-muted-foreground"><Mail className="mr-2 h-4 w-4" />Email</Label>
                  <Input id="email" value={teacherProfile.email || "N/A"} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center text-muted-foreground"><Phone className="mr-2 h-4 w-4" />Phone Number</Label>
                  <Input id="phone" value={teacherProfile.phoneNumber || "N/A"} readOnly className="mt-1 bg-muted/30" />
                </div>
                 <div>
                  <Label htmlFor="whatsapp" className="flex items-center text-muted-foreground"><Phone className="mr-2 h-4 w-4" />WhatsApp Number</Label>
                  <Input id="whatsapp" value={teacherProfile.whatsappNumber || 'N/A'} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="department" className="flex items-center text-muted-foreground"><Building className="mr-2 h-4 w-4" />Department</Label>
                  <Input id="department" value={departmentLabel} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="status" className="flex items-center text-muted-foreground"><Briefcase className="mr-2 h-4 w-4" />Account Status</Label>
                  <Input id="status" value={teacherProfile.status?.replace('_', ' ') || "N/A"} readOnly className="mt-1 bg-muted/30 capitalize" />
                </div>
              </div>
              
              <Card className="bg-secondary/50 mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Account Security</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(true)}>Change Password</Button>
                </CardContent>
              </Card>
            </CardContent>
          </>
        )}
      </Card>
      <ChangePasswordDialog 
        isOpen={isChangePasswordDialogOpen}
        onClose={() => setIsChangePasswordDialogOpen(false)}
        userEmail={teacherProfile?.email || ""}
      />
    </div>
  );
}
