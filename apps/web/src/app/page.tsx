import CtaBanner from "@/components/home/CtaBanner";
import DoubleBenefit from "@/components/home/DoubleBenefit";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";

export default function Home() {
  return (
    <>
      <Hero />
      <DoubleBenefit />
      <Services />
      <CtaBanner />
    </>
  );
}
