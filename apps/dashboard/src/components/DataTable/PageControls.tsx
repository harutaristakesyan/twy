import { Pagination } from "@heroui/react";

interface PageControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
}

const PageControls: React.FC<PageControlsProps> = ({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = pageSize ? (page - 1) * pageSize + 1 : undefined;
  const end = pageSize && total ? Math.min(page * pageSize, total) : undefined;

  return (
    <Pagination size="sm">
      {total && start && end ? (
        <Pagination.Summary>
          {start} to {end} of {total} results
        </Pagination.Summary>
      ) : null}
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={page === 1}
            onPress={() => onPageChange(Math.max(1, page - 1))}
          >
            <Pagination.PreviousIcon />
            Prev
          </Pagination.Previous>
        </Pagination.Item>
        {pages.map((p) => (
          <Pagination.Item key={p}>
            <Pagination.Link isActive={p === page} onPress={() => onPageChange(p)}>
              {p}
            </Pagination.Link>
          </Pagination.Item>
        ))}
        <Pagination.Item>
          <Pagination.Next
            isDisabled={page === totalPages}
            onPress={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            Next
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
};

export default PageControls;
