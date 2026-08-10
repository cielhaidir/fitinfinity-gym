"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "./landing.css";

type Props = {
  isLoggedIn: boolean;
  dashboardUrl: string;
  signInUrl: string;
  signUpUrl: string;
};

const TALLY_FORM_ID = "7RzY90";

const SCHEDULE: { d: string; c: { n: string; k: string; p: string }[] }[] = [
  { d: "Minggu", c: [
    { n: "Running", k: "Outdoor", p: "Lari bareng komunitas." },
    { n: "Mix Fight", k: "Combat", p: "Kombinasi teknik fight & kondisi fisik." },
  ] },
  { d: "Senin", c: [
    { n: "Body Language", k: "Dance Fit", p: "Gerak, musik, dan keringat." },
    { n: "Core", k: "Strength", p: "Fondasi kekuatan dari tengah tubuh." },
  ] },
  { d: "Selasa", c: [
    { n: "Strength", k: "Strength", p: "Teknik angkat yang benar & progresif." },
    { n: "Pilates Mat", k: "Mind & Body", p: "Kontrol, postur, dan fleksibilitas." },
  ] },
  { d: "Rabu", c: [
    { n: "Fit Camp", k: "Functional", p: "Sirkuit fungsional seluruh tubuh." },
    { n: "Kettlebell", k: "Strength", p: "Kekuatan & power dengan kettlebell." },
    { n: "Yoga", k: "Mind & Body", p: "Napas, keseimbangan, ketenangan." },
  ] },
  { d: "Kamis", c: [
    { n: "Mix Fight", k: "Combat", p: "Kombinasi teknik fight & kondisi fisik." },
    { n: "Lower Body", k: "Strength", p: "Fokus kaki & glutes." },
    { n: "Piloxing", k: "Cardio", p: "Pilates × boxing — cepat & fun." },
  ] },
  { d: "Jumat", c: [
    { n: "HIIT", k: "Cardio", p: "Intensitas tinggi, waktu singkat." },
    { n: "Yoga", k: "Mind & Body", p: "Napas, keseimbangan, ketenangan." },
    { n: "Body Pump", k: "Strength", p: "Barbel + musik, full-body burn." },
  ] },
  { d: "Sabtu", c: [
    { n: "Class Corporate & Community", k: "Community", p: "Kelas bareng komunitas & corporate." },
  ] },
];

const TRAINERS = [
  { name: "Mian", role: "Muay Thai for Fitness · Strength · Tone & Shape", img: "/assets/landing/19-coach-mian.webp", ig: "https://www.instagram.com/p/DMZ9SPSyP0_/" },
  { name: "Asriani", role: "Mobility · Tone & Shape · Fat Loss", img: "/assets/landing/20-coach-asriani.webp", ig: "https://www.instagram.com/p/DOH8Xxtkve5/" },
  { name: "Yusliady Al Fathir", role: "Hypertrophy · Strength · Body Building", img: "/assets/landing/21-coach-yusliady-al-fathir.webp", ig: "https://www.instagram.com/p/DMcpSsMSpy-/" },
  { name: "Agus", role: "HIIT · Cardio · Strength", img: "/assets/landing/22-coach-agus.webp", ig: "https://www.instagram.com/p/DR3fpf5kto2/" },
  { name: "Indar", role: "Hypertrophy · Fat Loss · Nutrition", img: "/assets/landing/23-coach-indar.webp", ig: "https://www.instagram.com/p/DVqJSZEkfn3/" },
];

const GALLERY = [
  { img: "/assets/landing/03-dumbbell-rack.webp", alt: "Dumbbell rack" },
  { img: "/assets/landing/04-cardio-zone.webp", alt: "Cardio zone" },
  { img: "/assets/landing/05-bumper-plates.webp", alt: "Bumper plates" },
  { img: "/assets/landing/06-smart-locker.webp", alt: "Smart locker" },
  { img: "/assets/landing/07-strength-area.webp", alt: "Strength area" },
  { img: "/assets/landing/08-shower-amenities.webp", alt: "Shower & amenities" },
  { img: "/assets/landing/09-functional-area.webp", alt: "Functional area" },
  { img: "/assets/landing/10-latihan-dengan-coach.webp", alt: "Latihan dengan coach" },
];

