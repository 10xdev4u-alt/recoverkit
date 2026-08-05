import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { ProblemStrip } from "@/components/landing/problem-strip";
import { SiteHeader } from "@/components/landing/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ProblemStrip />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
