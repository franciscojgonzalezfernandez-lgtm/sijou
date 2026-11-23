export default function Home() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- canary */}
      <img src="/hero.png" alt="Decorative hero" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Sijou</h1>
        <p className="text-lg leading-relaxed">
          Natural cosmetics, coming soon. We are preparing our online shop.
        </p>
      </main>
    </>
  );
}
