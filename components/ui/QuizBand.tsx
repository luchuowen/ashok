import { Button } from "./Button";
import { Ribbon } from "./Ribbon";

// TODO(phase-2): the Style Advisor quiz itself (a short question flow that
// recommends a starting point — bespoke suit, MTM occasionwear, etc.) is
// Phase 2 scope. For now this is a static promo banner into booking.
export function QuizBand() {
  return (
    <div className="flex flex-col items-start gap-4 border border-line bg-white/40 p-8 md:flex-row md:items-center md:justify-between">
      <div>
        <Ribbon>Style Advisor</Ribbon>
        <p className="mt-3 max-w-md font-display text-xl">
          Not sure where to start? Tell us the occasion and we&apos;ll point you to the
          right service.
        </p>
      </div>
      <Button href="/booking?ref=style-advisor" variant="ghost">
        Find Your Starting Point
      </Button>
    </div>
  );
}
