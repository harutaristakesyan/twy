import { ArrowDownToSquare, Camera, Lock, Pencil, Xmark } from "@gravity-ui/icons";
import { Button, Card, FieldError, Label, Spinner, TextField, toast } from "@heroui/react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "@/components/UserAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";
import { selfUpdateUser, uploadProfilePicture } from "../api/userApi";
import type { SelfUpdateRequest } from "../types/user";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface FormValues {
  firstName: string;
  lastName: string;
}

const UserSelfUpdate: React.FC = () => {
  const { user, loading: userLoading, refetch, authMe } = useCurrentUser();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    },
  });

  const handleSubmitForm = useCallback(
    async (values: SelfUpdateRequest) => {
      setSaving(true);
      try {
        await selfUpdateUser(values);
        toast.success("Profile updated successfully");
        setIsEditing(false);
        await refetch();
      } catch (error) {
        toast.danger(getErrorMessage(error));
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const handleCancel = useCallback(() => {
    reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    });
    setIsEditing(false);
  }, [reset, user]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
        toast.danger("Only JPEG, PNG, and WebP images are supported");
        return;
      }
      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        toast.danger("Image must be smaller than 5 MB");
        return;
      }

      setUploadingAvatar(true);
      try {
        await uploadProfilePicture(file);
        await refetch();
        toast.success("Profile picture updated");
      } catch (error) {
        toast.danger(getErrorMessage(error));
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [refetch],
  );

  if (!user) {
    return (
      <Card>
        <Card.Content>
          {userLoading ? (
            <Spinner size="lg" />
          ) : (
            <span className="text-sm text-gray-500">No user data</span>
          )}
        </Card.Content>
      </Card>
    );
  }

  const pictureFileId = user.profilePictureFileId;

  return (
    <Card>
      <Card.Content>
        <div className="flex flex-col gap-6">
          {/* Header row: avatar + name + actions */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <button
                type="button"
                className="relative inline-block cursor-pointer rounded-full"
                onClick={handleAvatarClick}
                title="Click to change profile picture"
              >
                {uploadingAvatar ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <UserAvatar
                    firstName={user.firstName ?? undefined}
                    lastName={user.lastName ?? undefined}
                    showName={false}
                    pictureFileId={pictureFileId}
                    size="lg"
                  />
                )}
                <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-white">
                  <Camera className="h-2.5 w-2.5" />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_AVATAR_TYPES.join(",")}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Name/email */}
            <div className="flex-1">
              <p className="text-lg font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400">{user.branch?.name ?? "No Branch"}</p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onPress={() => navigate("/profile/change-password")}>
                <Lock className="h-4 w-4" />
                Change Password
              </Button>
              {!isEditing ? (
                <Button variant="primary" onPress={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onPress={handleCancel}>
                    <Xmark className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    isPending={saving}
                    onPress={() => handleSubmit(handleSubmitForm)()}
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner size="sm" />
                        ) : (
                          <ArrowDownToSquare className="h-4 w-4" />
                        )}
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          <hr />

          {/* Form fields */}
          <form
            id="user-self-update-form"
            onSubmit={handleSubmit(handleSubmitForm)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <TextField name="firstName" isInvalid={!!errors.firstName} isDisabled={!isEditing}>
              <Label>First Name</Label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!isEditing}
                {...register("firstName", {
                  required: "Please enter first name",
                  minLength: { value: 2, message: "First name must be at least 2 characters" },
                })}
              />
              <FieldError>{errors.firstName?.message}</FieldError>
            </TextField>
            <TextField name="lastName" isInvalid={!!errors.lastName} isDisabled={!isEditing}>
              <Label>Last Name</Label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!isEditing}
                {...register("lastName", {
                  required: "Please enter last name",
                  minLength: { value: 2, message: "Last name must be at least 2 characters" },
                })}
              />
              <FieldError>{errors.lastName?.message}</FieldError>
            </TextField>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Email
              <input
                value={user.email}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Team
              <input
                value={authMe?.team?.name ?? "Unassigned"}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Branch
              <input
                value={user.branch?.name ?? "No Branch"}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </label>
          </form>

          {isEditing && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              You can only update your first name and last name. For email, role, or branch changes,
              contact your administrator.
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default UserSelfUpdate;
