import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/components/ProductSelector";

const INGESTION_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown
const STORAGE_KEY_PREFIX = "last_ingestion_";

export const useAutoIngestion = (selectedProduct: Product, enabled: boolean = true) => {
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!enabled || hasTriggered.current) return;

    const checkAndIngest = async () => {
      const storageKey = `${STORAGE_KEY_PREFIX}${selectedProduct}`;
      const lastIngestion = localStorage.getItem(storageKey);
      const now = Date.now();

      // Check if we're within the cooldown period
      if (lastIngestion && now - parseInt(lastIngestion, 10) < INGESTION_COOLDOWN_MS) {
        console.log(`Skipping auto-ingestion for ${selectedProduct}: within cooldown period`);
        return;
      }

      hasTriggered.current = true;
      console.log(`Auto-ingesting data for ${selectedProduct}...`);

      try {
        // Trigger Reddit ingestion silently
        const { error: redditError } = await supabase.functions.invoke("ingest-reddit", {
          body: { product: selectedProduct },
        });

        if (redditError) {
          console.error("Auto-ingestion Reddit error:", redditError);
        }

        // Trigger MSQA ingestion silently
        const { error: msqaError } = await supabase.functions.invoke("ingest-msqa", {
          body: { product: selectedProduct },
        });

        if (msqaError) {
          console.error("Auto-ingestion MSQA error:", msqaError);
        }

        // Update last ingestion timestamp
        localStorage.setItem(storageKey, now.toString());
        console.log(`Auto-ingestion completed for ${selectedProduct}`);
      } catch (error) {
        console.error("Auto-ingestion failed:", error);
      }
    };

    // Delay slightly to not block initial render
    const timeoutId = setTimeout(checkAndIngest, 2000);

    return () => clearTimeout(timeoutId);
  }, [selectedProduct, enabled]);
};
