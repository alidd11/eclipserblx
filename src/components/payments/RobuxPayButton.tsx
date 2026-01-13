import { Button } from "@/components/ui/button";
import { useRobloxGameUrl } from "@/hooks/useRobloxGameUrl";

interface RobuxPayButtonProps {
  className?: string;
}

export function RobuxPayButton({ className }: RobuxPayButtonProps) {
  const { robloxUrl } = useRobloxGameUrl();

  const handleClick = () => {
    window.open(robloxUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      size="lg"
      className={`flex-1 h-14 text-lg bg-gradient-to-r from-[#00A67D] to-[#00D9A5] hover:from-[#00B88A] hover:to-[#00E6B0] text-white border-0 ${className}`}
      onClick={handleClick}
    >
      <svg
        className="h-5 w-5 mr-2"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5.164 0L0 18.627 18.836 24 24 5.373 5.164 0zm10.291 14.273l-5.728-1.545 1.545-5.728 5.728 1.545-1.545 5.728z" />
      </svg>
      Pay with Robux
    </Button>
  );
}
