import { DownOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { Dropdown, Flex, type MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "@/components/UserAvatar.tsx";
import { useCurrentUser } from "@/hooks/useCurrentUser.ts";
import { useAuth } from "@/providers/AuthProvider.tsx";

const UserDropdown = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

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
        <UserAvatar
          firstName={user?.firstName ?? undefined}
          lastName={user?.lastName ?? undefined}
          pictureFileId={user?.profilePictureFileId}
        />
        <DownOutlined style={{ marginLeft: 6, fontSize: 12 }} />
      </Flex>
    </Dropdown>
  );
};

export default UserDropdown;
