
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Edit3, Mail, Phone, UserSquare2, Hash, Building, ImagePlus, ClipboardList, Loader2, BookCopy, MapPin, User, HeartPulse, School, Calendar, CheckCircle2 } from "lucide-react";
import type { Student, AcademicDetails } from "@/lib/types";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { USER_ROLES, DEPARTMENTS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChangePasswordDialog } from "@/components/shared/ChangePasswordDialog";
import AcademicDetailsForm, { type AcademicFormValues } from "@/components/student/AcademicDetailsForm";
import StudentEditProfileForm, { type EditStudentProfileFormValues } from "@/components/student/StudentEditProfileForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function StudentProfilePage() {
  const [studentProfile, setStudentProfile] = useState<Partial<Student>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAcademics, setIsSavingAcademics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isAcademicDialogOpen, setIsAcademicDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    let studentIdFromStorage: string | null = null;
    const storedUserJSON = localStorage.getItem("currentUser");
    
    if (storedUserJSON) {
        const user = JSON.parse(storedUserJSON);
        if (user && user.role === USER_ROLES.STUDENT && (user.studentId || user.id)) {
            studentIdFromStorage = user.studentId || user.id;
        }
    }

    if (!studentIdFromStorage) {
        toast({
            title: "Error",
            description: "Could not identify student. Please log in again.",
            variant: "destructive",
        });
        router.push("/login?role=student");
        setIsLoading(false);
        return;
    }

    try {
      const res = await fetch(`/api/students/profile?studentId=${studentIdFromStorage}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Failed to fetch profile (${res.status})` }));
        throw new Error(errorData.message || `Error: ${res.status}`);
      }
      const data: Student = await res.json();
      setStudentProfile(data);
    } catch (error: any) {
      setError(error.message || "Failed to load profile.");
      toast({
        title: "Failed to load profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [router, toast]);
  
  const handleSaveProfile = async (values: EditStudentProfileFormValues) => {
    if (!studentProfile.id) return;
    setIsSaving(true);
    try {
        const newEditCount = (studentProfile.profileEditCount || 0) + 1;
        const payload = { ...values, profileEditCount: newEditCount };

        const response = await fetch(`/api/students/${studentProfile.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to save profile details.");
        }
        setStudentProfile(result.student);
        localStorage.setItem("currentUser", JSON.stringify(result.student));
        toast({ title: "Success", description: "Profile details saved successfully." });
        setIsEditing(false);
    } catch (error: any) {
        toast({ title: "Error Saving", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveAcademics = async (values: AcademicFormValues) => {
    if (!studentProfile.id) return;
    setIsSavingAcademics(true);
    try {
        const payload = {
            ...studentProfile.academics,
            ...values,
        };
        const response = await fetch(`/api/students/${studentProfile.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ academics: payload }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to save academic details.");
        }
        setStudentProfile(result.student); 
        toast({ title: "Success", description: "Academic details saved successfully." });
        setIsAcademicDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Error Saving", description: error.message, variant: "destructive" });
    } finally {
        setIsSavingAcademics(false);
    }
  };

  const fallbackName = studentProfile.name || "Student";
  const avatarText = fallbackName.split(' ').map(n => n[0]).join('').toUpperCase() || 'S';
  const departmentLabel = DEPARTMENTS.find(d => d.value === studentProfile?.department)?.label || studentProfile?.department || "N/A";

  const presentAddress = [
    studentProfile.address?.street,
    studentProfile.address?.city,
    studentProfile.address?.state,
    studentProfile.address?.pincode,
    studentProfile.address?.country,
  ].filter(Boolean).join(', ');

  const permanentAddress = [
    studentProfile.permanentAddress?.street,
    studentProfile.permanentAddress?.city,
    studentProfile.permanentAddress?.state,
    studentProfile.permanentAddress?.pincode,
    studentProfile.permanentAddress?.country,
  ].filter(Boolean).join(', ');

  if (isLoading) {
    return (
       <div className="space-y-8">
        <PageHeader title="Loading Profile..." icon={Loader2} />
        <Card className="shadow-lg max-w-3xl mx-auto">
          <CardHeader className="items-center text-center border-b pb-6">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(7)].map((_, i) => (
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
        <PageHeader title="Error" icon={GraduationCap} />
        <Alert variant="destructive" className="max-w-3xl mx-auto">
          <AlertTitle>Could not load profile</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!studentProfile || Object.keys(studentProfile).length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Profile Not Found" icon={GraduationCap} />
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
        description={isEditing ? "Update your personal information." : "View and manage your personal information."}
        icon={GraduationCap}
        actions={
          !isEditing && (
            <div className="flex flex-col items-end">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                disabled={(studentProfile.profileEditCount || 0) >= 2}
              >
                <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
              {(studentProfile.profileEditCount || 0) >= 2 && (
                 <p className="text-xs text-destructive mt-1">Edit limit reached. Contact admin.</p>
              )}
            </div>
          )
        }
      />

      <Card className="shadow-lg max-w-3xl mx-auto p-6">
        {isEditing ? (
            <StudentEditProfileForm
                studentData={studentProfile}
                onSave={handleSaveProfile}
                onCancel={() => setIsEditing(false)}
                isSaving={isSaving}
            />
        ) : (
          <>
            <CardHeader className="items-center text-center border-b pb-6 p-0">
              <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
                <AvatarImage src={(studentProfile as any).avatarUrl || `https://placehold.co/150x150.png?text=${avatarText}`} alt={studentProfile.name} data-ai-hint="student avatar" />
                <AvatarFallback>{avatarText}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{studentProfile.name || "N/A"}</CardTitle>
              <CardDescription>{studentProfile.studentId || "N/A"}</CardDescription>
              <div className="mt-4 flex gap-2">
                <Badge variant={studentProfile.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  Status: {studentProfile.status || 'Active'}
                </Badge>
                {studentProfile.isEmailVerified && (
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Email Verified
                  </Badge>
                )}
              </div>
              <Button variant="outline" className="mt-4" disabled>
                <ImagePlus className="mr-2 h-4 w-4" /> Change Photo (Not Implemented)
              </Button>
            </CardHeader>
            <CardContent className="p-0 pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email" className="flex items-center text-muted-foreground"><Mail className="mr-2 h-4 w-4" />Email</Label>
                  <Input id="email" value={studentProfile.email || "N/A"} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center text-muted-foreground"><Phone className="mr-2 h-4 w-4" />Phone Number</Label>
                  <Input id="phone" value={studentProfile.phoneNumber || "N/A"} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="whatsapp" className="flex items-center text-muted-foreground"><Phone className="mr-2 h-4 w-4" />WhatsApp Number</Label>
                  <Input id="whatsapp" value={studentProfile.whatsappNumber || 'N/A'} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="department" className="flex items-center text-muted-foreground"><Building className="mr-2 h-4 w-4" />Department</Label>
                  <Input id="department" value={departmentLabel} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="section" className="flex items-center text-muted-foreground"><ClipboardList className="mr-2 h-4 w-4" />Section</Label>
                  <Input id="section" value={studentProfile.section || "N/A"} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="rollNumber" className="flex items-center text-muted-foreground"><UserSquare2 className="mr-2 h-4 w-4" />Roll Number</Label>
                  <Input id="rollNumber" value={studentProfile.rollNumber || "N/A"} readOnly className="mt-1 bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="regNumber" className="flex items-center text-muted-foreground"><Hash className="mr-2 h-4 w-4" />Registration Number</Label>
                  <Input id="regNumber" value={studentProfile.registrationNumber || "N/A"} readOnly className="mt-1 bg-muted/30" />
                </div>
                 <div>
                  <Label htmlFor="accountStatus" className="flex items-center text-muted-foreground"><User className="mr-2 h-4 w-4" />Client Side Status</Label>
                  <Input id="accountStatus" value={studentProfile.status === 'active' ? 'Active' : 'Inactive'} readOnly className="mt-1 bg-muted/30 capitalize" />
                </div>
              </div>

              <Card className="bg-secondary/50 mt-6">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><User/>Personal & Address Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     {studentProfile.personalDetails ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <p><strong>Father's Name:</strong> {studentProfile.personalDetails.fatherName || 'N/A'}</p>
                            <p><strong>Mother's Name:</strong> {studentProfile.personalDetails.motherName || 'N/A'}</p>
                            <p><strong>Father's Phone:</strong> {studentProfile.personalDetails.fatherPhone || 'N/A'}</p>
                            <p><strong>Mother's Phone:</strong> {studentProfile.personalDetails.motherPhone || 'N/A'}</p>
                            <p><strong>Father's Email:</strong> {studentProfile.personalDetails.fatherEmail || 'N/A'}</p>
                            <p><strong>Mother's Email:</strong> {studentProfile.personalDetails.motherEmail || 'N/A'}</p>
                            <p><strong>Father's Occupation:</strong> {studentProfile.personalDetails.fatherOccupation || 'N/A'}</p>
                            <p><strong>Mother's Occupation:</strong> {studentProfile.personalDetails.motherOccupation || 'N/A'}</p>
                            <p className="flex items-center gap-1.5"><HeartPulse className="h-4 w-4 text-primary"/><strong>Blood Group:</strong> {studentProfile.personalDetails.bloodGroup || 'N/A'}</p>
                            <p className="flex items-center gap-1.5"><School className="h-4 w-4 text-primary"/><strong>Last School:</strong> {studentProfile.personalDetails.schoolName || 'N/A'}</p>
                            <p className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary"/><strong>Date of Birth:</strong> {studentProfile.personalDetails.dateOfBirth ? format(parseISO(studentProfile.personalDetails.dateOfBirth), 'PPP') : 'N/A'}</p>
                            <p className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-primary"/><strong>Current Semester:</strong> {studentProfile.personalDetails.currentSemester || 'N/A'}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No parent/guardian details added yet.</p>
                    )}
                    
                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-1"><MapPin className="h-4 w-4"/>Present Address</h4>
                        <p className="text-sm text-muted-foreground pl-6">
                            {presentAddress || "No present address added yet."}
                        </p>
                    </div>
                    
                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-1"><MapPin className="h-4 w-4"/>Permanent Address</h4>
                        <p className="text-sm text-muted-foreground pl-6">
                            {permanentAddress || "No permanent address added yet."}
                        </p>
                    </div>
                </CardContent>
              </Card>
              
              <Card className="bg-secondary/50 mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Account Security</CardTitle>
                </CardHeader>
                <CardContent>
                     <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(true)}>Change Password</Button>
                </CardContent>
              </Card>

              <Card className="bg-secondary/50 mt-6">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-2"><BookCopy /> Academic Details</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setIsAcademicDialogOpen(true)}>Add / Edit Academics</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(studentProfile.academics?.class10 || studentProfile.academics?.class12 || studentProfile.academics?.semesters || studentProfile.academics?.tests) ? (
                     <div className="space-y-4">
                        {studentProfile.academics?.class12 && (
                            <div>
                                <h4 className="font-semibold">Class 12th</h4>
                                <p className="text-sm text-muted-foreground">Board: {studentProfile.academics.class12?.board || 'N/A'}, Percentage: {studentProfile.academics.class12?.percentage || 'N/A'}%</p>
                            </div>
                        )}
                         {studentProfile.academics?.class10 && (
                            <div>
                                <h4 className="font-semibold">Class 10th</h4>
                                <p className="text-sm text-muted-foreground">Board: {studentProfile.academics.class10?.board || 'N/A'}, Percentage: {studentProfile.academics.class10?.percentage || 'N/A'}%</p>
                            </div>
                        )}
                        {studentProfile.academics?.semesters && Object.values(studentProfile.academics.semesters).some(sgpa => sgpa) && (
                            <div>
                                <h4 className="font-semibold">Semester SGPA</h4>
                                <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm list-inside text-muted-foreground">
                                {Object.entries(studentProfile.academics.semesters).map(([sem, sgpa]) => (
                                    sgpa ? <li key={sem}>Sem {sem.replace('sem', '')}: <span className="font-mono">{sgpa.toFixed(2)}</span></li> : null
                                ))}
                                </ul>
                            </div>
                        )}
                        {studentProfile.academics?.tests && studentProfile.academics.tests.length > 0 ? (
                            <div className="mt-4">
                                <h4 className="font-semibold">Test Performances</h4>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Test Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentProfile.academics.tests.map(test => (
                                    <TableRow key={test.id}>
                                        <TableCell>{test.testName}</TableCell>
                                        <TableCell>{format(parseISO(test.testDate), "PPP")}</TableCell>
                                        <TableCell>{test.marksObtained} / {test.maxMarks}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </div>
                            ) : (
                            <p className="text-muted-foreground text-sm mt-4">No test records added yet.</p>
                            )}
                     </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No academic details added yet.</p>
                  )}
                </CardContent>
              </Card>

            </CardContent>
          </>
        )}
      </Card>
      
      <ChangePasswordDialog 
        isOpen={isChangePasswordDialogOpen}
        onClose={() => setIsChangePasswordDialogOpen(false)}
        userEmail={studentProfile?.email || ""}
      />

      {isAcademicDialogOpen && (
        <AcademicDetailsForm
            isOpen={isAcademicDialogOpen}
            onClose={() => setIsAcademicDialogOpen(false)}
            onSave={handleSaveAcademics}
            isSaving={isSavingAcademics}
            initialData={studentProfile.academics}
        />
      )}

    </div>
  );
}
