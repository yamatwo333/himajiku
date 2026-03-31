interface ProfileLogoutButtonProps {
  onLogout: () => void;
}

export default function ProfileLogoutButton({
  onLogout,
}: ProfileLogoutButtonProps) {
  return (
    <section>
      <button
        onClick={onLogout}
        className="w-full rounded-xl border py-3 text-sm text-red-500"
        style={{ borderColor: "var(--color-border)" }}
      >
        ログアウト
      </button>
    </section>
  );
}
