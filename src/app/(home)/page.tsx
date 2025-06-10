import Link from "next/link";
import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import Navbar from "@/components/headers/navbar";
import Hero from "./hero";
import Classes from "./clasess";
import Facilities from "./facilities";
import Trainers from "./trainers";
//import Footer from "@/components/footer/footer";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="bg-black text-white">
        <Navbar user={session?.user ?? undefined} />

        {/* 
        <Classes />
        <Trainers />
        <Facilities />
         */}
        <body className="dark font-sans transition-colors duration-200">
          {/* <nav className="fixed w-full  shadow-md z-50 transition-colors duration-200">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
            <div className="flex items-center">
                <span className="text-3xl font-bold text-infinity">FIT INFINITY</span>
            </div>
            
            <div className="hidden md:flex space-x-8">
                <a href="#home" className="nav-link text-gray-800 dark:text-gray-200 hover:text-infinity transition duration-300">Home</a>
                <a href="#about" className="nav-link text-gray-800 dark:text-gray-200 hover:text-infinity transition duration-300">About</a>
                <a href="#classes" className="nav-link text-gray-800 dark:text-gray-200 hover:text-infinity transition duration-300">Classes</a>
                <a href="#trainers" className="nav-link text-gray-800 dark:text-gray-200 hover:text-infinity transition duration-300">Trainers</a>
                <a href="#contact" className="nav-link text-gray-800 dark:text-gray-200 hover:text-infinity transition duration-300">Contact</a>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
                <button id="themeToggle" className="text-gray-800 dark:text-gray-200 focus:outline-none">
                    <i className="fas fa-moon dark:hidden"></i>
                    <i className="fas fa-sun hidden dark:block"></i>
                </button>
                <button className="bg-infinity text-white px-6 py-2 rounded-full font-semibold hover:bg-opacity-90 transition duration-300">JOIN NOW</button>
            </div>
            
            <button className="md:hidden text-gray-800 dark:text-gray-200 focus:outline-none">
                <i className="fas fa-bars text-2xl"></i>
            </button>
        </div>
    </nav> */}

          <Hero />
          {/* <section id="home" className="hero-image pt-24 flex items-center justify-center">
        <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">FORGE YOUR <span className="text-infinity">LEGACY</span></h1>
            <p className="text-xl text-white mb-8 max-w-2xl mx-auto">Join our gym and transform your body with our professional trainers and state-of-the-art equipment.</p>
            <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-6">
                <button className="bg-infinity text-white px-8 py-3 rounded-full font-semibold hover:bg-opacity-90 transition duration-300 pulse">GET STARTED</button>
                <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-gray-800 transition duration-300">LEARN MORE</button>
            </div>
        </div>
    </section> */}

          <section id="about" className="bg-black py-20">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
                {/* Kiri: Teks dan tombol */}
                <div>
                  <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    ABOUT <span className="text-[#C9D953]">FIT INFINITY</span>
                  </h2>
                  <p className="mb-4 text-gray-200">
                    Fit Infinity is the largest gym in Makassar, providing a
                    complete fitness experience for everyone. We believe that
                    fitness should be accessible to all—no matter your income or
                    background.
                  </p>
                  <p className="mb-4 text-gray-200">
                    With just one membership, you get unlimited access to all
                    our classes for free. From expert training and personalized
                    nutrition guidance to strong community support, everything
                    is designed to help you achieve your goals.
                  </p>
                  <p className="mb-8 text-gray-200">
                    Our modern facilities and professional trainers are here to
                    push your limits and support you every step of the way on
                    your fitness journey.
                  </p>
                  <div className="flex items-center gap-4">
                    <Link href="/auth/signin" passHref legacyBehavior>
                      <button className="relative flex items-center overflow-hidden rounded-md border-2 border-[#C9D953] bg-[#C9D953] px-8 py-3 font-bold uppercase text-black shadow-lg transition duration-200 hover:bg-[#b6c940]">
                        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-none rounded-br-[5px] rounded-tl-none rounded-tr-[5px] bg-black"></span>
                        Discover more
                        <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-black"></span>
                      </button>
                    </Link>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-800">
                      <svg
                        width="20"
                        height="20"
                        fill="currentColor"
                        className="text-gray-200"
                        viewBox="0 0 20 20"
                      >
                        <polygon points="7,5 15,10 7,15" />
                      </svg>
                    </span>
                  </div>
                </div>
                {/* Kanan: Dua kotak placeholder */}
                <div className="flex flex-row justify-center gap-8">
                  <img
                    src="/assets/dashboard/img9.png"
                    alt="About Fit Infinity"
                    className="h-96 w-48 rounded-xl object-cover shadow-lg transition duration-300 hover:shadow-[0_0_40px_10px_#C9D953] md:h-[28rem] md:w-64"
                  />
                  <img
                    src="/assets/dashboard/img10.png"
                    alt="About Fit Infinity 2"
                    className="h-96 w-48 rounded-xl object-cover shadow-2xl transition duration-300 hover:shadow-[0_0_40px_10px_#C9D953] md:h-[28rem] md:w-64"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section Facilities */}
          <section id="facilities" className="bg-black py-20">
            <div className="container mx-auto px-6">
              <div className="mb-10 flex flex-col items-center">
                <span className="mb-4 rounded-full bg-[#C9D953] px-6 py-1 text-sm font-semibold text-black">
                  Facilities
                </span>
                <h2 className="mb-8 text-center text-2xl font-extrabold text-white md:text-3xl">
                  A Different Ngegym Experience
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {/* Card 1 */}
                <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-black">
                  <div className="bg-[#C9D953] p-6 text-center">
                    <div className="min-h-[40px] text-lg font-bold leading-snug tracking-wide text-black md:text-xl">
                      All Modern Tools
                      <br />& Brand New
                      <br />
                      &nbsp;
                    </div>
                  </div>
                  <img
                    src="/assets/dashboard/img3.png"
                    alt="Modern Tools"
                    className="h-56 w-full rounded-b-2xl object-cover shadow-lg"
                  />
                </div>
                {/* Card 2 */}
                <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-black">
                  <div
                    className="p-6 text-center"
                    style={{
                      background:
                        "radial-gradient(ellipse at 100% 900%, #C9D953 0%, #111 100%)",
                    }}
                  >
                    <div className="min-h-[40px] text-lg font-bold leading-snug tracking-wide text-white md:text-xl">
                      Get Towel
                      <br />& Cozy Dressing
                      <br />
                      Room
                    </div>
                  </div>
                  <img
                    src="/assets/dashboard/img1.png"
                    alt="Dressing Room"
                    className="h-40 w-full rounded-b-2xl object-cover shadow-lg"
                  />
                  <div className="pb-4 pt-4 text-center">
                    <Link href="/auth/signin" passHref legacyBehavior>
                      <button className="relative flex w-full items-center justify-center rounded-xl bg-white py-4 text-xl font-bold text-black shadow-lg transition duration-200 hover:bg-gray-100">
                        <span className="mx-6">Other Benefits</span>
                        <span className="absolute right-5 top-3">
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#C9D953"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M7 7L17 7L17 17" />
                            <path d="M17 7L7 17" />
                          </svg>
                        </span>
                      </button>
                    </Link>
                  </div>
                </div>
                {/* Card 3 */}
                <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-black">
                  <div className="bg-[#C9D953] p-6 text-center">
                    <div className="min-h-[40px] text-lg font-bold leading-snug tracking-wide text-black md:text-xl">
                      Full Access
                      <br />
                      24 Hours Comfortable
                      <br />& Clean
                    </div>
                  </div>
                  <img
                    src="/assets/dashboard/img2.png"
                    alt="Gym Building"
                    className="h-56 w-full rounded-b-2xl object-cover shadow-lg"
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            id="classes"
            className="relative bg-[#C9D953] py-20 text-black"
            style={{
              clipPath:
                "polygon(0 4% , 5% 0, 95% 0, 100% 4%, 100% 96%, 95% 100%, 5% 100%, 0 96%)",
            }}
          >
            <div className="container mx-auto px-6">
              <div className="mb-8 flex flex-col items-center">
                <span className="mb-4 rounded-full bg-black px-6 py-1 text-xs font-semibold text-[#C9D953]">
                  OUR CLASSES
                </span>
                <h2 className="mb-4 text-center text-2xl font-extrabold text-black md:text-3xl">
                  We offer a wide variety of fitness classes designed to
                  challenge
                  <br className="hidden md:block" /> and inspire your at every
                  fitness level.
                </h2>
              </div>
              <div className="relative flex flex-col items-center">
                {/* Spotlight effect */}
                <div className="absolute left-1/2 top-1/2 z-0 h-40 w-[480px] -translate-x-1/2 rounded-full bg-black opacity-40 blur-3xl md:top-2/3"></div>
                <div className="relative z-10 mb-12 grid w-full grid-cols-1 gap-8 md:grid-cols-3">
                  {/* Card 1 */}
                  <div className="relative flex min-h-[340px] flex-col items-stretch">
                    {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
                    <div className="flex h-[250px] bg-white p-4">
                      {/* Kiri: Deskripsi dan info */}
                      <div className="flex flex-1 flex-col">
                        <div className="mb-0 text-sm font-bold text-black">
                          Improve flexibility, strength and mental focus with
                          out yoga sessions.
                        </div>
                        <div className="mt-20 flex flex-col">
                          <div className="flex items-center gap-1 text-xs font-bold text-black">
                            <i className="fas fa-user"></i> Steven Doe
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-black">
                            <i className="far fa-clock"></i> 60 Min
                          </div>
                        </div>
                      </div>
                      {/* Kanan: Gambar dan judul */}
                      <div className="flex flex-1 flex-col items-center justify-center">
                        <img
                          src="/assets/dashboard/img6.jpg"
                          alt="Class"
                          className="mb-2 h-32 w-32 rounded-xl object-cover"
                        />
                        <div className="text-center text-2xl font-bold font-extrabold text-black">
                          Yoga
                        </div>
                      </div>
                    </div>
                    {/* Kotak kedua dengan polygon tail (lebih tinggi) */}
                    <div
                      className="relative ml-0 mt-0 h-14 w-[60%]"
                      style={{
                        clipPath:
                          "polygon(0 0, 100% 0, 100% 0%, 80% 100%, 0 100%)",
                        background: "#fff",
                      }}
                    >
                      {/* Badge Level di dalam kotak kedua */}
                      <div className="absolute bottom-3.5 left-7">
                        <button className="flex items-center gap-2 rounded-md bg-black px-4 py-1 text-xs font-semibold text-white shadow">
                          Easy
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="#C9D953"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Card 2 */}
                  <div className="relative flex min-h-[340px] flex-col items-stretch">
                    {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
                    <div className="flex h-[250px] bg-white p-4">
                      {/* Kiri: Deskripsi dan info */}
                      <div className="flex flex-1 flex-col">
                        <div className="mb-0 text-sm font-bold text-black">
                          Build strength and muscle with proper technique and
                          guidance.
                        </div>
                        <div className="mt-20 flex flex-col">
                          <div className="flex items-center gap-1 text-xs font-bold text-black">
                            <i className="fas fa-user"></i> Steven Doe
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-black">
                            <i className="far fa-clock"></i> 45 Min
                          </div>
                        </div>
                      </div>
                      {/* Kanan: Gambar dan judul */}
                      <div className="flex flex-1 flex-col items-center justify-center">
                        <img
                          src="/assets/dashboard/img8.png"
                          alt="Class"
                          className="mb-2 h-32 w-32 rounded-xl object-cover"
                        />
                        <div className="text-center text-2xl font-bold font-extrabold text-black">
                          Weighylifting
                        </div>
                      </div>
                    </div>
                    {/* Kotak kedua dengan polygon tail (lebih tinggi) */}
                    <div
                      className="relative ml-0 mt-0 h-14 w-[60%]"
                      style={{
                        clipPath:
                          "polygon(0 0, 100% 0, 100% 0%, 80% 100%, 0 100%)",
                        background: "#fff",
                      }}
                    >
                      {/* Badge Level di dalam kotak kedua */}
                      <div className="absolute bottom-3.5 left-6">
                        <button className="flex items-center gap-2 rounded-md bg-black px-4 py-1 text-xs font-semibold text-white shadow">
                          Medium
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="#C9D953"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Card 3 */}
                  <div className="relative flex min-h-[340px] flex-col items-stretch">
                    {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
                    <div className="flex h-[250px] bg-white p-4">
                      {/* Kiri: Deskripsi dan info */}
                      <div className="flex flex-1 flex-col">
                        <div className="mb-0 text-sm font-bold text-black">
                          High-intensity functional movement that will push your
                          limits.
                        </div>
                        <div className="mt-20 flex flex-col">
                          <div className="flex items-center gap-1 text-xs font-bold text-black">
                            <i className="fas fa-user"></i> Steven Doe
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-black">
                            <i className="far fa-clock"></i> 60 Min
                          </div>
                        </div>
                      </div>
                      {/* Kanan: Gambar dan judul */}
                      <div className="flex flex-1 flex-col items-center justify-center">
                        <img
                          src="/assets/dashboard/img7.jpg"
                          alt="Class"
                          className="mb-2 h-32 w-32 rounded-xl object-cover"
                        />
                        <div className="text-center text-2xl font-bold font-extrabold text-black">
                          CrossFit
                        </div>
                      </div>
                    </div>
                    {/* Kotak kedua dengan polygon tail (lebih tinggi) */}
                    <div
                      className="relative ml-0 mt-0 h-14 w-[60%]"
                      style={{
                        clipPath:
                          "polygon(0 0, 100% 0, 100% 0%, 80% 100%, 0 100%)",
                        background: "#fff",
                      }}
                    >
                      {/* Badge Level di dalam kotak kedua */}
                      <div className="absolute bottom-3.5 left-7">
                        <button className="flex items-center gap-2 rounded-md bg-black px-4 py-1 text-xs font-semibold text-white shadow">
                          Hard
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="#C9D953"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Steps */}
              <div className="mb-8 mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="flex flex-col items-center">
                  <span className="mb-2 text-xs text-gray-700">Step 01</span>
                  <div className="text-center text-xl font-semibold text-black md:text-2xl">
                    Choose the Class
                    <br />
                    as You Like <sup>↗</sup>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="mb-2 text-xs text-gray-700">Step 02</span>
                  <div className="text-center text-xl font-semibold text-black md:text-2xl">
                    Booking
                    <br />
                    Your Class <sup>↗</sup>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="mb-2 text-xs text-gray-700">Step 03</span>
                  <div className="text-center text-xl font-semibold text-black md:text-2xl">
                    Attend &<br />
                    Enjoy It! <sup>↗</sup>
                  </div>
                </div>
              </div>
              {/* Learn More Button */}
              <div className="flex justify-center">
                <Link href="/auth/signin" passHref legacyBehavior>
                  <button className="relative flex items-center overflow-hidden rounded-md border-2 border-black bg-black px-8 py-3 font-bold uppercase text-[#C9D953] shadow-lg transition duration-200 hover:bg-neutral-900">
                    <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-none rounded-br-[5px] rounded-tl-none rounded-tr-[5px] bg-[#C9D953]"></span>
                    Learn More
                    <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-[#C9D953]"></span>
                  </button>
                </Link>
              </div>
            </div>
          </section>

          <section id="trainers" className="bg-black py-20">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">
                {/* Kiri */}
                <div>
                  <span className="mb-4 inline-flex items-center rounded-full bg-black px-4 py-1 text-xs font-semibold text-[#C9D953]">
                    <span className="mr-2 h-2 w-2 rounded-full bg-[#C9D953]"></span>
                    OUR TRAINERS
                  </span>
                  <h2 className="mb-8 text-3xl font-extrabold leading-tight text-white">
                    Certified Fitness
                    <br />
                    Coaches
                  </h2>
                  <div>
                    <div className="flex items-center border-b border-gray-700 py-4">
                      <span className="mr-6 text-2xl font-semibold text-white">
                        01.
                      </span>
                      <span className="text-lg text-white">
                        Personal Training
                      </span>
                    </div>
                    <div className="flex items-center border-b border-gray-700 py-4">
                      <span className="mr-6 text-2xl font-semibold text-white">
                        02.
                      </span>
                      <span className="text-lg text-white">
                        Maximum Progress
                      </span>
                    </div>
                    <div className="flex items-center py-4">
                      <span className="mr-6 text-2xl font-semibold text-white">
                        03.
                      </span>
                      <span className="text-lg text-white">Optimal Result</span>
                    </div>
                  </div>
                </div>
                {/* Tengah */}
                <div className="flex justify-end pr-8">
                  <img
                    src="/assets/dashboard/img4.jpg"
                    alt="Trainer"
                    className="w-full max-w-md rounded-xl object-cover transition duration-300 hover:shadow-[0_0_40px_10px_#C9D953]"
                  />
                </div>
                {/* Kanan */}
                <div className="flex flex-col items-center gap-6">
                  <img
                    src="/assets/dashboard/img5.jpg"
                    alt="Trainer"
                    className="h-56 w-40 rounded-xl object-cover transition duration-300 hover:shadow-[0_0_40px_10px_#C9D953]"
                  />
                  <div className="text-center text-xl font-semibold text-white">
                    Find Best Coaches
                  </div>
                  <Link href="/auth/signin" passHref legacyBehavior>
                    <button className="relative mt-2 flex items-center overflow-hidden rounded-md border-2 border-[#C9D953] bg-[#C9D953] px-8 py-3 font-bold uppercase text-black shadow-lg transition duration-200 hover:bg-[#b6c940]">
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-none rounded-br-[5px] rounded-tl-none rounded-tr-[5px] bg-black"></span>
                      Learn More
                      <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-black"></span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-black py-16">
            <div className="container mx-auto px-6 text-center">
              <h2 className="mb-6 text-2xl font-extrabold text-white md:text-3xl">
                READY TO FORCE YOUR LEGACY?
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-white">
                Join Infinity Gym today and start your fitness journey with our
                expert guidance and supportive community.
              </p>
              <div className="flex justify-center">
                <Link href="/auth/signup" passHref legacyBehavior>
                  <button className="relative flex items-center overflow-hidden rounded-md border-2 border-[#C9D953] bg-[#C9D953] px-8 py-3 font-bold uppercase text-black shadow-lg transition duration-200 hover:bg-[#b6c940]">
                    <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-none rounded-br-[5px] rounded-tl-none rounded-tr-[5px] bg-black" />
                    SIGN UP NOW
                    <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-black" />
                  </button>
                </Link>
              </div>
            </div>
          </section>

          <section id="contact" className="py-20">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row">
                <div className="mb-10 md:mb-0 md:w-1/2 md:pr-10">
                  <h2 className="mb-6 text-3xl font-bold text-gray-800 dark:text-white">
                    CONTACT <span className="text-infinity">US</span>
                  </h2>
                  <p className="mb-6 text-gray-600 dark:text-gray-300">
                    Have questions about our service and facilities? Reach out
                    to us and we'll get back to you as soon as possible.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="mr-4 rounded-full bg-infinity p-2 text-white">
                        <i className="fas fa-map-marker-alt"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">
                          Address
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          Jl. Sungai Saddang Lama No.102, Makassar
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="mr-4 rounded-full bg-infinity p-2 text-white">
                        <i className="fas fa-phone-alt"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">
                          Phone
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          (123) 456-7890
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="mr-4 rounded-full bg-infinity p-2 text-white">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">
                          Email
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          info@fitinfinity.id
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:w-1/2">
                  <form className="rounded-lg bg-black p-8 shadow-lg dark:bg-gray-700">
                    <div className="mb-4">
                      <label
                        htmlFor="name"
                        className="mb-2 block text-gray-200 dark:text-gray-200"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        className="w-full rounded-lg border bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-infinity dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      ></input>
                    </div>

                    <div className="mb-4">
                      <label
                        htmlFor="email"
                        className="mb-2 block text-gray-200 dark:text-gray-200"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="w-full rounded-lg border bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-infinity dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      ></input>
                    </div>

                    <div className="mb-4">
                      <label
                        htmlFor="message"
                        className="mb-2 block text-gray-200 dark:text-gray-200"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        className="w-full rounded-lg border bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-infinity dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-infinity px-6 py-3 font-semibold text-white transition duration-300 hover:bg-opacity-90"
                    >
                      SEND MESSAGE
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <footer className="bg-black py-12 text-white">
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                <div>
                  <div className="mb-4 flex items-center">
                    <span className="text-2xl font-bold text-infinity">
                      FIT INFINITY
                    </span>
                  </div>
                  <p className="text-gray-400">
                    Forge your legacy at the largest mega gym in Makassar,
                    equipped with state-of-the-art facilities and expert
                    trainers dedicated to your transformation.
                  </p>
                </div>

                <div>
                  <h4 className="mb-4 text-lg font-semibold">Quick Links</h4>
                  <ul className="space-y-2">
                    <li>
                      <a
                        href="#home"
                        className="text-gray-400 transition duration-300 hover:text-white"
                      >
                        Home
                      </a>
                    </li>
                    <li>
                      <a
                        href="#about"
                        className="text-gray-400 transition duration-300 hover:text-white"
                      >
                        About
                      </a>
                    </li>
                    <li>
                      <a
                        href="#classes"
                        className="text-gray-400 transition duration-300 hover:text-white"
                      >
                        Classes
                      </a>
                    </li>
                    <li>
                      <a
                        href="#trainers"
                        className="text-gray-400 transition duration-300 hover:text-white"
                      >
                        Trainers
                      </a>
                    </li>
                    <li>
                      <a
                        href="#contact"
                        className="text-gray-400 transition duration-300 hover:text-white"
                      >
                        Contact
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-4 text-lg font-semibold">Opening Hours</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li>Everyday: 7:00 AM - 10:00 PM</li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-4 text-lg font-semibold">Follow Us</h4>
                  <div className="flex space-x-4">
                    <a
                      href="#"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition duration-300 hover:bg-infinity"
                    >
                      <i className="fab fa-facebook-f"></i>
                    </a>
                    <a
                      href="#"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition duration-300 hover:bg-infinity"
                    >
                      <i className="fab fa-twitter"></i>
                    </a>
                    <a
                      href="#"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition duration-300 hover:bg-infinity"
                    >
                      <i className="fab fa-instagram"></i>
                    </a>
                    <a
                      href="#"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition duration-300 hover:bg-infinity"
                    >
                      <i className="fab fa-youtube"></i>
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-12 border-t border-gray-700 pt-8 text-center text-gray-400">
                <p>&copy; 2025 Fit Infinity. All rights reserved.</p>
              </div>
            </div>
          </footer>

          <button
            id="backToTop"
            className="fixed bottom-8 right-8 hidden h-12 w-12 rounded-full bg-infinity text-white shadow-lg"
          >
            <i className="fas fa-arrow-up"></i>
          </button>
        </body>
      </main>
    </HydrateClient>
  );
}
