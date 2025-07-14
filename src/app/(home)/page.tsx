import Link from "next/link";
import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import Navbar from "@/components/headers/navbar";
import Hero from "./hero"; // Ensure this is the correct path and the component is properly exported
import Classes from "./clasess";
import Facilities from "./facilities";
import Trainers from "./trainers";
//import Footer from "@/components/footer/footer";

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Gym",
  "name": "Fit Infinity",
  "alternateName": "Fit Infinity Gym",
  "description": "Largest mega gym in Makassar with state-of-the-art equipment, certified personal trainers, and comprehensive fitness classes. Transform your body and forge your legacy.",
  "url": "https://fitinfinity.id",
  "logo": "https://fitinfinity.id/assets/fitinfinity-lime.png",
  "image": [
    "https://fitinfinity.id/assets/landingpage-hero.png",
    "https://fitinfinity.id/assets/dashboard/img1.png",
    "https://fitinfinity.id/assets/dashboard/img2.png"
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Jl. Sungai Saddang Lama No.102",
    "addressLocality": "Makassar",
    "addressRegion": "South Sulawesi",
    "addressCountry": "ID"
  },
  "telephone": "+62-123-456-7890",
  "email": "info@fitinfinity.id",
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": [
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    ],
    "opens": "07:00",
    "closes": "22:00"
  },
  "amenityFeature": [
    {
      "@type": "LocationFeatureSpecification",
      "name": "Personal Training",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Group Classes",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "CrossFit",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Yoga Classes",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Weight Training",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Cardio Equipment",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Locker Rooms",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Towel Service",
      "value": true
    }
  ],
  "priceRange": "$$",
  "sameAs": [
    "https://www.facebook.com/fitinfinity",
    "https://www.instagram.com/fitinfinity",
    "https://www.youtube.com/fitinfinity"
  ]
};

