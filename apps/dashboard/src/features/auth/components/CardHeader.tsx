import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Flex } from "antd";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo.tsx";

const CardHeader = () => {
  const navigate = useNavigate();

  return (
    <div style={{ position: "relative", marginBottom: 24 }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        aria-label="Go back"
        style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }}
      />
      <Flex justify="center" align="center">
        <Logo style={{ width: "200px", height: "40px", margin: 0, textAlign: "center" }} />
      </Flex>
    </div>
  );
};

export default CardHeader;
