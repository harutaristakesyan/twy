import { Typography } from "antd";
import type React from "react";

const { Title } = Typography;
interface LogoProps {
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ style }) => {
  return <Title style={style}>TWY</Title>;
};

export default Logo;
