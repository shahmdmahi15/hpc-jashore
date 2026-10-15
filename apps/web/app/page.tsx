import ThemeToggle from './theme-toggle';

export default function Home() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">HPC Health &amp; Pain Care Center · Jashore</p>
        <h1>Realtime Center Management</h1>
        <p className="lede">
          Reception, doctors, therapy, cashier and the waiting-room TV — all
          live on one platform. Dr. Toufiq (Md. Toufiq Uz Zaman).
        </p>
        <div className="row">
          <ThemeToggle />
          <span className="status">
            <span className="dot" aria-hidden /> scaffold online — Phase 0
          </span>
        </div>
      </section>
    </main>
  );
}
