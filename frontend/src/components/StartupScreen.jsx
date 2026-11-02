export default function StartupScreen({ error }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] p-6 text-[#111]">
      <section className="max-w-xl border-[3px] border-black bg-white p-8 shadow-[7px_7px_0_#111]">
        <h1 className="text-2xl font-black">ATSCheck Desktop</h1>
        <p className="mt-3 font-semibold">
          {error
            ? "The local ATSCheck service could not be reached."
            : "Starting your private local service..."}
        </p>
        {error && (
          <>
            <p role="alert" className="mt-3 text-sm font-medium leading-6">
              {error}
            </p>
            <p className="mt-3 text-sm font-medium leading-6">
              Restart the app. If the problem continues, check whether another
              service is using port 8000.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
