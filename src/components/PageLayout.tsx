"use client";

import { Header } from "./Header";

interface PageLayoutProps {
  children: React.ReactNode;
  rightContent?: React.ReactNode;
  showLogoAsLink?: boolean;
}

export function PageLayout({
  children,
  rightContent,
  showLogoAsLink = false,
}: PageLayoutProps) {
  return (
    <div className="h-screen w-screen bg-background flex flex-col">
      <header className="flex justify-between items-start py-8 px-12 shrink-0">
        <Header asLink={showLogoAsLink} />
        {rightContent}
      </header>
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
