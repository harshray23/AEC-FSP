
"use client";

import React, { useState, useEffect } from 'react';
import RoleSelector from "@/components/auth/RoleSelector";
import { SplashTransition } from '@/components/shared/SplashTransition';

export default function RootPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect ensures the splash screen is shown for a bit on the client.
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2500); 

      return () => clearTimeout(timer);
    } else {
        setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <SplashTransition />;
  }
  
  return (
    <main 
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      <RoleSelector />
    </main>
  );
}
