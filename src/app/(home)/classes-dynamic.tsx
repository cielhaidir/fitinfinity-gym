"use client";

import React from "react";
import Link from "next/link";
import { api } from "@/trpc/react";

interface ClassCardProps {
  name: string;
  instructorName: string;
  schedule: Date;
  duration: number;
  price: number;
  classType?: {
    id: string;
    name: string;
    icon: string;
    description: string;
    level: string;
  } | null;
}

const ClassCard: React.FC<ClassCardProps> = ({ name, instructorName, duration, price, classType }) => {
  // Use dynamic class type information or fallback to default
  const getClassInfo = () => {
    if (classType) {
      return {
        icon: classType.icon,
        description: classType.description,
        level: classType.level
      };
    }

    // Fallback default info if no classType is provided
    return {
      icon: "fas fa-dumbbell",
      description: "Join our energizing fitness class for a full-body workout experience.",
      level: "Medium"
    };
  };

  const classInfo = getClassInfo();

  return (
    <div className="relative flex min-h-[340px] flex-col items-stretch cursor-pointer hover:scale-105 transition-transform duration-300">
      {/* Main card: two columns, left description+info, right image+title */}
      <div className="flex h-[250px] bg-white p-4">
        {/* Left: Description and info */}
        <div className="flex flex-1 flex-col">
          <div className="mb-0 text-sm font-bold text-black">
            {classInfo.description}
          </div>
          <div className="mt-20 flex flex-col">
            <div className="flex items-center gap-1 text-xs font-bold text-black">
              <i className="fas fa-user"></i> {instructorName}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-black">
              <i className="far fa-clock"></i> {duration} Min
            </div>
          </div>
        </div>
        {/* Right: Icon and title */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-2 h-32 w-32 rounded-xl bg-[#C9D953] flex items-center justify-center">
            <i className={`${classInfo.icon} text-white text-4xl`}></i>
          </div>
          <div className="text-center text-2xl font-bold font-extrabold text-black capitalize">
            {name}
          </div>
        </div>
      </div>
      {/* Second box with polygon tail */}
      <div
        className="relative ml-0 mt-0 h-14 w-[60%]"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 0%, 80% 100%, 0 100%)",
          background: "#fff",
        }}
      >
        {/* Level badge inside second box */}
        <div className="absolute bottom-3.5 left-7">
          <button className="flex items-center gap-2 rounded-md bg-black px-4 py-1 text-xs font-semibold text-white shadow">
            {classInfo.level}
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
  );
};

const ClassesDynamic = () => {
  const { data, isLoading, error } = api.class.forLandingPage.useQuery();

  const getAuthUrl = () => {
    return "/auth/signin"; // Default for landing page
  };

  if (isLoading) {
    return (
      <section id="classes" className="relative py-20 bg-[#C9D953] text-black" style={{clipPath: 'polygon(0 4% , 5% 0, 95% 0, 100% 4%, 100% 96%, 95% 100%, 5% 100%, 0 96%)'}}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center mb-8">
            <span className="bg-black text-[#C9D953] text-xs font-semibold px-6 py-1 rounded-full mb-4">OUR CLASSES</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-center text-black mb-4">Loading classes...</h2>
          </div>
          <div className="relative flex flex-col items-center">
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 md:top-2/3 w-[480px] h-40 bg-black rounded-full blur-3xl opacity-40 z-0"></div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 w-full">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="h-32 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error("❌ TRPC Error:", error);
    return (
      <section id="classes" className="relative py-20 bg-[#C9D953] text-black" style={{clipPath: 'polygon(0 4% , 5% 0, 95% 0, 100% 4%, 100% 96%, 95% 100%, 5% 100%, 0 96%)'}}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center mb-8">
            <span className="bg-black text-[#C9D953] text-xs font-semibold px-6 py-1 rounded-full mb-4">OUR CLASSES</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-center text-black mb-4">Unable to load classes</h2>
            <p className="text-center text-black">Error: {error.message}</p>
            <p className="text-center text-black text-sm mt-2">Please check the console for more details.</p>
          </div>
        </div>
      </section>
    );
  }

  const classes = data?.classes || [];
  const isFromYesterday = data?.isFromYesterday || false;

  return (
    <section id="classes" className="relative py-20 bg-[#C9D953] text-black" style={{clipPath: 'polygon(0 4% , 5% 0, 95% 0, 100% 4%, 100% 96%, 95% 100%, 5% 100%, 0 96%)'}}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center mb-8">
          <span className="bg-black text-[#C9D953] text-xs font-semibold px-6 py-1 rounded-full mb-4">OUR CLASSES</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-black mb-4">
            We offer a wide variety of fitness classes designed to challenge<br className='hidden md:block'/> and inspire you at every fitness level.
          </h2>
          {isFromYesterday && (
            <p className="text-sm text-center text-black mb-4 bg-black text-[#C9D953] px-4 py-2 rounded-full">
              No classes scheduled for today. Showing yesterday's classes.
            </p>
          )}
        </div>
        <div className="relative flex flex-col items-center">
          {/* Spotlight effect */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 md:top-2/3 w-[480px] h-40 bg-black rounded-full blur-3xl opacity-40 z-0"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 w-full">
            {classes.length > 0 ? (
              classes.map((cls) => (
                <ClassCard
                  key={cls.id}
                  name={cls.name}
                  instructorName={cls.instructorName}
                  schedule={cls.schedule}
                  duration={cls.duration}
                  price={cls.price}
                  classType={cls.classType}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <h3 className="text-xl font-bold text-black mb-4">No Classes Available</h3>
                <p className="text-black">Check back later for upcoming classes.</p>
              </div>
            )}
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
  );
};

export default ClassesDynamic;