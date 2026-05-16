import { Card, cn } from "@heroui/react";
import type React from "react";

interface TeamFormSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TeamFormSection: React.FC<TeamFormSectionProps> = ({
  title,
  description,
  action,
  children,
  className,
}) => (
  <Card className={cn("border border-default-200", className)}>
    <Card.Content className="flex flex-col gap-5 p-5 sm:p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-default-800">{title}</h2>
          {description ? <p className="text-xs text-default-500">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </Card.Content>
  </Card>
);

export default TeamFormSection;
