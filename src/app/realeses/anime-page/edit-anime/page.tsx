"use client";

import { Suspense } from "react";
import AnimeEditor from "@/components/AnimeEditor/AnimeEditor";

export default function EditAnimePage() {
  return (
    <Suspense>
      <AnimeEditor />
    </Suspense>
  );
}
