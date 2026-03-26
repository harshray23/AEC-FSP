
"use client"; 

import { DashboardLayout } from "@/components/shared/DashboardLayout";
import type { NavItem, User, Student, Teacher, Admin, Host } from "@/lib/types";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserPlus, BookUser, CalendarDays, BarChart3, Settings, GraduationCap, ShieldAlert, Briefcase, UserCog, UserCircle, CheckSquare, MonitorPlay, ServerCog, FileCog, UserCheck, CalendarCheck2, Megaphone, PlusCircle, BookCopy, TrendingUp, UserX, ListChecks, UploadCloud } from "lucide-react"; 
import React, { useState, useEffect } from "react";
import { USER_ROLES } from "@/lib/constants";

interface GuestUser {
  id: string;
  name: string;
  email: string;
  role: 'guest';
}

type CurrentUserType = Student | Teacher | Admin | Host | GuestUser;


const getNavItems = (role: "student" | "teacher" | "admin" | "host" | "guest"): NavItem[] => {
  switch (role) {
    case "student":
      return [
        { href: "/student/dashboard", label: "My Dashboard", icon: LayoutDashboard, tooltip: "View your batch and attendance" },
        { href: "/student/profile", label: "My Profile", icon: UserCircle, tooltip: "View your profile" },
        { href: "/student/attendance-calendar", label: "Attendance Calendar", icon: CalendarCheck2, tooltip: "View attendance on calendar" },
      ];
    case "teacher":
      return [
        { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard, tooltip: "Teacher overview" },
        { href: "/teacher/profile", label: "My Profile", icon: UserCircle, tooltip: "View your profile" },
        { href: "/teacher/my-assigned-batches", label: "My Assigned Batches", icon: BookUser, tooltip: "View batches assigned to you" },
        { href: "/teacher/attendance", label: "Manage Attendance", icon: CheckSquare, tooltip: "Mark student attendance" },
        { href: "/teacher/view-attendance", label: "View Attendance", icon: ListChecks, tooltip: "View detailed attendance reports" },
        { href: "/teacher/promote-students", label: "Promote Students", icon: TrendingUp, tooltip: "Promote students to next year" },
        { href: "/teacher/timetables", label: "View Timetables", icon: CalendarDays, tooltip: "View timetables for assigned batches" }, 
        { href: "/teacher/reports", label: "Reports", icon: BarChart3, tooltip: "View reports for assigned batches" },
      ];
    case "admin":
      return [
        { href: "/admin/dashboard", label: "Admin Dashboard", icon: ShieldAlert, tooltip: "System overview" },
        { href: "/admin/profile", label: "My Profile", icon: UserCircle, tooltip: "View your admin profile" },
        { 
          href: "/admin/users", 
          label: "User Management", 
          icon: UserCog,
          tooltip: "Manage users",
          children: [
             { href: "/admin/users/create", label: "Register User", icon: UserPlus, tooltip: "Create a new Admin or Teacher" },
             { href: "/admin/users/bulk-create", label: "Bulk Create Students", icon: UploadCloud, tooltip: "Upload a file to create students" },
             { href: "/admin/users/teachers", label: "Manage Teachers", icon: Briefcase, tooltip: "Manage teacher accounts" },
             { href: "/admin/users/admins", label: "Manage Admins", icon: ShieldAlert, tooltip: "Manage admin accounts" },
             { href: "/admin/users/students", label: "View Students", icon: GraduationCap, tooltip: "View student accounts" },
             { href: "/admin/passed-out-students", label: "Passed Out Students", icon: UserX, tooltip: "Manage passed out students" },
          ]
        },
        { 
          href: "/admin/batches", 
          label: "Batch Management", 
          icon: BookUser, 
          tooltip: "Oversee and manage program batches",
          children: [
            { href: "/admin/batches", label: "Batch Overview", icon: BookUser, tooltip: "View all batches and create new ones" },
            { href: "/admin/batches/create", label: "Create Batch", icon: PlusCircle, tooltip: "Set up a new batch" },
          ]
        },
        { href: "/admin/academics", label: "Manage Academics", icon: BookCopy, tooltip: "Manage student test scores" },
        { href: "/admin/view-attendance", label: "View Attendance", icon: ListChecks, tooltip: "View detailed attendance reports" },
        { href: "/admin/timetables", label: "Timetable Overview", icon: CalendarDays, tooltip: "View all timetables" },
        { href: "/admin/reports", label: "View Reports", icon: BarChart3, tooltip: "View system-wide reports" }, 
        { href: "/admin/settings", label: "System Settings", icon: Settings, tooltip: "Configure system settings" },
      ];
    case "host":
      return [
        { href: "/host/dashboard", label: "Management Dashboard", icon: ServerCog, tooltip: "Management overview" },
        { href: "/host/profile", label: "My Profile", icon: UserCircle, tooltip: "View your management profile" },
        { href: "/host/user-approval", label: "User Approval", icon: UserCheck, tooltip: "Approve or reject new user registrations" },
        { href: "/host/add-host", label: "Add New Host", icon: UserPlus, tooltip: "Create a new management user" },
        { href: "/host/announcements", label: "Send Announcements", icon: Megaphone, tooltip: "Broadcast messages to users" },
        {
          href: "/host/monitoring",
          label: "Monitoring",
          icon: MonitorPlay,
          tooltip: "Monitor system components",
          children: [
            { href: "/host/monitoring/activity", label: "Activity Monitor", icon: BarChart3, tooltip: "View system activity" },
            { href: "/host/monitoring/website", label: "Website Status", icon: FileCog, tooltip: "Monitor website health" },
            { href: "/host/monitoring/batches", label: "Batch Monitor", icon: BookUser, tooltip: "Monitor batches" },
            { href: "/host/monitoring/timetables", label: "Timetable Monitor", icon: CalendarDays, tooltip: "Monitor timetables" },
            { href: "/host/monitoring/teachers", label: "Teacher Monitor", icon: Users, tooltip: "Monitor teachers" }, 
            { href: "/host/monitoring/admins", label: "Admin Monitor", icon: ShieldAlert, tooltip: "Monitor admins" },
            { href: "/host/monitoring/hosts", label: "Management Monitor", icon: ServerCog, tooltip: "Monitor management users" },
          ],
        },
      ];
    default:
      return [];
  }
};

