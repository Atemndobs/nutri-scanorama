import { useNetworkStatus } from "@/hooks/use-network-status";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showToast) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full",
        isOnline
          ? "bg-green-500/90 text-white"
          : "bg-yellow-500/90 text-white"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline</span>
        </>
      )}
    </div>
  );
}
