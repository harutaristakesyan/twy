import { validatePassword } from "@/features/auth/utils/password";

interface PasswordRequirementsProps {
  password: string;
}

const PasswordRequirements = ({ password }: PasswordRequirementsProps) => {
  if (!password) return null;

  const { results } = validatePassword(password);

  return (
    <ul className="text-sm space-y-1 px-1">
      {results.map((item) => (
        <li key={item.key} className={item.valid ? "text-green-600" : "text-red-500"}>
          {item.valid ? "✓" : "✗"} {item.label}
        </li>
      ))}
    </ul>
  );
};

export default PasswordRequirements;
