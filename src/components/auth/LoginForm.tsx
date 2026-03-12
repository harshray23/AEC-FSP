
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react"; 
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app as firebaseApp } from "@/firebase";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { USER_ROLES, type UserRole } from "@/lib/constants";
import type { Host, Admin, Teacher } from "@/lib/types";
import { LoadingSpinner } from "../shared/LoadingSpinner";


const loginFormSchema = z.object({
  email: z.string().email("A valid email is required for login."),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const role = searchParams.get("role") as UserRole | null;
  const auth = getAuth(firebaseApp);
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && (!role || !Object.values(USER_ROLES).includes(role))) {
      router.push('/');
    }
  }, [role, router]);

  const onSubmit = async (values: LoginFormValues) => {
    if (!role) {
      toast({ title: "Error", description: "Role is missing.", variant: "destructive" });
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser) {
        throw new Error("Authentication succeeded but no user was found.");
      }

      // Create server-side session
      const idToken = await firebaseUser.getIdToken();
      const sessionResponse = await fetch('/api/auth/session-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      
      if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json().catch(() => ({ message: "Failed to create a server-side session." }));
          throw new Error(errorData.message);
      }

      let profileApiUrl: string;
      let successRedirectPath: string;

      switch (role) {
        case USER_ROLES.STUDENT:
          profileApiUrl = `/api/students/profile?studentId=${firebaseUser.uid}`;
          successRedirectPath = "/student/dashboard";
          break;
        case USER_ROLES.TEACHER:
          profileApiUrl = `/api/teachers/${firebaseUser.uid}`;
          successRedirectPath = "/teacher/dashboard";
          break;
        case USER_ROLES.ADMIN:
          profileApiUrl = `/api/admins/${firebaseUser.uid}`;
          successRedirectPath = "/admin/dashboard";
          break;
        case USER_ROLES.HOST:
          profileApiUrl = `/api/hosts/${firebaseUser.uid}`;
          successRedirectPath = "/host/dashboard";
          break;
        default:
          throw new Error("Invalid role selection.");
      }

      const profileRes = await fetch(profileApiUrl);

      if (!profileRes.ok) {
        const errorData = await profileRes.json().catch(() => ({ message: `Account profile not found for role '${role}'.` }));
        throw new Error(errorData.message);
      }
      
      const firestoreProfile: Teacher | Admin | Host = await profileRes.json();
      
      if (firestoreProfile.status && firestoreProfile.status !== 'active') {
        const statusMessage = firestoreProfile.status.replace("_", " ");
        throw new Error(`Your account status is '${statusMessage}'. Login is currently disabled.`);
      }

      const finalUserData = {
        ...firestoreProfile,
        uid: firebaseUser.uid,
        id: firebaseUser.uid, 
        email: firebaseUser.email,
        isEmailVerified: firebaseUser.emailVerified,
      };

      localStorage.setItem("currentUser", JSON.stringify(finalUserData));
      
      toast({
        title: "Login Successful!",
        description: `Welcome back, ${finalUserData.name || 'User'}!`,
      });

      setIsLoginSuccess(true);
      router.push(successRedirectPath);

    } catch (error: any) {
      console.error("Login Error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred. Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoginSuccess) {
    return (
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="flex flex-col items-center justify-center p-6 min-h-[300px]">
          <LoadingSpinner size={120} />
          <p className="text-lg font-medium text-foreground mt-4">Login Successful</p>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  if (!role) return null;

  let roleTitle = role.charAt(0).toUpperCase() + role.slice(1);
  if (role === USER_ROLES.HOST) {
    roleTitle = "Management";
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">
          {roleTitle} Login
        </CardTitle>
        <CardDescription className="text-center">
          Enter your email and password to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="flex items-center justify-end text-sm">
              <Link
                href={`/forgot-password?role=${role}&email=${form.getValues('email')||''}`}
                className="font-medium text-primary hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Form>
        
         <div className="mt-4 text-center text-sm">
            <Link href="/" className="font-medium text-muted-foreground hover:text-primary hover:underline">
              Back to Role Selection
            </Link>
          </div>
      </CardContent>
    </Card>
  );
}
