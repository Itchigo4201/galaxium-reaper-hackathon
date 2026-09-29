import { useState } from 'react';
import {
  ArrowRight,
  Bug,
  Github,
  Hammer,
  Rocket,
  RotateCcw,
} from 'lucide-react';
import { BookingConfirmation } from '../components/bookings/BookingConfirmation';

type DemoState = 'problem' | 'confirmed';

const sample = {
  reference: 'GX-2048',
  origin: 'Earth',
  destination: 'Mars',
  departureTime: '2026-10-12T09:30:00Z',
  arrivalTime: '2026-10-18T16:45:00Z',
  seatClassValue: 'galaxium' as const,
  totalPaid: 12450,
};

export const HackathonDemo = () => {
  const [state, setState] = useState<DemoState>(() =>
    new URLSearchParams(window.location.search).get('view') === 'confirmed'
      ? 'confirmed'
      : 'problem'
  );
  const [demoNotice, setDemoNotice] = useState('');

  return (
    <main className="min-h-screen bg-space-dark text-star-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-cosmic-gradient opacity-20" />
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-alien-green/30 bg-alien-green/10 px-3 py-1 text-alien-green">
              IBM Bob Hackathon 2026
            </span>
            <span className="text-star-white/60">Students / Early Career · Explore, Fix, Build</span>
          </div>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
            Galaxium Travels
            <span className="block bg-cosmic-gradient bg-clip-text text-transparent">
              Post-Booking Experience Upgrade
            </span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-star-white/70">
            We used IBM Bob to explore an unfamiliar multi-service application, identify a real booking UX defect,
            fix it, and turn confirmation into a useful post-booking action center.
          </p>
          <a
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-alien-green hover:text-white"
            href="https://github.com/Itchigo4201/galaxium-reaper-hackathon"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={18} /> View the code <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-3">
        {[
          { icon: Bug, title: 'Explore', text: 'Bob mapped the React, FastAPI, SQLite, MCP, and Java hold-service flow.' },
          { icon: Hammer, title: 'Fix', text: 'The modal no longer closes immediately after a successful booking confirmation.' },
          { icon: Rocket, title: 'Build', text: 'The persistent confirmation became a post-booking action center with copy, calendar, receipt, and booking-history actions.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass-card p-6">
            <Icon className="mb-4 text-alien-green" size={28} />
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-star-white/65">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-alien-green">Interactive demo</p>
            <h2 className="mt-2 text-3xl font-bold">See the fix in one click</h2>
          </div>
          <button
            onClick={() => {
              setState('problem');
              setDemoNotice('');
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-star-white/70 hover:bg-white/5"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>

        {state === 'problem' ? (
          <div className="glass-card p-6 md:p-8">
            <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-300">
                  <Bug size={15} /> Original behavior
                </div>
                <h3 className="text-2xl font-bold">Confirmation vanished too quickly</h3>
                <p className="mt-3 max-w-xl text-star-white/65">
                  After the Java hold service confirmed a booking, the React modal immediately closed.
                  The booking reference survived only in a temporary toast, making an important success state easy to miss.
                </p>
                <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                  <p className="text-star-white/40">Temporary toast</p>
                  <p className="mt-1 font-mono text-alien-green">Booking confirmed! Reference: #{sample.reference}</p>
                  <p className="mt-3 text-star-white/45">…then the modal closes.</p>
                </div>
              </div>

              <ArrowRight className="hidden text-star-white/25 md:block" size={30} />

              <div className="rounded-2xl border border-alien-green/20 bg-alien-green/5 p-6">
                <p className="text-sm font-semibold text-alien-green">Bob-guided improvement</p>
                <p className="mt-2 text-lg font-bold">Keep the success state visible.</p>
                <button
                  onClick={() => setState('confirmed')}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cosmic-gradient px-5 py-3 font-bold text-white transition hover:scale-[1.01]"
                >
                  Run improved confirmation <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card mx-auto max-w-2xl p-6 md:p-8">
            <BookingConfirmation
              data={{
                reference: sample.reference,
                origin: sample.origin,
                destination: sample.destination,
                departureTime: sample.departureTime,
                arrivalTime: sample.arrivalTime,
                seatClass: sample.seatClassValue,
                totalPaid: sample.totalPaid,
              }}
              showHeading
              onViewBookings={() =>
                setDemoNotice('Demo action: the production app opens My Bookings here.')
              }
            />
            <p className="mt-4 text-center text-xs text-star-white/45">
              Deterministic hackathon demo — no backend service required.
            </p>
            <p aria-live="polite" className="mt-2 min-h-5 text-center text-xs text-alien-green">
              {demoNotice}
            </p>
          </div>
        )}
      </section>
    </main>
  );
};
