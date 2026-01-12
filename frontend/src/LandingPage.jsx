import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  useEffect(() => {
    const tl = gsap.timeline();

    // header animation
    tl.from("header h1 span span", {
      y: -100,
      opacity: 0,
      stagger: 0.1,
      duration: 0.1,
      ease: "power2.out",
    });

    gsap.from("header div", {
      scale: 0,
      opacity: 1,
      delay: 1,
      duration: 1,
      ease: "power2.out",
    });

    gsap.from("header p", {
      y: 50,
      opacity: 0,
      duration: 0.5,
      delay: 0.5,
      ease: "power2.out",
    });

    // gsap.to("header h1 span span", {
    //   y: 0,
    //   opacity: 1,
    //   duration: 0.5,
    //   scrollTrigger: {
    //     trigger: "header h1",
    //     start: "top center",
    //     end: "bottom 80%",
    //     scrub: 5,
    //   },
    // });

    // features animation
    // tl.fromTo(
    //   ".feature-card h2",
    //   { y: -50, opacity: 0 },
    //   {
    //     y: 0,
    //     opacity: 1,
    //     duration: 0.5,
    //     scrollTrigger: {
    //       trigger: ".feature-card h2",
    //       start: "top bottom",
    //       end: "bottom 80%",
    //       scrub: 5,
    //     },
    //   }
    // );
    tl.fromTo(
      ".feature-card div",
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.1,
        stagger: 0.1,
        scrollTrigger: {
          trigger: ".feature-card",
          start: "top bottom",
          end: "bottom 100%",
          scrub: 5,
        },
      }
    );

    // demo section animation
    tl.fromTo(
      ".demo-section h2",
      { y: -50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        scrollTrigger: {
          trigger: ".demo-section h2",
          start: "top bottom",
          end: "bottom 80%",
          scrub: 5,
        },
      }
    );

    tl.fromTo(
      ".demo-section div ul li",
      { x: -50, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.4,
        scrollTrigger: {
          trigger: ".demo-section div",
          start: "top bottom",
          end: "bottom 70%",
          scrub: 5,
        },
      }
    );

    // testimonial section animation
    tl.fromTo(
      ".testimonials-section h2",
      { y: -50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        scrollTrigger: {
          trigger: ".testimonials-section h2",
          start: "top bottom",
          end: "bottom 80%",
          scrub: 5,
        },
      }
    );

    tl.fromTo(
      ".testimonials-section div div",
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        scrollTrigger: {
          trigger: ".testimonials-section div",
          start: "top bottom",
          end: "bottom 80%",
          scrub: 5,
        },
      }
    );
  }, []);
  const FeatureImage = [
    "/image1.png",
    "/image2.png",
    "/image3.png",
    "/image4.png",
  ];
  return (
    <div className="min-h-screen bg-[#050A15] text-white overflow-x-hidden">
      {/* Hero Section */}
      <header className="py-16 px-6 text-center bg-gradient-to-br from-blue-900/10 via-[#050A15] to-purple-900/20 flex flex-col justify-center relative">
        <img
          src="/pexels-pixabay-41949.jpg"
          className="absolute top-0 left-0 w-full h-full object-cover opacity-25"
        />

        <h1 className="text-4xl md:text-5xl text-blue-300 drop-shadow tracking-tight leading-tight font-semibold max-w-5xl mx-auto">
          {"Build professional connections with a calm, focused workspace"
            .split(" ")
            .map((word, index) => (
              <span key={index} className="inline-block mr-2">
                {word.split("").map((char, charIndex) => (
                  <span key={charIndex} className="inline-block">
                    {char}
                  </span>
                ))}
              </span>
            ))}
        </h1>
        <p className="text-lg md:text-xl text-blue-200 max-w-3xl mx-auto mb-8">
          LingoLive keeps the interface neutral so your ideas stand out. Share
          updates, talk with friends, and manage notifications without
          distractions.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-6 z-10">
          <Link
            to="/signup"
            className="bg-black text-white transition py-3 px-5 rounded-md text-sm font-semibold header-first-link"
          >
            Create an Account
          </Link>
          <Link
            to="/login"
            className=" bg-white text-black py-3 px-5 rounded-md text-sm font-semibold transition header-second-link"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 px-6 max-w-5xl mx-auto relative feature-card">
        <div className="text-center mb-10 space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-200">
            Platform highlights
          </p>
          <h2 className="text-3xl font-semibold">
            Everything you need, nothing you don't
          </h2>
          <p className="text-blue-400">
            A single workspace for sharing posts, messaging, and managing your
            network.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-10">
          <div className="bg-blue-500 rounded-xl p-7 flex flex-col items-center shadow-lg">
            <img
              src="/image1.png"
              alt="Real-time Chat"
              className="mb-5 rounded-lg w-40 h-32 object-cover"
            />
            <h3 className="text-xl font-[font1] text-blue-300 mb-2">
              Real-Time Communication
            </h3>
            <p className="font-[font2] text-blue-100">
              Instant messaging, voice calls, and video calls, powered by WebRTC
              and Socket.io.
            </p>
          </div>
          <div className="bg-zinc-300 text-black rounded-xl p-7 flex flex-col items-center shadow-lg">
            <img
              src="/image2.png"
              alt="User Management"
              className="mb-5 rounded-lg w-40 h-32 object-cover"
            />
            <h3 className="text-xl font-[font1] text-black mb-2">
              Seamless User Management
            </h3>
            <p className="font-[font2] text-black">
              Secure registration, profile customization, friend requests, and
              social connections—all under your control.
            </p>
          </div>
          <div className="bg-green-600 rounded-xl p-7 flex flex-col items-center shadow-lg">
            <img
              src="/image3.png"
              alt="Engagement"
              className="mb-5 rounded-lg w-40 h-32 object-cover"
            />
            <h3 className="text-xl font-[font1] text-black mb-2">
              Engage & Share
            </h3>
            <p className="font-[font2] text-blue-100">
              Create posts, like, comment, explore the feed, showcase your
              activities, and celebrate community achievements.
            </p>
          </div>
          <div className="bg-blue-950 rounded-xl p-7 flex flex-col items-center shadow-lg">
            <img
              src="/image4.png"
              alt="Notifications"
              className="mb-5 rounded-lg w-40 h-32 object-cover"
            />
            <h3 className="text-xl font-[font1] text-purple-300 mb-2">
              Live Notifications
            </h3>
            <p className="font-[font2] text-purple-100">
              Stay updated with instant alerts for every like, comment, friend
              request, and message.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works & Demo Section */}
      <section className="py-16 px-6 bg-gradient-to-tr from-[#050A15] via-blue-900/60 to-purple-900/60 demo-section">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
              Working rhythm
            </p>
            <h2 className="text-3xl font-semibold">
              A predictable flow from sign-up to growth
            </h2>
            <ul className="space-y-4 text-gray-600">
              {[
                "Register and set up your profile in minutes.",
                "Find people you already know or discover new peers.",
                "Share updates, reply to comments, and refine your feed.",
                "Stay on top of messages and notifications from one place.",
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 text-sm font-semibold text-gray-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl p-6">
            <video
              className="rounded-lg w-full"
              controls
              poster="/Screenshot1.png"
            >
              <source src="/glob.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* Screenshot/Gallery Section */}
      <section className="py-16 px-6 relative overflow-hidden screenshot-section">
        <div className="text-center mb-10 space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-200">
            Product preview
          </p>
          <h2 className="text-3xl font-semibold">
            Screens that stay understated
          </h2>
          <p className="text-gray-400">
            Simple cards, open space, and readable type across every page.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <img
              key={item}
              src={`/Screenshot${item}.png`}
              alt={`Screenshot ${item}`}
              className="rounded-lg border border-gray-200 object-cover h-56 w-full"
            />
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-950 via-[#050A15] to-purple-950 testimonials-section">
        <div className="max-w-4xl mx-auto text-center space-y-3 mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-200">
            Testimonials
          </p>
          <h2 className="text-3xl font-semibold text-blue-100">
            Trusted by people who work online every day
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-blue-900 rounded-xl p-6 shadow text-blue-200">
            <p className="italic">
              “The chat and calls are unbelievably fast and stable—perfect for
              connecting with my friends globally!”
            </p>
            <span className="block mt-4 font-semibold">— Amit, Student</span>
          </div>
          <div className="bg-purple-900 rounded-xl p-6 shadow text-purple-200">
            <p className="italic">
              “I love the instant notifications and easy profile management.
              LingoLive makes social learning simple.”
            </p>
            <span className="block mt-4 font-semibold">
              — Sarthak, Developer
            </span>
          </div>
        </div>
      </section>

      {/* About & Call to Action Section */}
      <section className="py-16 px-6 max-w-3xl mx-auto text-center about-section">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-100">
          About the product
        </p>
        <h2 className="text-3xl text-blue-300 font-semibold mt-3 mb-4">
          A professional network with calm defaults
        </h2>
        <p className="text-blue-50 mb-8">
          LingoLive focuses on structure and reliability. Profiles, feeds,
          messages, and notifications live in a single layout so you can move
          quickly without relearning the interface.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/signup"
            className="px-5 py-3 rounded-md text-sm font-semibold bg-black text-white"
          >
            Start for free
          </Link>
          <Link
            to="/login"
            className="px-5 py-3 rounded-md text-sm font-semibold bg-white text-black"
          >
            Returning user? Sign in
          </Link>
        </div>
      </section>

      <footer className="py-8 text-center text-blue-500 text-sm opacity-75 border-t border-gray-300">
        &copy; {new Date().getFullYear()} LingoLive by Chandermani Mishra • All
        Rights Reserved
      </footer>

      <style jsx="true">{`
        @keyframes slideScreens {
          0% {
            transform: translateX(-80px);
          }
          100% {
            transform: translateX(80px);
          }
        }

        .animate-slideScreens {
          animation: slideScreens 6s ease-in-out infinite alternate;
        }

        .screenshot-section {
          background: linear-gradient(
            135deg,
            #050a15 0%,
            #1e3a8a 50%,
            #6b21a8 100%
          );
          position: relative;
        }

        /* 💨 The fog that actually HIDES edges */
        .screenshots-wrapper {
          position: relative;
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 1) 20%,
            rgba(255, 255, 255, 1) 80%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 1) 20%,
            rgba(255, 255, 255, 1) 80%,
            transparent 100%
          );
          mask-repeat: no-repeat;
          mask-size: 100%;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-size: 100%;
        }

        /* Optional: slightly visible white mist over edges */
        // .screenshot-section::before,
        // .screenshot-section::after {
        //   content: "";
        //   position: absolute;
        //   top: 0;
        //   width: 20%;
        //   height: 100%;
        //   pointer-events: none;
        //   background: radial-gradient(
        //     circle at center,
        //     rgba(255, 255, 255, 0.8) 0%,
        //     rgba(255, 255, 255, 0.4) 40%,
        //     transparent 100%
        //   );
        //   filter: blur(30px);
        // }

        .screenshot-section::before {
          left: 0;
        }

        .screenshot-section::after {
          right: 0;
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}