const SLIDES = [
  { tag: "Race", title: "Mini Hyrox", desc: "Race format — grand opening series", img: "/assets/landing/24-mini-hyrox.webp" },
  { tag: "Community", title: "Sunset Movement", desc: "Movement & mobility bareng komunitas", img: "/assets/landing/25-sunset-movement.webp" },
  { tag: "Class", title: "Yoga Day", desc: "Kelas yoga komunitas", img: "/assets/landing/26-yoga-day.webp" },
  { tag: "Outdoor", title: "Street Workout", desc: "Latihan & lari di jantung kota", img: "/assets/landing/27-street-workout.webp" },
  { tag: "Challenge", title: "Fitness Challenge", desc: "Kompetisi antar member", img: "/assets/landing/28-fitness-challenge.webp" },
];

const REELS = [
  { title: "New Year, Stronger Me", href: "https://www.instagram.com/reel/DTPcGJZkZRm/", img: "/assets/landing/29-reels-new-year-stronger-me.webp" },
  { title: "Usia Bertambah bukan Alasan untuk Berhenti Gym", href: "https://www.instagram.com/reel/DZZ1HEvyfPf/", img: "/assets/landing/30-reels-usia-bertambah-bukan-alasan-untuk-.webp" },
  { title: "Setiap Perempuan Punya Kekuatan untuk Bertahan", href: "https://www.instagram.com/reel/DVGbEYNknAm/", img: "/assets/landing/31-reels-setiap-perempuan-punya-kekuatan-un.webp" },
];

