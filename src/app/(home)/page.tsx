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
        <Navbar user={session?.user ?? undefined}/>
        {/* <Hero />
        <Classes />
        <Trainers />
        <Facilities />
         */}
        <body className="transition-colors duration-200 font-sans">

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
    
   
    <section id="home" className="hero-image pt-24 flex items-center justify-center">
        <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">FORCE YOUR <span className="text-infinity">LEGACY</span></h1>
            <p className="text-xl text-white mb-8 max-w-2xl mx-auto">Join our gym and transform your body with our professional trainers and state-of-the-art equipment.</p>
            <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-6">
                <button className="bg-infinity text-white px-8 py-3 rounded-full font-semibold hover:bg-opacity-90 transition duration-300 pulse">GET STARTED</button>
                <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-gray-800 transition duration-300">LEARN MORE</button>
            </div>
        </div>
    </section>
  
    <section id="about" className="py-20">
        <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0 md:pr-10">
    <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">ABOUT <span className="text-infinity">FIT INFINITY</span></h2>
    <p className="text-gray-600 dark:text-gray-300 mb-6">
        Fit Infinity is the largest gym in Makassar, offering a comprehensive fitness experience for everyone. We believe that fitness should be accessible to all—regardless of income level or access to a gym.
    </p>
    <p className="text-gray-600 dark:text-gray-300 mb-6">
        With just one membership, you get unlimited access to all of our classes—absolutely free. From professional training and personalized nutrition guidance to community support, everything is included to help you reach your goals.
    </p>
    <p className="text-gray-600 dark:text-gray-300 mb-8">
        Our state-of-the-art facilities and expert trainers are here to push your limits and transform your fitness journey.
    </p>
    <button className="bg-infinity text-white px-6 py-2 rounded-full font-semibold hover:bg-opacity-90 transition duration-300">LEARN MORE</button>
</div>

                <div className="md:w-1/2 relative">
                    <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3" alt="Gym interior" className="rounded-lg shadow-xl w-full" />
                    <div className="absolute -bottom-6 -left-6 bg-infinity p-4 rounded-lg shadow-lg floating hidden md:block">
                        <div className="text-white text-center">
                            <div className="text-3xl font-bold">24/7</div>
                            <div className="text-sm">OPEN ACCESS</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <section id="classes" className="py-20 bg-gray-100 dark:bg-[#100c0c] transition-colors duration-200">
        <div className="container mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">OUR <span className="text-infinity">CLASSES</span></h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">We offer a wide variety of fitness classes designed to challenge and inspire you at every fitness level.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300">
                    <img src="https://images.unsplash.com/photo-1571019614242-c9559590d224?ixlib=rb-4.0.3" alt="Crossfit class" className="w-full h-48 object-cover"></img>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">CrossFit</h3>
                            <span className="bg-infinity text-white text-xs px-2 py-1 rounded">HARD</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">High-intensity functional movement that will push your limits.</p>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span><i className="far fa-clock mr-1"></i> 60 min</span>
                            <span><i className="fas fa-user mr-1"></i> John Doe</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300">
                    <img src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?ixlib=rb-4.0.3" alt="Yoga class" className="w-full h-48 object-cover"></img>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Yoga</h3>
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-900 text-xs px-2 py-1 rounded">EASY</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Improve flexibility, strength and mental focus with our yoga sessions.</p>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span><i className="far fa-clock mr-1"></i> 45 min</span>
                            <span><i className="fas fa-user mr-1"></i> Jane Smith</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300">
                    <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3" alt="Weightlifting class" className="w-full h-48 object-cover"></img>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Weightlifting</h3>
                            <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-200 dark:text-yellow-900 text-xs px-2 py-1 rounded">MEDIUM</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Build strength and muscle with proper technique and guidance.</p>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span><i className="far fa-clock mr-1"></i> 60 min</span>
                            <span><i className="fas fa-user mr-1"></i> Mike Johnson</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-12">
                <button className="border-2 border-infinity text-infinity dark:text-white px-8 py-3 rounded-full font-semibold hover:bg-infinity hover:text-white transition duration-300">VIEW ALL CLASSES</button>
            </div>
        </div>
    </section>
    

    <section id="trainers" className="py-20">
        <div className="container mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">OUR <span className="text-infinity">TRAINERS</span></h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Meet our team of certified professional trainers who are passionate about helping you achieve your goals.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 
                <div className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 text-center">
                    <img src="https://images.unsplash.com/photo-1560253023-3ec5d502959f?ixlib=rb-4.0.3" alt="Trainer 1" className="w-full h-64 object-cover"></img>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">John Doe</h3>
                        <p className="text-infinity mb-4">CrossFit Specialist</p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">With 10+ years of experience, John will push you to your limits.</p>
                        <div className="flex justify-center space-x-4">
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-facebook-f"></i></a>
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-twitter"></i></a>
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-instagram"></i></a>
                        </div>
                    </div>
                </div>
                

                <div className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 text-center">
                    <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3" alt="Trainer 2" className="w-full h-64 object-cover"></img>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Jane Smith</h3>
                        <p className="text-infinity mb-4">Yoga Instructor</p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Jane brings mindfulness and flexibility to your workout routine.</p>
                        <div className="flex justify-center space-x-4">
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-facebook-f"></i></a>
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-twitter"></i></a>
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-instagram"></i></a>
                        </div>
                    </div>
                </div>
                
    
                <div className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 text-center">
                    <img src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3" alt="Trainer 3" className="w-full h-64 object-cover"></img>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Mike Johnson</h3>
                        <p className="text-infinity mb-4">Strength Coach</p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Mike specializes in strength training and proper form.</p>
                        <div className="flex justify-center space-x-4">
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-facebook-f"></i></a>
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-twitter"></i></a>
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-infinity transition duration-300"><i className="fab fa-instagram"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    

    <section className="py-20 bg-gray-100 dark:bg-[#100c0c] transition-colors duration-200">
        <div className="container mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">WHAT OUR <span className="text-infinity">MEMBERS SAY</span></h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Hear from our satisfied members who have transformed their lives with us.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 
                <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
                    <div className="flex items-center mb-4">
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3" alt="Member 1" className="w-12 h-12 rounded-full object-cover"></img>
                        <div className="ml-4">
                            <h4 className="font-bold text-gray-800 dark:text-white">Sarah Williams</h4>
                            <div className="flex text-yellow-400">
                                <i className="fas fa-star"></i>
                                <i className="fas fa-star"></i>
                                <i className="fas fa-star"></i>
                                <i className="fas fa-star"></i>
                                <i className="fas fa-star"></i>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">"Joining Infinity Gym was the best decision I've made for my health. The trainers are knowledgeable and supportive, and the community is amazing. I've lost 20 pounds in 3 months!"</p>
                </div>
                

                <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
                    <div className="flex items-center mb-4">
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3" alt="Member 2" className="w-12 h-12 rounded-full object-cover"></img>
                        <div className="ml-4">
                            <h4 className="font-bold text-gray-800 dark:text-white">David Chen</h4>
                            <div className="flex text-yellow-400">
                                <i className="fas fa-star"></i>
                                <i className="fas fa-star"></i>
                                <i className="fas fa-star"></i>
                                <i className="fas fa-star"></i>
                                <i className="fas fa-star-half-alt"></i>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">"The 24/7 access is perfect for my busy schedule. The equipment is top-notch and always well-maintained. I've gained significant muscle mass since joining."</p>
                </div>
            </div>
        </div>
    </section>
    

    <section className="py-20 bg-infinity text-white">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-6">READY TO FORCE YOUR LEGACY?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">Join Infinity Gym today and start your fitness journey with our expert guidance and supportive community.</p>
            <button className="bg-white text-infinity px-8 py-3 rounded-full font-semibold hover:bg-opacity-90 transition duration-300 pulse">SIGN UP NOW</button>
        </div>
    </section>
    
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
                    <form className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
                        <div className="mb-4">
                            <label htmlFor="name" className="block text-gray-700 dark:text-gray-200 mb-2">Name</label>
                            <input type="text" id="name" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-infinity dark:bg-gray-800 dark:border-gray-600 dark:text-white"></input>
                        </div>
                        
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-gray-700 dark:text-gray-200 mb-2">Email</label>
                            <input type="email" id="email" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-infinity dark:bg-gray-800 dark:border-gray-600 dark:text-white"></input>
                        </div>
                        
                        <div className="mb-4">
                            <label htmlFor="message" className="block text-gray-700 dark:text-gray-200 mb-2">Message</label>
