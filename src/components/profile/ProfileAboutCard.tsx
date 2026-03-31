export default function ProfileAboutCard() {
  return (
    <section
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
        シェア<span style={{ color: "var(--color-primary)" }}>ヒマ</span>とは？
      </p>
      <p
        className="mt-1 text-xs leading-relaxed"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <span className="block">
          わざわざ誘うほどじゃないけど
          <span style={{ color: "var(--color-primary)" }}>ヒマ</span>。
        </span>
        <span className="block">
          <span style={{ color: "var(--color-primary)" }}>ヒマ</span>
          な時間をシェアして、なんとなく集まれるアプリ。
        </span>
        <span className="block">
          グループを作って友だちを招待し、
          <span style={{ color: "var(--color-primary)" }}>ヒマ</span>
          な日を気軽にシェアしよう。
        </span>
      </p>
    </section>
  );
}
