import { ArrowDownToSquare, Camera, Lock, Pencil, Xmark } from "@gravity-ui/icons";
import { Button, Input, Label, Separator, Spinner, TextField, toast } from "@heroui/react";
import type React from "react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FormTextField } from "@/components/form";
import { UserAvatar } from "@/components/UserAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useZodForm } from "@/libs/form";
import { useApiMutation } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";
import { selfUpdateUser, uploadProfilePicture } from "../api/userApi";
import type { SelfUpdateRequest } from "../types/user";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const schema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(100, "First name is too long"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(100, "Last name is too long"),
});

type FormValues = z.infer<typeof schema>;

const UserSelfUpdate: React.FC = () => {
  const { user, loading: userLoading, refetch, authMe } = useCurrentUser();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, reset } = useZodForm(schema, {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
  });

  const updateMutation = useApiMutation((values: SelfUpdateRequest) => selfUpdateUser(values), {
    onSuccess: async () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
      await refetch();
    },
    onError: (err: unknown) => toast.danger(getErrorMessage(err)),
  });

  const onSubmit = handleSubmit((values: FormValues) => {
    updateMutation.mutate({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
    });
  });

  const handleCancel = () => {
    reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    });
    setIsEditing(false);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  if (!user) {
    return userLoading ? (
      <Spinner size="lg" />
    ) : (
      <span className="text-sm text-default-500">No user data</span>
    );
  }

  const pictureFileId = user.profilePictureFileId;
  const isSaving = updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <button
            type="button"
            className="relative inline-block cursor-pointer rounded-full"
            onClick={handleAvatarClick}
            title="Click to change profile picture"
          >
            {uploadingAvatar ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-default-100">
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
            <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-accent text-white">
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

        <div className="flex-1">
          <p className="text-lg font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-default-500">{user.email}</p>
          <p className="text-xs text-default-400">{user.branch?.name ?? "No Branch"}</p>
        </div>

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
                type="submit"
                form="user-self-update-form"
                isDisabled={isSaving}
              >
                {isSaving ? <Spinner size="sm" /> : <ArrowDownToSquare className="h-4 w-4" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      <form
        id="user-self-update-form"
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <FormTextField
          control={control}
          name="firstName"
          label="First Name"
          disabled={!isEditing}
        />
        <FormTextField control={control} name="lastName" label="Last Name" disabled={!isEditing} />
        <TextField value={user.email} isDisabled fullWidth>
          <Label>Email</Label>
          <Input />
        </TextField>
        <TextField value={authMe?.team?.name ?? "Unassigned"} isDisabled fullWidth>
          <Label>Team</Label>
          <Input />
        </TextField>
        <TextField value={user.branch?.name ?? "No Branch"} isDisabled fullWidth>
          <Label>Branch</Label>
          <Input />
        </TextField>
      </form>

      {isEditing && (
        <div className="rounded-lg border border-accent-200 bg-accent-50 p-3 text-sm text-accent-700">
          You can only update your first name and last name. For email, role, or branch changes,
          contact your administrator.
        </div>
      )}
    </div>
  );
};

export default UserSelfUpdate;