<textarea id="message" rows={4} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-infinity dark:bg-gray-800 dark:border-gray-600 dark:text-white"></textarea>
                        </div>
                        
                        <button type="submit" className="w-full bg-infinity text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition duration-300">SEND MESSAGE</button>
                    </form>
                </div>
            </div>
        </div>
    </section>
    

    <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <div className="flex items-center mb-4">
                        <span className="text-2xl font-bold text-infinity">FIT INFINITY</span>
                    </div>
                    <p className="text-gray-400">Force your legacy at the largest mega gym in Makassar, equipped with state-of-the-art facilities and expert trainers dedicated to your transformation.</p>
                </div>
                
                <div>
                    <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                    <ul className="space-y-2">
                        <li><a href="#home" className="text-gray-400 hover:text-white transition duration-300">Home</a></li>
                        <li><a href="#about" className="text-gray-400 hover:text-white transition duration-300">About</a></li>
                        <li><a href="#classes" className="text-gray-400 hover:text-white transition duration-300">Classes</a></li>
                        <li><a href="#trainers" className="text-gray-400 hover:text-white transition duration-300">Trainers</a></li>
                        <li><a href="#contact" className="text-gray-400 hover:text-white transition duration-300">Contact</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="text-lg font-semibold mb-4">Opening Hours</h4>
                    <ul className="space-y-2 text-gray-400">
                        <li>Everyday: 7:00 AM - 10:00 PM</li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
                    <div className="flex space-x-4">
                        <a href="#" className="bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center hover:bg-infinity transition duration-300"><i className="fab fa-facebook-f"></i></a>
                        <a href="#" className="bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center hover:bg-infinity transition duration-300"><i className="fab fa-twitter"></i></a>
                        <a href="#" className="bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center hover:bg-infinity transition duration-300"><i className="fab fa-instagram"></i></a>
                        <a href="#" className="bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center hover:bg-infinity transition duration-300"><i className="fab fa-youtube"></i></a>
                    </div>
                </div>
            </div>
            
            <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
                <p>&copy; 2025 Fit Infinity. All rights reserved.</p>
            </div>
        </div>
    </footer>
    

    <button id="backToTop" className="fixed bottom-8 right-8 bg-infinity text-white w-12 h-12 rounded-full shadow-lg hidden">
        <i className="fas fa-arrow-up"></i>
    </button>
    
  
</body>
      </main>
    </HydrateClient>
  );
}
