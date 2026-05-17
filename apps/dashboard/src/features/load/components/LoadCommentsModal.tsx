import { Button, Modal, Spinner, TextArea, TextField, toast } from "@heroui/react";
import type React from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserAvatar } from "@/components/UserAvatar";
import { loadApi } from "@/features/load/api/loadApi";
import type { LoadComment, LoadCommentType } from "@/features/load/types/load";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { queryKeys, useApiMutation, useApiQuery, useQueryActions } from "@/libs/query";
import { getErrorMessage } from "@/utils/errorUtils";

const MAX_COMMENT_LENGTH = 500;

const COMMENT_TYPE_LABELS: Record<LoadCommentType, string> = {
  charge_reason: "Charge",
  hold_reason: "Hold",
  decline_reason: "Declined",
  general: "Note",
};

const COMMENT_TYPE_BADGE: Record<LoadCommentType, string> = {
  charge_reason: "bg-blue-100 text-blue-800",
  hold_reason: "bg-orange-100 text-orange-800",
  decline_reason: "bg-red-100 text-red-800",
  general: "bg-default-100 text-default-700",
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CommentItem: React.FC<{ comment: LoadComment }> = ({ comment }) => (
  <div className="flex gap-3">
    <UserAvatar
      fullName={comment.authorName ?? "Unknown"}
      pictureFileId={comment.authorProfilePictureFileId}
      showName={false}
      size="md"
    />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{comment.authorName ?? "Unknown"}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            COMMENT_TYPE_BADGE[comment.commentType]
          }`}
        >
          {COMMENT_TYPE_LABELS[comment.commentType]}
        </span>
        <span className="text-xs text-default-500">{formatDate(comment.createdAt)}</span>
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-default-200 bg-default-50 p-3 text-sm leading-relaxed">
        {comment.body}
      </div>
    </div>
  </div>
);

export const LoadCommentsModal: React.FC = () => {
  const { loadId } = useParams<{ loadId: string }>();
  const navigate = useNavigate();
  const { permissions } = useCurrentUser();
  const canAddComments = Boolean(permissions.loads?.edit);
  const { invalidate } = useQueryActions();
  const [body, setBody] = useState("");

  const close = () => navigate("..");

  const { data: load } = useApiQuery(
    queryKeys.loads.detail(loadId),
    () => {
      if (!loadId) return Promise.reject(new Error("No loadId"));
      return loadApi.getById(loadId);
    },
    { enabled: !!loadId },
  );

  const { data, isLoading } = useApiQuery(
    queryKeys.loads.comments(loadId),
    () => {
      if (!loadId) return Promise.reject(new Error("No loadId"));
      return loadApi.listComments(loadId);
    },
    { enabled: !!loadId },
  );

  const addMutation = useApiMutation(
    (commentBody: string) => {
      if (!loadId) return Promise.reject(new Error("No loadId"));
      return loadApi.addComment(loadId, { body: commentBody });
    },
    {
      onSuccess: () => {
        toast.success("Comment added");
        setBody("");
        invalidate(queryKeys.loads.comments(loadId));
      },
      onError: (err) => toast.danger(getErrorMessage(err)),
    },
  );

  const trimmed = body.trim();
  const canSubmit = canAddComments && trimmed.length > 0 && trimmed.length <= MAX_COMMENT_LENGTH;

  const comments = [...(data?.comments ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const handleSubmit = () => {
    if (!canSubmit || addMutation.isPending) return;
    addMutation.mutate(trimmed);
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Comments{load ? ` — #${load.referenceNumber}` : ""}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 p-2">
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Spinner size="md" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-default-500">No comments yet</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {comments.map((c) => (
                      <CommentItem key={c.id} comment={c} />
                    ))}
                  </div>
                )}
              </div>

              {canAddComments && (
                <div className="flex flex-col gap-2 border-t border-default-200 pt-3">
                  <TextField
                    value={body}
                    onChange={setBody}
                    isDisabled={addMutation.isPending}
                    fullWidth
                  >
                    <TextArea
                      rows={3}
                      placeholder="Write a comment…"
                      maxLength={MAX_COMMENT_LENGTH}
                    />
                  </TextField>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-default-400">
                      {trimmed.length}/{MAX_COMMENT_LENGTH}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleSubmit}
                      isDisabled={!canSubmit || addMutation.isPending}
                    >
                      {addMutation.isPending ? <Spinner size="sm" /> : "Add"}
                    </Button>
                  </div>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
