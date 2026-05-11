import { useRequest } from "ahooks";
import {
  App,
  Button,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { Fragment, useState } from "react";
import { loadApi } from "@/features/load/api/loadApi";
import type { LoadComment, LoadCommentType } from "@/features/load/types/load";
import { getErrorMessage } from "@/utils/errorUtils";

interface CommentsDialogProps {
  open: boolean;
  loadId: string;
  referenceNumber: string;
  onCancel: () => void;
}

const COMMENT_TYPE_LABELS: Record<LoadCommentType, string> = {
  charge_reason: "Charge Reason",
  hold_reason: "Hold Reason",
  decline_reason: "Decline Reason",
  general: "General",
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

const CommentItem = ({ comment }: { comment: LoadComment }) => (
  <div style={{ marginBottom: 16 }}>
    <Space size={8} wrap>
      <Tag color={COMMENT_TYPE_COLORS[comment.commentType]}>
        {COMMENT_TYPE_LABELS[comment.commentType]}
      </Tag>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {comment.authorName ?? "Unknown"} · {formatDate(comment.createdAt)}
      </Typography.Text>
    </Space>
    <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{comment.body}</div>
  </div>
);

const CommentsDialog = ({ open, loadId, referenceNumber, onCancel }: CommentsDialogProps) => {
  const { message: antMessage } = App.useApp();
  const [form] = Form.useForm<{ body: string }>();
  const [addingComment, setAddingComment] = useState(false);

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
        form.resetFields();
        setAddingComment(false);
        refresh();
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

  const comments = data?.comments ?? [];

  return (
    <Modal
      title={`Comments — ${referenceNumber}`}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={560}
    >
      {fetching ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Spin />
        </div>
      ) : comments.length === 0 ? (
        <Empty description="No comments yet" style={{ margin: "24px 0" }} />
      ) : (
        <div style={{ maxHeight: 360, overflowY: "auto", marginBottom: 16 }}>
          {comments.map((c, i) => (
            <Fragment key={c.id}>
              <CommentItem comment={c} />
              {i < comments.length - 1 && <Divider style={{ margin: "8px 0" }} />}
            </Fragment>
          ))}
        </div>
      )}

      <Divider style={{ margin: "12px 0" }} />

      {addingComment ? (
        <Form form={form} layout="vertical">
          <Form.Item
            name="body"
            label="Add Comment"
            rules={[{ required: true, message: "Please enter a comment" }]}
            style={{ marginBottom: 8 }}
          >
            <Input.TextArea rows={3} placeholder="Write a comment…" autoFocus />
          </Form.Item>
          <Space>
            <Button type="primary" onClick={handleSubmit} loading={submitting}>
              Submit
            </Button>
            <Button onClick={handleCancelAdd} disabled={submitting}>
              Cancel
            </Button>
          </Space>
        </Form>
      ) : (
        <Button onClick={() => setAddingComment(true)}>Add Comment</Button>
      )}
    </Modal>
  );
};

export default CommentsDialog;
