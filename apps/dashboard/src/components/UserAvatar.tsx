import { useRequest } from "ahooks";
import { Avatar, Space, Typography } from "antd";
import type React from "react";
import { filesApi } from "@/features/files/api/filesApi";

const { Text } = Typography;

type UserAvatarProps = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  showName?: boolean;
  pictureFileId?: string | null;
  size?: number | "small" | "default" | "large";
};

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  fullName,
  firstName,
  lastName,
  showName = true,
  pictureFileId,
  size,
}) => {
  const name = fullName || `${firstName ?? ""} ${lastName ?? ""}`.trim();

  const { data: pictureData } = useRequest(() => filesApi.getDownloadUrl(pictureFileId ?? ""), {
    ready: !!pictureFileId,
    cacheKey: pictureFileId ? `user-avatar-${pictureFileId}` : undefined,
    staleTime: 30 * 60 * 1000,
    refreshDeps: [pictureFileId],
  });

  const src = pictureData?.downloadUrl;

  return (
    <Space>
      <Avatar
        src={src}
        size={size}
        style={src ? undefined : { backgroundColor: "#1677ff", verticalAlign: "middle" }}
        onError={() => false}
      >
        {!src && getInitials(name)}
      </Avatar>
      {showName && <Text>{name}</Text>}
    </Space>
  );
};
