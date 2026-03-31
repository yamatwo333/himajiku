interface PageSpinnerProps {
  className?: string;
}

export default function PageSpinner({
  className = "flex items-center justify-center py-20",
}: PageSpinnerProps) {
  return (
    <div className={className}>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        style={{
          borderColor: "var(--color-border)",
          borderTopColor: "transparent",
        }}
      />
    </div>
  );
}
