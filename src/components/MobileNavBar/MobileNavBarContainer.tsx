"use client";

import { usePathname } from "next/navigation";
import MobileNavBar from "./MobileNavBar";

export default function MobileNavBarContainer() {
  const pathname = usePathname();
  
  // Don't show mobile nav bar on admin pages
  if (pathname.startsWith("/admin")) {
    return null;
  }
  
  return <MobileNavBar />;
}
