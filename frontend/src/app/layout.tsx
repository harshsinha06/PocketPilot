import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const themeScript = `(function(){try{var t=localStorage.getItem("pocketpilot-theme");var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark");}catch(e){}})();`;

export const metadata: Metadata = {
  title: "PocketPilot",
  description: "A simple monthly budget tracker for college students.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={sourceSans.className}>
        <Script id="pocketpilot-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
