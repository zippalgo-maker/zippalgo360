import { Suspense } from "react";
import ZipServiceWizard from "@/components/lifestyle/ZipServiceWizard";

export default function ZipServiceNewPage() {
  return (
    <Suspense>
      <ZipServiceWizard />
    </Suspense>
  );
}
