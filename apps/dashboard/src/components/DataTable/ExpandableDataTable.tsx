import { ChevronRight } from "@gravity-ui/icons";
import { Button, cn, type Selection, Spinner, Table } from "@heroui/react";
import type { ReactNode } from "react";
import type { ColumnDef } from "./DataTable.js";
import DefaultEmptyState from "./DefaultEmptyState.js";
import PageControls from "./PageControls.js";

interface ExpandableDataTableProps<T> {
  ariaLabel: string;
  /** Root-level items. Children are resolved via `getChildren`. */
  items: T[];
  columns: ColumnDef[];
  /** Id of the column that owns the chevron toggle (typically the row-header column). */
  treeColumn: string;
  /** Derive the stable id for a given item — used as the React Aria row key. */
  getId: (item: T) => string;
  /** Return the child items for a given row. Return empty array for leaves. */
  getChildren: (item: T) => T[];
  /** Cell renderer. The tree column's content is wrapped automatically with the chevron. */
  renderCell: (item: T, colId: string) => ReactNode;
  isLoading?: boolean;
  /** Controlled expanded keys. */
  expandedKeys?: Selection;
  /** Initial expanded keys (uncontrolled). */
  defaultExpandedKeys?: Selection;
  /** Fires when a row is expanded/collapsed — use to lazy-fetch children. */
  onExpandedChange?: (keys: Selection) => void;
  /** When provided alongside `page` / `pageSize` / `onPageChange`, renders pagination. */
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export function ExpandableDataTable<T extends object>({
  ariaLabel,
  items,
  columns,
  treeColumn,
  getId,
  getChildren,
  renderCell,
  isLoading,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedChange,
  total,
  page,
  pageSize,
  onPageChange,
}: ExpandableDataTableProps<T>) {
  const renderRow = (item: T): ReactNode => {
    const id = getId(item);
    const children = getChildren(item);
    return (
      <Table.Row id={id}>
        <Table.Collection items={columns}>
          {(col) => (
            <Table.Cell>
              {({ hasChildItems, isExpanded, isTreeColumn, isDisabled }) =>
                col.id === treeColumn ? (
                  <span className="flex items-center gap-1">
                    {hasChildItems && isTreeColumn ? (
                      <Button
                        isIconOnly
                        aria-label="Toggle row"
                        isDisabled={isDisabled}
                        size="sm"
                        slot="chevron"
                        variant="ghost"
                      >
                        <ChevronRight
                          aria-hidden
                          className={cn(
                            "size-4 text-muted transition-transform duration-150",
                            isExpanded ? "rotate-90" : "",
                          )}
                        />
                      </Button>
                    ) : null}
                    <span>{renderCell(item, col.id)}</span>
                  </span>
                ) : (
                  renderCell(item, col.id)
                )
              }
            </Table.Cell>
          )}
        </Table.Collection>
        {children.length > 0 ? (
          <Table.Collection items={children}>{renderRow}</Table.Collection>
        ) : null}
      </Table.Row>
    );
  };

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
        <Table.Content
          aria-label={ariaLabel}
          className="min-w-full"
          treeColumn={treeColumn}
          expandedKeys={expandedKeys}
          defaultExpandedKeys={defaultExpandedKeys}
          onExpandedChange={onExpandedChange}
        >
          <Table.Header columns={columns}>
            {(col) => (
              <Table.Column id={col.id} isRowHeader={col.isRowHeader}>
                {col.label}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body items={items} renderEmptyState={() => <DefaultEmptyState />}>
            {renderRow}
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
