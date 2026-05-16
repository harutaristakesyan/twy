import { Spinner, Table } from "@heroui/react";
import type { ReactNode } from "react";
import DefaultEmptyState from "./DefaultEmptyState.js";
import PageControls from "./PageControls.js";

export interface ColumnDef {
  /** Unique column id used in `renderCell` and `isRowHeader` logic. */
  id: string;
  /** Visible header label. */
  label: string;
  /** Mark the row-header column (screen-reader hint). */
  isRowHeader?: boolean;
}

interface DataTableProps<T> {
  /** Aria label for the table — required for accessibility. */
  ariaLabel: string;
  /** Row data. */
  items: T[];
  /** Column definitions. */
  columns: ColumnDef[];
  /** Cell renderer — receives the record and the column id. */
  renderCell: (record: T, colId: string) => ReactNode;
  /** Spinner while data is loading. */
  isLoading?: boolean;
  /** When provided alongside `page` / `pageSize` / `onPageChange`, renders pagination. */
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id: string }>({
  ariaLabel,
  items,
  columns,
  renderCell,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const showPagination =
    total !== undefined &&
    pageSize !== undefined &&
    page !== undefined &&
    onPageChange !== undefined &&
    total > pageSize;

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label={ariaLabel} className="min-w-full">
          <Table.Header columns={columns}>
            {(col) => (
              <Table.Column id={col.id} isRowHeader={col.isRowHeader}>
                {col.label}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body items={items} renderEmptyState={() => <DefaultEmptyState />}>
            {(record) => (
              <Table.Row id={record.id}>
                <Table.Collection items={columns}>
                  {(col) => <Table.Cell>{renderCell(record, col.id)}</Table.Cell>}
                </Table.Collection>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      {showPagination && (
        <Table.Footer>
          <div className="flex justify-end pt-3">
            <PageControls
              totalPages={Math.ceil(total / pageSize)}
              page={page}
              onPageChange={onPageChange}
            />
          </div>
        </Table.Footer>
      )}
    </Table>
  );
}
