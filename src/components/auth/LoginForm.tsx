
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react"; 
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, limit, getDocsFromServer } from "firebase/firestore";
import { app as firebaseApp, db as clientDb } from "@/firebase/index";

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
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { Badge } from "../ui/badge";
import { Wifi, WifiOff, Loader2 } from "lucide-react";


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
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && (!role || !Object.values(USER_ROLES).includes(role))) {
      router.push('/');
    }
    
    // Connectivity Check specifically for Firestore in Workstations
    const checkConnection = async () => {
      try {
        const q = query(collection(clientDb, "students"), limit(1));
        await getDocsFromServer(q);
        setIsOnline(true);
      } catch (e) {
        console.warn("Firestore connection check failed:", e);
        setIsOnline(window.navigator.onLine);
      }
    };

    checkConnection();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

      // 1. Attempt to create server-side session (Non-blocking fallback)
      const idToken = await firebaseUser.getIdToken();
      try {
        await fetch('/api/auth/session-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (sessionErr) {
        console.warn("Server-side session creation skipped.");
      }

      // 2. Fetch Profile with resilient fallback
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

      let firestoreProfile: any = null;
      
      try {
        const profileRes = await fetch(profileApiUrl);
        if (profileRes.ok) {
          firestoreProfile = await profileRes.json();
        } else {
          throw new Error("API unavailable");
        }
      } catch (apiErr) {
        const collectionMap = {
          [USER_ROLES.STUDENT]: 'students',
          [USER_ROLES.TEACHER]: 'teachers',
          [USER_ROLES.ADMIN]: 'admins',
          [USER_ROLES.HOST]: 'hosts',
        };
        const collectionName = collectionMap[role as keyof typeof collectionMap];
        const docRef = doc(clientDb, collectionName, firebaseUser.uid);
        
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          firestoreProfile = { id: docSnap.id, ...docSnap.data() };
        } else {
          const q = query(collection(clientDb, collectionName), where("email", "==", firebaseUser.email));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            firestoreProfile = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
          }
        }
      }
      
      if (!firestoreProfile) {
        firestoreProfile = { 
          role: role, 
          status: 'active', 
          name: firebaseUser.displayName || values.email.split('@')[0] 
        };
      }

      if (!firestoreProfile.role) firestoreProfile.role = role;
      if (!firestoreProfile.status) firestoreProfile.status = 'active';

      if (firestoreProfile.status !== 'active' && firestoreProfile.status !== 'pending_approval') {
        const statusMessage = firestoreProfile.status.replace("_", " ");
        throw new Error(`Account status is '${statusMessage}'. Login is disabled.`);
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
      console.error("Login process error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred. Please check your credentials.",
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
        <div className="flex justify-center pt-2">
          {isOnline === null ? (
            <Badge variant="outline" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verifying Connection...
            </Badge>
          ) : isOnline ? (
            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
              <Wifi className="w-3 h-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="animate-bounce">
              <WifiOff className="w-3 h-3 mr-1" /> Client is Offline
            </Badge>
          )}
        </div>
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
