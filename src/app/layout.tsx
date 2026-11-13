import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { UiProvider } from "@/components/ui";
import AutoTranslate from "@/components/AutoTranslate";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "EduFlow", template: "%s · EduFlow" },
  description: "Müəllim və tələbələr üçün təhsil platforması — testlər, videodərslər, qruplar və coin sistemi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" suppressHydrationWarning>
      <head>
        {/* Seçilmiş dil AZ deyilsə, səhifə tərcümə olunana qədər gizlədilir (köhnə dil “yanıb-sönməsin”); 1.5 san sonra hər halda göstərilir */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem("eduflow-lang");if(l&&l!=="AZ"){var d=document.documentElement;d.lang=l.toLowerCase();d.classList.add("i18n-pending");setTimeout(function(){d.classList.remove("i18n-pending")},1500)}}catch(e){}`,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <UiProvider>{children}</UiProvider>
        </AuthProvider>
        <AutoTranslate />
      </body>
    </html>
  );
}
