import React from "react";

const Hero = () => {
  return (
    <section className="relative w-full h-[100vh] flex flex-col overflow-hidden bg-black">
      {/* Mobile Content: video hanya di belakang content, feature bar di bawah */}
      <div className="w-full md:hidden">
        <div className="relative w-full flex flex-col justify-center px-4 py-12 bg-black/50 min-h-[70vh]">
          {/* Video hanya di belakang content */}
          <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src="/assets/dashboard/vid.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
          <div className="relative z-20">
            <span className="inline-block mb-4 mt-24 px-4 py-1 rounded-full bg-[#C9D953]/20 text-[#C9D953] text-xs font-semibold w-max">
              Opening Now
            </span>
            <h1 className="text-4xl font-medium text-white mb-2 leading-tight tracking-wide">
              FORCE YOUR
            </h1>
            <h2 className="text-5xl font-extrabold italic mb-4 text-[#C9D953] drop-shadow-lg tracking-wide">
              LEGACY
            </h2>
            <p className="text-base text-white/80 mb-8 max-w-md">
              Join our gym and transform your body with our professional trainers and state of the art equipment.
            </p>
            <div className="flex space-x-4 mb-8">
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
                <span
                  className="
                    absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-neutral-900
                    rounded-tl-[5px]  /* kiri atas */
                    rounded-bl-[5px]  /* kiri bawah */
                    rounded-tr-none  /* kanan atas */
                    rounded-br-none  /* kanan bawah */
                  "
                ></span>
              </button>
              <button className="relative border-2 border-[#C9D953] text-[#C9D953] px-5 py-3 rounded-md font-bold bg-transparent transition duration-200 transform hover:scale-105 hover:shadow-xl flex items-center overflow-hidden hover:border-[#b6c940] hover:text-[#b6c940]">
                <span
                  className="
                    absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#C9D953]
                    rounded-tl-none  /* kiri atas */
                    rounded-bl-none  /* kiri bawah */
                    rounded-tr-[5px] /* kanan atas */
                    rounded-br-[5px] /* kanan bawah */
                  "
                ></span>
                LEARN MORE
                <span
                  className="
                    absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#C9D953]
                    rounded-tl-[5px]  /* kiri atas */
                    rounded-bl-[5px]  /* kiri bawah */
                    rounded-tr-none  /* kanan atas */
                    rounded-br-none  /* kanan bawah */
                  "
                ></span>
              </button>
            </div>
          </div>
        </div>
        {/* Feature Bar Mobile: di bawah content, tidak overlap, tidak menutupi video */}
        <div className="w-full mt-10">
          <div className="bg-white/80 dark:bg-neutral-900/80 flex flex-col items-center py-6 gap-14 shadow-md w-full px-4">
            <div className="text-gray-900 dark:text-white text-center w-full">
              <div className="font-medium text-2xl">Full Access</div>
              <div className="text-xs text-gray-500 text-center mt-1">Untuk Semua Kelas</div>
            </div>
            <div className="text-gray-900 dark:text-white text-center w-full">
              <div className="font-medium text-2xl">Free Towel</div>
              <div className="text-xs text-gray-500 text-center mt-1">Bersih & Nyaman</div>
            </div>
          </div>
        </div>
      </div>
      {/* Video Desktop: hanya tampil di md ke atas */}
      <div className="absolute top-0 right-0 bottom-0 w-[55%] h-full z-10 pointer-events-none hidden md:block">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/assets/dashboard/vid.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
      {/* Desktop Content: polygon, gradient, padding */}
      <div className="relative flex-1 flex z-20 hidden md:flex">
        <div
          className="relative z-20 flex flex-col justify-center pl-20 pr-4 py-12 md:py-0 w-full md:w-[65%] min-h-full"
          style={{
            clipPath: "polygon(0 0, 85% 0, 70% 100%, 0% 100%)",
            background: "radial-gradient(circle at 85% 50%,#C9D953 0%, #C9D953 1%, #111 40%, #111 100%)"
          }}
        >
          <span className="inline-block mb-4 mt-24 px-4 py-1 rounded-full bg-[#C9D953]/20 text-[#C9D953] text-xs font-semibold w-max">
            Opening Now
          </span>
          <h1 className="text-4xl md:text-6xl font-medium text-white mb-2 leading-tight tracking-wide">
            FORCE YOUR
          </h1>
          <h2 className="text-5xl md:text-7xl font-extrabold italic mb-4 text-[#C9D953] drop-shadow-lg ml-14 tracking-wide">
            LEGACY
          </h2>
          <p className="text-base md:text-lg text-white/80 mb-8 max-w-md">
            Join our gym and transform your body with our professional trainers and state of the art equipment.
          </p>
          <div className="flex space-x-4 mb-8">
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
              <span
                className="
                  absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-neutral-900
                  rounded-tl-[5px]  /* kiri atas */
                  rounded-bl-[5px]  /* kiri bawah */
                  rounded-tr-none  /* kanan atas */
                  rounded-br-none  /* kanan bawah */
                "
              ></span>
            </button>
            <button className="relative border-2 border-[#C9D953] text-[#C9D953] px-5 py-3 rounded-md font-bold bg-transparent transition duration-200 transform hover:scale-105 hover:shadow-xl flex items-center overflow-hidden hover:border-[#b6c940] hover:text-[#b6c940]">
              <span
                className="
                  absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#C9D953]
                  rounded-tl-none  /* kiri atas */
                  rounded-bl-none  /* kiri bawah */
                  rounded-tr-[5px] /* kanan atas */
                  rounded-br-[5px] /* kanan bawah */
                "
              ></span>
              LEARN MORE
              <span
                className="
                  absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#C9D953]
                  rounded-tl-[5px]  /* kiri atas */
                  rounded-bl-[5px]  /* kiri bawah */
                  rounded-tr-none  /* kanan atas */
                  rounded-br-none  /* kanan bawah */
                "
              ></span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Bar Desktop: tetap seperti sebelumnya */}
      <div className="relative z-30 w-full hidden md:block">
        <div
          className="bg-white dark:bg-neutral-900 flex flex-col md:flex-row items-center py-10 gap-8 shadow-md pl-10"
          style={{
            width: '50.5%',
            clipPath: "polygon(0 0, 90% 0%, 100% 100%, 0% 100%)"
          }}
        >
          <div className="text-gray-900 dark:text-white text-left md:pr-12 border-b md:border-b-0 md:border-r border-gray-300 pb-4 md:pb-0 flex flex-col pl-10">
            <div className="font-medium text-2xl md:text-3xl">Full Access</div>
            <div className="text-xs text-gray-500 text-center mt-1">Untuk Semua Kelas</div>
          </div>
          <div className="text-gray-900 dark:text-white text-left md:pl-12 flex flex-col pl-10">
            <div className="font-medium text-2xl md:text-3xl">Free Towel</div>
            <div className="text-xs text-gray-500 text-center mt-1">Bersih & Nyaman</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;