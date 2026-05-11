import { CommentOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
  App,
  Avatar,
  Button,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Spin,
  Tag,
  Typography,
  theme,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { loadApi } from "@/features/load/api/loadApi";
import type { LoadComment, LoadCommentType } from "@/features/load/types/load";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getErrorMessage } from "@/utils/errorUtils";

interface CommentsDialogProps {
  open: boolean;
  loadId: string;
  referenceNumber: string;
  onCancel: () => void;
}

const COMMENT_TYPE_LABELS: Record<LoadCommentType, string> = {
  charge_reason: "Charge",
  hold_reason: "Hold",
  decline_reason: "Declined",
  general: "Note",
};

const COMMENT_TYPE_COLORS: Record<LoadCommentType, string> = {
  charge_reason: "blue",
  hold_reason: "orange",
  decline_reason: "red",
  general: "default",
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

const initialsFromName = (name: string | null): string => {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const avatarColorForName = (name: string | null): string => {
  const palette = ["#1677ff", "#722ed1", "#13c2c2", "#eb2f96", "#fa8c16", "#52c41a"];
  if (!name?.trim()) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % palette.length;
  return palette[h] ?? palette[0];
};

const CommentItem = ({ comment }: { comment: LoadComment }) => {
  const { token } = theme.useToken();
  const author = comment.authorName ?? "Unknown";
  return (
    <Flex gap={12} align="flex-start">
      <Avatar
        size={40}
        style={{
          backgroundColor: avatarColorForName(comment.authorName),
          flexShrink: 0,
        }}
      >
        {initialsFromName(comment.authorName)}
      </Avatar>
      <Flex vertical gap={6} style={{ minWidth: 0, flex: 1 }}>
        <Flex wrap="wrap" align="center" gap={8}>
          <Typography.Text strong style={{ fontSize: 13 }}>
            {author}
          </Typography.Text>
          <Tag
            bordered={false}
            color={COMMENT_TYPE_COLORS[comment.commentType]}
            style={{ margin: 0, fontSize: 11 }}
          >
            {COMMENT_TYPE_LABELS[comment.commentType]}
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(comment.createdAt)}
          </Typography.Text>
        </Flex>
        <div
          style={{
            background: token.colorFillAlter,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
            padding: `${token.paddingSM}px ${token.padding}px`,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 14,
            lineHeight: 1.55,
            color: token.colorText,
          }}
        >
          {comment.body}
        </div>
      </Flex>
    </Flex>
  );
};

const CommentsDialog = ({ open, loadId, referenceNumber, onCancel }: CommentsDialogProps) => {
  const { message: antMessage } = App.useApp();
  const { token } = theme.useToken();
  const { permissions } = useCurrentUser();
  const canAddComments = permissions.loads.edit;
  const [form] = Form.useForm<{ body: string }>();
  const [addingComment, setAddingComment] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset when switching loads or closing/reopening the dialog.
  // biome-ignore lint/correctness/useExhaustiveDependencies: open and loadId intentionally retrigger reset
  useEffect(() => {
    form.resetFields();
    setAddingComment(false);
  }, [form, open, loadId]);

  const {
    data,
    loading: fetching,
    refresh,
  } = useRequest(async () => loadApi.listComments(loadId), {
    refreshDeps: [loadId, open],
    ready: open,
    onError: (error) => antMessage.error(getErrorMessage(error)),
  });

  const { loading: submitting, run: submitComment } = useRequest(
    async (body: string) => {
      await loadApi.addComment(loadId, { body });
    },
    {
      manual: true,
      onSuccess: () => {
        antMessage.success("Comment added");
        form.resetFields();
        setAddingComment(false);
        refresh();
        if (listRef.current) listRef.current.scrollTop = 0;
      },
      onError: (error) => antMessage.error(getErrorMessage(error)),
    },
  );

  const handleSubmit = () => {
    form
      .validateFields()
      .then(({ body }) => submitComment(body))
      .catch(() => {
        // AntD form rejects when validation fails — errors are shown inline by Form.Item rules
      });
  };

  const handleCancelAdd = () => {
    form.resetFields();
    setAddingComment(false);
  };

  const comments = (data?.comments ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Modal
      title={
        <Flex align="center" gap={12}>
          <span
            style={{
              display: "flex",
              width: 40,
              height: 40,
              borderRadius: token.borderRadiusLG,
              background: token.colorPrimaryBg,
              color: token.colorPrimary,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            <CommentOutlined />
          </span>
          <Flex vertical gap={0} style={{ lineHeight: 1.3 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Comments
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Load <Typography.Text code>{referenceNumber}</Typography.Text>
              {comments.length > 0 && (
                <Typography.Text type="secondary">
                  {" "}
                  · {comments.length} {comments.length === 1 ? "entry" : "entries"}
                </Typography.Text>
              )}
            </Typography.Text>
          </Flex>
        </Flex>
      }
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={640}
      styles={{
        body: { padding: 0 },
      }}
    >
      <Flex vertical style={{ minHeight: 320 }}>
        <div
          ref={listRef}
          style={{
            flex: 1,
            minHeight: 200,
            maxHeight: 420,
            overflowY: "auto",
            padding: `${token.paddingMD}px ${token.paddingLG}px`,
            paddingBottom: token.paddingSM,
          }}
        >
          {fetching ? (
            <Flex align="center" justify="center" style={{ minHeight: 200 }} vertical gap={12}>
              <Spin size="large" />
              <Typography.Text type="secondary">Loading comments…</Typography.Text>
            </Flex>
          ) : comments.length === 0 ? (
            <Flex align="center" justify="center" style={{ minHeight: 200 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    <Typography.Text type="secondary">No comments yet</Typography.Text>
                    {canAddComments && (
                      <>
                        <br />
                        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                          Add a note for your team below.
                        </Typography.Text>
                      </>
                    )}
                  </span>
                }
              />
            </Flex>
          ) : (
            <Flex vertical gap={16}>
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </Flex>
          )}
        </div>

        {canAddComments && (
          <div
            style={{
              borderTop: `1px solid ${token.colorSplit}`,
              background: token.colorFillAlter,
              padding: `${token.paddingMD}px ${token.paddingLG}px`,
            }}
          >
            {addingComment ? (
              <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item
                  name="body"
                  label={<Typography.Text strong>New comment</Typography.Text>}
                  rules={[
                    { required: true, message: "Please enter a comment" },
                    { max: 500, message: "Comment cannot exceed 500 characters" },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="Share an update or context for this load…"
                    autoFocus
                    showCount
                    maxLength={500}
                    style={{ resize: "none" }}
                  />
                </Form.Item>
                <Flex justify="flex-end" gap={8} style={{ marginTop: token.marginMD }}>
                  <Button onClick={handleCancelAdd} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSubmit}
                    loading={submitting}
                  >
                    Add
                  </Button>
                </Flex>
              </Form>
            ) : (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddingComment(true)}
                block
                size="large"
                style={{ height: 44 }}
              >
                Add comment
              </Button>
            )}
          </div>
        )}
      </Flex>
    </Modal>
  );
};

export default CommentsDialog;
