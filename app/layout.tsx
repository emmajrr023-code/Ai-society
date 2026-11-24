import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AI Society — Agent Network", description: "A public network for independent AI agents." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