const getServerSideUser = (pathname: string): CurrentUserType => {
  if (pathname.startsWith("/admin")) {
    return { id: "server-admin-fallback", name: "Admin", email: "admin@example.com", role: USER_ROLES.ADMIN, status: "active", username: "server_admin_fallback" };
  } else if (pathname.startsWith("/teacher")) {
    return { id: "server-teacher-fallback", name: "Teacher", email: "teacher@example.com", role: USER_ROLES.TEACHER, department: "N/A", status: "active", username: "server_teacher_fallback" };
  } else if (pathname.startsWith("/student")) {
    return { 
        id: "server-student-fallback", name: "Student", email: "student@example.com", role: USER_ROLES.STUDENT, 
        studentId: "S000F", rollNumber: "N/AF", registrationNumber: "N/AF", department: "N/AF", section: undefined, 
        phoneNumber: "N/AF", isEmailVerified: true, isPhoneVerified: true
    };
  } else if (pathname.startsWith("/host")) {
    return { id: "server-host-fallback", name: "Management", email: "host@example.com", role: USER_ROLES.HOST, status: "active" };
  }
  return { id: "server-guest-fallback", name: "User", email: "user@example.com", role: "guest" };
};


export default function AppPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const [currentUser, setCurrentUser] = useState<CurrentUserType>(() => getServerSideUser(pathname)); 

  useEffect(() => {
    const storedUserString = localStorage.getItem("currentUser");
    if (storedUserString) {
      try {
        const storedUser = JSON.parse(storedUserString);
        // Made the check more flexible: only ID and Email are strictly required for recovery
        if (storedUser && storedUser.id && storedUser.email) {
          // If role is missing, we try to infer it from the path as a last resort
          if (!storedUser.role) {
             const pathRole = pathname.split('/')[1] as any;
             if (Object.values(USER_ROLES).includes(pathRole)) {
                 storedUser.role = pathRole;
             } else {
                 storedUser.role = 'guest';
             }
          }
          setCurrentUser(storedUser);
        }
      } catch (e) {
        console.error("Error parsing currentUser from localStorage:", e);
      }
    }
  }, [pathname]);

  let displayUserRole = currentUser.role === 'guest' ? 'Guest' : currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
  if (currentUser.role === USER_ROLES.HOST) {
    displayUserRole = "Management";
  }
  
  const navItems = getNavItems(currentUser.role as any);


  return (
    <DashboardLayout 
        navItems={navItems} 
        userRole={displayUserRole}
        userName={currentUser.name}
        userEmail={currentUser.email}
    >
      {children}
    </DashboardLayout>
  );
}
