import { Avatar } from "@heroui/react";
import type React from "react";
import { filesApi } from "@/features/files/api/filesApi";
import { useApiQuery } from "@/libs/query";

type UserAvatarProps = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  showName?: boolean;
  pictureFileId?: string | null;
  size?: "sm" | "md" | "lg";
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
  size = "sm",
}) => {
  const name = fullName ?? `${firstName ?? ""} ${lastName ?? ""}`.trim();

  const { data: pictureData } = useApiQuery(
    ["user-avatar", pictureFileId],
    () => filesApi.getDownloadUrl(pictureFileId ?? ""),
    { enabled: !!pictureFileId, staleTime: 30 * 60 * 1000 },
  );

  const src = pictureData?.downloadUrl;

  return (
    <div className="flex items-center gap-2">
      <Avatar size={size}>
        {src && <Avatar.Image src={src} alt={name} />}
        <Avatar.Fallback>{getInitials(name)}</Avatar.Fallback>
      </Avatar>
      {showName && <span className="text-sm">{name}</span>}
    </div>
  );
};