export default function MarketingLanding({ isLoggedIn, dashboardUrl, signInUrl, signUpUrl }: Props) {
  const [solid, setSolid] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay());
  const [tallySrc, setTallySrc] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const todayIdx = useMemo(() => new Date().getDay(), []);
  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > 30);
      setShowTop(window.scrollY > 700);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".fi-rv");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("fi-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!TALLY_FORM_ID || TALLY_FORM_ID.includes("GANTI")) return;
    const params = new URLSearchParams(window.location.search);
    const pass = new URLSearchParams();
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "sumber", "campaign"].forEach((k) => {
      const v = params.get(k);
      if (v) pass.set(k, v);
    });
    pass.set("alignLeft", "1");
    pass.set("hideTitle", "1");
    pass.set("transparentBackground", "1");
    setTallySrc(`https://tally.so/embed/${TALLY_FORM_ID}?${pass.toString()}`);
  }, []);

  useEffect(() => {
    const sl = sliderRef.current;
    if (!sl) return;
    let down = false, sx = 0, sc = 0;
    const onDown = (e: MouseEvent) => { down = true; sx = e.pageX; sc = sl.scrollLeft; sl.classList.add("fi-drag"); };
    const onUp = () => { down = false; sl.classList.remove("fi-drag"); };
    const onMove = (e: MouseEvent) => { if (!down) return; e.preventDefault(); sl.scrollLeft = sc - (e.pageX - sx); };
    sl.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    sl.addEventListener("mousemove", onMove);
    return () => {
      sl.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      sl.removeEventListener("mousemove", onMove);
    };
  }, []);

  const slideStep = () => {
    const first = sliderRef.current?.querySelector<HTMLElement>(".fi-slide");
    return (first?.offsetWidth ?? 300) + 16;
  };

  return (
    <div className="fi-landing" ref={rootRef}>
      <div className="fi-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="fi-gridbg" aria-hidden="true" />

      <div className="fi-content">
        {/* ===== HEADER ===== */}
        <header className={`fi-header${solid ? " fi-solid" : ""}`}>
          <div className="fi-wrap fi-nav">
            <a className="fi-logo" href="#home">
              <img src="/assets/landing/00-fit-infinity.png" alt="Fit Infinity" />
              FIT INFINITY
            </a>
            <ul className="fi-menu">
              <li><a href="#about">About</a></li>
              <li><a href="#fasilitas">Fasilitas</a></li>
              <li><a href="#classes">Classes</a></li>
              <li><a href="#trainers">Trainers</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
            <div className="fi-navcta">
              {isLoggedIn ? (
                <Link className="fi-btn fi-sm" href={dashboardUrl}>Dashboard</Link>
              ) : (
                <>
                  <Link className="fi-btn fi-ghost fi-hide-sm" href={signInUrl}>Log in</Link>
                  <Link className="fi-btn fi-sm" href={signUpUrl}>Register</Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <div className="fi-hero" id="home">
          <div className="fi-halo" aria-hidden="true" />
          <div className="fi-ghosttext" aria-hidden="true">INFINITY</div>
          <div className="fi-wrap">
            <span className="fi-eyebrow">Premium Gym · Makassar</span>
            <h1>
              <span className="fi-word"><span>Forge&nbsp;Your</span></span>{" "}
              <span className="fi-word"><span className="fi-accent" style={{ animationDelay: ".12s" }}>Legacy.</span></span>
            </h1>
            <p className="fi-sub">Mulai dari satu sesi gratis — dipandu coach, tanpa komitmen.</p>
            <div className="fi-ctarow">
              <a className="fi-btn" href="#daftar">Klaim Free Trial</a>
              {isLoggedIn ? (
                <Link className="fi-btn fi-line" href={dashboardUrl}>Ke Dashboard</Link>
              ) : (
                <>
                  <Link className="fi-btn fi-line" href={signUpUrl}>Register</Link>
                  <Link className="fi-btn fi-line" href={signInUrl}>Login</Link>
                </>
              )}
            </div>
          </div>
          <div className="fi-scrollhint">scroll</div>
        </div>

        {/* ===== MARQUEE ===== */}
        <div className="fi-marquee" aria-hidden="true">
          <div className="fi-track">
            <span>Forge Your Legacy ✦ Full Access Semua Kelas ✦ Free Towel ✦ Smart Locker ✦ Certified Coaches ✦ Free Trial ✦</span>
            <span>Forge Your Legacy ✦ Full Access Semua Kelas ✦ Free Towel ✦ Smart Locker ✦ Certified Coaches ✦ Free Trial ✦</span>
          </div>
        </div>

        {/* ===== ABOUT ===== */}
        <section className="fi-section" id="about">
          <div className="fi-orb" style={{ top: "-60px", left: "-140px" }} />
          <div className="fi-ringdec" style={{ width: 420, height: 420, right: "-160px", bottom: "-100px" }} />
          <div className="fi-wrap fi-grid2">
            <div className="fi-rv">
              <span className="fi-kick">About Fit Infinity</span>
              <h2>More than a gym. <span className="fi-accent">Tempat kamu membangun versi terbaikmu.</span></h2>
              <p className="fi-lead">Premium gym di jantung Makassar. Satu membership membuka seluruh area latihan dan semua kelas — dan kamu tidak pernah dibiarkan bingung sendirian.</p>
              <ul className="fi-checks">
                <li><b>Full access semua kelas</b>Satu membership, semua kelas group, tanpa biaya ekstra.</li>
                <li><b>Smart locker &amp; free towel</b>Locker akses smart card, handuk bersih, amenities lengkap.</li>
                <li><b>Coach bersertifikat</b>Program dibuat sesuai tujuan dan kondisimu, bukan template.</li>
                <li><b>Lingkungan yang supportive</b>Banyak yang datang sendirian, pulang punya circle baru.</li>
              </ul>
            </div>
            <div className="fi-rv fi-d2">
              <div className="fi-frame" style={{ aspectRatio: "3/4" }}>
                <img src="/assets/landing/01-member-berlatih-di-fit-infinity.webp" alt="Member berlatih di Fit Infinity" loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* ===== FIRST-TIMERS ===== */}
        <section className="fi-section" style={{ paddingTop: 20 }}>
          <div className="fi-wrap">
            <div className="fi-grid2">
              <div className="fi-rv">
                <span className="fi-kick">For First-Timers</span>
                <h2>Everyone starts somewhere. <span className="fi-accent">Mulai milikmu di sini.</span></h2>
                <p className="fi-lead">Takut salah pakai alat, canggung datang sendirian, ragu bisa konsisten — kami paham. Sesi pertamamu tidak dilepas sendirian.</p>
              </div>
              <div className="fi-rv fi-d2">
                <div className="fi-frame" style={{ aspectRatio: "16/10" }}>
                  <img src="/assets/landing/02-konsultasi-dengan-fitness-consultant.webp" alt="Konsultasi dengan Fitness Consultant" loading="lazy" />
                </div>
              </div>
            </div>
            <div className="fi-cards">
              <div className="fi-card fi-rv"><span className="fi-n">01</span><h3>Didampingi dari menit pertama</h3><p>Free trial dipandu Fitness Consultant — mulai dari body assessment singkat sampai rekomendasi program sesuai kondisimu.</p></div>
              <div className="fi-card fi-rv fi-d1"><span className="fi-n">02</span><h3>Program sesuai tujuanmu</h3><p>Turun berat badan, bentuk badan, tambah massa otot, atau sekadar lebih bugar — program mengikuti tujuanmu, bukan sebaliknya.</p></div>
              <div className="fi-card fi-rv fi-d2"><span className="fi-n">03</span><h3>Bukan tempat yang bikin minder</h3><p>Member dan coach yang saling dukung. Semua orang di sini pernah jadi pemula.</p></div>
            </div>
          </div>
        </section>

        {/* ===== FASILITAS ===== */}
        <section className="fi-section" id="fasilitas" style={{ paddingBottom: 60 }}>
          <div className="fi-wrap fi-rv" style={{ marginBottom: "2.4rem" }}>
            <span className="fi-kick">Facilities</span>
            <h2>World-class facilities, <span className="fi-accent">satu atap.</span></h2>
            <p className="fi-lead">Strength &amp; free weights, cardio zone, functional area, studio class, smart locker, dan shower dengan amenities lengkap.</p>
          </div>
          <div className="fi-gal fi-rv">
            <div className="fi-track">
              {[...GALLERY, ...GALLERY].map((g, i) => (
                <figure key={i}><img src={g.img} alt={g.alt} loading="lazy" /></figure>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CLASSES ===== */}
        <section className="fi-section" id="classes" style={{ paddingTop: 60 }}>
          <div className="fi-orb" style={{ bottom: "-100px", right: "-120px" }} />
          <div className="fi-ringdec" style={{ width: 520, height: 520, left: "-220px", top: "-140px" }} />
          <div className="fi-wrap">
            <div className="fi-rv">
              <span className="fi-kick">Weekly Classes</span>
              <h2>One membership. <span className="fi-accent">All classes.</span></h2>
              <p className="fi-lead">Pilih harimu — semua kelas sudah termasuk membership.</p>
            </div>
            <div className="fi-daybar fi-rv">
              {SCHEDULE.map((s, i) => (
                <button key={s.d} className={i === activeDay ? "fi-on" : undefined} onClick={() => setActiveDay(i)}>
                  {s.d}
                  {i === todayIdx && <span className="fi-td">Hari ini</span>}
                </button>
              ))}
            </div>
            <div className="fi-classcards fi-rv">
              {SCHEDULE[activeDay]?.c.map((c, j) => (
                <div className="fi-ccard" key={`${activeDay}-${j}`} style={{ animationDelay: `${j * 0.07}s` }}>
                  <span className="fi-cat">{c.k}</span>
                  <h3>{c.n}</h3>
                  <p>{c.p}</p>
                </div>
              ))}
            </div>
            <p className="fi-rv" style={{ marginTop: "1.7rem", color: "var(--grey)", fontSize: ".9rem" }}>
              Jam &amp; line-up tiap minggu bisa berubah — jadwal terbaru selalu ada di Instagram{" "}
              <a href="https://instagram.com/fitinfinity.id" target="_blank" rel="noopener" style={{ color: "var(--lime)", textDecoration: "none", fontWeight: 700 }}>@fitinfinity.id</a>
            </p>
          </div>
        </section>

        {/* ===== TRAINERS ===== */}
        <section className="fi-section" id="trainers" style={{ paddingTop: 40 }}>
          <div className="fi-orb fi-slow" style={{ top: "20%", left: "-160px" }} />
          <div className="fi-wrap">
            <div className="fi-rv">
              <span className="fi-kick">Personal Trainers</span>
              <h2>Meet <span className="fi-accent">your coaches.</span></h2>
              <p className="fi-lead">Bersertifikat dan peduli progressmu. Personal training untuk hasil yang lebih cepat dan terukur.</p>
            </div>
            <div className="fi-trgrid">
              {TRAINERS.map((t, i) => (
                <a className={`fi-tr fi-rv${i > 0 ? ` fi-d${Math.min(i, 3)}` : ""}`} key={t.name} href={t.ig} target="_blank" rel="noopener">
                  <img src={t.img} alt={`Coach ${t.name}`} loading="lazy" />
                  <div className="fi-info">
                    <b>{t.name}</b>
                    <span>{t.role}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ===== COMMUNITY ===== */}
        <section className="fi-section" style={{ paddingTop: 40 }}>
          <div className="fi-wrap">
            <div className="fi-slhead fi-rv">
              <div>
                <span className="fi-kick">Community &amp; Events</span>
                <h2>Stronger <span className="fi-accent">together.</span></h2>
                <p className="fi-lead">Kelas komunitas, event race, sampai program corporate wellness — geser untuk lihat.</p>
              </div>
              <div className="fi-slnav">
                <button aria-label="Sebelumnya" onClick={() => sliderRef.current?.scrollBy({ left: -slideStep(), behavior: "smooth" })}>←</button>
                <button aria-label="Berikutnya" onClick={() => sliderRef.current?.scrollBy({ left: slideStep(), behavior: "smooth" })}>→</button>
              </div>
            </div>
            <div className="fi-slider fi-rv" ref={sliderRef}>
              {SLIDES.map((s) => (
                <figure className="fi-slide" key={s.title}>
                  <span className="fi-tag">{s.tag}</span>
                  <img src={s.img} alt={s.title} loading="lazy" />
                  <figcaption><b>{s.title}</b><small>{s.desc}</small></figcaption>
                </figure>
              ))}
              <a className="fi-slide fi-more" href="https://instagram.com/fitinfinity.id" target="_blank" rel="noopener">
                <span className="fi-in"><b>Event berikutnya?</b><span>Follow @fitinfinity.id →</span></span>
              </a>
            </div>
            <p className="fi-rv" style={{ marginTop: "1.6rem" }}>
              <a className="fi-btn fi-line" href="#daftar">Tanya program corporate →</a>
            </p>
          </div>
        </section>

        {/* ===== MEMBER STORIES ===== */}
        <section className="fi-section" style={{ paddingTop: 30 }}>
          <div className="fi-orb fi-slow" style={{ top: "-80px", right: "-120px" }} />
          <div className="fi-wrap">
            <div className="fi-rv">
              <span className="fi-kick">Member Stories</span>
              <h2>Real people. <span className="fi-accent">Real progress.</span></h2>
              <p className="fi-lead">Cerita member langsung dari Instagram kami — tap untuk menonton.</p>
            </div>
            <div className="fi-reels">
              {REELS.map((r, i) => (
                <a className={`fi-reel fi-rv${i > 0 ? ` fi-d${i}` : ""}`} key={r.href} href={r.href} target="_blank" rel="noopener">
                  <img src={r.img} alt={`Reels: ${r.title}`} loading="lazy" />
                  <span className="fi-ig">◎ Reels</span>
                  <span className="fi-play">▶</span>
                  <figcaption>{r.title}<small>@fitinfinity.id</small></figcaption>
                </a>
              ))}
            </div>
            <p className="fi-rv" style={{ marginTop: "1.8rem" }}>
              <a href="https://instagram.com/fitinfinity.id" target="_blank" rel="noopener" style={{ color: "var(--lime)", textDecoration: "none", fontWeight: 700 }}>Lihat lebih banyak di @fitinfinity.id →</a>
            </p>
          </div>
        </section>

        {/* ===== FREE TRIAL (Tally + Register app side by side) ===== */}
        <section className="fi-section" id="daftar" style={{ paddingTop: 40 }}>
          <div className="fi-wrap">
            <div className="fi-panel fi-rv">
              <span className="fi-kick">Free Trial</span>
              <h2>Try first. <span className="fi-accent">Decide later.</span></h2>
              <p className="fi-lead">Coba gratis dulu lewat form, atau langsung daftar akun untuk mengelola membership &amp; kelasmu.</p>

              <div className="fi-trialgrid">
                {/* Register akun app */}
                <div className="fi-trialaccount">
                  <span className="fi-triallabel">Daftar Akun</span>
                  <h3>Punya akun Fit Infinity</h3>
                  <p>Sudah jadi member? Kelola semuanya langsung dari dashboard.</p>
                  <ul className="fi-perks">
                    <li>Booking kelas &amp; lihat jadwal terbaru</li>
                    <li>Pantau sisa sesi &amp; status membership</li>
                    <li>Riwayat kehadiran &amp; progress latihan</li>
                  </ul>
                  <div className="fi-acctactions">
                    {isLoggedIn ? (
                      <Link className="fi-btn" href={dashboardUrl}>Buka Dashboard</Link>
                    ) : (
                      <>
                        <Link className="fi-btn" href={signUpUrl}>Daftar Akun</Link>
                        <Link className="fi-btn fi-line" href={signInUrl}>Sudah punya? Login</Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Tally free trial */}
                <div className="fi-trialform">
                  <span className="fi-triallabel">Coba Gratis · Tanpa Akun</span>
                  <div className="fi-formshell">
                    <div className="fi-formhead"><span className="fi-dot" />Form Free Trial · 1 menit</div>
                    {tallySrc ? (
                      <iframe src={tallySrc} title="Form Free Trial Fit Infinity" loading="lazy" />
                    ) : (
                      <div className="fi-formfallback">
                        <p style={{ marginBottom: "1.2rem" }}>Form sedang dimuat… kalau tidak muncul, klik tombol ini:</p>
                        <a className="fi-btn" href="https://handy-nephew-b45.notion.site/20cd14fb79cb40afb93fff7967285236" target="_blank" rel="noopener">Buka Form Free Trial</a>
                      </div>
                    )}
                  </div>
                  <p className="fi-formnote">
                    Fitness Consultant kami menghubungimu maks. 1×24 jam. Butuh cepat? WhatsApp{" "}
                    <a href="https://wa.me/6282190845159" target="_blank" rel="noopener">0821-9084-5159</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CONTACT ===== */}
        <section className="fi-section" id="contact" style={{ paddingTop: 30 }}>
          <div className="fi-orb fi-slow" style={{ bottom: "-120px", left: "30%" }} />
          <div className="fi-ringdec" style={{ width: 380, height: 380, right: "-120px", top: "-80px" }} />
          <div className="fi-wrap">
            <div className="fi-rv">
              <span className="fi-kick">Visit Us</span>
              <h2>In the heart <span className="fi-accent">of Makassar.</span></h2>
            </div>
            <div className="fi-cgrid">
              <div className="fi-card fi-rv">
                <span className="fi-n">Alamat</span>
                <h3>Jl. Sungai Saddang Lama No. 102</h3>
                <p>Makassar, Sulawesi Selatan<br />
                  <a href="https://maps.google.com/?q=Fit+Infinity+Makassar" target="_blank" rel="noopener">Buka di Google Maps →</a></p>
              </div>
              <div className="fi-card fi-rv fi-d1">
                <span className="fi-n">Jam Operasional</span>
                <h3>Senin – Minggu<br />06.00 – 22.00 WITA</h3>
                <p>Buka setiap hari.</p>
              </div>
              <div className="fi-card fi-rv fi-d2">
                <span className="fi-n">Hubungi Kami</span>
                <h3>@fitinfinity.id</h3>
                <p>WhatsApp: <a href="https://wa.me/6282190845159" target="_blank" rel="noopener">0821-9084-5159</a><br />
                  Email: fitinfinitymks@gmail.com</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="fi-footer">
          <div className="fi-wrap">
            <a className="fi-logo" href="#home">
              <img src="/assets/landing/00-fit-infinity.png" alt="Fit Infinity" />
            </a>
            <div>Premium Gym · Makassar — © {year} Fit Infinity</div>
          </div>
        </footer>
      </div>

      <button
        className={`fi-topbtn${showTop ? " fi-show" : ""}`}
        aria-label="Kembali ke atas"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </div>
  );
}
