import { Spinner, Table } from "@heroui/react";
import type React from "react";
import type { ReactNode } from "react";
import PageControls from "@/components/PageControls";
import type { Load } from "@/features/load/types/load";
import type { LoadColumnDef } from "./useLoadColumns";

type LoadManagementTableProps = {
  items: Load[];
  columns: LoadColumnDef[];
  renderCell: (record: Load, colId: string) => ReactNode;
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

const LoadManagementTable: React.FC<LoadManagementTableProps> = ({
  items,
  columns,
  renderCell,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Loads" className="min-w-full">
          <Table.Header columns={columns}>
            {(col) => <Table.Column isRowHeader={col.isRowHeader}>{col.label}</Table.Column>}
          </Table.Header>
          <Table.Body items={items}>
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
      {total > pageSize && (
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
};

export default LoadManagementTable;
