"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Buttons that raise a success and an error toast in the catalogue. */
export function ToastDemo({
  labels,
}: {
  labels: { show: string; showError: string; success: string; error: string };
}) {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => toast(labels.success, "success")}>
        {labels.show}
      </Button>
      <Button variant="secondary" onClick={() => toast(labels.error, "error")}>
        {labels.showError}
      </Button>
    </div>
  );
}
