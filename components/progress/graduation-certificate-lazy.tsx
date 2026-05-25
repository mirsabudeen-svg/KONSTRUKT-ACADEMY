"use client";

import dynamic from "next/dynamic";

export const GraduationCertificateLazy = dynamic(
  () =>
    import("@/components/progress/graduation-certificate").then(
      (m) => m.GraduationCertificate
    ),
  { ssr: false }
);
