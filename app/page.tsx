"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  UserCog,
  UserLock,
  Building,
  ChevronRight,
  CheckCircle2,
  Users,
} from "lucide-react";
import { useAuth } from "./_providers/auth-provider";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const features = [
  {
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Forms & Exams",
    description:
      "Build custom forms and timed exams with question types, attempt limits, and auto-scoring — ready to assign in minutes.",
  },
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    title: "Personal Dashboard",
    description:
      "Every employee gets a focused dashboard showing their open tasks, progress, and full submission history.",
  },
  {
    icon: <UserCog className="w-5 h-5" />,
    title: "Employee Management",
    description:
      "Onboard and organise your workforce. Assign forms, track activity, and keep records in one place.",
  },
  {
    icon: <UserLock className="w-5 h-5" />,
    title: "Role-based Access",
    description:
      "Granular permissions control exactly who can create, view, and manage — from admins to read-only members.",
  },
  {
    icon: <Building className="w-5 h-5" />,
    title: "Multi-Organisation",
    description:
      "Operate across multiple organisations from a single platform, with data cleanly isolated between them.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Submissions Tracking",
    description:
      "Review every response as it comes in. Filter by status, date, or employee — nothing slips through the cracks.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create a form",
    description:
      "Design forms or exams with your choice of question types, time limits, and attempt rules.",
  },
  {
    step: "02",
    title: "Assign to employees",
    description:
      "Distribute instantly to individuals or entire groups with a deadline you control.",
  },
  {
    step: "03",
    title: "Track & review",
    description:
      "Monitor real-time progress and review all submissions from one central view.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user?.id;

  return (
    <div className="flex-1 overflow-y-auto bg-background text-foreground">

      {/* ── Hero ── */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-20 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% -5%, hsl(var(--primary)/0.14) 0%, transparent 65%)",
          }}
        />
        <FadeIn className="flex flex-col items-center gap-6 max-w-2xl w-full mx-auto relative z-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary border border-primary/30 bg-primary/8 px-3 py-1 rounded-full w-fit">
            Customer Experience Platform
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-foreground">
            Manage your team&apos;s<br />
            <span className="text-primary">experience at scale</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-lg">
            CX App unifies forms, exams, submissions, and employee management
            into one streamlined platform — with role-based access built in
            from day one.
          </p>

          {!loading && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all"
                >
                  Go to Dashboard <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    Sign in <ChevronRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#features"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card text-card-foreground px-6 py-3 text-sm font-semibold hover:bg-muted active:scale-95 transition-all"
                  >
                    Learn more
                  </a>
                </>
              )}
            </div>
          )}
        </FadeIn>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-4 py-20 max-w-6xl mx-auto w-full">
        <FadeIn className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-xl mx-auto">
            A focused toolkit to handle employee forms, exams, and
            organisation management end-to-end.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 75} className="h-full">
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 h-full hover:border-primary/40 hover:shadow-md transition-all duration-200">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-4 py-20 bg-muted/40 border-y border-border">
        <div className="max-w-4xl mx-auto w-full">
          <FadeIn className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              How it works
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              Up and running in three simple steps.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <FadeIn key={s.step} delay={i * 100}>
                <div className="flex flex-col gap-4 p-6 rounded-xl border border-border bg-card">
                  <span className="text-4xl font-bold text-primary/25 font-mono leading-none">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{s.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 py-24 text-center">
        <FadeIn className="max-w-lg mx-auto flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {isLoggedIn
              ? "Jump back into your dashboard and pick up where you left off."
              : "Sign in to begin managing your team's experience."}
          </p>
          {!loading && (
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              {isLoggedIn ? "Go to Dashboard" : "Sign in"}{" "}
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </FadeIn>
      </section>
    </div>
  );
}
