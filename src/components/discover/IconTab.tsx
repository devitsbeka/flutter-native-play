interface IconTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function IconTab({ label, isActive, onClick }: IconTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${
        isActive 
          ? "bg-white/90 text-slate-700 font-semibold" 
          : "text-white/70 hover:text-white/90 font-medium"
      }`}
    >
      {label}
    </button>
  );
}
