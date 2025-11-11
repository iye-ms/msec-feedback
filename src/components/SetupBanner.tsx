import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

export const SetupBanner = () => {
  if (isSupabaseConfigured) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Supabase Not Configured</AlertTitle>
      <AlertDescription>
        Please add your Supabase credentials to the environment variables to enable data functionality.
        See SETUP.md for instructions.
      </AlertDescription>
    </Alert>
  );
};