export default async function Home() {
  const session = await auth();
  
  // Helper function untuk menentukan URL tujuan berdasarkan role
  const getAuthUrl = () => {
    if (!session?.user) {
      return "/auth/signin";
    }
    
    // Check user permissions to determine appropriate dashboard
    const userPermissions = session.user.permissions || [];
    
    if (userPermissions.includes("menu:dashboard-admin")) {
      return "/admin";
    } else if (userPermissions.includes("menu:dashboard-finance")) {
      return "/finance";
    } else if (userPermissions.includes("menu:dashboard-fc")) {
      return "/fitness-consultants";
    } else if (userPermissions.includes("menu:dashboard-pt")) {
      return "/personal-trainers";
    } else if (userPermissions.includes("menu:dashboard-member")) {
      return "/member";
    } else {
      // Default fallback to member dashboard
      return "/member";
    }
  };

  return (
    <HydrateClient>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="bg-black text-white">
        <Navbar user={session?.user ?? undefined} />

        {/* 
        <Classes />
        <Trainers />
        <Facilities />
         */}
        <div className="dark font-sans transition-colors duration-200">
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

          <Hero /> {/* Replace 'someProp' and 'someValue' with the actual required prop(s) */}
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
  
    <section id="about" className="py-20 bg-black">
        <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Kiri: Teks dan tombol */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              ABOUT <span className="text-[#C9D953]">FIT INFINITY</span>
            </h2>
            <p className="text-gray-200 mb-4">
            Fit Infinity is the largest and most comprehensive gym in Makassar, offering a full-scale fitness experience for individuals from all walks of life. Our mission is to make fitness accessible and empowering for everyone.
            </p>
            <p className="text-gray-200 mb-4">
            A single membership grants you unlimited access to all group classes at no additional cost. With expert-led training, personalized nutrition guidance, and a strong sense of community, we’re here to help you achieve lasting results.
            </p>
            <p className="text-gray-200 mb-8">
            Equipped with modern facilities and experienced trainers, Fit Infinity is committed to supporting your fitness journey—every step of the way.
            </p>
            <div className="flex items-center gap-4">
              <Link href={getAuthUrl()} passHref legacyBehavior>
                <button className="relative bg-[#C9D953] text-black font-bold uppercase px-8 py-3 rounded-md shadow-lg border-2 border-[#C9D953] flex items-center overflow-hidden hover:bg-[#b6c940] transition duration-200">
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-black rounded-tl-none rounded-bl-none rounded-tr-[5px] rounded-br-[5px]"
                  ></span>
                  Discover more
                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-black rounded-tl-[5px] rounded-bl-[5px] rounded-tr-none rounded-br-none"
                  ></span>
                </button>
              </Link>
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-800">
                <svg width="20" height="20" fill="currentColor" className="text-gray-200" viewBox="0 0 20 20"><polygon points="7,5 15,10 7,15" /></svg>
              </span>
                        </div>
                    </div>
          {/* Kanan: Dua kotak placeholder */}
          <div className="flex flex-row gap-8 justify-center">
            <img src="/assets/dashboard/img9.png" alt="About Fit Infinity" className="rounded-xl shadow-lg w-48 md:w-64 h-96 md:h-[28rem] object-cover transition duration-300 hover:shadow-[0_0_40px_10px_#C9D953]" />
            <img src="/assets/dashboard/img10.png" alt="About Fit Infinity 2" className="rounded-xl shadow-2xl w-48 md:w-64 h-96 md:h-[28rem] object-cover transition duration-300 hover:shadow-[0_0_40px_10px_#C9D953]" />
                </div>
            </div>
        </div>
    </section>
    {/*sheesh*/}
    {/* Section Facilities */}
    <section id="facilities" className="py-20 bg-black">
        <div className="container mx-auto px-6">
        <div className="flex flex-col items-center mb-10">
          <span className="bg-[#C9D953] text-black text-sm font-semibold px-6 py-1 rounded-full mb-4">Facilities</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-white mb-8">Your New Beginning Starts Here</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="rounded-2xl overflow-hidden bg-black flex flex-col h-full">
            <div className="bg-[#C9D953] p-6 text-center">
              <div className="text-lg md:text-xl font-bold tracking-wide text-black leading-snug min-h-[40px]">
              State-of-the-Art Equipment<br/>
              <span className="text-sm font-normal">Train with the latest, brand-new fitness tools and machines designed for all levels and goals.</span>
              </div>
            </div>
            <img src="/assets/dashboard/img3.jpg" alt="Equipment" className="w-full h-56 object-cover rounded-b-2xl shadow-lg" />
            </div>
            {/* Card 2 */}
            <div className="rounded-2xl overflow-hidden bg-black flex flex-col h-full">
            <div className="p-6 text-center" style={{background: 'radial-gradient(ellipse at 100% 900%, #C9D953 0%, #111 100%)'}}>
              <div className="text-lg md:text-xl font-bold tracking-wide text-white leading-snug min-h-[40px]">
              Secure & Comfortable Facilities<br/>
              <span className="text-sm font-normal">Benefit from secure lockers with smart card access,cozy changing rooms, and fully stocked toiletries.</span>
              </div>
            </div>
            <img src="/assets/dashboard/img1.JPG" alt="Dressing Room" className="w-full h-40 object-cover rounded-b-2xl shadow-lg" />
            <div className="pt-4 pb-4 text-center">
              <Link href={getAuthUrl()} passHref legacyBehavior>
              <button className="w-full bg-white text-black py-4 text-xl font-bold rounded-xl flex items-center justify-center relative shadow-lg hover:bg-gray-100 transition duration-200">
              <span className="mx-6">Other Benefits</span>
              <span className="absolute top-3 right-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9D953" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7L17 7L17 17"/>
                <path d="M17 7L7 17"/>
              </svg>
              </span>
              </button>
              </Link>
            </div>
            </div>
            {/* Card 3 */}
            <div className="rounded-2xl overflow-hidden bg-black flex flex-col h-full">
            <div className="bg-[#C9D953] p-6 text-center">
              <div className="text-lg md:text-xl font-bold tracking-wide text-black leading-snug min-h-[40px]">
              Unlimited Access in a Pleasant Ambience<br/>
              <span className="text-sm font-normal">Make the most of your membership with full access<br/>to all areas, surrounded by a clean, energizing environment.</span>
              </div>
            </div>
            <img src="/assets/dashboard/img2.JPG" alt="Gym Building" className="w-full h-56 object-cover rounded-b-2xl shadow-lg" />
            </div>
        </div>
      </div>
    </section>
    
    <section id="classes" className="relative py-20 bg-[#C9D953] text-black" style={{clipPath: 'polygon(0 4% , 5% 0, 95% 0, 100% 4%, 100% 96%, 95% 100%, 5% 100%, 0 96%)'}}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center mb-8">
          <span className="bg-black text-[#C9D953] text-xs font-semibold px-6 py-1 rounded-full mb-4">OUR CLASSES</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-black mb-4">We offer a wide variety of fitness classes designed to challenge<br className='hidden md:block'/> and inspire your at every fitness level.</h2>
        </div>
        <div className="relative flex flex-col items-center">
          {/* Spotlight effect */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 md:top-2/3 w-[480px] h-40 bg-black rounded-full blur-3xl opacity-40 z-0"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 w-full">
            {/* Card 1 */}
            <Link href="https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDQ5MDg1MjI1MTcwMzMz?story_media_id=3673328102589314986&igsh=Njg2enV6c2ZuenV2" target="_blank" rel="noopener noreferrer">
              <div className="relative flex flex-col items-stretch min-h-[340px] cursor-pointer hover:scale-105 transition-transform duration-300">
              {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
              <div className="bg-white flex h-[250px] p-4">
                {/* Kiri: Deskripsi dan info */}
                <div className="flex flex-col flex-1">
                  <div className="text-black text-sm mb-0 font-bold">
                    Improve flexibility, strength and mental focus with out yoga sessions.
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
                          <div className="mb-2 h-32 w-32 rounded-xl bg-[#C9D953] flex items-center justify-center">
                            <i className="fas fa-spa text-white text-4xl"></i>
                          </div>
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
            </Link>
                  {/* Card 2 */}
                  <Link href="https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDQ5MDg1MjI1MTcwMzMz?story_media_id=3660264174963594025&igsh=Njg2enV6c2ZuenV2" target="_blank" rel="noopener noreferrer">
                    <div className="relative flex min-h-[340px] flex-col items-stretch cursor-pointer hover:scale-105 transition-transform duration-300">
                    {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
                    <div className="flex h-[250px] bg-white p-4">
                      {/* Kiri: Deskripsi dan info */}
                      <div className="flex flex-1 flex-col">
                        <div className="mb-0 text-sm font-bold text-black">
                            High-energy cardio workout combining drumming and fitness for maximum calorie burn.
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
                          <div className="mb-2 h-32 w-32 rounded-xl bg-[#C9D953] flex items-center justify-center">
                            <i className="fas fa-drum text-white text-4xl"></i>
                          </div>
                        <div className="text-center text-2xl font-bold font-extrabold text-black">
                            Poundfit
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
                  </Link>
                  {/* Card 3 */}
                  <Link href="https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDQ5MDg1MjI1MTcwMzMz?story_media_id=3663329345651047978&igsh=Njg2enV6c2ZuenV2" target="_blank" rel="noopener noreferrer">
                    <div className="relative flex min-h-[340px] flex-col items-stretch cursor-pointer hover:scale-105 transition-transform duration-300">
                    {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
                    <div className="flex h-[250px] bg-white p-4">
                      {/* Kiri: Deskripsi dan info */}
                      <div className="flex flex-1 flex-col">
                        <div className="mb-0 text-sm font-bold text-black">
                            Latin-inspired dance fitness that combines high-energy cardio with fun choreography.
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
                          <div className="mb-2 h-32 w-32 rounded-xl bg-[#C9D953] flex items-center justify-center">
                            <i className="fas fa-music text-white text-4xl"></i>
                          </div>
                          <div className="text-center text-2xl font-bold font-extrabold text-black">
                            Zumba
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
                  </Link>
                  {/* Card 4 - Kpop Class */}
                  <Link href="https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDQ5MDg1MjI1MTcwMzMz?story_media_id=3672609246598078989&igsh=Njg2enV6c2ZuenV2" target="_blank" rel="noopener noreferrer">
                    <div className="relative flex min-h-[340px] flex-col items-stretch cursor-pointer hover:scale-105 transition-transform duration-300">
                      {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
                      <div className="flex h-[250px] bg-white p-4">
                        {/* Kiri: Deskripsi dan info */}
                        <div className="flex flex-1 flex-col">
                          <div className="mb-0 text-sm font-bold text-black">
                            High-energy K-pop dance fitness combining Korean pop music with dynamic choreography.
                          </div>
                          <div className="mt-20 flex flex-col">
                            <div className="flex items-center gap-1 text-xs font-bold text-black">
                              <i className="fas fa-user"></i> Steven Doe
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-black">
                              <i className="far fa-clock"></i> 50 Min
                            </div>
                          </div>
                        </div>
                        {/* Kanan: Gambar dan judul */}
                        <div className="flex flex-1 flex-col items-center justify-center">
                          <div className="mb-2 h-32 w-32 rounded-xl bg-[#C9D953] flex items-center justify-center">
                            <i className="fas fa-star text-white text-4xl"></i>
                          </div>
                          <div className="text-center text-2xl font-bold font-extrabold text-black">
                            Kpop
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
                  </Link>
                  {/* Card 5 - Bootcamp Class */}
                  <Link href="https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDQ5MDg1MjI1MTcwMzMz?story_media_id=3673410572051374378&igsh=Njg2enV6c2ZuenV2" target="_blank" rel="noopener noreferrer">
                    <div className="relative flex min-h-[340px] flex-col items-stretch cursor-pointer hover:scale-105 transition-transform duration-300">
                      {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
                      <div className="flex h-[250px] bg-white p-4">
                        {/* Kiri: Deskripsi dan info */}
                        <div className="flex flex-1 flex-col">
                          <div className="mb-0 text-sm font-bold text-black">
                            Intense military-style training combining strength, cardio, and endurance exercises.
                          </div>
                          <div className="mt-20 flex flex-col">
                            <div className="flex items-center gap-1 text-xs font-bold text-black">
                              <i className="fas fa-user"></i> Steven Doe
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-black">
                              <i className="far fa-clock"></i> 75 Min
                            </div>
                          </div>
                        </div>
                        {/* Kanan: Gambar dan judul */}
                        <div className="flex flex-1 flex-col items-center justify-center">
                          <div className="mb-2 h-32 w-32 rounded-xl bg-[#C9D953] flex items-center justify-center">
                            <i className="fas fa-dumbbell text-white text-4xl"></i>
                          </div>
                        <div className="text-center text-2xl font-bold font-extrabold text-black">
                            Bootcamp
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
                  </Link>
                  {/* Card 6 - Combat Class */}
                  <Link href="https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDQ5MDg1MjI1MTcwMzMz?story_media_id=3669261865344448683&igsh=Njg2enV6c2ZuenV2" target="_blank" rel="noopener noreferrer">
                    <div className="relative flex min-h-[340px] flex-col items-stretch cursor-pointer hover:scale-105 transition-transform duration-300">
                      {/* Kotak utama: dua kolom, kiri deskripsi+info, kanan gambar+judul */}
                      <div className="flex h-[250px] bg-white p-4">
                        {/* Kiri: Deskripsi dan info */}
                        <div className="flex flex-1 flex-col">
                          <div className="mb-0 text-sm font-bold text-black">
                            High-intensity martial arts training focusing on self-defense and combat techniques.
                          </div>
                          <div className="mt-20 flex flex-col">
                            <div className="flex items-center gap-1 text-xs font-bold text-black">
                              <i className="fas fa-user"></i> Steven Doe
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-black">
                              <i className="far fa-clock"></i> 90 Min
                            </div>
                          </div>
                        </div>
                        {/* Kanan: Gambar dan judul */}
                        <div className="flex flex-1 flex-col items-center justify-center">
                          <div className="mb-2 h-32 w-32 rounded-xl bg-[#C9D953] flex items-center justify-center">
                            <i className="fas fa-fist-raised text-white text-4xl"></i>
                          </div>
                          <div className="text-center text-2xl font-bold font-extrabold text-black">
                            Combat
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
                  </Link>
                </div>
            </div>
        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 mb-8">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-700 mb-2">Step 01</span>
            <div className="text-xl md:text-2xl font-semibold text-black text-center">Choose the Class<br/>as You Like <sup>↗</sup></div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-700 mb-2">Step 02</span>
            <div className="text-xl md:text-2xl font-semibold text-black text-center">Booking<br/>Your Class <sup>↗</sup></div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-700 mb-2">Step 03</span>
            <div className="text-xl md:text-2xl font-semibold text-black text-center">Attend &<br/>Enjoy It! <sup>↗</sup></div>
          </div>
        </div>
        {/* Learn More Button */}
        <div className="flex justify-center">
          <Link href={getAuthUrl()} passHref legacyBehavior>
            <button className="relative bg-black text-[#C9D953] font-bold uppercase px-8 py-3 rounded-md shadow-lg border-2 border-black flex items-center overflow-hidden hover:bg-neutral-900 transition duration-200">
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#C9D953] rounded-tl-none rounded-bl-none rounded-tr-[5px] rounded-br-[5px]"
              ></span>
              Learn More
              <span
                className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#C9D953] rounded-tl-[5px] rounded-bl-[5px] rounded-tr-none rounded-br-none"
              ></span>
            </button>
          </Link>
            </div>
        </div>
    </section>
    

    <section id="trainers" className="py-20 bg-black">
        <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Kiri */}
          <div>
            <span className="inline-flex items-center bg-black text-[#C9D953] text-xs font-semibold px-4 py-1 rounded-full mb-4">
              <span className="w-2 h-2 bg-[#C9D953] rounded-full mr-2"></span>
              OUR TRAINERS
            </span>
            <h2 className="text-3xl font-extrabold text-white mb-8 leading-tight">
              Certified Fitness<br />Coaches
            </h2>
            <div>
              <div className="flex items-center py-4 border-b border-gray-700">
                <span className="text-2xl font-semibold text-white mr-6">01.</span>
                <span className="text-lg text-white">Personal Training</span>
            </div>
              <div className="flex items-center py-4 border-b border-gray-700">
                <span className="text-2xl font-semibold text-white mr-6">02.</span>
                <span className="text-lg text-white">Maximum Progress</span>
                            </div>
              <div className="flex items-center py-4">
                <span className="text-2xl font-semibold text-white mr-6">03.</span>
                <span className="text-lg text-white">Optimal Result</span>
                            </div>
                        </div>
                    </div>
          {/* Tengah */}
          <div className="flex justify-end pr-8">
            <img src="/assets/dashboard/img4.jpg" alt="Trainer" className="rounded-xl w-full max-w-md object-cover transition duration-300 hover:shadow-[0_0_40px_10px_#C9D953]" />
          </div>
          {/* Kanan */}
          <div className="flex flex-col items-center gap-6">
            <img src="/assets/dashboard/img5.jpg" alt="Trainer" className="rounded-xl w-40 h-56 object-cover transition duration-300 hover:shadow-[0_0_40px_10px_#C9D953]" />
            <div className="text-xl font-semibold text-white text-center">Find Best Coaches</div>
            <Link href={getAuthUrl()} passHref legacyBehavior>
              <button className="relative bg-[#C9D953] text-black font-bold uppercase px-8 py-3 rounded-md shadow-lg border-2 border-[#C9D953] flex items-center overflow-hidden hover:bg-[#b6c940] transition duration-200 mt-2">
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-black rounded-tl-none rounded-bl-none rounded-tr-[5px] rounded-br-[5px]"
                ></span>
                Learn More
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-black rounded-tl-[5px] rounded-bl-[5px] rounded-tr-none rounded-br-none"
                ></span>
              </button>
            </Link>
                </div>
            </div>
        </div>
    </section>
    
    {!session?.user && (
      <section className="py-16 bg-black">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-6">READY TO FORGE YOUR LEGACY?</h2>
          <p className="text-lg text-white mb-8 max-w-2xl mx-auto">Join Infinity Gym today and start your fitness journey with our expert guidance and supportive community.</p>
          <div className="flex justify-center">
            <Link href="/auth/signup" passHref legacyBehavior>
              <button className="relative bg-[#C9D953] text-black font-bold uppercase px-8 py-3 rounded-md shadow-lg border-2 border-[#C9D953] flex items-center overflow-hidden hover:bg-[#b6c940] transition duration-200">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-black rounded-tl-none rounded-bl-none rounded-tr-[5px] rounded-br-[5px]" />
                SIGN UP NOW
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-black rounded-tl-[5px] rounded-bl-[5px] rounded-tr-none rounded-br-none" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    )}
    
    <section id="contact" className="py-20">
        <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">CONTACT <span className="text-infinity">US</span></h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Have questions about our service and facilities? Reach out to us and we'll get back to you as soon as possible.</p>
                    
                    <div className="space-y-4">
                        <div className="flex items-start">
                            <div className="bg-infinity p-2 rounded-full text-white mr-4">
                                <i className="fas fa-map-marker-alt"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white">Address</h4>
                                <p className="text-gray-600 dark:text-gray-300">Jl. Sungai Saddang Lama No.102, Makassar</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start">
                            <div className="bg-infinity p-2 rounded-full text-white mr-4">
                                <i className="fas fa-phone-alt"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white">Phone</h4>
                                <p className="text-gray-600 dark:text-gray-300">(123) 456-7890</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start">
                            <div className="bg-infinity p-2 rounded-full text-white mr-4">
                                <i className="fas fa-envelope"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white">Email</h4>
                                <p className="text-gray-600 dark:text-gray-300">info@fitinfinity.id</p>
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
        </div>
      </main>
    </HydrateClient>
  );
}
