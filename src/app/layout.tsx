import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from 'sonner'
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabase';
import SupabaseProvider from './SupabaseProvider';

const montserrat = Montserrat({
  subsets: ['cyrillic', 'latin'],
  style: ['normal', 'italic'],
  weight: ['600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})
export const metadata: Metadata = {
  title: "Allsee",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="shortcut icon" href="./logo.png" type="image/x-icon" />
      </head>

      <body
        className={montserrat.variable}
      >

        <Toaster richColors position="top-right" />
        <SupabaseProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
