import { EditorLogin } from "@/components/EditorLogin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editor sign in",
  robots: { index: false, follow: false },
};

export default function EditorLoginPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Editor sign in</h1>
        <p className="mt-2 text-sm text-muted">
          The editorial queue is restricted so published answers and draft content stay private.
        </p>
      </header>
      <EditorLogin />
    </div>
  );
}
