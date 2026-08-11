import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Workflow } from "@/components/landing/Workflow";
import { CtaBand } from "@/components/landing/CtaBand";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <Header />
      <main>
        <Hero />
        <Features />
        <Workflow />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
