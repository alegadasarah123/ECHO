import { useNavigate } from "react-router-dom";

export default function SelectRole() {
  const navigate = useNavigate();

  const roles = [
    { name: "Kutsero", path: "/sign-up/kutsero" },
    { name: "Veterinarian", path: "/sign-up/vet" },
    { name: "DVMF Officer", path: "/sign-up/dvmf" },
    { name: "Kutsero President", path: "/sign-up/president" },
    { name: "CTU VetMed", path: "/sign-up/ctu-vetmed" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-6">Choose Your Role</h1>
      <div className="grid gap-4 w-64">
        {roles.map((role) => (
          <button
            key={role.name}
            onClick={() => navigate(role.path)}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {role.name}
          </button>
        ))}
      </div>
    </div>
  );
}
