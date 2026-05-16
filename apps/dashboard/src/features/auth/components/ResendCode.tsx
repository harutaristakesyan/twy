import { toast } from "@heroui/react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ApiClient from "@/libs/ApiClient";

const ResendCode = () => {
  const location = useLocation();
  const email = location.state?.email as string | undefined;

  const [timer, setTimer] = useState(119);

  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleResendCode = async () => {
    if (!email) return;
    await ApiClient.post("/resend-code", { email });
    toast.success("Verification code resent");
    setTimer(119);
  };

  const timerLabel = `${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}`;
  const canResend = !!email && timer === 0;

  return (
    <div className="flex justify-center items-center gap-2 mt-6 text-sm text-gray-500">
      <span>Didn&#39;t receive the code?</span>
      <button
        type="button"
        disabled={!canResend}
        onClick={handleResendCode}
        className={
          canResend
            ? "text-blue-600 hover:underline cursor-pointer"
            : "text-gray-400 cursor-not-allowed"
        }
      >
        Resend Code
      </button>
      <span>|</span>
      <span>{timerLabel}</span>
    </div>
  );
};

export default ResendCode;
