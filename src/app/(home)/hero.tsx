import React from "react";
import Link from "next/link";
import { auth } from "@/server/auth";

const Hero = async ( ) => {
  const session = await auth();
  
  // Helper function untuk menentukan URL tujuan
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
    <section className="relative flex h-[100vh] w-full flex-col overflow-hidden bg-[#C9D953]">
      {/* Gradiasi bulat hitam di tengah */}
      {/* <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-black rounded-full blur-3xl opacity-70 z-0 hidden md:block"></div> */}
      {/* Mobile Content: video hanya di belakang content, feature bar di bawah */}
      <div className="w-full md:hidden">
        <div className="relative flex min-h-[70vh] w-full flex-col justify-center bg-black/50 px-4 py-12">
          {/* Video hanya di belakang content */}
          <div className="pointer-events-none absolute inset-0 z-10 h-full w-full">
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src="/assets/dashboard/vid.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
          <div className="relative z-20">
            <span className="mb-4 mt-24 inline-block w-max rounded-full bg-[#C9D953]/20 px-4 py-1 text-xs font-semibold text-[#C9D953]">
              Opening Now
            </span>
            <h1 className="mb-2 text-4xl font-medium leading-tight tracking-wide text-white">
              FORGE YOUR
            </h1>
            <h2 className="mb-4 text-5xl font-extrabold italic tracking-wide text-[#C9D953] drop-shadow-lg">
              LEGACY
            </h2>
            <p className="mb-8 max-w-md text-base text-white/80">
              Join our gym and transform your body with our professional
              trainers and state of the art equipment.
            </p>
            <div className="flex space-x-4 mb-8">
              <Link href={getAuthUrl()} passHref legacyBehavior>
                <button className="relative bg-[#C9D953] text-black px-5 py-3 rounded-md font-bold shadow-lg transition duration-200 transform hover:scale-105 hover:shadow-xl flex items-center overflow-hidden border-2 border-neutral-900 hover:bg-[#b6c940]">
                  <span
                    className="
                      absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-neutral-900
                      rounded-tl-none  /* kiri atas */
                      rounded-bl-none  /* kiri bawah */
                      rounded-tr-[5px] /* kanan atas */
                      rounded-br-[5px] /* kanan bawah */
                    "
                  ></span>
                  GET STARTED
                  <span className="/* kiri atas */ /* kiri bawah */ /* kanan atas */ /* kanan bawah */ absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-neutral-900"></span>
                </button>
              </Link>
              <button className="relative flex transform items-center overflow-hidden rounded-md border-2 border-[#C9D953] bg-transparent px-5 py-3 font-bold text-[#C9D953] transition duration-200 hover:scale-105 hover:border-[#b6c940] hover:text-[#b6c940] hover:shadow-xl">
                <span className="/* kiri atas */ /* kiri bawah */ /* kanan atas */ /* kanan bawah */ absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-none rounded-br-[5px] rounded-tl-none rounded-tr-[5px] bg-[#C9D953]"></span>
                LEARN MORE
                <span className="/* kiri atas */ /* kiri bawah */ /* kanan atas */ /* kanan bawah */ absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-[#C9D953]"></span>
              </button>
            </div>
          </div>
        </div>
        {/* Feature Bar Mobile: di bawah content, tidak overlap, tidak menutupi video */}
        <div className="mt-10 w-full">
          <div className="flex w-full flex-col items-center gap-14 bg-black px-4 py-6 shadow-md">
            <div className="w-full text-center text-white">
              <div className="text-2xl font-medium">Full Access</div>
              <div className="mt-1 text-center text-xs text-gray-300">
                Untuk Semua Kelas
              </div>
            </div>
            <div className="w-full text-center text-white">
              <div className="text-2xl font-medium">Free Towel</div>
              <div className="mt-1 text-center text-xs text-gray-300">
                Bersih & Nyaman
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Video Desktop: hanya tampil di md ke atas */}
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden h-full w-[55%] md:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/assets/dashboard/vid.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
      {/* Desktop Content: polygon, gradient, padding */}
      <div className="relative z-20 flex hidden flex-1 md:flex">
        <div
          className="relative z-20 flex min-h-full w-full flex-col justify-center py-12 pl-20 pr-4 md:w-[65%] md:py-0"
          style={{
            clipPath: "polygon(0 0, 85% 0, 70% 100%, 0% 100%)",
            background:
              "linear-gradient(120deg, #C9D953 60%, rgba(0,0,0,0.85) 100%)",
          }}
        >
          <span className="mb-4 mt-24 inline-block w-max rounded-full bg-[#C9D953]/20 px-4 py-1 text-xs font-semibold text-[#C9D953]">
            Opening Now
          </span>
          <h1 className="mb-2 text-4xl font-medium leading-tight tracking-wide text-black md:text-6xl">
            FORCE YOUR
          </h1>
          <h2 className="mb-4 ml-14 text-5xl font-extrabold italic tracking-wide text-black drop-shadow-lg md:text-7xl">
            LEGACY
          </h2>
          <p className="mb-8 max-w-md text-base text-black/80 md:text-lg">
            Join our gym and transform your body with our professional trainers
            and state of the art equipment.
          </p>
          <div className="flex space-x-4 mb-8">
            <Link href={getAuthUrl()} passHref legacyBehavior>
              <button className="relative bg-[#C9D953] text-black px-5 py-3 rounded-md font-bold shadow-lg transition duration-200 transform hover:scale-105 hover:shadow-xl flex items-center overflow-hidden border-2 border-neutral-900 hover:bg-[#b6c940]">
                <span
                  className="
                    absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-neutral-900
                    rounded-tl-none  /* kiri atas */
                    rounded-bl-none  /* kiri bawah */
                    rounded-tr-[5px] /* kanan atas */
                    rounded-br-[5px] /* kanan bawah */
                  "
                ></span>
                GET STARTED
                <span className="/* kiri atas */ /* kiri bawah */ /* kanan atas */ /* kanan bawah */ absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-neutral-900"></span>
              </button>
            </Link>
            <button className="relative flex transform items-center overflow-hidden rounded-md border-2 border-[#C9D953] bg-black px-5 py-3 font-bold text-[#C9D953] transition duration-200 hover:scale-105 hover:bg-neutral-900 hover:shadow-xl">
              <span className="/* kiri atas */ /* kiri bawah */ /* kanan atas */ /* kanan bawah */ absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-none rounded-br-[5px] rounded-tl-none rounded-tr-[5px] bg-[#C9D953]"></span>
              LEARN MORE
              <span className="/* kiri atas */ /* kiri bawah */ /* kanan atas */ /* kanan bawah */ absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-bl-[5px] rounded-br-none rounded-tl-[5px] rounded-tr-none bg-[#C9D953]"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Bar Desktop: tetap seperti sebelumnya */}
      <div className="relative z-30 hidden w-full md:block">
        <div
          className="flex flex-col items-center gap-8 bg-black py-10 pl-10 shadow-md md:flex-row"
          style={{
            width: "50.5%",
            clipPath: "polygon(0 0, 90% 0%, 100% 100%, 0% 100%)",
          }}
        >
          <div className="flex flex-col border-b border-gray-300 pb-4 pl-10 text-left text-white md:border-b-0 md:border-r md:pb-0 md:pr-12">
            <div className="text-2xl font-medium md:text-3xl">Full Access</div>
            <div className="mt-1 text-center text-xs text-white">
              Untuk Semua Kelas
            </div>
          </div>
          <div className="flex flex-col pl-10 text-left text-white md:pl-12">
            <div className="text-2xl font-medium md:text-3xl">Free Towel</div>
            <div className="mt-1 text-center text-xs text-white">
              Bersih & Nyaman
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
