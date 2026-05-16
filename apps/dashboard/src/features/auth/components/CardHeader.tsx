import { Button } from "@heroui/react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";

const CardHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="relative mb-6 flex items-center justify-center">
      <Button
        variant="ghost"
        aria-label="Go back"
        className="absolute left-0"
        onPress={() => navigate(-1)}
      >
        ←
      </Button>
      <Logo />
    </div>
  );
};

export default CardHeader;
