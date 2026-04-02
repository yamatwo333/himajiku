import CharacterSticker from "@/components/CharacterSticker";
import { CHARACTER_ASSETS } from "@/lib/characters";

export default function ProfileAboutCard() {
  return (
    <section
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flow-root">
        <CharacterSticker
          src={CHARACTER_ASSETS.profileAbout.src}
          alt={CHARACTER_ASSETS.profileAbout.alt}
          className="float-right ml-3 mb-2 h-14 w-auto object-contain"
        />
        <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          シェア<span style={{ color: "var(--color-primary)" }}>ヒマ</span>とは？
        </p>
        <p
          className="mt-2 text-xs leading-relaxed"
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
      </div>
    </section>
  );
}
