import { DownOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { Dropdown, Flex, type MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "@/components/UserAvatar.tsx";
import { useAuth } from "@/providers/AuthProvider.tsx";
import { decodeIdTokenToken } from "@/utils/jwt.ts";

const UserDropdown = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const user = decodeIdTokenToken();

  const menuItems: MenuProps["items"] = [
    {
      key: "profile",
      onClick: () => navigate("/profile"),
      icon: <UserOutlined />,
      label: "My Profile",
    },
    { type: "divider" },
    {
      key: "logout",
      onClick: () => logout(),
      icon: <LogoutOutlined />,
      danger: true,
      label: "Log Out",
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
      <Flex justify="space-between" align="center" style={{ cursor: "pointer" }}>
        <UserAvatar firstName={user.given_name} lastName={user.family_name} />
        <DownOutlined style={{ marginLeft: 6, fontSize: 12 }} />
      </Flex>
    </Dropdown>
  );
};

export default UserDropdown;
